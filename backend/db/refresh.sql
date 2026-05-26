-- =============================================================================
-- Lumina database refresh (development only)
-- =============================================================================
-- Drops everything in the public schema, then run DDL + seed via:
--   pnpm db:refresh
--
-- WARNING: Destroys all data in this database. Do not use against production.
-- =============================================================================

DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO public;
