// Buyer Profile table
import pool from '../database.js'

export const createBuyerProfileTable = async () => {
    try {
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS buyer_profile (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                user_id INT UNSIGNED NOT NULL UNIQUE,
                annual_household_income DECIMAL(12,2) DEFAULT NULL,
                monthly_debt DECIMAL(10,2) DEFAULT NULL,
                available_funds DECIMAL(12,2) DEFAULT NULL,
                veteran_status BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX (user_id),
                CONSTRAINT fk_buyer_profile_user
                    FOREIGN KEY (user_id)
                    REFERENCES users(id)
                    ON DELETE CASCADE
                    ON UPDATE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `)
        console.log("✅ Buyer profile table created successfully");
    } catch (error) {
        console.error("Error creating buyer profile table:", error);
        throw error;
    }
};