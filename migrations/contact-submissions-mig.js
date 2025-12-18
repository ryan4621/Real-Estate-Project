// Notifications table
import pool from '../database.js';

export const createContactSubmissionsTable = async () => {
    try {
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS contact_submissions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT UNSIGNED NULL,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(255) NOT NULL,
                subject ENUM(
                    'general',
                    'account', 
                    'listings',
                    'technical',
                    'other'
                ) NOT NULL DEFAULT 'general',
                message TEXT NOT NULL,
                status ENUM('pending', 'in_progress', 'resolved', 'closed') NOT NULL DEFAULT 'pending',
                priority ENUM('low', 'normal', 'high', 'urgent') NOT NULL DEFAULT 'normal',
                admin_notes TEXT NULL,
                responded_at TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                
                -- Foreign key constraint
                CONSTRAINT fk_contact_user_id 
                    FOREIGN KEY (user_id) 
                    REFERENCES users(id) 
                    ON DELETE SET NULL 
                    ON UPDATE CASCADE,
                    
                -- Indexes for better query performance
                INDEX idx_contact_user_id (user_id),
                INDEX idx_contact_status (status),
                INDEX idx_contact_subject (subject),
                INDEX idx_contact_created_at (created_at),
                INDEX idx_contact_email (email)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `)
        console.log("✅ Support table created successfully");
    } catch (error) {
        console.error("Error creating support table:", error);
        throw error;
    }
};