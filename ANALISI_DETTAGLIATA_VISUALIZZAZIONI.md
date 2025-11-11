# ANALISI ESTREMO DETTAGLIO - VISUALIZZAZIONI MEDICI ASL LAZIO

## INDICE
1. [index.html - Pagina Ricerca Principale](#indexhtml)
2. [bot.html - Configurazione Bot](#bothtml)
3. [Template System Architecture](#template-system)

---

## INDEX.HTML - PAGINA RICERCA PRINCIPALE

### 1. FUNZIONE displayResults (linee 1501-1520)

**SCOPO**: Visualizza i risultati della ricerca sulla pagina, aggiornando contatori, dati e rendering tabella/card.

**CODICE COMPLETO**:
```javascript
function displayResults(data) {
  currentData = data;
  sortColumn = null;
  sortDirection = 'asc';

  // Calcola i contatori per categoria
  // Usa i contatori dall'API
  document.getElementById('totalCount').textContent = data.counters.totali;
  document.getElementById('liberiCount').textContent = data.counters.assegnabili;
  document.getElementById('derogaCount').textContent = data.counters.conDeroga;
  document.getElementById('altroCount').textContent = data.counters.nonAssegnabili;

  if (data.results.length === 0) {
    document.getElementById('mediciList').innerHTML = '<p style="text-align: center; color: #777; padding: 20px;">Nessun medico trovato con i criteri specificati.</p>';
  } else {
    renderTable(data);
  }

  results.style.display = 'block';
}
```

**FLUSSO DATI**:
- INPUT: `data` = { counters: { totali, assegnabili, conDeroga, nonAssegnabili }, results: [...] }
- OUTPUT: DOM aggiornato con:
  - `#totalCount`: numero totale medici
  - `#liberiCount`: medici assegnabili liberamente
  - `#derogaCount`: medici con deroga
  - `#altroCount`: medici non assegnabili
  - `#mediciList`: tabella/card renderizzate

**STATE MODIFICATO**:
- `currentData = data` → memorizza dati attuali
- `sortColumn = null` → reset colonna ordinamento
- `sortDirection = 'asc'` → reset direzione ordinamento
- `results.style.display = 'block'` → mostra sezione risultati

---

### 2. FUNZIONE renderTable (linee 1426-1499)

**SCOPO**: Renderizza tabella desktop e card mobile dai dati medici.

**CODICE COMPLETO**:
```javascript
function renderTable(data) {
  const mediciList = document.getElementById('mediciList');
  mediciList.innerHTML = '';

  // Render tabella desktop
  const table = document.createElement('table');
  table.className = 'results-table';

  const columns = [
    { key: 'assegnabilita', label: '', isEmoji: true },
    { key: 'cognome', label: 'Cognome' },
    { key: '', label: '', isHidden: true }, // Colonna fittizia per tooltip
    { key: 'nome', label: 'Nome' },
    { key: 'asl', label: 'ASL' },
    { key: 'assegnabilita', label: 'Stato' }
  ];

  table.innerHTML = `
    <thead>
      <tr>
        ${columns.map(col => {
          if (col.isHidden) {
            return `<th style="width: 0; padding: 0; border: none;"></th>`;
          }
          const sortClass = sortColumn === col.key ? `sort-${sortDirection}` : '';
          return `<th class="${sortClass}" data-column="${col.key}">${col.label}</th>`;
        }).join('')}
      </tr>
    </thead>
    <tbody>
        ${data.results.map(medico => {
          const emoji = getStatoEmoji(medico.assegnabilita);

          // Costruisci tooltip con tutti i dati disponibili
          let tooltipContent = `
            <div class="tooltip-title">Dettagli completi</div>
            ${medico.codiceFiscale ? `<div class="tooltip-row"><span class="tooltip-label">Codice Fiscale:</span><span class="tooltip-value">${medico.codiceFiscale}</span></div>` : ''}
            ${medico.email ? `<div class="tooltip-row"><span class="tooltip-label">Email:</span><span class="tooltip-value">${medico.email}</span></div>` : ''}
            ${medico.indirizzo ? `<div class="tooltip-row"><span class="tooltip-label">Indirizzo:</span><span class="tooltip-value">${medico.indirizzo}</span></div>` : ''}
            ${medico.luogo ? `<div class="tooltip-row"><span class="tooltip-label">Luogo:</span><span class="tooltip-value">${medico.luogo}</span></div>` : ''}
            ${medico.luogoNascita ? `<div class="tooltip-row"><span class="tooltip-label">Luogo Nascita:</span><span class="tooltip-value">${medico.luogoNascita}</span></div>` : ''}
            ${medico.identificativo ? `<div class="tooltip-row"><span class="tooltip-label">Identificativo:</span><span class="tooltip-value">${medico.identificativo}</span></div>` : ''}
            ${medico.codiceDistretto ? `<div class="tooltip-row"><span class="tooltip-label">Codice Distretto:</span><span class="tooltip-value">${medico.codiceDistretto}</span></div>` : ''}
            ${medico.descrizioneDistretto ? `<div class="tooltip-row"><span class="tooltip-label">Distretto:</span><span class="tooltip-value">${medico.descrizioneDistretto}</span></div>` : ''}
          `;

          return `
            <tr>
              <td class="emoji-cell">${emoji}</td>
              <td class="nome-cell">${medico.cognome}</td>
              <td style="position: relative; width: 0; padding: 0;">
                <div class="tooltip">${tooltipContent}</div>
              </td>
              <td>${medico.nome}</td>
              <td>${medico.asl}</td>
              <td>${medico.assegnabilita}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    `;

  mediciList.appendChild(table);

  // Aggiungi event listener per il sorting (desktop)
  table.querySelectorAll('th[data-column]').forEach(th => {
    th.addEventListener('click', () => {
      sortData(th.dataset.column);
    });
  });

  // Render cards mobile
  renderCards(data);
}
```

**STRUTTURA HTML GENERATA**:

```html
<table class="results-table">
  <thead>
    <tr>
      <th class="sort-asc" data-column="assegnabilita"></th>
      <th class="sort-asc" data-column="cognome">Cognome</th>
      <th style="width: 0; padding: 0; border: none;"></th>
      <th data-column="nome">Nome</th>
      <th data-column="asl">ASL</th>
      <th data-column="assegnabilita">Stato</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td class="emoji-cell">🟢</td>
      <td class="nome-cell">ROSSI</td>
      <td style="position: relative; width: 0; padding: 0;">
        <div class="tooltip">
          <div class="tooltip-title">Dettagli completi</div>
          <div class="tooltip-row">
            <span class="tooltip-label">Codice Fiscale:</span>
            <span class="tooltip-value">RSSMRC80A01H501J</span>
          </div>
          <!-- altri campi -->
        </div>
      </td>
      <td>MARIO</td>
      <td>Roma 1</td>
      <td>Assegnazione libera</td>
    </tr>
  </tbody>
</table>
```

**CSS CLASSES APPLICATE**:
- `results-table` → tabella principale con gradient header
- `emoji-cell` → td con emoji centrato (width: 50px)
- `nome-cell` → td cognome in bold (#333)
- `tooltip` → div tooltip nascosto (display: none, z-index: 1000)
- `tooltip-title` → titolo tooltip (#667eea, 1rem, font-weight: 600)
- `tooltip-row` → riga tooltip (flex, font-size: 0.875rem)
- `tooltip-label` → label tooltip (min-width: 140px, font-weight: 600)
- `tooltip-value` → valore tooltip (#333)
- `sort-asc` / `sort-desc` → indicatori sort con ::after

**EVENT LISTENERS**:
```javascript
table.querySelectorAll('th[data-column]').forEach(th => {
  th.addEventListener('click', () => {
    sortData(th.dataset.column);
  });
});
```

---

### 3. FUNZIONE renderCards (linee 1397-1424)

**SCOPO**: Renderizza card per visualizzazione mobile.

**CODICE COMPLETO**:
```javascript
function renderCards(data) {
  const mediciList = document.getElementById('mediciList');

  const cardsContainer = document.createElement('div');
  cardsContainer.className = 'results-cards';

  data.results.forEach(medico => {
    const emoji = getStatoEmoji(medico.assegnabilita);

    const card = document.createElement('div');
    card.className = 'result-card';

    card.innerHTML = `
      <div class="card-header">
        <div class="card-emoji">${emoji}</div>
        <div class="card-name">${medico.cognome} ${medico.nome}</div>
      </div>
      <div class="card-footer">
        <div class="card-stato">${medico.assegnabilita}</div>
        <div class="card-asl">${medico.asl}</div>
      </div>
    `;

    cardsContainer.appendChild(card);
  });

  mediciList.appendChild(cardsContainer);
}
```

**STRUTTURA HTML GENERATA**:

```html
<div class="results-cards">
  <div class="result-card">
    <div class="card-header">
      <div class="card-emoji">🟢</div>
      <div class="card-name">ROSSI MARIO</div>
    </div>
    <div class="card-footer">
      <div class="card-stato">Assegnazione libera</div>
      <div class="card-asl">Roma 1</div>
    </div>
  </div>
  <!-- altri card -->
</div>
```

**CSS CLASSES**:
- `results-cards` → display: none (mobile: display: block)
- `result-card` → border: 2px solid #e0e0e0, padding: 15px, margin-bottom: 12px
- `card-header` → display: flex, gap: 10px, align-items: center
- `card-emoji` → font-size: 1.5rem
- `card-name` → font-size: 1.1rem, font-weight: 600
- `card-footer` → display: flex, justify-content: space-between, border-top: 1px solid #f0f0f0
- `card-stato` → font-size: 0.85rem, color: #666
- `card-asl` → font-size: 0.85rem, color: #555, font-weight: 600

---

### 4. FUNZIONE sortData (linee 1369-1395)

**SCOPO**: Ordina i dati per colonna e direzione, aggiorna view.

**CODICE COMPLETO**:
```javascript
function sortData(column) {
  if (!currentData) return;

  if (sortColumn === column) {
    sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
  } else {
    sortColumn = column;
    sortDirection = 'asc';
  }

  currentData.results.sort((a, b) => {
    let aVal = a[column] || '';
    let bVal = b[column] || '';

    // Conversione a lowercase per stringhe
    if (typeof aVal === 'string') aVal = aVal.toLowerCase();
    if (typeof bVal === 'string') bVal = bVal.toLowerCase();

    if (sortDirection === 'asc') {
      return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
    } else {
      return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
    }
  });

  renderTable(currentData);
}
```

**LOGICA DI SORT**:
1. Se colonna = sortColumn → toggle direzione (asc ↔ desc)
2. Altrimenti → nuova colonna, direzione = asc
3. Case-insensitive per stringhe
4. Comparazione: aVal > bVal ? 1 : aVal < bVal ? -1 : 0
5. Se desc → inverte risultato comparazione

**VARIABILI GLOBALI MODIFICATE**:
- `sortColumn` → colonna attuale
- `sortDirection` → 'asc' | 'desc'
- `currentData.results` → array ordinato

---

### 5. MOBILE SORT CONTROL (linee 1087-1096 HTML + 1742-1760 JS)

**HTML STRUCTURE** (riga 1087-1096):
```html
<div class="mobile-sort-control">
  <span class="mobile-sort-label">Ordina per:</span>
  <select id="mobileSortSelect" class="mobile-sort-select">
    <option value="cognome">Cognome</option>
    <option value="nome">Nome</option>
    <option value="asl">ASL</option>
    <option value="assegnabilita">Stato</option>
  </select>
  <button id="mobileSortToggle" class="mobile-sort-toggle">↑ ASC</button>
</div>
```

**CSS CLASSES** (linee 740-773):
```css
.mobile-sort-control {
  display: none;  /* desktop: none, mobile: flex */
  margin-bottom: 20px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
  gap: 10px;
  align-items: center;
}

.mobile-sort-label {
  font-weight: 600;
  color: #555;
  white-space: nowrap;
}

.mobile-sort-select {
  flex: 1;
  padding: 8px 12px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 0.95rem;
}

.mobile-sort-toggle {
  padding: 8px 16px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  white-space: nowrap;
}
```

**JAVASCRIPT** (linee 1742-1760):
```javascript
const mobileSortSelect = document.getElementById('mobileSortSelect');
const mobileSortToggle = document.getElementById('mobileSortToggle');
let mobileSortDirection = 'asc';

mobileSortSelect.addEventListener('change', () => {
  if (currentData) {
    sortData(mobileSortSelect.value);
  }
});

mobileSortToggle.addEventListener('click', () => {
  mobileSortDirection = mobileSortDirection === 'asc' ? 'desc' : 'asc';
  mobileSortToggle.textContent = mobileSortDirection === 'asc' ? '↑ ASC' : '↓ DESC';

  if (currentData) {
    sortDirection = mobileSortDirection;
    sortData(sortColumn || mobileSortSelect.value);
  }
});
```

**EVENT LISTENERS**:
- `change` su select → sortData(nuova colonna)
- `click` su toggle → toggle direzione, update testo, sortData()

---

### 6. STRUTTURA HTML RESULTS-SUMMARY (linee 1061-1078)

**CODICE**:
```html
<div class="results-summary">
  <div class="summary-item">
    <div class="summary-number" id="totalCount">0</div>
    <div class="summary-label">Totali</div>
  </div>
  <div class="summary-item">
    <div class="summary-number" style="color: #22c55e;" id="liberiCount">0</div>
    <div class="summary-label">Assegnabili liberamente</div>
  </div>
  <div class="summary-item">
    <div class="summary-number" style="color: #f59e0b;" id="derogaCount">0</div>
    <div class="summary-label">Con deroga</div>
  </div>
  <div class="summary-item">
    <div class="summary-number" style="color: #ef4444;" id="altroCount">0</div>
    <div class="summary-label">Altro</div>
  </div>
</div>
```

**CSS** (linee 420-443):
```css
.results-summary {
  background: #f5f5f5;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
  display: flex;
  justify-content: space-around;
  text-align: center;
}

.summary-item {
  flex: 1;
}

.summary-number {
  font-size: 2rem;
  font-weight: bold;
  color: #667eea;  /* default */
}

.summary-label {
  font-size: 0.875rem;
  color: #777;
}
```

**IDs PER AGGIORNAMENTO**:
- `totalCount` → data.counters.totali
- `liberiCount` → data.counters.assegnabili (color: #22c55e)
- `derogaCount` → data.counters.conDeroga (color: #f59e0b)
- `altroCount` → data.counters.nonAssegnabili (color: #ef4444)

---

### 7. TOOLTIP SYSTEM

**POSIZIONAMENTO** (CSS linee 566-610):
```css
.tooltip {
  display: none;  /* visible on tr:hover */
  position: absolute;
  z-index: 1000;
  background: white;
  border: 2px solid #667eea;
  border-radius: 8px;
  padding: 15px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  min-width: 300px;
  left: 50%;
  top: 100%;
  transform: translateX(-50%);
  margin-top: 5px;
}

.results-table tbody tr:hover .tooltip {
  display: block;
}
```

**STRUTTURA TOOLTIP** (da renderTable):
```html
<div class="tooltip">
  <div class="tooltip-title">Dettagli completi</div>
  <div class="tooltip-row">
    <span class="tooltip-label">Codice Fiscale:</span>
    <span class="tooltip-value">RSSMRC80A01H501J</span>
  </div>
  <div class="tooltip-row">
    <span class="tooltip-label">Email:</span>
    <span class="tooltip-value">mario.rossi@example.com</span>
  </div>
  <!-- ... altri campi -->
</div>
```

**CSS CLASSES**:
- `tooltip-title` → color: #667eea, margin-bottom: 10px, border-bottom: 2px
- `tooltip-row` → display: flex, padding: 5px 0
- `tooltip-label` → font-weight: 600, min-width: 140px
- `tooltip-value` → color: #333

**CAMPI INCLUSI** (renderizzati condizionalmente):
1. Codice Fiscale
2. Email
3. Indirizzo
4. Luogo
5. Luogo Nascita
6. Identificativo
7. Codice Distretto
8. Descrizione Distretto

---

### 8. INDICATORI SORT (↕ ↑ ↓)

**POSIZIONAMENTO** (CSS linee 489-504):
```css
.results-table th::after {
  content: ' ↕';  /* default: entrambe frecce */
  opacity: 0.3;
  font-size: 0.8rem;
  vertical-align: top;
}

.results-table th.sort-asc::after {
  content: ' ↑';  /* click 1: freccia su */
  opacity: 1;
}

.results-table th.sort-desc::after {
  content: ' ↓';  /* click 2: freccia giu */
  opacity: 1;
}
```

**LOGICA**:
- Default: content = ' ↕' (opacity: 0.3)
- sort-asc: content = ' ↑' (opacity: 1)
- sort-desc: content = ' ↓' (opacity: 1)
- Solo TH con data-column mostra indicatore
- TH vuota (tooltip) non ha data-column

---

### 9. TUTTI GLI EVENT LISTENERS

**SORTING** (tabella desktop):
```javascript
table.querySelectorAll('th[data-column]').forEach(th => {
  th.addEventListener('click', () => {
    sortData(th.dataset.column);
  });
});
```

**MOBILE SORT SELECT**:
```javascript
mobileSortSelect.addEventListener('change', () => {
  if (currentData) {
    sortData(mobileSortSelect.value);
  }
});
```

**MOBILE SORT TOGGLE**:
```javascript
mobileSortToggle.addEventListener('click', () => {
  mobileSortDirection = mobileSortDirection === 'asc' ? 'desc' : 'asc';
  mobileSortToggle.textContent = mobileSortDirection === 'asc' ? '↑ ASC' : '↓ DESC';
  if (currentData) {
    sortDirection = mobileSortDirection;
    sortData(sortColumn || mobileSortSelect.value);
  }
});
```

**ASL MULTISELECT DROPDOWN**:
```javascript
aslHeader.addEventListener('click', (e) => {
  e.stopPropagation();
  const isOpen = aslDropdown.classList.contains('open');
  if (isOpen) {
    closeAslDropdown();
  } else {
    openAslDropdown();
  }
});

aslCheckboxes.forEach(cb => {
  cb.addEventListener('change', () => {
    updateAslHeaderText();
    checkCombinationsWarning();
  });
});

aslDropdown.addEventListener('click', (e) => {
  e.stopPropagation();
});

document.addEventListener('click', (e) => {
  if (!document.getElementById('aslMultiselectBase').contains(e.target)) {
    closeAslDropdownBase();
    updateAslHeaderTextBase();
  }
  if (!document.getElementById('aslMultiselect').contains(e.target)) {
    closeAslDropdown();
    updateAslHeaderText();
  }
});
```

**FORM SUBMIT**:
```javascript
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  // ... search logic
});
```

**COMBINATION WARNING LISTENERS**:
```javascript
const cognomiFields = [
  document.getElementById('cognomi-base'),
  document.getElementById('cognomi'),
  document.getElementById('cap'),
  document.getElementById('nomi')
];

cognomiFields.forEach(field => {
  if (field) {
    field.addEventListener('input', checkCombinationsWarning);
  }
});

document.querySelectorAll('input[name="searchMode"]').forEach(radio => {
  radio.addEventListener('change', checkCombinationsWarning);
});

document.querySelectorAll('input[type="checkbox"][id^="asl_"]').forEach(checkbox => {
  checkbox.addEventListener('change', checkCombinationsWarning);
});
```

**CANCEL BUTTONS**:
```javascript
cancelBtn.addEventListener('click', () => {
  if (batchClient) {
    batchClient.abort();
    hideBatchProgress();
    showError('Ricerca annullata dall\'utente.');
  }
});

cancelBtnStandard.addEventListener('click', () => {
  if (batchClient) {
    batchClient.abort();
    hideLoading();
    showError('Ricerca annullata dall\'utente.');
  }
});
```

---

### 10. TUTTE LE CSS CLASSES USATE

**CONTENITORI PRINCIPALI**:
- `container` → max-width: 900px, margin: 0 auto, background: white
- `header` → gradient background, padding: 40px 30px
- `content` → padding: 30px
- `results` → margin-top: 30px

**TABELLA**:
- `results-table` → width: 100%, border-collapse: collapse
- `results-table thead` → gradient background
- `results-table th` → padding: 15px, cursor: pointer, position: relative
- `results-table th::after` → indicatori sort
- `results-table th.sort-asc` → freccia su
- `results-table th.sort-desc` → freccia giu
- `results-table td` → padding: 12px 15px, border-bottom: 1px solid
- `results-table tbody tr:hover` → background: #f9f9f9

**TOOLTIP**:
- `tooltip` → display: none (hover: block), position: absolute, z-index: 1000
- `tooltip-title` → font-weight: 600, color: #667eea
- `tooltip-row` → display: flex, padding: 5px 0
- `tooltip-label` → font-weight: 600, color: #555, min-width: 140px
- `tooltip-value` → color: #333

**CELLE SPECIALI**:
- `emoji-cell` → font-size: 1.2rem, text-align: center, width: 50px
- `nome-cell` → font-weight: 600, color: #333

**SUMMARY**:
- `results-summary` → background: #f5f5f5, display: flex, justify-content: space-around
- `summary-item` → flex: 1, text-align: center
- `summary-number` → font-size: 2rem, font-weight: bold, color: #667eea
- `summary-label` → font-size: 0.875rem, color: #777

**MOBILE SORT**:
- `mobile-sort-control` → display: none (mobile: flex)
- `mobile-sort-label` → font-weight: 600
- `mobile-sort-select` → flex: 1, padding: 8px 12px
- `mobile-sort-toggle` → background: #667eea, color: white

**CARD MOBILE**:
- `results-cards` → display: none (mobile: block)
- `result-card` → background: white, border: 2px solid #e0e0e0
- `card-header` → display: flex, align-items: center, gap: 10px
- `card-emoji` → font-size: 1.5rem
- `card-name` → font-size: 1.1rem, font-weight: 600
- `card-footer` → display: flex, justify-content: space-between, border-top: 1px
- `card-stato` → font-size: 0.85rem, color: #666
- `card-asl` → font-size: 0.85rem, font-weight: 600

**MULTISELECT ASL**:
- `multiselect-container` → position: relative, width: 100%
- `multiselect-header` → padding: 12px, border: 2px solid #e0e0e0
- `multiselect-header.open` → border-bottom-radius: 0
- `multiselect-header-text` → flex: 1, color: #999
- `multiselect-header-text.has-selection` → color: #333
- `multiselect-header-arrow` → transition: transform 0.3s
- `multiselect-dropdown` → position: absolute, top: 100%, max-height: 300px
- `multiselect-dropdown.open` → display: block
- `multiselect-option` → padding: 12px, display: flex, gap: 10px
- `multiselect-option input` → width: 18px, height: 18px

**LOADING/ERROR/SUCCESS**:
- `loading` → text-align: center, padding: 20px, display: flex, gap: 10px
- `error` → background: #fee, border-left: 4px solid #c33
- `success` → background: #efe, border-left: 4px solid #3c3
- `warning-box` → background: #fff3cd, border-left: 4px solid #ffc107

---

## BOT.HTML - CONFIGURAZIONE BOT

### 1. SEZIONE STAT-COMPACT (linee 186-204 template + CSS 485-583)

**PRESET TEMPLATE**:
```html
<div class="stats-compact">
  <div class="stat-compact active">
    <span class="stat-compact-value">{{countTotal}}</span>
    <span class="stat-compact-label">Totale</span>
  </div>
  <div class="stat-compact stat-success active">
    <span class="stat-compact-value">{{countLiberi}}</span>
    <span class="stat-compact-label">Liberi</span>
  </div>
  <div class="stat-compact stat-warning active">
    <span class="stat-compact-value">{{countDeroga}}</span>
    <span class="stat-compact-label">Deroga</span>
  </div>
  <div class="stat-compact stat-info active">
    <span class="stat-compact-value">{{countAltri}}</span>
    <span class="stat-compact-label">Altri</span>
  </div>
</div>
```

**CSS COMPLETO** (linee 485-593):
```css
/* Statistiche compatte */
.stats-compact {
  display: flex;
  gap: 10px;
  margin: 15px 0;
  flex-wrap: nowrap;
}

.stat-compact {
  background: #f9f9f9;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  padding: 8px 12px;
  flex: 1;
  min-width: 0;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.stat-compact:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.stat-compact::before {
  content: '';
  width: 16px;
  height: 16px;
  border: 2px solid #999;
  border-radius: 3px;
  display: inline-block;
  margin-right: 4px;
  transition: all 0.2s;
}

.stat-compact.active::before {
  background: #667eea;
  border-color: #667eea;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='20 6 9 17 4 12'%3E%3C/polyline%3E%3C/svg%3E");
  background-size: 12px;
  background-position: center;
  background-repeat: no-repeat;
}

/* Color variants */
.stat-compact.stat-success.active::before {
  background-color: #22c55e;
  border-color: #22c55e;
}

.stat-compact.stat-warning.active::before {
  background-color: #f59e0b;
  border-color: #f59e0b;
}

.stat-compact.stat-info.active::before {
  background-color: #ef4444;
  border-color: #ef4444;
}

.stat-compact.stat-success {
  border-color: #22c55e;
  background: #f0fdf4;
}

.stat-compact.stat-warning {
  border-color: #f59e0b;
  background: #fffbeb;
}

.stat-compact.stat-info {
  border-color: #ef4444;
  background: #fef2f2;
}

.stat-compact-value {
  font-size: 1.7em;
  font-weight: 700;
  color: #667eea;
}

.stat-success .stat-compact-value {
  color: #22c55e;
}

.stat-warning .stat-compact-value {
  color: #f59e0b;
}

.stat-info .stat-compact-value {
  color: #ef4444;
}

.stat-compact-label {
  color: #666;
  font-size: 0.8rem;
  font-weight: 600;
  vertical-align: text-bottom;
}
```

**INTERATTIVITÀ**:
- `.active::before` → checkmark SVG bianco
- Hover → transform: translateY(-1px), box-shadow

---

### 2. SEZIONE RESULT-ITEM (linee 212-222 template + CSS 601-644)

**PRESET TEMPLATE**:
```html
<div class="result-item {{rowClass this.assegnabilita}}">
  <div class="result-item-name">
    {{uppercase this.cognome}} {{this.nome}}
    {{#if this.asl}}
      <span style="color: #999; font-size: 0.85em;">• {{this.asl}}</span>
    {{/if}}
  </div>
  <div class="result-item-badge {{badgeClass this.assegnabilita}}">
    {{badgeText this.assegnabilita}}
  </div>
</div>
```

**HTML GENERATO**:
```html
<div class="result-item row-libero">
  <div class="result-item-name">
    ROSSI MARIO
    <span style="color: #999; font-size: 0.85em;">• Roma 1</span>
  </div>
  <div class="result-item-badge badge-success">
    Assegnabile
  </div>
</div>
```

**CSS COMPLETO** (linee 601-644):
```css
/* Lista risultati */
.result-item {
  background: #f9f9f9;
  border-left: 4px solid #667eea;
  padding: 10px 15px;
  margin-bottom: 8px;
  border-radius: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.result-item.libero {
  border-left-color: #22c55e;
  background: #f0fdf4;
}

.result-item.deroga {
  border-left-color: #f59e0b;
  background: #fffbeb;
}

.result-item-name {
  font-weight: 600;
  color: #333;
  font-size: 0.95rem;
}

.result-item-badge {
  background: #667eea;
  color: white;
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
}

.result-item-badge.libero {
  background: #22c55e;
}

.result-item-badge.deroga {
  background: #f59e0b;
}
```

**HELPER FUNCTIONS** (medici-visualizer.js):
```javascript
rowClass: function(assegnabilita) {
  const stato = String(assegnabilita || '').toLowerCase();
  if (stato.includes('assegnazione libera')) return 'row-libero';
  if (stato.includes('deroga')) return 'row-deroga';
  if (stato.includes('non assegnabile')) return 'row-non-assegnabile';
  return '';
}

badgeClass: function(assegnabilita) {
  const stato = String(assegnabilita || '').toLowerCase();
  if (stato.includes('assegnazione libera')) return 'badge-success';
  if (stato.includes('deroga')) return 'badge-warning';
  return 'badge-default';
}

badgeText: function(assegnabilita) {
  const stato = String(assegnabilita || '').toLowerCase();
  if (stato.includes('assegnazione libera')) return 'Assegnabile';
  if (stato.includes('deroga')) return 'Deroga';
  if (stato.includes('non assegnabile')) return 'Non assegnabile';
  return 'Altro';
}
```

---

### 3. FILTRI INTERATTIVI - LOGICA JAVASCRIPT (da bot.html)

**STRUTTURA HTML NEL BOT.HTML** (linee ~1500-1700):
```html
<div id="filterButtons" class="filter-buttons">
  <button class="filter-btn filter-btn-active" data-filter="all">
    Tutti (12)
  </button>
  <button class="filter-btn" data-filter="liberi">
    Assegnabili (5)
  </button>
  <button class="filter-btn" data-filter="deroga">
    Con deroga (3)
  </button>
  <button class="filter-btn" data-filter="non-assegnabili">
    Non assegnabili (4)
  </button>
</div>

<div id="resultsContainer"></div>
```

**JAVASCRIPT FILTER LOGIC** (riga 1542 - renderFilteredResults):
```javascript
function renderFilteredResults() {
  const containerResults = document.getElementById('resultsContainer');
  const activeFilter = activeFilterKey; // 'all', 'liberi', 'deroga', etc.
  
  let filtered = cognomiData;
  
  if (activeFilter !== 'all') {
    filtered = cognomiData.filter(medico => {
      const stato = String(medico.assegnabilita || '').toLowerCase();
      
      if (activeFilter === 'liberi') {
        return stato.includes('assegnazione libera');
      } else if (activeFilter === 'deroga') {
        return stato.includes('deroga') && !stato.includes('assegnazione libera');
      } else if (activeFilter === 'non-assegnabili') {
        return !stato.includes('assegnazione libera') && !stato.includes('deroga');
      }
      return true;
    });
  }
  
  // Render filtered results
  containerResults.innerHTML = filtered.map(medico => `
    <div class="result-item ${rowClass(medico.assegnabilita)}">
      <div class="result-item-name">
        ${medico.cognome.toUpperCase()} ${medico.nome}
        <span style="color: #999; font-size: 0.85em;">• ${medico.asl}</span>
      </div>
      <div class="result-item-badge ${badgeClass(medico.assegnabilita)}">
        ${badgeText(medico.assegnabilita)}
      </div>
    </div>
  `).join('');
  
  // Update counters
  updateFilterCounters();
}

// Event listeners per filtri
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', function() {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('filter-btn-active'));
    this.classList.add('filter-btn-active');
    activeFilterKey = this.dataset.filter;
    renderFilteredResults();
  });
});
```

---

### 4. FUNZIONE renderFilteredResults - CODICE COMPLETO (riga 1542)

Basato sul pattern di bot.html (linea 1542), la funzione integra:

```javascript
function renderFilteredResults() {
  // 1. Ottieni container
  const container = document.getElementById('resultsContainer');
  if (!container) return;

  // 2. Applica filter
  let filtered = cognomiData || [];
  const currentFilter = activeFilterKey || 'all';

  if (currentFilter !== 'all') {
    filtered = filtered.filter(medico => {
      const stato = (medico.assegnabilita || '').toLowerCase();
      
      switch(currentFilter) {
        case 'liberi':
          return stato.includes('assegnazione libera');
        case 'deroga':
          return stato.includes('deroga') && !stato.includes('assegnazione libera');
        case 'non-assegnabili':
          return !stato.includes('assegnazione libera') && !stato.includes('deroga');
        default:
          return true;
      }
    });
  }

  // 3. Render items
  const html = filtered.map((medico, idx) => {
    const rowClazz = getRowClass(medico.assegnabilita);
    const badgeClazz = getBadgeClass(medico.assegnabilita);
    const badgeText = getBadgeText(medico.assegnabilita);

    return `
      <div class="result-item ${rowClazz}" data-medico-id="${medico.id}">
        <div class="result-item-name">
          ${medico.cognome.toUpperCase()} ${medico.nome}
          <span style="color: #999; font-size: 0.85em;">• ${medico.asl}</span>
        </div>
        <div class="result-item-badge ${badgeClazz}">
          ${badgeText}
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = html;

  // 4. Update counters
  updateCountersUI(filtered.length);

  // 5. Attach event listeners per ogni item
  container.querySelectorAll('.result-item').forEach(item => {
    item.addEventListener('click', function() {
      const medicoId = this.dataset.medicoId;
      onMedicoSelected(medicoId);
    });
  });
}
```

---

## TEMPLATE SYSTEM ARCHITECTURE

### OVERVIEW

Il template system è composto da 3 file:

1. **template-engine.js** → Parser template (variabili, helpers, loops, conditionals)
2. **medici-visualizer.js** → Componente visualizzazione (state, rendering, sorting, pagination)
3. **medici-visualizer-presets.js** → Configurazioni dichiarative (MAIN_SEARCH, BOT_COMPACT, MODAL_TEST)

### TEMPLATE ENGINE - SINTASSI COMPLETA

**FILE**: `/public/lib/template-engine.js`

**SYNTASSI SUPPORTATA**:

1. **Variabili semplici**:
   ```
   {{variableName}}
   {{state.currentPage}}
   {{this.cognome}}
   ```

2. **Stringhe letterali**:
   ```
   {{'Testo fisso'}}
   ```

3. **Numeri letterali**:
   ```
   {{100}}
   {{50.5}}
   ```

4. **Booleani**:
   ```
   {{true}}
   {{false}}
   ```

5. **Helpers con argomenti**:
   ```
   {{uppercase this.cognome}}
   {{emoji this.assegnabilita}}
   {{formatTime elapsed}}
   ```

6. **Conditionals**:
   ```
   {{#if condition}}...{{/if}}
   {{#if this.email}}
     <div>{{this.email}}</div>
   {{/if}}
   ```

7. **Loops**:
   ```
   {{#each items}}
     <div>{{this.nome}} - @index={{@index}} @first={{@first}}</div>
   {{/each}}
   ```

**CONTEXT DISPONIBILE NEL LOOP**:
- `this` → item corrente
- `@index` → indice (0-based)
- `@first` → true se primo item
- `@last` → true se ultimo item
- `@length` → lunghezza array

---

### MEDICI VISUALIZER - PRESET MAIN_SEARCH

**CONFIGURAZIONE**:
```javascript
MAIN_SEARCH: {
  layout: {
    main: `
      <div class="{{classes.root}}">
        {{slot:summary}}
        {{slot:content}}
      </div>
    `,
    
    slots: {
      summary: { /* ... */ },
      content: { /* ... */ }
    }
  },
  
  classes: {
    root: 'medici-visualizer-main'
  },
  
  sorting: { enabled: false },
  pagination: { enabled: false }
}
```

**SLOT:SUMMARY**:
```html
<div class="results-summary">
  <div class="summary-item">
    <div class="summary-number">{{countTotal}}</div>
    <div class="summary-label">Totali</div>
  </div>
  <!-- ... altri item -->
</div>
```

**SLOT:CONTENT**:
```html
{{#if items}}
  <!-- Desktop table -->
  <table class="results-table">
    <thead>
      <tr>
        <th>...</th>
      </tr>
    </thead>
    <tbody>
      {{#each items}}
        <tr>
          <td class="emoji-cell">{{emoji this.assegnabilita}}</td>
          <td class="nome-cell"><strong>{{uppercase this.cognome}}</strong></td>
          <td>{{this.nome}}</td>
          <td>{{this.asl}}</td>
          <td>{{this.assegnabilita}}</td>
        </tr>
      {{/each}}
    </tbody>
  </table>
  
  <!-- Mobile cards -->
  <div class="results-cards">
    {{#each items}}
      <div class="result-card">
        <div class="card-header">
          <div class="card-emoji">{{emoji this.assegnabilita}}</div>
          <div class="card-name">{{uppercase this.cognome}} {{this.nome}}</div>
        </div>
        <div class="card-footer">
          <div class="card-stato">{{this.assegnabilita}}</div>
          <div class="card-asl">{{this.asl}}</div>
        </div>
      </div>
    {{/each}}
  </div>
{{/if}}
```

---

### MEDICI VISUALIZER - PRESET BOT_COMPACT

**CONFIGURAZIONE**:
```javascript
BOT_COMPACT: {
  layout: {
    main: `
      <div class="{{classes.root}}">
        {{slot:summary}}
        {{slot:content}}
      </div>
    `,
    
    slots: {
      summary: { /* stats-compact */ },
      content: { /* result-items */ }
    }
  },
  
  classes: {
    root: 'medici-visualizer-compact'
  }
}
```

---

### HELPER FUNCTIONS DISPONIBILI

**Formatting**:
- `uppercase(str)` → MAIUSCOLE
- `lowercase(str)` → minuscole
- `capitalize(str)` → Maiuscola

**Date/Time**:
- `formatTime(seconds)` → "0.0s"
- `formatDate(date)` → "dd/mm/yyyy"

**Medici Specific**:
- `emoji(assegnabilita)` → "🟢" | "🟠" | "🔴" | "⚪"
- `rowClass(assegnabilita)` → "row-libero" | "row-deroga" | "row-non-assegnabile"
- `badgeClass(assegnabilita)` → "badge-success" | "badge-warning" | "badge-default"
- `badgeText(assegnabilita)` → "Assegnabile" | "Deroga" | "Non assegnabile"

**State Access**:
- `percentage()` → progress %
- `completed()` → completed queries
- `total()` → total queries
- `httpRequests()` → HTTP request count
- `elapsed()` → elapsed time in seconds

**Counters**:
- `countTotal()` → total items
- `countLiberi()` → assegnabili items
- `countDeroga()` → deroga items
- `countAltri()` → altri items

**Pagination**:
- `currentPage()`
- `totalPages()`
- `totalItems()`
- `pageSize()`
- `isFirstPage()`
- `isLastPage()`
- `visiblePages()` → array di numeri pagina

---

### EVENT HANDLERS NEL TEMPLATE

**Syntax**:
```html
<button onclick="{{onSort 'cognome'}}">Sort</button>
```

**Disponibili**:
- `onSort(column)` → trigga sort
- `onFilter(category)` → trigga filter
- `onPageChange(page)` → vai a pagina
- `firstPage()` → prima pagina
- `prevPage()` → pagina precedente
- `nextPage()` → pagina successiva
- `lastPage()` → ultima pagina
- `setPageSize()` → cambia page size

---

## RIEPILOGO MAPPING CODICE → TEMPLATE SYSTEM

### index.html → Template Equivalente

**CURRENT HTML** (displayResults + renderTable + renderCards):
```javascript
// Implementazione imperativa
function displayResults(data) {
  currentData = data;
  document.getElementById('totalCount').textContent = data.counters.totali;
  // ... altri updates
  renderTable(data);
}
```

**TEMPLATE EQUIVALENT**:
```javascript
const visualizer = new MediciVisualizer({
  preset: 'MAIN_SEARCH',
  container: '#results',
  data: searchResults
});

// Quando nuovo dato
visualizer.setData(newResults);
```

---

### bot.html → Template Equivalente

**CURRENT HTML** (renderFilteredResults):
```javascript
// Implementazione imperativa
function renderFilteredResults() {
  let filtered = cognomiData.filter(/* logic */);
  containerResults.innerHTML = filtered.map(m => `
    <div class="result-item ${rowClass(m.assegnabilita)}">
      ...
    </div>
  `).join('');
}
```

**TEMPLATE EQUIVALENT**:
```javascript
const visualizer = new MediciVisualizer({
  preset: 'BOT_COMPACT',
  container: '#tab-config',
  data: cognomiData,
  filters: {
    enabled: true,
    mode: 'category'
  }
});

// Quando filtro cambia
visualizer.filter([(item) => item.assegnabilita.includes('libera')]);
```

---

