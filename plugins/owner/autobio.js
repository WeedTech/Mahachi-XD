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
    console.error('[AUTOBIO] Error loading settings:', error);
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
    console.error('[AUTOBIO] Error saving settings:', error);
  }
}

const defaultBios = [
  'MAHACHI-XD by WEED-TECH & JADEN',
  'Powered by IceFlowTech',
  'Your Friendly Mahachi Bot',
  '🚀 Always Online & Ready to Help!',
  '🤖 MAHACHI-XD - Advanced WhatsApp Bot',
  '⚡ Lightning Fast Responses',
  '🛡️ Protected by WEED-TECH Security',
  '🌐 Serving You 24/7',
  '🎯 Precision & Performance',
  '🔥 Built with Love & Code'
];

let bioInterval;
let currentIntervalTime = 600000; // Default 10 minutes

module.exports = {
  command: ['autobio'],
  aliases: ['autostatus', 'statusbot'],
  tags: ['owner'],
  help: [
    'autobio start - Start auto bio rotation',
    'autobio stop - Stop auto bio rotation',
    'autobio add <bio> - Add custom bio',
    'autobio remove <index> - Remove bio at index',
    'autobio list - List all bios',
    'autobio interval <minutes> - Set rotation interval',
    'autobio status - Show current status'
  ],
  description: 'Automatically rotate bot bio/status with custom options',
  usage: '.autobio start',
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
      if (!settings.autobio) {
        settings.autobio = { 
          running: false, 
          index: 0, 
          bios: [...defaultBios],
          interval: 600000 // 10 minutes
        };
        saveSettings(settings);
      }
      
      const autobioSettings = settings.autobio;
      currentIntervalTime = autobioSettings.interval || 600000;
      
      if (!subCommand) {
        // Show current status and help
        const status = autobioSettings.running ? '✅ *RUNNING*' : '❌ *STOPPED*';
        const currentBio = autobioSettings.bios[autobioSettings.index] || 'None';
        const intervalMinutes = Math.floor(currentIntervalTime / 60000);
        
        return await sock.sendMessage(m.chat, {
          text: `🤖 *Autobio Status*\n\n` +
                `📊 *Status:* ${status}\n` +
                `⏱️ *Interval:* ${intervalMinutes} minutes\n` +
                `📋 *Bios:* ${autobioSettings.bios.length}\n` +
                `📍 *Current Bio:* ${currentBio}\n\n` +
                `📝 *Usage:*\n` +
                `.autobio start - Start rotation\n` +
                `.autobio stop - Stop rotation\n` +
                `.autobio add <bio> - Add new bio\n` +
                `.autobio list - Show all bios\n` +
                `.autobio interval <minutes> - Set interval\n` +
                `.autobio status - Show this message`
        }, { quoted: m });
      }
      
      if (subCommand === 'start') {
        if (autobioSettings.running) {
          return await sock.sendMessage(m.chat, {
            text: 'ℹ️ Autobio is already running.'
          }, { quoted: m });
        }
        
        if (autobioSettings.bios.length === 0) {
          return await sock.sendMessage(m.chat, {
            text: '❌ No bios available. Add some bios first.'
          }, { quoted: m });
        }
        
        autobioSettings.running = true;
        saveSettings(settings);
        
        // Start cycling bios
        if (bioInterval) {
          clearInterval(bioInterval);
        }
        
        bioInterval = setInterval(async () => {
          try {
            const idx = autobioSettings.index ?? 0;
            const bioText = autobioSettings.bios[idx % autobioSettings.bios.length];
            
            // Update bio
            await sock.query({
              tag: 'iq',
              attrs: {
                to: 'status@broadcast',
                type: 'set',
                xmlns: 'status',
              },
              content: [{ tag: 'status', attrs: {}, content: Buffer.from(bioText, 'utf-8') }]
            });
            
            console.log(`[AUTOBIO] Updated status to: ${bioText}`);
            
            autobioSettings.index = (idx + 1) % autobioSettings.bios.length;
            saveSettings(settings);
            
          } catch (e) {
            console.error('[AUTOBIO] Update error:', e);
          }
        }, currentIntervalTime);
        
        // Set initial bio
        try {
          const initialBio = autobioSettings.bios[autobioSettings.index];
          await sock.query({
            tag: 'iq',
            attrs: {
              to: 'status@broadcast',
              type: 'set',
              xmlns: 'status',
            },
            content: [{ tag: 'status', attrs: {}, content: Buffer.from(initialBio, 'utf-8') }]
          });
        } catch (initialError) {
          console.error('[AUTOBIO] Initial bio set error:', initialError);
        }
        
        const intervalMinutes = Math.floor(currentIntervalTime / 60000);
        await sock.sendMessage(m.chat, {
          text: `✅ *Autobio started!*\n\n` +
                `⏱️ *Interval:* ${intervalMinutes} minutes\n` +
                `📋 *Total Bios:* ${autobioSettings.bios.length}\n` +
                `🤖 *Status updates will rotate automatically*`
        }, { quoted: m });
        
      } else if (subCommand === 'stop') {
        if (!autobioSettings.running) {
          return await sock.sendMessage(m.chat, {
            text: 'ℹ️ Autobio is not running.'
          }, { quoted: m });
        }
        
        autobioSettings.running = false;
        saveSettings(settings);
        
        if (bioInterval) {
          clearInterval(bioInterval);
          bioInterval = null;
        }
        
        await sock.sendMessage(m.chat, {
          text: '🛑 *Autobio stopped.*\n\n' +
                'Your bio will no longer rotate automatically.'
        }, { quoted: m });
        
      } else if (subCommand === 'add') {
        const newBio = args.slice(1).join(' ');
        if (!newBio) {
          return await sock.sendMessage(m.chat, {
            text: '📝 *Usage:* .autobio add <your bio text>'
          }, { quoted: m });
        }
        
        autobioSettings.bios.push(newBio);
        saveSettings(settings);
        
        await sock.sendMessage(m.chat, {
          text: `✅ *Bio added successfully!*\n\n` +
                `📝 "${newBio}"\n` +
                `📊 Total bios: ${autobioSettings.bios.length}`
        }, { quoted: m });
        
      } else if (subCommand === 'remove') {
        const index = parseInt(args[1]);
        if (isNaN(index) || index < 0 || index >= autobioSettings.bios.length) {
          return await sock.sendMessage(m.chat, {
            text: `❌ Invalid index. Use .autobio list to see available bios.\n` +
                  `Valid indices: 0-${autobioSettings.bios.length - 1}`
          }, { quoted: m });
        }
        
        const removedBio = autobioSettings.bios.splice(index, 1)[0];
        saveSettings(settings);
        
        await sock.sendMessage(m.chat, {
          text: `✅ *Bio removed successfully!*\n\n` +
                `📝 Removed: "${removedBio}"\n` +
                `📊 Remaining bios: ${autobioSettings.bios.length}`
        }, { quoted: m });
        
      } else if (subCommand === 'list') {
        if (autobioSettings.bios.length === 0) {
          return await sock.sendMessage(m.chat, {
            text: '📋 *No bios available.*\nAdd some bios with .autobio add <bio>'
          }, { quoted: m });
        }
        
        let bioList = '📋 *Autobio List:*\n\n';
        autobioSettings.bios.forEach((bio, index) => {
          const marker = index === autobioSettings.index ? '📍' : '•';
          bioList += `${marker} ${index}. ${bio}\n`;
        });
        
        await sock.sendMessage(m.chat, {
          text: bioList
        }, { quoted: m });
        
      } else if (subCommand === 'interval') {
        const minutes = parseInt(args[1]);
        if (isNaN(minutes) || minutes < 1 || minutes > 1440) { // 1 minute to 24 hours
          return await sock.sendMessage(m.chat, {
            text: '⏱️ *Usage:* .autobio interval <minutes>\n' +
                  'Range: 1-1440 minutes (1 minute to 24 hours)'
          }, { quoted: m });
        }
        
        const newInterval = minutes * 60000; // Convert to milliseconds
        autobioSettings.interval = newInterval;
        currentIntervalTime = newInterval;
        saveSettings(settings);
        
        // Restart interval if running
        if (autobioSettings.running && bioInterval) {
          clearInterval(bioInterval);
          bioInterval = setInterval(async () => {
            try {
              const idx = autobioSettings.index ?? 0;
              const bioText = autobioSettings.bios[idx % autobioSettings.bios.length];
              
              await sock.query({
                tag: 'iq',
                attrs: {
                  to: 'status@broadcast',
                  type: 'set',
                  xmlns: 'status',
                },
                content: [{ tag: 'status', attrs: {}, content: Buffer.from(bioText, 'utf-8') }]
              });
              
              autobioSettings.index = (idx + 1) % autobioSettings.bios.length;
              saveSettings(settings);
              
            } catch (e) {
              console.error('[AUTOBIO] Update error:', e);
            }
          }, currentIntervalTime);
        }
        
        await sock.sendMessage(m.chat, {
          text: `✅ *Interval updated successfully!*\n\n` +
                `⏱️ New interval: ${minutes} minutes\n` +
                `${autobioSettings.running ? '🔄 Interval will update on next rotation' : '💡 Start autobio to apply changes'}`
        }, { quoted: m });
        
      } else {
        await sock.sendMessage(m.chat, {
          text: `❌ *Invalid subcommand.*\n\n` +
                `📝 *Available commands:*\n` +
                `.autobio start - Start rotation\n` +
                `.autobio stop - Stop rotation\n` +
                `.autobio add <bio> - Add new bio\n` +
                `.autobio remove <index> - Remove bio\n` +
                `.autobio list - Show all bios\n` +
                `.autobio interval <minutes> - Set interval\n` +
                `.autobio status - Show status`
        }, { quoted: m });
      }
      
    } catch (error) {
      console.error('[AUTOBIO] Error:', error);
      
      let errorMessage = '❌ *Failed to process autobio command.*\n\n';
      
      if (error.message?.includes('query')) {
        errorMessage += '📡 Connection issue with WhatsApp servers.\n';
      } else if (error.message?.includes('permission')) {
        errorMessage += '🔐 Insufficient permissions to update status.\n';
      } else {
        errorMessage += '🔧 An unexpected error occurred.\n';
      }
      
      errorMessage += '\n💡 *Tips:*\n' +
                     '• Ensure the bot is connected\n' +
                     '• Check your internet connection\n' +
                     '• Try again in a moment';
      
      await sock.sendMessage(m.chat, {
        text: errorMessage
      }, { quoted: m });
    }
  }
};

