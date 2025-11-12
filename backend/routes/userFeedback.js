import express from 'express';
import db from '../db.js';
import authenticateToken from '../middleware/auth.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// ========================================
// 📊 GET UNREAD REPLY COUNT FOR USER
// ========================================
router.get('/unread-count', async (req, res) => {
  try {
    const userId = req.user.userId;

    console.log('📊 Fetching unread count for user:', userId);

    const result = await db.query(
      'SELECT COUNT(*) as unreadCount FROM feedback WHERE user_id = ? AND unread_by_user = 1',
      [userId]
    );

    const unreadCount = result[0].unreadCount;

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
// 📋 GET USER'S OWN FEEDBACK WITH REPLIES
// ========================================
router.get('/my-feedback', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { limit = 10, offset = 0 } = req.query;

    console.log('📋 Fetching feedback for user:', userId);

    const feedbacks = await db.query(
      `SELECT 
        f.feedback_id,
        f.message,
        f.status,
        f.unread_by_user,
        f.created_at,
        f.updated_at
      FROM feedback f
      WHERE f.user_id = ?
      ORDER BY f.created_at DESC
      LIMIT ? OFFSET ?`,
      [userId, parseInt(limit), parseInt(offset)]
    );

    // Get replies for each feedback
    const feedbackWithReplies = await Promise.all(
      feedbacks.map(async (feedback) => {
        const replies = await db.query(
          `SELECT 
            fr.reply_id,
            fr.reply_message,
            fr.created_at,
            a.first_name,
            a.last_name,
            a.username
          FROM feedback_replies fr
          INNER JOIN admin_users a ON fr.admin_id = a.admin_id
          WHERE fr.feedback_id = ?
          ORDER BY fr.created_at ASC`,
          [feedback.feedback_id]
        );

        return {
          feedbackId: feedback.feedback_id,
          message: feedback.message,
          status: feedback.status,
          hasUnreadReplies: feedback.unread_by_user === 1,
          createdAt: feedback.created_at,
          updatedAt: feedback.updated_at,
          replies: replies.map(r => ({
            replyId: r.reply_id,
            message: r.reply_message,
            adminName: `${r.first_name} ${r.last_name}`,
            adminUsername: r.username,
            createdAt: r.created_at
          }))
        };
      })
    );

    // Get total count
    const totalResult = await db.query(
      'SELECT COUNT(*) as total FROM feedback WHERE user_id = ?',
      [userId]
    );

    console.log('✅ Retrieved feedback for user');

    res.json({
      success: true,
      data: {
        feedbacks: feedbackWithReplies,
        pagination: {
          total: totalResult[0].total,
          limit: parseInt(limit),
          offset: parseInt(offset)
        }
      }
    });

  } catch (error) {
    console.error('❌ Error fetching user feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch feedback',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ========================================
// 📝 SUBMIT NEW FEEDBACK
// ========================================
router.post('/', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { feedbackMessage } = req.body;

    console.log('📝 User submitting feedback:', userId);

    // Validate
    if (!feedbackMessage || feedbackMessage.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Feedback message is required'
      });
    }

    if (feedbackMessage.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Feedback must be at least 10 characters'
      });
    }

    // Insert feedback
    const result = await db.query(
      `INSERT INTO feedback (user_id, message, status, unread_by_admin, unread_by_user)
       VALUES (?, ?, 'pending', 1, 0)`,
      [userId, feedbackMessage.trim()]
    );

    console.log('✅ Feedback submitted successfully');

    res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully',
      data: {
        feedbackId: result.insertId
      }
    });

  } catch (error) {
    console.error('❌ Error submitting feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit feedback',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ========================================
// ✅ MARK FEEDBACK AS READ (USER)
// ========================================
router.put('/:id/mark-read', async (req, res) => {
  try {
    const userId = req.user.userId;
    const feedbackId = req.params.id;

    console.log('✅ User marking feedback as read:', { userId, feedbackId });

    const result = await db.query(
      'UPDATE feedback SET unread_by_user = 0 WHERE feedback_id = ? AND user_id = ?',
      [feedbackId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    console.log('✅ Marked as read');

    res.json({
      success: true,
      message: 'Marked as read'
    });

  } catch (error) {
    console.error('❌ Error marking as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark as read',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ========================================
// 🗑️ DELETE OWN FEEDBACK
// ========================================
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user.userId;
    const feedbackId = req.params.id;

    console.log('🗑️ User deleting feedback:', { userId, feedbackId });

    const result = await db.query(
      'DELETE FROM feedback WHERE feedback_id = ? AND user_id = ?',
      [feedbackId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    console.log('✅ Feedback deleted');

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