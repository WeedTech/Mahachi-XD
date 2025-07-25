// index.js - MAHACHI-XD WHATSAPP BOT
console.clear()

// Core Dependencies
const fs = require('fs')
const path = require('path')
const chalk = require('chalk')
const pino = require('pino')
const { Boom } = require('@hapi/boom')

// Baileys Library
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeInMemoryStore,
  makeCacheableSignalKeyStore
} = require('@whiskeysockets/baileys')

// Custom Modules
const { pluginLoader } = require('./core/pluginLoader')
const { handleMessage } = require('./core/handler')
const { serialize } = require('./lib/format')
const { banner } = require('./lib/tools')

// Global Store (Optional - for message history)
const store = makeInMemoryStore({
  logger: pino({ level: 'silent' })
})

// ASCII Art Banner
console.log(chalk.green(banner))

// Enhanced ASCII Art Logo
console.log(chalk.cyan(`
╭━━━┳╮╱╱╭┳━╮╭━┳╮╱╱╭╮  ╭━━━┳━━━┳╮╱╱╭╮
┃╭━╮┃╰╮╭╯┃┃╰╯┃┃┃╱╱┃┃  ┃╭━╮┃╭━╮┃┃╱╱┃┃
┃┃╱╰╋╮╰╯╭┫╭╮╭╮┣┻━┳┫┃╭┳┫╰━━┫┃╱┃┃┃╱╱┃┃
┃┃╱╭╯╰╮╭╯┃┃┃┃┃┃╭╮┣┫╰╯╯╰━━╮┃┃╱┃┃┃╱╭┫┃╭┳━━┳━╮
┃╰━╯┃╱┃┃╱┃┃┃┃┃┃╭╮┣┫╭╮╮┃╰━╯┃╰━╯┃╰━╯┃╰╯┃╭╮┃╭╯
╰━━━╯╱╰╯╱╰╯╰╯╰┻╯╰┻┻╯╰╯╰━━━┻━━━┻━━━┻━━┻╯╰┻╯
             MAHACHI-XD WHATSAPP BOT
             Powered by WEED × JADEN × IceFlowTech
`))

// Bot Configuration
const CONFIG = {
  NAME: 'MAHACHI-XD',
  VERSION: '1.0.0',
  RECONNECT_INTERVAL: 5000,
  MAX_RECONNECT_ATTEMPTS: 5,
  LOG_LEVEL: 'info'
}

// Global Variables
let reconnectAttempts = 0
let isReconnecting = false

// Logger Setup
const logger = pino({
  level: CONFIG.LOG_LEVEL,
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname'
    }
  }
})

// Utility Functions
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

const logEvent = (level, message, data = null) => {
  const timestamp = new Date().toISOString()
  const logMessage = `[${timestamp}] ${message}`
  
  switch(level) {
    case 'info':
      console.log(chalk.blue('ℹ️'), chalk.white(logMessage))
      break
    case 'success':
      console.log(chalk.green('✅'), chalk.white(logMessage))
      break
    case 'warn':
      console.log(chalk.yellow('⚠️'), chalk.white(logMessage))
      break
    case 'error':
      console.log(chalk.red('❌'), chalk.white(logMessage))
      break
    case 'debug':
      if (CONFIG.LOG_LEVEL === 'debug') {
        console.log(chalk.gray('🐛'), chalk.white(logMessage))
      }
      break
  }
  
  if (data) {
    console.log(chalk.gray(JSON.stringify(data, null, 2)))
  }
}

const createSessionDir = () => {
  const sessionDir = './session'
  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true })
    logEvent('info', 'Created session directory')
  }
}

const cleanupSession = () => {
  const sessionDir = './session'
  if (fs.existsSync(sessionDir)) {
    fs.rmSync(sessionDir, { recursive: true, force: true })
    logEvent('warn', 'Session directory cleaned up')
  }
}

// Plugin System Enhancements
const loadPlugins = async () => {
  try {
    logEvent('info', 'Loading plugins...')
    const pluginCount = pluginLoader()
    logEvent('success', `Loaded ${pluginCount} plugins successfully`)
    return pluginCount
  } catch (error) {
    logEvent('error', 'Failed to load plugins', error)
    throw error
  }
}

// Message Processing Enhancements
const processMessage = async (sock, msg) => {
  try {
    // Validate message
    if (!msg.message) {
      logEvent('debug', 'Received empty message, skipping')
      return
    }

    // Skip status updates
    if (msg.key && msg.key.remoteJid === 'status@broadcast') {
      logEvent('debug', 'Skipping status broadcast message')
      return
    }

    // Serialize message
    const serializedMsg = await serialize(sock, msg)
    
    // Log incoming message
    logEvent('debug', `Processing message from ${serializedMsg.sender}`, {
      type: serializedMsg.type,
      body: serializedMsg.body
    })

    // Handle message
    await handleMessage(sock, serializedMsg)
    
  } catch (error) {
    logEvent('error', 'Error processing message', error)
  }
}

