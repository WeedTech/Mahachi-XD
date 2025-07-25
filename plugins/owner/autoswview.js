const fs = require('fs');
const path = require('path');
const { formatDateTime } = require('../../lib/format');

const settingsPath = path.join(__dirname, '../../config/settings.json');

function loadSettings() {
  try {
    if (fs.existsSync(settingsPath)) {
      const fileContent = fs.readFileSync(settingsPath, 'utf8');
      return JSON.parse(fileContent || '{}');
    }
    return {};
  } catch (error) {
    console.error('[AUTOSWVIEW] Error loading settings:', error);
    return {};
  }
}

function saveSettings(settings) {
  try {
    // Ensure config directory exists
    const configDir = path.dirname(settingsPath);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
  } catch (error) {
    console.error('[AUTOSWVIEW] Error saving settings:', error);
  }
}

module.exports = {
  command: ['autoswview'],
  aliases: ['autostatusview', 'statusview'],
  tags: ['owner'],
  help: [
    'autoswview on - Enable auto status view',
    'autoswview off - Disable auto status view',
    'autoswview react <emoji> - Set reaction emoji',
    'autoswview list - List viewed statuses',
    'autoswview clear - Clear viewed statuses log',
    'autoswview status - Show current status'
  ],
  description: 'Enable/Disable automatic status view with customizable reactions',
  usage: '.autoswview on',
  cooldown: 5,
  ownerOnly: true,
  groupOnly: false,
  privateOnly: false,
  adminOnly: false,
  botAdmin: false,
  
  async run({ sock, m, text, owners, isOwner }) {
    try {
      if (!isOwner) {
        return await sock.sendMessage(m.chat, {
          text: '❌ You are not authorized to use this command.'
        }, { quoted: m });
      }
      
      const args = text ? text.trim().split(' ') : [];
      const subCommand = args[0]?.toLowerCase() || '';
      
      const settings = loadSettings();
      if (!settings.autoswview) {
        settings.autoswview = { 
          enabled: false, 
          reactionEmoji: '🍑',
          viewedStatuses: [],
          maxLogEntries: 100
        };
        saveSettings(settings);
      }
      
      const autoswSettings = settings.autoswview;
      
      if (!subCommand) {
        // Show current status and help
        const status = autoswSettings.enabled ? '✅ *ENABLED*' : '❌ *DISABLED*';
        const reaction = autoswSettings.reactionEmoji || '🍑';
        const viewedCount = autoswSettings.viewedStatuses?.length || 0;
        
        return await sock.sendMessage(m.chat, {
          text: `👁️ *Auto Status View Status*\n\n` +
                `📊 *Status:* ${status}\n` +
                `😀 *Reaction:* ${reaction}\n` +
                `📋 *Viewed:* ${viewedCount} statuses\n\n` +
                `📝 *Usage:*\n` +
                `.autoswview on - Enable auto view\n` +
                `.autoswview off - Disable auto view\n` +
                `.autoswview react <emoji> - Set reaction\n` +
                `.autoswview list - View log\n` +
                `.autoswview status - Show this message`
        }, { quoted: m });
      }
      
      if (subCommand === 'on') {
        autoswSettings.enabled = true;
        saveSettings(settings);
        
        await sock.sendMessage(m.chat, {
          text: `✅ *Auto Status View Enabled!*\n\n` +
                `😀 *Reaction:* ${autoswSettings.reactionEmoji || '🍑'}\n` +
                `👁️ *Will automatically view all statuses*`
        }, { quoted: m });
        
      } else if (subCommand === 'off') {
        autoswSettings.enabled = false;
        saveSettings(settings);
        
        await sock.sendMessage(m.chat, {
          text: '❌ *Auto Status View Disabled.*\n\n' +
                'Statuses will not be automatically viewed.'
        }, { quoted: m });
        
      } else if (subCommand === 'react') {
        const emoji = args[1];
        if (!emoji) {
          return await sock.sendMessage(m.chat, {
            text: '😀 *Usage:* .autoswview react <emoji>\n\n' +
                  'Example: .autoswview react 👍'
          }, { quoted: m });
        }
        
        // Basic emoji validation
        if (emoji.length > 10) {
          return await sock.sendMessage(m.chat, {
            text: '❌ Please use a single emoji or short emoji sequence.'
          }, { quoted: m });
        }
        
        autoswSettings.reactionEmoji = emoji;
        saveSettings(settings);
        
        await sock.sendMessage(m.chat, {
          text: `✅ *Reaction emoji updated!*\n\n` +
                `😀 New reaction: ${emoji}\n` +
                `💡 Will use this emoji for status reactions`
        }, { quoted: m });
        
      } else if (subCommand === 'list') {
        const viewedStatuses = autoswSettings.viewedStatuses || [];
        
        if (viewedStatuses.length === 0) {
          return await sock.sendMessage(m.chat, {
            text: '📋 *No statuses viewed yet.*\n' +
                  'Enable auto view to start logging.'
          }, { quoted: m });
        }
        
        // Show last 10 viewed statuses
        const recentStatuses = viewedStatuses.slice(-10);
        let statusList = '📋 *Recently Viewed Statuses:*\n\n';
        
        recentStatuses.forEach((status, index) => {
          const time = status.timestamp ? new Date(status.timestamp).toLocaleString() : 'Unknown time';
          statusList += `${index + 1}. 📱 ${status.senderNumber || 'Unknown'}\n` +
                       `   ⏰ ${time}\n` +
                       `   📝 ${status.caption ? status.caption.substring(0, 30) + '...' : 'No caption'}\n\n`;
        });
        
        statusList += `📊 *Total viewed:* ${viewedStatuses.length}`;
        
        await sock.sendMessage(m.chat, {
          text: statusList
        }, { quoted: m });
        
      } else if (subCommand === 'clear') {
        autoswSettings.viewedStatuses = [];
        saveSettings(settings);
        
        await sock.sendMessage(m.chat, {
          text: '✅ *Viewed statuses log cleared!*\n\n' +
                'All viewing history has been removed.'
        }, { quoted: m });
        
      } else {
        await sock.sendMessage(m.chat, {
          text: `❌ *Invalid subcommand.*\n\n` +
                `📝 *Available commands:*\n` +
                `.autoswview on - Enable auto view\n` +
                `.autoswview off - Disable auto view\n` +
                `.autoswview react <emoji> - Set reaction\n` +
                `.autoswview list - View log\n` +
                `.autoswview clear - Clear log\n` +
                `.autoswview status - Show status`
        }, { quoted: m });
      }
      
    } catch (error) {
      console.error('[AUTOSWVIEW] Error:', error);
      
      let errorMessage = '❌ *Failed to process autoswview command.*\n\n';
      
      if (error.code === 'ENOENT') {
        errorMessage += '📁 Settings file not found.\n';
      } else if (error instanceof SyntaxError) {
        errorMessage += '📄 Invalid settings file format.\n';
      } else if (error.code === 'EACCES') {
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

// Event handler for auto status viewing
module.exports.autoswviewEvent = {
  name: 'autoswview',
  type: 'event',
  
  async onStatusUpdate({ sock, status, contacts }) {
    try {
      // Load settings
      const settings = loadSettings();
      
      // Check if autoswview is enabled
      if (!settings.autoswview?.enabled) return;
      
      // Validate status update
      if (!status || !status.messages || status.messages.length === 0) return;
      
      const autoswSettings = settings.autoswview;
      const reactionEmoji = autoswSettings.reactionEmoji || '🍑';
      
      // Process each status message
      for (const message of status.messages) {
        try {
          const senderJid = message.key?.participant || message.key?.remoteJid;
          if (!senderJid) continue;
          
          const senderNumber = senderJid.split('@')[0];
          
          // Skip if it's our own status
          if (senderJid === sock.user.id.split(':')[0] + '@s.whatsapp.net') {
            continue;
          }
          
          // Extract caption if available
          let caption = '';
          if (message.message?.extendedTextMessage?.text) {
            caption = message.message.extendedTextMessage.text;
          } else if (message.message?.imageMessage?.caption) {
            caption = message.message.imageMessage.caption;
          } else if (message.message?.videoMessage?.caption) {
            caption = message.message.videoMessage.caption;
          }
          
          // Log viewed status
          if (!autoswSettings.viewedStatuses) {
            autoswSettings.viewedStatuses = [];
          }
          
          const statusEntry = {
            senderJid,
            senderNumber,
            caption: caption.substring(0, 100),
            timestamp: new Date().toISOString(),
            messageId: message.key?.id
          };
          
          autoswSettings.viewedStatuses.push(statusEntry);
          
          // Limit log size
          if (autoswSettings.viewedStatuses.length > (autoswSettings.maxLogEntries || 100)) {
            autoswSettings.viewedStatuses = autoswSettings.viewedStatuses.slice(-50);
          }
          
          // Save settings
          saveSettings(settings);
          
          // Send reaction
          try {
            await sock.sendMessage('status@broadcast', {
              react: { 
                text: reactionEmoji, 
                key: message.key 
              }
            });
            
            console.log(`[AUTOSWVIEW] Viewed status from ${senderNumber} and reacted with ${reactionEmoji}`);
          } catch (reactionError) {
            console.error(`[AUTOSWVIEW] Failed to react to status from ${senderNumber}:`, reactionError);
          }
          
        } catch (messageError) {
          console.error('[AUTOSWVIEW] Error processing status message:', messageError);
        }
      }
      
    } catch (error) {
      console.error('[AUTOSWVIEW EVENT] Error:', error);
    }
  }
};