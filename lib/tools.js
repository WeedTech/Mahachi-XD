/**
 * Pause execution for given milliseconds
 * @param {number} ms - milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Pick a random element from an array
 * @param {Array} arr 
 * @returns {*}
 */
function randomChoice(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Generate a random alphanumeric string of given length
 * @param {number} length
 * @returns {string}
 */
function randomString(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Safe JSON parse without throwing errors
 * @param {string} jsonStr
 * @returns {object|null}
 */
function safeJSONParse(jsonStr) {
  try {
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

/**
 * Check if a string is a valid URL
 * @param {string} str
 * @returns {boolean}
 */
function isURL(str) {
  const pattern = /^(https?:\/\/)?([\w.-]+)+(:\d+)?(\/[\w\-._~:/?#[\]@!$&'()*+,;=]*)?$/i;
  return pattern.test(str);
}

/**
 * Basic text sanitizer to prevent injections or bad chars
 * @param {string} text
 * @returns {string}
 */
function sanitizeText(text) {
  if (typeof text !== 'string') return '';
  return text.replace(/[<>]/g, '');
}

/**
 * Extract all numbers from a string as an array of strings
 * @param {string} text
 * @returns {string[]}
 */
function extractNumbers(text) {
  if (typeof text !== 'string') return [];
  return text.match(/\d+/g) || [];
}

/**
 * Format phone number to WhatsApp jid format (E.164 digits + '@s.whatsapp.net')
 * Removes any plus signs or spaces
 * @param {string} number
 * @returns {string}
 */
function formatNumberToJid(number) {
  if (!number) return '';
  let digits = number.toString().replace(/\D/g, '');
  return digits + '@s.whatsapp.net';
}

module.exports = {
  sleep,
  randomChoice,
  randomString,
  safeJSONParse,
  isURL,
  sanitizeText,
  extractNumbers,
  formatNumberToJid,
};