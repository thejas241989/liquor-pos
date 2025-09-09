const fs = require('fs');
const { connectDB, closeDB } = require('./config/mongodb');
const Category = require('./models/Category');
const Product = require('./models/Product');
const User = require('./models/User');
const { Sale } = require('./models/Sale');
const SystemSetting = require('./models/SystemSetting');

async function migrateMySQLToMongoDB() {
  try {
    console.log('🚀 STARTING MYSQL TO MONGODB MIGRATION\n');
    
    // Connect to MongoDB
    await connectDB();
    
    // Clear existing data (if any)
    console.log('🧹 Clearing existing MongoDB data...');
    await Category.deleteMany({});
    await Product.deleteMany({});
    await User.deleteMany({});
    await Sale.deleteMany({});
    await SystemSetting.deleteMany({});
    console.log('✅ Existing data cleared\n');
    
    // Load MySQL data
    const migrationData = JSON.parse(fs.readFileSync('../mysql-migration-data.json', 'utf8'));
    console.log('📄 MySQL data loaded from file\n');
    
    // Migrate Categories
    console.log('📋 Migrating Categories...');
    const categoryMapping = new Map(); // old_id -> new_ObjectId
    
    for (const oldCategory of migrationData.categories) {
      const newCategory = new Category({
        name: oldCategory.name,
        description: oldCategory.description,
        created_at: oldCategory.created_at,
        updated_at: oldCategory.updated_at
      });
      
      const savedCategory = await newCategory.save();
      categoryMapping.set(oldCategory.id, savedCategory._id);
      console.log(`   ✅ ${oldCategory.name} -> ${savedCategory._id}`);
    }
    
    // Update category parent references
    for (const oldCategory of migrationData.categories) {
      if (oldCategory.parent_id) {
        const newId = categoryMapping.get(oldCategory.id);
        const parentId = categoryMapping.get(oldCategory.parent_id);
        await Category.findByIdAndUpdate(newId, { parent_id: parentId });
      }
    }
    console.log(`✅ Categories migrated: ${migrationData.categories.length}\n`);
    
    // Migrate Users
    console.log('👥 Migrating Users...');
    const userMapping = new Map(); // old_id -> new_ObjectId
    
    for (const oldUser of migrationData.users) {
      const newUser = new User({
        username: oldUser.username,
        email: oldUser.email,
        password: oldUser.password,
        role: oldUser.role,
        status: oldUser.status,
        created_at: oldUser.created_at,
        updated_at: oldUser.updated_at
      });
      
      const savedUser = await newUser.save();
      userMapping.set(oldUser.id, savedUser._id);
      console.log(`   ✅ ${oldUser.username} (${oldUser.role}) -> ${savedUser._id}`);
    }
    console.log(`✅ Users migrated: ${migrationData.users.length}\n`);
    
    // Migrate Products
    console.log('📦 Migrating Products...');
    const productMapping = new Map(); // old_id -> new_ObjectId
    
    for (const oldProduct of migrationData.products) {
      const categoryId = categoryMapping.get(oldProduct.category_id);
      const subcategoryId = oldProduct.subcategory_id ? categoryMapping.get(oldProduct.subcategory_id) : null;
      
      const productData = {
        name: oldProduct.name,
        category_id: categoryId,
        subcategory_id: subcategoryId,
        price: parseFloat(oldProduct.price),
        unit_price: parseFloat(oldProduct.unit_price),
        cost_price: oldProduct.cost_price ? parseFloat(oldProduct.cost_price) : null,
        stock_quantity: oldProduct.stock_quantity,
        min_stock_level: oldProduct.min_stock_level,
        tax_percentage: oldProduct.tax_percentage ? parseFloat(oldProduct.tax_percentage) : null,
        brand: oldProduct.brand,
        volume: oldProduct.volume,
        alcohol_percentage: oldProduct.alcohol_percentage ? parseFloat(oldProduct.alcohol_percentage) : null,
        description: oldProduct.description,
        status: oldProduct.status,
        created_at: oldProduct.created_at,
        updated_at: oldProduct.updated_at
      };
      
      // Only add barcode if it's not null
      if (oldProduct.barcode !== null && oldProduct.barcode !== undefined) {
        productData.barcode = oldProduct.barcode;
      }
      
      const newProduct = new Product(productData);
      
      const savedProduct = await newProduct.save();
      productMapping.set(oldProduct.id, savedProduct._id);
      console.log(`   ✅ ${oldProduct.name} -> ${savedProduct._id}`);
    }
    console.log(`✅ Products migrated: ${migrationData.products.length}\n`);
    
    // Migrate Sales and Sale Items
    console.log('💰 Migrating Sales and Sale Items...');
    const saleMapping = new Map(); // old_sale_id -> new_ObjectId
    
    // Group sale items by sale_id
    const saleItemsGrouped = migrationData.saleItems.reduce((acc, item) => {
      if (!acc[item.sale_id]) acc[item.sale_id] = [];
      acc[item.sale_id].push(item);
      return acc;
    }, {});
    
    for (const oldSale of migrationData.sales) {
      const billerId = userMapping.get(oldSale.biller_id);
      const saleItems = saleItemsGrouped[oldSale.id] || [];
      
      const newSale = new Sale({
        invoice_no: oldSale.invoice_no,
        biller_id: billerId,
        customer_name: oldSale.customer_name,
        customer_phone: oldSale.customer_phone,
        subtotal: parseFloat(oldSale.subtotal),
        tax_amount: parseFloat(oldSale.tax_amount),
        discount_amount: parseFloat(oldSale.discount_amount || 0),
        total_amount: parseFloat(oldSale.total_amount),
        payment_method: oldSale.payment_method,
        payment_status: oldSale.payment_status,
        notes: oldSale.notes,
        sale_date: oldSale.sale_date,
        created_at: oldSale.created_at,
        items: saleItems.map(item => ({
          product_id: productMapping.get(item.product_id),
          quantity: item.quantity,
          unit_price: parseFloat(item.unit_price),
          tax_percentage: parseFloat(item.tax_percentage),
          tax_amount: parseFloat(item.tax_amount),
          line_total: parseFloat(item.line_total),
          created_at: item.created_at
        }))
      });
      
      const savedSale = await newSale.save();
      saleMapping.set(oldSale.id, savedSale._id);
      console.log(`   ✅ ${oldSale.invoice_no} (${saleItems.length} items) -> ${savedSale._id}`);
    }
    console.log(`✅ Sales migrated: ${migrationData.sales.length}\n`);
    
    // Migrate System Settings
    console.log('⚙️ Migrating System Settings...');
    for (const oldSetting of migrationData.systemSettings) {
      const updatedBy = oldSetting.updated_by ? userMapping.get(oldSetting.updated_by) : null;
      
      const newSetting = new SystemSetting({
        setting_key: oldSetting.setting_key,
        setting_value: oldSetting.setting_value,
        description: oldSetting.description,
        updated_by: updatedBy,
        updated_at: oldSetting.updated_at
      });
      
      await newSetting.save();
      console.log(`   ✅ ${oldSetting.setting_key}`);
    }
    console.log(`✅ System settings migrated: ${migrationData.systemSettings.length}\n`);
    
    // Verify migration
    console.log('🔍 MIGRATION VERIFICATION:');
    const categoriesCount = await Category.countDocuments();
    const productsCount = await Product.countDocuments();
    const usersCount = await User.countDocuments();
    const salesCount = await Sale.countDocuments();
    const settingsCount = await SystemSetting.countDocuments();
    
    console.log(`   📋 Categories: ${categoriesCount} documents`);
    console.log(`   📦 Products: ${productsCount} documents`);
    console.log(`   👥 Users: ${usersCount} documents`);
    console.log(`   💰 Sales: ${salesCount} documents`);
    console.log(`   ⚙️ Settings: ${settingsCount} documents`);
    
    // Save mapping for reference
    const mappingData = {
      categories: Object.fromEntries(categoryMapping),
      users: Object.fromEntries(userMapping),
      products: Object.fromEntries(productMapping),
      sales: Object.fromEntries(saleMapping)
    };
    fs.writeFileSync('../mongodb-migration-mapping.json', JSON.stringify(mappingData, null, 2));
    
    console.log('\n🎉 MIGRATION COMPLETED SUCCESSFULLY!');
    console.log('💾 ID mappings saved to: mongodb-migration-mapping.json');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await closeDB();
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateMySQLToMongoDB()
    .then(() => {
      console.log('✅ Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateMySQLToMongoDB };
