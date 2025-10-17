import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRouter from './routes/auth.js';
import usersRouter from './routes/users.js';
import recipesRouter from './routes/recipes.js';
import profileRouter from './routes/profile.js';
import userRecipesRouter from './routes/userRecipes.js';
import adminRecipesRouter from './routes/adminRecipes.js';
import adminAuthRouter from './routes/adminAuth.js';
import adminIngredientsRouter from './routes/adminIngredients.js';
import dietaryRestrictionsRouter from './routes/dietaryRestrictions.js';
import pantryRouter from './routes/pantry.js';
import scanRouter from './routes/scan.js';  // 🆕 ADD THIS
import pool from './db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ CORS with regex for Vercel previews
const allowedOrigins = [
  "http://localhost:3000",
  "https://dishcovery-frontend-tau.vercel.app", // your production domain
  /\.vercel\.app$/ // allow all Vercel preview deployments
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

// Handle preflight requests
app.options('*', cors(corsOptions));

app.use(express.json());

// Routes
app.use('/api/profile', profileRouter);
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/recipes', recipesRouter);
app.use('/api/user/recipes', userRecipesRouter);
app.use('/api/admin/recipes', adminRecipesRouter);
app.use('/api/admin/ingredients', adminIngredientsRouter);
app.use('/api/dietary-restrictions', dietaryRestrictionsRouter);
app.use('/api/admin-auth', adminAuthRouter);
app.use('/api/pantry', pantryRouter);
app.use('/api/scan', scanRouter);  // 🆕 ADD THIS

// ✅ Improved health route (also checks DB)
app.use('/api/health', async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT 1");
    res.json({ status: 'ok', db: 'connected' });
  } catch (err) {
    res.status(500).json({ status: 'error', db: 'not connected', error: err.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log('📍 Available routes:');
  console.log('   - GET  /api/health');
  console.log('   - POST /api/auth/register');
  console.log('   - POST /api/auth/login');
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
  console.log('   - GET  /api/scan/health (🏥 Check Detection Service)');
});

export default app;