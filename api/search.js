import { MediciSearchClient } from '../lib/medici/client.js';
import { requireAuth } from '../lib/auth.js';

async function handler(req, res) {
  // Permetti sia GET che POST
  let params;

  if (req.method === 'GET') {
    // GET: parametri da query string
    const { cognomi, asl, tipo, cap, nome } = req.query;

    if (!cognomi) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: cognomi'
      });
    }

    params = {
      cognomi: cognomi.split(',').map(c => c.trim().toUpperCase()),
      asl: asl || '',
      tipo: tipo || 'MMG',
      cap: cap || '',
      nome: nome || ''
    };

  } else if (req.method === 'POST') {
    // POST: parametri da body JSON
    params = req.body;

    if (!params.cognomi || params.cognomi.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: cognomi'
      });
    }

    // Normalizza cognomi
    params.cognomi = params.cognomi.map(c => String(c).trim().toUpperCase());

  } else {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use GET or POST.'
    });
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
        zip: params.cap || '',
        name: params.nome || ''
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
        cap: params.cap || '',
        nome: params.nome || ''
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

// Wrap con autenticazione API key
export default requireAuth(handler);
