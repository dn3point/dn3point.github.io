(() => {
  'use strict';

  const GITHUB_USER = 'dn3point';
  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const { gsap, ScrollTrigger, ScrambleTextPlugin, SplitText, VanillaTilt } = window;
  const canAnimate = !reduceMotion && Boolean(gsap && ScrollTrigger);

  // Glyph pools for the decode effect: uppercase for titles, lowercase for mixed-case labels
  const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=<>/';
  const GLYPHS_LOWER = 'abcdefghijklmnopqrstuvwxyz0123456789';

  if (canAnimate) {
    gsap.registerPlugin(...[ScrollTrigger, ScrambleTextPlugin, SplitText].filter(Boolean));
    root.classList.add('fx');
  } else {
    root.classList.remove('fx-pending', 'is-booting');
  }

  // ---------- footer year ----------
  document.getElementById('year').textContent = new Date().getFullYear();

  // ---------- Singapore clock in the HUD ----------
  const clock = document.getElementById('sgt-clock');
  const clockFormat = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Singapore',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const tick = () => { clock.textContent = clockFormat.format(new Date()); };
  tick();
  setInterval(tick, 1000);

  // ---------- mobile nav ----------
  const toggle = document.querySelector('.hud__toggle');
  const nav = document.getElementById('hud-nav');
  const setNav = (open) => {
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
  };
  toggle.addEventListener('click', () => setNav(!nav.classList.contains('is-open')));
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) setNav(false); });

  // ---------- text decode helpers (GSAP ScrambleText; plain swap without motion) ----------
  const placeholder = (text) =>
    text.replace(/\S/g, () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)]);

  const decode = (el, text, vars = {}) => {
    if (!canAnimate || !ScrambleTextPlugin) {
      el.textContent = text;
      return null;
    }
    const { scrambleText, ...rest } = vars;
    return gsap.to(el, {
      duration: 0.9,
      ease: 'none',
      overwrite: true,
      ...rest,
      scrambleText: { text, chars: GLYPHS, speed: 0.5, revealDelay: 0.25, ...scrambleText },
    });
  };

  // CRT-style power-on: opacity stutters before settling
  const flicker = (targets, vars = {}) => {
    gsap.set(targets, { opacity: 0 });
    return gsap.to(targets, {
      keyframes: { opacity: [0, 1, 0.15, 1, 0.45, 1], easeEach: 'none' },
      duration: 0.5,
      ease: 'none',
      ...vars,
    });
  };

  // ---------- nav spy + HUD section readout ----------
  const SECTION_NAMES = {
    home: '00 // HOME',
    about: '01 // IDENTITY',
    stack: '02 // CYBERWARE',
    log: '03 // SYSTEM LOG',
    projects: '04 // DATA SHARDS',
    contact: '05 // JACK IN',
  };
  const hudLoc = document.getElementById('hud-loc');
  const links = new Map([...nav.querySelectorAll('a')].map((a) => [a.hash.slice(1), a]));
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const { id } = entry.target;
      links.forEach((a) => a.classList.remove('is-active'));
      links.get(id)?.classList.add('is-active');
      if (hudLoc.dataset.id !== id) {
        hudLoc.dataset.id = id;
        decode(hudLoc, SECTION_NAMES[id], { duration: 0.6, scrambleText: { revealDelay: 0.1 } });
      }
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  Object.keys(SECTION_NAMES).forEach((id) => {
    const section = document.getElementById(id);
    if (section) spy.observe(section);
  });

  // ---------- pause CSS loops that are scrolled out of view ----------
  const offscreen = new IntersectionObserver((entries) => {
    entries.forEach((entry) => entry.target.classList.toggle('is-offscreen', !entry.isIntersecting));
  });
  document.querySelectorAll('.hero, .tickers').forEach((node) => offscreen.observe(node));

  // ---------- procedural Night City skyline ----------
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const WINDOW_COLORS = ['#3ff5ee', '#3ff5ee', '#ff2a6d', '#fcee0a', '#d6fbfa'];

  // mulberry32: small seeded PRNG so the skyline is identical on every visit
  const seeded = (seed) => () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const svgEl = (tag, attrs) => {
    const node = document.createElementNS(SVG_NS, tag);
    Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
    return node;
  };

  // Buildings, windows and antennas are merged into a few <path>s (grouped by colour and
  // flicker phase) so the skyline adds a handful of nodes instead of hundreds.
  const FLICKER_GROUPS = 4;
  const buildSkyline = (svg, { seed, minH, maxH, litChance, flickerChance }) => {
    const W = 1440;
    const H = 320;
    const rand = seeded(seed);
    const frag = document.createDocumentFragment();
    const windows = new Map(); // "color|group" -> path data; group 0 = steady
    let buildings = '';
    let antennas = '';
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('preserveAspectRatio', 'xMidYMax slice');

    for (let x = -10; x < W;) {
      const w = 36 + rand() * 64;
      const h = minH + rand() ** 1.4 * (maxH - minH);
      const top = H - h;
      buildings += `M${x.toFixed(1)} ${top.toFixed(1)}h${w.toFixed(1)}V${H}H${x.toFixed(1)}Z`;

      // antenna with a blinking beacon on some of the tall towers
      if (h > maxH * 0.72 && rand() < 0.5) {
        const ax = (x + w / 2).toFixed(1);
        const ay = (top - 14 - rand() * 26).toFixed(1);
        antennas += `M${ax} ${top.toFixed(1)}V${ay}`;
        frag.append(svgEl('circle', { class: 'beacon', cx: ax, cy: ay, r: 2.2, style: `animation-delay:${(rand() * 1.6).toFixed(2)}s` }));
      }

      for (let wy = top + 8; wy < H - 6; wy += 9) {
        for (let wx = x + 5; wx < x + w - 6; wx += 7) {
          if (rand() > litChance) continue;
          const group = rand() < flickerChance ? 1 + Math.floor(rand() * FLICKER_GROUPS) : 0;
          const key = `${WINDOW_COLORS[Math.floor(rand() * WINDOW_COLORS.length)]}|${group}`;
          windows.set(key, `${windows.get(key) || ''}M${wx.toFixed(1)} ${wy.toFixed(1)}h3v4h-3Z`);
        }
      }
      x += w + rand() * 4;
    }

    frag.prepend(svgEl('path', { class: 'bldg', d: buildings }), svgEl('path', { class: 'antenna', d: antennas }));
    windows.forEach((d, key) => {
      const [fill, group] = key.split('|').map((v, i) => (i ? Number(v) : v));
      const attrs = { class: group ? 'win win--flicker' : 'win', fill, d };
      if (group) attrs.style = `animation-delay:${(group * 1.3).toFixed(1)}s`;
      frag.append(svgEl('path', attrs));
    });
    svg.append(frag);
  };

  buildSkyline(document.querySelector('.skyline--far'), { seed: 7, minH: 80, maxH: 260, litChance: 0.06, flickerChance: 0 });
  buildSkyline(document.querySelector('.skyline--near'), { seed: 42, minH: 36, maxH: 180, litChance: 0.12, flickerChance: 0.12 });

  // ---------- Typed.js terminal line ----------
  const startTyped = () => {
    if (!window.Typed || reduceMotion) return;
    new window.Typed('#typed', {
      strings: [
        'Software Engineer @ GIC Labs',
        'Web · Mobile · Cloud',
        'Jacked in from Singapore since 2013',
        'Studied networks & streaming @ NUS',
        'Currently building. Always learning.',
      ],
      typeSpeed: 42,
      backSpeed: 18,
      backDelay: 1800,
      startDelay: 200,
      loop: true,
      smartBackspace: true,
      contentType: null,
    });
  };

  // ---------- live data from the public GitHub API ----------
  const LANG_CLASS = {
    Java: 'java', JavaScript: 'js', TypeScript: 'ts', HTML: 'html',
    CSS: 'css', Ruby: 'ruby', Python: 'python',
  };
  const relTime = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const UNITS = [
    ['year', 31536000], ['month', 2592000], ['week', 604800],
    ['day', 86400], ['hour', 3600], ['minute', 60],
  ];
  const ago = (iso) => {
    const seconds = (new Date(iso).getTime() - Date.now()) / 1000;
    for (const [unit, size] of UNITS) {
      if (Math.abs(seconds) >= size) return relTime.format(Math.round(seconds / size), unit);
    }
    return 'just now';
  };

  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  };

  const getJSON = (path) =>
    fetch(`https://api.github.com${path}`, { headers: { Accept: 'application/vnd.github+json' } })
      .then((res) => { if (!res.ok) throw new Error(`GitHub API ${res.status}`); return res.json(); });

  const repoCount = document.getElementById('stat-repos');
  getJSON(`/users/${GITHUB_USER}`)
    .then((user) => {
      if (!canAnimate) {
        repoCount.textContent = user.public_repos;
        return;
      }
      // count up once the ID card is on screen
      const counter = { n: 0 };
      gsap.to(counter, {
        n: user.public_repos,
        duration: 1.6,
        ease: 'power2.out',
        snap: { n: 1 },
        onUpdate: () => { repoCount.textContent = counter.n; },
        scrollTrigger: { trigger: repoCount, start: 'top 92%', once: true },
      });
    })
    .catch(() => { /* keep the placeholder */ });

  const feed = document.getElementById('feed-list');
  getJSON(`/users/${GITHUB_USER}/repos?type=owner&sort=pushed&per_page=12`)
    .then((repos) => {
      const items = repos.filter((r) => !r.fork && !r.archived).slice(0, 6);
      if (!items.length) throw new Error('no repos');
      feed.replaceChildren(...items.map((repo) => {
        const li = el('li');

        const main = el('div');
        const link = el('a', null, repo.name);
        link.href = repo.html_url;
        link.target = '_blank';
        link.rel = 'noopener';
        main.append(link);
        if (repo.description) main.append(el('span', 'feed__desc', repo.description));

        const lang = el('span', 'feed__lang');
        if (repo.language) lang.append(el('i', `lang lang--${LANG_CLASS[repo.language] || 'other'}`), repo.language);

        const time = el('time', null, ago(repo.pushed_at));
        time.dateTime = repo.pushed_at;

        li.append(main, lang, time);
        return li;
      }));
      if (canAnimate) {
        gsap.from(feed.children, {
          opacity: 0,
          x: -16,
          duration: 0.4,
          stagger: 0.07,
          clearProps: 'transform',
          scrollTrigger: { trigger: feed, start: 'top 92%', once: true },
        });
        ScrollTrigger.refresh();
      }
    })
    .catch(() => {
      feed.replaceChildren(el('li', 'feed__status', 'Uplink failed. Browse the repositories on GitHub instead.'));
    });

  // Everything below is motion only.
  if (!canAnimate) {
    startTyped();
    return;
  }

  // ---------- boot sequence (once per session) ----------
  const runBoot = () => new Promise((resolve) => {
    const boot = document.querySelector('.boot');
    if (!root.classList.contains('is-booting')) {
      boot.remove();
      resolve();
      return;
    }

    let finished = false;
    const tl = gsap.timeline();
    const skip = () => tl.progress(1);
    const done = () => {
      if (finished) return;
      finished = true;
      window.removeEventListener('keydown', skip);
      root.classList.remove('is-booting');
      boot.remove();
      try { sessionStorage.setItem('zy-booted', '1'); } catch (e) { /* storage blocked: boot again next visit */ }
      ScrollTrigger.refresh();
      resolve();
    };

    tl.from('.boot__brand', { opacity: 0, y: -8, duration: 0.3 })
      .from('.boot__log li', { opacity: 0, x: -12, duration: 0.15, stagger: 0.17 }, 0.15)
      .from('.boot__log b', { opacity: 0, duration: 0.05, stagger: 0.17 }, 0.35)
      .to('.boot__bar i', { scaleX: 1, duration: 1.1, ease: 'steps(24)' }, 0.15)
      .to('.boot__status', { keyframes: { opacity: [0, 1, 0.2, 1, 0.4, 1] }, duration: 0.4, ease: 'none' })
      // CRT power-off: flash, collapse to a scanline, then to nothing
      .set('.boot__inner', { opacity: 0 }, '+=0.25')
      .to(boot, { backgroundColor: '#d6fbfa', duration: 0.05 })
      .to(boot, { scaleY: 0.004, duration: 0.18, ease: 'power4.in' })
      .to(boot, { scaleX: 0, duration: 0.16, ease: 'power4.in' })
      .eventCallback('onComplete', done);

    boot.addEventListener('click', skip, { once: true });
    window.addEventListener('keydown', skip);
  });

  // ---------- random screen glitch ----------
  const glitchLayer = document.querySelector('.fx-glitch');
  const glitch = () => {
    const tl = gsap.timeline();
    tl.set(glitchLayer, { visibility: 'visible' });
    for (let k = 0; k < 4; k++) {
      tl.set(glitchLayer.children, {
        top: () => `${gsap.utils.random(0, 100)}%`,
        height: () => gsap.utils.random(2, 18),
        x: () => gsap.utils.random(-30, 30),
      }, k * 0.055);
    }
    tl.to('main', { x: () => gsap.utils.random(-8, 8), duration: 0.04, repeat: 4, yoyo: true, ease: 'steps(1)' }, 0)
      .set('main', { clearProps: 'transform' })
      .set(glitchLayer, { visibility: 'hidden' }, 0.24);
    return tl;
  };
  const scheduleGlitch = () => gsap.delayedCall(gsap.utils.random(9, 18), () => {
    if (!document.hidden) glitch();
    scheduleGlitch();
  });
  document.querySelector('.hud__logo').addEventListener('click', () => glitch());

  // ---------- hero intro ----------
  const heroIntro = () => {
    // drop the pre-paint hiding, then immediately take over with from() states (same frame, no flash)
    root.classList.remove('fx-pending');
    const title = document.getElementById('hero-title');
    const typed = document.getElementById('typed');
    title.textContent = placeholder(title.dataset.text);
    if (window.Typed) typed.textContent = '';

    gsap.timeline({ defaults: { ease: 'power3.out' }, onComplete: scheduleGlitch })
      .from('.hero__horizon', { scaleX: 0, duration: 0.9, ease: 'expo.out' }, 0)
      .from(['.hero__grid', '.hero__rain'], { opacity: 0, duration: 1.4 }, 0)
      .from('.skyline--far', { yPercent: 25, opacity: 0, duration: 1.6 }, 0.1)
      .from('.skyline--near', { yPercent: 35, opacity: 0, duration: 1.3 }, 0.2)
      .from('.hero__rings', { scale: 0.6, rotation: -90, opacity: 0, duration: 1.4, ease: 'expo.out' }, 0.2)
      .add(flicker('.eyebrow'), 0.3)
      .add(decode(title, title.dataset.text, { duration: 1.3, scrambleText: { revealDelay: 0.45, speed: 0.8 } }), 0.35)
      .add(flicker('.hero__sign'), 0.6)
      .from('.hero__handle', { opacity: 0, y: 10, duration: 0.5 }, 0.9)
      .from('.terminal', { scaleX: 0, opacity: 0, duration: 0.6, ease: 'expo.out', clearProps: 'transform' }, 1.0)
      .from('.hero__cta .btn', { y: 24, opacity: 0, duration: 0.6, stagger: 0.12, clearProps: 'transform' }, 1.15)
      .from('.hero__readout > div', { opacity: 0, x: -12, duration: 0.4, stagger: 0.08 }, 1.2)
      .from('.hero__scroll', { opacity: 0, duration: 0.6 }, 1.6)
      .add(glitch, 0.25)
      .add(startTyped, 1.3);
  };

  // hero layers drift apart as you scroll away
  gsap.timeline({ scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } })
    .to('.hero__content', { yPercent: 25, opacity: 0, ease: 'none' }, 0)
    .to('.skyline--near', { y: 90, ease: 'none' }, 0)
    .to('.skyline--far', { y: 40, ease: 'none' }, 0)
    .to('.hero__sign', { y: -70, ease: 'none' }, 0);

  // mouse parallax on the hero layers
  if (finePointer) {
    const layers = [
      ['.skyline--far', 12, 0],
      ['.skyline--near', 26, 0],
      ['.hero__sign', 18, 0],
      ['.hero__rings', 34, 20],
      ['#hero-title', 10, 6],
    ].map(([selector, dx, dy]) => ({
      dx,
      dy,
      x: gsap.quickTo(selector, 'x', { duration: 0.9, ease: 'power3' }),
      y: dy ? gsap.quickTo(selector, 'y', { duration: 0.9, ease: 'power3' }) : null,
    }));
    document.querySelector('.hero').addEventListener('pointermove', (e) => {
      const nx = e.clientX / window.innerWidth - 0.5;
      const ny = e.clientY / window.innerHeight - 0.5;
      layers.forEach((layer) => {
        layer.x(-nx * layer.dx);
        if (layer.y) layer.y(-ny * layer.dy);
      });
    });
  }

  // ---------- HUD: scroll progress + sync % ----------
  const progressBar = document.getElementById('hud-progress');
  const sync = document.getElementById('hud-sync');
  ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate: (self) => {
      gsap.set(progressBar, { scaleX: self.progress });
      sync.textContent = `${String(Math.round(self.progress * 100)).padStart(3, '0')}%`;
    },
  });

  // ---------- section headings decode in ----------
  gsap.utils.toArray('.section__head').forEach((head) => {
    const title = head.querySelector('.section__title');
    title.textContent = placeholder(title.dataset.text);
    gsap.set(head, { '--bar': 0 });
    gsap.timeline({ scrollTrigger: { trigger: head, start: 'top 88%', once: true } })
      .add(flicker(head.querySelector('.section__index')), 0)
      .add(decode(title, title.dataset.text, { duration: 1.1 }), 0)
      .to(head, { '--bar': 1, duration: 0.8, ease: 'expo.out' }, 0.1)
      .from(head.querySelector('.section__sub'), { opacity: 0, x: -16, duration: 0.5 }, 0.3);
  });

  // ---------- panels power on as they scroll in ----------
  const decodeFields = document.querySelectorAll('[data-decode]');
  decodeFields.forEach((field) => {
    field.dataset.text = field.textContent;
    field.textContent = placeholder(field.textContent);
  });

  const revealInner = (panel, delay) => {
    const chips = panel.querySelectorAll('.chips li');
    if (chips.length) {
      gsap.from(chips, { opacity: 0, scale: 0.7, duration: 0.4, ease: 'back.out(2)', stagger: 0.05, delay, clearProps: 'transform' });
    }
    panel.querySelectorAll('[data-decode]').forEach((field, i) => {
      decode(field, field.dataset.text, { duration: 0.8, delay: delay + i * 0.08 });
    });
    const tags = panel.querySelectorAll('.about__tags li');
    if (tags.length) gsap.from(tags, { opacity: 0, y: 12, duration: 0.4, stagger: 0.06, delay: delay + 0.3 });
  };

  const panels = gsap.utils.toArray('[data-reveal]');
  gsap.set(panels, { opacity: 0, y: 40 });
  ScrollTrigger.batch(panels, {
    start: 'top 90%',
    once: true,
    onEnter: (batch) => {
      gsap.to(batch, { y: 0, duration: 0.8, ease: 'power3.out', stagger: 0.12, clearProps: 'transform' });
      gsap.to(batch, { keyframes: { opacity: [0, 1, 0.2, 1, 0.5, 1], easeEach: 'none' }, duration: 0.55, ease: 'none', stagger: 0.12 });
      batch.forEach((panel, i) => revealInner(panel, 0.25 + i * 0.12));
    },
  });

  // lead paragraph slides up line by line (SplitText)
  if (SplitText) {
    SplitText.create('.about__text .lead', {
      type: 'lines',
      mask: 'lines',
      autoSplit: true,
      onSplit: (self) => gsap.from(self.lines, {
        yPercent: 110,
        duration: 0.9,
        ease: 'power4.out',
        stagger: 0.12,
        scrollTrigger: { trigger: '.about__text', start: 'top 85%', once: true },
      }),
    });
  }

  // ---------- timeline: beam follows scroll, nodes light up as it passes ----------
  gsap.fromTo('.timeline__beam', { scaleY: 0 }, {
    scaleY: 1,
    ease: 'none',
    scrollTrigger: { trigger: '.timeline', start: 'top 72%', end: 'bottom 72%', scrub: 0.6 },
  });
  gsap.utils.toArray('.timeline li').forEach((li) => {
    gsap.from(li, {
      opacity: 0,
      x: 40,
      duration: 0.7,
      ease: 'power3.out',
      clearProps: 'transform',
      scrollTrigger: { trigger: li, start: 'top 90%', once: true },
    });
    ScrollTrigger.create({ trigger: li, start: 'top 72%', end: 'max', toggleClass: 'is-lit' });
  });

  // ---------- contact terminal types itself out ----------
  const termLines = gsap.utils.toArray('.contact__term p');
  gsap.set(termLines, { clipPath: 'inset(0 100% 0 0)' });
  const termTl = gsap.timeline({ delay: 0.4, scrollTrigger: { trigger: '.contact__term', start: 'top 85%', once: true } });
  termLines.forEach((line) => {
    const isCommand = line.hasAttribute('data-cmd');
    const chars = line.textContent.length;
    termTl.to(line, {
      clipPath: 'inset(0 0% 0 0)',
      duration: isCommand ? chars * 0.05 : 0.01,
      ease: isCommand ? `steps(${chars})` : 'none',
    }, isCommand ? '+=0.35' : '+=0.12');
  });

  // ---------- hover: labels scramble ----------
  document.querySelectorAll('.shard h3').forEach((h) => h.setAttribute('data-hover-scramble', ''));
  document.querySelectorAll('[data-hover-scramble]').forEach((label) => {
    const text = label.textContent;
    const trigger = label.closest('a, button, li') || label;
    trigger.addEventListener('mouseenter', () => {
      // lock the width so scrambled glyphs don't nudge the layout
      if (!label.style.minWidth) label.style.minWidth = `${label.getBoundingClientRect().width}px`;
      decode(label, text, { duration: 0.45, scrambleText: { chars: GLYPHS_LOWER, revealDelay: 0, speed: 1 } });
    });
  });

  // ---------- holographic tilt (vanilla-tilt) ----------
  if (finePointer && VanillaTilt) {
    VanillaTilt.init(document.querySelectorAll('[data-holo]'), {
      max: 7,
      speed: 500,
      perspective: 1000,
      scale: 1.02,
      glare: true,
      'max-glare': 0.22,
      gyroscope: false,
    });
  }

  // ---------- reticle cursor: brackets lock onto links and cards ----------
  if (finePointer) {
    const reticle = document.querySelector('.reticle');
    const frame = reticle.querySelector('.reticle__frame');
    const dot = reticle.querySelector('.reticle__dot');
    const label = reticle.querySelector('.reticle__label');
    const SIZE = 28;
    const frameX = gsap.quickTo(frame, 'x', { duration: 0.35, ease: 'power3' });
    const frameY = gsap.quickTo(frame, 'y', { duration: 0.35, ease: 'power3' });
    let locked = null;
    let visible = false;

    gsap.set([frame, dot], { xPercent: -50, yPercent: -50 });
    gsap.set(reticle, { opacity: 0 });

    const labelFor = (target) => {
      if (target.matches('a[href^="mailto:"]')) return 'MAIL';
      if (target.matches('a[target="_blank"]')) return 'OPEN ↗';
      if (target.matches('a[href^="#"]')) return 'JUMP';
      return 'EXEC';
    };
    const centerOn = (rect) => {
      frameX(rect.left + rect.width / 2);
      frameY(rect.top + rect.height / 2);
    };
    const lock = (target) => {
      locked = target;
      const rect = target.getBoundingClientRect();
      centerOn(rect);
      gsap.to(frame, { width: rect.width + 14, height: rect.height + 14, duration: 0.35, ease: 'power3.out' });
      label.textContent = labelFor(target);
      root.classList.add('reticle-locked');
    };
    const unlock = () => {
      locked = null;
      gsap.to(frame, { width: SIZE, height: SIZE, duration: 0.3, ease: 'power3.out' });
      root.classList.remove('reticle-locked');
    };

    window.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      if (!visible) {
        visible = true;
        gsap.set(frame, { x: e.clientX, y: e.clientY });
        gsap.to(reticle, { opacity: 1, duration: 0.2 });
      }
      gsap.set(dot, { x: e.clientX, y: e.clientY });
      if (!locked) {
        frameX(e.clientX);
        frameY(e.clientY);
      }
    }, { passive: true });
    document.addEventListener('pointerover', (e) => {
      const target = e.target.closest('a, button');
      if (target && target !== locked) lock(target);
    });
    document.addEventListener('pointerout', (e) => {
      if (locked && !locked.contains(e.relatedTarget)) unlock();
    });
    window.addEventListener('scroll', () => {
      if (locked) centerOn(locked.getBoundingClientRect());
    }, { passive: true });
    root.addEventListener('mouseleave', () => {
      visible = false;
      gsap.to(reticle, { opacity: 0, duration: 0.2 });
    });
    window.addEventListener('pointerdown', () => {
      gsap.fromTo(frame, { scale: 0.8 }, { scale: 1, duration: 0.35, ease: 'back.out(3)' });
    });
    root.classList.add('has-reticle');
  }

  runBoot().then(heroIntro);
})();
