// routes/adminAuth.js (secure, bcrypt-only)
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../db.js';
import sgMail from '@sendgrid/mail';
import nodemailer from 'nodemailer';

const router = express.Router();

// --- Security: require a strong secret at boot ---
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 12) {
  throw new Error(
    'JWT_SECRET is missing or too short. Set a strong JWT_SECRET (>=12 chars) in your environment.'
  );
}

// Middleware to authenticate admin token
const authenticateAdminToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    
    if (!token) {
      return res.status(401).json({ success: false, message: 'Admin token required' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    if (!decoded?.isAdmin) {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    req.admin = decoded;
    next();
  } catch (err) {
    console.error('Admin token verification error:', err);
    return res.status(403).json({ success: false, message: 'Invalid or expired admin token' });
  }
};

// POST /api/admin-auth/login
router.post('/login', async (req, res) => {
  try {
    let { email, password } = req.body || {};
    
    // Normalize email: trim whitespace and convert to lowercase for consistency
    email = email ? email.trim().toLowerCase() : '';
    
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    // Find active admin
    const adminQuery = `
      SELECT 
        admin_id,
        username,
        email,
        password_hash,
        first_name,
        last_name,
        role,
        is_active
      FROM admin_users
      WHERE LOWER(TRIM(email)) = ? AND (is_active = 1 OR is_active IS NULL)
      LIMIT 1
    `;
    
    // Debug: Log the query execution
    console.log('🔍 [ADMIN AUTH] Executing admin query for email:', email);
    
    // Handle mysql2 pool.query() which returns [rows, fields] format
    let rows;
    try {
      const result = await pool.query(adminQuery, [email]);
      
      // mysql2 pool.query() returns [rows, fields] - extract rows
      rows = Array.isArray(result) && Array.isArray(result[0]) ? result[0] : (Array.isArray(result) ? result : []);
      
      console.log(`✅ [ADMIN AUTH] Query executed, found ${rows.length} row(s)`);
    } catch (queryError) {
      console.error('❌ [ADMIN AUTH] Error executing admin query:', queryError);
      throw queryError;
    }

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      console.log('❌ [ADMIN AUTH] No admin found for email:', email);
      return res.status(401).json({ success: false, message: 'Invalid admin credentials' });
    }

    const admin = rows[0];
    console.log('👤 Admin found:', { 
      admin_id: admin?.admin_id, 
      email: admin?.email,
      has_password_hash: !!admin?.password_hash,
      password_hash_type: admin?.password_hash ? typeof admin.password_hash : 'undefined'
    });

    if (!admin) {
      console.error('❌ Admin object is undefined despite rows.length > 0');
      return res.status(500).json({ success: false, message: 'Database query error' });
    }

    // Enforce bcrypt-only
    if (!admin.password_hash || !(admin.password_hash.startsWith('$2a$') || admin.password_hash.startsWith('$2b$'))) {
      console.error(
        `[ADMIN AUTH] Non-bcrypt password detected for admin_id=${admin.admin_id} (${admin.email}). ` +
        'Update admin_users.password_hash with a bcrypt hash, e.g.: ' +
        'UPDATE admin_users SET password_hash = "<bcrypt-hash>" WHERE email = "<email>";'
      );
      return res.status(500).json({
        success: false,
        message: 'Admin account not configured securely. Please contact support.',
      });
    }

    // Validate password using bcrypt
    const ok = await bcrypt.compare(password, admin.password_hash);
    if (!ok) {
      console.log('❌ Password validation failed for admin:', admin.email);
      return res.status(401).json({ success: false, message: 'Invalid admin credentials' });
    }

    // Build token payload
    const payload = {
      adminId: admin.admin_id,
      userId: admin.admin_id, // compatibility with middleware expecting userId
      email: admin.email,
      username: admin.username,
      firstName: admin.first_name,
      lastName: admin.last_name,
      role: admin.role || 'admin',
      isAdmin: true,
    };

    // Create JWT
    const token = jwt.sign(payload, JWT_SECRET, {
      expiresIn: '24h',
      issuer: 'dishcovery-admin',
      audience: 'dishcovery-admin-users',
    });

    // Update last_login
    await pool.query('UPDATE admin_users SET last_login = NOW() WHERE admin_id = ?', [admin.admin_id]);

    console.log('✅ Admin login successful for:', admin.email);
    return res.json({
      success: true,
      message: 'Admin login successful',
      token,
      isAdmin: true,
      user: {
        adminId: admin.admin_id,
        email: admin.email,
        username: admin.username,
        firstName: admin.first_name || admin.username,
        lastName: admin.last_name || '',
        role: admin.role || 'admin',
      },
      admin: {
        adminId: admin.admin_id,
        email: admin.email,
        username: admin.username,
        firstName: admin.first_name || admin.username,
        lastName: admin.last_name || '',
        role: admin.role || 'admin',
      },
    });
  } catch (err) {
    console.error('❌ Admin login error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during admin login',
    });
  }
});

