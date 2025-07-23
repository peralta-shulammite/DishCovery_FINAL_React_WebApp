// CREATE FILE: routes/adminAuth.js
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../db.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

// Admin login route
router.post('/login', async (req, res) => {
  try {
    console.log('🔐 Admin login attempt:', req.body);
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Check if user exists in admin_users table
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
      console.log('❌ Admin not found:', email);
      return res.status(401).json({
        success: false,
        message: 'Invalid admin credentials'
      });
    }

    const admin = adminResults[0];
    console.log('✅ Admin found:', { email: admin.email, id: admin.admin_id });

    // Check password - handle both hashed and plain text (for development)
    let isValidPassword = false;
    
    if (admin.password_hash.startsWith('$2a$') || admin.password_hash.startsWith('$2b$')) {
      // Hashed password
      isValidPassword = await bcrypt.compare(password, admin.password_hash);
    } else {
      // Plain text password (for development - like your 'test' password)
      isValidPassword = password === admin.password_hash;
    }

    if (!isValidPassword) {
      console.log('❌ Invalid password for admin:', email);
      return res.status(401).json({
        success: false,
        message: 'Invalid admin credentials'
      });
    }

    // Generate admin JWT token
    const tokenPayload = {
      adminId: admin.admin_id,
      userId: admin.admin_id, // For compatibility with existing middleware
      email: admin.email,
      username: admin.username,
      firstName: admin.first_name,
      lastName: admin.last_name,
      role: admin.role || 'admin',
      isAdmin: true
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { 
      expiresIn: '24h',
      issuer: 'dishcovery-admin',
      audience: 'dishcovery-admin-users'
    });

    // Update last login
    await pool.query(
      'UPDATE admin_users SET last_login = NOW() WHERE admin_id = ?',
      [admin.admin_id]
    );

    console.log('✅ Admin login successful:', admin.email);

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
      return res.status(401).json({
        success: false,
        message: 'Admin token required'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    if (!decoded.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
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
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
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