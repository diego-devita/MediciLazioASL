# SOMMARIO ANALISI ESTREMO DETTAGLIO - VISUALIZZAZIONI MEDICI ASL LAZIO

## DOCUMENTO COMPLETO SALVATO

**Percorso**: `/home/diego/Sandbox/MediciLazioASL/ANALISI_DETTAGLIATA_VISUALIZZAZIONI.md` (37KB)

**Contiene**:
- Analisi completa index.html (10 sezioni)
- Analisi completa bot.html (4 sezioni)
- Template system architecture
- 50+ block di codice esatto
- 100+ CSS classes documentate
- Tutti gli event listeners
- Strutture HTML generate
- Input/output data flow

---

## QUICK REFERENCE - FILE ANALIZZATI

### 1. INDEX.HTML - PAGINA RICERCA PRINCIPALE
**Percorso**: `/home/diego/Sandbox/MediciLazioASL/public/index.html` (1765 righe)

Sezioni critiche analizzate:
1. **displayResults()** (righe 1501-1520) - Aggiorna contatori e mostra risultati
2. **renderTable()** (righe 1426-1499) - Tabella desktop + tooltip interattivi
3. **renderCards()** (righe 1397-1424) - Card mobile responsive
4. **sortData()** (righe 1369-1395) - Sort case-insensitive per colonna
5. **Mobile Sort Control** (righe 1087-1096 HTML + 1742-1760 JS)
6. **results-summary** (righe 1061-1078) - Summary box con 4 contatori
7. **Tooltip System** (CSS 566-610) - Hover tooltip con 8 campi
8. **Sort Indicators** (CSS 489-504) - ↕ ↑ ↓ dinamici
9. **Event Listeners** (completi) - Table click, mobile select, form submit, cancel
10. **CSS Classes** (complete) - 40+ classes con responsive media queries

### 2. BOT.HTML - CONFIGURAZIONE BOT
**Percorso**: `/home/diego/Sandbox/MediciLazioASL/public/bot.html` (2800+ righe)

Sezioni critiche analizzate:
1. **stats-compact** (linee 186-204 template + CSS 485-593)
   - 4 stat box: Totale, Liberi, Deroga, Altri
   - Checkbox styling con SVG checkmark
   - Color variants: success, warning, info
   
2. **result-item** (linee 212-222 template + CSS 601-644)
   - Layout: nome + badge
   - Helper classes: row-libero, row-deroga, row-non-assegnabile
   - Badge colors: verde, arancione, rosso

3. **Filtri Interattivi** (riga 1542 - renderFilteredResults)
   - Filter buttons con contatori
   - Logica switch per categorie
   - Update contatori dinamici

4. **renderFilteredResults()** (riga 1542)
   - Filtra per stato assegnabilita
   - Render HTML da array
   - Event listeners per items

### 3. TEMPLATE ENGINE SYSTEM
**Percorso**: `/home/diego/Sandbox/MediciLazioASL/public/lib/`

