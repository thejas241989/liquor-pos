const mongoose = require('mongoose');
const DailyStockService = require('../services/DailyStockService');
const StockService = require('../services/StockService');
const ReconciliationService = require('../services/ReconciliationService');
const User = require('../models/User');

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

// Get system user ID for automated processes
const getSystemUserId = async () => {
  try {
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
    return systemUser._id;
  } catch (error) {
    console.error('Error getting system user:', error);
    return null;
  }
};

// Daily stock processing automation
const dailyStockProcess = async (date = new Date()) => {
  try {
    console.log(`🔄 Starting daily stock process for ${date.toISOString().split('T')[0]}`);
    
    const systemUserId = await getSystemUserId();
    if (!systemUserId) {
      throw new Error('System user not found');
    }

    const results = {
      date: date,
      snapshots: null,
      opening_stock_update: null,
      stock_sync: null,
      data_validation: null,
      errors: []
    };

    // 1. Create daily stock snapshots for all products
    console.log('📸 Creating daily stock snapshots...');
    try {
      results.snapshots = await DailyStockService.createDailyStockSnapshots(date, systemUserId);
      console.log(`✅ Created ${results.snapshots.snapshots_created} new snapshots, ${results.snapshots.snapshots_existing} existing`);
    } catch (error) {
      console.error('❌ Error creating snapshots:', error.message);
      results.errors.push(`Snapshot creation failed: ${error.message}`);
    }

    // 2. Update opening stock from previous day's closing stock
    console.log('🔄 Updating opening stock from previous day...');
    try {
      results.opening_stock_update = await DailyStockService.updateOpeningStockFromPreviousDay(date, systemUserId);
      console.log(`✅ Updated opening stock for ${results.opening_stock_update.updates_made} products`);
    } catch (error) {
      console.error('❌ Error updating opening stock:', error.message);
      results.errors.push(`Opening stock update failed: ${error.message}`);
    }

    // 3. Sync current stock with daily snapshot
    console.log('🔄 Syncing current stock with daily snapshot...');
    try {
      results.stock_sync = await DailyStockService.syncCurrentStockWithDailySnapshot(date, systemUserId);
      console.log(`✅ Synced stock for ${results.stock_sync.syncs_made} products`);
    } catch (error) {
      console.error('❌ Error syncing stock:', error.message);
      results.errors.push(`Stock sync failed: ${error.message}`);
    }

    // 4. Validate daily stock data integrity
    console.log('🔍 Validating daily stock data integrity...');
    try {
      results.data_validation = await DailyStockService.validateDailyStockIntegrity(date);
      if (results.data_validation.valid) {
        console.log(`✅ Data validation passed: ${results.data_validation.summary.valid_records} valid records`);
      } else {
        console.log(`⚠️ Data validation issues found: ${results.data_validation.summary.invalid_records} invalid records`);
        results.errors.push(`Data validation issues: ${results.data_validation.issues.length} problems found`);
      }
    } catch (error) {
      console.error('❌ Error validating data:', error.message);
      results.errors.push(`Data validation failed: ${error.message}`);
    }

    // 5. Generate daily stock report
    console.log('📊 Generating daily stock report...');
    try {
      const report = await DailyStockService.getDailyStockReport(date);
      if (report.success) {
        console.log(`✅ Daily report generated: ${report.summary.total_products} products, Total value: ₹${report.summary.total_stock_value.toLocaleString()}`);
        results.daily_report = report.summary;
      }
    } catch (error) {
      console.error('❌ Error generating report:', error.message);
      results.errors.push(`Report generation failed: ${error.message}`);
    }

    console.log(`✅ Daily stock process completed for ${date.toISOString().split('T')[0]}`);
    return results;

  } catch (error) {
    console.error('❌ Daily stock process failed:', error);
    return {
      success: false,
      error: error.message,
      date: date
    };
  }
};

