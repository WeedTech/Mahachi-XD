module.exports = {
  command: ['join'],
  tags: ['group'],
  help: ['join <group-invite-link>'],
  description: 'Join a WhatsApp group via invite link',
  
  async run({ sock, m, text, sender }) {
    try {
      if (!text) return m.reply('🔗 *Please provide a group invite link.*\nExample: .join https://chat.whatsapp.com/xxxxxxx');
      
      const regex = /chat\.whatsapp\.com\/([0-9A-Za-z]{20,24})/;
      const match = text.match(regex);
      if (!match) return m.reply('❌ *Invalid invite link.* Please make sure it is a valid WhatsApp group invite.');
      
      const inviteCode = match[1];
      
      const response = await sock.groupAcceptInvite(inviteCode);
      
      m.reply(`✅ *Joined group successfully!*\n🆔 Group ID: ${response}`);
    } catch (error) {
      console.error('[JOIN ERROR]', error);
      m.reply('❌ Failed to join the group. The link may be invalid or the bot is banned from the group.');
    }
  }
};