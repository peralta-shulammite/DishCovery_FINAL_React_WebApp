// Migration routes for database migrations
import express from 'express';
import authenticateToken from '../middleware/auth.js';
import runMigration from '../migrations/run_migration.js';
import runTypeMigration from '../migrations/add_ingredient_type_column.js';
import runSwapMigration from '../migrations/swap_type_category.js';
import runCategRoleMigration from '../migrations/add_categ_role_column.js';
import runNormalize from '../migrations/normalize_type_singular.js';

const router = express.Router();

// Run migration to add dietary_info column
router.post('/add-dietary-info-column', authenticateToken, async (req, res) => {
  try {
    // Only allow admins to run migrations
    if (!req.user.isAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: 'Admin access required to run migrations' 
      });
    }

    console.log('🔄 Admin requested migration: add-dietary-info-column');
    await runMigration();
    
    res.json({ 
      success: true, 
      message: 'Migration completed successfully' 
    });
  } catch (error) {
    console.error('❌ Migration error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Migration failed', 
      error: error.message 
    });
  }
});

// Run migration to add ingredient_type column
router.post('/add-ingredient-type-column', authenticateToken, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: 'Admin access required to run migrations' 
      });
    }

    console.log('🔄 Admin requested migration: add-ingredient-type-column');
    await runTypeMigration();
    
    res.json({ 
      success: true, 
      message: 'Migration completed successfully' 
    });
  } catch (error) {
    console.error('❌ Migration error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Migration failed', 
      error: error.message 
    });
  }
});

// Run migration to swap type and category
router.post('/swap-type-category', authenticateToken, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: 'Admin access required to run migrations' 
      });
    }

    console.log('🔄 Admin requested migration: swap-type-category');
    await runSwapMigration();
    
    res.json({ 
      success: true, 
      message: 'Migration completed successfully' 
    });
  } catch (error) {
    console.error('❌ Migration error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Migration failed', 
      error: error.message 
    });
  }
});

// Run migration to add categ_role column
router.post('/add-categ-role-column', authenticateToken, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: 'Admin access required to run migrations' 
      });
    }

    console.log('🔄 Admin requested migration: add-categ-role-column');
    await runCategRoleMigration();
    
    res.json({ 
      success: true, 
      message: 'Migration completed successfully' 
    });
  } catch (error) {
    console.error('❌ Migration error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Migration failed', 
      error: error.message 
    });
  }
});

// Run migration to normalize types to singular
router.post('/normalize-type-singular', authenticateToken, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: 'Admin access required to run migrations' 
      });
    }

    console.log('🔄 Admin requested migration: normalize-type-singular');
    await runNormalize();
    
    res.json({ 
      success: true, 
      message: 'Migration completed successfully' 
    });
  } catch (error) {
    console.error('❌ Migration error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Migration failed', 
      error: error.message 
    });
  }
});

export default router;

