export async function handleHelp(bot, chatId) {
  const message = `
📚 Comandi disponibili:

/start - Avvia il bot
/medici - Mostra i risultati dell'ultima ricerca
/otp - Genera codice per accedere alla pagina web
/help - Mostra questo messaggio
  `.trim();

  await bot.sendMessage(chatId, message);
}
