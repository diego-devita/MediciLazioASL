/**
 * BatchSearchClient - Client-side per ricerche batch tramite /api/search_simple
 *
 * Questa libreria gestisce ricerche complesse spezzandole in chiamate multiple
 * a /api/search_simple, evitando timeout con liste lunghe di CAP/cognomi/nomi.
 *
 * Caratteristiche:
 * - Genera prodotto cartesiano delle combinazioni
 * - Esegue chiamate in batch paralleli (default: 5 alla volta)
 * - Progress tracking real-time tramite callback
 * - Deduplicazione risultati per identificativo
 * - Aggregazione counters finali
 * - Formato response compatibile con /api/search
 *
 * Autenticazione: Solo tramite cookie JWT (credentials: 'include')
 *
 * @example
 * const client = new BatchSearchClient({
 *   parallelism: 5,
 *   onProgress: (progress) => {
 *     console.log(`${progress.percentage}% - ${progress.completed}/${progress.total}`);
 *   }
 * });
 *
 * const result = await client.search({
 *   cognomi: ['ROSSI', 'BIANCHI'],
 *   cap: ['00100', '00118'],
 *   nomi: ['MARIO'],
 *   tipo: 'Medicina generale',
 *   asl: ['Roma 1', 'Roma 2']
 * });
 */

