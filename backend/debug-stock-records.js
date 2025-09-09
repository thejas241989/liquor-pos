const mongoose = require('mongoose');
const DailyStock = require('./models/DailyStock');
const { Sale } = require('./models/Sale');
const Product = require('./models/Product');

async function debugStockRecords() {
  try {
    await mongoose.connect('mongodb://localhost:27017/liquor_pos_db');
    console.log('Connected to MongoDB');

    const reportDate = new Date('2025-09-09');
    reportDate.setHours(0, 0, 0, 0);

    console.log('\n🔍 DEBUGGING STOCK RECORDS FOR DATE:', reportDate.toISOString());

    // Check for duplicate records
    const dailyStocks = await DailyStock.find({
      date: {
        $gte: reportDate,
        $lt: new Date(reportDate.getTime() + 24 * 60 * 60 * 1000)
      }
    }).populate('product_id', 'name').sort({ product_id: 1, created_at: 1 });

    console.log(`\n📊 Found ${dailyStocks.length} daily stock records`);

    // Group by product
    const stocksByProduct = {};
    dailyStocks.forEach(stock => {
      const productId = stock.product_id._id.toString();
      if (!stocksByProduct[productId]) {
        stocksByProduct[productId] = [];
      }
      stocksByProduct[productId].push(stock);
    });

    // Check for duplicates
    Object.entries(stocksByProduct).forEach(([productId, stocks]) => {
      if (stocks.length > 1) {
        console.log(`\n🚨 DUPLICATE RECORDS for ${stocks[0].product_id.name}:`);
        stocks.forEach((stock, index) => {
          console.log(`  Record ${index + 1}:`);
          console.log(`    ID: ${stock._id}`);
          console.log(`    Created: ${stock.created_at}`);
          console.log(`    Opening: ${stock.opening_stock}, Inward: ${stock.stock_inward}, Sold: ${stock.sold_quantity}, Closing: ${stock.closing_stock}`);
        });
      }
    });

    // Check sales for the same date
    const sales = await Sale.find({
      sale_date: {
        $gte: reportDate,
        $lt: new Date(reportDate.getTime() + 24 * 60 * 60 * 1000)
      }
    }).populate('items.product_id', 'name').sort({ sale_date: 1 });

    console.log(`\n💰 Found ${sales.length} sales records`);

    // Show sales chronologically
    sales.forEach((sale, index) => {
      console.log(`\n📝 Sale ${index + 1} (${sale.sale_date}):`);
      sale.items.forEach(item => {
        console.log(`  ${item.quantity}x ${item.product_id.name}`);
      });
    });

    // Check if there are any sales that might not have been processed
    console.log('\n🔍 CHECKING FOR UNPROCESSED SALES:');
    const salesByProduct = {};
    sales.forEach(sale => {
      sale.items.forEach(item => {
        const productId = item.product_id._id.toString();
        if (!salesByProduct[productId]) {
          salesByProduct[productId] = {
            product_name: item.product_id.name,
            total_sold: 0,
            sales: []
          };
        }
        salesByProduct[productId].total_sold += item.quantity;
        salesByProduct[productId].sales.push({
          sale_id: sale._id,
          sale_date: sale.sale_date,
          quantity: item.quantity
        });
      });
    });

    Object.entries(salesByProduct).forEach(([productId, data]) => {
      const stockRecord = stocksByProduct[productId]?.[0];
      if (stockRecord) {
        console.log(`\n📊 ${data.product_name}:`);
        console.log(`  Sales total: ${data.total_sold} units`);
        console.log(`  Stock record sold: ${stockRecord.sold_quantity} units`);
        console.log(`  Difference: ${data.total_sold - stockRecord.sold_quantity} units`);
        
        if (data.total_sold !== stockRecord.sold_quantity) {
          console.log(`  🚨 MISMATCH! Sales:`);
          data.sales.forEach(sale => {
            console.log(`    ${sale.quantity} units on ${sale.sale_date}`);
          });
        }
      }
    });

  } catch (error) {
    console.error('Error debugging stock records:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n📴 Disconnected from MongoDB');
  }
}

debugStockRecords();
