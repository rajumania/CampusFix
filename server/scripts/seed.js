/**
 * Seed the CampusFix demo data.
 *
 *   npm run seed              -> creates anything missing, never destroys data
 *   npm run seed -- --fresh   -> wipes the five collections first
 */
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { runSeed, DEMO_LOGIN_HINTS } from './seedData.js';

async function main() {
  await connectDB();
  await runSeed({ fresh: process.argv.includes('--fresh') });

  console.log('\n[seed] demo sign-ins (change these before any real deployment):');
  for (const hint of DEMO_LOGIN_HINTS) {
    console.log(`         ${hint.role.padEnd(18)} ${hint.email} / ${hint.password}`);
  }

  await mongoose.connection.close();
  console.log('[seed] done');
}

main().catch(async (err) => {
  console.error(`[seed] failed: ${err.message}`);
  await mongoose.connection.close().catch(() => {});
  process.exit(1);
});
