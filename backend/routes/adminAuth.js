import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../db.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

// Admin login route
router.post('/login', async (req, res) => {
  try {
    console.log('🔐 Admin login attempt:', { email: req.body.email });
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Find admin user
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
      WHERE email = ? AND (is_active = 1 OR is_active IS NULL)
    `;
    
    const adminResults = await pool.query(adminQuery, [email]);
    if (adminResults.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid admin credentials'
      });
    }

    const admin = adminResults[0];

    // Validate password
    let isValidPassword = false;
    if (admin.password_hash?.startsWith('$2a$') || admin.password_hash?.startsWith('$2b$')) {
      isValidPassword = await bcrypt.compare(password, admin.password_hash);
    } else {
      isValidPassword = password === admin.password_hash; // plain text fallback
    }

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid admin credentials'
      });
    }

    // Build token payload
    const tokenPayload = {
      adminId: admin.admin_id,
      userId: admin.admin_id, // compatibility
      email: admin.email,
      username: admin.username,
      firstName: admin.first_name,
      lastName: admin.last_name,
      role: admin.role || 'admin',
      isAdmin: true
    };

    // Generate token
    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '24h' });

    // DEBUG logs
    console.log('[ADMIN AUTH/LOGIN] JWT secret present:', !!JWT_SECRET ? 'yes' : 'NO');
    console.log('[ADMIN AUTH/LOGIN] Issued token parts:', (token || '').split('.').length, 'len:', (token || '').length);

    // Update last login
    await pool.query('UPDATE admin_users SET last_login = NOW() WHERE admin_id = ?', [admin.admin_id]);

    res.json({
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
        role: admin.role || 'admin'
      },
      admin: {
        adminId: admin.admin_id,
        email: admin.email,
        username: admin.username,
        firstName: admin.first_name || admin.username,
        lastName: admin.last_name || '',
        role: admin.role || 'admin'
      }
    });

  } catch (error) {
    console.error('❌ Admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during admin login',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Admin profile route
router.get('/profile', async (req, res) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ success: false, message: 'Admin token required' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    if (!decoded.isAdmin) {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const adminQuery = `
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
    `;
    
    const adminResults = await pool.query(adminQuery, [decoded.adminId]);
    if (adminResults.length === 0) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    const admin = adminResults[0];

    res.json({
      success: true,
      admin: {
        adminId: admin.admin_id,
        email: admin.email,
        username: admin.username,
        firstName: admin.first_name || admin.username,
        lastName: admin.last_name || '',
        role: admin.role || 'admin',
        createdAt: admin.created_at,
        lastLogin: admin.last_login
      }
    });

  } catch (error) {
    console.error('❌ Admin profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get admin profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;
