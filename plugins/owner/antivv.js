const fs = require('fs');
const path = require('path');
const { formatDateTime } = require('../../lib/format');

const SETTINGS_PATH = path.join(__dirname, '../../config/antivv.json');

module.exports = {
  name: 'antivv',
  type: 'event',
  desc: 'Auto reveals view-once media (photo/video)',
  usage: 'Automatically active - no command needed',
  cooldown: 1,
  ownerOnly: false,
  groupOnly: false,
  privateOnly: false,
  adminOnly: false,
  botAdmin: false,
  
  async run({ sock, m }) {
    try {
      // Validate message
      if (!m || !m.message || !m.key) return;

      const jid = m.key.remoteJid;
      const sender = m.key.participant || m.key.remoteJid;
      const messageId = m.key.id;
      
      // Skip if no sender or invalid JID
      if (!sender || !jid) return;

      // Load antivv settings
      let settings = {
        enabled: true,
        logOnly: false,
        whitelist: [],
        notifySender: true,
        saveToGallery: false
      };
      
      if (fs.existsSync(SETTINGS_PATH)) {
        try {
          const fileContent = fs.readFileSync(SETTINGS_PATH, 'utf8');
          settings = { ...settings, ...JSON.parse(fileContent || '{}') };
        } catch (settingsError) {
          console.error('[ANTIVV] Failed to load settings:', settingsError);
        }
      }

      // Check if antivv is enabled
      if (!settings.enabled) return;

      // Check whitelist
      const senderNumber = sender.split('@')[0];
      if (settings.whitelist.includes(senderNumber) || settings.whitelist.includes(sender)) {
        console.log(`[ANTIVV] Skipping whitelisted user: ${senderNumber}`);
        return;
      }

      // Only handle view-once messages
      let viewOnceMessage = null;
      let viewOnceType = '';
      
      if (m.message.viewOnceMessageV2) {
        viewOnceMessage = m.message.viewOnceMessageV2.message;
        viewOnceType = 'viewOnceMessageV2';
      } else if (m.message.viewOnceMessage) {
        viewOnceMessage = m.message.viewOnceMessage.message;
        viewOnceType = 'viewOnceMessage';
      } else if (m.message.viewOnceMessageV2Extension) {
        viewOnceMessage = m.message.viewOnceMessageV2Extension.message;
        viewOnceType = 'viewOnceMessageV2Extension';
      }

      if (!viewOnceMessage) return;

      // Log detection
      const timestamp = formatDateTime(new Date());
      console.log(`[ANTIVV] Detected view-once message from ${senderNumber} in ${jid}`);

      // Handle based on settings
      if (settings.logOnly) {
        console.log(`[ANTIVV] LOG ONLY - Would have revealed view-once from ${senderNumber}`);
        return;
      }

      // Determine media type
      const messageType = Object.keys(viewOnceMessage)[0];
      const mediaContent = viewOnceMessage[messageType];
      let mediaType = 'unknown';
      
      if (messageType === 'imageMessage') {
        mediaType = 'photo';
      } else if (messageType === 'videoMessage') {
        mediaType = 'video';
      } else {
        console.log(`[ANTIVV] Unsupported media type: ${messageType}`);
        return;
      }

      // Create notification message
      const notificationText = `🕵️‍♂️ *View-Once Media Revealed*\n\n` +
                              `👤 *From:* @${senderNumber}\n` +
                              `📸 *Type:* ${mediaType}\n` +
                              `⏰ *Time:* ${timestamp}\n\n` +
                              `🛡️ _Protected by Mahachi-XD_`;

      // Send notification
      if (settings.notifySender) {
        await sock.sendMessage(jid, {
          text: notificationText,
          mentions: [sender]
        }, { quoted: m });
      }

      // Forward the actual view-once media content
      const forwardMessage = {
        key: {
          remoteJid: jid,
          fromMe: false,
          id: messageId,
          participant: m.key.participant || undefined,
        },
        message: viewOnceMessage,
      };

      // Forward the message to reveal it
      await sock.sendMessage(
        jid,
        { forward: forwardMessage },
        { quoted: m }
      );

      // Log successful revelation
      console.log(`[ANTIVV] Revealed ${mediaType} from ${senderNumber} in ${jid}`);

      // Save to gallery if enabled (this would require additional implementation)
      if (settings.saveToGallery) {
        console.log(`[ANTIVV] Gallery save requested for ${mediaType} from ${senderNumber}`);
        // Implementation would depend on your file system setup
      }

    } catch (err) {
      console.error('[ANTIVV ERROR]', err);
      
      // Send error notification to owner (optional)
      /*
      try {
        if (process.env.DEVELOPER_MODE === 'true') {
          const ownerJid = 'your_owner_jid@s.whatsapp.net'; // Replace with actual owner JID
          await sock.sendMessage(ownerJid, {
            text: `❌ *Antivv Error:* ${err.message}`
          });
        }
      } catch (notificationError) {
        console.error('[ANTIVV] Failed to send error notification:', notificationError);
      }
      */
    }
  },
};

