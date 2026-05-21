const nodemailer = require('nodemailer');
const { getLuminaLogoAttachment } = require('./emailLogo');

function isMailConfigured() {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASSWORD !== undefined &&
      process.env.SMTP_PASSWORD !== '' &&
      process.env.SMTP_FROM_EMAIL
  );
}

/** Gmail app passwords are often pasted with spaces; strip for SMTP auth. */
function smtpPassword() {
  return String(process.env.SMTP_PASSWORD || '').replace(/\s+/g, '');
}

function createTransport() {
  if (!isMailConfigured()) {
    return null;
  }
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: smtpPassword(),
    },
  });
}

<<<<<<< HEAD
async function sendMail({ to, subject, text, html, attachments = [] }) {
=======
async function sendMail({ to, subject, text, html }) {
  console.log('[MAILER] sendMail called:', {
    to,
    subject: subject.substring(0, 60),
    smtpConfigured: isMailConfigured(),
  });

>>>>>>> 8f151fd (fix: improve password reset email error handling and add comprehensive logging)
  const transporter = createTransport();
  if (!transporter) {
    console.error('[MAILER] SMTP transporter creation failed - not configured');
    const err = new Error(
      'SMTP is not configured (set SMTP_HOST, SMTP_USER, SMTP_PASSWORD, SMTP_FROM_EMAIL)'
    );
    err.code = 'MAIL_NOT_CONFIGURED';
    throw err;
  }

  const from = process.env.SMTP_FROM_EMAIL;
<<<<<<< HEAD
  const htmlBody = html || `<pre style="font-family:sans-serif">${escapeHtml(text)}</pre>`;
  const inlineLogo = html ? getLuminaLogoAttachment() : null;

  await transporter.sendMail({
    from: `"Lumina" <${from}>`,
    to,
    subject,
    text,
    html: htmlBody,
    attachments: [...(inlineLogo ? [inlineLogo] : []), ...attachments],
  });
=======
  console.log('[MAILER] Sending mail from:', from, 'via SMTP host:', process.env.SMTP_HOST);

  try {
    const result = await transporter.sendMail({
      from: `"Lumina" <${from}>`,
      to,
      subject,
      text,
      html: html || `<pre style="font-family:sans-serif">${escapeHtml(text)}</pre>`,
    });
    console.log('[MAILER] Email sent successfully:', {
      to,
      messageId: result.messageId,
      response: result.response?.substring(0, 100) || 'No response',
    });
  } catch (err) {
    console.error('[MAILER] Failed to send email:', {
      to,
      subject: subject.substring(0, 60),
      errorMessage: err.message,
      errorCode: err.code,
      errorStack: err.stack?.substring(0, 200),
    });
    throw err;
  }
>>>>>>> 8f151fd (fix: improve password reset email error handling and add comprehensive logging)
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

module.exports = { isMailConfigured, sendMail, createTransport };