// GET /api/admin-auth/profile
router.get('/profile', async (req, res) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      return res.status(401).json({ success: false, message: 'Admin token required' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded?.isAdmin) {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const q = `
      SELECT 
        admin_id,
        username,
        email,
        first_name,
        last_name,
        role,
        created_at,
        last_login
      FROM admin_users
      WHERE admin_id = ? AND (is_active = 1 OR is_active IS NULL)
      LIMIT 1
    `;
    
    const result = await pool.query(q, [decoded.adminId]);
    
    // Handle different MySQL driver result formats (same as login)
    let rows;
    if (Array.isArray(result) && result.length >= 1) {
      // Most common: [rows, fields] format
      if (Array.isArray(result[0])) {
        rows = result[0];
      } else {
        // Sometimes the result structure is [{ '0': actualRowsArray }]
        const firstElement = result[0];
        if (firstElement && typeof firstElement === 'object' && firstElement['0']) {
          rows = firstElement['0'];
        } else {
          rows = result[0];
        }
      }
    } else if (result && result.rows) {
      // Some drivers return { rows, fields }
      rows = result.rows;
    } else {
      // Direct rows array
      rows = result;
    }

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    const admin = rows[0];
    return res.json({
      success: true,
      admin: {
        adminId: admin.admin_id,
        email: admin.email,
        username: admin.username,
        firstName: admin.first_name || admin.username,
        lastName: admin.last_name || '',
        role: admin.role || 'admin',
        createdAt: admin.created_at,
        lastLogin: admin.last_login,
      },
    });
  } catch (err) {
    console.error('❌ Admin profile error:', err);
    return res.status(500).json({ success: false, message: 'Failed to get admin profile' });
  }
});

// ========================================
// ✅ NEW: ADMIN LOGOUT ENDPOINT
// ========================================
router.post('/logout', authenticateAdminToken, async (req, res) => {
  try {
    const adminId = req.admin.adminId;
    const email = req.admin.email;
    
    console.log('🚪 Admin logout initiated:', { adminId, email });
    
    // Optional: Update last activity in database
    await pool.query(
      'UPDATE admin_users SET last_login = NOW() WHERE admin_id = ?', 
      [adminId]
    );
    
    console.log('✅ Admin logout successful:', email);
    
    res.status(200).json({ 
      success: true, 
      message: 'Admin logout successful' 
    });
  } catch (error) {
    console.error('❌ Admin logout error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Admin logout failed',
      error: error.message 
    });
  }
});

// ========================================
// ✅ NEW: ADMIN CREATION ENDPOINT
// ========================================
// Configure SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  console.log('✅ SendGrid HTTP API configured for admin creation');
}

// Gmail SMTP fallback (for local development only)
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

// Generate verification code (6-digit)
const generateVerificationCode = () => Math.floor(100000 + Math.random() * 900000).toString();

