import express from 'express';
import pool from '../db.js';
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
        console.log('Note: dietary_restrictions table query failed, skipping');
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
        console.log('Note: excluded_ingredients table query failed, skipping');
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
        console.log('Note: preferred_diets table query failed, skipping');
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
        console.log('Note: medical_conditions table query failed, skipping');
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

export default router;
