# dn3point.github.io

Personal website: [zhaoyuan.page](https://zhaoyuan.page)

A single static page in a cyberpunk style. There's no build step: GitHub Pages serves the files as they are.

## Built with

- [augmented-ui](https://augmented-ui.com/) for the clipped cyberpunk panels and buttons (`data-augmented-ui` attributes)
- [Typed.js](https://github.com/mattboldt/typed.js) for the typing line in the hero
- [AOS](https://michalsnik.github.io/aos/) for reveal-on-scroll animations (`data-aos` attributes)
- [Iconify](https://iconify.design/) for icons (`<iconify-icon icon="set:name">`, from the Simple Icons and Material Design Icons sets)
- Google Fonts: Orbitron, Rajdhani, Share Tech Mono, and a Noto Sans SC subset for the neon sign
- The public GitHub REST API for the live repo feed and repo count

The libraries load from jsDelivr with pinned versions and SRI hashes.

## Files

| Path | Purpose |
| --- | --- |
| `index.html` | All content and markup |
| `styles/main.css` | Theme tokens (`:root`), layout, effects |
| `scripts/main.js` | Clock, nav, Typed/AOS setup, GitHub feed |
| `favicon.svg` | Icon |
| `CNAME` | Custom domain |

## Local preview

```bash
python3 -m http.server 8000
# open http://localhost:8000
```
