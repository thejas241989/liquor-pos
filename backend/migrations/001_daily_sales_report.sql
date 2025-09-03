-- Database Migration for Daily Sales Report (Category-wise)
-- Execute this SQL script to ensure the required columns exist

-- 1. Add unit_price column to products table if it doesn't exist
SET @column_exists = (
  SELECT COUNT(*) 
  FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'products' 
    AND COLUMN_NAME = 'unit_price'
);

SET @sql = IF(@column_exists = 0, 
  'ALTER TABLE products ADD COLUMN unit_price DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER price', 
  'SELECT "unit_price column already exists"'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. Add category_id column to products table if it doesn't exist
SET @column_exists = (
  SELECT COUNT(*) 
  FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'products' 
    AND COLUMN_NAME = 'category_id'
);

SET @sql = IF(@column_exists = 0, 
  'ALTER TABLE products ADD COLUMN category_id INT NOT NULL DEFAULT 1 AFTER name', 
  'SELECT "category_id column already exists"'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add foreign key constraint if it doesn't exist
SET @constraint_exists = (
  SELECT COUNT(*) 
  FROM information_schema.TABLE_CONSTRAINTS 
  WHERE CONSTRAINT_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'products' 
    AND CONSTRAINT_NAME = 'fk_products_category'
);

SET @sql = IF(@constraint_exists = 0, 
  'ALTER TABLE products ADD CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories(id)', 
  'SELECT "Foreign key constraint already exists"'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 4. Add indexes for performance (with IF NOT EXISTS logic)
SET @index_exists = (
  SELECT COUNT(*) 
  FROM information_schema.STATISTICS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'products' 
    AND INDEX_NAME = 'idx_products_category'
);

SET @sql = IF(@index_exists = 0, 
  'CREATE INDEX idx_products_category ON products(category_id)', 
  'SELECT "idx_products_category already exists"'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exists = (
  SELECT COUNT(*) 
  FROM information_schema.STATISTICS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'sales' 
    AND INDEX_NAME = 'idx_sales_date'
);

SET @sql = IF(@index_exists = 0, 
  'CREATE INDEX idx_sales_date ON sales(sale_date)', 
  'SELECT "idx_sales_date already exists"'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exists = (
  SELECT COUNT(*) 
  FROM information_schema.STATISTICS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'sale_items' 
    AND INDEX_NAME = 'idx_sale_items_sale_id'
);

SET @sql = IF(@index_exists = 0, 
  'CREATE INDEX idx_sale_items_sale_id ON sale_items(sale_id)', 
  'SELECT "idx_sale_items_sale_id already exists"'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exists = (
  SELECT COUNT(*) 
  FROM information_schema.STATISTICS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'sale_items' 
    AND INDEX_NAME = 'idx_sale_items_product_id'
);

SET @sql = IF(@index_exists = 0, 
  'CREATE INDEX idx_sale_items_product_id ON sale_items(product_id)', 
  'SELECT "idx_sale_items_product_id already exists"'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 5. Add sale_items columns if they don't exist
SET @column_exists = (
  SELECT COUNT(*) 
  FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'sale_items' 
    AND COLUMN_NAME = 'unit_price'
);

SET @sql = IF(@column_exists = 0, 
  'ALTER TABLE sale_items ADD COLUMN unit_price DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER quantity', 
  'SELECT "sale_items.unit_price already exists"'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists = (
  SELECT COUNT(*) 
  FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'sale_items' 
    AND COLUMN_NAME = 'line_total'
);

SET @sql = IF(@column_exists = 0, 
  'ALTER TABLE sale_items ADD COLUMN line_total DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER unit_price', 
  'SELECT "sale_items.line_total already exists"'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 6. Update existing records where unit_price might be 0
-- Set products.unit_price = products.price if unit_price is 0
UPDATE products 
SET unit_price = price 
WHERE unit_price = 0.00 AND price > 0;

-- 7. Update sale_items unit_price from products table where missing
UPDATE sale_items si
JOIN products p ON si.product_id = p.id
SET si.unit_price = p.unit_price
WHERE si.unit_price = 0.00;

-- 8. Update sale_items line_total calculation
UPDATE sale_items 
SET line_total = quantity * unit_price 
WHERE line_total = 0.00 OR line_total != (quantity * unit_price);

-- 9. Verify the migration
SELECT 
  'Migration completed. Verification queries:' as status;

-- Check products table structure
SELECT 
  'Products with categories and unit_price:' as info,
  COUNT(*) as total_products,
  COUNT(CASE WHEN unit_price > 0 THEN 1 END) as products_with_price,
  COUNT(CASE WHEN category_id > 0 THEN 1 END) as products_with_category
FROM products;

-- Check sale_items structure
SELECT 
  'Sale items with proper pricing:' as info,
  COUNT(*) as total_sale_items,
  COUNT(CASE WHEN unit_price > 0 THEN 1 END) as items_with_unit_price,
  COUNT(CASE WHEN line_total > 0 THEN 1 END) as items_with_line_total
FROM sale_items;

-- Sample daily sales query to test
SELECT 
  'Sample daily sales data for today:' as info;

SELECT 
  COALESCE(c.name, 'Unknown') AS category,
  p.name AS product,
  p.unit_price,
  COALESCE(SUM(si.quantity), 0) AS quantity,
  ROUND(COALESCE(SUM(si.quantity * p.unit_price), 0), 2) AS total_amount
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN sale_items si ON si.product_id = p.id
LEFT JOIN sales s ON si.sale_id = s.id AND DATE(s.sale_date) = CURDATE()
WHERE p.status = 'active'
GROUP BY c.id, p.id
HAVING quantity > 0
ORDER BY c.name, p.name
LIMIT 10;