// Send admin verification email with verification code
const sendAdminVerificationEmail = async (email, firstName = '', lastName = '', verificationCode) => {
  const fullName = `${firstName} ${lastName}`.trim() || 'Admin';
  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; color: #333;">
      <div style="max-width:600px;margin:0 auto;padding:20px;">
        <h2 style="background:#2E7D32;color:white;padding:15px;border-radius:10px 10px 0 0;text-align:center;">
          🎉 Welcome to DishCovery Admin Panel!
        </h2>
        <div style="background:#f9f9f9;padding:20px;border-radius:0 0 10px 10px;">
          <p>Hi ${fullName},</p>
          <p><strong>Congratulations! You have been appointed as an Administrator of DishCovery!</strong></p>
          <p>Your admin account has been created successfully. Please verify your email using the verification code below:</p>
          <div style="background:white;border:2px dashed #2E7D32;padding:20px;text-align:center;border-radius:8px;margin:20px 0;">
            <p style="margin:0 0 10px 0;color:#666;font-size:14px;">Your Verification Code:</p>
            <div style="font-size:32px;font-weight:bold;color:#2E7D32;letter-spacing:4px;">
              ${verificationCode}
            </div>
            <p style="margin:10px 0 0 0;color:#666;font-size:12px;">This code will expire in 10 minutes.</p>
          </div>
          <p><strong>Important:</strong></p>
          <ul style="margin:10px 0;padding-left:20px;">
            <li>You are now an Administrator of DishCovery</li>
            <li>Use the verification code above to verify your email address</li>
            <li>After verification, you can access the admin panel at: <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin/login">Admin Login</a></li>
            <li>Please change your password after your first login for security</li>
          </ul>
          <p style="font-size:12px;color:#888;margin-top:30px;padding-top:20px;border-top:1px solid #ddd;">
            If you didn't request this account, please contact the system administrator immediately.
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
            name: 'DishCovery Admin'
          },
          subject: '🎉 Welcome to DishCovery Admin Panel - Verification Code',
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
          console.log(`✅ [PRODUCTION] Admin verification email sent via SendGrid HTTP API to ${email}`);
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
          console.error('❌ [SENDGRID] Error sending admin verification email:', sendGridError);
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
            from: `"DishCovery Admin" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: '🎉 Welcome to DishCovery Admin Panel - Verification Code',
            html: emailHtml
          };

          await gmailTransporter.sendMail(mailOptions);
          console.log(`✅ [LOCAL] Admin verification email sent via Gmail SMTP to ${email}`);
          return true;
        } catch (smtpError) {
          console.warn('⚠️ [LOCAL] Gmail SMTP failed, trying SendGrid fallback:', smtpError.message);
          // Fallback to SendGrid if SMTP fails
          if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM_EMAIL) {
            const msg = {
              to: email,
              from: {
                email: process.env.SENDGRID_FROM_EMAIL,
                name: 'DishCovery Admin'
              },
              subject: '🎉 Welcome to DishCovery Admin Panel - Verification Code',
              html: emailHtml
            };
            await sgMail.send(msg);
            console.log(`✅ [LOCAL] Admin verification email sent via SendGrid (SMTP fallback) to ${email}`);
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
              name: 'DishCovery Admin'
            },
            subject: '🎉 Welcome to DishCovery Admin Panel - Verification Code',
            html: emailHtml
          };
          await sgMail.send(msg);
          console.log(`✅ [LOCAL] Admin verification email sent via SendGrid (no SMTP configured) to ${email}`);
          return true;
        } else {
          throw new Error('Neither Gmail SMTP nor SendGrid is configured for local development');
        }
      }
    }
  } catch (error) {
    console.error('❌ Admin verification email send error:', error);
    throw new Error('Failed to send admin verification email');
  }
};

// POST /api/admin-auth/create - Create new admin (requires admin authentication)
router.post('/create', authenticateAdminToken, async (req, res) => {
  let connection;
  try {
    const { firstName, lastName, email, password } = req.body;

    // Validate input
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required: firstName, lastName, email, password'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long'
      });
    }

    // Normalize email
    const normalizedEmail = email.trim().toLowerCase();

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Check if admin with this email already exists
    const [existingAdmins] = await connection.query(
      'SELECT admin_id, email FROM admin_users WHERE LOWER(TRIM(email)) = ?',
      [normalizedEmail]
    );

    if (existingAdmins && existingAdmins.length > 0) {
      await connection.rollback();
      return res.status(409).json({
        success: false,
        message: 'An admin with this email already exists'
      });
    }

    // Generate username from email (before @)
    const username = normalizedEmail.split('@')[0];

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Insert new admin (admin_id is auto-increment, so it will be assigned automatically)
    // Set default role to 'Admin' if role column exists, otherwise omit it
    const [result] = await connection.query(
      `INSERT INTO admin_users (
        username, email, password_hash, first_name, last_name, is_active, created_at
      ) VALUES (?, ?, ?, ?, ?, 1, NOW())`,
      [username, normalizedEmail, passwordHash, firstName, lastName]
    );

    const adminId = result.insertId;

    if (!adminId) {
      await connection.rollback();
      throw new Error('Failed to create admin - no admin_id returned');
    }

    console.log(`✅ Admin created with ID: ${adminId}, email: ${normalizedEmail}`);

    // Generate verification code
    const verificationCode = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store verification code in pending_requests table (similar to user registration)
    try {
      await connection.query(
        'INSERT INTO pending_requests (user_id, request_type, request_data, status, created_at) VALUES (?, ?, ?, ?, ?)',
        [adminId, 'admin_email_verification', verificationCode, 'pending', expiresAt]
      );
      console.log(`✅ Verification code stored for admin ${adminId}`);
    } catch (verificationError) {
      // If pending_requests table doesn't exist or has issues, log but don't fail
      console.warn('⚠️ Could not store verification code in pending_requests:', verificationError.message);
      // Continue - we'll still send the email
    }

    // Commit transaction
    await connection.commit();

    // Send verification email with code (don't fail if email fails)
    try {
      await sendAdminVerificationEmail(normalizedEmail, firstName, lastName, verificationCode);
    } catch (emailError) {
      console.error('⚠️ Failed to send admin verification email:', emailError);
      // Don't fail the request if email fails - admin is still created
    }

    // Return success with admin_id
    res.status(201).json({
      success: true,
      message: 'Admin created successfully. Verification email with code sent.',
      admin: {
        adminId: adminId,
        email: normalizedEmail,
        username: username,
        firstName: firstName,
        lastName: lastName,
        status: 'Active'
      }
    });

  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('❌ Admin creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create admin',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// GET /api/admin-auth/list - Get all admins (requires admin authentication)
router.get('/list', authenticateAdminToken, async (req, res) => {
  try {
    const query = `
      SELECT 
        admin_id,
        username,
        email,
        password_hash,
        first_name,
        last_name,
        role,
        permissions,
        is_active,
        created_at,
        last_login
      FROM admin_users
      ORDER BY created_at DESC
    `;

    // Handle mysql2 pool.query() which returns [rows, fields] format
    let rows;
    try {
      const result = await pool.query(query);
      
      // mysql2 pool.query() returns [rows, fields] - extract rows
      if (Array.isArray(result) && Array.isArray(result[0])) {
        rows = result[0]; // [rows, fields] format
      } else if (Array.isArray(result)) {
        rows = result; // Just rows format
      } else {
        rows = []; // Fallback
      }
      
      console.log(`✅ [ADMIN LIST] Query executed, found ${rows.length} row(s)`);
    } catch (queryError) {
      console.error('❌ [ADMIN LIST] Error executing query:', queryError);
      throw queryError;
    }

    if (!rows || !Array.isArray(rows)) {
      console.error('❌ [ADMIN LIST] Invalid query result format');
      rows = [];
    }

    // Format admins for frontend
    const admins = rows.map(admin => {
      // Calculate status based on is_active and last_login
      let status = 'Active';
      if (admin.is_active === 0) {
        status = 'Inactive';
      } else if (admin.last_login) {
        const lastLogin = new Date(admin.last_login);
        const daysSinceLogin = (Date.now() - lastLogin.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceLogin > 30) {
          status = 'Inactive';
        }
      }

      // Format last active
      let lastActive = 'Never';
      if (admin.last_login) {
        const lastLogin = new Date(admin.last_login);
        const now = new Date();
        const diffMs = now - lastLogin;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 60) {
          lastActive = diffMins <= 1 ? 'Just now' : `${diffMins} minutes ago`;
        } else if (diffHours < 24) {
          lastActive = diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
        } else if (diffDays < 7) {
          lastActive = diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
        } else if (diffDays < 30) {
          const weeks = Math.floor(diffDays / 7);
          lastActive = weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
        } else {
          const months = Math.floor(diffDays / 30);
          lastActive = months === 1 ? '1 month ago' : `${months} months ago`;
        }
      }

      // Format created date
      const createdDate = new Date(admin.created_at);
      const createdDateText = createdDate.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });

      // Format last login
      let lastLogin = 'Never';
      if (admin.last_login) {
        const lastLoginDate = new Date(admin.last_login);
        lastLogin = lastLoginDate.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric', 
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit'
        });
      }

      return {
        id: admin.admin_id,
        name: `${admin.first_name || ''} ${admin.last_name || ''}`.trim() || admin.username,
        email: admin.email,
        username: admin.username,
        status: status,
        lastActive: lastActive,
        avatar: null,
        createdDate: createdDateText,
        lastLogin: lastLogin,
        isActive: admin.is_active === 1,
        activityLogs: []
      };
    });

    console.log(`✅ [ADMIN LIST] Fetched ${admins.length} admin(s)`);

    res.json({
      success: true,
      admins: admins
    });

  } catch (error) {
    console.error('❌ [ADMIN LIST] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch admins',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// POST /api/admin-auth/verify - Verify admin email with verification code
router.post('/verify', async (req, res) => {
  let connection;
  try {
    const { email, code } = req.body;

    // Trim whitespace from email and code
    const normalizedEmail = email ? email.trim().toLowerCase() : '';
    const trimmedCode = code ? code.trim() : '';

    console.log(`🔍 [ADMIN VERIFY] Verification attempt for email: "${normalizedEmail}", code: "${trimmedCode}"`);

    if (!normalizedEmail || !trimmedCode) {
      return res.status(400).json({
        success: false,
        message: 'Email and verification code are required'
      });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Find admin by email
    const [adminRows] = await connection.query(
      'SELECT admin_id, email, first_name, last_name FROM admin_users WHERE LOWER(TRIM(email)) = ?',
      [normalizedEmail]
    );

    if (!adminRows || adminRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'Admin account not found. Please contact the administrator.'
      });
    }

    const admin = adminRows[0];
    const adminId = admin.admin_id;

    console.log(`✅ [ADMIN VERIFY] Admin found with ID: ${adminId}`);

    // Find verification code in pending_requests
    const [requestRows] = await connection.query(
      `SELECT * FROM pending_requests 
       WHERE user_id = ? 
         AND request_data = ? 
         AND status = 'pending' 
         AND request_type = 'admin_email_verification'`,
      [adminId, trimmedCode]
    );

    if (!requestRows || requestRows.length === 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code'
      });
    }

    const request = requestRows[0];
    const requestTime = new Date(request.created_at);
    const minutesAgo = (Date.now() - requestTime.getTime()) / 60000;

    // Check if code expired (10 minutes)
    if (minutesAgo > 10) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Verification code has expired. Please request a new one.'
      });
    }

    // Mark verification request as completed
    await connection.query(
      'UPDATE pending_requests SET status = ? WHERE user_id = ? AND request_type = ? AND request_data = ?',
      ['completed', adminId, 'admin_email_verification', trimmedCode]
    );

    // Note: email_verified column doesn't exist in admin_users table
    // Verification status is tracked via pending_requests table (status = 'completed')
    console.log(`✅ [ADMIN VERIFY] Admin ${adminId} verification marked as completed`);

    await connection.commit();

    console.log(`✅ [ADMIN VERIFY] Admin ${adminId} verified successfully`);

    res.json({
      success: true,
      message: 'Admin email verified successfully! You can now access the admin panel.',
      admin: {
        adminId: adminId,
        email: admin.email,
        firstName: admin.first_name,
        lastName: admin.last_name,
        emailVerified: true
      }
    });

  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('❌ [ADMIN VERIFY] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify admin email',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// PUT /api/admin-auth/:id - Update admin (requires admin authentication)
router.put('/:id', authenticateAdminToken, async (req, res) => {
  let connection;
  try {
    const { id } = req.params;
    const { firstName, lastName, email } = req.body;

    if (!firstName || !lastName || !email) {
      return res.status(400).json({
        success: false,
        message: 'firstName, lastName, and email are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Check if admin exists
    const [existingAdmins] = await connection.query(
      'SELECT admin_id, email FROM admin_users WHERE admin_id = ?',
      [id]
    );

    if (!existingAdmins || existingAdmins.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    // Check if email is already taken by another admin
    const [emailCheck] = await connection.query(
      'SELECT admin_id FROM admin_users WHERE LOWER(TRIM(email)) = ? AND admin_id != ?',
      [normalizedEmail, id]
    );

    if (emailCheck && emailCheck.length > 0) {
      await connection.rollback();
      return res.status(409).json({
        success: false,
        message: 'An admin with this email already exists'
      });
    }

    // Update admin
    await connection.query(
      'UPDATE admin_users SET first_name = ?, last_name = ?, email = ?, updated_at = NOW() WHERE admin_id = ?',
      [firstName, lastName, normalizedEmail, id]
    );

    await connection.commit();

    console.log(`✅ [ADMIN UPDATE] Admin ${id} updated successfully`);

    res.json({
      success: true,
      message: 'Admin updated successfully',
      admin: {
        adminId: parseInt(id),
        email: normalizedEmail,
        firstName: firstName,
        lastName: lastName
      }
    });

  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('❌ [ADMIN UPDATE] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update admin',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// PUT /api/admin-auth/:id/toggle-status - Toggle admin active status (requires admin authentication)
router.put('/:id/toggle-status', authenticateAdminToken, async (req, res) => {
  let connection;
  try {
    const { id } = req.params;

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Check if admin exists
    const [existingAdmins] = await connection.query(
      'SELECT admin_id, is_active FROM admin_users WHERE admin_id = ?',
      [id]
    );

    if (!existingAdmins || existingAdmins.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    const currentStatus = existingAdmins[0].is_active;
    const newStatus = currentStatus === 1 ? 0 : 1;

    // Update admin status
    await connection.query(
      'UPDATE admin_users SET is_active = ?, updated_at = NOW() WHERE admin_id = ?',
      [newStatus, id]
    );

    await connection.commit();

    console.log(`✅ [ADMIN TOGGLE STATUS] Admin ${id} status changed from ${currentStatus} to ${newStatus}`);

    res.json({
      success: true,
      message: `Admin ${newStatus === 1 ? 'activated' : 'deactivated'} successfully`,
      admin: {
        adminId: parseInt(id),
        isActive: newStatus === 1,
        status: newStatus === 1 ? 'Active' : 'Inactive'
      }
    });

  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('❌ [ADMIN TOGGLE STATUS] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle admin status',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// ========================================
// 🔑 ADMIN FORGOT PASSWORD - Request Reset
// ========================================
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  
  console.log('🔑 [ADMIN] Password reset request for:', email);
  
  if (!email) {
    return res.status(400).json({ 
      success: false, 
      message: 'Email is required' 
    });
  }

  try {
    // Check if admin exists
    const adminQuery = `
      SELECT admin_id, email, first_name, password_hash 
      FROM admin_users 
      WHERE LOWER(TRIM(email)) = ? AND (is_active = 1 OR is_active IS NULL)
      LIMIT 1
    `;
    
    const result = await pool.query(adminQuery, [email.trim().toLowerCase()]);
    
    // Handle mysql2 pool.query() format: [rows, fields] or just rows
    let rows;
    if (Array.isArray(result) && Array.isArray(result[0])) {
      rows = result[0]; // [rows, fields] format
    } else if (Array.isArray(result)) {
      rows = result; // Just rows format
    } else {
      rows = [result]; // Single result
    }
    
    // Always return success to prevent email enumeration attacks
    // But only send email if admin exists
    if (!rows || rows.length === 0) {
      console.log('⚠️ [ADMIN] Password reset requested for non-existent email:', email);
      return res.json({ 
        success: true, 
        message: 'If this email exists, a password reset code has been sent.' 
      });
    }

    const admin = rows[0];
    
    // Generate 6-digit reset code
    const resetCode = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Store admin_id in request_data JSON
    // We need a valid user_id for the foreign key constraint, so we'll use the first user_id as placeholder
    // Admin ID is stored in request_data JSON field for identification
    const requestData = JSON.stringify({ 
      admin_id: admin.admin_id,
      reset_code: resetCode 
    });
    
    // Get a valid user_id to use as placeholder (foreign key constraint requires valid user_id)
    // We'll use the first user_id from users table as a placeholder
    const placeholderUserResult = await pool.query(
      'SELECT user_id FROM users ORDER BY user_id ASC LIMIT 1'
    );
    
    // Handle mysql2 pool.query() format: [rows, fields] or just rows
    let placeholderUserRows;
    if (Array.isArray(placeholderUserResult) && Array.isArray(placeholderUserResult[0])) {
      placeholderUserRows = placeholderUserResult[0]; // [rows, fields] format
    } else if (Array.isArray(placeholderUserResult)) {
      placeholderUserRows = placeholderUserResult; // Just rows format
    } else {
      placeholderUserRows = [placeholderUserResult]; // Single result
    }
    
    if (!placeholderUserRows || placeholderUserRows.length === 0) {
      // If no users exist, we can't create admin requests (this is an edge case)
      return res.status(500).json({ 
        success: false, 
        message: 'System error: No users found. Cannot process admin password reset.' 
      });
    }
    
    const placeholderUserId = placeholderUserRows[0].user_id;
    
    // Expire old password reset requests for this admin
    // Use request_data to find admin requests (we identify by request_type and admin_id in JSON)
    await pool.query(
      `UPDATE pending_requests 
       SET status = ? 
       WHERE request_type = ? 
       AND status = ? 
       AND JSON_EXTRACT(request_data, '$.admin_id') = ?`,
      ['expired', 'admin_password_reset', 'pending', admin.admin_id.toString()]
    );

    // Store reset request with placeholder user_id (required by foreign key constraint)
    // Admin ID is stored in request_data JSON field for identification
    // We identify admin requests by request_type = 'admin_password_reset' and admin_id in request_data
    await pool.query(
      'INSERT INTO pending_requests (user_id, request_type, request_data, status, created_at) VALUES (?, ?, ?, ?, ?)',
      [placeholderUserId, 'admin_password_reset', requestData, 'pending', new Date()]
    );

    // Send reset email
    try {
      await sendAdminPasswordResetEmail(email, resetCode, admin.first_name || '');
      console.log(`✅ [ADMIN] Password reset code sent to:`, email);
    } catch (emailError) {
      console.error('❌ [ADMIN] Email sending failed:', emailError);
      console.error('❌ [ADMIN] Email error details:', {
        message: emailError.message,
        stack: emailError.stack,
        isProduction: process.env.VERCEL || process.env.NODE_ENV === 'production',
        hasSendGrid: !!(process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM_EMAIL),
        hasGmailSMTP: !!gmailTransporter,
        emailUser: process.env.EMAIL_USER ? 'configured' : 'missing',
        emailAppPassword: process.env.EMAIL_APP_PASSWORD ? 'configured' : 'missing'
      });
      
      // Re-throw the error so it's caught by the outer catch block
      // This ensures we return proper error response
      throw new Error(`Email sending failed: ${emailError.message}`);
    }
    
    res.json({ 
      success: true, 
      message: 'Password reset code sent to your email. Please check your inbox.',
      email: email
    });
  } catch (error) {
    console.error('❌ [ADMIN] Forgot password error:', error);
    console.error('❌ [ADMIN] Error stack:', error.stack);
    console.error('❌ [ADMIN] Error details:', {
      message: error.message,
      name: error.name,
      code: error.code
    });
    res.status(500).json({ 
      success: false, 
      message: 'Server error. Please try again later.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ========================================
// 🔑 ADMIN RESET PASSWORD - Verify Code & Update Password
// ========================================
router.post('/reset-password', async (req, res) => {
  let { email, code, newPassword } = req.body;
  
  // Trim inputs
  email = email ? email.trim().toLowerCase() : '';
  code = code ? code.trim() : '';
  
  console.log('🔑 [ADMIN] Password reset attempt for:', email);

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

    // Get admin
    const adminQuery = `
      SELECT admin_id 
      FROM admin_users 
      WHERE LOWER(TRIM(email)) = ? AND (is_active = 1 OR is_active IS NULL)
      LIMIT 1
    `;
    
    const [adminRows] = await connection.query(adminQuery, [email]);

    if (!adminRows || adminRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ 
        success: false, 
        message: 'Admin account not found' 
      });
    }

    const adminId = adminRows[0].admin_id;

    // Verify reset code - Admin requests are identified by request_type and admin_id in request_data JSON
    // The user_id is just a placeholder for foreign key constraint, we identify by admin_id in JSON
    // Use CAST to ensure proper comparison (JSON_EXTRACT returns string, admin_id is number)
    const [requestRows] = await connection.query(
      `SELECT * FROM pending_requests 
       WHERE request_type = 'admin_password_reset'
         AND status = 'pending'
         AND CAST(JSON_EXTRACT(request_data, '$.admin_id') AS UNSIGNED) = ?
       ORDER BY created_at DESC
       LIMIT 1`,
      [adminId]
    );

    console.log(`🔍 [ADMIN] Looking for reset request for admin_id: ${adminId}`);
    console.log(`🔍 [ADMIN] Found ${requestRows ? requestRows.length : 0} pending request(s)`);

    if (!requestRows || requestRows.length === 0) {
      await connection.rollback();
      console.log(`❌ [ADMIN] No pending reset request found for admin_id: ${adminId}`);
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid or expired reset code' 
      });
    }

    const request = requestRows[0];
    console.log(`✅ [ADMIN] Found reset request:`, {
      request_id: request.request_id,
      request_data: request.request_data,
      created_at: request.created_at
    });
    
    // Parse request_data JSON to get reset_code
    let requestData;
    try {
      requestData = typeof request.request_data === 'string' 
        ? JSON.parse(request.request_data) 
        : request.request_data;
      console.log(`✅ [ADMIN] Parsed request_data:`, requestData);
    } catch (parseError) {
      console.error(`❌ [ADMIN] Failed to parse request_data:`, parseError);
      // If request_data is not JSON, treat it as plain code (backward compatibility)
      requestData = { reset_code: request.request_data };
    }
    
    // Check if code matches (stored in request_data.reset_code)
    const storedCode = requestData.reset_code || requestData;
    console.log(`🔍 [ADMIN] Comparing codes - Stored: "${storedCode}", Provided: "${code}"`);
    
    if (storedCode !== code) {
      await connection.rollback();
      console.log(`❌ [ADMIN] Code mismatch - Stored: "${storedCode}", Provided: "${code}"`);
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid reset code' 
      });
    }
    
    console.log(`✅ [ADMIN] Code verified successfully`);
    
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
      'UPDATE admin_users SET password_hash = ? WHERE admin_id = ?',
      [passwordHash, adminId]
    );

    // Mark reset request as completed - Admin requests have user_id as NULL
    await connection.query(
      `UPDATE pending_requests 
       SET status = ? 
       WHERE request_id = ? 
         AND request_type = ? 
         AND status = ?`,
      ['completed', request.request_id, 'admin_password_reset', 'pending']
    );

    await connection.commit();

    console.log(`✅ [ADMIN] Password reset successful for admin:`, adminId);

    res.json({
      success: true,
      message: 'Password reset successful! You can now log in with your new password.'
    });

  } catch (error) {
    if (connection) await connection.rollback();
    console.error('❌ [ADMIN] Reset password error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error. Please try again later.' 
    });
  } finally {
    if (connection) connection.release();
  }
});

// Send admin password reset email
const sendAdminPasswordResetEmail = async (email, code, firstName = '') => {
  const fullName = firstName || 'Admin';
  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; color: #333;">
      <div style="max-width:600px;margin:0 auto;padding:20px;">
        <h2 style="background:#2E7D32;color:white;padding:15px;border-radius:10px 10px 0 0;text-align:center;">
          🔑 Admin Password Reset Request
        </h2>
        <div style="background:#f9f9f9;padding:20px;border-radius:0 0 10px 10px;">
          <p>Hi ${fullName},</p>
          <p>We received a request to reset your DishCovery Admin password. Use the code below to reset it:</p>
          <div style="background:white;border:2px dashed #2E7D32;padding:20px;text-align:center;border-radius:8px;margin:20px 0;">
            <p style="margin:0 0 10px 0;color:#666;font-size:14px;">Your Reset Code:</p>
            <div style="font-size:32px;font-weight:bold;color:#2E7D32;letter-spacing:4px;">
              ${code}
            </div>
            <p style="margin:10px 0 0 0;color:#666;font-size:12px;">This code will expire in 15 minutes.</p>
          </div>
          <p><strong>Important:</strong></p>
          <ul style="margin:10px 0;padding-left:20px;">
            <li>This code is for admin account password reset only</li>
            <li>If you didn't request this reset, please ignore this email</li>
            <li>For security reasons, never share this code with anyone</li>
          </ul>
          <p style="font-size:12px;color:#888;margin-top:30px;padding-top:20px;border-top:1px solid #ddd;">
            If you didn't request a password reset, please contact the system administrator immediately.
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
            name: 'DishCovery Admin'
          },
          subject: '🔑 Reset Your DishCovery Admin Password',
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
          console.log(`✅ [PRODUCTION] Admin password reset email sent via SendGrid HTTP API to ${email}`);
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
          console.error('❌ [SENDGRID] Error sending admin password reset email:', sendGridError);
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
            from: `"DishCovery Admin" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: '🔑 Reset Your DishCovery Admin Password',
            html: emailHtml
          };

          await gmailTransporter.sendMail(mailOptions);
          console.log(`✅ [LOCAL] Admin password reset email sent via Gmail SMTP to ${email}`);
          return true;
        } catch (smtpError) {
          console.warn('⚠️ [LOCAL] Gmail SMTP failed, trying SendGrid fallback:', smtpError.message);
          // Fallback to SendGrid if SMTP fails
          if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM_EMAIL) {
            const msg = {
              to: email,
              from: {
                email: process.env.SENDGRID_FROM_EMAIL,
                name: 'DishCovery Admin'
              },
              subject: '🔑 Reset Your DishCovery Admin Password',
              html: emailHtml
            };
            await sgMail.send(msg);
            console.log(`✅ [LOCAL] Admin password reset email sent via SendGrid (SMTP fallback) to ${email}`);
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
              name: 'DishCovery Admin'
            },
            subject: '🔑 Reset Your DishCovery Admin Password',
            html: emailHtml
          };
          await sgMail.send(msg);
          console.log(`✅ [LOCAL] Admin password reset email sent via SendGrid (no SMTP configured) to ${email}`);
          return true;
        } else {
          const errorMsg = 'Neither Gmail SMTP nor SendGrid is configured for local development. Please set EMAIL_USER and EMAIL_APP_PASSWORD, or SENDGRID_API_KEY and SENDGRID_FROM_EMAIL.';
          console.error('❌ [ADMIN]', errorMsg);
          console.error('❌ [ADMIN] Environment check:', {
            EMAIL_USER: process.env.EMAIL_USER ? 'set' : 'missing',
            EMAIL_APP_PASSWORD: process.env.EMAIL_APP_PASSWORD ? 'set' : 'missing',
            SENDGRID_API_KEY: process.env.SENDGRID_API_KEY ? 'set' : 'missing',
            SENDGRID_FROM_EMAIL: process.env.SENDGRID_FROM_EMAIL ? 'set' : 'missing',
            NODE_ENV: process.env.NODE_ENV,
            VERCEL: process.env.VERCEL
          });
          throw new Error(errorMsg);
        }
      }
    }
  } catch (error) {
    console.error('❌ [ADMIN] Password reset email send error:', error);
    console.error('❌ [ADMIN] Email error details:', {
      message: error.message,
      code: error.code,
      response: error.response ? error.response.message : 'no response',
      stack: error.stack
    });
    throw error; // Re-throw the original error with all details
  }
};

