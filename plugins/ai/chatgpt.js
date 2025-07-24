const axios = require('axios');

module.exports = {
  command: ['ai', 'gpt', 'chatgpt',],
  tags: ['ai'],
  help: ['ai <prompt>', 'gpt <your question>'],
  description: 'Ask anything from chatgpt',
  
  async run({ sock, m, text }) {
    try {
      // Check if prompt is empty
      if (!text || text.length < 2) {
        return m.reply('🧠 *Usage:* .ai who tf developed you🤔?');
      }
      
      // Notify user that the bot is thinking
      const waiting = await m.reply('💭 *Thinking...*');
      await sock.sendPresenceUpdate('composing', m.chat);
      
      // Fetch response from GPT-4o API (PrinceTech)
      const res = await axios.get(`https://api.princetechn.com/api/ai/gpt4o`, {
        params: {
          apikey: 'prince',
          q: text
        }
      });
      
      // Handle response
      const aiReply = res?.data?.response;
      if (!aiReply) {
        return m.reply('⚠️ No response from chatgpt. Try again later.');
      }
      
      const finalReply = `🤖 *Gpt Reply:*\n\n${aiReply}\n\nPowered by Mahachi Xd`;
      
      // Edit "Thinking..." message with final AI reply
      await sock.sendMessage(m.chat, { text: finalReply, edit: waiting.key }, { quoted: m });
    } catch (error) {
      console.error('[Gpt Error]', error);
      m.reply('❌ *Error while contacting GPT-4o.*\nPlease try again later.');
    }
  }
};