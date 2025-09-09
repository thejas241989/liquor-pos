const mongoose = require('mongoose');
const { connectDB } = require('./config/mongodb');
const DailyStock = require('./models/DailyStock');
const StockInward = require('./models/StockInward');
const Product = require('./models/Product');
const User = require('./models/User');

async function createSampleStockData() {
  try {
    await connectDB();
    console.log('🚀 Creating sample stock data...');

    // Get some products and a user
    const products = await Product.find().limit(3);
    const user = await User.findOne({ role: 'admin' });

    if (products.length === 0 || !user) {
      console.log('❌ Need products and admin user to create sample data');
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Create daily stock records for today
    for (const product of products) {
      const dailyStock = await DailyStock.getOrCreateDailyStock(
        product._id,
        today,
        user._id
      );

      // Add some stock inward
      dailyStock.stock_inward = Math.floor(Math.random() * 50) + 10;
      
      // Add some sold quantity
      dailyStock.sold_quantity = Math.floor(Math.random() * 20) + 1;
      
      await dailyStock.save();

      console.log(`✅ Created daily stock for ${product.name}:`, {
        opening_stock: dailyStock.opening_stock,
        stock_inward: dailyStock.stock_inward,
        sold_quantity: dailyStock.sold_quantity,
        closing_stock: dailyStock.closing_stock
      });
    }

    // Create some stock inward records
    for (const product of products.slice(0, 2)) {
      const stockInward = new StockInward({
        product_id: product._id,
        date: today,
        quantity: Math.floor(Math.random() * 100) + 20,
        cost_per_unit: (product.cost_price || 100) * (0.9 + Math.random() * 0.2),
        supplier_name: 'Sample Supplier Ltd.',
        invoice_number: `INV-${Date.now().toString().slice(-6)}`,
        created_by: user._id,
        status: 'approved'
      });

      await stockInward.save();
      console.log(`✅ Created stock inward for ${product.name}: ${stockInward.quantity} units`);
    }

    console.log('🎉 Sample stock data created successfully!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error creating sample data:', error);
    process.exit(1);
  }
}

createSampleStockData();
