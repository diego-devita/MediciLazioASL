/**
 * MediciCounters - Componente standalone per contatori/statistiche
 * Riusabile, configurabile, con event system
 */

class MediciCounters {
  constructor(config = {}) {
    this.config = {
      container: config.container,
      data: config.data || [],

      // Variante visuale
      variant: config.variant || 'summary-item', // 'summary-item', 'stat-compact'

      // Interattività
      interactive: config.interactive !== undefined ? config.interactive : false,

      // Contatori da mostrare
      counters: config.counters || [
        {
          key: 'totali',
          label: 'Totali',
          color: null,
          icon: null,
          filter: null
        },
        {
          key: 'liberi',
          label: 'Assegnabili liberamente',
          color: '#22c55e',
          icon: '🟢',
          filter: (m) => String(m.assegnabilita || '').toLowerCase().includes('assegnazione libera')
        },
        {
          key: 'deroga',
          label: 'Con deroga',
          color: '#f59e0b',
          icon: '🟠',
          filter: (m) => {
            const stato = String(m.assegnabilita || '').toLowerCase();
            return stato.includes('deroga') && !stato.includes('assegnazione libera');
          }
        },
        {
          key: 'altri',
          label: 'Altro',
          color: '#ef4444',
          icon: '🔴',
          filter: (m) => {
            const stato = String(m.assegnabilita || '').toLowerCase();
            return !stato.includes('assegnazione libera') && !stato.includes('deroga');
          }
        }
      ],

      // Template custom (opzionale)
      template: config.template || null,

      // Classes CSS
      classes: {
        root: config.classes?.root || 'medici-counters',
        item: config.classes?.item || (config.variant === 'stat-compact' ? 'stat-compact' : 'summary-item'),
        active: config.classes?.active || 'active',
        ...config.classes
      },

      // Callbacks
      onFilterClick: config.onFilterClick || null,
      onChange: config.onChange || null
    };

    this.state = {
      activeFilters: [],
      counts: {}
    };

    this.templateEngine = new TemplateEngine();

    this._init();
  }

  _init() {
    this.container = typeof this.config.container === 'string'
      ? document.querySelector(this.config.container)
      : this.config.container;

    if (!this.container) {
      throw new Error(`MediciCounters: container not found - ${this.config.container}`);
    }

    this._calculateCounts();
    this.render();
  }

  /**
   * Calcola i contatori
   */
  _calculateCounts() {
    const data = this.config.data;

    this.state.counts = {};

    this.config.counters.forEach(counter => {
      if (counter.key === 'totali') {
        this.state.counts.totali = data.length;
      } else if (counter.filter && typeof counter.filter === 'function') {
        this.state.counts[counter.key] = data.filter(counter.filter).length;
      } else {
        this.state.counts[counter.key] = 0;
      }
    });
  }

  /**
   * Render del componente
   */
  render() {
    let html = '';

    if (this.config.template) {
      // Template custom
      html = this.templateEngine.render(this.config.template, {
        counters: this.config.counters.map(c => ({
          ...c,
          count: this.state.counts[c.key] || 0,
          active: this.state.activeFilters.includes(c.key)
        })),
        state: this.state
      });
    } else {
      // Template di default basato su variant
      html = this._renderDefault();
    }

    this.container.innerHTML = html;

    // Attach event listeners
    this._attachEventListeners();
  }

  /**
   * Render template di default
   */
  _renderDefault() {
    if (this.config.variant === 'stat-compact') {
      return this._renderStatCompact();
    } else {
      return this._renderSummaryItem();
    }
  }

  /**
   * Render variante summary-item (index.html style)
   */
  _renderSummaryItem() {
    return `
      <div class="results-summary">
        ${this.config.counters.map(counter => {
          const count = this.state.counts[counter.key] || 0;
          const styleColor = counter.color ? `style="color: ${counter.color};"` : '';

          return `
            <div class="${this.config.classes.item}">
              <div class="summary-number" ${styleColor}>${count}</div>
              <div class="summary-label">${counter.label}</div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  /**
   * Render variante stat-compact (bot.html style)
   */
  _renderStatCompact() {
    return `
      <div class="stats-compact">
        ${this.config.counters.map(counter => {
          const count = this.state.counts[counter.key] || 0;
          const isActive = this.state.activeFilters.length === 0 || this.state.activeFilters.includes(counter.key);
          const activeClass = isActive ? this.config.classes.active : '';

          let extraClass = '';
          if (counter.key === 'liberi') extraClass = 'stat-success';
          else if (counter.key === 'deroga') extraClass = 'stat-warning';
          else if (counter.key === 'altri') extraClass = 'stat-info';

          const clickable = this.config.interactive && counter.filter;
          const dataFilter = counter.key !== 'totali' ? `data-filter="${counter.key}"` : '';
          const cursor = clickable ? 'style="cursor: pointer;"' : '';

          return `
            <div class="${this.config.classes.item} ${extraClass} ${activeClass}" ${dataFilter} ${cursor}>
              <span class="stat-compact-value">${count}</span>
              <span class="stat-compact-label">${counter.label}</span>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  /**
   * Attach event listeners
   */
  _attachEventListeners() {
    if (!this.config.interactive) return;

    this.container.querySelectorAll('[data-filter]').forEach(el => {
      el.addEventListener('click', () => {
        const filterKey = el.dataset.filter;
        this._toggleFilter(filterKey);
      });
    });
  }

  /**
   * Toggle filtro
   */
  _toggleFilter(filterKey) {
    const index = this.state.activeFilters.indexOf(filterKey);

    if (index === -1) {
      // Aggiungi filtro
      this.state.activeFilters.push(filterKey);
    } else {
      // Rimuovi filtro
      this.state.activeFilters.splice(index, 1);
    }

    // Re-render
    this.render();

    // Callback
    if (typeof this.config.onFilterClick === 'function') {
      const counter = this.config.counters.find(c => c.key === filterKey);
      this.config.onFilterClick(filterKey, counter, this.state.activeFilters);
    }
  }

  /**
   * Update data
   */
  setData(data) {
    this.config.data = data;
    this._calculateCounts();
    this.render();

    if (typeof this.config.onChange === 'function') {
      this.config.onChange(this.state.counts);
    }
  }

  /**
   * Get counts
   */
  getCounts() {
    return { ...this.state.counts };
  }

  /**
   * Get active filters
   */
  getActiveFilters() {
    return [...this.state.activeFilters];
  }

  /**
   * Set active filters
   */
  setActiveFilters(filters) {
    this.state.activeFilters = filters;
    this.render();
  }

  /**
   * Clear filters
   */
  clearFilters() {
    this.state.activeFilters = [];
    this.render();
  }

  /**
   * Destroy
   */
  destroy() {
    this.container.innerHTML = '';
  }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MediciCounters;
}
