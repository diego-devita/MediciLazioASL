import { MediciSearchClient } from '../lib/medici/client.js';
import { requireAuthOrApiKey } from '../lib/auth.js';

// Mappe di conversione da valori leggibili a codici interni
const TIPO_MAP = {
  'Medicina generale': 'MMG',
  'Pediatra': 'PLS'
};

// Codici ASL validi (ora il frontend passa direttamente i codici)
const VALID_ASL_CODES = ['', '120201', '120202', '120203', '120204', '120205', '120206', '120207', '120208', '120209', '120210'];
const ALL_ASL_CODES = ['120201', '120202', '120203', '120204', '120205', '120206', '120207', '120208', '120209', '120210'];

// Valori validi per i parametri
const VALID_TIPO = Object.keys(TIPO_MAP);

// Funzione helper per normalizzare nomi/cognomi
function normalizeString(str) {
  return str
    .trim()                           // Rimuovi spazi iniziali e finali
    .replace(/\s+/g, ' ')             // Appiattisci spazi multipli in uno solo
    .toUpperCase();                   // Converti in uppercase
}

async function handler(req, res) {
  // Permetti sia GET che POST
  let params;

  if (req.method === 'GET') {
    // GET: parametri da query string
    const { cognomi, asl, tipo, cap, nomi } = req.query;

    params = {
      cognomi: cognomi ? cognomi.split(',').map(c => normalizeString(c)) : [],
      asl: asl ? asl.split(',').map(a => a.trim()) : [],
      tipo: tipo || 'Medicina generale',
      cap: cap ? cap.split(',').map(c => c.trim()) : [],
      nomi: nomi ? nomi.split(',').map(n => normalizeString(n)) : []
    };

  } else if (req.method === 'POST') {
    // POST: parametri da body JSON
    params = req.body;

    // Normalizza cognomi (se presenti)
    if (params.cognomi && Array.isArray(params.cognomi)) {
      params.cognomi = params.cognomi.map(c => normalizeString(String(c)));
    } else {
      params.cognomi = [];
    }

    // Normalizza nomi (se è stringa, split; se è array, usa così; altrimenti array vuoto)
    if (typeof params.nomi === 'string') {
      params.nomi = params.nomi.split(',').map(n => normalizeString(n));
    } else if (Array.isArray(params.nomi)) {
      params.nomi = params.nomi.map(n => normalizeString(String(n)));
    } else {
      params.nomi = [];
    }

    // Normalizza CAP (se è stringa, split; se è array, usa così; altrimenti array vuoto)
    if (typeof params.cap === 'string') {
      params.cap = params.cap.split(',').map(c => c.trim());
    } else if (Array.isArray(params.cap)) {
      params.cap = params.cap.map(c => String(c).trim());
    } else {
      params.cap = [];
    }

    // Default tipo se non specificato
    if (!params.tipo) {
      params.tipo = 'Medicina generale';
    }

    // Normalizza ASL (se è stringa, split; se è array, usa così; altrimenti array vuoto)
    if (typeof params.asl === 'string') {
      params.asl = params.asl.split(',').map(a => a.trim()).filter(a => a.length > 0);
    } else if (Array.isArray(params.asl)) {
      params.asl = params.asl.map(a => String(a).trim()).filter(a => a.length > 0);
    } else {
      params.asl = [];
    }

  } else {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use GET or POST.'
    });
  }

  // Accumula tutti gli errori di validazione
  const validationErrors = [];

  // Verifica se almeno una ASL è specificata
  const hasAsl = params.asl.length > 0;

  // Validazione: almeno uno tra cognomi, cap, nomi, asl deve essere presente
  if (params.cognomi.length === 0 && params.cap.length === 0 && params.nomi.length === 0 && !hasAsl) {
    validationErrors.push({
      field: 'cognomi/cap/nomi/asl',
      message: 'At least one of the following parameters is required: cognomi, cap, nomi, asl'
    });
  }

  // Validazione tipo
  if (!VALID_TIPO.includes(params.tipo)) {
    validationErrors.push({
      field: 'tipo',
      value: params.tipo,
      message: `Invalid tipo. Must be one of: ${VALID_TIPO.join(', ')}`
    });
  }

  // Validazione ASL (ogni elemento dell'array deve essere un codice valido)
  if (params.asl.length > 0) {
    const invalidAsl = params.asl.filter(a => !VALID_ASL_CODES.includes(a));
    if (invalidAsl.length > 0) {
      invalidAsl.forEach(asl => {
        validationErrors.push({
          field: 'asl',
          value: asl,
          message: `Invalid asl code. Must be one of: ${VALID_ASL_CODES.join(', ')}`
        });
      });
    }
  }

  // Validazione cognomi (devono contenere solo lettere maiuscole, apostrofi e spazi)
  const invalidCognomi = params.cognomi.filter(c => !/^[A-Z'\s]+$/.test(c));
  if (invalidCognomi.length > 0) {
    invalidCognomi.forEach(cognome => {
      validationErrors.push({
        field: 'cognomi',
        value: cognome,
        message: 'Each cognome must contain only uppercase letters, apostrophes and spaces.'
      });
    });
  }

  // Validazione nomi (se specificati)
  if (params.nomi && params.nomi.length > 0) {
    const invalidNomi = params.nomi.filter(n => !/^[A-Z'\s]+$/.test(n));
    if (invalidNomi.length > 0) {
      invalidNomi.forEach(nome => {
        validationErrors.push({
          field: 'nomi',
          value: nome,
          message: 'Each nome must contain only uppercase letters, apostrophes and spaces.'
        });
      });
    }
  }

  // Validazione CAP (se specificati)
  if (params.cap && params.cap.length > 0) {
    const invalidCaps = params.cap.filter(cap => !/^\d{5}$/.test(cap));
    if (invalidCaps.length > 0) {
      invalidCaps.forEach(cap => {
        validationErrors.push({
          field: 'cap',
          value: cap,
          message: 'Each CAP must be exactly 5 digits.'
        });
      });
    }
  }

  // Se ci sono errori di validazione, restituiscili tutti
  if (validationErrors.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      errors: validationErrors
    });
  }

  try {
    // Ottimizzazione: se tutte le ASL sono selezionate E c'è almeno un altro campo, tratta ASL come vuoto
    let aslToUse = params.asl;
    const hasOtherFields = params.cognomi.length > 0 || params.cap.length > 0 || params.nomi.length > 0;

    if (params.asl.length === ALL_ASL_CODES.length && hasOtherFields) {
      aslToUse = [];
    }

    // Converti tipo in codice per il portale Lazio
    const tipoCode = TIPO_MAP[params.tipo] || 'MMG';

    // Se aslToUse è vuoto, usa stringa vuota (tutte le ASL)
    // Se aslToUse ha elementi, sono già codici, usali direttamente
    const aslCodes = aslToUse.length === 0 ? [''] : aslToUse;

    // Esegui ricerca
    const client = new MediciSearchClient({
      debug: false,
      useStaticConfig: false
    });

    // Esegui query per ogni ASL selezionata
    const allResults = [];
    const allQueries = [];

    for (const aslCode of aslCodes) {
      const result = await client.searchMedici(
        params.cognomi,
        {
          asl: aslCode,
          type: tipoCode,
          zip: Array.isArray(params.cap) ? params.cap.join(',') : (params.cap || ''),
          name: Array.isArray(params.nomi) ? params.nomi.join(',') : (params.nomi || '')
        }
      );

      allResults.push(...result.medici);
      allQueries.push(...result.singleQueries);
    }

    // Rimuovi duplicati basandoti su un ID univoco (assumiamo che esista un campo id o combinazione nome+cognome+codice)
    const uniqueMedici = Array.from(
      new Map(allResults.map(m => [`${m.cognome}-${m.nome}-${m.codice || ''}`, m])).values()
    );

    const medici = uniqueMedici;
    const singleQueries = allQueries;

    // Conta per categoria
    const assegnabiliLiberi = medici.filter(m => {
      if (!m.assegnabilita) return false;
      const stato = m.assegnabilita.toLowerCase();
      return stato.includes('assegnazione libera');
    });

    const conDeroga = medici.filter(m => {
      if (!m.assegnabilita) return false;
      const stato = m.assegnabilita.toLowerCase();
      return stato.includes('deroga') && !stato.includes('assegnazione libera');
    });

    const nonAssegnabili = medici.filter(m => {
      if (!m.assegnabilita) return true;
      const stato = m.assegnabilita.toLowerCase();
      return !stato.includes('assegnazione libera') && !stato.includes('deroga');
    });

    // Response
    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      query: {
        tipo: params.tipo || 'MMG',
        asl: params.asl || '',
        cap: params.cap || [],
        cognomi: params.cognomi,
        nomi: params.nomi || []
      },
      singleQueries: singleQueries,
      results: medici,
      counters: {
        totali: medici.length,
        assegnabili: assegnabiliLiberi.length,
        conDeroga: conDeroga.length,
        nonAssegnabili: nonAssegnabili.length
      }
    });

  } catch (error) {
    console.error('Error in search API:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}

// Wrap con autenticazione ibrida (JWT o API key)
export default requireAuthOrApiKey(handler);
