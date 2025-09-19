const mongoose = require('mongoose');
const DailyStock = require('./models/DailyStock');
const Product = require('./models/Product');
require('dotenv').config();

async function fixStockMismatch() {
  try {
    console.log('🔧 Fixing Stock Mismatch Issue');
    console.log('='.repeat(50));

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/liquor_pos_db', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Get all products
    const products = await Product.find({ status: 'active' });
    console.log(`📦 Found ${products.length} active products`);

    // Check September 16th and 17th stock records
    const sep16 = new Date('2025-09-16');
    sep16.setHours(0, 0, 0, 0);
    
    const sep17 = new Date('2025-09-17');
    sep17.setHours(0, 0, 0, 0);

    let fixedCount = 0;
    let totalMismatch = 0;

    console.log('\n🔍 Checking stock continuity...');

    for (const product of products) {
      const sep16Stock = await DailyStock.findOne({
        product_id: product._id,
        date: sep16
      });

      const sep17Stock = await DailyStock.findOne({
        product_id: product._id,
        date: sep17
      });

      if (sep16Stock && sep17Stock) {
        const expectedOpeningStock = sep16Stock.closing_stock;
        const actualOpeningStock = sep17Stock.opening_stock;
        
        if (expectedOpeningStock !== actualOpeningStock) {
          console.log(`\n❌ Mismatch found for ${product.name}:`);
          console.log(`   September 16th closing: ${expectedOpeningStock}`);
          console.log(`   September 17th opening: ${actualOpeningStock}`);
          console.log(`   Difference: ${expectedOpeningStock - actualOpeningStock}`);
          
          // Fix the mismatch
          sep17Stock.opening_stock = expectedOpeningStock;
          await sep17Stock.save();
          
          console.log(`   ✅ Fixed: Updated opening stock to ${expectedOpeningStock}`);
          
          fixedCount++;
          totalMismatch += (expectedOpeningStock - actualOpeningStock);
        }
      } else if (sep16Stock && !sep17Stock) {
        console.log(`\n⚠️  Missing September 17th record for ${product.name}`);
        console.log(`   September 16th closing: ${sep16Stock.closing_stock}`);
        
        // Create September 17th record with correct opening stock
        const newSep17Stock = new DailyStock({
          product_id: product._id,
          date: sep17,
          opening_stock: sep16Stock.closing_stock,
          cost_per_unit: product.cost_price || 0,
          created_by: 'system_fix'
        });
        
        await newSep17Stock.save();
        console.log(`   ✅ Created September 17th record with opening stock: ${sep16Stock.closing_stock}`);
        
        fixedCount++;
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Products checked: ${products.length}`);
    console.log(`   Records fixed: ${fixedCount}`);
    console.log(`   Total stock difference corrected: ${totalMismatch}`);

    // Verify the fix by checking totals
    console.log(`\n🔍 Verifying fix...`);
    
    const sep16Total = await DailyStock.aggregate([
      { $match: { date: sep16 } },
      { $group: { _id: null, total_closing: { $sum: '$closing_stock' } } }
    ]);

    const sep17Total = await DailyStock.aggregate([
      { $match: { date: sep17 } },
      { $group: { _id: null, total_opening: { $sum: '$opening_stock' } } }
    ]);

    const sep16Closing = sep16Total[0]?.total_closing || 0;
    const sep17Opening = sep17Total[0]?.total_opening || 0;

    console.log(`   September 16th total closing stock: ${sep16Closing}`);
    console.log(`   September 17th total opening stock: ${sep17Opening}`);
    
    if (sep16Closing === sep17Opening) {
      console.log(`   ✅ Stock continuity restored!`);
    } else {
      console.log(`   ❌ Still a mismatch of ${sep16Closing - sep17Opening} units`);
    }

  } catch (error) {
    console.error('❌ Error fixing stock mismatch:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n📴 Disconnected from MongoDB');
  }
}

// Run the fix
fixStockMismatch();
