const { formatDateTime } = require('../../lib/format');

module.exports = {
  name: 'kick',
  alias: ['ban', 'remove', 'expel'],
  category: 'group',
  desc: 'Kick a user from the group by mention or reply',
  usage: '.kick @user or reply to user\'s message',
  cooldown: 5,
  ownerOnly: false,
  groupOnly: true,
  privateOnly: false,
  adminOnly: true,
  botAdmin: true,
  
  async run({ sock, m, text, participants, isOwner, isAdmin, isBotAdmin }) {
    try {
      const groupId = m.chat;
      const sender = m.sender;
      const senderNumber = sender.split('@')[0];
      
      // Validate group context
      if (!groupId.endsWith('@g.us')) {
        return await sock.sendMessage(m.chat, {
          text: '❌ This command can only be used in group chats.'
        }, { quoted: m });
      }
      
      // Validate permissions
      if (!isAdmin && !isOwner) {
        return await sock.sendMessage(m.chat, {
          text: '❌ You must be an *admin* to use this command.'
        }, { quoted: m });
      }
      
      if (!isBotAdmin) {
        return await sock.sendMessage(m.chat, {
          text: '❌ I need to be *admin* to kick members.'
        }, { quoted: m });
      }
      
      let usersToKick = [];
      
      // 1. If user replied to someone
      if (m.quoted) {
        usersToKick.push(m.quoted.sender);
      }
      
      // 2. If tagged someone
      if (m.mentionedJid?.length) {
        usersToKick = [...usersToKick, ...m.mentionedJid];
      }
      
      // 3. If phone numbers provided in text
      if (text) {
        const phoneNumbers = text.match(/[\d]{5,}/g);
        if (phoneNumbers) {
          const jidNumbers = phoneNumbers.map(num => `${num}@s.whatsapp.net`);
          usersToKick = [...usersToKick, ...jidNumbers];
        }
      }
      
      if (usersToKick.length === 0) {
        return await sock.sendMessage(m.chat, {
          text: `❌ *Usage:* .kick @user or reply to user's message\n\n` +
            `📝 *Examples:*\n` +
            `.kick @user\n` +
            `.kick +1234567890\n` +
            `Reply to user's message with .kick`
        }, { quoted: m });
      }
      
      // Remove duplicates
      usersToKick = [...new Set(usersToKick)];
      
      // Progress message
      const progressMsg = await sock.sendMessage(m.chat, {
        text: `👢 *Processing kick request...*\n` +
          `Users to kick: ${usersToKick.length}`
      }, { quoted: m });
      
      let successCount = 0;
      let failCount = 0;
      const results = [];
      
      // Process each user
      for (const user of usersToKick) {
        try {
          const userNumber = user.split('@')[0];
          
          // Check if user exists in group
          const userInGroup = participants.find(p => p.id === user);
          if (!userInGroup) {
            results.push(`❌ @${userNumber} is not in this group.`);
            failCount++;
            continue;
          }
          
          // Check if user is admin
          if (userInGroup.admin) {
            results.push(`🛡️ Cannot kick @${userNumber} — they're an admin.`);
            failCount++;
            continue;
          }
          
          // Check if trying to kick self
          if (user === sender) {
            results.push(`🤔 @${userNumber} tried to kick themselves. How?`);
            failCount++;
            continue;
          }
          
          // Check if trying to kick bot
          if (user === sock.user.id.split(':')[0] + '@s.whatsapp.net') {
            results.push(`🤖 Nice try! I can't kick myself.`);
            failCount++;
            continue;
          }
          
          // Kick the user
          await sock.groupParticipantsUpdate(groupId, [user], 'remove');
          
          // Success message
          results.push(`✅ @${userNumber} has been *kicked* from the group.`);
          successCount++;
          
          // Log successful kick
          console.log(`[KICK] User ${userNumber} kicked by ${senderNumber} in ${groupId}`);
          
        } catch (err) {
          const userNumber = user.split('@')[0];
          console.error(`[KICK] Failed to kick ${userNumber}:`, err);
          
          let errorMsg = `❌ Failed to kick @${userNumber}.`;
          
          if (err.message?.includes('Forbidden')) {
            errorMsg += ' (Insufficient permissions)';
          } else if (err.message?.includes('not in group')) {
            errorMsg += ' (User not in group)';
          }
          
          results.push(errorMsg);
          failCount++;
        }
      }
      
      // Final report
      const currentTime = formatDateTime(new Date());
      const finalMessage = `👢 *Kick Operation Complete*\n\n` +
        `📊 *Results:*\n` +
        `✅ Successful: ${successCount}\n` +
        `❌ Failed: ${failCount}\n` +
        `📋 *Details:*\n` +
        `${results.map(r => `• ${r}`).join('\n')}\n\n` +
        `👤 *Executor:* @${senderNumber}\n` +
        `⏰ *Time:* ${currentTime}\n\n` +
        `🛡️ _Powered by Mahachi-XD_`;
      
      await sock.sendMessage(m.chat, {
        text: finalMessage,
        mentions: [sender, ...usersToKick],
        edit: progressMsg.key
      });
      
    } catch (err) {
      console.error('[KICK ERROR]', err);
      
      let errorMessage = '❌ *Failed to process kick command.*\n\n';
      
      if (err.message?.includes('admin')) {
        errorMessage += '👮 Make sure I have admin privileges.\n';
      } else if (err.message?.includes('Forbidden')) {
        errorMessage += '🔐 Insufficient permissions to kick users.\n';
      } else {
        errorMessage += '🔧 An unexpected error occurred.\n';
      }
      
      errorMessage += '\n💡 *Tips:*\n' +
        '• Ensure the bot is an admin\n' +
        '• Check group permissions\n' +
        '• Verify the user is in the group';
      
      try {
        await sock.sendMessage(m.chat, {
          text: errorMessage,
          edit: progressMsg?.key
        });
      } catch {
        await sock.sendMessage(m.chat, {
          text: errorMessage
        }, { quoted: m });
      }
    }
  }
};

