import { getUser, updateUserQuery } from '../database.js';

// Normalizza cognome: trim, uppercase, spazi multipli → uno
function normalizeCognome(str) {
  return str
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

export async function handleRemove(bot, chatId, args) {
  if (!args || args.length === 0) {
    await bot.sendMessage(chatId, '❌ Uso: /remove COGNOME\n\nEs: /remove ROSSI');
    return;
  }

  // Normalizza
  const cognome = normalizeCognome(args.join(' '));

  try {
    const user = await getUser(chatId);
    if (!user) {
      await bot.sendMessage(chatId, '❌ Usa /start prima');
      return;
    }

    // Controlla se esiste
    if (!user.query.cognomi.includes(cognome)) {
      await bot.sendMessage(chatId, `⚠️ ${cognome} non presente.\n\nUsa /cognomi per la lista`);
      return;
    }

    // Rimuovi
    const nuoviCognomi = user.query.cognomi.filter(c => c !== cognome);
    await updateUserQuery(chatId, { cognomi: nuoviCognomi });

    const listaMsg = nuoviCognomi.length > 0
      ? `Lista: ${nuoviCognomi.join(', ')}`
      : 'Lista vuota';

    await bot.sendMessage(
      chatId,
      `✅ ${cognome} rimosso\n\n${listaMsg}`
    );
  } catch (error) {
    console.error('Error in /remove:', error);
    await bot.sendMessage(chatId, `❌ Errore: ${error.message}`);
  }
}
