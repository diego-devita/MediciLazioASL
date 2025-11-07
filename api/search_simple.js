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
    // GET: parametri da query string (singoli valori)
    const { cognome, asl, tipo, cap, nome } = req.query;

    params = {
      cognome: cognome ? normalizeString(cognome) : '',
      asl: asl || 'Tutte',
      tipo: tipo || 'Medicina generale',
      cap: cap ? cap.trim() : '',
      nome: nome ? normalizeString(nome) : ''
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

  // Validazione: almeno uno tra cognome, cap, nome deve essere presente
  if (!params.cognome && !params.cap && !params.nome) {
    validationErrors.push({
      field: 'cognome/cap/nome',
      message: 'At least one of the following parameters is required: cognome, cap, nome'
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

    // Esegui ricerca con singoli valori
    const client = new MediciSearchClient({
      debug: false,
      useStaticConfig: false
    });

    // Prepara array con singolo elemento (o vuoto se non specificato)
    const cognomi = params.cognome ? [params.cognome] : [];

    const result = await client.searchMedici(
      cognomi,
      {
        asl: aslCode,
        type: tipoCode,
        zip: params.cap || '',
        name: params.nome || ''
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
        tipo: params.tipo,
        asl: params.asl,
        cap: params.cap || '',
        cognome: params.cognome || '',
        nome: params.nome || ''
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
    console.error('Error in search_simple API:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}

// Wrap con autenticazione ibrida (JWT o API key)
export default requireAuthOrApiKey(handler);
