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
    // ✅ FIX: Get memberId from query parameter (for "Others") or use null (for "Myself")
    // Handle both string and number, and also handle "null" string
    let memberId = null;
    if (req.query.memberId && req.query.memberId !== 'null' && req.query.memberId !== 'undefined') {
      memberId = parseInt(req.query.memberId);
      if (isNaN(memberId)) {
        console.warn('⚠️ Invalid memberId in query:', req.query.memberId);
        memberId = null;
      }
    }
    
    console.log('📥 Fetching dietary data for user:', userId, memberId ? `member: ${memberId}` : '(user profile)');
    console.log('📊 Query parameters:', {
      memberId: req.query.memberId,
      parsedMemberId: memberId,
      allQuery: req.query
    });

    // ✅ FIX: Fetch restrictions based on memberId
    // If memberId is provided, fetch for that member; otherwise fetch for user (member_id IS NULL)
    let restrictions;
    if (memberId) {
      console.log(`🔍 Fetching restrictions for member_id = ${memberId}`);
      restrictions = await db.query(`
        SELECT 
          r.restriction_name,
          rc.category_name,
          ur.status,
          ur.member_id
        FROM user_restrictions ur
        JOIN restrictions r ON ur.restriction_id = r.restriction_id
        JOIN restriction_categories rc ON r.category_id = rc.category_id
        WHERE ur.user_id = ? AND ur.member_id = ? AND ur.status = 'active'
      `, [userId, memberId]);
      console.log(`📊 Found ${restrictions.length} restrictions for member ${memberId}:`, restrictions);
    } else {
      console.log(`🔍 Fetching restrictions for user profile (member_id IS NULL)`);
      restrictions = await db.query(`
        SELECT 
          r.restriction_name,
          rc.category_name,
          ur.status,
          ur.member_id
        FROM user_restrictions ur
        JOIN restrictions r ON ur.restriction_id = r.restriction_id
        JOIN restriction_categories rc ON r.category_id = rc.category_id
        WHERE ur.user_id = ? AND ur.member_id IS NULL AND ur.status = 'active'
      `, [userId]);
      console.log(`📊 Found ${restrictions.length} restrictions for user profile:`, restrictions);
    }

    // ✅ FIX: Fetch excluded ingredients based on memberId
    let excludedIngredients;
    if (memberId) {
      console.log(`🔍 Fetching excluded ingredients for member_id = ${memberId}`);
      excludedIngredients = await db.query(`
        SELECT ingredient_name, member_id
        FROM user_excluded_ingredients
        WHERE user_id = ? AND member_id = ?
      `, [userId, memberId]);
      console.log(`📊 Found ${excludedIngredients.length} excluded ingredients for member ${memberId}:`, excludedIngredients);
    } else {
      console.log(`🔍 Fetching excluded ingredients for user profile (member_id IS NULL)`);
      excludedIngredients = await db.query(`
        SELECT ingredient_name, member_id
        FROM user_excluded_ingredients
        WHERE user_id = ? AND member_id IS NULL
      `, [userId]);
      console.log(`📊 Found ${excludedIngredients.length} excluded ingredients for user profile:`, excludedIngredients);
    }

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
      memberId: memberId || 'user profile',
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
      SELECT user_id, email, first_name, last_name, profile_picture_url, created_at, last_login, google_id, password_hash, is_new_user, cooking_for_type
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
    // ✅ FIX: db.query already returns rows array, no need to destructure
    const restrictionsResult = await db.query(
      'SELECT COUNT(*) as count FROM user_restrictions WHERE user_id = ? AND member_id IS NULL',
      [userId]
    );
    const hasCompletedOnboarding = restrictionsResult[0]?.count > 0 || user.is_new_user === 0;
    
    // Get cooking for preference from cooking_for_type column
    let cookingFor = user.cooking_for_type || 'Myself';
    let cookingForName = cookingFor; // Default to the same value

    // If cooking for "Others", fetch the member's name
    if (cookingFor === 'Others') {
      const memberResult = await db.query(
        'SELECT name FROM user_members WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
        [userId]
      );
      if (memberResult && memberResult.length > 0) {
        cookingForName = memberResult[0].name;
      }
    }

    console.log('✅ Cooking for type:', cookingFor, ', Name:', cookingForName);

    console.log('✅ User info fetched:', {
      userId: user.user_id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      hasProfilePicture: !!user.profile_picture_url,
      isGoogleUser: isGoogleUser,
      isNewUser: user.is_new_user === 1,
      hasCompletedOnboarding: hasCompletedOnboarding,
      cookingFor: cookingFor,
      cookingForName: cookingForName
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
        hasCompletedOnboarding: hasCompletedOnboarding,
        cookingFor: cookingFor,
        cookingForName: cookingForName
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
// ✅ UPDATED: Store profile picture as base64 in database instead of file path
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

    // ✅ Convert file to base64 data URI
    const fileBuffer = fs.readFileSync(req.file.path);
    const base64Data = fileBuffer.toString('base64');
    const mimeType = req.file.mimetype;
    const base64DataUri = `data:${mimeType};base64,${base64Data}`;
    
    // ✅ Validate base64 image size (max 5MB base64 = ~3.75MB actual)
    const base64Size = (base64Data.length * 3) / 4; // Approximate size
    const maxSize = 5 * 1024 * 1024; // 5MB
    
    if (base64Size > maxSize) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: `Image is too large (${(base64Size / 1024 / 1024).toFixed(2)}MB). Maximum size is 5MB. Please compress the image.`
      });
    }

    console.log(`📊 Profile picture size: ${(base64Size / 1024).toFixed(2)} KB (base64)`);

    // ✅ Store base64 data URI directly in database
    await db.query(
      'UPDATE users SET profile_picture_url = ? WHERE user_id = ?',
      [base64DataUri, userId]
    );

    // ✅ Clean up temporary file after storing in database
    fs.unlinkSync(req.file.path);
    console.log('🗑️ Cleaned up temporary file:', req.file.path);

    console.log('✅ Profile picture updated for user:', userId);

    res.json({
      success: true,
      message: 'Profile picture updated successfully',
      data: {
        profilePicture: base64DataUri
      }
    });

  } catch (error) {
    console.error('❌ Error updating profile picture:', error);
    
    // Clean up uploaded file if database update fails
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
      console.log('🗑️ Cleaned up failed upload:', req.file.path);
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
    console.log('📊 Update data:', {
      medicalConditionsCount: (medicalConditions || []).length,
      excludedIngredientsCount: (excludedIngredients || []).length,
      medicalConditions: medicalConditions || [],
      excludedIngredients: excludedIngredients || []
    });

    // ✅ Allow empty updates - user can clear all preferences if they want
    // This is valid: user might want to remove all restrictions/ingredients

    // Get connection for transaction
    connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      // Delete existing restrictions for this user (only main profile, not members)
      await connection.query(
        'DELETE FROM user_restrictions WHERE user_id = ? AND member_id IS NULL',
        [userId]
      );
      console.log('🗑️ Deleted existing user restrictions');

      // Delete existing excluded ingredients
      await connection.query(
        'DELETE FROM user_excluded_ingredients WHERE user_id = ? AND member_id IS NULL',
        [userId]
      );
      console.log('🗑️ Deleted existing excluded ingredients');

      // Get restriction IDs from restriction_name (only medical conditions - dietary lifestyle removed)
      const allRestrictions = [
        ...(dietaryRestrictions || []),
        ...(medicalConditions || [])
        // preferredDiets removed - dietary lifestyle category removed
      ];

      if (allRestrictions.length > 0) {
        console.log(`📋 Processing ${allRestrictions.length} medical conditions...`);
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
          console.log(`✅ Inserted ${restrictionData.length} medical conditions`);
        } else {
          console.log('⚠️ No matching restrictions found in database');
        }
      } else {
        console.log('ℹ️ No medical conditions to insert (empty array is valid - user cleared all)');
      }

      // Insert excluded ingredients
      if (excludedIngredients && excludedIngredients.length > 0) {
        console.log(`🥗 Processing ${excludedIngredients.length} excluded ingredients...`);
        for (const ingredient of excludedIngredients) {
          if (ingredient && ingredient.trim()) {
            await connection.query(
              'INSERT INTO user_excluded_ingredients (user_id, member_id, ingredient_name) VALUES (?, NULL, ?)',
              [userId, ingredient.trim()]
            );
          }
        }
        console.log('✅ Excluded ingredients inserted');
      } else {
        console.log('ℹ️ No excluded ingredients to insert (empty array is valid - user cleared all)');
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

// DELETE account - Permanently delete user account and all associated data
router.delete('/account', authenticateToken, async (req, res) => {
  let connection;
  
  try {
    const userId = req.user.userId;
    console.log('🗑️  Deleting account for user:', userId);

    // Get connection for transaction
    connection = await db.pool.getConnection();
    await connection.beginTransaction();

    try {
      // ✅ COMPREHENSIVE: Delete all user-related data in the correct order (respecting foreign key constraints)
      // Order matters: Delete child records before parent records to prevent FK constraint violations
      
      // 1. Delete feedback_replies FIRST (references feedback_id, not user_id directly)
      // We need to delete feedback_replies for all feedback entries of this user BEFORE deleting feedback
      try {
        const [feedbackIds] = await connection.query(
          'SELECT feedback_id FROM feedback WHERE user_id = ?',
          [userId]
        );
        if (feedbackIds && Array.isArray(feedbackIds) && feedbackIds.length > 0) {
          const feedbackIdList = feedbackIds.map(f => f.feedback_id).filter(Boolean);
          if (feedbackIdList.length > 0) {
            const placeholders = feedbackIdList.map(() => '?').join(',');
            await connection.query(
              `DELETE FROM feedback_replies WHERE feedback_id IN (${placeholders})`,
              feedbackIdList
            );
            console.log(`✅ Deleted ${feedbackIdList.length} feedback replies`);
          }
        }
      } catch (err) {
        if (err.code === 'ER_NO_SUCH_TABLE' || err.code === '42S02') {
          console.log('⚠️  feedback_replies table not found, skipping');
        } else {
          console.warn('⚠️  Could not delete feedback_replies:', err.message);
          // Don't throw - continue with other deletions
        }
      }

      // 2. Delete pending_requests (if exists)
      try {
        await connection.query(
          'DELETE FROM pending_requests WHERE user_id = ?',
          [userId]
        );
        console.log('✅ Deleted pending requests');
      } catch (err) {
        if (err.code === 'ER_NO_SUCH_TABLE' || err.code === '42S02') {
          console.log('⚠️  pending_requests table not found, skipping');
        } else {
          console.warn('⚠️  Could not delete pending_requests:', err.message);
        }
      }

      // 3. Delete user_members (CRITICAL - has foreign key constraint to users)
      // Also delete member-related restrictions and ingredients
      try {
        // First, get all member_ids for this user
        const [memberRows] = await connection.query(
          'SELECT member_id FROM user_members WHERE user_id = ?',
          [userId]
        );
        
        if (memberRows && Array.isArray(memberRows) && memberRows.length > 0) {
          const memberIds = memberRows.map(m => m.member_id).filter(Boolean);
          if (memberIds.length > 0) {
            const memberPlaceholders = memberIds.map(() => '?').join(',');
            
            // Delete member-related restrictions
            try {
              await connection.query(
                `DELETE FROM user_restrictions WHERE member_id IN (${memberPlaceholders})`,
                memberIds
              );
              console.log(`✅ Deleted user_restrictions for ${memberIds.length} members`);
            } catch (memberRestErr) {
              console.warn('⚠️  Could not delete member restrictions:', memberRestErr.message);
              // Don't throw - continue with other deletions
            }
            
            // Delete member-related excluded ingredients
            try {
              await connection.query(
                `DELETE FROM user_excluded_ingredients WHERE member_id IN (${memberPlaceholders})`,
                memberIds
              );
              console.log(`✅ Deleted user_excluded_ingredients for ${memberIds.length} members`);
            } catch (memberIngErr) {
              console.warn('⚠️  Could not delete member ingredients:', memberIngErr.message);
              // Don't throw - continue with other deletions
            }
          }
        }
        
        // Now delete the members themselves
        await connection.query(
          'DELETE FROM user_members WHERE user_id = ?',
          [userId]
        );
        console.log('✅ Deleted user members');
      } catch (err) {
        if (err.code === 'ER_NO_SUCH_TABLE' || err.code === '42S02') {
          console.log('⚠️  user_members table not found, skipping');
        } else {
          console.warn('⚠️  Could not delete user_members:', err.message);
          // Don't throw - continue with other deletions (user_members might not exist for all users)
        }
      }

      // 4. Delete user_restrictions (CRITICAL - has foreign key constraint to users)
      try {
        await connection.query(
          'DELETE FROM user_restrictions WHERE user_id = ?',
          [userId]
        );
        console.log('✅ Deleted user restrictions');
      } catch (err) {
        if (err.code === 'ER_NO_SUCH_TABLE' || err.code === '42S02') {
          console.log('⚠️  user_restrictions table not found, skipping');
        } else {
          console.warn('⚠️  Could not delete user_restrictions:', err.message);
        }
      }

      // 5. Delete user notifications
      try {
        await connection.query(
          'DELETE FROM notifications WHERE user_id = ?',
          [userId]
        );
        console.log('✅ Deleted user notifications');
      } catch (err) {
        if (err.code === 'ER_NO_SUCH_TABLE' || err.code === '42S02') {
          console.log('⚠️  notifications table not found, skipping');
        } else {
          console.warn('⚠️  Could not delete notifications:', err.message);
        }
      }

      // 6. Delete user recipe interactions (favorites, tried, ratings)
      try {
        await connection.query(
          'DELETE FROM user_recipe_interactions WHERE user_id = ?',
          [userId]
        );
        console.log('✅ Deleted user recipe interactions');
      } catch (err) {
        console.warn('⚠️  Could not delete user_recipe_interactions:', err.message);
      }

      // 7. Delete user last opened recipes
      try {
        await connection.query(
          'DELETE FROM user_last_opened_recipes WHERE user_id = ?',
          [userId]
        );
        console.log('✅ Deleted user last opened recipes');
      } catch (err) {
        if (err.code === 'ER_NO_SUCH_TABLE' || err.code === '42S02') {
          console.log('⚠️  user_last_opened_recipes table not found, skipping');
        } else {
          console.warn('⚠️  Could not delete user_last_opened_recipes:', err.message);
        }
      }

      // 8. Delete user scanned ingredients
      try {
        await connection.query(
          'DELETE FROM user_scanned_ingredients WHERE user_id = ?',
          [userId]
        );
        console.log('✅ Deleted user scanned ingredients');
      } catch (err) {
        console.warn('⚠️  Could not delete user_scanned_ingredients:', err.message);
      }

      // 9. Delete user dietary restrictions
      try {
        await connection.query(
          'DELETE FROM user_dietary_restrictions WHERE user_id = ?',
          [userId]
        );
        console.log('✅ Deleted user dietary restrictions');
      } catch (err) {
        if (err.code === 'ER_NO_SUCH_TABLE' || err.code === '42S02') {
          console.log('⚠️  user_dietary_restrictions table not found, skipping');
        } else {
          console.warn('⚠️  Could not delete user_dietary_restrictions:', err.message);
        }
      }

      // 10. Delete user excluded ingredients
      try {
        await connection.query(
          'DELETE FROM user_excluded_ingredients WHERE user_id = ?',
          [userId]
        );
        console.log('✅ Deleted user excluded ingredients');
      } catch (err) {
        console.warn('⚠️  Could not delete user_excluded_ingredients:', err.message);
      }

      // 11. Delete user preferred diets
      try {
        await connection.query(
          'DELETE FROM user_preferred_diets WHERE user_id = ?',
          [userId]
        );
        console.log('✅ Deleted user preferred diets');
      } catch (err) {
        if (err.code === 'ER_NO_SUCH_TABLE' || err.code === '42S02') {
          console.log('⚠️  user_preferred_diets table not found, skipping');
        } else {
          console.warn('⚠️  Could not delete user_preferred_diets:', err.message);
        }
      }

      // 12. Delete user medical conditions
      try {
        await connection.query(
          'DELETE FROM user_medical_conditions WHERE user_id = ?',
          [userId]
        );
        console.log('✅ Deleted user medical conditions');
      } catch (err) {
        if (err.code === 'ER_NO_SUCH_TABLE' || err.code === '42S02') {
          console.log('⚠️  user_medical_conditions table not found, skipping');
        } else {
          console.warn('⚠️  Could not delete user_medical_conditions:', err.message);
        }
      }

      // 13. Delete user saved recipes
      try {
        await connection.query(
          'DELETE FROM user_saved_recipes WHERE user_id = ?',
          [userId]
        );
        console.log('✅ Deleted user saved recipes');
      } catch (err) {
        if (err.code === 'ER_NO_SUCH_TABLE' || err.code === '42S02') {
          console.log('⚠️  user_saved_recipes table not found, skipping');
        } else {
          console.warn('⚠️  Could not delete user_saved_recipes:', err.message);
        }
      }

      // 14. Delete user pantry selections
      try {
        await connection.query(
          'DELETE FROM user_pantry_selections WHERE user_id = ?',
          [userId]
        );
        console.log('✅ Deleted user pantry selections');
      } catch (err) {
        if (err.code === 'ER_NO_SUCH_TABLE' || err.code === '42S02') {
          console.log('⚠️  user_pantry_selections table not found, skipping');
        } else {
          console.warn('⚠️  Could not delete user_pantry_selections:', err.message);
        }
      }

      // 15. Delete user feedback (after feedback_replies)
      try {
        await connection.query(
          'DELETE FROM feedback WHERE user_id = ?',
          [userId]
        );
        console.log('✅ Deleted user feedback');
      } catch (err) {
        console.warn('⚠️  Could not delete feedback:', err.message);
      }

      // 16. Delete profile picture file if exists
      try {
        const [users] = await connection.query(
          'SELECT profile_picture_url FROM users WHERE user_id = ?',
          [userId]
        );
        const oldPicture = users[0]?.profile_picture_url;
        if (oldPicture && !oldPicture.startsWith('data:image')) {
          // Only delete file if it's not a base64 data URI
          const oldPath = path.join(process.cwd(), oldPicture);
          if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
            console.log('✅ Deleted profile picture file');
          }
        }
      } catch (err) {
        console.warn('⚠️  Could not delete profile picture file:', err.message);
      }

      // 17. Finally, delete the user account itself
      await connection.query(
        'DELETE FROM users WHERE user_id = ?',
        [userId]
      );
      console.log('✅ Deleted user account');

      // Commit transaction
      await connection.commit();
      console.log('✅ Account deletion completed successfully - all user data removed');

      res.json({
        success: true,
        message: 'Account and all associated data deleted successfully'
      });

    } catch (error) {
      // Rollback on error
      if (connection) {
        try {
          await connection.rollback();
          console.log('✅ Transaction rolled back successfully');
        } catch (rollbackErr) {
          console.error('❌ Error during rollback:', rollbackErr.message);
        }
      }
      throw error;
    }

  } catch (error) {
    console.error('❌ Error deleting account:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
    
    // Check for connection-related errors (common with cloud databases)
    const isConnectionError = 
      error.code === 'ECONNRESET' || 
      error.code === 'PROTOCOL_CONNECTION_LOST' ||
      error.code === 'ETIMEDOUT' ||
      error.code === 'ENOTFOUND' ||
      error.code === 'ECONNREFUSED' ||
      error.message?.includes('Connection lost') ||
      error.message?.includes('timeout') ||
      error.message?.includes('Connection closed');
    
    // Provide more specific error messages
    let errorMessage = 'Failed to delete account';
    let statusCode = 500;
    
    if (isConnectionError) {
      errorMessage = 'Database connection error. Please try again.';
      statusCode = 503;
    } else if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.code === '23000' || error.sqlState === '23000') {
      errorMessage = 'Cannot delete account: Data integrity constraint violation.';
      statusCode = 400;
    } else if (error.code === 'ER_NO_SUCH_TABLE' || error.code === '42S02') {
      // Table doesn't exist - this shouldn't cause a failure, but log it
      console.warn('⚠️ Table not found error during deletion:', error.message);
      errorMessage = 'Some data could not be deleted. Please contact support.';
      statusCode = 500;
    }
    
    res.status(statusCode).json({
      success: false,
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      errorCode: error.code,
      isConnectionError: isConnectionError
    });
  } finally {
    // Release connection back to pool
    if (connection) {
      try {
        connection.release();
      } catch (releaseErr) {
        console.error('❌ Error releasing connection:', releaseErr.message);
      }
    }
  }
});

