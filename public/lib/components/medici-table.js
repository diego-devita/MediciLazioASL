/**
 * MediciTable - Componente standalone per tabella medici
 * Supporta sort, tooltip, responsive, template
 */

class MediciTable {
  constructor(config = {}) {
    this.config = {
      container: config.container,
      data: config.data || [],

      // Columns
      columns: config.columns || [
        { key: 'assegnabilita', label: '', type: 'emoji', width: '60px', sortable: false },
        { key: 'cognome', label: 'Cognome', width: '250px', sortable: true },
        { key: null, label: '', type: 'tooltip', width: '0', hidden: true },
        { key: 'nome', label: 'Nome', width: '180px', sortable: true },
        { key: 'asl', label: 'ASL', width: '100px', sortable: true },
        { key: 'assegnabilita', label: 'Stato', width: '250px', sortable: true }
      ],

      // Sorting
      sorting: config.sorting !== undefined ? config.sorting : true,
      sortColumn: config.sortColumn || null,
      sortDirection: config.sortDirection || 'asc',
      caseSensitive: config.caseSensitive || false,

      // Tooltip
      tooltip: {
        enabled: config.tooltip?.enabled !== undefined ? config.tooltip.enabled : true,
        fields: config.tooltip?.fields || [
          'codiceFiscale', 'email', 'indirizzo', 'luogo', 'luogoNascita',
          'identificativo', 'codiceDistretto', 'descrizioneDistretto'
        ]
      },

      // Responsive
      responsive: config.responsive !== undefined ? config.responsive : true,

      // Templates
      rowTemplate: config.rowTemplate || null,
      cardTemplate: config.cardTemplate || null,

      // Classes
      classes: {
        table: config.classes?.table || 'results-table',
        card: config.classes?.card || 'result-card',
        cardsContainer: config.classes?.cardsContainer || 'results-cards',
        ...config.classes
      },

      // Callbacks
      onSort: config.onSort || null,
      onRowClick: config.onRowClick || null
    };

    this.state = {
      sortedData: []
    };

    this.templateEngine = new TemplateEngine();

    this._init();
  }

  _init() {
    this.container = typeof this.config.container === 'string'
      ? document.querySelector(this.config.container)
      : this.config.container;

    if (!this.container) {
      throw new Error(`MediciTable: container not found - ${this.config.container}`);
    }

    this._sortData();
    this.render();
  }

  /**
   * Sort data
   */
  _sortData() {
    this.state.sortedData = [...this.config.data];

    if (!this.config.sorting || !this.config.sortColumn) return;

    this.state.sortedData.sort((a, b) => {
      let aVal = a[this.config.sortColumn] || '';
      let bVal = b[this.config.sortColumn] || '';

      if (!this.config.caseSensitive) {
        if (typeof aVal === 'string') aVal = aVal.toLowerCase();
        if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      }

      const cmp = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      return this.config.sortDirection === 'asc' ? cmp : -cmp;
    });
  }

  /**
   * Render
   */
  render() {
    this.container.innerHTML = '';

    if (this.state.sortedData.length === 0) {
      this.container.innerHTML = '<p style="text-align: center; color: #777; padding: 20px;">Nessun medico trovato.</p>';
      return;
    }

    // Desktop table
    const table = this._renderTable();
    this.container.appendChild(table);

    // Mobile cards (se responsive)
    if (this.config.responsive) {
      const cards = this._renderCards();
      this.container.appendChild(cards);
    }

    // Attach event listeners
    this._attachEventListeners();
  }

