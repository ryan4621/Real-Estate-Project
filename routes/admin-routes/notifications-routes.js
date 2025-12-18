import express from 'express';
import dotenv from 'dotenv';
import pool from '../../database.js';
import PDFDocument from 'pdfkit';
import { requireAdmin } from '../../middleware/authentication.js';
import { sendNotificationEmail } from '../../middleware/email-service.js'
import { applyPagination, applySearch, applyFilters } from "../../utils/query-helpers.js";
import { validateId, validateAdminNotification, validateAdminNotificationsQuery, validateNotificationExport, validatePagination, handleValidationErrors } from '../../middleware/validation.js'

const router = express.Router()
dotenv.config()

async function processNotificationDelivery(notificationData) {
    const {
      title,
      message,
      category,
      target_all_users,
      target_user_roles,
    } = notificationData;
  
    try {
        // Get target users with their notification settings
        let targetUsers = [];
    
        if (target_all_users) {
            const [users] = await pool.execute(
                `SELECT u.id, u.last_name, u.email, u.role,
                    COALESCE(ns.saved_listings, 'once_a_day') as saved_listings,
                    COALESCE(
                        ns.marketing_emails, 
                        CASE WHEN u.role IN ('admin', 'super_admin') THEN 'yes' ELSE 'no' END
                    ) as marketing_emails
                FROM users u
                LEFT JOIN notification_settings ns ON u.id = ns.user_id
                WHERE u.deleted_at IS NULL AND u.suspended_at IS NULL AND u.deactivated_at IS NULL`
            );
            targetUsers = users;
        } else if (target_user_roles && target_user_roles.length > 0) {
            const placeholders = target_user_roles.map(() => '?').join(',');
            const [users] = await pool.execute(
                `SELECT u.id, u.last_name, u.email, u.role,
                    COALESCE(ns.saved_listings, 'once_a_day') as saved_listings,
                    COALESCE(
                        ns.marketing_emails, 
                        CASE WHEN u.role IN ('admin', 'super_admin') THEN 'yes' ELSE 'no' END
                    ) as marketing_emails
                FROM users u
                LEFT JOIN notification_settings ns ON u.id = ns.user_id
                WHERE u.role IN (${placeholders}) 
                AND u.deleted_at IS NULL AND u.suspended_at IS NULL AND u.deactivated_at IS NULL`,
                target_user_roles
            );
            targetUsers = users;
        }
    
          // Filter users based on category and their notification preferences
          const eligibleUsers = targetUsers.filter(user => {
            // General category: Always send to everyone
            if (category === 'general') {
                return true;
            }

            // Saved listings category: Check saved_listings setting
            if (category === 'saved_listings') {
                return user.saved_listings !== 'no_thanks';
            }

            // Marketing emails category: Check marketing_emails setting
            if (category === 'marketing_emails') {
                return user.marketing_emails === 'yes';
            }

            return false;
        });

        let notificationsSent = 0;
  
        // Send email only to eligible users
        for (const user of eligibleUsers) {
            try {
                await sendNotificationEmail(user.email, user.last_name, title, message, category);
                notificationsSent++;
            } catch (emailError) {
                console.error(`Failed to send email to ${user.email}:`, emailError);
            }
        }

        return {
            totalRecipients: eligibleUsers.length,
            notificationsSent,
            filteredOut: targetUsers.length - eligibleUsers.length
        };

    } catch (error) {
        console.error('Error processing notification delivery:', error);
        throw error;
    }
}

