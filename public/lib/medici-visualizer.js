/**
 * MediciVisualizer - Componente universale per visualizzare risultati ricerca medici
 * Sistema dichiarativo con template, slot, helpers, reactivity
 */

class MediciVisualizer {
  constructor(config = {}) {
    this.config = this._mergeConfig(config);

    // State interno
    this.state = {
      items: [],
      filteredItems: [],
      paginatedItems: [],
      currentPage: 1,
      pageSize: this.config.pagination.pageSize || 25,
      sortColumn: this.config.sorting.defaultColumn || null,
      sortDirection: this.config.sorting.defaultDirection || 'asc',
      activeFilters: [],
      isSearching: false,
      progress: null
    };

    // Template engine
    this.templateEngine = new TemplateEngine(this._createHelpers());

    // Compiled templates cache
    this.compiledTemplates = {};

    // Event listeners storage
    this.eventListeners = new Map();

    this._init();
  }

  /**
   * Inizializza il componente
   */
  _init() {
    // Trova container
    this.container = typeof this.config.container === 'string'
      ? document.querySelector(this.config.container)
      : this.config.container;

    if (!this.container) {
      throw new Error(`Container not found: ${this.config.container}`);
    }

    // Set initial data
    if (this.config.data) {
      this.setData(this.config.data);
    } else {
      this.render();
    }

    // Callback onReady
    if (typeof this.config.onReady === 'function') {
      this.config.onReady(this);
    }
  }

  /**
   * Merge config con preset e defaults
   */
  _mergeConfig(config) {
    let baseConfig = {};

    // Load preset se specificato
    if (config.preset && MediciVisualizerPresets[config.preset]) {
      baseConfig = JSON.parse(JSON.stringify(MediciVisualizerPresets[config.preset]));
    }

    // Deep merge config
    return this._deepMerge(this._getDefaults(), baseConfig, config);
  }

  /**
   * Config di default
   */
  _getDefaults() {
    return {
      container: null,
      data: [],
      preset: null,

      layout: {
        main: `
          <div class="{{classes.root}}">
            {{slot:progress}}
            {{slot:summary}}
            {{slot:content}}
            {{slot:pagination}}
          </div>
        `,
        slots: {}
      },

      classes: {
        root: 'medici-visualizer',
        progress: 'medici-progress',
        summary: 'medici-summary',
        content: 'medici-content',
        pagination: 'medici-pagination'
      },

      pagination: {
        enabled: false,
        pageSize: 25,
        pageSizeOptions: [10, 25, 50, 100, 'Tutti'],
        showPageNumbers: true,
        maxPageButtons: 5,
        showFirstLast: true,
        showPrevNext: true
      },

      sorting: {
        enabled: false,
        defaultColumn: null,
        defaultDirection: 'asc',
        caseSensitive: false
      },

      filters: {
        enabled: false,
        mode: 'category'
      },

      summary: {
        enabled: false,
        counters: []
      },

      progress: {
        enabled: false
      },

      tooltip: {
        enabled: false,
        fields: []
      },

      onRowClick: null,
      onSort: null,
      onPageChange: null,
      onFilterChange: null,
      onReady: null
    };
  }

  /**
   * Deep merge di oggetti
   */
  _deepMerge(target, ...sources) {
    if (!sources.length) return target;
    const source = sources.shift();

    if (this._isObject(target) && this._isObject(source)) {
      for (const key in source) {
        if (this._isObject(source[key])) {
          if (!target[key]) Object.assign(target, { [key]: {} });
          this._deepMerge(target[key], source[key]);
        } else {
          Object.assign(target, { [key]: source[key] });
        }
      }
    }

    return this._deepMerge(target, ...sources);
  }

  _isObject(item) {
    return item && typeof item === 'object' && !Array.isArray(item);
  }

