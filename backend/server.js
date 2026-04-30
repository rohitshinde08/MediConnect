// ============================================
// MediConnect Backend Server
// Main Entry Point
// ============================================

const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { testConnection } = require('./db');

// Import Route Modules
const appointmentRoutes = require('./routes/appointments');
const doctorRoutes = require('./routes/doctors');
const adminRoutes = require('./routes/admin');
const specializationRoutes = require('./routes/specializations');
const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// Middleware
// ============================================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// ============================================
// API Routes
// ============================================
app.use('/api/appointments', appointmentRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/specializations', specializationRoutes);
app.use('/api/auth', authRoutes);

// ============================================
// Health Check
// ============================================
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'MediConnect API is running' });
});

// ============================================
// Serve Frontend Pages (SPA-like routing)
// ============================================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// Catch-all: serve index.html for any unmatched routes
app.get('*', (req, res) => {
    // Only serve HTML for non-API routes  
    if (!req.path.startsWith('/api')) {
        const filePath = path.join(__dirname, '..', 'frontend', req.path);
        res.sendFile(filePath, (err) => {
            if (err) {
                res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
            }
        });
    } else {
        res.status(404).json({ error: 'API route not found' });
    }
});

// ============================================
// Start Server
// ============================================
async function startServer() {
    // Test database connection
    const dbConnected = await testConnection();
    
    if (!dbConnected) {
        console.warn('⚠️  Server starting without database connection.');
        console.warn('   Make sure MySQL is running and database "mediconnect" exists.');
        console.warn('   Run the schema.sql file to create the database.');
    }

    app.listen(PORT, () => {
        console.log(`\n🏥 MediConnect Server is running!`);
        console.log(`📍 URL: http://localhost:${PORT}`);
        console.log(`📍 API: http://localhost:${PORT}/api`);
        console.log(`\n-----------------------------------\n`);
    });
}

startServer();
