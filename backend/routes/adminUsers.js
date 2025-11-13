import express from 'express';
import { pool } from '../db.js';
import authenticateToken from '../middleware/auth.js';

const router = express.Router();

// Admin auth middleware
const adminAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
  if (!req.user.isAdmin) {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  next();
};

// GET /api/admin/users - Get all users with stats and details
router.get('/', authenticateToken, adminAuth, async (req, res) => {
  try {
    console.log('👥 [ADMIN USERS] Fetching all users...');
    console.log('👥 [ADMIN USERS] Request from:', req.headers.origin || 'unknown');
    
    // Fetch all users with their details
    // Handle mysql2 pool.query() which returns [rows, fields] format
    let users;
    try {
      // Properly destructure [rows, fields] from pool.query()
      const [rows] = await pool.query(`
        SELECT
          u.user_id as id,
          u.first_name,
          u.last_name,
          u.email,
          u.created_at as joinedDate,
          u.last_login as lastActive,
          u.email_verified,
          u.google_id,
          u.profile_picture_url as profilePicture,
          CASE
            -- New users (created within 1 month) are Active by default
            WHEN u.created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH) THEN 'Active'
            -- Users with recent login (within 1 month) are Active
            WHEN u.last_login IS NOT NULL AND u.last_login >= DATE_SUB(NOW(), INTERVAL 1 MONTH) THEN 'Active'
            -- Users created more than 1 month ago with no login or login more than 1 month ago are Inactive
            -- OR users manually deactivated by admin (last_login set to more than 1 month ago)
            ELSE 'Inactive'
          END as status
        FROM users u
        ORDER BY 
          CASE
            -- New users (created within 1 month) are Active by default
            WHEN u.created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH) THEN 1
            -- Users with recent login (within 1 month) are Active
            WHEN u.last_login IS NOT NULL AND u.last_login >= DATE_SUB(NOW(), INTERVAL 1 MONTH) THEN 1
            -- Users created more than 1 month ago with no login or login more than 1 month ago are Inactive
            -- OR users manually deactivated by admin (last_login set to more than 1 month ago)
            ELSE 2
          END ASC,
          u.created_at DESC
      `);
      
      // rows is already the array of user objects
      users = rows || [];
      
      console.log(`✅ [ADMIN USERS] Found ${users.length} users`);
    } catch (queryError) {
      console.error('❌ [ADMIN USERS] Error fetching users:', queryError);
      throw queryError;
    }

    // Fetch dietary restrictions for each user
    const usersWithDetails = await Promise.all(users.map(async (user) => {
      let restrictions = [];
      let excludedIngredients = [];
      let medicalConditions = [];
      // preferredDiets removed - dietary lifestyle category removed

      // Get user restrictions with category information (matching user profile page logic)
      // Category 1 (Allergy) + Category 2 (Intolerance) = Medical Conditions
      // Dietary Lifestyle removed - no longer needed
      try {
        // Properly destructure [rows, fields] from pool.query()
        const [restrictionsData] = await pool.query(`
          SELECT 
            r.restriction_name,
            rc.category_name,
            ur.status
          FROM user_restrictions ur
          JOIN restrictions r ON ur.restriction_id = r.restriction_id
          JOIN restriction_categories rc ON r.category_id = rc.category_id
          WHERE ur.user_id = ? AND ur.member_id IS NULL AND ur.status = 'active'
        `, [user.id]);
        
        // Organize by category (only medical conditions)
        restrictionsData.forEach(item => {
          if (item.category_name === 'Allergy' || item.category_name === 'Intolerance') {
            // Both Allergy and Intolerance go to Medical Conditions
            medicalConditions.push(item.restriction_name);
          }
          // Dietary Lifestyle category removed - no longer processed
        });
      } catch (err) {
        // Silently handle missing tables (ER_NO_SUCH_TABLE) - expected behavior
        if (err.code === 'ER_NO_SUCH_TABLE' || err.code === '42S02') {
          // Tables don't exist - this is fine
        } else {
          console.log('Note: user_restrictions table query failed, skipping');
        }
      }

      // Try to get excluded ingredients (no longer used for dietary lifestyle)
      try {
        // Properly destructure [rows, fields] from pool.query()
        const [excludedData] = await pool.query(`
          SELECT i.ingredient_name
          FROM user_excluded_ingredients uei
          JOIN ingredients i ON uei.ingredient_id = i.ingredient_id
          WHERE uei.user_id = ? AND uei.member_id IS NULL
        `, [user.id]);
        excludedIngredients = excludedData.map(e => e.ingredient_name);
      } catch (err) {
        // Silently handle missing tables (ER_NO_SUCH_TABLE) - expected behavior
        if (err.code === 'ER_NO_SUCH_TABLE' || err.code === '42S02') {
          excludedIngredients = [];
        } else {
          console.log('Note: excluded_ingredients table query failed, skipping');
        }
      }

      // Fetch user activity stats from database
      let recipesViewed = 0;
      let recipesSaved = 0;
      let ingredientsScanned = 0;
      let lastRecipe = 'N/A';
      let feedbackSubmitted = false;

      // Count recipes viewed (from user_last_opened_recipes table)
      try {
        // Properly destructure [rows, fields] from pool.query()
        const [viewsRows] = await pool.query(`
          SELECT COUNT(DISTINCT recipe_id) as count
          FROM user_last_opened_recipes
          WHERE user_id = ?
        `, [user.id]);
        recipesViewed = viewsRows[0]?.count || 0;
      } catch (err) {
        // Table might not exist, default to 0
        if (err.code !== 'ER_NO_SUCH_TABLE' && err.code !== '42S02') {
          console.log('Note: user_last_opened_recipes table query failed:', err.message);
        }
      }

      // Count recipes saved
      try {
        // Properly destructure [rows, fields] from pool.query()
        const [savedRows] = await pool.query(`
          SELECT COUNT(DISTINCT recipe_id) as count
          FROM user_recipe_interactions
          WHERE user_id = ? AND is_saved = 1
        `, [user.id]);
        recipesSaved = savedRows[0]?.count || 0;
      } catch (err) {
        // Table might not exist, default to 0
        if (err.code !== 'ER_NO_SUCH_TABLE' && err.code !== '42S02') {
          console.log('Note: user_recipe_interactions table query failed:', err.message);
        }
      }

      // Count ingredients scanned
      try {
        // Properly destructure [rows, fields] from pool.query()
        const [scannedRows] = await pool.query(`
          SELECT COUNT(DISTINCT scan_id) as count
          FROM user_scanned_ingredients
          WHERE user_id = ?
        `, [user.id]);
        ingredientsScanned = scannedRows[0]?.count || 0;
      } catch (err) {
        // Table might not exist, default to 0
        if (err.code !== 'ER_NO_SUCH_TABLE' && err.code !== '42S02') {
          console.log('Note: user_scanned_ingredients table query failed:', err.message);
        }
      }

      // Get last opened recipe
      try {
        // Properly destructure [rows, fields] from pool.query()
        const [lastRecipeRows] = await pool.query(`
          SELECT r.recipe_name
          FROM user_last_opened_recipes lor
          INNER JOIN recipes r ON lor.recipe_id = r.recipe_id
          WHERE lor.user_id = ?
          ORDER BY lor.opened_at DESC
          LIMIT 1
        `, [user.id]);
        if (lastRecipeRows.length > 0 && lastRecipeRows[0]?.recipe_name) {
          lastRecipe = lastRecipeRows[0].recipe_name;
        }
      } catch (err) {
        // Table might not exist, default to 'N/A'
        if (err.code !== 'ER_NO_SUCH_TABLE' && err.code !== '42S02') {
          console.log('Note: user_last_opened_recipes table query failed:', err.message);
        }
      }

      // Check if user has submitted feedback
      try {
        // Properly destructure [rows, fields] from pool.query()
        const [feedbackRows] = await pool.query(`
          SELECT COUNT(*) as count
          FROM feedback
          WHERE user_id = ?
        `, [user.id]);
        feedbackSubmitted = (feedbackRows[0]?.count || 0) > 0;
      } catch (err) {
        // Table might not exist, default to false
        if (err.code !== 'ER_NO_SUCH_TABLE' && err.code !== '42S02') {
          console.log('Note: feedback table query failed:', err.message);
        }
      }

      // Format user data
      const username = user.email.split('@')[0];
      const lastActiveText = formatLastActive(user.lastActive);
      const joinedDateText = formatDate(user.joinedDate);

      return {
        id: user.id,
        profilePicture: user.profilePicture || `https://ui-avatars.com/api/?name=${user.first_name}+${user.last_name}&background=2E7D32&color=fff`,
        username: username,
        email: user.google_id ? `${user.email} (Google)` : user.email,
        status: user.status,
        lastActive: lastActiveText,
        joinedDate: joinedDateText,
        restrictions: [], // Not used anymore
        excludedIngredients: excludedIngredients,
        diets: [], // Not used anymore (removed from UI)
        medicalConditions: medicalConditions, // From restrictions with category 'Allergy' or 'Intolerance'
        dietaryLifestyle: [], // Dietary lifestyle removed - no longer needed
        recipesViewed: recipesViewed,
        recipesSaved: recipesSaved,
        ingredientsScanned: ingredientsScanned,
        lastRecipe: lastRecipe,
        feedbackSubmitted: feedbackSubmitted,
        notes: ''
      };
    }));

    // Calculate stats
    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.status === 'Active').length;
    const inactiveUsers = users.filter(u => u.status === 'Inactive').length;

    // Calculate new users (joined in last 7 days)
    // Properly destructure [rows, fields] from pool.query()
    const [newUsersRows] = await pool.query(`
      SELECT COUNT(*) as count
      FROM users
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    `);
    const newUsers = newUsersRows[0]?.count || 0;

    console.log('✅ [ADMIN USERS] Successfully fetched users:', {
      totalUsers,
      activeUsers,
      newUsers,
      inactiveUsers,
      usersWithDetails: usersWithDetails.length
    });
    
    res.json({
      success: true,
      users: usersWithDetails,
      stats: {
        totalUsers,
        activeUsers,
        newUsers,
        inactiveUsers
      }
    });

  } catch (error) {
    console.error('❌ [ADMIN USERS] Error fetching users:', error);
    console.error('❌ [ADMIN USERS] Error details:', {
      message: error.message,
      code: error.code,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage,
      stack: error.stack
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      errorCode: error.code,
      sqlState: error.sqlState,
      hint: process.env.NODE_ENV === 'development' ? 'Check backend logs for details' : undefined
    });
  }
});

