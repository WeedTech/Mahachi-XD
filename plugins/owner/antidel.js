const fs = require('fs');
const path = require('path');
const settingsPath = path.join(__dirname, '../../config/settings.json');

module.exports = {
  name: 'antidelete',
  alias: ['antidel'],
  category: 'owner',
  desc: 'Toggle antidelete feature on or off',
  owner: true,
  
  async run({ sock, m, args, prefix, command }) {
    try {
      if (!fs.existsSync(settingsPath)) {
        return m.reply('⚠️ settings.json not found.');
      }
      
      const settings = JSON.parse(fs.readFileSync(settingsPath));
      const mode = args[0]?.toLowerCase();
      
      if (!['on', 'off'].includes(mode)) {
        return m.reply(`⚙️ Usage:\n*${prefix}${command} on*  - to enable\n*${prefix}${command} off* - to disable`);
      }
      
      settings.antidelete = mode === 'on';
      
      fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
      await m.reply(`✅ Antidelete has been *turned ${mode.toUpperCase()}* successfully.`);
    } catch (e) {
      console.error('[ANTIDEL COMMAND ERROR]', e);
      await m.reply('❌ An error occurred while toggling antidelete.');
    }
  }
};