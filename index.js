//*index.js Main bot file made by Jaden Afrix
//do not copy/paste
require('dotenv').config();

// Imports
const { default: makeWASocket, fetchLatestBaileysVersion, useMultiFileAuthState, makeCacheableSignalKeyStore, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');
const path = require('path');

// Core files
const loadPlugins = require('./core/pluginLoader');
const handleMessage = require('./core/handler');

// Global config
const prefix = process.env.PREFIX || '.';
const botName = process.env.BOT_NAME || 'MAHACHI-XD';

// Logger
const logger = pino({ level: 'silent' });

// Initialize session storage
const authFolder = './auth';

// Create WA connection
async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState(authFolder);
  const { version, isLatest } = await fetchLatestBaileysVersion();
  console.log(`[📦] Using Baileys v${version.join('.')}, Latest: ${isLatest}`);

  const sock = makeWASocket({
    version,
    logger,
    printQRInTerminal: true,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    browser: ['MAHACHI-XD', 'Safari', '3.0'],
    syncFullHistory: false,
  });

  // Store creds
  sock.ev.on('creds.update', saveCreds);

  // Reconnect on disconnect
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === 'close') {
      const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
      if (reason === DisconnectReason.loggedOut) {
        console.log('[❌] Bot logged out. Please delete auth folder and scan again.');
      } else {
        console.log('[🔄] Reconnecting...');
        startBot();
      }
    } else if (connection === 'open') {
      console.log(`[✅] ${botName} is now connected and running!`);
    }
  });

  // Load plugins
  await loadPlugins();

  // Message handler
  sock.ev.on('messages.upsert', async ({ messages }) => {
    if (!messages || !messages[0]) return;
    const msg = messages[0];
    try {
      await handleMessage(sock, msg);
    } catch (err) {
      console.error('[❌] Handler Error:', err);
    }
  });
}

// Start the bot
startBot().catch((err) => {
  console.error('[❌] Startup Error:', err);
});
