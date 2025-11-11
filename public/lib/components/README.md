# Medici Components - Sistema Atomico

Sistema di componenti standalone e riusabili per visualizzazione risultati medici.

## 🎯 Filosofia

Componenti **atomici**, **standalone**, **composabili**:
- Ogni componente funziona da solo
- Posizionabili in container separati
- Comunicano tramite eventi
- Template configurabili
- Zero dipendenze tra loro

## 📦 Componenti Disponibili

### 1. MediciCounters

Contatori/statistiche con filtri interattivi.

```javascript
const counters = new MediciCounters({
  container: '#stats',
  data: medici,
  variant: 'stat-compact',  // o 'summary-item'
  interactive: true,
  onFilterClick: (filterKey, counter, activeFilters) => {
    console.log('Filter clicked:', filterKey);
  }
});

// Update data
counters.setData(newMedici);

// Get counts
const counts = counters.getCounts();
// { totali: 150, liberi: 50, deroga: 30, altri: 70 }
```

**Varianti:**
- `summary-item` - Box grandi (index.html style)
- `stat-compact` - Box compatti clickabili (bot.html style)

---

### 2. MediciTable

Tabella con sort, tooltip, responsive.

```javascript
const table = new MediciTable({
  container: '#table',
  data: medici,
  sorting: true,
  tooltip: { enabled: true },
  responsive: true,
  onSort: (column, direction) => {
    console.log('Sorted by:', column, direction);
  },
  onRowClick: (medico) => {
    console.log('Clicked:', medico);
  }
});

// Update data
table.setData(newMedici);

// Programmatic sort
table.sort('cognome', 'asc');
```

**Features:**
- ✅ Colonne configurabili
- ✅ Sort click su header
- ✅ Tooltip hover con 8 campi
- ✅ Responsive: desktop table → mobile cards
- ✅ Template custom opzionale

---

### 3. MediciPagination

Paginazione client-side completa.

```javascript
const pagination = new MediciPagination({
  container: '#pagination',
  totalItems: 200,
  pageSize: 25,
  pageSizeOptions: [10, 25, 50, 100, 'Tutti'],
  showPageNumbers: true,
  maxPageButtons: 5,
  onPageChange: (page) => {
    console.log('Page:', page);
  },
  onPageSizeChange: (size) => {
    console.log('Page size:', size);
  }
});

// Update total
pagination.setTotalItems(300);

// Go to page
pagination.goToPage(5);

// Get state
const state = pagination.getState();
// { currentPage: 5, totalPages: 12, startIndex: 100, endIndex: 125 }
```

**UI Elements:**
- Page size selector
- Page info text
- First/Last buttons
- Prev/Next buttons
- Page number buttons

---

### 4. MediciProgress

Progress bar per ricerche.

```javascript
const progress = new MediciProgress({
  container: '#progress',
  showTimer: true
});

// Update progress
progress.update({
  percentage: 75,
  completed: 15,
  total: 20,
  results: 150,
  totalRequests: 45,
  currentPage: 3,
  totalPagesForCombination: 10
});

// Complete
progress.complete();  // Ferma timer e pulisce
```

**Features:**
- ✅ Progress bar combinazioni
- ✅ Progress bar pagine (opzionale)
- ✅ Timer real-time (100ms)
- ✅ Stats: medici, richieste HTTP, errori
- ✅ Auto-start/stop timer

---

### 5. MediciView (Compositore)

Orchestra componenti atomici.

```javascript
const view = new MediciView({
  data: medici,

  blocks: {
    stats: {
      type: 'counters',
      container: '#stats-box',
      config: {
        variant: 'stat-compact',
        interactive: true
      }
    },

    results: {
      type: 'table',
      container: '#results-box',
      config: {
        sorting: true,
        usePaginated: true  // Usa dati paginati
      }
    },

    pager: {
      type: 'pagination',
      container: '#pagination-box',
      config: {
        pageSize: 25
      }
    },

    progress: {
      type: 'progress',
      container: '#progress-box',
      config: {
        showTimer: true
      }
    }
  },

  events: {
    'counters.filterClick': function({ filterKey }) {
      console.log('Filter clicked:', filterKey);
      // Auto update table e pagination!
    },

    'table.sort': function({ column, direction }) {
      console.log('Table sorted');
      // Auto update!
    },

    'pagination.pageChange': function({ page }) {
      console.log('Page:', page);
      // Auto update table!
    }
  },

  onReady: (view) => {
    console.log('View ready!');
  }
});

// Update data
view.setData(newMedici);  // Aggiorna TUTTI i componenti

// Access components
const table = view.getComponent('results');
table.sort('nome', 'desc');

// Get state
const state = view.getState();
```

