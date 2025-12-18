import pool from '../database.js';

export async function createNotificationSettingsTable() {
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS notification_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNSIGNED NOT NULL,
        
        -- Notification Settings
        saved_listings ENUM('realtime', 'once_a_day', 'no_thanks') DEFAULT 'once_a_day',
        marketing_emails ENUM('yes', 'no') DEFAULT 'yes',
        
        -- Timestamps
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        -- Foreign key and constraints
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_notification_settings (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log('✅ Notification settings table created successfully');
    
  } catch (error) {
    console.error('❌ Error creating notification settings table:', error);
    throw error;
  }
}