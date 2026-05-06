// ============================================
// Authentication Routes
// Handles login for doctors and admins
// ============================================

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const { pool } = require('../db');
const { sendEmail } = require('../utils/mailer');

// Multer Config for Document Upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/documents/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// ============================================
// Doctor Login
// POST /api/auth/doctor/login
// ============================================
router.post('/doctor/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const [rows] = await pool.query(
            'SELECT * FROM doctors WHERE email = ?',
            [email]
        );

        if (rows.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const doctor = rows[0];

        // Check verification status
        if (doctor.verification_status !== 'approved') {
            return res.status(403).json({ 
                error: 'Account not approved', 
                status: doctor.verification_status,
                message: doctor.verification_status === 'pending' ? 'Your account is waiting for admin approval.' : 'Your account has been rejected.'
            });
        }

        if (doctor.status !== 'active') {
             return res.status(403).json({ error: 'Account is inactive' });
        }

        const isMatch = await bcrypt.compare(password, doctor.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const token = jwt.sign(
            { id: doctor.id, email: doctor.email, role: 'doctor' },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
        );

        delete doctor.password;

        res.json({
            message: 'Login successful',
            token,
            user: doctor
        });

    } catch (error) {
        console.error('Doctor login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ============================================
// Admin Login (Stays mostly the same)
// ============================================
router.post('/admin/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const [rows] = await pool.query(
            'SELECT * FROM admins WHERE email = ?',
            [email]
        );

        if (rows.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const admin = rows[0];

        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const token = jwt.sign(
            { id: admin.id, email: admin.email, role: 'admin' },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
        );

        delete admin.password;

        res.json({
            message: 'Login successful',
            token,
            user: admin
        });

    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


// Doctor Registration (Updated)
// POST /api/auth/doctor/register
// ============================================
router.post('/doctor/register', upload.single('document'), async (req, res) => {
    try {
        const { 
            full_name, email, password, phone, 
            specialization_id, license_number, qualification, 
            experience_years, consultation_fee, bio
        } = req.body;

        if (!full_name || !email || !password || !license_number || !phone || !consultation_fee) {
            return res.status(400).json({ error: 'All required fields must be filled' });
        }

        const [existing] = await pool.query('SELECT id FROM doctors WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(409).json({ error: 'Email already registered' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const documentPath = req.file ? req.file.path : null;

        const [result] = await pool.query(
            `INSERT INTO doctors 
            (full_name, email, password, phone, specialization_id, license_number, qualification, experience_years, consultation_fee, bio, document_path, verification_status) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [full_name, email, hashedPassword, phone, specialization_id || null, license_number, qualification || null, experience_years || 0, consultation_fee, bio || null, documentPath, 'pending']
        );

        res.status(201).json({
            message: 'Registration successful! Your account is pending admin approval.',
            doctorId: result.insertId
        });

    } catch (error) {
        console.error('Doctor registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ============================================
// Verify Token
// ============================================
router.get('/verify', (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ error: 'No token provided' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        res.json({ valid: true, user: decoded });

    } catch (error) {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
});

module.exports = router;

