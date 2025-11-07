// FIXED auth.js (BACKEND) - FINAL VERSION WITH SENDGRID HTTP API
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import sgMail from '@sendgrid/mail';
import nodemailer from 'nodemailer';
import pool from '../db.js';
import authenticateToken from '../middleware/auth.js';

const router = express.Router();

// Configuration
const JWT_SECRET = process.env.JWT_SECRET || "dishcovery123";

// ⚠️ Security warning for production
if (process.env.NODE_ENV === 'production' && JWT_SECRET === "dishcovery123") {
  console.warn('⚠️⚠️⚠️ WARNING: Using default JWT_SECRET in production! Set JWT_SECRET environment variable!');
}

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Google OAuth Client
const googleClient = new OAuth2Client(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  `${FRONTEND_URL}/auth/google/callback`
);

// ========================================
// 🔐 SECURITY: VERIFY TOKEN & GET USER ROLE
// ========================================
router.get('/verify-token', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    console.log('🔐 Verifying token for user:', userId);
    console.log('🔍 Token payload:', req.user);
    
    // ✅ FETCH USER DATA FROM DATABASE (NOT FROM JWT!)
    const users = await pool.query(`
      SELECT 
        u.user_id, 
        u.email, 
        u.first_name, 
        u.last_name,
        u.google_id,
        CASE 
          WHEN EXISTS (
            SELECT 1 FROM admin_users a 
            WHERE a.email = u.email AND (a.is_active = 1 OR a.is_active IS NULL)
          ) THEN TRUE 
          ELSE FALSE 
        END as is_admin
      FROM users u
      WHERE u.user_id = ?
    `, [userId]);
    
    console.log('📊 Query result:', { 
      isArray: Array.isArray(users), 
      length: users?.length, 
      type: typeof users,
      firstResult: users?.[0] ? 'exists' : 'null'
    });
    
    if (!users || users.length === 0) {
      console.warn('⚠️ User not found in database for userId:', userId);
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    const user = users[0];
    console.log('✅ User verified:', { 
      userId: user.user_id,
      email: user.email, 
      isAdmin: user.is_admin 
    });
    
    res.json({
      success: true,
      user: {
        userId: user.user_id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        isAdmin: Boolean(user.is_admin),  // ✅ From DATABASE!
        isGoogleUser: Boolean(user.google_id)
      }
    });
  } catch (error) {
    console.error('❌ Token verification error:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during verification',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// SENDGRID HTTP API - WORKS WITH RENDER (No SMTP ports needed!)
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  console.log('✅ SendGrid HTTP API configured');
}

// GMAIL SMTP FALLBACK (for local development only)
const gmailTransporter = process.env.EMAIL_USER && process.env.EMAIL_APP_PASSWORD
  ? nodemailer.createTransport({
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
    })
  : null;

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

// Send verification email using SendGrid HTTP API or Gmail SMTP fallback
const sendVerificationEmail = async (email, code, firstName = '') => {
  const emailHtml = `
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
    </html>`;

  try {
    // Use SendGrid HTTP API (works on Render - no SMTP ports needed!)
    if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM_EMAIL) {
      const msg = {
        to: email,
        from: {
          email: process.env.SENDGRID_FROM_EMAIL,
          name: 'DishCovery'
        },
        subject: 'Verify Your DishCovery Account',
        html: emailHtml
      };

      await sgMail.send(msg);
      console.log(`✅ Verification email sent via SendGrid HTTP API to ${email}`);
      return true;
    }

    // Fallback to Gmail SMTP (local development only)
    if (gmailTransporter) {
      const mailOptions = {
        from: `"DishCovery" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Verify Your DishCovery Account',
        html: emailHtml
      };

      await gmailTransporter.sendMail(mailOptions);
      console.log(`✅ Verification email sent via Gmail SMTP to ${email}`);
      return true;
    }

    throw new Error('No email service configured');
  } catch (error) {
    console.error('❌ Email send error:', error);
    throw new Error('Failed to send verification email');
  }
};

// Send password reset email using SendGrid HTTP API or Gmail SMTP fallback
const sendPasswordResetEmail = async (email, code, firstName = '') => {
  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; color: #333;">
      <div style="max-width:600px;margin:0 auto;padding:20px;">
        <h2 style="background:#667eea;color:white;padding:15px;border-radius:10px 10px 0 0;text-align:center;">
          🔑 Password Reset Request
        </h2>
        <div style="background:#f9f9f9;padding:20px;border-radius:0 0 10px 10px;">
          <p>Hi ${firstName || 'there'}!</p>
          <p>We received a request to reset your DishCovery password. Use the code below to reset it:</p>
          <div style="background:white;border:2px dashed #667eea;padding:15px;text-align:center;font-size:28px;font-weight:bold;color:#667eea;">
            ${code}
          </div>
          <p><strong>This code will expire in 15 minutes.</strong></p>
          <p>If you didn't request a password reset, please ignore this email and your password will remain unchanged.</p>
          <p style="margin-top:30px;padding-top:20px;border-top:1px solid #ddd;font-size:12px;color:#888;">
            For security reasons, never share this code with anyone.
          </p>
          <p style="font-size:12px;color:#888;">© 2025 DishCovery. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>`;

  try {
    // Use SendGrid HTTP API (works on Render - no SMTP ports needed!)
    if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM_EMAIL) {
      const msg = {
        to: email,
        from: {
          email: process.env.SENDGRID_FROM_EMAIL,
          name: 'DishCovery'
        },
        subject: '🔑 Reset Your DishCovery Password',
        html: emailHtml
      };

      await sgMail.send(msg);
      console.log(`✅ Password reset email sent via SendGrid HTTP API to ${email}`);
      return true;
    }

    // Fallback to Gmail SMTP (local development only)
    if (gmailTransporter) {
      const mailOptions = {
        from: `"DishCovery" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: '🔑 Reset Your DishCovery Password',
        html: emailHtml
      };

      await gmailTransporter.sendMail(mailOptions);
      console.log(`✅ Password reset email sent via Gmail SMTP to ${email}`);
      return true;
    }

    throw new Error('No email service configured');
  } catch (error) {
    console.error('❌ Password reset email send error:', error);
    throw new Error('Failed to send password reset email');
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

    const [existingRows] = await connection.query('SELECT * FROM users WHERE email = ?', [email]);
    
    if (existingRows.length > 0) {
      if (existingRows[0].email_verified) {
        await connection.rollback();
        return res.status(400).json({ message: 'Email already registered. Please log in instead.' });
      } else {
        await connection.query('DELETE FROM pending_requests WHERE user_id = ?', [existingRows[0].user_id]);
        await connection.query('DELETE FROM users WHERE user_id = ?', [existingRows[0].user_id]);
        console.log(`🗑️ Deleted unverified account for ${email}`);
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await connection.query(
      'INSERT INTO users (email, password_hash, first_name, last_name, email_verified, is_active, is_new_user) VALUES (?, ?, ?, ?, 0, 1, 1)',
      [email, passwordHash, firstName, lastName]
    );

    const userId = result.insertId;
    console.log(`✅ User created with ID: ${userId}`);

    const verificationCode = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await connection.query(
      'INSERT INTO pending_requests (user_id, request_type, request_data, status, created_at) VALUES (?, ?, ?, ?, ?)',
      [userId, 'email_verification', verificationCode, 'pending', expiresAt]
    );

    await sendVerificationEmail(email, verificationCode, firstName);

    await connection.commit();

    res.status(201).json({
      message: 'Registration successful! Please check your email for verification code.',
      userId: userId,
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
    if (users.length === 0)
      return res.status(401).json({ message: 'Invalid email or password' });

    const user = users[0];

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
  let { email, code } = req.body;
  
  // CRITICAL FIX: Trim whitespace from email and code (copy-paste from email can add spaces)
  email = email ? email.trim() : '';
  code = code ? code.trim() : '';
  
  console.log(`🔍 Verification attempt for email: "${email}", code: "${code}"`);
  console.log(`📏 Code length: ${code.length} characters`);

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

    console.log(`📊 Query result: ${userRows ? userRows.length : 0} user(s) found`);

    if (!userRows || userRows.length === 0) {
      await connection.rollback();
      console.log(`❌ User not found for email: ${email}`);
      return res.status(404).json({ message: 'Email not found. Please sign up again.' });
    }

    const userId = userRows[0].user_id;
    console.log(`✅ User found with ID: ${userId}`);

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

// ========================================
// 🔑 FORGOT PASSWORD - Request Reset
// ========================================
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  
  console.log('🔑 Password reset request for:', email);
  
  if (!email) {
    return res.status(400).json({ 
      success: false, 
      message: 'Email is required' 
    });
  }

  try {
    // Check if user exists
    const users = await pool.query(
      'SELECT user_id, email, first_name, google_id, password_hash FROM users WHERE email = ?',
      [email]
    );
    
    // Always return success to prevent email enumeration attacks
    // But only send email if user exists
    if (users.length === 0 || users[0].length === 0) {
      console.log('⚠️ Password reset requested for non-existent email:', email);
      return res.json({ 
        success: true, 
        message: 'If this email exists, a password reset link has been sent.' 
      });
    }

    const user = users[0][0] || users[0];
    
    // Check if user is Google-only (no password set)
    if (user.google_id && !user.password_hash) {
      console.log('⚠️ Password reset requested for Google-only account:', email);
      return res.status(400).json({
        success: false,
        message: 'This account uses Google Sign-In only. Please use "Continue with Google" to log in.',
        useGoogleLogin: true
      });
    }

    // Expire old password reset requests
    await pool.query(
      'UPDATE pending_requests SET status = ? WHERE user_id = ? AND request_type = ? AND status = ?',
      ['expired', user.user_id, 'password_reset', 'pending']
    );

    // Generate 6-digit reset code
    const resetCode = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Store reset request
    await pool.query(
      'INSERT INTO pending_requests (user_id, request_type, request_data, status, created_at) VALUES (?, ?, ?, ?, ?)',
      [user.user_id, 'password_reset', resetCode, 'pending', expiresAt]
    );

    // Send reset email
    await sendPasswordResetEmail(email, resetCode, user.first_name);

    console.log('✅ Password reset code sent to:', email);
    
    res.json({ 
      success: true, 
      message: 'Password reset code sent to your email. Please check your inbox.',
      email: email
    });
  } catch (error) {
    console.error('❌ Forgot password error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error. Please try again later.' 
    });
  }
});

// ========================================
// 🔑 RESET PASSWORD - Verify Code & Update Password
// ========================================
router.post('/reset-password', async (req, res) => {
  let { email, code, newPassword } = req.body;
  
  // Trim inputs
  email = email ? email.trim() : '';
  code = code ? code.trim() : '';
  
  console.log('🔑 Password reset attempt for:', email);

  if (!email || !code || !newPassword) {
    return res.status(400).json({ 
      success: false, 
      message: 'Email, code, and new password are required' 
    });
  }

  // Validate password strength
  if (newPassword.length < 8) {
    return res.status(400).json({
      success: false,
      message: 'Password must be at least 8 characters long'
    });
  }

  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasNumber = /\d/.test(newPassword);

  if (!hasUpper || !hasLower || !hasNumber) {
    return res.status(400).json({
      success: false,
      message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Get user
    const [userRows] = await connection.query(
      'SELECT user_id FROM users WHERE email = ?',
      [email]
    );

    if (!userRows || userRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    const userId = userRows[0].user_id;

    // Verify reset code
    const [requestRows] = await connection.query(
      `SELECT * FROM pending_requests 
       WHERE user_id = ? 
         AND request_data = ? 
         AND status = 'pending' 
         AND request_type = 'password_reset'
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId, code]
    );

    if (!requestRows || requestRows.length === 0) {
      await connection.rollback();
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid or expired reset code' 
      });
    }

    const request = requestRows[0];
    const requestTime = new Date(request.created_at);
    const minutesAgo = (Date.now() - requestTime.getTime()) / 60000;

    // Check if code expired (15 minutes)
    if (minutesAgo > 15) {
      await connection.rollback();
      return res.status(400).json({ 
        success: false, 
        message: 'Reset code has expired. Please request a new one.' 
      });
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await connection.query(
      'UPDATE users SET password_hash = ? WHERE user_id = ?',
      [passwordHash, userId]
    );

    // Mark reset request as completed
    await connection.query(
      'UPDATE pending_requests SET status = ? WHERE user_id = ? AND request_type = ? AND status = ?',
      ['completed', userId, 'password_reset', 'pending']
    );

    await connection.commit();

    console.log('✅ Password reset successful for user:', userId);

    res.json({
      success: true,
      message: 'Password reset successful! You can now log in with your new password.'
    });

  } catch (error) {
    if (connection) await connection.rollback();
    console.error('❌ Reset password error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error. Please try again later.' 
    });
  } finally {
    if (connection) connection.release();
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
         VALUES (?, ?, ?, ?, ?, 1, 1, 1)`,
        [email, googleId, given_name, family_name, picture]
      );

      const newUserId = result[0].insertId;

      await connection.query(
        'UPDATE users SET last_login = NOW(), last_activity = NOW() WHERE user_id = ?',
        [newUserId]
      );

      const token = jwt.sign({
        userId: newUserId,
        email: email,
        firstName: given_name,
        lastName: family_name,
        isAdmin: false
      }, JWT_SECRET, { expiresIn: '24h' });

      console.log(`Google signup successful: ${email}`);
      await connection.commit();
      return res.json({
        success: true,
        message: 'Google signup successful',
        token,
        user: {
          userId: newUserId,
          email: email,
          firstName: given_name,
          lastName: family_name,
          picture
        }
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