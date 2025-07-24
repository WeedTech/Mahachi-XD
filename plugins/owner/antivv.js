module.exports = {
  name: 'antivv',
  type: 'event',
  description: 'Auto reveals view-once media (photo/video)',
  
  async run({ sock, m }) {
    try {
      // Only handle view-once messages
      if (
        m.message &&
        (m.message.viewOnceMessageV2 || m.message.viewOnceMessage)
      ) {
        const vmsg =
          m.message.viewOnceMessageV2?.message ||
          m.message.viewOnceMessage?.message;

        if (!vmsg) return;

        // Forward the actual view-once media content
        const forwardMessage = {
          key: {
            remoteJid: m.key.remoteJid,
            fromMe: false,
            id: m.key.id,
            participant: m.key.participant || undefined,
          },
          message: vmsg,
        };

        await sock.sendMessage(
          m.key.remoteJid,
          { forward: true, message: forwardMessage },
          { quoted: m }
        );

        console.log(
          `[🕵️‍♂️ ANTI-VIEW-ONCE] Revealed view-once message in ${m.key.remoteJid}`
        );
      }
    } catch (err) {
      console.error('[❌ ANTI-VIEW-ONCE ERROR]', err);
    }
  },
};