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
// ============================================
// Doctor Registration Request (OTP)
// POST /api/auth/doctor/register-request
// ============================================
router.post('/doctor/register-request', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'Email is required' });

        // Check if doctor already exists and is active
        const [existing] = await pool.query('SELECT id, status FROM doctors WHERE email = ?', [email]);
        if (existing.length > 0 && existing[0].status === 'active') {
            return res.status(409).json({ error: 'Email already registered and active' });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins expiry

        // Store OTP
        await pool.query('DELETE FROM otp_verifications WHERE email = ?', [email]);
        await pool.query(
            'INSERT INTO otp_verifications (email, otp_code, expires_at) VALUES (?, ?, ?)',
            [email, otp, expiresAt]
        );

        // Send Email
        const emailSent = await sendEmail(
            email,
            'Doctor Portal - Verification Code',
            `Your verification code for MediConnect Doctor Portal is: ${otp}`,
            `<h1>Doctor Registration</h1><p>Your 6-digit verification code is: <strong>${otp}</strong></p>`
        );

        if (!emailSent) {
            return res.status(500).json({ error: 'Failed to send verification email' });
        }

        res.json({ message: 'Verification code sent to your email' });
    } catch (error) {
        console.error('Doctor register-request error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ============================================
// Doctor Registration (Complete)
// ============================================
router.post('/doctor/register', upload.single('document'), async (req, res) => {
    try {
        const {
            full_name, email, password, specialization_id,
            license_number, qualification, experience_years,
            phone, consultation_fee, bio, otp
        } = req.body;

        if (!otp) return res.status(400).json({ error: 'Verification code is required' });

        // 1. Verify OTP
        const [otpRows] = await pool.query(
            'SELECT * FROM otp_verifications WHERE email = ? AND otp_code = ? AND expires_at > NOW()',
            [email, otp]
        );

        if (otpRows.length === 0) {
            return res.status(400).json({ error: 'Invalid or expired verification code' });
        }

        const document_path = req.file ? req.file.path : null;

        if (!full_name || !email || !password || !license_number || !phone || !consultation_fee) {
            return res.status(400).json({ error: 'All required fields must be filled' });
        }

        const [existing] = await pool.query('SELECT id FROM doctors WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(409).json({ error: 'Email already registered' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const documentPath = req.file ? req.file.path : null;

        // Insert doctor
        await pool.query(
            `INSERT INTO doctors (full_name, email, password, phone, specialization_id, license_number, qualification, experience_years, consultation_fee, bio, document_path, is_verified)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
            [full_name, email, hashedPassword, phone, specialization_id, license_number, qualification || null, experience_years || 0, consultation_fee, bio || null, documentPath]
        );

        // 3. Clean up OTP
        await pool.query('DELETE FROM otp_verifications WHERE email = ?', [email]);

        res.status(201).json({
            message: 'Registration successful! Your account is pending admin approval.'
        });

    } catch (error) {
        console.error('Doctor registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ============================================
// Patient Registration Request (OTP)
// POST /api/auth/patient/register-request
// ============================================
router.post('/patient/register-request', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'Email is required' });

        // Check if patient already exists and is verified
        const [existing] = await pool.query('SELECT id, is_verified FROM patients WHERE email = ?', [email]);
        if (existing.length > 0 && existing[0].is_verified) {
            return res.status(409).json({ error: 'Email already registered and verified' });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins expiry

        // Store OTP (Update if exists, or Insert)
        await pool.query('DELETE FROM otp_verifications WHERE email = ?', [email]);
        await pool.query(
            'INSERT INTO otp_verifications (email, otp_code, expires_at) VALUES (?, ?, ?)',
            [email, otp, expiresAt]
        );

        // Send Email
        const emailSent = await sendEmail(
            email,
            'MediConnect - Verification Code',
            `Your verification code is: ${otp}. It expires in 10 minutes.`,
            `<h1>Verify Your Account</h1><p>Your 6-digit verification code for MediConnect is: <strong>${otp}</strong></p><p>This code expires in 10 minutes.</p>`
        );

        if (!emailSent) {
            return res.status(500).json({ error: 'Failed to send verification email' });
        }

        res.json({ message: 'Verification code sent to your email' });

    } catch (error) {
        console.error('Patient register-request error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ============================================
// Patient Registration Verify & Complete
// POST /api/auth/patient/register-verify
// ============================================
router.post('/patient/register-verify', async (req, res) => {
    try {
        const { full_name, email, password, phone, otp } = req.body;

        if (!full_name || !email || !password || !otp) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Verify OTP
        const [rows] = await pool.query(
            'SELECT * FROM otp_verifications WHERE email = ? AND otp_code = ? AND expires_at > NOW()',
            [email, otp]
        );

        if (rows.length === 0) {
            return res.status(400).json({ error: 'Invalid or expired verification code' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Upsert Patient (in case they tried before but didn't verify)
        const [existing] = await pool.query('SELECT id FROM patients WHERE email = ?', [email]);
        
        if (existing.length > 0) {
            await pool.query(
                'UPDATE patients SET full_name = ?, password = ?, phone = ?, is_verified = TRUE WHERE email = ?',
                [full_name, hashedPassword, phone || null, email]
            );
        } else {
            await pool.query(
                'INSERT INTO patients (full_name, email, password, phone, is_verified) VALUES (?, ?, ?, ?, TRUE)',
                [full_name, email, hashedPassword, phone || null]
            );
        }

        // Clean up OTP
        await pool.query('DELETE FROM otp_verifications WHERE email = ?', [email]);

        res.status(201).json({ message: 'Registration successful! You can now login.' });

    } catch (error) {
        console.error('Patient register-verify error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ============================================
// Patient Login
// POST /api/auth/patient/login
// ============================================
router.post('/patient/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const [rows] = await pool.query('SELECT * FROM patients WHERE email = ?', [email]);

        if (rows.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const patient = rows[0];

        if (!patient.is_verified) {
            return res.status(403).json({ error: 'Email not verified. Please register again to receive a new code.' });
        }

        const isMatch = await bcrypt.compare(password, patient.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const token = jwt.sign(
            { id: patient.id, email: patient.email, role: 'patient' },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
        );

        delete patient.password;

        res.json({
            message: 'Login successful',
            token,
            user: patient
        });

    } catch (error) {
        console.error('Patient login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
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

