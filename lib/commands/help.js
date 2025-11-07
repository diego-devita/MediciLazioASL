export async function handleHelp(bot, chatId) {
  const message = `
📚 Comandi disponibili:

/start
/add <cognome>
/remove <cognome>
/cognomi
/medici
/token
/help
  `.trim();

  await bot.sendMessage(chatId, message);
}
