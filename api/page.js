import { requireAdmin, requireAuth } from '../lib/auth.js';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Serve pagine HTML protette dalla directory /private/
 * Applica middleware di autenticazione basato sul nome della pagina
 */

async function pageHandler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name } = req.query;

  if (!name) {
    return res.status(400).json({ error: 'Missing page name parameter' });
  }

  // Mappa pagine valide
  const validPages = ['admin', 'bot', 'index'];

  if (!validPages.includes(name)) {
    return res.status(404).json({ error: 'Page not found' });
  }

  try {
    // Leggi il file HTML dalla directory private
    const filePath = join(process.cwd(), 'private', `${name}.html`);
    const htmlContent = readFileSync(filePath, 'utf-8');

    // Serve l'HTML con Content-Type corretto
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(htmlContent);
  } catch (error) {
    console.error(`Error serving page ${name}:`, error);
    return res.status(500).json({ error: 'Error loading page' });
  }
}

// Applica middleware in base al nome della pagina
async function protectedPageHandler(req, res) {
  const { name } = req.query;

  // Admin richiede requireAdmin
  if (name === 'admin') {
    return requireAdmin(pageHandler)(req, res);
  }

  // Bot e index richiedono requireAuth
  if (name === 'bot' || name === 'index') {
    return requireAuth(pageHandler)(req, res);
  }

  // Fallback: pagina non trovata
  return res.status(404).json({ error: 'Page not found' });
}

export default protectedPageHandler;
