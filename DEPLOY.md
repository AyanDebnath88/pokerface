# Deploy PokerFace to Vercel

The repo is committed and the production build passes. Vercel auto-detects
Next.js — no config needed. Deploy now; add Supabase env keys later (the game
route shows a friendly "Almost there" until then; landing + demo work
immediately).

## Recommended: GitHub → Vercel

### 1. Create a GitHub repo

Go to <https://github.com/new>. Name it `pokerface` (public or private).
**Do not** initialize with a README (this project already has commits).

### 2. Push (run in the project folder)

Replace `YOUR-USER` with your GitHub username:

```bash
git remote add origin https://github.com/YOUR-USER/pokerface.git
git branch -M main
git push -u origin main
```

### 3. Import on Vercel

1. <https://vercel.com/new> → **Import** the `pokerface` repo.
2. Framework: **Next.js** (auto-detected). Leave build settings default.
3. Click **Deploy**. You get a live URL in ~1 minute.

### 4. Add Supabase env (when ready — see SETUP.md)

Vercel → your project → **Settings → Environment Variables**, add all three:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

Then **Deployments → ⋯ → Redeploy**. Live poker.

### 5. Custom domain (later)

Vercel → Settings → Domains → add your domain, follow the DNS instructions.

## Alternative: Vercel CLI

```bash
npm i -g vercel
vercel login
vercel          # preview deploy
vercel --prod   # production
```

Add env vars with `vercel env add NAME` (repeat for all three), then
`vercel --prod` again.
