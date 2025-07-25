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
    console.error('[AUTOREACT] Error loading settings:', error);
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
    console.error('[AUTOREACT] Error saving settings:', error);
  }
}

// Emoji list to randomly react with
const defaultEmojis = ['❤️', '😂', '👍', '🔥', '🥳', '🙌', '😊', '💯', '😎', '✨', '🤖', '😇', '🎉', '👏', '👌', '💪', '👀', '💥', '⭐', '🎯'];

// Emoji categories for more specific reactions
const emojiCategories = {
  positive: ['❤️', '👍', '💯', '✨', '🎉', '👏', '👌', '💪', '⭐', '🎯'],
  funny: ['😂', '🤣', '😆', '😹', '🤣', '😂', '😆', '🤣', '😂', '😆'],
  excited: ['🔥', '🥳', '🙌', '😎', '💥', '🎊', '🎈', '🎉', '🌟', '💫'],
  friendly: ['😊', '😇', '🙂', '🤗', '🥰', '😍', '😄', '😁', '😊', '😇']
};

module.exports = {
  command: ['autoreact'],
  aliases: ['autoreaction', 'reactionbot'],
  tags: ['owner'],
  help: [
    'autoreact on - Enable auto reactions',
    'autoreact off - Disable auto reactions',
    'autoreact add <emoji> - Add custom emoji',
    'autoreact remove <emoji> - Remove custom emoji',
    'autoreact list - List all emojis',
    'autoreact mode <random|positive|funny|excited|friendly> - Set reaction mode',
    'autoreact status - Show current status'
  ],
  description: 'Toggle auto reaction to all messages with customizable options',
  usage: '.autoreact on',
  cooldown: 5,
  ownerOnly: true,
  groupOnly: false,
  privateOnly: false,
  adminOnly: false,
  botAdmin: false,
  
  async run({ sock, m, text, from, owners, isOwner }) {
    try {
      if (!isOwner) {
        return await sock.sendMessage(m.chat, {
          text: '❌ You are not authorized to use this command.'
        }, { quoted: m });
      }
      
      const args = text ? text.trim().split(' ') : [];
      const subCommand = args[0]?.toLowerCase() || '';
      
      const settings = loadSettings();
      if (!settings.autoreact) {
        settings.autoreact = { 
          enabled: false, 
          emojis: [...defaultEmojis],
          mode: 'random',
          whitelist: [],
          blacklist: []
        };
        saveSettings(settings);
      }
      
      const autoreactSettings = settings.autoreact;
      
      if (!subCommand) {
        // Show current status and help
        const status = autoreactSettings.enabled ? '✅ *ENABLED*' : '❌ *DISABLED*';
        const mode = autoreactSettings.mode || 'random';
        
        return await sock.sendMessage(m.chat, {
          text: `🤖 *Autoreact Status*\n\n` +
                `📊 *Status:* ${status}\n` +
                `🎮 *Mode:* ${mode}\n` +
                `📋 *Emojis:* ${autoreactSettings.emojis.length}\n` +
                `✅ *Whitelist:* ${autoreactSettings.whitelist.length} chats\n` +
                `❌ *Blacklist:* ${autoreactSettings.blacklist.length} chats\n\n` +
                `📝 *Usage:*\n` +
                `.autoreact on - Enable reactions\n` +
                `.autoreact off - Disable reactions\n` +
                `.autoreact add <emoji> - Add emoji\n` +
                `.autoreact list - Show emojis\n` +
                `.autoreact mode <type> - Set mode\n` +
                `.autoreact status - Show this message`
        }, { quoted: m });
      }
      
      if (subCommand === 'on') {
        autoreactSettings.enabled = true;
        saveSettings(settings);
        
        await sock.sendMessage(m.chat, {
          text: `✅ *Auto React enabled!*\n\n` +
                `🎮 *Mode:* ${autoreactSettings.mode}\n` +
                `📋 *Emojis:* ${autoreactSettings.emojis.length}\n` +
                `🤖 *Will react to all incoming messages*`
        }, { quoted: m });
        
      } else if (subCommand === 'off') {
        autoreactSettings.enabled = false;
        saveSettings(settings);
        
        await sock.sendMessage(m.chat, {
          text: '❌ *Auto React disabled.*\n\n' +
                'No automatic reactions will be sent.'
        }, { quoted: m });
        
      } else if (subCommand === 'add') {
        const newEmoji = args[1];
        if (!newEmoji) {
          return await sock.sendMessage(m.chat, {
            text: '📝 *Usage:* .autoreact add <emoji>\n\n' +
                  'Example: .autoreact add 🎯'
          }, { quoted: m });
        }
        
        // Validate emoji (basic check)
        if (newEmoji.length > 10) {
          return await sock.sendMessage(m.chat, {
            text: '❌ Invalid emoji. Please use a single emoji character.'
          }, { quoted: m });
        }
        
        if (!autoreactSettings.emojis.includes(newEmoji)) {
          autoreactSettings.emojis.push(newEmoji);
          saveSettings(settings);
          
          await sock.sendMessage(m.chat, {
            text: `✅ *Emoji added successfully!*\n\n` +
                  `${newEmoji} Added to reaction list\n` +
                  `📊 Total emojis: ${autoreactSettings.emojis.length}`
          }, { quoted: m });
        } else {
          await sock.sendMessage(m.chat, {
            text: `⚠️ *Emoji already exists:*\n${newEmoji}`
          }, { quoted: m });
        }
        
      } else if (subCommand === 'remove') {
        const emojiToRemove = args[1];
        if (!emojiToRemove) {
          return await sock.sendMessage(m.chat, {
            text: '📝 *Usage:* .autoreact remove <emoji>\n\n' +
                  'Example: .autoreact remove 🎯'
          }, { quoted: m });
        }
        
        const index = autoreactSettings.emojis.indexOf(emojiToRemove);
        if (index > -1) {
          autoreactSettings.emojis.splice(index, 1);
          saveSettings(settings);
          
          await sock.sendMessage(m.chat, {
            text: `✅ *Emoji removed successfully!*\n\n` +
                  `${emojiToRemove} Removed from reaction list\n` +
                  `📊 Remaining emojis: ${autoreactSettings.emojis.length}`
          }, { quoted: m });
        } else {
          await sock.sendMessage(m.chat, {
            text: `❌ *Emoji not found:*\n${emojiToRemove}`
          }, { quoted: m });
        }
        
      } else if (subCommand === 'list') {
        if (autoreactSettings.emojis.length === 0) {
          return await sock.sendMessage(m.chat, {
            text: '📋 *No emojis available.*\nAdd some emojis with .autoreact add <emoji>'
          }, { quoted: m });
        }
        
        const emojiList = autoreactSettings.emojis.join(' ');
        await sock.sendMessage(m.chat, {
          text: `📋 *Autoreact Emojis:*\n\n${emojiList}\n\n📊 Total: ${autoreactSettings.emojis.length} emojis`
        }, { quoted: m });
        
      } else if (subCommand === 'mode') {
        const mode = args[1]?.toLowerCase();
        const validModes = ['random', 'positive', 'funny', 'excited', 'friendly'];
        
        if (!validModes.includes(mode)) {
          return await sock.sendMessage(m.chat, {
            text: `🎮 *Usage:* .autoreact mode <type>\n\n` +
                  `📝 *Available modes:*\n` +
                  `• random - Random emojis from all lists\n` +
                  `• positive - Positive reaction emojis\n` +
                  `• funny - Funny/humor emojis\n` +
                  `• excited - Excited/exclamation emojis\n` +
                  `• friendly - Friendly/smiley emojis`
          }, { quoted: m });
        }
        
        autoreactSettings.mode = mode;
        saveSettings(settings);
        
        await sock.sendMessage(m.chat, {
          text: `✅ *Reaction mode updated!*\n\n` +
                `🎮 *Mode:* ${mode}\n` +
                `💡 Reactions will now use ${mode} emojis`
        }, { quoted: m });
        
      } else if (subCommand === 'whitelist') {
        const chatId = args[1];
        if (!chatId) {
          return await sock.sendMessage(m.chat, {
            text: '📝 *Usage:* .autoreact whitelist <chat_id>\n\n' +
                  'Use "current" to add current chat'
          }, { quoted: m });
        }
        
        const targetChat = chatId === 'current' ? m.chat : chatId;
        
        if (!autoreactSettings.whitelist.includes(targetChat)) {
          autoreactSettings.whitelist.push(targetChat);
          saveSettings(settings);
          
          await sock.sendMessage(m.chat, {
            text: `✅ *Chat added to whitelist!*\n\n` +
                  `🆔 ${targetChat}\n` +
                  `📊 Total whitelisted: ${autoreactSettings.whitelist.length}`
          }, { quoted: m });
        } else {
          await sock.sendMessage(m.chat, {
            text: `⚠️ *Chat already whitelisted:*\n${targetChat}`
          }, { quoted: m });
        }
        
      } else if (subCommand === 'blacklist') {
        const chatId = args[1];
        if (!chatId) {
          return await sock.sendMessage(m.chat, {
            text: '📝 *Usage:* .autoreact blacklist <chat_id>\n\n' +
                  'Use "current" to add current chat'
          }, { quoted: m });
        }
        
        const targetChat = chatId === 'current' ? m.chat : chatId;
        
        if (!autoreactSettings.blacklist.includes(targetChat)) {
          autoreactSettings.blacklist.push(targetChat);
          saveSettings(settings);
          
          await sock.sendMessage(m.chat, {
            text: `✅ *Chat added to blacklist!*\n\n` +
                  `🆔 ${targetChat}\n` +
                  `📊 Total blacklisted: ${autoreactSettings.blacklist.length}`
          }, { quoted: m });
        } else {
          await sock.sendMessage(m.chat, {
            text: `⚠️ *Chat already blacklisted:*\n${targetChat}`
          }, { quoted: m });
        }
        
      } else {
        await sock.sendMessage(m.chat, {
          text: `❌ *Invalid subcommand.*\n\n` +
                `📝 *Available commands:*\n` +
                `.autoreact on - Enable reactions\n` +
                `.autoreact off - Disable reactions\n` +
                `.autoreact add <emoji> - Add emoji\n` +
                `.autoreact remove <emoji> - Remove emoji\n` +
                `.autoreact list - Show emojis\n` +
                `.autoreact mode <type> - Set mode\n` +
                `.autoreact whitelist <chat> - Add to whitelist\n` +
                `.autoreact blacklist <chat> - Add to blacklist\n` +
                `.autoreact status - Show status`
        }, { quoted: m });
      }
      
    } catch (error) {
      console.error('[AUTOREACT] Error:', error);
      
      let errorMessage = '❌ *Failed to process autoreact command.*\n\n';
      
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

// Event handler for auto reactions
module.exports.autoreactEvent = {
  name: 'autoreact',
  type: 'event',
  
  async onMessage({ sock, m }) {
    try {
      // Load settings
      const settings = loadSettings();
      
      // Check if autoreact is enabled
      if (!settings.autoreact?.enabled) return;
      
      // Validate message
      if (!m || !m.key || m.key.fromMe) return;
      
      const chatId = m.key.remoteJid;
      const sender = m.key.participant || m.key.remoteJid;
      
      // Check whitelist/blacklist
      const autoreactSettings = settings.autoreact;
      
      // If whitelist exists and chat is not in whitelist, skip
      if (autoreactSettings.whitelist.length > 0 && 
          !autoreactSettings.whitelist.includes(chatId)) {
        return;
      }
      
      // If chat is in blacklist, skip
      if (autoreactSettings.blacklist.includes(chatId)) {
        return;
      }
      
      // Choose emoji based on mode
      let emojiToReact = '';
      
      if (autoreactSettings.mode === 'positive' && emojiCategories.positive.length > 0) {
        emojiToReact = emojiCategories.positive[Math.floor(Math.random() * emojiCategories.positive.length)];
      } else if (autoreactSettings.mode === 'funny' && emojiCategories.funny.length > 0) {
        emojiToReact = emojiCategories.funny[Math.floor(Math.random() * emojiCategories.funny.length)];
      } else if (autoreactSettings.mode === 'excited' && emojiCategories.excited.length > 0) {
        emojiToReact = emojiCategories.excited[Math.floor(Math.random() * emojiCategories.excited.length)];
      } else if (autoreactSettings.mode === 'friendly' && emojiCategories.friendly.length > 0) {
        emojiToReact = emojiCategories.friendly[Math.floor(Math.random() * emojiCategories.friendly.length)];
      } else {
        // Default to random from custom list
        if (autoreactSettings.emojis.length > 0) {
          emojiToReact = autoreactSettings.emojis[Math.floor(Math.random() * autoreactSettings.emojis.length)];
        } else {
          // Fallback to default emojis
          emojiToReact = defaultEmojis[Math.floor(Math.random() * defaultEmojis.length)];
        }
      }
      
      // Send reaction
      await sock.sendMessage(chatId, {
        react: { text: emojiToReact, key: m.key }
      });
      
      // Log successful reaction
      console.log(`[AUTOREACT] Reacted with ${emojiToReact} to message from ${sender} in ${chatId}`);
      
    } catch (error) {
      console.error('[AUTOREACT EVENT] Error:', error);
    }
  }
};