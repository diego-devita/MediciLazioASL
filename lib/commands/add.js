import { getUser, updateUserQuery } from '../database.js';

// Normalizza cognome: trim, uppercase, spazi multipli → uno
function normalizeCognome(str) {
  return str
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

// Valida cognome: solo lettere, spazi, apostrofi
function isValidCognome(cognome) {
  return /^[A-Z'\s]+$/.test(cognome) && cognome.length >= 2;
}

export async function handleAdd(bot, chatId, args) {
  if (!args || args.length === 0) {
    await bot.sendMessage(chatId, '❌ Uso: /add COGNOME\n\nEs: /add ROSSI');
    return;
  }

  // Normalizza
  const cognome = normalizeCognome(args.join(' '));

  // Valida
  if (!isValidCognome(cognome)) {
    await bot.sendMessage(chatId, '❌ Cognome non valido.\nUsa solo lettere (min 2 caratteri)');
    return;
  }

  try {
    const user = await getUser(chatId);
    if (!user) {
      await bot.sendMessage(chatId, '❌ Usa /start prima');
      return;
    }

    // Controlla duplicato
    if (user.query.cognomi.includes(cognome)) {
      await bot.sendMessage(chatId, `⚠️ ${cognome} già presente`);
      return;
    }

    // Aggiungi
    const nuoviCognomi = [...user.query.cognomi, cognome];
    await updateUserQuery(chatId, { cognomi: nuoviCognomi });

    await bot.sendMessage(chatId, `✅ ${cognome} aggiunto`);
  } catch (error) {
    console.error('Error in /add:', error);
    await bot.sendMessage(chatId, `❌ Errore: ${error.message}`);
  }
}
