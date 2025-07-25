/**
 * Convert seconds to HH:MM:SS format
 * @param {number} seconds
 * @returns {string}
 */
function formatDuration(seconds) {
  if (typeof seconds !== 'number' || isNaN(seconds) || seconds < 0) {
    return '00:00:00';
  }
  
  seconds = Math.floor(Number(seconds));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  
  const hh = h < 10 ? "0" + h : h;
  const mm = m < 10 ? "0" + m : m;
  const ss = s < 10 ? "0" + s : s;
  
  return `${hh}:${mm}:${ss}`;
}

/**
 * Format bytes to human readable string
 * @param {number} bytes
 * @param {number} decimals
 * @returns {string}
 */
function formatBytes(bytes, decimals = 2) {
  if (typeof bytes !== 'number' || bytes < 0 || isNaN(bytes)) {
    return '0 Bytes';
  }
  
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const val = bytes / Math.pow(k, i);
  
  return `${val.toFixed(dm)} ${sizes[i]}`;
}

/**
 * Add commas to number (e.g. 1234567 => 1,234,567)
 * @param {number|string} num
 * @returns {string}
 */
function formatNumber(num) {
  if (num === null || num === undefined) return '0';
  
  const number = typeof num === 'string' ? parseFloat(num) : num;
  
  if (typeof number !== 'number' || isNaN(number)) {
    return String(num);
  }
  
  return number.toLocaleString();
}

/**
 * Capitalize first letter of a string
 * @param {string} str
 * @returns {string}
 */
function capitalize(str) {
  if (typeof str !== 'string' || str.length === 0) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Capitalize first letter of each word
 * @param {string} str
 * @returns {string}
 */
function capitalizeWords(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/\b\w/g, char => char.toUpperCase());
}

/**
 * Format Date object to YYYY-MM-DD HH:mm:ss
 * @param {Date} date
 * @returns {string}
 */
function formatDateTime(date) {
  if (!(date instanceof Date) || isNaN(date)) return '';
  
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  
  const hh = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}

/**
 * Format Date object to relative time (e.g. "2 hours ago")
 * @param {Date} date
 * @returns {string}
 */
function formatRelativeTime(date) {
  if (!(date instanceof Date) || isNaN(date)) return '';
  
  const now = new Date();
  const diffMs = now - date;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffSecs < 60) {
    return `${diffSecs} second${diffSecs !== 1 ? 's' : ''} ago`;
  } else if (diffMins < 60) {
    return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  } else {
    return formatDateTime(date);
  }
}

/**
 * Truncate string with ellipsis
 * @param {string} str
 * @param {number} length
 * @param {string} suffix
 * @returns {string}
 */
function truncate(str, length, suffix = '...') {
  if (typeof str !== 'string') return '';
  if (str.length <= length) return str;
  return str.substring(0, length) + suffix;
}

/**
 * Format percentage
 * @param {number} value
 * @param {number} total
 * @param {number} decimals
 * @returns {string}
 */
function formatPercentage(value, total, decimals = 2) {
  if (typeof value !== 'number' || typeof total !== 'number' || total === 0) {
    return '0%';
  }
  
  const percentage = (value / total) * 100;
  return `${percentage.toFixed(decimals)}%`;
}

/**
 * Pad number with leading zeros
 * @param {number} num
 * @param {number} size
 * @returns {string}
 */
function padNumber(num, size) {
  if (typeof num !== 'number') return '';
  const s = String(num);
  return s.padStart(size, '0');
}

/**
 * Format phone number
 * @param {string} phoneNumber
 * @returns {string}
 */
function formatPhoneNumber(phoneNumber) {
  if (typeof phoneNumber !== 'string') return '';
  
  // Remove all non-digit characters
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // Format based on length
  if (cleaned.length === 10) {
    // US format: (123) 456-7890
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  } else if (cleaned.length === 11 && cleaned[0] === '1') {
    // US format with country code: +1 (123) 456-7890
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  
  return cleaned;
}

module.exports = {
  formatDuration,
  formatBytes,
  formatNumber,
  capitalize,
  capitalizeWords,
  formatDateTime,
  formatRelativeTime,
  truncate,
  formatPercentage,
  padNumber,
  formatPhoneNumber,
};