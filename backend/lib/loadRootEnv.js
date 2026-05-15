const fs = require('fs');
const path = require('path');

/**
 * Load `.env` from **outside** `backend/`: the repository root (`../../.env` from this file).
 *
 * Optional override: set `LUMINA_ENV_FILE` to an absolute or relative path (resolved from cwd)
 * before starting Node, e.g. `LUMINA_ENV_FILE=/path/to/.env.local npm run dev`.
 */
function loadRootEnv() {
  const override = process.env.LUMINA_ENV_FILE;
  const pathToUse = override
    ? path.isAbsolute(override)
      ? override
      : path.resolve(process.cwd(), override)
    : path.resolve(__dirname, '..', '..', '.env');

  if (!fs.existsSync(pathToUse)) {
    console.warn(
      `[env] No file at ${pathToUse}. Create a .env at the repo root (see .env.example) or set LUMINA_ENV_FILE.`
    );
    return null;
  }

  require('dotenv').config({ path: pathToUse });
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[env] Loaded ${pathToUse}`);
  }
  return pathToUse;
}

module.exports = { loadRootEnv };
