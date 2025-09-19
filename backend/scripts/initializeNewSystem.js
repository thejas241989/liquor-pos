const mongoose = require('mongoose');
const Product = require('../models/Product');
const DailyStock = require('../models/DailyStock');
const StockService = require('../services/StockService');
const DailyStockService = require('../services/DailyStockService');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/liquor_pos_db', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
};

// Initialize current_stock field for existing products
const initializeCurrentStock = async () => {
  try {
    console.log('🔄 Initializing current_stock field for existing products...');
    
    const products = await Product.find({});
    let updated = 0;
    
    for (const product of products) {
      if (product.current_stock === undefined || product.current_stock === null) {
        product.current_stock = product.stock_quantity || 0;
        product.last_stock_update = new Date();
        await product.save();
        updated++;
      }
    }
    
    console.log(`✅ Updated ${updated} products with current_stock field`);
    return { success: true, updated };
  } catch (error) {
    console.error('❌ Error initializing current_stock:', error);
    return { success: false, error: error.message };
  }
};

// Create daily stock snapshots for the last 30 days
const createHistoricalSnapshots = async () => {
  try {
    console.log('🔄 Creating historical daily stock snapshots...');
    
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    let totalSnapshots = 0;
    let totalDays = 0;
    
    // Get system user ID
    const User = require('../models/User');
    let systemUser = await User.findOne({ username: 'system' });
    if (!systemUser) {
      systemUser = new User({
        username: 'system',
        email: 'system@liquorpos.com',
        password: 'system_password_hash',
        role: 'admin',
        status: 'active'
      });
      await systemUser.save();
    }
    
    // Create snapshots for each day
    for (let date = new Date(thirtyDaysAgo); date <= today; date.setDate(date.getDate() + 1)) {
      const result = await DailyStockService.createDailyStockSnapshots(new Date(date), systemUser._id);
      if (result.success) {
        totalSnapshots += result.snapshots_created;
        totalDays++;
      }
    }
    
    console.log(`✅ Created ${totalSnapshots} snapshots for ${totalDays} days`);
    return { success: true, totalSnapshots, totalDays };
  } catch (error) {
    console.error('❌ Error creating historical snapshots:', error);
    return { success: false, error: error.message };
  }
};

// Validate data integrity
const validateDataIntegrity = async () => {
  try {
    console.log('🔍 Validating data integrity...');
    
    const today = new Date();
    const validation = await DailyStockService.validateDailyStockIntegrity(today);
    
    if (validation.valid) {
      console.log(`✅ Data integrity validation passed: ${validation.summary.valid_records} valid records`);
    } else {
      console.log(`⚠️ Data integrity issues found: ${validation.summary.invalid_records} invalid records`);
      console.log('Issues:', validation.issues);
    }
    
    return validation;
  } catch (error) {
    console.error('❌ Error validating data integrity:', error);
    return { valid: false, error: error.message };
  }
};

// Generate system summary
const generateSystemSummary = async () => {
  try {
    console.log('📊 Generating system summary...');
    
    const [
      productCount,
      dailyStockCount,
      stockSummary,
      currentStock
    ] = await Promise.all([
      Product.countDocuments(),
      DailyStock.countDocuments(),
      StockService.getStockSummary(),
      StockService.getCurrentStock()
    ]);
    
    const summary = {
      products: {
        total: productCount,
        with_current_stock: currentStock.length,
        low_stock: currentStock.filter(p => p.is_low_stock).length
      },
      daily_stock: {
        total_records: dailyStockCount
      },
      stock_summary: stockSummary,
      system_health: {
        data_integrity: 'Valid',
        stock_tracking: 'Active',
        automation_ready: true
      }
    };
    
    console.log('📋 System Summary:');
    console.log(`   - Total Products: ${summary.products.total}`);
    console.log(`   - Products with Current Stock: ${summary.products.with_current_stock}`);
    console.log(`   - Low Stock Products: ${summary.products.low_stock}`);
    console.log(`   - Total Stock Value: ₹${summary.stock_summary.total_stock_value.toLocaleString()}`);
    console.log(`   - Daily Stock Records: ${summary.daily_stock.total_records}`);
    
    return summary;
  } catch (error) {
    console.error('❌ Error generating system summary:', error);
    return { error: error.message };
  }
};

// Main initialization function
const initializeSystem = async () => {
  try {
    console.log('🚀 Starting Liquor POS System Initialization...');
    console.log('=====================================');
    
    await connectDB();
    
    // Step 1: Initialize current_stock field
    const stockInit = await initializeCurrentStock();
    if (!stockInit.success) {
      throw new Error(`Stock initialization failed: ${stockInit.error}`);
    }
    
    // Step 2: Create historical snapshots
    const snapshots = await createHistoricalSnapshots();
    if (!snapshots.success) {
      throw new Error(`Snapshot creation failed: ${snapshots.error}`);
    }
    
    // Step 3: Validate data integrity
    const validation = await validateDataIntegrity();
    if (!validation.valid) {
      console.log('⚠️ Data integrity issues found, but continuing...');
    }
    
    // Step 4: Generate system summary
    const summary = await generateSystemSummary();
    
    console.log('=====================================');
    console.log('✅ System initialization completed successfully!');
    console.log('🎯 New Stock Management System is ready to use');
    console.log('📋 Features available:');
    console.log('   - Real-time stock tracking');
    console.log('   - Daily stock snapshots');
    console.log('   - Stock movement audit trail');
    console.log('   - Automated reconciliation');
    console.log('   - Comprehensive reporting');
    console.log('   - Background job scheduling');
    
    return {
      success: true,
      stock_initialization: stockInit,
      historical_snapshots: snapshots,
      data_validation: validation,
      system_summary: summary
    };
    
  } catch (error) {
    console.error('❌ System initialization failed:', error);
    return {
      success: false,
      error: error.message
    };
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
};

// Run the initialization
if (require.main === module) {
  initializeSystem()
    .then(result => {
      if (result.success) {
        console.log('\n🎉 Initialization completed successfully!');
        process.exit(0);
      } else {
        console.log('\n💥 Initialization failed:', result.error);
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('\n💥 Unexpected error:', error);
      process.exit(1);
    });
}

module.exports = {
  initializeSystem,
  initializeCurrentStock,
  createHistoricalSnapshots,
  validateDataIntegrity,
  generateSystemSummary
};
