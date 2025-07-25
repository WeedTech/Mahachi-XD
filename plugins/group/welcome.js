const fs = require('fs');
const path = require('path');
const { formatDateTime } = require('../../lib/format');

module.exports = {
  name: 'welcome',
  category: 'group',
  desc: 'Welcomes new users to any groups with a custom message',
  usage: 'Automatically active when someone joins the group',
  cooldown: 1,
  ownerOnly: false,
  groupOnly: true,
  privateOnly: false,
  adminOnly: false,
  botAdmin: false,
  
  async onParticipantAdded({ sock, jid, participants }) {
    try {
      // Validate inputs
      if (!sock || !jid || !participants) {
        console.log('[WELCOME] Missing required parameters');
        return;
      }
      
      // Only run in group chats
      if (!jid.endsWith('@g.us')) {
        console.log('[WELCOME] Not a group chat');
        return;
      }
      
      // Load or initialize config
      const settingsPath = path.join(__dirname, '../../config/groupSettings.json');
      let settings = {};
      
      if (fs.existsSync(settingsPath)) {
        const fileContent = fs.readFileSync(settingsPath, 'utf8');
        settings = JSON.parse(fileContent || '{}');
      }
      
      const groupSettings = settings[jid] || {};
      
      // Check if welcome is enabled for this group
      if (!groupSettings.welcome) {
        console.log('[WELCOME] Welcome messages disabled for this group');
        return;
      }
      
      // Get group metadata
      let metadata;
      try {
        metadata = await sock.groupMetadata(jid);
      } catch (metaError) {
        console.error('[WELCOME] Failed to get group metadata:', metaError);
        return;
      }
      
      const groupName = metadata.subject || 'Unknown Group';
      const groupDesc = metadata.desc || 'No description';
      
      // Process each joining participant
      for (const user of participants) {
        try {
          const userId = user.split('@')[0];
          const userJid = user;
          
          // Skip if it's the bot itself
          if (userJid === sock.user.id.split(':')[0] + '@s.whatsapp.net') {
            console.log('[WELCOME] Skipping bot welcome message');
            continue;
          }
          
          // Get user profile picture if available
          let userProfilePic = 'https://i.ibb.co/Rz9fGZq/no-profile-picture.png';
          try {
            userProfilePic = await sock.profilePictureUrl(userJid, 'image');
          } catch (picError) {
            // Use default profile picture
            console.log(`[WELCOME] Using default profile picture for ${userId}`);
          }
          
          // Get current time
          const currentTime = formatDateTime(new Date());
          
          // Select message type based on settings or random
          const messageType = groupSettings.welcomeMessageType || 'default';
          
          let welcomeMessage = '';
          
          if (messageType === 'custom' && groupSettings.customWelcomeMessage) {
            // Use custom message
            welcomeMessage = groupSettings.customWelcomeMessage
              .replace('{user}', `@${userId}`)
              .replace('{group}', groupName)
              .replace('{time}', currentTime)
              .replace('{members}', metadata.participants?.length || 'unknown');
          } else {
            // Use default welcome messages
            const welcomeMessages = [
              `👋 Hi @${userId}, welcome to *${groupName}* 🎉\n\nWe're glad to have you here! Feel free to introduce yourself, check out the rules, and join the fun.\n\n📌 Make sure to respect others and keep this community clean, fun, and helpful for everyone.\n\nIf you have any questions or need assistance, tag any admin or type *menu* to explore my features.\n\n🔒 Stay safe, avoid suspicious links, and have a blast!\n\n⚡ *Powered by* _WEED_ x _IceFlowTech_`,
              
              `🎉 Welcome to *${groupName}*, @${userId}! 🎊\n\nWe're excited to have you join our community! Here's what you need to know:\n\n✅ Be respectful to all members\n✅ Follow group rules\n✅ Have fun and contribute positively\n\nFeel free to say hello and tell us a bit about yourself!\n\n🛡️ *Group:* ${groupName}\n👥 *Members:* ${metadata.participants?.length || 'unknown'}\n⏰ *Joined:* ${currentTime}\n\n💡 _Powered by Mahachi-XD_`,
              
              `🌟 @${userId} has joined *${groupName}*!\n\nWelcome aboard! We hope you enjoy your time here. Don't forget to:\n\n👋 Introduce yourself\n📚 Read the group description\n🤝 Be kind and respectful\n🎭 Have fun!\n\nNeed help? Just ask! Our admins and community are here to help.\n\n📋 *Group:* ${groupName}\n📝 *Description:* ${groupDesc.substring(0, 100)}${groupDesc.length > 100 ? '...' : ''}\n📅 *Date:* ${currentTime}\n\n🎯 _Mahachi-XD Welcomes You_`,
              
              `🎊 *New Member Alert!* 🎊\n\nPlease welcome @${userId} to our awesome group *${groupName}*!\n\nQuick tips for new members:\n1️⃣ Say hi in the chat\n2️⃣ Check out the pinned messages\n3️⃣ Follow group guidelines\n4️⃣ Enjoy the community!\n\nWe're happy to have you here! 😊\n\n📍 *Group:* ${groupName}\n📊 *Total Members:* ${metadata.participants?.length || 'unknown'}\n🕒 *Joined at:* ${currentTime}\n\n🔥 _Brought to you by WEED x IceFlowTech_`,
              
              `🚀 @${userId} has landed in *${groupName}*!\n\nMission Control: Welcome to our group! Here's your orientation:\n\n🧭 Be respectful and kind\n🧭 Follow group rules\n🧭 Participate and have fun\n🧭 Ask questions when needed\n\nYour journey starts now! 🌟\n\n🏠 *Home Group:* ${groupName}\n👥 *Community Size:* ${metadata.participants?.length || 'unknown'} members\n🕘 *Arrival Time:* ${currentTime}\n\n💫 _Powered by Mahachi-XD Technology_`
            ];
            
            welcomeMessage = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
          }
          
          // Send welcome message with profile picture
          await sock.sendMessage(jid, {
            image: { url: userProfilePic },
            caption: welcomeMessage,
            mentions: [userJid],
            contextInfo: {
              externalAdReply: {
                title: `Welcome to ${groupName}`,
                body: `New member: ${userId}`,
                thumbnailUrl: userProfilePic,
                mediaType: 1,
                renderLargerThumbnail: true
              }
            }
          });
          
          // Log successful welcome message
          console.log(`[WELCOME] Sent welcome message for ${userId} in ${groupName}`);
          
        } catch (userError) {
          console.error(`[WELCOME] Error processing user ${user}:`, userError);
        }
      }
      
    } catch (err) {
      console.error('[WELCOME] Error:', err);
      
      // Send error notification to group (only in developer mode)
      /*
      try {
        if (process.env.DEVELOPER_MODE === 'true') {
          await sock.sendMessage(jid, {
            text: '❌ *Welcome Error:* Failed to process welcome message.'
          });
        }
      } catch (notificationError) {
        console.error('[WELCOME] Failed to send error notification:', notificationError);
      }
      */
    }
  }
};

