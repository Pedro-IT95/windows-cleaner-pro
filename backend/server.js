// ==========================================
// SERVER.JS
// Windows Cleaner Pro - Backend
// by Pedro IT Solutions
// ==========================================

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

console.log('=========================================');
console.log('  Windows Cleaner Pro Backend v2.0.0');
console.log('=========================================');

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://pedroluishernandez:Pedro2020@cluster0.hddiu.mongodb.net/WindowsCleanerPro?retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(MONGODB_URI)
    .then(() => console.log('✅ MongoDB Connected'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));

// Routes
console.log('📁 Loading routes...');

const authRoutes = require('./routes/auth');
const stripeRoutes = require('./routes/stripe');

app.use('/api/auth', authRoutes);
console.log('✅ Auth routes loaded: /api/auth');

app.use('/api/stripe', stripeRoutes);
console.log('✅ Stripe routes loaded: /api/stripe');

// Health Check - Root
app.get('/', (req, res) => {
    res.json({
        message: 'Windows Cleaner Pro API',
        version: '2.0.0',
        status: 'running',
        endpoints: {
            auth: '/api/auth',
            stripe: '/api/stripe',
            health: '/health'
        },
        timestamp: new Date().toISOString()
    });
});

// Health Check - /health
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        message: 'Windows Cleaner Pro Backend is running',
        mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// 404 Handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Route not found',
        path: req.path,
        method: req.method,
        availableRoutes: {
            auth: '/api/auth',
            stripe: '/api/stripe',
            health: '/health'
        }
    });
});

// Error Handler
app.use((err, req, res, next) => {
    console.error('❌ Error:', err.message);
    res.status(500).json({
        error: 'Internal server error',
        message: err.message
    });
});

// Start Server
const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
    console.log('=========================================');
    console.log(`  🚀 Server running on port ${PORT}`);
    console.log(`  📍 http://localhost:${PORT}`);
    console.log('=========================================');
    console.log('  Available endpoints:');
    console.log('  - GET  /');
    console.log('  - GET  /health');
    console.log('  - POST /api/auth/register');
    console.log('  - POST /api/auth/login');
    console.log('  - GET  /api/auth/verify');
    console.log('  - POST /api/stripe/create-checkout-session');
    console.log('  - POST /api/stripe/check-subscription');
    console.log('  - GET  /api/stripe/health');
    console.log('=========================================');
    console.log('  Designed by Pedro IT Solutions');
    console.log('=========================================');
});