// migrations/users-table-mig.js

import pool from "../database.js";

export const createUsersTable = async () => {
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        email VARCHAR(150) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role ENUM('Buyer', 'Admin', 'Super_Admin') DEFAULT 'Buyer',
        phone VARCHAR(20),
        gender ENUM('Male', 'Female', 'Other'),
        zip VARCHAR(20),
        city VARCHAR(100),
        state VARCHAR(100),
        country VARCHAR(100),
        profile_image VARCHAR(255),
        email_verified BOOLEAN DEFAULT FALSE,
        last_verification_sent DATETIME NULL,
        verification_token VARCHAR(255),
        verification_token_expires DATETIME NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deactivated_at DATETIME NULL,
        suspended_at DATETIME NULL,
        deleted_at DATETIME NULL,
        INDEX (email),
        INDEX (verification_token)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("✅ Users table created successfully");
  } catch (error) {
    console.error("❌ Error creating users table:", error.message);
    throw error;
  }
};