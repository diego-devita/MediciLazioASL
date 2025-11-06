import { getUser, updateUserQuery } from '../database.js';
import { TIPO_MAP } from '../medici/constants.js';

export async function handleTipo(bot, chatId, args) {
  try {
    const user = await getUser(chatId);
    if (!user) {
      await bot.sendMessage(chatId, '❌ Utente non trovato. Usa /start prima.');
      return;
    }

    // Se c'è un argomento, cambia tipo
    if (args && args.length > 0) {
      const numero = parseInt(args[0]);

      if (isNaN(numero) || numero < 1 || numero > TIPO_MAP.length) {
        await bot.sendMessage(
          chatId,
          `❌ Numero non valido. Scegli un numero da 1 a ${TIPO_MAP.length}.`
        );
        return;
      }

      const nuovoTipo = TIPO_MAP[numero - 1];
      await updateUserQuery(chatId, { tipo: nuovoTipo.codice });

      await bot.sendMessage(
        chatId,
        `✅ Tipo medico cambiato in: *${nuovoTipo.nome}*`
      );
      return;
    }

    // Mostra tipo corrente e lista
    const tipoCorrente = TIPO_MAP.find(t => t.codice === user.query.tipo) || TIPO_MAP[0];

    let message = `🏥 *Tipo medico corrente: ${tipoCorrente.nome}*\n\n`;
    message += `Per cambiare tipo, usa: \`/tipo NUMERO\`\n\n`;
    message += `*Opzioni disponibili:*\n\n`;

    TIPO_MAP.forEach((tipo, i) => {
      const current = tipo.codice === user.query.tipo ? ' ✓' : '';
      message += `${i + 1}. ${tipo.nome}${current}\n`;
    });

    message += `\n*Esempio:* \`/tipo 2\` per Pediatra`;

    await bot.sendMessage(chatId, message);
  } catch (error) {
    console.error('Error in /tipo:', error);
    await bot.sendMessage(chatId, `❌ Errore: ${error.message}`);
  }
}
