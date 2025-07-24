const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const util = require('util');
const pluginLoader = require('./pluginLoader');
const settings = require('../config/settings.json');

let plugins = pluginLoader();

function isCommand(text) {
  return typeof text === 'string' && text.startsWith('.');
}

function reloadPluginsOnChange() {
  const pluginsDir = path.join(__dirname, '../plugins');
  fs.watch(pluginsDir, { recursive: true }, (eventType, filename) => {
    if (filename.endsWith('.js')) {
      console.log(chalk.yellow(`[PLUGIN] Reloading due to change in: ${filename}`));
      delete require.cache[require.resolve(`../plugins/${filename}`)];
      plugins = pluginLoader();
    }
  });
}

async function handleCommand(sock, m) {
  try {
    if (!m.message) return;
    const type = Object.keys(m.message)[0];
    const msg = m.message[type];
    const text = msg?.text || msg?.conversation || msg?.caption || '';
    
    if (!isCommand(text)) return;
    
    const commandBody = text.trim().slice(1);
    const args = commandBody.split(/\s+/);
    const command = args.shift().toLowerCase();
    const fullArgs = args.join(' ');
    
    const sender = m.key.remoteJid.endsWith('@g.us') ?
      m.key.participant || m.key.remoteJid :
      m.key.remoteJid;
    
    const context = {
      sock,
      m,
      text: fullArgs,
      args,
      sender,
      command,
      isGroup: m.key.remoteJid.endsWith('@g.us'),
      from: m.key.remoteJid,
      pushName: m.pushName || 'User',
      owners: require('../config/owner.json'),
    };
    
    for (let plugin of plugins) {
      if (
        plugin.command &&
        (plugin.command.includes(command) ||
          plugin.command.some((cmd) => cmd.toLowerCase() === command))
      ) {
        await plugin.run(context);
        break;
      }
    }
  } catch (err) {
    console.error(chalk.red('[ERROR] Command Error:\n'), err);
  }
}

async function handleAutoStatusView(sock) {
  sock.ev.on('status.update', async ({ updates }) => {
    if (!settings.autoswview?.enabled) return;
    
    for (const update of updates) {
      try {
        const jid = update.sender;
        const id = update.id;
        
        // Mark status as seen
        await sock.readMessages([{ remoteJid: jid, id, fromMe: false }]);
        
        // React with 🍑
        await sock.sendMessage(jid, {
          react: {
            text: '🍑',
            key: {
              remoteJid: jid,
              id: id,
              fromMe: false
            }
          }
        });
        
        console.log(chalk.green(`👀 Viewed & reacted to status of ${jid}`));
      } catch (err) {
        console.log(chalk.red('❌ Error auto-viewing status:'), err);
      }
    }
  });
}

function logReceivedMessages(sock) {
  sock.ev.on('messages.upsert', async ({ messages }) => {
    for (const m of messages) {
      if (!m.message) continue;
      await handleCommand(sock, m);
    }
  });
}

module.exports = async function setupEvents(sock) {
  logReceivedMessages(sock);
  handleAutoStatusView(sock);
  reloadPluginsOnChange();
  console.log(chalk.cyan('[🌐 EVENTS] Core events initialized.'));
};