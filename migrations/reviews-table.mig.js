// Reviews table
import pool from '../database.js'

export const createReviewsTable = async () => {
    try {
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS reviews (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                property_id INT UNSIGNED NOT NULL,
                user_id INT UNSIGNED NULL,
                rating TINYINT UNSIGNED NOT NULL CHECK (rating BETWEEN 1 AND 5),
                comment TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX (property_id),
                INDEX (user_id),
                CONSTRAINT fk_reviews_property
                    FOREIGN KEY (property_id)
                    REFERENCES properties(id)
                    ON DELETE CASCADE
                    ON UPDATE CASCADE,
                CONSTRAINT fk_reviews_user
                    FOREIGN KEY (user_id)
                    REFERENCES users(id)
                    ON DELETE SET NULL
                    ON UPDATE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `)
        console.log("✅ Reviews table created successfully");
    } catch (error) {
        console.error("Error creating reviews table:", error);
        throw error;
    }
};