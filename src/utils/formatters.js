/**
 * Common formatting helpers for UI display.
 */

/**
 * Formats a phone number for display (e.g., +91 98765 43210).
 * @param {string} phone
 * @returns {string}
 */
export function formatPhoneNumber(phone) {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '').slice(-10);
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }
  return phone;
}

/**
 * Truncates text with ellipsis.
 * @param {string} text
 * @param {number} max
 * @returns {string}
 */
export function truncate(text, max = 24) {
  if (!text) return '';
  return text.length > max ? text.slice(0, max) + '...' : text;
}

