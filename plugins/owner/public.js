const fs = require('fs');
const path = require('path');
const settingsPath = path.join(__dirname, '../../config/settings.json');

module.exports = {
  name: 'public',
  alias: [],
  category: 'owner',
  desc: 'Disable private mode (bot responds in all chats)',
  owner: true,
  
  async run({ m }) {
    try {
      if (!fs.existsSync(settingsPath)) return m.reply('⚠️ settings.json not found.');
      
      const settings = JSON.parse(fs.readFileSync(settingsPath));
      
      if (!settings.privateMode) {
        return m.reply('⚠️ Bot is already in public mode.');
      }
      
      settings.privateMode = false;
      
      fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
      m.reply('✅ Bot is now in *public mode* and will respond in all chats.');
    } catch (error) {
      console.error('[PUBLIC CMD ERROR]', error);
      m.reply('❌ Error disabling private mode.');
    }
  }
};