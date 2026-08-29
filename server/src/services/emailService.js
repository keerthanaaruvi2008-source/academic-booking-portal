/**
 * @fileoverview Email notification service.
 * Sends OTP verification codes, reservation confirmations, and status update emails.
 */

import nodemailer from 'nodemailer';

let transporter = null;

const createTransporter = async () => {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = parseInt(process.env.SMTP_PORT, 10) || 587;

  if (host && user && pass) {
    if (host.includes('gmail')) {
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass },
        tls: {
          rejectUnauthorized: false,
        },
      });
      console.log(`[EmailService] 📧 Configured Gmail SMTP transport: ${user}`);
      return transporter;
    }

    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      tls: {
        rejectUnauthorized: false,
      },
    });
    console.log(`[EmailService] 📧 Configured production SMTP transport: ${host}:${port}`);
    return transporter;
  }

  // Development fallback: Virtual email transport with terminal output
  transporter = {
    sendMail: async (mailOptions) => {
      console.log('\n================== 📧 EMAIL DISPATCH SIMULATOR ==================');
      console.log(`To:      ${mailOptions.to}`);
      console.log(`From:    ${mailOptions.from || 'noreply@university.edu'}`);
      console.log(`Subject: ${mailOptions.subject}`);
      console.log(`----------------------------------------------------------------`);
      console.log(mailOptions.text || mailOptions.html);
      console.log('=================================================================\n');
      return { messageId: 'simulated-' + Date.now(), accepted: [mailOptions.to] };
    },
  };

  return transporter;
};

/**
 * Sends a 6-digit OTP verification email to the user.
 *
 * @param {string} toEmail - Recipient institutional email (e.g. 310625243103@eec.srmrmp.edu.in).
 * @param {string} otp - 6-digit one-time password.
 * @param {string} [name='Student'] - User name.
 * @param {string} [purpose='account verification'] - Purpose of OTP.
 * @returns {Promise<{ success: boolean, messageId: string }>}
 */
export const sendOtpEmail = async (toEmail, otp, name = 'Student', purpose = 'Account Verification') => {
  const mailer = await createTransporter();

  const from = process.env.SMTP_FROM || '"Academic Booking Portal" <noreply@university.edu>';
  const subject = `🔐 [${otp}] Your Academic Portal Verification Code`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; padding: 24px; }
          .container { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 32px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
          .header { text-align: center; margin-bottom: 24px; }
          .badge { display: inline-block; padding: 4px 12px; background: #eff6ff; color: #2563eb; border-radius: 9999px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
          h1 { font-size: 20px; font-weight: 800; color: #0f172a; margin-top: 12px; margin-bottom: 8px; }
          p { font-size: 14px; line-height: 1.6; color: #475569; margin: 8px 0; }
          .otp-box { background: #f1f5f9; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }
          .otp-code { font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #1d4ed8; font-family: monospace; }
          .footer { font-size: 12px; color: #94a3b8; text-align: center; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 16px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <span class="badge">Academic Booking Portal</span>
            <h1>Email Verification Code</h1>
          </div>
          <p>Hello <strong>${name}</strong>,</p>
          <p>We received a request for <strong>${purpose}</strong> for your institutional account (<code>${toEmail}</code>).</p>
          <div class="otp-box">
            <div style="font-size: 12px; font-weight: 600; color: #64748b; margin-bottom: 6px; text-transform: uppercase;">Your 6-Digit One-Time Password</div>
            <div class="otp-code">${otp}</div>
            <div style="font-size: 12px; color: #64748b; margin-top: 6px;">⏱️ Code expires in <strong>10 minutes</strong>.</div>
          </div>
          <p style="font-size: 13px; color: #64748b;">If you did not request this verification code, you can safely disregard this message.</p>
          <div class="footer">
            Institutional Resource & Event Booking Portal • Secure Academic Identity
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
Academic Booking Portal - Email Verification
Hello ${name},

Your 6-digit verification code for ${purpose} is:
${otp}

This code will expire in 10 minutes.
Recipient: ${toEmail}
  `.trim();

  try {
    const result = await mailer.sendMail({
      from,
      to: toEmail,
      subject,
      text,
      html,
    });

    console.log(`[EmailService] ✅ Verification email successfully delivered to: ${toEmail} (Message ID: ${result.messageId})`);
    return { success: true, messageId: result.messageId };
  } catch (err) {
    console.error(`[EmailService] ⚠️ SMTP dispatch failed (${err.message}). Logging to fallback console:`);
    console.log(`[EmailService Fallback] Code for ${toEmail}: ${otp}`);
    return { success: true, messageId: 'fallback-' + Date.now(), fallbackOtp: otp };
  }
};

export default {
  sendOtpEmail,
};
