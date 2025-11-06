// ===== API KEY AUTHENTICATION =====

export function validateApiKey(req) {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return { valid: false, error: 'API key missing. Provide X-API-Key header.' };
  }

  const validKeys = (process.env.API_KEYS || '').split(',').map(k => k.trim()).filter(Boolean);

  if (validKeys.length === 0) {
    console.error('API_KEYS environment variable not configured');
    return { valid: false, error: 'API authentication not configured' };
  }

  if (!validKeys.includes(apiKey)) {
    return { valid: false, error: 'Invalid API key' };
  }

  return { valid: true };
}

export function requireApiKey(handler) {
  return async (req, res) => {
    const authResult = validateApiKey(req);

    if (!authResult.valid) {
      return res.status(401).json({
        success: false,
        error: authResult.error
      });
    }

    return handler(req, res);
  };
}
