// ===== CONFIGURAZIONE CENTRALIZZATA =====

// ===== ENVIRONMENT DETECTION =====
const VERCEL_ENV = process.env.VERCEL_ENV || 'development';
const NODE_ENV = process.env.NODE_ENV || 'development';

// Determine effective environment
const environment = VERCEL_ENV === 'production' ? 'production'
                  : VERCEL_ENV === 'preview' ? 'preview'
                  : 'local';

const isLocal = environment === 'local';
const isProduction = environment === 'production';
const isPreview = environment === 'preview';

// ===== ENVIRONMENT INFO =====
export const ENV = {
  environment,
  isLocal,
  isProduction,
  isPreview,
  nodeEnv: NODE_ENV,
  vercelEnv: VERCEL_ENV
};

// ===== DATABASE =====
export const DATABASE = {
  NAME: 'medici-lazio',
  URI: process.env.MONGODB_URI,
  COLLECTIONS: {
    USERS: 'users',
    LOGIN_ATTEMPTS: 'login_attempts',
    SESSIONS: 'sessions',
    CRON_LOGS: 'cron_logs',
    VARIATIONS_HISTORY: 'variations_history',
    SYSTEM_SETTINGS: 'system_settings',
    AUDIT_LOGS: 'audit_logs'
  }
};

// ===== RATE LIMITING & SECURITY =====
export const RATE_LIMIT = {
  MAX_LOGIN_ATTEMPTS: isProduction ? 5 : 100,  // Più permissivo in locale
  LOGIN_WINDOW_MS: 15 * 60 * 1000,              // Finestra temporale (15 minuti)
  BLOCK_DURATION_MS: 15 * 60 * 1000,            // Durata blocco (15 minuti)
  CLEANUP_INTERVAL_MS: 30 * 60 * 1000           // Pulizia cache ogni 30 minuti
};

// ===== JWT & AUTH =====
export const AUTH = {
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRY_DAYS: isLocal ? 7 : 30,  // Più lungo in locale per comodità
  COOKIE_MAX_AGE: (isLocal ? 7 : 30) * 24 * 60 * 60
};

// ===== LOGGING =====
export const LOGGING = {
  API_KEY_PARTIAL_LENGTH: 4,
  RETENTION_DAYS: 90,
  LEVEL: isLocal ? 'debug' : 'info',
  VERBOSE: isLocal || isPreview
};

// ===== APP =====
// Telegram non accetta URL localhost, quindi se siamo in locale usiamo l'URL di produzione
// VERCEL_URL è fornito automaticamente ma senza protocollo
const vercelUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null;
const appUrl = process.env.APP_URL || vercelUrl || 'https://medici-lazio-asl.vercel.app';
export const APP = {
  URL: appUrl.includes('localhost') ? 'https://medici-lazio-asl.vercel.app' : appUrl
};

// ===== TELEGRAM =====
export const TELEGRAM = {
  BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
  BOT_USERNAME: process.env.TELEGRAM_BOT_USERNAME || '',
  ADMIN_CHAT_IDS: process.env.ADMIN_CHAT_IDS?.split(',').map(id => id.trim()) || []
};

// ===== CRON =====
export const CRON = {
  SECRET_KEY: process.env.CRON_SECRET_KEY,
  ENABLED: process.env.CRON_ENABLED !== 'false'
};

// ===== TIMEOUTS (milliseconds) =====
export const TIMEOUTS = {
  API: isLocal ? 60000 : 30000,      // 60s locale, 30s prod
  SEARCH: isLocal ? 120000 : 60000,  // 120s locale, 60s prod
  DATABASE: isLocal ? 10000 : 5000   // 10s locale, 5s prod
};

// ===== VALIDATION & LOGGING =====
if (isLocal || isPreview) {
  console.log('🔧 Configuration loaded:', {
    environment: ENV.environment,
    database: DATABASE.URI ? '✅ configured' : '❌ MISSING',
    jwtSecret: AUTH.JWT_SECRET ? '✅ configured' : '❌ MISSING',
    telegramToken: TELEGRAM.BOT_TOKEN ? '✅ configured' : '❌ MISSING',
    cronEnabled: CRON.ENABLED,
    logging: LOGGING.LEVEL,
    rateLimit: RATE_LIMIT.MAX_LOGIN_ATTEMPTS
  });
}

// Validation in production
if (isProduction) {
  const requiredVars = [
    { name: 'MONGODB_URI', value: DATABASE.URI },
    { name: 'JWT_SECRET', value: AUTH.JWT_SECRET },
    { name: 'TELEGRAM_BOT_TOKEN', value: TELEGRAM.BOT_TOKEN }
  ];

  const missing = requiredVars.filter(v => !v.value).map(v => v.name);
  if (missing.length > 0) {
    throw new Error(`❌ Missing required env vars in production: ${missing.join(', ')}`);
  }
}
