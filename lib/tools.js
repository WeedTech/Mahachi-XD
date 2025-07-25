/**
 * Pause execution for given milliseconds
 * @param {number} ms - milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  if (typeof ms !== 'number' || ms < 0) {
    return Promise.resolve();
  }
  return new Promise(resolve => setTimeout(resolve, Math.max(0, ms)));
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
 * Pick multiple random elements from an array
 * @param {Array} arr 
 * @param {number} count 
 * @returns {Array}
 */
function randomChoices(arr, count = 1) {
  if (!Array.isArray(arr) || arr.length === 0 || count <= 0) return [];
  
  const result = [];
  const available = [...arr];
  
  for (let i = 0; i < Math.min(count, arr.length); i++) {
    const randomIndex = Math.floor(Math.random() * available.length);
    result.push(available.splice(randomIndex, 1)[0]);
  }
  
  return result;
}

/**
 * Generate a random alphanumeric string of given length
 * @param {number} length
 * @returns {string}
 */
function randomString(length = 8) {
  if (typeof length !== 'number' || length <= 0) return '';
  
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate a random hexadecimal string
 * @param {number} length
 * @returns {string}
 */
function randomHex(length = 8) {
  if (typeof length !== 'number' || length <= 0) return '';
  
  const chars = '0123456789abcdef';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate a UUID v4
 * @returns {string}
 */
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Safe JSON parse without throwing errors
 * @param {string} jsonStr
 * @param {*} defaultValue
 * @returns {object|null}
 */
function safeJSONParse(jsonStr, defaultValue = null) {
  if (typeof jsonStr !== 'string') return defaultValue;
  
  try {
    return JSON.parse(jsonStr);
  } catch {
    return defaultValue;
  }
}

/**
 * Safe JSON stringify with error handling
 * @param {*} obj
 * @param {*} defaultValue
 * @returns {string|null}
 */
function safeJSONStringify(obj, defaultValue = null) {
  try {
    return JSON.stringify(obj);
  } catch {
    return defaultValue;
  }
}

/**
 * Check if a string is a valid URL
 * @param {string} str
 * @returns {boolean}
 */
function isURL(str) {
  if (typeof str !== 'string' || str.length === 0) return false;
  
  try {
    const url = new URL(str.startsWith('http') ? str : `http://${str}`);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Check if a string is a valid email
 * @param {string} str
 * @returns {boolean}
 */
function isEmail(str) {
  if (typeof str !== 'string') return false;
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(str);
}

/**
 * Basic text sanitizer to prevent injections or bad chars
 * @param {string} text
 * @param {object} options
 * @returns {string}
 */
function sanitizeText(text, options = {}) {
  if (typeof text !== 'string') return '';
  
  const {
    removeHtml = true,
    removeScripts = true,
    maxLength = 0,
    allowedChars = null
  } = options;
  
  let sanitized = text;
  
  if (removeHtml) {
    sanitized = sanitized.replace(/<[^>]*>/g, '');
  }
  
  if (removeScripts) {
    sanitized = sanitized.replace(/<script[^>]*>.*?<\/script>/gi, '');
    sanitized = sanitized.replace(/javascript:/gi, '');
    sanitized = sanitized.replace(/on\w+="[^"]*"/gi, '');
  }
  
  // Remove potentially dangerous characters
  sanitized = sanitized.replace(/[<>]/g, '');
  
  // Filter by allowed characters if specified
  if (allowedChars && typeof allowedChars === 'string') {
    const allowedRegex = new RegExp(`[^${allowedChars}]`, 'g');
    sanitized = sanitized.replace(allowedRegex, '');
  }
  
  // Limit length if specified
  if (maxLength > 0 && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  return sanitized.trim();
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
 * Extract all numbers from a string as an array of numbers
 * @param {string} text
 * @returns {number[]}
 */
function extractNumbersAsInt(text) {
  if (typeof text !== 'string') return [];
  const matches = text.match(/\d+/g);
  return matches ? matches.map(num => parseInt(num, 10)) : [];
}

/**
 * Format phone number to WhatsApp jid format (E.164 digits + '@s.whatsapp.net')
 * Removes any plus signs or spaces
 * @param {string} number
 * @returns {string}
 */
function formatNumberToJid(number) {
  if (!number) return '';
  
  // Handle different input types
  let numStr = String(number);
  
  // Remove all non-digit characters except +
  numStr = numStr.replace(/[^\d+]/g, '');
  
  // Handle country code
  if (numStr.startsWith('+')) {
    numStr = numStr.substring(1);
  }
  
  // Validate that we have digits
  if (!/^\d+$/.test(numStr) || numStr.length < 7) {
    return '';
  }
  
  return numStr + '@s.whatsapp.net';
}

/**
 * Validate if a string is a valid phone number format
 * @param {string} number
 * @returns {boolean}
 */
function isValidPhoneNumber(number) {
  if (typeof number !== 'string') return false;
  
  // Remove all non-digit characters
  const digits = number.replace(/\D/g, '');
  
  // Basic validation: 7-15 digits
  return digits.length >= 7 && digits.length <= 15;
}

/**
 * Shuffle an array in place
 * @param {Array} array
 * @returns {Array}
 */
function shuffleArray(array) {
  if (!Array.isArray(array)) return [];
  
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Deep clone an object or array
 * @param {*} obj
 * @returns {*}
 */
function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj);
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  if (obj instanceof Object) {
    const clonedObj = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
  return obj;
}

/**
 * Merge two objects deeply
 * @param {object} target
 * @param {object} source
 * @returns {object}
 */
function deepMerge(target, source) {
  const output = { ...target };
  
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key] });
        } else {
          output[key] = deepMerge(target[key], source[key]);
        }
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }
  
  return output;
}

/**
 * Check if value is a plain object
 * @param {*} obj
 * @returns {boolean}
 */
function isObject(obj) {
  return obj !== null && typeof obj === 'object' && !Array.isArray(obj);
}

/**
 * Convert string to slug format
 * @param {string} str
 * @returns {string}
 */
function toSlug(str) {
  if (typeof str !== 'string') return '';
  
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Calculate age from birth date
 * @param {string|Date} birthDate
 * @returns {number}
 */
function calculateAge(birthDate) {
  const today = new Date();
  const birth = new Date(birthDate);
  
  if (isNaN(birth.getTime())) return 0;
  
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return Math.max(0, age);
}

module.exports = {
  sleep,
  randomChoice,
  randomChoices,
  randomString,
  randomHex,
  generateUUID,
  safeJSONParse,
  safeJSONStringify,
  isURL,
  isEmail,
  sanitizeText,
  extractNumbers,
  extractNumbersAsInt,
  formatNumberToJid,
  isValidPhoneNumber,
  shuffleArray,
  deepClone,
  deepMerge,
  toSlug,
  calculateAge,
};