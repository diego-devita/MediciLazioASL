import { getUser, updateUserQuery } from '../database.js';

export async function handleRemove(bot, chatId, args) {
  if (!args || args.length === 0) {
    await bot.sendMessage(chatId, '❌ Uso: /remove COGNOME\n\nEsempio: /remove ROSSI');
    return;
  }

  const cognome = args[0].toUpperCase();

  try {
    const user = await getUser(chatId);
    if (!user) {
      await bot.sendMessage(chatId, '❌ Utente non trovato. Usa /start prima.');
      return;
    }

    if (!user.query.cognomi.includes(cognome)) {
      await bot.sendMessage(chatId, `ℹ️ *${cognome}* non è nella lista.`);
      return;
    }

    const nuoviCognomi = user.query.cognomi.filter(c => c !== cognome);

    if (nuoviCognomi.length === 0) {
      await bot.sendMessage(chatId, '❌ Non puoi rimuovere tutti i cognomi.');
      return;
    }

    await updateUserQuery(chatId, { cognomi: nuoviCognomi });

    await bot.sendMessage(
      chatId,
      `✅ *${cognome}* rimosso dalla lista!\n\n` +
      `Cognomi monitorati: ${nuoviCognomi.join(', ')}`
    );
  } catch (error) {
    console.error('Error in /remove:', error);
    await bot.sendMessage(chatId, `❌ Errore: ${error.message}`);
  }
}
