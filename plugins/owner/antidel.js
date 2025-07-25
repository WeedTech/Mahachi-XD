const fs = require('fs');
const path = require('path');
const settingsPath = path.join(__dirname, '../../config/settings.json');

module.exports = {
  name: 'antidelete',
  alias: ['antidel', 'delprotect'],
  category: 'owner',
  desc: 'Toggle antidelete feature on or off',
  usage: '.antidelete on/off',
  cooldown: 5,
  ownerOnly: true,
  groupOnly: false,
  privateOnly: false,
  adminOnly: false,
  botAdmin: false,
  
  async run({ sock, m, args, prefix, command, isOwner }) {
    try {
      // Ensure config directory exists
      const configDir = path.dirname(settingsPath);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      
      // Check if settings file exists, create default if not
      let settings = {};
      if (fs.existsSync(settingsPath)) {
        const fileContent = fs.readFileSync(settingsPath, 'utf8');
        settings = JSON.parse(fileContent || '{}');
      } else {
        // Create default settings
        settings = {
          antidelete: false,
          prefix: '.',
          ownerName: 'MAHACHI-XD Devs',
          botName: 'MAHACHI-XD'
        };
        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
      }
      
      const mode = args[0]?.toLowerCase();
      
      if (!['on', 'off'].includes(mode)) {
        // Show current status
        const currentStatus = settings.antidelete ? '✅ *ENABLED*' : '❌ *DISABLED*';
        
        return await sock.sendMessage(m.chat, {
          text: `🛡️ *Antidelete Status*\n\n` +
            `📊 *Current Status:* ${currentStatus}\n\n` +
            `📝 *Usage:*\n` +
            `• *${prefix}${command} on*  - Enable antidelete\n` +
            `• *${prefix}${command} off* - Disable antidelete\n\n` +
            `💡 *Feature:* Resends deleted messages in groups`
        }, { quoted: m });
      }
      
      const newStatus = mode === 'on';
      const oldStatus = settings.antidelete;
      
      // No change needed
      if (newStatus === oldStatus) {
        const statusText = newStatus ? 'enabled' : 'disabled';
        return await sock.sendMessage(m.chat, {
          text: `⚠️ *Antidelete is already ${statusText}.*`
        }, { quoted: m });
      }
      
      // Update settings
      settings.antidelete = newStatus;
      
      fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
      
      const actionText = newStatus ? 'enabled' : 'disabled';
      const emoji = newStatus ? '✅' : '❌';
      
      await sock.sendMessage(m.chat, {
        text: `${emoji} *Antidelete ${actionText} successfully!*\n\n` +
          `🛡️ *Status:* ${newStatus ? '✅ ACTIVE' : '❌ INACTIVE'}\n` +
          `💡 *Feature:* Will ${newStatus ? 'now' : 'no longer'} resend deleted messages\n\n` +
          `⚡ _Powered by Mahachi-XD_`
      }, { quoted: m });
      
      // Log the action
      const senderNumber = m.sender ? m.sender.split('@')[0] : 'unknown';
      console.log(`[ANTIDEL] Antidelete ${actionText} by ${senderNumber}`);
      
    } catch (e) {
      console.error('[ANTIDEL COMMAND ERROR]', e);
      
      let errorMessage = '❌ *An error occurred while toggling antidelete.*\n\n';
      
      if (e.code === 'ENOENT') {
        errorMessage += '📁 Settings file not found.\n';
      } else if (e instanceof SyntaxError) {
        errorMessage += '📄 Invalid settings file format.\n';
      } else if (e.code === 'EACCES') {
        errorMessage += '🔐 Permission denied to access settings file.\n';
      } else {
        errorMessage += '🔧 An unexpected error occurred.\n';
      }
      
      errorMessage += '\n💡 *Tips:*\n' +
        '• Check if config directory is writable\n' +
        '• Verify settings.json format\n' +
        '• Ensure proper file permissions';
      
      await sock.sendMessage(m.chat, {
        text: errorMessage
      }, { quoted: m });
    }
  }
};

