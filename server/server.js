import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import mongoose from 'mongoose';
import { env } from './config/env.js';
import { connectDB, logConnectionFailure, redact } from './config/db.js';
import apiRoutes from './routes/index.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

const app = express();

// Render and Vercel talk over HTTPS only, and the React origin is explicit.
const corsOptions = {
  origin(origin, callback) {
    // Requests with no Origin header (curl, health probes, Render checks) pass.
    if (!origin) return callback(null, true);
    if (env.clientUrls.includes(origin)) return callback(null, true);
    if (!env.isProd && /^https?:\/\/localhost(:\d+)?$/.test(origin)) return callback(null, true);
    return callback(new Error(`Origin ${origin} is not allowed by CORS`));
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(morgan(env.isProd ? 'combined' : 'dev'));

app.get('/', (_req, res) => {
  res.json({
    success: true,
    message: 'CampusFix API',
    docs: '/api/health',
    endpoints: ['/api/auth', '/api/users', '/api/complaints', '/api/feedback', '/api/analytics'],
  });
});

app.use('/api', apiRoutes);

app.use(notFound);
app.use(errorHandler);

async function start() {
  // Nothing listens until Atlas is confirmed reachable, so the app never serves
  // traffic against a database it cannot use.
  try {
    await connectDB();
  } catch (err) {
    console.error(`[server] MongoDB connection failed: ${redact(err.message)}`);
    // The diagnosis walks the driver's cause chain and names the actual failure
    // class, so "wrong password" and "IP not allowed" stop looking identical.
    logConnectionFailure(err);
    process.exit(1);
  }

  const server = app.listen(env.port, env.bindHost, () => {
    console.log(`[server] CampusFix API listening on http://localhost:${env.port}`);
    console.log(`[server] bind=${env.bindHost ?? 'all interfaces (dual-stack)'} | env=${env.nodeEnv} | database=${env.mongoDatabase}`);
  });

  const shutdown = (signal) => {
    console.log(`[server] ${signal} received, closing down`);
    server.close(async () => {
      await mongoose.connection.close();
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

// Importing the app from a test or seed script must not open a port.
if (process.argv[1] && process.argv[1].endsWith('server.js')) {
  start();
}

export default app;
