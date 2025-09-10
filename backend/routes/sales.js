const express = require('express');
const mongoose = require('mongoose');
const Product = require('../models/Product');
const { Sale } = require('../models/Sale');

const router = express.Router();

// Create new sale - working version for POS
router.post('/', async (req, res) => {
  try {
    console.log('Received sales request:', req.body);
    
    const { items, customer_name, customer_phone, payment_method = 'cash', discount_amount = 0, notes = '' } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: 'Items array is required and must not be empty'
      });
    }

    // Generate simple invoice number
    const invoice_no = `INV${Date.now()}`;
    
    let subtotal = 0;
    let total_tax = 0;
    const soldItems = [];
    const processed_items = [];

    // Process each item
    for (const item of items) {
      const productId = item.id || item.product_id;
      
      if (!productId) {
        return res.status(400).json({ 
          success: false,
          message: 'Product ID is required for each item' 
        });
      }

      if (!item.quantity || item.quantity < 1) {
        return res.status(400).json({ 
          success: false,
          message: 'Quantity must be a positive number for each item' 
        });
      }

      // Find product - handle both string and number IDs
      let product;
      try {
        // Try ObjectId first if it's valid
        if (mongoose.Types.ObjectId.isValid(productId)) {
          product = await Product.findById(productId);
        }
        
        // If not found or invalid ObjectId, try finding by different ID fields
        if (!product) {
          product = await Product.findOne({ 
            $or: [
              { _id: productId },
              { id: productId },
              { id: String(productId) },
              { id: Number(productId) }
            ]
          });
        }
      } catch (error) {
        console.error('Error finding product:', error);
      }

      if (!product) {
        return res.status(400).json({ 
          success: false,
          message: `Product with ID ${productId} not found` 
        });
      }

      // Check stock - handle both stock_quantity and stock fields
      const availableStock = product.stock_quantity || product.stock || 0;
      if (availableStock < item.quantity) {
        return res.status(400).json({ 
          success: false,
          message: `Insufficient stock for ${product.name}. Available: ${availableStock}, Required: ${item.quantity}` 
        });
      }

      const unit_price = product.price || 0;
      const line_subtotal = unit_price * item.quantity;
      const tax_amount = line_subtotal * 0.1; // 10% tax
      const line_total = line_subtotal + tax_amount;

      subtotal += line_subtotal;
      total_tax += tax_amount;

      // Update stock in database
      try {
        await Product.findByIdAndUpdate(
          product._id,
          { 
            $inc: { 
              stock_quantity: -item.quantity,
              stock: -item.quantity
            }
          }
        );
        console.log(`Updated stock for product ${product.name}: -${item.quantity}`);
      } catch (updateError) {
        console.error('Error updating stock:', updateError);
        // Continue processing but log the error
      }

      processed_items.push({
        product_id: product._id,
        product_name: product.name,
        quantity: item.quantity,
        unit_price,
        tax_amount,
        line_total
      });

      soldItems.push({
        id: product._id,
        name: product.name,
        quantity: item.quantity,
        unit_price,
        line_total
      });
    }

    const total_amount = subtotal + total_tax - discount_amount;

    // Create sale document with proper date and time
    const saleDate = new Date();
    const saleData = {
      invoice_no,
      biller_id: req.user?.id || new mongoose.Types.ObjectId(), // Use authenticated user or default
      customer_name: customer_name || null,
      customer_phone: customer_phone || null,
      subtotal,
      tax_amount: total_tax,
      discount_amount,
      total_amount,
      payment_method,
      payment_status: 'paid',
      notes: notes || null,
      sale_date: saleDate, // Explicitly set sale date and time
      items: processed_items.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        tax_percentage: 10, // 10% tax
        tax_amount: item.tax_amount,
        line_total: item.line_total
      }))
    };

    // Save sale to database
    const savedSale = await Sale.create(saleData);

    console.log('Sale completed successfully:', {
      sale_id: savedSale._id,
      invoice_no,
      total_amount,
      items_count: items.length,
      sale_date: saleDate,
      soldItems: soldItems.map(item => `${item.quantity}x ${item.name}`)
    });

    res.status(201).json({
      success: true,
      message: 'Sale completed successfully',
      data: {
        sale: {
          id: savedSale._id,
          invoice_no: savedSale.invoice_no,
          total_amount: savedSale.total_amount,
          sale_date: savedSale.sale_date,
          items_count: savedSale.items.length,
          biller_id: savedSale.biller_id,
          customer_name: savedSale.customer_name,
          payment_method: savedSale.payment_method
        },
        soldItems,
        summary: {
          subtotal: savedSale.subtotal,
          tax_amount: savedSale.tax_amount,
          discount_amount: savedSale.discount_amount,
          total_amount: savedSale.total_amount,
          items_count: savedSale.items.length
        }
      },
      soldItems // For backward compatibility with POS
    });

  } catch (error) {
    console.error('Sale creation error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error: ' + error.message,
      error: error.message 
    });
  }
});

// Get sales with date filtering
router.get('/', async (req, res) => {
  try {
    const { date, start_date, end_date, page = 1, limit = 20 } = req.query;
    
    // Build date filter
    const dateFilter = {};
    if (date) {
      // Single date filter - get sales for that specific date
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      dateFilter.sale_date = {
        $gte: startOfDay,
        $lte: endOfDay
      };
    } else if (start_date || end_date) {
      // Date range filter
      dateFilter.sale_date = {};
      if (start_date) {
        dateFilter.sale_date.$gte = new Date(start_date);
      }
      if (end_date) {
        dateFilter.sale_date.$lte = new Date(end_date);
      }
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Fetch sales with pagination and date filtering
    const sales = await Sale.find(dateFilter)
      .populate('biller_id', 'username name')
      .populate({
        path: 'items.product_id',
        select: 'name category_id',
        populate: {
          path: 'category_id',
          select: 'name'
        }
      })
      .sort({ sale_date: -1, created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const totalCount = await Sale.countDocuments(dateFilter);

    res.json({
      success: true,
      data: sales,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(totalCount / parseInt(limit)),
        total_items: totalCount,
        items_per_page: parseInt(limit)
      },
      message: 'Sales fetched successfully'
    });
  } catch (error) {
    console.error('Error fetching sales:', error);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error',
      error: error.message 
    });
  }
});

module.exports = router;
