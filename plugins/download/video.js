const axios = require('axios');
const { formatBytes, formatDuration } = require('../../lib/format');

module.exports = {
  command: ['video', 'ytv', 'ytmp4'],
  aliases: ['mp4', 'ytvideo', 'download'],
  tags: ['download'],
  help: ['video <title or song name>', 'ytv <search query>', 'ytmp4 <video title>'],
  description: 'Search and download YouTube videos as MP4 files',
  usage: '.video Alone by Alan Walker',
  cooldown: 20,
  ownerOnly: false,
  groupOnly: false,
  privateOnly: false,
  adminOnly: false,
  botAdmin: false,
  
  async run({ sock, m, text, command }) {
    try {
      if (!text || text.trim().length === 0) {
        return await sock.sendMessage(m.chat, {
          text: `🎬 *Usage:* .${command} <video title>\n\n` +
                `📝 *Example:* .${command} Alone by Alan Walker\n` +
                `💡 *Tip:* Be specific with titles for better results`
        }, { quoted: m });
      }
      
      // Check for potentially problematic queries
      if (text.length > 150) {
        return await sock.sendMessage(m.chat, {
          text: '❌ Search query too long. Please keep it under 150 characters.'
        }, { quoted: m });
      }
      
      const searchQuery = text.trim();
      
      // Notify user about search progress
      const progressMsg = await sock.sendMessage(m.chat, {
        text: `🔍 *Searching for video:* "${searchQuery}"\n` +
              `⏳ Please wait, this may take a moment...`
      }, { quoted: m });
      
      // Show typing indicator
      await sock.sendPresenceUpdate('composing', m.chat);
      
      // API call to fetch video data
      const apiUrl = 'https://api.princetechn.com/api/dl/playmp4';
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
          text: '❌ Invalid response from video API.\n' +
                'Please try again later.',
          edit: progressMsg.key
        });
      }
      
      if (!data.result.url || !data.result.title) {
        return await sock.sendMessage(m.chat, {
          text: `❌ No videos found for: "${searchQuery}"\n` +
                `💡 Try: .${command} Artist - Video Title\n` +
                `📝 Example: .${command} Alan Walker - Alone Official`,
          edit: progressMsg.key
        });
      }
      
      const { title, url, duration, size, thumbnail, views, author } = data.result;
      
      // Validate required fields
      if (!url) {
        throw new Error('Download URL not provided by API');
      }
      
      // Format information
      const formattedDuration = duration ? formatDuration(parseInt(duration)) : 'Unknown';
      const formattedSize = size ? size : 'Unknown';
      const formattedViews = views ? `${parseInt(views).toLocaleString()} views` : 'Unknown views';
      
      // Create detailed caption
      const caption = `🎬 *Video Found:*\n\n` +
                     `📌 *Title:* ${title || 'Unknown'}\n` +
                     `${author ? `👤 *Channel:* ${author}\n` : ''}` +
                     `⏱️ *Duration:* ${formattedDuration}\n` +
                     `📦 *Size:* ${formattedSize}\n` +
                     `${views ? `👁️ *Views:* ${formattedViews}\n` : ''}` +
                     `📥 *Source:* YouTube\n` +
                     `🔗 *Status:* Downloading...\n\n` +
                     `💡 _Powered by Mahachi-XD_`;
      
      // Update progress message with video info
      await sock.sendMessage(m.chat, {
        text: caption,
        edit: progressMsg.key
      });
      
      // Download thumbnail if available
      if (thumbnail) {
        try {
          await sock.sendMessage(m.chat, {
            image: { url: thumbnail },
            caption: `🖼️ *Thumbnail*`
          }, { quoted: m });
        } catch (thumbnailError) {
          console.log('[VIDEO] Failed to send thumbnail:', thumbnailError.message);
        }
      }
      
      // Update status to downloading
      await sock.sendMessage(m.chat, {
        text: caption.replace('🔗 *Status:* Downloading...', '🔗 *Status:* Downloading video...'),
        edit: progressMsg.key
      });
      
      // Download the MP4 as video buffer
      const videoResponse = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 90000, // 90 second timeout for video download
        headers: {
          'User-Agent': 'Mahachi-XD-Bot/1.0'
        }
      });
      
      const videoBuffer = videoResponse.data;
      
      // Validate video buffer
      if (!videoBuffer || videoBuffer.length === 0) {
        throw new Error('Empty video file received');
      }
      
      // Check file size (prevent downloading extremely large files)
      const fileSize = videoBuffer.length;
      if (fileSize > 100 * 1024 * 1024) { // 100MB limit
        return await sock.sendMessage(m.chat, {
          text: `❌ Video file too large (${formatBytes(fileSize)}).\n` +
                `📦 Maximum allowed size: 100MB\n` +
                `💡 Try searching for a shorter video.`,
          edit: progressMsg.key
        });
      }
      
      // Update status to sending
      await sock.sendMessage(m.chat, {
        text: caption.replace('🔗 *Status:* Downloading video...', '🔗 *Status:* Sending video...'),
        edit: progressMsg.key
      });
      
      // Send the MP4 as video
      await sock.sendMessage(m.chat, {
        video: videoBuffer,
        mimetype: 'video/mp4',
        caption: `🎬 *${title || 'Video'}*\n` +
                 `⏱️ ${formattedDuration}\n` +
                 `📦 ${formatBytes(fileSize)}`
      }, { 
        quoted: m 
      });
      
      // Final success message
      await sock.sendMessage(m.chat, {
        text: `✅ *Download Complete!*\n\n` +
              `🎬 *${title || 'Video'}*\n` +
              `⏱️ Duration: ${formattedDuration}\n` +
              `📦 Size: ${formatBytes(fileSize)}\n\n` +
              `💡 _Enjoy your video!_`,
        edit: progressMsg.key
      });
      
      // Log successful download
      console.log(`[VIDEO] Successfully downloaded: ${title} (${formatBytes(fileSize)})`);
      
    } catch (err) {
      console.error('[VIDEO DOWNLOAD ERROR]', err);
      
      let errorMessage = '❌ Failed to download the video.\n';
      
      if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') {
        errorMessage += '⏰ Request timed out. The file might be too large.\n';
      } else if (err.response) {
        const status = err.response.status;
        if (status === 404) {
          errorMessage += '❓ Video not found. Try a different search term.\n';
        } else if (status === 429) {
          errorMessage += '⏳ Rate limit exceeded. Please try again later.\n';
        } else if (status >= 500) {
          errorMessage += '🔧 Video service is temporarily unavailable.\n';
        }
      } else if (err.message.includes('large')) {
        errorMessage += '📦 Video file is too large to download.\n';
      } else if (err.message.includes('empty')) {
        errorMessage += '🔇 No video available for this content.\n';
      }
      
      errorMessage += '\n💡 *Tips:*\n' +
                     '• Be more specific with video titles\n' +
                     '• Try different search terms\n' +
                     '• Check if the title is spelled correctly';
      
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

