/* Ceuil · v4 site behaviour. One story, one scroll: every section has its own scroll-linked motion.
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
    const off = 0;
    if (lenis) lenis.scrollTo(id === '#top' ? 0 : el, { offset: off, duration: 1.4 });
    else (id === '#top' ? scrollTo({ top: 0, behavior: RM ? 'auto' : 'smooth' }) : el.scrollIntoView({ behavior: RM ? 'auto' : 'smooth' }));
    history.replaceState(null, '', id === '#top' ? location.pathname : id);
  }));

  /* ── navs */
  const gnav = $('[data-gnav]'), lnav = $('[data-lnav]'), hero = $('[data-hero]');
  let lastY = scrollY;
  scenes.push(() => {
    const y = scrollY;
    // the header stays visible so the section menu is always one tap away
    lnav?.classList.toggle('is-on', !hero || y > innerHeight * 0.7);
    gnav?.classList.toggle('is-solid', y > (hero ? hero.offsetHeight - innerHeight * 0.4 : innerHeight * 0.6));
    lnav?.classList.toggle('is-top', !!gnav?.classList.contains('is-hidden'));
    lastY = y;
  });
  const navLinks = $$('.gnav__links a, .menu a[href^="#"]');
  const nio = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) navLinks.forEach(a => a.toggleAttribute('aria-current', a.getAttribute('href') === '#' + e.target.id)); }), { rootMargin: '-45% 0px -50% 0px' });
  ['estate', 'villa', 'plans', 'masterplan', 'location', 'payment', 'visit'].forEach(id => $('#' + id) && nio.observe($('#' + id)));

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
    $$('[data-split], .turn__head .h2, .dn__head .h2, .where__head .h2, .radar__head .h2').forEach(el => {
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
    const steps = $$('[data-step]', sec), fillEl = $('[data-pay-fill]', sec), nowEl = $('[data-pay-now]', sec);
    const pFill = $('[data-prog-fill]', sec), pTxt = $('[data-prog-txt]', sec);
    const setSteps = q => {
      let cur = -1;
      steps.forEach((s, k) => { const on = q >= +s.dataset.step; s.classList.toggle('is-on', on); if (on) cur = k; });
      fillEl?.style.setProperty('--fill', clamp(q / 0.9).toFixed(4));
      if (nowEl && cur >= 0) { const li = steps[cur]; const h = `<b>${li.querySelector('b').textContent}</b> · ${li.querySelector(':scope > span').textContent}`; if (nowEl.innerHTML !== h) nowEl.innerHTML = h; }
    };
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
      const s = (sec.dataset.fit === 'cover' && !small() ? Math.max : Math.min)(cw / im.width, ch / im.height);  // phones: full 16:9 frame, never blown up  // original framing, except the full-screen hero
      const w = im.width * s, h = im.height * s;
      ctx.clearRect(0, 0, cw, ch); ctx.drawImage(im, (cw - w) / 2, (ch - h) / 2, w, h);
      current = f; sec.classList.add('is-ready');
    }
    const progressive = async () => { await load(0); for (const step of [16, 8, 4, 2, 1]) await Promise.all(Array.from({ length: Math.ceil(n / step) }, (_, j) => load(j * step))); };
    if (RM) { callouts.forEach(c => c.classList.add('is-on')); setSteps(1); return; }
    new IntersectionObserver(([e]) => { if (e.isIntersecting && !started) { started = true; size(); progressive(); } }, { rootMargin: '120% 0px' }).observe(sec);
    addEventListener('resize', () => started && size());
    scenes.push(() => {
      const r = sec.getBoundingClientRect();
      if (r.bottom < -100 || r.top > innerHeight + 100) return;
      const p = prog(sec);
      const enter = clamp((innerHeight - r.top) / innerHeight);   // 0→1 while the section scrolls into view
      if (mode === 'hero') {
        // morning → night across the pinned scroll; the headline stays put
        const q = clamp(p / 0.92);
        want = Math.min(n - 1, Math.round(q * (n - 1)));
        callouts.forEach(c => c.classList.toggle('is-on', q >= +c.dataset.from && q < +c.dataset.to));
        sec.classList.toggle('is-moving', p > 0.02);
      } else if (mode === 'turn') {
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
        if (steps.length) setSteps(q);
      }
      if (pFill) { const v = clamp(p / 0.92); pFill.style.transform = `scaleX(${v.toFixed(4)})`; pTxt.textContent = Math.round(v * 100) + '%'; }
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
    const media = $('.pv__frame', pv); let x0 = null;
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
      b.type = 'button'; b.textContent = p.n; b.dataset.status = p.status; b.dataset.type = p.type; if (p.status === 'sold') b.dataset.tag = label('sold').toUpperCase();
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

  /* ── 12 location: the developer's plan redrawn in SVG. Opens on Ceuil, zooms out to the city, the route to Jemaa El Fna draws,
        places appear with their drive times. Labels are HTML placed from map coordinates so they stay crisp at every zoom. */
  const where = $('[data-where]');
  if (where) {
    const svg = $('[data-where-svg]', where), box = $('[data-where-map]', where), routes = $$('[data-where-route]', where), scene = $('[data-where-scene]', where);
    const labels = $$('[data-where-labels] .wl', where).map(el => { const [x, y] = el.dataset.at.split(',').map(Number); return { el, x, y, k: el.dataset.k == null ? null : +el.dataset.k, al: el.dataset.al || '' }; });
    // [x0, y0, x1, y1] in plan coordinates
    const START = [230, 420, 450, 590];
    const END = () => small() ? [130, 110, 460, 580] : [20, 30, 690, 575];
    const fit = ([x0, y0, x1, y1], W, H) => {
      let w = x1 - x0, h = y1 - y0; const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      if (w / h > W / H) h = w * H / W; else w = h * W / H;
      return [cx - w / 2, cy - h / 2, w, h];
    };
    let last = -1;
    const render = p => {
      const W = box.clientWidth, H = box.clientHeight;
      const z = ease(clamp(p / 0.62));
      const e = END(), b = START.map((v, i) => lerp(v, e[i], z));
      const [vx, vy, vw, vh] = fit(b, W, H);
      svg.setAttribute('viewBox', `${vx.toFixed(1)} ${vy.toFixed(1)} ${vw.toFixed(1)} ${vh.toFixed(1)}`);
      const rd = ease(clamp((p - 0.08) / 0.6)).toFixed(4);
      routes.forEach((r, i) => { r.style.strokeWidth = ((i ? 5 : 9) * vw / W).toFixed(2); r.style.setProperty('--route', rd); });
      labels.forEach(l => {
        const sx = (l.x - vx) / vw * W, sy = (l.y - vy) / vh * H;
        let tf = 'translate(-50%,-50%)';
        if (l.el.classList.contains('wl--you')) tf = 'translate(-50%, calc(-100% - 44px))';
        else if (l.el.classList.contains('wl--pin')) tf = 'translate(-50%,-100%) rotate(-45deg)';
        else if (l.el.classList.contains('wl--poi')) { const flip = sx > W * 0.58; l.el.classList.toggle('is-flip', flip); tf = flip ? 'translate(calc(-100% + 11px),-50%)' : 'translate(-11px,-50%)'; }
        else if (l.al === 'l') tf = 'translate(0,-50%)';
        else if (l.al === 'r') tf = 'translate(-100%,-50%)';
        else if (l.al === 'l2') tf = 'translate(-50%,-50%) rotate(-62deg)';
        l.el.style.transform = `translate(${sx.toFixed(1)}px,${sy.toFixed(1)}px) ${tf}`;
        if (l.k != null) l.el.classList.toggle('is-on', p >= l.k * 0.8 + 0.05);
        if (l.el.matches('.wl--road,.wl--area,.wl--park')) l.el.style.setProperty('--o', clamp((z - 0.45) / 0.4).toFixed(2));
      });
    };
    addEventListener('resize', () => render(Math.max(0, last)));
    if (RM) render(1);
    else scenes.push(() => {
      const r = where.getBoundingClientRect();
      if (r.bottom < -100 || r.top > innerHeight + 100) return;
      const p = prog(scene);
      if (Math.abs(p - last) < 0.0005) return;
      last = p; render(p);
    });
    render(0);
  }

  /* ── 12b golf radar: rings at 5/10/15/20 km, each course at its published distance and its bearing on the developer's golf map.
        The hand sweeps clockwise from north with scroll and reveals courses as it passes them. */
  const radar = $('[data-radar]');
  if (radar && D.golf) {
    const GT = T.golf || {}, NS = 'http://www.w3.org/2000/svg';
    const dotsG = $('[data-radar-dots]', radar), sweep = $('[data-radar-sweep]', radar), hand = $('[data-radar-hand]', radar);
    const nowEl = $('[data-radar-now]', radar), listEl = $('[data-radar-list]', radar), scene = $('[data-radar-scene]', radar);
    const Y = D.map.you, kmTxt = g => `${fmt(g.km, g.km % 1 ? 1 : 0)} km · ${g.min} min · ${g.holes} ${GT.holes}`;
    const items = D.golf.map(g => {
      const dx = (g.x - Y[0]) * 1.5, dy = g.y - Y[1];               // golf map is 3:2, so x% counts 1.5× a y%
      const bear = (Math.atan2(dx, -dy) * 180 / Math.PI + 360) % 360;  // 0° = north, clockwise
      const r = g.km / 20 * 100, a = (bear - 90) * Math.PI / 180;
      const x = Math.cos(a) * r, y = Math.sin(a) * r;
      const line = document.createElementNS(NS, 'line'); line.setAttribute('class', 'r-line'); line.setAttribute('x1', 0); line.setAttribute('y1', 0); line.setAttribute('x2', x.toFixed(1)); line.setAttribute('y2', y.toFixed(1));
      const at = document.createElementNS(NS, 'g'); at.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
      const grp = document.createElementNS(NS, 'g'); grp.setAttribute('class', 'r-dot');   // CSS scales this one; the parent holds the position
      grp.innerHTML = `<circle r="5.5"/><text>${g.n}</text>`;
      at.appendChild(grp); dotsG.append(line, at);
      const li = document.createElement('li'); li.innerHTML = `<i>${g.n}</i>${g.name}<em>${kmTxt(g).split(' · ').slice(0, 2).join(' · ')}</em>`; listEl.appendChild(li);
      return { g, bear, line, grp, li };
    });
    const order = [...items].sort((a, b) => a.bear - b.bear);
    let cur = null;
    const show = it => {
      if (it === cur) return; cur = it;
      items.forEach(o => { const on = o === it; o.grp.classList.toggle('is-cur', on); o.line.classList.toggle('is-cur', on); o.li.classList.toggle('is-cur', on); });
      if (!it) { nowEl.classList.remove('is-on'); return; }
      nowEl.innerHTML = `<span class="n">${it.g.n}</span><div><b>${it.g.name}</b><span>${kmTxt(it.g)}</span></div>`;
      nowEl.classList.add('is-on');
    };
    const draw = deg => {
      const a = (deg - 90) * Math.PI / 180, a0 = (Math.max(0, deg - 40) - 90) * Math.PI / 180;
      hand.setAttribute('x2', (Math.cos(a) * 100).toFixed(2)); hand.setAttribute('y2', (Math.sin(a) * 100).toFixed(2));
      sweep.setAttribute('d', deg <= 0 ? '' : `M0 0 L${(Math.cos(a0) * 100).toFixed(2)} ${(Math.sin(a0) * 100).toFixed(2)} A100 100 0 0 1 ${(Math.cos(a) * 100).toFixed(2)} ${(Math.sin(a) * 100).toFixed(2)} Z`);
      let latest = null;
      order.forEach(o => { const on = deg >= o.bear; o.grp.classList.toggle('is-on', on); if (on) latest = o; });
      show(latest);
    };
    $$('.r-dot', radar).forEach((d, i) => d.addEventListener('click', () => show(items[i])));
    if (RM) { draw(360); }
    else scenes.push(() => {
      const r = radar.getBoundingClientRect();
      if (r.bottom < -100 || r.top > innerHeight + 100) return;
      draw(clamp((prog(scene) - 0.05) / 0.85) * 360);
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
  $$('.figs [data-count], .well__stats [data-count]').forEach(el => { el.textContent = '0'; kio.observe(el); });
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
  $$('details[data-faq], [data-faq] details').forEach(d => {
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
