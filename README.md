# LinkedIn Automation Engine

Full-stack Next.js web application and background worker for automating the LinkedIn Manager Engagement Flow via the Unipile API. Supports minute-based randomized time intervals, persistent database storage, and continuous background execution even when the browser is closed.

---

## 🏗️ Architecture & Deployment

- **Frontend & API Routes**: Next.js 15 (App Router, Tailwind CSS, Lucide Icons) deployed on **Vercel**.
- **Database**: Managed PostgreSQL on **Render** (or Neon / Supabase). Also supports local SQLite fallback.
- **API Engine**: Unipile API v1.

---

## 🌿 Git Branching Workflow

Repository: `https://github.com/Nitya152/LinkedIn-Automation`

We maintain three primary branches:
1. `main` — Production branch (auto-deployed to Vercel production).
2. `staging` — Staging branch (pre-production testing).
3. `dev` — Development integration branch.

### Standard Rule for Making Changes:
Always pull latest `staging` before creating a feature branch:
```bash
git checkout staging
git pull origin staging
git checkout -b feat/your-feature-name
```
After completing and testing your changes, commit cleanly and merge back into `staging` (and `dev`).

---

## 🚀 Step-by-Step Deployment Guide

### 1. Create PostgreSQL Database on Render
1. Go to [render.com](https://dashboard.render.com/) and click **New +** $\rightarrow$ **PostgreSQL**.
2. Set a name (e.g., `linkedin-automation-db`), select a region, and choose the Free tier.
3. Click **Create Database**.
4. Once provisioned, copy the **External Database URL** (e.g. `postgres://user:password@dpg-xxxx.render.com/dbname`).
5. Ensure `?sslmode=require` is appended if required by Render.

### 2. Deploy Frontend on Vercel
1. Go to [vercel.com](https://vercel.com/) and click **Add New...** $\rightarrow$ **Project**.
2. Select repository: `https://github.com/Nitya152/LinkedIn-Automation`.
3. In **Environment Variables**, add:
   - `DATABASE_URL`: Your Render PostgreSQL connection string.
4. Click **Deploy**. Vercel will build and deploy your app with zero additional configuration!

---

## ⚙️ Local Development

```bash
# 1. Install dependencies
npm install

# 2. (Optional) Run with local SQLite or connect to Render DB via .env:
cp .env.example .env.local

# 3. Start local development server
npm run dev

# 4. Or build and run production server locally
npm run build
npx next start -p 3005
```

Navigate to `http://localhost:3005` in your browser.

---

## ✨ Features

- **Single Profile & Batch Mode**: Automated 5-step flow (Lookup $\rightarrow$ Connection Check $\rightarrow$ Feed Retrieval $\rightarrow$ Reaction $\rightarrow$ Comment).
- **Minute-Based Humanized Random Intervals**: Configurable min/max gaps (e.g. 2 to 5 minutes) to avoid rate limits.
- **Persistent Database**: Powered by PostgreSQL / SQLite. Jobs continue running in the background even if you close the frontend or shut down your computer.
- **Audit Logging**: Real-time progress bar, live gap countdown, step JSON inspector, and 1-click **CSV / JSON** exports.
