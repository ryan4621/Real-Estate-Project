// Inquiries table
import pool from '../database.js';

export const createInquiriesTable = async () => {
    try {
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS inquiries (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                property_id INT UNSIGNED NOT NULL,
                user_id INT UNSIGNED,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(100) NOT NULL,
                phone VARCHAR(20) NOT NULL,
                message TEXT NOT NULL,
                request_tour BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX (property_id),
                INDEX (user_id),
                CONSTRAINT fk_inquiries_property
                    FOREIGN KEY (property_id)
                    REFERENCES properties(property_id)
                    ON DELETE CASCADE
                    ON UPDATE CASCADE,
                CONSTRAINT fk_inquiries_user
                    FOREIGN KEY (user_id)
                    REFERENCES users(id)
                    ON DELETE SET NULL
                    ON UPDATE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `)
        console.log("✅ Inquiries table created successfully");
    } catch (error) {
        console.error("Error creating inquiries table:", error);
        throw error;
    }
};