// Helper function to format last active time
function formatLastActive(lastLogin) {
  if (!lastLogin) return 'Never';

  const now = new Date();
  const loginDate = new Date(lastLogin);
  const diffMs = now - loginDate;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  if (diffWeeks < 4) return `${diffWeeks} week${diffWeeks > 1 ? 's' : ''} ago`;
  return `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`;
}

// Helper function to format date
function formatDate(date) {
  if (!date) return 'Unknown';

  const d = new Date(date);
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'];

  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

// PUT /api/admin/users/:id/activate - Activate a user
router.put('/:id/activate', authenticateToken, adminAuth, async (req, res) => {
  let connection;
  try {
    const { id } = req.params;

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Check if user exists
    const [userCheck] = await connection.query('SELECT * FROM users WHERE user_id = ?', [id]);
    if (!userCheck || userCheck.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update user's last_login to make them active
    await connection.query('UPDATE users SET last_login = NOW() WHERE user_id = ?', [id]);
    await connection.commit();

    res.json({
      success: true,
      message: 'User activated successfully'
    });

  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('Error activating user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to activate user',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// PUT /api/admin/users/:id/deactivate - Deactivate a user
router.put('/:id/deactivate', authenticateToken, adminAuth, async (req, res) => {
  let connection;
  try {
    const { id } = req.params;

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Check if user exists
    const [userCheck] = await connection.query('SELECT * FROM users WHERE user_id = ?', [id]);
    if (!userCheck || userCheck.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Set last_login to more than 1 month ago to make them inactive (admin manual deactivation)
    await connection.query('UPDATE users SET last_login = DATE_SUB(NOW(), INTERVAL 2 MONTH) WHERE user_id = ?', [id]);
    await connection.commit();

    res.json({
      success: true,
      message: 'User deactivated successfully'
    });

  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('Error deactivating user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to deactivate user',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// Helper function to execute query with retry logic for connection errors
const executeQueryWithRetry = async (connection, query, params = [], maxRetries = 3) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await connection.query(query, params);
    } catch (error) {
      const isConnectionError = 
        error.code === 'ECONNRESET' || 
        error.code === 'PROTOCOL_CONNECTION_LOST' ||
        error.code === 'ETIMEDOUT' ||
        error.message?.includes('Connection lost') ||
        error.message?.includes('timeout');
      
      if (isConnectionError && attempt < maxRetries) {
        const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 3000);
        console.warn(`⚠️ Query connection error (attempt ${attempt}/${maxRetries}), retrying in ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      throw error;
    }
  }
};

// Helper function to get a healthy database connection with retry logic
const getHealthyConnection = async (maxRetries = 3) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const connection = await pool.getConnection();
      
      // Test connection health with a simple query
      try {
        await connection.query('SELECT 1 as health_check');
        console.log(`✅ Database connection healthy (attempt ${attempt})`);
        return connection;
      } catch (healthErr) {
        connection.release();
        throw new Error(`Connection health check failed: ${healthErr.message}`);
      }
    } catch (error) {
      const isConnectionError = 
        error.code === 'ECONNRESET' || 
        error.code === 'PROTOCOL_CONNECTION_LOST' ||
        error.code === 'ETIMEDOUT' ||
        error.code === 'ENOTFOUND' ||
        error.message?.includes('Connection lost') ||
        error.message?.includes('timeout');
      
      if (isConnectionError && attempt < maxRetries) {
        const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Exponential backoff, max 5s
        console.warn(`⚠️ Connection error (attempt ${attempt}/${maxRetries}): ${error.message}. Retrying in ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        // Continue to next iteration
      } else {
        throw error;
      }
    }
  }
};

// DELETE /api/admin/users/:id - Delete a user
router.delete('/:id', authenticateToken, adminAuth, async (req, res) => {
  let connection;
  try {
    const { id } = req.params;

    console.log(`🗑️ [DELETE USER] Starting deletion process for user ID: ${id}`);
    console.log(`🗑️ [DELETE USER] Request received at: ${new Date().toISOString()}`);

    // Get healthy database connection with retry logic (for Aiven connection issues)
    try {
      console.log(`🔌 [DELETE USER] Attempting to get healthy database connection...`);
      connection = await getHealthyConnection();
      console.log(`✅ [DELETE USER] Database connection established successfully`);
    } catch (connError) {
      console.error(`❌ [DELETE USER] Failed to establish database connection after retries:`, connError);
      return res.status(503).json({
        success: false,
        message: 'Database connection error. Please try again. If the problem persists, contact the administrator.',
        error: process.env.NODE_ENV === 'development' ? connError.message : 'Database connection error',
        errorCode: connError.code,
        isConnectionError: true
      });
    }
    
    // Set transaction timeout (30 seconds for Aiven)
    try {
      await connection.query('SET SESSION innodb_lock_wait_timeout = 30');
      await connection.query('SET SESSION lock_wait_timeout = 30');
      console.log(`✅ [DELETE USER] Transaction timeouts configured`);
    } catch (timeoutErr) {
      console.warn(`⚠️ [DELETE USER] Failed to set transaction timeouts:`, timeoutErr.message);
      // Continue anyway - this is not critical
    }
    
    try {
      await connection.beginTransaction();
      console.log(`✅ [DELETE USER] Transaction started`);
    } catch (txErr) {
      console.error(`❌ [DELETE USER] Failed to start transaction:`, txErr);
      connection.release();
      return res.status(503).json({
        success: false,
        message: 'Database transaction error. Please try again.',
        error: process.env.NODE_ENV === 'development' ? txErr.message : 'Transaction error',
        errorCode: txErr.code,
        isConnectionError: true
      });
    }

    // Check if user exists
    const [userCheckRows] = await connection.query('SELECT * FROM users WHERE user_id = ?', [id]);
    if (!userCheckRows || userCheckRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log(`✅ User found: ${userCheckRows[0].email}`);

    // Delete related data first (foreign key constraints) - wrapped in try-catch to handle missing tables
    // NOTE: feedback_replies references feedback_id, not user_id directly, so we delete feedback_replies BEFORE feedback
    // NOTE: user_restrictions MUST be deleted before users (has foreign key constraint)
    // NOTE: user_members MUST be deleted before users (has foreign key constraint)
    const tablesToClean = [
      'pending_requests',  // ⚠️ IMPORTANT: Must be first due to foreign key constraints
      'notifications',  // 🆕 Added: Delete user notifications (has CASCADE but manual delete is safer)
      'user_scanned_ingredients',
      'user_recipe_interactions',  // ✅ FIX: Delete recipe interactions (favorites, ratings, etc.) - has FK to users
      'user_last_opened_recipes',  // ✅ FIX: Delete last opened recipes - has FK to users
      'user_members',  // 🆕 CRITICAL: Delete family members (has foreign key constraint)
      'user_restrictions',  // ⚠️ CRITICAL: Must be deleted before users (has foreign key constraint)
      'user_dietary_restrictions',
      'user_excluded_ingredients', 
      'user_preferred_diets',
      'user_medical_conditions',
      'user_saved_recipes',
      'user_pantry_selections',
      'feedback'  // Delete feedback after feedback_replies (which references feedback_id)
    ];
    
    // ✅ FIX: Try to discover tables with FK constraints automatically
    // This is optional - if it fails, we'll continue with the manual list
    try {
      const [fkTables] = await connection.query(`
        SELECT DISTINCT TABLE_NAME 
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
        WHERE REFERENCED_TABLE_NAME = 'users' 
        AND TABLE_SCHEMA = DATABASE()
      `);
      
      if (fkTables && fkTables.length > 0) {
        const allUserTables = fkTables.map(row => row.TABLE_NAME);
        const missingTables = allUserTables.filter(table => 
          !tablesToClean.includes(table) && 
          table !== 'users' && 
          !table.includes('feedback_replies') // feedback_replies is handled separately
        );
        
        if (missingTables.length > 0) {
          console.warn(`⚠️ [DELETE USER] WARNING: Found ${missingTables.length} table(s) with FK to users that are NOT in cleanup list:`, missingTables);
          console.warn(`⚠️ [DELETE USER] Automatically cleaning these tables to prevent FK constraint errors...`);
          
          // ✅ FIX: Automatically delete from missing tables before proceeding
          for (const missingTable of missingTables) {
            try {
              console.log(`  🔧 [DELETE USER] Cleaning missing table: ${missingTable}...`);
              const [deleteResult] = await connection.query(
                `DELETE FROM ${missingTable} WHERE user_id = ?`,
                [id]
              );
              const affectedRows = deleteResult?.affectedRows || 0;
              if (affectedRows > 0) {
                console.log(`  ✅ [DELETE USER] Cleaned ${missingTable}: ${affectedRows} row(s) deleted`);
              }
            } catch (missingTableErr) {
              if (missingTableErr.code === 'ER_NO_SUCH_TABLE' || missingTableErr.code === '42S02') {
                console.log(`  ⚠️ [DELETE USER] Table ${missingTable} doesn't exist, skipping`);
              } else {
                console.warn(`  ⚠️ [DELETE USER] Could not clean ${missingTable}:`, missingTableErr.message);
              }
            }
          }
        }
      }
    } catch (fkErr) {
      console.warn(`⚠️ [DELETE USER] Could not query FK constraints (non-critical):`, fkErr.message);
      // Continue with manual cleanup list
    }
    
    // Track any critical errors during cleanup
    let criticalError = null;
    
    // Delete feedback_replies FIRST (references feedback_id, not user_id directly)
    // We need to delete feedback_replies for all feedback entries of this user BEFORE deleting feedback
    try {
      const [feedbackIds] = await connection.query(
        'SELECT feedback_id FROM feedback WHERE user_id = ?',
        [id]
      );
      if (feedbackIds && feedbackIds.length > 0) {
        const feedbackIdList = feedbackIds.map(f => f.feedback_id);
        const placeholders = feedbackIdList.map(() => '?').join(',');
        const [deleteRepliesResult] = await connection.query(
          `DELETE FROM feedback_replies WHERE feedback_id IN (${placeholders})`,
          feedbackIdList
        );
        const affectedRows = deleteRepliesResult?.affectedRows || (Array.isArray(deleteRepliesResult) ? deleteRepliesResult.length : 0);
        console.log(`  ✓ Cleaned feedback_replies: ${affectedRows} rows deleted`);
      }
    } catch (err) {
      if (err.code === 'ER_NO_SUCH_TABLE' || err.code === '42S02') {
        console.log(`  ⚠️ Table feedback_replies doesn't exist, skipping`);
      } else if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.code === '23000' || err.sqlState === '23000') {
        console.error(`  ❌ Foreign key constraint error in feedback_replies:`, err.message);
        criticalError = `Cannot delete user: feedback_replies has foreign key constraints. ${err.message}`;
      } else {
        console.log(`  ⚠️ Skipped feedback_replies: ${err.message}`);
      }
    }
    
    // 🆕 CRITICAL: Explicitly delete user_members FIRST (before other tables)
    // This table has a foreign key constraint to users and MUST be deleted before users
    // Also delete member-related restrictions and ingredients
    try {
      console.log(`  🔍 Attempting to clean user_members (CRITICAL - has FK constraint)...`);
      
      // First, get all member_ids for this user
      const [memberRows] = await connection.query(
        'SELECT member_id FROM user_members WHERE user_id = ?',
        [id]
      );
      
      if (memberRows && memberRows.length > 0) {
        const memberIds = memberRows.map(m => m.member_id);
        const memberPlaceholders = memberIds.map(() => '?').join(',');
        
        // Delete member-related restrictions
        try {
          await connection.query(
            `DELETE FROM user_restrictions WHERE member_id IN (${memberPlaceholders})`,
            memberIds
          );
          console.log(`  ✓ Cleaned user_restrictions for ${memberIds.length} members`);
        } catch (memberRestErr) {
          console.log(`  ⚠️ Could not delete member restrictions: ${memberRestErr.message}`);
        }
        
        // Delete member-related excluded ingredients
        try {
          await connection.query(
            `DELETE FROM user_excluded_ingredients WHERE member_id IN (${memberPlaceholders})`,
            memberIds
          );
          console.log(`  ✓ Cleaned user_excluded_ingredients for ${memberIds.length} members`);
        } catch (memberIngErr) {
          console.log(`  ⚠️ Could not delete member ingredients: ${memberIngErr.message}`);
        }
      }
      
      // Now delete the members themselves
      const [deleteMembersResult] = await connection.query(
        'DELETE FROM user_members WHERE user_id = ?',
        [id]
      );
      const affectedRows = deleteMembersResult?.affectedRows || (Array.isArray(deleteMembersResult) ? deleteMembersResult.length : 0);
      console.log(`  ✓ Cleaned user_members: ${affectedRows} rows deleted`);
    } catch (err) {
      if (err.code === 'ER_NO_SUCH_TABLE' || err.code === '42S02') {
        console.log(`  ⚠️ Table user_members doesn't exist, skipping`);
      } else if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.code === '23000' || err.sqlState === '23000') {
        console.error(`  ❌ CRITICAL: Foreign key constraint error in user_members:`, err.message);
        criticalError = `Cannot delete user: user_members has foreign key constraints. ${err.message}`;
      } else {
        console.error(`  ❌ Error deleting user_members:`, err.message);
      }
    }
    
    // 🆕 CRITICAL: Explicitly delete user_restrictions FIRST (before other tables)
    // This table has a foreign key constraint to users and MUST be deleted before users
    // Based on best practices: Delete child records before parent to prevent FK constraint violations
    try {
      console.log(`  🔍 Attempting to clean user_restrictions (CRITICAL - has FK constraint)...`);
      const [deleteRestrictionsResult] = await connection.query(
        'DELETE FROM user_restrictions WHERE user_id = ?',
        [id]
      );
      const affectedRows = deleteRestrictionsResult?.affectedRows || (Array.isArray(deleteRestrictionsResult) ? deleteRestrictionsResult.length : 0);
      console.log(`  ✓ Cleaned user_restrictions: ${affectedRows} rows deleted`);
    } catch (err) {
      if (err.code === 'ER_NO_SUCH_TABLE' || err.code === '42S02') {
        console.log(`  ⚠️ Table user_restrictions doesn't exist, skipping`);
      } else if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.code === '23000' || err.sqlState === '23000') {
        console.error(`  ❌ CRITICAL: Foreign key constraint error in user_restrictions:`, err.message);
        criticalError = `Cannot delete user: user_restrictions has foreign key constraints. ${err.message}`;
      } else {
        console.error(`  ❌ Error deleting user_restrictions:`, err.message);
        // For non-FK errors, don't set criticalError but log it
        // This allows the loop to continue and try other tables
      }
    }
    
    // If we already have a critical error from user_members or user_restrictions, skip the loop
    if (criticalError) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: criticalError
      });
    }
    
    // Clean up all other tables in order (excluding user_members and user_restrictions since we already handled them)
    const tablesToCleanFiltered = tablesToClean.filter(table => table !== 'user_members' && table !== 'user_restrictions');
    
    for (const table of tablesToCleanFiltered) {
      try {
        console.log(`  🔍 Attempting to clean ${table}...`);
        const [deleteResult] = await connection.query(`DELETE FROM ${table} WHERE user_id = ?`, [id]);
        // DELETE queries return result object with affectedRows property
        const affectedRows = deleteResult?.affectedRows || (Array.isArray(deleteResult) ? deleteResult.length : 0);
        console.log(`  ✓ Cleaned ${table}: ${affectedRows} rows deleted`);
      } catch (err) {
        // Check for foreign key constraint errors (these are critical)
        if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.code === '23000' || err.sqlState === '23000') {
          console.error(`  ❌ Foreign key constraint error in ${table}:`, err.message);
          criticalError = `Cannot delete user: ${table} has foreign key constraints. ${err.message}`;
          // Don't continue - this is a critical error
          break;
        }
        // Table might not exist or no data - continue
        if (err.code === 'ER_NO_SUCH_TABLE' || err.code === '42S02') {
          console.log(`  ⚠️ Table ${table} doesn't exist, skipping`);
        } else {
          console.log(`  ⚠️ Skipped ${table}: ${err.message}`);
        }
        // Don't throw - continue with other tables for non-critical errors
      }
    }
    
    // If we encountered a critical error, rollback and return
    if (criticalError) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: criticalError
      });
    }
    
    // 🆕 VERIFICATION: Double-check that user_restrictions is empty before deleting user
    // This prevents the foreign key constraint error from becoming a loop
    try {
      const [checkRestrictions] = await connection.query(
        'SELECT COUNT(*) as count FROM user_restrictions WHERE user_id = ?',
        [id]
      );
      const restrictionCount = checkRestrictions[0]?.count || 0;
      
      if (restrictionCount > 0) {
        console.warn(`  ⚠️ Warning: user_restrictions still has ${restrictionCount} rows. Attempting to delete again...`);
        // Try to delete again
        const [retryDelete] = await connection.query(
          'DELETE FROM user_restrictions WHERE user_id = ?',
          [id]
        );
        const retryAffected = retryDelete?.affectedRows || (Array.isArray(retryDelete) ? retryDelete.length : 0);
        console.log(`  ✓ Retry deleted ${retryAffected} rows from user_restrictions`);
        
        // Check again
        const [checkAgain] = await connection.query(
          'SELECT COUNT(*) as count FROM user_restrictions WHERE user_id = ?',
          [id]
        );
        const finalCount = checkAgain[0]?.count || 0;
        
        if (finalCount > 0) {
          await connection.rollback();
          return res.status(400).json({
            success: false,
            message: `Cannot delete user: user_restrictions table still has ${finalCount} row(s) referencing this user. Please check database constraints.`
          });
        }
      }
    } catch (checkErr) {
      if (checkErr.code === 'ER_NO_SUCH_TABLE' || checkErr.code === '42S02') {
        // Table doesn't exist, that's fine
        console.log(`  ℹ️ user_restrictions table doesn't exist, skipping verification`);
      } else {
        console.warn(`  ⚠️ Warning: Could not verify user_restrictions deletion:`, checkErr.message);
        // Continue anyway - the delete might have worked
      }
    }
    
    // Delete the user
    try {
      console.log(`  🔍 Attempting to delete user from users table...`);
      const [deleteUserResult] = await connection.query(
        'DELETE FROM users WHERE user_id = ?', 
        [id]
      );
      const userDeleted = deleteUserResult?.affectedRows || (Array.isArray(deleteUserResult) ? deleteUserResult.length : 0);
      if (userDeleted === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: 'User not found or already deleted'
        });
      }
      console.log(`✅ User deleted successfully`);
    } catch (deleteErr) {
      // Check for foreign key constraint errors when deleting user
      if (deleteErr.code === 'ER_ROW_IS_REFERENCED_2' || deleteErr.code === '23000' || deleteErr.sqlState === '23000') {
        // 🆕 Provide helpful error message with solution
        const errorMessage = deleteErr.sqlMessage || deleteErr.message;
        // Try multiple patterns to extract table name from MySQL error
        const tableMatch = errorMessage.match(/`(\w+)`/) || 
                          errorMessage.match(/table ['"]?(\w+)['"]?/i) ||
                          errorMessage.match(/REFERENCES `(\w+)`/i);
        const tableName = tableMatch ? tableMatch[1] : 'unknown table';
        
        console.error(`❌ [DELETE USER] Foreign key constraint violation:`, {
          tableName,
          errorMessage,
          sqlMessage: deleteErr.sqlMessage,
          code: deleteErr.code,
          sqlState: deleteErr.sqlState
        });
        
        // ✅ FIX: Try to manually delete from the problematic table before rolling back
        if (tableName && tableName !== 'unknown table' && tableName !== 'users') {
          try {
            console.log(`🔧 [DELETE USER] Attempting to manually delete from ${tableName}...`);
            const [manualDelete] = await connection.query(
              `DELETE FROM ${tableName} WHERE user_id = ?`,
              [id]
            );
            const manualAffected = manualDelete?.affectedRows || 0;
            console.log(`✅ [DELETE USER] Manually deleted ${manualAffected} row(s) from ${tableName}`);
            
            // Try deleting user again
            try {
              const [retryDelete] = await connection.query(
                'DELETE FROM users WHERE user_id = ?',
                [id]
              );
              const retryAffected = retryDelete?.affectedRows || 0;
              if (retryAffected > 0) {
                await connection.commit();
                console.log(`✅ [DELETE USER] User deleted successfully after cleaning ${tableName} table`);
                return res.json({
                  success: true,
                  message: `User deleted successfully after cleaning ${tableName} table`
                });
              }
            } catch (retryErr) {
              console.error(`❌ [DELETE USER] Retry delete failed:`, retryErr.message);
            }
          } catch (manualErr) {
            console.error(`❌ [DELETE USER] Failed to manually delete from ${tableName}:`, manualErr.message);
          }
        }
        
        // Rollback transaction if we couldn't fix it
        await connection.rollback();
        
        return res.status(400).json({
          success: false,
          message: `Cannot delete user: User is still referenced by ${tableName}. Please ensure all related records are deleted first.`,
          error: process.env.NODE_ENV === 'development' ? deleteErr.message : 'Foreign key constraint violation',
          hint: `The ${tableName} table still has records referencing this user. This usually means the table needs to be added to the cleanup list or the deletion order needs to be adjusted.`,
          tableName: tableName
        });
      }
      // Re-throw other errors to be caught by outer catch
      throw deleteErr;
    }

    // Commit transaction
    await connection.commit();

    res.json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    // Rollback transaction on error
    if (connection) {
      try {
        await connection.rollback();
        console.log('✅ Transaction rolled back successfully');
      } catch (rollbackErr) {
        console.error('❌ Error during rollback:', rollbackErr.message);
      }
    }
    
    console.error('❌ Error deleting user:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage,
      stack: error.stack
    });
    
    // Check for connection-related errors (common with Aiven)
    const isConnectionError = 
      error.code === 'ECONNRESET' || 
      error.code === 'PROTOCOL_CONNECTION_LOST' ||
      error.code === 'ETIMEDOUT' ||
      error.code === 'ENOTFOUND' ||
      error.code === 'ECONNREFUSED' ||
      error.message?.includes('Connection lost') ||
      error.message?.includes('timeout') ||
      error.message?.includes('Connection closed');
    
    // Provide more specific error messages
    let errorMessage = 'Failed to delete user';
    let statusCode = 500;
    
    if (isConnectionError) {
      errorMessage = 'Database connection error. Please try again. If the problem persists, contact the administrator.';
      statusCode = 503; // Service Unavailable
      console.error('🔌 Connection error detected - this may be an Aiven database connectivity issue');
    } else if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.code === '23000' || error.sqlState === '23000') {
      errorMessage = 'Cannot delete user: User is still referenced by other records. Please check related data.';
      statusCode = 400;
    } else if (error.code === 'ER_NO_SUCH_TABLE' || error.code === '42S02') {
      errorMessage = 'Database table missing. Please contact administrator.';
      statusCode = 500;
    } else if (error.code === 'ER_LOCK_WAIT_TIMEOUT' || error.code === 'ER_LOCK_DEADLOCK') {
      errorMessage = 'Database lock timeout. Please try again in a moment.';
      statusCode = 503;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    res.status(statusCode).json({
      success: false,
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : (isConnectionError ? 'Database connection error' : 'Internal server error'),
      errorCode: error.code,
      sqlState: error.sqlState,
      isConnectionError: isConnectionError
    });
  } finally {
    // Release connection safely
    if (connection) {
      try {
        connection.release();
        console.log('✅ Database connection released');
      } catch (releaseErr) {
        console.error('❌ Error releasing connection:', releaseErr.message);
      }
    }
  }
});

