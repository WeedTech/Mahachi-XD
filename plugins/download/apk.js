const axios = require('axios');
const { default: fileType } = require('file-type');

module.exports = {
  command: ['apk'],
  tags: ['download'],
  help: ['apk <app name>'],
  description: 'Download APK by searching app name on apkfab.com',
  
  async run({ sock, m, text }) {
    try {
      if (!text) return m.reply('📦 *Usage:* .apk whatsapp');
      
      await m.reply(`🔍 Searching APK for: *${text}*`);
      await sock.sendPresenceUpdate('composing', m.chat);
      
      // Search API (you said this supports query, not link)
      const searchURL = `https://apis-keith.vercel.app/download/apkfab?url=${encodeURIComponent(text)}`;
      const { data } = await axios.get(searchURL);
      
      if (!data || !data.downloadUrl) {
        return m.reply('❌ No APK found for that app name. Try a more specific name.');
      }
      
      const apkUrl = data.downloadUrl;
      let apkName = data.name?.replace(/[^\w\s]/gi, '').trim() || 'App';
      apkName = apkName + '.apk';
      
      const apkBuffer = await axios.get(apkUrl, { responseType: 'arraybuffer' });
      const type = await fileType.fromBuffer(apkBuffer.data);
      
      if (!type || type.ext !== 'apk') {
        return m.reply('❌ File is not a valid APK. Please try again.');
      }
      
      // Send the file
      await sock.sendMessage(m.chat, {
        document: apkBuffer.data,
        fileName: apkName,
        mimetype: 'application/vnd.android.package-archive',
        caption: `✅ *Downloaded:* ${data.name}\n📥 Source: apkfab.com`
      }, { quoted: m });
      
    } catch (err) {
      console.error('[APK SEARCH ERROR]', err);
      m.reply('❌ Error while downloading APK. Try again later.');
    }
  }
};