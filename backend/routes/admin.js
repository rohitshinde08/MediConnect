// ============================================
// Admin Routes
// Admin dashboard stats and management
// ============================================

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { pool } = require('../db');

// ============================================
// Dashboard Stats
// GET /api/admin/dashboard
// ============================================
router.get('/dashboard', async (req, res) => {
    try {
        // Get total counts
        const [doctorCount] = await pool.query('SELECT COUNT(*) as count FROM doctors');
        const [appointmentCount] = await pool.query('SELECT COUNT(*) as count FROM appointments');
        const [pendingCount] = await pool.query('SELECT COUNT(*) as count FROM appointments WHERE status = "pending"');
        const [approvedCount] = await pool.query('SELECT COUNT(*) as count FROM appointments WHERE status = "approved"');
        const [cancelledCount] = await pool.query('SELECT COUNT(*) as count FROM appointments WHERE status = "cancelled"');
        const [specializationCount] = await pool.query('SELECT COUNT(*) as count FROM specializations');

        // Get recent appointments
        const [recentAppointments] = await pool.query(
            `SELECT a.*, d.full_name AS doctor_name, s.name AS specialization_name
             FROM appointments a
             LEFT JOIN doctors d ON a.doctor_id = d.id
             LEFT JOIN specializations s ON a.specialization_id = s.id
             ORDER BY a.created_at DESC LIMIT 5`
        );

        res.json({
            stats: {
                totalDoctors: doctorCount[0].count,
                totalAppointments: appointmentCount[0].count,
                pendingAppointments: pendingCount[0].count,
                approvedAppointments: approvedCount[0].count,
                cancelledAppointments: cancelledCount[0].count,
                totalSpecializations: specializationCount[0].count
            },
            recentAppointments
        });

    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
});

// ============================================
// Add New Doctor (Admin)
// POST /api/admin/doctors
// ============================================
router.post('/doctors', async (req, res) => {
    try {
        const { full_name, email, password, phone, specialization_id, qualification, experience_years, consultation_fee, bio } = req.body;

        if (!full_name || !email || !password) {
            return res.status(400).json({ error: 'Name, email, and password are required' });
        }

        // Check if email exists
        const [existing] = await pool.query('SELECT id FROM doctors WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(409).json({ error: 'Email already registered' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        const [result] = await pool.query(
            `INSERT INTO doctors (full_name, email, password, phone, specialization_id, qualification, experience_years, consultation_fee, bio)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [full_name, email, hashedPassword, phone, specialization_id, qualification, experience_years || 0, consultation_fee || 0, bio]
        );

        res.status(201).json({
            message: 'Doctor added successfully',
            doctorId: result.insertId
        });

    } catch (error) {
        console.error('Add doctor error:', error);
        res.status(500).json({ error: 'Failed to add doctor' });
    }
});

// ============================================
// Update Doctor Status (Admin)
// PUT /api/admin/doctors/:id/status
// ============================================
router.put('/doctors/:id/status', async (req, res) => {
    try {
        const { status } = req.body;

        if (!status || !['active', 'inactive'].includes(status)) {
            return res.status(400).json({ error: 'Valid status required (active/inactive)' });
        }

        const [result] = await pool.query(
            'UPDATE doctors SET status = ? WHERE id = ?',
            [status, req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Doctor not found' });
        }

        res.json({ message: `Doctor ${status === 'active' ? 'activated' : 'deactivated'} successfully` });

    } catch (error) {
        console.error('Update doctor status error:', error);
        res.status(500).json({ error: 'Failed to update doctor status' });
    }
});

module.exports = router;
