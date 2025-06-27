import express from 'express';
import pool from '../db.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Access denied' });
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid token' });
    req.user = user;
    next();
  });
};

// Get Profile
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
    const [preferences] = await pool.query('SELECT * FROM user_preferences WHERE user_id = ?', [req.user.userId]);
    const [restrictions] = await pool.query('SELECT r.restriction_name FROM user_restrictions ur JOIN restrictions r ON ur.restriction_id = r.restriction_id WHERE ur.user_id = ?', [req.user.userId]);
    res.json({
      id: user.user_id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      profilePicture: user.profile_picture_url,
      preferences: preferences[0] || {},
      restrictions: restrictions.map(r => r.restriction_name),
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update Profile
router.put('/profile', authenticateToken, async (req, res) => {
  const { firstName, lastName, profilePictureUrl } = req.body;
  try {
    await pool.query(
      'UPDATE users SET first_name = ?, last_name = ?, profile_picture_url = ? WHERE user_id = ?',
      [firstName, lastName, profilePictureUrl, req.user.userId]
    );
    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update Preferences
router.put('/preferences', authenticateToken, async (req, res) => {
  const { preferredMealTypes, notificationSettings, measurementUnits, themePreference, dietaryGoal } = req.body;
  try {
    const [existing] = await pool.query('SELECT * FROM user_preferences WHERE user_id = ?', [req.user.userId]);
    if (existing.length > 0) {
      await pool.query(
        'UPDATE user_preferences SET preferred_meal_types = ?, notification_settings = ?, measurement_units = ?, theme_preference = ?, dietary_goal = ?, updated_at = NOW() WHERE user_id = ?',
        [preferredMealTypes, notificationSettings, measurementUnits, themePreference, dietaryGoal, req.user.userId]
      );
    } else {
      await pool.query(
        'INSERT INTO user_preferences (user_id, preferred_meal_types, notification_settings, measurement_units, theme_preference, dietary_goal) VALUES (?, ?, ?, ?, ?, ?)',
        [req.user.userId, preferredMealTypes, notificationSettings, measurementUnits, themePreference, dietaryGoal]
      );
    }
    res.json({ message: 'Preferences updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;