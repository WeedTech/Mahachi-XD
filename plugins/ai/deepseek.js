const axios = require('axios');

module.exports = {
  command: ['deep', 'seek', 'deepseek', 'ds'],
  aliases: ['deepai', 'dseek'],
  tags: ['ai'],
  help: ['deep <your question>', 'seek <ask something>', 'ds <query>'],
  description: 'Ask questions using DeepSeek-v3 AI model',
  usage: '.deep Explain quantum computing in simple terms',
  cooldown: 5,
  ownerOnly: false,
  groupOnly: false,
  privateOnly: false,
  adminOnly: false,
  botAdmin: false,
  
  async run({ sock, m, text, command, isOwner, isGroup, sender }) {
    try {
      // Fallback to quoted text if no direct text is used
      const prompt = text || m.quoted?.text;
      
      if (!prompt || prompt.trim().length < 2) {
        return await sock.sendMessage(m.chat, {
          text: `🧠 *Usage:* .${command} <your question>\n\nExample: .${command} Explain quantum computing in simple terms`
        }, { quoted: m });
      }
      
      // Check prompt length (prevent abuse)
      if (prompt.length > 1000) {
        return await sock.sendMessage(m.chat, {
          text: '❌ *Prompt too long.* Please keep your question under 1000 characters.'
        }, { quoted: m });
      }
      
      // Notify user that the bot is processing
      const thinkingMsg = await sock.sendMessage(m.chat, {
        text: '🤔 *Accessing DeepSeek AI...*'
      }, { quoted: m });
      
      // Show typing indicator
      await sock.sendPresenceUpdate('composing', m.chat);
      
      // Fetch response from DeepSeek API
      const apiUrl = 'https://api.princetechn.com/api/ai/deepseek-v3';
      const apiKey = 'prince'; // Consider moving to environment variables
      
      const response = await axios.get(apiUrl, {
        params: {
          apikey: apiKey,
          q: prompt.trim()
        },
        timeout: 30000, // 30 second timeout
        headers: {
          'User-Agent': 'Mahachi-XD-Bot/1.0',
          'Accept': 'application/json'
        }
      });
      
      const aiReply = response?.data?.response;
      
      if (!aiReply || aiReply.length === 0) {
        return await sock.sendMessage(m.chat, {
          text: '❌ *DeepSeek didn\'t return any answer.* Try rephrasing your question.',
          edit: thinkingMsg.key
        });
      }
      
      // Truncate very long responses
      let formattedReply = aiReply;
      if (aiReply.length > 2000) {
        formattedReply = aiReply.substring(0, 1997) + '...';
      }
      
      const replyMessage = `🧠 *DeepSeek-v3 Response:*\n\n${formattedReply}\n\n💡 _Powered by Mahachi-XD_`;
      
      await sock.sendMessage(m.chat, {
        text: replyMessage,
        edit: thinkingMsg.key
      }, { quoted: m });
      
      // Log successful usage
      console.log(`[DeepSeek] User: ${sender} | Query: ${prompt.substring(0, 50)}...`);
      
    } catch (err) {
      console.error('[DeepSeek ERROR]', err);
      
      // Handle different types of errors
      let errorMessage = '❌ *Error talking to DeepSeek AI.* Please try again later.';
      
      if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') {
        errorMessage = '⏰ *Request timed out.* The AI is taking too long to respond.';
      } else if (err.response) {
        const status = err.response.status;
        if (status === 429) {
          errorMessage = '⏳ *Rate limit exceeded.* Please wait before making another request.';
        } else if (status === 400) {
          errorMessage = '📝 *Invalid request.* Please check your question and try again.';
        } else if (status >= 500) {
          errorMessage = '🔧 *DeepSeek service is temporarily unavailable.* Please try again later.';
        }
      } else if (err.request) {
        errorMessage = '🌐 *Network error.* Please check your connection and try again.';
      }
      
      try {
        // Try to edit the thinking message
        await sock.sendMessage(m.chat, {
          text: errorMessage,
          edit: thinkingMsg?.key
        });
      } catch {
        // If editing fails, send a new message
        await sock.sendMessage(m.chat, {
          text: errorMessage
        }, { quoted: m });
      }
    }
  }
};

// Alternative implementation with retry logic
/*
module.exports = {
  command: ['deep', 'seek', 'deepseek', 'ds'],
  aliases: ['deepai', 'dseek'],
  tags: ['ai'],
  help: ['deep <your question>', 'seek <ask something>', 'ds <query>'],
  description: 'Ask questions using DeepSeek-v3 AI model',
  usage: '.deep Explain quantum computing in simple terms',
  cooldown: 5,
  
  async run({ sock, m, text, command }) {
    try {
      const prompt = text || m.quoted?.text;

      if (!prompt || prompt.trim().length < 2) {
        return await sock.sendMessage(m.chat, {
          text: `🧠 *Usage:* .${command} <your question>\n\nExample: .${command} Explain quantum computing in simple terms`
        }, { quoted: m });
      }
      
      const thinkingMsg = await sock.sendMessage(m.chat, {
        text: '🤔 *Accessing DeepSeek AI...*'
      }, { quoted: m });
      
      await sock.sendPresenceUpdate('composing', m.chat);

      // Retry logic
      const maxRetries = 2;
      let lastError;
      
      for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
        try {
          const response = await axios.get('https://api.princetechn.com/api/ai/deepseek-v3', {
            params: {
              apikey: 'prince',
              q: prompt.trim()
            },
            timeout: 20000,
            headers: {
              'User-Agent': 'Mahachi-XD-Bot/1.0'
            }
          });

          const aiReply = response?.data?.response;

          if (!aiReply || aiReply.length === 0) {
            throw new Error('Empty response from API');
          }

          let formattedReply = aiReply;
          if (aiReply.length > 2000) {
            formattedReply = aiReply.substring(0, 1997) + '...';
          }

          const replyMessage = `🧠 *DeepSeek-v3 Response:*\n\n${formattedReply}\n\n💡 _Powered by Mahachi-XD_`;

          return await sock.sendMessage(m.chat, {
            text: replyMessage,
            edit: thinkingMsg.key
          }, { quoted: m });
          
        } catch (attemptError) {
          lastError = attemptError;
          
          if (attempt <= maxRetries) {
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
            continue;
          }
          
          // All attempts failed
          throw lastError;
        }
      }
      
    } catch (err) {
      console.error('[DeepSeek ERROR]', err);
      
      let errorMessage = '❌ *Error talking to DeepSeek AI.* Please try again later.';
      
      if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') {
        errorMessage = '⏰ *Request timed out.* The AI is taking too long to respond.';
      } else if (err.response) {
        const status = err.response.status;
        if (status === 429) {
          errorMessage = '⏳ *Rate limit exceeded.* Please wait before making another request.';
        } else if (status >= 500) {
          errorMessage = '🔧 *DeepSeek service is temporarily unavailable.* Please try again later.';
        }
      }
      
      try {
        await sock.sendMessage(m.chat, {
          text: errorMessage,
          edit: thinkingMsg?.key
        });
      } catch {
        await sock.sendMessage(m.chat, {
          text: errorMessage
        }, { quoted: m });
      }
    }
  }
};
*/