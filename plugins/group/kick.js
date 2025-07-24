module.exports = {
  name: 'kick',
  alias: ['ban', 'remove'],
  category: 'group',
  desc: 'Kick a user from the group by mention or reply',
  admin: true,
  botAdmin: true,
  
  async run({ sock, m, text, participants }) {
    const groupId = m.chat;
    
    if (!groupId.endsWith('@g.us')) {
      return m.reply('❌ This command can only be used in group chats.');
    }
    
    const sender = m.sender;
    const isBotAdmin = participants.find(p => p.id === sock.user.id)?.admin;
    const isSenderAdmin = participants.find(p => p.id === sender)?.admin;
    
    if (!isSenderAdmin) return m.reply('❌ You must be an *admin* to use this command.');
    if (!isBotAdmin) return m.reply('❌ I need to be *admin* to kick members.');
    
    let usersToKick = [];
    
    // 1. If user replied to someone
    if (m.quoted) {
      usersToKick.push(m.quoted.sender);
    }
    
    // 2. If tagged someone
    if (m.mentionedJid?.length) {
      usersToKick = [...usersToKick, ...m.mentionedJid];
    }
    
    if (usersToKick.length === 0) {
      return m.reply('❌ Tag a user or reply to their message to kick.');
    }
    
    for (const user of usersToKick) {
      if (participants.find(p => p.id === user)?.admin) {
        m.reply(`❌ Cannot kick @${user.split('@')[0]} — they're an admin.`);
        continue;
      }
      
      try {
        await sock.groupParticipantsUpdate(groupId, [user], 'remove');
        await sock.sendMessage(groupId, {
          text: `👢 @${user.split('@')[0]} has been *kicked* from the group.`,
          mentions: [user]
        });
      } catch (err) {
        console.error(`❌ Failed to kick ${user}:`, err);
        m.reply(`❌ Failed to kick @${user.split('@')[0]}.`);
      }
    }
  }
};