function generateCSV(res, rows) {
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename=notifications-export-${Date.now()}.csv`);
  
    // CSV Headers
    res.write("ID, Title, Message, Category, Status, Target all users, Target user roles, Scheduled for, Sent at, Total recipients, First name, Last name, Created at, Updated at\n");
    
    // CSV Data
    rows.forEach(row => {
        const safe = val => {
            if (val === null || val === undefined) return "";
            return String(val).replace(/"/g, '""');
        };

        const scheduledFor = row.scheduled_for ? row.scheduled_for.toLocaleString() : "N/A";
        const sentAt = row.sent_at ? row.sent_at.toLocaleString() : "N/A";
        const createdAt = row.created_at ? row.created_at.toLocaleString() : "N/A";
        const updatedAt = row.updated_at ? row.updated_at.toLocaleString() : "N/A";

        
        res.write(`"${safe(row.id)}", "${safe(row.title)}", "${safe(row.message)}", "${safe(row.category)}", "${safe(row.status)}", "${safe(row.target_all_users)}", "${safe(row.target_user_roles)}", "${safe(scheduledFor)}", "${safe(sentAt)}", "${safe(row.total_recipients)}", "${safe(row.created_by_first_name)}", "${safe(row.created_by_last_name)}", "${safe(createdAt)}", "${safe(updatedAt)}"\n`);
    });
    
    res.end();
}

function generatePDF(res, rows, filters = {}) {
    // Set response headers
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
        "Content-Disposition",
        `attachment; filename=notifications-export-${Date.now()}.pdf`
    );

    // Create a PDF document
    const doc = new PDFDocument({ size: [2000, 842], margin: 40, layout: 'landscape' });

    // Pipe PDF directly to response
    doc.pipe(res);

    // Document title
    doc.fontSize(16).text("Notifications Export Report", { align: 'center' });
    doc.moveDown();

    // Generated info
    doc.fontSize(10)
        .text(`Generated: ${new Date().toLocaleString()}`)
        .text(`Total Notifications: ${rows.length}`)
        .text(`Filters Applied: ${Object.keys(filters).length > 0 ? 'Yes' : 'None'}`)
        .moveDown();

    // Table headers
    const tableHeaders = [
        "ID", "Title", "Message", "Category", "Status", "Target all users", "Target user roles", "Scheduled for", "Sent at", "Total recipients", "First name", "Last name", "Created at", "Updated at"
    ];

    // Column widths (adjust as needed)
    const colWidths = [40, 90, 250, 90, 60, 90, 60, 90, 40, 90, 150, 90, 90, 90,];

    // Start table
    const startX = doc.x;
    let startY = doc.y;

    // Draw headers
    tableHeaders.forEach((header, i) => {
        doc.font('Helvetica-Bold').fontSize(8)
        .text(header, startX + colWidths.slice(0, i).reduce((a,b) => a+b,0), startY, { width: colWidths[i], continued: i !== tableHeaders.length-1 });
    });
    doc.moveDown();

    // Draw rows
    rows.forEach(row => {
        startY = doc.y;

        const scheduledFor = row.scheduled_for ? row.scheduled_for.toLocaleString() : "N/A";
        const sentAt = row.sent_at ? row.sent_at.toLocaleString() : "N/A";
        const createdAt = row.created_at ? row.created_at.toLocaleString() : "N/A";
        const updatedAt = row.updated_at ? row.updated_at.toLocaleString() : "N/A";
        
        const rowValues = [
            row.id, row.title, row.message, row.category, row.status, row.target_all_users, row.target_user_roles, scheduledFor, sentAt, row.total_recipients, row.first_name, row.last_name, createdAt, updatedAt
        ];

        rowValues.forEach((val, i) => {
            const text = val === null || val === undefined ? 'N/A' : String(val);
            doc.font('Helvetica').fontSize(8)
                .text(text, startX + colWidths.slice(0, i).reduce((a,b) => a+b,0), startY, { width: colWidths[i], continued: i !== rowValues.length-1 });
        });
        doc.moveDown();

        // Add new page if near bottom
        if (doc.y > doc.page.height - 50) {
            doc.addPage({ size: [2000, 842], layout: 'landscape', margin: 40 });
            startY = doc.y;
        }
        
    });

    // Finalize PDF
    doc.end();
}

// Get notification statistics for admin dashboard
router.get("/notifications/statistics", requireAdmin, async (req, res) => {
    try {
      const [overallStats] = await pool.execute(`
        SELECT 
          COUNT(*) as total_notifications,
          COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent_notifications,
          COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_notifications,
          COUNT(CASE WHEN status = 'scheduled' THEN 1 END) as scheduled_notifications,
          SUM(total_recipients) as total_recipients_reached
        FROM notifications
      `);
  
      // Category breakdown
      const [categoryStats] = await pool.execute(`
        SELECT 
          category,
          COUNT(*) as notification_count,
          SUM(total_recipients) as total_recipients
        FROM notifications 
        WHERE status = 'sent'
        GROUP BY category
      `);
  
      // Recent activity (last 30 days)
      const [recentActivity] = await pool.execute(`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as notifications_created,
          SUM(total_recipients) as recipients_reached
        FROM notifications 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `);
  
      // User engagement stats
    //   const [engagementStats] = await pool.execute(`
    //     SELECT 
    //       COUNT(*) as total_user_notifications,
    //       COUNT(CASE WHEN is_read = TRUE THEN 1 END) as read_notifications,
    //       COUNT(CASE WHEN email_opened = TRUE THEN 1 END) as email_opens,
    //       ROUND(AVG(TIMESTAMPDIFF(MINUTE, created_at, read_at)), 2) as avg_read_time_minutes
    //     FROM user_notifications
    //     WHERE is_deleted = FALSE
    //   `);
  
      res.json({
        success: true,
        data: {
          overall: overallStats[0],
          byCategory: categoryStats,
          recentActivity,
        //   engagement: engagementStats[0]
        }
      });
  
    } catch (error) {
      console.error('Error fetching notification statistics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch statistics'
      });
    }
});
  