**Auto-coordination:**
- Filtro counters → aggiorna table + pagination
- Sort table → aggiorna visualizzazione
- Change page → aggiorna table con slice dati
- Set data → propaga a tutti i componenti

---

## 🚀 Esempi d'Uso

### Esempio 1: Componenti Standalone

```javascript
// Contatori standalone
const counters = new MediciCounters({
  container: '#sidebar-stats',
  data: medici,
  variant: 'stat-compact'
});

// Tabella standalone (altro container!)
const table = new MediciTable({
  container: '#main-table',
  data: medici
});

// Completamente indipendenti!
```

### Esempio 2: Composizione Manuale

```javascript
// Counters con filtro
const counters = new MediciCounters({
  container: '#stats',
  data: medici,
  interactive: true,
  onFilterClick: (key, counter) => {
    // Filtra manualmente
    const filtered = medici.filter(counter.filter);
    table.setData(filtered);
    pagination.setTotalItems(filtered.length);
  }
});

// Table
const table = new MediciTable({
  container: '#table',
  data: medici
});

// Pagination
const pagination = new MediciPagination({
  container: '#pager',
  totalItems: medici.length,
  onPageChange: (page) => {
    const start = (page - 1) * 25;
    const slice = medici.slice(start, start + 25);
    table.setData(slice);
  }
});
```

### Esempio 3: Composizione Automatica (MediciView)

```javascript
// Tutto orchestrato automaticamente!
const view = new MediciView({
  data: medici,
  blocks: {
    stats: { type: 'counters', container: '#stats', config: { interactive: true } },
    results: { type: 'table', container: '#table', config: { usePaginated: true } },
    pager: { type: 'pagination', container: '#pager', config: {} }
  }
});

// Un solo comando aggiorna tutto
view.setData(newMedici);
```

---

## 🎨 Template Customizzazione

Ogni componente supporta template custom:

```javascript
const counters = new MediciCounters({
  container: '#stats',
  data: medici,
  template: `
    <div class="my-custom-stats">
      {{#each counters}}
        <div class="stat-box" style="background: {{this.color}}">
          <h3>{{this.count}}</h3>
          <p>{{this.label}}</p>
        </div>
      {{/each}}
    </div>
  `
});
```

---

## 📊 Scenari Coperti

| Scenario | Componenti | Composizione |
|----------|-----------|--------------|
| **index.html** ricerca | Table + Counters (esterno) | Standalone |
| **bot.html** test modal | View (Table + Counters + Pagination + Progress) | Automatica |
| **bot.html** lista compatta | Counters + Table compact | Standalone |
| **Sidebar stats** | Solo Counters | Standalone |
| **Export preview** | Solo Table | Standalone |

---

## ✅ Garanzie

- ✅ Ogni componente funziona **standalone**
- ✅ **Zero conflitti** CSS/JS
- ✅ **Event-driven** communication
- ✅ **Template-based** customization
- ✅ **Memory safe** (destroy method)
- ✅ **Responsive** out-of-the-box
- ✅ **Backward compatible** (usa CSS esistente)

---

## 🔧 API Reference

### Metodi Comuni

Tutti i componenti hanno:

```javascript
// Update data
component.setData(newData);

// Get state
component.getState();

// Cleanup
component.destroy();
```

### Eventi Custom

```javascript
// MediciView event names:
'counters.filterClick'
'table.sort'
'table.rowClick'
'pagination.pageChange'
'pagination.pageSizeChange'
'progress.change'
```

---

## 🏗️ Architettura

```
┌─────────────────────────────────────┐
│         MediciView                  │  ← Compositore
│  ┌────────┐  ┌────────┐  ┌────────┐│
│  │Counters│  │ Table  │  │  Pager ││  ← Componenti atomici
│  └────────┘  └────────┘  └────────┘│
│       ↓          ↓          ↓       │
│     [Events] [Events] [Events]     │  ← Event system
│                 ↓                   │
│         [Shared State]              │  ← State management
└─────────────────────────────────────┘
```

Ogni componente è **autonomo** ma può essere **coordinato** dal View.
