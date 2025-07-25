const fs = require('fs');
const path = require('path');
const { formatDateTime } = require('../../lib/format');

const MAX_SAFE_LENGTH = 5000; // Customize payload limit
const SETTINGS_PATH = path.join(__dirname, '../../config/antibug.json');

// Load owners
let OWNERS = [];
try {
  OWNERS = require('../../config/owner.json');
  // Normalize owner format
  OWNERS = OWNERS.map(owner => {
    if (typeof owner === 'string') return owner;
    if (owner.number) return owner.number;
    return null;
  }).filter(Boolean);
} catch (err) {
  console.error('[ANTIBUG] Failed to load owners:', err);
  OWNERS = [];
}

module.exports = {
  name: 'antibug',
  type: 'event',
  desc: 'Protects against various bug exploits and malicious content',
  usage: 'Automatically active - no command needed',
  cooldown: 1,
  ownerOnly: false,
  groupOnly: false,
  privateOnly: false,
  adminOnly: false,
  botAdmin: false,
  
  async run({ sock, m }) {
    try {
      // Validate message
      if (!m || !m.message || !m.key) return;

      const jid = m.key.remoteJid;
      const sender = m.key.participant || m.key.remoteJid;
      const messageId = m.key.id;
      const isGroup = jid.endsWith('@g.us');
      
      // Skip if no sender or invalid JID
      if (!sender || !jid) return;

      // Get message type and content
      const type = Object.keys(m.message)[0];
      const msg = m.message[type];
      
      // Extract text content from various message types
      let text = '';
      if (msg?.conversation) {
        text = msg.conversation;
      } else if (msg?.text) {
        text = msg.text;
      } else if (msg?.caption) {
        text = msg.caption;
      } else if (msg?.hydratedContentText) {
        text = msg.hydratedContentText;
      } else if (type === 'templateButtonReplyMessage') {
        text = msg.selectedId || msg.selectedDisplayText || '';
      }

      // Skip if no text or invalid text
      if (!text || typeof text !== 'string') return;

      // Load antibug settings
      let settings = {
        enabled: true,
        blockMode: true,
        logOnly: false,
        whitelist: [],
        notifyAdmins: false,
        maxReports: 100
      };
      
      if (fs.existsSync(SETTINGS_PATH)) {
        try {
          const fileContent = fs.readFileSync(SETTINGS_PATH, 'utf8');
          settings = { ...settings, ...JSON.parse(fileContent || '{}') };
        } catch (settingsError) {
          console.error('[ANTIBUG] Failed to load settings:', settingsError);
        }
      }

      // Check if antibug is enabled
      if (!settings.enabled) return;

      // Check whitelist
      const senderNumber = sender.split('@')[0];
      if (settings.whitelist.includes(senderNumber) || settings.whitelist.includes(sender)) {
        console.log(`[ANTIBUG] Skipping whitelisted user: ${senderNumber}`);
        return;
      }

      // Determine if we should scan this message
      const isOwner = OWNERS.includes(senderNumber) || OWNERS.includes(sender);
      const shouldScan = settings.blockMode || isOwner || !isGroup;

      if (!shouldScan) return;

      // Detect potential bugs/exploits
      const detectionResult = detectBug(text, m);
      
      if (detectionResult) {
        const { risk, details } = detectionResult;
        
        // Log the detection
        const timestamp = formatDateTime(new Date());
        const logEntry = {
          timestamp,
          sender: senderNumber,
          risk,
          details,
          messageId,
          chat: jid,
          contentPreview: text.substring(0, 100) + (text.length > 100 ? '...' : '')
        };
        
        console.log(`[ANTIBUG] Detected threat: ${risk} from ${senderNumber}`);
        console.log(`[ANTIBUG] Details: ${details}`);
        
        // Save to logs (optional)
        saveDetectionLog(logEntry, settings.maxReports);
        
        // Handle based on settings
        if (!settings.logOnly) {
          // Block the user
          try {
            if (settings.blockMode) {
              await sock.updateBlockStatus(sender, 'block');
              console.log(`[ANTIBUG] Blocked user: ${senderNumber}`);
            }
            
            // Send notification
            const notification = `🛡️ *Antibug Alert*\n\n` +
                               `🚨 *Threat Blocked:*\n${risk}\n\n` +
                               `👤 *User:* @${senderNumber}\n` +
                               `📋 *Details:* ${details}\n` +
                               `⏰ *Time:* ${timestamp}\n\n` +
                               `🛡️ _Protected by Mahachi-XD_`;
            
            // Send to sender (if not blocked)
            if (!settings.blockMode) {
              await sock.sendMessage(jid, {
                text: notification,
                mentions: [sender]
              });
            }
            
            // Notify admins/owners if enabled
            if (settings.notifyAdmins) {
              for (const owner of OWNERS) {
                const ownerJid = owner.includes('@') ? owner : `${owner}@s.whatsapp.net`;
                try {
                  await sock.sendMessage(ownerJid, {
                    text: `🚨 *Antibug Alert - Admin Notification*\n\n` +
                          notification
                  });
                } catch (notifyError) {
                  console.error(`[ANTIBUG] Failed to notify admin ${owner}:`, notifyError);
                }
              }
            }
            
          } catch (blockError) {
            console.error('[ANTIBUG] Failed to block user:', blockError);
          }
        } else {
          // Log only mode
          console.log(`[ANTIBUG] LOG ONLY - Would have blocked: ${senderNumber} | Risk: ${risk}`);
        }
      }
    } catch (err) {
      console.error('[ANTIBUG ERROR]', err);
    }
  },
};