// DELETE /api/admin-auth/:id - Delete admin (requires admin authentication)
router.delete('/:id', authenticateAdminToken, async (req, res) => {
  let connection;
  try {
    const { id } = req.params;

    console.log(`🗑️ [DELETE ADMIN] Starting deletion process for admin ID: ${id}`);

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Check if admin exists
    const [existingAdmins] = await connection.query(
      'SELECT admin_id, email, first_name, last_name FROM admin_users WHERE admin_id = ?',
      [id]
    );

    if (!existingAdmins || existingAdmins.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    const admin = existingAdmins[0];
    console.log(`✅ Admin found: ${admin.email}`);

    // Delete related data first (foreign key constraints)
    // Check what tables might reference admin_users
    const tablesToClean = [
      'pending_requests'  // May have admin_id references
    ];

    console.log(`🧹 Cleaning up related data for admin ${id}...`);

    for (const table of tablesToClean) {
      try {
        // Check if table has user_id column that references admin_id
        const [result] = await connection.query(
          `DELETE FROM ${table} WHERE user_id = ?`,
          [id]
        );
        const affectedRows = result?.affectedRows || 0;
        if (affectedRows > 0) {
          console.log(`  ✓ Cleaned ${table}: ${affectedRows} row(s) deleted`);
        }
      } catch (err) {
        if (err.code === 'ER_NO_SUCH_TABLE' || err.code === '42S02') {
          console.log(`  ⚠️ Table ${table} doesn't exist, skipping`);
        } else if (err.code === 'ER_BAD_FIELD_ERROR' || err.code === '42S22') {
          // Column doesn't exist in this table, that's okay
          console.log(`  ⚠️ Column user_id doesn't exist in ${table}, skipping`);
        } else {
          console.error(`  ❌ Error deleting from ${table}:`, err.message);
          // Don't throw - continue with deletion
        }
      }
    }

    // Now delete the admin itself
    console.log(`🗑️ Deleting admin ${id}...`);
    await connection.query('DELETE FROM admin_users WHERE admin_id = ?', [id]);
    console.log(`✅ Admin "${admin.email}" deleted successfully`);

    await connection.commit();

    res.json({
      success: true,
      message: `Admin "${admin.email}" deleted successfully`,
      data: { id: parseInt(id) },
      timestamp: new Date().toISOString(),
      action: 'delete'
    });

  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('❌ [DELETE ADMIN] Error:', error);

    let errorMessage = 'Server error';
    let statusCode = 500;

    if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.code === '23000' || error.sqlState === '23000') {
      errorMessage = 'Cannot delete admin: Admin is still referenced by other records.';
      statusCode = 400;
    } else if (error.code === 'ER_NO_SUCH_TABLE' || error.code === '42S02') {
      errorMessage = 'Database table missing. Please contact administrator.';
      statusCode = 500;
    } else if (error.message) {
      errorMessage = error.message;
    }

    res.status(statusCode).json({
      success: false,
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
    });
  } finally {
    if (connection) {
      connection.release();
      console.log('✅ Database connection released');
    }
  }
});

export default router;