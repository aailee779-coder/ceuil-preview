/* Ceuil · v2 site behaviour. One story, one scroll: every section has its own scroll-linked motion.
   Plain JS core; GSAP + Lenis enhance (split headlines, smooth scroll). All motion respects prefers-reduced-motion. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const small = () => innerWidth < 700;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => 1 - Math.pow(1 - t, 3);
  const T = window.T || {};
  const D = window.CEUIL || { types: {}, plots: [] };
  const lang = document.documentElement.lang;
  const fmt = (n, d = 0) => n.toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-GB', { minimumFractionDigits: d, maximumFractionDigits: d });
  const FT = 10.7639;
  const wa = text => `https://wa.me/${D.wa}?text=${encodeURIComponent(text)}`;
  const G = window.gsap;

  // progress of a tall section through the viewport: 0 when its top hits the top, 1 when its bottom hits the bottom
  const prog = el => { const r = el.getBoundingClientRect(); return clamp(-r.top / Math.max(1, el.offsetHeight - innerHeight)); };
  // progress of any element entering → leaving the viewport
  const view = el => { const r = el.getBoundingClientRect(); return clamp((innerHeight - r.top) / (innerHeight + r.height)); };

  // one rAF scroll loop for all scroll-linked scenes
  const scenes = [];
  let ticking = false;
  const runScenes = () => { ticking = false; for (const f of scenes) f(); };
  const onScrollFrame = () => { if (!ticking) { ticking = true; requestAnimationFrame(runScenes); } };
  addEventListener('scroll', onScrollFrame, { passive: true });
  addEventListener('resize', onScrollFrame);

  // encode WhatsApp texts written raw in the HTML
  $$('a[href^="https://wa.me/"]').forEach(a => { const u = new URL(a.href); const t = u.searchParams.get('text'); if (t) a.href = wa(t); });

  /* ── smooth scroll */
  let lenis = null;
  if (!RM && window.Lenis) {
    lenis = new Lenis({ duration: 1.15, easing: t => 1 - Math.pow(1 - t, 4), smoothWheel: true, syncTouch: false });
    if (G && window.ScrollTrigger) {
      G.registerPlugin(ScrollTrigger);
      lenis.on('scroll', ScrollTrigger.update);
      G.ticker.add(t => lenis.raf(t * 1000));
      G.ticker.lagSmoothing(0);
    } else { const raf = t => { lenis.raf(t); requestAnimationFrame(raf); }; requestAnimationFrame(raf); }
    lenis.on('scroll', onScrollFrame);
  }
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    const el = id === '#top' ? document.body : $(id);
    if (!el) return;
    e.preventDefault();
    closeMenu();
    const off = id === '#top' ? 0 : -52;
    if (lenis) lenis.scrollTo(id === '#top' ? 0 : el, { offset: off, duration: 1.4 });
    else (id === '#top' ? scrollTo({ top: 0, behavior: RM ? 'auto' : 'smooth' }) : el.scrollIntoView({ behavior: RM ? 'auto' : 'smooth' }));
    history.replaceState(null, '', id === '#top' ? location.pathname : id);
  }));

  /* ── navs */
  const gnav = $('[data-gnav]'), lnav = $('[data-lnav]'), hero = $('[data-hero]');
  let lastY = scrollY;
  scenes.push(() => {
    const y = scrollY;
    if (y > lastY + 4 && y > 80) gnav?.classList.add('is-hidden');
    if (y < lastY - 4 || y < 80) gnav?.classList.remove('is-hidden');
    lnav?.classList.toggle('is-on', !hero || y > innerHeight * 0.7);
    lnav?.classList.toggle('is-top', !!gnav?.classList.contains('is-hidden'));
    lastY = y;
  });
  const navLinks = $$('.lnav__links a');
  const nio = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) navLinks.forEach(a => a.toggleAttribute('aria-current', a.getAttribute('href') === '#' + e.target.id)); }), { rootMargin: '-45% 0px -50% 0px' });
  ['villa', 'plans', 'estate', 'location', 'payment'].forEach(id => $('#' + id) && nio.observe($('#' + id)));

  /* ── menu */
  const menu = $('[data-menu]'), openBtn = $('[data-menu-open]');
  function closeMenu() { if (!menu || menu.hidden) return; menu.classList.remove('is-open'); menu.hidden = true; openBtn?.setAttribute('aria-expanded', 'false'); document.body.style.overflow = ''; lenis?.start(); }
  openBtn?.addEventListener('click', () => { menu.hidden = false; requestAnimationFrame(() => menu.classList.add('is-open')); openBtn.setAttribute('aria-expanded', 'true'); document.body.style.overflow = 'hidden'; lenis?.stop(); $('a', menu)?.focus(); });
  $('[data-menu-close]')?.addEventListener('click', () => { closeMenu(); openBtn?.focus(); });
  addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });

  /* ── split headlines: words rise through a mask */
  const splitWords = el => {
    const walk = node => {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.append(' '); return; }
            const o = document.createElement('span'); o.className = 'sw';
            const i = document.createElement('span'); i.textContent = part; o.append(i); frag.append(o);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
      });
    };
    walk(el);
    return $$('.sw > span', el);
  };
  if (!RM && G) {
    $$('[data-split], .turn__head .h2, .dn__head .h2, .loc__head .h2').forEach(el => {
      const words = splitWords(el);
      G.set(words, { yPercent: 115 });
      const io = new IntersectionObserver(([e]) => {
        if (!e.isIntersecting) return;
        G.to(words, { yPercent: 0, duration: 1.1, ease: 'expo.out', stagger: 0.06 });
        io.disconnect();
      }, { rootMargin: '0px 0px -12% 0px' });
      io.observe(el);
    });
  }
  const rio = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); rio.unobserve(e.target); } }), { rootMargin: '0px 0px -10% 0px' });
  $$('[data-split-fade], [data-reveal-tile]').forEach((el, i) => { el.style.transitionDelay = `${120 + (i % 3) * 90}ms`; rio.observe(el); });

  /* ── 1 hero: film card grows from inset tile to full-bleed */
  const card = $('[data-hero-card]'), pin = $('.hero__pin'), head = $('.hero__head');
  if (card && !RM) {
    pin.style.padding = '0';
    scenes.push(() => {
      const start = pin.offsetTop || 1;                            // card's resting position at load
      const t = ease(clamp(scrollY / start));                       // 0 at load, 1 when the card reaches the top
      const s = lerp(small() ? 0.9 : 0.86, 1, t);
      card.style.transform = `scale(${s})`;
      card.style.borderRadius = `${lerp(22, 0, t) / s}px`;
      head.style.opacity = String(1 - clamp(t * 1.4 - 0.4));
      head.style.transform = `translateY(${-t * 40}px)`;
    });
  }
  const film = $('[data-hero-film]'), filmBtn = $('[data-film-toggle]');
  if (film) {
    let userPaused = RM;
    if (RM) film.pause();
    const setBtn = () => { if (!filmBtn) return; filmBtn.setAttribute('aria-pressed', String(film.paused)); $('[data-label-pause]', filmBtn).hidden = film.paused; $('[data-label-play]', filmBtn).hidden = !film.paused; };
    filmBtn?.addEventListener('click', () => { if (film.paused) { film.play(); userPaused = false; } else { film.pause(); userPaused = true; } setBtn(); });
    new IntersectionObserver(([e]) => { if (!e.isIntersecting) film.pause(); else if (!userPaused) film.play().catch(() => {}); setBtn(); }).observe(film);
    film.addEventListener('play', setBtn); film.addEventListener('pause', setBtn); setBtn();
  }

  /* ── 2 highlights: autoplay with Apple-style progress dots */
  $$('[data-gal]').forEach(g => {
    const track = $('[data-gal-track]', g), slides = $$('[data-gal-slide]', g), dots = $('[data-gal-dots]', g), toggle = $('[data-gal-toggle]', g);
    const DUR = 5000;
    let i = 0, timer = null, playing = !RM, visible = false;
    dots.style.setProperty('--dur', DUR + 'ms');
    slides.forEach((s, k) => {
      const b = document.createElement('button');
      b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('aria-label', `${k + 1} / ${slides.length}`); b.append(document.createElement('i'));
      b.addEventListener('click', () => { go(k); });
      dots.appendChild(b);
    });
    const go = k => { i = (k + slides.length) % slides.length; const s = slides[i]; track.scrollTo({ left: s.offsetLeft - (track.clientWidth - s.clientWidth) / 2, behavior: RM ? 'auto' : 'smooth' }); schedule(); };
    const mark = () => {
      const mid = track.scrollLeft + track.clientWidth / 2;
      let best = 0, bd = Infinity;
      slides.forEach((s, k) => { const d = Math.abs(s.offsetLeft + s.clientWidth / 2 - mid); if (d < bd) { bd = d; best = k; } });
      if (best !== i || !slides[best].classList.contains('is-on')) {
        i = best;
        slides.forEach((s, k) => s.classList.toggle('is-on', k === i));
        $$('button', dots).forEach((b, k) => { const on = k === i; b.setAttribute('aria-selected', String(on)); if (on) { const f = b.firstChild; f.style.animation = 'none'; f.offsetWidth; f.style.animation = ''; } });
      }
    };
    const schedule = () => { clearTimeout(timer); if (playing && visible) timer = setTimeout(() => go(i + 1), DUR); };
    const setToggle = () => { toggle.setAttribute('aria-pressed', String(!playing)); $('[data-label-pause]', toggle).hidden = !playing; $('[data-label-play]', toggle).hidden = playing; dots.classList.toggle('is-paused', !playing || !visible); };
    toggle.addEventListener('click', () => { playing = !playing; setToggle(); schedule(); });
    let st; track.addEventListener('scroll', () => { requestAnimationFrame(mark); clearTimeout(st); st = setTimeout(schedule, 200); }, { passive: true });
    track.addEventListener('keydown', e => { if (e.key === 'ArrowRight') go(i + 1); if (e.key === 'ArrowLeft') go(i - 1); });
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; setToggle(); schedule(); }, { threshold: 0.35 }).observe(track);
    setToggle(); mark();
  });

  /* ── 3 + 4 canvas sequences (360° turntable, day → night) */
  $$('[data-turn]').forEach(sec => {
    const n = +sec.dataset.frames, mode = sec.dataset.mode || 'turn';
    const prefix = small() && sec.dataset.srcM ? sec.dataset.srcM : sec.dataset.src;
    const canvas = $('canvas', sec), ctx = canvas.getContext('2d');
    const callouts = $$('[data-from]', sec), deg = $('[data-turn-deg]', sec), dial = $('.dial', sec);
    const stage = $('[data-turn-stage]', sec), frame = $('[data-dn-frame]', sec);
    const frames = new Array(n);
    let current = -1, want = 0, started = false;
    const url = k => `${prefix}${String(k + 1).padStart(3, '0')}.webp`;
    const load = k => new Promise(res => {
      if (frames[k]) return res();
      const im = new Image(); im.decoding = 'async';
      im.onload = () => { frames[k] = im; if (k === want || current < 0) draw(want); res(); };
      im.onerror = res; im.src = url(k);
    });
    const size = () => { const r = canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2); canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr); current = -1; draw(want); };
    const nearest = k => { for (let d = 0; d < n; d++) { if (frames[(k + d) % n]) return (k + d) % n; if (frames[(k - d + n) % n]) return (k - d + n) % n; } return -1; };
    function draw(k) {
      const f = nearest(k);
      if (f < 0 || f === current) return;
      const im = frames[f], cw = canvas.width, ch = canvas.height;
      const s = mode === 'seq' ? Math.max(cw / im.width, ch / im.height) : Math.min(cw / im.width, ch / im.height) * (small() ? 1.3 : 1.08);  // the render has generous white margins
      const w = im.width * s, h = im.height * s;
      ctx.clearRect(0, 0, cw, ch); ctx.drawImage(im, (cw - w) / 2, (ch - h) / 2, w, h);
      current = f; sec.classList.add('is-ready');
    }
    const progressive = async () => { await load(0); for (const step of [16, 8, 4, 2, 1]) await Promise.all(Array.from({ length: Math.ceil(n / step) }, (_, j) => load(j * step))); };
    if (RM) { callouts.forEach(c => c.classList.add('is-on')); return; }
    new IntersectionObserver(([e]) => { if (e.isIntersecting && !started) { started = true; size(); progressive(); } }, { rootMargin: '120% 0px' }).observe(sec);
    addEventListener('resize', () => started && size());
    scenes.push(() => {
      const r = sec.getBoundingClientRect();
      if (r.bottom < -100 || r.top > innerHeight + 100) return;
      const p = prog(sec);
      const enter = clamp((innerHeight - r.top) / innerHeight);   // 0→1 while the section scrolls into view
      if (mode === 'turn') {
        // the stage settles in, then rotation runs across the pinned scroll
        const q = clamp((p - 0.04) / 0.92);
        want = Math.min(n - 1, Math.round(q * (n - 1)));
        if (stage) { stage.style.transform = `scale(${lerp(0.82, 1, ease(enter))})`; stage.style.opacity = String(clamp(enter * 1.6)); }
        callouts.forEach(c => c.classList.toggle('is-on', q >= +c.dataset.from && q < +c.dataset.to));
        if (deg) deg.textContent = Math.round(q * 360) + '°';
        dial?.style.setProperty('--p', q.toFixed(3));
        sec.classList.toggle('is-end', q > 0.9);
      } else {
        // the rounded frame opens to full-bleed over the first 22%, then the film scrubs day → night
        const o = ease(clamp(p / 0.22));
        const g = small() ? 20 : 40;
        if (frame) {
          frame.style.margin = '0';
          frame.style.clipPath = `inset(0px ${lerp(g, 0, o)}px ${lerp(g, 0, o)}px ${lerp(g, 0, o)}px round ${lerp(22, 0, o)}px)`;
        }
        const q = clamp((p - 0.18) / 0.8);
        want = Math.min(n - 1, Math.round(q * (n - 1)));
        callouts.forEach(c => c.classList.toggle('is-on', q >= +c.dataset.from && q < +c.dataset.to));
      }
      draw(want);
    });
  });

  /* ── 5 closer look: wipe between rooms */
  $$('[data-pv]').forEach(pv => {
    const pills = $$('[data-pv-pill]', pv), items = $$('[data-pv-item]', pv);
    let cur = pills[0].dataset.pvPill;
    const set = key => {
      if (key === cur) return;
      items.forEach(f => { f.classList.remove('is-out'); if (f.dataset.pvItem === cur) { f.classList.remove('is-on'); f.classList.add('is-out'); } });
      items.forEach(f => { if (f.dataset.pvItem === key) { f.classList.remove('is-out'); f.classList.add('is-on'); } });
      setTimeout(() => items.forEach(f => { if (f.dataset.pvItem !== key) f.classList.remove('is-out'); }), 1050);
      pills.forEach(p => { const on = p.dataset.pvPill === key; p.setAttribute('aria-selected', String(on)); p.tabIndex = on ? 0 : -1; if (on) p.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' }); });
      $$('[data-pv-text]', pv).forEach(t => t.classList.toggle('is-on', t.dataset.pvText === key));
      cur = key;
    };
    pills.forEach((p, k) => {
      p.addEventListener('click', () => set(p.dataset.pvPill));
      p.addEventListener('keydown', e => { const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (!d) return; const nx = pills[(k + d + pills.length) % pills.length]; nx.focus(); set(nx.dataset.pvPill); });
    });
    // swipe on the image
    const media = $('.pv__media', pv); let x0 = null;
    media.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
    media.addEventListener('touchend', e => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) < 40) return; const k = pills.findIndex(p => p.dataset.pvPill === cur); set(pills[(k + (dx < 0 ? 1 : -1) + pills.length) % pills.length].dataset.pvPill); });
  });

  /* ── 6 floor plans */
  $$('[data-plan]').forEach(sec => {
    const P = T.plans || {}, typesEl = $('[data-plan-types]', sec), levelsEl = $('[data-plan-levels]', sec);
    const img = $('[data-plan-img]', sec), info = $('[data-plan-info]', sec), missing = $('[data-plan-missing]', sec), zoom = $('[data-plan-zoom]', sec);
    const dlg = $('[data-plan-dlg]', sec), dlgImg = $('[data-plan-dlg-img]', sec);
    let type = 2, level = 0;
    const tab = (label, on, fn) => { const b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', String(on)); b.textContent = label; b.addEventListener('click', fn); return b; };
    const render = first => {
      const t = D.types[type], lv = t.levels[level];
      typesEl.replaceChildren(...Object.keys(D.types).map(k => tab(`${P.type} ${k}`, +k === type, () => { if (+k === type) return; type = +k; level = 0; render(); })));
      levelsEl.replaceChildren(...t.levels.map((l, i) => tab(P[l.key], i === level, () => { if (i === level) return; level = i; render(); })));
      if (lv.img) {
        const src = `${window.BASE}img/plans/${lv.img}.webp`;
        if (!first) img.classList.add('is-swap');
        const pre = new Image();
        pre.onload = () => setTimeout(() => { img.src = src; img.alt = `${P.alt} ${type}, ${P[lv.key]}`; requestAnimationFrame(() => img.classList.remove('is-swap')); }, first ? 0 : 220);
        pre.src = src; zoom.hidden = false; missing.hidden = true;
      } else { zoom.hidden = true; missing.hidden = false; }
      const rows = t.levels.filter(l => l.total && l.key !== 'gf_b');
      const facts = [`${t.suites} ${P.suites}`, `${t.baths} ${P.baths}`, P.kitchen, P.hammam].concat(t.lift ? [P.lift] : []);
      info.classList.remove('is-swap'); void info.offsetWidth; info.classList.add('is-swap');
      info.innerHTML = `<h3>${P.type} ${type}</h3>
        <ul class="facts">${facts.map(f => `<li>${f}</li>`).join('')}</ul>
        <table><thead><tr><th>${P.level}</th><th>${P.living}</th><th>${P.terrace}</th><th>${P.total}</th></tr></thead>
        <tbody>${rows.map(l => `<tr><td>${P[l.key]}</td><td>${l.living} m²</td><td>${l.terrace} m²</td><td>${l.total} m²<br><small>${fmt(Math.round(l.total * FT))} ft²</small></td></tr>`).join('')}
        ${t.levels.some(l => !l.total) ? `<tr><td>${P.ff}</td><td colspan="3">[${lang === 'fr' ? 'à confirmer' : 'to confirm'}]</td></tr>` : ''}</tbody>
        <tfoot><tr><td>${P.built}</td><td colspan="3">${t.built} m² · ${fmt(Math.round(t.built * FT))} ft²</td></tr></tfoot></table>
        <p class="note">${P.plots}: ${t.plots.join(', ')} · ${P.unit}: ${t.plots.length}</p>
        ${t.note ? `<p class="note">${P[t.note]}</p>` : ''}<p class="note">¹</p>`;
    };
    zoom.addEventListener('click', () => { dlgImg.src = img.src; dlgImg.alt = img.alt; dlg.showModal(); });
    dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
    render(true);
  });

  /* ── 7 quote: words lit by scroll, photo slowly settles */
  const quote = $('[data-quote]');
  if (quote) {
    const p = $('[data-say]', quote), img = $('.quote__tile img', quote);
    const words = p.textContent.trim().split(/\s+/);
    p.textContent = '';
    const spans = words.map((w, k) => { const s = document.createElement('span'); s.className = 'w'; s.textContent = w; p.append(s, k < words.length - 1 ? ' ' : ''); return s; });
    if (RM) spans.forEach(s => s.classList.add('is-on'));
    else scenes.push(() => {
      const q = prog(quote);
      const lit = Math.round(clamp((q - 0.08) / 0.7) * spans.length);
      spans.forEach((s, k) => s.classList.toggle('is-on', k < lit));
      img?.style.setProperty('--qz', lerp(1.14, 1, q).toFixed(4));
    });
  }

  /* ── 8 estate cards: slide in one after another; image parallax inside each card */
  const cio = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); cio.unobserve(e.target); } }), { threshold: 0.25 });
  $$('[data-card]').forEach((c, i) => { c.style.transitionDelay = `${(i % 4) * 110}ms`; cio.observe(c); });

  /* ── 9 master plan: map settles, pins pop in sequence, card swaps */
  $$('[data-master]').forEach(sec => {
    const M = T.mp || {}, map = $('[data-mp-map]', sec), pins = $('[data-mp-pins]', sec), cardEl = $('[data-mp-card]', sec), filter = $('[data-mp-filter]', sec);
    const label = s => M[s] || s;
    D.plots.forEach((p, k) => {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = p.n; b.dataset.status = p.status; b.dataset.type = p.type;
      b.style.left = p.x + '%'; b.style.top = p.y + '%'; b.style.transitionDelay = `${400 + k * 70}ms`;
      b.setAttribute('aria-label', `${M.villa} ${p.n} · ${M.type} ${p.type} · ${label(p.status)}`); b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', () => { pins.querySelectorAll('button').forEach(x => x.style.transitionDelay = '0ms'); show(p, b); });
      pins.appendChild(b);
    });
    new IntersectionObserver(([e], o) => { if (e.isIntersecting) { map.classList.add('is-in'); o.disconnect(); } }, { threshold: 0.3 }).observe(map);
    const show = (p, b) => {
      $$('button', pins).forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      const msg = (lang === 'fr' ? 'Bonjour, je souhaite des informations sur la villa ' : 'Hello, I would like information about villa ') + p.n + ' (Ceuil Private Residence).';
      cardEl.classList.remove('is-swap'); void cardEl.offsetWidth; cardEl.classList.add('is-swap');
      cardEl.innerHTML = `<p class="mp__status"><i class="st st--${p.status}"></i>${label(p.status)}</p>
        <h3>${M.villa} ${p.n}</h3><p class="mp__hint">${M.type} ${p.type}</p>
        <dl><dt>${M.land}</dt><dd>${fmt(p.land, 2)} m²<br><small>${fmt(Math.round(p.land * FT))} ft²</small></dd>
        <dt>${M.built}</dt><dd>${fmt(p.built)} m²<br><small>${fmt(Math.round(p.built * FT))} ft²</small></dd>
        <dt></dt><dd>${M.price}</dd></dl>
        <a class="btn btn--sm" href="${wa(msg)}" target="_blank" rel="noopener">${M.request}</a>`;
      if (small()) cardEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    };
    ['all', 1, 2, 3, 4, 5].forEach(t => {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = t === 'all' ? M.all : `${M.type} ${t}`; b.setAttribute('aria-pressed', String(t === 'all'));
      b.addEventListener('click', () => { $$('button', filter).forEach(x => x.setAttribute('aria-pressed', String(x === b))); $$('button', pins).forEach(x => { x.style.transitionDelay = '0ms'; x.classList.toggle('is-dim', t !== 'all' && +x.dataset.type !== t); }); });
      filter.appendChild(b);
    });
  });

  /* ── 10 location: map zooms out, the route draws from Ceuil to the city, places appear in drive-time order */
  const loc = $('[data-loc]');
  if (loc) {
    const layer = $('[data-loc-layer]', loc), route = $('[data-loc-route]', loc), box = $('[data-loc-map]', loc), img = $('.loc__bg img', loc);
    const pts = $$('[data-loc-pts] li', loc);
    // positions in map-image coordinates (0..1), after the developer's location plan (brochure p.3); illustrative
    const POS = {
      d: { you: [0.505, 0.60], hotel: [0.41, 0.52], airport: [0.25, 0.37], jemaa: [0.478, 0.175], station: [0.37, 0.12] },
      m: { you: [0.525, 0.60], hotel: [0.40, 0.53], airport: [0.26, 0.33], jemaa: [0.525, 0.17], station: [0.40, 0.115] }
    };
    const place = () => {
      const bw = box.clientWidth, bh = box.clientHeight;
      const portrait = small();
      const iw = portrait ? 1200 : 2400, ih = portrait ? 1800 : 1600;
      const s = Math.max(bw / iw, bh / ih), dw = iw * s, dh = ih * s, ox = (bw - dw) / 2, oy = (bh - dh) * 0.3;  // matches object-position 50% 30%
      const P = portrait ? POS.m : POS.d;
      const at = k => [((ox + P[k][0] * dw) / bw) * 100, ((oy + P[k][1] * dh) / bh) * 100];
      pts.forEach(li => { const [x, y] = at(li.dataset.key); li.style.setProperty('--x', x + '%'); li.style.setProperty('--y', y + '%'); li.classList.toggle('is-left', x > 60 && li.dataset.key !== 'you'); });
      // route drawn in pixel space so the dash animation stays continuous
      route.ownerSVGElement.setAttribute('viewBox', `0 0 ${bw} ${bh}`);
      const px = k => [ox + P[k][0] * dw, oy + P[k][1] * dh];
      const [x0, y0] = px('you'), [x1, y1] = px('jemaa');
      route.setAttribute('d', `M${x0} ${y0} C ${x0 + 6} ${lerp(y0, y1, .45)}, ${x1 - 8} ${lerp(y0, y1, .7)}, ${x1} ${y1}`);
    };
    if (img.complete) place(); else img.addEventListener('load', place);
    addEventListener('resize', place); place();
    if (RM) { pts.forEach(li => li.classList.add('is-on')); route.style.setProperty('--route', 1); }
    else scenes.push(() => {
      const p = prog($('[data-loc-scene]', loc));
      layer.style.setProperty('--z', lerp(1.18, 1, ease(clamp(p / 0.5))).toFixed(4));
      route.style.setProperty('--route', ease(clamp((p - 0.05) / 0.55)).toFixed(4));
      pts.forEach(li => li.dataset.at && li.classList.toggle('is-on', p >= +li.dataset.at));
    });
  }

  /* ── 11 specs: numbers count up, the elevation draws itself */
  const countUp = (el, dur = 1400) => {
    const to = +el.dataset.count, t0 = performance.now();
    const step = now => { const t = clamp((now - t0) / dur); el.textContent = fmt(Math.round(to * ease(t))); if (t < 1) requestAnimationFrame(step); };
    if (RM) { el.textContent = fmt(to); return; }
    requestAnimationFrame(step);
  };
  const kio = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { countUp(e.target); kio.unobserve(e.target); } }), { threshold: 0.6 });
  $$('.kpis [data-count]').forEach(el => { el.textContent = '0'; kio.observe(el); });
  $$('[data-draw-svg]').forEach(async holder => {
    try {
      const txt = await (await fetch(holder.dataset.src)).text();
      holder.innerHTML = txt;
      const svg = $('svg', holder); svg.removeAttribute('width'); svg.removeAttribute('height');
      const strokes = $$('line, rect, path, circle', svg).filter(el => el.getAttribute('stroke') !== 'none' && typeof el.getTotalLength === 'function');
      const fills = $$('[fill]:not([fill=none]), text', svg);
      strokes.forEach(el => { const L = el.getTotalLength() || 1; el.style.strokeDasharray = L; el.style.strokeDashoffset = L; el.dataset.len = L; });
      if (RM) { strokes.forEach(el => el.style.strokeDashoffset = 0); return; }
      const fig = holder.closest('[data-draw]');
      scenes.push(() => {
        const v = clamp((view(fig) - 0.15) / 0.5);
        strokes.forEach(el => el.style.strokeDashoffset = (+el.dataset.len * (1 - ease(v))).toFixed(1));
        fills.forEach(el => el.style.opacity = clamp((v - 0.6) / 0.4));
      });
      onScrollFrame();
    } catch (e) { /* drawing is decorative */ }
  });

  /* ── 12 payment: the line fills with scroll, each milestone lights and counts as it's reached */
  const pay = $('[data-pay]');
  if (pay) {
    const fill = $('[data-pay-fill]', pay), steps = $$('.pay__steps > li', pay), track = $('.pay__track', pay);
    const counted = new Set();
    const lightUp = k => { steps[k].classList.add('is-on'); if (!counted.has(k)) { counted.add(k); const c = $('[data-count]', steps[k]); c && countUp(c, 700); } };
    $$('[data-count]', pay).forEach(c => c.textContent = '0');
    if (RM) steps.forEach((_, k) => lightUp(k));
    else scenes.push(() => {
      const r = track.getBoundingClientRect();
      const f = clamp((innerHeight * 0.75 - r.top) / (r.height + innerHeight * 0.1));
      fill.style.setProperty('--fill', f.toFixed(4));
      steps.forEach((s, k) => { if (f >= (k + 0.15) / steps.length) lightUp(k); else s.classList.remove('is-on'); });
    });
  }

  /* ── 13 faq: smooth height */
  $$('[data-faq] details').forEach(d => {
    const sum = $('summary', d), body = $('.faq__a', d);
    sum.addEventListener('click', e => {
      if (RM) return;
      e.preventDefault();
      if (d.open) {
        const h = body.offsetHeight;
        body.animate([{ height: h + 'px', opacity: 1 }, { height: '0px', opacity: 0 }], { duration: 420, easing: 'cubic-bezier(.22,1,.36,1)' }).onfinish = () => { d.open = false; };
      } else {
        d.open = true;
        const h = body.offsetHeight;
        body.animate([{ height: '0px', opacity: 0 }, { height: h + 'px', opacity: 1 }], { duration: 520, easing: 'cubic-bezier(.22,1,.36,1)' });
      }
    });
  });

  /* ── floating CTA: after the hero, hidden near the form and footer */
  const fbtn = $('[data-fcta]'), foot = $('[data-foot]'), visit = $('#visit');
  scenes.push(() => {
    if (!fbtn) return;
    const past = scrollY > innerHeight * 1.1;
    const near = [foot, visit].some(el => { if (!el) return false; const r = el.getBoundingClientRect(); return r.top < innerHeight * 0.92 && r.bottom > 0; });
    fbtn.classList.toggle('is-on', past && !near);
  });

  /* ── form (preview: not connected) */
  $$('[data-form]').forEach(f => f.addEventListener('submit', e => {
    e.preventDefault();
    $$('[aria-invalid]', f).forEach(i => i.removeAttribute('aria-invalid'));
    const bad = $$('[required]', f).find(i => (i.type === 'checkbox' ? !i.checked : !i.value.trim()));
    if (bad) { bad.focus(); bad.setAttribute('aria-invalid', 'true'); return; }
    const msg = $('[data-form-msg]', f); msg.hidden = false;
  }));

  // French typography: narrow no-break space before %
  if (lang === 'fr') $$('.pay__steps em').forEach(el => { el.textContent = ' %'; });

  runScenes();
})();
