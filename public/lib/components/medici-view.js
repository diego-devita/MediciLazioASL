/**
 * MediciView - Compositore che orchestra componenti atomici
 * Permette composizione flessibile e comunicazione tra blocchi
 */

class MediciView {
  constructor(config = {}) {
    this.config = {
      // Data
      data: config.data || [],

      // Blocchi componenti
      blocks: config.blocks || {},

      // Event bindings tra blocchi
      events: config.events || {},

      // Callbacks globali
      onDataChange: config.onDataChange || null,
      onReady: config.onReady || null
    };

    // Istanze componenti
    this.components = {};

    // State condiviso
    this.state = {
      data: this.config.data,
      filteredData: this.config.data,
      paginatedData: [],
      currentPage: 1,
      pageSize: 25,
      sortColumn: null,
      sortDirection: 'asc',
      activeFilters: []
    };

    this._init();
  }

  /**
   * Inizializzazione
   */
  _init() {
    // Crea tutti i componenti
    this._createComponents();

    // Setup event bindings
    this._setupEventBindings();

    // Callback ready
    if (typeof this.config.onReady === 'function') {
      this.config.onReady(this);
    }
  }

  /**
   * Crea componenti da configurazione blocchi
   */
  _createComponents() {
    Object.keys(this.config.blocks).forEach(blockName => {
      const blockConfig = this.config.blocks[blockName];

      if (!blockConfig.type || !blockConfig.container) {
        console.warn(`MediciView: block ${blockName} missing type or container`);
        return;
      }

      // Crea componente in base al tipo
      switch (blockConfig.type) {
        case 'counters':
          this.components[blockName] = this._createCounters(blockConfig);
          break;

        case 'table':
          this.components[blockName] = this._createTable(blockConfig);
          break;

        case 'pagination':
          this.components[blockName] = this._createPagination(blockConfig);
          break;

        case 'progress':
          this.components[blockName] = this._createProgress(blockConfig);
          break;

        default:
          console.warn(`MediciView: unknown block type "${blockConfig.type}"`);
      }
    });
  }

  /**
   * Crea componente Counters
   */
  _createCounters(blockConfig) {
    return new MediciCounters({
      container: blockConfig.container,
      data: this.state.filteredData,
      variant: blockConfig.config?.variant || 'summary-item',
      interactive: blockConfig.config?.interactive || false,
      counters: blockConfig.config?.counters,
      template: blockConfig.config?.template,
      classes: blockConfig.config?.classes,

      onFilterClick: (filterKey, counter, activeFilters) => {
        // Update state
        this.state.activeFilters = activeFilters;

        // Apply filters
        this._applyFilters();

        // Emit event
        this._emit('counters.filterClick', { filterKey, counter, activeFilters });
      }
    });
  }

  /**
   * Crea componente Table
   */
  _createTable(blockConfig) {
    const tableData = blockConfig.config?.usePaginated
      ? this.state.paginatedData
      : this.state.filteredData;

    return new MediciTable({
      container: blockConfig.container,
      data: tableData,
      columns: blockConfig.config?.columns,
      sorting: blockConfig.config?.sorting,
      sortColumn: blockConfig.config?.sortColumn,
      sortDirection: blockConfig.config?.sortDirection,
      tooltip: blockConfig.config?.tooltip,
      responsive: blockConfig.config?.responsive,
      classes: blockConfig.config?.classes,

      onSort: (column, direction) => {
        // Update state
        this.state.sortColumn = column;
        this.state.sortDirection = direction;

        // Apply sort
        this._applySort();

        // Emit event
        this._emit('table.sort', { column, direction });
      },

      onRowClick: (medico) => {
        this._emit('table.rowClick', { medico });
      }
    });
  }

  /**
   * Crea componente Pagination
   */
  _createPagination(blockConfig) {
    return new MediciPagination({
      container: blockConfig.container,
      totalItems: this.state.filteredData.length,
      pageSize: blockConfig.config?.pageSize || 25,
      currentPage: blockConfig.config?.currentPage || 1,
      pageSizeOptions: blockConfig.config?.pageSizeOptions,
      showPageNumbers: blockConfig.config?.showPageNumbers,
      maxPageButtons: blockConfig.config?.maxPageButtons,
      showFirstLast: blockConfig.config?.showFirstLast,
      showPrevNext: blockConfig.config?.showPrevNext,
      classes: blockConfig.config?.classes,

      onPageChange: (page) => {
        // Update state
        this.state.currentPage = page;

        // Apply pagination
        this._applyPagination();

        // Emit event
        this._emit('pagination.pageChange', { page });
      },

      onPageSizeChange: (size) => {
        // Update state
        this.state.pageSize = size;
        this.state.currentPage = 1;

        // Apply pagination
        this._applyPagination();

        // Emit event
        this._emit('pagination.pageSizeChange', { size });
      }
    });
  }

