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
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email format'
            });
        }
        
        // Prepare form data for Web3Forms
        const formDataObj = {
            access_key: 'a7c84f21-d1c4-4f6a-b8e2-9f3c4d5e6f7g',
            name: finalName,
            email: email,
            message: message,
            to_email: 'rgraham@castlecs.com',
            subject: formType === 'partnership' ? 'New Partnership Request from Showcase News Group' : 'New Inquiry from Showcase News Group',
            redirect: false
        };
        
        // Add additional fields if provided
        if (finalCompany) {
            formDataObj.company = finalCompany;
        }
        if (phone) {
            formDataObj.phone = phone;
        }
        if (partnershipType) {
            formDataObj.partnership_type = partnershipType;
        }
        
        console.log('Submitting form to Web3Forms:', { name: finalName, email, formType });
        
        // Submit to Web3Forms
        const response = await fetch('https://api.web3forms.com/submit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formDataObj)
        });
        
        const result = await response.json();
        
        console.log('Web3Forms response:', result);
        
        if (result.success) {
            console.log('Form submitted successfully for:', finalName);
            res.json({
                success: true,
                message: 'Message sent successfully!'
            });
        } else {
            console.error('Web3Forms error:', result);
            throw new Error(result.message || 'Web3Forms submission failed');
        }
        
    } catch (error) {
        console.error('Contact form error:', error.message);
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
