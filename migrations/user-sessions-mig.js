import pool from '../database.js';

export async function createUserSessionsTable() {
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNSIGNED NOT NULL,
        session_token VARCHAR(255) NOT NULL,
        device_info VARCHAR(500) NULL,
        ip_address VARCHAR(45) NULL,
        location VARCHAR(255) NULL,
        is_current BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NULL,
        
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_sessions (user_id),
        INDEX idx_session_token (session_token)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log('✅ user_sessions table created successfully');
    
  } catch (error) {
    console.error('❌ Error creating user_sessions table:', error);
    throw error;
  }
}