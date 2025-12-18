import pool from '../database.js'

export const createPropertiesImagesTable = async () => {
    try {
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS properties_images (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                property_id INT,
                image_url VARCHAR(255),
                is_primary BOOLEAN DEFAULT FALSE,
                property_section ENUM('exterior','living_room','kitchen','dining_room','bedroom','bathroom','others') NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX (property_id),
                CONSTRAINT fk_property_image
                    FOREIGN KEY (property_id)
                    REFERENCES properties(property_id)
                    ON DELETE CASCADE
                    ON UPDATE CASCADE
            )   ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `)
        console.log("✅ Properties images table created successfully");
    }catch(error){
        console.error('Error creating properties images table:', error)
        throw error
    }
};