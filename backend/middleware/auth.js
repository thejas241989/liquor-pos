const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to verify JWT token
const verifyToken = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    
    // Get user from database to ensure user still exists and is active
    const user = await User.findById(decoded.userId)
      .select('-password')
      .where('status').equals('active');

    if (!user) {
      return res.status(401).json({ message: 'Invalid token. User not found or inactive.' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token.' });
  }
};

// Middleware to check user roles
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Access denied. Authentication required.' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: `Access denied. Required role: ${roles.join(' or ')}. Your role: ${req.user.role}` 
      });
    }

    next();
  };
};

// Role-specific middleware
const requireAdmin = requireRole('admin');
const requireManager = requireRole('admin', 'manager');
const requireBiller = requireRole('admin', 'manager', 'biller');
const requireStockReconciler = requireRole('admin', 'manager', 'stock_reconciler');

module.exports = {
  verifyToken,
  requireRole,
  requireAdmin,
  requireManager,
  requireBiller,
  requireStockReconciler
};