// Alternative implementation with quality options
/*
module.exports = {
  command: ['video', 'ytv', 'ytmp4'],
  aliases: ['mp4', 'ytvideo'],
  tags: ['download'],
  help: ['video <title>', 'ytv <query>'],
  description: 'Download YouTube videos with quality options',
  usage: '.video Alone by Alan Walker',
  cooldown: 20,
  
  async run({ sock, m, text, command }) {
    try {
      if (!text || text.trim().length === 0) {
        return await m.reply(`🎬 *Usage:* .${command} <video title>\n\nExample: .${command} Alone by Alan Walker`);
      }
      
      const searchQuery = text.trim();
      const progressMsg = await m.reply(`🔍 Searching: "${searchQuery}"\n⏳ Please wait...`);
      await sock.sendPresenceUpdate('composing', m.chat);
      
      // Fetch video info with multiple quality options
      const response = await axios.get('https://api.princetechn.com/api/dl/playmp4', {
        params: {
          apikey: 'prince',
          text: searchQuery
        },
        timeout: 45000
      });
      
      const data = response.data;
      
      if (!data || !data.result || !data.result.url) {
        return await m.reply(`❌ No videos found for: "${searchQuery}"\nTry being more specific.`, progressMsg.key);
      }
      
      const { title, url, duration, size, thumbnail } = data.result;
      
      // Send video info
      const infoMsg = `🎬 *${title}*\n` +
                     `⏱️ Duration: ${duration || 'Unknown'}\n` +
                     `📦 Size: ${size || 'Unknown'}\n` +
                     `📥 Source: YouTube\n\n` +
                     `📥 Downloading video...`;
      
      await m.reply(infoMsg, progressMsg.key);
      
      // Download thumbnail
      if (thumbnail) {
        await sock.sendMessage(m.chat, {
          image: { url: thumbnail },
          caption: '🖼️ Thumbnail'
        }, { quoted: m });
      }
      
      // Download video
      const videoResponse = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 90000
      });
      
      const videoBuffer = videoResponse.data;
      
      // Validate and check size
      if (!videoBuffer || videoBuffer.length === 0) {
        throw new Error('Empty video file');
      }
      
      const fileSize = videoBuffer.length;
      if (fileSize > 100 * 1024 * 1024) {
        return await m.reply(`❌ Video too large (${formatBytes(fileSize)}). Max: 100MB`, progressMsg.key);
      }
      
      // Send video
      await sock.sendMessage(m.chat, {
        video: videoBuffer,
        mimetype: 'video/mp4',
        caption: `🎬 ${title}\n⏱️ ${duration || 'Unknown'}`
      }, { quoted: m });
      
      // Success message
      await m.reply(`✅ Download complete!\n🎬 ${title}`, progressMsg.key);
      
    } catch (err) {
      console.error('[VIDEO ERROR]', err);
      
      let errorMsg = '❌ Failed to download video.\n';
      
      if (err.code === 'ECONNABORTED') {
        errorMsg += 'Timeout. File too large.\n';
      } else if (err.response?.status === 404) {
        errorMsg += 'Video not found.\n';
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