const { formatDateTime } = require('../../lib/format');

module.exports = {
  name: 'opengc',
  alias: ['opengroup', 'unlockgc', 'unlockgroup'],
  category: 'group',
  desc: 'Open group chat to all members (disable admin-only mode)',
  usage: '.opengc',
  cooldown: 5,
  ownerOnly: false,
  groupOnly: true,
  privateOnly: false,
  adminOnly: true,
  botAdmin: true,
  
  async run({ sock, m, command, isOwner, isAdmin, isBotAdmin }) {
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
      
      // Check if group is already open
      let groupMetadata;
      try {
        groupMetadata = await sock.groupMetadata(jid);
      } catch (metaError) {
        throw new Error('Failed to fetch group metadata');
      }
      
      // Check current group settings
      const isGroupOpen = !groupMetadata.announce;
      
      if (isGroupOpen) {
        return await sock.sendMessage(m.chat, {
          text: '🔓 *Group is already open!*\n\n' +
            'All members can send messages in this group.'
        }, { quoted: m });
      }
      
      // Notify about the action
      const progressMsg = await sock.sendMessage(m.chat, {
        text: '🔓 *Opening group...*\n' +
          'Allowing all members to send messages...'
      }, { quoted: m });
      
      // Open the group (not_announcement mode)
      await sock.groupSettingUpdate(jid, 'not_announcement');
      
      // Get current time for logging
      const currentTime = formatDateTime(new Date());
      
      // Success message with detailed information
      const successMessage = `✅ *Group Opened Successfully!*\n\n` +
        `🔓 *Status:* Open (All members)\n` +
        `👤 *Opened by:* @${senderNumber}\n` +
        `⏰ *Time:* ${currentTime}\n\n` +
        `📢 *Note:* All group members can now send messages.`;
      
      await sock.sendMessage(m.chat, {
        text: successMessage,
        mentions: [sender],
        edit: progressMsg.key
      });
      
      // Log the action
      console.log(`[OPENGC] Group opened by ${senderNumber} in ${jid} at ${currentTime}`);
      
    } catch (error) {
      console.error('[OPENGC ERROR]', error);
      
      let errorMessage = '❌ *Failed to open the group.*\n\n';
      
      if (error.message.includes('admin')) {
        errorMessage += '👮 Please make sure the bot has admin privileges.\n';
      } else if (error.message.includes('metadata')) {
        errorMessage += '📋 Failed to fetch group information.\n';
      } else if (error.message.includes('Forbidden')) {
        errorMessage += '🔐 Insufficient permissions to open the group.\n';
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

// Alternative implementation with confirmation
/*
module.exports = {
  name: 'opengc',
  alias: ['opengroup', 'unlockgc'],
  category: 'group',
  desc: 'Open group chat with confirmation',
  usage: '.opengc',
  adminOnly: true,
  botAdmin: true,
  
  async run({ sock, m, args }) {
    try {
      const jid = m.key.remoteJid;
      
      if (!jid.endsWith('@g.us')) {
        return await m.reply('❌ This command can only be used inside groups.');
      }
      
      // Confirmation system
      const confirm = args[0]?.toLowerCase();
      
      if (confirm !== 'confirm') {
        return await m.reply(`⚠️ *Open Group Confirmation*\n\n` +
                           `This will allow all group members to send messages.\n\n` +
                           `To proceed, type: .opengc confirm`);
      }
      
      const progressMsg = await m.reply('🔓 Opening group...');
      
      // Open the group
      await sock.groupSettingUpdate(jid, 'not_announcement');
      
      await m.reply(`✅ *Group Opened Successfully!*\n\n` +
                   `All members can now send messages.`, 
                   progressMsg.key);
      
    } catch (error) {
      console.error('[OPENGC ERROR]', error);
      await m.reply('❌ Failed to open the group. Make sure the bot is an admin.');
    }
  }
};
*/