// Related command to manage antivv settings
module.exports.antivvCommand = {
  command: ['antivv'],
  aliases: ['viewonce', 'reveal'],
  tags: ['admin'],
  help: [
    'antivv on/off - Enable/disable view-once protection',
    'antivv whitelist <number> - Add number to whitelist',
    'antivv unwhitelist <number> - Remove number from whitelist',
    'antivv status - Show current settings'
  ],
  description: 'Manage view-once media protection settings',
  usage: '.antivv status',
  ownerOnly: true,
  
  async run({ sock, m, args }) {
    try {
      const subCommand = args[0]?.toLowerCase();
      
      // Ensure config directory exists
      const configDir = path.join(__dirname, '../../config');
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      
      // Load current settings
      let settings = {
        enabled: true,
        logOnly: false,
        whitelist: [],
        notifySender: true,
        saveToGallery: false
      };
      
      if (fs.existsSync(SETTINGS_PATH)) {
        try {
          const fileContent = fs.readFileSync(SETTINGS_PATH, 'utf8');
          settings = { ...settings, ...JSON.parse(fileContent || '{}') };
        } catch (settingsError) {
          console.error('[ANTIVV CMD] Failed to load settings:', settingsError);
        }
      }
      
      if (subCommand === 'on') {
        settings.enabled = true;
        fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
        return await sock.sendMessage(m.chat, {
          text: '✅ *Antivv protection enabled!*\n\n' +
                '🕵️‍♂️ View-once media will now be automatically revealed.'
        }, { quoted: m });
        
      } else if (subCommand === 'off') {
        settings.enabled = false;
        fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
        return await sock.sendMessage(m.chat, {
          text: '❌ *Antivv protection disabled.*\n\n' +
                '👁️ View-once media will not be revealed.'
        }, { quoted: m });
        
      } else if (subCommand === 'whitelist') {
        const number = args[1];
        if (!number) {
          return await sock.sendMessage(m.chat, {
            text: '📝 *Usage:* .antivv whitelist <phone_number>\n\n' +
                  'Example: .antivv whitelist 263784812740'
          }, { quoted: m });
        }
        
        const cleanNumber = number.replace(/\D/g, '');
        if (!settings.whitelist.includes(cleanNumber)) {
          settings.whitelist.push(cleanNumber);
          fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
          return await sock.sendMessage(m.chat, {
            text: `✅ *Added to whitelist:*\n📱 ${cleanNumber}\n\n` +
                  'This number\'s view-once media will not be revealed.'
          }, { quoted: m });
        } else {
          return await sock.sendMessage(m.chat, {
            text: `⚠️ *Already whitelisted:*\n📱 ${cleanNumber}`
          }, { quoted: m });
        }
        
      } else if (subCommand === 'unwhitelist') {
        const number = args[1];
        if (!number) {
          return await sock.sendMessage(m.chat, {
            text: '📝 *Usage:* .antivv unwhitelist <phone_number>\n\n' +
                  'Example: .antivv unwhitelist 263784812740'
          }, { quoted: m });
        }
        
        const cleanNumber = number.replace(/\D/g, '');
        const index = settings.whitelist.indexOf(cleanNumber);
        if (index > -1) {
          settings.whitelist.splice(index, 1);
          fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
          return await sock.sendMessage(m.chat, {
            text: `✅ *Removed from whitelist:*\n📱 ${cleanNumber}`
          }, { quoted: m });
        } else {
          return await sock.sendMessage(m.chat, {
            text: `⚠️ *Not in whitelist:*\n📱 ${cleanNumber}`
          }, { quoted: m });
        }
        
      } else {
        // Show status
        return await sock.sendMessage(m.chat, {
          text: `🕵️‍♂️ *Antivv Protection Status*\n\n` +
                `📊 *Enabled:* ${settings.enabled ? '✅ ON' : '❌ OFF'}\n` +
                `📝 *Log Only:* ${settings.logOnly ? '✅ ON' : '❌ OFF'}\n` +
                `📢 *Notify Sender:* ${settings.notifySender ? '✅ ON' : '❌ OFF'}\n` +
                `💾 *Save to Gallery:* ${settings.saveToGallery ? '✅ ON' : '❌ OFF'}\n` +
                `📋 *Whitelisted:* ${settings.whitelist.length} numbers\n\n` +
                `📝 *Usage:*\n` +
                `.antivv on/off - Toggle protection\n` +
                `.antivv whitelist <number> - Add to whitelist\n` +
                `.antivv unwhitelist <number> - Remove from whitelist\n` +
                `.antivv status - Show this message`
        }, { quoted: m });
      }
      
    } catch (err) {
      console.error('[ANTIVV CMD] Error:', err);
      return await sock.sendMessage(m.chat, {
        text: '❌ Failed to manage antivv settings.'
      }, { quoted: m });
    }
  }
};