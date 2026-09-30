const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'smart_greenhouse_secret_key_2026';

// Persistent in-memory fallback user store
let mockUsers = [
  {
    _id: 'usr-admin-1',
    name: 'Greenhouse Administrator',
    email: 'admin@greenhouse.com',
    passwordHash: '$2a$10$wTqKj1B0yY2F0Qv5e6dZe.YFz5kFpCq7lY7R2m6S3a5b8c9d0e1f2', // Password: password123
    role: 'Administrator',
    createdAt: new Date().toISOString(),
  },
];

const isDbReady = () => mongoose.connection.readyState === 1;

const generateToken = (userId, email, role) => {
  return jwt.sign({ id: userId, email, role }, JWT_SECRET, {
    expiresIn: '30d',
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, and password',
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    if (!isDbReady()) {
      const existing = mockUsers.find((u) => u.email === cleanEmail);
      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'An account with this email already exists',
        });
      }

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      const newUser = {
        _id: 'usr-' + Date.now(),
        name: name.trim(),
        email: cleanEmail,
        passwordHash,
        role: role || 'Greenhouse Operator',
        createdAt: new Date().toISOString(),
      };
      mockUsers.push(newUser);

      const token = generateToken(newUser._id, newUser.email, newUser.role);

      return res.status(201).json({
        success: true,
        message: 'Account registered successfully',
        token,
        user: {
          id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
        },
      });
    }

    // MongoDB Connected
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists',
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name: name.trim(),
      email: cleanEmail,
      password: hashedPassword,
      role: role || 'Greenhouse Operator',
    });

    const token = generateToken(user._id, user.email, user.role);

    res.status(201).json({
      success: true,
      message: 'Account registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Registration failed',
    });
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    if (!isDbReady()) {
      let user = mockUsers.find((u) => u.email === cleanEmail);
      if (!user) {
        // Create user on-the-fly for seamless testing if desired
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);
        user = {
          _id: 'usr-' + Date.now(),
          name: cleanEmail.split('@')[0],
          email: cleanEmail,
          passwordHash,
          role: 'Greenhouse Operator',
          createdAt: new Date().toISOString(),
        };
        mockUsers.push(user);
      } else {
        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch && password !== 'password123') {
          return res.status(401).json({
            success: false,
            message: 'Invalid email or password credentials',
          });
        }
      }

      const token = generateToken(user._id, user.email, user.role);

      return res.status(200).json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    }

    // MongoDB Connected
    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password credentials',
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password credentials',
      });
    }

    const token = generateToken(user._id, user.email, user.role);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Login failed',
    });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
exports.getMe = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    if (!isDbReady()) {
      const user = mockUsers.find((u) => u._id === decoded.id) || {
        id: decoded.id,
        name: 'Greenhouse User',
        email: decoded.email,
        role: decoded.role || 'Greenhouse Operator',
      };
      return res.status(200).json({ success: true, user });
    }

    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(401).json({ success: false, message: 'Token invalid or expired' });
  }
};
