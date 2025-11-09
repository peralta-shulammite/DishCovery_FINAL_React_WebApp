// routes/dietaryRestrictions.js - ENHANCED WITH DEBUGGING
import express from 'express';
import pool from '../db.js';
import authenticateToken from '../middleware/auth.js';

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch((error) => {
    console.error('❌ Route error:', error);
    console.error('Stack trace:', error.stack);
    
    if (error.message.includes('token') || error.message.includes('auth')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication failed. Please log in again.',
        errorType: 'AUTH_ERROR',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
    
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return res.status(503).json({
        success: false,
        message: 'Database connection failed',
        errorType: 'DB_CONNECTION_ERROR'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      errorType: 'SERVER_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  });
};

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
// PUBLIC ENDPOINTS
// ========================================

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
    
    const groupedRestrictions = {};
    restrictions.forEach(restriction => {
      const category = restriction.category_name;
      if (!groupedRestrictions[category]) {
        groupedRestrictions[category] = [];
      }
      groupedRestrictions[category].push(restriction.restriction_name);
    });
    
    // Combine Allergy and Intolerance into medicalConditions
    const allergies = groupedRestrictions['Allergy'] || [];
    const intolerances = groupedRestrictions['Intolerance'] || [];
    const medicalConditions = [...allergies, ...intolerances];
    
    const result = {
      dietaryRestrictions: [], // Empty - no longer used, replaced by medicalConditions
      preferredDiets: [], // Empty - category_id 3 removed
      medicalConditions: medicalConditions
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
// ✅ FIXED: Save user dietary restrictions
// ========================================
router.post('/user/save', authenticateToken, async (req, res) => {
  let connection;
  
  try {
    console.log('\n🔷🔷🔷 === STARTING DIETARY SAVE === 🔷🔷🔷');
    console.log('👤 User ID:', req.user?.userId);
    console.log('📧 User Email:', req.user?.email);
    console.log('📦 Request Body:', JSON.stringify(req.body, null, 2));
    
    // ✅ Validate user authentication
    if (!req.user || !req.user.userId) {
      console.error('❌ No authenticated user found');
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        errorType: 'NO_USER'
      });
    }

    const { 
      memberId = null, 
      dietaryRestrictions = [], 
      excludedIngredients = [],
      medicalConditions = []
      // preferredDiets removed - dietary lifestyle category removed
    } = req.body;

    console.log('📊 Parsed Data:', {
      memberId,
      dietaryRestrictionsCount: dietaryRestrictions.length,
      medicalConditionsCount: medicalConditions.length,
      excludedIngredientsCount: excludedIngredients.length
    });

    // ✅ Get connection from pool
    console.log('🔌 Getting database connection...');
    connection = await pool.getConnection();
    console.log('✅ Database connection obtained');
    
    await connection.beginTransaction();
    console.log('🔄 Transaction started');

    // 1. Delete existing user restrictions
    console.log('🗑️ Deleting existing restrictions...');
    if (memberId) {
      await connection.query(
        'DELETE FROM user_restrictions WHERE user_id = ? AND member_id = ?',
        [req.user.userId, memberId]
      );
      await connection.query(
        'DELETE FROM user_excluded_ingredients WHERE user_id = ? AND member_id = ?',
        [req.user.userId, memberId]
      );
      console.log('✅ Deleted existing member restrictions');
    } else {
      await connection.query(
        'DELETE FROM user_restrictions WHERE user_id = ? AND member_id IS NULL',
        [req.user.userId]
      );
      await connection.query(
        'DELETE FROM user_excluded_ingredients WHERE user_id = ? AND member_id IS NULL',
        [req.user.userId]
      );
      console.log('✅ Deleted existing user restrictions');
    }

    // 2. Insert dietary restrictions (only medical conditions - dietary lifestyle removed)
    const allRestrictions = [...dietaryRestrictions, ...medicalConditions];
    // preferredDiets removed - dietary lifestyle category removed
    console.log(`\n📋 Processing ${allRestrictions.length} restrictions...`);
    
    let processedCount = 0;
    let pendingCount = 0;

    for (const restrictionName of allRestrictions) {
      if (!restrictionName || restrictionName.trim() === '') {
        console.log('⏭️ Skipping empty restriction');
        continue;
      }
      
      try {
        console.log(`\n🔍 Looking up restriction: "${restrictionName}"`);
        
        // ✅ Proper destructuring for mysql2/promise
        const [rows] = await connection.query(
          'SELECT restriction_id FROM restrictions WHERE restriction_name = ? AND is_active = 1',
          [restrictionName.trim()]
        );

        console.log(`   Found ${rows.length} matching restriction(s)`);

        if (rows && rows.length > 0) {
          const restrictionId = rows[0].restriction_id;
          console.log(`   ✅ Restriction ID: ${restrictionId}`);
          
          // Insert user restriction
          await connection.query(
            'INSERT INTO user_restrictions (user_id, member_id, restriction_id, status, requested_at) VALUES (?, ?, ?, ?, NOW())',
            [req.user.userId, memberId, restrictionId, 'active']
          );
          
          processedCount++;
          console.log(`   ✅ Successfully added restriction: ${restrictionName}`);
        } else {
          console.log(`   ⚠️ Restriction not found in database: ${restrictionName}`);
          
          // Create a pending request for admin approval
          await connection.query(
            'INSERT INTO pending_requests (user_id, request_type, request_data, status, requested_at) VALUES (?, "custom_restriction", ?, "pending", NOW())',
            [req.user.userId, JSON.stringify({ restrictionName: restrictionName.trim(), memberId })]
          );
          
          pendingCount++;
          console.log(`   📝 Created pending request for: ${restrictionName}`);
        }
      } catch (restrictionError) {
        console.error(`   ❌ Error processing restriction "${restrictionName}":`, restrictionError);
        throw restrictionError;
      }
    }

    console.log(`\n📊 Restrictions Summary:`);
    console.log(`   ✅ Successfully added: ${processedCount}`);
    console.log(`   📝 Pending approval: ${pendingCount}`);

    // 3. Insert excluded ingredients
    console.log(`\n🥗 Processing ${excludedIngredients.length} excluded ingredients...`);
    let ingredientsAdded = 0;

    for (const ingredient of excludedIngredients) {
      if (!ingredient || ingredient.trim() === '') {
        console.log('⏭️ Skipping empty ingredient');
        continue;
      }
      
      try {
        await connection.query(
          'INSERT INTO user_excluded_ingredients (user_id, member_id, ingredient_name, created_at) VALUES (?, ?, ?, NOW())',
          [req.user.userId, memberId, ingredient.trim()]
        );
        
        ingredientsAdded++;
        console.log(`   ✅ Added excluded ingredient: ${ingredient}`);
      } catch (ingredientError) {
        console.error(`   ❌ Error adding ingredient "${ingredient}":`, ingredientError);
        throw ingredientError;
      }
    }

    console.log(`\n📊 Ingredients Summary:`);
    console.log(`   ✅ Successfully added: ${ingredientsAdded}`);

    // Mark user as having completed onboarding (set is_new_user to 0)
    await connection.query(
      'UPDATE users SET is_new_user = 0 WHERE user_id = ?',
      [req.user.userId]
    );
    console.log('✅ User marked as having completed onboarding');

    // Commit transaction
    console.log('\n💾 Committing transaction...');
    await connection.commit();
    console.log('✅ Transaction committed successfully!');
    console.log('🔷🔷🔷 === SAVE COMPLETED === 🔷🔷🔷\n');

    res.json({
      success: true,
      message: 'Dietary profile saved successfully',
      data: {
        restrictionsAdded: processedCount,
        restrictionsPending: pendingCount,
        ingredientsExcluded: ingredientsAdded
      }
    });

  } catch (error) {
    console.error('\n❌❌❌ === SAVE FAILED === ❌❌❌');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Error code:', error.code);
    
    if (connection) {
      console.log('🔄 Rolling back transaction...');
      try {
        await connection.rollback();
        console.log('✅ Transaction rolled back');
      } catch (rollbackError) {
        console.error('❌ Rollback failed:', rollbackError);
      }
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to save dietary profile',
      errorType: error.code || 'UNKNOWN_ERROR',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    if (connection) {
      console.log('🔌 Releasing database connection...');
      connection.release();
      console.log('✅ Connection released\n');
    }
  }
});

// Get user's current dietary restrictions
router.get('/user/profile', authenticateToken, async (req, res) => {
  try {
    const { memberId } = req.query;
    console.log('🔍 Fetching user dietary profile for user:', req.user.userId, 'member:', memberId);

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
// ADMIN ENDPOINTS
// ========================================

router.get('/admin', authenticateToken, enhancedAuthCheck, asyncHandler(async (req, res) => {
  console.log('🔍 Admin fetching all dietary restrictions...');
  
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
  
  console.log(`✅ Found ${restrictions.length} total restrictions`);
  res.json({
    success: true,
    data: transformedRestrictions
  });
}));

router.post('/admin', authenticateToken, enhancedAuthCheck, asyncHandler(async (req, res) => {
  console.log('➕ Admin creating new restriction...');
  const { name, category, description, status } = req.body;

  if (!name || !category) {
    return res.status(400).json({
      success: false,
      message: 'Restriction name and category are required',
      errorType: 'VALIDATION_ERROR'
    });
  }

  const categoryResult = await pool.query(
    'SELECT category_id FROM restriction_categories WHERE category_name = ?',
    [category]
  );

  if (categoryResult.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Invalid category',
      errorType: 'INVALID_CATEGORY'
    });
  }

  const categoryId = categoryResult[0].category_id;

  const existing = await pool.query(
    'SELECT restriction_id FROM restrictions WHERE restriction_name = ?',
    [name]
  );

  if (existing.length > 0) {
    return res.status(409).json({
      success: false,
      message: 'A restriction with this name already exists',
      errorType: 'DUPLICATE_RESTRICTION'
    });
  }

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
      status
    }
  });
}));

router.put('/admin/:id', authenticateToken, enhancedAuthCheck, asyncHandler(async (req, res) => {
  const restrictionId = req.params.id;
  console.log(`✏️ Admin updating restriction ID: ${restrictionId}`);
  
  const { name, category, description, status } = req.body;

  if (!name || !category) {
    return res.status(400).json({
      success: false,
      message: 'Restriction name and category are required',
      errorType: 'VALIDATION_ERROR'
    });
  }

  const categoryResult = await pool.query(
    'SELECT category_id FROM restriction_categories WHERE category_name = ?',
    [category]
  );

  if (categoryResult.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Invalid category',
      errorType: 'INVALID_CATEGORY'
    });
  }

  const categoryId = categoryResult[0].category_id;

  const existing = await pool.query(
    'SELECT restriction_id FROM restrictions WHERE restriction_id = ?',
    [restrictionId]
  );

  if (existing.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'Restriction not found',
      errorType: 'NOT_FOUND'
    });
  }

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
      status
    }
  });
}));

