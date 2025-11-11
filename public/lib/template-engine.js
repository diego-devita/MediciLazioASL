/**
 * Template Engine - Sistema di templating leggero e potente
 * Supporta: variabili, helpers, conditionals, loops, slots
 */

class TemplateEngine {
  constructor(helpers = {}) {
    this.helpers = helpers;
  }

  /**
   * Renderizza un template con un context
   * @param {string} template - Template string
   * @param {object} context - Dati per il rendering
   * @returns {string} HTML renderizzato
   */
  render(template, context = {}) {
    if (!template) return '';

    // Crea context esteso con helpers
    const extendedContext = {
      ...context,
      ...this.helpers,
      $state: context.state || {},
      $data: context.data || {}
    };

    let result = template;

    // 1. Process conditionals {{#if condition}}...{{/if}}
    result = this._processConditionals(result, extendedContext);

    // 2. Process each loops {{#each array}}...{{/each}}
    result = this._processEach(result, extendedContext);

    // 3. Process helpers e variabili {{helper arg}} o {{variable}}
    result = this._processVariables(result, extendedContext);

    return result;
  }

  /**
   * Processa conditionals {{#if}}...{{/if}}
   */
  _processConditionals(template, context) {
    const regex = /\{\{#if\s+([^}]+)\}\}([\s\S]*?)\{\{\/if\}\}/g;

    return template.replace(regex, (match, condition, content) => {
      const value = this._resolveValue(condition.trim(), context);
      return this._isTruthy(value) ? content : '';
    });
  }

  /**
   * Processa loops {{#each}}...{{/each}}
   */
  _processEach(template, context) {
    const regex = /\{\{#each\s+([^}]+)\}\}([\s\S]*?)\{\{\/each\}\}/g;

    return template.replace(regex, (match, arrayPath, itemTemplate) => {
      const array = this._resolveValue(arrayPath.trim(), context);

      if (!Array.isArray(array) || array.length === 0) return '';

      return array.map((item, index) => {
        // Context per ogni item
        const itemContext = {
          ...context,
          this: item,
          '@index': index,
          '@first': index === 0,
          '@last': index === array.length - 1,
          '@length': array.length
        };

        // Renderizza ricorsivamente il template item
        return this.render(itemTemplate, itemContext);
      }).join('');
    });
  }

  /**
   * Processa variabili e helpers {{var}} o {{helper arg1 arg2}}
   */
  _processVariables(template, context) {
    const regex = /\{\{([^}]+)\}\}/g;

    return template.replace(regex, (match, expression) => {
      expression = expression.trim();

      // Check se è un helper con argomenti
      const parts = expression.split(/\s+/);

      if (parts.length > 1) {
        // Helper con argomenti: {{helper arg1 arg2}}
        const helperName = parts[0];
        const args = parts.slice(1).map(arg => this._resolveValue(arg, context));

        if (typeof context[helperName] === 'function') {
          const result = context[helperName](...args);
          return this._formatOutput(result);
        }
      }

      // Semplice variabile: {{variable}} o {{path.to.value}}
      const value = this._resolveValue(expression, context);
      return this._formatOutput(value);
    });
  }

  /**
   * Risolve un path come "data.items" o "state.currentPage"
   */
  _resolveValue(path, context) {
    if (!path) return '';

    // Literal strings tra apici
    if (path.startsWith("'") && path.endsWith("'")) {
      return path.slice(1, -1);
    }

    // Literal numbers
    if (!isNaN(path)) {
      return Number(path);
    }

    // Literal booleans
    if (path === 'true') return true;
    if (path === 'false') return false;

    // Path traversal
    const keys = path.split('.');
    let value = context;

    for (const key of keys) {
      if (value === null || value === undefined) return '';
      value = value[key];
    }

    return value;
  }

  /**
   * Determina se un valore è truthy per conditionals
   */
  _isTruthy(value) {
    if (value === null || value === undefined) return false;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') return value.length > 0;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object') return Object.keys(value).length > 0;
    return Boolean(value);
  }

  /**
   * Formatta output per HTML
   */
  _formatOutput(value) {
    if (value === null || value === undefined) return '';
    if (typeof value === 'function') return ''; // Non renderizzare funzioni
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  /**
   * Compila un template in una funzione per riuso
   */
  compile(template) {
    return (context) => this.render(template, context);
  }
}

// Export per usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TemplateEngine;
}
