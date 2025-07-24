/**
 * Convert seconds to HH:MM:SS format
 * @param {number} seconds
 * @returns {string}
 */
function formatDuration(seconds) {
  seconds = Number(seconds);
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
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
  
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
  if (typeof num === 'number') {
    return num.toLocaleString();
  }
  if (typeof num === 'string') {
    return Number(num).toLocaleString();
  }
  return String(num);
}

/**
 * Capitalize first letter of a string
 * @param {string} str
 * @returns {string}
 */
function capitalize(str) {
  if (typeof str !== 'string') return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Format Date object to YYYY-MM-DD HH:mm:ss
 * @param {Date} date
 * @returns {string}
 */
function formatDateTime(date) {
  if (!(date instanceof Date)) return '';
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  
  const hh = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}

module.exports = {
  formatDuration,
  formatBytes,
  formatNumber,
  capitalize,
  formatDateTime,
};