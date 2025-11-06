import { getUser, updateUserQuery } from '../database.js';

export async function handleAdd(bot, chatId, args) {
  if (!args || args.length === 0) {
    await bot.sendMessage(chatId, '❌ Uso: /add COGNOME\n\nEsempio: /add ROSSI');
    return;
  }

  const cognome = args[0].toUpperCase();

  try {
    const user = await getUser(chatId);
    if (!user) {
      await bot.sendMessage(chatId, '❌ Utente non trovato. Usa /start prima.');
      return;
    }

    if (user.query.cognomi.includes(cognome)) {
      await bot.sendMessage(chatId, `ℹ️ *${cognome}* è già nella lista.`);
      return;
    }

    const nuoviCognomi = [...user.query.cognomi, cognome];
    await updateUserQuery(chatId, { cognomi: nuoviCognomi });

    await bot.sendMessage(
      chatId,
      `✅ *${cognome}* aggiunto alla lista!\n\n` +
      `Cognomi monitorati: ${nuoviCognomi.join(', ')}`
    );
  } catch (error) {
    console.error('Error in /add:', error);
    await bot.sendMessage(chatId, `❌ Errore: ${error.message}`);
  }
}