// Related event handler for antidelete functionality
module.exports.antideleteEvent = {
  name: 'antidelete',
  type: 'event',
  
  async onMessageDeleted({ sock, message, from }) {
    try {
      // Load settings to check if antidelete is enabled
      if (!fs.existsSync(settingsPath)) {
        console.log('[ANTIDEL] Settings file not found');
        return;
      }
      
      const fileContent = fs.readFileSync(settingsPath, 'utf8');
      const settings = JSON.parse(fileContent || '{}');
      
      // Check if antidelete is enabled
      if (!settings.antidelete) {
        console.log('[ANTIDEL] Feature disabled');
        return;
      }
      
      // Validate message
      if (!message || !message.message || !from) {
        console.log('[ANTIDEL] Invalid message data');
        return;
      }
      
      // Only process group messages
      if (!from.endsWith('@g.us')) {
        console.log('[ANTIDEL] Not a group chat');
        return;
      }
      
      const isBot = message.key?.fromMe;
      const sender = message.key?.participant || message.key?.remoteJid;
      const content = message.message;
      
      // Skip bot messages
      if (isBot) {
        console.log('[ANTIDEL] Skipping bot message');
        return;
      }
      
      // Skip if no content
      if (!content) {
        console.log('[ANTIDEL] No message content');
        return;
      }
      
      // Extract message text or caption
      let text = '';
      let messageType = 'unknown';
      
      if (content?.conversation) {
        text = content.conversation;
        messageType = 'text';
      } else if (content?.extendedTextMessage?.text) {
        text = content.extendedTextMessage.text;
        messageType = 'text';
      } else if (content?.imageMessage?.caption) {
        text = content.imageMessage.caption;
        messageType = 'image';
      } else if (content?.videoMessage?.caption) {
        text = content.videoMessage.caption;
        messageType = 'video';
      } else if (content?.documentMessage?.caption) {
        text = content.documentMessage.caption;
        messageType = 'document';
      } else if (content?.audioMessage) {
        messageType = 'audio';
      } else if (content?.stickerMessage) {
        messageType = 'sticker';
      }
      
      // Skip very short messages
      if (text && text.length < 1 && messageType === 'text') {
        console.log('[ANTIDEL] Skipping very short message');
        return;
      }
      
      // Skip messages with suspicious links
      const hasLink = /(https?:\/\/|wa\.me\/|chat\.whatsapp\.com\/)/gi.test(text);
      if (hasLink) {
        console.log('[ANTIDEL] Skipping message with links');
        return;
      }
      
      // Format sender information
      const senderNumber = sender ? sender.split('@')[0] : 'unknown';
      
      // Create notification message
      let notificationText = `🕵️‍♂️ *Deleted Message Detected*\n\n`;
      notificationText += `👤 *From:* @${senderNumber}\n`;
      notificationText += `📨 *Type:* ${messageType.charAt(0).toUpperCase() + messageType.slice(1)}\n`;
      
      if (text && messageType !== 'audio' && messageType !== 'sticker') {
        notificationText += `\n💬 *Content:*\n${text.substring(0, 500)}`; // Limit text length
        if (text.length > 500) {
          notificationText += '...';
        }
      } else if (messageType === 'audio' || messageType === 'sticker') {
        notificationText += `\n📎 *[${messageType.toUpperCase()} MESSAGE]*`;
      } else {
        notificationText += `\n📎 *[MEDIA MESSAGE]*`;
      }
      
      // Send notification message
      await sock.sendMessage(from, {
        text: notificationText,
        mentions: [sender]
      });
      
      // Resend original media if present
      if (messageType !== 'text') {
        try {
          // Add small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          if (content?.imageMessage) {
            await sock.sendMessage(from, {
              image: { url: content.imageMessage.url },
              caption: text || '',
              mentions: [sender]
            });
          } else if (content?.videoMessage) {
            await sock.sendMessage(from, {
              video: { url: content.videoMessage.url },
              caption: text || '',
              mentions: [sender]
            });
          } else if (content?.documentMessage) {
            await sock.sendMessage(from, {
              document: { url: content.documentMessage.url },
              fileName: content.documentMessage.fileName || 'document',
              mimetype: content.documentMessage.mimetype || 'application/octet-stream',
              caption: text || '',
              mentions: [sender]
            });
          } else if (content?.audioMessage) {
            await sock.sendMessage(from, {
              audio: { url: content.audioMessage.url },
              mimetype: content.audioMessage.mimetype || 'audio/ogg',
              ptt: content.audioMessage.ptt || false,
              mentions: [sender]
            });
          } else if (content?.stickerMessage) {
            await sock.sendMessage(from, {
              sticker: { url: content.stickerMessage.url },
              mentions: [sender]
            });
          }
        } catch (mediaError) {
          console.error('[ANTIDEL] Failed to resend media:', mediaError);
          // Send fallback message
          await sock.sendMessage(from, {
            text: `📎 *Note:* Could not recover the original ${messageType} content.`,
            mentions: [sender]
          });
        }
      }
      
      // Log successful recovery
      console.log(`[ANTIDEL] Recovered deleted message from ${senderNumber} in ${from}`);
      
    } catch (err) {
      console.error('[ANTIDEL EVENT ERROR]', err);
    }
  }
};