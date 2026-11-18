/**
 * Hour adjustments system
 * Allows admins to add/subtract hours for drivers
 * Stored in JSON file or could be moved to database
 */

const fs = require('fs');
const path = require('path');

const ADJUSTMENTS_FILE = process.env.ADJUSTMENTS_FILE || path.join(process.cwd(), 'data', 'adjustments.json');

function isValidUsername(username) {
  return typeof username === 'string' && username.trim().length > 0 &&
    username.length <= 256 && !['__proto__', 'constructor', 'prototype'].includes(username);
}

/**
 * Get all adjustments
 * @returns {Object} Adjustments object { username: { month: hours } }
 */
function getAdjustments() {
  try {
    // Check if adjustments from environment variable
    if (process.env.ADJUSTMENTS_JSON) {
      return JSON.parse(process.env.ADJUSTMENTS_JSON);
    }

    // Try to read from file
    if (fs.existsSync(ADJUSTMENTS_FILE)) {
      const data = fs.readFileSync(ADJUSTMENTS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error reading adjustments:', error);
  }

  return {};
}

/**
 * Save adjustments
 * @param {Object} adjustments - Adjustments object
 */
function saveAdjustments(adjustments) {
  try {
    // Ensure directory exists
    const dir = path.dirname(ADJUSTMENTS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(ADJUSTMENTS_FILE, JSON.stringify(adjustments, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving adjustments:', error);
    return false;
  }
}

/**
 * Get adjustment for a specific driver and month
 * @param {string} username - Driver username
 * @param {string} month - Month in YYYY-MM format
 * @returns {number} Adjustment hours (can be negative)
 */
function getAdjustment(username, month) {
  if (!isValidUsername(username) || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return 0;
  const adjustments = getAdjustments();
  return Object.hasOwn(adjustments, username) ? adjustments[username]?.[month] || 0 : 0;
}

/**
 * Set adjustment for a driver and month
 * @param {string} username - Driver username
 * @param {string} month - Month in YYYY-MM format
 * @param {number} hours - Adjustment hours (can be negative)
 * @param {string} reason - Reason for adjustment
 * @returns {boolean} Success
 */
function setAdjustment(username, month, hours, reason = '') {
  if (!isValidUsername(username) || typeof month !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || !Number.isFinite(Number(hours))) {
    throw new TypeError('Invalid adjustment input');
  }
  const adjustments = getAdjustments();

  if (!Object.hasOwn(adjustments, username)) {
    adjustments[username] = {};
  }

  adjustments[username][month] = {
    hours: parseFloat(hours),
    reason,
    updatedAt: new Date().toISOString()
  };

  return saveAdjustments(adjustments);
}

/**
 * Apply adjustments to driver hours
 * @param {string} username - Driver username
 * @param {string} month - Month in YYYY-MM format
 * @param {number} calculatedHours - Hours calculated from routes
 * @returns {Object} { hours, adjustment, reason }
 */
function applyAdjustment(username, month, calculatedHours) {
  const adjustment = getAdjustment(username, month);

  if (typeof adjustment === 'object' && adjustment.hours !== undefined) {
    return {
      hours: calculatedHours + adjustment.hours,
      adjustment: adjustment.hours,
      reason: adjustment.reason || '',
      updatedAt: adjustment.updatedAt
    };
  }

  return {
    hours: calculatedHours,
    adjustment: 0,
    reason: '',
    updatedAt: null
  };
}

module.exports = {
  isValidUsername,
  getAdjustments,
  getAdjustment,
  setAdjustment,
  applyAdjustment
};
