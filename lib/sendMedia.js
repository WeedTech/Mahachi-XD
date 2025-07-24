const path = require('path');
const fs = require('fs');
const mime = require('mime-types');

/**
 * Send media to a chat
 * @param {object} sock - Baileys socket
 * @param {string} chatId - chat jid
 * @param {string|Buffer} media - URL, file path, or Buffer of media
 * @param {string} [caption=''] - optional caption
 * @param {object} [options={}] - extra options for Baileys sendMessage
 */
async function sendMedia(sock, chatId, media, caption = '', options = {}) {
  let message = {};
  let mimetype = '';
  let mediaData = null;
  
  // Determine if media is Buffer, URL, or file path
  if (Buffer.isBuffer(media)) {
    mediaData = media;
  } else if (typeof media === 'string') {
    if (media.startsWith('http://') || media.startsWith('https://')) {
      // Remote URL - use as url for Baileys
      mimetype = mime.lookup(media) || '';
      mediaData = { url: media };
    } else if (fs.existsSync(media)) {
      // Local file path
      mimetype = mime.lookup(media) || '';
      mediaData = fs.readFileSync(media);
    } else {
      throw new Error('sendMedia: Invalid media path or URL');
    }
  } else {
    throw new Error('sendMedia: media must be Buffer, URL string, or file path string');
  }
  
  // If mimetype not set, try detect from Buffer (optional - left out for simplicity)
  
  // Prepare message content based on mimetype
  if (!mimetype && Buffer.isBuffer(mediaData)) {
    // fallback to jpg if unknown
    mimetype = 'image/jpeg';
  }
  
  if (mimetype.startsWith('image')) {
    message.image = mediaData;
    if (caption) message.caption = caption;
  } else if (mimetype.startsWith('video')) {
    message.video = mediaData;
    if (caption) message.caption = caption;
  } else if (mimetype.startsWith('audio')) {
    message.audio = mediaData;
    // optionally add ptt: true for voice note
  } else {
    // fallback to document for anything else
    message.document = mediaData;
    if (caption) message.caption = caption;
    message.mimetype = mimetype || 'application/octet-stream';
  }
  
  // Merge extra options if any
  Object.assign(message, options);
  
  // Send message
  await sock.sendMessage(chatId, message);
}

module.exports = sendMedia;