// Get all notifications with filtering and pagination
router.get("/notifications", validateAdminNotificationsQuery, validatePagination, handleValidationErrors, requireAdmin, async (req, res) => {
    try {
        const { page, limit, offset } = req.pagination;
        const { q, status, category, sortBy, sortOrder } = req.query;

        let baseQuery = `
            SELECT n.id, n.title, n.message, n.category, n.status, n.total_recipients,
            n.created_at, n.sent_at,
            u.first_name as created_by_first_name,
            u.last_name as created_by_last_name
            FROM notifications n
            LEFT JOIN users u ON n.created_by_admin_id = u.id
        `;
        let params = [];

         // 1️⃣ Apply search (optional)
        if (q) {
            const searchResult = applySearch(baseQuery, q, [
                "n.id", "title", "message", "category", "status", "total_recipients", "created_by_admin_id", "u.first_name", "u.last_name", "n.created_at",
            ]);
            baseQuery = searchResult.query;
            params = [...searchResult.params];
        }
    
        // 2️⃣ Apply filters (optional)
        const filterResult = applyFilters(baseQuery, { status, category });
        baseQuery = filterResult.query;
        params = [...params, ...filterResult.params];
    
        // 3️⃣ Get total count for pagination
        const [countRows] = await pool.execute(
            `SELECT COUNT(*) AS total FROM (${baseQuery}) AS total_notifications`,
            params
        );
        const total = countRows[0].total;

        // Add sorting
        const validSortColumns = ['created_at', 'sent_at', 'status', 'category', 'total_recipients'];
        const validSortOrder = ['ASC', 'DESC'];
        
        if (validSortColumns.includes(sortBy) && validSortOrder.includes(sortOrder.toUpperCase())) {
            baseQuery += ` ORDER BY n.${sortBy} ${sortOrder.toUpperCase()}`;
        } else {
            baseQuery += ' ORDER BY n.created_at DESC';
        }
    
        // 4️⃣ Apply pagination
        const paginatedQuery = applyPagination(baseQuery, page, limit);
    
        // 5️⃣ Fetch paginated data
        const [rows] = await pool.execute(paginatedQuery, params);

        res.json({
            success: true,
            meta: {
              total,
              page,
              limit,
              offset,
              totalPages: Math.ceil(total / limit),
            },
            data: rows,
        });

    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch notifications'
        });
    }
});

