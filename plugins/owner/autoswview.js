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

module.exports = {
  command: ['autoswview'],
  tags: ['owner'],
  help: ['autoswview on', 'autoswview off'],
  description: 'Enable/Disable automatic status view and 🍑 emoji reaction',
  
  async run({ sock, m, text, owners }) {
    if (!owners.includes(m.sender.split('@')[0])) {
      return m.reply('❌ You are not authorized to use this command.');
    }
    
    if (!text) {
      return m.reply('⚠️ Usage:\n.autoswview on\n.autoswview off');
    }
    
    const arg = text.toLowerCase();
    const settings = loadSettings();
    if (!settings.autoswview) settings.autoswview = { enabled: false };
    
    if (arg === 'on') {
      settings.autoswview.enabled = true;
      saveSettings(settings);
      return m.reply('✅ Auto Status View + 🍑 React Enabled.');
    } else if (arg === 'off') {
      settings.autoswview.enabled = false;
      saveSettings(settings);
      return m.reply('❌ Auto Status View Disabled.');
    } else {
      return m.reply('⚠️ Invalid argument. Use "on" or "off".');
    }
  }
};