// ========================================
// BULK OPERATIONS
// ========================================

// POST /api/admin/users/bulk/message - Send message to multiple users
router.post('/bulk/message', authenticateToken, adminAuth, async (req, res) => {
  let connection;
  try {
    const { userIds, message } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'User IDs array is required'
      });
    }

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Validate that all users exist
    const placeholders = userIds.map(() => '?').join(',');
    const [usersCheck] = await connection.query(
      `SELECT user_id FROM users WHERE user_id IN (${placeholders})`,
      userIds
    );

    if (usersCheck.length !== userIds.length) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'Some users not found'
      });
    }

    // Insert notifications for each user
    // Handle case where notifications table might not exist
    try {
      console.log(`📝 Creating notifications for ${userIds.length} user(s)...`);
      const notificationValues = userIds.map(userId => [
        userId,
        'Admin Message',
        message.trim(),
        'admin', // notification_type enum: 'admin', 'system', 'update', 'reminder', 'feedback_reply'
        0, // is_read
        'Admin', // sender_name
        'ADMIN' // sender_role
      ]);
      
      const [insertResult] = await connection.query(
        `INSERT INTO notifications (user_id, title, message, notification_type, is_read, sender_name, sender_role) VALUES ?`,
        [notificationValues]
      );
      
      console.log(`  ✅ Created ${insertResult.affectedRows || userIds.length} notifications successfully`);
      console.log(`  📋 Notification details:`, {
        title: 'Admin Message',
        messageLength: message.trim().length,
        type: 'admin',
        recipientCount: userIds.length
      });
    } catch (notifError) {
      if (notifError.code === 'ER_NO_SUCH_TABLE' || notifError.code === '42S02') {
        console.warn(`  ⚠️ Notifications table doesn't exist, skipping notification creation`);
        console.warn(`  💡 To enable notifications, create the notifications table in your database`);
        // Continue without notifications - this is not critical
      } else {
        console.error(`  ❌ Error creating notifications:`, notifError.message);
        throw notifError;
      }
    }

    await connection.commit();

    console.log(`✅ [BULK MESSAGE] Sent message to ${userIds.length} users`);

    res.json({
      success: true,
      message: `Message sent to ${userIds.length} user(s) successfully`,
      count: userIds.length
    });

  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('❌ [BULK MESSAGE] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send bulk message',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// POST /api/admin/users/bulk/reminder - Send reminder to inactive users
router.post('/bulk/reminder', authenticateToken, adminAuth, async (req, res) => {
  let connection;
  try {
    const { userIds } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'User IDs array is required'
      });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Get inactive users from the provided list
    const placeholders = userIds.map(() => '?').join(',');
    const [inactiveUsers] = await connection.query(
      `SELECT user_id FROM users 
       WHERE user_id IN (${placeholders}) 
       AND (last_login < DATE_SUB(NOW(), INTERVAL 7 DAY) OR last_login IS NULL)`,
      userIds
    );

    if (inactiveUsers.length === 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'No inactive users found in the selected list'
      });
    }

    const inactiveUserIds = inactiveUsers.map(u => u.user_id);
    const reminderMessage = 'We noticed you haven\'t been active recently. Come back and discover new recipes!';

    // Insert notifications for inactive users
    // Handle case where notifications table might not exist
    try {
      const notificationValues = inactiveUserIds.map(userId => [
        userId,
        'Activity Reminder',
        reminderMessage,
        'reminder', // notification_type enum: 'admin', 'system', 'update', 'reminder', 'feedback_reply'
        0, // is_read
        'Admin', // sender_name
        'ADMIN' // sender_role
      ]);

      await connection.query(
        `INSERT INTO notifications (user_id, title, message, notification_type, is_read, sender_name, sender_role) VALUES ?`,
        [notificationValues]
      );
      console.log(`  ✓ Created ${inactiveUserIds.length} reminder notifications`);
    } catch (notifError) {
      if (notifError.code === 'ER_NO_SUCH_TABLE' || notifError.code === '42S02') {
        console.warn(`  ⚠️ Notifications table doesn't exist, skipping notification creation`);
        // Continue without notifications - this is not critical
      } else {
        throw notifError;
      }
    }

    await connection.commit();

    console.log(`✅ [BULK REMINDER] Sent reminders to ${inactiveUserIds.length} inactive users`);

    res.json({
      success: true,
      message: `Reminders sent to ${inactiveUserIds.length} inactive user(s)`,
      count: inactiveUserIds.length,
      totalSelected: userIds.length
    });

  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('❌ [BULK REMINDER] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send bulk reminders',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// PUT /api/admin/users/bulk/deactivate - Deactivate multiple users
router.put('/bulk/deactivate', authenticateToken, adminAuth, async (req, res) => {
  let connection;
  try {
    const { userIds } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'User IDs array is required'
      });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Validate that all users exist
    const placeholders = userIds.map(() => '?').join(',');
    const [usersCheck] = await connection.query(
      `SELECT user_id FROM users WHERE user_id IN (${placeholders})`,
      userIds
    );

    if (usersCheck.length !== userIds.length) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'Some users not found'
      });
    }

    // Set last_login to more than 1 month ago to make them inactive (admin manual deactivation)
    await connection.query(
      `UPDATE users SET last_login = DATE_SUB(NOW(), INTERVAL 2 MONTH) WHERE user_id IN (${placeholders})`,
      userIds
    );

    await connection.commit();

    console.log(`✅ [BULK DEACTIVATE] Deactivated ${userIds.length} users`);

    res.json({
      success: true,
      message: `${userIds.length} user(s) deactivated successfully`,
      count: userIds.length
    });

  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('❌ [BULK DEACTIVATE] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to deactivate users',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// DELETE /api/admin/users/bulk/delete - Delete multiple users
router.delete('/bulk/delete', authenticateToken, adminAuth, async (req, res) => {
  let connection;
  try {
    const { userIds } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'User IDs array is required'
      });
    }

    console.log(`🗑️ [BULK DELETE] Starting bulk deletion for ${userIds.length} users`);

    // Get healthy database connection
    try {
      connection = await getHealthyConnection();
    } catch (connError) {
      return res.status(503).json({
        success: false,
        message: 'Database connection error. Please try again.',
        error: process.env.NODE_ENV === 'development' ? connError.message : 'Database connection error',
        isConnectionError: true
      });
    }

    // Set transaction timeout
    try {
      await connection.query('SET SESSION innodb_lock_wait_timeout = 30');
      await connection.query('SET SESSION lock_wait_timeout = 30');
    } catch (timeoutErr) {
      console.warn(`⚠️ [BULK DELETE] Failed to set transaction timeouts:`, timeoutErr.message);
    }

    await connection.beginTransaction();

    // Validate that all users exist
    const placeholders = userIds.map(() => '?').join(',');
    const [usersCheck] = await connection.query(
      `SELECT user_id FROM users WHERE user_id IN (${placeholders})`,
      userIds
    );

    if (usersCheck.length !== userIds.length) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'Some users not found'
      });
    }

    // Delete related data for all users in batch
    // NOTE: user_members and user_restrictions are handled separately due to FK constraints
    const tablesToClean = [
      'pending_requests',
      'notifications',
      'user_scanned_ingredients',
      'user_recipe_interactions',  // ✅ FIX: Delete recipe interactions (favorites, ratings, etc.) - has FK to users
      'user_last_opened_recipes',  // ✅ FIX: Delete last opened recipes - has FK to users
      'user_dietary_restrictions',
      'user_excluded_ingredients',
      'user_preferred_diets',
      'user_medical_conditions',
      'user_saved_recipes',
      'user_pantry_selections'
    ];

    // Delete feedback_replies first (references feedback_id)
    try {
      const [feedbackIds] = await connection.query(
        `SELECT feedback_id FROM feedback WHERE user_id IN (${placeholders})`,
        userIds
      );
      if (feedbackIds && feedbackIds.length > 0) {
        const feedbackIdList = feedbackIds.map(f => f.feedback_id);
        const feedbackPlaceholders = feedbackIdList.map(() => '?').join(',');
        await connection.query(
          `DELETE FROM feedback_replies WHERE feedback_id IN (${feedbackPlaceholders})`,
          feedbackIdList
        );
        console.log(`  ✓ Cleaned feedback_replies: ${feedbackIds.length} feedback entries`);
      }
    } catch (err) {
      if (err.code !== 'ER_NO_SUCH_TABLE' && err.code !== '42S02') {
        console.warn(`  ⚠️ Skipped feedback_replies: ${err.message}`);
      }
    }

    // Delete user_members first (has FK constraint) - also delete member-related data
    try {
      // First, get all member_ids for these users
      const [memberRows] = await connection.query(
        `SELECT member_id FROM user_members WHERE user_id IN (${placeholders})`,
        userIds
      );
      
      if (memberRows && memberRows.length > 0) {
        const memberIds = memberRows.map(m => m.member_id);
        const memberPlaceholders = memberIds.map(() => '?').join(',');
        
        // Delete member-related restrictions
        try {
          await connection.query(
            `DELETE FROM user_restrictions WHERE member_id IN (${memberPlaceholders})`,
            memberIds
          );
          console.log(`  ✓ Cleaned user_restrictions for ${memberIds.length} members`);
        } catch (memberRestErr) {
          console.log(`  ⚠️ Could not delete member restrictions: ${memberRestErr.message}`);
        }
        
        // Delete member-related excluded ingredients
        try {
          await connection.query(
            `DELETE FROM user_excluded_ingredients WHERE member_id IN (${memberPlaceholders})`,
            memberIds
          );
          console.log(`  ✓ Cleaned user_excluded_ingredients for ${memberIds.length} members`);
        } catch (memberIngErr) {
          console.log(`  ⚠️ Could not delete member ingredients: ${memberIngErr.message}`);
        }
      }
      
      // Now delete the members themselves
      await connection.query(
        `DELETE FROM user_members WHERE user_id IN (${placeholders})`,
        userIds
      );
      console.log(`  ✓ Cleaned user_members`);
    } catch (err) {
      if (err.code !== 'ER_NO_SUCH_TABLE' && err.code !== '42S02') {
        console.warn(`  ⚠️ Skipped user_members: ${err.message}`);
      }
    }

    // Delete user_restrictions (has FK constraint)
    try {
      await connection.query(
        `DELETE FROM user_restrictions WHERE user_id IN (${placeholders})`,
        userIds
      );
      console.log(`  ✓ Cleaned user_restrictions`);
    } catch (err) {
      if (err.code !== 'ER_NO_SUCH_TABLE' && err.code !== '42S02') {
        console.warn(`  ⚠️ Skipped user_restrictions: ${err.message}`);
      }
    }

    // Delete other tables
    for (const table of tablesToClean) {
      try {
        await connection.query(
          `DELETE FROM ${table} WHERE user_id IN (${placeholders})`,
          userIds
        );
        console.log(`  ✓ Cleaned ${table}`);
      } catch (err) {
        if (err.code === 'ER_NO_SUCH_TABLE' || err.code === '42S02') {
          // Table doesn't exist - continue
        } else {
          console.warn(`  ⚠️ Skipped ${table}: ${err.message}`);
        }
      }
    }

    // Delete feedback
    try {
      await connection.query(
        `DELETE FROM feedback WHERE user_id IN (${placeholders})`,
        userIds
      );
      console.log(`  ✓ Cleaned feedback`);
    } catch (err) {
      if (err.code !== 'ER_NO_SUCH_TABLE' && err.code !== '42S02') {
        console.warn(`  ⚠️ Skipped feedback: ${err.message}`);
      }
    }

    // Delete users
    const [deleteResult] = await connection.query(
      `DELETE FROM users WHERE user_id IN (${placeholders})`,
      userIds
    );

    const deletedCount = deleteResult?.affectedRows || 0;

    if (deletedCount === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'No users were deleted'
      });
    }

    await connection.commit();

    console.log(`✅ [BULK DELETE] Deleted ${deletedCount} users successfully`);

    res.json({
      success: true,
      message: `${deletedCount} user(s) deleted successfully`,
      count: deletedCount
    });

  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackErr) {
        console.error('❌ [BULK DELETE] Error during rollback:', rollbackErr);
      }
    }

    console.error('❌ [BULK DELETE] Error:', error);

    const isConnectionError = 
      error.code === 'ECONNRESET' || 
      error.code === 'PROTOCOL_CONNECTION_LOST' ||
      error.code === 'ETIMEDOUT' ||
      error.code === 'ENOTFOUND' ||
      error.code === 'ECONNREFUSED' ||
      error.message?.includes('Connection lost') ||
      error.message?.includes('timeout');

    res.status(isConnectionError ? 503 : 500).json({
      success: false,
      message: isConnectionError 
        ? 'Database connection error. Please try again.' 
        : 'Failed to delete users',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      isConnectionError
    });
  } finally {
    if (connection) {
      try {
        connection.release();
      } catch (releaseErr) {
        console.error('❌ [BULK DELETE] Error releasing connection:', releaseErr);
      }
    }
  }
});

