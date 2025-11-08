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
    // Fetch all users with their details
    const users = await pool.query(`
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
          WHEN u.last_login >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 'Active'
          ELSE 'Inactive'
        END as status
      FROM users u
      ORDER BY u.created_at DESC
    `);

    // Fetch dietary restrictions for each user
    const usersWithDetails = await Promise.all(users.map(async (user) => {
      let restrictions = [];
      let excludedIngredients = [];
      let preferredDiets = [];
      let medicalConditions = [];

      // Try to get dietary restrictions (wrapped in try-catch in case tables don't exist)
      try {
        restrictions = await pool.query(`
          SELECT dr.restriction_name
          FROM user_dietary_restrictions udr
          JOIN dietary_restrictions dr ON udr.restriction_id = dr.restriction_id
          WHERE udr.user_id = ?
        `, [user.id]);
      } catch (err) {
        // Silently handle missing tables (ER_NO_SUCH_TABLE) - expected behavior
        if (err.code === 'ER_NO_SUCH_TABLE' || err.code === '42S02') {
          restrictions = [];
        } else {
          console.log('Note: dietary_restrictions table query failed, skipping');
        }
      }

      // Try to get excluded ingredients
      try {
        excludedIngredients = await pool.query(`
          SELECT i.ingredient_name
          FROM user_excluded_ingredients uei
          JOIN ingredients i ON uei.ingredient_id = i.ingredient_id
          WHERE uei.user_id = ?
        `, [user.id]);
      } catch (err) {
        // Silently handle missing tables (ER_NO_SUCH_TABLE) - expected behavior
        if (err.code === 'ER_NO_SUCH_TABLE' || err.code === '42S02') {
          excludedIngredients = [];
        } else {
          console.log('Note: excluded_ingredients table query failed, skipping');
        }
      }

      // Try to get preferred diets
      try {
        preferredDiets = await pool.query(`
          SELECT pd.diet_name
          FROM user_preferred_diets upd
          JOIN preferred_diets pd ON upd.diet_id = pd.diet_id
          WHERE upd.user_id = ?
        `, [user.id]);
      } catch (err) {
        // Silently handle missing tables (ER_NO_SUCH_TABLE) - expected behavior
        if (err.code === 'ER_NO_SUCH_TABLE' || err.code === '42S02') {
          preferredDiets = [];
        } else {
          console.log('Note: preferred_diets table query failed, skipping');
        }
      }

      // Try to get medical conditions
      try {
        medicalConditions = await pool.query(`
          SELECT mc.condition_name
          FROM user_medical_conditions umc
          JOIN medical_conditions mc ON umc.condition_id = mc.condition_id
          WHERE umc.user_id = ?
        `, [user.id]);
      } catch (err) {
        // Silently handle missing tables (ER_NO_SUCH_TABLE) - expected behavior
        if (err.code === 'ER_NO_SUCH_TABLE' || err.code === '42S02') {
          // Table doesn't exist - this is fine, just skip it
          medicalConditions = [];
        } else {
          // Only log unexpected errors
          console.log('Note: medical_conditions table query failed, skipping');
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
        restrictions: restrictions.map(r => r.restriction_name),
        excludedIngredients: excludedIngredients.map(e => e.ingredient_name),
        diets: preferredDiets.map(d => d.diet_name),
        medicalConditions: medicalConditions.map(m => m.condition_name),
        recipesViewed: 0, // TODO: Implement if recipe views are tracked
        recipesSaved: 0, // TODO: Implement if saved recipes are tracked
        ingredientsScanned: 0, // TODO: Implement if ingredient scans are tracked
        lastRecipe: 'N/A', // TODO: Implement if last recipe is tracked
        feedbackSubmitted: false, // TODO: Check feedback table
        notes: ''
      };
    }));

    // Calculate stats
    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.status === 'Active').length;
    const inactiveUsers = users.filter(u => u.status === 'Inactive').length;

    // Calculate new users (joined in last 7 days)
    const newUsersResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM users
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    `);
    const newUsers = newUsersResult[0].count;

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
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: error.message
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

    // Set last_login to more than 7 days ago to make them inactive
    await connection.query('UPDATE users SET last_login = DATE_SUB(NOW(), INTERVAL 8 DAY) WHERE user_id = ?', [id]);
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
    const tablesToClean = [
      'pending_requests',  // ⚠️ IMPORTANT: Must be first due to foreign key constraints
      'notifications',  // 🆕 Added: Delete user notifications (has CASCADE but manual delete is safer)
      'user_scanned_ingredients',
      'user_restrictions',  // ⚠️ CRITICAL: Must be deleted before users (has foreign key constraint)
      'user_dietary_restrictions',
      'user_excluded_ingredients', 
      'user_preferred_diets',
      'user_medical_conditions',
      'user_saved_recipes',
      'user_pantry_selections',
      'feedback'  // Delete feedback after feedback_replies (which references feedback_id)
    ];
    
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
    
    // If we already have a critical error from user_restrictions, skip the loop
    if (criticalError) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: criticalError
      });
    }
    
    // Clean up all other tables in order (excluding user_restrictions since we already handled it)
    const tablesToCleanFiltered = tablesToClean.filter(table => table !== 'user_restrictions');
    
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
    
    // Delete the user (with retry logic for connection errors)
    try {
      console.log(`  🔍 Attempting to delete user from users table...`);
      const [deleteUserResult] = await executeQueryWithRetry(
        connection, 
        'DELETE FROM users WHERE user_id = ?', 
        [id],
        3 // max retries
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
        await connection.rollback();
        
        // 🆕 Provide helpful error message with solution
        const errorMessage = deleteErr.sqlMessage || deleteErr.message;
        const tableMatch = errorMessage.match(/`(\w+)`/);
        const tableName = tableMatch ? tableMatch[1] : 'unknown table';
        
        return res.status(400).json({
          success: false,
          message: `Cannot delete user: User is still referenced by ${tableName}. Please ensure all related records are deleted first.`,
          error: process.env.NODE_ENV === 'development' ? deleteErr.message : 'Foreign key constraint violation',
          hint: `The ${tableName} table still has records referencing this user. This usually means the table needs to be added to the cleanup list or the deletion order needs to be adjusted.`
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

export default router;
