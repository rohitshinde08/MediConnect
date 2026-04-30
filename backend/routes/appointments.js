// ============================================
// Appointment Routes
// CRUD operations for appointments
// ============================================

const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// ============================================
// Create Appointment (Patient booking)
// POST /api/appointments
// ============================================
router.post('/', async (req, res) => {
    try {
        const { patient_name, patient_email, patient_phone, doctor_id, specialization_id, appointment_date, time_slot, notes } = req.body;

        // Validate required fields
        if (!patient_name || !patient_email || !patient_phone || !doctor_id || !specialization_id || !appointment_date || !time_slot) {
            return res.status(400).json({ error: 'All required fields must be filled' });
        }

        // Generate unique appointment number
        const appointmentNumber = `APT-${Date.now().toString().slice(-8)}`;

        // Insert appointment
        const [result] = await pool.query(
            `INSERT INTO appointments (appointment_number, patient_name, patient_email, patient_phone, doctor_id, specialization_id, appointment_date, time_slot, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [appointmentNumber, patient_name, patient_email, patient_phone, doctor_id, specialization_id, appointment_date, time_slot, notes || null]
        );

        res.status(201).json({
            message: 'Appointment booked successfully!',
            appointment: {
                id: result.insertId,
                appointment_number: appointmentNumber,
                status: 'pending'
            }
        });

    } catch (error) {
        console.error('Create appointment error:', error);
        res.status(500).json({ error: 'Failed to book appointment' });
    }
});

// ============================================
// Search Appointments (by number, name, or phone)
// GET /api/appointments/search?q=search_term
// ============================================
router.get('/search', async (req, res) => {
    try {
        const { q } = req.query;

        if (!q) {
            return res.status(400).json({ error: 'Search query is required' });
        }

        const searchTerm = `%${q}%`;

        const [rows] = await pool.query(
            `SELECT a.*, d.full_name AS doctor_name, s.name AS specialization_name
             FROM appointments a
             LEFT JOIN doctors d ON a.doctor_id = d.id
             LEFT JOIN specializations s ON a.specialization_id = s.id
             WHERE a.appointment_number LIKE ? 
                OR a.patient_name LIKE ? 
                OR a.patient_phone LIKE ?
                OR a.patient_email LIKE ?
             ORDER BY a.created_at DESC`,
            [searchTerm, searchTerm, searchTerm, searchTerm]
        );

        res.json({ appointments: rows });

    } catch (error) {
        console.error('Search appointments error:', error);
        res.status(500).json({ error: 'Failed to search appointments' });
    }
});

// ============================================
// Get All Appointments (for doctor/admin)
// GET /api/appointments
// ============================================
router.get('/', async (req, res) => {
    try {
        const { status, doctor_id } = req.query;
        let query = `
            SELECT a.*, d.full_name AS doctor_name, s.name AS specialization_name
            FROM appointments a
            LEFT JOIN doctors d ON a.doctor_id = d.id
            LEFT JOIN specializations s ON a.specialization_id = s.id
        `;
        const params = [];
        const conditions = [];

        if (status) {
            conditions.push('a.status = ?');
            params.push(status);
        }
        if (doctor_id) {
            conditions.push('a.doctor_id = ?');
            params.push(doctor_id);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY a.created_at DESC';

        const [rows] = await pool.query(query, params);
        res.json({ appointments: rows });

    } catch (error) {
        console.error('Get appointments error:', error);
        res.status(500).json({ error: 'Failed to fetch appointments' });
    }
});

// ============================================
// Get Single Appointment
// GET /api/appointments/:id
// ============================================
router.get('/:id', async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT a.*, d.full_name AS doctor_name, s.name AS specialization_name
             FROM appointments a
             LEFT JOIN doctors d ON a.doctor_id = d.id
             LEFT JOIN specializations s ON a.specialization_id = s.id
             WHERE a.id = ?`,
            [req.params.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Appointment not found' });
        }

        res.json({ appointment: rows[0] });

    } catch (error) {
        console.error('Get appointment error:', error);
        res.status(500).json({ error: 'Failed to fetch appointment' });
    }
});

// ============================================
// Update Appointment Status (Doctor approve/cancel)
// PUT /api/appointments/:id/status
// ============================================
router.put('/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['pending', 'approved', 'cancelled', 'completed'];

        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Valid status is required (pending, approved, cancelled, completed)' });
        }

        const [result] = await pool.query(
            'UPDATE appointments SET status = ? WHERE id = ?',
            [status, req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Appointment not found' });
        }

        res.json({ message: `Appointment ${status} successfully` });

    } catch (error) {
        console.error('Update appointment status error:', error);
        res.status(500).json({ error: 'Failed to update appointment status' });
    }
});

// ============================================
// Delete Appointment
// DELETE /api/appointments/:id
// ============================================
router.delete('/:id', async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM appointments WHERE id = ?', [req.params.id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Appointment not found' });
        }

        res.json({ message: 'Appointment deleted successfully' });

    } catch (error) {
        console.error('Delete appointment error:', error);
        res.status(500).json({ error: 'Failed to delete appointment' });
    }
});

module.exports = router;
