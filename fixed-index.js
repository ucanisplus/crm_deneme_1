// Backend Express server for CRM application
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');

// Create Express app
const app = express();

// Configure middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// Configure PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// DEBUG: Timestamp fix middleware
app.use((req, res, next) => {
  if (req.method === 'POST' || req.method === 'PUT') {
    if (req.body) {
      // Replace all instances of "2025" with properly formatted timestamp
      deepFixTimestamps(req.body);
    }
  }
  next();
});

// Helper to fix timestamp values recursively
function deepFixTimestamps(obj) {
  if (!obj || typeof obj !== 'object') return;
  
  Object.entries(obj).forEach(([key, value]) => {
    // Identify timestamp fields
    if ((key.includes('_update') || key.includes('_tarihi') || key.endsWith('_at') || key.includes('Date'))) {
      if (value === "2025" || value === 2025) {
        // Fix problematic value
        obj[key] = "2025-01-01 00:00:00+00";
      } else if (typeof value === 'string' && value.includes('T') && value.includes('Z')) {
        // Convert ISO format to PostgreSQL format
        obj[key] = value.replace('T', ' ').replace('Z', '+00');
      }
    } else if (value && typeof value === 'object') {
      // Process nested objects/arrays
      deepFixTimestamps(value);
    }
  });
}

// Check for tables that need timestamp column upgrade
async function checkAndUpdateTimestampColumns() {
  try {
    console.log("Checking for timestamp columns that need to be upgraded to timestamptz");
    
    // Get all tables with timestamp columns
    const tablesRes = await pool.query(`
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE data_type = 'timestamp without time zone'
      AND table_name LIKE 'panel_cost_cal_%'
    `);
    
    if (tablesRes.rows.length === 0) {
      console.log("No timestamp columns that need upgrading");
      return;
    }
    
    console.log(`Found ${tablesRes.rows.length} columns to upgrade`);
    
    // Upgrade each column to timestamptz
    for (const row of tablesRes.rows) {
      const { table_name, column_name } = row;
      console.log(`Upgrading ${table_name}.${column_name} to timestamptz`);
      
      try {
        // Alter column type to timestamptz
        await pool.query(`
          ALTER TABLE ${table_name}
          ALTER COLUMN ${column_name} TYPE timestamp with time zone
        `);
        console.log(`Successfully upgraded ${table_name}.${column_name}`);
      } catch (err) {
        console.error(`Error upgrading ${table_name}.${column_name}:`, err);
      }
    }
  } catch (err) {
    console.error("Error checking for timestamp columns:", err);
  }
}

// Run database schema check on startup
checkAndUpdateTimestampColumns().catch(err => {
  console.error("Error during schema check:", err);
});

