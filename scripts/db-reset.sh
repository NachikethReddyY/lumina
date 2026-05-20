#!/usr/bin/env bash
# Reset local PostgreSQL: drop all tables/types, re-apply schema + seeds.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

load_database_url() {
  if [ -n "${DATABASE_URL:-}" ]; then
    return 0
  fi
  for env_file in .env .env.development .env.hosting; do
    if [ -f "$env_file" ]; then
      # shellcheck disable=SC2046
      export $(grep -E '^DATABASE_URL=' "$env_file" | tail -1 | xargs) || true
      if [ -n "${DATABASE_URL:-}" ]; then
        echo "[db:reset] Using DATABASE_URL from $env_file"
        return 0
      fi
    fi
  done
  echo "error: DATABASE_URL is not set. Add it to .env or run: export DATABASE_URL=postgresql://..." >&2
  exit 1
}

assert_safe_to_reset() {
  if [ "${FORCE_DB_RESET:-}" = "1" ]; then
    echo "warning: FORCE_DB_RESET=1 — skipping local-only guard"
    return 0
  fi

  local url="$DATABASE_URL"
  case "$url" in
    *localhost* | *127.0.0.1*) ;;
    *)
      echo "error: DATABASE_URL must point at localhost (got: ${url%%@*}@...)" >&2
      echo "       This command wipes the database. Set FORCE_DB_RESET=1 only if you are sure." >&2
      exit 1
      ;;
  esac

  case "$url" in
    *neon.tech* | *supabase.co* | *supabase.com* | *vercel-storage* | *amazonaws.com*)
      echo "error: DATABASE_URL looks like a hosted database — reset refused." >&2
      echo "       Set FORCE_DB_RESET=1 only if you intentionally want to wipe it." >&2
      exit 1
      ;;
  esac
}

load_database_url
assert_safe_to_reset

if ! command -v psql >/dev/null 2>&1; then
  echo "error: psql not found. Install PostgreSQL client tools." >&2
  exit 1
fi

echo "[db:reset] Dropping public schema..."
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/db/reset.sql

echo "[db:reset] Applying schema and seed data..."
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/db/DDL.sql

echo "[db:reset] Done. Database reset and re-seeded."
