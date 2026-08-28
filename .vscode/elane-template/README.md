# ÉLANE — Static Web Template

A clean, framework-free conversion of the ÉLANE womenswear store. Built with
plain HTML, CSS and vanilla JavaScript — no build step, no TypeScript, no
dependencies.

## Files
- `index.html` — semantic markup for all page sections
- `styles.css` — all styling (descriptive class names, responsive, no framework)
- `script.js` — all interactivity (vanilla JS)
- `assets/` — images and favicon

## Run it
Just open `index.html` in a browser. (For `.webp` images and relative paths to
load reliably, you can also serve the folder: `python3 -m http.server` then
visit http://localhost:8000.)

## Features preserved
Mood filtering, product grid with category filters, favourites, live search,
slide-in cart with quantity controls and free-delivery progress, product
quick-view modal with size selection, and a multi-step checkout — all working
without any framework.

## Customising
- Products live in the `products` array at the top of `script.js`.
- Colours and fonts are CSS custom properties in the `:root` block of `styles.css`.
