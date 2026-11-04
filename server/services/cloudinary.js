import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env.js';
import ApiError from '../utils/ApiError.js';

cloudinary.config({
  cloud_name: env.cloudinary.cloudName,
  api_key: env.cloudinary.apiKey,
  api_secret: env.cloudinary.apiSecret,
  secure: true,
});

export function isCloudinaryConfigured() {
  const { cloudName, apiKey, apiSecret } = env.cloudinary;
  return Boolean(cloudName && apiKey && apiSecret);
}

/**
 * cloudinary-sdk 2.x throws away the response body for non-2xx uploads, so the
 * status code is the only usable signal. Map it to something actionable rather
 * than letting "Server returned unexpected status code - 403" reach the user.
 */
const UPLOAD_HINTS = {
  400: 'the request was malformed',
  401: 'CLOUDINARY_API_KEY or CLOUDINARY_API_SECRET does not match this cloud',
  403: 'this API key is not allowed to upload. In Cloudinary, generate a fresh key under Settings -> Upload -> "API key & secret" (keys created through the new access-control flow can be read-only) and confirm the account email/phone is verified',
  420: 'the free plan rate limit was exceeded',
  429: 'too many requests, slow down',
};

function describeUploadFailure(error) {
  const nested = error.error?.message;
  if (nested) return nested;

  const status = error.http_code;
  const hint = UPLOAD_HINTS[status];
  return hint ? `HTTP ${status} - ${hint}` : error.message || 'unknown error';
}

export function uploadImage(buffer) {
  if (!isCloudinaryConfigured()) {
    throw ApiError.badRequest(
      'Image upload is unavailable: set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in server/.env'
    );
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'campusfix/complaints',
        resource_type: 'image',
        transformation: [{ width: 1280, height: 1280, crop: 'limit' }],
      },
      (error, result) => {
        if (error) {
          return reject(new ApiError(502, `Cloudinary rejected the upload: ${describeUploadFailure(error)}`));
        }
        return resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    stream.end(buffer);
  });
}

export async function deleteImages(images = []) {
  if (!isCloudinaryConfigured()) return;
  await Promise.all(
    images
      .map((image) => image.publicId)
      .filter(Boolean)
      .map((publicId) =>
        cloudinary.uploader.destroy(publicId).catch(() => {
          // A stale image in Cloudinary is not worth failing the request over.
        })
      )
  );
}