// Alternative implementation with confirmation
/*
module.exports = {
  name: 'kick',
  alias: ['ban', 'remove'],
  category: 'group',
  desc: 'Kick a user from the group with confirmation',
  admin: true,
  botAdmin: true,
  
  async run({ sock, m, text, participants, args }) {
    try {
      const groupId = m.chat;
      
      if (!groupId.endsWith('@g.us')) {
        return await m.reply('❌ This command can only be used in group chats.');
      }
      
      let usersToKick = [];
      
      if (m.quoted) {
        usersToKick.push(m.quoted.sender);
      }
      
      if (m.mentionedJid?.length) {
        usersToKick = [...usersToKick, ...m.mentionedJid];
      }
      
      if (usersToKick.length === 0) {
        return await m.reply('❌ Tag a user or reply to their message to kick.');
      }
      
      // Confirmation system
      const confirm = args[0]?.toLowerCase();
      
      if (confirm !== 'confirm') {
        const userNames = usersToKick.map(u => `@${u.split('@')[0]}`).join(', ');
        return await m.reply(`⚠️ *Kick Confirmation*\n\n` +
                           `This will remove ${userNames} from the group.\n\n` +
                           `To proceed, type: .kick confirm`);
      }
      
      const progressMsg = await m.reply('👢 Processing kick...');
      
      for (const user of usersToKick) {
        const userNumber = user.split('@')[0];
        
        if (participants.find(p => p.id === user)?.admin) {
          await m.reply(`❌ Cannot kick @${userNumber} — they're an admin.`, progressMsg.key);
          continue;
        }
        
        try {
          await sock.groupParticipantsUpdate(groupId, [user], 'remove');
          await m.reply(`✅ @${userNumber} has been kicked.`, progressMsg.key);
        } catch (err) {
          console.error(`[KICK] Failed to kick ${userNumber}:`, err);
          await m.reply(`❌ Failed to kick @${userNumber}.`, progressMsg.key);
        }
      }
      
    } catch (err) {
      console.error('[KICK ERROR]', err);
      await m.reply('❌ Failed to kick user(s). Make sure I am an admin.');
    }
  }
};
*/