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
    
    // Debug: Log the query execution
    console.log('🔍 Executing admin query for email:', email);
    const result = await pool.query(adminQuery, [email]);
    console.log('📊 Query result structure:', { 
      resultType: typeof result, 
      isArray: Array.isArray(result),
      resultKeys: result ? Object.keys(result) : 'null',
      resultLength: result?.length
    });
    console.log('🔍 Full result object:', JSON.stringify(result, null, 2));

    // Handle different MySQL driver result formats
    let rows;
    
    console.log('🔍 Attempting to extract rows...');
    
    if (Array.isArray(result) && result.length >= 1) {
      const firstElement = result[0];
      console.log('📝 First element type:', typeof firstElement, 'isArray:', Array.isArray(firstElement));
      console.log('📝 First element keys:', firstElement ? Object.keys(firstElement) : 'none');
      
      // Check if it's the format: [{ '0': actualRowsArray }]
      if (firstElement && typeof firstElement === 'object' && !Array.isArray(firstElement) && firstElement.hasOwnProperty('0')) {
        rows = firstElement['0'];
        console.log('📝 Using result[0]["0"] path, extracted rows:', rows);
      } 
      // Check if it's the format: [actualRowsArray, fields]
      else if (Array.isArray(firstElement)) {
        rows = firstElement;
        console.log('📝 Using result[0] path (direct array)');
      }
      // Check if first element has numeric keys (another variation)
      else if (firstElement && typeof firstElement === 'object') {
        const keys = Object.keys(firstElement);
        if (keys.length > 0 && keys[0] === '0') {
          rows = Object.values(firstElement);
          console.log('📝 Using Object.values() path');
        } else {
          rows = [firstElement]; // Single row result
          console.log('📝 Treating as single row result');
        }
      }
      else {
        rows = result[0];
        console.log('📝 Using fallback result[0] path');
      }
    } else if (result && result.rows) {
      rows = result.rows;
      console.log('📝 Using result.rows path');
    } else {
      rows = result;
      console.log('📝 Using direct result path');
    }

    console.log('📝 Processed rows:', { 
      rowsType: typeof rows, 
      isArray: Array.isArray(rows),
      rowsLength: rows?.length,
      firstRow: rows?.[0] ? Object.keys(rows[0]) : 'no first row'
    });

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      console.log('❌ No admin found for email:', email);
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

export default router;