const fs = require('fs');
const path = require('path');
const settingsPath = path.join(__dirname, '../../config/settings.json');

module.exports = {
  name: 'private',
  alias: [],
  category: 'owner',
  desc: 'Enable private mode (bot only responds to owner/private chats)',
  owner: true,
  
  async run({ m }) {
    try {
      if (!fs.existsSync(settingsPath)) return m.reply('⚠️ settings.json not found.');
      
      const settings = JSON.parse(fs.readFileSync(settingsPath));
      
      if (settings.privateMode) {
        return m.reply('⚠️ Bot is already in private mode.');
      }
      
      settings.privateMode = true;
      
      fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
      m.reply('✅ Bot is now in *private mode* and will only respond to owner/private chats.');
    } catch (error) {
      console.error('[PRIVATE CMD ERROR]', error);
      m.reply('❌ Error enabling private mode.');
    }
  }
};