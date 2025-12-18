// Notifications table
import pool from '../database.js';

export const createNotificationsTable = async () => {
    try {
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS notifications (
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            category ENUM(
                'general',
                'saved_listings', 
                'marketing_emails'
            ) NOT NULL DEFAULT 'general',
            
            -- Targeting options
            target_all_users BOOLEAN DEFAULT TRUE,
            target_user_roles JSON DEFAULT NULL,
            
            -- Scheduling
            scheduled_for TIMESTAMP NULL,
            sent_at TIMESTAMP NULL,
            
            -- Status and metadata
            status ENUM(
                'draft',
                'scheduled',
                'sent',
                'cancelled'
            ) DEFAULT 'draft',
            total_recipients INT DEFAULT 0,
            
            -- Admin info
            created_by_admin_id INT UNSIGNED NULL,
            
            -- Timestamps
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            
            -- Indexes for performance
            INDEX idx_notifications_category (category),
            INDEX idx_notifications_status (status),
            INDEX idx_notifications_scheduled (scheduled_for),
            INDEX idx_notifications_created_at (created_at),

            CONSTRAINT fk_notifications_user
                FOREIGN KEY (created_by_admin_id)
                REFERENCES users(id)
                ON DELETE SET NULL
                ON UPDATE CASCADE
            
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `)
        console.log("✅ Notifications table created successfully");
    } catch (error) {
        console.error("Error creating notifications table:", error);
        throw error;
    }
};