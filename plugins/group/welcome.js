module.exports = {
  name: 'welcome',
  category: 'group',
  desc: 'Welcomes new users to any groups  with a custom message',
  //by Jaden x Weed
  
  async onParticipantAdded({ sock, jid, participants }) {
    try {
      // Get group metadata
      const metadata = await sock.groupMetadata(jid);
      const groupName = metadata.subject;
      
      for (const user of participants) {
        const pp = await sock.profilePictureUrl(user, 'image').catch(() => 'https://i.ibb.co/Rz9fGZq/no-profile-picture.png');
        const name = user.split('@')[0];
        
        const welcomeText = `
👋 Hi @${name}, welcome to *${groupName}* 🎉

We're glad to have you here! Feel free to introduce yourself, check out the rules, and join the fun.

📌 Make sure to respect others and keep this community clean, fun, and helpful for everyone.

If you have any questions or need assistance, tag any admin or type *menu* to explore my features.

🔒 Stay safe, avoid suspicious links, and have a blast!

⚡ *Powered by* _WEED_ x _IceFlowTech_
        `.trim();
        
        await sock.sendMessage(jid, {
          image: { url: pp },
          caption: welcomeText,
          mentions: [user]
        });
      }
    } catch (err) {
      console.error('❌ welcome.js error:', err);
    }
  }
};