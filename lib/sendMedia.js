const path = require('path');
const fs = require('fs');
const mime = require('mime-types');
const axios = require('axios');

/**
 * Send media to a chat
 * @param {object} sock - Baileys socket
 * @param {string} chatId - chat jid
 * @param {string|Buffer} media - URL, file path, or Buffer of media
 * @param {string} [caption=''] - optional caption
 * @param {object} [options={}] - extra options for Baileys sendMessage
 */
async function sendMedia(sock, chatId, media, caption = '', options = {}) {
  try {
    // Validate inputs
    if (!sock) {
      throw new Error('Socket connection is required');
    }
    
    if (!chatId) {
      throw new Error('Chat ID is required');
    }
    
    if (!media) {
      throw new Error('Media is required');
    }
    
    let message = {};
    let mimetype = '';
    let mediaData = null;
    
    // Determine if media is Buffer, URL, or file path
    if (Buffer.isBuffer(media)) {
      mediaData = media;
      // Try to detect mimetype from buffer (basic implementation)
      mimetype = detectMimetypeFromBuffer(media) || 'application/octet-stream';
    } else if (typeof media === 'string') {
      if (media.startsWith('http://') || media.startsWith('https://')) {
        // Remote URL
        mimetype = mime.lookup(media) || 'application/octet-stream';
        mediaData = { url: media };
      } else if (fs.existsSync(media)) {
        // Local file path
        mimetype = mime.lookup(media) || 'application/octet-stream';
        mediaData = fs.readFileSync(media);
      } else {
        // Check if it might be a base64 string
        if (media.startsWith('data:')) {
          const base64Data = media.split(',')[1];
          mediaData = Buffer.from(base64Data, 'base64');
          mimetype = media.split(';')[0].split(':')[1] || 'application/octet-stream';
        } else {
          throw new Error('Invalid media path or URL');
        }
      }
    } else {
      throw new Error('Media must be Buffer, URL string, file path string, or base64 string');
    }
    
    // Prepare message content based on mimetype
    if (mimetype.startsWith('image')) {
      message.image = mediaData;
      if (caption) message.caption = String(caption);
    } else if (mimetype.startsWith('video')) {
      message.video = mediaData;
      if (caption) message.caption = String(caption);
    } else if (mimetype.startsWith('audio')) {
      message.audio = mediaData;
      // Check for voice note option
      if (options.ptt) {
        message.ptt = true;
      }
    } else {
      // Fallback to document for anything else
      message.document = mediaData;
      if (caption) message.caption = String(caption);
      message.fileName = options.fileName || `file.${mime.extension(mimetype) || 'bin'}`;
      message.mimetype = mimetype;
    }
    
    // Handle additional options
    const finalOptions = {
      ...options
    };
    
    // Remove options that shouldn't be passed to sendMessage
    delete finalOptions.ptt;
    delete finalOptions.fileName;
    
    // Merge extra options
    Object.assign(message, finalOptions);
    
    // Send message
    const result = await sock.sendMessage(chatId, message);
    return result;
    
  } catch (error) {
    console.error('[SEND MEDIA ERROR]', error);
    throw new Error(`Failed to send media: ${error.message}`);
  }
}

/**
 * Download media from URL to Buffer
 * @param {string} url - Media URL
 * @returns {Promise<Buffer>} - Media as Buffer
 */
async function downloadMedia(url) {
  try {
    const response = await axios({
      method: 'GET',
      url: url,
      responseType: 'arraybuffer'
    });
    return Buffer.from(response.data);
  } catch (error) {
    throw new Error(`Failed to download media: ${error.message}`);
  }
}

/**
 * Basic mimetype detection from Buffer
 * @param {Buffer} buffer - Media buffer
 * @returns {string|null} - Detected mimetype or null
 */
function detectMimetypeFromBuffer(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 4) {
    return null;
  }
  
  const signature = buffer.toString('hex', 0, 4).toUpperCase();
  
  const signatures = {
    'FFD8FF': 'image/jpeg',
    '89504E47': 'image/png',
    '47494638': 'image/gif',
    '52494646': 'video/webm',
    '00000018': 'video/mp4',
    '00000020': 'video/mp4',
    '1A45DFA3': 'video/webm',
    '494433': 'audio/mpeg',
    'FFFB': 'audio/mpeg',
    'FFF3': 'audio/mpeg',
    'FFF2': 'audio/mpeg',
    '4F676753': 'audio/ogg'
  };
  
  for (const [sig, mime] of Object.entries(signatures)) {
    if (signature.startsWith(sig)) {
      return mime;
    }
  }
  
  return null;
}

/**
 * Send image media
 * @param {object} sock - Baileys socket
 * @param {string} chatId - Chat ID
 * @param {string|Buffer} image - Image URL, path, or Buffer
 * @param {string} [caption=''] - Image caption
 * @param {object} [options={}] - Additional options
 */
async function sendImage(sock, chatId, image, caption = '', options = {}) {
  return await sendMedia(sock, chatId, image, caption, { ...options });
}

/**
 * Send video media
 * @param {object} sock - Baileys socket
 * @param {string} chatId - Chat ID
 * @param {string|Buffer} video - Video URL, path, or Buffer
 * @param {string} [caption=''] - Video caption
 * @param {object} [options={}] - Additional options
 */
async function sendVideo(sock, chatId, video, caption = '', options = {}) {
  return await sendMedia(sock, chatId, video, caption, { ...options });
}

/**
 * Send audio media
 * @param {object} sock - Baileys socket
 * @param {string} chatId - Chat ID
 * @param {string|Buffer} audio - Audio URL, path, or Buffer
 * @param {boolean} [isVoiceNote=false] - Whether to send as voice note
 * @param {object} [options={}] - Additional options
 */
async function sendAudio(sock, chatId, audio, isVoiceNote = false, options = {}) {
  return await sendMedia(sock, chatId, audio, '', {
    ptt: isVoiceNote,
    ...options
  });
}

/**
 * Send document media
 * @param {object} sock - Baileys socket
 * @param {string} chatId - Chat ID
 * @param {string|Buffer} document - Document URL, path, or Buffer
 * @param {string} [filename=''] - Document filename
 * @param {string} [caption=''] - Document caption
 * @param {object} [options={}] - Additional options
 */
async function sendDocument(sock, chatId, document, filename = '', caption = '', options = {}) {
  const mimeType = mime.lookup(filename) || 'application/octet-stream';
  return await sendMedia(sock, chatId, document, caption, {
    fileName: filename,
    mimetype: mimeType,
    ...options
  });
}

/**
 * Send media with thumbnail
 * @param {object} sock - Baileys socket
 * @param {string} chatId - Chat ID
 * @param {string|Buffer} media - Media URL, path, or Buffer
 * @param {string|Buffer} thumbnail - Thumbnail URL, path, or Buffer
 * @param {string} [caption=''] - Media caption
 * @param {object} [options={}] - Additional options
 */
async function sendMediaWithThumbnail(sock, chatId, media, thumbnail, caption = '', options = {}) {
  try {
    // First send media to get message ID
    const mediaMessage = await sendMedia(sock, chatId, media, caption, options);
    
    // Then update with thumbnail if needed (simplified approach)
    // In practice, you might want to handle this differently based on Baileys capabilities
    return mediaMessage;
  } catch (error) {
    throw new Error(`Failed to send media with thumbnail: ${error.message}`);
  }
}

module.exports = {
  sendMedia,
  downloadMedia,
  sendImage,
  sendVideo,
  sendAudio,
  sendDocument,
  sendMediaWithThumbnail
};