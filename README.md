# dn3point.github.io

Personal website: [dn3point.github.io](https://dn3point.github.io/)

A single static page in a cyberpunk style. There's no build step: GitHub Pages serves the files as they are.

## Built with

- [augmented-ui](https://augmented-ui.com/) for the clipped cyberpunk panels and buttons (`data-augmented-ui` attributes)
- [GSAP](https://gsap.com/) for the boot sequence, hero intro, mouse parallax, reticle cursor and random glitches,
  plus these plugins:
  - ScrollTrigger: scroll reveals, the timeline beam, the HUD progress bar
  - ScrambleText: text that decodes into place
  - SplitText: the line-by-line intro reveal
- [vanilla-tilt](https://micku7zu.github.io/vanilla-tilt.js/) for the holographic tilt and glare on cards (`data-holo` attributes)
- [Typed.js](https://github.com/mattboldt/typed.js) for the typing line in the hero
- [Iconify](https://iconify.design/) for icons (`<iconify-icon icon="set:name">`, from the Simple Icons and Material Design Icons sets)
- Google Fonts: Orbitron, Rajdhani, Share Tech Mono, and a Noto Sans SC subset for the neon signs
- The public GitHub REST API for the live repo feed and repo count

The libraries load from jsDelivr with pinned versions and SRI hashes.

## Effects

| Effect | Where |
| --- | --- |
| Boot screen with a CRT power-off, once per browser session (click, tap or any key skips it) | `runBoot` in `main.js`, `.boot` in `fx.css` |
| Generated Night City skyline with flickering windows and antenna beacons | `buildSkyline` in `main.js` |
| Neon rain, HUD rings, perspective grid, caution-tape tickers | CSS loops in `fx.css` / `main.css` |
| Decoding titles, hover scramble on labels (`data-hover-scramble`) | `decode` in `main.js` |
| Panels that flicker on when scrolled to (`data-reveal`), a timeline beam that follows scroll, a self-typing terminal | ScrollTrigger in `main.js` |
| Reticle cursor that locks onto links, holographic card tilt (mouse and trackpad only) | `main.js` |

With `prefers-reduced-motion` set, all motion is skipped and the page renders statically. If the GSAP scripts fail to load, the page still shows all of its content.

## Files

| Path | Purpose |
| --- | --- |
| `index.html` | All content and markup |
| `styles/main.css` | Theme tokens (`:root`), layout, static look |
| `styles/fx.css` | Motion and effect styles |
| `scripts/main.js` | Clock, nav, skyline, GitHub data, all GSAP animation |
| `favicon.svg` | Icon |

## Custom domain

The site is served from `dn3point.github.io` with no custom domain. To use one again, add a `CNAME` file containing
the domain (or set it in Settings → Pages), then point the domain's DNS at GitHub Pages: `A` records
`185.199.108.153`, `185.199.109.153`, `185.199.110.153` and `185.199.111.153`, or a `CNAME` record to
`dn3point.github.io` for a subdomain.

## Local preview

```bash
python3 -m http.server 8000
# open http://localhost:8000
```
