const os = require('os');
const fs = require('fs');
const path = require('path');
const sendMedia = require('../../lib/sendMedia');

async function countPlugins(dir) {
  let count = 0;
  const files = await fs.promises.readdir(dir, { withFileTypes: true });
  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    if (file.isDirectory()) {
      count += await countPlugins(fullPath);
    } else if (file.isFile() && file.name.endsWith('.js')) {
      count++;
    }
  }
  return count;
}

module.exports = {
  name: 'menu',
  category: 'system',
  desc: 'Show the full bot menu',
  
  async run({ sock, m, prefix, config }) {
    try {
      const now = new Date();
      const date = now.toLocaleDateString('en-US', { timeZone: 'Africa/Harare' });
      const time = now.toLocaleTimeString('en-US', { timeZone: 'Africa/Harare', hour12: false });
      
      const totalMemMB = (os.totalmem() / (1024 * 1024)).toFixed(2);
      const freeMemMB = (os.freemem() / (1024 * 1024)).toFixed(2);
      const usedMemMB = (totalMemMB - freeMemMB).toFixed(2);
      
      const pluginsDir = path.join(__dirname, '../../plugins');
      const pluginCount = await countPlugins(pluginsDir);
      
      // Get bot paired number for mention (remove non-digits, add WhatsApp suffix)
      const botNumberRaw = config?.number || process.env.NUMBER || '000000000000';
      const botNumberClean = botNumberRaw.replace(/\D/g, '') + '@s.whatsapp.net';
      
      const menuText = `
•••••••••••••【 𝐌𝐀𝐇𝐀𝐂𝐇𝐈-𝐗𝐃 】•••••••••••••

> ⌫ 𝐏𝐫𝐞𝐟𝐢𝐱 : [${prefix}]
> ⌫ 𝐎𝐰𝐧𝐞𝐫: @${botNumberRaw}
> ⌫ 𝐏𝐥𝐮𝐠𝐢𝐧𝐬 : ${pluginCount}
> ⌫ 𝐃𝐚𝐭𝐞: ${date}
> ⌫ 𝐓𝐢𝐦𝐞: ${time}
> ⌫ 𝐔𝐬𝐚𝐠𝐞 𝐑𝐚𝐦: ${usedMemMB}MB / ${totalMemMB}MB

               𝐀𝐢 𝐌𝐞𝐧𝐮

> ➪ 𝐜𝐡𝐚𝐭𝐠𝐩𝐭
> ➪ 𝐝𝐞𝐞𝐩𝐬𝐞𝐞𝐤

             𝐃𝐨𝐰𝐧𝐥𝐨𝐚𝐝 𝐌𝐞𝐧𝐮

> ➪ 𝐚𝐩𝐤
> ➪ 𝐩𝐥𝐚𝐲
> ➪ 𝐯𝐢𝐝𝐞𝐨
> ➪ 𝐠𝐢𝐭𝐜𝐥𝐨𝐧𝐞

               𝐎𝐰𝐧𝐞𝐫 𝐌𝐞𝐧𝐮

> ➪ 𝐚𝐮𝐭𝐨𝐫𝐞𝐚𝐜𝐭
> ➪ 𝐚𝐮𝐭𝐨𝐛𝐢𝐨
> ➪ 𝐚𝐮𝐭𝐨𝐬𝐰𝐯𝐢𝐞𝐰
> ➪ 𝐣𝐨𝐢𝐧
> ➪ 𝐚𝐧𝐭𝐢𝐛𝐮𝐠
> ➪ 𝐚𝐧𝐭𝐢𝐝𝐞𝐥
> ➪ 𝐚𝐧𝐭𝐢𝐯𝐯
> ➪ 𝐯𝐯
> ➪ 𝐩𝐫𝐢𝐯𝐚𝐭𝐞
> ➪ 𝐩𝐮𝐛𝐥𝐢𝐜

               𝐆𝐫𝐨𝐮𝐩 𝐌𝐞𝐧𝐮

> ➪ 𝐨𝐩𝐞𝐧𝐠𝐜
> ➪ 𝐜𝐥𝐨𝐬𝐞𝐠𝐜
> ➪ 𝐭𝐚𝐠𝐚𝐥𝐥
> ➪ 𝐚𝐧𝐭𝐢𝐥𝐢𝐧𝐤
> ➪ 𝐚𝐧𝐭𝐢𝐝𝐞𝐥𝐠𝐜
> ➪ 𝐰𝐞𝐥𝐜𝐨𝐦𝐞
> ➪ 𝐠𝐨𝐨𝐝𝐛𝐲𝐞
> ➪ 𝐤𝐢𝐜𝐤

               𝐁𝐮𝐠𝐬 𝐌𝐞𝐧𝐮

> ➪ 𝐤𝐢𝐥𝐥
> ➪ 𝐜𝐫𝐚𝐬𝐡
> ➪ 𝐦𝐚𝐡𝐚𝐜𝐡𝐢

               𝐍𝐬𝐟𝐰 𝐌𝐞𝐧𝐮

> ➪ 𝐱𝐧𝐱𝐱𝐬𝐞𝐚𝐫𝐜𝐡
> ➪ 𝐱𝐯𝐢𝐝𝐞𝐨𝐬𝐞𝐚𝐫𝐜𝐡
> ➪ 𝐱𝐧𝐱𝐱𝐝𝐥
> ➪ 𝐝𝐥𝐱𝐯𝐢𝐝𝐞𝐨

> քօաɛʀɛɖ ɮʏ 𝚆𝙴𝙴𝙳 𝚃𝙴𝙲𝙷
                         𝙸𝚌𝚎𝙵𝚕𝚘𝚠𝚃𝚎𝚌𝚑
`.trim();
      
      // Try sending menu text with mention
      try {
        await sock.sendMessage(m.chat, {
          text: menuText,
          mentions: [botNumberClean],
        });
      } catch (err) {
        // Fallback: send plain text without mention if that fails
        await sock.sendMessage(m.chat, { text: menuText });
      }
      
      // Send banner image after menu text
      try {
        await sendMedia(sock, m.chat, 'https://files.catbox.moe/b6hr8z.jpeg', 'MAHACHI-XD Banner');
      } catch (err) {
        console.warn('Failed to send banner image:', err);
      }
      
    } catch (error) {
      console.error('Error in menu.js:', error);
      await sock.sendMessage(m.chat, { text: '⚠️ Failed to send menu.' });
    }
  }
};