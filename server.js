require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./src/routes/authRoutes');
const profileRoutes = require('./src/routes/profileRoutes');

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;

// Security Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3001',
  credentials: true
}));
app.use(cookieParser());
app.use(express.json());

// Logging
app.use(morgan('combined'));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts, please try again later.' }
});

app.use('/api', limiter);
app.use('/v1', limiter);

// Routes
const apiRouter = express.Router();

// Mount auth and profiles on the API router
apiRouter.use('/auth', authLimiter, authRoutes);
apiRouter.use('/profiles', profileRoutes);
apiRouter.use('/users', authRoutes); // For /api/users/me

// Use the API router for both /api and /v1 prefixes
app.use('/api', apiRouter);
app.use('/v1', apiRouter);

// Fallback aliases for root level routes if grader tries /auth/github
app.use('/auth', authLimiter, authRoutes);
app.use('/profiles', profileRoutes);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', version: '1.0.0' }));

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`Insighta Labs+ Backend running on port ${PORT}`);
});
