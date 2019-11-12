const path = require('path');
const nodemailer = require('nodemailer');
const sendgridTransport = require('nodemailer-sendgrid-transport');
const ejs = require('ejs');

// class for sending emails
class Email {
    constructor(recipient) {
        this.recipient = recipient;
    }

    newTransporter() {
        let transporter;

        // if in development, send email to mailtrap
        if (process.env.NODE_ENV === 'development') {
            transporter = nodemailer.createTransport({
                host: process.env.MAILTRAP_EMAIL_HOST,
                auth: {
                    user: process.env.MAILTRAP_EMAIL_USERNAME,
                    pass: process.env.MAILTRAP_EMAIL_PASSWORD
                }
            });
        }
        else { // in production, send mail via sendgrid
            transporter = nodemailer.createTransport(sendgridTransport({
                auth: { api_key: process.env.SENDGRID_API_KEY }
            }));
        }

        return transporter;
    }

    sendMail(templateName, subject, data) {
        const templateFile = path.join(
            __dirname,
            '..',
            'email-templates',
            templateName + '.ejs'
        );

        // load email template and send mail
        ejs.renderFile(templateFile, data, async (error, htmlStr) => {
            if (error) {
                console.log(error.message);
                return;
            }

            const mailOptions = {
                to: this.recipient,
                from: 'Yousaf Khan <test@email.com>',
                subject: subject,
                html: htmlStr
            };

            await this.newTransporter().sendMail(mailOptions);
        });
    }

    sendPasswordResetEmail(data) {
        this.sendMail('password-reset', 'Password Reset Request', data);
    }
}

module.exports = Email;