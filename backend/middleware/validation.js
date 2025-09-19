const { body, param, query, validationResult } = require('express-validator');
const mongoose = require('mongoose');

// Custom validation functions
const isValidObjectId = (value) => {
  return mongoose.Types.ObjectId.isValid(value);
};

const isValidDate = (value) => {
  const date = new Date(value);
  return date instanceof Date && !isNaN(date);
};

const isValidPaymentMethod = (value) => {
  const validMethods = ['cash', 'upi', 'credit', 'mixed'];
  return validMethods.includes(value);
};

const isValidUserRole = (value) => {
  const validRoles = ['admin', 'manager', 'biller', 'stock_reconciler'];
  return validRoles.includes(value);
};

const isValidProductStatus = (value) => {
  const validStatuses = ['active', 'inactive'];
  return validStatuses.includes(value);
};

const isValidSaleStatus = (value) => {
  const validStatuses = ['paid', 'pending', 'partial'];
  return validStatuses.includes(value);
};

// Sanitization functions
const sanitizeString = (value) => {
  if (typeof value !== 'string') return value;
  return value.trim().replace(/[<>]/g, '');
};

const sanitizeNumber = (value) => {
  if (typeof value === 'string') {
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
  }
  return value;
};

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }
  next();
};

// Sales validation rules
const validateSaleCreation = [
  body('items')
    .isArray({ min: 1 })
    .withMessage('Items array is required and must contain at least one item'),
  
  body('items.*.id')
    .optional()
    .custom(isValidObjectId)
    .withMessage('Invalid product ID format'),
  
  body('items.*.product_id')
    .optional()
    .custom(isValidObjectId)
    .withMessage('Invalid product ID format'),
  
  body('items.*.quantity')
    .isInt({ min: 1, max: 1000 })
    .withMessage('Quantity must be between 1 and 1000'),
  
  body('customer_name')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Customer name must be less than 100 characters')
    .customSanitizer(sanitizeString),
  
  body('customer_phone')
    .optional()
    .isLength({ max: 20 })
    .withMessage('Customer phone must be less than 20 characters')
    .customSanitizer(sanitizeString),
  
  body('payment_method')
    .optional()
    .custom(isValidPaymentMethod)
    .withMessage('Invalid payment method'),
  
  // Payment details validation
  body('payment_details.cash_received')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Cash received must be a non-negative number')
    .customSanitizer(sanitizeNumber),
  
  body('payment_details.change_returned')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Change returned must be a non-negative number')
    .customSanitizer(sanitizeNumber),
  
  body('payment_details.upi_reference')
    .optional()
    .isLength({ max: 100 })
    .withMessage('UPI reference must be less than 100 characters')
    .customSanitizer(sanitizeString),
  
  body('payment_details.credit_customer')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Credit customer name must be less than 100 characters')
    .customSanitizer(sanitizeString),
  
  body('payment_details.credit_due_date')
    .optional()
    .custom(isValidDate)
    .withMessage('Credit due date must be a valid date'),
  
  body('discount_amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Discount amount must be a positive number')
    .customSanitizer(sanitizeNumber),
  
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notes must be less than 500 characters')
    .customSanitizer(sanitizeString),
  
  handleValidationErrors
];

// Product validation rules
const validateProductCreation = [
  body('name')
    .notEmpty()
    .withMessage('Product name is required')
    .isLength({ min: 1, max: 200 })
    .withMessage('Product name must be between 1 and 200 characters')
    .customSanitizer(sanitizeString),
  
  body('category_id')
    .custom(isValidObjectId)
    .withMessage('Valid category ID is required'),
  
  body('subcategory_id')
    .optional()
    .custom(isValidObjectId)
    .withMessage('Invalid subcategory ID format'),
  
  body('barcode')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Barcode must be less than 100 characters')
    .customSanitizer(sanitizeString),
  
  body('price')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number')
    .customSanitizer(sanitizeNumber),
  
  body('unit_price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Unit price must be a positive number')
    .customSanitizer(sanitizeNumber),
  
  body('cost_price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Cost price must be a positive number')
    .customSanitizer(sanitizeNumber),
  
  body('stock_quantity')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Stock quantity must be a non-negative integer'),
  
  body('current_stock')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Current stock must be a non-negative integer'),
  
  body('min_stock_level')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Minimum stock level must be a non-negative integer'),
  
  body('brand')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Brand must be less than 100 characters')
    .customSanitizer(sanitizeString),
  
  body('volume')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Volume must be less than 50 characters')
    .customSanitizer(sanitizeString),
  
  body('alcohol_percentage')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Alcohol percentage must be between 0 and 100')
    .customSanitizer(sanitizeNumber),
  
  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters')
    .customSanitizer(sanitizeString),
  
  body('status')
    .optional()
    .custom(isValidProductStatus)
    .withMessage('Invalid product status'),
  
  handleValidationErrors
];

