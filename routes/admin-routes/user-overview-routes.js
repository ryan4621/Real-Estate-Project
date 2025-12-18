import express from 'express';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import PDFDocument from 'pdfkit';
import pool from '../../database.js';
import { requireAdmin } from '../../middleware/authentication.js'
import { sendNotificationEmail } from '../../middleware/email-service.js';
import { validateId, validateUserStatus, validateAdminSendEmail, handleValidationErrors } from '../../middleware/validation.js'

const router = express.Router()
dotenv.config()

// Get detailed user information for overview page
router.get("/users/:id/overview", validateId, handleValidationErrors, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        // Get user basic info
        const [userRows] = await pool.execute(`
        SELECT id, first_name, last_name, email, phone, country, gender, role, 
        created_at, deactivated_at, deleted_at, suspended_at, profile_image, email_verified
        FROM users WHERE id = ?
        `, [id]);

        if (userRows.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        const user = userRows[0];

        const [inquiriesRows] = await pool.execute(`
            SELECT * FROM inquiries WHERE user_id = ?
        `, [id]);

        // Get user preferences
        // const [preferencesRows] = await pool.execute(`
        //     SELECT * FROM user_preferences WHERE user_id = ?
        // `, [id]);

        // Get user sessions
        const [sessionsRows] = await pool.execute(`
            SELECT device_info, ip_address, location, created_at, last_active, is_current
            FROM user_sessions 
            WHERE user_id = ? 
            ORDER BY last_active DESC, created_at DESC
            LIMIT 20
        `, [id]);

        // Get user's support tickets
        const [ticketsRows] = await pool.execute(`
            SELECT id, subject, status, priority, created_at
            FROM contact_submissions 
            WHERE user_id = ? 
            ORDER BY created_at DESC
        `, [id]);

        // Get user's notifications
        // const [notificationsRows] = await pool.execute(`
        //     SELECT COUNT(*) as total_notifications,
        //         COUNT(CASE WHEN is_read = FALSE THEN 1 END) as unread_notifications
        //     FROM user_notifications 
        //     WHERE user_id = ? AND is_deleted = FALSE
        // `, [id]);

        // Get user security settings
        // const [securityRows] = await pool.execute(`
        //     SELECT two_factor_enabled FROM user_security_settings WHERE user_id = ?
        // `, [id]);

        // Get activity logs
        // const [activityRows] = await pool.execute(`
        //     SELECT activity_type, description, ip_address, created_at
        //     FROM activity_logs 
        //     WHERE user_id = ? 
        //     ORDER BY created_at DESC 
        //     LIMIT 20
        // `, [id]);

        // Get user addresses
        // const [addressRows] = await pool.execute(`
        //     SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC
        // `, [id]);

        // Calculate some stats
        const activeTickets = ticketsRows.filter(ticket => 
        ['pending', 'in_progress'].includes(ticket.status)
        ).length;

        const lastLogin = sessionsRows.length > 0 ? (sessionsRows[0].last_active || sessionsRows[0].created_at) : null;

        res.json({
            user,
            // preferences: preferencesRows[0] || null,
            sessions: sessionsRows,
            supportTickets: {
                tickets: ticketsRows,
                activeCount: activeTickets,
                totalCount: ticketsRows.length
            },
            // notifications: notificationsRows[0] || { total_notifications: 0, unread_notifications: 0 },
            // security: securityRows[0] || { two_factor_enabled: false },
            // activity: activityRows,
            // addresses: addressRows,
            inquiries: inquiriesRows.length,
            stats: {
                lastLogin,
                totalSessions: sessionsRows.length,
                currentSessions: sessionsRows.filter(s => s.is_current).length
            }
        });
  
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Database error" });
    }
});