  /**
   * Crea helpers disponibili nei template
   */
  _createHelpers() {
    const self = this;

    return {
      // === FORMATTING ===
      uppercase: (str) => String(str || '').toUpperCase(),
      lowercase: (str) => String(str || '').toLowerCase(),
      capitalize: (str) => {
        const s = String(str || '');
        return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
      },

      // === DATE/TIME ===
      formatTime: (seconds) => {
        if (!seconds) return '0.0';
        return Number(seconds).toFixed(1);
      },
      formatDate: (date) => {
        if (!date) return '';
        return new Date(date).toLocaleDateString('it-IT');
      },

      // === MEDICI SPECIFIC ===
      emoji: (assegnabilita) => {
        if (!assegnabilita) return '⚪';
        const stato = String(assegnabilita).toLowerCase();
        if (stato.includes('assegnazione libera')) return '🟢';
        if (stato.includes('deroga')) return '🟠';
        if (stato.includes('non assegnabile')) return '🔴';
        return '⚪';
      },

      rowClass: function(assegnabilita) {
        const stato = String(assegnabilita || '').toLowerCase();
        if (stato.includes('assegnazione libera')) return 'row-libero';
        if (stato.includes('deroga')) return 'row-deroga';
        if (stato.includes('non assegnabile')) return 'row-non-assegnabile';
        return '';
      },

      badgeClass: function(assegnabilita) {
        const stato = String(assegnabilita || '').toLowerCase();
        if (stato.includes('assegnazione libera')) return 'badge-success';
        if (stato.includes('deroga')) return 'badge-warning';
        return 'badge-default';
      },

      badgeText: function(assegnabilita) {
        const stato = String(assegnabilita || '').toLowerCase();
        if (stato.includes('assegnazione libera')) return 'Assegnabile';
        if (stato.includes('deroga')) return 'Deroga';
        if (stato.includes('non assegnabile')) return 'Non assegnabile';
        return 'Altro';
      },

      // === STATE ACCESS ===
      percentage: () => self.state.progress?.percentage || 0,
      completed: () => self.state.progress?.completed || 0,
      total: () => self.state.progress?.total || 0,
      httpRequests: () => self.state.progress?.totalRequests || 0,
      elapsed: () => {
        if (!self.state.progress?.startTime) return 0;
        return ((Date.now() - self.state.progress.startTime) / 1000).toFixed(1);
      },

      currentPage: () => self.state.currentPage,
      totalPages: () => {
        if (self.state.pageSize === 'Tutti') return 1;
        const pageSize = typeof self.state.pageSize === 'number' ? self.state.pageSize : parseInt(self.state.pageSize);
        return Math.ceil(self.state.filteredItems.length / pageSize);
      },
      totalItems: () => self.state.filteredItems.length,
      pageSize: () => self.state.pageSize,
      showPagination: () => self.state.pageSize !== 'Tutti',

      isFirstPage: () => self.state.currentPage === 1,
      isLastPage: () => {
        if (self.state.pageSize === 'Tutti') return true;
        const pageSize = typeof self.state.pageSize === 'number' ? self.state.pageSize : parseInt(self.state.pageSize);
        const total = Math.ceil(self.state.filteredItems.length / pageSize);
        const result = self.state.currentPage >= total;
        console.log('isLastPage check:', {
          currentPage: self.state.currentPage,
          filteredItems: self.state.filteredItems.length,
          pageSize: pageSize,
          total: total,
          result: result
        });
        return result;
      },

      isCurrentPage: (page) => {
        const result = page === self.state.currentPage;
        console.log('isCurrentPage:', { page, currentPage: self.state.currentPage, result });
        return result;
      },

      // === COMPARISON ===
      gt: (a, b) => a > b,
      lt: (a, b) => a < b,
      eq: (a, b) => a === b,

      // === COUNTERS ===
      countTotal: () => self.state.items.length,
      countLiberi: () => self.state.items.filter(m =>
        String(m.assegnabilita || '').toLowerCase().includes('assegnazione libera')
      ).length,
      countDeroga: () => self.state.items.filter(m => {
        const stato = String(m.assegnabilita || '').toLowerCase();
        return stato.includes('deroga') && !stato.includes('assegnazione libera');
      }).length,
      countAltri: () => self.state.items.filter(m => {
        const stato = String(m.assegnabilita || '').toLowerCase();
        return !stato.includes('assegnazione libera') && !stato.includes('deroga');
      }).length,

      // === ARRAY HELPERS ===
      visiblePages: () => {
        if (self.state.pageSize === 'Tutti') return [];
        const current = self.state.currentPage;
        const pageSize = typeof self.state.pageSize === 'number' ? self.state.pageSize : parseInt(self.state.pageSize);
        const total = Math.ceil(self.state.filteredItems.length / pageSize);
        const max = self.config.pagination.maxPageButtons;

        if (total <= max) {
          return Array.from({ length: total }, (_, i) => i + 1);
        }

        const pages = [];
        const halfMax = Math.floor(max / 2);
        let start = Math.max(1, current - halfMax);
        let end = Math.min(total, start + max - 1);

        if (end - start < max - 1) {
          start = Math.max(1, end - max + 1);
        }

        for (let i = start; i <= end; i++) {
          pages.push(i);
        }

        return pages;
      },

      pageSizeOptions: () => self.config.pagination.pageSizeOptions,

      // === EVENT HANDLERS (return handler id per binding) ===
      onSort: (column) => {
        const id = `sort_${column}_${Date.now()}`;
        self.eventListeners.set(id, () => self.sort(column));
        return `mediciVisualizer.triggerEvent('${id}')`;
      },

      onFilter: (category) => {
        const id = `filter_${category}_${Date.now()}`;
        self.eventListeners.set(id, () => self.filter([category]));
        return `mediciVisualizer.triggerEvent('${id}')`;
      },

      onPageChange: (page) => {
        const id = `page_${page}_${Date.now()}`;
        self.eventListeners.set(id, () => self.goToPage(page));
        return `mediciVisualizer.triggerEvent('${id}')`;
      },

      firstPage: () => {
        const id = `firstPage_${Date.now()}`;
        self.eventListeners.set(id, () => self.goToPage(1));
        return `mediciVisualizer.triggerEvent('${id}')`;
      },

      prevPage: () => {
        const id = `prevPage_${Date.now()}`;
        self.eventListeners.set(id, () => self.goToPage(self.state.currentPage - 1));
        return `mediciVisualizer.triggerEvent('${id}')`;
      },

      nextPage: () => {
        const id = `nextPage_${Date.now()}`;
        self.eventListeners.set(id, () => self.goToPage(self.state.currentPage + 1));
        return `mediciVisualizer.triggerEvent('${id}')`;
      },

      lastPage: () => {
        const id = `lastPage_${Date.now()}`;
        const total = Math.ceil(self.state.filteredItems.length / self.state.pageSize);
        self.eventListeners.set(id, () => self.goToPage(total));
        return `mediciVisualizer.triggerEvent('${id}')`;
      },

      setPageSize: () => {
        const id = `setPageSize_${Date.now()}`;
        self.eventListeners.set(id, (event) => {
          const size = event.target.value === 'Tutti' ? 'Tutti' : parseInt(event.target.value);
          self.setPageSize(size);
        });
        return `mediciVisualizer.triggerEvent('${id}', event)`;
      },

      // === SORT CLASS HELPER ===
      sortClassFor: function(column) {
        if (self.state.sortColumn === column) {
          return `sort-${self.state.sortDirection}`;
        }
        return '';
      }
    };
  }

