import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';
import { URLS, DEFAULT_HEADERS } from './constants.js';

// ===== CLASSE PRINCIPALE =====
export class MediciSearchClient {
  constructor(options = {}) {
    this.urls = { ...URLS, ...options.urls };
    this.headers = { ...DEFAULT_HEADERS, ...options.headers };
    this.config = null;
    this.configTimestamp = null;
    this.cacheTimeout = options.cacheTimeout || 3600000; // 1 ora default
    this.debug = options.debug || false;

    // NUOVO: opzione per usare config statica invece di recuperarla dinamicamente
    this.useStaticConfig = options.useStaticConfig !== undefined ? options.useStaticConfig : true; // DEFAULT TRUE per sicurezza
  }

  // ===== GESTIONE CONFIGURAZIONE =====
  async getConfig(forceRefresh = false) {
    // Se useStaticConfig è true, usa sempre i valori noti funzionanti
    if (this.useStaticConfig) {
      this.config = {
        layoutId: '16262',
        instanceId: 'gIo787T487Lc',
        fullInstanceId: 'it_smc_laziocrea_ums_web_internal_portlet_GenericListPortlet_INSTANCE_gIo787T487Lc'
      };
      this.configTimestamp = Date.now();
      this.log('Uso configurazione statica');
      return this.config;
    }

    // Altrimenti prova a recuperarla dinamicamente (può non funzionare)
    const now = Date.now();
    const isExpired = !this.configTimestamp || (now - this.configTimestamp) > this.cacheTimeout;

    if (forceRefresh || !this.config || isExpired) {
      this.log('Recupero nuova configurazione...');
      this.config = await this._fetchConfig();
      this.configTimestamp = now;
    } else {
      this.log('Uso configurazione cachata');
    }

    return this.config;
  }

  async _fetchConfig() {
    try {
      const response = await fetch(this.urls.search);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const html = await response.text();

      // Cerca l'instanceId
      const instanceMatch = html.match(/it_smc_laziocrea_ums_web_internal_portlet_GenericListPortlet_INSTANCE_([A-Za-z0-9]+)/);
      if (!instanceMatch) {
        throw new Error('Instance ID non trovato');
      }

      // CERCA IL LAYOUT ID NEL CONTESTO GIUSTO
      let layoutId = null;

      // Metodo 1: Cerca nella sezione Liferay.Portlet.register che contiene il nostro portlet
      const portletRegisterMatch = html.match(
        new RegExp(`Liferay\\.Portlet\\.register[^}]*${instanceMatch[1]}[^}]*refreshURL[^}]*p_l_id\\\\x3d(\\d+)`, 's')
      );

      if (portletRegisterMatch) {
        layoutId = portletRegisterMatch[1];
      } else {
        // Metodo 2: Cerca nel refreshURL del nostro specifico portlet
        const refreshMatch = html.match(
          new RegExp(`refreshURL[^']*p_l_id\\\\x3d(\\d+)[^']*${instanceMatch[1]}`, 's')
        );
        if (refreshMatch) {
          layoutId = refreshMatch[1];
        }
      }

      // Metodo 3: Se ancora non trovato, cerca nella sezione onLoad del portlet
      if (!layoutId) {
        const onLoadMatch = html.match(
          new RegExp(`Liferay\\.Portlet\\.onLoad[^{]*portletId[^']*${instanceMatch[1]}[^}]*refreshURL[^}]*p_l_id\\\\x3d(\\d+)`, 's')
        );
        if (onLoadMatch) {
          layoutId = onLoadMatch[1];
        }
      }

      // Metodo 4: Cerca direttamente nel data del portlet
      if (!layoutId) {
        // Cerca dove il nostro instanceId appare insieme a p_l_id
        const dataMatch = html.match(
          new RegExp(`data-portlet-id="[^"]*${instanceMatch[1]}[^"]*"[^>]*data-p-l-id="(\\d+)"`, 's')
        );
        if (dataMatch) {
          layoutId = dataMatch[1];
        }
      }

      if (!layoutId) {
        console.warn('Layout ID non trovato dinamicamente, uso default 16262');
        layoutId = '16262';
      }

      const config = {
        layoutId: layoutId,
        instanceId: instanceMatch[1],
        fullInstanceId: `it_smc_laziocrea_ums_web_internal_portlet_GenericListPortlet_INSTANCE_${instanceMatch[1]}`
      };

      this.log('Configurazione trovata:', config);
      return config;

    } catch (error) {
      console.error('Errore nel recupero configurazione:', error);
      return {
        layoutId: '16262',
        instanceId: 'gIo787T487Lc',
        fullInstanceId: 'it_smc_laziocrea_ums_web_internal_portlet_GenericListPortlet_INSTANCE_gIo787T487Lc'
      };
    }
  }

