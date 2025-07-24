const axios = require('axios');

module.exports = {
  command: ['video', 'ytv', 'ytmp4'],
  tags: ['download'],
  help: ['video <title or song name>'],
  description: 'Search and download video from YouTube as MP4',
  
  async run({ sock, m, text }) {
    try {
      if (!text) return m.reply('🎬 *Usage:* .video alone by alan walker');
      
      await m.reply(`🔍 Searching video for: *${text}*`);
      await sock.sendPresenceUpdate('composing', m.chat);
      
      const api = `https://api.princetechn.com/api/dl/playmp4?apikey=prince&text=${encodeURIComponent(text)}`;
      const res = await axios.get(api);
      const data = res.data;
      
      if (!data || !data.result || !data.result.url) {
        return m.reply('❌ No video found. Try using a more specific title.');
      }
      
      const { title, url, duration, size, thumbnail } = data.result;
      
      const caption = `
🎬 *Title:* ${title}
⏱️ *Duration:* ${duration}
📦 *Size:* ${size}
📥 *Source:* YouTube
      `.trim();
      
      // Optional thumbnail preview
      await sock.sendMessage(m.chat, {
        image: { url: thumbnail },
        caption
      }, { quoted: m });
      
      // Download and send the video
      const videoBuffer = await axios.get(url, { responseType: 'arraybuffer' });
      
      await sock.sendMessage(m.chat, {
        video: videoBuffer.data,
        mimetype: 'video/mp4',
        caption: `🎬 ${title}`
      }, { quoted: m });
      
    } catch (err) {
      console.error('[VIDEO DOWNLOAD ERROR]', err);
      m.reply('❌ Failed to fetch video. Try again later.');
    }
  }
};