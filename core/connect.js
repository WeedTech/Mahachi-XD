const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeInMemoryStore,
  DisconnectReason
} = require('@whiskeysockets/baileys');

const P = require('pino');
const path = require('path');
const { setupEvents } = require('./events');
const { pluginLoader } = require('./pluginLoader');
const { handler } = require('./handler');

const store = makeInMemoryStore({ logger: P().child({ level: 'silent' }) });
store.readFromFile('./baileys_store.json');
setInterval(() => {
  store.writeToFile('./baileys_store.json');
}, 10_000);

const startBot = async () => {
  try {
    const { state, saveCreds } = await useMultiFileAuthState(path.join(__dirname, '../session'));
    const { version } = await fetchLatestBaileysVersion();
    
    const sock = makeWASocket({
      version,
      logger: P({ level: 'silent' }),
      printQRInTerminal: true,
      auth: state,
      browser: ['MAHACHI-XD', 'Safari', '1.0.0'],
      syncFullHistory: false,
      markOnlineOnConnect: true,
      generateHighQualityLinkPreview: true
    });
    
    store.bind(sock.ev);
    
    // Load plugins and export commands
    const plugins = pluginLoader();
    
    // Handle incoming messages and commands
    handler(sock, store, plugins);
    
    // Setup event handlers and reconnect logic
    setupEvents(sock, startBot);
    
    // Save credentials on update
    sock.ev.on('creds.update', saveCreds);
    
    console.log('[🚀] MAHACHI-XD Bot started successfully!');
  } catch (err) {
    console.error('[❌] Failed to start bot:', err);
    // Optional: add retry logic or exit process
  }
};

module.exports = { startBot };