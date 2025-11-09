import express from 'express';
import pool from '../db.js';
import authenticateToken from '../middleware/auth.js';

const router = express.Router();

/**
 * ✅ Safe query wrapper for MySQL
 */
async function safeQuery(query, params = []) {
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
    console.error('❌ safeQuery error:', error.message);
    throw error;
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
      // ✅ Try to fetch with related_id and related_type first
      // If columns don't exist, catch error and retry without them
      let notifications;
      try {
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
        `, [userId, parseInt(limit)]);
      } catch (columnError) {
        // ✅ If related_id or related_type columns don't exist, retry without them
        if (columnError.message.includes('related_id') || 
            columnError.message.includes('related_type') ||
            columnError.code === 'ER_BAD_FIELD_ERROR') {
          console.warn('⚠️ related_id/related_type columns not found, fetching without them');
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
          `, [userId, parseInt(limit)]);
        } else {
          throw columnError;
        }
      }

      console.log(`✅ Found ${notifications.length} notifications`);

      res.json({
        success: true,
        data: notifications,
        count: notifications.length
      });
    } catch (tableError) {
      // If table doesn't exist, return empty array instead of error
      if (tableError.message.includes('doesn\'t exist') || 
          tableError.message.includes('ER_NO_SUCH_TABLE')) {
        console.warn('⚠️ Notifications table does not exist. Returning empty array.');
        res.json({
          success: true,
          data: [],
          count: 0,
          message: 'Notifications table not yet created'
        });
      } else {
        throw tableError;
      }
    }

  } catch (error) {
    console.error('❌ Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch notifications',
      details: error.message
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
      if (tableError.message.includes('doesn\'t exist') || 
          tableError.message.includes('ER_NO_SUCH_TABLE')) {
        console.warn('⚠️ Notifications table does not exist. Returning count 0.');
        res.json({
          success: true,
          count: 0
        });
      } else {
        throw tableError;
      }
    }

  } catch (error) {
    console.error('❌ Error fetching unread count:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch unread count'
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

