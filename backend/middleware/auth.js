const jwt = require('jsonwebtoken');
const db = require('../config/database');

// Middleware to verify JWT token
const verifyToken = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    
    // Get user from database to ensure user still exists and is active
    const [users] = await db.execute(
      'SELECT id, username, email, role, status FROM users WHERE id = ? AND status = ?',
      [decoded.userId, 'active']
    );

    if (users.length === 0) {
      return res.status(401).json({ message: 'Invalid token. User not found or inactive.' });
    }

    req.user = users[0];
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
