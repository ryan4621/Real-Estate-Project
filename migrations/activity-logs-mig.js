import pool from '../database.js';

export async function createActivityLogsTable () {
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        activity_type ENUM('login', 'logout', 'password_change', 'profile_update', '2fa_enabled', '2fa_disabled', 'session_terminated') NOT NULL,
        description TEXT NOT NULL,
        ip_address VARCHAR(45) NULL,
        device_info VARCHAR(500) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX (user_id),
        INDEX (activity_type),
        INDEX (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    
    console.log('✅ activity_logs table created successfully');
    
  } catch (error) {
    console.error('❌ Error creating activity_logs table:', error);
    throw error;
  }
}