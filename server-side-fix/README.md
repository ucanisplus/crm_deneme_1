# Server-Side Timestamp Fix

This directory contains middleware and utility functions to fix the PostgreSQL timestamp issue on the server side.

## The Problem

The application is experiencing 500 errors when trying to save data to the database in the PanelCitHesaplama component. The specific error is:

```
invalid input syntax for type timestamp: "2025"
```

This error occurs when saving data to the `panel_cost_cal_profil_degiskenler` and `panel_cost_cal_panel_list` tables, specifically with the `profil_latest_update` and `kayit_tarihi` fields.

## The Solution

This solution provides a server-side middleware that sanitizes all incoming requests to ensure timestamp fields are properly formatted for PostgreSQL before they reach the database.

## How to Implement

1. Copy the `timestamp-middleware.js` file to your backend project.

2. Add the middleware to your Express application:

```javascript
const express = require('express');
const timestampSanitizer = require('./timestamp-middleware');

const app = express();

// Add the middleware before your route handlers
app.use(express.json());
app.use(timestampSanitizer);

// Your routes...
app.post('/api/panel_cost_cal_profil_degiskenler', (req, res) => {
  // The req.body now has properly formatted timestamps
  // No need for additional fixes here
});
```

3. This middleware will automatically:
   - Detect and fix timestamp fields based on naming conventions
   - Apply specific fixes for the problematic fields (`profil_latest_update` and `kayit_tarihi`)
   - Handle various timestamp formats and convert them to PostgreSQL's expected format
   - Log when fixes are applied

## How It Works

The middleware:

1. Intercepts all POST and PUT requests
2. Identifies potential timestamp fields by naming conventions
3. Applies extra attention to known problematic endpoints
4. Formats timestamps properly for PostgreSQL (YYYY-MM-DD HH:MM:SS)
5. Provides detailed logging for debugging

## Notes

This server-side solution works in conjunction with the client-side fixes already implemented in the frontend code. Having both client-side and server-side validation provides multiple layers of protection against timestamp format issues.