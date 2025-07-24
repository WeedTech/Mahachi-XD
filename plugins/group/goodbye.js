module.exports = {
  name: 'goodbye',
  category: 'group',
  desc: 'goobye message, you wont ecen think about leaving the group😂',
  
  async onParticipantRemoved({ sock, jid, participants }) {
    try {
      const metadata = await sock.groupMetadata(jid);
      const groupName = metadata.subject;
      
      for (const user of participants) {
        const userId = user.split('@')[0];
        
        const insultList = [
          `@${userId} just left the group. Damn, we didn’t know trash could walk.`,
          `One less brain cell in the chat. Bye @${userId}.`,
          `@${userId} left. Finally, the air smells better.`,
          `Peace out @${userId}. Try not to trip over your own ego on the way out.`,
          `@${userId} is gone... and not a single tear was shed.`,
          `The circus just lost a clown. Bye.`,
          `And just like that, the group’s IQ doubled.`,
          `Another L for the streets. Bye fool.`,
          `@${userId} left like their dad – without saying a word.`,
          `@${userId} dipped. Don’t come back without personality.`,
          `Lost a member, gained some peace.`,
          `@${userId} finally rage quit. Better late than never.`,
          `They left the group... and took the cringe with them.`,
          `@${userId} has left. Time to celebrate 🎉`,
          `That's one less disappointment in the group.`,
          `Ding dong the idiot's gone.`,
          `Bot detected lack of contribution from @${userId}, automatic kick successful 😎`,
          `He/she left before we could roast them. Coward.`,
          `You know it’s a good day when clowns take the exit.`,
          `Hope you find a group that matches your energy. Maybe a trash can?`,
          `Left the group? Even the group didn’t notice you.`,
        ];
        
        const insult = insultList[Math.floor(Math.random() * insultList.length)];
        
        await sock.sendMessage(jid, {
          text: `${insult}\n\n☠️ *Powered by WEED x IceFlowTech*`
        });
      }
    } catch (err) {
      console.error('❌ goodbye.js error:', err);
    }
  }
};