const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeInMemoryStore,
  DisconnectReason,
  makeCacheableSignalKeyStore
} = require('@whiskeysockets/baileys');

const { Boom } = require('@hapi/boom');
const P = require('pino');
const path = require('path');
const fs = require('fs').promises;
const chalk = require('chalk');
const { setupEvents } = require('./events');
const { pluginLoader } = require('./pluginLoader');
const { handler } = require('./handler');
const { loadSettings } = require('./config');

// Global variables
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_INTERVAL = 5000;
let isReconnecting = false;

// Store initialization with enhanced configuration
const store = makeInMemoryStore({
  logger: P().child({ level: 'silent' })
});

// Enhanced logging function
const log = (level, message, data = null) => {
  const timestamp = new Date().toISOString();
  const colors = {
    info: chalk.blue,
    success: chalk.green,
    warn: chalk.yellow,
    error: chalk.red,
    debug: chalk.gray
  };
  
  const color = colors[level] || chalk.white;
  console.log(`[${timestamp}] ${color(`[${level.toUpperCase()}]`)} ${chalk.white(message)}`);
  
  if (data) {
    console.log(chalk.gray(JSON.stringify(data, null, 2)));
  }
};

// Store management functions
const initializeStore = async () => {
  try {
    const storePath = './baileys_store.json';
    await store.readFromFile(storePath);
    log('info', `Store initialized from ${storePath}`);
    
    // Periodic store saving
    setInterval(() => {
      store.writeToFile(storePath);
      log('debug', 'Store saved to file');
    }, 10_000);
    
  } catch (error) {
    log('warn', 'Failed to initialize store, starting fresh', error);
  }
};

// Session directory management
const ensureSessionDir = async () => {
  const sessionDir = path.join(__dirname, '../session');
  try {
    await fs.mkdir(sessionDir, { recursive: true });
    log('info', 'Session directory ensured');
  } catch (error) {
    log('error', 'Failed to create session directory', error);
    throw error;
  }
};

// Cleanup session on logout
const cleanupSession = async () => {
  const sessionDir = path.join(__dirname, '../session');
  try {
    await fs.rm(sessionDir, { recursive: true, force: true });
    log('warn', 'Session directory cleaned up');
  } catch (error) {
    log('error', 'Failed to cleanup session directory', error);
  }
};

// Enhanced plugin loading with error handling
const loadPlugins = async () => {
  try {
    log('info', 'Loading plugins...');
    const plugins = pluginLoader();
    log('success', `Loaded ${Object.keys(plugins).length} plugin categories`);
    return plugins;
  } catch (error) {
    log('error', 'Failed to load plugins', error);
    return {};
  }
};

// Connection state handler
const handleConnectionUpdate = async (update, sock, restartFunction) => {
  const { connection, lastDisconnect } = update;
  
  if (connection === 'close') {
    const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
    log('warn', `Connection closed with reason: ${reason}`);
    
    switch (reason) {
      case DisconnectReason.badSession:
        log('error', 'Bad Session File, Please Delete Session and Scan Again');
        await cleanupSession();
        process.exit(1);
        break;
        
      case DisconnectReason.connectionClosed:
      case DisconnectReason.connectionLost:
      case DisconnectReason.timedOut:
        log('warn', 'Connection issue, attempting to reconnect...');
        await reconnectBot(restartFunction);
        break;
        
      case DisconnectReason.connectionReplaced:
        log('error', 'Connection Replaced, Another New Session Opened');
        process.exit(1);
        break;
        
      case DisconnectReason.loggedOut:
        log('error', 'Device Logged Out, Please Delete Session and Scan Again');
        await cleanupSession();
        process.exit(1);
        break;
        
      case DisconnectReason.restartRequired:
        log('info', 'Restart Required, Restarting...');
        await restartFunction();
        break;
        
      default:
        log('error', 'Unknown DisconnectReason: ' + reason);
        await reconnectBot(restartFunction);
        break;
    }
  }
  
  if (connection === 'open') {
    log('success', 'Connected successfully!');
    if (sock.user) {
      log('info', `Connected as: ${sock.user.name || sock.user.id}`);
    }
    reconnectAttempts = 0;
    isReconnecting = false;
  }
};

