import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// LOAD ENV FIRST - BEFORE ANY OTHER IMPORTS
const localEnvPath = path.join(__dirname, '.env.local');
const envPath = path.join(__dirname, '.env');

if (fs.existsSync(localEnvPath)) {
  console.log('📝 Loading .env.local (development)');
  dotenv.config({ path: localEnvPath });
} else if (fs.existsSync(envPath)) {
  console.log('📝 Loading .env (production)');
  dotenv.config({ path: envPath });
} else {
  console.log('⚠️ No .env.local or .env found in backend directory, trying process.cwd()');
  dotenv.config();
}

// NOW IMPORT EVERYTHING ELSE
import express from 'express';
import cors from 'cors';
import authRouter from './routes/auth.js';
import usersRouter from './routes/users.js';
import recipesRouter from './routes/recipes.js';
import profileRouter from './routes/profile.js';
import userRecipesRouter from './routes/userRecipes.js';
import adminRecipesRouter from './routes/adminRecipes.js';
import adminAuthRouter from './routes/adminAuth.js';
import adminIngredientsRouter from './routes/adminIngredients.js';
import adminUsersRouter from './routes/adminUsers.js';
import dietaryRestrictionsRouter from './routes/dietaryRestrictions.js';
import pantryRouter from './routes/pantry.js';
import scanRouter from './routes/scan.js';
import userProfileRouter from './routes/userProfile.js';
import feedbackRouter from './routes/feedback.js';
import adminFeedbackRouter from './routes/adminFeedback.js';
import notificationsRouter from './routes/notifications.js';
import analyticsRouter from './routes/analytics.js';
import migrationsRouter from './routes/migrations.js';
import pool from './db.js';

const app = express();
const PORT = process.env.PORT || 5000;

// CORS with regex for Vercel previews
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "https://dishcovery-frontend-tau.vercel.app",
  /\.vercel\.app$/
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.some(o =>
      o instanceof RegExp ? o.test(origin) : o === origin
    )) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS: " + origin));
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Increase body size limit to 10MB to support large base64 images
// This allows handling multiple images efficiently (61+ images from Gemini)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/profile', profileRouter);
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/recipes', recipesRouter);
app.use('/api/user/recipes', userRecipesRouter);
app.use('/api/admin/recipes', adminRecipesRouter);
app.use('/api/admin/ingredients', adminIngredientsRouter);
app.use('/api/admin/users', adminUsersRouter);
app.use('/api/dietary-restrictions', dietaryRestrictionsRouter);
app.use('/api/admin-auth', adminAuthRouter);
app.use('/api/pantry', pantryRouter);
app.use('/api/scan', scanRouter);
app.use('/api/user-profile', userProfileRouter);
app.use('/api/feedback', feedbackRouter);
app.use('/api/admin/feedback', adminFeedbackRouter);
app.use('/api/admin/analytics', analyticsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/migrations', migrationsRouter);

// Health check
app.use('/api/health', async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT 1");
    res.json({ status: 'ok', db: 'connected' });
  } catch (err) {
    res.status(500).json({ status: 'error', db: 'not connected', error: err.message });
  }
});

// Run migrations on server start (automatically injects SQL)
import('./migrations/run_migration.js').then(({ default: runMigration }) => {
  runMigration().catch(err => {
    console.error('⚠️  Auto-migration failed (this is OK if column already exists):', err.message);
  });
}).catch(err => {
  console.error('⚠️  Could not load migration:', err.message);
});

// Run ingredient-related migrations
import('./migrations/add_ingredient_type_column.js').then(({ default: runTypeMigration }) => {
  runTypeMigration().then(() => {
    // After adding column, swap the data
    return import('./migrations/swap_type_category.js').then(({ default: runSwapMigration }) => {
      return runSwapMigration().then(() => {
        // After swapping, add categ_role column
        return import('./migrations/add_categ_role_column.js').then(({ default: runCategRoleMigration }) => {
          runCategRoleMigration().catch(err => {
            console.error('⚠️  Auto-categ_role migration failed:', err.message);
          });
        });
      }).catch(err => {
        console.error('⚠️  Auto-swap migration failed:', err.message);
      });
    });
  }).catch(err => {
    console.error('⚠️  Auto-migration failed (this is OK if column already exists):', err.message);
  });
}).catch(err => {
  console.error('⚠️  Could not load type migration:', err.message);
});

