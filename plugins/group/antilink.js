const fs = require('fs');
const path = './config/groupSettings.json';

module.exports = {
  name: 'antilink',
  category: 'group',
  desc: 'Delete links in group and kick sender (if not admin)',
  admin: true,
  botAdmin: true,
  
  async run({ sock, m, args, isBotAdmin, isAdmin, isOwner }) {
    const groupId = m.key.remoteJid;
    
    // Load or initialize config
    let settings = {};
    if (fs.existsSync(path)) {
      settings = JSON.parse(fs.readFileSync(path));
    }
    
    // Turn it on/off
    const command = args[0]?.toLowerCase();
    if (command === 'on') {
      settings[groupId] = settings[groupId] || {};
      settings[groupId].antilink = true;
      fs.writeFileSync(path, JSON.stringify(settings, null, 2));
      return m.reply('✅ Antilink is now *enabled*.');
    } else if (command === 'off') {
      if (settings[groupId]) settings[groupId].antilink = false;
      fs.writeFileSync(path, JSON.stringify(settings, null, 2));
      return m.reply('❌ Antilink is now *disabled*.');
    } else {
      return m.reply('⚙️ Usage: .antilink on/off');
    }
  },
  
  // Event hook: checks each group message
  async onMessage({ sock, m }) {
    try {
      const jid = m.key.remoteJid;
      const text = m.message?.conversation || m.message?.extendedTextMessage?.text || '';
      if (!jid || !jid.endsWith('@g.us')) return;
      
      // Load settings
      if (!fs.existsSync(path)) return;
      const settings = JSON.parse(fs.readFileSync(path));
      const groupSettings = settings[jid] || {};
      if (!groupSettings.antilink) return;
      
      const metadata = await sock.groupMetadata(jid);
      const sender = m.key.participant || m.key.remoteJid;
      const participants = metadata.participants;
      const isSenderAdmin = participants.some(p => p.id === sender && p.admin !== null);
      
      // Link detector
      const linkRegex = /(https?:\/\/)?(www\.)?[a-zA-Z0-9]+\.[a-z]{2,}(\S*)?/gi;
      if (linkRegex.test(text)) {
        if (!isSenderAdmin) {
          await sock.sendMessage(jid, { text: `🚫 Link detected from @${sender.split('@')[0]}! Kicking...`, mentions: [sender] });
          await sock.groupParticipantsUpdate(jid, [sender], 'remove');
        } else {
          await sock.sendMessage(jid, { text: `⚠️ Admin @${sender.split('@')[0]} sent a link. Not kicking.`, mentions: [sender] });
        }
      }
    } catch (err) {
      console.error('🛑 Antilink error:', err);
    }
  }
};