import { MediciSearchClient } from '../lib/medici/client.js';
import { requireAuthOrApiKey } from '../lib/auth.js';

// Mappe di conversione da valori leggibili a codici interni
const TIPO_MAP = {
  'Medicina generale': 'MMG',
  'Pediatra': 'PLS'
};

const ASL_MAP = {
  'Tutte': '',
  'Roma 1': '120201',
  'Roma 2': '120202',
  'Roma 3': '120203',
  'Roma 4': '120204',
  'Roma 5': '120205',
  'Roma 6': '120206',
  'Frosinone': '120207',
  'Latina': '120208',
  'Rieti': '120209',
  'Viterbo': '120210'
};

// Valori validi per i parametri
const VALID_TIPO = Object.keys(TIPO_MAP);
const VALID_ASL = Object.keys(ASL_MAP);

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
      asl: asl || 'Tutte',
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

    // Default tipo e asl se non specificati
    if (!params.tipo) {
      params.tipo = 'Medicina generale';
    }
    if (!params.asl) {
      params.asl = 'Tutte';
    }

  } else {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use GET or POST.'
    });
  }

  // Accumula tutti gli errori di validazione
  const validationErrors = [];

  // Validazione: almeno uno tra cognomi, cap, nomi deve essere presente
  if (params.cognomi.length === 0 && params.cap.length === 0 && params.nomi.length === 0) {
    validationErrors.push({
      field: 'cognomi/cap/nomi',
      message: 'At least one of the following parameters is required: cognomi, cap, nomi'
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

  // Validazione ASL
  if (params.asl && params.asl !== '' && !VALID_ASL.includes(params.asl)) {
    validationErrors.push({
      field: 'asl',
      value: params.asl,
      message: `Invalid asl. Must be one of: ${VALID_ASL.join(', ')}`
    });
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
    // Converti valori leggibili in codici per il portale Lazio
    const tipoCode = TIPO_MAP[params.tipo] || 'MMG';
    const aslCode = ASL_MAP[params.asl] || '';

    // Esegui ricerca
    const client = new MediciSearchClient({
      debug: false,
      useStaticConfig: false
    });

    const result = await client.searchMedici(
      params.cognomi,
      {
        asl: aslCode,
        type: tipoCode,
        zip: Array.isArray(params.cap) ? params.cap.join(',') : (params.cap || ''),
        name: Array.isArray(params.nomi) ? params.nomi.join(',') : (params.nomi || '')
      }
    );

    const medici = result.medici;
    const singleQueries = result.singleQueries;

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
