// Open houses table
import pool from '../database.js';

export const createOpenHousesTable = async () => {
    try {
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS open_houses (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                property_id INT UNSIGNED NOT NULL,
                start_datetime DATETIME NOT NULL,
                end_datetime DATETIME NOT NULL,
                host_name VARCHAR(255),
                host_phone VARCHAR(20),
                host_email VARCHAR(255),
                description TEXT,
                status ENUM('Scheduled', 'Completed', 'Cancelled') DEFAULT 'Scheduled',
                max_attendees INT UNSIGNED,
                current_attendees INT UNSIGNED DEFAULT 0,
                requires_rsvp BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX (property_id),
                INDEX (start_datetime),
                INDEX (status),
                CONSTRAINT fk_open_house_property
                    FOREIGN KEY (property_id)
                    REFERENCES properties(property_id)
                    ON DELETE CASCADE
                    ON UPDATE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log("✅ Open houses table created successfully");
    } catch (error) {
        console.error("Error creating open houses table:", error);
        throw error;
    }
};