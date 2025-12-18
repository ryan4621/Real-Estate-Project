import pool from '../database.js';

export async function createAdminActivityLogsTable() {
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS admin_activity_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        admin_id INT NOT NULL,
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(50) NULL,
        entity_id VARCHAR(50) NULL,
        old_value TEXT NULL,
        new_value TEXT NULL,
        ip_address VARCHAR(45) NULL,
        user_agent VARCHAR(500) NULL,
        request_method VARCHAR(10) NULL,
        request_path VARCHAR(500) NULL,
        status_code INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX (admin_id),
        INDEX (action),
        INDEX (created_at),
        INDEX (entity_type, entity_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    
    console.log('✅ admin_activity_logs table created successfully');
  } catch (error) {
    console.error('❌ Error creating admin_activity_logs table:', error);
    throw error;
  }
}