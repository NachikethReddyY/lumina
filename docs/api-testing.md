# Auth endpoints — how to test with curl

Base path: **`http://localhost:5000/api/v1`** (change host/port if your `.env` differs).

```bash
export API=http://localhost:5000/api/v1
```

All requests below use `Content-Type: application/json` unless noted.

---

## Endpoints overview

| Feature | Method | Path | Body (JSON) |
|--------|--------|------|-------------|
| Log in | `POST` | `/auth/login` | `email`, `password` |
| Sign up | `POST` | `/auth/signup` | `email`, `password`, `firstName`, `lastName` (optional: `role` ignored; new users are `user`) |
| Verify email | `POST` | `/auth/verify-email` | `token` (from activation link) |
| Resend activation | `POST` | `/auth/resend-verification` | `email` |
| Forgot password | `POST` | `/auth/forgot-password` | `email` |
| Reset password | `POST` | `/auth/reset-password` | `token`, `password` |
| Google sign-in | `POST` | `/auth/google` | `credential` (ID token from Google button in the app) |
| Refresh token | `POST` | `/auth/refresh` | not implemented (`501`) |
| List users | `GET` | `/users` | none (no auth required today) |

---

## 1. Log in

**Request**

```bash
curl -sS -X POST "$API/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"alice@test.lumina","password":"Testpass1"}'
```

**Success (`200`)** — JSON includes:

- `accessToken` — JWT; use as `Authorization: Bearer <token>` when you add protected routes.
- `refreshToken` — may be empty until refresh is implemented.
- `user` — `id`, `email`, `first_name`, `last_name`, `role`, `status`, etc.

**Failures**

- `400` — bad email format or missing fields; body may include `details` per field.
- `401` — wrong email/password (`{ "error": "..." }`).
- `403` — account exists but email not verified yet (`{ "error": "...", "code": "EMAIL_NOT_VERIFIED" }`).

**Test accounts** (if your DB was seeded with current `backend/server.js`):

- `admin@example.com` / `Adminpass1` (only if that row was inserted on empty DB).
- `alice@test.lumina`, `bob@test.lumina`, `carol@test.lumina` / `Testpass1`.

---

## 2. Sign up (create account)

Password rules: **8–128 characters**, at least one **lowercase**, **uppercase**, and **digit** (leading/trailing spaces are trimmed before checks).

**Request**

```bash
curl -sS -X POST "$API/auth/signup" \
  -H 'Content-Type: application/json' \
  -d '{
    "email":"new.user@example.com",
    "firstName":"New",
    "lastName":"User",
    "password":"LuminaPass1"
  }'
```

