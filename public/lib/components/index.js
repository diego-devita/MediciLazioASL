/**
 * Medici Components - Export centrale
 * Import tutti i componenti atomici
 */

// Componenti atomici
if (typeof MediciCounters === 'undefined') {
  console.error('MediciCounters not loaded! Include medici-counters.js');
}
if (typeof MediciTable === 'undefined') {
  console.error('MediciTable not loaded! Include medici-table.js');
}
if (typeof MediciPagination === 'undefined') {
  console.error('MediciPagination not loaded! Include medici-pagination.js');
}
if (typeof MediciProgress === 'undefined') {
  console.error('MediciProgress not loaded! Include medici-progress.js');
}
if (typeof MediciView === 'undefined') {
  console.error('MediciView not loaded! Include medici-view.js');
}

// Export per Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    MediciCounters,
    MediciTable,
    MediciPagination,
    MediciProgress,
    MediciView
  };
}

// Log caricamento
console.log('✅ Medici Components loaded:', {
  MediciCounters: typeof MediciCounters !== 'undefined',
  MediciTable: typeof MediciTable !== 'undefined',
  MediciPagination: typeof MediciPagination !== 'undefined',
  MediciProgress: typeof MediciProgress !== 'undefined',
  MediciView: typeof MediciView !== 'undefined'
});
