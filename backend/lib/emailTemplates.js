// SVG logo embedded as a data URI so it renders in all email clients
// without needing an external network request (works locally and in prod).
const LUMINA_LOGO_DATA_URI =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDIiIGhlaWdodD0iNDIiIHZpZXdCb3g9IjAgMCAxMjggMTI4IiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxkZWZzPjxsaW5lYXJHcmFkaWVudCBpZD0ibGciIHgxPSI2NCIgeTE9IjAiIHgyPSI2NCIgeTI9IjEyOCIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiPjxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiNGRjhBNUIiLz48c3RvcCBvZmZzZXQ9IjM0JSIgc3RvcC1jb2xvcj0iI0ZGN0FBRSIvPjxzdG9wIG9mZnNldD0iNjglIiBzdG9wLWNvbG9yPSIjQzA4NEZDIi8+PHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjQTc4QkZBIi8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PHBhdGggZD0iTTY0IDBRNjQgNjQgMTI4IDY0UTY0IDY0IDY0IDEyOFE2NCA2NCAwIDY0UTY0IDY0IDY0IDBaIiBmaWxsPSJ1cmwoI2xnKSIvPjwvc3ZnPg==';

function card({ title, preview, intro, buttonText, url, footer, extraHtml }) {
  const safeUrl = url ? String(url) : '';

  const buttonBlock = (buttonText && safeUrl) ? `
        <div style="padding:24px 0 0 0;">
          <a href="${escapeHtmlAttr(safeUrl)}"
             style="background:#111827;border-radius:6px;color:#ffffff;display:inline-block;font-size:15px;font-weight:600;line-height:1;text-decoration:none;padding:12px 16px;">
            ${escapeHtml(buttonText)}
          </a>
        </div>` : '';

  const fallbackBlock = safeUrl ? `
        <p style="margin:16px 0 0 0;font-size:12px;line-height:1.4;color:#6b7280;">
          If the button doesn't work, copy and paste this link:
        </p>
        <p style="margin:8px 0 0 0;font-size:12px;line-height:1.4;color:#6b7280;word-break:break-all;">
          ${escapeHtml(safeUrl)}
        </p>` : '';

  return `<!doctype html>
<html>
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;padding:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      ${escapeHtml(preview || title)}
    </div>
    <div style="padding:20px 0;">
      <div style="max-width:560px;margin:0 auto;padding:0 20px;">
        <h2 style="margin:0 0 0 0;font-size:24px;line-height:1.3;font-weight:600;color:#111827;">
          ${escapeHtml(title)}
        </h2>
        <p style="margin:16px 0 0 0;font-size:15px;line-height:1.4;color:#374151;">
          ${escapeHtml(intro)}
        </p>

        ${buttonBlock}

        ${extraHtml || ''}

        ${fallbackBlock}

        <hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0 16px 0;" />
        <p style="margin:0;font-size:12px;line-height:1.4;color:#9ca3af;">
          ${escapeHtml(footer || '')}
        </p>
      </div>
    </div>
  </body>
</html>`;
}

function verificationEmailHtml({ url, otp }) {
  const otpBlock = otp
    ? `<p style="margin:16px 0 0 0;font-size:15px;line-height:1.4;color:#374151;">
         Or enter this one-time code:
       </p>
       <div style="margin:10px 0 0 0;">
         <span style="display:inline-block;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono','Courier New',monospace;font-weight:700;background:#f3f4f6;color:#111827;border-radius:6px;padding:10px 12px;font-size:18px;letter-spacing:0.5px;">
           ${escapeHtml(otp)}
         </span>
       </div>`
    : '';

  return card({
    title: 'Verify your email for Lumina',
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
    title: 'Reset your Lumina password',
    preview: 'Reset your Lumina password',
    intro: 'We received a request to reset your Lumina password.',
    buttonText: 'Set a new password',
    url,
    footer: 'This link expires in 1 hour. If you did not request this, you can ignore this email.',
  });
}

