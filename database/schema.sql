CREATE DATABASE IF NOT EXISTS real_estate;
USE real_estate;

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR (100) NOT NULL,
    email VARCHAR (255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    reset_token VARCHAR(255) DEFAULT NULL,
    reset_token_expiry DATETIME DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

);


CREATE TABLE properties (
    id INT AUTO_INCREMENT PRIMARY KEY,
    address VARCHAR(255) NOT NULL,
    city VARCHAR (50) NOT NULL, 
    state VARCHAR(13) NOT NULL,
    zip_code VARCHAR(10) NOT NULL,
    price DECIMAL (10,2) NOT NULL,
    status ENUM ('available', 'pending', 'sold') NOT NULL

);
/* CREATE TABLE favorites (
    id INT AUTO_INCREMENT PRIMARY KEY,
    
    )
