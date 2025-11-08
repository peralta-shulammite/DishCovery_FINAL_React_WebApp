-- =============================================
-- Notifications Table for DishCovery
-- =============================================

CREATE TABLE IF NOT EXISTS notifications (
  notification_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  notification_type ENUM('admin', 'system', 'update', 'reminder', 'feedback_reply') DEFAULT 'admin',
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP NULL,
  sender_name VARCHAR(100) DEFAULT 'Admin',
  sender_role VARCHAR(50) DEFAULT 'ADMIN',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_is_read (is_read),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- Sample Notifications (for testing)
-- =============================================

-- Insert welcome notification for all existing users
INSERT INTO notifications (user_id, title, message, notification_type, sender_name, sender_role)
SELECT 
  user_id,
  'Welcome to DishCovery!',
  'Thank you for joining DishCovery. We are excited to help you discover amazing recipes!',
  'admin',
  'Admin',
  'ADMIN'
FROM users
WHERE NOT EXISTS (
  SELECT 1 FROM notifications WHERE user_id = users.user_id AND title = 'Welcome to DishCovery!'
);

-- =============================================
-- Indexes for Performance
-- =============================================

-- Index for quickly finding unread notifications
ALTER TABLE notifications ADD INDEX idx_unread (user_id, is_read, created_at);

-- =============================================
-- Comments
-- =============================================

COMMENT ON TABLE notifications IS 'Stores user notifications from admin and system';
COMMENT ON COLUMN notifications.notification_id IS 'Primary key';
COMMENT ON COLUMN notifications.user_id IS 'User receiving the notification';
COMMENT ON COLUMN notifications.title IS 'Notification title/subject';
COMMENT ON COLUMN notifications.message IS 'Notification message body';
COMMENT ON COLUMN notifications.notification_type IS 'Type of notification';
COMMENT ON COLUMN notifications.is_read IS 'Whether notification has been read';
COMMENT ON COLUMN notifications.read_at IS 'When notification was read';
COMMENT ON COLUMN notifications.sender_name IS 'Name of sender (e.g., Admin)';
COMMENT ON COLUMN notifications.sender_role IS 'Role of sender';

