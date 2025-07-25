const { formatDateTime } = require('../../lib/format');

module.exports = {
  name: 'closegc',
  alias: ['closegroup', 'lockgc', 'lockgroup'],
  category: 'group',
  desc: 'Close group chat to only admins (enable admin-only mode)',
  usage: '.closegc',
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
      
      // Check if group is already closed
      let groupMetadata;
      try {
        groupMetadata = await sock.groupMetadata(jid);
      } catch (metaError) {
        throw new Error('Failed to fetch group metadata');
      }
      
      // Check current group settings
      const isGroupClosed = groupMetadata.announce;
      
      if (isGroupClosed) {
        return await sock.sendMessage(m.chat, {
          text: '🔒 *Group is already closed!*\n\n' +
            'Only admins can send messages in this group.'
        }, { quoted: m });
      }
      
      // Notify about the action
      const progressMsg = await sock.sendMessage(m.chat, {
        text: '🔐 *Closing group...*\n' +
          'Restricting message permissions to admins only...'
      }, { quoted: m });
      
      // Close the group (announcement mode)
      await sock.groupSettingUpdate(jid, 'announcement');
      
      // Get current time for logging
      const currentTime = formatDateTime(new Date());
      
      // Success message with detailed information
      const successMessage = `✅ *Group Closed Successfully!*\n\n` +
        `🔐 *Status:* Closed (Admins only)\n` +
        `👤 *Closed by:* @${senderNumber}\n` +
        `⏰ *Time:* ${currentTime}\n\n` +
        `📢 *Note:* Only group admins can now send messages.`;
      
      await sock.sendMessage(m.chat, {
        text: successMessage,
        mentions: [sender],
        edit: progressMsg.key
      });
      
      // Log the action
      console.log(`[CLOSEGC] Group closed by ${senderNumber} in ${jid} at ${currentTime}`);
      
    } catch (error) {
      console.error('[CLOSEGC ERROR]', error);
      
      let errorMessage = '❌ *Failed to close the group.*\n\n';
      
      if (error.message.includes('admin')) {
        errorMessage += '👮 Please make sure the bot has admin privileges.\n';
      } else if (error.message.includes('metadata')) {
        errorMessage += '📋 Failed to fetch group information.\n';
      } else if (error.message.includes('Forbidden')) {
        errorMessage += '🔐 Insufficient permissions to close the group.\n';
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
  name: 'closegc',
  alias: ['closegroup', 'lockgc', 'lockgroup'],
  category: 'group',
  desc: 'Close group chat with confirmation',
  usage: '.closegc',
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
        return await m.reply(`⚠️ *Close Group Confirmation*\n\n` +
                           `This will restrict the group to admin-only messaging.\n\n` +
                           `To proceed, type: .closegc confirm`);
      }
      
      const progressMsg = await m.reply('🔐 Closing group...');
      
      // Close the group
      await sock.groupSettingUpdate(jid, 'announcement');
      
      await m.reply(`✅ *Group Closed Successfully!*\n\n` +
                   `Only admins can now send messages.`, 
                   progressMsg.key);
      
    } catch (error) {
      console.error('[CLOSEGC ERROR]', error);
      await m.reply('❌ Failed to close the group. Make sure the bot is an admin.');
    }
  }
};
*/