  /**
   * Trigger event da template
   */
  triggerEvent(id, ...args) {
    const handler = this.eventListeners.get(id);
    if (handler) {
      handler(...args);
    }
  }

  /**
   * Render principale
   */
  render() {
    this._applyFilters();
    this._applySort();
    this._applyPagination();

    // Render main layout
    const html = this._renderLayout();

    // Update DOM
    this.container.innerHTML = html;

    // Attach event listeners
    this._attachDOMEventListeners();
  }

  /**
   * Render del layout principale con slots
   */
  _renderLayout() {
    let layout = this.config.layout.main;

    // Sostituisci ogni slot
    const slotRegex = /\{\{slot:(\w+)\}\}/g;
    layout = layout.replace(slotRegex, (match, slotName) => {
      return this._renderSlot(slotName);
    });

    // Render del layout con template engine
    const context = {
      state: this.state,
      data: this.state.items,
      config: this.config,
      classes: this.config.classes
    };

    return this.templateEngine.render(layout, context);
  }

  /**
   * Render di uno slot specifico
   */
  _renderSlot(slotName) {
    const slotConfig = this.config.layout.slots[slotName];

    if (!slotConfig || slotConfig.enabled === false) {
      return '';
    }

    // Check condizione show
    if (typeof slotConfig.show === 'function' && !slotConfig.show(this.state)) {
      return '';
    }

    // Get template (variant o default)
    let template = slotConfig.template;

    if (slotConfig.variants && slotConfig.currentVariant) {
      template = slotConfig.variants[slotConfig.currentVariant] || template;
    }

    if (!template) return '';

    // Render con context
    const context = {
      state: this.state,
      data: this.state.paginatedItems,
      items: this.state.paginatedItems,
      allItems: this.state.items,
      config: this.config,
      classes: this.config.classes,
      progress: this.state.progress
    };

    return this.templateEngine.render(template, context);
  }

