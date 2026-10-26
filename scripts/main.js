(() => {
  'use strict';

  const GITHUB_USER = 'dn3point';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

  // ---------- highlight the nav link of the section in view ----------
  const links = new Map([...nav.querySelectorAll('a')].map((a) => [a.hash.slice(1), a]));
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      links.forEach((a) => a.classList.remove('is-active'));
      links.get(entry.target.id)?.classList.add('is-active');
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  links.forEach((_, id) => { const el = document.getElementById(id); if (el) spy.observe(el); });

  // ---------- Typed.js terminal line ----------
  if (window.Typed && !reduceMotion) {
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
      startDelay: 400,
      loop: true,
      smartBackspace: true,
      contentType: null,
    });
  }

  // ---------- AOS scroll reveals ----------
  if (window.AOS) {
    window.AOS.init({ once: true, duration: 700, easing: 'ease-out-cubic', offset: 60, disable: reduceMotion });
  } else {
    // CDN unavailable: never leave content hidden behind un-initialised AOS styles
    document.querySelectorAll('[data-aos]').forEach((el) => el.removeAttribute('data-aos'));
  }

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

  getJSON(`/users/${GITHUB_USER}`)
    .then((user) => { document.getElementById('stat-repos').textContent = user.public_repos; })
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
    })
    .catch(() => {
      feed.replaceChildren(el('li', 'feed__status', 'Uplink failed. Browse the repositories on GitHub instead.'));
    });
})();
