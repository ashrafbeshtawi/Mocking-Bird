#!/bin/sh
set -e

# Apply pending SQL migrations before the app accepts traffic. The runner
# tracks applied files in `schema_migrations`, so this is a no-op on restarts.
# A failed migration exits non-zero here and the container never serves
# against a half-migrated database.
echo "[entrypoint] Running database migrations..."
node scripts/migrate.js

echo "[entrypoint] Migrations applied. Starting server..."
exec "$@"
