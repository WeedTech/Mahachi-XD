const axios = require('axios');
const { formatBytes, formatDuration } = require('../../lib/format');

module.exports = {
  command: ['play'],
  aliases: ['music', 'song', 'audio'],
  tags: ['download'],
  help: ['play <song name>', 'music <track title>'],
  description: 'Search and download songs as MP3 audio files',
  usage: '.play Shape of You by Ed Sheeran',
  cooldown: 15,
  ownerOnly: false,
  groupOnly: false,
  privateOnly: false,
  adminOnly: false,
  botAdmin: false,
  
  async run({ sock, m, text, command, isOwner }) {
    try {
      if (!text || text.trim().length === 0) {
        return await sock.sendMessage(m.chat, {
          text: `🎵 *Usage:* .${command} <song name>\n\n` +
                `📝 *Example:* .${command} Shape of You by Ed Sheeran\n` +
                `💡 *Tip:* Be specific with artist names for better results`
        }, { quoted: m });
      }
      
      // Check for potentially problematic queries
      if (text.length > 100) {
        return await sock.sendMessage(m.chat, {
          text: '❌ Search query too long. Please keep it under 100 characters.'
        }, { quoted: m });
      }
      
      const searchQuery = text.trim();
      
      // Notify user about search progress
      const progressMsg = await sock.sendMessage(m.chat, {
        text: `🔍 *Searching for:* "${searchQuery}"\n` +
              `⏳ Please wait, this may take a moment...`
      }, { quoted: m });
      
      // Show typing indicator
      await sock.sendPresenceUpdate('composing', m.chat);
      
      // API call to fetch song data
      const apiUrl = 'https://api.princetechn.com/api/dl/playmp3';
      const apiKey = 'prince'; // Consider moving to environment variables
      
      const response = await axios.get(apiUrl, {
        params: {
          apikey: apiKey,
          text: searchQuery
        },
        timeout: 45000, // 45 second timeout
        headers: {
          'User-Agent': 'Mahachi-XD-Bot/1.0 (https://github.com/WeedTech/Mahachi-XD)',
          'Accept': 'application/json'
        }
      });
      
      const data = response.data;
      
      // Validate API response
      if (!data || !data.result) {
        return await sock.sendMessage(m.chat, {
          text: '❌ Invalid response from music API.\n' +
                'Please try again later.',
          edit: progressMsg.key
        });
      }
      
      if (!data.result.url || !data.result.title) {
        return await sock.sendMessage(m.chat, {
          text: `❌ No results found for: "${searchQuery}"\n` +
                `💡 Try: .${command} Artist - Song Title\n` +
                `📝 Example: .${command} Ed Sheeran - Shape of You`,
          edit: progressMsg.key
        });
      }
      
      const { title, url, thumbnail, duration, size, views, author } = data.result;
      
      // Validate required fields
      if (!url) {
        throw new Error('Download URL not provided by API');
      }
      
      // Format information
      const formattedDuration = duration ? formatDuration(parseInt(duration)) : 'Unknown';
      const formattedSize = size ? size : 'Unknown';
      const formattedViews = views ? `${parseInt(views).toLocaleString()} views` : 'Unknown views';
      
      // Create detailed caption
      const caption = `🎵 *Now Playing:*\n\n` +
                     `📌 *Title:* ${title || 'Unknown'}\n` +
                     `${author ? `👤 *Artist:* ${author}\n` : ''}` +
                     `⏱️ *Duration:* ${formattedDuration}\n` +
                     `📦 *Size:* ${formattedSize}\n` +
                     `${views ? `👁️ *Views:* ${formattedViews}\n` : ''}` +
                     `📥 *Source:* YouTube\n` +
                     `🔗 *Status:* Downloading...\n\n` +
                     `💡 _Powered by Mahachi-XD_`;
      
      // Update progress message with song info
      await sock.sendMessage(m.chat, {
        text: caption,
        edit: progressMsg.key
      });
      
      // Download thumbnail if available
      if (thumbnail) {
        try {
          await sock.sendMessage(m.chat, {
            image: { url: thumbnail },
            caption: `🖼️ *Album Art*`
          }, { quoted: m });
        } catch (thumbnailError) {
          console.log('[PLAY] Failed to send thumbnail:', thumbnailError.message);
        }
      }
      
      // Update status to downloading
      await sock.sendMessage(m.chat, {
        text: caption.replace('🔗 *Status:* Downloading...', '🔗 *Status:* Downloading audio...'),
        edit: progressMsg.key
      });
      
      // Download the MP3 as audio buffer
      const audioResponse = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 60000, // 60 second timeout for audio download
        headers: {
          'User-Agent': 'Mahachi-XD-Bot/1.0'
        }
      });
      
      const audioBuffer = audioResponse.data;
      
      // Validate audio buffer
      if (!audioBuffer || audioBuffer.length === 0) {
        throw new Error('Empty audio file received');
      }
      
      // Check file size (prevent downloading extremely large files)
      const fileSize = audioBuffer.length;
      if (fileSize > 50 * 1024 * 1024) { // 50MB limit
        return await sock.sendMessage(m.chat, {
          text: `❌ Audio file too large (${formatBytes(fileSize)}).\n` +
                `📦 Maximum allowed size: 50MB\n` +
                `💡 Try searching for a shorter version.`,
          edit: progressMsg.key
        });
      }
      
      // Update status to sending
      await sock.sendMessage(m.chat, {
        text: caption.replace('🔗 *Status:* Downloading audio...', '🔗 *Status:* Sending audio...'),
        edit: progressMsg.key
      });
      
      // Send the MP3 as audio
      await sock.sendMessage(m.chat, {
        audio: audioBuffer,
        mimetype: 'audio/mp4',
        ptt: false,
        fileName: `${title || 'song'}.mp3`,
        caption: `🎵 *${title || 'Song'}*\n` +
                 `⏱️ ${formattedDuration}\n` +
                 `📦 ${formattedSize}`
      }, { 
        quoted: m 
      });
      
      // Final success message
      await sock.sendMessage(m.chat, {
        text: `✅ *Download Complete!*\n\n` +
              `🎵 *${title || 'Song'}*\n` +
              `⏱️ Duration: ${formattedDuration}\n` +
              `📦 Size: ${formatBytes(fileSize)}\n\n` +
              `💡 _Enjoy your music!_`,
        edit: progressMsg.key
      });
      
      // Log successful download
      console.log(`[PLAY] Successfully downloaded: ${title} (${formatBytes(fileSize)})`);
      
    } catch (err) {
      console.error('[PLAY ERROR]', err);
      
      let errorMessage = '❌ Failed to download the song.\n';
      
      if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') {
        errorMessage += '⏰ Request timed out. The file might be too large.\n';
      } else if (err.response) {
        const status = err.response.status;
        if (status === 404) {
          errorMessage += '❓ Song not found. Try a different search term.\n';
        } else if (status === 429) {
          errorMessage += '⏳ Rate limit exceeded. Please try again later.\n';
        } else if (status >= 500) {
          errorMessage += '🔧 Music service is temporarily unavailable.\n';
        }
      } else if (err.message.includes('large')) {
        errorMessage += '📦 Audio file is too large to download.\n';
      } else if (err.message.includes('empty')) {
        errorMessage += '🔇 No audio available for this track.\n';
      }
      
      errorMessage += '\n💡 *Tips:*\n' +
                     '• Be more specific with artist names\n' +
                     '• Try different search terms\n' +
                     '• Check if the song name is spelled correctly';
      
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

