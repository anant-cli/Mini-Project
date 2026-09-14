# Deployment Guide

ParkSlot is three separate services that all have to be wired together:

1. **Neon** — Postgres database
2. **Render** — the Express API (`backend/`)
3. **Vercel** — the static frontend (`frontend/`)

If you deploy them out of order, or skip an environment variable, the most
common symptom is exactly what you're likely seeing: **"Request failed with
status code 404" on signup/login**. That happens because the frontend has no
idea where the backend lives, so it calls its own domain (`your-app.vercel.app/api/...`),
finds nothing there, and Vercel's catch-all route returns a 404 page. This
guide fixes that and covers the rest of the checklist for a production
deploy.

## 1. Database (Neon)

1. Create a free project at neon.tech.
2. Copy the connection string (the one **with** the password included —
   in the Neon UI, click "Show password" before copying).
3. Apply the schema:
   ```bash
   psql "$DATABASE_URL" -f database/schema.sql
   ```

## 2. Backend (Render)

1. New Web Service → point it at this repo → **Root Directory: `backend`**.
2. Build command: `npm install`. Start command: `node src/server.js`.
3. Set these environment variables in Render's dashboard:

   | Variable | Value |
   |---|---|
   | `DATABASE_URL` | the Neon connection string from step 1 |
   | `JWT_SECRET` | a long random string (32+ chars) |
   | `NODE_ENV` | `production` |
   | `CORS_ORIGIN` | your Vercel URL, e.g. `https://your-app.vercel.app` (no trailing slash) |
   | `PLATFORM_COMMISSION_PERCENT` | `15` (or your preference) |
   | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` | optional — without these, OTP codes are logged to the Render console instead of emailed. Fine for a demo, not for real users. |

4. Deploy, then confirm it's alive: visit `https://your-backend.onrender.com/health`
   — it should return `{"status":"ok","service":"parkslot-api"}`.

   Note: Render's free tier sleeps after inactivity, so the first request
   after idling can take 30–60s to wake up. That will look like a timeout,
   not a 404 — don't confuse the two.

## 3. Frontend (Vercel)

This is the step that gets missed most often.

1. New Project → point it at this repo → **Root Directory: `frontend`**.
2. Framework preset: Vite. Build command `npm run build`, output dir `dist` (Vercel usually detects this automatically).
3. **Before your first (or next) deploy**, go to Project Settings →
   Environment Variables and add:

   | Variable | Value |
   |---|---|
   | `VITE_API_URL` | `https://your-backend.onrender.com/api` (must include `/api`, no trailing slash) |

   **The variable name must be exactly `VITE_API_URL`.** Vite only exposes
   env vars to client-side code if they start with the `VITE_` prefix — this
   is a deliberate security feature so server secrets never leak into the
   browser bundle. A variable named `API_URL` (no prefix) is invisible to
   `import.meta.env` and will silently fall back to `/api`, which is the
   single most common cause of the "404 on signup" bug. Double-check the
   exact key name in Vercel's Environment Variables screen.

   Vite inlines `VITE_*` variables **at build time**. Adding or renaming the
   variable after a build already ran does nothing — you must redeploy so it
   rebuilds with the variable present. In Vercel: Deployments → ⋯ → Redeploy
   (make sure "Use existing Build Cache" is off the first time).

4. Redeploy, then open your browser console on the live site. If
   `VITE_API_URL` is still missing, `frontend/js/api.js` now logs a loud
   warning telling you exactly that, instead of failing silently.

## 4. Verify end to end

1. Open `https://your-app.vercel.app`, open dev tools → Network tab.
2. Try signing up. The request should go to
   `https://your-backend.onrender.com/api/auth/signup`, **not**
   `https://your-app.vercel.app/api/auth/signup`.
3. If you get a CORS error instead of a 404, double check `CORS_ORIGIN` on
   Render matches your Vercel URL exactly (including `https://`, no
   trailing slash, and no `www.` mismatch).

## Common failure modes

| Symptom | Cause | Fix |
|---|---|---|
| 404 on every API call, plain HTML/404 page in the response | `VITE_API_URL` not set at build time, or set under the wrong name (e.g. `API_URL` instead of `VITE_API_URL`) | Set the key named exactly `VITE_API_URL` in Vercel, redeploy without build cache |
| "Cannot reach the server" / Network Error | Backend asleep (Render free tier) or wrong URL | Wait ~60s and retry; double-check the Render URL |
| CORS error in console | `CORS_ORIGIN` on Render doesn't match the Vercel domain | Set `CORS_ORIGIN` to the exact frontend origin |
| Signup succeeds but no verification email arrives | No SMTP configured | Set `SMTP_HOST`/`SMTP_USER`/`SMTP_PASS`, or check Render logs — the OTP is printed there in dev mode |
| 500 error on any DB-backed route | Schema not applied, or `DATABASE_URL` missing the password | Re-run `psql "$DATABASE_URL" -f database/schema.sql`; re-copy the connection string from Neon with "Show password" enabled |