// Connection Management
const handleConnectionUpdate = async (update, sock) => {
  const { connection, lastDisconnect, qr } = update
  
  // Handle QR Code
  if (qr) {
    logEvent('info', 'QR Code received. Scan with WhatsApp to connect.')
  }
  
  // Handle Connection Close
  if (connection === 'close') {
    const reason = new Boom(lastDisconnect?.error)?.output?.statusCode
    logEvent('warn', `Connection closed with reason: ${reason}`)
    
    switch (reason) {
      case DisconnectReason.badSession:
        logEvent('error', 'Bad Session File, Please Delete Session and Scan Again')
        cleanupSession()
        process.exit()
        break
        
      case DisconnectReason.connectionClosed:
        logEvent('warn', 'Connection closed, reconnecting...')
        await reconnectBot()
        break
        
      case DisconnectReason.connectionLost:
        logEvent('warn', 'Connection Lost from Server, reconnecting...')
        await reconnectBot()
        break
        
      case DisconnectReason.connectionReplaced:
        logEvent('error', 'Connection Replaced, Another New Session Opened, Please Close Current Session First')
        process.exit()
        break
        
      case DisconnectReason.loggedOut:
        logEvent('error', 'Device Logged Out, Please Delete Session and Scan Again.')
        cleanupSession()
        process.exit()
        break
        
      case DisconnectReason.restartRequired:
        logEvent('info', 'Restart Required, Restarting...')
        await startMahachiXD()
        break
        
      case DisconnectReason.timedOut:
        logEvent('warn', 'Connection Timed Out, Trying to Reconnect...')
        await reconnectBot()
        break
        
      default:
        logEvent('error', 'Unknown DisconnectReason: ' + reason)
        await reconnectBot()
        break
    }
  }
  
  // Handle Connection Open
  if (connection === 'open') {
    logEvent('success', 'Connected successfully!')
    logEvent('info', `Connected as: ${sock.user.name || sock.user.id}`)
    reconnectAttempts = 0
    isReconnecting = false
  }
}

// Reconnection Logic
const reconnectBot = async () => {
  if (isReconnecting) {
    logEvent('warn', 'Already reconnecting...')
    return
  }
  
  isReconnecting = true
  
  if (reconnectAttempts >= CONFIG.MAX_RECONNECT_ATTEMPTS) {
    logEvent('error', `Max reconnection attempts (${CONFIG.MAX_RECONNECT_ATTEMPTS}) reached. Exiting...`)
    process.exit(1)
  }
  
  reconnectAttempts++
  logEvent('info', `Reconnection attempt ${reconnectAttempts}/${CONFIG.MAX_RECONNECT_ATTEMPTS}`)
  
  try {
    await sleep(CONFIG.RECONNECT_INTERVAL)
    await startMahachiXD()
  } catch (error) {
    logEvent('error', 'Reconnection failed', error)
    isReconnecting = false
    await reconnectBot()
  }
}

// Enhanced Bot Start Function
const startMahachiXD = async () => {
  try {
    // Initialize session directory
    createSessionDir()
    
    // Get latest Baileys version
    const { version, isLatest } = await fetchLatestBaileysVersion()
    logEvent('info', `Using Baileys version ${version}, latest: ${isLatest}`)
    
    // Setup authentication state
    const { state, saveCreds } = await useMultiFileAuthState('./session')
    
    // Create WebSocket connection
    const sock = makeWASocket({
      version,
      logger: pino({ level: 'silent' }),
      printQRInTerminal: true,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
      },
      browser: [CONFIG.NAME, 'Chrome', CONFIG.VERSION],
      markOnlineOnConnect: true,
      generateHighQualityLinkPreview: true,
      syncFullHistory: true,
      patchMessageBeforeSending: (message) => {
        const requiresPatch = !!(message.buttonsMessage || message.templateMessage || message.listMessage)
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
          }
        }
        return message
      }
    })
    
    // Initialize store
    store.bind(sock.ev)
    
    // Load plugins
    await loadPlugins()
    
    // Event Listeners
    sock.ev.on('messages.upsert', async ({ messages }) => {
      for (const msg of messages) {
        await processMessage(sock, msg)
      }
    })
    
    sock.ev.on('creds.update', saveCreds)
    
    sock.ev.on('connection.update', (update) => {
      handleConnectionUpdate(update, sock)
    })
    
    // Additional Event Listeners
    sock.ev.on('contacts.upsert', (contacts) => {
      logEvent('debug', `Upserted ${contacts.length} contacts`)
    })
    
    sock.ev.on('chats.upsert', (chats) => {
      logEvent('debug', `Upserted ${chats.length} chats`)
    })
    
    sock.ev.on('groups.upsert', (groups) => {
      logEvent('debug', `Upserted ${groups.length} groups`)
    })
    
    // Graceful Shutdown
    process.on('SIGINT', async () => {
      logEvent('info', 'Received SIGINT. Shutting down gracefully...')
      await sock.end()
      process.exit(0)
    })
    
    process.on('SIGTERM', async () => {
      logEvent('info', 'Received SIGTERM. Shutting down gracefully...')
      await sock.end()
      process.exit(0)
    })
    
    logEvent('info', 'Bot initialization completed')
    
  } catch (error) {
    logEvent('error', 'Failed to start bot', error)
    if (reconnectAttempts < CONFIG.MAX_RECONNECT_ATTEMPTS) {
      await reconnectBot()
    } else {
      process.exit(1)
    }
  }
}

// Start the bot
logEvent('info', 'Starting MAHACHI-XD WhatsApp Bot...')
startMahachiXD().catch(console.error)

// Export for testing or external usage
module.exports = {
  startMahachiXD,
  logEvent,
  CONFIG
}