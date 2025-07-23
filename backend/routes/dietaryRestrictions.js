// CREATE THIS FILE: routes/dietaryRestrictions.js
// This is the complete route file for dietary restrictions

import express from 'express';
import pool from '../db.js';
import authenticateToken from '../middleware/auth.js';

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch((error) => {
    console.error('❌ Route error:', error);
    
    // Check if it's an authentication error
    if (error.message.includes('token') || error.message.includes('auth')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication failed. Please log in again.',
        errorType: 'AUTH_ERROR',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
    
    // Database connection errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return res.status(503).json({
        success: false,
        message: 'Database connection failed',
        errorType: 'DB_CONNECTION_ERROR'
      });
    }
    
    // Generic server error
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      errorType: 'SERVER_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  });
};

// Enhanced authentication check with detailed logging
const enhancedAuthCheck = (req, res, next) => {
  console.log('🔐 Enhanced auth check for route:', req.path);
  
  if (!req.user) {
    console.log('❌ No user found in request object');
    return res.status(401).json({
      success: false,
      message: 'User authentication required',
      errorType: 'NO_USER_CONTEXT'
    });
  }
  
  console.log('✅ User authenticated:', {
    userId: req.user.userId,
    email: req.user.email
  });
  
  next();
};

const router = express.Router();

// ========================================
// PUBLIC ENDPOINTS (for get-started page)
// ========================================

