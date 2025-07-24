/**
 * Send a simple text reply to a chat
 * @param {object} sock - Baileys socket connection
 * @param {object} m - Message object
 * @param {string} text - Text to send
 * @param {boolean} [mention=false] - Whether to mention the sender
 */
async function replyText(sock, m, text, mention = false) {
  const mentions = mention && m.sender ? [m.sender] : [];
  await sock.sendMessage(m.chat, { text, mentions });
}

/**
 * Reply quoting the original message
 * @param {object} sock 
 * @param {object} m 
 * @param {string} text 
 */
async function replyQuote(sock, m, text) {
  await sock.sendMessage(m.chat, { text, contextInfo: { quotedMessage: m.message } });
}

/**
 * Placeholder: Reply with buttons (to expand as needed)
 * @param {object} sock 
 * @param {object} m 
 * @param {string} text 
 * @param {Array} buttons - Array of button objects
 */
async function replyButtons(sock, m, text, buttons) {
  const buttonMessage = {
    text,
    buttons,
    headerType: 1
  };
  await sock.sendMessage(m.chat, buttonMessage);
}

/**
 * Placeholder: Reply with media (image/video/audio)
 * @param {object} sock 
 * @param {object} m 
 * @param {Buffer|string} media - Media buffer or URL
 * @param {string} mimetype - e.g. 'image/jpeg'
 * @param {string} caption - Caption text
 */
async function replyMedia(sock, m, media, mimetype, caption = '') {
  await sock.sendMessage(m.chat, {
    [mimetype.startsWith('image') ? 'image' : mimetype.startsWith('video') ? 'video' : 'audio']: { url: media },
    caption,
  });
}

module.exports = {
  replyText,
  replyQuote,
  replyButtons,
  replyMedia,
};