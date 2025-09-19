const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { connectDB } = require('./config/mongodb');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5002;

// Connect to MongoDB
connectDB();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourdomain.com'] // Replace with your production domain
    : ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Import routes
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const salesRoutes = require('./routes/sales');
const inventoryRoutes = require('./routes/inventory');
const reportsRoutes = require('./routes/reports');
const usersRoutes = require('./routes/users');
const categoriesRoutes = require('./routes/categories');
const stockManagementRoutes = require('./routes/stockManagement');
const optimizedReportsRoutes = require('./routes/optimizedReports');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/stock', stockManagementRoutes);
app.use('/api/optimized-reports', optimizedReportsRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Liquor POS API Server is running!',
    database: 'MongoDB',
    status: 'Migration from MySQL to MongoDB completed successfully',
    features: [
      'Authentication with JWT',
      'Product Management',
      'Sales Tracking',
      'Category Management',
      'User Management',
      'Inventory Control',
      'System Settings'
    ]
  });
});

// Migration status endpoint
app.get('/api/migration-status', async (req, res) => {
  try {
    const Category = require('./models/Category');
    const Product = require('./models/Product');
    const User = require('./models/User');
    const { Sale } = require('./models/Sale');
    const SystemSetting = require('./models/SystemSetting');

    const stats = {
      categories: await Category.countDocuments(),
      products: await Product.countDocuments(),
      users: await User.countDocuments(),
      sales: await Sale.countDocuments(),
      systemSettings: await SystemSetting.countDocuments()
    };

    res.json({
      message: 'MySQL to MongoDB migration completed successfully',
      migration_date: '2025-09-08',
      database: 'MongoDB',
      collections: stats,
      total_records: Object.values(stats).reduce((sum, count) => sum + count, 0),
      status: 'ACTIVE'
    });
  } catch (error) {
    res.status(500).json({ message: 'Error checking migration status', error: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;