  /**
   * Applica filtri ai dati
   */
  _applyFilters() {
    if (!this.config.filters.enabled || this.state.activeFilters.length === 0) {
      this.state.filteredItems = [...this.state.items];
      console.log('ApplyFilters (no filters):', { items: this.state.items.length, filteredItems: this.state.filteredItems.length });
      return;
    }

    this.state.filteredItems = this.state.items.filter(item => {
      return this.state.activeFilters.some(filterFn => {
        return typeof filterFn === 'function' ? filterFn(item) : true;
      });
    });
    console.log('ApplyFilters (with filters):', { items: this.state.items.length, filteredItems: this.state.filteredItems.length });
  }

  /**
   * Applica sorting
   */
  _applySort() {
    if (!this.config.sorting.enabled || !this.state.sortColumn) return;

    this.state.filteredItems.sort((a, b) => {
      let aVal = a[this.state.sortColumn] || '';
      let bVal = b[this.state.sortColumn] || '';

      if (!this.config.sorting.caseSensitive) {
        if (typeof aVal === 'string') aVal = aVal.toLowerCase();
        if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      }

      const cmp = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      return this.state.sortDirection === 'asc' ? cmp : -cmp;
    });
  }

  /**
   * Applica paginazione
   */
  _applyPagination() {
    if (!this.config.pagination.enabled || this.state.pageSize === 'Tutti') {
      this.state.paginatedItems = [...this.state.filteredItems];
      return;
    }

    // Assicurati che pageSize sia un numero
    const pageSize = typeof this.state.pageSize === 'number' ? this.state.pageSize : parseInt(this.state.pageSize);

    const start = (this.state.currentPage - 1) * pageSize;
    const end = start + pageSize;
    this.state.paginatedItems = this.state.filteredItems.slice(start, end);

    // Debug
    console.log('Pagination:', {
      filteredItems: this.state.filteredItems.length,
      pageSize: pageSize,
      currentPage: this.state.currentPage,
      paginatedItems: this.state.paginatedItems.length,
      totalPages: Math.ceil(this.state.filteredItems.length / pageSize)
    });
  }

