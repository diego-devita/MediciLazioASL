import { MediciSearchClient } from '../lib/medici/client.js';
import { requireAuthOrApiKey } from '../lib/auth.js';

// Valori validi per i parametri
const VALID_TIPO = ['MMG', 'PLS'];
const VALID_ASL = [
  '120201', // Roma 1
  '120202', // Roma 2
  '120203', // Roma 3
  '120204', // Roma 4
  '120205', // Roma 5
  '120206', // Roma 6
  '120207', // Frosinone
  '120208', // Latina
  '120209', // Rieti
  '120210'  // Viterbo
];

async function handler(req, res) {
  // Permetti sia GET che POST
  let params;

  if (req.method === 'GET') {
    // GET: parametri da query string
    const { cognomi, asl, tipo, cap, nomi } = req.query;

    params = {
      cognomi: cognomi ? cognomi.split(',').map(c => c.trim().toUpperCase()) : [],
      asl: asl || '',
      tipo: tipo || 'MMG',
      cap: cap ? cap.split(',').map(c => c.trim()) : [],
      nomi: nomi ? nomi.split(',').map(n => n.trim().toUpperCase()) : []
    };

  } else if (req.method === 'POST') {
    // POST: parametri da body JSON
    params = req.body;

    // Normalizza cognomi (se presenti)
    if (params.cognomi && Array.isArray(params.cognomi)) {
      params.cognomi = params.cognomi.map(c => String(c).trim().toUpperCase());
    } else {
      params.cognomi = [];
    }

    // Normalizza nomi (se è stringa, split; se è array, usa così; altrimenti array vuoto)
    if (typeof params.nomi === 'string') {
      params.nomi = params.nomi.split(',').map(n => n.trim().toUpperCase());
    } else if (Array.isArray(params.nomi)) {
      params.nomi = params.nomi.map(n => String(n).trim().toUpperCase());
    } else {
      params.nomi = [];
    }

    // Normalizza CAP (se è stringa, split; se è array, usa così; altrimenti array vuoto)
    if (typeof params.cap === 'string') {
      params.cap = params.cap.split(',').map(c => c.trim());
    } else if (!Array.isArray(params.cap)) {
      params.cap = [];
    }

    // Default tipo se non specificato
    if (!params.tipo) {
      params.tipo = 'MMG';
    }

  } else {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use GET or POST.'
    });
  }

  // Validazione: almeno uno tra cognomi, cap, nomi deve essere presente
  if (params.cognomi.length === 0 && params.cap.length === 0 && params.nomi.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'At least one of the following parameters is required: cognomi, cap, nomi'
    });
  }

  // Validazione cognomi (devono contenere solo lettere maiuscole e apostrofi)
  const invalidCognomi = params.cognomi.filter(c => !/^[A-Z']+$/.test(c));
  if (invalidCognomi.length > 0) {
    return res.status(400).json({
      success: false,
      error: `Invalid cognomi: ${invalidCognomi.join(', ')}. Each cognome must contain only uppercase letters and apostrophes.`
    });
  }

  // Validazione nomi (se specificati)
  if (params.nomi && params.nomi.length > 0) {
    const invalidNomi = params.nomi.filter(n => !/^[A-Z']+$/.test(n));
    if (invalidNomi.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Invalid nomi: ${invalidNomi.join(', ')}. Each nome must contain only uppercase letters and apostrophes.`
      });
    }
  }

  // Validazione tipo
  if (!VALID_TIPO.includes(params.tipo)) {
    return res.status(400).json({
      success: false,
      error: `Invalid tipo. Must be one of: ${VALID_TIPO.join(', ')}`
    });
  }

  // Validazione ASL (se specificata)
  if (params.asl && params.asl !== '' && !VALID_ASL.includes(params.asl)) {
    return res.status(400).json({
      success: false,
      error: `Invalid asl. Must be one of: ${VALID_ASL.join(', ')}`
    });
  }

  // Validazione CAP (se specificati)
  if (params.cap && params.cap.length > 0) {
    const invalidCaps = params.cap.filter(cap => !/^\d{5}$/.test(cap));
    if (invalidCaps.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Invalid CAP: ${invalidCaps.join(', ')}. Each CAP must be exactly 5 digits.`
      });
    }
  }

  try {
    // Esegui ricerca
    const client = new MediciSearchClient({
      debug: false,
      useStaticConfig: false
    });

    const medici = await client.searchBySurnames(
      params.cognomi,
      {
        asl: params.asl || '',
        type: params.tipo || 'MMG',
        zip: Array.isArray(params.cap) ? params.cap.join(',') : (params.cap || ''),
        name: Array.isArray(params.nomi) ? params.nomi.join(',') : (params.nomi || '')
      }
    );

    // Conta assegnabili
    const assegnabili = medici.filter(m => {
      if (!m.assegnabilita) return false;
      const stato = m.assegnabilita.toLowerCase();
      return stato.includes('assegnazione libera') || stato.includes('deroga');
    });

    // Response
    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      query: {
        cognomi: params.cognomi,
        asl: params.asl || '',
        tipo: params.tipo || 'MMG',
        cap: params.cap || [],
        nomi: params.nomi || []
      },
      results: medici,
      count: medici.length,
      assegnabili: assegnabili.length
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