// Initialize on startup
function initializeAutobio(sock) {
  try {
    const settings = loadSettings();
    if (settings.autobio && settings.autobio.running) {
      // Resume autobio if it was running
      console.log('[AUTOBIO] Resuming autobio from previous session...');
      
      const autobioSettings = settings.autobio;
      currentIntervalTime = autobioSettings.interval || 600000;
      
      if (bioInterval) {
        clearInterval(bioInterval);
      }
      
      bioInterval = setInterval(async () => {
        try {
          const idx = autobioSettings.index ?? 0;
          const bioText = autobioSettings.bios[idx % autobioSettings.bios.length];
          
          await sock.query({
            tag: 'iq',
            attrs: {
              to: 'status@broadcast',
              type: 'set',
              xmlns: 'status',
            },
            content: [{ tag: 'status', attrs: {}, content: Buffer.from(bioText, 'utf-8') }]
          });
          
          autobioSettings.index = (idx + 1) % autobioSettings.bios.length;
          saveSettings(settings);
          
        } catch (e) {
          console.error('[AUTOBIO] Resume update error:', e);
        }
      }, currentIntervalTime);
    }
  } catch (error) {
    console.error('[AUTOBIO] Initialization error:', error);
  }
}

// Export initialization function
module.exports.initializeAutobio = initializeAutobio;