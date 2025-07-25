const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const util = require('util');

// Promisify file system operations
const readdir = util.promisify(fs.readdir);
const stat = util.promisify(fs.stat);

// Load configuration
let owners = [];
let banned = [];
let settings = {};

try {
  owners = require('../config/owner.json');
  banned = require('../config/banned.json');
  settings = require('../config/settings.json');
} catch (error) {
  console.error(chalk.red(`[CONFIG ERROR] Failed to load config files: ${error.message}`));
}

const pluginFolder = path.join(__dirname, '..', 'plugins');
let plugins = {};

// Enhanced logging function
const log = (level, message) => {
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
};

// Validate plugin structure
const validatePlugin = (plugin) => {
  const requiredFields = ['command', 'run'];
  const missingFields = requiredFields.filter(field => !(field in plugin));
  
  if (missingFields.length > 0) {
    throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
  }
  
  if (typeof plugin.run !== 'function') {
    throw new Error('run property must be a function');
  }
  
  if (typeof plugin.command !== 'string' && !Array.isArray(plugin.command)) {
    throw new Error('command property must be a string or array');
  }
  
  // Set default values
  plugin.description = plugin.description || 'No description';
  plugin.ownerOnly = plugin.ownerOnly || false;
  plugin.cooldown = plugin.cooldown || 3;
  
  return true;
};

// Load plugins with validation
async function loadPlugins() {
  plugins = {};
  let loadedCount = 0;
  let failedCount = 0;
  
  try {
    if (!fs.existsSync(pluginFolder)) {
      log('warn', 'Plugins folder not found');
      return plugins;
    }
    
    const categories = await readdir(pluginFolder);
    
    for (const category of categories) {
      const categoryPath = path.join(pluginFolder, category);
      const stats = await stat(categoryPath);
      
      if (stats.isDirectory()) {
        try {
          const files = await readdir(categoryPath);
          
          for (const file of files) {
            if (file.endsWith('.js')) {
              const pluginPath = path.join(categoryPath, file);
              
              try {
                // Clear cache for development
                if (settings.developerMode) {
                  delete require.cache[require.resolve(pluginPath)];
                }
                
                const plugin = require(pluginPath);
                
                if (validatePlugin(plugin)) {
                  // Handle array of commands (aliases)
                  const commands = Array.isArray(plugin.command) ? plugin.command : [plugin.command];
                  
                  for (const cmd of commands) {
                    if (plugins[cmd]) {
                      log('warn', `Duplicate command '${cmd}' found, overriding...`);
                    }
                    plugins[cmd] = { ...plugin, command: cmd };
                  }
                  
                  loadedCount++;
                  log('debug', `Loaded plugin: ${commands.join(', ')}`);
                }
              } catch (err) {
                failedCount++;
                log('error', `Failed to load ${file}: ${err.message}`);
              }
            }
          }
        } catch (categoryError) {
          log('error', `Error reading category ${category}: ${categoryError.message}`);
        }
      }
    }
    
    log('success', `Loaded ${loadedCount} plugins (${failedCount} failed)`);
    return plugins;
    
  } catch (err) {
    log('error', `Failed to load plugins: ${err.message}`);
    return plugins;
  }
}

// Cooldown management
const cooldowns = new Map();

const setCooldown = (userId, command, seconds) => {
  const key = `${userId}:${command}`;
  const expiration = Date.now() + (seconds * 1000);
  cooldowns.set(key, expiration);
};

const hasCooldown = (userId, command) => {
  const key = `${userId}:${command}`;
  const expiration = cooldowns.get(key);
  
  if (!expiration) return false;
  
  if (Date.now() > expiration) {
    cooldowns.delete(key);
    return false;
  }
  
  return Math.ceil((expiration - Date.now()) / 1000);
};

// Permission checking
const checkPermissions = async (sock, m, plugin, sender, isGroup, isOwner) => {
  const from = m.key.remoteJid;
  
  // Owner-only check
  if (plugin.ownerOnly && !isOwner) {
    await sock.sendMessage(from, {
      text: '❌ This command is only for owners.'
    }, { quoted: m });
    return false;
  }
  
  // Group-only check
  if (plugin.groupOnly && !isGroup) {
    await sock.sendMessage(from, {
      text: '❌ This command only works in groups.'
    }, { quoted: m });
    return false;
  }
  
  return true;
};

// Main message handler
async function handleMessage(sock, m) {
  try {
    // Validate message
    if (!m.message) return;
    if (m.key.fromMe && !settings.developerMode) return;
    
    // Extract message details
    const sender = m.key.participant || m.key.remoteJid;
    const from = m.key.remoteJid;
    const isGroup = from.endsWith('@g.us');
    const pushName = m.pushName || 'Unknown';
    
    // Extract message body
    let body = '';
    if (m.message.conversation) {
      body = m.message.conversation;
    } else if (m.message.extendedTextMessage?.text) {
      body = m.message.extendedTextMessage.text;
    } else if (m.message.imageMessage?.caption) {
      body = m.message.imageMessage.caption;
    } else if (m.message.videoMessage?.caption) {
      body = m.message.videoMessage.caption;
    }
    
    // Parse command
    const prefix = settings.prefix || '.';
    const isCmd = body.startsWith(prefix);
    const command = isCmd ? body.slice(prefix.length).trim().split(' ')[0].toLowerCase() : null;
    const args = isCmd ? body.trim().split(' ').slice(1) : [];
    const text = args.join(' ');
    
    // User validation
    const senderNumber = sender.split('@')[0];
    
    // Check if sender is owner
    const isOwner = owners.some(owner => {
      if (typeof owner === 'string') {
        return owner === senderNumber;
      }
      return owner.number === senderNumber;
    });
    
    // Check if sender is banned
    const isBanned = banned.includes(senderNumber);
    if (isBanned) return;
    
    // Handle commands
    if (isCmd && plugins[command]) {
      const plugin = plugins[command];
      
      // Cooldown check
      if (!isOwner) {
        const cooldownTime = hasCooldown(sender, command);
        if (cooldownTime) {
          await sock.sendMessage(from, {
            text: `⏳ Please wait ${cooldownTime} seconds before using this command again.`
          }, { quoted: m });
          return;
        }
      }
      
      // Permission check
      const hasPermission = await checkPermissions(sock, m, plugin, sender, isGroup, isOwner);
      if (!hasPermission) return;
      
      // Set cooldown
      if (plugin.cooldown > 0 && !isOwner) {
        setCooldown(sender, command, plugin.cooldown);
      }
      
      // Execute command
      try {
        log('info', `Executing: ${command} by ${pushName} (${senderNumber})`);
        
        await plugin.run({
          sock,
          m,
          args,
          text,
          sender,
          from,
          isGroup,
          isOwner,
          command,
          pushName,
          plugins
        });
        
      } catch (err) {
        log('error', `Command error (${command}): ${err.message}`);
        
        try {
          await sock.sendMessage(from, {
            text: `❌ Error: ${err.message}`
          }, { quoted: m });
        } catch (sendError) {
          log('error', `Failed to send error message: ${sendError.message}`);
        }
      }
    }
    
  } catch (err) {
    log('error', `Handler error: ${err.message}`);
  }
}

module.exports = {
  loadPlugins,
  handleMessage
};