  /**
   * Attach event listeners al DOM dopo render
   */
  _attachDOMEventListeners() {
    // Expose instance globally per event handlers
    window.mediciVisualizer = this;

    // Sort headers (TH con data-column)
    if (this.config.sorting.enabled) {
      this.container.querySelectorAll('th[data-column]').forEach(th => {
        th.addEventListener('click', () => {
          const column = th.dataset.column;
          this.sort(column);
        });
        // Cursor pointer per indicare clickability
        th.style.cursor = 'pointer';
      });
    }

    // Row click handlers
    if (typeof this.config.onRowClick === 'function') {
      this.container.querySelectorAll('[data-medico-index]').forEach(row => {
        row.addEventListener('click', (e) => {
          const index = parseInt(row.dataset.medicoIndex);
          const medico = this.state.paginatedItems[index];
          this.config.onRowClick(medico, e);
        });
      });
    }

    // Pagination controls
    if (this.config.pagination.enabled) {
      // Page size select
      const pageSizeSelect = this.container.querySelector('[data-page-size-select]');
      if (pageSizeSelect) {
        pageSizeSelect.value = String(this.state.pageSize);
        pageSizeSelect.addEventListener('change', (event) => {
          const size = event.target.value === 'Tutti' ? 'Tutti' : parseInt(event.target.value);
          this.setPageSize(size);
        });
      }

      // Page navigation buttons
      this.container.querySelectorAll('[data-page-action]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const action = btn.dataset.pageAction;

          if (action === 'first') {
            this.goToPage(1);
          } else if (action === 'prev') {
            this.goToPage(this.state.currentPage - 1);
          } else if (action === 'next') {
            this.goToPage(this.state.currentPage + 1);
          } else if (action === 'last') {
            const total = Math.ceil(this.state.filteredItems.length / this.state.pageSize);
            this.goToPage(total);
          } else if (action === 'page') {
            const page = parseInt(btn.dataset.page);
            this.goToPage(page);
          }
        });

        // Style page number buttons based on current page
        if (btn.dataset.pageAction === 'page') {
          const page = parseInt(btn.dataset.page);
          if (page === this.state.currentPage) {
            // Current page: white background, blue text
            btn.style.background = 'white';
            btn.style.color = '#667eea';
            btn.style.fontWeight = '700';
          } else {
            // Other pages: blue background, white text
            btn.style.background = '#667eea';
            btn.style.color = 'white';
            btn.style.fontWeight = '400';
          }
        }
      });
    }
  }

  // ========================================
  // API PUBBLICA
  // ========================================

  /**
   * Imposta nuovi dati
   */
  setData(data) {
    this.state.items = Array.isArray(data) ? data : [];
    this.state.currentPage = 1;
    this.render();
  }

  /**
   * Aggiunge dati
   */
  addData(data) {
    this.state.items = [...this.state.items, ...data];
    this.render();
  }

  /**
   * Sort per colonna
   */
  sort(column, direction) {
    if (this.state.sortColumn === column && !direction) {
      // Toggle direction
      this.state.sortDirection = this.state.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.state.sortColumn = column;
      this.state.sortDirection = direction || 'asc';
    }

    this.render();

    if (typeof this.config.onSort === 'function') {
      this.config.onSort(column, this.state.sortDirection);
    }
  }

  /**
   * Filtra risultati
   */
  filter(filters) {
    this.state.activeFilters = filters;
    this.state.currentPage = 1;
    this.render();

    if (typeof this.config.onFilterChange === 'function') {
      this.config.onFilterChange(filters);
    }
  }

  /**
   * Vai a pagina
   */
  goToPage(page) {
    const totalPages = Math.ceil(this.state.filteredItems.length / this.state.pageSize);
    this.state.currentPage = Math.max(1, Math.min(page, totalPages));
    this.render();

    if (typeof this.config.onPageChange === 'function') {
      this.config.onPageChange(this.state.currentPage);
    }
  }

  /**
   * Set page size
   */
  setPageSize(size) {
    this.state.pageSize = size;
    this.state.currentPage = 1;
    this.render();
  }

  /**
   * Update progress (per ricerche in corso)
   */
  updateProgress(progress) {
    this.state.progress = {
      ...this.state.progress,
      ...progress,
      startTime: this.state.progress?.startTime || Date.now()
    };
    this.state.isSearching = true;
    this.render();
  }

  /**
   * Complete progress (fine ricerca)
   */
  completeProgress() {
    this.state.isSearching = false;
    this.render();
  }

  /**
   * Get current state
   */
  getState() {
    const effectivePageSize = this.state.pageSize === 'Tutti' ? this.state.filteredItems.length : this.state.pageSize;
    const totalPages = this.state.pageSize === 'Tutti' ? 1 : Math.ceil(this.state.filteredItems.length / this.state.pageSize);

    return {
      totalItems: this.state.items.length,
      filteredItems: this.state.filteredItems.length,
      paginatedItems: this.state.paginatedItems.length,
      currentPage: this.state.currentPage,
      totalPages: totalPages,
      pageSize: this.state.pageSize,
      showPagination: this.state.pageSize !== 'Tutti',
      sortColumn: this.state.sortColumn,
      sortDirection: this.state.sortDirection,
      counters: {
        totali: this.state.items.length,
        liberi: this.state.items.filter(m =>
          String(m.assegnabilita || '').toLowerCase().includes('assegnazione libera')
        ).length,
        deroga: this.state.items.filter(m => {
          const stato = String(m.assegnabilita || '').toLowerCase();
          return stato.includes('deroga') && !stato.includes('assegnazione libera');
        }).length,
        altri: this.state.items.filter(m => {
          const stato = String(m.assegnabilita || '').toLowerCase();
          return !stato.includes('assegnazione libera') && !stato.includes('deroga');
        }).length
      }
    };
  }

  /**
   * Distruggi componente
   */
  destroy() {
    this.eventListeners.clear();
    this.container.innerHTML = '';
    if (window.mediciVisualizer === this) {
      delete window.mediciVisualizer;
    }
  }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MediciVisualizer;
}
