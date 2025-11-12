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

// Health check route for analytics (no auth required for testing)
router.get('/health', (req, res) => {
  res.json({ success: true, message: 'Analytics route is working', timestamp: new Date().toISOString() });
});

// GET /api/admin/analytics - Get comprehensive analytics data
router.get('/', authenticateToken, adminAuth, async (req, res) => {
  try {
    const { dateRange = 'Last 30 Days' } = req.query;
    
    console.log('📊 [ANALYTICS] Route hit - GET /api/admin/analytics');
    console.log('📊 [ANALYTICS] Fetching analytics data for date range:', dateRange);
    console.log('📊 [ANALYTICS] Request from:', req.headers.origin || 'unknown');
    console.log('📊 [ANALYTICS] User:', req.user ? { id: req.user.userId || req.user.id, isAdmin: req.user.isAdmin } : 'no user');
    
    // Calculate date range
    let dateFilter = '';
    switch (dateRange) {
      case 'Last 7 Days':
        dateFilter = 'DATE_SUB(NOW(), INTERVAL 7 DAY)';
        break;
      case 'Last 30 Days':
        dateFilter = 'DATE_SUB(NOW(), INTERVAL 30 DAY)';
        break;
      case 'Last 3 Months':
        dateFilter = 'DATE_SUB(NOW(), INTERVAL 3 MONTH)';
        break;
      case 'Last 6 Months':
        dateFilter = 'DATE_SUB(NOW(), INTERVAL 6 MONTH)';
        break;
      case 'Last Year':
        dateFilter = 'DATE_SUB(NOW(), INTERVAL 1 YEAR)';
        break;
      default:
        dateFilter = 'DATE_SUB(NOW(), INTERVAL 30 DAY)';
    }
    
    // 1. Dietary Filter Distribution
    const dietaryFilterQuery = `
      SELECT 
        r.restriction_name as name,
        COUNT(ur.user_restriction_id) as value,
        ROUND(COUNT(ur.user_restriction_id) * 100.0 / (SELECT COUNT(*) FROM user_restrictions), 2) as percentage
      FROM restrictions r
      LEFT JOIN user_restrictions ur ON r.restriction_id = ur.restriction_id
      WHERE r.is_active = 1
      GROUP BY r.restriction_id, r.restriction_name
      ORDER BY value DESC
      LIMIT 10
    `;
    
    // 2. Request Status Breakdown (from pending_requests table if exists)
    // Use safer query that handles empty table
    const requestStatusQuery = `
      SELECT 
        status,
        COUNT(*) as count,
        CASE 
          WHEN (SELECT COUNT(*) FROM pending_requests) > 0 
          THEN ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM pending_requests), 2)
          ELSE 0
        END as percentage
      FROM pending_requests
      GROUP BY status
    `;
    
    // 3. User Growth Data (weekly for last 6 weeks)
    const userGrowthQuery = `
      SELECT 
        DATE_FORMAT(created_at, '%Y-%u') as week_key,
        COUNT(*) as total_users,
        COUNT(CASE WHEN last_login >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as active_users,
        COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as new_users
      FROM users
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 WEEK)
      GROUP BY DATE_FORMAT(created_at, '%Y-%u')
      ORDER BY week_key ASC
    `;
    
    // 4. Ingredient Request Trends (daily from Nov 5 to present)
    // ✅ FIXED: Top Used Ingredient - All user scans combined (including pantry)
    const ingredientTrendsQuery = `
      SELECT 
        DATE_FORMAT(usi.scanned_at, '%b %d') as day,
        DATE_FORMAT(usi.scanned_at, '%Y-%m-%d') as day_key,
        i.ingredient_name,
        COUNT(*) as usage_count
      FROM user_scanned_ingredients usi
      JOIN ingredients i ON usi.ingredient_id = i.ingredient_id
      WHERE usi.scanned_at >= '2025-11-05'
      GROUP BY DATE_FORMAT(usi.scanned_at, '%Y-%m-%d'), DATE_FORMAT(usi.scanned_at, '%b %d'), i.ingredient_name
      ORDER BY day_key ASC, usage_count DESC
    `;
    
    // 5. User Activity by Hour of Day
    const userActivityQuery = `
      SELECT 
        HOUR(last_login) as hour,
        COUNT(DISTINCT user_id) as users
      FROM users
      WHERE last_login >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        AND last_login IS NOT NULL
      GROUP BY HOUR(last_login)
      ORDER BY hour ASC
    `;
    
    // 6. Total Stats - Handle missing tables gracefully
    const totalStatsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM users WHERE last_login >= DATE_SUB(NOW(), INTERVAL 7 DAY)) as active_users,
        (SELECT COUNT(*) FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)) as new_users,
        COALESCE((SELECT COUNT(*) FROM pending_requests), 0) as total_requests,
        COALESCE((SELECT COUNT(*) FROM pending_requests WHERE status = 'completed'), 0) as completed_requests,
        COALESCE((SELECT COUNT(*) FROM user_restrictions), 0) as total_dietary_uses
    `;
    
    // Execute all queries in parallel with better error handling for localhost testing
    // Note: pool.query() returns [rows, fields], so we need to handle that format
    const [
      dietaryFiltersResult,
      requestStatusResult,
      userGrowthResult,
      ingredientTrendsResult,
      userActivityResult,
      totalStatsResult
    ] = await Promise.all([
      pool.query(dietaryFilterQuery).catch((err) => {
        console.warn('⚠️ Error fetching dietary filters:', err.message);
        return [[], []]; // Return [rows, fields] format
      }),
      pool.query(requestStatusQuery).catch((err) => {
        console.warn('⚠️ Error fetching request status (table may not exist):', err.message);
        return [[], []]; // Return [rows, fields] format
      }),
      pool.query(userGrowthQuery).catch((err) => {
        console.warn('⚠️ Error fetching user growth:', err.message);
        return [[], []]; // Return [rows, fields] format
      }),
      pool.query(ingredientTrendsQuery).catch((err) => {
        console.warn('⚠️ Error fetching ingredient trends:', err.message);
        return [[], []]; // Return [rows, fields] format
      }),
      pool.query(userActivityQuery).catch((err) => {
        console.warn('⚠️ Error fetching user activity:', err.message);
        return [[], []]; // Return [rows, fields] format
      }),
      pool.query(totalStatsQuery).catch((err) => {
        console.warn('⚠️ Error fetching total stats:', err.message);
        return [[{ total_users: 0, active_users: 0, new_users: 0, total_requests: 0, completed_requests: 0, total_dietary_uses: 0 }], []];
      })
    ]);
    
    // Extract rows from [rows, fields] format
    const dietaryFilters = Array.isArray(dietaryFiltersResult) && Array.isArray(dietaryFiltersResult[0]) ? dietaryFiltersResult[0] : (Array.isArray(dietaryFiltersResult) ? dietaryFiltersResult : []);
    const requestStatus = Array.isArray(requestStatusResult) && Array.isArray(requestStatusResult[0]) ? requestStatusResult[0] : (Array.isArray(requestStatusResult) ? requestStatusResult : []);
    const userGrowth = Array.isArray(userGrowthResult) && Array.isArray(userGrowthResult[0]) ? userGrowthResult[0] : (Array.isArray(userGrowthResult) ? userGrowthResult : []);
    const ingredientTrends = Array.isArray(ingredientTrendsResult) && Array.isArray(ingredientTrendsResult[0]) ? ingredientTrendsResult[0] : (Array.isArray(ingredientTrendsResult) ? ingredientTrendsResult : []);
    const userActivity = Array.isArray(userActivityResult) && Array.isArray(userActivityResult[0]) ? userActivityResult[0] : (Array.isArray(userActivityResult) ? userActivityResult : []);
    const totalStats = Array.isArray(totalStatsResult) && Array.isArray(totalStatsResult[0]) ? totalStatsResult[0] : (Array.isArray(totalStatsResult) ? totalStatsResult : []);
    
    // Process dietary filter data
    const filterDistribution = dietaryFilters.map(filter => ({
      name: filter.name,
      value: parseInt(filter.value) || 0,
      percentage: parseFloat(filter.percentage) || 0
    }));
    
    // Calculate total uses for donut chart
    const totalUses = filterDistribution.reduce((sum, f) => sum + f.value, 0);
    
    // Process request status data
    const requestStatusData = requestStatus.map(status => ({
      status: status.status || 'Unknown',
      count: parseInt(status.count) || 0,
      percentage: parseFloat(status.percentage) || 0
    }));
    
    // Process user growth data
    const userGrowthData = userGrowth.map((week, index) => ({
      date: `Week ${index + 1}`,
      users: parseInt(week.total_users) || 0,
      active: parseInt(week.active_users) || 0,
      new: parseInt(week.new_users) || 0
    }));
    
    // Process ingredient trends data - group by day and top ingredients
    const ingredientTrendsMap = {};
    const daySet = new Set();
    const topIngredients = new Set();
    
    ingredientTrends.forEach(trend => {
      const day = trend.day; // e.g., 'Nov 12'
      const dayKey = trend.day_key; // e.g., '2024-11-12'
      const ingredient = trend.ingredient_name;
      const count = parseInt(trend.usage_count) || 0; // ✅ Changed from request_count to usage_count
      
      if (!ingredientTrendsMap[dayKey]) {
        ingredientTrendsMap[dayKey] = { day, data: {} };
      }
      
      ingredientTrendsMap[dayKey].data[ingredient] = count;
      daySet.add(dayKey);
      
      // Track top ingredients
      topIngredients.add(ingredient);
    });
    
    // Get top 4 ingredients by total usage
    const ingredientTotals = {};
    ingredientTrends.forEach(trend => {
      const ingredient = trend.ingredient_name;
      const count = parseInt(trend.usage_count) || 0; // ✅ Changed from request_count to usage_count
      ingredientTotals[ingredient] = (ingredientTotals[ingredient] || 0) + count;
    });
    
    const top4Ingredients = Object.entries(ingredientTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([name]) => name);
    
    // ✅ FIX: Fill in missing days from Nov 5 to today
    // Generate all days from Nov 5, 2025 to today
    const startDate = new Date('2025-11-05');
    const endDate = new Date();
    const allDays = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dayKey = currentDate.toISOString().split('T')[0]; // YYYY-MM-DD
      const dayLabel = currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      allDays.push({ dayKey, dayLabel });
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Format ingredient trends for chart - fill in all days from Nov 5 to today
    const ingredientTrendsData = allDays.map(({ dayKey, dayLabel }) => {
      const dayData = ingredientTrendsMap[dayKey] || { data: {} };
      const data = { day: dayLabel };
      top4Ingredients.forEach(ingredient => {
        // Use ingredient name as key (lowercase, replace spaces with underscores)
        const key = ingredient.toLowerCase().replace(/\s+/g, '_');
        data[key] = dayData.data[ingredient] || 0; // 0 if no data for this day
      });
      return data;
    });
    
    // If no data at all, return at least today
    if (ingredientTrendsData.length === 0) {
      const today = new Date();
      const todayStr = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      ingredientTrendsData.push({ day: todayStr });
    }
    
    // Process user activity by hour
    const hourLabels = ['12am', '3am', '6am', '9am', '12pm', '3pm', '6pm', '9pm'];
    const userActivityByHour = hourLabels.map(label => {
      const hourMap = {
        '12am': 0, '3am': 3, '6am': 6, '9am': 9,
        '12pm': 12, '3pm': 15, '6pm': 18, '9pm': 21
      };
      const hour = hourMap[label];
      const activity = userActivity.find(a => parseInt(a.hour) === hour);
      return {
        hour: label,
        users: activity ? parseInt(activity.users) : 0
      };
    });
    
    // Process total stats
    const stats = totalStats[0] || {};
    const totalRequests = parseInt(stats.total_requests) || 0;
    const completedRequests = parseInt(stats.completed_requests) || 0;
    const completionRate = totalRequests > 0 ? Math.round((completedRequests / totalRequests) * 100) : 0;
    
    console.log('✅ [ANALYTICS] Analytics data fetched successfully');
    console.log('✅ [ANALYTICS] Data summary:', {
      filterDistribution: filterDistribution.length,
      requestStatus: requestStatusData.length,
      userGrowth: userGrowthData.length,
      ingredientTrends: ingredientTrendsData.length,
      userActivity: userActivityByHour.length,
      totalUses,
      totalRequests
    });
    
    res.json({
      success: true,
      data: {
        filterDistribution,
        totalUses,
        requestStatus: requestStatusData,
        totalRequests,
        completionRate,
        userGrowth: userGrowthData,
        ingredientTrends: ingredientTrendsData,
        topIngredients: top4Ingredients,
        userActivityByHour,
        stats: {
          totalUsers: parseInt(stats.total_users) || 0,
          activeUsers: parseInt(stats.active_users) || 0,
          newUsers: parseInt(stats.new_users) || 0,
          totalRequests,
          completedRequests,
          totalDietaryUses: parseInt(stats.total_dietary_uses) || 0
        }
      }
    });
    
  } catch (error) {
    console.error('❌ [ANALYTICS] Error fetching analytics:', error);
    console.error('❌ [ANALYTICS] Error details:', {
      message: error.message,
      code: error.code,
      sqlState: error.sqlState,
      stack: error.stack
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics data',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      errorCode: error.code,
      sqlState: error.sqlState,
      hint: process.env.NODE_ENV === 'development' ? 'Check backend logs for details' : undefined
    });
  }
});

export default router;

