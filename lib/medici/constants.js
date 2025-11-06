// ===== CONFIGURAZIONE E COSTANTI =====

export const URLS = {
  base: 'https://www.salutelazio.it',
  search: 'https://www.salutelazio.it/ricerca-medici',
  portlet: 'https://www.salutelazio.it/c/portal/render_portlet'
};

export const ASL_MAP = [
  { nome: 'Tutte', codice: '' },
  { nome: 'Roma 1', codice: '120201' },
  { nome: 'Roma 2', codice: '120202' },
  { nome: 'Roma 3', codice: '120203' },
  { nome: 'Roma 4', codice: '120204' },
  { nome: 'Roma 5', codice: '120205' },
  { nome: 'Roma 6', codice: '120206' },
  { nome: 'Frosinone', codice: '120112' },
  { nome: 'Latina', codice: '120111' },
  { nome: 'Rieti', codice: '120110' },
  { nome: 'Viterbo', codice: '120109' }
];

export const TIPO_MAP = [
  { nome: 'Medicina generale', codice: 'MMG' },
  { nome: 'Pediatra', codice: 'PLS' }
];

export const DEFAULT_HEADERS = {
  "accept": "text/html, */*",
  "accept-language": "it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7,de;q=0.6",
  "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
  "priority": "u=1, i",
  "sec-ch-ua": "\"Google Chrome\";v=\"141\", \"Not?A_Brand\";v=\"8\", \"Chromium\";v=\"141\"",
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": "\"Windows\"",
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "same-origin",
  "x-requested-with": "XMLHttpRequest"
};

// Helper functions
export function getAslNome(codice) {
  const asl = ASL_MAP.find(a => a.codice === codice);
  return asl ? asl.nome : codice || 'Tutte';
}

export function getTipoNome(codice) {
  const tipo = TIPO_MAP.find(t => t.codice === codice);
  return tipo ? tipo.nome : codice;
}

export function getStatoEmoji(assegnabilita) {
  if (!assegnabilita) return '⚪';

  const stato = assegnabilita.toLowerCase();

  if (stato.includes('assegnazione libera')) {
    return '🟢';
  } else if (stato.includes('deroga')) {
    return '🟠';
  } else if (stato.includes('non assegnabile')) {
    return '🔴';
  } else {
    return '⚪';
  }
}
