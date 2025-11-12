import express from 'express';
import db from '../db.js';
import authenticateToken from '../middleware/auth.js';  // ✅ Changed 'auth' to 'authenticateToken'

const router = express.Router();

// Middleware to verify admin access
const verifyAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }
  if (!req.user.isAdmin) {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
  next();
};

// ========================================
// 🧪 TEST ROUTE (no auth) - Remove after testing
// ========================================
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'Route is working!' });
});

// Apply authentication and admin verification to all routes
router.use(authenticateToken);
router.use(verifyAdmin);

// ========================================
// 📊 GET FEEDBACK STATISTICS
// ========================================
router.get('/stats', async (req, res) => {
  try {
    console.log('📊 Fetching feedback statistics');

    const totalResult = await db.query('SELECT COUNT(*) as total FROM feedback');
    const repliedResult = await db.query(`
      SELECT COUNT(DISTINCT f.feedback_id) as replied 
      FROM feedback f
      INNER JOIN feedback_replies fr ON f.feedback_id = fr.feedback_id
    `);
    const unreadResult = await db.query(
      'SELECT COUNT(*) as unread FROM feedback WHERE unread_by_admin = 1'
    );
    const recentResult = await db.query(
      'SELECT COUNT(*) as recent FROM feedback WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)'
    );
    const statusResult = await db.query(`
      SELECT status, COUNT(*) as count FROM feedback GROUP BY status
    `);

    const stats = {
      total: totalResult[0].total,
      replied: repliedResult[0].replied,
      unread: unreadResult[0].unread,
      unreplied: totalResult[0].total - repliedResult[0].replied,
      recent: recentResult[0].recent,
      status: { pending: 0, replied: 0, resolved: 0, archived: 0 }
    };

    statusResult.forEach(row => (stats.status[row.status] = row.count));

    console.log('✅ Statistics fetched successfully:', stats);

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('❌ Error fetching statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ========================================
// 📋 GET ALL FEEDBACK WITH FILTERS
// ========================================
router.get('/', async (req, res) => {
  try {
    const {
      sortBy = 'newest',
      status,
      fromDate,
      toDate,
      search,
      limit = 50,
      offset = 0
    } = req.query;

    console.log('📋 Fetching feedback with filters:', { sortBy, status, search });

    let query = `
      SELECT 
        f.feedback_id,
        f.user_id,
        f.message,
        f.status,
        f.unread_by_admin,
        f.unread_by_user,
        f.created_at,
        f.updated_at,
        u.first_name as user_first_name,
        u.last_name as user_last_name,
        u.email as user_email,
        COUNT(fr.reply_id) as reply_count,
        MAX(fr.created_at) as last_reply_at
      FROM feedback f
      INNER JOIN users u ON f.user_id = u.user_id
      LEFT JOIN feedback_replies fr ON f.feedback_id = fr.feedback_id
      WHERE 1=1
    `;

    const params = [];

    if (status) {
      if (status === 'unread') {
        query += ' AND f.unread_by_admin = 1';
      } else if (status === 'read') {
        query += ' AND f.unread_by_admin = 0';
      } else if (status === 'replied') {
        query += ' AND EXISTS (SELECT 1 FROM feedback_replies WHERE feedback_id = f.feedback_id)';
      } else if (status === 'unreplied') {
        query += ' AND NOT EXISTS (SELECT 1 FROM feedback_replies WHERE feedback_id = f.feedback_id)';
      } else if (['pending', 'resolved', 'archived'].includes(status)) {
        query += ' AND f.status = ?';
        params.push(status);
      }
    }

    if (fromDate) {
      query += ' AND DATE(f.created_at) >= ?';
      params.push(fromDate);
    }

    if (toDate) {
      query += ' AND DATE(f.created_at) <= ?';
      params.push(toDate);
    }

    if (search && search.trim().length > 0) {
      query += ` AND (
        f.message LIKE ? OR
        u.first_name LIKE ? OR
        u.last_name LIKE ? OR
        u.email LIKE ?
      )`;
      const searchTerm = `%${search.trim()}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    query += ' GROUP BY f.feedback_id';

    switch (sortBy) {
      case 'oldest':
        query += ' ORDER BY f.created_at ASC';
        break;
      case 'status':
        query += ' ORDER BY f.status ASC, f.created_at DESC';
        break;
      case 'unread':
        query += ' ORDER BY f.unread_by_admin DESC, f.created_at DESC';
        break;
      case 'newest':
      default:
        query += ' ORDER BY f.created_at DESC';
    }

    query += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const feedbacks = await db.query(query, params);

    let countQuery = `
      SELECT COUNT(DISTINCT f.feedback_id) as total
      FROM feedback f
      INNER JOIN users u ON f.user_id = u.user_id
      LEFT JOIN feedback_replies fr ON f.feedback_id = fr.feedback_id
      WHERE 1=1
    `;
    const countParams = [...params.slice(0, -2)];

    const totalResult = await db.query(countQuery, countParams);
    const totalCount = totalResult[0].total;

    console.log(`✅ Retrieved ${feedbacks.length} of ${totalCount} feedback items`);

    res.json({
      success: true,
      data: {
        feedbacks: feedbacks.map(f => ({
          feedbackId: f.feedback_id,
          userId: f.user_id,
          user: {
            firstName: f.user_first_name,
            lastName: f.user_last_name,
            email: f.user_email,
            fullName: `${f.user_first_name} ${f.user_last_name}`
          },
          message: f.message,
          status: f.status,
          isRead: f.unread_by_admin === 0,
          isReplied: f.reply_count > 0,
          replyCount: f.reply_count,
          lastReplyAt: f.last_reply_at,
          createdAt: f.created_at,
          updatedAt: f.updated_at
        })),
        pagination: {
          total: totalCount,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: parseInt(offset) + feedbacks.length < totalCount
        }
      }
    });
  } catch (error) {
    console.error('❌ Error fetching feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch feedback',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ========================================
// 🔍 GET SINGLE FEEDBACK WITH ALL REPLIES
// ========================================
router.get('/:id', async (req, res) => {
  try {
    const feedbackId = req.params.id;
    console.log('🔍 Fetching feedback details:', feedbackId);

    const feedback = await db.query(
      `SELECT 
        f.feedback_id,
        f.user_id,
        f.message,
        f.status,
        f.unread_by_admin,
        f.unread_by_user,
        f.created_at,
        f.updated_at,
        u.first_name as user_first_name,
        u.last_name as user_last_name,
        u.email as user_email
      FROM feedback f
      INNER JOIN users u ON f.user_id = u.user_id
      WHERE f.feedback_id = ?`,
      [feedbackId]
    );

    if (!feedback || feedback.length === 0) {
      return res.status(404).json({ success: false, message: 'Feedback not found' });
    }

    const replies = await db.query(
      `SELECT 
        fr.reply_id,
        fr.admin_id,
        fr.reply_message,
        fr.created_at,
        a.first_name as admin_first_name,
        a.last_name as admin_last_name,
        a.username as admin_username
      FROM feedback_replies fr
      INNER JOIN admin_users a ON fr.admin_id = a.admin_id
      WHERE fr.feedback_id = ?
      ORDER BY fr.created_at ASC`,
      [feedbackId]
    );

    const feedbackData = feedback[0];

    res.json({
      success: true,
      data: {
        feedbackId: feedbackData.feedback_id,
        userId: feedbackData.user_id,
        user: {
          firstName: feedbackData.user_first_name,
          lastName: feedbackData.user_last_name,
          email: feedbackData.user_email,
          fullName: `${feedbackData.user_first_name} ${feedbackData.user_last_name}`
        },
        message: feedbackData.message,
        status: feedbackData.status,
        isRead: feedbackData.unread_by_admin === 0,
        isReplied: replies.length > 0,
        replies: replies.map(r => ({
          replyId: r.reply_id,
          adminId: r.admin_id,
          adminName: `${r.admin_first_name} ${r.admin_last_name}`,
          adminUsername: r.admin_username,
          message: r.reply_message,
          createdAt: r.created_at
        })),
        createdAt: feedbackData.created_at,
        updatedAt: feedbackData.updated_at
      }
    });
  } catch (error) {
    console.error('❌ Error fetching feedback details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch feedback details',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ========================================
// 💬 REPLY TO FEEDBACK
// ========================================
router.post('/:id/reply', async (req, res) => {
  try {
    const adminId = req.user.adminId;
    const feedbackId = req.params.id;
    const { replyMessage, updateStatus } = req.body;

    console.log('💬 Admin replying to feedback:', { adminId, feedbackId });

    if (!replyMessage || replyMessage.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Reply message is required'
      });
    }

    if (replyMessage.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Reply message must be at least 10 characters long'
      });
    }

    const feedback = await db.query(
      'SELECT feedback_id, status FROM feedback WHERE feedback_id = ?',
      [feedbackId]
    );

    if (!feedback || feedback.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    // Get feedback details to get user_id
    const feedbackDetails = await db.query(
      'SELECT user_id, message FROM feedback WHERE feedback_id = ?',
      [feedbackId]
    );

    if (!feedbackDetails || feedbackDetails.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    const userId = feedbackDetails[0].user_id;
    const feedbackMessage = feedbackDetails[0].message;

    // Get admin details for notification
    const adminDetails = await db.query(
      'SELECT first_name, last_name, username FROM admin_users WHERE admin_id = ?',
      [adminId]
    );

    const adminName = adminDetails && adminDetails.length > 0
      ? `${adminDetails[0].first_name} ${adminDetails[0].last_name}`
      : 'Admin';

    // Insert feedback reply
    await db.query(
      `INSERT INTO feedback_replies (feedback_id, admin_id, reply_message)
       VALUES (?, ?, ?)`,
      [feedbackId, adminId, replyMessage.trim()]
    );

    const newStatus = updateStatus || 'replied';
    await db.query(
      `UPDATE feedback 
       SET status = ?, unread_by_user = 1, updated_at = NOW()
       WHERE feedback_id = ?`,
      [newStatus, feedbackId]
    );

    // ✅ Create notification for user about the feedback reply
    try {
      // Truncate feedback message for notification preview (max 100 chars)
      const feedbackPreview = feedbackMessage.length > 100 
        ? feedbackMessage.substring(0, 100) + '...' 
        : feedbackMessage;

      // Truncate reply message for notification (max 150 chars)
      const replyPreview = replyMessage.trim().length > 150
        ? replyMessage.trim().substring(0, 150) + '...'
        : replyMessage.trim();

      // Check if notifications table has related_id and related_type columns
      // If not, insert without them
      try {
        // Try to insert with related_id and related_type first
        await db.query(
          `INSERT INTO notifications (
            user_id, 
            title, 
            message, 
            notification_type, 
            is_read,
            sender_name,
            sender_role,
            related_id,
            related_type
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            userId,
            'New Reply to Your Feedback',
            `Admin replied to your feedback: "${feedbackPreview}"\n\nReply: "${replyPreview}"`,
            'feedback_reply',
            0, // is_read = false (unread)
            adminName,
            'ADMIN',
            feedbackId, // related_id = feedback_id
            'feedback' // related_type
          ]
        );
      } catch (columnError) {
        // If columns don't exist, insert without them
        const errorMessage = columnError.message || '';
        const errorCode = columnError.code || '';
        const sqlState = columnError.sqlState || '';
        
        if (errorMessage.includes('related_id') || 
            errorMessage.includes('related_type') ||
            errorCode === 'ER_BAD_FIELD_ERROR' ||
            errorCode === 1054 ||
            sqlState === '42S22') {
          console.warn('⚠️ related_id/related_type columns not found, inserting without them');
          await db.query(
            `INSERT INTO notifications (
              user_id, 
              title, 
              message, 
              notification_type, 
              is_read,
              sender_name,
              sender_role
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              userId,
              'New Reply to Your Feedback',
              `Admin replied to your feedback: "${feedbackPreview}"\n\nReply: "${replyPreview}"`,
              'feedback_reply',
              0, // is_read = false (unread)
              adminName,
              'ADMIN'
            ]
          );
        } else {
          // ✅ Don't throw error - just log it and continue
          // This prevents the reply from failing due to notification column issues
          console.warn('⚠️ Error creating notification (non-critical):', errorMessage);
        }
      }

      console.log(`✅ Notification created for user ${userId} about feedback reply`);
    } catch (notificationError) {
      // Don't fail the reply if notification creation fails
      console.error('❌ Error creating notification:', notificationError);
      console.warn('⚠️ Reply was sent but notification was not created');
    }

    console.log('✅ Reply sent successfully');

    res.json({ success: true, message: 'Reply sent successfully' });
  } catch (error) {
    console.error('❌ Error sending reply:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send reply',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ========================================
// ✅ MARK FEEDBACK AS READ BY ADMIN
// ========================================
router.put('/:id/mark-read', async (req, res) => {
  try {
    const feedbackId = req.params.id;

    console.log('✅ Marking feedback as read by admin:', feedbackId);

    const result = await db.query(
      'UPDATE feedback SET unread_by_admin = 0 WHERE feedback_id = ?',
      [feedbackId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    console.log('✅ Feedback marked as read');

    res.json({
      success: true,
      message: 'Feedback marked as read'
    });
  } catch (error) {
    console.error('❌ Error marking feedback as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark feedback as read',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ========================================
// ⚪ MARK FEEDBACK AS UNREAD BY ADMIN
// ========================================
router.put('/:id/mark-unread', async (req, res) => {
  try {
    const feedbackId = req.params.id;

    console.log('⚪ Marking feedback as unread by admin:', feedbackId);

    const result = await db.query(
      'UPDATE feedback SET unread_by_admin = 1 WHERE feedback_id = ?',
      [feedbackId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    console.log('✅ Feedback marked as unread');

    res.json({
      success: true,
      message: 'Feedback marked as unread'
    });
  } catch (error) {
    console.error('❌ Error marking feedback as unread:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark feedback as unread',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ========================================
// 📝 UPDATE FEEDBACK STATUS
// ========================================
router.put('/:id/status', async (req, res) => {
  try {
    const feedbackId = req.params.id;
    const { status } = req.body;

    console.log('📝 Updating feedback status:', { feedbackId, status });

    const validStatuses = ['pending', 'replied', 'resolved', 'archived'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be: pending, replied, resolved, or archived'
      });
    }

    const result = await db.query(
      'UPDATE feedback SET status = ? WHERE feedback_id = ?',
      [status, feedbackId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    console.log('✅ Status updated successfully');

    res.json({
      success: true,
      message: 'Status updated successfully'
    });
  } catch (error) {
    console.error('❌ Error updating status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ========================================
// 🗑️ DELETE FEEDBACK
// ========================================
router.delete('/:id', async (req, res) => {
  try {
    const feedbackId = req.params.id;

    console.log('🗑️ Deleting feedback:', feedbackId);

    const result = await db.query(
      'DELETE FROM feedback WHERE feedback_id = ?',
      [feedbackId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    console.log('✅ Feedback deleted successfully');

    res.json({
      success: true,
      message: 'Feedback deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete feedback',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;
