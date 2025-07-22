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
    
    // Insert into pending_requests (this will now work!)
    await pool.query(
      'INSERT INTO pending_requests (user_id, request_type, request_data, status) VALUES (?, "email_verification", ?, "pending")',
      [result.insertId, verificationCode]
    );
    
    console.log(`Verification code ${verificationCode} for ${email} (User ID: ${result.insertId})`);
    res.status(201).json({ message: 'Registration successful. Check email for verification code.', userId: result.insertId });
  } catch (error) {
    console.error('Registration error:', error); // Added error logging
    res.status(500).json({ message: 'Server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const users = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    const requests = await pool.query('SELECT * FROM pending_requests WHERE user_id = ? AND status = "pending"', [user.user_id]);
    if (requests.length > 0) {
      return res.status(403).json({ message: 'Please verify your email first' });
    }
    const token = jwt.sign({ userId: user.user_id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    await pool.query('UPDATE users SET last_login = NOW() WHERE user_id = ?', [user.user_id]);
    res.json({ token, user: { id: user.user_id, email: user.email, firstName: user.first_name } });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Verify
router.post('/verify', async (req, res) => {
  const { email, code } = req.body;
  try {
    const users = await pool.query('SELECT user_id FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    const userId = users[0].user_id;
    const requests = await pool.query('SELECT * FROM pending_requests WHERE user_id = ? AND request_data = ? AND status = "pending"', [userId, code]);
    if (requests.length === 0) {
      return res.status(400).json({ message: 'Invalid or expired verification code' });
    }
    await pool.query('UPDATE users SET email_verified = 1 WHERE user_id = ?', [userId]);
    await pool.query('UPDATE pending_requests SET status = "completed" WHERE request_id = ?', [requests[0].request_id]);
    const token = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const userDetails = await pool.query('SELECT user_id, email, first_name, last_name FROM users WHERE user_id = ?', [userId]);
    const user = userDetails[0];
    res.json({ token, user: { id: user.user_id, email: user.email, firstName: user.first_name, lastName: user.last_name } });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;