// Alternative implementation with multiple providers
/*
module.exports = {
  command: ['play'],
  aliases: ['music', 'song'],
  tags: ['download'],
  help: ['play <song name>'],
  description: 'Search and download songs from multiple sources',
  usage: '.play Shape of You',
  cooldown: 15,
  
  async run({ sock, m, text, command }) {
    try {
      if (!text || text.trim().length === 0) {
        return await m.reply(`🎵 *Usage:* .${command} <song name>\n\nExample: .${command} Shape of You`);
      }
      
      const searchQuery = text.trim();
      const progressMsg = await m.reply(`🔍 Searching for: "${searchQuery}"\n⏳ Please wait...`);
      await sock.sendPresenceUpdate('composing', m.chat);
      
      // Multiple API providers
      const providers = [
        {
          name: 'PrinceTech',
          url: 'https://api.princetechn.com/api/dl/playmp3',
          apiKey: 'prince',
          enabled: true
        },
        {
          name: 'Alternative',
          url: 'https://api.example.com/music/search',
          apiKey: 'example',
          enabled: false // Enable as needed
        }
      ];
      
      let songData = null;
      let usedProvider = '';
      
      // Try each provider
      for (const provider of providers.filter(p => p.enabled)) {
        try {
          const response = await axios.get(provider.url, {
            params: {
              apikey: provider.apiKey,
              text: searchQuery
            },
            timeout: 30000
          });
          
          if (response.data?.result?.url) {
            songData = response.data.result;
            usedProvider = provider.name;
            break;
          }
        } catch (providerError) {
          console.log(`[PLAY] Provider ${provider.name} failed:`, providerError.message);
          continue;
        }
      }
      
      if (!songData || !songData.url) {
        return await m.reply(`❌ No results found for: "${searchQuery}"\nTry being more specific.`, progressMsg.key);
      }
      
      const { title, url, thumbnail, duration, size } = songData;
      
      // Send info message
      const infoMsg = `🎵 *${title}*\n` +
                     `⏱️ ${duration || 'Unknown duration'}\n` +
                     `📦 ${size || 'Unknown size'}\n` +
                     `📥 Source: ${usedProvider}\n\n` +
                     `📥 Downloading...`;
      
      await m.reply(infoMsg, progressMsg.key);
      
      // Download thumbnail
      if (thumbnail) {
        await sock.sendMessage(m.chat, {
          image: { url: thumbnail },
          caption: '🖼️ Album Art'
        }, { quoted: m });
      }
      
      // Download audio
      const audioResponse = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 45000
      });
      
      const audioBuffer = audioResponse.data;
      
      // Send audio
      await sock.sendMessage(m.chat, {
        audio: audioBuffer,
        mimetype: 'audio/mp4',
        ptt: false,
        fileName: `${title || 'song'}.mp3`
      }, { quoted: m });
      
      // Success message
      await m.reply(`✅ Download complete!\n🎵 ${title}`, progressMsg.key);
      
    } catch (err) {
      console.error('[PLAY ERROR]', err);
      
      let errorMsg = '❌ Failed to download song.\n';
      
      if (err.code === 'ECONNABORTED') {
        errorMsg += 'Timeout. File too large.\n';
      } else if (err.response?.status === 404) {
        errorMsg += 'Song not found.\n';
      } else {
        errorMsg += `${err.message}\n`;
      }
      
      errorMsg += 'Try a different search term.';
      
      try {
        await m.reply(errorMsg, progressMsg?.key);
      } catch {
        await m.reply(errorMsg);
      }
    }
  }
};
*/