// Related command to manage welcome settings
module.exports.welcomeCommand = {
  command: ['welcome'],
  aliases: ['welc', 'greet'],
  tags: ['group'],
  help: ['welcome on/off', 'welcome custom <message>'],
  description: 'Manage welcome messages for the group',
  usage: '.welcome on/off',
  adminOnly: true,
  groupOnly: true,
  
  async run({ sock, m, args }) {
    try {
      const groupId = m.key.remoteJid;
      
      if (!groupId.endsWith('@g.us')) {
        return await sock.sendMessage(m.chat, {
          text: '❌ This command can only be used in groups.'
        }, { quoted: m });
      }
      
      // Ensure config directory exists
      const configDir = path.join(__dirname, '../../config');
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      
      const settingsPath = path.join(__dirname, '../../config/groupSettings.json');
      
      // Load or initialize config
      let settings = {};
      if (fs.existsSync(settingsPath)) {
        const fileContent = fs.readFileSync(settingsPath, 'utf8');
        settings = JSON.parse(fileContent || '{}');
      }
      
      const subCommand = args[0]?.toLowerCase();
      
      if (subCommand === 'on') {
        settings[groupId] = settings[groupId] || {};
        settings[groupId].welcome = true;
        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
        
        return await sock.sendMessage(m.chat, {
          text: '✅ *Welcome messages enabled!*\n\n' +
            'New members will now receive a welcome message.'
        }, { quoted: m });
        
      } else if (subCommand === 'off') {
        if (settings[groupId]) {
          settings[groupId].welcome = false;
        }
        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
        
        return await sock.sendMessage(m.chat, {
          text: '❌ *Welcome messages disabled.*'
        }, { quoted: m });
        
      } else if (subCommand === 'custom') {
        const customMessage = args.slice(1).join(' ');
        if (!customMessage) {
          return await sock.sendMessage(m.chat, {
            text: '📝 *Usage:* .welcome custom <your message>\n\n' +
              '💡 *Placeholders:*\n' +
              '{user} - Mentions the new user\n' +
              '{group} - Group name\n' +
              '{time} - Current time\n' +
              '{members} - Number of group members\n\n' +
              '📝 *Example:* .welcome custom Welcome {user} to {group}! We now have {members} members.'
          }, { quoted: m });
        }
        
        settings[groupId] = settings[groupId] || {};
        settings[groupId].welcome = true;
        settings[groupId].welcomeMessageType = 'custom';
        settings[groupId].customWelcomeMessage = customMessage;
        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
        
        return await sock.sendMessage(m.chat, {
          text: `✅ *Custom welcome message set!*\n\n` +
            `📝 Message: ${customMessage}\n\n` +
            `💡 Placeholders will be replaced automatically.`
        }, { quoted: m });
        
      } else {
        // Show current status
        const groupSettings = settings[groupId] || {};
        const status = groupSettings.welcome ? '✅ *ENABLED*' : '❌ *DISABLED*';
        const messageType = groupSettings.welcomeMessageType || 'default';
        const customMessage = groupSettings.customWelcomeMessage || 'Not set';
        
        return await sock.sendMessage(m.chat, {
          text: `⚙️ *Welcome Settings*\n\n` +
            `📊 *Status:* ${status}\n` +
            `🎮 *Type:* ${messageType}\n` +
            `${messageType === 'custom' ? `📝 *Custom Message:* ${customMessage}\n\n` : ''}` +
            `📝 *Usage:*\n` +
            `.welcome on    - Enable welcome messages\n` +
            `.welcome off   - Disable welcome messages\n` +
            `.welcome custom <message> - Set custom message`
        }, { quoted: m });
      }
      
    } catch (err) {
      console.error('[WELCOME CMD] Error:', err);
      return await sock.sendMessage(m.chat, {
        text: '❌ *Failed to update welcome settings.*\nPlease try again later.'
      }, { quoted: m });
    }
  }
};