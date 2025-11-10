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

// Send admin verification email
const sendAdminVerificationEmail = async (email, firstName = '', lastName = '', password) => {
  const fullName = `${firstName} ${lastName}`.trim() || 'Admin';
  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; color: #333;">
      <div style="max-width:600px;margin:0 auto;padding:20px;">
        <h2 style="background:#2E7D32;color:white;padding:15px;border-radius:10px 10px 0 0;text-align:center;">
          Welcome to DishCovery Admin Panel!
        </h2>
        <div style="background:#f9f9f9;padding:20px;border-radius:0 0 10px 10px;">
          <p>Hi ${fullName},</p>
          <p>Your admin account has been created successfully. Here are your login credentials:</p>
          <div style="background:white;border:2px solid #2E7D32;padding:15px;border-radius:8px;margin:20px 0;">
            <p style="margin:5px 0;"><strong>Email:</strong> ${email}</p>
            <p style="margin:5px 0;"><strong>Password:</strong> ${password}</p>
          </div>
          <p><strong>Important:</strong> Please change your password after your first login for security.</p>
          <p>You can now access the admin panel at: <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin/login">Admin Login</a></p>
          <p style="font-size:12px;color:#888;margin-top:30px;padding-top:20px;border-top:1px solid #ddd;">
            If you didn't request this account, please contact the system administrator immediately.
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
          name: 'DishCovery Admin'
        },
        subject: 'Your DishCovery Admin Account Has Been Created',
        html: emailHtml
      };

      await sgMail.send(msg);
      console.log(`✅ Admin verification email sent via SendGrid HTTP API to ${email}`);
      return true;
    }

    // Fallback to Gmail SMTP (local development only)
    if (gmailTransporter) {
      const mailOptions = {
        from: `"DishCovery Admin" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Your DishCovery Admin Account Has Been Created',
        html: emailHtml
      };

      await gmailTransporter.sendMail(mailOptions);
      console.log(`✅ Admin verification email sent via Gmail SMTP to ${email}`);
      return true;
    }

    throw new Error('No email service configured');
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

    // Commit transaction
    await connection.commit();

    // Send verification email (don't fail if email fails)
    try {
      await sendAdminVerificationEmail(normalizedEmail, firstName, lastName, password);
    } catch (emailError) {
      console.error('⚠️ Failed to send admin verification email:', emailError);
      // Don't fail the request if email fails - admin is still created
    }

    // Return success with admin_id
    res.status(201).json({
      success: true,
      message: 'Admin created successfully. Verification email sent.',
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

export default router;