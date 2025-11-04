// FIXED auth.js (BACKEND) - FINAL VERSION WITH ALL FIXES
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import nodemailer from 'nodemailer';
import pool from '../db.js';
import authenticateToken from '../middleware/auth.js';

const router = express.Router();

// Configuration
const JWT_SECRET = process.env.JWT_SECRET || "dishcovery123";
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Google OAuth Client
const googleClient = new OAuth2Client(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  `${FRONTEND_URL}/auth/google/callback`
);

// EMAIL TRANSPORTER - WORKS WITH RENDER (Uses SendGrid or Gmail fallback)
const emailTransporter = process.env.SENDGRID_API_KEY
  ? nodemailer.createTransport({
      host: 'smtp.sendgrid.net',
      port: 587,
      secure: false,
      auth: {
        user: 'apikey',
        pass: process.env.SENDGRID_API_KEY
      }
    })
  : nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD
      },
      tls: {
        rejectUnauthorized: false
      }
    });

// Utility Functions
const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const validatePassword = (password) => {
  if (!password || password.length < 8) return false;
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  return hasLower && hasUpper && hasNumber;
};
const generateVerificationCode = () => Math.floor(100000 + Math.random() * 900000).toString();

// Send verification email
const sendVerificationEmail = async (email, code, firstName = '') => {
  const fromEmail = process.env.SENDGRID_FROM_EMAIL || process.env.EMAIL_USER;
  const mailOptions = {
    from: `"DishCovery" <${fromEmail}>`,
    to: email,
    subject: 'Verify Your DishCovery Account',
    html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif; color: #333;">
        <div style="max-width:600px;margin:0 auto;padding:20px;">
          <h2 style="background:#667eea;color:white;padding:15px;border-radius:10px 10px 0 0;text-align:center;">
            Welcome to DishCovery!
          </h2>
          <div style="background:#f9f9f9;padding:20px;border-radius:0 0 10px 10px;">
            <p>Hi ${firstName || 'there'}!</p>
            <p>Please verify your email using the code below:</p>
            <div style="background:white;border:2px dashed #667eea;padding:15px;text-align:center;font-size:28px;font-weight:bold;color:#667eea;">
              ${code}
            </div>
            <p>This code will expire in 10 minutes.</p>
            <p>If you didn't register, ignore this email.</p>
            <p style="font-size:12px;color:#888;">© 2025 DishCovery. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>`
  };

  try {
    await emailTransporter.sendMail(mailOptions);
    console.log(`Verification email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('Email send error:', error);
    throw new Error('Failed to send verification email');
  }
};

