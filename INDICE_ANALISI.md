# INDICE COMPLETO - ANALISI ESTREMO DETTAGLIO VISUALIZZAZIONI

## DOCUMENTO PRINCIPALE

### File: `/home/diego/Sandbox/MediciLazioASL/ANALISI_DETTAGLIATA_VISUALIZZAZIONI.md` (37 KB)

#### SEZIONE 1: INDEX.HTML - PAGINA RICERCA PRINCIPALE

1. **displayResults()** (righe 1501-1520)
   - Scopo: Aggiorna contatori e rendering
   - Input: data { counters, results }
   - Output: DOM aggiornato + tabella/card
   - State modificato: currentData, sortColumn, sortDirection

2. **renderTable()** (righe 1426-1499)
   - Scopo: Renderizza tabella desktop e card mobile
   - Generazione HTML dinamica: <table class="results-table">
   - Tooltip con 8 campi: codiceFiscale, email, indirizzo, luogo, luogoNascita, identificativo, codiceDistretto, descrizioneDistretto
   - Event listeners per click su header

3. **renderCards()** (righe 1397-1424)
   - Scopo: Renderizza card mobile (hidden su desktop)
   - Struttura: card-header (emoji + name) + card-footer (stato + asl)
   - CSS: display: none (desktop), display: block (mobile @768px)

4. **sortData()** (righe 1369-1395)
   - Logica: Toggle direzione se stessa colonna, altrimenti reset asc
   - Case-insensitive per stringhe
   - Ri-render automatico tabella

5. **Mobile Sort Control** (HTML 1087-1096 + JS 1742-1760)
   - HTML: Select colonna + Button toggle direzione
   - CSS: display: none (desktop), display: flex (mobile)
   - Events: change select, click toggle

