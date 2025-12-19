/**
 * ═══════════════════════════════════════════════════════════════════════
 * K&L RECYCLING CRM - UTILITIES & HELPERS
 * Common functions used across all modules
 * December 18, 2025 - 3:14 PM CST
 * ═══════════════════════════════════════════════════════════════════════
 */

/**
 * Utility object containing all helper functions
 */
const Utils = {
  /**
   * Get the active spreadsheet
   */
  getSpreadsheet: function() {
    return SpreadsheetApp.getActiveSpreadsheet();
  },

  /**
   * Normalize outcome to standard format
   */
  normalizeOutcome: function(outcome) {
    if (!outcome) return { stage: 'Prospect', status: 'Cold' };
    const key = Object.keys(LOGIC_MAP).find(k => k.toLowerCase() === String(outcome).toLowerCase());
    return key ? LOGIC_MAP[key] : { stage: 'Prospect', status: 'Cold' };
  },

  /**
   * Log error to ErrorLog sheet
   */
  logError: function(functionName, error) {
    console.error(`[${functionName}] Error:`, error);
    try {
      const ss = Utils.getSpreadsheet();
      const errorSheet = ss.getSheetByName(SHEET_NAMES.errorLog);
      if (errorSheet) {
        errorSheet.appendRow([
          new Date(),
          functionName,
          error.toString(),
          Session.getActiveUser().getEmail()
        ]);
      }
    } catch (e) {
      console.error('Failed to log error:', e);
    }
  },

  /**
   * Find column index by header name with fuzzy matching
   */
  safeGetCol: function(headers, candidates) {
    if (!headers || !Array.isArray(headers)) return -1;
    const candArray = Array.isArray(candidates) ? candidates : [candidates];
    
    // Exact matches first
    for (let cand of candArray) {
      const idx = headers.findIndex(h => h && h.toString().toLowerCase().trim() === cand.toLowerCase().trim());
      if (idx !== -1) return idx;
    }
    
    // Fuzzy matches
    for (let cand of candArray) {
      const idx = headers.findIndex(h => {
        const header = (h || '').toString().toLowerCase().trim();
        const candidate = cand.toLowerCase().trim();
        if (header === candidate) return true;
        const words = header.split(/\s+/);
        return words.some(word => word === candidate);
      });
      if (idx !== -1) return idx;
    }
    
    return -1;
  },

  /**
   * Calculate distance between two points using Haversine formula
   * @param {number} lat1 - Latitude of point 1
   * @param {number} lon1 - Longitude of point 1
   * @param {number} lat2 - Latitude of point 2
   * @param {number} lon2 - Longitude of point 2
   * @returns {number} Distance in miles
   */
  calculateDistance: function(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
    
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  },

  /**
   * Parse date safely
   */
  parseDate: function(dateValue) {
    if (!dateValue) return null;
    
    if (dateValue instanceof Date) {
      return dateValue;
    }
    
    if (typeof dateValue === 'string') {
      const parsed = new Date(dateValue);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    
    if (typeof dateValue === 'number') {
      // Excel serial number
      return new Date((dateValue - 25569) * 86400 * 1000);
    }
    
    return null;
  },

  /**
   * Format date for display
   */
  formatDate: function(date, format = 'MM/dd/yyyy') {
    if (!date) return '';
    
    const d = Utils.parseDate(date);
    if (!d) return '';
    
    try {
      return Utilities.formatDate(d, Session.getScriptTimeZone(), format);
    } catch (error) {
      console.error('Error formatting date:', error);
      return '';
    }
  },

  /**
   * Calculate days between dates
   */
  daysBetween: function(date1, date2) {
    const d1 = Utils.parseDate(date1);
    const d2 = Utils.parseDate(date2);
    
    if (!d1 || !d2) return null;
    
    const diffTime = Math.abs(d2 - d1);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  },

  /**
   * Generate unique ID with prefix
   */
  generateId: function(prefix = 'LID') {
    return prefix + '-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
  },

  /**
   * Get current user email
   */
  getCurrentUserEmail: function() {
    return Session.getActiveUser().getEmail() || 'unknown@klrecycling.com';
  },

  /**
   * Log activity to Activity Log sheet
   */
  logActivity: function(action, details = {}) {
    try {
      const ss = Utils.getSpreadsheet();
      let logSheet = ss.getSheetByName(SHEET_NAMES.activityLog);
      
      if (!logSheet) {
        logSheet = ss.insertSheet(SHEET_NAMES.activityLog);
        logSheet.hideSheet();
        logSheet.appendRow(['Timestamp', 'User', 'Action', 'Details']);
      }
      
      logSheet.appendRow([
        new Date(),
        Utils.getCurrentUserEmail(),
        action,
        JSON.stringify(details)
      ]);
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  },

  /**
   * Validate required fields for activity submission
   */
  validateActivityData: function(data) {
    const errors = [];
    
    if (!data.company || data.company.trim() === '') {
      errors.push('Company name is required');
    }
    
    if (!data.outcome || data.outcome.trim() === '') {
      errors.push('Outcome is required');
    }
    
    if (data.outcome && !LOGIC_MAP[data.outcome]) {
      errors.push('Invalid outcome selected');
    }
    
    return {
      valid: errors.length === 0,
      errors: errors
    };
  },

  /**
   * Get outcome configuration
   */
  getOutcomeConfig: function(outcome) {
    const mapping = LOGIC_MAP;
    return mapping[outcome] || { stage: 'Prospect', status: 'Cold', color: '#6C757D' };
  },

  /**
   * Get follow-up days for outcome
   */
  getFollowUpDaysForOutcome: function(outcome) {
    const daysMap = DEFAULT_FOLLOW_UP_DAYS;
    const outcomeKey = outcome.toLowerCase().replace(/\s+/g, '');
    
    // Map outcomes to keys
    const keyMapping = {
      'won': 'won',
      'interested': 'interested',
      'hasvendor': 'hasVendor',
      'followup': 'followUp',
      'notinterested': 'notInterested',
      'noscrap': 'noScrap',
      'reschedule': 'reschedule',
      'sendinfo': 'sendInfo',
      'leftmessage': 'leftMessage',
      'pricetoohigh': 'priceTooHigh',
      'badtiming': 'badTiming'
    };
    
    const key = keyMapping[outcomeKey] || 'followUp';
    return daysMap[key] || 30;
  },

  /**
   * Detect competitor mentions in text
   */
  detectCompetitor: function(text) {
    if (!text) return null;
    
    const textLower = text.toLowerCase();
    const competitors = COMPETITORS;
    
    for (const competitor of competitors) {
      if (textLower.includes(competitor.toLowerCase())) {
        return competitor;
      }
    }
    
    return null;
  },

  /**
   * Auto-suggest follow-up based on outcome
   */
  autoSuggestFollowUp: function(outcome) {
    const days = Utils.getFollowUpDaysForOutcome(outcome);
    return { days: days };
  },

  /**
   * Clean and validate phone number
   */
  cleanPhoneNumber: function(phone) {
    if (!phone) return '';
    return phone.toString().replace(/\D/g, '');
  },

  /**
   * Clean and validate email address
   */
  cleanEmail: function(email) {
    if (!email) return '';
    return email.toString().trim().toLowerCase();
  },

  /**
   * Check if email is valid format
   */
  isValidEmail: function(email) {
    if (!email) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  /**
   * Truncate text to specified length
   */
  truncateText: function(text, maxLength) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  },

  /**
   * Capitalize first letter of each word
   */
  titleCase: function(str) {
    if (!str) return '';
    return str.replace(/\w\S*/g, function(txt) {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
  },

  /**
   * Format phone number for display
   */
  formatPhoneNumber: function(phone) {
    const cleaned = Utils.cleanPhoneNumber(phone);
    if (cleaned.length === 10) {
      return `(${cleaned.substring(0, 3)}) ${cleaned.substring(3, 6)}-${cleaned.substring(6)}`;
    }
    return phone;
  },

  /**
   * Create Google Maps URL for route
   */
  createMapsUrl: function(origin, destination, waypoints = []) {
    const baseUrl = 'https://www.google.com/maps/dir/?api=1';
    const params = new URLSearchParams();
    
    params.append('origin', origin);
    params.append('destination', destination);
    params.append('travelmode', 'driving');
    
    if (waypoints.length > 0) {
      params.append('waypoints', waypoints.join('|'));
    }
    
    return `${baseUrl}&${params.toString()}`;
  },

  /**
   * Sleep/delay function for testing
   */
  sleep: function(ms) {
    Utilities.sleep(ms);
  },

  /**
   * Retry function with exponential backoff
   */
  retry: function(fn, maxAttempts = 3, delay = 1000) {
    let attempts = 0;
    while (attempts < maxAttempts) {
      try {
        return fn();
      } catch (error) {
        attempts++;
        if (attempts >= maxAttempts) throw error;
        Utils.sleep(delay * Math.pow(2, attempts - 1));
      }
    }
  }
};

// Legacy function names for backward compatibility
function generateId(prefix) {
  return Utils.generateId(prefix);
}

function getCurrentUserEmail() {
  return Utils.getCurrentUserEmail();
}

function formatDate(date) {
  return Utils.formatDate(date);
}

function logActivity(action, details) {
  Utils.logActivity(action, details);
}

function getOutcomeConfig(outcome) {
  return Utils.getOutcomeConfig(outcome);
}

function getFollowUpDaysForOutcome(outcome) {
  return Utils.getFollowUpDaysForOutcome(outcome);
}

function autoSuggestFollowUp(outcome) {
  return Utils.autoSuggestFollowUp(outcome);
}

function detectCompetitor(text) {
  return Utils.detectCompetitor(text);
}
