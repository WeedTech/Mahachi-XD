module.exports = {
  name: 'closegc',
  alias: ['closegroup', 'lockgc'],
  category: 'group',
  desc: 'Close group chat to only admins (enable admin-only mode)',
  admin: true,
  botAdmin: true,
  
  async run({ sock, m }) {
    try {
      const jid = m.key.remoteJid;
      
      if (!jid.endsWith('@g.us')) {
        return m.reply('❌ This command can only be used inside groups.');
      }
      
      await sock.groupSettingUpdate(jid, 'announcement'); // closes group (only admins send)
      
      m.reply('✅ Group is now *closed* — only admins can send messages.');
    } catch (error) {
      console.error('[CLOSEGC ERROR]', error);
      m.reply('❌ Failed to close the group. Make sure the bot is an admin.');
    }
  }
};