router.get("/notifications/export", validateNotificationExport, handleValidationErrors, requireAdmin, async (req, res) => {
    try {
      const { format = 'csv', q, status, category } = req.query;
  
      let baseQuery = `
        SELECT n.id, n.title, n.message, n.category, n.status, n.total_recipients,
            n.created_at, n.sent_at,
            u.first_name as created_by_first_name,
            u.last_name as created_by_last_name
            FROM notifications n
            LEFT JOIN users u ON n.created_by_admin_id = u.id
      `;
      let params = [];
  
      if (q) {
        const searchResult = applySearch(baseQuery, q, [
          "n.id", "title", "message", "category", "status", "total_recipients", "created_by_admin_id", "u.first_name", "u.last_name", "n.created_at"
        ]);
        baseQuery = searchResult.query;
        params = [...searchResult.params];
      }
  
      // Apply filters
      if (q && ( status || category)) {
        const filterKeys = [];
        const filterValues = [];
        if (category) {
          filterKeys.push('category = ?');
          filterValues.push(category);
        }
        if (status) {
          filterKeys.push('status = ?');
          filterValues.push(status);
        }
        baseQuery += ` AND ${filterKeys.join(' AND ')}`;
        params = [...params, ...filterValues];
      } else if (!q && (status || category)) {
        const filterResult = applyFilters(baseQuery, { status, category });
        baseQuery = filterResult.query;
        params = [...params, ...filterResult.params];
      }
  
      baseQuery += ' ORDER BY created_at ASC';
  
      // Fetch all filtered data (no pagination)
      const [rows] = await pool.execute(baseQuery, params);
  
      if (format === 'pdf') {
        generatePDF(res, rows, {q, status, category});
      } else {
        generateCSV(res, rows);
      }
    } catch (error) {
      console.error('Error exporting notifications:', error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to export notifications" 
      });
    }
});

router.get("/notifications/:id", validateId, handleValidationErrors, requireAdmin, async (req, res) => {
try {
    const notificationId = req.params.id;

    const [rows] = await pool.execute(
        `SELECT n.*,
        u.first_name as created_by_first_name,
        u.last_name as created_by_last_name
            FROM notifications n
            LEFT JOIN users u ON n.created_by_admin_id = u.id
            WHERE n.id = ?`,
        [notificationId]
    );

    if (rows.length === 0) {
    return res.status(404).json({
        success: false,
        message: 'Notification not found'
    });
    }

    res.json(rows[0]);

} catch (error) {
    console.error('Error fetching notification:', error);
    res.status(500).json({
        success: false,
        message: 'Failed to fetch notification details'
    });
}
});

router.post("/notifications", validateAdminNotification, handleValidationErrors, requireAdmin, async (req, res) => {
    try {
        const {
            title,
            message,
            category,
            target_all_users,
            target_user_roles,
        } = req.body;

        const adminId = req.user.id;

        console.log(target_all_users, target_user_roles)

        // Create the notification record
        const [result] = await pool.execute(
            `INSERT INTO notifications (title, message, category, target_all_users, target_user_roles, created_by_admin_id, status)
            VALUES (?, ?, ?, ?, ?, ?, 'draft')`,
            [title, message, category, target_all_users, target_user_roles ? JSON.stringify(target_user_roles) : null, adminId]
        );

        const notificationId = result.insertId;

        // Process and send notifications
        const deliveryResult = await processNotificationDelivery({
            title,
            message,
            category,
            target_all_users,
            target_user_roles,
        });

        // Update notification with delivery stats
        await pool.execute(
            `UPDATE notifications 
                SET status = 'sent', total_recipients = ?, sent_at = NOW()
                WHERE id = ?`,
            [deliveryResult.totalRecipients, notificationId]
        );
        
        // MANUALLY LOG THIS ACTION - Now we have the notification ID!
        // try {
        //     await pool.execute(
        //         `INSERT INTO admin_activity_logs 
        //         (admin_id, action, entity_type, entity_id, new_value, 
        //         ip_address, user_agent, request_method, request_path, status_code)
        //         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        //         [
        //             adminId,
        //             'sent_notification',
        //             'notification',
        //             notificationId,
        //             JSON.stringify({ 
        //                 title, 
        //                 category, 
        //                 totalRecipients: deliveryResult.totalRecipients,
        //                 emailSent: deliveryResult.emailSent,
        //                 pushSent: deliveryResult.pushSent
        //             }),
        //             req.ip || req.connection.remoteAddress,
        //             req.get('user-agent') || null,
        //             'POST',
        //             req.path,
        //             201
        //         ]
        //     );
        // } catch (logError) {
        //     console.error('Failed to log notification activity:', logError);
        //     // Don't fail the request if logging fails
        // }

        res.status(201).json({
            success: true,
            message: 'Notification created and sent successfully',
            data: {
                id: notificationId,
                ...deliveryResult
            }
        });

    } catch (error) {
        console.error('Error creating notification:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create notification'
        });
    }
});

