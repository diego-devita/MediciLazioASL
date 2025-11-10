export async function handleHelp(bot, chatId) {
  const message = `
📚 Comandi disponibili:

/start
/add <cognome>
/remove <cognome>
/cognomi
/medici
/otp
/help
  `.trim();

  await bot.sendMessage(chatId, message);
}
