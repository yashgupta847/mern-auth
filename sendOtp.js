// backend/sendOtp.js
require('dotenv').config();
const nodemailer = require('nodemailer');

let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

const sendOtp = (userEmail, otp) => {
    let mailOptions = {
        from: process.env.EMAIL_USER,
        to: userEmail,
        subject: 'OTP for Password Reset',
        text: `Your OTP is: ${otp}`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log('Error: ' + error);
        } else {
            console.log('Email sent: ' + info.response);
        }
    });
};

module.exports = sendOtp;
