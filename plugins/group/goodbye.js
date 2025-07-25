const fs = require('fs');
const path = require('path');
const { formatDateTime } = require('../../lib/format');

module.exports = {
  name: 'goodbye',
  category: 'group',
  desc: 'Sends funny goodbye messages when someone leaves the group',
  usage: 'Automatically active when someone leaves the group',
  cooldown: 1,
  ownerOnly: false,
  groupOnly: true,
  privateOnly: false,
  adminOnly: false,
  botAdmin: false,
  
  async onParticipantRemoved({ sock, jid, participants, from }) {
    try {
      // Validate inputs
      if (!sock || !jid || !participants) {
        console.log('[GOODBYE] Missing required parameters');
        return;
      }

      // Only run in group chats
      if (!jid.endsWith('@g.us')) {
        console.log('[GOODBYE] Not a group chat');
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
      
      // Check if goodbye is enabled for this group
      if (!groupSettings.goodbye) {
        console.log('[GOODBYE] Goodbye messages disabled for this group');
        return;
      }
      
      // Get group metadata
      let metadata;
      try {
        metadata = await sock.groupMetadata(jid);
      } catch (metaError) {
        console.error('[GOODBYE] Failed to get group metadata:', metaError);
        return;
      }
      
      const groupName = metadata.subject || 'Unknown Group';
      
      // Process each leaving participant
      for (const user of participants) {
        try {
          const userId = user.split('@')[0];
          const userJid = user;
          
          // Skip if it's the bot itself
          if (userJid === sock.user.id.split(':')[0] + '@s.whatsapp.net') {
            console.log('[GOODBYE] Skipping bot leaving message');
            continue;
          }
          
          // Get user profile picture if available
          let userProfilePic = null;
          try {
            userProfilePic = await sock.profilePictureUrl(userJid, 'image');
          } catch (picError) {
            // Profile picture not available, continue without it
            console.log(`[GOODBYE] No profile picture for ${userId}`);
          }
          
          // Get current time
          const currentTime = formatDateTime(new Date());
          
          // Select message type based on settings or random
          const messageType = groupSettings.goodbyeMessageType || 'random';
          
          let goodbyeMessage = '';
          
          if (messageType === 'custom' && groupSettings.customGoodbyeMessage) {
            // Use custom message
            goodbyeMessage = groupSettings.customGoodbyeMessage
              .replace('{user}', `@${userId}`)
              .replace('{group}', groupName)
              .replace('{time}', currentTime);
          } else {
            // Use default insult messages
            const insultList = [
              `@${userId} just left the group. Damn, we didn't know trash could walk.`,
              `One less brain cell in the chat. Bye @${userId}.`,
              `@${userId} left. Finally, the air smells better.`,
              `Peace out @${userId}. Try not to trip over your own ego on the way out.`,
              `@${userId} is gone... and not a single tear was shed.`,
              `The circus just lost a clown. Bye.`,
              `And just like that, the group's IQ doubled.`,
              `Another L for the streets. Bye fool.`,
              `@${userId} left like their dad – without saying a word.`,
              `@${userId} dipped. Don't come back without personality.`,
              `Lost a member, gained some peace.`,
              `@${userId} finally rage quit. Better late than never.`,
              `They left the group... and took the cringe with them.`,
              `@${userId} has left. Time to celebrate 🎉`,
              `That's one less disappointment in the group.`,
              `Ding dong the idiot's gone.`,
              `Bot detected lack of contribution from @${userId}, automatic kick successful 😎`,
              `He/she left before we could roast them. Coward.`,
              `You know it's a good day when clowns take the exit.`,
              `Hope you find a group that matches your energy. Maybe a trash can?`,
              `Left the group? Even the group didn't notice you.`,
              `👋 @${userId} decided to take their leave. We'll manage without the drama.`,
              `🚪 Exit stage left: @${userId}. Try not to let the door hit you on the way out!`,
              `📉 Group IQ just increased. Thanks for that @${userId}!`,
              `🎭 And the award for most dramatic exit goes to... @${userId}!`,
              `🧼 The group just got a little cleaner with @${userId}'s departure.`,
              `⚡ Lightning lost its spark. @${userId} left the building!`,
              `🕳️ Another one bites the dust. Farewell @${userId}!`,
              `🌪️ @${userId} got sucked into the void. Group pressure, maybe?`,
              `🛫 @${userId} has departed. No farewell hugs will be missed.`,
              `🧳 Suitcase packed, @${userId} is outta here!`,
              `🔚 The end of an era. Goodbye @${userId}!`,
              `🔇 Silence is golden... especially after @${userId} left.`,
              `🎯 Bullseye! @${userId} hit the eject button.`,
              `🌋 The volcano just erupted. @${userId} escaped the lava flow!`,
              `🚢 Abandon ship! @${userId} jumped off the group Titanic.`,
              `🪂 Parachute deployed. @${userId} bailed out!`,
              `🏁 Checkered flag for @${userId}. Race over!`,
              `🪦 R.I.P @${userId}'s group participation.`,
              `🕳️ @${userId} fell into a black hole. Poetic justice!`,
              `🎭 Curtain call for @${userId}. Take a bow and exit!`,
              `🧨 Fireworks and fanfare as @${userId} takes their leave!`,
              `🌪️ Tornado alert! @${userId} got swept away!`,
              `🪜 @${userId} climbed the exit ladder. Good riddance!`,
              `🚪 The revolving door spins again. @${userId} is out!`,
              `🧻 @${userId} unraveled and left the group.`,
              `⚡ Power outage in @${userId}'s brain. They left to recharge.`,
              `🕳️ @${userId} discovered the exit portal. Oblivion awaits!`,
              `🎭 @${userId} took their final bow. Bravo for the exit!`,
              `🚀 @${userId} launched into space. Houston, we have liftoff!`,
              `🧻 Toilet paper roll ended. @${userId} rolled out!`,
              `🕳️ @${userId} found the secret exit. Ninja skills!`,
              `🎭 @${userId} exited stage left. Standing ovation not included.`,
              `🚪 Door closed on @${userId}. Lock it tight!`,
              `🧨 @${userId}'s fuse burned out. Time to explode elsewhere!`,
              `🌪️ Cyclone @${userId} touched down and vanished!`,
              `🪂 @${userId} deployed their escape chute. Mission abort!`,
              `🏁 @${userId} crossed the finish line. Marathon over!`,
              `🪦 Graveyard got a new resident. Rest in peace @${userId}!`,
              `🕳️ Black hole consumed @${userId}. Spaghettification complete!`,
              `🎭 @${userId} took their final bow. Curtain falls!`,
              `🚀 @${userId} launched into orbit. Space exploration begins!`,
              `🧻 @${userId} unspooled and rolled away. Paper trail ends!`,
              `🕳️ @${userId} discovered the hidden passage. Secret agent!`,
              `🎭 @${userId} exited through the stage door. Applause fades!`,
              `🚪 @${userId} slammed the door. Echo chamber effect!`,
              `🧨 @${userId}'s fireworks display ended. Show's over!`,
              `🌪️ @${userId} got swept up in the storm. Weather report: clear skies ahead!`,
              `🪂 @${userId} activated their emergency parachute. Bailout successful!`,
              `🏁 @${userId} reached the end zone. Touchdown achieved!`,
              `🪦 @${userId} was laid to rest. Eternal sleep begins!`,
              `🕳️ @${userId} was absorbed by the void. Existence nullified!`,
              `🎭 @${userId} took their final curtain call. The show must go on!`,
              `🚀 @${userId} achieved escape velocity. Gravity can't hold them back!`,
              `🧻 @${userId} ran out of material. Story ends here!`,
              `🕳️ @${userId} found the secret exit. Level complete!`,
              `🎭 @${userId} exited the theater. Credits roll!`,
              `🚪 @${userId} walked through the exit. Welcome mat removed!`,
              `🧨 @${userId}'s celebration ended. Party's over!`,
              `🌪️ @${userId} was carried away by the wind. Calm returns!`,
              `🪂 @${userId} landed safely. Mission accomplished!`,
              `🏁 @${userId} crossed the finish line. Victory lap complete!`,
              `🪦 @${userId} found their final resting place. Peace at last!`,
              `🕳️ @${userId} disappeared into the abyss. Nothingness achieved!`,
              `🎭 @${userId} took their final bow. Applause fades to silence!`
            ];
            
            goodbyeMessage = insultList[Math.floor(Math.random() * insultList.length)];
          }
          
          // Add footer
          const footer = `\n\n📋 *Group:* ${groupName}\n` +
                        `⏰ *Time:* ${currentTime}\n` +
                        `🛡️ *Powered by Mahachi-XD*`;
          
          const finalMessage = goodbyeMessage + footer;
          
          // Send goodbye message
          const messageOptions = {
            text: finalMessage,
            mentions: [userJid]
          };
          
          // Add profile picture if available
          if (userProfilePic && groupSettings.goodbyeShowProfilePic !== false) {
            messageOptions.contextInfo = {
              externalAdReply: {
                title: 'Goodbye Message',
                body: `Farewell ${userId}`,
                thumbnailUrl: userProfilePic,
                mediaType: 1,
                renderLargerThumbnail: true
              }
            };
          }
          
          await sock.sendMessage(jid, messageOptions);
          
          // Log successful goodbye message
          console.log(`[GOODBYE] Sent message for ${userId} in ${groupName}`);
          
        } catch (userError) {
          console.error(`[GOODBYE] Error processing user ${user}:`, userError);
        }
      }
      
    } catch (err) {
      console.error('[GOODBYE] Error:', err);
      
      // Send error notification to group (only in developer mode)
      /*
      try {
        if (process.env.DEVELOPER_MODE === 'true') {
          await sock.sendMessage(jid, {
            text: '❌ *Goodbye Error:* Failed to process departure message.'
          });
        }
      } catch (notificationError) {
        console.error('[GOODBYE] Failed to send error notification:', notificationError);
      }
      */
    }
  }
};

// Related command to manage goodbye settings
module.exports.goodbyeCommand = {
  command: ['goodbye'],
  aliases: ['bye', 'farewell'],
  tags: ['group'],
  help: ['goodbye on/off', 'goodbye custom <message>'],
  description: 'Manage goodbye messages for the group',
  usage: '.goodbye on/off',
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
        settings[groupId].goodbye = true;
        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
        
        return await sock.sendMessage(m.chat, {
          text: '✅ *Goodbye messages enabled!*\n\n' +
                'Funny farewell messages will now be sent when someone leaves.'
        }, { quoted: m });
        
      } else if (subCommand === 'off') {
        if (settings[groupId]) {
          settings[groupId].goodbye = false;
        }
        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
        
        return await sock.sendMessage(m.chat, {
          text: '❌ *Goodbye messages disabled.*'
        }, { quoted: m });
        
      } else if (subCommand === 'custom') {
        const customMessage = args.slice(1).join(' ');
        if (!customMessage) {
          return await sock.sendMessage(m.chat, {
            text: '📝 *Usage:* .goodbye custom <your message>\n\n' +
                  '💡 *Placeholders:*\n' +
                  '{user} - Mentions the leaving user\n' +
                  '{group} - Group name\n' +
                  '{time} - Current time\n\n' +
                  '📝 *Example:* .goodbye custom Goodbye {user}! We will miss you in {group}.'
          }, { quoted: m });
        }
        
        settings[groupId] = settings[groupId] || {};
        settings[groupId].goodbye = true;
        settings[groupId].goodbyeMessageType = 'custom';
        settings[groupId].customGoodbyeMessage = customMessage;
        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
        
        return await sock.sendMessage(m.chat, {
          text: `✅ *Custom goodbye message set!*\n\n` +
                `📝 Message: ${customMessage}\n\n` +
                `💡 Placeholders will be replaced automatically.`
        }, { quoted: m });
        
      } else {
        // Show current status
        const groupSettings = settings[groupId] || {};
        const status = groupSettings.goodbye ? '✅ *ENABLED*' : '❌ *DISABLED*';
        const messageType = groupSettings.goodbyeMessageType || 'random';
        const customMessage = groupSettings.customGoodbyeMessage || 'Not set';
        
        return await sock.sendMessage(m.chat, {
          text: `⚙️ *Goodbye Settings*\n\n` +
                `📊 *Status:* ${status}\n` +
                `🎮 *Type:* ${messageType}\n` +
                `${messageType === 'custom' ? `📝 *Custom Message:* ${customMessage}\n\n` : ''}` +
                `📝 *Usage:*\n` +
                `.goodbye on    - Enable goodbye messages\n` +
                `.goodbye off   - Disable goodbye messages\n` +
                `.goodbye custom <message> - Set custom message`
        }, { quoted: m });
      }
      
    } catch (err) {
      console.error('[GOODBYE CMD] Error:', err);
      return await sock.sendMessage(m.chat, {
        text: '❌ *Failed to update goodbye settings.*\nPlease try again later.'
      }, { quoted: m });
    }
  }
};