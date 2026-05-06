const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const sendEmail = async (to, subject, text, html) => {
    try {
        // Only attempt to send if credentials are provided
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.log('-----------------------------------');
            console.log('MOCK EMAIL SENT (No credentials)');
            console.log(`To: ${to}`);
            console.log(`Subject: ${subject}`);
            console.log(`Text: ${text}`);
            console.log('-----------------------------------');
            return true;
        }

        const info = await transporter.sendMail({
            from: `"MediConnect" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            text,
            html
        });
        console.log('Message sent: %s', info.messageId);
        return true;
    } catch (error) {
        console.error('Email error:', error);
        return false;
    }
};

module.exports = { sendEmail };
