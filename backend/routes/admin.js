// ============================================
// Admin Routes
// Admin dashboard stats and management
// ============================================

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { pool } = require('../db');
const { sendEmail } = require('../utils/mailer');

// ============================================
// Dashboard Stats
// GET /api/admin/dashboard
// ============================================
router.get('/dashboard', async (req, res) => {
    try {
        // Get total counts
        const [doctorCount] = await pool.query('SELECT COUNT(*) as count FROM doctors WHERE verification_status = "approved"');
        const [pendingDoctors] = await pool.query('SELECT COUNT(*) as count FROM doctors WHERE verification_status = "pending"');
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
                pendingDoctors: pendingDoctors[0].count,
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
// Add New Doctor (Admin - Stays for backwards compat)
// ============================================
router.post('/doctors', async (req, res) => {
    try {
        const { full_name, email, password, phone, specialization_id, qualification, experience_years, consultation_fee, bio, license_number } = req.body;

        if (!full_name || !email || !password) {
            return res.status(400).json({ error: 'Name, email, and password are required' });
        }

        const [existing] = await pool.query('SELECT id FROM doctors WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(409).json({ error: 'Email already registered' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const [result] = await pool.query(
            `INSERT INTO doctors (full_name, email, password, phone, specialization_id, qualification, experience_years, consultation_fee, bio, license_number, verification_status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [full_name, email, hashedPassword, phone, specialization_id, qualification, experience_years || 0, consultation_fee || 0, bio, license_number || null, 'approved']
        );

        res.status(201).json({
            message: 'Doctor added and approved successfully',
            doctorId: result.insertId
        });

    } catch (error) {
        console.error('Add doctor error:', error);
        res.status(500).json({ error: 'Failed to add doctor' });
    }
});

// ============================================
// Update Doctor Verification Status (Approve/Reject)
// PUT /api/admin/doctors/:id/verify
// ============================================
router.put('/doctors/:id/verify', async (req, res) => {
    try {
        const { status } = req.body; // 'approved' or 'rejected'

        if (!status || !['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ error: 'Valid status required (approved/rejected)' });
        }

        // Get doctor details for email
        const [doctor] = await pool.query('SELECT full_name, email FROM doctors WHERE id = ?', [req.params.id]);
        if (doctor.length === 0) return res.status(404).json({ error: 'Doctor not found' });

        const [result] = await pool.query(
            'UPDATE doctors SET verification_status = ? WHERE id = ?',
            [status, req.params.id]
        );

        // Send Notification
        await sendEmail(
            doctor[0].email,
            `Account ${status.toUpperCase()} - MediConnect`,
            `Your MediConnect account has been ${status}.`,
            `<h3>Account Status Update</h3>
             <p>Hello Dr. ${doctor[0].full_name},</p>
             <p>Your account verification has been: <strong>${status.toUpperCase()}</strong></p>
             ${status === 'approved' ? '<p>You can now login to your dashboard.</p>' : '<p>Please contact support for more details.</p>'}`
        );

        res.json({ message: `Doctor ${status} successfully` });

    } catch (error) {
        console.error('Verify doctor error:', error);
        res.status(500).json({ error: 'Failed to verify doctor' });
    }
});

// ============================================
// Update Doctor Status (Active/Inactive)
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

