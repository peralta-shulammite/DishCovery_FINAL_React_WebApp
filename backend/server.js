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
import dietaryRestrictionsRouter from './routes/dietaryRestrictions.js'; // ← ADD THIS LINE
import pool from './db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/profile', profileRouter);
app.use('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/recipes', recipesRouter);
app.use('/api/user/recipes', userRecipesRouter);
app.use('/api/admin/recipes', adminRecipesRouter);
app.use('/api/dietary-restrictions', dietaryRestrictionsRouter); // ← ADD THIS LINE
app.use('/api/admin/auth', adminAuthRouter);

// Database connection
// (Initialized via pool import)

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('📍 Available routes:');
  console.log('   - GET  /api/health');
  console.log('   - POST /api/auth/register');
  console.log('   - POST /api/auth/login');
  console.log('   - GET  /api/recipes');
  console.log('   - GET  /api/admin/recipes (🔒 Admin Routes)');
  console.log('   - POST /api/admin/recipes (🔒 Admin Routes)');
  console.log('   - PUT  /api/admin/recipes/:id (🔒 Admin Routes)');
  console.log('   - DELETE /api/admin/recipes/:id (🔒 Admin Routes)');
  console.log('   - GET  /api/admin/recipes/test (🧪 Test Route)');
  console.log('   🆕 DIETARY RESTRICTIONS ROUTES:');
  console.log('   - GET  /api/dietary-restrictions/public (📋 For Get-Started Page)');
  console.log('   - POST /api/dietary-restrictions/user/save (📋 Save User Data)');
  console.log('   - GET  /api/dietary-restrictions/admin (🔒 For Admin Page)');
  console.log('   - POST /api/dietary-restrictions/admin (🔒 Create Restriction)');
  console.log('   - PUT  /api/dietary-restrictions/admin/:id (🔒 Update Restriction)');
  console.log('   - DELETE /api/dietary-restrictions/admin/:id (🔒 Delete Restriction)');
  console.log('   - GET  /api/dietary-restrictions/admin/pending-requests (🔒 Pending Requests)');
  console.log('   - GET  /api/dietary-restrictions/public (🌐 Public Restrictions)');
  console.log('   - GET  /api/dietary-restrictions/admin (🔒 Admin Restrictions)');
  console.log('   - POST /api/dietary-restrictions/admin (🔒 Create Restriction)');
  console.log('   - PUT  /api/dietary-restrictions/admin/:id (🔒 Update Restriction)');
  console.log('   - DELETE /api/dietary-restrictions/admin/:id (🔒 Delete Restriction)');
});

export default app;