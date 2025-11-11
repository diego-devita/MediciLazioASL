/**
 * MediciPagination - Componente standalone per paginazione client-side
 * Completamente configurabile e riusabile
 */

class MediciPagination {
  constructor(config = {}) {
    this.config = {
      container: config.container,
      totalItems: config.totalItems || 0,
      pageSize: config.pageSize || 25,
      currentPage: config.currentPage || 1,

      // Options
      pageSizeOptions: config.pageSizeOptions || [10, 25, 50, 100, 'Tutti'],
      showPageNumbers: config.showPageNumbers !== undefined ? config.showPageNumbers : true,
      maxPageButtons: config.maxPageButtons || 5,
      showFirstLast: config.showFirstLast !== undefined ? config.showFirstLast : true,
      showPrevNext: config.showPrevNext !== undefined ? config.showPrevNext : true,
      showPageSizeSelector: config.showPageSizeSelector !== undefined ? config.showPageSizeSelector : true,
      showInfo: config.showInfo !== undefined ? config.showInfo : true,

      // Template
      template: config.template || null,

      // Classes
      classes: {
        root: config.classes?.root || 'pagination-controls',
        button: config.classes?.button || 'pagination-button',
        buttonActive: config.classes?.buttonActive || 'active',
        buttonDisabled: config.classes?.buttonDisabled || 'disabled',
        ...config.classes
      },

      // Callbacks
      onPageChange: config.onPageChange || null,
      onPageSizeChange: config.onPageSizeChange || null
    };

    this.templateEngine = new TemplateEngine();

    this._init();
  }

  _init() {
    this.container = typeof this.config.container === 'string'
      ? document.querySelector(this.config.container)
      : this.config.container;

    if (!this.container) {
      throw new Error(`MediciPagination: container not found - ${this.config.container}`);
    }

    this.render();
  }

  /**
   * Get total pages
   */
  get totalPages() {
    if (this.config.pageSize === 'Tutti') return 1;
    return Math.ceil(this.config.totalItems / this.config.pageSize);
  }

  /**
   * Get visible page numbers
   */
  getVisiblePages() {
    const total = this.totalPages;
    const current = this.config.currentPage;
    const max = this.config.maxPageButtons;

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

    this._attachEventListeners();
  }

  /**
   * Template context
   */
  _getTemplateContext() {
    return {
      currentPage: this.config.currentPage,
      totalPages: this.totalPages,
      totalItems: this.config.totalItems,
      pageSize: this.config.pageSize,
      pageSizeOptions: this.config.pageSizeOptions,
      visiblePages: this.getVisiblePages(),
      isFirstPage: this.config.currentPage === 1,
      isLastPage: this.config.currentPage >= this.totalPages
    };
  }

  /**
   * Render default
   */
  _renderDefault() {
    const ctx = this._getTemplateContext();

    let html = `<div class="${this.config.classes.root}">`;

    // Page size selector
    if (this.config.showPageSizeSelector) {
      html += `
        <div class="pagination-size-selector">
          <label>Mostra:</label>
          <select id="pageSizeSelect">
            ${this.config.pageSizeOptions.map(size => `
              <option value="${size}" ${this.config.pageSize === size ? 'selected' : ''}>
                ${size}${size !== 'Tutti' ? ' risultati' : ''}
              </option>
            `).join('')}
          </select>
        </div>
      `;
    }

    // Page info
    if (this.config.showInfo) {
      html += `
        <div class="pagination-info">
          Pagina <strong>${ctx.currentPage}</strong> di <strong>${ctx.totalPages}</strong>
          (<strong>${ctx.totalItems}</strong> totali)
        </div>
      `;
    }

    // Page buttons
    html += '<div class="pagination-buttons">';

    // First
    if (this.config.showFirstLast) {
      html += `
        <button class="${this.config.classes.button}" data-action="first" ${ctx.isFirstPage ? 'disabled' : ''}>
          |◄
        </button>
      `;
    }

    // Prev
    if (this.config.showPrevNext) {
      html += `
        <button class="${this.config.classes.button}" data-action="prev" ${ctx.isFirstPage ? 'disabled' : ''}>
          ◄
        </button>
      `;
    }

    // Page numbers
    if (this.config.showPageNumbers) {
      ctx.visiblePages.forEach(page => {
        const isActive = page === ctx.currentPage;
        html += `
          <button
            class="${this.config.classes.button} ${isActive ? this.config.classes.buttonActive : ''}"
            data-action="page"
            data-page="${page}">
            ${page}
          </button>
        `;
      });
    }

    // Next
    if (this.config.showPrevNext) {
      html += `
        <button class="${this.config.classes.button}" data-action="next" ${ctx.isLastPage ? 'disabled' : ''}>
          ►
        </button>
      `;
    }

    // Last
    if (this.config.showFirstLast) {
      html += `
        <button class="${this.config.classes.button}" data-action="last" ${ctx.isLastPage ? 'disabled' : ''}>
          ►|
        </button>
      `;
    }

    html += '</div>'; // buttons
    html += '</div>'; // root

    return html;
  }

  /**
   * Attach event listeners
   */
  _attachEventListeners() {
    // Page buttons
    this.container.querySelectorAll('button[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;

        switch (action) {
          case 'first':
            this.goToPage(1);
            break;
          case 'prev':
            this.goToPage(this.config.currentPage - 1);
            break;
          case 'next':
            this.goToPage(this.config.currentPage + 1);
            break;
          case 'last':
            this.goToPage(this.totalPages);
            break;
          case 'page':
            this.goToPage(parseInt(btn.dataset.page));
            break;
        }
      });
    });

    // Page size selector
    const sizeSelect = this.container.querySelector('#pageSizeSelect');
    if (sizeSelect) {
      sizeSelect.addEventListener('change', (e) => {
        const size = e.target.value === 'Tutti' ? 'Tutti' : parseInt(e.target.value);
        this.setPageSize(size);
      });
    }
  }

  /**
   * Go to page
   */
  goToPage(page) {
    const newPage = Math.max(1, Math.min(page, this.totalPages));

    if (newPage !== this.config.currentPage) {
      this.config.currentPage = newPage;
      this.render();

      if (typeof this.config.onPageChange === 'function') {
        this.config.onPageChange(newPage);
      }
    }
  }

  /**
   * Set page size
   */
  setPageSize(size) {
    this.config.pageSize = size;
    this.config.currentPage = 1; // Reset to first page
    this.render();

    if (typeof this.config.onPageSizeChange === 'function') {
      this.config.onPageSizeChange(size);
    }
  }

  /**
   * Set total items
   */
  setTotalItems(total) {
    this.config.totalItems = total;
    // Ensure current page is valid
    if (this.config.currentPage > this.totalPages) {
      this.config.currentPage = Math.max(1, this.totalPages);
    }
    this.render();
  }

  /**
   * Get state
   */
  getState() {
    return {
      currentPage: this.config.currentPage,
      pageSize: this.config.pageSize,
      totalPages: this.totalPages,
      totalItems: this.config.totalItems,
      startIndex: (this.config.currentPage - 1) * this.config.pageSize,
      endIndex: Math.min(this.config.currentPage * this.config.pageSize, this.config.totalItems)
    };
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
  module.exports = MediciPagination;
}
