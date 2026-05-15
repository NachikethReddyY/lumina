# Production deployment guide

## Short answer

Yes — you can get **very close to a fully free deployment** for a school project, teacher demo, or small prototype.

The safest answer is:

- **Frontend on Vercel Hobby**: yes, free
- **Backend on Vercel Functions**: possible on the free Hobby plan, within usage limits
- **PostgreSQL**: not hosted directly by Vercel anymore; use a marketplace/external provider
- **SMTP email**: Gmail can work for small-scale testing, but it is not ideal for long-term production

So the honest answer is:

> **Yes for a small prototype/demo.**
>
> **Not a guaranteed forever-free production stack if usage grows.**

## Current Vercel reality

### 1. Vercel Hobby is free

Vercel's Hobby plan is listed as **free forever** and includes deployments, CDN, and limited function usage:

- Pricing: [https://vercel.com/pricing](https://vercel.com/pricing)

As of May 12, 2026, the Vercel Hobby plan includes free allowances for:

- deployments
- 1M function invocations per month
- 4 hours of active CPU per month
- 360 GB-hours of provisioned memory per month

That is usually enough for a teacher demo or a light prototype.

### 2. Vercel no longer has its old standalone Postgres product

Vercel now points developers to **Marketplace Storage integrations** instead of the older Vercel Postgres product:

- Storage docs: [https://vercel.com/docs/storage/vercel-postgres](https://vercel.com/docs/storage/vercel-postgres)
- Changelog note: [https://vercel.com/changelog/vercel-postgres](https://vercel.com/changelog/vercel-postgres)

That means your database would normally live with a provider like Supabase or Neon, then be connected to Vercel through environment variables or a marketplace integration.

### 3. Bun is supported on Vercel Functions

Vercel documents Bun runtime support for Functions, and the Bun runtime is available in beta on all plans:

- Bun runtime docs: [https://vercel.com/docs/functions/runtimes/bun](https://vercel.com/docs/functions/runtimes/bun)
- Runtime overview: [https://vercel.com/docs/functions/runtimes](https://vercel.com/docs/functions/runtimes)

That means Bun is a valid option for deployment, but **Node is still the lower-risk choice** for compatibility in this project today.

## Free database options that fit this project

### Option A — Supabase Free

Supabase currently advertises:

- `$0/month`
- `500 MB` database size
- `2` active free projects
- free projects pause after `1 week` of inactivity

Source:

- Pricing: [https://supabase.com/pricing](https://supabase.com/pricing)
- Billing docs: [https://supabase.com/docs/guides/platform/billing-on-supabase](https://supabase.com/docs/guides/platform/billing-on-supabase)

This is a strong option for a classroom demo or a small prototype.

### Option B — Neon

Neon is also a common choice with Vercel, especially because Vercel previously leaned on Neon for Postgres workflows. If you prefer Neon, use the current Neon pricing page and choose its free tier if it still fits your needs.

For this repo, **Supabase Free is the easier recommendation to document clearly today** because its current free limits are easy to verify and understand.

## Recommended zero-cost setup for this repo

For the project in its current shape, I recommend:

### Best practical setup

- **Frontend**: Vercel Hobby
- **Backend**: keep local for development first, then move API routes to Vercel Functions when ready
- **Database**: Supabase Free Postgres
- **Email**: Gmail SMTP for testing
- **AI routing**: Gemini API with conservative usage

### Why this is the best fit

- cheapest path
- low setup complexity
- enough for a teacher/client demo
- easy to explain in class

## Important limitation with the current backend

Your backend is currently an **Express server**.

Vercel does **not** run apps as a permanently running server in the same way a VPS or Render service would. Vercel is built around **Functions**.

That means:

- the frontend is ready for Vercel-style deployment
- the backend will be easiest to deploy on Vercel after it is adapted into API functions or serverless handlers

## What “optimized for Vercel free” means here

To stay free and deployment-friendly, the app should aim for:

- stateless API requests
- short-lived backend execution
- PostgreSQL over TLS
- root-level build commands
- server-side auth checks
- small frontend bundle

This repo is now closer to that because:

- env config is centralized at the repo root
- root scripts run frontend and backend from one place
- Bun support is documented for local development
- auth and verification are handled server-side

## Gmail SMTP note

Gmail SMTP is okay for:

- OTP testing
- password reset testing
- very small demo usage

It is **not my first choice for long-term production** because:

- it has sending limits
- it is more fragile than a dedicated email provider
- account security settings can block sends

For your teacher demo, it is fine.

## Recommended deployment path

### Phase 1 — local/staging

1. Use root scripts:
   - `npm run dev`
   - or `bun run dev:bun`
2. Use local PostgreSQL or hosted Supabase
3. Keep Gmail SMTP for OTP/password reset

### Phase 2 — free hosted demo

1. Deploy frontend to Vercel Hobby
2. Move backend endpoints to Vercel Functions
3. Connect `DATABASE_URL` to Supabase
4. Set environment variables in Vercel
5. Keep SMTP credentials in Vercel env vars

### Phase 3 — real production

If the app grows, expect to eventually move to:

- a paid email provider
- a paid database tier
- either paid Vercel usage or a dedicated backend host

## Can everything stay 100% free forever?

For a tiny system with a handful of users:

- **possibly, yes**

For a real production rollout:

- **you should assume no**

The main reasons are:

- database free-tier limits
- serverless compute limits
- email sending limits
- inactivity pausing on some free database providers

## Bun recommendation

You asked to support Bun as well as Node.

My recommendation:

- use **Node as the default production runtime**
- use **Bun locally** where you want faster install/build workflows
- if you later deploy to Vercel Functions with Bun, do it after backend routes are stabilized

That gives you the benefits of Bun without increasing deployment risk too early.

## What I would do next if we want full Vercel deployment

1. Convert Express routes into Vercel API handlers
2. Keep PostgreSQL on Supabase or Neon
3. Add a `vercel.json` only after choosing the final deployment shape
4. Test OTP, login, ticket creation, and dashboard data in the hosted environment

## Reference links

- Vercel pricing: [https://vercel.com/pricing](https://vercel.com/pricing)
- Vercel Bun runtime: [https://vercel.com/docs/functions/runtimes/bun](https://vercel.com/docs/functions/runtimes/bun)
- Vercel runtimes overview: [https://vercel.com/docs/functions/runtimes](https://vercel.com/docs/functions/runtimes)
- Vercel Postgres/storage note: [https://vercel.com/docs/storage/vercel-postgres](https://vercel.com/docs/storage/vercel-postgres)
- Vercel changelog note on Postgres replacement: [https://vercel.com/changelog/vercel-postgres](https://vercel.com/changelog/vercel-postgres)
- Supabase pricing: [https://supabase.com/pricing](https://supabase.com/pricing)
- Supabase billing docs: [https://supabase.com/docs/guides/platform/billing-on-supabase](https://supabase.com/docs/guides/platform/billing-on-supabase)
