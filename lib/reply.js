/**
 * Send a simple text reply to a chat
 * @param {object} sock - Baileys socket connection
 * @param {object} m - Message object
 * @param {string} text - Text to send
 * @param {object} options - Additional options
 */
async function replyText(sock, m, text, options = {}) {
  try {
    if (!sock || !m || !m.chat) {
      throw new Error('Invalid socket or message object');
    }
    
    if (typeof text !== 'string') {
      text = String(text);
    }
    
    const messageOptions = {
      text,
      ...options
    };
    
    // Handle mentions
    if (options.mention && m.sender) {
      messageOptions.mentions = [m.sender];
    }
    
    return await sock.sendMessage(m.chat, messageOptions);
  } catch (error) {
    console.error('[REPLY ERROR] Failed to send text reply:', error);
    throw error;
  }
}

/**
 * Reply quoting the original message
 * @param {object} sock 
 * @param {object} m 
 * @param {string} text 
 * @param {object} options - Additional options
 */
async function replyQuote(sock, m, text, options = {}) {
  try {
    if (!sock || !m || !m.chat) {
      throw new Error('Invalid socket or message object');
    }
    
    if (typeof text !== 'string') {
      text = String(text);
    }
    
    const messageOptions = {
      text,
      contextInfo: {
        quotedMessage: m.message,
        participant: m.key.participant || m.key.remoteJid,
        remoteJid: m.key.remoteJid,
        ...options.contextInfo
      },
      ...options
    };
    
    return await sock.sendMessage(m.chat, messageOptions);
  } catch (error) {
    console.error('[REPLY ERROR] Failed to send quoted reply:', error);
    throw error;
  }
}

/**
 * Reply with buttons
 * @param {object} sock 
 * @param {object} m 
 * @param {string} text 
 * @param {Array} buttons - Array of button objects
 * @param {object} options - Additional options
 */
async function replyButtons(sock, m, text, buttons, options = {}) {
  try {
    if (!sock || !m || !m.chat) {
      throw new Error('Invalid socket or message object');
    }
    
    if (!Array.isArray(buttons) || buttons.length === 0) {
      throw new Error('Buttons must be a non-empty array');
    }
    
    if (typeof text !== 'string') {
      text = String(text);
    }
    
    const buttonMessage = {
      text,
      buttons: buttons.map((btn, index) => ({
        buttonId: btn.id || `button_${index}`,
        buttonText: { displayText: btn.text || 'Button' },
        type: btn.type || 1,
        ...btn
      })),
      headerType: 1,
      ...options
    };
    
    return await sock.sendMessage(m.chat, buttonMessage);
  } catch (error) {
    console.error('[REPLY ERROR] Failed to send buttons reply:', error);
    throw error;
  }
}

/**
 * Reply with media (image/video/audio)
 * @param {object} sock 
 * @param {object} m 
 * @param {Buffer|string} media - Media buffer or URL
 * @param {string} mimetype - e.g. 'image/jpeg'
 * @param {string} caption - Caption text
 * @param {object} options - Additional options
 */
async function replyMedia(sock, m, media, mimetype, caption = '', options = {}) {
  try {
    if (!sock || !m || !m.chat) {
      throw new Error('Invalid socket or message object');
    }
    
    if (!media) {
      throw new Error('Media is required');
    }
    
    if (typeof caption !== 'string') {
      caption = String(caption);
    }
    
    // Determine media type
    let mediaType;
    if (mimetype.startsWith('image')) {
      mediaType = 'image';
    } else if (mimetype.startsWith('video')) {
      mediaType = 'video';
    } else if (mimetype.startsWith('audio')) {
      mediaType = 'audio';
    } else {
      throw new Error('Unsupported media type');
    }
    
    const messageOptions = {
      caption,
      mimetype,
      ...options
    };
    
    // Handle different media sources
    if (typeof media === 'string') {
      // URL or file path
      messageOptions[mediaType] = { url: media };
    } else if (Buffer.isBuffer(media)) {
      // Buffer
      messageOptions[mediaType] = media;
    } else {
      throw new Error('Media must be a Buffer or URL string');
    }
    
    return await sock.sendMessage(m.chat, messageOptions);
  } catch (error) {
    console.error('[REPLY ERROR] Failed to send media reply:', error);
    throw error;
  }
}

/**
 * Reply with template buttons
 * @param {object} sock 
 * @param {object} m 
 * @param {string} text 
 * @param {Array} templateButtons - Array of template button objects
 * @param {object} options - Additional options
 */
