export async function handleHelp(bot, chatId) {
  const message = `
📚 Comandi disponibili:

/add <cognome>
/remove <cognome>
/cognomi
/medici
/help
  `.trim();

  await bot.sendMessage(chatId, message);
}
