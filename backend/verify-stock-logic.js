const mongoose = require('mongoose');
const DailyStock = require('./models/DailyStock');
const { Sale } = require('./models/Sale');
const Product = require('./models/Product');

async function verifyStockLogic() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/liquor_pos_db');
    console.log('Connected to MongoDB');

    const reportDate = new Date('2025-09-09');
    reportDate.setHours(0, 0, 0, 0);

    console.log('\n🔍 VERIFYING STOCK LOGIC FOR DATE:', reportDate.toISOString());

    // Get all daily stock records for the date
    const dailyStocks = await DailyStock.find({
      date: {
        $gte: reportDate,
        $lt: new Date(reportDate.getTime() + 24 * 60 * 60 * 1000)
      }
    }).populate('product_id', 'name');

    console.log(`\n📊 Found ${dailyStocks.length} daily stock records`);

    // Get all sales for the date
    const sales = await Sale.find({
      sale_date: {
        $gte: reportDate,
        $lt: new Date(reportDate.getTime() + 24 * 60 * 60 * 1000)
      }
    }).populate('items.product_id', 'name');

    console.log(`💰 Found ${sales.length} sales records`);

    // Calculate expected sold quantities from sales
    const salesByProduct = {};
    sales.forEach(sale => {
      sale.items.forEach(item => {
        const productId = item.product_id._id.toString();
        if (!salesByProduct[productId]) {
          salesByProduct[productId] = {
            product_name: item.product_id.name,
            total_sold: 0,
            sales_count: 0
          };
        }
        salesByProduct[productId].total_sold += item.quantity;
        salesByProduct[productId].sales_count += 1;
      });
    });

    console.log('\n📈 SALES BY PRODUCT:');
    Object.values(salesByProduct).forEach(product => {
      console.log(`  ${product.product_name}: ${product.total_sold} units (${product.sales_count} sales)`);
    });

    console.log('\n🔍 DAILY STOCK VERIFICATION:');
    let issuesFound = 0;

    for (const stock of dailyStocks) {
      const productId = stock.product_id._id.toString();
      const expectedSold = salesByProduct[productId]?.total_sold || 0;
      const expectedClosing = stock.opening_stock + stock.stock_inward - expectedSold;
      
      const issues = [];
      
      // Check sold quantity
      if (stock.sold_quantity !== expectedSold) {
        issues.push(`❌ Sold quantity mismatch: DB=${stock.sold_quantity}, Expected=${expectedSold}`);
      }
      
      // Check closing stock calculation
      if (stock.closing_stock !== expectedClosing) {
        issues.push(`❌ Closing stock mismatch: DB=${stock.closing_stock}, Expected=${expectedClosing}`);
      }
      
      // Check stock value calculation
      const expectedStockValue = stock.closing_stock * stock.cost_per_unit;
      if (Math.abs(stock.stock_value - expectedStockValue) > 0.01) {
        issues.push(`❌ Stock value mismatch: DB=${stock.stock_value}, Expected=${expectedStockValue}`);
      }

      if (issues.length > 0) {
        issuesFound++;
        console.log(`\n🚨 ${stock.product_id.name}:`);
        issues.forEach(issue => console.log(`  ${issue}`));
        console.log(`  📊 Opening: ${stock.opening_stock}, Inward: ${stock.stock_inward}, Sold: ${stock.sold_quantity}, Closing: ${stock.closing_stock}`);
        console.log(`  💰 Cost/Unit: ${stock.cost_per_unit}, Stock Value: ${stock.stock_value}`);
      } else {
        console.log(`✅ ${stock.product_id.name}: All calculations correct`);
      }
    }

    if (issuesFound === 0) {
      console.log('\n🎉 ALL STOCK CALCULATIONS ARE CORRECT!');
    } else {
      console.log(`\n⚠️  Found ${issuesFound} products with calculation issues`);
    }

    // Check for products with sales but no daily stock record
    console.log('\n🔍 CHECKING FOR MISSING DAILY STOCK RECORDS:');
    const dailyStockProductIds = dailyStocks.map(s => s.product_id._id.toString());
    const salesProductIds = Object.keys(salesByProduct);
    
    const missingRecords = salesProductIds.filter(id => !dailyStockProductIds.includes(id));
    if (missingRecords.length > 0) {
      console.log('❌ Products with sales but no daily stock records:');
      missingRecords.forEach(id => {
        const product = salesByProduct[id];
        console.log(`  ${product.product_name}: ${product.total_sold} units sold`);
      });
    } else {
      console.log('✅ All products with sales have daily stock records');
    }

    // Check for products with daily stock but no sales
    const noSalesRecords = dailyStockProductIds.filter(id => !salesProductIds.includes(id));
    if (noSalesRecords.length > 0) {
      console.log('\n📊 Products with daily stock but no sales:');
      noSalesRecords.forEach(id => {
        const stock = dailyStocks.find(s => s.product_id._id.toString() === id);
        console.log(`  ${stock.product_id.name}: ${stock.sold_quantity} units recorded as sold`);
      });
    }

  } catch (error) {
    console.error('Error verifying stock logic:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n📴 Disconnected from MongoDB');
  }
}

// Run the verification
verifyStockLogic();
