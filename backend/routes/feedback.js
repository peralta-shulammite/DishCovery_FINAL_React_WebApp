import express from 'express';
import db from '../db.js';
import authenticateToken from '../middleware/auth.js';

const router = express.Router();

// ========================================
// 📝 SUBMIT NEW FEEDBACK
// ========================================
router.post('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { feedbackMessage, feedbackType = 'general' } = req.body;

    console.log('📝 New feedback submission:', { userId, feedbackType });

    if (!feedbackMessage || feedbackMessage.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Feedback message is required' });
    }

    // For medical condition requests, allow shorter messages (just the condition name)
    const minLength = feedbackType === 'medical_condition' ? 3 : 10;
    if (feedbackMessage.trim().length < minLength) {
      return res.status(400).json({ 
        success: false, 
        message: `Feedback message must be at least ${minLength} characters long` 
      });
    }

    if (feedbackMessage.trim().length > 2000) {
      return res.status(400).json({ success: false, message: 'Feedback message must not exceed 2000 characters' });
    }

    // Validate feedbackType
    const validTypes = ['general', 'medical_condition', 'issue_report'];
    const finalFeedbackType = validTypes.includes(feedbackType) ? feedbackType : 'general';

    // For medical condition, format the message
    const finalMessage = finalFeedbackType === 'medical_condition' 
      ? feedbackMessage.trim() 
      : feedbackMessage.trim();

    // Check if feedback_type column exists (for backward compatibility)
    let hasFeedbackTypeColumn = false;
    try {
      const [columns] = await db.query(`
        SELECT COUNT(*) as count 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'feedback'
          AND COLUMN_NAME = 'feedback_type'
      `);
      hasFeedbackTypeColumn = columns[0].count > 0;
    } catch (err) {
      console.warn('⚠️ Could not check for feedback_type column:', err.message);
    }

    // Insert feedback with or without feedback_type column
    let result;
    if (hasFeedbackTypeColumn) {
      result = await db.query(
        `INSERT INTO feedback (user_id, message, feedback_type, status, unread_by_admin, unread_by_user)
         VALUES (?, ?, ?, 'pending', 1, 0)`,
        [userId, finalMessage, finalFeedbackType]
      );
    } else {
      // Fallback: insert without feedback_type column
      result = await db.query(
        `INSERT INTO feedback (user_id, message, status, unread_by_admin, unread_by_user)
         VALUES (?, ?, 'pending', 1, 0)`,
        [userId, finalMessage]
      );
    }

    console.log('✅ Feedback submitted successfully:', result.insertId);

    res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully! We will review it soon.',
      data: { feedbackId: result.insertId, createdAt: new Date() }
    });
  } catch (error) {
    console.error('❌ Error submitting feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit feedback. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ========================================
// 📜 GET USER'S FEEDBACK HISTORY
// ========================================
router.get('/my-feedback', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { limit = 10, offset = 0 } = req.query;

    console.log('📜 Fetching feedback history for user:', userId);

    const countResult = await db.query(
      'SELECT COUNT(*) as total FROM feedback WHERE user_id = ?',
      [userId]
    );
    const totalCount = countResult[0].total;

    // ✅ Fixed version using JSON_OBJECT()
    const feedbacks = await db.query(
      `SELECT 
        f.feedback_id,
        f.message,
        f.status,
        f.unread_by_user,
        f.created_at,
        f.updated_at,
        GROUP_CONCAT(
          JSON_OBJECT(
            'reply_id', fr.reply_id,
            'admin_id', fr.admin_id,
            'reply_message', fr.reply_message,
            'created_at', fr.created_at,
            'admin_name', IFNULL(CONCAT(a.first_name, ' ', a.last_name), 'Admin')
          )
          ORDER BY fr.created_at ASC
          SEPARATOR '|||'
        ) as replies
       FROM feedback f
       LEFT JOIN feedback_replies fr ON f.feedback_id = fr.feedback_id
       LEFT JOIN admin_users a ON fr.admin_id = a.admin_id
       WHERE f.user_id = ?
       GROUP BY f.feedback_id
       ORDER BY f.created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, parseInt(limit), parseInt(offset)]
    );

    console.log(`✅ Retrieved ${feedbacks.length} feedback items for user:`, userId);

    const formattedFeedbacks = feedbacks.map(f => {
      let parsedReplies = [];
      if (f.replies) {
        try {
          parsedReplies = f.replies.split('|||').map(r => JSON.parse(r));
        } catch (e) {
          console.error('Error parsing replies:', e);
        }
      }

      const isReplied = parsedReplies.length > 0;
      const latestReply = parsedReplies.length > 0 ? parsedReplies[parsedReplies.length - 1] : null;

      return {
        feedbackId: f.feedback_id,
        message: f.message,
        status: f.status,
        isReplied,
        hasUnreadReply: f.unread_by_user === 1 && isReplied,
        adminReply: latestReply ? latestReply.reply_message : null,
        repliedBy: latestReply ? latestReply.admin_name : null,
        repliedAt: latestReply ? latestReply.created_at : null,
        allReplies: parsedReplies,
        replyCount: parsedReplies.length,
        createdAt: f.created_at,
        updatedAt: f.updated_at
      };
    });

    res.json({
      success: true,
      data: {
        feedbacks: formattedFeedbacks,
        pagination: {
          total: totalCount,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: parseInt(offset) + feedbacks.length < totalCount
        }
      }
    });
  } catch (error) {
    console.error('❌ Error fetching feedback history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch feedback history',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ========================================
// 🔔 GET UNREAD REPLY COUNT
// ========================================
router.get('/unread-count', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    console.log('🔔 Fetching unread count for user:', userId);

    const result = await db.query(
      `SELECT COUNT(DISTINCT f.feedback_id) as unread_count 
       FROM feedback f
       INNER JOIN feedback_replies fr ON f.feedback_id = fr.feedback_id
       WHERE f.user_id = ? AND f.unread_by_user = 1`,
      [userId]
    );

    const unreadCount = result[0].unread_count;

    console.log(`✅ User ${userId} has ${unreadCount} unread replies`);

    res.json({ success: true, data: { unreadCount } });
  } catch (error) {
    console.error('❌ Error fetching unread count:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch unread count',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ========================================
// ✅ MARK REPLY AS READ
// ========================================
router.put('/:id/mark-read', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const feedbackId = req.params.id;

    console.log('✅ Marking feedback as read:', { userId, feedbackId });

    const feedback = await db.query(
      'SELECT user_id FROM feedback WHERE feedback_id = ?',
      [feedbackId]
    );

    if (!feedback || feedback.length === 0) {
      return res.status(404).json({ success: false, message: 'Feedback not found' });
    }

    if (feedback[0].user_id !== userId) {
      return res.status(403).json({ success: false, message: 'You do not have permission to update this feedback' });
    }

    await db.query('UPDATE feedback SET unread_by_user = 0 WHERE feedback_id = ?', [feedbackId]);

    console.log('✅ Feedback marked as read successfully');
    res.json({ success: true, message: 'Feedback marked as read' });
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
// 🔔 GET UNREAD COUNT
// ========================================
router.get('/unread-count', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    console.log('🔔 Fetching unread count for user:', userId);

    const result = await db.query(
      'SELECT COUNT(*) as unreadCount FROM feedback WHERE user_id = ? AND unread_by_user = 1',
      [userId]
    );

    const unreadCount = result[0].unreadCount || 0;
    console.log('✅ Unread count:', unreadCount);

    res.json({
      success: true,
      data: { unreadCount }
    });
  } catch (error) {
    console.error('❌ Error fetching unread count:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch unread count',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ========================================
// 🗑️ DELETE USER'S OWN FEEDBACK
// ========================================
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const feedbackId = req.params.id;

    console.log('🗑️ Deleting feedback:', { userId, feedbackId });

    const feedback = await db.query(
      'SELECT user_id FROM feedback WHERE feedback_id = ?',
      [feedbackId]
    );

    if (!feedback || feedback.length === 0) {
      return res.status(404).json({ success: false, message: 'Feedback not found' });
    }

    if (feedback[0].user_id !== userId) {
      return res.status(403).json({ success: false, message: 'You do not have permission to delete this feedback' });
    }

    await db.query('DELETE FROM feedback WHERE feedback_id = ?', [feedbackId]);

    console.log('✅ Feedback deleted successfully');
    res.json({ success: true, message: 'Feedback deleted successfully' });
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