// GET user's family members
router.get('/members', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    console.log('📥 Fetching members for user:', userId);

    const members = await db.query(`
      SELECT
        member_id,
        name,
        relationship,
        age_group,
        created_at
      FROM user_members
      WHERE user_id = ?
      ORDER BY created_at DESC
    `, [userId]);

    console.log(`✅ Found ${members.length} members for user ${userId}`);

    res.json({
      success: true,
      data: members
    });
  } catch (error) {
    console.error('❌ Error fetching members:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch members',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// PUT update cooking for preference (text only)
router.put('/cooking-for', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { cookingFor, memberName } = req.body;

    // Normalize the cookingFor value: if it doesn't match "Myself" (case-insensitive), treat as "Others"
    const normalizedCookingFor = cookingFor?.trim().toLowerCase() === 'myself' 
      ? 'Myself' 
      : 'Others';

    console.log('💾 Updating cooking for preference:', {
      userId,
      originalValue: cookingFor,
      normalizedValue: normalizedCookingFor,
      memberName: memberName
    });

    // Update cooking_for_type in users table
    await db.query(`
      UPDATE users
      SET
        cooking_for_type = ?,
        updated_at = NOW()
      WHERE user_id = ?
    `, [normalizedCookingFor, userId]);

    // If cooking for "Others", ensure a member record exists in user_members table
    if (normalizedCookingFor === 'Others') {
      // Check if user already has a member record
      const existingMembers = await db.query(
        'SELECT member_id, name FROM user_members WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
        [userId]
      );

      if (!existingMembers || existingMembers.length === 0) {
        // No member exists, create one
        // Use memberName if provided, otherwise use the original cookingFor value (trimmed)
        const nameToUse = memberName?.trim() || cookingFor?.trim() || 'Family Member';
        
        console.log('📝 Creating member record in user_members table:', {
          userId,
          name: nameToUse
        });

        const insertResult = await db.query(`
          INSERT INTO user_members (user_id, name, relationship, cooking_for_type)
          VALUES (?, ?, 'Other', 'profile_setup')
        `, [userId, nameToUse]);

        // db.query returns ResultSetHeader directly for INSERT queries
        const memberId = insertResult?.insertId || null;

        console.log('✅ Member record created successfully:', {
          memberId: memberId,
          name: nameToUse
        });
      } else {
        // Member exists - optionally update the name if memberName is provided and different
        if (memberName && memberName.trim() && memberName.trim() !== existingMembers[0].name) {
          console.log('📝 Updating existing member name:', {
            memberId: existingMembers[0].member_id,
            oldName: existingMembers[0].name,
            newName: memberName.trim()
          });

          await db.query(`
            UPDATE user_members
            SET name = ?
            WHERE member_id = ?
          `, [memberName.trim(), existingMembers[0].member_id]);

          console.log('✅ Member name updated successfully');
        } else {
          console.log('ℹ️ Member record already exists, keeping existing name:', existingMembers[0].name);
        }
      }
    }

    console.log('✅ Cooking for preference updated successfully');

    res.json({
      success: true,
      message: 'Cooking for preference updated successfully',
      data: {
        cookingFor: normalizedCookingFor
      }
    });
  } catch (error) {
    console.error('❌ Error updating cooking for preference:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update cooking for preference',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;