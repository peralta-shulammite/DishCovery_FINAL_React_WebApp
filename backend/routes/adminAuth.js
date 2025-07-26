// Debug version of adminAuth.js
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../db.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

// Admin login route with enhanced debugging
router.post('/login', async (req, res) => {
  try {
    console.log('🔐 Admin login attempt:', { email: req.body.email });
    const { email, password } = req.body;

    console.log('📥 Received credentials:', {
      email: email,
      password: password,
      passwordLength: password?.length
    });

    if (!email || !password) {
      console.log('❌ Missing email or password');
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
    
    console.log('🔍 Executing admin query for email:', email);
    const adminResults = await pool.query(adminQuery, [email]);
    
    console.log('📊 Query results:', {
      foundRows: adminResults.length,
      firstResult: adminResults.length > 0 ? {
        admin_id: adminResults[0].admin_id,
        email: adminResults[0].email,
        password_hash: adminResults[0].password_hash,
        password_hash_length: adminResults[0].password_hash?.length
      } : 'No results'
    });
    
    if (adminResults.length === 0) {
      console.log('❌ Admin not found:', email);
      return res.status(401).json({
        success: false,
        message: 'Invalid admin credentials - admin not found'
      });
    }

    const admin = adminResults[0];
    console.log('✅ Admin found:', { 
      email: admin.email, 
      id: admin.admin_id,
      passwordHashExists: !!admin.password_hash,
      passwordHashLength: admin.password_hash?.length,
      passwordHashValue: admin.password_hash, // TEMPORARILY show actual value for debugging
      passwordHashType: admin.password_hash?.startsWith('$2') ? 'bcrypt' : 'plain'
    });

    // Check password - handle both hashed and plain text
    let isValidPassword = false;
    
    if (!admin.password_hash) {
      console.log('❌ No password hash found for admin');
      return res.status(401).json({
        success: false,
        message: 'Invalid admin credentials - no password set'
      });
    }

    console.log('🔐 Password comparison:', {
      providedPassword: password,
      storedHash: admin.password_hash,
      isHashedPassword: admin.password_hash.startsWith('$2'),
      exactMatch: password === admin.password_hash
    });

    if (admin.password_hash.startsWith('$2a$') || admin.password_hash.startsWith('$2b$')) {
      // Hashed password
      console.log('🔐 Checking bcrypt password...');
      isValidPassword = await bcrypt.compare(password, admin.password_hash);
      console.log('🔐 Bcrypt result:', isValidPassword);
    } else {
      // Plain text password (for development)
      console.log('🔓 Checking plain text password...');
      console.log('🔓 Direct comparison:', {
        provided: `"${password}"`,
        stored: `"${admin.password_hash}"`,
        match: password === admin.password_hash,
        providedTrimmed: `"${password.trim()}"`,
        storedTrimmed: `"${admin.password_hash.trim()}"`,
        trimmedMatch: password.trim() === admin.password_hash.trim()
      });
      isValidPassword = password === admin.password_hash;
    }

    console.log('🔍 Final password validation result:', { 
      isValidPassword, 
      providedPassword: password, 
      storedHash: admin.password_hash 
    });

    if (!isValidPassword) {
      console.log('❌ Invalid password for admin:', email);
      return res.status(401).json({
        success: false,
        message: 'Invalid admin credentials - wrong password'
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

    console.log('🎫 Creating token with payload:', tokenPayload);

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

    const responseData = {
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
    };

    console.log('📤 Sending response:', responseData);
    res.json(responseData);

  } catch (error) {
    console.error('❌ Admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during admin login',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Admin profile route (unchanged)
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