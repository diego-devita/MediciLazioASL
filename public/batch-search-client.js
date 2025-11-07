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
 * - Deduplicazione risultati per codiceFiscale
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
 *   asl: 'Tutte'
 * });
 */

export class BatchSearchClient {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || '';
    this.parallelism = options.parallelism || 5;
    this.onProgress = options.onProgress || null;
    this.abortController = null;
  }

  /**
   * Genera prodotto cartesiano di cognomi × cap × nomi
   * @private
   */
  _generateCombinations(cognomi = [], cap = [], nomi = []) {
    // Se tutti vuoti, errore
    if (cognomi.length === 0 && cap.length === 0 && nomi.length === 0) {
      throw new Error('At least one of cognomi, cap, or nomi must be provided');
    }

    // Se una lista è vuota, usa [''] per avere almeno una combinazione
    const cognomiList = cognomi.length > 0 ? cognomi : [''];
    const capList = cap.length > 0 ? cap : [''];
    const nomiList = nomi.length > 0 ? nomi : [''];

    const combinations = [];

    for (const cognome of cognomiList) {
      for (const c of capList) {
        for (const nome of nomiList) {
          combinations.push({
            cognome: cognome || '',
            cap: c || '',
            nome: nome || ''
          });
        }
      }
    }

    return combinations;
  }

  /**
   * Esegue una singola chiamata a /api/search_simple
   * @private
   */
  async _searchSingle(params, signal) {
    const response = await fetch(`${this.baseUrl}/api/search_simple`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include', // Usa cookie JWT
      body: JSON.stringify(params),
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
  async _executeBatch(combinations, tipo, asl) {
    const total = combinations.length;
    let completed = 0;
    const startTime = Date.now();

    // Accumula tutti i risultati e query
    const allResults = new Map(); // key: codiceFiscale, value: medico (per dedup)
    const allSingleQueries = [];
    const errors = [];
    let totalResultsBeforeDedup = 0; // Conta risultati prima della dedup

    this.abortController = new AbortController();
    const { signal } = this.abortController;

    // Funzione per processare una combinazione
    const processCombination = async (combo) => {
      try {
        const result = await this._searchSingle(
          {
            cognome: combo.cognome,
            cap: combo.cap,
            nome: combo.nome,
            tipo,
            asl
          },
          signal
        );

        // Aggiungi singleQueries
        if (result.singleQueries && Array.isArray(result.singleQueries)) {
          allSingleQueries.push(...result.singleQueries);
        }

        // Deduplicazione risultati per codiceFiscale
        if (result.results && Array.isArray(result.results)) {
          totalResultsBeforeDedup += result.results.length; // Conta prima della dedup
          result.results.forEach(medico => {
            if (medico.codiceFiscale) {
              // Usa codiceFiscale come chiave univoca
              if (!allResults.has(medico.codiceFiscale)) {
                allResults.set(medico.codiceFiscale, medico);
              }
            } else {
              // Se non ha codiceFiscale, aggiungi comunque (caso raro)
              const uniqueKey = `${medico.nome}_${medico.cognome}_${medico.indirizzo}_${Date.now()}_${Math.random()}`;
              allResults.set(uniqueKey, medico);
            }
          });
        }

        completed++;

        // Callback progress
        if (this.onProgress) {
          this.onProgress({
            total,
            completed,
            percentage: Math.round((completed / total) * 100),
            results: allResults.size,
            errors: errors.length,
            duration: Date.now() - startTime
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
            duration: Date.now() - startTime
          });
        }

        return { success: false, combo, error: error.message };
      }
    };

    // Esegui in batch con parallelism limitato
    const results = [];
    for (let i = 0; i < combinations.length; i += this.parallelism) {
      const batch = combinations.slice(i, i + this.parallelism);
      const batchResults = await Promise.all(batch.map(processCombination));
      results.push(...batchResults);
    }

    return {
      results: Array.from(allResults.values()),
      singleQueries: allSingleQueries,
      errors,
      duration: Date.now() - startTime,
      totalResultsBeforeDedup: totalResultsBeforeDedup
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
   * @param {string} params.asl - ASL (default: 'Tutte')
   *
   * @returns {Promise<Object>} Response formato compatibile con /api/search
   */
  async search(params = {}) {
    const {
      cognomi = [],
      cap = [],
      nomi = [],
      tipo = 'Medicina generale',
      asl = 'Tutte'
    } = params;

    try {
      // Genera combinazioni
      const combinations = this._generateCombinations(cognomi, cap, nomi);

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
      const batchResult = await this._executeBatch(combinations, tipo, asl);

      // Calcola counters finali
      const counters = this._calculateCounters(batchResult.results);

      // Formato response compatibile con /api/search
      return {
        success: true,
        timestamp: new Date().toISOString(),
        query: {
          tipo,
          asl,
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
          deduplicatedTo: batchResult.results.length
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
