const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Register endpoint
router.post('/register', async (req, res) => {
    try {
        console.log('📝 Registration attempt:', req.body.email);
        
        const { name, email, password } = req.body;
        
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            console.log('❌ Email already exists:', email);
            return res.status(400).json({ error: 'Email already registered' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const user = new User({
            name,
            email,
            password: hashedPassword
        });
        
        await user.save();
        console.log('✅ User registered:', email);
        
        const token = jwt.sign(
            { userId: user._id }, 
            process.env.JWT_SECRET || 'your-secret-key-change-this',
            { expiresIn: '7d' }
        );
        
        res.json({ 
            success: true,
            token, 
            user: { 
                id: user._id, 
                name: user.name, 
                email: user.email,
                plan: user.plan
            } 
        });
    } catch (error) {
        console.error('❌ Registration error:', error);
        res.status(500).json({ error: 'Registration failed', details: error.message });
    }
});

// Login endpoint
router.post('/login', async (req, res) => {
    try {
        console.log('🔐 Login attempt:', req.body.email);
        
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        
        const user = await User.findOne({ email });
        if (!user) {
            console.log('❌ User not found:', email);
            return res.status(400).json({ error: 'Invalid credentials' });
        }
        
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            console.log('❌ Invalid password for:', email);
            return res.status(400).json({ error: 'Invalid credentials' });
        }
        
        console.log('✅ User logged in:', email);
        
        const token = jwt.sign(
            { userId: user._id }, 
            process.env.JWT_SECRET || 'your-secret-key-change-this',
            { expiresIn: '7d' }
        );
        
        res.json({ 
            success: true,
            token, 
            user: { 
                id: user._id, 
                name: user.name, 
                email: user.email,
                plan: user.plan
            } 
        });
    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({ error: 'Login failed', details: error.message });
    }
});

// Verify token endpoint
router.get('/verify', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-this');
        const user = await User.findById(decoded.userId).select('-password');
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json({ 
            success: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                plan: user.plan
            }
        });
    } catch (error) {
        console.error('❌ Token verification error:', error);
        res.status(401).json({ error: 'Invalid token' });
    }
});

module.exports = router;