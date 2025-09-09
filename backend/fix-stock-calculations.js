const mongoose = require('mongoose');
const DailyStock = require('./models/DailyStock');
const { Sale } = require('./models/Sale');
const Product = require('./models/Product');

async function fixStockCalculations() {
  try {
    await mongoose.connect('mongodb://localhost:27017/liquor_pos_db');
    console.log('Connected to MongoDB');

    const reportDate = new Date('2025-09-09');
    reportDate.setHours(0, 0, 0, 0);

    console.log('\n🔧 FIXING STOCK CALCULATIONS FOR DATE:', reportDate.toISOString());

    // Get all sales for the date
    const sales = await Sale.find({
      sale_date: {
        $gte: reportDate,
        $lt: new Date(reportDate.getTime() + 24 * 60 * 60 * 1000)
      }
    }).populate('items.product_id', 'name');

    console.log(`💰 Found ${sales.length} sales records`);

    // Calculate correct sold quantities from sales
    const salesByProduct = {};
    sales.forEach(sale => {
      sale.items.forEach(item => {
        const productId = item.product_id._id.toString();
        if (!salesByProduct[productId]) {
          salesByProduct[productId] = {
            product_name: item.product_id.name,
            total_sold: 0
          };
        }
        salesByProduct[productId].total_sold += item.quantity;
      });
    });

    console.log('\n📊 CORRECT SALES TOTALS:');
    Object.values(salesByProduct).forEach(product => {
      console.log(`  ${product.product_name}: ${product.total_sold} units`);
    });

    // Get all daily stock records for the date
    const dailyStocks = await DailyStock.find({
      date: {
        $gte: reportDate,
        $lt: new Date(reportDate.getTime() + 24 * 60 * 60 * 1000)
      }
    }).populate('product_id', 'name');

    console.log(`\n📊 Found ${dailyStocks.length} daily stock records`);

    // Fix each daily stock record
    let fixedCount = 0;
    for (const stock of dailyStocks) {
      const productId = stock.product_id._id.toString();
      const correctSoldQuantity = salesByProduct[productId]?.total_sold || 0;
      
      if (stock.sold_quantity !== correctSoldQuantity) {
        console.log(`\n🔧 Fixing ${stock.product_id.name}:`);
        console.log(`  Old sold quantity: ${stock.sold_quantity}`);
        console.log(`  Correct sold quantity: ${correctSoldQuantity}`);
        
        // Update the sold quantity
        stock.sold_quantity = correctSoldQuantity;
        
        // The pre-save middleware will recalculate closing_stock and stock_value
        await stock.save();
        
        console.log(`  ✅ Updated to: ${stock.sold_quantity} sold, ${stock.closing_stock} closing stock`);
        fixedCount++;
      } else {
        console.log(`✅ ${stock.product_id.name}: Already correct (${stock.sold_quantity} units)`);
      }
    }

    console.log(`\n🎉 Fixed ${fixedCount} stock records`);

    // Verify the fixes
    console.log('\n🔍 VERIFICATION:');
    const updatedStocks = await DailyStock.find({
      date: {
        $gte: reportDate,
        $lt: new Date(reportDate.getTime() + 24 * 60 * 60 * 1000)
      }
    }).populate('product_id', 'name');

    for (const stock of updatedStocks) {
      const productId = stock.product_id._id.toString();
      const expectedSold = salesByProduct[productId]?.total_sold || 0;
      const expectedClosing = stock.opening_stock + stock.stock_inward - expectedSold;
      
      if (stock.sold_quantity === expectedSold && stock.closing_stock === expectedClosing) {
        console.log(`✅ ${stock.product_id.name}: All calculations correct`);
      } else {
        console.log(`❌ ${stock.product_id.name}: Still has issues`);
        console.log(`  Sold: ${stock.sold_quantity} (expected: ${expectedSold})`);
        console.log(`  Closing: ${stock.closing_stock} (expected: ${expectedClosing})`);
      }
    }

  } catch (error) {
    console.error('Error fixing stock calculations:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n📴 Disconnected from MongoDB');
  }
}

fixStockCalculations();
