import express from 'express';
import db from '../db.js';
import authenticateToken from '../middleware/auth.js';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Configure multer for profile picture upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/profiles';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `profile-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (jpeg, jpg, png, gif)'));
    }
  }
});

// GET user's dietary preferences
router.get('/dietary', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    console.log('📥 Fetching dietary data for user:', userId);

    // Get user restrictions with restriction details
    const restrictions = await db.query(`
      SELECT 
        r.restriction_name,
        rc.category_name,
        ur.status
      FROM user_restrictions ur
      JOIN restrictions r ON ur.restriction_id = r.restriction_id
      JOIN restriction_categories rc ON r.category_id = rc.category_id
      WHERE ur.user_id = ? AND ur.member_id IS NULL AND ur.status = 'active'
    `, [userId]);

    // Get excluded ingredients
    const excludedIngredients = await db.query(`
      SELECT ingredient_name
      FROM user_excluded_ingredients
      WHERE user_id = ? AND member_id IS NULL
    `, [userId]);

    // Organize data by category
    // Category 1 (Allergy) + Category 2 (Intolerance) = Medical Conditions
    // Dietary Lifestyle removed - no longer needed
    const dietaryRestrictions = []; // Empty - not used, replaced by medicalConditions
    const medicalConditions = [];
    const preferredDiets = []; // Empty - dietary lifestyle removed

    restrictions.forEach(item => {
      if (item.category_name === 'Allergy' || item.category_name === 'Intolerance') {
        // Both Allergy and Intolerance go to Medical Conditions
        medicalConditions.push(item.restriction_name);
      }
      // Dietary Lifestyle category removed - no longer processed
    });

    const excludedList = excludedIngredients.map(item => item.ingredient_name);

    console.log('✅ Dietary data fetched successfully:', {
      dietaryRestrictions: dietaryRestrictions.length,
      medicalConditions: medicalConditions.length,
      preferredDiets: preferredDiets.length,
      excludedIngredients: excludedList.length
    });

    res.json({
      success: true,
      data: {
        dietaryRestrictions,
        medicalConditions,
        preferredDiets,
        excludedIngredients: excludedList
      }
    });

  } catch (error) {
    console.error('❌ Error fetching dietary data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dietary preferences',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET user's basic profile info
router.get('/info', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    console.log('📥 Fetching user info for user ID:', userId);
    
    const users = await db.query(`
      SELECT user_id, email, first_name, last_name, profile_picture_url, created_at, last_login, google_id, password_hash, is_new_user
      FROM users
      WHERE user_id = ?
    `, [userId]);

    if (!users || users.length === 0) {
      console.log('❌ User not found:', userId);
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = users[0];
    const isGoogleUser = !!user.google_id && !user.password_hash;
    
    // Check if user has completed onboarding (has dietary preferences)
    const [restrictionsResult] = await db.query(
      'SELECT COUNT(*) as count FROM user_restrictions WHERE user_id = ? AND member_id IS NULL',
      [userId]
    );
    const hasCompletedOnboarding = restrictionsResult[0]?.count > 0 || user.is_new_user === 0;
    
    console.log('✅ User info fetched:', { 
      userId: user.user_id, 
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      hasProfilePicture: !!user.profile_picture_url,
      isGoogleUser: isGoogleUser,
      isNewUser: user.is_new_user === 1,
      hasCompletedOnboarding: hasCompletedOnboarding
    });

    res.json({
      success: true,
      data: {
        userId: user.user_id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        profilePicture: user.profile_picture_url,
        createdAt: user.created_at,
        lastLogin: user.last_login,
        googleId: user.google_id,
        hasPassword: !!user.password_hash,
        isNewUser: user.is_new_user === 1,
        hasCompletedOnboarding: hasCompletedOnboarding
      }
    });

  } catch (error) {
    console.error('❌ Error fetching user info:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user information',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST upload/update profile picture
router.post('/profile-picture', authenticateToken, upload.single('profilePicture'), async (req, res) => {
  try {
    const userId = req.user.userId;
    console.log('📤 Uploading profile picture for user:', userId);
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Get old profile picture to delete
    const users = await db.query('SELECT profile_picture_url FROM users WHERE user_id = ?', [userId]);
    const oldPicture = users[0]?.profile_picture_url;

    // Delete old profile picture if it exists
    if (oldPicture) {
      const oldPath = path.join(process.cwd(), oldPicture);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
        console.log('🗑️ Deleted old profile picture:', oldPath);
      }
    }

    // Save new profile picture path (relative path for database)
    const profilePicturePath = `/uploads/profiles/${req.file.filename}`;
    
    await db.query(
      'UPDATE users SET profile_picture_url = ? WHERE user_id = ?',
      [profilePicturePath, userId]
    );

    console.log('✅ Profile picture updated for user:', userId);

    res.json({
      success: true,
      message: 'Profile picture updated successfully',
      data: {
        profilePicture: profilePicturePath
      }
    });

  } catch (error) {
    console.error('❌ Error updating profile picture:', error);
    
    // Clean up uploaded file if database update fails
    if (req.file) {
      const filePath = path.join(process.cwd(), 'uploads/profiles', req.file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log('🗑️ Cleaned up failed upload:', filePath);
      }
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update profile picture',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// PUT update user's basic info
router.put('/info', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { firstName, lastName, email } = req.body;

    console.log('📝 Updating user info for user:', userId, { firstName, lastName, email });

    // Validate input
    if (!firstName || !lastName || !email) {
      return res.status(400).json({
        success: false,
        message: 'First name, last name, and email are required'
      });
    }

    // Check if email is already taken by another user
    const existingUsers = await db.query(
      'SELECT user_id FROM users WHERE email = ? AND user_id != ?',
      [email, userId]
    );

    if (existingUsers && existingUsers.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Email is already in use'
      });
    }

    // Update user info
    await db.query(
      'UPDATE users SET first_name = ?, last_name = ?, email = ? WHERE user_id = ?',
      [firstName, lastName, email, userId]
    );

    console.log('✅ User info updated for user:', userId);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        firstName,
        lastName,
        email
      }
    });

  } catch (error) {
    console.error('❌ Error updating user info:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// PUT update dietary preferences
router.put('/dietary', authenticateToken, async (req, res) => {
  let connection;
  
  try {
    const userId = req.user.userId;
    const { dietaryRestrictions, medicalConditions, excludedIngredients } = req.body;
    // preferredDiets removed - dietary lifestyle category removed

    console.log('📝 Updating dietary preferences for user:', userId);

    // Get connection for transaction
    connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      // Delete existing restrictions for this user (only main profile, not members)
      await connection.query(
        'DELETE FROM user_restrictions WHERE user_id = ? AND member_id IS NULL',
        [userId]
      );

      // Delete existing excluded ingredients
      await connection.query(
        'DELETE FROM user_excluded_ingredients WHERE user_id = ? AND member_id IS NULL',
        [userId]
      );

      // Get restriction IDs from restriction_name (only medical conditions - dietary lifestyle removed)
      const allRestrictions = [
        ...(dietaryRestrictions || []),
        ...(medicalConditions || [])
        // preferredDiets removed - dietary lifestyle category removed
      ];

      if (allRestrictions.length > 0) {
        const placeholders = allRestrictions.map(() => '?').join(',');
        const [restrictionData] = await connection.query(
          `SELECT restriction_id, restriction_name FROM restrictions WHERE restriction_name IN (${placeholders})`,
          allRestrictions
        );

        // Insert new restrictions
        if (restrictionData && restrictionData.length > 0) {
          for (const restriction of restrictionData) {
            await connection.query(
              'INSERT INTO user_restrictions (user_id, member_id, restriction_id, status) VALUES (?, NULL, ?, ?)',
              [userId, restriction.restriction_id, 'active']
            );
          }
        }
      }

      // Insert excluded ingredients
      if (excludedIngredients && excludedIngredients.length > 0) {
        for (const ingredient of excludedIngredients) {
          if (ingredient.trim()) {
            await connection.query(
              'INSERT INTO user_excluded_ingredients (user_id, member_id, ingredient_name) VALUES (?, NULL, ?)',
              [userId, ingredient.trim()]
            );
          }
        }
      }

      // Mark user as having completed onboarding (set is_new_user to 0)
      await connection.query(
        'UPDATE users SET is_new_user = 0 WHERE user_id = ?',
        [userId]
      );
      console.log('✅ User marked as having completed onboarding');

      // Commit transaction
      await connection.commit();
      console.log('✅ Dietary preferences updated successfully');

      res.json({
        success: true,
        message: 'Dietary preferences updated successfully'
      });

    } catch (error) {
      // Rollback on error
      await connection.rollback();
      throw error;
    }

  } catch (error) {
    console.error('❌ Error updating dietary preferences:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update dietary preferences',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    // Release connection back to pool
    if (connection) {
      connection.release();
    }
  }
});

// PUT change password (supports both manual users and Google users adding password)
router.put('/change-password', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { currentPassword, newPassword } = req.body;

    console.log('🔒 Attempting to change/set password for user:', userId);

    // Validate new password is provided
    if (!newPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password is required'
      });
    }

    // Validate new password strength
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters long'
      });
    }

    const hasUpper = /[A-Z]/.test(newPassword);
    const hasLower = /[a-z]/.test(newPassword);
    const hasNumber = /\d/.test(newPassword);

    if (!hasUpper || !hasLower || !hasNumber) {
      return res.status(400).json({
        success: false,
        message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
      });
    }

    // Get current password hash and Google ID
    const users = await db.query(
      'SELECT password_hash, google_id FROM users WHERE user_id = ?',
      [userId]
    );

    if (!users || users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = users[0];
    const isGoogleUser = !!user.google_id && !user.password_hash;

    // CASE 1: Google user setting password for the first time (enable manual login)
    if (isGoogleUser) {
      console.log('✨ Google user setting password for first time - enabling manual login');
      
      // Google users don't need current password since they don't have one
      const newPasswordHash = await bcrypt.hash(newPassword, 10);

      await db.query(
        'UPDATE users SET password_hash = ? WHERE user_id = ?',
        [newPasswordHash, userId]
      );

      console.log('✅ Password set successfully for Google user:', userId);

      return res.json({
        success: true,
        message: 'Password set successfully! You can now log in with email and password.',
        isGoogleUser: true
      });
    }

    // CASE 2: Manual user changing existing password
    if (!currentPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password is required'
      });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await db.query(
      'UPDATE users SET password_hash = ? WHERE user_id = ?',
      [newPasswordHash, userId]
    );

    console.log('✅ Password changed successfully for user:', userId);

    res.json({
      success: true,
      message: 'Password changed successfully',
      isGoogleUser: false
    });

  } catch (error) {
    console.error('❌ Error changing password:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;