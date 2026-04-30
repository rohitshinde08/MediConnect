// ============================================
// Doctor Routes
// CRUD operations for doctors
// ============================================

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { pool } = require('../db');

// ============================================
// Get All Doctors
// GET /api/doctors
// ============================================
router.get('/', async (req, res) => {
    try {
        const { specialization_id, status } = req.query;
        let query = `
            SELECT d.id, d.full_name, d.email, d.phone, d.specialization_id, 
                    d.qualification, d.experience_years, d.consultation_fee, d.bio, 
                    d.status, d.created_at,
                    s.name AS specialization_name
            FROM doctors d
            LEFT JOIN specializations s ON d.specialization_id = s.id
        `;
        const params = [];
        const conditions = [];

        if (specialization_id) {
            conditions.push('d.specialization_id = ?');
            params.push(specialization_id);
        }
        if (status) {
            // Only filter by status if the column exists
            try {
                conditions.push('d.status = ?');
                params.push(status);
            } catch (e) { /* status column may not exist */ }
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY d.full_name ASC';

        const [rows] = await pool.query(query, params);
        res.json({ doctors: rows });

    } catch (error) {
        console.error('Get doctors error:', error);
        res.status(500).json({ error: 'Failed to fetch doctors' });
    }
});

// ============================================
// Get Single Doctor
// GET /api/doctors/:id
// ============================================
router.get('/:id', async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT d.id, d.full_name, d.email, d.phone, d.specialization_id,
                    d.qualification, d.experience_years, d.consultation_fee, d.bio,
                    d.status, d.created_at,
                    s.name AS specialization_name
             FROM doctors d
             LEFT JOIN specializations s ON d.specialization_id = s.id
             WHERE d.id = ?`,
            [req.params.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Doctor not found' });
        }

        res.json({ doctor: rows[0] });

    } catch (error) {
        console.error('Get doctor error:', error);
        res.status(500).json({ error: 'Failed to fetch doctor' });
    }
});

// ============================================
// Update Doctor Profile
// PUT /api/doctors/:id
// ============================================
router.put('/:id', async (req, res) => {
    try {
        const { full_name, phone, specialization_id, qualification, experience_years, consultation_fee, bio } = req.body;

        const [result] = await pool.query(
            `UPDATE doctors SET 
                full_name = COALESCE(?, full_name),
                phone = COALESCE(?, phone),
                specialization_id = COALESCE(?, specialization_id),
                qualification = COALESCE(?, qualification),
                experience_years = COALESCE(?, experience_years),
                consultation_fee = COALESCE(?, consultation_fee),
                bio = COALESCE(?, bio)
             WHERE id = ?`,
            [full_name, phone, specialization_id, qualification, experience_years, consultation_fee, bio, req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Doctor not found' });
        }

        res.json({ message: 'Profile updated successfully' });

    } catch (error) {
        console.error('Update doctor error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// ============================================
// Change Doctor Password
// PUT /api/doctors/:id/password
// ============================================
router.put('/:id/password', async (req, res) => {
    try {
        const { current_password, new_password } = req.body;

        if (!current_password || !new_password) {
            return res.status(400).json({ error: 'Current and new passwords are required' });
        }

        // Get current password hash
        const [rows] = await pool.query('SELECT password FROM doctors WHERE id = ?', [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Doctor not found' });
        }

        // Verify current password
        const isMatch = await bcrypt.compare(current_password, rows[0].password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(new_password, 10);
        await pool.query('UPDATE doctors SET password = ? WHERE id = ?', [hashedPassword, req.params.id]);

        res.json({ message: 'Password changed successfully' });

    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Failed to change password' });
    }
});

// ============================================
// Delete Doctor (Admin only)
// DELETE /api/doctors/:id
// ============================================
router.delete('/:id', async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM doctors WHERE id = ?', [req.params.id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Doctor not found' });
        }

        res.json({ message: 'Doctor deleted successfully' });

    } catch (error) {
        console.error('Delete doctor error:', error);
        res.status(500).json({ error: 'Failed to delete doctor' });
    }
});

module.exports = router;
