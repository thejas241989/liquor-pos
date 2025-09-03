const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { verifyToken, requireManager } = require('../middleware/auth');

const router = express.Router();

// Get all categories
router.get('/', [verifyToken], async (req, res) => {
  try {
    const [categories] = await db.execute(`
      SELECT 
        id,
        name,
        description,
        created_at,
        updated_at
      FROM categories 
      ORDER BY name
    `);

    res.json({
      message: 'Categories retrieved successfully',
      data: categories
    });

  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get category by ID
router.get('/:id', [verifyToken], async (req, res) => {
  try {
    const { id } = req.params;

    const [categories] = await db.execute(`
      SELECT 
        id,
        name,
        description,
        created_at,
        updated_at
      FROM categories 
      WHERE id = ?
    `, [id]);

    if (categories.length === 0) {
      return res.status(404).json({ message: 'Category not found' });
    }

    res.json({
      message: 'Category retrieved successfully',
      data: categories[0]
    });

  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create new category (Manager+ access)
router.post('/', [
  verifyToken,
  requireManager,
  body('name').notEmpty().trim().withMessage('Category name is required'),
  body('description').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, description } = req.body;

    // Check if category name already exists
    const [existing] = await db.execute(`
      SELECT id FROM categories WHERE name = ?
    `, [name]);

    if (existing.length > 0) {
      return res.status(400).json({ message: 'Category name already exists' });
    }

    const [result] = await db.execute(`
      INSERT INTO categories (name, description) 
      VALUES (?, ?)
    `, [name, description]);

    res.status(201).json({
      message: 'Category created successfully',
      data: {
        id: result.insertId,
        name,
        description
      }
    });

  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update category (Manager+ access)
router.put('/:id', [
  verifyToken,
  requireManager,
  body('name').optional().notEmpty().trim().withMessage('Category name cannot be empty'),
  body('description').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { name, description } = req.body;

    // Check if category exists
    const [existing] = await db.execute(`
      SELECT id FROM categories WHERE id = ?
    `, [id]);

    if (existing.length === 0) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // Check if new name conflicts with existing categories (excluding current)
    if (name) {
      const [nameCheck] = await db.execute(`
        SELECT id FROM categories WHERE name = ? AND id != ?
      `, [name, id]);

      if (nameCheck.length > 0) {
        return res.status(400).json({ message: 'Category name already exists' });
      }
    }

    // Build update query dynamically
    const updates = [];
    const values = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    values.push(id);

    await db.execute(`
      UPDATE categories 
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, values);

    // Get updated category
    const [updated] = await db.execute(`
      SELECT id, name, description, created_at, updated_at 
      FROM categories WHERE id = ?
    `, [id]);

    res.json({
      message: 'Category updated successfully',
      data: updated[0]
    });

  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete category (Manager+ access)
router.delete('/:id', [verifyToken, requireManager], async (req, res) => {
  try {
    const { id } = req.params;

    // Check if category exists
    const [existing] = await db.execute(`
      SELECT id FROM categories WHERE id = ?
    `, [id]);

    if (existing.length === 0) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // Check if category is being used by products
    const [productsUsing] = await db.execute(`
      SELECT COUNT(*) as count FROM products WHERE category_id = ?
    `, [id]);

    if (productsUsing[0].count > 0) {
      return res.status(400).json({ 
        message: `Cannot delete category. ${productsUsing[0].count} products are using this category.`
      });
    }

    await db.execute(`DELETE FROM categories WHERE id = ?`, [id]);

    res.json({ message: 'Category deleted successfully' });

  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
