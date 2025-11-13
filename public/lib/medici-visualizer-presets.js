/**
 * Preset configurazioni per MediciVisualizer
 * Configurazioni dichiarative per ogni scenario d'uso
 */

const MediciVisualizerPresets = {
  /**
   * MAIN_SEARCH - Pagina ricerca principale (index.html)
   * Tabella desktop + card mobile, sort, hover tooltip, summary
   * REPLICA ESATTA del rendering esistente
   */
  MAIN_SEARCH: {
    layout: {
      main: `
        {{slot:content}}
        {{slot:pagination}}
      `,

      slots: {
        content: {
          enabled: true,
          template: `
            {{#if allItems}}
              <!-- Desktop table -->
              <table class="results-table">
                <thead>
                  <tr>
                    <th class="{{sortClassFor 'assegnabilita'}}" data-column="assegnabilita"></th>
                    <th class="{{sortClassFor 'cognome'}}" data-column="cognome">Cognome</th>
                    <th style="width: 0; padding: 0; border: none;"></th>
                    <th class="{{sortClassFor 'nome'}}" data-column="nome">Nome</th>
                    <th class="{{sortClassFor 'asl'}}" data-column="asl">ASL</th>
                  </tr>
                </thead>
                <tbody>
                  {{#each items}}
                    <tr data-medico-index="{{@index}}">
                      <td class="emoji-cell">{{emoji this.assegnabilita}}</td>
                      <td class="nome-cell">{{this.cognome}}</td>
                      <td style="position: relative; width: 0; padding: 0;">
                        <div class="tooltip" style="background: #ffffff !important; opacity: 1 !important;">
                          <div class="tooltip-title">Dettagli completi</div>
                          <div class="tooltip-row">
                            <span class="tooltip-label">Cognome:</span>
                            <span class="tooltip-value">{{this.cognome}}</span>
                          </div>
                          <div class="tooltip-row">
                            <span class="tooltip-label">Nome:</span>
                            <span class="tooltip-value">{{this.nome}}</span>
                          </div>
                          <div class="tooltip-row">
                            <span class="tooltip-label">Codice Fiscale:</span>
                            <span class="tooltip-value">{{this.codiceFiscale}}</span>
                          </div>
                          <div class="tooltip-row">
                            <span class="tooltip-label">Tipo:</span>
                            <span class="tooltip-value">{{this.tipo}}</span>
                          </div>
                          <div class="tooltip-row">
                            <span class="tooltip-label">ASL:</span>
                            <span class="tooltip-value">{{this.asl}}</span>
                          </div>
                          <div class="tooltip-row">
                            <span class="tooltip-label">Assegnabilità:</span>
                            <span class="tooltip-value">{{this.assegnabilita}}</span>
                          </div>
                          <div class="tooltip-row">
                            <span class="tooltip-label">Email:</span>
                            <span class="tooltip-value">{{this.email}}</span>
                          </div>
                          <div class="tooltip-row">
                            <span class="tooltip-label">Indirizzo:</span>
                            <span class="tooltip-value">{{this.indirizzo}}</span>
                          </div>
                          <div class="tooltip-row">
                            <span class="tooltip-label">Luogo:</span>
                            <span class="tooltip-value">{{this.luogo}}</span>
                          </div>
                          <div class="tooltip-row">
                            <span class="tooltip-label">Luogo Nascita:</span>
                            <span class="tooltip-value">{{this.luogoNascita}}</span>
                          </div>
                          <div class="tooltip-row">
                            <span class="tooltip-label">Identificativo:</span>
                            <span class="tooltip-value">{{this.identificativo}}</span>
                          </div>
                          <div class="tooltip-row">
                            <span class="tooltip-label">Codice Distretto:</span>
                            <span class="tooltip-value">{{this.codiceDistretto}}</span>
                          </div>
                          <div class="tooltip-row">
                            <span class="tooltip-label">Distretto:</span>
                            <span class="tooltip-value">{{this.descrizioneDistretto}}</span>
                          </div>
                        </div>
                      </td>
                      <td>{{this.nome}}</td>
                      <td>{{this.asl}}</td>
                    </tr>
                  {{/each}}
                </tbody>
              </table>

              <!-- Mobile cards -->
              <div class="results-cards">
                {{#each items}}
                  <div class="result-card" data-medico-index="{{@index}}">
                    <div class="card-header">
                      <div class="card-emoji">{{emoji this.assegnabilita}}</div>
                      <div class="card-name">{{this.cognome}} {{this.nome}}</div>
                    </div>
                    <div class="card-footer">
                      <div class="card-asl">{{this.asl}}</div>
                    </div>
                  </div>
                {{/each}}
              </div>
            {{/if}}
          `
        },

        pagination: {
          enabled: true,
          show: (state) => state.filteredItems.length >= 11,
          template: `
            <div class="pagination-container" style="display: flex; justify-content: space-between; align-items: center; margin-top: 20px; padding: 15px; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">
              <!-- Items per page selector -->
              <div class="pagination-size" style="display: flex; align-items: center; gap: 8px; flex-wrap: nowrap; white-space: nowrap;">
                <span style="color: #666; font-size: 0.9rem;">Elementi per pagina:</span>
                <select data-page-size-select class="page-size-select" style="padding: 6px 8px; border: 2px solid #e0e0e0; border-radius: 6px; font-size: 0.9rem; cursor: pointer; background: white; width: 70px;">
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                  <option value="Tutti">Tutti</option>
                </select>
                <span style="color: #666; font-size: 0.9rem;">Totale: {{totalItems}}</span>
              </div>

              <!-- Page navigation -->
              <div style="display: {{#if showPagination}}flex{{else}}none{{/if}}; flex-direction: column; align-items: flex-end;">
                <div class="pagination-nav" style="display: flex; align-items: center; gap: 6px;">
                  <!-- Previous page button -->
                  <button data-page-action="prev" {{#if isFirstPage}}disabled{{/if}} style="padding: 10px 16px; border: 1px solid #667eea; border-radius: 4px; background: {{#if isFirstPage}}#e8e8e8{{else}}#667eea{{/if}}; font-weight: 400; color: {{#if isFirstPage}}#ccc{{else}}white{{/if}}; cursor: {{#if isFirstPage}}not-allowed{{else}}pointer{{/if}}; width: auto;">
                    Prec
                  </button>

                  <!-- Page numbers -->
                  {{#each visiblePages}}
                    <button data-page-action="page" data-page="{{this}}" style="padding: 10px 16px; border: 2px solid #667eea; border-radius: 4px; background: {{#if (isCurrentPage this)}}white{{else}}#667eea{{/if}}; color: {{#if (isCurrentPage this)}}#667eea{{else}}white{{/if}}; cursor: pointer; font-weight: {{#if (isCurrentPage this)}}700{{else}}400{{/if}}; width: auto;">
                      {{this}}
                    </button>
                  {{/each}}

                  <!-- Next page button -->
                  <button data-page-action="next" {{#if isLastPage}}disabled{{/if}} style="padding: 10px 16px; border: 1px solid #667eea; border-radius: 4px; background: {{#if isLastPage}}#e8e8e8{{else}}#667eea{{/if}}; font-weight: 400; color: {{#if isLastPage}}#ccc{{else}}white{{/if}}; cursor: {{#if isLastPage}}not-allowed{{else}}pointer{{/if}}; width: auto;">
                    Succ
                  </button>
                </div>

                <!-- Total pages indicator (only if more than 5 pages) -->
                {{#if (gt totalPages 5)}}
                  <div style="font-size: 0.75rem; color: #999; margin-top: 4px;">di {{totalPages}} pagine</div>
                {{/if}}
              </div>
            </div>
          `
        }
      }
    },

    classes: {
      root: ''
    },

    sorting: {
      enabled: true,
      caseSensitive: false
    },

    pagination: {
      enabled: true,
      pageSize: 10,
      pageSizeOptions: [10, 25, 50, 100, 'Tutti'],
      showPageNumbers: true,
      maxPageButtons: 5,
      showFirstLast: true,
      showPrevNext: true
    }
  },

  /**
   * BOT_COMPACT - Lista compatta bot.html
   * Lista verticale con badge, filtri per categoria
   */
  BOT_COMPACT: {
    layout: {
      main: `
        <div class="{{classes.root}}">
          {{slot:summary}}
          {{slot:content}}
        </div>
      `,

      slots: {
        summary: {
          enabled: true,
          template: `
            <div class="stats-compact">
              <div class="stat-compact active">
                <span class="stat-compact-value">{{countTotal}}</span>
                <span class="stat-compact-label">Totale</span>
              </div>
              <div class="stat-compact stat-success active">
                <span class="stat-compact-value">{{countLiberi}}</span>
                <span class="stat-compact-label">Liberi</span>
              </div>
              <div class="stat-compact stat-warning active">
                <span class="stat-compact-value">{{countDeroga}}</span>
                <span class="stat-compact-label">Deroga</span>
              </div>
              <div class="stat-compact stat-info active">
                <span class="stat-compact-value">{{countAltri}}</span>
                <span class="stat-compact-label">Altri</span>
              </div>
            </div>
          `
        },

        content: {
          enabled: true,
          template: `
            {{#if items}}
              {{#each items}}
                <div class="result-item {{rowClass this.assegnabilita}}">
                  <div class="result-item-name">
                    {{uppercase this.cognome}} {{this.nome}}
                    {{#if this.asl}}
                      <span style="color: #999; font-size: 0.85em;">• {{this.asl}}</span>
                    {{/if}}
                  </div>
                  <div class="result-item-badge {{badgeClass this.assegnabilita}}">
                    {{badgeText this.assegnabilita}}
                  </div>
                </div>
              {{/each}}
            {{/if}}
          `
        }
      }
    },

    classes: {
      root: 'medici-visualizer-compact'
    }
  },

  /**
   * MODAL_TEST - Modale test query
   * Tabella completa + progress + paginazione
   */
  MODAL_TEST: {
    layout: {
      main: `
        <div class="{{classes.root}}">
          {{slot:progress}}
          {{slot:summary}}
          {{slot:content}}
          {{slot:pagination}}
        </div>
      `,

      slots: {
        progress: {
          enabled: true,
          show: (state) => state.isSearching,
          template: `
            <div class="search-progress" style="background: #f0f4ff; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h3 style="color: #667eea; margin-bottom: 15px;">🔍 Ricerca in corso...</h3>

              <!-- Combinazioni progress -->
              <div style="margin-bottom: 12px;">
                <div style="font-size: 0.9rem; margin-bottom: 4px; color: #666;">
                  📊 Combinazioni: <strong>{{completed}}/{{total}}</strong>
                </div>
                <div style="background: #e0e0e0; border-radius: 4px; overflow: hidden; height: 24px;">
                  <div style="width: {{percentage}}%; background: linear-gradient(90deg, #667eea 0%, #764ba2 100%); height: 100%; display: flex; align-items: center; justify-content: center; color: white; font-size: 0.85rem; font-weight: 600; transition: width 0.3s;">
                    {{percentage}}%
                  </div>
                </div>
              </div>

              <!-- Info aggiuntive -->
              <div style="display: flex; gap: 20px; font-size: 0.9rem; color: #666; margin-top: 10px;">
                <div>⏱️ Tempo: <strong>{{elapsed}}s</strong></div>
                <div>🌐 Richieste HTTP: <strong>{{httpRequests}}</strong></div>
                <div>📋 Medici trovati: <strong>{{countTotal}}</strong></div>
              </div>
            </div>
          `
        },

        summary: {
          enabled: true,
          template: `
            <div class="results-summary" style="margin-bottom: 20px;">
              <div class="summary-item">
                <div class="summary-number">{{countTotal}}</div>
                <div class="summary-label">Totali</div>
              </div>
              <div class="summary-item">
                <div class="summary-number" style="color: #22c55e;">{{countLiberi}}</div>
                <div class="summary-label">Assegnabili</div>
              </div>
              <div class="summary-item">
                <div class="summary-number" style="color: #f59e0b;">{{countDeroga}}</div>
                <div class="summary-label">Con deroga</div>
              </div>
              <div class="summary-item">
                <div class="summary-number" style="color: #ef4444;">{{countAltri}}</div>
                <div class="summary-label">Altro</div>
              </div>
            </div>
          `
        },

        content: {
          enabled: true,
          template: `
            {{#if items}}
              <div style="overflow-x: auto;">
                <table class="results-table">
                  <thead>
                    <tr>
                      <th style="width: 60px;"></th>
                      <th style="width: 35%;">Cognome</th>
                      <th style="width: 35%;">Nome</th>
                      <th style="width: 30%;">ASL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {{#each items}}
                      <tr data-medico-index="{{@index}}">
                        <td class="emoji-cell">{{emoji this.assegnabilita}}</td>
                        <td><strong>{{uppercase this.cognome}}</strong></td>
                        <td>{{this.nome}}</td>
                        <td>{{this.asl}}</td>
                      </tr>
                    {{/each}}
                  </tbody>
                </table>
              </div>

              <!-- Mobile cards -->
              <div class="results-cards">
                {{#each items}}
                  <div class="result-card" data-medico-index="{{@index}}">
                    <div class="card-header">
                      <div class="card-emoji">{{emoji this.assegnabilita}}</div>
                      <div class="card-name">{{uppercase this.cognome}} {{this.nome}}</div>
                    </div>
                    <div class="card-footer">
                      <div class="card-asl">{{this.asl}}</div>
                    </div>
                  </div>
                {{/each}}
              </div>
            {{/if}}
          `
        },

        pagination: {
          enabled: true,
          template: `
            <div class="pagination-controls" style="margin-top: 20px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 15px; padding: 15px; background: #f9f9f9; border-radius: 8px;">
              <!-- Page size selector -->
              <div style="display: flex; align-items: center; gap: 8px;">
                <label style="color: #666; font-size: 0.9rem;">Mostra:</label>
                <select onchange="{{setPageSize}}" style="padding: 6px 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 0.9rem;">
                  {{#each pageSizeOptions}}
                    <option value="{{this}}" {{#if isCurrentPage this}}selected{{/if}}>
                      {{this}}{{#if this}} risultati{{/if}}
                    </option>
                  {{/each}}
                </select>
              </div>

              <!-- Page info -->
              <div style="color: #666; font-size: 0.9rem;">
                Pagina <strong>{{currentPage}}</strong> di <strong>{{totalPages}}</strong>
                (<strong>{{totalItems}}</strong> totali)
              </div>

              <!-- Page buttons -->
              <div style="display: flex; gap: 4px;">
                <button onclick="{{firstPage}}" {{#if isFirstPage}}disabled{{/if}}
                        style="padding: 6px 10px; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer; font-size: 0.9rem;">
                  |◄
                </button>
                <button onclick="{{prevPage}}" {{#if isFirstPage}}disabled{{/if}}
                        style="padding: 6px 10px; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer; font-size: 0.9rem;">
                  ◄
                </button>

                {{#each visiblePages}}
                  <button onclick="mediciVisualizer.goToPage({{this}})"
                          style="padding: 6px 12px; border: 1px solid #ddd; background: {{#if isCurrentPage this}}#667eea{{/if}}{{#if isCurrentPage this}}{{/if}}white; color: {{#if isCurrentPage this}}white{{/if}}{{#if isCurrentPage this}}{{/if}}#333; border-radius: 4px; cursor: pointer; font-size: 0.9rem; font-weight: {{#if isCurrentPage this}}600{{/if}}{{#if isCurrentPage this}}{{/if}}normal;">
                    {{this}}
                  </button>
                {{/each}}

                <button onclick="{{nextPage}}" {{#if isLastPage}}disabled{{/if}}
                        style="padding: 6px 10px; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer; font-size: 0.9rem;">
                  ►
                </button>
                <button onclick="{{lastPage}}" {{#if isLastPage}}disabled{{/if}}
                        style="padding: 6px 10px; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer; font-size: 0.9rem;">
                  ►|
                </button>
              </div>
            </div>
          `
        }
      }
    },

    classes: {
      root: 'medici-visualizer-modal'
    },

    pagination: {
      enabled: true,
      pageSize: 25,
      pageSizeOptions: [10, 25, 50, 100, 'Tutti'],
      showPageNumbers: true,
      maxPageButtons: 5,
      showFirstLast: true,
      showPrevNext: true
    },

    progress: {
      enabled: true
    }
  }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MediciVisualizerPresets;
}
