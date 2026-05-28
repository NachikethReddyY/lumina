#!/bin/bash

# Kill app ports used by Lumina Fullstack project.
# Checks PostgreSQL on 5432 without killing it.

PORTS=(5001 5173 4173)
DB_PORT=5432

echo "🔪 Killing Lumina Fullstack project ports..."
echo ""

for PORT in "${PORTS[@]}"; do
  echo "Checking port $PORT..."

  # Find process on the port
  PID=$(lsof -ti :$PORT 2>/dev/null)

  if [ ! -z "$PID" ]; then
    echo "  Found PID: $PID on port $PORT"
    kill -9 $PID 2>/dev/null
    if [ $? -eq 0 ]; then
      echo "  ✅ Killed process on port $PORT"
    else
      echo "  ⚠️  Could not kill process on port $PORT (may require sudo)"
      sudo kill -9 $PID 2>/dev/null && echo "  ✅ Killed with sudo" || echo "  ❌ Failed to kill"
    fi
  else
    echo "  ✓ Port $PORT is free"
  fi
  echo ""
done

# Note about PostgreSQL
echo "PostgreSQL (port $DB_PORT):"
PID=$(lsof -ti :$DB_PORT 2>/dev/null)
if [ ! -z "$PID" ]; then
  echo "  Found PID: $PID"
  echo "  ⓘ  PostgreSQL is running. Stop it with: brew services stop postgresql"
else
  echo "  ✓ Port $DB_PORT is free"
fi

echo ""
echo "==================================="
echo "✅ Port cleanup complete!"
echo "==================================="
echo ""
echo "Quick start:"
echo "  pnpm run dev             (Run dev mode)"
echo "  pnpm run db:refresh      (Reset database)"
echo "  pnpm run build           (Build for production)"
