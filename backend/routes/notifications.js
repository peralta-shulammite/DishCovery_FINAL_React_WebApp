import express from 'express';
import { pool } from '../db.js';
import authenticateToken from '../middleware/auth.js';

const router = express.Router();

/**
 * ✅ Safe query wrapper for MySQL
 * Suppresses error logging for expected column errors
 */
async function safeQuery(query, params = [], suppressColumnErrors = false) {
  try {
    const result = await pool.query(query, params);
    
    let rows;
    if (Array.isArray(result) && Array.isArray(result[0])) {
      rows = result[0];
    } else if (Array.isArray(result)) {
      rows = result;
    } else {
      rows = [result];
    }
    
    return rows;
  } catch (error) {
    // ✅ Don't log expected column errors - they'll be handled by the caller
    const isColumnError = error.code === 'ER_BAD_FIELD_ERROR' || 
                         error.code === 1054 ||
                         error.sqlState === '42S22' ||
                         (error.message && (error.message.includes('Unknown column') || 
                                           error.message.includes('related_id') || 
                                           error.message.includes('related_type')));
    
    if (!suppressColumnErrors || !isColumnError) {
      console.error('❌ safeQuery error:', error.message);
    }
    throw error;
  }
}

/**
 * ✅ Check if a column exists in a table
 */
async function columnExists(tableName, columnName) {
  try {
    const result = await pool.query(`
      SELECT COUNT(*) as count
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
      AND COLUMN_NAME = ?
    `, [tableName, columnName]);
    
    // Handle different result structures from pool.query
    let rows;
    if (Array.isArray(result) && Array.isArray(result[0])) {
      rows = result[0];
    } else if (Array.isArray(result)) {
      rows = result;
    } else {
      rows = [result];
    }
    
    return rows[0]?.count > 0;
  } catch (error) {
    // If we can't check, assume column doesn't exist
    console.warn(`⚠️ Could not check if column ${columnName} exists in ${tableName}:`, error.message);
    return false;
  }
}

/**
 * GET /api/notifications - Get user's notifications
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { limit = 20 } = req.query;

    console.log(`🔔 Fetching notifications for user ${userId}`);

    // Check if notifications table exists
    try {
      // ✅ Check if related_id and related_type columns exist first
      // If table doesn't exist, columnExists will return false
      const hasRelatedId = await columnExists('notifications', 'related_id');
      const hasRelatedType = await columnExists('notifications', 'related_type');
      
      let notifications;
      
      // ✅ Build query based on column existence
      if (hasRelatedId && hasRelatedType) {
        // Columns exist - use them
        notifications = await safeQuery(`
          SELECT 
            notification_id as id,
            title as subject,
            message as body,
            notification_type as type,
            is_read,
            created_at,
            sender_name as from_name,
            sender_role as from_role,
            related_id,
            related_type
          FROM notifications
          WHERE user_id = ?
          ORDER BY created_at DESC
          LIMIT ?
        `, [userId, parseInt(limit)], true);
      } else {
        // Columns don't exist - use NULL values
        // This also handles the case where the table doesn't exist
        console.log('ℹ️ related_id/related_type columns not found, fetching without them');
        notifications = await safeQuery(`
          SELECT 
            notification_id as id,
            title as subject,
            message as body,
            notification_type as type,
            is_read,
            created_at,
            sender_name as from_name,
            sender_role as from_role,
            NULL as related_id,
            NULL as related_type
          FROM notifications
          WHERE user_id = ?
          ORDER BY created_at DESC
          LIMIT ?
        `, [userId, parseInt(limit)], true);
      }

      console.log(`✅ Found ${notifications.length} notifications`);

      res.json({
        success: true,
        data: notifications,
        count: notifications.length
      });
    } catch (tableError) {
      // If table doesn't exist, return empty array instead of error
      const errorMessage = tableError.message || '';
      const errorCode = tableError.code || '';
      const sqlState = tableError.sqlState || '';
      
      if (errorMessage.includes('doesn\'t exist') || 
          errorMessage.includes('ER_NO_SUCH_TABLE') ||
          errorCode === 'ER_NO_SUCH_TABLE' ||
          errorCode === 1146 ||
          sqlState === '42S02') {
        console.warn('⚠️ Notifications table does not exist. Returning empty array.');
        res.json({
          success: true,
          data: [],
          count: 0,
          message: 'Notifications table not yet created'
        });
        return; // ✅ Return early to prevent further error handling
      } else {
        // ✅ For other database errors (like column errors), return empty array instead of 500
        // This prevents frontend from signing out users
        console.warn('⚠️ Database error fetching notifications, returning empty array:', errorMessage);
        res.json({
          success: true,
          data: [],
          count: 0,
          message: 'Unable to fetch notifications at this time'
        });
        return; // ✅ Return early to prevent 500 error
      }
    }

  } catch (error) {
    // ✅ Only log error, but return success with empty data to prevent sign-out
    console.error('❌ Error fetching notifications:', error);
    // Don't return 500 error - return success with empty data instead
    res.json({
      success: true,
      data: [],
      count: 0,
      message: 'Unable to fetch notifications at this time'
    });
  }
});

/**
 * GET /api/notifications/unread-count - Get unread count
 */
