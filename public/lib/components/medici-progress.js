/**
 * MediciProgress - Componente standalone per progress bar ricerche
 * Mostra progresso, timer, stats in tempo reale
 */

class MediciProgress {
  constructor(config = {}) {
    this.config = {
      container: config.container,

      // Dati progresso
      percentage: config.percentage || 0,
      completed: config.completed || 0,
      total: config.total || 0,
      results: config.results || 0,
      errors: config.errors || 0,
      totalRequests: config.totalRequests || 0,

      // Pagine (opzionale - per progress granulare)
      currentPage: config.currentPage || null,
      totalPagesForCombination: config.totalPagesForCombination || null,

      // Timer
      showTimer: config.showTimer !== undefined ? config.showTimer : true,
      startTime: config.startTime || null,

      // Template
      template: config.template || null,

      // Classes
      classes: {
        root: config.classes?.root || 'medici-progress',
        bar: config.classes?.bar || 'progress-bar',
        fill: config.classes?.fill || 'progress-bar-fill',
        ...config.classes
      },

      // Callbacks
      onChange: config.onChange || null
    };

    this.timerInterval = null;
    this.templateEngine = new TemplateEngine();

    this._init();
  }

  _init() {
    this.container = typeof this.config.container === 'string'
      ? document.querySelector(this.config.container)
      : this.config.container;

    if (!this.container) {
      throw new Error(`MediciProgress: container not found - ${this.config.container}`);
    }

    this.render();

    // Start timer
    if (this.config.showTimer && !this.config.startTime) {
      this.config.startTime = Date.now();
    }

    if (this.config.showTimer) {
      this._startTimer();
    }
  }

  /**
   * Start timer
   */
  _startTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }

    this.timerInterval = setInterval(() => {
      this._updateTimer();
    }, 100); // Update ogni 100ms
  }

  /**
   * Stop timer
   */
  _stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  /**
   * Update timer
   */
  _updateTimer() {
    if (!this.config.startTime) return;

    const elapsed = ((Date.now() - this.config.startTime) / 1000).toFixed(1);
    const timerEl = this.container.querySelector('[data-timer]');
    if (timerEl) {
      timerEl.textContent = `${elapsed}s`;
    }
  }

  /**
   * Render
   */
  render() {
    if (this.config.template) {
      // Custom template
      const html = this.templateEngine.render(this.config.template, this._getTemplateContext());
      this.container.innerHTML = html;
    } else {
      // Default template
      this.container.innerHTML = this._renderDefault();
    }
  }

  /**
   * Template context
   */
  _getTemplateContext() {
    const elapsed = this.config.startTime
      ? ((Date.now() - this.config.startTime) / 1000).toFixed(1)
      : '0.0';

    return {
      percentage: this.config.percentage,
      completed: this.config.completed,
      total: this.config.total,
      results: this.config.results,
      errors: this.config.errors,
      totalRequests: this.config.totalRequests,
      currentPage: this.config.currentPage,
      totalPagesForCombination: this.config.totalPagesForCombination,
      elapsed,
      showPages: this.config.currentPage && this.config.totalPagesForCombination
    };
  }

  /**
   * Render default
   */
  _renderDefault() {
    const ctx = this._getTemplateContext();

    return `
      <div class="${this.config.classes.root}">
        <div style="background: #f0f4ff; padding: 20px; border-radius: 8px;">
          <h3 style="color: #667eea; margin-bottom: 15px;">🔍 Ricerca in corso...</h3>

          <!-- Combinazioni progress -->
          <div style="margin-bottom: 12px;">
            <div style="font-size: 0.9rem; margin-bottom: 4px; color: #666;">
              📊 Combinazioni: <strong>${ctx.completed}/${ctx.total}</strong>
            </div>
            <div class="${this.config.classes.bar}" style="background: #e0e0e0; border-radius: 4px; overflow: hidden; height: 24px; position: relative; box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);">
              <div class="${this.config.classes.fill}" style="width: ${ctx.percentage}%; height: 100%; background: linear-gradient(90deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 0.95rem; min-width: fit-content; padding: 0 8px; transition: width 0.3s ease;">
                ${ctx.percentage}%
              </div>
            </div>
          </div>

          <!-- Pagine progress (condizionale) -->
          ${ctx.showPages ? `
            <div style="margin-bottom: 12px;">
              <div style="font-size: 0.9rem; margin-bottom: 4px; color: #666;">
                📄 Pagine (query corrente): <strong>${ctx.currentPage}/${ctx.totalPagesForCombination}</strong>
              </div>
              <div class="${this.config.classes.bar}">
                <div class="${this.config.classes.fill}" style="width: ${Math.round((ctx.currentPage / ctx.totalPagesForCombination) * 100)}%; background: linear-gradient(90deg, #28a745 0%, #20c997 100%);">
                  ${Math.round((ctx.currentPage / ctx.totalPagesForCombination) * 100)}%
                </div>
              </div>
            </div>
          ` : ''}

          <!-- Info aggiuntive -->
          <div style="display: flex; gap: 20px; font-size: 0.9rem; color: #666; margin-top: 10px; flex-wrap: wrap;">
            ${ctx.elapsed ? `<div>⏱️ Tempo: <strong data-timer>${ctx.elapsed}s</strong></div>` : ''}
            ${ctx.totalRequests ? `<div>🌐 Richieste HTTP: <strong>${ctx.totalRequests}</strong></div>` : ''}
            ${ctx.results ? `<div>📋 Medici trovati: <strong>${ctx.results}</strong></div>` : ''}
            ${ctx.errors ? `<div>❌ Errori: <strong style="color: #ef4444;">${ctx.errors}</strong></div>` : ''}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Update progress
   */
  update(data) {
    Object.assign(this.config, data);
    this.render();

    if (typeof this.config.onChange === 'function') {
      this.config.onChange(this.config);
    }
  }

  /**
   * Complete
   */
  complete() {
    this._stopTimer();
    this.container.innerHTML = '';
  }

  /**
   * Get state
   */
  getState() {
    return {
      percentage: this.config.percentage,
      completed: this.config.completed,
      total: this.config.total,
      results: this.config.results,
      errors: this.config.errors,
      totalRequests: this.config.totalRequests,
      elapsed: this.config.startTime
        ? ((Date.now() - this.config.startTime) / 1000).toFixed(1)
        : '0.0'
    };
  }

  /**
   * Destroy
   */
  destroy() {
    this._stopTimer();
    this.container.innerHTML = '';
  }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MediciProgress;
}
