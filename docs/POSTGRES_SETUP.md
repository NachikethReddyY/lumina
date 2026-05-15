# PostgreSQL Setup Guide

## Install
```bash
brew install postgresql@16
```
Installs DB server + CLI tools (psql, createdb, etc).

---

## Start Service
```bash
brew services start postgresql@16
```
Runs in background. Check status:
```bash
brew services list | grep postgres
```

---

## Create DB + User
```bash
createdb myapp_db
createuser myapp_user -P
```
`-P` → prompts pwd. Sets creds.

Grant privs:
```bash
psql myapp_db
```
Then in psql:
```sql
GRANT ALL PRIVILEGES ON DATABASE myapp_db TO myapp_user;
ALTER ROLE myapp_user CREATEDB;
\q
```

---

## Connection String
Format: `postgres://user:pwd@host:port/db`

Example:
```
postgres://myapp_user:your_password@localhost:5432/myapp_db
```

Backend env:
```bash
# .env
DB_URL=postgres://myapp_user:your_password@localhost:5432/myapp_db
```

---

## Install Node Driver
Backend package.json → add `pg`:
```bash
cd backend
npm install pg
```

Or use query builder (Knex, Sequelize) → builds queries → cleaner.

---

## Test Connection
Quick check:
```bash
psql postgres://myapp_user:your_password@localhost:5432/myapp_db -c "SELECT 1"
```
Returns `1` → works.

---

DB ready. Write connection code.
