/**
 * Environment Configuration
 * Auto-detects local vs production and provides appropriate settings
 */

const ENV_CONFIG = (() => {
  const hostname = window.location.hostname;
  const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.');
  const isVercelPreview = hostname.includes('vercel.app') && !hostname.includes('medici-lazio-asl.vercel.app');

  // Detect environment
  const environment = isLocal ? 'local' : (isVercelPreview ? 'preview' : 'production');

  // Base configuration
  const config = {
    environment,
    isLocal,
    isProduction: environment === 'production',
    isPreview: isVercelPreview,

    // API base URL (empty = relative URLs)
    apiBaseUrl: '',

    // Full app URL
    appUrl: isLocal
      ? `http://${hostname}:${window.location.port || 3000}`
      : `https://${hostname}`,

    // Debug mode
    debug: isLocal || isVercelPreview,

    // Features flags
    features: {
      enableAnalytics: !isLocal,
      enableErrorReporting: !isLocal,
      verboseLogs: isLocal || isVercelPreview
    },

    // Timeouts (ms)
    timeouts: {
      api: isLocal ? 60000 : 30000,  // Più tempo in locale per debug
      search: isLocal ? 120000 : 60000
    }
  };

  // Log config in debug mode
  if (config.debug) {
    console.log('🔧 Environment Config:', {
      environment: config.environment,
      hostname,
      appUrl: config.appUrl,
      debug: config.debug
    });
  }

  return config;
})();

// Export per uso globale
window.ENV_CONFIG = ENV_CONFIG;

// Export per ES modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ENV_CONFIG;
}
