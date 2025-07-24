const MAX_SAFE_LENGTH = 5000; // Customize payload limit
const OWNERS = require('../../config/owner.json');

module.exports = {
  name: 'antibug',
  type: 'event',

  async run({ sock, m }) {
    try {
      if (!m || !m.message) return;

      const jid = m.key.remoteJid;
      const sender = m.key.participant || m.key.remoteJid;
      const isGroup = jid.endsWith('@g.us');
      const ownerChats = OWNERS;

      const type = Object.keys(m.message)[0];
      const msg = m.message[type];
      const text = msg?.conversation || msg?.text || msg?.caption || '';

      if (!text || typeof text !== 'string') return;

      // Only scan private or owner chats
      const shouldScan =
        !isGroup && ownerChats.includes(jid);

      if (!shouldScan) return;

      const risky = detectBug(text);

      if (risky) {
        await sock.updateBlockStatus(sender, 'block');
        await sock.sendMessage(jid, {
          text: `⚠️ *Bug or Detected from ${sender}*\nBlocked for safety.`,
        });
        console.log(`[ANTIBUG] Blocked: ${sender} | Reason: ${risky}`);
      }
    } catch (err) {
      console.error('[ANTIBUG ERROR]', err);
    }
  },
};

// 🚨 Detection logic
function detectBug(text) {
  if (text.length > MAX_SAFE_LENGTH) return 'Payload (Length Overflow)';
  if (/[\u202e\u2066\u2067\u2068\u2069]/.test(text)) return 'RTL/Unicode Obfuscation';
  if (text.match(/[\u{1F1E6}-\u{1F1FF}]{5,}/u)) return 'Flag Spam';
  if (text.match(/@everyone|@all|@/g)?.length > 20) return 'Mass Mention Abuse';
  if (/(\u0300|\u0301|\u034f|\u200b){10,}/.test(text)) return 'Zalgo/Invisible Characters';
  if (text.match(/https?:\/\/[^\s]{100,}/)) return 'Bug Link Spam';
  if (text.match(/[\u1F600-\u1F64F]{100,}/)) return 'Emoji Crash String';
  return false;
}