const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authenticateToken } = require('../middleware/auth');

// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT user_id, first_name, last_name, email, profile_picture_url FROM users WHERE user_id = ?',
      [req.user.userId]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const user = users[0];
    
    // Get user preferences
    const [preferences] = await pool.query(
      'SELECT * FROM user_preferences WHERE user_id = ?',
      [user.user_id]
    );
    
    // Get user restrictions
    const [restrictions] = await pool.query(
      `SELECT r.restriction_id, r.restriction_name, rc.category_name 
       FROM user_restrictions ur
       JOIN restrictions r ON ur.restriction_id = r.restriction_id
       JOIN restriction_categories rc ON r.category_id = rc.category_id
       WHERE ur.user_id = ? AND ur.status = 'approved'`,
      [user.user_id]
    );
    
    res.json({
      ...user,
      preferences: preferences[0] || {},
      restrictions
    });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching profile' });
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { firstName, lastName, profilePictureUrl } = req.body;
    
    await pool.query(
      'UPDATE users SET first_name = ?, last_name = ?, profile_picture_url = ? WHERE user_id = ?',
      [firstName, lastName, profilePictureUrl, req.user.userId]
    );
    
    res.json({ message: 'Profile updated successfully' });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error updating profile' });
  }
});

// Update user preferences
router.put('/preferences', authenticateToken, async (req, res) => {
  try {
    const { 
      preferredMealTypes, 
      notificationSettings, 
      measurementUnits, 
      themePreference, 
      dietaryGoal 
    } = req.body;
    
    // Check if preferences exist
    const [existingPrefs] = await pool.query(
      'SELECT * FROM user_preferences WHERE user_id = ?',
      [req.user.userId]
    );
    
    if (existingPrefs.length > 0) {
      // Update existing preferences
      await pool.query(
        `UPDATE user_preferences SET 
         preferred_meal_types = ?, 
         notification_settings = ?,
         measurement_units = ?,
         theme_preference = ?,
         dietary_goal = ?
         WHERE user_id = ?`,
        [
          JSON.stringify(preferredMealTypes),
          JSON.stringify(notificationSettings),
          measurementUnits,
          themePreference,
          dietaryGoal,
          req.user.userId
        ]
      );
    } else {
      // Insert new preferences
      await pool.query(
        `INSERT INTO user_preferences 
         (user_id, preferred_meal_types, notification_settings, measurement_units, theme_preference, dietary_goal)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          req.user.userId,
          JSON.stringify(preferredMealTypes),
          JSON.stringify(notificationSettings),
          measurementUnits,
          themePreference,
          dietaryGoal
        ]
      );
    }
    
    res.json({ message: 'Preferences updated successfully' });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error updating preferences' });
  }
});

module.exports = router;