1. **template-engine.js** - Parser template con:
   - Variabili: {{var}}, {{state.page}}, {{'string'}}, {{100}}
   - Helpers: {{uppercase this.cognome}}, {{emoji this.stato}}
   - Conditionals: {{#if}...{{/if}}
   - Loops: {{#each items}}...{{/each}}
   - Context loop: this, @index, @first, @last, @length

2. **medici-visualizer.js** - Componente con:
   - State interno: items, filteredItems, paginatedItems, sortColumn, sortDirection
   - Public API: setData(), sort(), filter(), goToPage(), setPageSize()
   - Helpers: uppercase, emoji, rowClass, badgeClass, countTotal, countLiberi, etc.
   - Event handlers: onSort, onFilter, onPageChange

3. **medici-visualizer-presets.js** - 3 preset:
   - **MAIN_SEARCH**: Tabella desktop + card mobile, no pagination
   - **BOT_COMPACT**: Lista compatta con stat-compact e badge
   - **MODAL_TEST**: Completo con progress, summary, pagination

---

## STRUTTURE DATI PRINCIPALI

### Input displayResults(data):
```javascript
{
  counters: {
    totali: number,
    assegnabili: number,
    conDeroga: number,
    nonAssegnabili: number
  },
  results: [
    {
      assegnabilita: string,  // "Assegnazione libera" | "Con deroga" | "Non assegnabile"
      cognome: string,
      nome: string,
      asl: string,
      codiceFiscale?: string,
      email?: string,
      indirizzo?: string,
      luogo?: string,
      luogoNascita?: string,
      identificativo?: string,
      codiceDistretto?: string,
      descrizioneDistretto?: string
    }
  ]
}
```

### Helper Stato → Output:
```javascript
assegnabilita = "Assegnazione libera" 
  → emoji: "🟢"
  → rowClass: "row-libero"
  → badgeClass: "badge-success"
  → badgeText: "Assegnabile"

assegnabilita = "Con deroga"
  → emoji: "🟠"
  → rowClass: "row-deroga"
  → badgeClass: "badge-warning"
  → badgeText: "Deroga"

assegnabilita = "Non assegnabile"
  → emoji: "🔴"
  → rowClass: "row-non-assegnabile"
  → badgeClass: "badge-default"
  → badgeText: "Non assegnabile"
```

---

## COLORI SISTEMA

| Stato | Colore | Emoji | Class |
|-------|--------|-------|-------|
| Libero | #22c55e (verde) | 🟢 | success |
| Deroga | #f59e0b (arancione) | 🟠 | warning |
| Non assegnabile | #ef4444 (rosso) | 🔴 | info |
| Neutro | #667eea (blu) | ⚪ | default |

---

## RESPONSIVE DESIGN

### Desktop (@media max-width: 768px = FALSE):
- `results-table` → display: block (visible)
- `results-cards` → display: none (hidden)
- `mobile-sort-control` → display: none (hidden)

### Mobile (@media max-width: 768px = TRUE):
- `results-table` → display: none (hidden)
- `results-cards` → display: block (visible)
- `mobile-sort-control` → display: flex (visible)

---

## JAVASCRIPT UTILITIES

### getStatoEmoji(assegnabilita):
```javascript
function getStatoEmoji(assegnabilita) {
  const stato = assegnabilita.toLowerCase();
  if (stato.includes('assegnazione libera')) return '🟢';
  if (stato.includes('deroga')) return '🟠';
  if (stato.includes('non assegnabile')) return '🔴';
  return '⚪';
}
```

### sortData(column):
```javascript
1. Se colonna = sortColumn → toggle asc ↔ desc
2. Altrimenti → nuova colonna, asc
3. Case-insensitive per stringhe
4. Comparazione: aVal > bVal ? 1 : aVal < bVal ? -1 : 0
5. Se desc → inverte risultato
```

---

## EVENT FLOW PRINCIPALES

### CLICK HEADER COLUMN:
```
click th[data-column] 
  → sortData(colonna) 
  → toggle sortDirection
  → renderTable()
  → update sort indicators (::after)
```

### CHANGE MOBILE SELECT:
```
change #mobileSortSelect 
  → sortData(select.value)
  → renderTable()
  → renderCards()
```

### CLICK MOBILE TOGGLE:
```
click #mobileSortToggle 
  → toggle mobileSortDirection
  → update button text (↑ ASC ↓ DESC)
  → sortData(colonna)
  → renderTable()
```

### HOVER TABLE ROW:
```
mouseover tr 
  → display .tooltip 
  → position: absolute, left: 50%, top: 100%
  → transform: translateX(-50%)
  → z-index: 1000
```

---

## CSS POSITIONING CRITICS

### Tooltip:
- **position**: absolute
- **z-index**: 1000
- **left**: 50% → centerato horizontalmente
- **top**: 100% → sotto row
- **transform**: translateX(-50%) → center correction
- **min-width**: 300px

### Multiselect Dropdown:
- **position**: absolute
- **top**: 100%
- **left**: 0, right: 0
- **max-height**: 300px
- **overflow-y**: auto

### Mobile Sort Control:
- **display**: none (desktop)
- **display**: flex (mobile @768px)
- **gap**: 10px
- **align-items**: center

---

## HELPERS DISPONIBILI NEL TEMPLATE

**Formatting**: uppercase, lowercase, capitalize
**Date/Time**: formatTime, formatDate
**Medici**: emoji, rowClass, badgeClass, badgeText
**State**: percentage, completed, total, httpRequests, elapsed
**Counters**: countTotal, countLiberi, countDeroga, countAltri
**Pagination**: currentPage, totalPages, totalItems, pageSize, isFirstPage, isLastPage
**Events**: onSort, onFilter, onPageChange, firstPage, prevPage, nextPage, lastPage, setPageSize

---

## REPLICA CON TEMPLATE SYSTEM

Per replicare esattamente con il template system:

### 1. Creare preset MAIN_SEARCH_REPLICA:
```javascript
{
  layout: {
    main: `<div class="medici-visualizer">
      {{slot:summary}}
      {{slot:content}}
    </div>`,
    slots: {
      summary: { template: `<div class="results-summary">...` },
      content: { template: `<table>...` }
    }
  },
  sorting: { enabled: false },
  pagination: { enabled: false }
}
```

### 2. Istanziare visualizer:
```javascript
const viz = new MediciVisualizer({
  preset: 'MAIN_SEARCH_REPLICA',
  container: '#results',
  data: apiData
});
```

### 3. Aggiornare dati:
```javascript
viz.setData(newResults);
```

### 4. Sorting (gestito da template):
```html
<th onclick="{{onSort 'cognome'}}">Cognome</th>
```

---

## PROSSIMI STEP PER MIGRAZIONE

1. Copiare HTML content/summary slot da template-engine
2. Implementare CSS classes in template
3. Implementare helpers per emoji, rowClass, badgeClass
4. Aggiornare sorting logic per click su header
5. Testare responsive (desktop vs mobile)
6. Validare tooltip positioning
7. Validare event flow completo

---

**Data analisi**: 11 novembre 2025
**Versione**: 1.0 - COMPLETO
**Stato**: PRONTO PER REPLICA CON TEMPLATE SYSTEM

