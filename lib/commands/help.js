export async function handleHelp(bot, chatId) {
  const message = `
📚 *Guida comandi MediciLazioASL*

*Gestione notifiche:*
/subscribe - Attiva notifiche automatiche
/unsubscribe - Disattiva notifiche automatiche
/status - Mostra stato sistema e ultima ricerca

*Configurazione ricerca:*
/add COGNOME - Aggiungi cognome da monitorare
/remove COGNOME - Rimuovi cognome
/list - Mostra configurazione attuale
/asl [NUMERO] - Visualizza/cambia ASL
/tipo [NUMERO] - Visualizza/cambia tipo medico

*Ricerca:*
/check - Esegui ricerca immediata
/medici - Mostra risultati ultima ricerca

*Esempi:*
\`/add ROSSI\` - Monitora il cognome ROSSI
\`/remove BIANCHI\` - Smetti di monitorare BIANCHI
\`/asl 3\` - Cambia ASL in Roma 2
\`/tipo 2\` - Cambia tipo in Pediatra

*Legenda emoji:*
🟢 Assegnazione libera
🟠 Assegnabile con deroga
🔴 Non assegnabile

*Notifiche automatiche:*
Le ricerche vengono eseguite automaticamente ogni 30 minuti per tutti gli utenti iscritti. Riceverai una notifica all'inizio e al termine di ogni ricerca.

Per qualsiasi problema, contatta l'amministratore del sistema.
  `.trim();

  await bot.sendMessage(chatId, message);
}
