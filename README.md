# Backend Setup Instructions

Adding extension: pgcrypto

Fill data.
``` bash
psql "lumina" -f db/init.sql
```

## 1. Create a `.env` file (project root)

Use **one** `.env` at the **repository root** (next to `backend/` and `react-user-dashboard/`). The API loads it automatically; the Vite app reads the same file for variables prefixed with `VITE_`.

Copy the template and edit:

```bash
cp .env.example .env
```

Minimum for the API:

```
DATABASE_URL=postgres://username:password@host:port/database
PORT=5000
```

Replace `username`, `password`, `host`, `port`, and `database` with your PostgreSQL credentials.

The API **only** reads the repo-root `.env` (see `backend/lib/loadRootEnv.js`). To use another path, set `LUMINA_ENV_FILE` before starting Node.

Example keys (see `.env.example` for the full list):

```dotenv
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/DB
PORT=5000
NODE_ENV=development
JWT_SECRET=SECRET_KEY
JWT_REFRESH_SECRET=SECRET_KEY
FRONTEND_URL=http://localhost:5173
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your email
SMTP_PASSWORD=ABCD EFGH IJKL MNOP
SMTP_FROM_EMAIL=your email
VITE_API_URL=http://localhost:5000
VITE_GOOGLE_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
```

How to get gmail smtp?
You can follow this video:
https://youtu.be/ZfEK3WP73eY

Summary
1. Enable double factor authentication
2. Go to google account settings
3. Go to security
4. search for "App Password"
5. create a new peoject, call ir lumina and then gernetate your password.

For the api key and the oauth key we will generate it from the https://console.cloud.google.com/.
As of May 11, 2026 here are the instuctions
1. Log in to your google account
2. click the project
3. create a new project.
4. Name is as lumina
5. then let it create and you will be taken to a dashboard.
6. go the the side bar and then click api and services.
7. go to the tab credentials
8. you might need to set the oAuth Consent screen, follow through add your emails and select external.
9. then create credentials for oAuth.
10. Select web application
11. Name it Lumina
12. create and copy the client

## 2. Start the Backend
Run the following commands to start the backend server:
```bash
cd backend
npm install
node server.js or npm start
```
The backend will start on `http://localhost:5000`.

## 3. Start the Frontend
Navigate to the `react-user-dashboard` directory and run:
```bash
cd react-user-dashboard
npm install
npm run dev
```
The frontend will start on `http://localhost:5173`.

## 4. Database Table Creation
The backend automatically creates the `users` table and populates it with a default user if the table does not exist. The default user is:
- **Email**: `admin@example.com`
- **Password**: `admin123`

## 5. Sign-Up and Sign-In Instructions
### Sign-Up
1. Navigate to `http://localhost:5173/signup`.
2. Enter your email and password to create a new account.

### Sign-In
1. Navigate to `http://localhost:5173/login`.
2. Enter your email and password to log in.

If you encounter any issues, please check the backend logs for errors.
