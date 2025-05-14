// test-timestamp-fix.js
// Test script to verify that our timestamp fixes are working

// Import the timestamp sanitizer middleware
const timestampSanitizer = require('./timestamp-middleware');

// Mock Express request and response objects
function createMockRequest(method, path, body) {
  return {
    method,
    path,
    body: JSON.parse(JSON.stringify(body)) // Deep clone
  };
}

function createMockResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn()
  };
}

// Test cases for timestamp sanitization
const testCases = [
  {
    name: 'Fix profil_latest_update with year only',
    request: createMockRequest('POST', '/api/panel_cost_cal_profil_degiskenler', {
      galvanizli_profil_kg_usd: 1.2,
      profil_latest_update: '2025'
    }),
    expectedField: 'profil_latest_update',
    expectedPattern: /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/
  },
  {
    name: 'Fix kayit_tarihi with year only',
    request: createMockRequest('POST', '/api/panel_cost_cal_panel_list', {
      manual_order: '401',
      kayit_tarihi: '2025'
    }),
    expectedField: 'kayit_tarihi',
    expectedPattern: /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/
  },
  {
    name: 'Handle null timestamp values',
    request: createMockRequest('POST', '/api/panel_cost_cal_profil_degiskenler', {
      galvanizli_profil_kg_usd: 1.2,
      profil_latest_update: null
    }),
    expectedField: 'profil_latest_update',
    expectedValue: null
  },
  {
    name: 'Handle ISO format timestamps',
    request: createMockRequest('POST', '/api/panel_cost_cal_profil_degiskenler', {
      galvanizli_profil_kg_usd: 1.2,
      profil_latest_update: '2023-01-01T12:30:45.000Z'
    }),
    expectedField: 'profil_latest_update',
    expectedPattern: /^2023-01-01 12:30:45$/
  }
];

// Run the tests
console.log('=== Testing Timestamp Sanitizer Middleware ===');

testCases.forEach(testCase => {
  console.log(`\nTest: ${testCase.name}`);
  console.log('Before:', JSON.stringify(testCase.request.body, null, 2));
  
  // Apply the middleware
  const next = jest.fn();
  timestampSanitizer(testCase.request, createMockResponse(), next);
  
  console.log('After:', JSON.stringify(testCase.request.body, null, 2));
  
  // Check the expected field
  const actualValue = testCase.request.body[testCase.expectedField];
  
  if (testCase.expectedPattern) {
    const matches = testCase.expectedPattern.test(actualValue);
    console.log(`Expected pattern: ${testCase.expectedPattern}`);
    console.log(`Actual value: ${actualValue}`);
    console.log(`Pattern match: ${matches ? 'PASS ✅' : 'FAIL ❌'}`);
  } else if ('expectedValue' in testCase) {
    const matches = actualValue === testCase.expectedValue;
    console.log(`Expected value: ${testCase.expectedValue}`);
    console.log(`Actual value: ${actualValue}`);
    console.log(`Exact match: ${matches ? 'PASS ✅' : 'FAIL ❌'}`);
  }
  
  // Check that next was called
  console.log(`Middleware chaining: ${next.mock.calls.length === 1 ? 'PASS ✅' : 'FAIL ❌'}`);
});

// Mock implementations for Jest functions since we're running standalone
function jest() {
  return {
    fn: () => {
      const mockFn = (...args) => {
        mockFn.mock.calls.push(args);
        return mockFn.mockReturnValue;
      };
      mockFn.mock = { calls: [] };
      mockFn.mockReturnThis = () => {
        mockFn.mockReturnValue = mockFn;
        return mockFn;
      };
      mockFn.mockReturnValue = undefined;
      return mockFn;
    }
  };
}

// If running this file directly, execute the tests
if (require.main === module) {
  console.log('\n=== Test Results Summary ===');
  console.log('All tests completed. Check the output above for any failed tests.');
  console.log('\nNote: In a real environment, you would use a testing framework like Jest.');
}

// Mock jest for standalone execution
if (typeof jest !== 'function') {
  global.jest = jest();
}