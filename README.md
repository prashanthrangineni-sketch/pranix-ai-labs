# Pranix AI Labs Website

Multi-page static site. Deploy entire folder to Vercel — no build step required.

## Public pages
- `index.html` — Home
- `products.html` — All 4 products (full detail)
- `ecosystem.html` — Architecture + Recognition
- `vision.html` — Roadmap + Upcoming products
- `contact.html` — Contact form
- `dashboard.html` — Original Founder HQ (legacy, base64-gated; preserved as-is)
- `404.html` — Error page

## Founder Console (Phase E dashboard, magic-link auth)

Routes:
- `/founder` — sign-in (magic link via Supabase Auth)
- `/founder/overview` — system status + ecosystem grid
- `/founder/products` — list of registered products
- `/founder/products/:name` — product detail + audit history
- `/founder/findings` — open-finding inbox + status mutator
- `/founder/commands` — command submit + history
- `/founder/tasks` — worker activity + recent tasks
- `/founder/dlq` — dead-letter queue inspector

Files in `/founder/`:
- `index.html` — sign-in
- `overview.html`, `products.html`, `product-detail.html`, `findings.html`, `commands.html`, `tasks.html`, `dlq.html`
- `styles.css` — shared design tokens
- `app.js` — shared bootstrap (Supabase + auth gate)

## Deploy

Upload all files to Vercel. `vercel.json` handles clean URL rewrites for `/founder/*`.

## One-time setup

1. **Edit `/founder/app.js`**: replace `__YOUR_SUPABASE_ANON_KEY__` with the anon key from Supabase Dashboard → Settings → API → "anon public" (project: `pranix-agents`).
2. **Configure Supabase Auth allowlist** at Supabase → Authentication → URL Configuration:
   - Site URL: `https://www.pranixailabs.com`
   - Redirect URLs: add `https://www.pranixailabs.com/founder/overview` and `https://pranixailabs.com/founder/overview` (both apex + www).
3. Push to GitHub. Vercel auto-deploys.

## Founder allowlist

The `dashboard_founders` table on `pranix-agents` Supabase controls who can sign in:
```sql
INSERT INTO public.dashboard_founders(email) VALUES ('newperson@example.com');
```
Run via Supabase MCP or the SQL editor with service-role.
