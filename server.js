const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "https://api.web3forms.com"]
        }
    }
}));
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.post('/api/contact', async (req, res) => {
    try {
        const { name, email, message, company, companyName, contactName, phone, partnershipType, formType } = req.body;
        
        // Handle different form field names
        const finalName = name || contactName;
        const finalCompany = company || companyName;
        
        // Validate required fields
        if (!finalName || !email || !message) {
            return res.status(400).json({
                success: false,
                message: 'Name, email, and message are required'
            });
        }
        
        // Prepare form data for Web3Forms
        const formData = new FormData();
        formData.append('access_key', '0db84ccf-5ade-4505-bd10-b6b4b17f8fb4');
        formData.append('name', finalName);
        formData.append('email', email);
        formData.append('message', message);
        
        // Add form type to subject
        const subjectPrefix = formType === 'partnership' ? 'New Partnership Request from SNG' : 'New General Inquiry from SNG';
        formData.append('subject', subjectPrefix);
        
        // Add additional fields if provided
        if (finalCompany) {
            formData.append('company', finalCompany);
        }
        if (phone) {
            formData.append('phone', phone);
        }
        if (partnershipType) {
            formData.append('partnership_type', partnershipType);
        }
        
        // Add recipient
        formData.append('to', 'rgraham@castlecs.com');
        
        // Submit to Web3Forms
        const response = await fetch('https://api.web3forms.com/submit', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            res.json({
                success: true,
                message: 'Message sent successfully!'
            });
        } else {
            throw new Error(result.message || 'Failed to send message');
        }
        
    } catch (error) {
        console.error('Contact form error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send message. Please try again.'
        });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Catch all handler - serve index.html for any non-API routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Something went wrong!'
    });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Showcase News Group website running on port ${PORT}`);
    console.log(`📧 Contact form configured for: rgraham@castlecs.com`);
});

module.exports = app;

