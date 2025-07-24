const fs = require('fs');
const path = require('path');

const settingsPath = path.join(__dirname, '../../config/settings.json');

function loadSettings() {
  try {
    return JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
  } catch {
    return {};
  }
}

function saveSettings(settings) {
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
}

const bios = [
  'MAHACHI-XD by WEED-TECH & JADEN',
  'Powered by IceFlowTech',
  'Your Friendly Mahachi Bot'
];

let bioInterval;

module.exports = {
  command: ['autobio'],
  tags: ['owner'],
  help: ['autobio start', 'autobio stop'],
  description: 'Automatically rotate bot bio/status',
  
  async run({ sock, m, text, owners }) {
    if (!owners.includes(m.sender.split('@')[0])) {
      return m.reply('❌ You are not authorized to use this command.');
    }
    
    if (!text) {
      return m.reply('⚠️ Usage:\n.autobio start\n.autobio stop');
    }
    
    const arg = text.toLowerCase();
    
    const settings = loadSettings();
    if (!settings.autobio) settings.autobio = { running: false, index: 0 };
    
    if (arg === 'start') {
      if (settings.autobio.running) return m.reply('ℹ️ Autobio is already running.');
      
      settings.autobio.running = true;
      saveSettings(settings);
      
      // Start cycling bios every 10 minutes (600000 ms)
      bioInterval = setInterval(async () => {
        try {
          const idx = settings.autobio.index ?? 0;
          const bioText = bios[idx % bios.length];
          await sock.query({
            tag: 'iq',
            attrs: {
              to: 'status@broadcast',
              type: 'set',
              xmlns: 'status',
            },
            content: [{ tag: 'status', attrs: {}, content: Buffer.from(bioText) }]
          });
          
          settings.autobio.index = (idx + 1) % bios.length;
          saveSettings(settings);
        } catch (e) {
          console.error('Autobio update error:', e);
        }
      }, 600000); // 10 minutes
      
      m.reply('✅ Autobio started. Bio will rotate every 10 minutes.');
    } else if (arg === 'stop') {
      if (!settings.autobio.running) return m.reply('ℹ️ Autobio is not running.');
      
      settings.autobio.running = false;
      saveSettings(settings);
      
      if (bioInterval) {
        clearInterval(bioInterval);
        bioInterval = null;
      }
      
      m.reply('🛑 Autobio stopped.');
    } else {
      m.reply('⚠️ Invalid argument. Use "start" or "stop".');
    }
  }
};