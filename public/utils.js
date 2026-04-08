/**
 * @module utils
 * @spec: frontend-utilities
 * 
 * Shared utility functions for the frontend.
 */

/**
 * Debounce function calls
 */
export function debounce(fn, delay = 300) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Format bytes to human-readable size
 */
export function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Format date to readable string
 */
export function formatDate(date, format = 'short') {
  const d = new Date(date);
  if (format === 'short') {
    return d.toLocaleDateString();
  }
  if (format === 'long') {
    return d.toLocaleString();
  }
  if (format === 'time') {
    return d.toLocaleTimeString();
  }
  return d.toISOString();
}

/**
 * Format duration in milliseconds to readable string
 */
export function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

/**
 * Format JSON for display
 */
export function formatJson(obj, indent = 2) {
  return JSON.stringify(obj, null, indent);
}

/**
 * Parse JSON safely
 */
export function parseJson(str, fallback = null) {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

/**
 * Truncate string to max length
 */
export function truncate(str, maxLength = 50) {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
}

/**
 * Highlight text in HTML
 */
export function highlight(text, query) {
  if (!query) return text;
  const regex = new RegExp(`(${query})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}

/**
 * Copy to clipboard
 */
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('[Utils] Copy failed:', err);
    return false;
  }
}

/**
 * Get URL parameter
 */
export function getUrlParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

/**
 * Set URL parameter without reload
 */
export function setUrlParam(name, value) {
  const params = new URLSearchParams(window.location.search);
  params.set(name, value);
  window.history.replaceState({}, '', `?${params.toString()}`);
}

/**
 * Validate email
 */
export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Validate JSON
 */
export function isValidJson(str) {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

/**
 * Deep clone object
 */
export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Merge objects
 */
export function merge(target, ...sources) {
  sources.forEach(source => {
    Object.assign(target, source);
  });
  return target;
}

export default {
  debounce,
  formatBytes,
  formatDate,
  formatDuration,
  formatJson,
  parseJson,
  truncate,
  highlight,
  copyToClipboard,
  getUrlParam,
  setUrlParam,
  isValidEmail,
  isValidJson,
  deepClone,
  merge,
};
