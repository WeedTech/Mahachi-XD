const fs = require('fs');
const path = require('path');
const settingsPath = path.join(__dirname, '../../config/groupSettings.json');

module.exports = {
  name: 'antilink',
  category: 'group',
  desc: 'Delete links in group and kick sender (if not admin)',
  usage: '.antilink on/off',
  cooldown: 5,
  ownerOnly: false,
  groupOnly: true,
  privateOnly: false,
  adminOnly: true,
  botAdmin: true,
  
  async run({ sock, m, args, isBotAdmin, isAdmin, isOwner, command }) {
    try {
      const groupId = m.key.remoteJid;
      
      // Ensure config directory exists
      const configDir = path.dirname(settingsPath);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      
      // Load or initialize config
      let settings = {};
      if (fs.existsSync(settingsPath)) {
        const fileContent = fs.readFileSync(settingsPath, 'utf8');
        settings = JSON.parse(fileContent || '{}');
      }
      
      // Turn it on/off
      const subCommand = args[0]?.toLowerCase();
      if (subCommand === 'on') {
        settings[groupId] = settings[groupId] || {};
        settings[groupId].antilink = true;
        settings[groupId].antilinkMode = settings[groupId].antilinkMode || 'kick'; // default mode
        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
        return await sock.sendMessage(m.chat, {
          text: '✅ *Antilink is now enabled!*\n\n' +
            '🛡️ *Mode:* Kick users who send links\n' +
            '👮 *Note:* Admins are exempt from this rule'
        }, { quoted: m });
      } else if (subCommand === 'off') {
        if (settings[groupId]) {
          settings[groupId].antilink = false;
        }
        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
        return await sock.sendMessage(m.chat, {
          text: '❌ *Antilink is now disabled.*'
        }, { quoted: m });
      } else if (subCommand === 'warn') {
        settings[groupId] = settings[groupId] || {};
        settings[groupId].antilink = true;
        settings[groupId].antilinkMode = 'warn';
        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
        return await sock.sendMessage(m.chat, {
          text: '⚠️ *Antilink is now enabled in WARN mode!*\n\n' +
            '📢 *Mode:* Warn users who send links (no kicking)\n' +
            '👮 *Note:* Admins are exempt from this rule'
        }, { quoted: m });
      } else if (subCommand === 'delete') {
        settings[groupId] = settings[groupId] || {};
        settings[groupId].antilink = true;
        settings[groupId].antilinkMode = 'delete';
        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
        return await sock.sendMessage(m.chat, {
          text: '🗑️ *Antilink is now enabled in DELETE mode!*\n\n' +
            '📥 *Mode:* Delete messages with links (no kicking)\n' +
            '👮 *Note:* Admins are exempt from this rule'
        }, { quoted: m });
      } else {
        // Show current status and help
        const currentSettings = settings[groupId] || {};
        const status = currentSettings.antilink ? '✅ *ENABLED*' : '❌ *DISABLED*';
        const mode = currentSettings.antilinkMode || 'kick';
        
        return await sock.sendMessage(m.chat, {
          text: `⚙️ *Antilink Settings*\n\n` +
            `📊 *Status:* ${status}\n` +
            `🎮 *Mode:* ${mode.charAt(0).toUpperCase() + mode.slice(1)}\n\n` +
            `📝 *Usage:*\n` +
            `.${command} on  - Enable antilink (kick mode)\n` +
            `.${command} warn - Enable antilink (warn only)\n` +
            `.${command} delete - Enable antilink (delete only)\n` +
            `.${command} off  - Disable antilink`
        }, { quoted: m });
      }
    } catch (err) {
      console.error('[ANTILINK] Error in run function:', err);
      return await sock.sendMessage(m.chat, {
        text: '❌ *Failed to update antilink settings.*\nPlease try again later.'
      }, { quoted: m });
    }
  },
  
  // Event hook: checks each group message
  async onMessage({ sock, m }) {
    try {
      const jid = m.key.remoteJid;
      const text = m.message?.conversation ||
        m.message?.extendedTextMessage?.text ||
        m.message?.imageMessage?.caption ||
        m.message?.videoMessage?.caption ||
        m.message?.documentMessage?.caption || '';
      
      if (!jid || !jid.endsWith('@g.us')) return;
      if (!text || text.length === 0) return;
      
      // Load settings
      if (!fs.existsSync(settingsPath)) return;
      const fileContent = fs.readFileSync(settingsPath, 'utf8');
      const settings = JSON.parse(fileContent || '{}');
      const groupSettings = settings[jid] || {};
      if (!groupSettings.antilink) return;
      
      const antilinkMode = groupSettings.antilinkMode || 'kick';
      
      // More comprehensive link detection
      const linkRegex = /(https?:\/\/)?(www\.)?[a-zA-Z0-9]+\.[a-z]{2,}([^\s]*)?/gi;
      const whatsappLinkRegex = /chat\.whatsapp\.com\/[a-zA-Z0-9]{20,}/gi;
      
      // Check for regular links
      const hasRegularLink = linkRegex.test(text);
      // Check for WhatsApp group links specifically
      const hasWhatsAppLink = whatsappLinkRegex.test(text);
      
      if (!hasRegularLink && !hasWhatsAppLink) return;
      
      // Get group metadata
      let metadata;
      try {
        metadata = await sock.groupMetadata(jid);
      } catch (metaError) {
        console.error('[ANTILINK] Failed to get group metadata:', metaError);
        return;
      }
      
      const sender = m.key.participant || m.key.remoteJid;
      const senderNumber = sender.split('@')[0];
      
      // Check if sender is admin
      const isSenderAdmin = metadata.participants.some(p => p.id === sender && p.admin !== null);
      const isBotAdmin = metadata.participants.some(p => p.id === sock.user.id.split(':')[0] + '@s.whatsapp.net' && p.admin !== null);
      
      // Exempt admins
      if (isSenderAdmin || isBotAdmin) return;
      
      // Handle based on mode
      switch (antilinkMode) {
        case 'delete':
          // Delete the message
          try {
            await sock.sendMessage(jid, {
              text: `📥 *Link Deleted*\n\n` +
                `👤 User: @${senderNumber}\n` +
                `🔗 Type: ${hasWhatsAppLink ? 'WhatsApp Group Link' : 'External Link'}\n\n` +
                `🛡️ *Antilink is active in this group*`,
              mentions: [sender]
            });
            
            // Delete the original message (if possible)
            if (m.key.fromMe === false) {
              await sock.sendMessage(jid, { delete: m.key });
            }
          } catch (deleteError) {
            console.error('[ANTILINK] Failed to delete message:', deleteError);
          }
          break;
          
        case 'warn':
          // Warn the user
          await sock.sendMessage(jid, {
            text: `⚠️ *Link Warning*\n\n` +
              `👤 User: @${senderNumber}\n` +
              `🔗 Type: ${hasWhatsAppLink ? 'WhatsApp Group Link' : 'External Link'}\n\n` +
              `📢 *Please refrain from sharing links in this group*\n` +
              `🛡️ *Antilink is active in this group*`,
            mentions: [sender]
          });
          break;
          
        case 'kick':
        default:
          // Kick the user
          try {
            await sock.sendMessage(jid, {
              text: `🚫 *Link Detected!*\n\n` +
                `👤 User: @${senderNumber}\n` +
                `🔗 Type: ${hasWhatsAppLink ? 'WhatsApp Group Link' : 'External Link'}\n\n` +
                `🚪 *Removing from group...*`,
              mentions: [sender]
            });
            
            // Small delay before kicking
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Kick the user
            await sock.groupParticipantsUpdate(jid, [sender], 'remove');
            
            await sock.sendMessage(jid, {
              text: `✅ *User removed successfully*\n\n` +
                `👤 @${senderNumber} was removed for sharing a link\n` +
                `🛡️ *Antilink protection active*`,
              mentions: [sender]
            });
          } catch (kickError) {
            console.error('[ANTILINK] Failed to kick user:', kickError);
            await sock.sendMessage(jid, {
              text: `❌ *Failed to remove @${senderNumber}*\n\n` +
                `⚠️ Please make sure I have admin privileges\n` +
                `🛡️ *Antilink encountered an error*`,
              mentions: [sender]
            });
          }
          break;
      }
      
    } catch (err) {
      console.error('[ANTILINK] Error in onMessage function:', err);
    }
  }
};