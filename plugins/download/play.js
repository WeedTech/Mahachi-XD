const axios = require('axios');

module.exports = {
  command: ['play'],
  tags: ['download'],
  help: ['play <song name>'],
  description: 'Search and download a song as MP3',
  
  async run({ sock, m, text }) {
    try {
      if (!text) return m.reply('🎵 *Usage:* .play calm down by selena');
      
      await m.reply(`🔍 Searching for: *${text}*`);
      await sock.sendPresenceUpdate('composing', m.chat);
      
      // API call to fetch song data
      const api = `https://api.princetechn.com/api/dl/playmp3?apikey=prince&text=${encodeURIComponent(text)}`;
      const res = await axios.get(api);
      const data = res.data;
      
      if (!data || !data.result || !data.result.url) {
        return m.reply('❌ No result found. Try a different song title.');
      }
      
      const { title, url, thumbnail, duration, size } = data.result;
      
      const caption = `
🎵 *Title:* ${title}
⏱️ *Duration:* ${duration}
📦 *Size:* ${size}
📥 *Source:* YouTube
      `.trim();
      
      // Send thumbnail (optional)
      await sock.sendMessage(m.chat, {
        image: { url: thumbnail },
        caption
      }, { quoted: m });
      
      // Download and send the MP3 as audio
      const audioBuffer = await axios.get(url, { responseType: 'arraybuffer' });
      
      await sock.sendMessage(m.chat, {
        audio: audioBuffer.data,
        mimetype: 'audio/mp4',
        ptt: false
      }, { quoted: m });
      
    } catch (err) {
      console.error('[PLAY ERROR]', err);
      m.reply('❌ Failed to play the song. Try again later.');
    }
  }
};