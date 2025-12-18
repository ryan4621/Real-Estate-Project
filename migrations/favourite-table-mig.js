// Favourites table
import pool from '../database.js'

export const createFavoritesTable = async () => {
    try {
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS favorites (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                user_id INT UNSIGNED NOT NULL,
                property_id INT UNSIGNED NOT NULL,
                property_type ENUM(
                    'Single Family Home',
                    'Town House',
                    'Multi Family Home',
                    'Modular Home',
                    'Bungalow',
                    'Ranch Home',
                    'Condominium'
                ) NOT NULL,
                status ENUM('Sale', 'Rent', 'Sold') NOT NULL,
                price DECIMAL(12,2) NOT NULL,
                bedrooms TINYINT,
                bathrooms TINYINT,
                area DECIMAL(10,2),
                address VARCHAR(255),
                location VARCHAR(255),
                primary_image VARCHAR(255),
                agent_name VARCHAR(100) NOT NULL,
                broker VARCHAR(255),
                added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX (user_id),
                INDEX (property_id),
                CONSTRAINT fk_favourites_user
                    FOREIGN KEY (user_id)
                    REFERENCES users(id)
                    ON DELETE CASCADE
                    ON UPDATE CASCADE,
                CONSTRAINT fk_favourites_property
                    FOREIGN KEY (property_id)
                    REFERENCES properties(property_id)
                    ON DELETE CASCADE
                    ON UPDATE CASCADE,
                UNIQUE KEY unique_favourite (user_id, property_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `)
        console.log("✅ Favorites table created successfully");
    } catch (error) {
        console.error("Error creating favorites table:", error);
        throw error;
    }
};