**Success (`201`)** — depends on SMTP (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM_EMAIL` in `backend/.env`):

- **SMTP configured:** `requiresEmailVerification: true`, no `accessToken` until the user completes **Verify email** below. An activation email is sent (link uses `FRONTEND_URL`, first origin).
- **SMTP not configured:** `requiresEmailVerification: false`, `accessToken` returned immediately (local dev).

**Failures**

- `400` — validation; look for `details` (`email`, `firstName`, `lastName`, `password`).
- `409` — email already exists.
- `503` — user row may exist but verification email failed (`code`: `MAIL_FAILED`).

After SMTP signup, open the link in the email (or call **Verify email**), then use **Log in**.

---

## 2b. Verify email (activate account)

Use the `token` query value from the email link (`/verify-email?token=...` on the frontend calls this API).

```bash
curl -sS -X POST "$API/auth/verify-email" \
  -H 'Content-Type: application/json' \
  -d '{"token":"PASTE_ACTIVATION_TOKEN"}'
```

**Success (`200`)** — `accessToken`, `user`, `message`.

**Failures** — `400` invalid or expired token.

---

## 2c. Resend activation email

Only works for **pending** password signups when SMTP is configured.

```bash
curl -sS -X POST "$API/auth/resend-verification" \
  -H 'Content-Type: application/json' \
  -d '{"email":"new.user@example.com"}'
```

**Success (`200`)** — generic `message` (same whether or not a pending user existed).

**Failures** — `400` validation; `503` if SMTP is not configured or send failed.

---

## 3. Forgot password (request reset)

Does not reveal whether the email exists. Response always uses the same **message** shape when the email is unknown.

**Request**

```bash
curl -sS -X POST "$API/auth/forgot-password" \
  -H 'Content-Type: application/json' \
  -d '{"email":"alice@test.lumina"}'
```

**Success (`200`)** — JSON includes:

- `message` — generic copy for the user.
- `emailSent` — `true` if SMTP is configured and the reset email was sent successfully.

**Local dev (`NODE_ENV` not `production`)** — if the user exists and **no** email was sent (SMTP off or send failed), you may get:

- `devResetLink` — open in the browser or copy the `token` for **Reset password** below.

**Failures**

- `400` — invalid or missing email (`details.email`).

---

## 4. Reset password (submit new password)

Use the `token` from the reset email link, or from `devResetLink` in dev when email was not sent.

**Request**

```bash
curl -sS -X POST "$API/auth/reset-password" \
  -H 'Content-Type: application/json' \
  -d '{"token":"PASTE_TOKEN_HERE","password":"AnotherPass2"}'
```

**Success (`200`)** — e.g. `{ "message": "Password updated. You can sign in now." }`

**Failures**

- `400` — invalid/expired token, weak password, or missing fields (`details`).

Then **Log in** again with the same email and the **new** password.

---

## 5. Google sign-in

**Request**

```bash
# Requires a real ID token from the Google Identity Services flow (e.g. app “Sign in with Google”).
curl -sS -X POST "$API/auth/google" \
  -H 'Content-Type: application/json' \
  -d '{"credential":"<id_token_jwt>"}'
```

**Success (`200`)** — same shape as login: `accessToken`, `user`, etc.

**Failures**

- `400` — missing `credential` or unusable Google profile.
- `401` / `503` — invalid token or `GOOGLE_CLIENT_ID` not set on the server.

Easiest check: use the React login/signup screen with Google after setting **`GOOGLE_CLIENT_ID`** and **`VITE_GOOGLE_CLIENT_ID`** to the same Web client ID in the **repo root** `.env`.

---

## 6. List users (smoke test)

**Request**

```bash
curl -sS "$API/users"
```

Returns an array of user objects (no password fields). Today this route does **not** require a JWT; that may change later.

---

## 7. Refresh token

**Request**

```bash
curl -sS -X POST "$API/auth/refresh" \
  -H 'Content-Type: application/json' \
  -d '{"refreshToken":""}'
```

**Response** — `501` until refresh is implemented.

---

## Quick flow to “test login features”

1. **Sign up** with a new email and a valid password (with SMTP: activate via email or **Verify email** first).  
2. **Log in**; confirm `accessToken` and `user` (pending accounts return **403** until verified).  
3. **Forgot password**; use the emailed link or `devResetLink` in dev.  
4. **Reset password** with the token and a new valid password.  
5. **Log in** again with the **new** password.

---

## Server setup (once)

- Postgres + `backend/db/init.sql`.
- **Repo root env files**: API loads via `backend/lib/loadRootEnv.js` (not `backend/.env`). Use **`.env.development`** for local (`npm run dev`) and **`.env.hosting`** for hosting-style runs (`npm run dev:hosting`); copy from `.env.development.example` / `.env.hosting.example`. Legacy single **`.env`** still works. Override path with `LUMINA_ENV_FILE` if needed. Vite reads the matching mode file (`--mode development` vs `--mode hosting`) from the repo root.
- **CORS / links in emails:** `FRONTEND_URL` — use your Vite URL first, e.g. `http://localhost:5173` (comma-separated for multiple origins).
- **Gmail SMTP (optional but recommended):** `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` (app password; spaces are stripped), `SMTP_FROM_EMAIL`.
- Run: `cd backend && npm install && npm run dev`.

## Testing with the React app

- Put `VITE_API_URL`, `VITE_GOOGLE_CLIENT_ID`, etc. in the same profile file as the API (`.env.development` or `.env.hosting`). Optional Vite overrides: `.env.development.local` / `.env.hosting.local` (gitignored by `*.local`).
- Run `npm run dev` (local profile) or `npm run dev:hosting` (hosting profile) from the **repository root**, then use **Sign up**, **Log in**, **Forgot password**, and the **activation / reset links** from email (or dev fallback links).