// User validation rules
const validateUserCreation = [
  body('username')
    .notEmpty()
    .withMessage('Username is required')
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores')
    .customSanitizer(sanitizeString),
  
  body('email')
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  
  body('password')
    .isLength({ min: 6, max: 128 })
    .withMessage('Password must be between 6 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  
  body('role')
    .custom(isValidUserRole)
    .withMessage('Invalid user role'),
  
  handleValidationErrors
];

// Category validation rules
const validateCategoryCreation = [
  body('name')
    .notEmpty()
    .withMessage('Category name is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('Category name must be between 1 and 100 characters')
    .customSanitizer(sanitizeString),
  
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters')
    .customSanitizer(sanitizeString),
  
  body('status')
    .optional()
    .custom(isValidProductStatus)
    .withMessage('Invalid category status'),
  
  handleValidationErrors
];

// Date range validation
const validateDateRange = [
  query('start_date')
    .optional()
    .custom(isValidDate)
    .withMessage('Invalid start date format'),
  
  query('end_date')
    .optional()
    .custom(isValidDate)
    .withMessage('Invalid end date format'),
  
  query('date')
    .optional()
    .custom(isValidDate)
    .withMessage('Invalid date format'),
  
  handleValidationErrors
];

// ObjectId parameter validation
const validateObjectId = (paramName) => [
  param(paramName)
    .custom(isValidObjectId)
    .withMessage(`Invalid ${paramName} format`),
  
  handleValidationErrors
];

// Pagination validation
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  handleValidationErrors
];

// Stock adjustment validation
const validateStockAdjustment = [
  body('product_id')
    .custom(isValidObjectId)
    .withMessage('Valid product ID is required'),
  
  body('new_stock')
    .isInt({ min: 0 })
    .withMessage('New stock must be a non-negative integer'),
  
  body('reason')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Reason must be less than 500 characters')
    .customSanitizer(sanitizeString),
  
  body('notes')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Notes must be less than 1000 characters')
    .customSanitizer(sanitizeString),
  
  handleValidationErrors
];

// Rate limiting validation (basic)
const validateRateLimit = (req, res, next) => {
  // Basic rate limiting - can be enhanced with Redis
  const clientIP = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  
  if (!req.app.locals.rateLimit) {
    req.app.locals.rateLimit = {};
  }
  
  if (!req.app.locals.rateLimit[clientIP]) {
    req.app.locals.rateLimit[clientIP] = { count: 0, resetTime: now + 60000 };
  }
  
  const rateLimit = req.app.locals.rateLimit[clientIP];
  
  if (now > rateLimit.resetTime) {
    rateLimit.count = 0;
    rateLimit.resetTime = now + 60000;
  }
  
  if (rateLimit.count >= 100) { // 100 requests per minute
    return res.status(429).json({
      success: false,
      message: 'Rate limit exceeded. Please try again later.'
    });
  }
  
  rateLimit.count++;
  next();
};

module.exports = {
  handleValidationErrors,
  validateSaleCreation,
  validateProductCreation,
  validateUserCreation,
  validateCategoryCreation,
  validateDateRange,
  validateObjectId,
  validatePagination,
  validateStockAdjustment,
  validateRateLimit,
  // Utility functions
  isValidObjectId,
  isValidDate,
  sanitizeString,
  sanitizeNumber
};
