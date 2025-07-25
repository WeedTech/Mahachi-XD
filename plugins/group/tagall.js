const { formatNumber } = require('../../lib/format');

module.exports = {
  name: 'tagall',
  alias: ['everyone', 'all', 'announce'],
  category: 'group',
  desc: 'Tag all group members with a custom message',
  usage: '.tagall [message]',
  cooldown: 10,
  ownerOnly: false,
  groupOnly: true,
  privateOnly: false,
  adminOnly: true,
  botAdmin: true,
  
  async run({ sock, m, args, isOwner, isAdmin, isBotAdmin }) {
    try {
      const jid = m.key.remoteJid;
      const sender = m.key.participant || m.key.remoteJid;
      const senderNumber = sender.split('@')[0];
      
      // Validate group context
      if (!jid.endsWith('@g.us')) {
        return await sock.sendMessage(m.chat, {
          text: '❌ This command can only be used inside groups.'
        }, { quoted: m });
      }
      
      // Notify about processing
      const progressMsg = await sock.sendMessage(m.chat, {
        text: '👥 *Preparing to tag all members...*'
      }, { quoted: m });
      
      // Get group metadata
      let metadata;
      try {
        metadata = await sock.groupMetadata(jid);
      } catch (metaError) {
        throw new Error('Failed to fetch group metadata');
      }
      
      const groupName = metadata.subject || 'Unknown Group';
      const participants = metadata.participants;
      
      if (!participants || participants.length === 0) {
        return await sock.sendMessage(m.chat, {
          text: '⚠️ No participants found in this group.',
          edit: progressMsg.key
        });
      }
      
      // Filter out bots and inactive users (optional)
      const activeParticipants = participants.filter(p => {
        // You can add more filtering logic here if needed
        return p.id && !p.id.includes('status@broadcast');
      });
      
      if (activeParticipants.length === 0) {
        return await sock.sendMessage(m.chat, {
          text: '⚠️ No active participants found in this group.',
          edit: progressMsg.key
        });
      }
      
      // Prepare mentions
      const mentions = activeParticipants.map(p => p.id);
      
      // Custom message after command
      const customMsg = args.length > 0 ? args.join(' ') : '📢 *Attention everyone!*';
      
      // Create participant list with roles
      let participantList = '';
      let adminCount = 0;
      let memberCount = 0;
      
      activeParticipants.forEach((p, i) => {
        const role = p.admin ? (p.admin === 'superadmin' ? '👑' : '👮') : '👤';
        const number = p.id.split('@')[0];
        participantList += `${role} @${number}\n`;
        
        if (p.admin) {
          adminCount++;
        } else {
          memberCount++;
        }
      });
      
      // Create formatted message
      const currentTime = new Date().toLocaleString('en-US', {
        timeZone: 'Africa/Harare',
        hour12: true,
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      const tagallMessage = `📢 *Group Announcement*\n\n` +
        `📋 *Message:* ${customMsg}\n\n` +
        `👥 *Participants:* ${formatNumber(activeParticipants.length)}\n` +
        `👮 *Admins:* ${formatNumber(adminCount)}\n` +
        `👤 *Members:* ${formatNumber(memberCount)}\n` +
        `🏷️ *Group:* ${groupName}\n` +
        `⏰ *Time:* ${currentTime}\n\n` +
        `👥 *Tagged Members:*\n` +
        `${participantList}\n` +
        `💬 _Powered by Mahachi-XD_`;
      
      // Send the tagall message
      await sock.sendMessage(jid, {
        text: tagallMessage,
        mentions: [sender, ...mentions]
      }, { quoted: m });
      
      // Update progress message to show completion
      await sock.sendMessage(m.chat, {
        text: `✅ *Tagged ${formatNumber(activeParticipants.length)} members successfully!*\n` +
          `👤 *Executor:* @${senderNumber}`,
        mentions: [sender],
        edit: progressMsg.key
      });
      
      // Log the action
      console.log(`[TAGALL] Tagged ${activeParticipants.length} members in ${groupName} by ${senderNumber}`);
      
    } catch (error) {
      console.error('[TAGALL ERROR]', error);
      
      let errorMessage = '❌ *Failed to tag all members.*\n\n';
      
      if (error.message.includes('admin')) {
        errorMessage += '👮 Please make sure the bot has admin privileges.\n';
      } else if (error.message.includes('metadata')) {
        errorMessage += '📋 Failed to fetch group information.\n';
      } else if (error.message.includes('Forbidden')) {
        errorMessage += '🔐 Insufficient permissions to tag members.\n';
      } else {
        errorMessage += '🔧 An unexpected error occurred.\n';
      }
      
      errorMessage += '\n💡 *Tips:*\n' +
        '• Ensure the bot is an admin\n' +
        '• Check group permissions\n' +
        '• Try again in a moment';
      
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

// Alternative implementation with pagination for large groups
/*
module.exports = {
  name: 'tagall',
  alias: ['everyone', 'all'],
  category: 'group',
  desc: 'Tag all group members with pagination for large groups',
  admin: true,
  botAdmin: true,
  
  async run({ sock, m, args }) {
    try {
      const jid = m.key.remoteJid;
      
      if (!jid.endsWith('@g.us')) {
        return await m.reply('❌ This command can only be used inside groups.');
      }
      
      const metadata = await sock.groupMetadata(jid);
      const participants = metadata.participants;
      
      if (!participants || participants.length === 0) {
        return await m.reply('⚠️ No participants found in this group.');
      }
      
      const customMsg = args.length > 0 ? args.join(' ') : '📢 Attention everyone!';
      
      // Split into chunks for large groups (max 50 mentions per message)
      const chunkSize = 50;
      const chunks = [];
      
      for (let i = 0; i < participants.length; i += chunkSize) {
        chunks.push(participants.slice(i, i + chunkSize));
      }
      
      // Send initial message
      await m.reply(`📢 *Group Announcement*\n\n${customMsg}\n\nTagging ${participants.length} members in ${chunks.length} messages...`);
      
      // Send chunked messages
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const mentions = chunk.map(p => p.id);
        let listText = `👥 *Participants (${i + 1}/${chunks.length}):*\n\n`;
        
        chunk.forEach((p, index) => {
          const globalIndex = i * chunkSize + index + 1;
          listText += `${globalIndex}. @${p.id.split('@')[0]}\n`;
        });
        
        await sock.sendMessage(jid, {
          text: listText,
          mentions
        }, { quoted: m });
        
        // Small delay between messages to avoid rate limiting
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
    } catch (error) {
      console.error('[TAGALL ERROR]', error);
      await m.reply('❌ Failed to tag all members.');
    }
  }
};
*/