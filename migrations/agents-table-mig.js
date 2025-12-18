import pool from '../database.js'

export const createAgentsTable = async () => {
    try {
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS agents (
            id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            email VARCHAR(150) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            bio TEXT,
            phone VARCHAR(20),
            country VARCHAR(100),
            gender ENUM('male', 'female', 'other'),
            years_of_experience TINYINT UNSIGNED,
            license_number VARCHAR(100),
            agency_name VARCHAR(100),
            rating DECIMAL(3,1) DEFAULT 0.0,
            verified BOOLEAN DEFAULT FALSE,
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
        `)
        console.log('✅ Agents table created successfully')
    }catch(error){
        console.error("Error creating agents table:", error)
        throw error
    }
}