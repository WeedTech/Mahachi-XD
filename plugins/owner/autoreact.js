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

// Emoji list to randomly react with
const emojis = ['❤️', '😂', '👍', '🔥', '🥳', '🙌', '😊', '💯', '😎', '✨', '🤖', '😇'];

module.exports = {
  command: ['autoreact'],
  tags: ['owner'],
  help: ['autoreact on', 'autoreact off'],
  description: 'Toggle auto reaction to all messages',
  
  async run({ sock, m, text, from, owners }) {
    if (!owners.includes(m.sender.split('@')[0])) {
      return m.reply('❌ You are not authorized to use this command.');
    }
    
    if (!text) {
      return m.reply('⚠️ Usage:\n.autoreact on\n.autoreact off');
    }
    
    const arg = text.toLowerCase();
    
    const settings = loadSettings();
    if (!settings.autoreact) settings.autoreact = { enabled: false };
    
    if (arg === 'on') {
      settings.autoreact.enabled = true;
      saveSettings(settings);
      return m.reply('✅ Auto React has been *enabled* with random emojis.');
    } else if (arg === 'off') {
      settings.autoreact.enabled = false;
      saveSettings(settings);
      return m.reply('❌ Auto React has been *disabled*.');
    } else {
      return m.reply('⚠️ Invalid argument. Use "on" or "off".');
    }
  }
};

//please do not copy and paste without any credits😂😂
// Add this snippet to your message event handler (like events.js):

/*
sock.ev.on('messages.upsert', async ({ messages }) => {
  const settings = loadSettings();
  if (!settings.autoreact?.enabled) return;

  for (const m of messages) {
    if (!m.key.fromMe) {
      try {
        // Choose a random emoji from the list
        const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
        await sock.sendMessage(m.key.remoteJid, {
          react: { text: randomEmoji, key: m.key }
        });
      } catch (e) {
        console.error('Auto react error:', e);
      }
    }
  }
});
*/