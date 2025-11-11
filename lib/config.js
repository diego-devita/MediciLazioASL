// ===== CONFIGURAZIONE CENTRALIZZATA =====

// ===== DATABASE =====
export const DATABASE = {
  NAME: 'medici-lazio',
  COLLECTIONS: {
    USERS: 'users',
    LOGIN_ATTEMPTS: 'login_attempts',
    SESSIONS: 'sessions',
    CRON_LOGS: 'cron_logs',
    VARIATIONS_HISTORY: 'variations_history',
    SYSTEM_SETTINGS: 'system_settings'
  }
};

// ===== RATE LIMITING & SECURITY =====
export const RATE_LIMIT = {
  MAX_LOGIN_ATTEMPTS: 5,              // Numero massimo tentativi falliti
  LOGIN_WINDOW_MS: 15 * 60 * 1000,    // Finestra temporale (15 minuti)
  BLOCK_DURATION_MS: 15 * 60 * 1000,  // Durata blocco (15 minuti)
  CLEANUP_INTERVAL_MS: 30 * 60 * 1000 // Pulizia cache ogni 30 minuti
};

// ===== JWT & AUTH =====
export const AUTH = {
  JWT_EXPIRY_DAYS: 30,
  COOKIE_MAX_AGE: 30 * 24 * 60 * 60 // 30 giorni in secondi
};

// ===== LOGGING =====
export const LOGGING = {
  API_KEY_PARTIAL_LENGTH: 4, // Quanti caratteri della API key loggare
  RETENTION_DAYS: 90         // Mantenere log per 90 giorni
};