function passwordResetOtpEmailHtml({ url, otp }) {
  const otpBlock = otp
    ? `<p style="margin:16px 0 0 0;font-size:15px;line-height:1.4;color:#374151;">
         Or enter this one-time code on the reset page (expires in 10 minutes):
       </p>
       <div style="margin:10px 0 0 0;">
         <span style="display:inline-block;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono','Courier New',monospace;font-weight:700;background:#f3f4f6;color:#111827;border-radius:6px;padding:10px 12px;font-size:28px;letter-spacing:4px;">
           ${escapeHtml(otp)}
         </span>
       </div>`
    : '';

  return card({
    title: 'Reset your Lumina password',
    preview: 'Your Lumina password reset code',
    intro: 'We received a request to reset your Lumina password. Use the button or code below — do not share either with anyone.',
    buttonText: url ? 'Set a new password' : null,
    url: url || null,
    footer: 'The link expires in 1 hour; the code expires in 10 minutes. If you did not request this, you can ignore this email.',
    extraHtml: otpBlock,
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
  // Same escapes as HTML for our use-case.
  return escapeHtml(s).replace(/'/g, '&#39;');
}

function ticketAssignedEmailHtml({ assigneeName, ticketTitle, ticketId, appUrl }) {
  const ticketUrl = appUrl ? `${appUrl}/tickets/${ticketId}` : '';
  return card({
    title: 'You have been assigned a ticket',
    preview: `New ticket assignment: ${ticketTitle}`,
    intro: `Hi ${escapeHtml(assigneeName)},\n\nYou have been assigned a new ticket.`,
    buttonText: 'View ticket',
    url: ticketUrl,
    footer: 'Reply to this email or log in to Lumina to see more details.',
    extraHtml: `<div style="margin:16px 0 0 0;background:#f9fafb;border-radius:6px;padding:12px;border-left:4px solid #111827;">
      <p style="margin:0;font-size:14px;line-height:1.5;color:#374151;">
        <strong>Ticket:</strong> ${escapeHtml(ticketTitle)}
      </p>
    </div>`,
  });
}

function ticketStatusChangedEmailHtml({ recipientName, ticketTitle, ticketId, oldStatus, newStatus, appUrl }) {
  const ticketUrl = appUrl ? `${appUrl}/tickets/${ticketId}` : '';
  return card({
    title: 'Ticket status updated',
    preview: `Status changed: ${ticketTitle}`,
    intro: `Hi ${escapeHtml(recipientName)},\n\nA ticket you are involved with has been updated.`,
    buttonText: 'View ticket',
    url: ticketUrl,
    footer: 'Log in to Lumina to see more details about this ticket.',
    extraHtml: `<div style="margin:16px 0 0 0;background:#f9fafb;border-radius:6px;padding:12px;border-left:4px solid #111827;">
      <p style="margin:0;font-size:14px;line-height:1.5;color:#374151;">
        <strong>Ticket:</strong> ${escapeHtml(ticketTitle)}<br/>
        <strong>Status:</strong> ${escapeHtml(oldStatus)} → ${escapeHtml(newStatus)}
      </p>
    </div>`,
  });
}

function userRejectedEmailHtml({ firstName, adminEmail }) {
  return card({
    title: 'Your account has been rejected',
    preview: 'Your Lumina account has been rejected',
    intro: `Hi ${escapeHtml(firstName)},\n\nYour account request has been rejected. Please contact your administrator for more information.`,
    footer: `Contact ${escapeHtml(adminEmail)} if you have questions.`,
  });
}

function userApprovedEmailHtml({ firstName, appUrl }) {
  const loginUrl = appUrl ? `${appUrl}/login` : '';
  return card({
    title: 'Your account has been approved',
    preview: 'Your Lumina account is ready to use',
    intro: `Hi ${escapeHtml(firstName)},\n\nYour Lumina account has been approved and is ready to use.`,
    buttonText: 'Log in to Lumina',
    url: loginUrl,
    footer: 'Welcome to the team!',
  });
}

function userDeletedEmailHtml({ firstName, adminEmail }) {
  return card({
    title: 'Your Lumina account has been terminated',
    preview: 'Your Lumina account has been terminated',
    intro: `Hi ${escapeHtml(firstName)},\n\nYour Lumina account has been deleted and is no longer active. All associated data has been removed from the system.`,
    footer: `If you have questions, please contact your administrator at ${escapeHtml(adminEmail)}.`,
  });
}

function newSignupNotificationEmailHtml({ userEmail, appUrl }) {
  const approvalUrl = appUrl ? `${appUrl}/admin/users` : '';
  return card({
    title: 'New user awaiting approval',
    preview: 'A new user has signed up and is awaiting approval',
    intro: `A new user has signed up for Lumina and is awaiting HR approval.`,
    buttonText: 'Review & Approve',
    url: approvalUrl,
    extraHtml: `<div style="margin:16px 0 0 0;background:#f9fafb;border-radius:6px;padding:12px;border-left:4px solid #111827;">
      <p style="margin:0;font-size:14px;line-height:1.5;color:#374151;">
        <strong>Email:</strong> ${escapeHtml(userEmail)}
      </p>
    </div>`,
    footer: 'Log in to Lumina to review and approve the account.',
  });
}

function onboardingSubmittedNotificationEmailHtml({ userName, userEmail, jobTitle, department, appUrl }) {
  const approvalUrl = appUrl ? `${appUrl}/admin/users` : '';
  return card({
    title: 'User has completed onboarding',
    preview: `${userName} has completed their onboarding and is ready for approval`,
    intro: `${escapeHtml(userName)} has completed their onboarding and submitted their application for HR approval.`,
    buttonText: 'Review Application',
    url: approvalUrl,
    extraHtml: `<div style="margin:16px 0 0 0;background:#f9fafb;border-radius:6px;padding:12px;border-left:4px solid #111827;">
      <p style="margin:0;font-size:14px;line-height:1.5;color:#374151;">
        <strong>Email:</strong> ${escapeHtml(userEmail)}<br/>
        <strong>Job Title:</strong> ${escapeHtml(jobTitle)}<br/>
        <strong>Department:</strong> ${escapeHtml(department)}
      </p>
    </div>`,
    footer: 'Review and approve the user account in the admin panel.',
  });
}

module.exports = {
  verificationEmailHtml,
  passwordResetEmailHtml,
  userRejectedEmailHtml,
  userApprovedEmailHtml,
  userDeletedEmailHtml,
  newSignupNotificationEmailHtml,
  onboardingSubmittedNotificationEmailHtml,
};
