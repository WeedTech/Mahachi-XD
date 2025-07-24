// index.js 😌

console.clear()
const fs = require('fs')
const path = require('path')
const chalk = require('chalk')
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys')
const pino = require('pino')
const { pluginLoader } = require('./core/pluginLoader')
const { handleMessage } = require('./core/handler')
const { serialize } = require('./lib/format')
const { banner } = require('./lib/tools')

console.log(chalk.green(banner)) // ASCII ART BANNER

// ASCII Art Logo
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

// Main bot start function
const startMahachiXD = async () => {
  const { state, saveCreds } = await useMultiFileAuthState('./session')
  
  const sock = makeWASocket({
    logger: pino({ level: 'silent' }),
    printQRInTerminal: true,
    auth: state,
    browser: ['MAHACHI-XD', 'Chrome', '1.0.0']
  })
  
  // Load all plugins
  pluginLoader()
  
  // On new message
  sock.ev.on('messages.upsert', async ({ messages }) => {
    try {
      const msg = messages[0]
      if (!msg.message || msg.key && msg.key.remoteJid === 'status@broadcast') return
      let m = await serialize(sock, msg)
      handleMessage(sock, m)
    } catch (err) {
      console.error('❌ Message Error:', err)
    }
  })
  
  // Handle credentials update
  sock.ev.on('creds.update', saveCreds)
  
  // Handle disconnection
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update
    if (connection === 'close') {
      const reason = new Boom(lastDisconnect?.error)?.output?.statusCode
      if (reason === DisconnectReason.loggedOut) {
        console.log(chalk.red('⛔ Logged out. Please delete session folder and restart.'))
        process.exit()
      } else {
        console.log(chalk.yellow('🔁 Reconnecting...'))
        startMahachiXD()
      }
    }
  })
}

startMahachiXD()