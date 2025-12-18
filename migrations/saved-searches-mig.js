// Saved searches table
import pool from '../database.js';

export const createSavedSearchesTable = async () => {
    try {
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS saved_searches (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                user_id INT UNSIGNED NOT NULL,
                category ENUM('Homes For Sale', 'Homes For Rent', 'Sold Homes') NOT NULL,
                filters JSON NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX (user_id),
                CONSTRAINT fk_saved_searches_user
                    FOREIGN KEY (user_id)
                    REFERENCES users(id)
                    ON DELETE CASCADE
                    ON UPDATE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log("✅ Saved searches table created successfully");
    } catch (error) {
        console.error("Error creating saved searches table:", error);
        throw error;
    }
};