import { MediciSearchClient } from '../lib/medici/client.js';
import { requireAuthOrApiKey } from '../lib/auth.js';

// Mappe di conversione da valori leggibili a codici interni
const TIPO_MAP = {
  'Medicina generale': 'MMG',
  'Pediatra': 'PLS'
};

// Codici ASL validi (ora il frontend passa direttamente i codici)
const VALID_ASL_CODES = ['120201', '120202', '120203', '120204', '120205', '120206', '120112', '120111', '120110', '120109'];

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
    // GET: parametri da query string (singoli valori)
    const { cognome, asl, tipo, cap, nome, page } = req.query;

    params = {
      cognome: cognome ? normalizeString(cognome) : '',
      asl: asl || '',
      tipo: tipo || 'Medicina generale',
      cap: cap ? cap.trim() : '',
      nome: nome ? normalizeString(nome) : '',
      page: page ? parseInt(page) : undefined
    };

  } else if (req.method === 'POST') {
    // POST: parametri da body JSON (singoli valori)
    params = req.body;

    // Normalizza cognome (se presente)
    if (params.cognome) {
      params.cognome = normalizeString(String(params.cognome));
    } else {
      params.cognome = '';
    }

    // Normalizza nome (se presente)
    if (params.nome) {
      params.nome = normalizeString(String(params.nome));
    } else {
      params.nome = '';
    }

    // Normalizza CAP (se presente)
    if (params.cap) {
      params.cap = String(params.cap).trim();
    } else {
      params.cap = '';
    }

    // Default tipo e asl se non specificati
    if (!params.tipo) {
      params.tipo = 'Medicina generale';
    }
    if (!params.asl) {
      params.asl = '';
    }

    // Normalizza page (se presente)
    if (params.page !== undefined && params.page !== null) {
      params.page = parseInt(params.page);
    }

  } else {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use GET or POST.'
    });
  }

  // Accumula tutti gli errori di validazione
  const validationErrors = [];

  // Validazione: almeno uno tra cognome, cap, nome, asl deve essere presente
  const hasAsl = params.asl && params.asl !== '';
  if (!params.cognome && !params.cap && !params.nome && !hasAsl) {
    validationErrors.push({
      field: 'cognome/cap/nome/asl',
      message: 'At least one of the following parameters is required: cognome, cap, nome, asl'
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

  // Validazione ASL (ora sono codici)
  if (params.asl && params.asl !== '' && !VALID_ASL_CODES.includes(params.asl)) {
    validationErrors.push({
      field: 'asl',
      value: params.asl,
      message: `Invalid asl code. Must be one of: ${VALID_ASL_CODES.join(', ')}`
    });
  }

  // Validazione cognome (deve contenere solo lettere maiuscole, apostrofi e spazi)
  if (params.cognome && !/^[A-Z'\s]+$/.test(params.cognome)) {
    validationErrors.push({
      field: 'cognome',
      value: params.cognome,
      message: 'Cognome must contain only uppercase letters, apostrophes and spaces.'
    });
  }

  // Validazione nome (se specificato)
  if (params.nome && !/^[A-Z'\s]+$/.test(params.nome)) {
    validationErrors.push({
      field: 'nome',
      value: params.nome,
      message: 'Nome must contain only uppercase letters, apostrophes and spaces.'
    });
  }

  // Validazione CAP (se specificato)
  if (params.cap && !/^\d{5}$/.test(params.cap)) {
    validationErrors.push({
      field: 'cap',
      value: params.cap,
      message: 'CAP must be exactly 5 digits.'
    });
  }

  // Validazione page (se specificato)
  if (params.page !== undefined) {
    if (isNaN(params.page) || params.page < 1 || !Number.isInteger(params.page)) {
      validationErrors.push({
        field: 'page',
        value: params.page,
        message: 'Page must be a positive integer greater than 0.'
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
    // Converti tipo in codice per il portale Lazio
    const tipoCode = TIPO_MAP[params.tipo] || 'MMG';
    // ASL è già un codice, usalo direttamente
    const aslCode = params.asl || '';

    // Esegui ricerca con singoli valori
    const client = new MediciSearchClient({
      debug: false,
      useStaticConfig: false
    });

    // Prepara array con singolo elemento (o vuoto se non specificato)
    const cognomi = params.cognome ? [params.cognome] : [];

    // Prepara options per paginazione se specificata
    const options = {};
    if (params.page !== undefined) {
      options.page = params.page;
    }

    const result = await client.searchMedici(
      cognomi,
      {
        asl: aslCode,
        type: tipoCode,
        zip: params.cap || '',
        name: params.nome || ''
      },
      options
    );

    const medici = result.medici;
    const pagination = result.pagination;

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
    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      query: {
        tipo: params.tipo,
        asl: params.asl,
        cap: params.cap || '',
        cognome: params.cognome || '',
        nome: params.nome || ''
      },
      results: medici,
      counters: {
        totali: medici.length,
        assegnabili: assegnabiliLiberi.length,
        conDeroga: conDeroga.length,
        nonAssegnabili: nonAssegnabili.length
      }
    };

    // Aggiungi pagination se disponibile
    if (pagination) {
      response.pagination = pagination;
    }

    return res.status(200).json(response);

  } catch (error) {
    console.error('Error in search_simple API:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}

// Wrap con autenticazione ibrida (JWT o API key)
export default requireAuthOrApiKey(handler);
