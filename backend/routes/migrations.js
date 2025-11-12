// Migration routes for database migrations
import express from 'express';
import authenticateToken from '../middleware/auth.js';

const router = express.Router();

// Helper function to dynamically load migration (only if file exists)
async function loadMigration(modulePath) {
  try {
    const module = await import(modulePath);
    return module.default;
  } catch (error) {
    if (error.code === 'ERR_MODULE_NOT_FOUND') {
      return null; // File doesn't exist - this is OK
    }
    throw error; // Re-throw other errors
  }
}

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

    const runMigration = await loadMigration('../migrations/run_migration.js');
    if (!runMigration) {
      return res.status(404).json({ 
        success: false, 
        message: 'Migration file not found' 
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

    const runTypeMigration = await loadMigration('../migrations/add_ingredient_type_column.js');
    if (!runTypeMigration) {
      return res.status(404).json({ 
        success: false, 
        message: 'Migration file not found' 
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

    const runSwapMigration = await loadMigration('../migrations/swap_type_category.js');
    if (!runSwapMigration) {
      return res.status(404).json({ 
        success: false, 
        message: 'Migration file not found' 
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

    const runCategRoleMigration = await loadMigration('../migrations/add_categ_role_column.js');
    if (!runCategRoleMigration) {
      return res.status(404).json({ 
        success: false, 
        message: 'Migration file not found' 
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

    const runNormalize = await loadMigration('../migrations/normalize_type_singular.js');
    if (!runNormalize) {
      return res.status(404).json({ 
        success: false, 
        message: 'Migration file not found' 
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

