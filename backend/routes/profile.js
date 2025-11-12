import express from 'express';
import pool from '../db.js';
import authenticateToken from '../middleware/auth.js';

const router = express.Router();

// Create member profile (for "Others" option)
router.post('/member', authenticateToken, async (req, res) => {
  try {
    const { name, relationship } = req.body;
    const userId = req.user?.userId;
    
    // Validate user ID
    if (!userId) {
      console.error('❌ No user ID found in request');
      return res.status(401).json({ 
        success: false,
        message: 'User authentication required' 
      });
    }
    
    // Validate name
    if (!name || !name.trim()) {
      return res.status(400).json({ 
        success: false,
        message: 'Name is required' 
      });
    }

    const trimmedName = name.trim();
    const relationshipValue = relationship?.trim() || 'Other';

    console.log('📝 Creating member profile:', {
      userId,
      name: trimmedName,
      relationship: relationshipValue
    });

    // Insert member into database
    // mysql2/promise returns [ResultSetHeader, fields] for INSERT queries
    // ResultSetHeader contains insertId, affectedRows, etc.
    let queryResult;
    try {
      queryResult = await pool.query(`
        INSERT INTO user_members (user_id, name, relationship, cooking_for_type)
        VALUES (?, ?, ?, 'profile_setup')
      `, [userId, trimmedName, relationshipValue]);
    } catch (queryError) {
      console.error('❌ Database query error:', queryError);
      throw queryError;
    }

    // Extract memberId from result
    // mysql2 returns [result, fields] where result is ResultSetHeader for INSERT
    let memberId = null;
    
    if (Array.isArray(queryResult) && queryResult.length >= 1) {
      const resultHeader = queryResult[0];
      memberId = resultHeader?.insertId || null;
    } else if (queryResult && typeof queryResult === 'object') {
      // Fallback: if it's not an array, try direct access
      memberId = queryResult.insertId || null;
    }
    
    if (!memberId) {
      console.error('❌ Failed to get member ID from insert result:', {
        queryResult,
        queryResultType: typeof queryResult,
        isArray: Array.isArray(queryResult),
        firstElement: Array.isArray(queryResult) ? queryResult[0] : 'N/A'
      });
      throw new Error('Failed to get member ID after insert');
    }

    console.log('✅ Member profile created successfully:', {
      memberId,
      userId,
      name: trimmedName
    });

    res.status(201).json({
      success: true,
      message: 'Member profile created successfully',
      memberId: memberId
    });
  } catch (error) {
    console.error('❌ Error creating member profile:', {
      error: error.message,
      code: error.code,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
    
    // Provide more specific error messages
    if (error.code === 'ER_NO_SUCH_TABLE') {
      return res.status(500).json({ 
        success: false,
        message: 'Database table not found. Please contact support.' 
      });
    } else if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ 
        success: false,
        message: 'A member with this name already exists for your account.' 
      });
    } else if (error.code === 'ER_BAD_FIELD_ERROR') {
      return res.status(500).json({ 
        success: false,
        message: 'Database schema error. Please contact support.' 
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Failed to create member profile. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// TEMPORARY: Delete all members (for testing/cleanup)
router.delete('/member/all', authenticateToken, async (req, res) => {
  try {
    console.log('🗑️  Deleting all records from user_members table...');
    
    const deleteResult = await pool.query('DELETE FROM user_members');
    const result = Array.isArray(deleteResult) ? deleteResult[0] : deleteResult;
    
    const deletedCount = result?.affectedRows || 0;
    console.log(`✅ Deleted ${deletedCount} record(s) from user_members table`);
    
    // Reset auto-increment counter
    await pool.query('ALTER TABLE user_members AUTO_INCREMENT = 1');
    console.log('✅ Reset auto-increment counter to 1');
    
    res.json({
      success: true,
      message: `Deleted ${deletedCount} member(s) successfully`,
      deletedCount: deletedCount
    });
  } catch (error) {
    console.error('❌ Error deleting all members:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete members',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Save user restrictions
router.post('/restrictions', authenticateToken, async (req, res) => {
  try {
    const { memberId, allergies, healthConditions, dietPreferences } = req.body;
    
    // Get restriction IDs from database by name (using new standard medical conditions)
    const allRestrictions = [...allergies, ...healthConditions, ...dietPreferences];
    const restrictionIds = [];
    
    // Look up restriction IDs from database
    for (const restrictionName of allRestrictions) {
      if (!restrictionName || restrictionName.trim() === '') continue;
      
      const [rows] = await pool.query(
        'SELECT restriction_id FROM restrictions WHERE restriction_name = ? AND is_active = 1',
        [restrictionName.trim()]
      );
      
      if (rows && rows.length > 0) {
        restrictionIds.push(rows[0].restriction_id);
      }
    }

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