export class BatchSearchClient {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || '';
    this.parallelism = options.parallelism || 5;
    this.onProgress = options.onProgress || null;
    this.abortController = null;
    this.ALL_ASL_OPTIONS = ['120201', '120202', '120203', '120204', '120205', '120206', '120207', '120208', '120209', '120210'];
  }

  /**
   * Genera prodotto cartesiano di cognomi × cap × nomi × asl
   * @private
   */
  _generateCombinations(cognomi = [], cap = [], nomi = [], asl = []) {
    // Se tutti vuoti, errore
    if (cognomi.length === 0 && cap.length === 0 && nomi.length === 0 && asl.length === 0) {
      throw new Error('At least one of cognomi, cap, nomi, or asl must be provided');
    }

    // Se una lista è vuota, usa [''] per avere almeno una combinazione
    const cognomiList = cognomi.length > 0 ? cognomi : [''];
    const capList = cap.length > 0 ? cap : [''];
    const nomiList = nomi.length > 0 ? nomi : [''];
    const aslList = asl.length > 0 ? asl : [''];

    const combinations = [];

    for (const aslValue of aslList) {
      for (const cognome of cognomiList) {
        for (const c of capList) {
          for (const nome of nomiList) {
            combinations.push({
              cognome: cognome || '',
              cap: c || '',
              nome: nome || '',
              asl: aslValue || ''
            });
          }
        }
      }
    }

    return combinations;
  }

  /**
   * Esegue una singola chiamata a /api/search_simple
   * @private
   */
  async _searchSingle(params, signal, page = undefined) {
    const bodyParams = { ...params };
    if (page !== undefined) {
      bodyParams.page = page;
    }

    const response = await fetch(`${this.baseUrl}/api/search_simple`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include', // Usa cookie JWT
      body: JSON.stringify(bodyParams),
      signal
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Esegue batch di chiamate in parallelo con limite di concorrenza
   * @private
   */
  async _executeBatch(combinations, tipo) {
    const total = combinations.length;
    let completed = 0;
    const startTime = Date.now();

    // Accumula tutti i risultati e query
    const allResults = new Map(); // key: identificativo, value: medico (per dedup)
    const allSingleQueries = [];
    const errors = [];
    let totalResultsBeforeDedup = 0; // Conta risultati prima della dedup
    let totalRequests = 0; // Contatore richieste HTTP totali

    this.abortController = new AbortController();
    const { signal } = this.abortController;

    // Funzione per processare una combinazione (con paginazione manuale)
    const processCombination = async (combo) => {
      try {
        // Prima richiesta: pagina 1 per ottenere totalPages
        totalRequests++;
        const firstPageResult = await this._searchSingle(
          {
            cognome: combo.cognome,
            cap: combo.cap,
            nome: combo.nome,
            tipo,
            asl: combo.asl
          },
          signal,
          1 // Richiedi esplicitamente pagina 1
        );

        // Aggiungi singleQueries dalla prima pagina
        if (firstPageResult.singleQueries && Array.isArray(firstPageResult.singleQueries)) {
          allSingleQueries.push(...firstPageResult.singleQueries);
        }

        // Processa risultati prima pagina
        if (firstPageResult.results && Array.isArray(firstPageResult.results)) {
          totalResultsBeforeDedup += firstPageResult.results.length;
          firstPageResult.results.forEach(medico => {
            if (medico.identificativo) {
              if (!allResults.has(medico.identificativo)) {
                allResults.set(medico.identificativo, medico);
              }
            } else {
              const uniqueKey = `${medico.nome}_${medico.cognome}_${medico.indirizzo}_${Date.now()}_${Math.random()}`;
              allResults.set(uniqueKey, medico);
            }
          });
        }

        // Controlla se ci sono altre pagine
        const totalPages = firstPageResult.pagination?.totalPages || 1;
        const currentPage = 1;

        // Callback progress per pagina 1
        if (this.onProgress) {
          this.onProgress({
            total,
            completed,
            percentage: Math.round((completed / total) * 100),
            results: allResults.size,
            errors: errors.length,
            duration: Date.now() - startTime,
            totalRequests,
            currentPage,
            totalPagesForCombination: totalPages
          });
        }

        // Se ci sono altre pagine, recuperale una per volta
        if (totalPages > 1) {
          for (let page = 2; page <= totalPages; page++) {
            totalRequests++;

            const pageResult = await this._searchSingle(
              {
                cognome: combo.cognome,
                cap: combo.cap,
                nome: combo.nome,
                tipo,
                asl: combo.asl
              },
              signal,
              page
            );

            // Aggiungi singleQueries
            if (pageResult.singleQueries && Array.isArray(pageResult.singleQueries)) {
              allSingleQueries.push(...pageResult.singleQueries);
            }

            // Processa risultati
            if (pageResult.results && Array.isArray(pageResult.results)) {
              totalResultsBeforeDedup += pageResult.results.length;
              pageResult.results.forEach(medico => {
                if (medico.identificativo) {
                  if (!allResults.has(medico.identificativo)) {
                    allResults.set(medico.identificativo, medico);
                  }
                } else {
                  const uniqueKey = `${medico.nome}_${medico.cognome}_${medico.indirizzo}_${Date.now()}_${Math.random()}`;
                  allResults.set(uniqueKey, medico);
                }
              });
            }

            // Callback progress per ogni pagina
            if (this.onProgress) {
              this.onProgress({
                total,
                completed,
                percentage: Math.round((completed / total) * 100),
                results: allResults.size,
                errors: errors.length,
                duration: Date.now() - startTime,
                totalRequests,
                currentPage: page,
                totalPagesForCombination: totalPages
              });
            }
          }
        }

        completed++;

        // Callback progress finale per questa combinazione
        if (this.onProgress) {
          this.onProgress({
            total,
            completed,
            percentage: Math.round((completed / total) * 100),
            results: allResults.size,
            errors: errors.length,
            duration: Date.now() - startTime,
            totalRequests,
            currentPage: null, // Nessuna pagina in corso
            totalPagesForCombination: null
          });
        }

        return { success: true, combo };
      } catch (error) {
        completed++;
        errors.push({ combo, error: error.message });

        // Callback progress anche in caso di errore
        if (this.onProgress) {
          this.onProgress({
            total,
            completed,
            percentage: Math.round((completed / total) * 100),
            results: allResults.size,
            errors: errors.length,
            duration: Date.now() - startTime,
            totalRequests,
            currentPage: null,
            totalPagesForCombination: null
          });
        }

        return { success: false, combo, error: error.message };
      }
    };

    // Esegui sequenzialmente per mostrare progresso pagine correttamente
    // (con parallelismo il display di "Pagina X/Y" sarebbe confuso)
    const results = [];
    for (let i = 0; i < combinations.length; i++) {
      const result = await processCombination(combinations[i]);
      results.push(result);
    }

    return {
      results: Array.from(allResults.values()),
      singleQueries: allSingleQueries,
      errors,
      duration: Date.now() - startTime,
      totalResultsBeforeDedup: totalResultsBeforeDedup,
      totalRequests
    };
  }

  /**
   * Calcola counters finali dai risultati deduplicated
   * @private
   */
  _calculateCounters(results) {
    const assegnabili = results.filter(m => {
      if (!m.assegnabilita) return false;
      const stato = m.assegnabilita.toLowerCase();
      return stato.includes('assegnazione libera');
    });

    const conDeroga = results.filter(m => {
      if (!m.assegnabilita) return false;
      const stato = m.assegnabilita.toLowerCase();
      return stato.includes('deroga') && !stato.includes('assegnazione libera');
    });

    const nonAssegnabili = results.filter(m => {
      if (!m.assegnabilita) return true;
      const stato = m.assegnabilita.toLowerCase();
      return !stato.includes('assegnazione libera') && !stato.includes('deroga');
    });

    return {
      totali: results.length,
      assegnabili: assegnabili.length,
      conDeroga: conDeroga.length,
      nonAssegnabili: nonAssegnabili.length
    };
  }

  /**
   * Esegue ricerca batch con parametri multipli
   *
   * @param {Object} params - Parametri di ricerca
   * @param {string[]} params.cognomi - Array di cognomi
   * @param {string[]} params.cap - Array di CAP
   * @param {string[]} params.nomi - Array di nomi
   * @param {string} params.tipo - Tipo di medico (default: 'Medicina generale')
   * @param {string[]} params.asl - Array di ASL (default: [])
   *
   * @returns {Promise<Object>} Response formato compatibile con /api/search
   */
  async search(params = {}) {
    const {
      cognomi = [],
      cap = [],
      nomi = [],
      tipo = 'Medicina generale',
      asl = []
    } = params;

    try {
      // Ottimizzazione: se tutte le ASL sono selezionate E c'è almeno un altro campo, tratta ASL come vuoto
      let aslToUse = asl;
      const hasOtherFields = cognomi.length > 0 || cap.length > 0 || nomi.length > 0;

      if (Array.isArray(asl) && asl.length === this.ALL_ASL_OPTIONS.length && hasOtherFields) {
        aslToUse = [];
      }

      // Genera combinazioni
      const combinations = this._generateCombinations(cognomi, cap, nomi, aslToUse);

      // Progress iniziale
      if (this.onProgress) {
        this.onProgress({
          total: combinations.length,
          completed: 0,
          percentage: 0,
          results: 0,
          errors: 0,
          duration: 0
        });
      }

      // Esegui batch
      const batchResult = await this._executeBatch(combinations, tipo);

      // Calcola counters finali
      const counters = this._calculateCounters(batchResult.results);

      // Formato response compatibile con /api/search
      return {
        success: true,
        timestamp: new Date().toISOString(),
        query: {
          tipo,
          asl: asl.length > 0 ? asl : [],
          cap: cap.length > 0 ? cap : [],
          cognomi: cognomi.length > 0 ? cognomi : [],
          nomi: nomi.length > 0 ? nomi : []
        },
        singleQueries: batchResult.singleQueries,
        results: batchResult.results,
        counters,
        meta: {
          totalQueries: combinations.length,
          completedQueries: combinations.length,
          errors: batchResult.errors.length,
          duration: batchResult.duration,
          deduplicatedFrom: batchResult.totalResultsBeforeDedup,
          deduplicatedTo: batchResult.results.length,
          totalRequests: batchResult.totalRequests
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error.message || 'Unknown error during batch search',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Annulla ricerca in corso
   */
  abort() {
    if (this.abortController) {
      this.abortController.abort();
    }
  }
}