// Enhanced detection logic
function detectBug(text, message) {
  if (!text || typeof text !== 'string') return false;
  
  const detectionResults = [];
  
  // 1. Length overflow detection
  if (text.length > MAX_SAFE_LENGTH) {
    detectionResults.push({
      risk: 'Payload Overflow',
      details: `Message length ${text.length} exceeds safe limit ${MAX_SAFE_LENGTH}`,
      severity: 'HIGH'
    });
  }
  
  // 2. RTL/Unicode obfuscation
  if (/[\u202e\u2066\u2067\u2068\u2069]/.test(text)) {
    detectionResults.push({
      risk: 'RTL/Unicode Obfuscation',
      details: 'Contains right-to-left override or unicode control characters',
      severity: 'HIGH'
    });
  }
  
  // 3. Flag spam detection
  if (text.match(/[\u{1F1E6}-\u{1F1FF}]{5,}/u)) {
    detectionResults.push({
      risk: 'Flag Spam',
      details: 'Excessive flag emojis detected',
      severity: 'MEDIUM'
    });
  }
  
  // 4. Mass mention abuse
  const mentions = text.match(/@everyone|@all|@here|@[0-9]+/gi);
  if (mentions && mentions.length > 20) {
    detectionResults.push({
      risk: 'Mass Mention Abuse',
      details: `Detected ${mentions.length} mentions`,
      severity: 'MEDIUM'
    });
  }
  
  // 5. Zalgo/Invisible characters
  if (/(\u0300|\u0301|\u034f|\u200b|\u200c|\u200d|\u2060|\ufeff){10,}/.test(text)) {
    detectionResults.push({
      risk: 'Zalgo/Invisible Characters',
      details: 'Excessive combining or invisible characters detected',
      severity: 'HIGH'
    });
  }
  
  // 6. Bug link spam
  if (text.match(/https?:\/\/[^\s]{100,}/)) {
    detectionResults.push({
      risk: 'Bug Link Spam',
      details: 'Suspicious long URL detected',
      severity: 'MEDIUM'
    });
  }
  
  // 7. Emoji crash strings
  if (text.match(/[\u{1F600}-\u{1F64F}]{100,}|[\u{1F300}-\u{1F5FF}]{100,}|[\u{1F680}-\u{1F6FF}]{100,}/u)) {
    detectionResults.push({
      risk: 'Emoji Crash String',
      details: 'Excessive emojis that may cause client crashes',
      severity: 'HIGH'
    });
  }
  
  // 8. Zero-width character abuse
  if (/[\u200B-\u200D\uFEFF]/.test(text)) {
    const zeroWidthCount = (text.match(/[\u200B-\u200D\uFEFF]/g) || []).length;
    if (zeroWidthCount > 50) {
      detectionResults.push({
        risk: 'Zero-Width Character Abuse',
        details: `Detected ${zeroWidthCount} zero-width characters`,
        severity: 'MEDIUM'
      });
    }
  }
  
  // 9. Repeated character spam
  if (/(.)\1{100,}/.test(text)) {
    detectionResults.push({
      risk: 'Character Spam',
      details: 'Excessive repeated characters detected',
      severity: 'LOW'
    });
  }
  
  // 10. Suspicious Unicode ranges
  if (/[\uE000-\uF8FF]/.test(text)) {
    detectionResults.push({
      risk: 'Private Use Unicode',
      details: 'Contains private use unicode characters',
      severity: 'MEDIUM'
    });
  }
  
  // 11. Message structure analysis
  if (message && message.message) {
    const messageKeys = Object.keys(message.message);
    // Check for unusual message types
    const suspiciousTypes = [
      'viewOnceMessage',
      'protocolMessage',
      'reactionMessage'
    ];
    
    for (const key of messageKeys) {
      if (suspiciousTypes.includes(key)) {
        detectionResults.push({
          risk: 'Suspicious Message Type',
          details: `Unusual message type: ${key}`,
          severity: 'MEDIUM'
        });
      }
    }
  }
  
  // Return the highest severity detection
  if (detectionResults.length > 0) {
    // Sort by severity (HIGH > MEDIUM > LOW)
    const severityOrder = { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
    detectionResults.sort((a, b) => severityOrder[b.severity] - severityOrder[a.severity]);
    
    return {
      risk: detectionResults[0].risk,
      details: detectionResults[0].details,
      allDetections: detectionResults
    };
  }
  
  return false;
}

// Save detection logs
function saveDetectionLog(entry, maxEntries = 100) {
  try {
    const logPath = path.join(__dirname, '../../logs/antibug.log');
    const logDir = path.dirname(logPath);
    
    // Create logs directory if it doesn't exist
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    // Read existing logs
    let logs = [];
    if (fs.existsSync(logPath)) {
      try {
        const logContent = fs.readFileSync(logPath, 'utf8');
        logs = JSON.parse(logContent || '[]');
      } catch (readError) {
        logs = [];
      }
    }
    
    // Add new entry
    logs.push(entry);
    
    // Limit log size
    if (logs.length > maxEntries) {
      logs = logs.slice(-maxEntries);
    }
    
    // Write logs
    fs.writeFileSync(logPath, JSON.stringify(logs, null, 2));
    
  } catch (logError) {
    console.error('[ANTIBUG] Failed to save log:', logError);
  }
}

// Related command to manage antibug settings
module.exports.antibugCommand = {
  command: ['antibug'],
  aliases: ['bugprotect', 'protect'],
  tags: ['admin'],
  help: [
    'antibug on/off - Enable/disable antibug protection',
    'antibug whitelist <number> - Add number to whitelist',
    'antibug unwhitelist <number> - Remove number from whitelist',
    'antibug status - Show current settings',
    'antibug log - Show recent detections'
  ],
  description: 'Manage antibug protection settings',
  usage: '.antibug status',
  ownerOnly: true,
  
  async run({ sock, m, args }) {
    try {
      const subCommand = args[0]?.toLowerCase();
      
      // Ensure config directory exists
      const configDir = path.join(__dirname, '../../config');
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      
      // Load current settings
      let settings = {
        enabled: true,
        blockMode: true,
        logOnly: false,
        whitelist: [],
        notifyAdmins: false,
        maxReports: 100
      };
      
      if (fs.existsSync(SETTINGS_PATH)) {
        try {
          const fileContent = fs.readFileSync(SETTINGS_PATH, 'utf8');
          settings = { ...settings, ...JSON.parse(fileContent || '{}') };
        } catch (settingsError) {
          console.error('[ANTIBUG CMD] Failed to load settings:', settingsError);
        }
      }
      
      if (subCommand === 'on') {
        settings.enabled = true;
        fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
        return await sock.sendMessage(m.chat, {
          text: '✅ *Antibug protection enabled!*\n\n' +
                '🛡️ Your chats are now protected against various exploits.'
        }, { quoted: m });
        
      } else if (subCommand === 'off') {
        settings.enabled = false;
        fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
        return await sock.sendMessage(m.chat, {
          text: '❌ *Antibug protection disabled.*\n\n' +
                '⚠️ Your chats may be vulnerable to exploits.'
        }, { quoted: m });
        
      } else if (subCommand === 'whitelist') {
        const number = args[1];
        if (!number) {
          return await sock.sendMessage(m.chat, {
            text: '📝 *Usage:* .antibug whitelist <phone_number>\n\n' +
                  'Example: .antibug whitelist 263784812740'
          }, { quoted: m });
        }
        
        const cleanNumber = number.replace(/\D/g, '');
        if (!settings.whitelist.includes(cleanNumber)) {
          settings.whitelist.push(cleanNumber);
          fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
          return await sock.sendMessage(m.chat, {
            text: `✅ *Added to whitelist:*\n📱 ${cleanNumber}\n\n` +
                  'This number will be exempt from antibug protection.'
          }, { quoted: m });
        } else {
          return await sock.sendMessage(m.chat, {
            text: `⚠️ *Already whitelisted:*\n📱 ${cleanNumber}`
          }, { quoted: m });
        }
        
      } else if (subCommand === 'unwhitelist') {
        const number = args[1];
        if (!number) {
          return await sock.sendMessage(m.chat, {
            text: '📝 *Usage:* .antibug unwhitelist <phone_number>\n\n' +
                  'Example: .antibug unwhitelist 263780xxxxxxxx'
          }, { quoted: m });
        }
        
        const cleanNumber = number.replace(/\D/g, '');
        const index = settings.whitelist.indexOf(cleanNumber);
        if (index > -1) {
          settings.whitelist.splice(index, 1);
          fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
          return await sock.sendMessage(m.chat, {
            text: `✅ *Removed from whitelist:*\n📱 ${cleanNumber}`
          }, { quoted: m });
        } else {
          return await sock.sendMessage(m.chat, {
            text: `⚠️ *Not in whitelist:*\n📱 ${cleanNumber}`
          }, { quoted: m });
        }
        
      } else if (subCommand === 'log') {
        const logPath = path.join(__dirname, '../../logs/antibug.log');
        if (fs.existsSync(logPath)) {
          try {
            const logContent = fs.readFileSync(logPath, 'utf8');
            const logs = JSON.parse(logContent || '[]');
            
            if (logs.length === 0) {
              return await sock.sendMessage(m.chat, {
                text: '📋 *Antibug Logs*\n\nNo detections recorded.'
              }, { quoted: m });
            }
            
            const recentLogs = logs.slice(-10); // Show last 10
            let logText = '📋 *Recent Antibug Detections*\n\n';
            
            recentLogs.forEach((log, index) => {
              logText += `${index + 1}. 🚨 ${log.risk}\n` +
                        `   👤 ${log.sender}\n` +
                        `   ⏰ ${log.timestamp}\n` +
                        `   📋 ${log.details}\n\n`;
            });
            
            return await sock.sendMessage(m.chat, {
              text: logText
            }, { quoted: m });
            
          } catch (logError) {
            return await sock.sendMessage(m.chat, {
              text: '❌ Failed to read logs.'
            }, { quoted: m });
          }
        } else {
          return await sock.sendMessage(m.chat, {
            text: '📋 *Antibug Logs*\n\nNo detections recorded.'
          }, { quoted: m });
        }
        
      } else {
        // Show status
        return await sock.sendMessage(m.chat, {
          text: `🛡️ *Antibug Protection Status*\n\n` +
                `📊 *Enabled:* ${settings.enabled ? '✅ ON' : '❌ OFF'}\n` +
                `🛡️ *Block Mode:* ${settings.blockMode ? '✅ ON' : '❌ OFF'}\n` +
                `📝 *Log Only:* ${settings.logOnly ? '✅ ON' : '❌ OFF'}\n` +
                `📢 *Notify Admins:* ${settings.notifyAdmins ? '✅ ON' : '❌ OFF'}\n` +
                `📋 *Whitelisted:* ${settings.whitelist.length} numbers\n` +
                `📊 *Max Reports:* ${settings.maxReports}\n\n` +
                `📝 *Usage:*\n` +
                `.antibug on/off - Toggle protection\n` +
                `.antibug whitelist <number> - Add to whitelist\n` +
                `.antibug unwhitelist <number> - Remove from whitelist\n` +
                `.antibug log - View recent detections\n` +
                `.antibug status - Show this message`
        }, { quoted: m });
      }
      
    } catch (err) {
      console.error('[ANTIBUG CMD] Error:', err);
      return await sock.sendMessage(m.chat, {
        text: '❌ Failed to manage antibug settings.'
      }, { quoted: m });
    }
  }
};