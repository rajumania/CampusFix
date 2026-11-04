import mongoose from 'mongoose';
import { env } from './env.js';

const STATES = ['disconnected', 'connected', 'connecting', 'disconnecting'];

/**
 * Atlas credentials live in the connection string, so any message echoing it
 * back must be scrubbed before it reaches a terminal or a log aggregator.
 */
function redact(text = '') {
  return String(text).replace(/\/\/[^@\s]*@/g, '//***@');
}

export { redact };

export function databaseState() {
  const state = mongoose.connection.readyState;
  return {
    readyState: state,
    status: STATES[state] || 'unknown',
    connected: state === 1,
    // Host and database name identify the cluster; they carry no credentials.
    database: mongoose.connection.name || env.mongoDatabase,
    host: mongoose.connection.host || null,
  };
}

export async function connectDB() {
  mongoose.set('strictQuery', true);

  const conn = await mongoose.connect(env.mongoUri, {
    dbName: env.mongoDatabase,
    serverSelectionTimeoutMS: 15000,
    maxPoolSize: 10,
  });

  console.log(`[db] MongoDB connected -> database "${conn.connection.name}" on ${conn.connection.host}`);
  return conn;
}

mongoose.connection.on('error', (err) => {
  console.error(`[db] Connection error: ${redact(err.message)}`);
});

mongoose.connection.on('disconnected', () => {
  console.warn('[db] MongoDB disconnected - Mongoose will attempt to reconnect automatically');
});

mongoose.connection.on('reconnected', () => {
  console.log('[db] MongoDB reconnected');
});
