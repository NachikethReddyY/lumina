# Project Instructions

## Git Remote Workflow

This repository uses two primary remotes for different purposes:

- **school**: The primary repository for academic submissions.
  - URL: `https://github.com/soc-DBSP/react-nodejs-project1-NachikethReddyY.git`
- **hosting**: The repository used for live deployment and hosting.
  - URL: `https://github.com/NachikethReddyY/lumina.git`

### How to Switch and Push

#### 1. Pushing to Hosting (Lumina)
When you want to deploy or update the hosted version:
```bash
git push hosting main
```

#### 2. Pushing to School (Submission)
When you want to submit your work or update the school repository:
```bash
git push school main
```

#### 3. Syncing Both
To ensure both remotes are up to date with your local changes:
```bash
git push school main && git push hosting main
```

### AI Guidance
When asked to "commit and push", always clarify which remote the user intends to target unless specified. If the goal is deployment, use `hosting`. If the goal is academic submission, use `school`.

## Deployment (Vercel - Option B)

This project is configured as a monorepo for Vercel. Both frontend and backend are hosted on the same Vercel project.

### Vercel Project Settings:
- **Framework Preset**: `Other` (or leave as detected)
- **Root Directory**: `./` (Project Root)
- **Build Command**: `npm run build`
- **Output Directory**: `react-user-dashboard/dist`
- **Install Command**: `npm install`

### Required Environment Variables:
Add these in Vercel **Settings > Environment Variables**:

**Backend:**
- `DATABASE_URL`: Your external PostgreSQL connection string (e.g., from Neon/Supabase).
- `JWT_SECRET`: A secure random string for authentication.
- `FRONTEND_URL`: Your Vercel deployment URL (e.g., `https://lumina-yourname.vercel.app`).
- `GOOGLE_CLIENT_ID`: (Optional) For Google OAuth.
- `EMAIL_USER` / `EMAIL_PASS`: (Optional) For email notifications.

**Frontend:**
- `VITE_API_URL`: `/api/v1` (The `vercel.json` rewrites handle this automatically).

### Deployment Workflow:
1. Push changes to `hosting/main`.
2. Vercel will auto-detect the `vercel.json` and deploy:
   - `/api/*` requests are routed to `backend/server.js`.
   - `/uploads/*` requests are routed to `backend/server.js`.
   - All other requests serve the React app from `react-user-dashboard`.

---
*Note: The `origin` remote has been renamed to `school` to avoid confusion. The `main` branch is currently tracking `school/main`.*

