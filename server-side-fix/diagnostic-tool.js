// diagnostic-tool.js
// Tool to diagnose and fix timestamp issues in the PostgreSQL database

/**
 * This tool provides functions to:
 * 1. Test if a value will cause PostgreSQL timestamp errors
 * 2. Fix problematic timestamps directly in the database
 * 3. Run diagnostic queries to find problematic data
 */

// Connection information - replace with your actual values
const pgConfig = {
  user: 'your_username',
  host: 'your_host',
  database: 'your_database',
  password: 'your_password',
  port: 5432,
};

/**
 * Tests if a value will cause a PostgreSQL timestamp error
 * @param {any} value - Value to test
 * @returns {boolean} - True if the value will cause an error, false otherwise
 */
function willCauseTimestampError(value) {
  // Simple year check - this catches the "2025" case
  if (typeof value === 'string' && /^\d{4}$/.test(value)) {
    return true;
  }
  
  // Try to format as a proper timestamp
  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      // Not a valid date
      return true;
    }
    
    // Valid date can be formatted correctly
    return false;
  } catch (e) {
    // Any parsing error indicates potential problems
    return true;
  }
}

/**
 * Formats a timestamp safely for PostgreSQL
 * @param {any} value - Input value 
 * @returns {string} - Safe timestamp
 */
function formatSafeTimestamp(value) {
  // Handle year-only values like "2025"
  if (typeof value === 'string' && /^\d{4}$/.test(value)) {
    const year = parseInt(value);
    if (year >= 1900 && year <= 2100) {
      return `${year}-01-01 00:00:00`;
    }
  }
  
  // Try to parse as a date
  try {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      // Format: YYYY-MM-DD HH:MM:SS
      return date.toISOString().replace('T', ' ').split('.')[0];
    }
  } catch (e) {
    // Ignore parsing errors
  }
  
  // Fallback to current timestamp
  const now = new Date();
  return now.toISOString().replace('T', ' ').split('.')[0];
}

// Example usage for testing from command line:
if (require.main === module) {
  // Test some values
  const testValues = [
    '2025',
    '2023-01-01',
    '2023-01-01T12:30:45.000Z',
    '2023-01-01 12:30:45',
    'not a date',
    null,
    undefined,
    ''
  ];
  
  console.log('Timestamp Error Diagnostic Tool');
  console.log('==============================');
  
  for (const value of testValues) {
    const willError = willCauseTimestampError(value);
    const fixedValue = formatSafeTimestamp(value);
    
    console.log(`Value: ${value}`);
    console.log(`Will cause error: ${willError}`);
    console.log(`Fixed value: ${fixedValue}`);
    console.log('------------------------------');
  }
}

// In a real environment, you would add functions to:
// 1. Connect to the database
// 2. Run diagnostic queries to find problematic rows
// 3. Fix the timestamps directly in the database

module.exports = {
  willCauseTimestampError,
  formatSafeTimestamp
};