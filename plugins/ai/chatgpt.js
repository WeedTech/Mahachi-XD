const axios = require('axios');

module.exports = {
  command: ['ai', 'gpt', 'chatgpt'],
  aliases: ['ask', 'bot'],
  tags: ['ai'],
  help: ['ai <prompt>', 'gpt <your question>', 'ask <your question>'],
  description: 'Ask anything from ChatGPT',
  usage: '.ai What is the meaning of life?',
  cooldown: 5,
  ownerOnly: false,
  groupOnly: false,
  privateOnly: false,
  adminOnly: false,
  botAdmin: false,
  
  async run({ sock, m, text, args, command, isOwner, isGroup, sender }) {
    try {
      // Check if prompt is empty
      if (!text || text.trim().length < 2) {
        return await sock.sendMessage(m.chat, {
          text: `🧠 *Usage:* .${command} <your question>\n\nExample: .${command} who developed you?`
        }, { quoted: m });
      }
      
      // Notify user that the bot is thinking
      const waiting = await sock.sendMessage(m.chat, {
        text: '💭 *Thinking...*'
      }, { quoted: m });
      
      // Show typing indicator
      await sock.sendPresenceUpdate('composing', m.chat);
      
      // Fetch response from GPT-4o API (PrinceTech)
      const apiUrl = 'https://api.princetechn.com/api/ai/gpt4o';
      const apiKey = 'prince'; // Consider moving this to environment variables
      
      const response = await axios.get(apiUrl, {
        params: {
          apikey: apiKey,
          q: text.trim()
        },
        timeout: 30000, // 30 second timeout
        headers: {
          'User-Agent': 'Mahachi-XD-Bot/1.0'
        }
      });
      
      // Handle response
      const aiReply = response?.data?.response;
      
      if (!aiReply || aiReply.length === 0) {
        return await sock.sendMessage(m.chat, {
          text: '⚠️ No response from ChatGPT. Try again later.',
          edit: waiting.key
        });
      }
      
      // Format the final reply
      const finalReply = `🤖 *ChatGPT Reply:*\n\n${aiReply}\n\n💡 _Powered by Mahachi XD_`;
      
      // Edit "Thinking..." message with final AI reply
      await sock.sendMessage(m.chat, {
        text: finalReply,
        edit: waiting.key
      });
      
      // Log successful usage (optional)
      console.log(`[AI] User: ${sender} | Query: ${text.substring(0, 50)}...`);
      
    } catch (error) {
      console.error('[AI Error]', error);
      
      // Handle different types of errors
      let errorMessage = '❌ *Error while contacting ChatGPT.*\nPlease try again later.';
      
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        errorMessage = '⏰ *Request timed out.*\nPlease try again.';
      } else if (error.response) {
        // Server responded with error status
        const status = error.response.status;
        if (status === 429) {
          errorMessage = '⏳ *Rate limit exceeded.*\nPlease wait a moment and try again.';
        } else if (status >= 500) {
          errorMessage = '🔧 *Server error.*\nOur AI service is temporarily unavailable.';
        }
      } else if (error.request) {
        // Network error
        errorMessage = '🌐 *Network error.*\nPlease check your connection and try again.';
      }
      
      try {
        // Try to edit the waiting message
        await sock.sendMessage(m.chat, {
          text: errorMessage,
          edit: waiting?.key
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

// Alternative implementation with multiple AI providers
/*
module.exports = {
  command: ['ai', 'gpt', 'chatgpt'],
  aliases: ['ask', 'bot'],
  tags: ['ai'],
  help: ['ai <prompt>', 'gpt <your question>', 'ask <your question>'],
  description: 'Ask anything from various AI models',
  usage: '.ai What is the meaning of life?',
  cooldown: 5,
  
  async run({ sock, m, text, command }) {
    try {
      if (!text || text.trim().length < 2) {
        return await sock.sendMessage(m.chat, {
          text: `🧠 *Usage:* .${command} <your question>\n\nExample: .${command} who developed you?`
        }, { quoted: m });
      }
      
      const waiting = await sock.sendMessage(m.chat, {
        text: '💭 *Thinking...*'
      }, { quoted: m });
      
      await sock.sendPresenceUpdate('composing', m.chat);
      
      // Try multiple AI providers
      const providers = [
        {
          name: 'GPT-4o',
          url: 'https://api.princetechn.com/api/ai/gpt4o',
          apiKey: 'prince',
          enabled: true
        },
        {
          name: 'GPT-3.5',
          url: 'https://api.princetechn.com/api/ai/gpt3',
          apiKey: 'prince',
          enabled: false // Enable as needed
        }
      ];
      
      let aiReply = null;
      let usedProvider = '';
      
      // Try each provider until one works
      for (const provider of providers.filter(p => p.enabled)) {
        try {
          const response = await axios.get(provider.url, {
            params: {
              apikey: provider.apiKey,
              q: text.trim()
            },
            timeout: 15000
          });
          
          if (response?.data?.response) {
            aiReply = response.data.response;
            usedProvider = provider.name;
            break;
          }
        } catch (providerError) {
          console.log(`[AI] Provider ${provider.name} failed:`, providerError.message);
          continue;
        }
      }
      
      if (!aiReply) {
        return await sock.sendMessage(m.chat, {
          text: '⚠️ No response from any AI provider. Try again later.',
          edit: waiting.key
        });
      }
      
      const finalReply = `🤖 *${usedProvider} Reply:*\n\n${aiReply}\n\n💡 _Powered by Mahachi XD_`;
      
      await sock.sendMessage(m.chat, {
        text: finalReply,
        edit: waiting.key
      });
      
    } catch (error) {
      console.error('[AI Error]', error);
      
      let errorMessage = '❌ *Error while contacting AI.*\nPlease try again later.';
      
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        errorMessage = '⏰ *Request timed out.*\nPlease try again.';
      }
      
      try {
        await sock.sendMessage(m.chat, {
          text: errorMessage,
          edit: waiting?.key
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