import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRouter from './routes/auth.js';
import usersRouter from './routes/users.js';
import pool from './db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);

// Database connection
// (Initialized via pool import)

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;