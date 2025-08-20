// Backend API endpoint for mesh_type_configs
// This should be added to your Express.js backend

const express = require('express');
const { Pool } = require('pg');
const router = express.Router();

// Database connection (adjust according to your backend setup)
const pool = new Pool({
  // Your database connection config
});

// GET /api/mesh_type_configs - Get all mesh type configurations
router.get('/mesh_type_configs', async (req, res) => {
  try {
    const { hasir_tipi, type } = req.query;
    
    let query = 'SELECT * FROM mesh_type_configs';
    let params = [];
    const conditions = [];

    if (hasir_tipi) {
      conditions.push('hasir_tipi = $' + (params.length + 1));
      params.push(hasir_tipi);
    }

    if (type) {
      conditions.push('type = $' + (params.length + 1));
      params.push(type.toUpperCase());
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY type, hasir_tipi';

    const result = await pool.query(query, params);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching mesh type configs:', error);
    res.status(500).json({ 
      error: 'Failed to fetch mesh type configurations',
      details: error.message 
    });
  }
});

// GET /api/mesh_type_configs/:hasir_tipi - Get specific mesh type configuration
router.get('/mesh_type_configs/:hasir_tipi', async (req, res) => {
  try {
    const { hasir_tipi } = req.params;
    
    const query = 'SELECT * FROM mesh_type_configs WHERE hasir_tipi = $1';
    const result = await pool.query(query, [hasir_tipi]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Mesh type configuration not found',
        hasir_tipi 
      });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching mesh type config:', error);
    res.status(500).json({ 
      error: 'Failed to fetch mesh type configuration',
      details: error.message 
    });
  }
});

// POST /api/mesh_type_configs - Create new mesh type configuration
router.post('/mesh_type_configs', async (req, res) => {
  try {
    const { hasirTipi, boyCap, enCap, boyAralik, enAralik, type, description } = req.body;
    
    // Validation
    if (!hasirTipi || !boyCap || !enCap || !boyAralik || !enAralik || !type) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['hasirTipi', 'boyCap', 'enCap', 'boyAralik', 'enAralik', 'type']
      });
    }

    // Validate numeric values
    if (isNaN(boyCap) || isNaN(enCap) || isNaN(boyAralik) || isNaN(enAralik)) {
      return res.status(400).json({ 
        error: 'boyCap, enCap, boyAralik, and enAralik must be numeric values'
      });
    }

    // Validate ranges
    if (boyCap < 3 || boyCap > 20 || enCap < 3 || enCap > 20) {
      return res.status(400).json({ 
        error: 'boyCap and enCap must be between 3 and 20 mm'
      });
    }

    if (boyAralik < 5 || boyAralik > 100 || enAralik < 5 || enAralik > 100) {
      return res.status(400).json({ 
        error: 'boyAralik and enAralik must be between 5 and 100 cm'
      });
    }

    const query = `
      INSERT INTO mesh_type_configs 
      (hasir_tipi, boy_cap, en_cap, boy_aralik, en_aralik, type, description)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const values = [hasirTipi, boyCap, enCap, boyAralik, enAralik, type.toUpperCase(), description || null];
    const result = await pool.query(query, values);
    
    res.status(201).json({
      message: 'Mesh type configuration created successfully',
      data: result.rows[0]
    });
  } catch (error) {
    if (error.code === '23505') { // Unique constraint violation
      return res.status(409).json({ 
        error: 'Mesh type configuration already exists',
        hasir_tipi: req.body.hasirTipi
      });
    }
    
    console.error('Error creating mesh type config:', error);
    res.status(500).json({ 
      error: 'Failed to create mesh type configuration',
      details: error.message 
    });
  }
});

// PUT /api/mesh_type_configs/:hasir_tipi - Update existing mesh type configuration
router.put('/mesh_type_configs/:hasir_tipi', async (req, res) => {
  try {
    const { hasir_tipi } = req.params;
    const { boyCap, enCap, boyAralik, enAralik, type, description } = req.body;
    
    // Validation
    if (!boyCap || !enCap || !boyAralik || !enAralik || !type) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['boyCap', 'enCap', 'boyAralik', 'enAralik', 'type']
      });
    }

    // Validate numeric values
    if (isNaN(boyCap) || isNaN(enCap) || isNaN(boyAralik) || isNaN(enAralik)) {
      return res.status(400).json({ 
        error: 'boyCap, enCap, boyAralik, and enAralik must be numeric values'
      });
    }

    const query = `
      UPDATE mesh_type_configs 
      SET boy_cap = $1, en_cap = $2, boy_aralik = $3, en_aralik = $4, 
          type = $5, description = $6
      WHERE hasir_tipi = $7
      RETURNING *
    `;
    
    const values = [boyCap, enCap, boyAralik, enAralik, type.toUpperCase(), description || null, hasir_tipi];
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Mesh type configuration not found',
        hasir_tipi 
      });
    }
    
    res.json({
      message: 'Mesh type configuration updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating mesh type config:', error);
    res.status(500).json({ 
      error: 'Failed to update mesh type configuration',
      details: error.message 
    });
  }
});

// DELETE /api/mesh_type_configs/:hasir_tipi - Delete mesh type configuration
router.delete('/mesh_type_configs/:hasir_tipi', async (req, res) => {
  try {
    const { hasir_tipi } = req.params;
    
    const query = 'DELETE FROM mesh_type_configs WHERE hasir_tipi = $1 RETURNING *';
    const result = await pool.query(query, [hasir_tipi]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Mesh type configuration not found',
        hasir_tipi 
      });
    }
    
    res.json({
      message: 'Mesh type configuration deleted successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error deleting mesh type config:', error);
    res.status(500).json({ 
      error: 'Failed to delete mesh type configuration',
      details: error.message 
    });
  }
});

// GET /api/mesh_type_configs/search/:pattern - Search mesh types by pattern
router.get('/mesh_type_configs/search/:pattern', async (req, res) => {
  try {
    const { pattern } = req.params;
    
    const query = `
      SELECT * FROM mesh_type_configs 
      WHERE hasir_tipi ILIKE $1 
      ORDER BY hasir_tipi
      LIMIT 50
    `;
    
    const result = await pool.query(query, [`%${pattern}%`]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error searching mesh type configs:', error);
    res.status(500).json({ 
      error: 'Failed to search mesh type configurations',
      details: error.message 
    });
  }
});

module.exports = router;