router.get('/unread-count', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    try {
      const result = await safeQuery(`
        SELECT COUNT(*) as count
        FROM notifications
        WHERE user_id = ? AND is_read = 0
      `, [userId]);

      const count = result[0]?.count || 0;

      res.json({
        success: true,
        count: count
      });
    } catch (tableError) {
      // If table doesn't exist, return 0
      const errorMessage = tableError.message || '';
      const errorCode = tableError.code || '';
      const sqlState = tableError.sqlState || '';
      
      if (errorMessage.includes('doesn\'t exist') || 
          errorMessage.includes('ER_NO_SUCH_TABLE') ||
          errorCode === 'ER_NO_SUCH_TABLE' ||
          errorCode === 1146 ||
          sqlState === '42S02') {
        console.warn('⚠️ Notifications table does not exist. Returning count 0.');
        res.json({
          success: true,
          count: 0
        });
        return; // ✅ Return early
      } else {
        // ✅ For other database errors, return 0 instead of 500
        console.warn('⚠️ Database error fetching unread count, returning 0:', errorMessage);
        res.json({
          success: true,
          count: 0
        });
        return; // ✅ Return early to prevent 500 error
      }
    }

  } catch (error) {
    // ✅ Only log error, but return success with 0 count to prevent sign-out
    console.error('❌ Error fetching unread count:', error);
    res.json({
      success: true,
      count: 0
    });
  }
});

/**
 * PUT /api/notifications/:id/read - Mark notification as read
 */
router.put('/:id/read', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    console.log(`📖 Marking notification ${id} as read for user ${userId}`);

    await safeQuery(`
      UPDATE notifications 
      SET is_read = 1, read_at = NOW()
      WHERE notification_id = ? AND user_id = ?
    `, [id, userId]);

    res.json({
      success: true,
      message: 'Notification marked as read'
    });

  } catch (error) {
    console.error('❌ Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark as read'
    });
  }
});

/**
 * PUT /api/notifications/:id/unread - Mark notification as unread
 */
router.put('/:id/unread', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    console.log(`📧 Marking notification ${id} as unread for user ${userId}`);

    await safeQuery(`
      UPDATE notifications 
      SET is_read = 0, read_at = NULL
      WHERE notification_id = ? AND user_id = ?
    `, [id, userId]);

    res.json({
      success: true,
      message: 'Notification marked as unread'
    });

  } catch (error) {
    console.error('❌ Error marking notification as unread:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark as unread'
    });
  }
});

/**
 * DELETE /api/notifications/:id - Delete notification
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    console.log(`🗑️  Deleting notification ${id} for user ${userId}`);

    await safeQuery(`
      DELETE FROM notifications 
      WHERE notification_id = ? AND user_id = ?
    `, [id, userId]);

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error deleting notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete notification'
    });
  }
});

/**
 * POST /api/notifications/reply - Reply to notification (send to admin)
 */
router.post('/reply', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { notificationId, replyText } = req.body;

    if (!replyText || replyText.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Reply text is required'
      });
    }

    console.log(`💬 User ${userId} replying to notification ${notificationId}`);

    // Store reply (you can create a separate replies table or use feedback system)
    // For now, we'll use the feedback system
    await safeQuery(`
      INSERT INTO feedback (user_id, message, status, unread_by_admin, unread_by_user)
      VALUES (?, ?, 'pending', 1, 0)
    `, [userId, replyText]);

    // Mark original notification as read
    await safeQuery(`
      UPDATE notifications 
      SET is_read = 1, read_at = NOW()
      WHERE notification_id = ? AND user_id = ?
    `, [notificationId, userId]);

    res.json({
      success: true,
      message: 'Reply sent successfully'
    });

  } catch (error) {
    console.error('❌ Error sending reply:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send reply'
    });
  }
});

/**
 * POST /api/notifications/mark-all-read - Mark all as read
 */
router.post('/mark-all-read', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    console.log(`📚 Marking all notifications as read for user ${userId}`);

    await safeQuery(`
      UPDATE notifications 
      SET is_read = 1, read_at = NOW()
      WHERE user_id = ? AND is_read = 0
    `, [userId]);

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });

  } catch (error) {
    console.error('❌ Error marking all as read:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark all as read'
    });
  }
});

export default router;


