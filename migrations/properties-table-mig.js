import pool from '../database.js'

export const createPropertiesTable = async () => {
    try {
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS properties (
            property_id INT UNSIGNED PRIMARY KEY,
            property_type ENUM(
                'Single Family Home',
                'Town House',
                'Multi Family Home',
                'Modular Home',
                'Bungalow',
                'Ranch Home',
                'Condominium',
                'Apartment'
            ) NOT NULL,
            description TEXT NOT NULL,
            status ENUM('Sale', 'Rent', 'Sold') NOT NULL,
            price DECIMAL(12,2) NOT NULL,
            price_per_sqft DECIMAL(10,2),
            garage_space ENUM('0', '1', '2', '3', '4', '5', '6'),
            year_built INT(4),
            bedrooms TINYINT,
            bathrooms TINYINT,
            area DECIMAL(10,2),
            acre_lot DECIMAL(10,2),
            street_number VARCHAR(10),
            street_name VARCHAR(255),
            city VARCHAR(255),
            state VARCHAR(255),
            zip VARCHAR(10),
            country VARCHAR(255),
            latitude DECIMAL(10,6),
            longitude DECIMAL(10,6),
            agent_name VARCHAR(100) NOT NULL,
            agent_email VARCHAR(255),
            broker VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX (agent_email)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `)
        console.log("✅ Properties table created successfully");
    }catch(error){
        console.error('Error creating properties table:', error)
        throw error
    }
}