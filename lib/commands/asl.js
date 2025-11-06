import { getUser, updateUserQuery } from '../database.js';
import { ASL_MAP } from '../medici/constants.js';

export async function handleAsl(bot, chatId, args) {
  try {
    const user = await getUser(chatId);
    if (!user) {
      await bot.sendMessage(chatId, '❌ Utente non trovato. Usa /start prima.');
      return;
    }

    // Se c'è un argomento, cambia ASL
    if (args && args.length > 0) {
      const numero = parseInt(args[0]);

      if (isNaN(numero) || numero < 1 || numero > ASL_MAP.length) {
        await bot.sendMessage(
          chatId,
          `❌ Numero non valido. Scegli un numero da 1 a ${ASL_MAP.length}.`
        );
        return;
      }

      const nuovaAsl = ASL_MAP[numero - 1];
      await updateUserQuery(chatId, { asl: nuovaAsl.codice });

      await bot.sendMessage(
        chatId,
        `✅ ASL cambiata in: *${nuovaAsl.nome}*`
      );
      return;
    }

    // Mostra ASL corrente e lista
    const aslCorrente = ASL_MAP.find(a => a.codice === user.query.asl) || ASL_MAP[0];

    let message = `📍 *ASL corrente: ${aslCorrente.nome}*\n\n`;
    message += `Per cambiare ASL, usa: \`/asl NUMERO\`\n\n`;
    message += `*Opzioni disponibili:*\n\n`;

    ASL_MAP.forEach((asl, i) => {
      const current = asl.codice === user.query.asl ? ' ✓' : '';
      message += `${i + 1}. ${asl.nome}${current}\n`;
    });

    message += `\n*Esempio:* \`/asl 3\` per Roma 2`;

    await bot.sendMessage(chatId, message);
  } catch (error) {
    console.error('Error in /asl:', error);
    await bot.sendMessage(chatId, `❌ Errore: ${error.message}`);
  }
}
