USE hawkify_clone;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS mobile VARCHAR(20) UNIQUE,
  ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,7) NULL,
  ADD COLUMN IF NOT EXISTS longitude DECIMAL(10,7) NULL;

ALTER TABLE users
  MODIFY COLUMN role ENUM('user','admin','support') NOT NULL DEFAULT 'user';

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,7) NULL,
  ADD COLUMN IF NOT EXISTS longitude DECIMAL(10,7) NULL;

ALTER TABLE chats
  MODIFY COLUMN listing_id INT NULL;

INSERT IGNORE INTO users (name, email, mobile, password_hash, role, status)
VALUES ('Admin', 'admin@r4r.local', '9000000000', '$2a$10$dbPnI0WFEi/QhSIuphH6Nu24zNvPTdi8DxFplo4il5sk0T248THh6', 'admin', 'active');
