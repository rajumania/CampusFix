export function sendSuccess(res, { statusCode = 200, message = 'OK', data = null } = {}) {
  return res.status(statusCode).json({ success: true, message, data });
}

export function sendCreated(res, { message = 'Created', data = null } = {}) {
  return res.status(201).json({ success: true, message, data });
}
