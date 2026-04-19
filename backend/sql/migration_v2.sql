USE hawkify_clone;

CREATE TABLE IF NOT EXISTS cities (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role ENUM('user','admin') NOT NULL DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS status ENUM('active','blocked','inactive') NOT NULL DEFAULT 'active';

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS is_read TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMP NULL DEFAULT NULL;

INSERT IGNORE INTO users (name, email, password_hash, role, status)
VALUES ('Admin', 'admin@r4r.local', '$2a$10$dbPnI0WFEi/QhSIuphH6Nu24zNvPTdi8DxFplo4il5sk0T248THh6', 'admin', 'active');
