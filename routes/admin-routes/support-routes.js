import express from 'express';
import dotenv from 'dotenv';
import PDFDocument from 'pdfkit';
import pool from '../../database.js';
import { requireAdmin } from '../../middleware/authentication.js'
import { applyPagination, applySearch, applyFilters } from "../../utils/query-helpers.js";
import { validateId, validateAdminContactQuery, validateAdminContactExport, validateContactSubmissionUpdate, validatePagination, handleValidationErrors } from '../../middleware/validation.js'

const router = express.Router()
dotenv.config()

function generateCSV(res, rows) {
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename=support-tickets-export-${Date.now()}.csv`);

  // CSV Headers
  res.write("id,name,email,subject,status,priority,message,admin_notes,user_account,responded_at,created_at,updated_at\n");
    
    // Write CSV data
    rows.forEach(row => {
        const safe = val => (val === null || val === undefined) ? "" : String(val).replace(/"/g, '""');
        const userAccount = row.user_name ? 'Registered User' : 'Guest';
        const cleanMessage = safe(row.message).replace(/[\r\n]+/g, ' ').substring(0, 200);
        const cleanNotes = safe(row.admin_notes).replace(/[\r\n]+/g, ' ');

        const respondedAt = row.responded_at ? row.responded_at.toLocaleString() : "N/A";
        const createdAt = row.created_at ? row.created_at.toLocaleString() : "N/A";
        const updatedAt = row.updated_at ? row.updated_at.toLocaleString() : "N/A";
        
        res.write(`"${safe(row.id)}","${safe(row.name)}","${safe(row.email)}","${safe(row.subject)}","${safe(row.status)}","${safe(row.priority)}","${cleanMessage}","${cleanNotes}","${userAccount}","${safe(respondedAt)}","${safe(createdAt)}","${safe(updatedAt)}"\n`);
    });
  
  res.end();
}

function generatePDF(res, rows, filters = {}) {
  // Set response headers
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=support-tickets-export-${Date.now()}.pdf`
  );

  // Create a PDF document
  const doc = new PDFDocument({ size: [1100, 842], margin: 40, layout: 'landscape' });

  // Pipe PDF directly to response
  doc.pipe(res);

  // Document title
  doc.fontSize(16).text("Support Tickets Export Report", { align: 'center' });
  doc.moveDown();

  // Generated info
  doc.fontSize(10)
    .text(`Generated: ${new Date().toLocaleString()}`)
    .text(`Total Tickets: ${rows.length}`)
    .text(`Filters Applied: ${Object.keys(filters).length > 0 ? 'Yes' : 'None'}`)
    .moveDown();

  // Table headers
  const tableHeaders = [
    "ID", "Name", "Email", "Subject", "Status", "Priority", "Message", "Admin Notes", "User Account", "Responded At", "Created At", "Updated At"
  ];

  // Column widths (adjust as needed)
  const colWidths = [40, 90, 120, 40, 40, 40, 150, 150, 40, 90, 90, 90];

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

    const userAccount = row.user_name ? 'Registered User' : 'Guest';
    const respondedAt = row.responded_at ? row.responded_at.toLocaleString() : "N/A";
    const createdAt = row.created_at ? row.created_at.toLocaleString() : "N/A";
    const updatedAt = row.updated_at ? row.updated_at.toLocaleString() : "N/A";

    const rowValues = [
      row.id, row.name, row.email, row.subject, row.status, row.priority, row.message, row.admin_notes, userAccount, respondedAt, createdAt, updatedAt
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

router.get('/contact/statistics', requireAdmin, async (req, res) => {
    try {
    
        // Status distribution
        const [statusStats] = await pool.execute(`
            SELECT 
                status,
                COUNT(*) as count,
                ROUND(AVG(TIMESTAMPDIFF(HOUR, created_at, 
                CASE WHEN responded_at IS NOT NULL THEN responded_at ELSE NOW() END)), 2) as avg_response_time_hours
            FROM contact_submissions 
            GROUP BY status
        `);
    
        // Subject distribution
        const [subjectStats] = await pool.execute(`
            SELECT 
                subject,
                COUNT(*) as total,
                COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending
            FROM contact_submissions 
            GROUP BY subject
            ORDER BY total DESC
        `);
    
        // Priority distribution
        const [priorityStats] = await pool.execute(`
            SELECT 
                priority,
                COUNT(*) as count
            FROM contact_submissions 
            GROUP BY priority
        `);
    
        // Recent submissions (last 7 days)
        const [recentStats] = await pool.execute(`
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as submissions
            FROM contact_submissions 
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            GROUP BY DATE(created_at)
            ORDER BY date DESC
        `);
    
        // Overall metrics
        const [overallStats] = await pool.execute(`
            SELECT 
                COUNT(*) as total_submissions,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
                COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY) THEN 1 END) as today_count,
                COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as week_count
            FROM contact_submissions
        `);
    
        res.json({
            success: true,
            data: {
                overall: overallStats[0],
                byStatus: statusStats,
                bySubject: subjectStats,
                byPriority: priorityStats,
                recentActivity: recentStats
            }
        });
    
    } catch (error) {
        console.error('Error fetching contact statistics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch statistics'
        });
    }
});

