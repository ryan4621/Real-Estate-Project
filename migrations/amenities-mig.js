// Favourites table
import pool from '../database.js'

export const createAmenitiesTable = async () => {
    try {
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS amenities (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                property_id INT UNSIGNED NOT NULL,
                swimming_pool BOOLEAN DEFAULT FALSE,
                elevator BOOLEAN DEFAULT FALSE,
                high_ceiling BOOLEAN DEFAULT FALSE,
                hardwood_floors BOOLEAN DEFAULT FALSE,
                game_room BOOLEAN DEFAULT FALSE,
                gourmet_kitchen BOOLEAN DEFAULT FALSE,
                ensuite BOOLEAN DEFAULT FALSE,
                water_view BOOLEAN DEFAULT FALSE,
                city_view BOOLEAN DEFAULT FALSE,
                pets_allowed BOOLEAN DEFAULT FALSE,
                guest_house BOOLEAN DEFAULT FALSE,
                single_story BOOLEAN DEFAULT FALSE,
                security_features BOOLEAN DEFAULT FALSE,
                water_front BOOLEAN DEFAULT FALSE,
                gym BOOLEAN DEFAULT FALSE,
                community_gym BOOLEAN DEFAULT FALSE,
                library BOOLEAN DEFAULT FALSE,
                fitness_centre BOOLEAN DEFAULT FALSE,
                club_house BOOLEAN DEFAULT FALSE,
                garage BOOLEAN DEFAULT FALSE,
                recreational_amenities BOOLEAN DEFAULT FALSE,
                tennis_court BOOLEAN DEFAULT FALSE,
                fireplace BOOLEAN DEFAULT FALSE,
                multi_stories BOOLEAN DEFAULT FALSE,
                courtyard_style BOOLEAN DEFAULT FALSE,
                rv_parking BOOLEAN DEFAULT FALSE,
                INDEX (property_id),
                CONSTRAINT fk_amenities
                    FOREIGN KEY (property_id)
                    REFERENCES properties(property_id)
                    ON DELETE CASCADE
                    ON UPDATE CASCADE,
                UNIQUE KEY unique_amenities (property_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `)
        console.log("✅ Amenities table created successfully");
    } catch (error) {
        console.error("Error creating amenities table:", error);
        throw error;
    }
};