// Enhanced reconnection logic
const reconnectBot = async (restartFunction) => {
  if (isReconnecting) {
    log('warn', 'Already reconnecting...');
    return;
  }
  
  isReconnecting = true;
  
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    log('error', `Max reconnection attempts (${MAX_RECONNECT_ATTEMPTS}) reached. Exiting...`);
    process.exit(1);
  }
  
  reconnectAttempts++;
  log('info', `Reconnection attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}`);
  
  try {
    // Exponential backoff
    const delay = Math.min(RECONNECT_INTERVAL * Math.pow(2, reconnectAttempts - 1), 30000);
    log('info', `Waiting ${delay}ms before reconnecting...`);
    
    await new Promise(resolve => setTimeout(resolve, delay));
    await restartFunction();
  } catch (error) {
    log('error', 'Reconnection failed', error);
    isReconnecting = false;
    await reconnectBot(restartFunction);
  }
};

// Enhanced bot start function
const startBot = async () => {
  try {
    log('info', 'Starting MAHACHI-XD Bot...');
    
    // Load settings
    const settings = loadSettings();
    log('info', `Bot settings loaded. Developer mode: ${settings.developerMode ? 'ON' : 'OFF'}`);
    
    // Ensure session directory exists
    await ensureSessionDir();
    
    // Initialize store
    await initializeStore();
    
    // Get latest Baileys version
    const { version, isLatest } = await fetchLatestBaileysVersion();
    log('info', `Using Baileys version ${version}${isLatest ? ' (latest)' : ''}`);
    
    // Setup authentication state
    const { state, saveCreds } = await useMultiFileAuthState(path.join(__dirname, '../session'));
    
    // Create WebSocket connection with enhanced configuration
    const sock = makeWASocket({
      version,
      logger: P({ level: settings.developerMode ? 'debug' : 'silent' }),
      printQRInTerminal: true,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, P({ level: 'silent' }))
      },
      browser: ['MAHACHI-XD', 'Chrome', '3.0.0'],
      syncFullHistory: false,
      markOnlineOnConnect: settings.alwaysOnline,
      generateHighQualityLinkPreview: true,
      patchMessageBeforeSending: (message) => {
        const requiresPatch = !!(message.buttonsMessage || message.templateMessage || message.listMessage);
        if (requiresPatch) {
          message = {
            viewOnceMessage: {
              message: {
                messageContextInfo: {
                  deviceListMetadataVersion: 2,
                  deviceListMetadata: {}
                },
                ...message
              }
            }
          };
        }
        return message;
      },
      getMessage: async (key) => {
        if (store) {
          const msg = await store.loadMessage(key.remoteJid, key.id);
          return msg?.message || undefined;
        }
        return proto.Message.fromObject({});
      }
    });
    
    // Bind store to socket events
    store.bind(sock.ev);
    
    // Load plugins
    const plugins = await loadPlugins();
    
    // Handle incoming messages and commands
    handler(sock, store, plugins, settings);
    
    // Setup event handlers
    setupEvents(sock, startBot);
    
    // Handle connection updates
    sock.ev.on('connection.update', (update) => {
      handleConnectionUpdate(update, sock, startBot);
    });
    
    // Save credentials on update
    sock.ev.on('creds.update', saveCreds);
    
    // Additional event listeners
    sock.ev.on('contacts.upsert', (contacts) => {
      log('debug', `Upserted ${contacts.length} contacts`);
    });
    
    sock.ev.on('chats.upsert', (chats) => {
      log('debug', `Upserted ${chats.length} chats`);
    });
    
    sock.ev.on('groups.upsert', (groups) => {
      log('debug', `Upserted ${groups.length} groups`);
    });
    
    // Graceful shutdown handling
    const gracefulShutdown = async () => {
      log('info', 'Received shutdown signal. Closing connection...');
      try {
        await sock.end();
        store.writeToFile('./baileys_store.json');
        log('info', 'Bot shutdown completed');
        process.exit(0);
      } catch (error) {
        log('error', 'Error during shutdown', error);
        process.exit(1);
      }
    };
    
    process.on('SIGINT', gracefulShutdown);
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGUSR2', gracefulShutdown);
    
    log('success', 'MAHACHI-XD Bot started successfully!');
    log('info', `Prefix: ${settings.prefix} | Developer Mode: ${settings.developerMode ? 'ENABLED' : 'DISABLED'}`);
    
  } catch (err) {
    log('error', 'Failed to start bot', err);
    
    // Retry logic for critical errors
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      log('warn', `Attempting restart... (${reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS})`);
      setTimeout(() => {
        startBot().catch(console.error);
      }, RECONNECT_INTERVAL);
    } else {
      log('error', 'Max restart attempts reached. Exiting...');
      process.exit(1);
    }
  }
};

// Export functions
module.exports = {
  startBot,
  log,
  store
};