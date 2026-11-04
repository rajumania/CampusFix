import dotenv from 'dotenv';

dotenv.config();

const REQUIRED = ['MONGODB_URI', 'JWT_SECRET', 'CLIENT_URL', 'PORT'];

const missing = REQUIRED.filter((key) => !process.env[key]);
if (missing.length > 0) {
  // Names only - never log the values of secrets.
  console.error(`[env] Missing required environment variables: ${missing.join(', ')}`);
  console.error('[env] Copy server/.env.example to server/.env and fill in the values.');
  process.exit(1);
}

const toList = (value) =>
  value
    ? value.split(',').map((entry) => entry.trim()).filter(Boolean)
    : [];

export const env = {
  port: Number(process.env.PORT),
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  mongoUri: process.env.MONGODB_URI,
  // Belt and braces: the Atlas URI already carries /campusfix, but naming the
  // database here guarantees it even when the connection string has no path.
  mongoDatabase: process.env.MONGODB_DB_NAME || 'campusfix',
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientUrls: toList(process.env.CLIENT_URL),
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },
};