  // ===== COSTRUZIONE PARAMETRI =====
  buildParams(searchParams = {}) {
    const config = this.config;
    if (!config) throw new Error('Config non disponibile. Chiama prima getConfig()');

    // Parametri di sistema
    const systemParams = {
      'p_l_id': config.layoutId,
      'p_p_id': config.fullInstanceId,
      'p_p_lifecycle': '0',
      'p_t_lifecycle': '0',
      'p_p_state': 'normal',
      'p_p_mode': 'view',
      'p_p_col_id': 'column-2',
      'p_p_col_pos': '0',
      'p_p_col_count': '2',
      'p_p_isolated': '1',
      'currentURL': '/ricerca-medici',
      'portletAjaxable': '1'
    };

    // Parametri di ricerca con namespace
    const portletParams = {};
    const defaults = {
      type: '',
      asl: '',
      zip: '',
      name: '',
      surname: '',
      cur: '1',
      delta: '75',  // 75 risultati per pagina invece di 15 default
      resetCur: ''
    };

    const mergedSearch = { ...defaults, ...searchParams };

    // Rimuovi campi opzionali vuoti per evitare filtri indesiderati
    // Il portale Lazio interpreta parametri vuoti come filtri attivi
    if (mergedSearch.surname === '' || mergedSearch.surname === undefined) {
      delete mergedSearch.surname;
    }
    if (mergedSearch.name === '' || mergedSearch.name === undefined) {
      delete mergedSearch.name;
    }
    if (mergedSearch.zip === '' || mergedSearch.zip === undefined) {
      delete mergedSearch.zip;
    }

    Object.keys(mergedSearch).forEach(key => {
      portletParams[`_${config.fullInstanceId}_${key}`] = mergedSearch[key];
    });

    // Unisci tutto
    const allParams = { ...systemParams, ...portletParams };

    return Object.entries(allParams)
      .map(([key, value]) => `${key}=${value}`)
      .join('&');
  }