router.post("/notifications/draft", validateAdminNotification, handleValidationErrors, requireAdmin, async (req, res) => {
    try {
        const {
            title,
            message,
            category,
            target_all_users,
            target_user_roles,
        } = req.body;

        const adminId = req.user.id;

        console.log(target_all_users, target_user_roles)

        // Create the notification record
        const [result] = await pool.execute(
            `INSERT INTO notifications (title, message, category, target_all_users, target_user_roles, created_by_admin_id, status)
            VALUES (?, ?, ?, ?, ?, ?, 'draft')`,
            [title, message, category, target_all_users, target_user_roles ? JSON.stringify(target_user_roles) : null, adminId]
        );

        const notificationId = result.insertId;
        
        // MANUALLY LOG THIS ACTION - Now we have the notification ID!
        // try {
        //     await pool.execute(
        //         `INSERT INTO admin_activity_logs 
        //         (admin_id, action, entity_type, entity_id, new_value, 
        //         ip_address, user_agent, request_method, request_path, status_code)
        //         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        //         [
        //             adminId,
        //             'sent_notification',
        //             'notification',
        //             notificationId,
        //             JSON.stringify({ 
        //                 title, 
        //                 category, 
        //                 totalRecipients: deliveryResult.totalRecipients,
        //                 emailSent: deliveryResult.emailSent,
        //                 pushSent: deliveryResult.pushSent
        //             }),
        //             req.ip || req.connection.remoteAddress,
        //             req.get('user-agent') || null,
        //             'POST',
        //             req.path,
        //             201
        //         ]
        //     );
        // } catch (logError) {
        //     console.error('Failed to log notification activity:', logError);
        //     // Don't fail the request if logging fails
        // }

        res.status(201).json({
            success: true,
            message: 'Notification drafted successfully',
            data: {
                id: notificationId,
            }
        });

    } catch (error) {
        console.error('Error drafting notification:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to draft notification'
        });
    }
});

router.put("/notifications/draft/send/:id/", validateId, handleValidationErrors, requireAdmin, async (req, res) => {
    try {
        const notificationId = req.params.id;

        const {
            title,
            message,
            category,
            target_all_users,
            target_user_roles
        } = req.body;

        // Get notification details
        const [notifications] = await pool.execute(
            'SELECT * FROM notifications WHERE id = ? AND status = "draft"',
            [notificationId]
        );

        if (notifications.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Draft notification not found'
            });
        }

        const adminId = req.user.id;

        // Update the notification
        await pool.execute(
            `UPDATE notifications 
            SET title = ?, message = ?, category = ?, 
                target_all_users = ?, target_user_roles = ?, 
                created_by_admin_id = ?
            WHERE id = ?`,
            [title, message, category, target_all_users, target_user_roles ? JSON.stringify(target_user_roles) : null, adminId, notificationId]
        );

        // Process delivery
        const deliveryResult = await processNotificationDelivery({
            title,
            message,
            category,
            target_all_users,
            target_user_roles
        });

        // Update with results
        await pool.execute(
            `UPDATE notifications 
                SET status = 'sent', total_recipients = ?, sent_at = NOW()
                WHERE id = ?`,
            [deliveryResult.totalRecipients, notificationId]
        );

        res.json({
            success: true,
            message: 'Notification updated and sent successfully',
            data: deliveryResult
        });

    } catch (error) {
        console.error('Error updating and sending notification:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update and send notification'
        });
    }
});

router.delete("/notifications/:id", validateId, handleValidationErrors, requireAdmin, async (req, res) => {
    try {
        const notificationId = req.params.id;

        const [result] = await pool.execute(
            'DELETE FROM notifications WHERE id = ?',
            [notificationId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found'
            });
        }

        res.json({
            success: true,
            message: 'Notification deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting notification:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete notification'
        });
    }
});

export default router;