-- Wipe all Lumina objects in the current database (local dev reset only).
-- Run via: pnpm db:reset

DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO public;
