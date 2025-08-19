// routes/adminAuth.js (secure, bcrypt-only)
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../db.js';

const router = express.Router();

// --- Security: require a strong secret at boot ---
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 12) {
  throw new Error(
    'JWT_SECRET is missing or too short. Set a strong JWT_SECRET (>=12 chars) in your environment.'
  );
}

// POST /api/admin-auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
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
      WHERE email = ? AND (is_active = 1 OR is_active IS NULL)
      LIMIT 1
    `;
    const [rows] = await pool.query(adminQuery, [email]);

    if (!rows || rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid admin credentials' });
    }

    const admin = rows[0];

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
    const [rows] = await pool.query(q, [decoded.adminId]);

    if (!rows || rows.length === 0) {
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

export default router;