// Get all active restrictions with categories
router.get('/public', async (req, res) => {
  try {
    console.log('🔍 Fetching public dietary restrictions...');
    
    const query = `
      SELECT 
        r.restriction_id,
        r.restriction_name,
        r.description,
        r.severity_level,
        rc.category_name
      FROM restrictions r
      JOIN restriction_categories rc ON r.category_id = rc.category_id
      WHERE r.is_active = 1 AND rc.is_active = 1
      ORDER BY rc.category_name, r.restriction_name
    `;
    
    const restrictions = await pool.query(query);
    
    // Group by category to match your existing categoryOptions structure
    const groupedRestrictions = {};
    restrictions.forEach(restriction => {
      const category = restriction.category_name;
      if (!groupedRestrictions[category]) {
        groupedRestrictions[category] = [];
      }
      groupedRestrictions[category].push(restriction.restriction_name);
    });
    
    // Transform to match your existing structure
    const result = {
      dietaryRestrictions: groupedRestrictions['Allergies'] || [],
      preferredDiets: groupedRestrictions['Dietary Lifestyle'] || [], 
      medicalConditions: groupedRestrictions['Health Conditions'] || []
    };
    
    console.log(`✅ Found ${restrictions.length} active restrictions`);
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('❌ Error fetching public restrictions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dietary restrictions',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ========================================
// USER ENDPOINTS (authenticated)
// ========================================

// Save user dietary restrictions and excluded ingredients
router.post('/user/save', authenticateToken, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    console.log('💾 Saving user dietary profile...');
    console.log('User ID:', req.user.userId);
    console.log('Request body:', req.body);
    
    const { 
      memberId = null, 
      dietaryRestrictions = [], 
      excludedIngredients = [],
      medicalConditions = [],
      preferredDiets = []
    } = req.body;

    await connection.beginTransaction();

    // 1. Delete existing user restrictions
    if (memberId) {
      await connection.query(
        'DELETE FROM user_restrictions WHERE user_id = ? AND member_id = ?',
        [req.user.userId, memberId]
      );
      await connection.query(
        'DELETE FROM user_excluded_ingredients WHERE user_id = ? AND member_id = ?',
        [req.user.userId, memberId]
      );
    } else {
      await connection.query(
        'DELETE FROM user_restrictions WHERE user_id = ? AND member_id IS NULL',
        [req.user.userId]
      );
      await connection.query(
        'DELETE FROM user_excluded_ingredients WHERE user_id = ? AND member_id IS NULL',
        [req.user.userId]
      );
    }

    // 2. Insert dietary restrictions
    const allRestrictions = [...dietaryRestrictions, ...medicalConditions, ...preferredDiets];
    
    for (const restrictionName of allRestrictions) {
      if (!restrictionName || restrictionName.trim() === '') continue;
      
      // Find restriction ID
      const existingRestriction = await connection.query(
        'SELECT restriction_id FROM restrictions WHERE restriction_name = ? AND is_active = 1',
        [restrictionName.trim()]
      );

      if (existingRestriction.length > 0) {
        // Insert user restriction
        await connection.query(
          'INSERT INTO user_restrictions (user_id, member_id, restriction_id, status, requested_at) VALUES (?, ?, ?, "active", NOW())',
          [req.user.userId, memberId, existingRestriction[0].restriction_id]
        );
        console.log(`✅ Added restriction: ${restrictionName}`);
      } else {
        console.log(`⚠️ Restriction not found in database: ${restrictionName}`);
        
        // Create a pending request for admin approval
        await connection.query(
          'INSERT INTO pending_requests (user_id, request_type, request_data, status, requested_at) VALUES (?, "custom_restriction", ?, "pending", NOW())',
          [req.user.userId, JSON.stringify({ restrictionName: restrictionName.trim(), memberId })]
        );
      }
    }

    // 3. Insert excluded ingredients
    for (const ingredient of excludedIngredients) {
      if (!ingredient || ingredient.trim() === '') continue;
      
      await connection.query(
        'INSERT INTO user_excluded_ingredients (user_id, member_id, ingredient_name, created_at) VALUES (?, ?, ?, NOW())',
        [req.user.userId, memberId, ingredient.trim()]
      );
      console.log(`✅ Added excluded ingredient: ${ingredient}`);
    }

    await connection.commit();
    console.log('✅ User dietary profile saved successfully');

    res.json({
      success: true,
      message: 'Dietary profile saved successfully',
      data: {
        restrictionsAdded: allRestrictions.length,
        ingredientsExcluded: excludedIngredients.length
      }
    });

  } catch (error) {
    await connection.rollback();
    console.error('❌ Error saving user dietary profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save dietary profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    connection.release();
  }
});

// Get user's current dietary restrictions
router.get('/user/profile', authenticateToken, async (req, res) => {
  try {
    const { memberId } = req.query;
    console.log('🔍 Fetching user dietary profile for user:', req.user.userId, 'member:', memberId);

    // Get user restrictions
    let restrictionsQuery = `
      SELECT 
        r.restriction_name,
        r.description,
        rc.category_name,
        ur.status
      FROM user_restrictions ur
      JOIN restrictions r ON ur.restriction_id = r.restriction_id
      JOIN restriction_categories rc ON r.category_id = rc.category_id
      WHERE ur.user_id = ?
    `;
    
    let params = [req.user.userId];
    
    if (memberId) {
      restrictionsQuery += ' AND ur.member_id = ?';
      params.push(memberId);
    } else {
      restrictionsQuery += ' AND ur.member_id IS NULL';
    }

    const restrictions = await pool.query(restrictionsQuery, params);

    // Get excluded ingredients
    let ingredientsQuery = `
      SELECT ingredient_name
      FROM user_excluded_ingredients
      WHERE user_id = ?
    `;
    
    let ingredientParams = [req.user.userId];
    
    if (memberId) {
      ingredientsQuery += ' AND member_id = ?';
      ingredientParams.push(memberId);
    } else {
      ingredientsQuery += ' AND member_id IS NULL';
    }

    const excludedIngredients = await pool.query(ingredientsQuery, ingredientParams);

    // Group restrictions by category
    const groupedRestrictions = {};
    restrictions.forEach(restriction => {
      const category = restriction.category_name;
      if (!groupedRestrictions[category]) {
        groupedRestrictions[category] = [];
      }
      groupedRestrictions[category].push({
        name: restriction.restriction_name,
        description: restriction.description,
        status: restriction.status
      });
    });

    res.json({
      success: true,
      data: {
        restrictions: groupedRestrictions,
        excludedIngredients: excludedIngredients.map(item => item.ingredient_name)
      }
    });

  } catch (error) {
    console.error('❌ Error fetching user dietary profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dietary profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ========================================
// ADMIN ENDPOINTS (protected)
// ========================================

// Get all restrictions (admin view)
// 🔧 REPLACE your existing admin routes with these enhanced versions:

// Get all restrictions (admin view) - ENHANCED
router.get('/admin', authenticateToken, enhancedAuthCheck, asyncHandler(async (req, res) => {
  console.log('🔍 Admin fetching all dietary restrictions...');
  console.log('👤 Request user:', { userId: req.user.userId, email: req.user.email });
  
  const query = `
    SELECT 
      r.restriction_id,
      r.restriction_name,
      r.description,
      r.severity_level,
      r.is_active,
      r.created_at,
      rc.category_name,
      rc.category_id,
      COUNT(ur.user_restriction_id) as user_count
    FROM restrictions r
    JOIN restriction_categories rc ON r.category_id = rc.category_id
    LEFT JOIN user_restrictions ur ON r.restriction_id = ur.restriction_id
    GROUP BY r.restriction_id, r.restriction_name, r.description, r.severity_level, r.is_active, r.created_at, rc.category_name, rc.category_id
    ORDER BY rc.category_name, r.restriction_name
  `;
  
  const restrictions = await pool.query(query);
  
  // Transform to match your existing admin page structure
  const transformedRestrictions = restrictions.map(restriction => ({
    id: restriction.restriction_id,
    name: restriction.restriction_name,
    category: restriction.category_name,
    categoryId: restriction.category_id,
    description: restriction.description || 'No description',
    severityLevel: restriction.severity_level,
    status: restriction.is_active ? 'Active' : 'Inactive',
    isActive: restriction.is_active,
    usedBy: restriction.user_count,
    userCount: restriction.user_count,
    createdAt: restriction.created_at,
    lastEdited: restriction.created_at.toISOString().split('T')[0],
    lastEditedBy: 'Admin',
    changeLog: [
      { 
        date: restriction.created_at.toISOString().split('T')[0], 
        by: 'Admin', 
        change: 'Created restriction' 
      }
    ]
  }));
  
  console.log(`✅ Found ${restrictions.length} total restrictions for admin`);
  res.json({
    success: true,
    data: transformedRestrictions,
    meta: {
      total: restrictions.length,
      requestedBy: req.user.email,
      timestamp: new Date().toISOString()
    }
  });
}));

// Create new restriction (admin) - ENHANCED
router.post('/admin', authenticateToken, enhancedAuthCheck, asyncHandler(async (req, res) => {
  console.log('➕ Admin creating new restriction...');
  console.log('👤 Request user:', { userId: req.user.userId, email: req.user.email });
  console.log('📋 Request body:', req.body);
  
  const { name, category, description, status, visibility } = req.body;

  if (!name || !category) {
    return res.status(400).json({
      success: false,
      message: 'Restriction name and category are required',
      errorType: 'VALIDATION_ERROR',
      missingFields: [
        !name && 'name',
        !category && 'category'
      ].filter(Boolean)
    });
  }

  // Get category ID from category name
  const categoryResult = await pool.query(
    'SELECT category_id FROM restriction_categories WHERE category_name = ?',
    [category]
  );

  if (categoryResult.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Invalid category',
      errorType: 'INVALID_CATEGORY',
      providedCategory: category
    });
  }

  const categoryId = categoryResult[0].category_id;

  // Check if restriction already exists
  const existing = await pool.query(
    'SELECT restriction_id FROM restrictions WHERE restriction_name = ?',
    [name]
  );

  if (existing.length > 0) {
    return res.status(409).json({
      success: false,
      message: 'A restriction with this name already exists',
      errorType: 'DUPLICATE_RESTRICTION',
      existingId: existing[0].restriction_id
    });
  }

  // Insert new restriction
  const result = await pool.query(
    'INSERT INTO restrictions (restriction_name, category_id, description, severity_level, is_active, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
    [name, categoryId, description, 'Medium', status === 'Active' ? 1 : 0]
  );

  console.log(`✅ Created new restriction with ID: ${result.insertId}`);
  
  res.status(201).json({
    success: true,
    message: 'Restriction created successfully',
    data: {
      id: result.insertId,
      name,
      category,
      description,
      status,
      visibility,
      createdBy: req.user.email,
      createdAt: new Date().toISOString()
    }
  });
}));

// Update restriction (admin) - ENHANCED
router.put('/admin/:id', authenticateToken, enhancedAuthCheck, asyncHandler(async (req, res) => {
  const restrictionId = req.params.id;
  console.log(`✏️ Admin updating restriction ID: ${restrictionId}`);
  console.log('👤 Request user:', { userId: req.user.userId, email: req.user.email });
  console.log('📋 Request body:', req.body);
  
  const { name, category, description, status } = req.body;

  if (!name || !category) {
    return res.status(400).json({
      success: false,
      message: 'Restriction name and category are required',
      errorType: 'VALIDATION_ERROR',
      missingFields: [
        !name && 'name',
        !category && 'category'
      ].filter(Boolean)
    });
  }

  // Get category ID from category name
  const categoryResult = await pool.query(
    'SELECT category_id FROM restriction_categories WHERE category_name = ?',
    [category]
  );

  if (categoryResult.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Invalid category',
      errorType: 'INVALID_CATEGORY',
      providedCategory: category
    });
  }

  const categoryId = categoryResult[0].category_id;

  // Check if restriction exists
  const existing = await pool.query(
    'SELECT restriction_id FROM restrictions WHERE restriction_id = ?',
    [restrictionId]
  );

  if (existing.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'Restriction not found',
      errorType: 'NOT_FOUND',
      requestedId: restrictionId
    });
  }

  // Update restriction
  await pool.query(
    'UPDATE restrictions SET restriction_name = ?, category_id = ?, description = ?, is_active = ? WHERE restriction_id = ?',
    [name, categoryId, description, status === 'Active' ? 1 : 0, restrictionId]
  );

  console.log(`✅ Updated restriction ID: ${restrictionId}`);
  
  res.json({
    success: true,
    message: 'Restriction updated successfully',
    data: {
      id: restrictionId,
      name,
      category,
      description,
      status,
      updatedBy: req.user.email,
      updatedAt: new Date().toISOString()
    }
  });
}));

// Delete restriction (admin) - ENHANCED
router.delete('/admin/:id', authenticateToken, enhancedAuthCheck, asyncHandler(async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const restrictionId = req.params.id;
    console.log(`🗑️ Admin deleting restriction ID: ${restrictionId}`);
    console.log('👤 Request user:', { userId: req.user.userId, email: req.user.email });

    await connection.beginTransaction();

    // Check if restriction exists
    const restrictionCheck = await connection.query(
      'SELECT restriction_id, restriction_name FROM restrictions WHERE restriction_id = ?',
      [restrictionId]
    );

    if (restrictionCheck.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Restriction not found',
        errorType: 'NOT_FOUND',
        requestedId: restrictionId
      });
    }

    // Check if restriction is being used by users
    const userRestrictions = await connection.query(
      'SELECT COUNT(*) as count FROM user_restrictions WHERE restriction_id = ?',
      [restrictionId]
    );

    if (userRestrictions[0].count > 0) {
      // Don't delete, just deactivate
      await connection.query(
        'UPDATE restrictions SET is_active = 0 WHERE restriction_id = ?',
        [restrictionId]
      );
      
      await connection.commit();
      
      return res.json({
        success: true,
        message: `Restriction deactivated (was being used by ${userRestrictions[0].count} users)`,
        action: 'deactivated',
        userCount: userRestrictions[0].count,
        deactivatedBy: req.user.email
      });
    } else {
      // Safe to delete
      await connection.query(
        'DELETE FROM restrictions WHERE restriction_id = ?',
        [restrictionId]
      );
      
      await connection.commit();
      
      console.log(`✅ Deleted restriction ID: ${restrictionId}`);
      res.json({
        success: true,
        message: 'Restriction deleted successfully',
        action: 'deleted',
        deletedBy: req.user.email
      });
    }

  } catch (error) {
    await connection.rollback();
    throw error; // Let asyncHandler deal with it
  } finally {
    connection.release();
  }
}));
// Get restriction categories (for dropdowns)
router.get('/categories', async (req, res) => {
  try {
    console.log('🔍 Fetching restriction categories...');
    
    const categories = await pool.query(
      'SELECT category_id, category_name, description FROM restriction_categories WHERE is_active = 1 ORDER BY category_name'
    );
    
    console.log(`✅ Found ${categories.length} categories`);
    res.json({
      success: true,
      data: categories.map(cat => ({
        id: cat.category_id,
        name: cat.category_name,
        description: cat.description
      }))
    });
  } catch (error) {
    console.error('❌ Error fetching categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get pending restriction requests (admin)
router.get('/admin/pending-requests', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 Admin fetching pending restriction requests...');
    
    const requests = await pool.query(`
      SELECT 
        pr.request_id,
        pr.user_id,
        pr.request_data,
        pr.requested_at,
        u.first_name,
        u.last_name,
        u.email
      FROM pending_requests pr
      JOIN users u ON pr.user_id = u.user_id
      WHERE pr.request_type = 'custom_restriction' AND pr.status = 'pending'
      ORDER BY pr.requested_at DESC
    `);
    
    // Transform to match your existing structure
    const formattedRequests = requests.map(req => {
      const requestData = JSON.parse(req.request_data);
      return {
        id: req.request_id,
        name: requestData.restrictionName,
        user: `${req.first_name} ${req.last_name}`,
        dateSubmitted: req.requested_at.toISOString().split('T')[0],
        suggestedDescription: `User-submitted restriction from ${req.first_name} ${req.last_name}`,
        userId: req.user_id,
        userName: `${req.first_name} ${req.last_name}`,
        userEmail: req.email,
        restrictionName: requestData.restrictionName,
        memberId: requestData.memberId,
        requestedAt: req.requested_at
      };
    });
    
    console.log(`✅ Found ${formattedRequests.length} pending requests`);
    res.json({
      success: true,
      data: formattedRequests
    });
  } catch (error) {
    console.error('❌ Error fetching pending requests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending requests',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Approve pending request (admin)
router.post('/admin/approve-request/:id', authenticateToken, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const requestId = req.params.id;
    console.log(`✅ Admin approving request ID: ${requestId}`);

    await connection.beginTransaction();

    // Get the request details
    const requests = await connection.query(
      'SELECT * FROM pending_requests WHERE request_id = ? AND status = "pending"',
      [requestId]
    );

    if (requests.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Pending request not found'
      });
    }

    const request = requests[0];
    const requestData = JSON.parse(request.request_data);

    // Create the new restriction (assuming Custom category ID = 4, adjust as needed)
    const result = await connection.query(
      'INSERT INTO restrictions (restriction_name, category_id, description, severity_level, is_active, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
      [requestData.restrictionName, 4, `User-submitted restriction`, 'Medium', 1]
    );

    // Mark the request as completed
    await connection.query(
      'UPDATE pending_requests SET status = "completed", processed_at = NOW() WHERE request_id = ?',
      [requestId]
    );

    await connection.commit();

    console.log(`✅ Request approved and restriction created with ID: ${result.insertId}`);
    
    res.json({
      success: true,
      message: `Restriction "${requestData.restrictionName}" has been approved and added to the system.`
    });

  } catch (error) {
    await connection.rollback();
    console.error('❌ Error approving request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve request',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    connection.release();
  }
});

// Reject pending request (admin)
router.delete('/admin/pending-requests/:id', authenticateToken, async (req, res) => {
  try {
    const requestId = req.params.id;
    console.log(`❌ Admin rejecting request ID: ${requestId}`);

    // Mark the request as rejected
    await pool.query(
      'UPDATE pending_requests SET status = "rejected", processed_at = NOW() WHERE request_id = ?',
      [requestId]
    );

    console.log(`✅ Request rejected successfully`);
    
    res.json({
      success: true,
      message: 'Request has been rejected.'
    });

  } catch (error) {
    console.error('❌ Error rejecting request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject request',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;