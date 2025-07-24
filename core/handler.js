const fs = require('fs');
const path = require('path');
const util = require('util');
const chalk = require('chalk');
const owners = require('../config/owner.json');
const banned = require('../config/banned.json');

const pluginFolder = path.join(__dirname, '..', 'plugins');

let plugins = {};

// Load all plugins
function loadPlugins() {
  plugins = {};
  const categories = fs.readdirSync(pluginFolder);
  for (const category of categories) {
    const categoryPath = path.join(pluginFolder, category);
    if (fs.statSync(categoryPath).isDirectory()) {
      const files = fs.readdirSync(categoryPath);
      for (const file of files) {
        if (file.endsWith('.js')) {
          const pluginPath = path.join(categoryPath, file);
          try {
            const plugin = require(pluginPath);
            if (plugin.command && typeof plugin.run === 'function') {
              plugins[plugin.command] = plugin;
            }
          } catch (err) {
            console.error(chalk.red(`[Plugin Error] Failed to load ${file}: ${err.message}`));
          }
        }
      }
    }
  }
  console.log(chalk.green(`[PLUGIN LOADER] Loaded ${Object.keys(plugins).length} plugins.`));
}

// Process incoming messages
async function handleMessage(sock, m) {
  try {
    if (!m.message || m.key.fromMe) return;
    
    const sender = m.key.participant || m.key.remoteJid;
    const from = m.key.remoteJid;
    const isGroup = from.endsWith('@g.us');
    const body = m.message.conversation || m.message.extendedTextMessage?.text || '';
    const prefix = '.';
    const isCmd = body.startsWith(prefix);
    const command = isCmd ? body.slice(1).trim().split(' ')[0].toLowerCase() : null;
    const args = isCmd ? body.trim().split(' ').slice(1) : [];
    
    const isOwner = owners.includes(sender.split('@')[0]);
    const isBanned = banned.includes(sender.split('@')[0]);
    
    if (isBanned) return;
    
    if (isCmd && plugins[command]) {
      const plugin = plugins[command];
      
      if (plugin.ownerOnly && !isOwner) {
        await sock.sendMessage(from, { text: '❌ This command is only for the owner.' }, { quoted: m });
        return;
      }
      
      await plugin.run({ sock, m, args, sender, isGroup, isOwner, command });
    }
    
  } catch (err) {
    console.error(chalk.red(`[ERROR] ${err.message}`));
  }
}

module.exports = {
  loadPlugins,
  handleMessage
};