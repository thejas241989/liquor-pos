-- Liquor Store POS Database Schema
-- MySQL Database

CREATE DATABASE IF NOT EXISTS liquor_pos_db;
USE liquor_pos_db;

-- Users table with role-based access
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'biller', 'manager', 'stock_reconciler') NOT NULL,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Categories table (main categories and subcategories)
CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    parent_id INT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- Products table
CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    category_id INT NOT NULL,
    subcategory_id INT NULL,
    barcode VARCHAR(100) UNIQUE,
    price DECIMAL(10,2) NOT NULL,
    cost_price DECIMAL(10,2),
    stock_quantity INT DEFAULT 0,
    min_stock_level INT DEFAULT 10,
    tax_percentage DECIMAL(5,2) DEFAULT 0,
    brand VARCHAR(100),
    volume VARCHAR(50),
    alcohol_percentage DECIMAL(5,2),
    description TEXT,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
    FOREIGN KEY (subcategory_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- Sales table (main invoice/bill)
CREATE TABLE sales (
    id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_no VARCHAR(50) UNIQUE NOT NULL,
    biller_id INT NOT NULL,
    customer_name VARCHAR(100),
    customer_phone VARCHAR(20),
    subtotal DECIMAL(10,2) NOT NULL,
    tax_amount DECIMAL(10,2) NOT NULL,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    payment_method ENUM('cash', 'card', 'upi', 'mixed') NOT NULL,
    payment_status ENUM('paid', 'pending', 'partial') DEFAULT 'paid',
    notes TEXT,
    sale_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (biller_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Sale items table (individual products in a sale)
CREATE TABLE sale_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sale_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    tax_percentage DECIMAL(5,2) NOT NULL,
    tax_amount DECIMAL(10,2) NOT NULL,
    line_total DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Stock intake table (when new stock arrives)
CREATE TABLE stock_intake (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    quantity_received INT NOT NULL,
    cost_price DECIMAL(10,2),
    supplier_name VARCHAR(200),
    supplier_invoice_no VARCHAR(100),
    batch_number VARCHAR(100),
    expiry_date DATE,
    received_by INT NOT NULL,
    received_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (received_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Indents table (stock requests/requisitions)
CREATE TABLE indents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    indent_no VARCHAR(50) UNIQUE NOT NULL,
    manager_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity_requested INT NOT NULL,
    quantity_approved INT DEFAULT 0,
    unit_cost DECIMAL(10,2),
    total_cost DECIMAL(10,2),
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    status ENUM('draft', 'pending', 'approved', 'rejected', 'fulfilled') DEFAULT 'draft',
    reason TEXT,
    approved_by INT NULL,
    approved_date TIMESTAMP NULL,
    required_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Stock reconciliation table (physical vs system stock audit)
CREATE TABLE stock_reconciliation (
    id INT AUTO_INCREMENT PRIMARY KEY,
    reconciliation_no VARCHAR(50) UNIQUE NOT NULL,
    product_id INT NOT NULL,
    system_stock INT NOT NULL,
    physical_stock INT NOT NULL,
    discrepancy INT GENERATED ALWAYS AS (physical_stock - system_stock) STORED,
    discrepancy_value DECIMAL(10,2),
    reason TEXT,
    reconciler_id INT NOT NULL,
    supervisor_id INT NULL,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    reconciliation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_date TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (reconciler_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (supervisor_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Payment transactions (for detailed payment tracking)
CREATE TABLE payment_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sale_id INT NOT NULL,
    payment_method ENUM('cash', 'card', 'upi') NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    reference_number VARCHAR(100),
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE
);

-- System settings and configurations
CREATE TABLE system_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    description TEXT,
    updated_by INT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Insert default admin user (password: admin123)
INSERT INTO users (username, email, password, role) VALUES 
('admin', 'admin@liquorpos.com', '$2a$10$rOzJqHKlRJgj2tzq6/H5HehT9O3d8jPJYZ5wJIUU5EYcLKqeqj3l2', 'admin');

-- Insert default categories
INSERT INTO categories (name, parent_id, description) VALUES 
('Whiskey', NULL, 'All types of whiskey'),
('Rum', NULL, 'All types of rum'),
('Beer', NULL, 'All types of beer'),
('Wine', NULL, 'All types of wine'),
('Vodka', NULL, 'All types of vodka'),
('Gin', NULL, 'All types of gin'),
('Brandy', NULL, 'All types of brandy'),
('Tequila', NULL, 'All types of tequila');

-- Insert subcategories for Whiskey
INSERT INTO categories (name, parent_id, description) VALUES 
('Scotch Whiskey', 1, 'Scottish whiskey'),
('Irish Whiskey', 1, 'Irish whiskey'),
('Bourbon', 1, 'American bourbon whiskey'),
('Indian Whiskey', 1, 'Indian made whiskey');

-- Insert subcategories for Beer
INSERT INTO categories (name, parent_id, description) VALUES 
('Lager', 3, 'Lager beer'),
('IPA', 3, 'India Pale Ale'),
('Stout', 3, 'Stout beer'),
('Wheat Beer', 3, 'Wheat beer');

-- Insert sample products
INSERT INTO products (name, category_id, subcategory_id, barcode, price, cost_price, stock_quantity, min_stock_level, tax_percentage, brand, volume, alcohol_percentage) VALUES 
('Johnnie Walker Red Label', 1, 9, '8901030801010', 1500.00, 1200.00, 50, 10, 12.5, 'Johnnie Walker', '750ml', 40.0),
('Royal Challenge', 1, 12, '8901030801011', 800.00, 650.00, 75, 15, 12.5, 'Royal Challenge', '750ml', 42.5),
('Kingfisher Premium', 3, 13, '8901030801012', 150.00, 120.00, 200, 50, 5.0, 'Kingfisher', '650ml', 5.0),
('Bacardi White Rum', 2, NULL, '8901030801013', 1200.00, 950.00, 30, 10, 12.5, 'Bacardi', '750ml', 37.5);

-- Insert system settings
INSERT INTO system_settings (setting_key, setting_value, description) VALUES 
('store_name', 'Premium Liquor Store', 'Store name for receipts'),
('store_address', '123 Main Street, City, State - 123456', 'Store address'),
('store_phone', '+91-9876543210', 'Store contact number'),
('store_email', 'info@premiumliquor.com', 'Store email'),
('tax_rate', '12.5', 'Default tax rate percentage'),
('currency', 'INR', 'Currency symbol'),
('invoice_prefix', 'INV', 'Invoice number prefix'),
('low_stock_alert', '10', 'Minimum stock level for alerts');

-- Create indexes for better performance
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_sales_date ON sales(sale_date);
CREATE INDEX idx_sales_invoice ON sales(invoice_no);
CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX idx_sale_items_product ON sale_items(product_id);
CREATE INDEX idx_stock_intake_product ON stock_intake(product_id);
CREATE INDEX idx_indents_status ON indents(status);
CREATE INDEX idx_reconciliation_date ON stock_reconciliation(reconciliation_date);
