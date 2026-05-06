// ============================================
// Doctor Routes
// CRUD operations for doctors
// ============================================

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { pool } = require('../db');
const { generateSlots } = require('../utils/slots');

// ============================================
// Get All Doctors (Public Listing - Only Approved)
// GET /api/doctors
// ============================================
router.get('/', async (req, res) => {
    try {
        const { specialization_id, status, verification_status } = req.query;
        let query = `
            SELECT d.id, d.full_name, d.email, d.phone, d.specialization_id, 
                    d.license_number, d.qualification, d.experience_years, d.consultation_fee, d.bio, 
                    d.status, d.verification_status, d.document_path, d.created_at,
                    s.name AS specialization_name
            FROM doctors d
            LEFT JOIN specializations s ON d.specialization_id = s.id
        `;
        const params = [];
        const conditions = [];

        // By default, only show approved doctors in public listing
        if (!verification_status && !req.query.all) {
            conditions.push('d.verification_status = "approved"');
        } else if (verification_status) {
            conditions.push('d.verification_status = ?');
            params.push(verification_status);
        }

        if (specialization_id) {
            conditions.push('d.specialization_id = ?');
            params.push(specialization_id);
        }
        
        if (status) {
            conditions.push('d.status = ?');
            params.push(status);
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
// Get Doctor Availability
// GET /api/doctors/:id/availability
// ============================================
router.get('/:id/availability', async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT * FROM doctor_availability WHERE doctor_id = ? ORDER BY available_date ASC',
            [req.params.id]
        );
        res.json({ availability: rows });
    } catch (error) {
        console.error('Get availability error:', error);
        res.status(500).json({ error: 'Failed to fetch availability' });
    }
});

// ============================================
// Set/Update Doctor Availability
// POST /api/doctors/:id/availability
// ============================================
router.post('/:id/availability', async (req, res) => {
    try {
        const { available_date, start_time, end_time, slot_duration } = req.body;
        const doctorId = req.params.id;

        if (!available_date || !start_time || !end_time) {
            return res.status(400).json({ error: 'Date, start time, and end time are required' });
        }

        const [result] = await pool.query(
            `INSERT INTO doctor_availability (doctor_id, available_date, start_time, end_time, slot_duration) 
             VALUES (?, ?, ?, ?, ?) 
             ON DUPLICATE KEY UPDATE start_time = VALUES(start_time), end_time = VALUES(end_time), slot_duration = VALUES(slot_duration)`,
            [doctorId, available_date, start_time, end_time, slot_duration || 30]
        );

        res.json({ message: 'Availability updated successfully' });
    } catch (error) {
        console.error('Set availability error:', error);
        res.status(500).json({ error: 'Failed to set availability' });
    }
});

// ============================================
// Get Available Slots for Doctor on specific date
// GET /api/doctors/:id/slots?date=YYYY-MM-DD
// ============================================
router.get('/:id/slots', async (req, res) => {
    try {
        const { date } = req.query;
        const doctorId = req.params.id;

        if (!date) return res.status(400).json({ error: 'Date is required' });

        // Get doctor's availability for that date
        const [availability] = await pool.query(
            'SELECT start_time, end_time, slot_duration FROM doctor_availability WHERE doctor_id = ? AND available_date = ?',
            [doctorId, date]
        );

        if (availability.length === 0) {
            return res.json({ slots: [] });
        }

        const { start_time, end_time, slot_duration } = availability[0];
        const allSlots = generateSlots(start_time, end_time, slot_duration);

        // Get already booked appointments for that doctor on that date
        const [booked] = await pool.query(
            'SELECT time_slot FROM appointments WHERE doctor_id = ? AND appointment_date = ? AND status != "cancelled"',
            [doctorId, date]
        );

        const bookedSlots = booked.map(b => b.time_slot);
        const availableSlots = allSlots.filter(slot => !bookedSlots.includes(slot));

        res.json({ slots: availableSlots });

    } catch (error) {
        console.error('Get slots error:', error);
        res.status(500).json({ error: 'Failed to fetch slots' });
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
                    d.license_number, d.qualification, d.experience_years, d.consultation_fee, d.bio,
                    d.status, d.verification_status, d.document_path, d.created_at,
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

