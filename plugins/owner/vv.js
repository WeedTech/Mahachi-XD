module.exports = {
  name: 'vv',
  alias: ['viewonce'],
  category: 'owner',
  desc: 'Reveal view-once message manually (for owner)',
  async run({ m, sock, isOwner }) {
    if (!isOwner) return m.reply('⛔ Only the owner can use this command.');
    
    try {
      const msg = m.quoted || m;
      const vmsg =
        msg.message?.viewOnceMessageV2?.message ||
        msg.message?.viewOnceMessage?.message;
      
      if (!vmsg) return m.reply('❗ Reply to a *view-once* message.');
      
      await sock.sendMessage(m.chat, vmsg, { quoted: m });
    } catch (err) {
      console.error('VV_ERROR:', err);
      m.reply('❌ Failed to reveal view-once message.');
    }
  }
};