  /**
   * Render desktop table
   */
  _renderTable() {
    const table = document.createElement('table');
    table.className = this.config.classes.table;

    // Header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');

    this.config.columns.forEach(col => {
      const th = document.createElement('th');

      if (col.hidden) {
        th.style.width = '0';
        th.style.padding = '0';
        th.style.border = 'none';
      } else {
        if (col.width) th.style.width = col.width;
        th.textContent = col.label;

        if (col.sortable && this.config.sorting) {
          th.dataset.column = col.key;
          th.style.cursor = 'pointer';

          // Sort class
          if (this.config.sortColumn === col.key) {
            th.classList.add(`sort-${this.config.sortDirection}`);
          }
        }
      }

      headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Body
    const tbody = document.createElement('tbody');

    this.state.sortedData.forEach((medico, index) => {
      const row = document.createElement('tr');
      row.dataset.medicoIndex = index;

      this.config.columns.forEach(col => {
        const td = document.createElement('td');

        if (col.type === 'emoji') {
          td.className = 'emoji-cell';
          td.textContent = this._getEmoji(medico.assegnabilita);

        } else if (col.type === 'tooltip') {
          td.style.position = 'relative';
          td.style.width = '0';
          td.style.padding = '0';
          td.innerHTML = this._renderTooltip(medico);

        } else if (col.key === 'cognome') {
          td.className = 'nome-cell';
          td.textContent = medico[col.key] || '';

        } else {
          td.textContent = medico[col.key] || '';
        }

        row.appendChild(td);
      });

      tbody.appendChild(row);
    });

    table.appendChild(tbody);

    return table;
  }

  /**
   * Render mobile cards
   */
  _renderCards() {
    const container = document.createElement('div');
    container.className = this.config.classes.cardsContainer;

    this.state.sortedData.forEach((medico, index) => {
      const card = document.createElement('div');
      card.className = this.config.classes.card;
      card.dataset.medicoIndex = index;

      if (this.config.cardTemplate) {
        // Custom template
        card.innerHTML = this.templateEngine.render(this.config.cardTemplate, { medico });
      } else {
        // Default template
        card.innerHTML = `
          <div class="card-header">
            <div class="card-emoji">${this._getEmoji(medico.assegnabilita)}</div>
            <div class="card-name">${medico.cognome || ''} ${medico.nome || ''}</div>
          </div>
          <div class="card-footer">
            <div class="card-stato">${medico.assegnabilita || ''}</div>
            <div class="card-asl">${medico.asl || ''}</div>
          </div>
        `;
      }

      container.appendChild(card);
    });

    return container;
  }

  /**
   * Render tooltip
   */
  _renderTooltip(medico) {
    if (!this.config.tooltip.enabled) return '';

    const fields = this.config.tooltip.fields;
    const labels = {
      codiceFiscale: 'Codice Fiscale',
      email: 'Email',
      indirizzo: 'Indirizzo',
      luogo: 'Luogo',
      luogoNascita: 'Luogo Nascita',
      identificativo: 'Identificativo',
      codiceDistretto: 'Codice Distretto',
      descrizioneDistretto: 'Distretto'
    };

    let rows = '';
    fields.forEach(field => {
      if (medico[field]) {
        rows += `
          <div class="tooltip-row">
            <span class="tooltip-label">${labels[field]}:</span>
            <span class="tooltip-value">${medico[field]}</span>
          </div>
        `;
      }
    });

    return `
      <div class="tooltip">
        <div class="tooltip-title">Dettagli completi</div>
        ${rows}
      </div>
    `;
  }

  /**
   * Get emoji
   */
  _getEmoji(assegnabilita) {
    if (!assegnabilita) return '⚪';
    const stato = String(assegnabilita).toLowerCase();
    if (stato.includes('assegnazione libera')) return '🟢';
    if (stato.includes('deroga')) return '🟠';
    if (stato.includes('non assegnabile')) return '🔴';
    return '⚪';
  }

  /**
   * Attach event listeners
   */
  _attachEventListeners() {
    // Sort headers
    if (this.config.sorting) {
      this.container.querySelectorAll('th[data-column]').forEach(th => {
        th.addEventListener('click', () => {
          this.sort(th.dataset.column);
        });
      });
    }

    // Row click
    if (typeof this.config.onRowClick === 'function') {
      this.container.querySelectorAll('[data-medico-index]').forEach(el => {
        el.addEventListener('click', () => {
          const index = parseInt(el.dataset.medicoIndex);
          const medico = this.state.sortedData[index];
          this.config.onRowClick(medico);
        });
      });
    }
  }

  /**
   * Sort
   */
  sort(column, direction) {
    if (this.config.sortColumn === column && !direction) {
      // Toggle direction
      this.config.sortDirection = this.config.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.config.sortColumn = column;
      this.config.sortDirection = direction || 'asc';
    }

    this._sortData();
    this.render();

    if (typeof this.config.onSort === 'function') {
      this.config.onSort(column, this.config.sortDirection);
    }
  }

  /**
   * Set data
   */
  setData(data) {
    this.config.data = data;
    this._sortData();
    this.render();
  }

  /**
   * Get data
   */
  getData() {
    return [...this.state.sortedData];
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
  module.exports = MediciTable;
}
