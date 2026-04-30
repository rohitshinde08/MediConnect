// ============================================
// Specialization Routes
// CRUD operations for medical specializations
// ============================================

const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// ============================================
// Get All Specializations
// GET /api/specializations
// ============================================
router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT id, name, description FROM specializations ORDER BY id ASC'
        );
        res.json({ specializations: rows });

    } catch (error) {
        console.error('Get specializations error:', error);
        res.status(500).json({ error: 'Failed to fetch specializations' });
    }
});

// ============================================
// Add Specialization (Admin)
// POST /api/specializations
// ============================================
router.post('/', async (req, res) => {
    try {
        const { name, description } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Specialization name is required' });
        }

        // Check if already exists
        const [existing] = await pool.query('SELECT id FROM specializations WHERE name = ?', [name]);
        if (existing.length > 0) {
            return res.status(409).json({ error: 'Specialization already exists' });
        }

        const [result] = await pool.query(
            'INSERT INTO specializations (name, description) VALUES (?, ?)',
            [name, description || null]
        );

        res.status(201).json({
            message: 'Specialization added successfully',
            specialization: { id: result.insertId, name, description }
        });

    } catch (error) {
        console.error('Add specialization error:', error);
        res.status(500).json({ error: 'Failed to add specialization' });
    }
});

// ============================================
// Update Specialization
// PUT /api/specializations/:id
// ============================================
router.put('/:id', async (req, res) => {
    try {
        const { name, description } = req.body;

        const [result] = await pool.query(
            `UPDATE specializations SET 
                name = COALESCE(?, name),
                description = COALESCE(?, description)
             WHERE id = ?`,
            [name, description, req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Specialization not found' });
        }

        res.json({ message: 'Specialization updated successfully' });

    } catch (error) {
        console.error('Update specialization error:', error);
        res.status(500).json({ error: 'Failed to update specialization' });
    }
});

// ============================================
// Delete Specialization
// DELETE /api/specializations/:id
// ============================================
router.delete('/:id', async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM specializations WHERE id = ?', [req.params.id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Specialization not found' });
        }

        res.json({ message: 'Specialization deleted successfully' });

    } catch (error) {
        console.error('Delete specialization error:', error);
        res.status(500).json({ error: 'Failed to delete specialization' });
    }
});

module.exports = router;