// POST /api/admin/users/:id/notes - Save admin notes and send as notification
router.post('/:id/notes', authenticateToken, adminAuth, async (req, res) => {
  let connection;
  try {
    const { id } = req.params;
    const { notes } = req.body;

    if (!notes || typeof notes !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Notes are required'
      });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Check if user exists
    const [userCheck] = await connection.query('SELECT user_id, email FROM users WHERE user_id = ?', [id]);
    if (!userCheck || userCheck.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // TODO: If you have an admin_notes table, save the notes here
    // For now, we'll just send it as a notification

    // Create notification for the user
    try {
      await connection.query(
        `INSERT INTO notifications (user_id, title, message, notification_type, is_read, sender_name, sender_role) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          'Admin Note',
          notes.trim(),
          'admin',
          0,
          'Admin',
          'ADMIN'
        ]
      );
      console.log(`  ✓ Created notification for user ${id}`);
    } catch (notifError) {
      if (notifError.code === 'ER_NO_SUCH_TABLE' || notifError.code === '42S02') {
        console.warn(`  ⚠️ Notifications table doesn't exist, skipping notification creation`);
        // Continue without notifications - this is not critical
      } else {
        throw notifError;
      }
    }

    await connection.commit();

    console.log(`✅ [ADMIN NOTES] Saved notes and sent notification to user ${id}`);

    res.json({
      success: true,
      message: 'Notes saved and notification sent successfully',
      userId: id
    });

  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('❌ [ADMIN NOTES] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save notes',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

export default router;
