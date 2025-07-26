import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../db.js';

const router = express.Router();

const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

const validatePassword = (password) => {
  const re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  return re.test(password);
};

// Signup - PROPERLY FIXED VERSION
router.post('/register', async (req, res) => {
  const { firstName, lastName, email, password } = req.body;
  if (!validateEmail(email) || !validatePassword(password)) {
    return res.status(400).json({ message: 'Invalid email or password format' });
  }
  try {
    const existing = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ message: 'Email already registered' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (email, password_hash, first_name, last_name, email_verified) VALUES (?, ?, ?, ?, 0)',
      [email, passwordHash, firstName, lastName]
    );
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // FIXED: Use single quotes for status value
    await pool.query(
      'INSERT INTO pending_requests (user_id, request_type, request_data, status) VALUES (?, ?, ?, ?)',
      [result.insertId, 'email_verification', verificationCode, 'pending']
    );
    
    console.log(`Verification code ${verificationCode} for ${email} (User ID: ${result.insertId})`);
    res.status(201).json({ message: 'Registration successful. Check email for verification code.', userId: result.insertId });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login - FIXED VERSION
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const users = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    const user = users[0];
    
    // Check password - handle both hashed and plain text (for development)
    let isMatch = false;
    if (user.password_hash.startsWith('$2a$') || user.password_hash.startsWith('$2b$')) {
      // Hashed password
      isMatch = await bcrypt.compare(password, user.password_hash);
    } else {
      // Plain text password (for development)
      isMatch = password === user.password_hash;
    }
    
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // FIXED: Use single quotes for status value
    const requests = await pool.query('SELECT * FROM pending_requests WHERE user_id = ? AND status = ?', [user.user_id, 'pending']);
    if (requests.length > 0) {
      return res.status(403).json({ message: 'Please verify your email first' });
    }

    // Generate token with proper payload
    const tokenPayload = {
      userId: user.user_id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      isAdmin: false
    };

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '24h' });
    await pool.query('UPDATE users SET last_login = NOW() WHERE user_id = ?', [user.user_id]);

    res.json({ 
      success: true,
      token, 
      user: { 
        userId: user.user_id,
        id: user.user_id, 
        email: user.email, 
        firstName: user.first_name,
        lastName: user.last_name
      } 
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Verify - FIXED VERSION
router.post('/verify', async (req, res) => {
  const { email, code } = req.body;
  try {
    const users = await pool.query('SELECT user_id FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    const userId = users[0].user_id;
    
    // FIXED: Use single quotes for status value
    const requests = await pool.query('SELECT * FROM pending_requests WHERE user_id = ? AND request_data = ? AND status = ?', [userId, code, 'pending']);
    if (requests.length === 0) {
      return res.status(400).json({ message: 'Invalid or expired verification code' });
    }
    
    await pool.query('UPDATE users SET email_verified = 1 WHERE user_id = ?', [userId]);
    await pool.query('UPDATE pending_requests SET status = ? WHERE request_id = ?', ['completed', requests[0].request_id]);
    
    const token = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '24h' });
    const userDetails = await pool.query('SELECT user_id, email, first_name, last_name FROM users WHERE user_id = ?', [userId]);
    const user = userDetails[0];
    
    res.json({ 
      success: true,
      token, 
      user: { 
        userId: user.user_id,
        id: user.user_id, 
        email: user.email, 
        firstName: user.first_name, 
        lastName: user.last_name 
      } 
    });
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;