// Stock continuity check and fix
const stockContinuityCheck = async (startDate, endDate) => {
  try {
    console.log(`🔍 Checking stock continuity from ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
    
    const continuityReport = await DailyStockService.getStockContinuityReport(startDate, endDate);
    
    if (continuityReport.success) {
      console.log(`📊 Continuity check completed:`);
      console.log(`   - Total products: ${continuityReport.total_products}`);
      console.log(`   - Continuity issues: ${continuityReport.continuity_issues}`);
      
      if (continuityReport.continuity_issues > 0) {
        console.log('⚠️ Continuity issues found:');
        continuityReport.issues.forEach(issue => {
          console.log(`   - ${issue.product_name}: Expected ${issue.expected_opening}, Actual ${issue.actual_opening} (Variance: ${issue.variance})`);
        });
      } else {
        console.log('✅ No continuity issues found');
      }
    }
    
    return continuityReport;
  } catch (error) {
    console.error('❌ Stock continuity check failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Low stock alert
const lowStockAlert = async () => {
  try {
    console.log('🚨 Checking for low stock alerts...');
    
    const currentStock = await StockService.getCurrentStock({ low_stock: true });
    const lowStockProducts = currentStock.filter(product => product.is_low_stock);
    
    if (lowStockProducts.length > 0) {
      console.log(`⚠️ Low stock alert: ${lowStockProducts.length} products below minimum level`);
      lowStockProducts.forEach(product => {
        console.log(`   - ${product.product_name}: ${product.current_stock} (Min: ${product.min_stock_level})`);
      });
    } else {
      console.log('✅ No low stock alerts');
    }
    
    return {
      success: true,
      low_stock_count: lowStockProducts.length,
      products: lowStockProducts
    };
  } catch (error) {
    console.error('❌ Low stock alert failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Main execution function
const main = async () => {
  try {
    await connectDB();
    
    const args = process.argv.slice(2);
    const command = args[0];
    
    switch (command) {
      case 'daily':
        const date = args[1] ? new Date(args[1]) : new Date();
        const result = await dailyStockProcess(date);
        console.log('\n📋 Daily Stock Process Results:');
        console.log(JSON.stringify(result, null, 2));
        break;
        
      case 'continuity':
        const startDate = args[1] ? new Date(args[1]) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const endDate = args[2] ? new Date(args[2]) : new Date();
        const continuityResult = await stockContinuityCheck(startDate, endDate);
        console.log('\n📋 Stock Continuity Results:');
        console.log(JSON.stringify(continuityResult, null, 2));
        break;
        
      case 'low-stock':
        const lowStockResult = await lowStockAlert();
        console.log('\n📋 Low Stock Alert Results:');
        console.log(JSON.stringify(lowStockResult, null, 2));
        break;
        
      case 'all':
        console.log('🚀 Running all daily processes...');
        const dailyResult = await dailyStockProcess();
        const continuityResult2 = await stockContinuityCheck(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), new Date());
        const lowStockResult2 = await lowStockAlert();
        
        console.log('\n📋 All Processes Results:');
        console.log('Daily Process:', JSON.stringify(dailyResult, null, 2));
        console.log('Continuity Check:', JSON.stringify(continuityResult2, null, 2));
        console.log('Low Stock Alert:', JSON.stringify(lowStockResult2, null, 2));
        break;
        
      default:
        console.log('Usage: node dailyStockProcessor.js [command] [options]');
        console.log('Commands:');
        console.log('  daily [date]           - Run daily stock process for specific date');
        console.log('  continuity [start] [end] - Check stock continuity for date range');
        console.log('  low-stock              - Check for low stock alerts');
        console.log('  all                    - Run all processes');
        console.log('Examples:');
        console.log('  node dailyStockProcessor.js daily 2025-09-19');
        console.log('  node dailyStockProcessor.js continuity 2025-09-15 2025-09-19');
        console.log('  node dailyStockProcessor.js all');
        break;
    }
    
  } catch (error) {
    console.error('❌ Script execution failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
};

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  dailyStockProcess,
  stockContinuityCheck,
  lowStockAlert
};
