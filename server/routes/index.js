import { Router } from 'express';
import mongoose from 'mongoose';
import { databaseState } from '../config/db.js';
import authRoutes from './authRoutes.js';
import userRoutes from './userRoutes.js';
import complaintRoutes from './complaintRoutes.js';
import feedbackRoutes from './feedbackRoutes.js';
import analyticsRoutes from './analyticsRoutes.js';

const router = Router();

/**
 * Reports both process liveness and real database reachability, so a deployed
 * API that lost its Atlas connection stops looking healthy to a probe.
 */
router.get('/health', async (_req, res) => {
  const db = databaseState();

  if (!db.connected) {
    return res.status(503).json({
      success: false,
      message: 'API is running but MongoDB is not connected',
      data: { uptime: process.uptime(), database: db },
    });
  }

  // A ping confirms the driver can actually round-trip, not just that a socket
  // was opened earlier.
  let pingMs = null;
  try {
    const startedAt = Date.now();
    await mongoose.connection.db.admin().ping();
    pingMs = Date.now() - startedAt;
  } catch {
    return res.status(503).json({
      success: false,
      message: 'MongoDB connection is not usable',
      data: { uptime: process.uptime(), database: db },
    });
  }

  return res.json({
    success: true,
    message: 'CampusFix API and MongoDB Atlas are healthy',
    data: { uptime: process.uptime(), pingMs, database: db },
  });
});

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/complaints', complaintRoutes);
router.use('/feedback', feedbackRoutes);
router.use('/analytics', analyticsRoutes);

export default router;
