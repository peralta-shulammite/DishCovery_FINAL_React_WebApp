const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const { validateEmail, validatePassword } = require('../utils/validation');

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;
    
    // Validate input
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    
    if (!validateEmail(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }
    
    if (!validatePassword(password)) {
      return res.status(400).json({ 
        message: 'Password must be at least 8 characters with uppercase, lowercase, and number'
      });
    }
    
    // Check if user exists
    const [existingUsers] = await pool.query(
      'SELECT * FROM users WHERE email = ?', 
      [email]
    );
    
    if (existingUsers.length > 0) {
      return res.status(409).json({ message: 'Email already in use' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const [result] = await pool.query(
      'INSERT INTO users (first_name, last_name, email, password_hash, is_active) VALUES (?, ?, ?, ?, ?)',
      [firstName, lastName, email, hashedPassword, true]
    );
    
    // Generate verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store verification code
    await pool.query(
      'INSERT INTO pending_requests (user_id, request_type, request_data, status) VALUES (?, ?, ?, ?)',
      [result.insertId, 'email_verification', verificationCode, 'pending']
    );
    
    // In production, you would send this code to the user's email
    console.log(`Verification code for ${email}: ${verificationCode}`);
    
    res.status(201).json({ 
      message: 'User registered. Verification code sent to email.',
      userId: result.insertId
    });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    
    // Find user
    const [users] = await pool.query(
      'SELECT * FROM users WHERE email = ?', 
      [email]
    );
    
    if (users.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    const user = users[0];
    
    // Check password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Check if email is verified
    const [pendingRequests] = await pool.query(
      'SELECT * FROM pending_requests WHERE user_id = ? AND request_type = "email_verification" AND status = "pending"',
      [user.user_id]
    );
    
    if (pendingRequests.length > 0) {
      return res.status(403).json({ 
        message: 'Account not verified. Please check your email for verification code.' 
      });
    }
    
    // Create JWT token
    const token = jwt.sign(
      { userId: user.user_id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    // Update last login
    await pool.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP() WHERE user_id = ?',
      [user.user_id]
    );
    
    res.json({ 
      token,
      user: {
        userId: user.user_id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email
      }
    });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Verify email with code
router.post('/verify', async (req, res) => {
  try {
    const { email, code } = req.body;
    
    // Find user
    const [users] = await pool.query(
      'SELECT * FROM users WHERE email = ?', 
      [email]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const user = users[0];
    
    // Check verification code
    const [requests] = await pool.query(
      'SELECT * FROM pending_requests WHERE user_id = ? AND request_type = "email_verification" AND request_data = ? AND status = "pending"',
      [user.user_id, code]
    );
    
    if (requests.length === 0) {
      return res.status(400).json({ message: 'Invalid verification code' });
    }
    
    // Mark request as completed
    await pool.query(
      'UPDATE pending_requests SET status = "completed", processed_at = CURRENT_TIMESTAMP() WHERE request_id = ?',
      [requests[0].request_id]
    );
    
    // Update user as verified
    await pool.query(
      'UPDATE users SET email_verified = 1 WHERE user_id = ?',
      [user.user_id]
    );
    
    // Create JWT token
    const token = jwt.sign(
      { userId: user.user_id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    res.json({ 
      token,
      user: {
        userId: user.user_id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email
      }
    });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during verification' });
  }
});

module.exports = router;