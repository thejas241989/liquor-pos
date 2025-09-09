const mongoose = require('mongoose');

// MongoDB Configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/liquor_pos_db';

// Connection options
const options = {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  bufferCommands: false
};

// Create MongoDB connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(MONGODB_URI, options);
    console.log('✅ MongoDB connected successfully');
    console.log(`📍 Host: ${conn.connection.host}`);
    console.log(`🗄️ Database: ${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

// Test MongoDB connection
const testConnection = async () => {
  try {
    await mongoose.connection.db.admin().ping();
    console.log('✅ MongoDB ping successful');
    return true;
  } catch (error) {
    console.error('❌ MongoDB ping failed:', error.message);
    return false;
  }
};

// Close MongoDB connection
const closeDB = async () => {
  try {
    await mongoose.connection.close();
    console.log('📴 MongoDB connection closed');
  } catch (error) {
    console.error('❌ Error closing MongoDB connection:', error.message);
  }
};

// Handle connection events
mongoose.connection.on('connected', () => {
  console.log('🔗 Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('📴 Mongoose disconnected from MongoDB');
});

// Handle application termination
process.on('SIGINT', async () => {
  await closeDB();
  process.exit(0);
});

module.exports = {
  connectDB,
  testConnection,
  closeDB,
  mongoose
};