  // ===== RICERCA MEDICI =====
  async searchMedici(searchParams = {}, options = {}) {
    // Assicurati che la config sia disponibile
    await this.getConfig(options.forceRefresh);

    const params = this.buildParams(searchParams);
    const headers = { ...this.headers, ...options.headers };

    this.log('Parametri ricerca:', searchParams);

    try {
      const response = await fetch(this.urls.portlet, {
        headers,
        referrer: this.urls.search,
        body: params,
        method: "POST",
        mode: "cors",
        credentials: "include"
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const html = await response.text();
      return this.parseMedici(html);

    } catch (error) {
      console.error('Errore nella ricerca:', error);
      throw error;
    }
  }

  // ===== RICERCA CON PAGINAZIONE AUTOMATICA =====
  async searchMediciAllPages(searchParams = {}, options = {}) {
    // Prima richiesta per capire quante pagine ci sono
    const firstPageParams = { ...searchParams, cur: '1' };
    const firstPageHtml = await this._fetchPage(firstPageParams, options);

    const totalPages = this._extractTotalPages(firstPageHtml);
    const firstPageResults = this.parseMedici(firstPageHtml);

    this.log(`Trovate ${totalPages} pagine totali`);

    if (totalPages <= 1) {
      return firstPageResults;
    }

    // Limita il numero massimo di pagine da scansionare per evitare timeout
    const maxPages = options.maxPages || 10;
    const pagesToFetch = Math.min(totalPages, maxPages);

    if (totalPages > maxPages) {
      this.log(`⚠️ Limitando scan a ${maxPages} pagine su ${totalPages} totali per evitare timeout`);
    }

    // Fetch le altre pagine (con limite)
    const allResults = [...firstPageResults];

    for (let page = 2; page <= pagesToFetch; page++) {
      this.log(`Fetching pagina ${page}/${pagesToFetch}`);
      const pageParams = { ...searchParams, cur: page.toString() };
      const pageHtml = await this._fetchPage(pageParams, options);
      const pageResults = this.parseMedici(pageHtml);
      allResults.push(...pageResults);
    }

    this.log(`Totale risultati aggregati: ${allResults.length}`);
    return allResults;
  }

  async _fetchPage(searchParams, options = {}) {
    await this.getConfig(options.forceRefresh);
    const params = this.buildParams(searchParams);
    const headers = { ...this.headers, ...options.headers };

    const response = await fetch(this.urls.portlet, {
      headers,
      referrer: this.urls.search,
      body: params,
      method: "POST",
      mode: "cors",
      credentials: "include"
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.text();
  }

  _extractTotalPages(html) {
    try {
      // Cerca pattern comuni per paginazione
      // Esempio: "Pagina 1 di 5" o "1 of 5" o link alle pagine

      // Pattern 1: Cerca nel testo
      const pageTextMatch = html.match(/(?:pagina|page)\s+\d+\s+(?:di|of)\s+(\d+)/i);
      if (pageTextMatch) {
        return parseInt(pageTextMatch[1]);
      }

      // Pattern 2: Cerca nei link di paginazione
      const pageLinksMatch = html.matchAll(/cur=(\d+)/g);
      const pages = Array.from(pageLinksMatch, m => parseInt(m[1]));
      if (pages.length > 0) {
        return Math.max(...pages);
      }

      // Pattern 3: Cerca elementi paginazione (a.page, li.page, etc)
      const dom = new JSDOM(html);
      const doc = dom.window.document;

      const paginationLinks = doc.querySelectorAll('a[href*="cur="], button[onclick*="cur="]');
      const pageNumbers = Array.from(paginationLinks).map(link => {
        const match = (link.href || link.getAttribute('onclick') || '').match(/cur=(\d+)/);
        return match ? parseInt(match[1]) : 0;
      }).filter(n => n > 0);

      if (pageNumbers.length > 0) {
        return Math.max(...pageNumbers);
      }

      // Se non troviamo info sulla paginazione, assumiamo 1 pagina
      return 1;
    } catch (e) {
      console.error('Errore nell\'estrazione del numero di pagine:', e);
      return 1;
    }
  }

  // ===== RICERCHE MULTIPLE =====
  async searchMultiple(searchArray = []) {
    const results = [];

    for (const search of searchArray) {
      try {
        const medici = await this.searchMedici(search);
        results.push({
          search,
          medici,
          success: true
        });
      } catch (error) {
        results.push({
          search,
          error: error.message,
          success: false
        });
      }
    }

    return results;
  }

  // ===== UTILITY: GENERA PRODOTTO CARTESIANO =====
  _cartesianProduct(arrays) {
    if (arrays.length === 0) return [[]];
    if (arrays.length === 1) return arrays[0].map(item => [item]);

    const [first, ...rest] = arrays;
    const restProduct = this._cartesianProduct(rest);

    const result = [];
    for (const item of first) {
      for (const restItem of restProduct) {
        result.push([item, ...restItem]);
      }
    }
    return result;
  }

  // ===== RICERCA MEDICI =====
  async searchMedici(surnames = [], commonParams = {}, options = {}) {
    // Estrai e normalizza i parametri multipli
    let surnamesList = Array.isArray(surnames) ? surnames : [surnames];
    surnamesList = surnamesList.filter(Boolean);

    // Gestisci name: può essere stringa comma-separated o array
    let namesList = [''];
    if (commonParams.name) {
      if (typeof commonParams.name === 'string' && commonParams.name.trim()) {
        namesList = commonParams.name.split(',').map(n => n.trim()).filter(Boolean);
      } else if (Array.isArray(commonParams.name)) {
        namesList = commonParams.name.filter(Boolean);
      }
    }

    // Gestisci zip: può essere stringa comma-separated o array
    let zipsList = [''];
    if (commonParams.zip) {
      if (typeof commonParams.zip === 'string' && commonParams.zip.trim()) {
        zipsList = commonParams.zip.split(',').map(z => z.trim()).filter(Boolean);
      } else if (Array.isArray(commonParams.zip)) {
        zipsList = commonParams.zip.filter(Boolean);
      }
    }

    // Se le liste sono vuote dopo il parsing, usa stringa vuota
    if (surnamesList.length === 0) surnamesList = [''];
    if (namesList.length === 0) namesList = [''];
    if (zipsList.length === 0) zipsList = [''];

    // Genera tutte le combinazioni (prodotto cartesiano)
    const combinations = this._cartesianProduct([surnamesList, namesList, zipsList]);

    this.log(`Generazione di ${combinations.length} combinazioni da ricercare`);
    this.log(`Cognomi: ${surnamesList.length}, Nomi: ${namesList.length}, CAP: ${zipsList.length}`);

    const allMedici = [];
    const singleQueries = []; // Traccia tutte le query effettive
    let totalPages = null;
    let currentPage = null;

    // Se è richiesta una pagina specifica, usa modalità pagina singola
    if (options.page) {
      currentPage = options.page;

      // In modalità pagina singola, supportiamo solo una combinazione
      if (combinations.length > 1) {
        throw new Error('Single page mode supports only one combination (single surname, name, zip)');
      }

      const [surname, name, zip] = combinations[0];
      const searchParams = {
        ...commonParams,
        surname,
        name: name || '',
        zip: zip || '',
        cur: options.page.toString()
      };

      this.log(`Ricerca pagina ${options.page} per: cognome=${surname}, nome=${name || '(vuoto)'}, cap=${zip || '(vuoto)'}`);

      singleQueries.push({
        type: searchParams.type || '',
        asl: searchParams.asl || '',
        zip: zip || '',
        surname: surname,
        name: name || ''
      });

      const html = await this._fetchPage(searchParams);
      const medici = this.parseMedici(html);
      totalPages = this._extractTotalPages(html);
      allMedici.push(...medici);

      this.log(`Trovati ${medici.length} risultati nella pagina ${options.page} di ${totalPages}`);
    } else {
      // Modalità normale: tutte le pagine
      for (const [surname, name, zip] of combinations) {
        try {
          const searchParams = {
            ...commonParams,
            surname,
            name: name || '',
            zip: zip || ''
          };

          this.log(`Ricerca combinazione: cognome=${surname}, nome=${name || '(vuoto)'}, cap=${zip || '(vuoto)'}`);

          // Salva la query effettiva
          singleQueries.push({
            type: searchParams.type || '',
            asl: searchParams.asl || '',
            zip: zip || '',
            surname: surname,
            name: name || ''
          });

          // Usa searchMediciAllPages per aggregare tutte le pagine
          const medici = await this.searchMediciAllPages(searchParams, options);
          allMedici.push(...medici);

          this.log(`Trovati ${medici.length} risultati per questa combinazione`);
        } catch (error) {
          console.error(`Errore ricerca combinazione cognome=${surname}, nome=${name}, cap=${zip}:`, error);
          // Continua con le altre combinazioni anche se una fallisce
        }
      }
    }

    // Rimuovi duplicati basandosi sul codice fiscale
    const uniqueMedici = Array.from(
      new Map(allMedici.map(m => [m.codiceFiscale || Math.random(), m])).values()
    );

    this.log(`Totale risultati da tutte le combinazioni: ${allMedici.length}`);
    this.log(`Totale risultati unici (deduplicati): ${uniqueMedici.length}`);

    const result = {
      medici: uniqueMedici,
      singleQueries: singleQueries
    };

    // Aggiungi info paginazione se disponibili
    if (totalPages !== null) {
      result.pagination = {
        currentPage,
        totalPages
      };
    }

    return result;
  }

  // ===== PARSING RISULTATI =====
  parseMedici(html) {
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    const medici = [];

    const rows = doc.querySelectorAll('tbody.table-data tr:not(.lfr-template)');

    rows.forEach((row, index) => {
      const cells = row.querySelectorAll('td');

      // Debug: log del numero di celle per la prima riga
      if (index === 0 && this.debug) {
        this.log(`Prima riga ha ${cells.length} celle:`);
        cells.forEach((cell, i) => {
          this.log(`  Cella ${i}: "${cell.textContent.trim()}"`);
        });
      }

      if (cells.length >= 5) {
        // Estrai codice fiscale e altri dati dal link dettagli
        let codiceFiscale = null;
        let dataDetails = {};

        const detailLink = row.querySelector('a[onclick*="getDetails"]');
        if (detailLink) {
          const onclick = detailLink.getAttribute('onclick');
          const cfMatch = onclick.match(/'([A-Z0-9]{16})'/);
          if (cfMatch) codiceFiscale = cfMatch[1];

          // Prova a estrarre altri parametri dalla funzione onclick
          const paramsMatch = onclick.match(/getDetails\('([^']+)','([^']+)','([^']+)','([^']+)'/);
          if (paramsMatch) {
            dataDetails.identificativo = paramsMatch[2] || null;
            dataDetails.codiceDistretto = paramsMatch[3] || null;
          }
        }

        // Estrai tutte le celle disponibili
        const medico = {
          nome: cells[0]?.textContent.trim() || '',
          cognome: cells[1]?.textContent.trim() || '',
          asl: cells[2]?.textContent.trim() || '',
          assegnabilita: cells[3]?.textContent.trim() || '',
          tipo: cells[4]?.textContent.trim() || '',
          codiceFiscale,
          ...dataDetails
        };

        medici.push(medico);
      }
    });

    // Prova ad aggiungere dati extra dal JavaScript
    this._enhanceMediciData(html, medici);

    return medici;
  }

  _enhanceMediciData(html, medici) {
    try {
      // Cerca tutti gli oggetti medico nel dataStore JavaScript
      const scriptMatch = html.match(/searchContainer\.updateDataStore\(\[(.*?)\]\);/s);
      if (!scriptMatch || !scriptMatch[1]) {
        this.log('DataStore non trovato nel JavaScript');
        return;
      }

      const dataString = scriptMatch[1];

      // Debug: mostra parte del dataString
      if (this.debug && dataString.length > 0) {
        this.log('DataStore trovato, primi 500 caratteri:', dataString.substring(0, 500));
      }

      // Cerca pattern di oggetti separati da virgole nel JSON
      // Ogni medico dovrebbe avere un oggetto con i suoi dati
      const objectMatches = dataString.matchAll(/\{([^}]+)\}/g);

      let index = 0;
      for (const match of objectMatches) {
        if (index >= medici.length) break;

        const objString = match[1];

        // Debug: mostra l'oggetto per il primo medico
        if (index === 0 && this.debug) {
          this.log('Primo oggetto nel dataStore:', objString);
        }

        const extraFields = {
          email: objString.match(/email["\s:=]+([^,}"]+)/)?.[1]?.trim() || null,
          indirizzo: objString.match(/address["\s:=]+([^,}"]+)/)?.[1]?.trim() || null,
          luogo: objString.match(/place["\s:=]+([^,}"]+)/)?.[1]?.trim() || null,
          identificativo: objString.match(/identifier["\s:=]+([^,}"]+)/)?.[1]?.trim() || null,
          luogoNascita: objString.match(/birthPlace["\s:=]+([^,}"]+)/)?.[1]?.trim() || null,
          codiceDistretto: objString.match(/districtCode["\s:=]+([^,}"]+)/)?.[1]?.trim() || null,
          descrizioneDistretto: objString.match(/districtDescription["\s:=]+([^,}"]+)/)?.[1]?.trim() || null,
          // Cerca anche azienda/ASL con vari pattern possibili
          azienda: objString.match(/(?:company|azienda|asl)["\s:=]+([^,}"]+)/i)?.[1]?.trim() || null
        };

        // Se troviamo azienda nel dataStore e l'ASL non era stata trovata nella tabella, sovrascriviamo
        if (extraFields.azienda && (!medici[index].asl || medici[index].asl === '')) {
          medici[index].asl = extraFields.azienda;
          delete extraFields.azienda; // Non duplicare il campo
        }

        // Rimuovi campi null
        Object.keys(extraFields).forEach(key => {
          if (extraFields[key]) {
            medici[index][key] = extraFields[key];
          }
        });

        index++;
      }
    } catch (e) {
      // Silently ignore parsing errors
      console.error('Error enhancing medici data:', e);
    }
  }

  // ===== UTILITY =====
  log(...args) {
    if (this.debug) {
      console.log('[MediciSearchClient]', ...args);
    }
  }

  refreshConfig() {
    return this.getConfig(true);
  }

  getCachedConfig() {
    return this.config;
  }
}
