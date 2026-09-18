# Maintenance page

Static "Bakımdayız" page served on `footballai.io` + `www.footballai.io` while
the app infrastructure (Vercel web project, Railway services) is shut down.

- Vercel project: `yuksel-arslans-projects/footballai-maintenance` (not linked
  to git — deploys only when run by hand).
- `theme.css` is a verbatim copy of `docs/footballai-theme.css`; re-copy it if
  the theme kit changes. The page itself uses only `--fa-*` tokens.
- `sw.js` is a kill-switch for the old PWA service worker (`footballai-v3`) so
  returning visitors see this page instead of a cached app shell. Every path
  (including `/api/*`) rewrites to `index.html`.

## Update

```bash
cd maintenance
vercel deploy --prod --scope yuksel-arslans-projects
```

## Leaving maintenance mode

1. Deploy the real app to its own Vercel project.
2. Move the domains over — run inside the (linked) app project directory.
   `--force` reassigns the domain from this project; do NOT use
   `vercel domains rm`, which acts on the team-level domain itself.
   ```bash
   vercel domains add footballai.io --force --scope yuksel-arslans-projects
   vercel domains add www.footballai.io --force --scope yuksel-arslans-projects
   ```
3. The app's own `/sw.js` replaces the kill-switch automatically.
