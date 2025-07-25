const axios = require('axios');
const { formatBytes } = require('../../lib/format');

module.exports = {
  command: ['gitclone', 'gitdl', 'clone'],
  aliases: ['github', 'ghclone'],
  tags: ['download'],
  help: [
    'gitclone <username/repo>',
    'gitclone <github repo url>',
    'clone <repo-url>'
  ],
  description: 'Download a GitHub repository as ZIP archive',
  usage: '.gitclone octocat/Hello-World or .gitclone https://github.com/octocat/Hello-World',
  cooldown: 10,
  ownerOnly: false,
  groupOnly: false,
  privateOnly: false,
  adminOnly: false,
  botAdmin: false,
  
  async run({ sock, m, text, command }) {
    try {
      if (!text || text.trim().length === 0) {
        return await sock.sendMessage(m.chat, {
          text: `📦 *Usage:* .${command} <username/repo> or full GitHub link\n\n` +
                `📝 *Examples:*\n` +
                `.${command} octocat/Hello-World\n` +
                `.${command} https://github.com/octocat/Hello-World`
        }, { quoted: m });
      }
      
      let repoIdentifier = text.trim();
      let username, repoName;
      
      // Support GitHub repo in URL or username/repo format
      if (repoIdentifier.includes('github.com')) {
        // Parse GitHub URL
        const urlMatch = repoIdentifier.match(/github\.com\/([^\/]+)\/([^\/\s]+)/i);
        if (!urlMatch || urlMatch.length < 3) {
          return await sock.sendMessage(m.chat, {
            text: '❌ Invalid GitHub URL format.\n\n' +
                  '✅ Valid formats:\n' +
                  '• https://github.com/username/repository\n' +
                  '• username/repository'
          }, { quoted: m });
        }
        username = urlMatch[1];
        repoName = urlMatch[2];
      } else {
        // Parse username/repo format
        const parts = repoIdentifier.split('/');
        if (parts.length !== 2 || !parts[0] || !parts[1]) {
          return await sock.sendMessage(m.chat, {
            text: '❌ Invalid repository format.\n\n' +
                  '✅ Valid format: username/repository\n' +
                  '📝 Example: octocat/Hello-World'
          }, { quoted: m });
        }
        username = parts[0];
        repoName = parts[1];
      }
      
      // Clean repo name (remove any trailing slashes or query params)
      repoName = repoName.split('?')[0].split('#')[0];
      
      const repoPath = `${username}/${repoName}`;
      const zipUrl = `https://github.com/${repoPath}/archive/refs/heads/main.zip`;
      const altZipUrl = `https://github.com/${repoPath}/archive/refs/heads/master.zip`;
      
      // Notify user about the cloning process
      const progressMsg = await sock.sendMessage(m.chat, {
        text: `📥 *Cloning GitHub Repository...*\n\n` +
              `👤 User: ${username}\n` +
              `📂 Repo: ${repoName}\n` +
              `🔗 URL: https://github.com/${repoPath}\n\n` +
              `⏳ Please wait...`
      }, { quoted: m });
      
      // Show typing indicator
      await sock.sendPresenceUpdate('composing', m.chat);
      
      let response;
      let usedBranch = 'main';
      
      try {
        // Try main branch first
        response = await axios.get(zipUrl, {
          responseType: 'arraybuffer',
          timeout: 45000, // 45 second timeout
          headers: {
            'User-Agent': 'Mahachi-XD-Bot/1.0 (https://github.com/WeedTech/Mahachi-XD)',
            'Accept': 'application/zip'
          }
        });
      } catch (mainError) {
        // If main branch fails, try master branch
        try {
          response = await axios.get(altZipUrl, {
            responseType: 'arraybuffer',
            timeout: 45000,
            headers: {
              'User-Agent': 'Mahachi-XD-Bot/1.0 (https://github.com/WeedTech/Mahachi-XD)',
              'Accept': 'application/zip'
            }
          });
          usedBranch = 'master';
        } catch (masterError) {
          // Both branches failed
          throw new Error(`Repository not found or inaccessible. Both 'main' and 'master' branches were tried.`);
        }
      }
      
      // Validate response
      if (!response || !response.data) {
        throw new Error('Empty response from GitHub');
      }
      
      const fileSize = response.data.length;
      
      // Check file size (prevent downloading extremely large files)
      if (fileSize > 100 * 1024 * 1024) { // 100MB limit
        return await sock.sendMessage(m.chat, {
          text: `❌ Repository is too large (${formatBytes(fileSize)}).\n` +
                `📦 Maximum allowed size: 100MB\n` +
                `🔗 You can download it directly from GitHub: https://github.com/${repoPath}`,
          edit: progressMsg.key
        });
      }
      
      // Prepare filename
      const fileName = `${repoName}-${usedBranch}.zip`;
      
      // Send the ZIP file
      await sock.sendMessage(m.chat, {
        document: response.data,
        fileName: fileName,
        mimetype: 'application/zip',
        caption: `✅ *Repository Cloned Successfully!*\n\n` +
                 `👤 User: ${username}\n` +
                 `📂 Repo: ${repoName}\n` +
                 `🌿 Branch: ${usedBranch}\n` +
                 `📊 Size: ${formatBytes(fileSize)}\n` +
                 `🔗 Original: https://github.com/${repoPath}\n\n` +
                 `💡 _Powered by Mahachi-XD_`
      }, {
        quoted: m,
        edit: progressMsg.key
      });
      
      // Log successful clone
      console.log(`[GITCLONE] Successfully cloned: ${repoPath} (${formatBytes(fileSize)})`);
      
    } catch (err) {
      console.error('[GITCLONE ERROR]', err);
      
      let errorMessage = '❌ Failed to download the repository.\n';
      
      if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') {
        errorMessage += '⏰ Request timed out. The repository might be too large.\n';
      } else if (err.response) {
        const status = err.response.status;
        if (status === 404) {
          errorMessage += '❓ Repository not found. Please check the URL or repository name.\n';
        } else if (status === 403) {
          errorMessage += '🔒 Access denied. The repository might be private.\n';
        } else if (status === 429) {
          errorMessage += '⏳ Rate limit exceeded. Please try again later.\n';
        } else if (status >= 500) {
          errorMessage += '🔧 GitHub service is temporarily unavailable.\n';
        }
      } else if (err.message.includes('large')) {
        errorMessage += '📦 Repository is too large to download.\n';
      }
      
      errorMessage += '\n📝 Make sure the repository exists and is public.';
      
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

// Alternative implementation with multiple branch support
/*
module.exports = {
  command: ['gitclone', 'gitdl', 'clone'],
  aliases: ['github', 'ghclone'],
  tags: ['download'],
  help: [
    'gitclone <username/repo>',
    'gitclone <github repo url>',
    'clone <repo-url>'
  ],
  description: 'Download a GitHub repository as ZIP archive',
  usage: '.gitclone octocat/Hello-World',
  cooldown: 10,
  
  async run({ sock, m, text, command }) {
    try {
      if (!text || text.trim().length === 0) {
        return await sock.sendMessage(m.chat, {
          text: `📦 *Usage:* .${command} <username/repo>\n\n` +
                `📝 *Example:* .${command} octocat/Hello-World`
        }, { quoted: m });
      }
      
      let repoIdentifier = text.trim();
      let username, repoName;
      
      if (repoIdentifier.includes('github.com')) {
        const urlMatch = repoIdentifier.match(/github\.com\/([^\/]+)\/([^\/\s]+)/i);
        if (!urlMatch || urlMatch.length < 3) {
          return await m.reply('❌ Invalid GitHub URL format.');
        }
        username = urlMatch[1];
        repoName = urlMatch[2];
      } else {
        const parts = repoIdentifier.split('/');
        if (parts.length !== 2) {
          return await m.reply('❌ Invalid format. Use: username/repository');
        }
        username = parts[0];
        repoName = parts[1];
      }
      
      repoName = repoName.split('?')[0].split('#')[0];
      const repoPath = `${username}/${repoName}`;
      
      const progressMsg = await m.reply(`📥 Cloning: ${repoPath}\n⏳ Please wait...`);
      await sock.sendPresenceUpdate('composing', m.chat);
      
      // Try multiple branches
      const branches = ['main', 'master', 'develop'];
      let response = null;
      let usedBranch = '';
      
      for (const branch of branches) {
        try {
          const url = `https://github.com/${repoPath}/archive/refs/heads/${branch}.zip`;
          response = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: 30000,
            headers: {
              'User-Agent': 'Mahachi-XD-Bot/1.0'
            }
          });
          usedBranch = branch;
          break;
        } catch (error) {
          if (branch === branches[branches.length - 1]) {
            throw error; // All branches failed
          }
          continue; // Try next branch
        }
      }
      
      if (!response || !response.data) {
        throw new Error('Failed to download repository');
      }
      
      const fileSize = response.data.length;
      
      if (fileSize > 100 * 1024 * 1024) {
        return await m.reply(`❌ Repository too large (${formatBytes(fileSize)}). Max: 100MB`);
      }
      
      const fileName = `${repoName}-${usedBranch}.zip`;
      
      await sock.sendMessage(m.chat, {
        document: response.data,
        fileName: fileName,
        mimetype: 'application/zip',
        caption: `✅ Cloned: ${repoPath}\n📊 Size: ${formatBytes(fileSize)}`
      }, {
        quoted: m,
        edit: progressMsg.key
      });
      
    } catch (err) {
      console.error('[GITCLONE ERROR]', err);
      
      let errorMsg = '❌ Failed to clone repository.\n';
      
      if (err.response?.status === 404) {
        errorMsg += 'Repository not found.\n';
      } else if (err.code === 'ECONNABORTED') {
        errorMsg += 'Timeout. Repository too large.\n';
      } else {
        errorMsg += `${err.message}\n`;
      }
      
      errorMsg += 'Make sure it exists and is public.';
      
      try {
        await m.reply(errorMsg, progressMsg?.key);
      } catch {
        await m.reply(errorMsg);
      }
    }
  }
};
*/