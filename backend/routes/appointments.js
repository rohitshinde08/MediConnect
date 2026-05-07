// ============================================
// Appointment Routes
// CRUD operations for appointments
// ============================================

const express = require('express');
const router = express.Router();
const { pool } = require('../db');

const { sendEmail } = require('../utils/mailer');
const jwt = require('jsonwebtoken');

// Middleware to verify patient token
const authenticatePatient = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.role !== 'patient') return res.status(403).json({ error: 'Access denied' });
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

// ============================================
// Get My Appointments (For Logged-in Patient)
// GET /api/appointments/me
// ============================================
router.get('/me', authenticatePatient, async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT a.*, d.full_name AS doctor_name, s.name AS specialization_name
             FROM appointments a
             LEFT JOIN doctors d ON a.doctor_id = d.id
             LEFT JOIN specializations s ON a.specialization_id = s.id
             WHERE a.patient_id = ?
             ORDER BY a.appointment_date DESC, a.time_slot ASC`,
            [req.user.id]
        );
        res.json({ appointments: rows });
    } catch (error) {
        console.error('Get my appointments error:', error);
        res.status(500).json({ error: 'Failed to fetch your appointments' });
    }
});
// POST /api/appointments
// ============================================
router.post('/', async (req, res) => {
    try {
        const { 
            patient_id, patient_name, patient_email, patient_phone, 
            doctor_id, specialization_id, appointment_date, 
            time_slot, notes 
        } = req.body;

        // Validate required fields
        if (!patient_name || !patient_email || !patient_phone || !doctor_id || !specialization_id || !appointment_date || !time_slot) {
            return res.status(400).json({ error: 'All required fields must be filled' });
        }

        // 2. Conflict Prevention: Check if already booked
        const [existing] = await pool.query(
            'SELECT id FROM appointments WHERE doctor_id = ? AND appointment_date = ? AND time_slot = ? AND status != "cancelled"',
            [doctor_id, appointment_date, time_slot]
        );
        if (existing.length > 0) {
            return res.status(409).json({ error: 'This time slot is no longer available' });
        }

        // 3. Prevent past dates
        const today = new Date().toISOString().split('T')[0];
        if (appointment_date < today) {
            return res.status(400).json({ error: 'Cannot book appointments for past dates' });
        }

        // Generate unique appointment number
        const appointmentNumber = `APT-${Date.now().toString().slice(-8)}`;

        // Insert appointment
        const [result] = await pool.query(
            `INSERT INTO appointments (appointment_number, patient_id, patient_name, patient_email, patient_phone, doctor_id, specialization_id, appointment_date, time_slot, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [appointmentNumber, patient_id || null, patient_name, patient_email, patient_phone, doctor_id, specialization_id, appointment_date, time_slot, notes || null]
        );

        // Send confirmation email
        await sendEmail(
            patient_email,
            'Appointment Booked - MediConnect',
            `Your appointment (ID: ${appointmentNumber}) has been booked for ${appointment_date} at ${time_slot}. Status: Pending.`,
            `<h3>Appointment Confirmation</h3><p>Your appointment has been booked successfully.</p>
             <p><strong>Appointment ID:</strong> ${appointmentNumber}</p>
             <p><strong>Date:</strong> ${appointment_date}</p>
             <p><strong>Time:</strong> ${time_slot}</p>
             <p><strong>Status:</strong> Pending Approval</p>`
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
             ORDER BY a.appointment_date DESC, a.time_slot ASC`,
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

        query += ' ORDER BY a.appointment_date DESC, a.time_slot ASC';

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
// Update Appointment Status (Doctor approve/cancel/complete)
// PUT /api/appointments/:id/status
// ============================================
router.put('/:id/status', async (req, res) => {
    try {
        const { status, diagnosis, prescription } = req.body;
        const validStatuses = ['pending', 'approved', 'cancelled', 'completed'];

        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Valid status is required' });
        }

        // Get appointment details for notification
        const [apt] = await pool.query('SELECT * FROM appointments WHERE id = ?', [req.params.id]);
        if (apt.length === 0) return res.status(404).json({ error: 'Appointment not found' });

        const [result] = await pool.query(
            'UPDATE appointments SET status = ?, diagnosis = ?, prescription = ? WHERE id = ?',
            [status, diagnosis || null, prescription || null, req.params.id]
        );

        // Send status update email
        let emailHtml = `<h3>Appointment Status Update</h3>
                         <p>Your appointment <strong>${apt[0].appointment_number}</strong> has been updated to: <strong>${status.toUpperCase()}</strong></p>`;
        
        if (status === 'completed' && diagnosis) {
            emailHtml += `<hr><p><strong>Diagnosis:</strong> ${diagnosis}</p>`;
            if (prescription) emailHtml += `<p><strong>Prescription:</strong> ${prescription}</p>`;
        }

        await sendEmail(
            apt[0].patient_email,
            `Appointment Status: ${status.toUpperCase()} - MediConnect`,
            `Your appointment (ID: ${apt[0].appointment_number}) has been ${status}.`,
            emailHtml
        );

        res.json({ message: `Appointment ${status} successfully` });

    } catch (error) {
        console.error('Update appointment status error:', error);
        res.status(500).json({ error: 'Failed to update appointment status' });
    }
});

// ============================================
// Get Patient History (Patient view or Doctor view)
// GET /api/appointments/patient/history?email=...
// ============================================
router.get('/patient/history', async (req, res) => {
    try {
        const { email, patientName, doctor_id, patient_id } = req.query;

        let query = `
             SELECT a.*, d.full_name AS doctor_name, s.name AS specialization_name
             FROM appointments a
             LEFT JOIN doctors d ON a.doctor_id = d.id
             LEFT JOIN specializations s ON a.specialization_id = s.id
             WHERE a.status = "completed"
        `;
        const queryParams = [];

        // If patient_id is provided (logged-in patient), use it directly
        if (patient_id) {
            query += ' AND a.patient_id = ?';
            queryParams.push(patient_id);
        } 
        else if (email) {
            query += ' AND a.patient_email = ?';
            queryParams.push(email);

            // If not requested by a doctor, strictly require matching patient name for privacy
            if (!doctor_id) {
                if (!patientName) {
                    return res.status(400).json({ error: 'Patient name is required to view history' });
                }
                query += ' AND LOWER(a.patient_name) = LOWER(?)';
                queryParams.push(patientName);
            }
        } else {
            return res.status(400).json({ error: 'Identification (Email or Patient ID) is required' });
        }

        query += ' ORDER BY a.appointment_date DESC';

        const [history] = await pool.query(query, queryParams);
        res.json({ history });

    } catch (error) {
        console.error('Get history error:', error);
        res.status(500).json({ error: 'Failed to fetch medical history' });
    }
});

// ============================================
// Delete Appointment
// ============================================
router.delete('/:id', async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM appointments WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Appointment not found' });
        res.json({ message: 'Appointment deleted successfully' });
    } catch (error) {
        console.error('Delete appointment error:', error);
        res.status(500).json({ error: 'Failed to delete appointment' });
    }
});

module.exports = router;

