import express from 'express';
import pool from '../db.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

// const authenticateToken = (req, res, next) => {
//   const authHeader = req.headers['authorization'];
//   const token = authHeader && authHeader.split(' ')[1];
//   if (!token) return res.status(401).json({ message: 'Access denied' });
//   jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
//     if (err) return res.status(403).json({ message: 'Invalid token' });
//     req.user = user;
//     next();
//   });
// };

const authenticateToken = (req, res, next) => {
    // BYPASS FOR TESTING - Set a default user
    console.log('🔓 BYPASSING AUTHENTICATION - USER ID: 1');
    req.user = { userId: 1 }; // Use your actual user_id from database
    next();
  };

// Create member profile (for "Others" option)
router.post('/member', authenticateToken, async (req, res) => {
  try {
    const { name, relationship } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Name is required' });
    }

    const [result] = await pool.query(`
      INSERT INTO user_members (user_id, name, relationship, cooking_for_type)
      VALUES (?, ?, ?, 'profile_setup')
    `, [req.user.userId, name.trim(), relationship || 'Other']);

    res.status(201).json({
      message: 'Member profile created successfully',
      memberId: result.insertId
    });
  } catch (error) {
    console.error('Error creating member profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Save user restrictions
router.post('/restrictions', authenticateToken, async (req, res) => {
  try {
    const { memberId, allergies, healthConditions, dietPreferences } = req.body;
    
    // Map frontend names to database IDs
    const restrictionMap = {
      'Nuts': 1, 'Seafood': 2, 'Eggs': 3, 'Dairy': 4, 'Soy': 5, 'Gluten': 6,
      'Diabetes': 7, 'Hypertension': 8, 'High Cholesterol': 9, 
      'Lactose Intolerance': 10, 'Gluten Intolerance': 11,
      'Vegetarian': 12, 'Vegan': 13, 'Keto': 14, 'Low-Carb': 15, 'Low-Sodium': 16
    };

    const allRestrictions = [...allergies, ...healthConditions, ...dietPreferences];
    const restrictionIds = allRestrictions.map(name => restrictionMap[name]).filter(id => id);

    // Delete existing restrictions
    await pool.query(`
      DELETE FROM user_restrictions 
      WHERE user_id = ? AND member_id ${memberId ? '= ?' : 'IS NULL'}
    `, memberId ? [req.user.userId, memberId] : [req.user.userId]);

    // Insert new restrictions
    if (restrictionIds.length > 0) {
      const values = restrictionIds.map(id => [
        req.user.userId, memberId || null, id, 'active'
      ]);
      const placeholders = values.map(() => '(?, ?, ?, ?)').join(',');
      
      await pool.query(`
        INSERT INTO user_restrictions (user_id, member_id, restriction_id, status)
        VALUES ${placeholders}
      `, values.flat());
    }

    res.json({ message: 'Restrictions saved successfully' });
  } catch (error) {
    console.error('Error saving restrictions:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Save excluded ingredients
router.post('/excluded-ingredients', authenticateToken, async (req, res) => {
  try {
    const { memberId, ingredients } = req.body;
    
    // Delete existing excluded ingredients
    await pool.query(`
      DELETE FROM user_excluded_ingredients 
      WHERE user_id = ? AND member_id ${memberId ? '= ?' : 'IS NULL'}
    `, memberId ? [req.user.userId, memberId] : [req.user.userId]);

    // Insert new excluded ingredients
    if (ingredients.length > 0) {
      const values = ingredients.map(ingredient => [
        req.user.userId, memberId || null, ingredient
      ]);
      const placeholders = values.map(() => '(?, ?, ?)').join(',');
      
      await pool.query(`
        INSERT INTO user_excluded_ingredients (user_id, member_id, ingredient_name)
        VALUES ${placeholders}
      `, values.flat());
    }

    res.json({ message: 'Excluded ingredients saved successfully' });
  } catch (error) {
    console.error('Error saving excluded ingredients:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;