// API routes for authentication
app.post('/api/signup', async (req, res) => {
  const { username, password, role } = req.body;
  
  try {
    // Check if user already exists
    const userResult = await pool.query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );
    
    if (userResult.rows.length > 0) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create new user
    const newUser = await pool.query(
      'INSERT INTO users (username, password, role) VALUES ($1, $2, $3) RETURNING id, username, role',
      [username, hashedPassword, role || 'user']
    );
    
    // Generate JWT token
    const payload = {
      user: {
        id: newUser.rows[0].id,
        username: newUser.rows[0].username,
        role: newUser.rows[0].role
      }
    };
    
    jwt.sign(
      payload,
      'jwtSecret',
      { expiresIn: '1h' },
      (err, token) => {
        if (err) throw err;
        res.json({ token });
      }
    );
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  
  try {
    // Check if user exists
    const userResult = await pool.query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    const user = userResult.rows[0];
    
    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    // Generate JWT token
    const payload = {
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    };
    
    jwt.sign(
      payload,
      'jwtSecret',
      { expiresIn: '1h' },
      (err, token) => {
        if (err) throw err;
        res.json({ 
          token,
          user: {
            id: user.id,
            username: user.username,
            role: user.role
          }
        });
      }
    );
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Generic API route for database operations
app.get('/api/:table', async (req, res) => {
  const { table } = req.params;
  
  try {
    const result = await pool.query(`SELECT * FROM ${table}`);
    res.json(result.rows);
  } catch (err) {
    console.error(`Error fetching ${table}:`, err);
    res.status(500).json({ error: `${table} tablosu verileri alınamadı`, details: err.message });
  }
});

app.get('/api/:table/:id', async (req, res) => {
  const { table, id } = req.params;
  
  try {
    const result = await pool.query(`SELECT * FROM ${table} WHERE id = $1`, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Record not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error(`Error fetching ${table} with id ${id}:`, err);
    res.status(500).json({ error: `${table} tablosundan veri alınamadı`, details: err.message });
  }
});

app.post('/api/:table', async (req, res) => {
  const { table } = req.params;
  const data = req.body;
  
  // Ensure data is properly formatted for timestamps
  if (typeof data === 'object' && data !== null) {
    Object.keys(data).forEach(key => {
      if (key.includes('_update') || key.includes('_tarihi') || key.endsWith('_at') || key.includes('Date')) {
        if (data[key] === "2025" || data[key] === 2025) {
          // Replace bare "2025" with properly formatted timestamp
          data[key] = "2025-01-01 00:00:00+00";
        }
      }
    });
  }
  
  try {
    // Convert object keys and values to SQL query
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map((_, i) => `$${i + 1}`);
    
    // Build INSERT query
    const query = `
      INSERT INTO ${table} (${keys.join(', ')})
      VALUES (${placeholders.join(', ')})
      RETURNING *
    `;
    
    const result = await pool.query(query, values);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(`Error inserting into ${table}:`, err);
    res.status(500).json({ error: `${table} tablosuna veri eklenemedi`, details: err.message, code: err.code, stack: err.stack });
  }
});

app.put('/api/:table/:id', async (req, res) => {
  const { table, id } = req.params;
  const data = req.body;
  
  // Ensure data is properly formatted for timestamps
  if (typeof data === 'object' && data !== null) {
    Object.keys(data).forEach(key => {
      if (key.includes('_update') || key.includes('_tarihi') || key.endsWith('_at') || key.includes('Date')) {
        if (data[key] === "2025" || data[key] === 2025) {
          // Replace bare "2025" with properly formatted timestamp
          data[key] = "2025-01-01 00:00:00+00";
        }
      }
    });
  }
  
  try {
    // Convert object keys and values to SQL query
    const keys = Object.keys(data);
    const values = Object.values(data);
    const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
    
    // Build UPDATE query
    const query = `
      UPDATE ${table}
      SET ${setClause}
      WHERE id = $${keys.length + 1}
      RETURNING *
    `;
    
    const result = await pool.query(query, [...values, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Record not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error(`Error updating ${table} with id ${id}:`, err);
    res.status(500).json({ error: `${table} tablosundaki veri güncellenemedi`, details: err.message });
  }
});

app.delete('/api/:table/:id', async (req, res) => {
  const { table, id } = req.params;
  
  try {
    const result = await pool.query(`DELETE FROM ${table} WHERE id = $1 RETURNING *`, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Record not found' });
    }
    
    res.json({ message: 'Record deleted successfully', data: result.rows[0] });
  } catch (err) {
    console.error(`Error deleting ${table} with id ${id}:`, err);
    res.status(500).json({ error: `${table} tablosundan veri silinemedi`, details: err.message });
  }
});

// Special endpoint for triggering timestamp column upgrades
app.post('/api/admin/upgrade-timestamp-columns', async (req, res) => {
  try {
    await checkAndUpdateTimestampColumns();
    res.json({ message: 'Timestamp column upgrade complete' });
  } catch (err) {
    console.error('Error upgrading timestamp columns:', err);
    res.status(500).json({ error: 'Timestamp column upgrade failed', details: err.message });
  }
});

// Start the server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;