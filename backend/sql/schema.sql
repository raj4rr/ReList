CREATE DATABASE IF NOT EXISTS hawkify_clone;
USE hawkify_clone;

CREATE TABLE IF NOT EXISTS cities (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  mobile VARCHAR(20) UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  city_id INT,
  cv_url VARCHAR(500) NULL,
  cv_filename VARCHAR(255) NULL,
  role ENUM('user','admin','support') NOT NULL DEFAULT 'user',
  status ENUM('active','blocked','inactive') NOT NULL DEFAULT 'active',
  latitude DECIMAL(10,7) NULL,
  longitude DECIMAL(10,7) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (city_id) REFERENCES cities(id) ON DELETE SET NULL,
  INDEX idx_users_role_status (role, status)
);

CREATE TABLE IF NOT EXISTS categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS listings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  category_id INT,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  price DECIMAL(12,2) NOT NULL,
  item_condition ENUM('new','like_new','good','fair','poor') DEFAULT 'good',
  city_id INT,
  latitude DECIMAL(10,7) NULL,
  longitude DECIMAL(10,7) NULL,
  status ENUM('active','sold','hidden') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
  FOREIGN KEY (city_id) REFERENCES cities(id) ON DELETE SET NULL,
  INDEX idx_listing_search (status, category_id, city_id, price, created_at),
  INDEX idx_listing_geo (latitude, longitude)
);

CREATE TABLE IF NOT EXISTS listing_images (
  id INT AUTO_INCREMENT PRIMARY KEY,
  listing_id INT NOT NULL,
  image_url VARCHAR(500) NOT NULL,
  sort_order INT DEFAULT 0,
  FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS favorites (
  user_id INT NOT NULL,
  listing_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, listing_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS chats (
  id INT AUTO_INCREMENT PRIMARY KEY,
  listing_id INT NULL,
  buyer_id INT NOT NULL,
  seller_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_chat (listing_id, buyer_id, seller_id),
  FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE,
  FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  chat_id INT NOT NULL,
  sender_id INT NOT NULL,
  body TEXT NOT NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  read_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_messages_unread (chat_id, is_read, sender_id)
);

CREATE TABLE IF NOT EXISTS jobs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  company VARCHAR(180) NOT NULL,
  description TEXT NOT NULL,
  city_id INT NULL,
  employment_type ENUM('full_time','part_time','contract','internship','temporary') NOT NULL DEFAULT 'full_time',
  salary_min DECIMAL(12,2) NULL,
  salary_max DECIMAL(12,2) NULL,
  status ENUM('active','closed') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (city_id) REFERENCES cities(id) ON DELETE SET NULL,
  INDEX idx_jobs_search (status, city_id, created_at)
);

CREATE TABLE IF NOT EXISTS job_applications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  job_id INT NOT NULL,
  applicant_id INT NOT NULL,
  cv_url VARCHAR(500) NOT NULL,
  cv_filename VARCHAR(255) NULL,
  cover_letter TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_job_applicant (job_id, applicant_id),
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (applicant_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_job_applications_lookup (applicant_id, created_at)
);

INSERT IGNORE INTO categories (id, name) VALUES
(1, 'Cars'),
(2, 'Mobile Phones'),
(3, 'Furniture'),
(4, 'Electronics'),
(5, 'Books'),
(6, 'Fashion');

INSERT IGNORE INTO cities (id, name) VALUES
(1, 'New York'),
(2, 'Los Angeles'),
(3, 'Chicago'),
(4, 'Houston'),
(5, 'Phoenix'),
(6, 'Philadelphia'),
(7, 'San Antonio'),
(8, 'San Diego'),
(9, 'Dallas'),
(10, 'San Jose');

INSERT IGNORE INTO users (name, email, mobile, password_hash, role, status)
VALUES ('Admin', 'admin@r4r.local', '9000000000', '$2a$10$dbPnI0WFEi/QhSIuphH6Nu24zNvPTdi8DxFplo4il5sk0T248THh6', 'admin', 'active');
