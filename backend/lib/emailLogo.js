const fs = require('fs');
const path = require('path');

/** Content-ID for optional inline attachment fallback */
const LOGO_CID = 'lumina-logo';

const LOGO_PATH = path.join(__dirname, '..', 'assets', 'email', 'lumina-logo.png');

const DEFAULT_PUBLIC_APP_URL = 'https://ynr-lumina.vercel.app';

/** HTTPS logo for email clients (hosted on Vercel / public/). */
function getEmailLogoUrl() {
  if (process.env.EMAIL_LOGO_URL) {
    return String(process.env.EMAIL_LOGO_URL).trim();
  }
  const base = (process.env.PUBLIC_APP_URL || DEFAULT_PUBLIC_APP_URL).replace(/\/$/, '');
  return `${base}/logo-email.png`;
}

/** Inline CID attachment when EMAIL_LOGO_USE_CID=true (offline / no public URL). */
function getLuminaLogoAttachment() {
  if (process.env.EMAIL_LOGO_USE_CID !== 'true') {
    return null;
  }
  if (!fs.existsSync(LOGO_PATH)) {
    throw new Error(`Email logo asset missing at ${LOGO_PATH}`);
  }
  return {
    filename: 'lumina-logo.png',
    path: LOGO_PATH,
    cid: LOGO_CID,
    contentDisposition: 'inline',
  };
}

function getEmailLogoHtmlSrc() {
  if (process.env.EMAIL_LOGO_USE_CID === 'true') {
    return `cid:${LOGO_CID}`;
  }
  return getEmailLogoUrl();
}

module.exports = {
  LOGO_CID,
  LOGO_PATH,
  getEmailLogoUrl,
  getEmailLogoHtmlSrc,
  getLuminaLogoAttachment,
};