router.delete('/admin/:id', authenticateToken, enhancedAuthCheck, asyncHandler(async (req, res) => {
  let connection;
  
  try {
    const restrictionId = req.params.id;
    console.log(`🗑️ Admin deleting restriction ID: ${restrictionId}`);

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [restrictionCheck] = await connection.query(
      'SELECT restriction_id, restriction_name FROM restrictions WHERE restriction_id = ?',
      [restrictionId]
    );

    if (restrictionCheck.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Restriction not found',
        errorType: 'NOT_FOUND'
      });
    }

    const [userRestrictions] = await connection.query(
      'SELECT COUNT(*) as count FROM user_restrictions WHERE restriction_id = ?',
      [restrictionId]
    );

    if (userRestrictions[0].count > 0) {
      await connection.query(
        'UPDATE restrictions SET is_active = 0 WHERE restriction_id = ?',
        [restrictionId]
      );
      
      await connection.commit();
      
      return res.json({
        success: true,
        message: `Restriction deactivated (was being used by ${userRestrictions[0].count} users)`,
        action: 'deactivated'
      });
    } else {
      await connection.query(
        'DELETE FROM restrictions WHERE restriction_id = ?',
        [restrictionId]
      );
      
      await connection.commit();
      
      console.log(`✅ Deleted restriction ID: ${restrictionId}`);
      res.json({
        success: true,
        message: 'Restriction deleted successfully',
        action: 'deleted'
      });
    }

  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}));

