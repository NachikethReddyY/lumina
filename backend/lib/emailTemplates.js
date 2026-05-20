const { getEmailLogoHtmlSrc } = require('./emailLogo');

function emailHeaderBlock() {
  const logoSrc = getEmailLogoHtmlSrc();
  return `
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 8px 0;">
          <tr>
            <td style="vertical-align:middle;padding:0 14px 0 0;">
              <img
                src="${escapeHtmlAttr(logoSrc)}"
                width="48"
                height="48"
                alt="Lumina"
                style="display:block;border:0;outline:none;text-decoration:none;width:48px;height:48px;border-radius:12px;"
              />
            </td>
            <td style="vertical-align:middle;">
              <span style="font-size:22px;line-height:1.2;font-weight:700;color:#111827;letter-spacing:-0.02em;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
                Lumina
              </span>
            </td>
          </tr>
        </table>`;
}

function card({ title, preview, intro, buttonText, url, footer, extraHtml }) {
  const safeUrl = String(url);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      ${escapeHtml(preview || title)}
    </div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f3f4f6;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;">
            <tr>
              <td style="padding:28px 28px 8px 28px;">
                ${emailHeaderBlock()}
              </td>
            </tr>
            <tr>
              <td style="padding:8px 28px 28px 28px;">
                <h2 style="margin:0;font-size:24px;line-height:1.3;font-weight:600;color:#111827;">
                  ${escapeHtml(title)}
                </h2>
                <p style="margin:16px 0 0 0;font-size:15px;line-height:1.5;color:#374151;">
                  ${escapeHtml(intro)}
                </p>

                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0 0 0;">
                  <tr>
                    <td style="border-radius:8px;background:#111827;">
                      <a href="${escapeHtmlAttr(safeUrl)}"
                         style="background:#111827;border-radius:8px;color:#ffffff;display:inline-block;font-size:15px;font-weight:600;line-height:1;text-decoration:none;padding:14px 22px;border:1px solid #111827;">
                        ${escapeHtml(buttonText)}
                      </a>
                    </td>
                  </tr>
                </table>

                ${extraHtml || ''}

                <p style="margin:20px 0 0 0;font-size:12px;line-height:1.5;color:#6b7280;">
                  If the button doesn&rsquo;t work, copy and paste this link into your browser:
                </p>
                <p style="margin:8px 0 0 0;font-size:12px;line-height:1.5;color:#4b5563;word-break:break-all;">
                  <a href="${escapeHtmlAttr(safeUrl)}" style="color:#4b5563;text-decoration:underline;">${escapeHtml(safeUrl)}</a>
                </p>

                <hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0 16px 0;" />
                <p style="margin:0;font-size:12px;line-height:1.5;color:#9ca3af;">
                  ${escapeHtml(footer || '')}
                </p>
              </td>
            </tr>
          </table>
          <p style="margin:16px 0 0 0;font-size:11px;line-height:1.4;color:#9ca3af;text-align:center;">
            &copy; Lumina &mdash; IT helpdesk
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function verificationEmailHtml({ url, otp }) {
  const otpBlock = otp
    ? `<p style="margin:20px 0 0 0;font-size:15px;line-height:1.5;color:#374151;">
         Or enter this one-time code:
       </p>
       <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:10px 0 0 0;">
         <tr>
           <td style="background:#f3f4f6;border-radius:8px;padding:12px 16px;">
             <span style="font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono','Courier New',monospace;font-weight:700;color:#111827;font-size:20px;letter-spacing:2px;">
               ${escapeHtml(otp)}
             </span>
           </td>
         </tr>
       </table>`
    : '';

  return card({
    title: 'Verify your email',
    preview: 'Verify your email for Lumina',
    intro: 'Welcome to Lumina. Please confirm your email address to activate your account.',
    buttonText: 'Verify email',
    url,
    footer: 'This link expires in 48 hours. If you did not sign up, you can ignore this email.',
    extraHtml: otpBlock,
  });
}

function passwordResetEmailHtml({ url }) {
  return card({
    title: 'Reset your password',
    preview: 'Reset your Lumina password',
    intro: 'We received a request to reset your Lumina password. Choose a new password using the button below.',
    buttonText: 'Set a new password',
    url,
    footer: 'This link expires in 1 hour. If you did not request this, you can ignore this email.',
  });
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeHtmlAttr(s) {
  return escapeHtml(s).replace(/'/g, '&#39;');
}

module.exports = { verificationEmailHtml, passwordResetEmailHtml };
