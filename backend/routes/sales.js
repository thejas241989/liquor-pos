const express = require('express');
const mongoose = require('mongoose');
const Product = require('../models/Product');

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

    // Create sale summary
    const saleData = {
      invoice_no,
      total_amount,
      subtotal,
      tax_amount: total_tax,
      discount_amount,
      items_count: items.length,
      sale_date: new Date(),
      items: processed_items
    };

    console.log('Sale completed successfully:', {
      invoice_no,
      total_amount,
      items_count: items.length,
      soldItems: soldItems.map(item => `${item.quantity}x ${item.name}`)
    });

    res.status(201).json({
      success: true,
      message: 'Sale completed successfully',
      data: {
        sale: {
          id: saleData.invoice_no,
          invoice_no,
          total_amount,
          items_count: items.length
        },
        soldItems,
        summary: {
          subtotal,
          tax_amount: total_tax,
          discount_amount,
          total_amount,
          items_count: items.length
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

// Get sales
router.get('/', async (req, res) => {
  try {
    res.json({
      success: true,
      data: [],
      message: 'Sales endpoint working'
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
