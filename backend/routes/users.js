const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { verifyToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all users (Admin only)
router.get('/', [verifyToken, requireAdmin], async (req, res) => {
  try {
    const users = await User.find({ status: 'active' })
      .select('-password')
      .sort({ username: 1 });

    const formattedUsers = users.map(user => ({
      id: user._id.toString(),
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      status: user.status,
      created_at: user.created_at,
      updated_at: user.updated_at
    }));

    res.json({
      message: 'Users retrieved successfully',
      data: formattedUsers
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create new user (Admin only)
router.post('/', [
  verifyToken,
  requireAdmin,
  body('username').notEmpty().withMessage('Username is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('role').isIn(['admin', 'manager', 'biller']).withMessage('Valid role is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { username, email, password, role } = req.body;

    // Check if username or email already exists
    const existingUser = await User.findOne({
      $or: [{ username }, { email }]
    });

    if (existingUser) {
      if (existingUser.username === username) {
        return res.status(400).json({ message: 'Username already exists' });
      }
      if (existingUser.email === email) {
        return res.status(400).json({ message: 'Email already exists' });
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      role,
      status: 'active'
    });

    const savedUser = await newUser.save();

    const responseUser = {
      id: savedUser._id.toString(),
      _id: savedUser._id,
      username: savedUser.username,
      email: savedUser.email,
      role: savedUser.role,
      status: savedUser.status,
      created_at: savedUser.created_at,
      updated_at: savedUser.updated_at
    };

    res.status(201).json({
      message: 'User created successfully',
      data: responseUser
    });

  } catch (error) {
    console.error('Create user error:', error);
    if (error.code === 11000) {
      res.status(400).json({ message: 'Username or email already exists' });
    } else {
      res.status(500).json({ message: 'Internal server error' });
    }
  }
});

// Get single user by ID (Admin only)
router.get('/:id', [verifyToken, requireAdmin], async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).select('-password');

    if (!user || user.status !== 'active') {
      return res.status(404).json({ message: 'User not found' });
    }

    const responseUser = {
      id: user._id.toString(),
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      status: user.status,
      created_at: user.created_at,
      updated_at: user.updated_at
    };

    res.json(responseUser);

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update user (Admin only)
router.put('/:id', [
  verifyToken,
  requireAdmin,
  body('username').optional().notEmpty().withMessage('Username cannot be empty'),
  body('email').optional().isEmail().withMessage('Valid email is required'),
  body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('role').optional().isIn(['admin', 'manager', 'biller']).withMessage('Valid role is required'),
  body('status').optional().isIn(['active', 'inactive']).withMessage('Valid status is required')
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
    const { username, email, password, role, status } = req.body;

    // Check if user exists
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if username or email already exists for another user
    if (username || email) {
      const existingUser = await User.findOne({
        _id: { $ne: id },
        $or: [
          ...(username ? [{ username }] : []),
          ...(email ? [{ email }] : [])
        ]
      });

      if (existingUser) {
        if (existingUser.username === username) {
          return res.status(400).json({ message: 'Username already exists' });
        }
        if (existingUser.email === email) {
          return res.status(400).json({ message: 'Email already exists' });
        }
      }
    }

    // Update fields
    if (username) user.username = username;
    if (email) user.email = email;
    if (role) user.role = role;
    if (status) user.status = status;
    
    if (password) {
      user.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await user.save();

    const responseUser = {
      id: updatedUser._id.toString(),
      _id: updatedUser._id,
      username: updatedUser.username,
      email: updatedUser.email,
      role: updatedUser.role,
      status: updatedUser.status,
      created_at: updatedUser.created_at,
      updated_at: updatedUser.updated_at
    };

    res.json({
      message: 'User updated successfully',
      data: responseUser
    });

  } catch (error) {
    console.error('Update user error:', error);
    if (error.code === 11000) {
      res.status(400).json({ message: 'Username or email already exists' });
    } else {
      res.status(500).json({ message: 'Internal server error' });
    }
  }
});

// Delete user (Admin only) - Soft delete
router.delete('/:id', [verifyToken, requireAdmin], async (req, res) => {
  try {
    const { id } = req.params;

    // Don't allow deletion of the requesting user (prevent self-deletion)
    if (id === req.user.id) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Soft delete by setting status to inactive
    user.status = 'inactive';
    await user.save();

    res.json({
      message: 'User deleted successfully',
      data: { id: user._id.toString() }
    });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
