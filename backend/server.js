import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRouter from './routes/auth.js';
import usersRouter from './routes/users.js';
import recipesRouter from './routes/recipes.js';
import profileRouter from './routes/profile.js';
import userRecipesRouter from './routes/userRecipes.js';
import adminRecipesRouter from './routes/adminRecipes.js'; // Add this import
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
app.use('/api/admin/recipes', adminRecipesRouter); // Add this line - VERY IMPORTANT!

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
});

export default app;