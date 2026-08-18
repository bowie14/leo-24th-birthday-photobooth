# Web Photobooth

Static web photobooth: capture 4 photos in sequence and get a printable photobooth strip. Pure HTML/CSS/JS — no backend, no build step. React/Babel load from CDN at runtime.

## Files
- `index.html` — landing screen (same as `Landing.dc.html`)
- `Booth.dc.html` — camera capture screen (4 shots, countdown timer, live frame overlay)
- `Result.dc.html` — final strip preview, download, restart
- `support.js` — runtime that renders the `.dc.html` files (do not edit)
- `uploads/` — all backgrounds, frames, buttons, icons

## Run locally
Just open `index.html` in a browser. Camera access needs either `localhost` or HTTPS — opening the file directly (`file://`) will not allow camera permission, so serve it locally, e.g.:
```
npx serve .
```

## Deploy
### GitHub Pages
1. Push this folder's contents to the repo root.
2. Settings → Pages → Source: branch `main`, folder `/ (root)`.
3. Site will be live at `https://<username>.github.io/<repo>/`.

### Vercel
1. Import the GitHub repo (or run `vercel deploy` from this folder).
2. Framework preset: "Other" (static site), no build command needed.

Both give HTTPS by default, required for camera access (`getUserMedia`).

## Flow
Landing → tap booth (rotate-to-landscape prompt on mobile portrait) → Booth (capture 4 shots) → Result (download strip or restart).
