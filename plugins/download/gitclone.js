const axios = require('axios');

module.exports = {
  command: ['gitclone', 'gitdl', 'clone'],
  tags: ['download'],
  help: ['gitclone <username/repo>', 'gitclone <github repo url>'],
  description: 'Download a GitHub repository as ZIP',
  
  async run({ sock, m, text }) {
    try {
      if (!text) return m.reply('📦 *Usage:* .gitclone octocat/Hello-World or full GitHub link');
      
      let repoUrl = text.trim();
      
      // Support GitHub repo in URL or username/repo format
      if (repoUrl.includes('github.com')) {
        let match = repoUrl.match(/github\.com\/([^\/]+\/[^\/\s]+)/);
        if (!match) return m.reply('❌ Invalid GitHub URL.');
        repoUrl = match[1];
      }
      
      const zipUrl = `https://github.com/${repoUrl}/archive/refs/heads/master.zip`;
      
      m.reply(`📥 Cloning GitHub repository:\n🔗 https://github.com/${repoUrl}`);
      
      const response = await axios.get(zipUrl, { responseType: 'arraybuffer' });
      
      await sock.sendMessage(m.chat, {
        document: response.data,
        fileName: `${repoUrl.split('/')[1]}.zip`,
        mimetype: 'application/zip',
        caption: `✅ *Repository cloned successfully!*\n\n📁 Repo: https://github.com/${repoUrl}`
      }, { quoted: m });
      
    } catch (err) {
      console.error('[GITCLONE ERROR]', err);
      m.reply('❌ Failed to download the repository. Make sure it exists and is public.');
    }
  }
};