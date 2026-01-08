const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

// Mailgun configuration from environment variables
const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY || '';
const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN || 'mg.castledr.com';
const MAILGUN_FROM = `noreply@${MAILGUN_DOMAIN}`;
const RECIPIENT_EMAIL = process.env.RECIPIENT_EMAIL || 'rgraham@castlecs.com';

// Validate Mailgun configuration
if (!MAILGUN_API_KEY) {
    console.warn('⚠️  WARNING: MAILGUN_API_KEY environment variable not set. Contact form will not work.');
}

// Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "https://api.mailgun.net"]
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
        
        // Validate Mailgun API key is configured
        if (!MAILGUN_API_KEY) {
            console.error('Mailgun API key not configured');
            return res.status(500).json({
                success: false,
                message: 'Email service is not configured. Please try again later.'
            });
        }
        
        // Build email subject
        const emailSubject = formType === 'partnership' 
            ? `New Partnership Request from ${finalName}` 
            : `New Inquiry from ${finalName}`;
        
        // Build email body
        let emailBody = `
Name: ${finalName}
Email: ${email}
${finalCompany ? `Company: ${finalCompany}` : ''}
${phone ? `Phone: ${phone}` : ''}
${partnershipType ? `Partnership Type: ${partnershipType}` : ''}

Message:
${message}

---
This message was sent from the Showcase News Group website.
Form Type: ${formType === 'partnership' ? 'Partnership Inquiry' : 'General Contact'}
        `.trim();
        
        console.log('Preparing to send email via Mailgun:', {
            to: RECIPIENT_EMAIL,
            from: MAILGUN_FROM,
            subject: emailSubject,
            senderName: finalName,
            senderEmail: email
        });
        
        // Prepare Mailgun form data
        const form = new FormData();
        form.append('from', `${finalName} <${MAILGUN_FROM}>`);
        form.append('to', RECIPIENT_EMAIL);
        form.append('subject', emailSubject);
        form.append('text', emailBody);
        form.append('h:Reply-To', email);
        
        // Send via Mailgun
        const mailgunUrl = `https://api.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`;
        const auth = Buffer.from(`api:${MAILGUN_API_KEY}`).toString('base64');
        
        const response = await fetch(mailgunUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`
            },
            body: form
        });
        
        const result = await response.json();
        
        console.log('Mailgun response status:', response.status);
        console.log('Mailgun response:', result);
        
        if (response.ok && result.id) {
            console.log('Email sent successfully:', result.id);
            res.json({
                success: true,
                message: 'Message sent successfully!'
            });
        } else {
            console.error('Mailgun error:', result);
            throw new Error(result.message || 'Failed to send email via Mailgun');
        }
        
    } catch (error) {
        console.error('Contact form error:', error.message);
        console.error('Error stack:', error.stack);
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
    console.log(`📧 Contact form configured for: ${RECIPIENT_EMAIL}`);
    console.log(`📬 Using Mailgun domain: ${MAILGUN_DOMAIN}`);
});

module.exports = app;