// REGISTER
router.post('/register', async (req, res) => {
  const { firstName, lastName, email, password } = req.body;

  if (!firstName || !lastName || !email || !password)
    return res.status(400).json({ message: 'All fields are required' });

  if (!validateEmail(email))
    return res.status(400).json({ message: 'Invalid email format' });

  if (!validatePassword(password))
    return res.status(400).json({
      message: 'Password must be at least 8 characters with uppercase, lowercase, and number'
    });

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const existing = await connection.query('SELECT * FROM users WHERE email = ?', [email]);
    
    if (existing[0].length > 0) {
      if (existing[0][0].email_verified) {
        await connection.rollback();
        return res.status(400).json({ message: 'Email already registered. Please log in instead.' });
      } else {
        await connection.query('DELETE FROM pending_requests WHERE user_id = ?', [existing[0][0].user_id]);
        await connection.query('DELETE FROM users WHERE user_id = ?', [existing[0][0].user_id]);
        console.log(`Deleted unverified account for ${email}`);
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await connection.query(
      'INSERT INTO users (email, password_hash, first_name, last_name, email_verified, is_active, is_new_user) VALUES (?, ?, ?, ?, 0, 1, 1)',
      [email, passwordHash, firstName, lastName]
    );

    const verificationCode = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await connection.query(
      'INSERT INTO pending_requests (user_id, request_type, request_data, status, created_at) VALUES (?, ?, ?, ?, ?)',
      [result[0].insertId, 'email_verification', verificationCode, 'pending', expiresAt]
    );

    await sendVerificationEmail(email, verificationCode, firstName);

    await connection.commit();

    res.status(201).json({
      message: 'Registration successful! Please check your email for verification code.',
      userId: result[0].insertId,
      requiresVerification: true,
      email
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error' });
  } finally {
    if (connection) connection.release();
  }
});

// LOGIN - FIXED TO HANDLE GOOGLE OAUTH USERS
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const users = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users[0].length === 0)
      return res.status(401).json({ message: 'Invalid email or password' });

    const user = users[0][0];

    // FIX: Check if user registered via Google OAuth (no password)
    if (!user.password_hash || user.password_hash === null) {
      return res.status(400).json({
        message: 'This account was created with Google. Please use "Continue with Google" to log in.',
        useGoogleLogin: true
      });
    }

    const isMatch = user.password_hash.startsWith('$2')
      ? await bcrypt.compare(password, user.password_hash)
      : password === user.password_hash;

    if (!isMatch)
      return res.status(401).json({ message: 'Invalid email or password' });

    if (!user.email_verified)
      return res.status(403).json({
        message: 'Please verify your email first',
        requiresVerification: true,
        email
      });

    const tokenPayload = {
      userId: user.user_id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      isAdmin: false
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '24h' });

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

// VERIFY - 100% BULLETPROOF
// VERIFY - 100% BULLETPROOF & FIXED
router.post('/verify', async (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ message: 'Email and code are required' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // FIX 1: Correct destructuring
    const [userRows] = await connection.query(
      'SELECT user_id FROM users WHERE email = ?',
      [email]
    );

    if (!userRows || userRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'User not found' });
    }

    const userId = userRows[0].user_id;

    // FIX 2: Correct destructuring
    const [requestRows] = await connection.query(
      `SELECT * FROM pending_requests 
       WHERE user_id = ? 
         AND request_data = ? 
         AND status = 'pending' 
         AND request_type = 'email_verification'`,
      [userId, code]
    );

    if (!requestRows || requestRows.length === 0) {
      await connection.rollback();
      return res.status(400).json({ message: 'Invalid or expired verification code' });
    }

    const request = requestRows[0];
    const requestTime = new Date(request.created_at);
    const minutesAgo = (Date.now() - requestTime.getTime()) / 60000;

    if (minutesAgo > 10) {
      await connection.rollback();
      return res.status(400).json({ message: 'Verification code expired. Please request a new one.' });
    }

    // Mark as verified
    await connection.query('UPDATE users SET email_verified = 1 WHERE user_id = ?', [userId]);
    await connection.query(
      'UPDATE pending_requests SET status = ? WHERE request_id = ?',
      ['completed', request.request_id]
    );

    // FIX 3: Correct destructuring
    const [fullUserRows] = await connection.query(
      'SELECT user_id, email, first_name, last_name FROM users WHERE user_id = ?',
      [userId]
    );

    if (!fullUserRows || fullUserRows.length === 0) {
      await connection.rollback();
      return res.status(500).json({ message: 'User data corrupted' });
    }

    const user = fullUserRows[0];

    const token = jwt.sign({
      userId: user.user_id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      isAdmin: false
    }, JWT_SECRET, { expiresIn: '24h' });

    await connection.commit();

    return res.json({
      success: true,
      message: 'Email verified successfully!',
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
    if (connection) await connection.rollback();
    console.error('Verification error:', error); // This will now show real error
    return res.status(500).json({ 
      message: 'Server error',
      error: error.message // Optional: for debugging (remove in prod)
    });
  } finally {
    if (connection) connection.release();
  }
});

// RESEND VERIFICATION
router.post('/resend-verification', async (req, res) => {
  const { email } = req.body;
  if (!email)
    return res.status(400).json({ message: 'Email is required' });

  try {
    const users = await pool.query(
      'SELECT user_id, email, first_name, email_verified FROM users WHERE email = ?',
      [email]
    );
    if (users[0].length === 0)
      return res.status(404).json({ message: 'User not found' });

    const user = users[0][0];
    if (user.email_verified)
      return res.status(400).json({ message: 'Email already verified' });

    await pool.query(
      'UPDATE pending_requests SET status = ? WHERE user_id = ? AND request_type = ? AND status = ?',
      ['expired', user.user_id, 'email_verification', 'pending']
    );

    const verificationCode = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await pool.query(
      'INSERT INTO pending_requests (user_id, request_type, request_data, status, created_at) VALUES (?, ?, ?, ?, ?)',
      [user.user_id, 'email_verification', verificationCode, 'pending', expiresAt]
    );

    await sendVerificationEmail(email, verificationCode, user.first_name);

    res.json({ success: true, message: 'Verification code resent successfully!' });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ message: 'Failed to resend code', error: error.message });
  }
});

// GOOGLE OAUTH - Get Auth URL
router.get('/google', (req, res) => {
  const { state } = req.query;

  let mode = 'login';
  if (state) {
    try {
      const decoded = JSON.parse(atob(state));
      mode = ['login', 'signup'].includes(decoded.mode) ? decoded.mode : 'login';
    } catch (e) {
      return res.status(400).json({ message: 'Invalid state parameter' });
    }
  }

  const authUrl = googleClient.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ],
    prompt: 'consent',
    state: state || btoa(JSON.stringify({ mode: 'login' }))
  });
  res.redirect(authUrl);
});