// Export user overview data as JSON
router.get("/users/:id/export-overview", validateId, handleValidationErrors, requireAdmin, async (req, res) => {
try {
    const { id } = req.params;

    // Get user basic info
    const [userRows] = await pool.execute(`
    SELECT id, first_name, last_name, email, phone, country, gender, role,
    created_at, deactivated_at, deleted_at, suspended_at, profile_image, email_verified
    FROM users WHERE id = ?
    `, [id]);

    if (userRows.length === 0) {
        return res.status(404).json({ error: "User not found" });
    }

    const user = userRows[0];

    const [inquiriesRows] = await pool.execute(`
        SELECT * FROM inquiries WHERE user_id = ?
    `, [id]);

    // Get user preferences
    // const [preferencesRows] = await pool.execute(`
    //     SELECT * FROM user_preferences WHERE user_id = ?
    // `, [id]);

    // Get user sessions
    const [sessionsRows] = await pool.execute(`
        SELECT device_info, ip_address, location, created_at, last_active, is_current
        FROM user_sessions 
        WHERE user_id = ? 
        ORDER BY last_active DESC, created_at DESC
        LIMIT 20
    `, [id]);

    // Get user's support tickets
    const [ticketsRows] = await pool.execute(`
        SELECT id, subject, status, priority, created_at
        FROM contact_submissions 
        WHERE user_id = ? 
        ORDER BY created_at DESC
    `, [id]);

    // Get user's notifications
    // const [notificationsRows] = await pool.execute(`
    // SELECT COUNT(*) as total_notifications,
    //     COUNT(CASE WHEN is_read = FALSE THEN 1 END) as unread_notifications
    // FROM user_notifications 
    // WHERE user_id = ? AND is_deleted = FALSE
    // `, [id]);

    // Get user security settings
    // const [securityRows] = await pool.execute(`
    // SELECT two_factor_enabled FROM user_security_settings WHERE user_id = ?
    // `, [id]);

    // Get activity logs
    // const [activityRows] = await pool.execute(`
    //     SELECT activity_type, description, ip_address, created_at
    //     FROM activity_logs 
    //     WHERE user_id = ? 
    //     ORDER BY created_at DESC 
    //     LIMIT 20
    // `, [id]);

    // Get user addresses
    // const [addressRows] = await pool.execute(`
    //     SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC
    // `, [id]);

    const activeTickets = ticketsRows.filter(ticket => 
    ['pending', 'in_progress'].includes(ticket.status)
    ).length;

    const lastLogin = sessionsRows.length > 0 ? 
    (sessionsRows[0].last_active || sessionsRows[0].created_at) : null;

    const exportData = {
        user,
        // preferences: preferencesRows[0] || null,
        sessions: sessionsRows,
        supportTickets: {
            tickets: ticketsRows,
            activeCount: activeTickets,
            totalCount: ticketsRows.length
        },
        // notifications: notificationsRows[0] || { total_notifications: 0, unread_notifications: 0 },
        // security: securityRows[0] || { two_factor_enabled: false },
        // activity: activityRows,
        // addresses: addressRows,
        inquiries: inquiriesRows.length,
        stats: {
            lastLogin,
            totalSessions: sessionsRows.length,
            currentSessions: sessionsRows.filter(s => s.is_current).length
        }
    };

    // Set headers for download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=user_${id}_overview_${Date.now()}.json`);
    
    res.json(exportData);

} catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to export user data" });
}
});

// Update user status (activate/deactivate/delete)
router.post("/users/:id/status", validateId, validateUserStatus, handleValidationErrors, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { action } = req.body;

        let updateQuery = '';
        let params = [];
        let message;

        switch (action) {
            case 'activate':
                updateQuery = 'UPDATE users SET deactivated_at = NULL, deleted_at = NULL, suspended_at = NULL WHERE id = ?';
                params = [id];
                message = "User activated successfully"
                break;
            case 'deactivate':
                updateQuery = 'UPDATE users SET deactivated_at = NOW(), suspended_at = NULL WHERE id = ?';
                params = [id];
                // Clear all active sessions for this user to force logout
                await pool.execute('DELETE FROM user_sessions WHERE user_id = ?', [id]);
                message = "User deactivated successfully"
                break;
            case 'suspend':
                updateQuery = 'UPDATE users SET suspended_at = NOW(), deactivated_at = NULL WHERE id = ?';
                params = [id];
                // Clear all active sessions for this user to force logout
                await pool.execute('DELETE FROM user_sessions WHERE user_id = ?', [id]);
                message = "User suspended successfully"
                break;
            default:
                return res.status(400).json({ error: "Invalid action" });
        }

        const [result] = await pool.execute(updateQuery, params);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json({ message: message});
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Database error" });
    }
});

// Reset user password (generate new temporary password)
router.post("/users/:id/reset-password", validateId, handleValidationErrors, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Generate temporary password
        const tempPassword = Array.from({ length: 10 }, () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 62)]).join('');
        const hashedPassword = await bcrypt.hash(tempPassword, 10);
        
        const [result] = await pool.execute(
            'UPDATE users SET password = ? WHERE id = ?',
            [hashedPassword, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        await pool.execute(
            "DELETE FROM user_sessions WHERE user_id = ?",
            [id]
        );

        // In a real app, you'd email this to the user
        res.json({ 
            message: "Password reset successfully. User must log in with new password.",
            tempPassword: tempPassword// Remove this in production - send via email instead
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Database error" });
    }
});

// Send email to user
router.post("/users/:id/send-email", validateId, validateAdminSendEmail, handleValidationErrors, requireAdmin, async (req, res) => {
try {
    const { id } = req.params;
    const { subject, message } = req.body;

    // Get user email
    const [userRows] = await pool.execute('SELECT first_name, last_name, email FROM users WHERE id = ?', [id]);
    
    if (userRows.length === 0) {
        return res.status(404).json({ error: "User not found" });
    }

    const user = userRows[0];

    const fullName = user.first_name + ' ' + user.last_name

    // Send email using your existing email service
    await sendNotificationEmail(user.email, fullName, subject, message, 'general');

    res.json({ message: "Email sent successfully" });
} catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to send email" });
}
});

export default router;