async function replyTemplateButtons(sock, m, text, templateButtons, options = {}) {
  try {
    if (!sock || !m || !m.chat) {
      throw new Error('Invalid socket or message object');
    }
    
    if (!Array.isArray(templateButtons) || templateButtons.length === 0) {
      throw new Error('Template buttons must be a non-empty array');
    }
    
    if (typeof text !== 'string') {
      text = String(text);
    }
    
    const templateMessage = {
      text,
      footer: options.footer || '',
      templateButtons: templateButtons.map((btn, index) => {
        const buttonId = btn.index || `template_${index}`;
        switch (btn.type) {
          case 'quick_reply':
            return {
              index: buttonId,
              quickReplyButton: {
                displayText: btn.displayText || 'Quick Reply',
                id: btn.id || buttonId
              }
            };
          case 'url':
            return {
              index: buttonId,
              urlButton: {
                displayText: btn.displayText || 'URL Button',
                url: btn.url || '#'
              }
            };
          case 'call':
            return {
              index: buttonId,
              callButton: {
                displayText: btn.displayText || 'Call Button',
                phoneNumber: btn.phoneNumber || '+1234567890'
              }
            };
          default:
            return {
              index: buttonId,
              quickReplyButton: {
                displayText: btn.displayText || 'Button',
                id: btn.id || buttonId
              }
            };
        }
      }),
      ...options
    };
    
    return await sock.sendMessage(m.chat, templateMessage);
  } catch (error) {
    console.error('[REPLY ERROR] Failed to send template buttons reply:', error);
    throw error;
  }
}

/**
 * Reply with list message
 * @param {object} sock 
 * @param {object} m 
 * @param {string} text 
 * @param {string} buttonText 
 * @param {Array} sections 
 * @param {object} options - Additional options
 */
async function replyList(sock, m, text, buttonText, sections, options = {}) {
  try {
    if (!sock || !m || !m.chat) {
      throw new Error('Invalid socket or message object');
    }
    
    if (!Array.isArray(sections) || sections.length === 0) {
      throw new Error('Sections must be a non-empty array');
    }
    
    if (typeof text !== 'string') {
      text = String(text);
    }
    
    const listMessage = {
      text,
      buttonText: buttonText || 'Select',
      sections,
      listType: 1,
      ...options
    };
    
    return await sock.sendMessage(m.chat, listMessage);
  } catch (error) {
    console.error('[REPLY ERROR] Failed to send list reply:', error);
    throw error;
  }
}

/**
 * Reply with contact
 * @param {object} sock 
 * @param {object} m 
 * @param {string} contactName 
 * @param {string} contactNumber 
 * @param {object} options - Additional options
 */
async function replyContact(sock, m, contactName, contactNumber, options = {}) {
  try {
    if (!sock || !m || !m.chat) {
      throw new Error('Invalid socket or message object');
    }
    
    if (!contactName || !contactNumber) {
      throw new Error('Contact name and number are required');
    }
    
    const vcard = 'BEGIN:VCARD\n' +
      'VERSION:3.0\n' +
      `FN:${contactName}\n` +
      `TEL;type=CELL;type=VOICE;waid=${contactNumber}:${contactNumber}\n` +
      'END:VCARD';
    
    const contactMessage = {
      contacts: {
        displayName: contactName,
        contacts: [{ vcard }]
      },
      ...options
    };
    
    return await sock.sendMessage(m.chat, contactMessage);
  } catch (error) {
    console.error('[REPLY ERROR] Failed to send contact reply:', error);
    throw error;
  }
}

/**
 * Reply with location
 * @param {object} sock 
 * @param {object} m 
 * @param {number} latitude 
 * @param {number} longitude 
 * @param {string} name 
 * @param {string} address 
 * @param {object} options - Additional options
 */
async function replyLocation(sock, m, latitude, longitude, name = '', address = '', options = {}) {
  try {
    if (!sock || !m || !m.chat) {
      throw new Error('Invalid socket or message object');
    }
    
    const locationMessage = {
      location: {
        degreesLatitude: latitude,
        degreesLongitude: longitude,
        name,
        address
      },
      ...options
    };
    
    return await sock.sendMessage(m.chat, locationMessage);
  } catch (error) {
    console.error('[REPLY ERROR] Failed to send location reply:', error);
    throw error;
  }
}

module.exports = {
  replyText,
  replyQuote,
  replyButtons,
  replyMedia,
  replyTemplateButtons,
  replyList,
  replyContact,
  replyLocation,
};