module.exports = {
  name: 'opengc',
  alias: ['opengroup', 'unlockgc'],
  category: 'group',
  desc: 'Open group chat to all members (disable admin-only mode)',
  admin: true,
  botAdmin: true,
  
  async run({ sock, m }) {
    try {
      const jid = m.key.remoteJid;
      
      if (!jid.endsWith('@g.us')) {
        return m.reply('❌ This command can only be used inside groups.');
      }
      
      await sock.groupSettingUpdate(jid, 'not_announcement'); // opens group (all can send)
      
      m.reply('✅ Group is now *open* — all members can send messages.');
    } catch (error) {
      console.error('[OPENGC ERROR]', error);
      m.reply('❌ Failed to open the group.');
    }
  }
};