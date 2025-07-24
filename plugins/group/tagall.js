module.exports = {
  name: 'tagall',
  alias: ['everyone', 'all'],
  category: 'group',
  desc: 'Tag all group members with a custom message',
  admin: true,
  botAdmin: true,
  
  async run({ sock, m, args }) {
    try {
      const jid = m.key.remoteJid;
      
      if (!jid.endsWith('@g.us')) {
        return m.reply('❌ This command can only be used inside groups.');
      }
      
      const metadata = await sock.groupMetadata(jid);
      const participants = metadata.participants;
      
      if (!participants || participants.length === 0) {
        return m.reply('⚠️ No participants found in this group.');
      }
      
      const mentions = participants.map(p => p.id);
      
      // Custom message after command
      const customMsg = args.length > 0 ? args.join(' ') + '\n\n' : '';
      
      let listText = `${customMsg}👥 *Group Participants:*\n\n`;
      participants.forEach((p, i) => {
        listText += `• @${p.id.split('@')[0]}\n`;
      });
      
      listText += `\n> Powered by *WEED x JADEN*`;
      
      await sock.sendMessage(jid, {
        text: listText,
        mentions,
      });
    } catch (error) {
      console.error('[TAGALL ERROR]', error);
      m.reply('❌ Failed to tag all members.');
    }
  }
};