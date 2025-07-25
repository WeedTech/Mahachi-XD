const { formatDateTime } = require('../../lib/format');

module.exports = {
  name: 'antidelgc',
  category: 'group',
  desc: 'Resend deleted messages in group (except bot-deleted or link messages)',
  usage: 'Automatically active in groups with anti-delete enabled',
  cooldown: 1,
  ownerOnly: false,
  groupOnly: false,
  privateOnly: false,
  adminOnly: false,
  botAdmin: true, // Bot needs to be admin to properly detect deleted messages
  
  // No command needed — this is an event-based plugin
  async onMessageDeleted({ sock, message, from, store }) {
    try {
      // Validate inputs
      if (!sock || !message || !from) {
        console.log('[ANTIDELGC] Missing required parameters');
        return;
      }
      
      // Only run in group chats
      if (!from.endsWith('@g.us')) {
        console.log('[ANTIDELGC] Not a group chat');
        return;
      }
      
      const isBot = message?.key?.fromMe;
      const sender = message?.key?.participant || message?.key?.remoteJid;
      const messageId = message?.key?.id;
      const content = message.message;
      const timestamp = message?.messageTimestamp ? new Date(message.messageTimestamp * 1000) : new Date();
      
      // Skip if message is from bot itself
      if (isBot) {
        console.log('[ANTIDELGC] Skipping bot message');
        return;
      }
      
      // Skip if no content
      if (!content) {
        console.log('[ANTIDELGC] No message content');
        return;
      }
      
      // Extract message text or caption
      let text = '';
      let messageType = '';
      
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
      
      // Skip if contains suspicious links
      const hasLink = /(https?:\/\/|wa\.me\/|chat\.whatsapp\.com\/)/gi.test(text);
      if (hasLink) {
        console.log('[ANTIDELGC] Skipping message with links');
        return;
      }
      
      // Skip very short or empty messages
      if (text && text.length < 2 && messageType === 'text') {
        console.log('[ANTIDELGC] Skipping very short message');
        return;
      }
      
      // Format sender information
      const senderNumber = sender ? sender.split('@')[0] : 'unknown';
      const formattedTime = formatDateTime(timestamp);
      
      // Create notification message
      let notificationText = `🕵️‍♂️ *Deleted Message Detected*\n\n`;
      notificationText += `👤 *From:* @${senderNumber}\n`;
      notificationText += `⏰ *Time:* ${formattedTime}\n`;
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
        mentions: [sender],
        contextInfo: {
          externalAdReply: {
            title: 'Anti-Delete GC',
            body: 'Message recovered by Mahachi-XD',
            thumbnailUrl: 'https://files.catbox.moe/b6hr8z.jpeg',
            mediaType: 1,
            renderLargerThumbnail: true
          }
        }
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
          console.error('[ANTIDELGC] Failed to resend media:', mediaError);
          // Send fallback message
          await sock.sendMessage(from, {
            text: `📎 *Note:* Could not recover the original ${messageType} content.`,
            mentions: [sender]
          });
        }
      }
      
      // Log successful recovery
      console.log(`[ANTIDELGC] Recovered deleted message from ${senderNumber} in ${from}`);
      
    } catch (err) {
      console.error('[ANTIDELGC] Error:', err);
      
      // Send error notification to group (optional - only in developer mode)
      /*
      try {
        if (process.env.DEVELOPER_MODE === 'true') {
          await sock.sendMessage(from, {
            text: '❌ *Anti-Delete Error:* Failed to process deleted message.'
          });
        }
      } catch (notificationError) {
        console.error('[ANTIDELGC] Failed to send error notification:', notificationError);
      }
      */
    }
  }
};

// Alternative implementation with store-based message tracking
/*
module.exports = {
  name: 'antidelgc',
  category: 'group',
  desc: 'Resend deleted messages in group with enhanced tracking',
  
  async onMessageDeleted({ sock, message, from, store }) {
    try {
      if (!from.endsWith('@g.us')) return;
      
      const isBot = message?.key?.fromMe;
      const sender = message?.key?.participant || message?.key?.remoteJid;
      const messageId = message?.key?.id;
      const content = message.message;
      
      if (!content || isBot) return;
      
      // Try to get more info from store if available
      let storedMessage = null;
      if (store) {
        try {
          storedMessage = await store.loadMessage(from, messageId);
        } catch (storeError) {
          console.log('[ANTIDELGC] Could not load from store');
        }
      }
      
      // Extract content (same as above)
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
      
      // Skip links
      const hasLink = /(https?:\/\/|wa\.me\/|chat\.whatsapp\.com\/)/gi.test(text);
      if (hasLink) return;
      
      // Create enhanced notification
      const senderNumber = sender ? sender.split('@')[0] : 'unknown';
      const notification = `🕵️‍♂️ *Deleted Message Alert*\n\n` +
                          `👤 From: @${senderNumber}\n` +
                          `📨 Type: ${messageType}\n` +
                          `🆔 Message ID: ${messageId?.substring(0, 8)}...\n` +
                          `${text ? `\n💬 Content:\n${text.substring(0, 300)}${text.length > 300 ? '...' : ''}` : '\n📎 [Media Content]'}`;
      
      // Send notification
      await sock.sendMessage(from, {
        text: notification,
        mentions: [sender]
      });
      
      // Resend media (same as above)
      // ... media resending logic
      
    } catch (err) {
      console.error('[ANTIDELGC] Error:', err);
    }
  }
};
*/