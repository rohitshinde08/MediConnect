// ============================================
// Authentication Routes
// Handles login for doctors and admins
// ============================================

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');

// ============================================
// Doctor Login
// POST /api/auth/doctor/login
// ============================================
router.post('/doctor/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Find doctor by email
        const [rows] = await pool.query(
            'SELECT * FROM doctors WHERE email = ? AND status = "active"',
            [email]
        );

        if (rows.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const doctor = rows[0];

        // Compare password
        const isMatch = await bcrypt.compare(password, doctor.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Generate JWT token
        const token = jwt.sign(
            { id: doctor.id, email: doctor.email, role: 'doctor' },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
        );

        // Remove password from response
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
// Admin Login
// POST /api/auth/admin/login
// ============================================
router.post('/admin/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Find admin by email
        const [rows] = await pool.query(
            'SELECT * FROM admins WHERE email = ?',
            [email]
        );

        if (rows.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const admin = rows[0];

        // Compare password
        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Generate JWT token
        const token = jwt.sign(
            { id: admin.id, email: admin.email, role: 'admin' },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
        );

        // Remove password from response
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

// ============================================
// Doctor Registration
// POST /api/auth/doctor/register
// ============================================
router.post('/doctor/register', async (req, res) => {
    try {
        const { full_name, email, password, phone, specialization_id, qualification, experience_years, consultation_fee } = req.body;

        // Validate required fields
        if (!full_name || !email || !password) {
            return res.status(400).json({ error: 'Name, email, and password are required' });
        }

        // Check if email already exists
        const [existing] = await pool.query('SELECT id FROM doctors WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(409).json({ error: 'Email already registered' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert new doctor
        const [result] = await pool.query(
            `INSERT INTO doctors (full_name, email, password, phone, specialization_id, qualification, experience_years, consultation_fee) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [full_name, email, hashedPassword, phone || null, specialization_id || null, qualification || null, experience_years || 0, consultation_fee || 0.00]
        );

        res.status(201).json({
            message: 'Registration successful',
            doctorId: result.insertId
        });

    } catch (error) {
        console.error('Doctor registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ============================================
// Verify Token (middleware helper)
// GET /api/auth/verify
// ============================================


// ============================================
// Verify Token (middleware helper)
// GET /api/auth/verify
// ============================================
router.get('/verify', (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        res.json({ valid: true, user: decoded });

    } catch (error) {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
});

module.exports = router;