6. **results-summary** (HTML 1061-1078 + CSS 420-443)
   - 4 summary items: Totali (#667eea), Liberi (#22c55e), Deroga (#f59e0b), Altro (#ef4444)
   - Update: displayResults() → getElementById().textContent = data.counters.*

7. **Tooltip System** (CSS 566-610)
   - Position: absolute, left: 50%, top: 100%, transform: translateX(-50%)
   - z-index: 1000
   - Trigger: tbody tr:hover
   - Contenuto condizionale per 8 campi medico

8. **Sort Indicators** (CSS 489-504)
   - th::after content: ' ↕' (default), ' ↑' (sort-asc), ' ↓' (sort-desc)
   - Opacity: 0.3 (default), 1 (sorted)
   - Font-size: 0.8rem

9. **Event Listeners** (completi)
   - Table header click: sortData(colonna)
   - Mobile select change: sortData(value)
   - Mobile toggle click: toggle direzione + sortData()
   - ASL checkbox change: updateAslHeaderText() + checkCombinationsWarning()
   - ASL header click: toggleDropdown()
   - Form submit: search API call
   - Cancel buttons: abort search

10. **CSS Classes** (40+ complete)
    - Contenitori: container, header, content, results
    - Tabella: results-table, results-table thead, results-table th, results-table td
    - Celle: emoji-cell, nome-cell
    - Tooltip: tooltip, tooltip-title, tooltip-row, tooltip-label, tooltip-value
    - Summary: results-summary, summary-item, summary-number, summary-label
    - Mobile: results-cards, result-card, card-header, card-emoji, card-name, card-footer, card-stato, card-asl
    - Mobile sort: mobile-sort-control, mobile-sort-label, mobile-sort-select, mobile-sort-toggle
    - Multiselect: multiselect-container, multiselect-header, multiselect-dropdown, multiselect-option

#### SEZIONE 2: BOT.HTML - CONFIGURAZIONE BOT

1. **stats-compact** (template 186-204 + CSS 485-593)
   - Template: {{countTotal}}, {{countLiberi}}, {{countDeroga}}, {{countAltri}}
   - HTML: 4 div.stat-compact (default, success, warning, info)
   - CSS ::before: checkbox styling con SVG checkmark bianco
   - Colors: default #667eea, success #22c55e, warning #f59e0b, info #ef4444

2. **result-item** (template 212-222 + CSS 601-644)
   - Template: {{uppercase this.cognome}}, {{badgeText this.assegnabilita}}, {{this.asl}}
   - HTML: flex container (name + ASL) + badge
   - Helper classes: {{rowClass this.assegnabilita}}, {{badgeClass this.assegnabilita}}
   - Colors: libero verde, deroga arancione, non-assegnabile default

3. **Filtri Interattivi** (riga 1542)
   - Filter buttons: all, liberi, deroga, non-assegnabili
   - Logica: switch statement su activeFilterKey
   - Update counters dinamicamente

4. **renderFilteredResults()** (riga 1542)
   - Input: cognomiData (array medici)
   - Filter: include('assegnazione libera'), include('deroga'), esclude derivati
   - Output: HTML map di result-item
   - Events: item click per onMedicoSelected()

#### SEZIONE 3: TEMPLATE SYSTEM ARCHITECTURE

**template-engine.js**:
- Render: template string + context object
- Variabili: {{var}}, {{path.to.value}}, {{'string'}}, {{100}}, {{true}}, {{false}}
- Helpers: {{helper arg1 arg2}}
- Conditionals: {{#if condition}}...{{/if}}
- Loops: {{#each array}}...{{/each}} (context: this, @index, @first, @last, @length)

**medici-visualizer.js**:
- State: items, filteredItems, paginatedItems, sortColumn, sortDirection, activeFilters, isSearching, progress
- API: setData(), addData(), sort(), filter(), goToPage(), setPageSize(), updateProgress(), completeProgress(), getState()
- Helpers: uppercase, lowercase, capitalize, formatTime, formatDate, emoji, rowClass, badgeClass, badgeText, counters, pagination, events

**medici-visualizer-presets.js**:
- MAIN_SEARCH: tabella desktop + card mobile, no pagination
- BOT_COMPACT: lista compatta con stat-compact e badge
- MODAL_TEST: completo con progress, summary, pagination

---

## DOCUMENTO SECONDARIO

### File: `/home/diego/Sandbox/MediciLazioASL/SOMMARIO_ANALISI_VISUALIZZAZIONI.md` (8.4 KB)

**Contenuto**:
- Quick reference file analizzati
- Strutture dati principali (input/output)
- Tabella colori sistema
- Responsive design breakpoints
- JavaScript utilities (getStatoEmoji, sortData)
- Event flow principales (4 scenari)
- CSS positioning critics
- Helpers disponibili nel template
- Replica con template system (step-by-step)
- Prossimi step per migrazione

---

## FILE SORGENTE ANALIZZATI

### 1. `/home/diego/Sandbox/MediciLazioASL/public/index.html` (1765 righe)
**Sezioni rilevanti**:
- Linee 1-8: DOCTYPE + meta
- Linee 8-892: CSS inline (40+ classes)
- Linee 894-1113: HTML layout principale
- Linee 1118-1762: JavaScript inline

**Funzioni JavaScript**:
- displayResults() - linee 1501-1520
- renderTable() - linee 1426-1499
- renderCards() - linee 1397-1424
- sortData() - linee 1369-1395
- getStatoEmoji() - linea 1160
- showLoading(), hideLoading(), showError(), hideError() - linee 1168-1209
- checkCombinationsWarning() - linee 1295-1326
- Mobile sort control - linee 1742-1760
- ASL multiselect - linee 1643-1739
- Form submit handler - linee 1522-1641

### 2. `/home/diego/Sandbox/MediciLazioASL/public/bot.html` (2800+ righe)
**Sezioni rilevanti**:
- Linee 1-1101: CSS inline (100+ classes)
- Linee 1103-2840: HTML + JavaScript

**CSS Classes bot.html**:
- stats-compact - linee 485-593
- result-item - linee 601-644
- result-item-change - linee 646-678
- results-toggle - linee 681-728
- toast notifications - linee 731-804
- modal - linee 807-905
- notification-toggle - linee 912-960

**JavaScript Functions**:
- renderFilteredResults() - riga 1542
- renderCognomi() - riga 1613
- Filter event listeners - riga 2620+
- Tab switching - riga 2087+

### 3. `/home/diego/Sandbox/MediciLazioASL/public/lib/template-engine.js` (178 righe)
- render() - linee 17-40
- _processConditionals() - linee 45-52
- _processEach() - linee 57-80
- _processVariables() - linee 85-109
- _resolveValue() - linee 114-141
- _isTruthy() - linee 146-154

### 4. `/home/diego/Sandbox/MediciLazioASL/public/lib/medici-visualizer.js` (653 righe)
- constructor() - linee 6-34
- _mergeConfig() - linee 65-75
- _createHelpers() - linee 178-351
- render() - linee 366-379
- _renderSlot() - linee 407-440
- sort() - linee 535-549
- filter() - linee 554-562
- goToPage() - linee 567-575
- updateProgress() - linee 589-597

### 5. `/home/diego/Sandbox/MediciLazioASL/public/lib/medici-visualizer-presets.js` (431 righe)
- MAIN_SEARCH preset - linee 11-167
- BOT_COMPACT preset - linee 173-233
- MODAL_TEST preset - linee 239-424

---

## STRUTTURE DATI CHIAVE

### displayResults() Input:
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
      assegnabilita: "Assegnazione libera" | "Con deroga" | "Non assegnabile",
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

### assegnabilita → Helper Mapping:
- "Assegnazione libera" → emoji: "🟢", rowClass: "row-libero", badgeClass: "badge-success", badgeText: "Assegnabile"
- "Con deroga" → emoji: "🟠", rowClass: "row-deroga", badgeClass: "badge-warning", badgeText: "Deroga"
- "Non assegnabile" → emoji: "🔴", rowClass: "row-non-assegnabile", badgeClass: "badge-default", badgeText: "Non assegnabile"

---

## COLORI ESATTI

| Elemento | Colore | Hex | RGB |
|----------|--------|-----|-----|
| Assegnabile (libero) | Verde | #22c55e | rgb(34, 197, 94) |
| Con deroga | Arancione | #f59e0b | rgb(245, 158, 11) |
| Non assegnabile | Rosso | #ef4444 | rgb(239, 68, 68) |
| Neutro/Default | Blu | #667eea | rgb(102, 126, 234) |
| Primary accent | Blu scuro | #764ba2 | rgb(118, 75, 162) |

---

## RESPONSIVE BREAKPOINT

**Max-width: 768px**

Desktop (> 768px):
- results-table: display: block
- results-cards: display: none
- mobile-sort-control: display: none

Mobile (<= 768px):
- results-table: display: none !important
- results-cards: display: block
- mobile-sort-control: display: flex

---

## CHECKLIST REPLICA TEMPLATE SYSTEM

[] 1. Copiare CSS from index.html in style tag template
[] 2. Implementare preset MAIN_SEARCH_REPLICA
[] 3. Implementare slot:summary con 4 stat items
[] 4. Implementare slot:content con tabella e card mobile
[] 5. Aggiungere helpers: emoji, rowClass, badgeClass, badgeText
[] 6. Implementare sorting logic in template click handler
[] 7. Implementare mobile sort select/toggle
[] 8. Testare responsive design (@768px)
[] 9. Validare tooltip positioning e visibility
[] 10. Validare event flow completo
[] 11. Testare su bot.html con BOT_COMPACT preset
[] 12. Integrazione filtering logica

---

## RIFERIMENTI RAPIDI

### Cercare funzione displayResults():
File: `/home/diego/Sandbox/MediciLazioASL/public/index.html`
Linea: 1501
Lunghezza: 20 righe

### Cercare CSS classe emoji-cell:
File: `/home/diego/Sandbox/MediciLazioASL/public/index.html`
Linea: 550
Proprietà: font-size, text-align, width

### Cercare sort indicator (↕ ↑ ↓):
File: `/home/diego/Sandbox/MediciLazioASL/public/index.html`
Linea: 489
CSS: th::after content

### Cercare stats-compact:
File: `/home/diego/Sandbox/MediciLazioASL/public/bot.html`
Linea: 486
CSS: display flex, 4 item variants

### Cercare result-item:
File: `/home/diego/Sandbox/MediciLazioASL/public/bot.html`
Linea: 601
CSS: flex layout, border-left colors, badge styling

---

**CREATO**: 11 novembre 2025
**VERSIONE ANALISI**: 1.0 - COMPLETO E VERIFICATO
**STATUS**: PRONTO PER IMPLEMENTAZIONE TEMPLATE SYSTEM

