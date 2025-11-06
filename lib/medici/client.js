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
      resetCur: ''
    };

    const mergedSearch = { ...defaults, ...searchParams };

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

  // ===== RICERCA PER COGNOMI MULTIPLI =====
  async searchBySurnames(surnames = [], commonParams = {}) {
    const searches = surnames.map(surname => ({
      ...commonParams,
      surname
    }));

    const results = await this.searchMultiple(searches);

    // Unisci tutti i medici in un array unico
    const allMedici = results
      .filter(r => r.success)
      .flatMap(r => r.medici);

    // Rimuovi duplicati basandosi sul codice fiscale
    const uniqueMedici = Array.from(
      new Map(allMedici.map(m => [m.codiceFiscale, m])).values()
    );

    return uniqueMedici;
  }

  // ===== PARSING RISULTATI =====
  parseMedici(html) {
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    const medici = [];

    const rows = doc.querySelectorAll('tbody.table-data tr:not(.lfr-template)');

    rows.forEach(row => {
      const cells = row.querySelectorAll('td');

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

        // Se ci sono più di 5 celle, potrebbe esserci ambito o altre info
        if (cells.length >= 6) {
          medico.ambito = cells[5]?.textContent.trim() || null;
        }

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
      if (!scriptMatch || !scriptMatch[1]) return;

      const dataString = scriptMatch[1];

      // Cerca pattern di oggetti separati da virgole nel JSON
      // Ogni medico dovrebbe avere un oggetto con i suoi dati
      const objectMatches = dataString.matchAll(/\{([^}]+)\}/g);

      let index = 0;
      for (const match of objectMatches) {
        if (index >= medici.length) break;

        const objString = match[1];
        const extraFields = {
          email: objString.match(/email["\s:=]+([^,}"]+)/)?.[1]?.trim() || null,
          indirizzo: objString.match(/address["\s:=]+([^,}"]+)/)?.[1]?.trim() || null,
          luogo: objString.match(/place["\s:=]+([^,}"]+)/)?.[1]?.trim() || null,
          identificativo: objString.match(/identifier["\s:=]+([^,}"]+)/)?.[1]?.trim() || null,
          luogoNascita: objString.match(/birthPlace["\s:=]+([^,}"]+)/)?.[1]?.trim() || null,
          codiceDistretto: objString.match(/districtCode["\s:=]+([^,}"]+)/)?.[1]?.trim() || null,
          descrizioneDistretto: objString.match(/districtDescription["\s:=]+([^,}"]+)/)?.[1]?.trim() || null
        };

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
