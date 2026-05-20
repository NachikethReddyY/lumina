const fs = require('fs');
const path = require('path');

const isVercel = Boolean(process.env.VERCEL);
const uploadsRoot = isVercel
  ? path.join('/tmp', 'lumina-uploads')
  : path.join(__dirname, '..', 'uploads');

function ensureUploadDir(...segments) {
  const targetDir = path.join(uploadsRoot, ...segments);
  fs.mkdirSync(targetDir, { recursive: true });
  return targetDir;
}

function getUploadsRoot() {
  return uploadsRoot;
}

module.exports = {
  ensureUploadDir,
  getUploadsRoot,
};
