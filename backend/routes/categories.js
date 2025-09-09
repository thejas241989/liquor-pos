const express = require('express');
const { body, validationResult } = require('express-validator');
const Category = require('../models/Category');
const Product = require('../models/Product');
const { verifyToken, requireManager } = require('../middleware/auth');

const router = express.Router();

// Test endpoint for categories without authentication (for development) - MUST BE FIRST
router.get('/test', async (req, res) => {
  try {
    const categories = await Category.find()
      .populate('parent_id', 'name')
      .sort({ name: 1 });

    const mappedCategories = categories.map(category => ({
      id: category._id.toString(),
      _id: category._id,
      name: category.name,
      parent_id: category.parent_id?._id || null,
      parent_name: category.parent_id?.name || null,
      description: category.description || '',
      volumes: category.volumes || [],
      created_at: category.created_at,
      updated_at: category.updated_at
    }));

    res.json({
      message: 'Categories retrieved successfully',
      data: mappedCategories
    });

  } catch (error) {
    console.error('Get test categories error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// Get all categories
router.get('/', [verifyToken], async (req, res) => {
  try {
    const categories = await Category.find()
      .populate('parent_id', 'name')
      .sort({ name: 1 });

    const mappedCategories = categories.map(category => ({
      id: category._id.toString(),
      _id: category._id,
      name: category.name,
      parent_id: category.parent_id?._id || null,
      parent_name: category.parent_id?.name || null,
      description: category.description || '',
      volumes: category.volumes || [],
      created_at: category.created_at,
      updated_at: category.updated_at
    }));

    res.json({
      message: 'Categories retrieved successfully',
      data: mappedCategories
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

    const category = await Category.findById(id)
      .populate('parent_id', 'name');

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    const responseCategory = {
      id: category._id.toString(),
      _id: category._id,
      name: category.name,
      parent_id: category.parent_id?._id || null,
      parent_name: category.parent_id?.name || null,
      description: category.description || '',
      volumes: category.volumes || [],
      created_at: category.created_at,
      updated_at: category.updated_at
    };

    res.json(responseCategory);

  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create new category (Manager+ only)
router.post('/', [
  verifyToken,
  requireManager,
  body('name').notEmpty().withMessage('Category name is required'),
  body('parent_id').optional().isMongoId().withMessage('Valid parent ID is required'),
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

    const { name, parent_id, description, volumes } = req.body;

    // Check if category name already exists
    const existingCategory = await Category.findOne({ name });
    if (existingCategory) {
      return res.status(400).json({ message: 'Category name already exists' });
    }

    // If parent_id is provided, check if it exists
    if (parent_id) {
      const parentCategory = await Category.findById(parent_id);
      if (!parentCategory) {
        return res.status(400).json({ message: 'Parent category not found' });
      }
    }

    // Create new category
    const newCategory = new Category({
      name,
      parent_id: parent_id || null,
      description: description || '',
      volumes: volumes || []
    });

    const savedCategory = await newCategory.save();
    await savedCategory.populate('parent_id', 'name');

    const responseCategory = {
      id: savedCategory._id.toString(),
      _id: savedCategory._id,
      name: savedCategory.name,
      parent_id: savedCategory.parent_id?._id || null,
      parent_name: savedCategory.parent_id?.name || null,
      description: savedCategory.description || '',
      volumes: savedCategory.volumes || [],
      created_at: savedCategory.created_at,
      updated_at: savedCategory.updated_at
    };

    res.status(201).json({
      message: 'Category created successfully',
      data: responseCategory
    });

  } catch (error) {
    console.error('Create category error:', error);
    if (error.code === 11000) {
      res.status(400).json({ message: 'Category name already exists' });
    } else {
      res.status(500).json({ message: 'Internal server error' });
    }
  }
});

// Update category (Manager+ only)
router.put('/:id', [
  verifyToken,
  requireManager,
  body('name').optional().notEmpty().withMessage('Category name cannot be empty'),
  body('parent_id').optional().isMongoId().withMessage('Valid parent ID is required'),
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
    const { name, parent_id, description, volumes } = req.body;

    // Check if category exists
    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // Check if new name already exists for another category
    if (name && name !== category.name) {
      const existingCategory = await Category.findOne({ 
        name, 
        _id: { $ne: id } 
      });
      if (existingCategory) {
        return res.status(400).json({ message: 'Category name already exists' });
      }
    }

    // If parent_id is provided, check if it exists and prevent circular reference
    if (parent_id) {
      if (parent_id === id) {
        return res.status(400).json({ message: 'Category cannot be its own parent' });
      }
      
      const parentCategory = await Category.findById(parent_id);
      if (!parentCategory) {
        return res.status(400).json({ message: 'Parent category not found' });
      }
    }

    // Update fields
    if (name) category.name = name;
    if (parent_id !== undefined) category.parent_id = parent_id || null;
    if (description !== undefined) category.description = description;
    if (volumes !== undefined) category.volumes = volumes;

    const updatedCategory = await category.save();
    await updatedCategory.populate('parent_id', 'name');

    const responseCategory = {
      id: updatedCategory._id.toString(),
      _id: updatedCategory._id,
      name: updatedCategory.name,
      parent_id: updatedCategory.parent_id?._id || null,
      parent_name: updatedCategory.parent_id?.name || null,
      description: updatedCategory.description || '',
      volumes: updatedCategory.volumes || [],
      created_at: updatedCategory.created_at,
      updated_at: updatedCategory.updated_at
    };

    res.json({
      message: 'Category updated successfully',
      data: responseCategory
    });

  } catch (error) {
    console.error('Update category error:', error);
    if (error.code === 11000) {
      res.status(400).json({ message: 'Category name already exists' });
    } else {
      res.status(500).json({ message: 'Internal server error' });
    }
  }
});

// Delete category (Manager+ only)
router.delete('/:id', [verifyToken, requireManager], async (req, res) => {
  try {
    const { id } = req.params;

    // Check if category exists
    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // Check if any products are using this category
    const productsUsingCategory = await Product.findOne({
      $or: [
        { category_id: id },
        { subcategory_id: id }
      ]
    });

    if (productsUsingCategory) {
      return res.status(400).json({ 
        message: 'Cannot delete category. It is being used by products.' 
      });
    }

    // Check if any subcategories exist
    const subcategories = await Category.findOne({ parent_id: id });
    if (subcategories) {
      return res.status(400).json({ 
        message: 'Cannot delete category. It has subcategories.' 
      });
    }

    // Delete the category
    await Category.findByIdAndDelete(id);

    res.json({
      message: 'Category deleted successfully',
      data: { id: id }
    });

  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
