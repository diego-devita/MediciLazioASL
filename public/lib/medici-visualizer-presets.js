/**
 * Preset configurazioni per MediciVisualizer
 * Configurazioni dichiarative per ogni scenario d'uso
 */

const MediciVisualizerPresets = {
  /**
   * MAIN_SEARCH - Pagina ricerca principale (index.html)
   * Tabella desktop + card mobile, sort, hover tooltip, summary
   */
  MAIN_SEARCH: {
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
            <div class="results-summary">
              <div class="summary-item">
                <div class="summary-number">{{countTotal}}</div>
                <div class="summary-label">Totali</div>
              </div>
              <div class="summary-item">
                <div class="summary-number" style="color: #22c55e;">{{countLiberi}}</div>
                <div class="summary-label">Assegnabili liberamente</div>
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
              <!-- Desktop table -->
              <table class="results-table">
                <thead>
                  <tr>
                    <th style="width: 60px;"></th>
                    <th style="width: 250px;">Cognome</th>
                    <th style="width: 0; padding: 0; border: none;"></th>
                    <th style="width: 180px;">Nome</th>
                    <th style="width: 100px;">ASL</th>
                    <th style="width: 250px;">Stato</th>
                  </tr>
                </thead>
                <tbody>
                  {{#each items}}
                    <tr>
                      <td class="emoji-cell">{{emoji this.assegnabilita}}</td>
                      <td class="nome-cell"><strong>{{uppercase this.cognome}}</strong></td>
                      <td style="position: relative; width: 0; padding: 0;">
                        <div class="tooltip">
                          <div class="tooltip-title">Dettagli completi</div>
                          {{#if this.codiceFiscale}}
                            <div class="tooltip-row">
                              <span class="tooltip-label">Codice Fiscale:</span>
                              <span class="tooltip-value">{{this.codiceFiscale}}</span>
                            </div>
                          {{/if}}
                          {{#if this.email}}
                            <div class="tooltip-row">
                              <span class="tooltip-label">Email:</span>
                              <span class="tooltip-value">{{this.email}}</span>
                            </div>
                          {{/if}}
                          {{#if this.indirizzo}}
                            <div class="tooltip-row">
                              <span class="tooltip-label">Indirizzo:</span>
                              <span class="tooltip-value">{{this.indirizzo}}</span>
                            </div>
                          {{/if}}
                          {{#if this.luogo}}
                            <div class="tooltip-row">
                              <span class="tooltip-label">Luogo:</span>
                              <span class="tooltip-value">{{this.luogo}}</span>
                            </div>
                          {{/if}}
                          {{#if this.luogoNascita}}
                            <div class="tooltip-row">
                              <span class="tooltip-label">Luogo Nascita:</span>
                              <span class="tooltip-value">{{this.luogoNascita}}</span>
                            </div>
                          {{/if}}
                          {{#if this.identificativo}}
                            <div class="tooltip-row">
                              <span class="tooltip-label">Identificativo:</span>
                              <span class="tooltip-value">{{this.identificativo}}</span>
                            </div>
                          {{/if}}
                          {{#if this.codiceDistretto}}
                            <div class="tooltip-row">
                              <span class="tooltip-label">Codice Distretto:</span>
                              <span class="tooltip-value">{{this.codiceDistretto}}</span>
                            </div>
                          {{/if}}
                          {{#if this.descrizioneDistretto}}
                            <div class="tooltip-row">
                              <span class="tooltip-label">Distretto:</span>
                              <span class="tooltip-value">{{this.descrizioneDistretto}}</span>
                            </div>
                          {{/if}}
                        </div>
                      </td>
                      <td>{{this.nome}}</td>
                      <td>{{this.asl}}</td>
                      <td>{{this.assegnabilita}}</td>
                    </tr>
                  {{/each}}
                </tbody>
              </table>

              <!-- Mobile cards -->
              <div class="results-cards">
                {{#each items}}
                  <div class="result-card">
                    <div class="card-header">
                      <div class="card-emoji">{{emoji this.assegnabilita}}</div>
                      <div class="card-name">{{uppercase this.cognome}} {{this.nome}}</div>
                    </div>
                    <div class="card-footer">
                      <div class="card-stato">{{this.assegnabilita}}</div>
                      <div class="card-asl">{{this.asl}}</div>
                    </div>
                  </div>
                {{/each}}
              </div>
            {{/if}}

            {{#if items}}{{/if}}
            <div style="display: none;">
              {{#if items}}{{/if}}
              <p style="text-align: center; color: #777; padding: 20px;">
                Nessun medico trovato con i criteri specificati.
              </p>
            </div>
          `
        }
      }
    },

    classes: {
      root: 'medici-visualizer-main'
    },

    sorting: {
      enabled: false
    },

    pagination: {
      enabled: false
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
                      <th style="width: 250px;">Cognome</th>
                      <th style="width: 180px;">Nome</th>
                      <th style="width: 100px;">ASL</th>
                      <th style="width: 250px;">Stato</th>
                    </tr>
                  </thead>
                  <tbody>
                    {{#each items}}
                      <tr>
                        <td class="emoji-cell">{{emoji this.assegnabilita}}</td>
                        <td><strong>{{uppercase this.cognome}}</strong></td>
                        <td>{{this.nome}}</td>
                        <td>{{this.asl}}</td>
                        <td>{{this.assegnabilita}}</td>
                      </tr>
                    {{/each}}
                  </tbody>
                </table>
              </div>

              <!-- Mobile cards -->
              <div class="results-cards">
                {{#each items}}
                  <div class="result-card">
                    <div class="card-header">
                      <div class="card-emoji">{{emoji this.assegnabilita}}</div>
                      <div class="card-name">{{uppercase this.cognome}} {{this.nome}}</div>
                    </div>
                    <div class="card-footer">
                      <div class="card-stato">{{this.assegnabilita}}</div>
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