router.get('/contact/submissions', validateAdminContactQuery, validatePagination, handleValidationErrors, requireAdmin, async (req, res) => {
    try {
  
        const { page, limit, offset } = req.pagination;
        const { q, status, priority, subject, sortBy, sortOrder } = req.query;
  
        let baseQuery = `
            SELECT cs.id, cs.user_id, cs.name, cs.email, cs.subject, cs.message, 
            cs.status, cs.priority, cs.admin_notes, cs.responded_at, 
            cs.created_at, cs.updated_at,
            CONCAT(u.first_name, ' ', u.last_name) as user_name
            FROM contact_submissions cs
            LEFT JOIN users u ON cs.user_id = u.id
        `;
        let params = [];

        // 1️⃣ Apply search (optional)
        if (q) {
            const searchResult = applySearch(baseQuery, q, [
                "cs.id", "cs.user_id", "cs.name", "cs.email", "cs.subject", "cs.message", "cs.status", "cs.priority", "cs.admin_notes", "u.first_name", "u.last_name", "cs.created_at", "cs.updated_at", "cs.responded_at"
            ]);
            baseQuery = searchResult.query;
            params = [...searchResult.params];
        }
    
        // 2️⃣ Apply filters (optional)
        const filterResult = applyFilters(baseQuery, { status, priority, subject });
        baseQuery = filterResult.query;
        params = [...params, ...filterResult.params];
    
        // 3️⃣ Get total count for pagination
        const [countRows] = await pool.execute(
            `SELECT COUNT(*) AS total FROM (${baseQuery}) AS total_contact_submissions`,
            params
        );
        const total = countRows[0].total;

        // Add sorting
        const validSortColumns = ['created_at', 'updated_at', 'priority', 'status', 'subject'];
        const validSortOrder = ['ASC', 'DESC'];
        
        if (validSortColumns.includes(sortBy) && validSortOrder.includes(sortOrder.toUpperCase())) {
            baseQuery += ` ORDER BY cs.${sortBy} ${sortOrder.toUpperCase()}`;
        } else {
            baseQuery += ' ORDER BY cs.created_at DESC';
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
      console.error('Error fetching admin submissions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch submissions'
      });
    }
});

router.get("/contact/export", validateAdminContactExport, handleValidationErrors, requireAdmin, async (req, res) => {
    let exportMessage;
    try {

        const { format = 'csv', q, status, priority, subject } = req.query;

        let baseQuery = `
            SELECT cs.id, cs.user_id, cs.name, cs.email, cs.subject, cs.message, 
            cs.status, cs.priority, cs.admin_notes, cs.responded_at, 
            cs.created_at, cs.updated_at,
            CONCAT(u.first_name, ' ', u.last_name) as user_name
            FROM contact_submissions cs
            LEFT JOIN users u ON cs.user_id = u.id
        `;
        let params = [];

        // Apply filters
        if (q && (status || priority || subject)) {
            const filterKeys = [];
            const filterValues = [];
            if (status) {
                filterKeys.push('status = ?');
                filterValues.push(status);
            }
            if (priority) {
                filterKeys.push('priority = ?');
                filterValues.push(priority);
            }
            if (subject) {
                filterKeys.push('subject = ?');
                filterValues.push(subject);
            }
            baseQuery += ` AND ${filterKeys.join(' AND ')}`;
            params = [...params, ...filterValues];
        } else if (!q && (status || priority || subject)) {
            const filterResult = applyFilters(baseQuery, { status, priority, subject });
            baseQuery = filterResult.query;
            params = [...params, ...filterResult.params];
        }
    
        baseQuery += ' ORDER BY created_at ASC';
    
        // Fetch all filtered data (no pagination)
        const [rows] = await pool.execute(baseQuery, params);
    
        exportMessage = format === "pdf" ? "Failed to export PDF" : "Failed to export CSV"
        if (format === 'pdf') {
            generatePDF(res, rows, { status, priority, subject, q });
        } else {
            generateCSV(res, rows);
        }
    } catch (error) {
        console.error('Error exporting contact submissions:', error);
        res.status(500).json({ 
            success: false, 
            message: exportMessage
        });
    }
});

router.put('/contact/submission/:id', validateId, validateContactSubmissionUpdate, handleValidationErrors, requireAdmin, async (req, res) => {
    try {
        const submissionId = req.params.id;
        const { status, admin_notes, priority } = req.body;

        // Build update query dynamically
        const updates = [];
        const params = [];

        if (status) {
            updates.push('status = ?');
            params.push(status);
        }

        if (admin_notes !== undefined) {
            updates.push('admin_notes = ?');
            params.push(admin_notes);
        }

        if (priority) {
            updates.push('priority = ?');
            params.push(priority);
        }

        // Set responded_at if moving to resolved or closed
        if (status === 'resolved' || status === 'closed') {
            updates.push('responded_at = NOW()');
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No valid fields to update'
            });
        }

        updates.push('updated_at = NOW()');
        params.push(submissionId);

        const [result] = await pool.execute(
            `UPDATE contact_submissions SET ${updates.join(', ')} WHERE id = ?`,
            params
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Submission not found'
            });
        }

        // Get updated submission
        const [updated] = await pool.execute(
            'SELECT * FROM contact_submissions WHERE id = ?',
            [submissionId]
        );

        res.json({
            success: true,
            message: 'Submission updated successfully',
            data: updated[0]
        });

    } catch (error) {
        console.error('Error updating submission:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update submission'
        });
    }
});

router.get("/contact/submission/:id", validateId, handleValidationErrors, requireAdmin, async (req, res) => {
    try {
        const submissionId = req.params.id;

        const [rows] = await pool.execute(
            `SELECT cs.id, cs.user_id, cs.name, cs.email, cs.subject, cs.message, 
                    cs.status, cs.priority, cs.admin_notes, cs.responded_at, 
                    cs.created_at, cs.updated_at,
                    CONCAT(u.first_name, ' ', u.last_name) as user_name,
                    u.email as user_email
                FROM contact_submissions cs
                LEFT JOIN users u ON cs.user_id = u.id
                WHERE cs.id = ?`,
            [submissionId]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Submission not found'
            });
        }

        res.json(rows[0]);

    } catch (error) {
        console.error('Error fetching submission:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch submission details'
        });
    }
});

export default router;