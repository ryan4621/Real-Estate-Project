// Pre-approvals table
import pool from '../database.js';

export const createPreApprovalsTable = async () => {
    try {
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS pre_approvals (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                user_id INT UNSIGNED,
                home_type VARCHAR(50) NOT NULL,
                property_usage VARCHAR(50) NOT NULL,
                location VARCHAR(255) NOT NULL,
                buying_timeline VARCHAR(100) NOT NULL,
                working_with_agent VARCHAR(50) NOT NULL,
                currently_own_home VARCHAR(100) NOT NULL,
                sell_current_home ENUM('Yes', 'No'),
                first_time_buyer VARCHAR(50) NOT NULL,
                military_service VARCHAR(50) NOT NULL,
                price_range_min DECIMAL(12, 2) NOT NULL,
                price_range_max DECIMAL(12, 2) NOT NULL,
                down_payment_amount DECIMAL(12, 2) NOT NULL,
                down_payment_percentage TINYINT UNSIGNED NOT NULL,
                employment_status VARCHAR(50) NOT NULL,
                annual_income VARCHAR(50) NOT NULL,
                credit_score VARCHAR(50) NOT NULL,
                bankruptcy_foreclosure VARCHAR(50) NOT NULL,
                first_name VARCHAR(50) NOT NULL,
                last_name VARCHAR(50) NOT NULL,
                email VARCHAR(100) NOT NULL,
                is_verified BOOLEAN DEFAULT FALSE,
                result_status VARCHAR(50),
                max_purchase_price DECIMAL(12, 2),
                max_loan_amount DECIMAL(12, 2),
                estimated_interest_rate VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX (user_id),
                INDEX (email),
                INDEX (status),
                CONSTRAINT fk_preapprovals_user
                    FOREIGN KEY (user_id)
                    REFERENCES users(id)
                    ON DELETE SET NULL
                    ON UPDATE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log("✅ Pre_approvals table created successfully");
    } catch (error) {
        console.error("Error creating pre-approvals table:", error);
        throw error;
    }
};