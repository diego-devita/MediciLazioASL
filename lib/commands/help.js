export async function handleHelp(bot, chatId) {
  const message = `
📚 Comandi disponibili:

/add COGNOME - Aggiungi
/remove COGNOME - Rimuovi
/cognomi - Mostra lista
/help - Questa guida

Esempio: /add ROSSI
  `.trim();

  await bot.sendMessage(chatId, message);
}