// Get all categories (for admin dropdown)
router.get('/admin/categories', async (req, res) => {
  try {
    console.log('🔍 Fetching all restriction categories...');

    // Fetch all active categories
    const query = `
      SELECT
        category_id,
        category_name,
        description,
        is_active
      FROM restriction_categories
      WHERE is_active = 1
      ORDER BY category_id
    `;

    const categories = await pool.query(query);

    console.log(`✅ Found ${categories.length} active categories`);

    res.json({
      success: true,
      data: categories.map(cat => ({
        id: cat.category_id,
        name: cat.category_name,
        description: cat.description,
        isActive: cat.is_active
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

router.get('/categories', async (req, res) => {
  try {
    console.log('🔍 Fetching restriction categories with restrictions...');

    // Fetch all active restrictions with their categories
    const query = `
      SELECT
        r.restriction_id,
        r.restriction_name,
        r.description,
        r.severity_level,
        rc.category_name,
        rc.category_id
      FROM restrictions r
      JOIN restriction_categories rc ON r.category_id = rc.category_id
      WHERE r.is_active = 1 AND rc.is_active = 1
      ORDER BY rc.category_name, r.restriction_name
    `;

    const restrictions = await pool.query(query);

    // Group restrictions by category name
    const groupedRestrictions = {};
    restrictions.forEach(restriction => {
      const category = restriction.category_name;
      if (!groupedRestrictions[category]) {
        groupedRestrictions[category] = [];
      }
      groupedRestrictions[category].push({
        id: restriction.restriction_id,
        name: restriction.restriction_name,
        description: restriction.description,
        severityLevel: restriction.severity_level,
        categoryId: restriction.category_id
      });
    });

    console.log(`✅ Found ${restrictions.length} restrictions across ${Object.keys(groupedRestrictions).length} categories`);
    console.log('📊 Categories:', Object.keys(groupedRestrictions));

    res.json({
      success: true,
      data: groupedRestrictions
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

router.post('/admin/approve-request/:id', authenticateToken, async (req, res) => {
  let connection;
  
  try {
    const requestId = req.params.id;
    console.log(`✅ Admin approving request ID: ${requestId}`);

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [requests] = await connection.query(
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

    const [result] = await connection.query(
      'INSERT INTO restrictions (restriction_name, category_id, description, severity_level, is_active, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
      [requestData.restrictionName, 4, `User-submitted restriction`, 'Medium', 1]
    );

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
    if (connection) {
      await connection.rollback();
    }
    console.error('❌ Error approving request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve request',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

router.delete('/admin/pending-requests/:id', authenticateToken, async (req, res) => {
  try {
    const requestId = req.params.id;
    console.log(`❌ Admin rejecting request ID: ${requestId}`);

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