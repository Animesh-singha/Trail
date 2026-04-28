import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '465');
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_SECURE = process.env.SMTP_SECURE === 'ssl';
const CONTACT_INBOX = process.env.CONTACT_INBOX;

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_SECURE, // true for 465, false for other ports
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

export const sendNotification = async (incident: any) => {
  const emoji = incident.severity === 'critical' ? '🚨' : incident.severity === 'warning' ? '⚠️' : 'ℹ️';
  
  const textMessage = `${emoji} **NEW INCIDENT**: ${incident.alert_name} 
**Target**: ${incident.service}
**Severity**: ${incident.severity.toUpperCase()}

**Summary**:
${incident.summary}

**Root Cause**:
${incident.root_cause}

**Suggested Fix**:
${incident.suggested_fix}
`;

  // 1. Send Email via Hostinger (Primary Channel)
  if (SMTP_USER && SMTP_PASS && CONTACT_INBOX) {
    try {
      const mailOptions = {
        from: `"Nexus Monitoring" <${SMTP_USER}>`,
        to: CONTACT_INBOX,
        subject: `${emoji} [${incident.severity.toUpperCase()}] SOC Alert: ${incident.alert_name}`,
        text: textMessage,
      };

      await transporter.sendMail(mailOptions);
      console.log(`Notification email sent to ${CONTACT_INBOX}`);
    } catch (err: any) {
      console.error('Failed to send Email notification:', err.message);
    }
  }
};
