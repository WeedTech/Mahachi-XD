const axios = require('axios');

module.exports = {
  command: ['deep', 'seek', 'deepseek', 'ds'],
  tags: ['ai'],
  help: ['deep <your question>', 'seek <ask something>'],
  description: 'Ask DeepSeek-v3',

  async run({ sock, m, text }) {
    try {
      // Fallback to quoted text if no direct text is used
      const prompt = text || m.quoted?.text;

      if (!prompt || prompt.trim().length < 2) {
        return m.reply('🧠 *Usage:* .deep What is Quantum Physics?');
      }

      const thinkingMsg = await m.reply('🤔 *Accessing DeepSeek AI...*');
      await sock.sendPresenceUpdate('composing', m.chat);

      const res = await axios.get(`https://api.princetechn.com/api/ai/deepseek-v3`, {
        params: {
          apikey: 'prince',
          q: prompt
        }
      });

      const aiReply = res?.data?.response;

      if (!aiReply) {
        return m.reply('❌ *DeepSeek didn\'t return any answer.* Try again.');
      }

      const replyMessage = `🧠 *DeepSeek-v3 says:*\n\n${aiReply}\n\nPowered by Mahachi-XD`;

      await sock.sendMessage(m.chat, { text: replyMessage, edit: thinkingMsg.key }, { quoted: m });

    } catch (err) {
      console.error('[DeepSeek ERROR]', err);
      m.reply('❌ *Error talking to DeepSeek AI.* Please try again later.');
    }
  }
};