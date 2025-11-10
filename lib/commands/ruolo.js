import { getUser, updateUser } from '../database.js';

export async function handleRuolo(bot, chatId) {
  try {
    // Leggi stato corrente
    const user = await getUser(chatId);

    if (!user) {
      await bot.sendMessage(chatId, '❌ Usa /start prima');
      return;
    }

    // Leggi ADMIN_CHAT_IDS dalla env
    const adminChatIds = (process.env.ADMIN_CHAT_IDS || '').split(',').map(id => id.trim()).filter(Boolean);
    const shouldBeAdmin = adminChatIds.includes(String(chatId));

    // Prepara messaggio con stato PRIMA
    let message = `📊 STATO ATTUALE:\n\n`;
    message += `🆔 Il tuo chatId: ${chatId}\n`;
    message += `👤 Ruolo corrente DB: ${user.role || 'non settato'}\n`;
    message += `🔐 ADMIN_CHAT_IDS: ${adminChatIds.length > 0 ? adminChatIds.join(', ') : 'vuoto'}\n`;
    message += `✅ Sei nella lista admin: ${shouldBeAdmin ? 'SÌ' : 'NO'}\n`;
    message += `\n`;

    // Aggiorna ruolo se necessario
    if (shouldBeAdmin && user.role !== 'admin') {
      await updateUser(chatId, { role: 'admin' });
      message += `🔄 AGGIORNAMENTO: Promosso a ADMIN\n`;
      message += `👤 Nuovo ruolo: admin`;
    } else if (!shouldBeAdmin && user.role === 'admin') {
      await updateUser(chatId, { role: 'user' });
      message += `🔄 AGGIORNAMENTO: Declassato a USER\n`;
      message += `👤 Nuovo ruolo: user`;
    } else {
      message += `✓ Nessun aggiornamento necessario`;
    }

    await bot.sendMessage(chatId, message);

  } catch (error) {
    console.error('Error in /ruolo:', error);
    await bot.sendMessage(chatId, `❌ Errore: ${error.message}`);
  }
}