// FIXED GOOGLE OAUTH - Handle Callback (WITH TRANSACTION + NO FORCE VERIFY)
router.post('/google/callback', async (req, res) => {
  const { code, state } = req.body;

  if (!code || !state) {
    return res.status(400).json({ message: 'Missing code or state' });
  }

  let mode = 'login';
  try {
    const decoded = JSON.parse(atob(state));
    mode = decoded.mode === 'signup' ? 'signup' : 'login';
  } catch (e) {
    return res.status(400).json({ message: 'Invalid state format' });
  }

  console.log(`Google OAuth - Mode: ${mode}`);

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const { tokens } = await googleClient.getToken(code);
    googleClient.setCredentials(tokens);

    const ticket = await googleClient.verifyIdToken({
      idToken: tokens.id_token,
      audience: GOOGLE_CLIENT_ID
    });

    const googleUser = ticket.getPayload();
    if (!googleUser) throw new Error('Invalid Google token');

    const { sub: googleId, email, given_name, family_name, picture } = googleUser;
    console.log(`Google user authenticated: ${email}`);

    const existingUsers = await connection.query(
      'SELECT * FROM users WHERE email = ? OR google_id = ?',
      [email, googleId]
    );
    const existingUser = existingUsers[0].length > 0 ? existingUsers[0][0] : null;

    // LOGIN MODE
    if (mode === 'login') {
      if (!existingUser) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: 'No account found. Please sign up first.'
        });
      }

      // CHECK VERIFICATION - AUTO SEND CODE
      if (!existingUser.email_verified) {
        // Expire old codes
        await connection.query(
          'UPDATE pending_requests SET status = ? WHERE user_id = ? AND request_type = ? AND status = ?',
          ['expired', existingUser.user_id, 'email_verification', 'pending']
        );

        // Generate new verification code
        const verificationCode = generateVerificationCode();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        await connection.query(
          'INSERT INTO pending_requests (user_id, request_type, request_data, status, created_at) VALUES (?, ?, ?, ?, ?)',
          [existingUser.user_id, 'email_verification', verificationCode, 'pending', expiresAt]
        );

        // Send verification email
        await sendVerificationEmail(email, verificationCode, existingUser.first_name || given_name);

        console.log(`🔐 Unverified user login attempt - verification code sent to ${email}`);
        await connection.commit();
        return res.status(403).json({
          success: false,
          message: 'Please verify your email first. A new verification code has been sent.',
          requiresVerification: true,
          email
        });
      }

      // UPDATE IF NO GOOGLE ID (WITHOUT FORCING VERIFY)
      if (!existingUser.google_id) {
        await connection.query(
          'UPDATE users SET google_id = ?, profile_picture_url = ? WHERE user_id = ?',
          [googleId, picture, existingUser.user_id]
        );
      }

      await connection.query(
        'UPDATE users SET last_login = NOW(), last_activity = NOW() WHERE user_id = ?',
        [existingUser.user_id]
      );

      const token = jwt.sign({
        userId: existingUser.user_id,
        email: existingUser.email,
        firstName: existingUser.first_name || given_name,
        lastName: existingUser.last_name || family_name,
        isAdmin: false
      }, JWT_SECRET, { expiresIn: '24h' });

      console.log(`Google login successful: ${email}`);
      await connection.commit();
      return res.json({
        success: true,
        message: 'Google login successful',
        token,
        user: {
          userId: existingUser.user_id,
          email: existingUser.email,
          firstName: existingUser.first_name || given_name,
          lastName: existingUser.last_name || family_name,
          picture
        }
      });
    }

    // SIGNUP MODE
    if (mode === 'signup') {
      if (existingUser) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: 'Email already registered. Please log in instead.'
        });
      }

      const result = await connection.query(
        `INSERT INTO users (email, google_id, first_name, last_name, profile_picture_url, email_verified, is_active, is_new_user)
         VALUES (?, ?, ?, ?, ?, 0, 1, 1)`,
        [email, googleId, given_name, family_name, picture]
      );

      const newUserId = result[0].insertId;
      const verificationCode = generateVerificationCode();

      // FIXED: Code valid for 10 minutes
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      await connection.query(
        'INSERT INTO pending_requests (user_id, request_type, request_data, status, created_at) VALUES (?, ?, ?, ?, ?)',
        [newUserId, 'email_verification', verificationCode, 'pending', expiresAt]
      );

      await sendVerificationEmail(email, verificationCode, given_name);

      console.log(`Google signup: ${email} created`);
      await connection.commit();
      return res.json({
        success: true,
        message: 'Account created! Check your email for verification.',
        requiresVerification: true,
        email
      });
    }

    await connection.rollback();
    return res.status(400).json({ message: 'Invalid mode' });

  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Google OAuth error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Google authentication failed',
      error: error.message
    });
  } finally {
    if (connection) connection.release();
  }
});

// LOGOUT
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    await pool.query('UPDATE users SET last_activity = NOW() WHERE user_id = ?', [userId]);
    res.status(200).json({ success: true, message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ success: false, message: 'Logout failed' });
  }
});

export default router;