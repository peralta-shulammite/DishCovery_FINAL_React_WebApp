// FIXED auth.js (BACKEND) - FINAL VERSION WITH SENDGRID HTTP API
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import sgMail from '@sendgrid/mail';
import nodemailer from 'nodemailer';
import { pool } from '../db.js';
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
    // Handle mysql2 pool.query() which returns [rows, fields] format
    const result = await pool.query(`
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
    
    // Handle mysql2 pool.query() format: [rows, fields] or just rows
    let users;
    if (Array.isArray(result) && Array.isArray(result[0])) {
      users = result[0]; // [rows, fields] format
    } else if (Array.isArray(result)) {
      users = result; // Just rows format
    } else {
      users = [result]; // Single result
    }
    
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
    // ✅ Check environment: Use SendGrid in production (Vercel), SMTP in local development
    const isProduction = process.env.VERCEL || process.env.NODE_ENV === 'production';
    
    if (isProduction) {
      // Use SendGrid HTTP API in production (Vercel)
      if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM_EMAIL) {
        const msg = {
          to: email,
          from: {
            email: process.env.SENDGRID_FROM_EMAIL,
            name: 'DishCovery'
          },
          subject: 'Verify Your DishCovery Account',
          html: emailHtml,
          // Add SendGrid settings for better delivery
          mail_settings: {
            sandbox_mode: {
              enable: false // Disable sandbox mode for real emails
            }
          },
          // Add tracking settings
          tracking_settings: {
            click_tracking: {
              enable: false
            },
            open_tracking: {
              enable: false
            }
          }
        };

        try {
          // SendGrid send() returns [response, body] format
          const [response, body] = await sgMail.send(msg);
          console.log(`✅ [PRODUCTION] Verification email sent via SendGrid HTTP API to ${email}`);
          console.log(`📧 [SENDGRID] Response status: ${response?.statusCode || 'unknown'}`);
          console.log(`📧 [SENDGRID] Response statusText: ${response?.statusMessage || 'unknown'}`);
          console.log(`📧 [SENDGRID] Response headers:`, JSON.stringify(response?.headers || {}));
          if (body) {
            console.log(`📧 [SENDGRID] Response body:`, JSON.stringify(body));
          }
          
          // Check if SendGrid accepted the email
          if (response?.statusCode === 202) {
            console.log(`✅ [SENDGRID] Email accepted by SendGrid (202 Accepted)`);
          } else if (response?.statusCode >= 200 && response?.statusCode < 300) {
            console.log(`✅ [SENDGRID] Email sent successfully (${response.statusCode})`);
          } else {
            console.warn(`⚠️ [SENDGRID] Unexpected status code: ${response?.statusCode}`);
          }
          
          return true;
        } catch (sendGridError) {
          console.error('❌ [SENDGRID] Error sending email:', sendGridError);
          console.error('❌ [SENDGRID] Error message:', sendGridError.message);
          console.error('❌ [SENDGRID] Error code:', sendGridError.code);
          
          // SendGrid errors have a response property with details
          if (sendGridError.response) {
            console.error('❌ [SENDGRID] Error response status:', sendGridError.response.statusCode);
            console.error('❌ [SENDGRID] Error response body:', JSON.stringify(sendGridError.response.body, null, 2));
            console.error('❌ [SENDGRID] Error response headers:', JSON.stringify(sendGridError.response.headers, null, 2));
            
            // Check for common SendGrid errors
            if (sendGridError.response.body) {
              const errors = sendGridError.response.body.errors || [];
              errors.forEach((err, index) => {
                console.error(`❌ [SENDGRID] Error ${index + 1}:`, {
                  message: err.message,
                  field: err.field,
                  help: err.help
                });
              });
            }
          }
          
          throw sendGridError;
        }
      } else {
        throw new Error('SendGrid not configured in production environment');
      }
    } else {
      // Use Gmail SMTP in local development, fallback to SendGrid if SMTP fails
      if (gmailTransporter) {
        try {
          const mailOptions = {
            from: `"DishCovery" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Verify Your DishCovery Account',
            html: emailHtml
          };

          await gmailTransporter.sendMail(mailOptions);
          console.log(`✅ [LOCAL] Verification email sent via Gmail SMTP to ${email}`);
          return true;
        } catch (smtpError) {
          console.warn('⚠️ [LOCAL] Gmail SMTP failed, trying SendGrid fallback:', smtpError.message);
          // Fallback to SendGrid if SMTP fails
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
            console.log(`✅ [LOCAL] Verification email sent via SendGrid (SMTP fallback) to ${email}`);
            return true;
          } else {
            throw new Error(`Gmail SMTP failed and SendGrid not configured. SMTP error: ${smtpError.message}`);
          }
        }
      } else {
        // No SMTP configured, try SendGrid directly
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
          console.log(`✅ [LOCAL] Verification email sent via SendGrid (no SMTP configured) to ${email}`);
          return true;
        } else {
          throw new Error('Neither Gmail SMTP nor SendGrid is configured for local development');
        }
      }
    }
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
    // ✅ Check environment: Use SendGrid in production (Vercel), SMTP in local development
    const isProduction = process.env.VERCEL || process.env.NODE_ENV === 'production';
    
    if (isProduction) {
      // Use SendGrid HTTP API in production (Vercel)
      if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM_EMAIL) {
        const msg = {
          to: email,
          from: {
            email: process.env.SENDGRID_FROM_EMAIL,
            name: 'DishCovery'
          },
          subject: '🔑 Reset Your DishCovery Password',
          html: emailHtml,
          // Add SendGrid settings for better delivery
          mail_settings: {
            sandbox_mode: {
              enable: false // Disable sandbox mode for real emails
            }
          },
          // Add tracking settings
          tracking_settings: {
            click_tracking: {
              enable: false
            },
            open_tracking: {
              enable: false
            }
          }
        };

        try {
          // SendGrid send() returns [response, body] format
          const [response, body] = await sgMail.send(msg);
          console.log(`✅ [PRODUCTION] Password reset email sent via SendGrid HTTP API to ${email}`);
          console.log(`📧 [SENDGRID] Response status: ${response?.statusCode || 'unknown'}`);
          console.log(`📧 [SENDGRID] Response statusText: ${response?.statusMessage || 'unknown'}`);
          console.log(`📧 [SENDGRID] Response headers:`, JSON.stringify(response?.headers || {}));
          if (body) {
            console.log(`📧 [SENDGRID] Response body:`, JSON.stringify(body));
          }
          
          // Check if SendGrid accepted the email
          if (response?.statusCode === 202) {
            console.log(`✅ [SENDGRID] Email accepted by SendGrid (202 Accepted)`);
          } else if (response?.statusCode >= 200 && response?.statusCode < 300) {
            console.log(`✅ [SENDGRID] Email sent successfully (${response.statusCode})`);
          } else {
            console.warn(`⚠️ [SENDGRID] Unexpected status code: ${response?.statusCode}`);
          }
          
          return true;
        } catch (sendGridError) {
          console.error('❌ [SENDGRID] Error sending password reset email:', sendGridError);
          console.error('❌ [SENDGRID] Error message:', sendGridError.message);
          console.error('❌ [SENDGRID] Error code:', sendGridError.code);
          
          // SendGrid errors have a response property with details
          if (sendGridError.response) {
            console.error('❌ [SENDGRID] Error response status:', sendGridError.response.statusCode);
            console.error('❌ [SENDGRID] Error response body:', JSON.stringify(sendGridError.response.body, null, 2));
            console.error('❌ [SENDGRID] Error response headers:', JSON.stringify(sendGridError.response.headers, null, 2));
            
            // Check for common SendGrid errors
            if (sendGridError.response.body) {
              const errors = sendGridError.response.body.errors || [];
              errors.forEach((err, index) => {
                console.error(`❌ [SENDGRID] Error ${index + 1}:`, {
                  message: err.message,
                  field: err.field,
                  help: err.help
                });
              });
            }
          }
          
          throw sendGridError;
        }
      } else {
        throw new Error('SendGrid not configured in production environment');
      }
    } else {
      // Use Gmail SMTP in local development, fallback to SendGrid if SMTP fails
      if (gmailTransporter) {
        try {
          const mailOptions = {
            from: `"DishCovery" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: '🔑 Reset Your DishCovery Password',
            html: emailHtml
          };

          await gmailTransporter.sendMail(mailOptions);
          console.log(`✅ [LOCAL] Password reset email sent via Gmail SMTP to ${email}`);
          return true;
        } catch (smtpError) {
          console.warn('⚠️ [LOCAL] Gmail SMTP failed, trying SendGrid fallback:', smtpError.message);
          // Fallback to SendGrid if SMTP fails
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
            console.log(`✅ [LOCAL] Password reset email sent via SendGrid (SMTP fallback) to ${email}`);
            return true;
          } else {
            throw new Error(`Gmail SMTP failed and SendGrid not configured. SMTP error: ${smtpError.message}`);
          }
        }
      } else {
        // No SMTP configured, try SendGrid directly
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
          console.log(`✅ [LOCAL] Password reset email sent via SendGrid (no SMTP configured) to ${email}`);
          return true;
        } else {
          throw new Error('Neither Gmail SMTP nor SendGrid is configured for local development');
        }
      }
    }
  } catch (error) {
    console.error('❌ Password reset email send error:', error);
    throw new Error('Failed to send password reset email');
  }
};

// REGISTER
router.post('/register', async (req, res) => {
  let { firstName, lastName, email, password } = req.body;

  // Normalize email: trim whitespace and convert to lowercase for consistency
  email = email ? email.trim().toLowerCase() : '';

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

    const [existingRows] = await connection.query('SELECT * FROM users WHERE LOWER(TRIM(email)) = ?', [email]);
    
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
    // CRITICAL FIX: created_at should be NOW(), not expiresAt
    // Expiration is calculated from created_at + 10 minutes
    const createdAt = new Date(); // Current time

    await connection.query(
      'INSERT INTO pending_requests (user_id, request_type, request_data, status, created_at) VALUES (?, ?, ?, ?, ?)',
      [userId, 'email_verification', verificationCode, 'pending', createdAt]
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
  let { email, password } = req.body;

  // Normalize email: trim whitespace and convert to lowercase for consistency
  email = email ? email.trim().toLowerCase() : '';

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    // Handle mysql2 pool.query() which returns [rows, fields] format
    const usersResult = await pool.query('SELECT * FROM users WHERE LOWER(TRIM(email)) = ?', [email]);
    const users = Array.isArray(usersResult) && Array.isArray(usersResult[0]) 
      ? usersResult[0] 
      : (Array.isArray(usersResult) ? usersResult : []);
    
    if (users.length === 0) {
      console.log(`❌ Login attempt failed: User not found for email: ${email}`);
      return res.status(401).json({ 
        message: 'Invalid email or password',
        hint: 'If you haven\'t registered yet, please sign up first. If you registered with Google, use "Continue with Google" to log in.'
      });
    }

    const user = users[0];

    // ✅ FLEXIBLE LOGIN: Allow password login if password_hash exists
    // If user has no password_hash, provide helpful message instead of blocking
    if (!user.password_hash || user.password_hash === null) {
      // User has Google account but no password set
      return res.status(400).json({
        message: 'No password set for this account. Use "Continue with Google" to log in, or create a password via "Forgot Password".',
        useGoogleLogin: true,
        noPasswordSet: true,
        canCreatePassword: true
      });
    }

    // User has password_hash - proceed with password verification
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

    // Check if user has completed onboarding (has dietary preferences)
    const [restrictionsResult] = await pool.query(
      'SELECT COUNT(*) as count FROM user_restrictions WHERE user_id = ? AND member_id IS NULL',
      [user.user_id]
    );
    const hasCompletedOnboarding = restrictionsResult[0]?.count > 0 || user.is_new_user === 0;

    res.json({
      success: true,
      token,
      user: {
        userId: user.user_id,
        id: user.user_id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        isNewUser: user.is_new_user === 1,
        hasCompletedOnboarding: hasCompletedOnboarding
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
    const currentTime = new Date();
    const minutesAgo = (currentTime.getTime() - requestTime.getTime()) / 60000;

    // CRITICAL FIX: Check if code expired (10 minutes from creation)
    if (minutesAgo > 10 || minutesAgo < 0) {
      await connection.rollback();
      return res.status(400).json({ message: 'Verification code expired. Please request a new one.' });
    }

    // Mark as verified
    await connection.query('UPDATE users SET email_verified = 1 WHERE user_id = ?', [userId]);
    await connection.query(
      'UPDATE pending_requests SET status = ? WHERE request_id = ?',
      ['completed', request.request_id]
    );

    // FIX 3: Correct destructuring - Include google_id and password_hash for flexible login
    const [fullUserRows] = await connection.query(
      'SELECT user_id, email, first_name, last_name, is_new_user, google_id, password_hash FROM users WHERE user_id = ?',
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

    // Check if user has completed onboarding (has dietary preferences)
    const [restrictionsResult] = await connection.query(
      'SELECT COUNT(*) as count FROM user_restrictions WHERE user_id = ? AND member_id IS NULL',
      [userId]
    );
    const hasCompletedOnboarding = restrictionsResult[0]?.count > 0 || user.is_new_user === 0;

    // ✅ FLEXIBLE LOGIN: Check if this is a Google signup (has google_id but no password)
    const isGoogleSignup = !!user.google_id && !user.password_hash;
    const hasPassword = !!user.password_hash;

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
        lastName: user.last_name,
        isNewUser: user.is_new_user === 1,
        hasCompletedOnboarding: hasCompletedOnboarding,
        hasPassword: hasPassword,
        showPasswordPrompt: isGoogleSignup // ✅ Option 1: Show password prompt after Google signup verification
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
  let { email } = req.body;
  
  // Trim whitespace from email
  email = email ? email.trim().toLowerCase() : '';
  
  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Handle mysql2 pool.query() which returns [rows, fields] format
    const result = await connection.query(
      'SELECT user_id, email, first_name, email_verified FROM users WHERE LOWER(TRIM(email)) = ?',
      [email]
    );

    // Extract rows from result (mysql2 returns [rows, fields])
    let userRows;
    if (Array.isArray(result) && Array.isArray(result[0])) {
      userRows = result[0]; // [rows, fields] format
    } else if (Array.isArray(result)) {
      userRows = result; // Just rows format
    } else {
      userRows = [];
    }

    if (!userRows || userRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'User not found' });
    }

    const user = userRows[0];
    
    // Check if email is already verified
    if (user.email_verified === 1) {
      await connection.rollback();
      return res.status(400).json({ message: 'Email already verified' });
    }

    // Mark existing pending verification requests as expired
    await connection.query(
      'UPDATE pending_requests SET status = ? WHERE user_id = ? AND request_type = ? AND status = ?',
      ['expired', user.user_id, 'email_verification', 'pending']
    );

    // Generate new verification code
    const verificationCode = generateVerificationCode();
    // CRITICAL FIX: created_at should be NOW(), not expiresAt
    // Expiration is calculated from created_at + 10 minutes
    const createdAt = new Date(); // Current time

    // Insert new verification code
    await connection.query(
      'INSERT INTO pending_requests (user_id, request_type, request_data, status, created_at) VALUES (?, ?, ?, ?, ?)',
      [user.user_id, 'email_verification', verificationCode, 'pending', createdAt]
    );

    await connection.commit();

    // Send verification email
    await sendVerificationEmail(email, verificationCode, user.first_name || '');

    console.log(`✅ [RESEND VERIFICATION] Code resent to ${email}`);

    res.json({ 
      success: true, 
      message: 'Verification code resent successfully!' 
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('❌ [RESEND VERIFICATION] Error:', error);
    res.status(500).json({ 
      message: 'Failed to resend code', 
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// ========================================
// 🔍 CHECK EMAIL ACCOUNT TYPE - Determine if email is user or admin
// ========================================
router.post('/check-email-type', async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ 
      success: false, 
      message: 'Email is required' 
    });
  }

  try {
    const normalizedEmail = email.trim().toLowerCase();
    
    // Check if email exists in admin_users table
    const adminResult = await pool.query(
      'SELECT admin_id, email FROM admin_users WHERE LOWER(TRIM(email)) = ? AND (is_active = 1 OR is_active IS NULL) LIMIT 1',
      [normalizedEmail]
    );
    
    let adminRows;
    if (Array.isArray(adminResult) && Array.isArray(adminResult[0])) {
      adminRows = adminResult[0];
    } else if (Array.isArray(adminResult)) {
      adminRows = adminResult;
    } else {
      adminRows = [];
    }
    
    if (adminRows && adminRows.length > 0) {
      return res.json({
        success: true,
        accountType: 'admin',
        adminId: adminRows[0].admin_id,
        email: normalizedEmail
      });
    }
    
    // Check if email exists in users table
    const userResult = await pool.query(
      'SELECT user_id, email FROM users WHERE LOWER(TRIM(email)) = ? LIMIT 1',
      [normalizedEmail]
    );
    
    let userRows;
    if (Array.isArray(userResult) && Array.isArray(userResult[0])) {
      userRows = userResult[0];
    } else if (Array.isArray(userResult)) {
      userRows = userResult;
    } else {
      userRows = [];
    }
    
    if (userRows && userRows.length > 0) {
      return res.json({
        success: true,
        accountType: 'user',
        userId: userRows[0].user_id,
        email: normalizedEmail
      });
    }
    
    // Email not found in either table
    return res.json({
      success: true,
      accountType: 'none',
      email: normalizedEmail
    });
    
  } catch (error) {
    console.error('❌ Check email type error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error. Please try again later.' 
    });
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
      'SELECT user_id, email, first_name, google_id, password_hash FROM users WHERE LOWER(TRIM(email)) = ?',
      [email.trim().toLowerCase()]
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
    
    // ✅ FLEXIBLE LOGIN: Allow Google users to create password via reset flow
    // If user has Google account but no password, treat as "create password" flow
    const isGoogleUserWithoutPassword = user.google_id && !user.password_hash;
    
    if (isGoogleUserWithoutPassword) {
      console.log('✅ Password creation requested for Google account:', email);
      // Continue with password creation flow (same as reset flow)
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
      [user.user_id, 'password_reset', resetCode, 'pending', new Date()]
    );

    // Send reset email (or password creation email for Google users)
    await sendPasswordResetEmail(email, resetCode, user.first_name);

    console.log(`✅ Password ${isGoogleUserWithoutPassword ? 'creation' : 'reset'} code sent to:`, email);
    
    res.json({ 
      success: true, 
      message: isGoogleUserWithoutPassword 
        ? 'Password creation code sent to your email. Please check your inbox.'
        : 'Password reset code sent to your email. Please check your inbox.',
      email: email,
      isPasswordCreation: isGoogleUserWithoutPassword
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

    // Get user - use LOWER(TRIM(email)) for consistency with login
    const [userRows] = await connection.query(
      'SELECT user_id FROM users WHERE LOWER(TRIM(email)) = ?',
      [email.trim().toLowerCase()]
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

    // ✅ FLEXIBLE LOGIN: Check if this is password creation (no existing password) or reset (has password)
    const [userCheckRows] = await connection.query(
      'SELECT google_id, password_hash FROM users WHERE user_id = ?',
      [userId]
    );
    const userCheck = userCheckRows[0];
    const isPasswordCreation = !userCheck.password_hash && userCheck.google_id;
    const isPasswordReset = !!userCheck.password_hash;

    // Update password (works for both creation and reset)
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

    console.log(`✅ Password ${isPasswordCreation ? 'created' : 'reset'} successful for user:`, userId);

    res.json({
      success: true,
      message: isPasswordCreation
        ? 'Password created successfully! You can now log in with email and password or continue using Google.'
        : 'Password reset successful! You can now log in with your new password.',
      isPasswordCreation: isPasswordCreation
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

      // Check if user has completed onboarding (has dietary preferences)
      const [restrictionsResult] = await connection.query(
        'SELECT COUNT(*) as count FROM user_restrictions WHERE user_id = ? AND member_id IS NULL',
        [existingUser.user_id]
      );
      const hasCompletedOnboarding = restrictionsResult[0]?.count > 0 || existingUser.is_new_user === 0;

      const token = jwt.sign({
        userId: existingUser.user_id,
        email: existingUser.email,
        firstName: existingUser.first_name || given_name,
        lastName: existingUser.last_name || family_name,
        isAdmin: false
      }, JWT_SECRET, { expiresIn: '24h' });

      // ✅ VALIDATE TOKEN BEFORE SENDING
      if (!token || typeof token !== 'string' || token.length < 20) {
        console.error('❌ [GOOGLE AUTH] Invalid token generated:', {
          hasToken: !!token,
          tokenType: typeof token,
          tokenLength: token?.length
        });
        await connection.rollback();
        return res.status(500).json({
          success: false,
          message: 'Token generation failed. Please try again.'
        });
      }

      // ✅ VALIDATE JWT FORMAT
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) {
        console.error('❌ [GOOGLE AUTH] Invalid JWT format:', {
          parts: tokenParts.length,
          tokenLength: token.length
        });
        await connection.rollback();
        return res.status(500).json({
          success: false,
          message: 'Token format error. Please try again.'
        });
      }

      console.log(`✅ Google login successful: ${email}`);
      console.log(`✅ Token generated:`, {
        length: token.length,
        format: 'JWT',
        parts: tokenParts.length
      });
      await connection.commit();
      // ✅ FLEXIBLE LOGIN: Add password status for frontend prompts
      const hasPassword = !!existingUser.password_hash;
      const isFirstLogin = !existingUser.last_login || existingUser.last_login === null;
      
      return res.json({
        success: true,
        message: 'Google login successful',
        token,
        user: {
          userId: existingUser.user_id,
          email: existingUser.email,
          firstName: existingUser.first_name || given_name,
          lastName: existingUser.last_name || family_name,
          picture,
          isNewUser: existingUser.is_new_user === 1,
          hasCompletedOnboarding: hasCompletedOnboarding,
          hasPassword: hasPassword,
          showPasswordReminder: !hasPassword && isFirstLogin // Option 2: Show reminder after first login
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

      // Create user with email_verified = 0 (requires verification)
      const result = await connection.query(
        `INSERT INTO users (email, google_id, first_name, last_name, profile_picture_url, email_verified, is_active, is_new_user)
         VALUES (?, ?, ?, ?, ?, 0, 1, 1)`,
        [email, googleId, given_name, family_name, picture]
      );

      const newUserId = result[0].insertId;

      // Generate verification code
      const verificationCode = generateVerificationCode();
      // CRITICAL FIX: created_at should be NOW(), not expiresAt
      // Expiration is calculated from created_at + 10 minutes
      const createdAt = new Date(); // Current time

      // Store verification code in pending_requests
      await connection.query(
        'INSERT INTO pending_requests (user_id, request_type, request_data, status, created_at) VALUES (?, ?, ?, ?, ?)',
        [newUserId, 'email_verification', verificationCode, 'pending', createdAt]
      );

      // Send verification email (don't fail if email fails - user is still created)
      try {
        await sendVerificationEmail(email, verificationCode, given_name);
        console.log(`✅ [PRODUCTION] Google signup - verification email sent via SendGrid to ${email}`);
      } catch (emailError) {
        console.error('❌ [GOOGLE SIGNUP] Failed to send verification email:', emailError);
        // Don't fail the signup if email fails - user is still created, they can resend
        console.warn('⚠️ [GOOGLE SIGNUP] User created but email failed. Code:', verificationCode);
      }

      await connection.commit();

      console.log(`📧 Google signup - verification code sent to ${email}`);
      return res.status(403).json({
        success: false,
        message: 'Please verify your email. A verification code has been sent.',
        requiresVerification: true,
        email: email,
        showPasswordPrompt: true // ✅ Option 1: Flag to show password prompt after verification
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