  /**
   * Crea componente Progress
   */
  _createProgress(blockConfig) {
    return new MediciProgress({
      container: blockConfig.container,
      showTimer: blockConfig.config?.showTimer,
      template: blockConfig.config?.template,
      classes: blockConfig.config?.classes,

      onChange: (progress) => {
        this._emit('progress.change', progress);
      }
    });
  }

  /**
   * Setup event bindings
   */
  _setupEventBindings() {
    Object.keys(this.config.events).forEach(eventName => {
      const handler = this.config.events[eventName];

      if (typeof handler === 'function') {
        this.on(eventName, handler);
      }
    });
  }

  /**
   * Event emitter
   */
  _emit(eventName, data) {
    const handler = this.config.events[eventName];

    if (typeof handler === 'function') {
      handler.call(this, data);
    }
  }

  /**
   * Event listener
   */
  on(eventName, handler) {
    this.config.events[eventName] = handler;
  }

  /**
   * Apply filters
   */
  _applyFilters() {
    const countersComponent = this._findComponentByType('counters');

    if (!countersComponent || this.state.activeFilters.length === 0) {
      this.state.filteredData = [...this.state.data];
    } else {
      const activeCounters = countersComponent.config.counters.filter(c =>
        this.state.activeFilters.includes(c.key)
      );

      this.state.filteredData = this.state.data.filter(item => {
        return activeCounters.some(counter => {
          return counter.filter && counter.filter(item);
        });
      });
    }

    // Update components
    this._updateComponents();
  }

  /**
   * Apply sort
   */
  _applySort() {
    if (!this.state.sortColumn) return;

    this.state.filteredData.sort((a, b) => {
      let aVal = a[this.state.sortColumn] || '';
      let bVal = b[this.state.sortColumn] || '';

      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();

      const cmp = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      return this.state.sortDirection === 'asc' ? cmp : -cmp;
    });

    // Update components
    this._updateComponents();
  }

  /**
   * Apply pagination
   */
  _applyPagination() {
    const paginationComponent = this._findComponentByType('pagination');

    if (!paginationComponent || this.state.pageSize === 'Tutti') {
      this.state.paginatedData = [...this.state.filteredData];
    } else {
      const start = (this.state.currentPage - 1) * this.state.pageSize;
      const end = start + this.state.pageSize;
      this.state.paginatedData = this.state.filteredData.slice(start, end);
    }

    // Update components
    this._updateComponents();
  }

  /**
   * Update all components
   */
  _updateComponents() {
    Object.keys(this.components).forEach(name => {
      const component = this.components[name];
      const blockConfig = this.config.blocks[name];

      if (component instanceof MediciCounters) {
        component.setData(this.state.filteredData);

      } else if (component instanceof MediciTable) {
        const data = blockConfig.config?.usePaginated
          ? this.state.paginatedData
          : this.state.filteredData;
        component.setData(data);

      } else if (component instanceof MediciPagination) {
        component.setTotalItems(this.state.filteredData.length);
      }
    });
  }

  /**
   * Find component by type
   */
  _findComponentByType(type) {
    for (const name in this.components) {
      const blockConfig = this.config.blocks[name];
      if (blockConfig.type === type) {
        return this.components[name];
      }
    }
    return null;
  }

  /**
   * Get component by name
   */
  getComponent(name) {
    return this.components[name];
  }

  /**
   * Set data
   */
  setData(data) {
    this.state.data = data;
    this.state.filteredData = data;
    this.state.paginatedData = [];
    this.state.currentPage = 1;

    // Re-apply filters and pagination
    this._applyFilters();
    this._applyPagination();

    if (typeof this.config.onDataChange === 'function') {
      this.config.onDataChange(data);
    }
  }

  /**
   * Get data
   */
  getData() {
    return {
      raw: [...this.state.data],
      filtered: [...this.state.filteredData],
      paginated: [...this.state.paginatedData]
    };
  }

  /**
   * Get state
   */
  getState() {
    return {
      ...this.state,
      totalItems: this.state.data.length,
      filteredItems: this.state.filteredData.length,
      paginatedItems: this.state.paginatedData.length
    };
  }

  /**
   * Update progress
   */
  updateProgress(progress) {
    const progressComponent = this._findComponentByType('progress');
    if (progressComponent) {
      progressComponent.update(progress);
    }
  }

  /**
   * Complete progress
   */
  completeProgress() {
    const progressComponent = this._findComponentByType('progress');
    if (progressComponent) {
      progressComponent.complete();
    }
  }

  /**
   * Destroy all components
   */
  destroy() {
    Object.values(this.components).forEach(component => {
      if (component && typeof component.destroy === 'function') {
        component.destroy();
      }
    });
    this.components = {};
  }
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MediciView;
}

// Export for browser
if (typeof window !== 'undefined') {
  window.MediciView = MediciView;
}
