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

// DELETE /api/admin/users/:id - Delete a user
router.delete('/:id', authenticateToken, adminAuth, async (req, res) => {
  let connection;
  try {
    const { id } = req.params;

    console.log(`🗑️ Attempting to delete user with ID: ${id}`);

    // Get database connection for transaction
    connection = await pool.getConnection();
    await connection.beginTransaction();

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
    const tablesToClean = [
      'pending_requests',  // ⚠️ IMPORTANT: Must be first due to foreign key constraints
      'notifications',  // 🆕 Added: Delete user notifications (has CASCADE but manual delete is safer)
      'user_scanned_ingredients',
      'user_dietary_restrictions',
      'user_excluded_ingredients', 
      'user_preferred_diets',
      'user_medical_conditions',
      'feedback',
      'user_saved_recipes',
      'user_pantry_selections'
    ];

    for (const table of tablesToClean) {
      try {
        const [deleteResult] = await connection.query(`DELETE FROM ${table} WHERE user_id = ?`, [id]);
        // DELETE queries return result object with affectedRows property
        const affectedRows = deleteResult?.affectedRows || (Array.isArray(deleteResult) ? deleteResult.length : 0);
        console.log(`  ✓ Cleaned ${table}: ${affectedRows} rows deleted`);
      } catch (err) {
        // Table might not exist or no data - continue
        console.log(`  ⚠️ Skipped ${table}: ${err.message}`);
        // Don't throw - continue with other tables
      }
    }
    
    // Delete the user
    const [deleteUserResult] = await connection.query('DELETE FROM users WHERE user_id = ?', [id]);
    const userDeleted = deleteUserResult?.affectedRows || (Array.isArray(deleteUserResult) ? deleteUserResult.length : 0);
    if (userDeleted === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'User not found or already deleted'
      });
    }
    console.log(`✅ User deleted successfully`);

    // Commit transaction
    await connection.commit();

    res.json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    // Rollback transaction on error
    if (connection) {
      await connection.rollback();
    }
    console.error('❌ Error deleting user:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage,
      stack: error.stack
    });
    res.status(500).json({
      success: false,
      message: 'Failed to delete user',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  } finally {
    // Release connection
    if (connection) {
      connection.release();
    }
  }
});

export default router;
