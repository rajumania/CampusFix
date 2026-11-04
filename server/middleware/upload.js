import multer from 'multer';
import ApiError from '../utils/ApiError.js';

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_FILES = 5;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

// Buffers stay in memory only long enough to stream to Cloudinary, so there is
// no local copy to clean up or leak through a static route.
const storage = multer.memoryStorage();

const fileFilter = (_req, file, cb) => {
  if (!ALLOWED_MIME.has(file.mimetype)) {
    return cb(ApiError.badRequest(`Unsupported image type "${file.mimetype}". Upload a JPG, PNG or WebP.`));
  }
  return cb(null, true);
};

export const uploadComplaintImages = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_BYTES, files: MAX_FILES },
}).array('images', MAX_FILES);

export { MAX_FILE_BYTES, MAX_FILES, ALLOWED_MIME };