// Also run categ_role migration independently (in case it's needed separately)
import('./migrations/add_categ_role_column.js').then(({ default: runCategRoleMigration }) => {
  runCategRoleMigration().then(() => {
    // After adding categ_role, normalize types to singular
    return import('./migrations/normalize_type_singular.js').then(({ default: runNormalize }) => {
      runNormalize().catch(err => {
        console.error('⚠️  Auto-normalize migration failed:', err.message);
      });
    });
  }).catch(err => {
    // Silently fail if column already exists or other migration is handling it
    if (!err.message.includes('already exists')) {
      console.error('⚠️  Auto-categ_role migration check failed:', err.message);
    }
  });
}).catch(err => {
  // Ignore if migration file doesn't exist or can't be loaded
});

// Fix nutritional_data column to support large base64 images
import('./migrations/fix_nutritional_data_column.js').then(({ default: runFixNutritionalData }) => {
  runFixNutritionalData().catch(err => {
    console.error('⚠️  Auto-fix nutritional_data migration failed:', err.message);
  });
}).catch(err => {
  // Ignore if migration file doesn't exist or can't be loaded
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log('');
  console.log('🌍 Environment Configuration:');
  console.log(`   - NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
  console.log(`   - FRONTEND_URL: ${process.env.FRONTEND_URL || 'not set'}`);
  console.log(`   - API_BASE_URL: ${process.env.API_BASE_URL || 'not set'}`);
  console.log('');

  console.log('🔐 Google OAuth Configuration:');
  console.log(`   - GOOGLE_CLIENT_ID: ${process.env.GOOGLE_CLIENT_ID ? '✅ Set (ends with: ...' + process.env.GOOGLE_CLIENT_ID.slice(-20) + ')' : '❌ NOT SET'}`);
  console.log(`   - GOOGLE_CLIENT_SECRET: ${process.env.GOOGLE_CLIENT_SECRET ? '✅ Set' : '❌ NOT SET'}`);
  console.log(`   - OAuth Status: ${process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? '✅ Ready' : '❌ Missing credentials'}`);
  console.log('');

  console.log('📧 Email Configuration:');
  const hasGmail = process.env.EMAIL_USER && process.env.EMAIL_APP_PASSWORD;
  const hasSendGrid = process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM_EMAIL;
  console.log(`   - Gmail SMTP: ${hasGmail ? '✅ Configured' : '❌ Not configured'}`);
  if (hasGmail) {
    console.log(`     • Email: ${process.env.EMAIL_USER}`);
  }
  console.log(`   - SendGrid: ${hasSendGrid ? '✅ Configured (ACTIVE)' : '❌ Not configured'}`);
  if (hasSendGrid) {
    console.log(`     • API Key: ${process.env.SENDGRID_API_KEY ? '✅ Set (starts with: ' + process.env.SENDGRID_API_KEY.substring(0, 10) + '...)' : '❌ NOT SET'}`);
    console.log(`     • From Email: ${process.env.SENDGRID_FROM_EMAIL}`);
  }
  console.log(`   - Email Provider: ${hasSendGrid ? '🟢 SendGrid (Recommended for production)' : hasGmail ? '🟡 Gmail SMTP (Development only)' : '🔴 NONE'}`);
  console.log('');

  console.log('🗄️  Database Configuration:');
  console.log(`   - DB_HOST: ${process.env.DB_HOST ? '✅ ' + process.env.DB_HOST : '❌ NOT SET'}`);
  console.log(`   - DB_PORT: ${process.env.DB_PORT || '❌ NOT SET'}`);
  console.log(`   - DB_NAME: ${process.env.DB_NAME || '❌ NOT SET'}`);
  console.log(`   - DB_USER: ${process.env.DB_USER || '❌ NOT SET'}`);
  console.log(`   - DB_PASSWORD: ${process.env.DB_PASSWORD ? '✅ Set' : '❌ NOT SET'}`);
  console.log(`   - DB_SSL: ${process.env.DB_SSL || 'false'}`);
  console.log('');

  console.log('🤖 External APIs:');
  console.log(`   - YOLO_API_URL: ${process.env.YOLO_API_URL ? '✅ ' + process.env.YOLO_API_URL : '❌ NOT SET'}`);
  console.log(`   - JWT_SECRET: ${process.env.JWT_SECRET ? '✅ Set' : '❌ NOT SET (using default)'}`);
  console.log('');
  console.log('📋 Available routes:');
  console.log('   - GET  /api/health');
  console.log('   - POST /api/auth/register');
  console.log('   - POST /api/auth/login');
  console.log('   - POST /api/auth/verify');
  console.log('   - POST /api/auth/resend-verification (🆕 NEW)');
  console.log('   - GET  /api/auth/google (🆕 NEW - Google OAuth)');
  console.log('   - POST /api/auth/google/callback (🆕 NEW - Google OAuth)');
  console.log('   - POST /api/auth/logout (🔒 Protected)');
  console.log('   - POST /api/admin-auth/login (🔒 ADMIN LOGIN)');
  console.log('   - GET  /api/admin-auth/profile (🔒 ADMIN PROFILE)');
  console.log('   - GET  /api/recipes');
  console.log('   - GET  /api/admin/recipes (🔒 Admin Routes)');
  console.log('   - POST /api/admin/recipes (🔒 Admin Routes)');
  console.log('   - PUT  /api/admin/recipes/:id (🔒 Admin Routes)');
  console.log('   - DELETE /api/admin/recipes/:id (🔒 Delete Recipe)');
  console.log('   - GET  /api/admin/recipes/test (🧪 Test Route)');
  console.log('   🆕 ADMIN INGREDIENTS ROUTES:');
  console.log('   - GET  /api/admin/ingredients (🔒 Get All Ingredients)');
  console.log('   - POST /api/admin/ingredients (🔒 Create Ingredient)');
  console.log('   - PUT  /api/admin/ingredients/:id (🔒 Update Ingredient)');
  console.log('   - DELETE /api/admin/ingredients/:id (🔒 Delete Ingredient)');
  console.log('   - GET  /api/admin/ingredients/pending (🔒 Get Pending Requests)');
  console.log('   - POST /api/admin/ingredients/approve-pending (🔒 Approve Pending)');
  console.log('   🆕 DIETARY RESTRICTIONS ROUTES:');
  console.log('   - GET  /api/dietary-restrictions/public (📋 For Get-Started Page)');
  console.log('   - POST /api/dietary-restrictions/user/save (📋 Save User Data)');
  console.log('   - GET  /api/dietary-restrictions/admin (🔒 For Admin Page)');
  console.log('   - POST /api/dietary-restrictions/admin (🔒 Create Restriction)');
  console.log('   - PUT  /api/dietary-restrictions/admin/:id (🔒 Update Restriction)');
  console.log('   - DELETE /api/dietary-restrictions/admin/:id (🔒 Delete Restriction)');
  console.log('   - GET  /api/dietary-restrictions/admin/pending-requests (🔒 Pending Requests)');
  console.log('   🆕 PANTRY ROUTES:');
  console.log('   - GET  /api/pantry/ingredients (🔒 Get All Pantry Ingredients)');
  console.log('   - POST /api/pantry/save-selection (🔒 Save User Ingredient Selection)');
  console.log('   - GET  /api/pantry/my-selection (🔒 Get User Previous Selection)');
  console.log('   - POST /api/pantry/generate-recipe (🔒 Generate Recipes from Ingredients)');
  console.log('   - POST /api/pantry/request-ingredient (🔒 Request New Ingredient)');
  console.log('   🆕 YOLO SCAN ROUTES:');
  console.log('   - POST /api/scan (📸 Scan Ingredients with YOLO)');
  console.log('   - GET  /api/scan/health (🥗 Check Detection Service)');
  console.log('   🆕 USER PROFILE ROUTES:');
  console.log('   - GET  /api/user-profile/dietary (🔒 Get User Dietary Preferences)');
  console.log('   - GET  /api/user-profile/info (🔒 Get User Basic Info)');
  console.log('   - PUT  /api/user-profile/info (🔒 Update User Basic Info)');
  console.log('   - POST /api/user-profile/profile-picture (🔒 Upload Profile Picture)');
  console.log('   - PUT  /api/user-profile/dietary (🔒 Update Dietary Preferences)');
  console.log('   📩 FEEDBACK ROUTES:');
  console.log('   - POST /api/feedback (🔒 Submit Feedback)');
  console.log('   - GET  /api/feedback/my-feedback (🔒 Get User Feedback History)');
  console.log('   - PUT  /api/feedback/:id/mark-read (🔒 Mark Feedback as Read)');
  console.log('   - GET  /api/feedback/unread-count (🔒 Get Unread Count)');
  console.log('   - DELETE /api/feedback/:id (🔒 Delete User Feedback)');
  console.log('   📊 ADMIN FEEDBACK ROUTES:');
  console.log('   - GET  /api/admin/feedback/stats (🔒 Get Feedback Statistics)');
  console.log('   - GET  /api/admin/feedback (🔒 Get All Feedback with Filters)');
  console.log('   - POST /api/admin/feedback/:id/reply (🔒 Reply to Feedback)');
  console.log('   - PUT  /api/admin/feedback/:id/mark-read (🔒 Mark as Read)');
  console.log('   - PUT  /api/admin/feedback/:id/mark-unread (🔒 Mark as Unread)');
  console.log('   - DELETE /api/admin/feedback/:id (🔒 Delete Feedback)');
});

export default app;