/**
 * Sistema di logging centralizzato con livelli e namespace
 *
 * Features:
 * - Livelli: ERROR, WARN, INFO, DEBUG, TRACE
 * - Namespace per moduli (es. 'medici:client', 'api:search')
 * - Configurabile via LOG_LEVEL env
 * - Zero overhead quando logging disabilitato
 * - Colori in sviluppo, JSON in produzione
 * - Compatibile Node.js e browser
 *
 * Usage:
 *   const log = require('./lib/logger')('medici:client');
 *   log.debug('Searching for', { cognome: 'ROSSI' });
 *   log.info('Found results', { count: 10 });
 *   log.error('Search failed', error);
 */

const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
  trace: 4
};

// Colori ANSI per terminale
const COLORS = {
  error: '\x1b[31m', // Red
  warn: '\x1b[33m',  // Yellow
  info: '\x1b[36m',  // Cyan
  debug: '\x1b[35m', // Magenta
  trace: '\x1b[90m', // Gray
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m'
};

class Logger {
  constructor(namespace = 'app') {
    this.namespace = namespace;

    // Determina livello attivo da env (default: info)
    const envLevel = (typeof process !== 'undefined' && process.env?.LOG_LEVEL)
      || (typeof window !== 'undefined' && window.LOG_LEVEL)
      || 'info';

    this.level = LOG_LEVELS[envLevel.toLowerCase()] ?? LOG_LEVELS.info;

    // Determina se siamo in browser o Node
    this.isBrowser = typeof window !== 'undefined';

    // Determina se usare colori (Node con TTY o browser con devtools)
    this.useColors = this.isBrowser || (typeof process !== 'undefined' && process.stdout?.isTTY);

    // Formato output: 'json' per produzione, 'pretty' per dev
    const envFormat = (typeof process !== 'undefined' && process.env?.LOG_FORMAT)
      || (typeof window !== 'undefined' && window.LOG_FORMAT)
      || 'pretty';

    this.format = envFormat === 'json' ? 'json' : 'pretty';
  }

  /**
   * Check se un livello è abilitato (per zero-overhead guards)
   */
  isLevelEnabled(level) {
    return LOG_LEVELS[level] <= this.level;
  }

  /**
   * Log generico
   */
  _log(level, message, ...args) {
    // Fast-path: return subito se livello disabilitato
    if (LOG_LEVELS[level] > this.level) return;

    const timestamp = new Date().toISOString();

    if (this.format === 'json') {
      // JSON strutturato per produzione
      const logEntry = {
        timestamp,
        level,
        namespace: this.namespace,
        message,
        data: args.length > 0 ? args : undefined
      };

      console.log(JSON.stringify(logEntry));
    } else {
      // Pretty print per sviluppo
      const color = this.useColors ? COLORS[level] : '';
      const reset = this.useColors ? COLORS.reset : '';
      const dim = this.useColors ? COLORS.dim : '';
      const bold = this.useColors ? COLORS.bold : '';

      const prefix = `${dim}${timestamp}${reset} ${color}${bold}${level.toUpperCase().padEnd(5)}${reset} ${dim}[${this.namespace}]${reset}`;

      if (args.length === 0) {
        console.log(`${prefix} ${message}`);
      } else {
        console.log(`${prefix} ${message}`, ...args);
      }
    }
  }

  error(message, ...args) {
    this._log('error', message, ...args);
  }

  warn(message, ...args) {
    this._log('warn', message, ...args);
  }

  info(message, ...args) {
    this._log('info', message, ...args);
  }

  debug(message, ...args) {
    this._log('debug', message, ...args);
  }

  trace(message, ...args) {
    this._log('trace', message, ...args);
  }

  /**
   * Crea child logger con namespace annidato
   */
  child(childNamespace) {
    return new Logger(`${this.namespace}:${childNamespace}`);
  }
}

/**
 * Factory function per creare logger con namespace
 */
function createLogger(namespace) {
  return new Logger(namespace);
}

// Export per Node.js (ES modules)
// Browser-only version - exports via window object above
// export default createLogger;
// export { Logger, LOG_LEVELS };

// Export per browser
if (typeof window !== 'undefined') {
  window.createLogger = createLogger;
  window.Logger = Logger;
  window.LOG_LEVELS = LOG_LEVELS;
}
