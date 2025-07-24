module.exports = {
  name: 'antidelgc',
  category: 'group',
  desc: 'Resend deleted messages in group (except bot-deleted or link messages)',

  // No command needed — this is an event-based plugin
  async onMessageDeleted({ sock, message, from }) {
    try {
      // Only run in group chats
      if (!from.endsWith('@g.us')) return;

      const isBot = message?.key?.fromMe;
      const sender = message?.key?.participant || message?.key?.remoteJid;
      const content = message.message;

      if (!content || isBot) return;

      // Extract message text or caption
      let text = '';
      if (content?.conversation) text = content.conversation;
      else if (content?.extendedTextMessage?.text) text = content.extendedTextMessage.text;
      else if (content?.imageMessage?.caption) text = content.imageMessage.caption;
      else if (content?.videoMessage?.caption) text = content.videoMessage.caption;
      else if (content?.documentMessage?.caption) text = content.documentMessage.caption;

      // Skip if contains link
      const hasLink = /(https?:\/\/|wa\.me\/|chat\.whatsapp\.com\/)/gi.test(text);
      if (hasLink) return;

      // Resend message
      await sock.sendMessage(from, {
        text: `🕵️‍♂️ *Deleted message by @${sender.split('@')[0]}:*\n\n${text || '[media]'}`,
        mentions: [sender]
      });

      // Resend media if present
      if (content?.imageMessage || content?.videoMessage || content?.documentMessage) {
        const msgType = Object.keys(content)[0];
        await sock.sendMessage(from, { [msgType]: content[msgType], caption: text || '' });
      }

    } catch (err) {
      console.error('❌ antidelgc error:', err);
    }
  }
};