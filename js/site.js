/* Ceuil · site behaviour. Plain JS; GSAP + ScrollTrigger + Lenis are optional enhancements. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const small = () => innerWidth <= 700;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const T = window.T || {};
  const D = window.CEUIL || { types: {}, plots: [] };
  const lang = document.documentElement.lang;
  const fmt = (n, d = 0) => n.toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-GB', { minimumFractionDigits: d, maximumFractionDigits: d });
  const FT = 10.7639;
  const wa = text => `https://wa.me/${D.wa}?text=${encodeURIComponent(text)}`;

  // encode WhatsApp texts written raw in the HTML
  $$('a[href^="https://wa.me/"]').forEach(a => {
    const u = new URL(a.href);
    const t = u.searchParams.get('text');
    if (t) a.href = wa(t);
  });

  /* ── smooth scroll (Lenis) wired to GSAP's ticker when available */
  let lenis = null;
  if (!RM && window.Lenis) {
    lenis = new Lenis({ duration: 1.1, easing: t => 1 - Math.pow(1 - t, 3), smoothWheel: true });
    if (window.gsap && window.ScrollTrigger) {
      gsap.registerPlugin(ScrollTrigger);
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(t => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = t => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
  }
  const navOffset = () => 44 + 52;
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    const el = id === '#top' ? document.body : $(id);
    if (!el) return;
    e.preventDefault();
    closeMenu();
    if (lenis) lenis.scrollTo(id === '#top' ? 0 : el, { offset: id === '#top' ? 0 : -navOffset() + 44 });
    else (id === '#top' ? scrollTo({ top: 0, behavior: RM ? 'auto' : 'smooth' }) : el.scrollIntoView({ behavior: RM ? 'auto' : 'smooth' }));
    history.replaceState(null, '', id === '#top' ? location.pathname : id);
  }));

  /* ── navs: global hides on scroll down / shows on up; local appears after the hero */
  const gnav = $('[data-gnav]'), lnav = $('[data-lnav]'), hero = $('.hero');
  let lastY = scrollY;
  const onScroll = () => {
    const y = scrollY, down = y > lastY + 2, up = y < lastY - 2;
    const pastHero = hero ? y > hero.offsetHeight * 0.6 : y > 200;
    if (down && y > 80) gnav?.classList.add('is-hidden');
    if (up || y < 80) gnav?.classList.remove('is-hidden');
    lnav?.classList.toggle('is-on', pastHero || !hero);
    lnav?.classList.toggle('is-top', gnav?.classList.contains('is-hidden'));
    lastY = y;
    fcta();
  };
  addEventListener('scroll', onScroll, { passive: true });

  /* active link in local nav */
  const navLinks = $$('.lnav__links a');
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    navLinks.forEach(a => a.toggleAttribute('aria-current', a.getAttribute('href') === '#' + e.target.id));
  }), { rootMargin: '-45% 0px -50% 0px' });
  ['villa', 'plans', 'estate', 'location', 'payment'].forEach(id => $('#' + id) && io.observe($('#' + id)));

  /* ── full-screen menu */
  const menu = $('[data-menu]'), openBtn = $('[data-menu-open]');
  function closeMenu() { if (!menu || menu.hidden) return; menu.hidden = true; openBtn?.setAttribute('aria-expanded', 'false'); document.body.style.overflow = ''; lenis?.start(); openBtn?.focus(); }
  openBtn?.addEventListener('click', () => { menu.hidden = false; openBtn.setAttribute('aria-expanded', 'true'); document.body.style.overflow = 'hidden'; lenis?.stop(); $('a', menu)?.focus(); });
  $('[data-menu-close]')?.addEventListener('click', closeMenu);
  addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });

  /* ── reveals */
  const rio = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); rio.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
  $$('.reveal').forEach((el, i) => { el.style.transitionDelay = `${(i % 4) * 80}ms`; rio.observe(el); });

  /* ── hero film: toggle + pause off-screen */
  const film = $('[data-hero-film]'), filmBtn = $('[data-film-toggle]');
  if (film) {
    if (RM) film.removeAttribute('autoplay'), film.pause();
    let userPaused = RM;
    const setBtn = () => { filmBtn?.setAttribute('aria-pressed', String(film.paused)); filmBtn && ($('[data-label-pause]', filmBtn).hidden = film.paused, $('[data-label-play]', filmBtn).hidden = !film.paused); };
    filmBtn?.addEventListener('click', () => { if (film.paused) { film.play(); userPaused = false; } else { film.pause(); userPaused = true; } setBtn(); });
    new IntersectionObserver(([e]) => { if (!e.isIntersecting) film.pause(); else if (!userPaused) film.play().catch(() => {}); setBtn(); }).observe(film);
    film.addEventListener('play', setBtn); film.addEventListener('pause', setBtn);
    setBtn();
  }

  /* ── data-gal: highlights gallery with autoplay + pause */
  $$('[data-gal]').forEach(g => {
    const track = $('[data-gal-track]', g), slides = $$('[data-gal-slide]', g), dots = $('[data-gal-dots]', g), toggle = $('[data-gal-toggle]', g);
    let i = 0, timer = null, playing = !RM, visible = false;
    slides.forEach((s, k) => {
      const b = document.createElement('button');
      b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('aria-label', `${k + 1} / ${slides.length}`);
      b.addEventListener('click', () => { go(k); stop(true); });
      dots.appendChild(b);
    });
    const go = k => {
      i = (k + slides.length) % slides.length;
      const s = slides[i];
      track.scrollTo({ left: s.offsetLeft - (track.clientWidth - s.clientWidth) / 2, behavior: RM ? 'auto' : 'smooth' });
    };
    const mark = () => {
      const mid = track.scrollLeft + track.clientWidth / 2;
      let best = 0, bd = Infinity;
      slides.forEach((s, k) => { const d = Math.abs(s.offsetLeft + s.clientWidth / 2 - mid); if (d < bd) { bd = d; best = k; } });
      i = best;
      slides.forEach((s, k) => s.classList.toggle('is-on', k === i));
      $$('button', dots).forEach((b, k) => b.setAttribute('aria-selected', String(k === i)));
    };
    const tick = () => { if (playing && visible) go(i + 1); };
    const start = () => { clearInterval(timer); timer = setInterval(tick, 5000); };
    const stop = byUser => { if (byUser) { playing = false; setToggle(); } };
    const setToggle = () => { toggle.setAttribute('aria-pressed', String(!playing)); $('[data-label-pause]', toggle).hidden = !playing; $('[data-label-play]', toggle).hidden = playing; };
    toggle.addEventListener('click', () => { playing = !playing; setToggle(); if (playing) go(i + 1); });
    track.addEventListener('scroll', () => requestAnimationFrame(mark), { passive: true });
    track.addEventListener('keydown', e => { if (e.key === 'ArrowRight') { go(i + 1); stop(true); } if (e.key === 'ArrowLeft') { go(i - 1); stop(true); } });
    track.addEventListener('pointerdown', () => stop(true));
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0.4 }).observe(track);
    setToggle(); mark(); start();
  });

  /* ── data-turn: scroll-scrubbed canvas sequences (360 turntable and day→night) */
  $$('[data-turn]').forEach(sec => {
    const n = +sec.dataset.frames, mode = sec.dataset.mode || 'turn';
    const prefix = small() && sec.dataset.srcM ? sec.dataset.srcM : sec.dataset.src;
    const canvas = $('canvas', sec), ctx = canvas.getContext('2d');
    const callouts = $$('[data-from]', sec);
    const deg = $('[data-turn-deg]', sec), dial = $('.dial', sec);
    const frames = new Array(n);
    let current = -1, want = 0, started = false;
    const url = k => `${prefix}${String(k + 1).padStart(3, '0')}.webp`;
    const load = k => new Promise(res => {
      if (frames[k]) return res();
      const im = new Image(); im.decoding = 'async';
      im.onload = () => { frames[k] = im; res(); if (k === want || current < 0) draw(want); };
      im.onerror = res; im.src = url(k);
    });
    const size = () => {
      const r = canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
      canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr);
      current = -1; draw(want);
    };
    const nearest = k => { for (let d = 0; d < n; d++) { if (frames[(k + d) % n]) return (k + d) % n; if (frames[(k - d + n) % n]) return (k - d + n) % n; } return -1; };
    function draw(k) {
      const f = nearest(k);
      if (f < 0 || f === current) return;
      const im = frames[f], cw = canvas.width, ch = canvas.height;
      const s = mode === 'seq' ? Math.max(cw / im.width, ch / im.height) : Math.min(cw / im.width, ch / im.height);
      const w = im.width * s, h = im.height * s;
      ctx.clearRect(0, 0, cw, ch);
      ctx.drawImage(im, (cw - w) / 2, (ch - h) / 2, w, h);
      current = f;
      sec.classList.add('is-ready');
    }
    const progressive = async () => {   // first frame, then coarse → fine passes
      await load(0);
      for (const step of [16, 8, 4, 2, 1]) await Promise.all(Array.from({ length: Math.ceil(n / step) }, (_, j) => load(j * step)).filter(Boolean));
    };
    const update = () => {
      const r = sec.getBoundingClientRect(), span = sec.offsetHeight - innerHeight;
      const p = clamp(-r.top / (span || 1));
      want = Math.min(n - 1, Math.round(p * (n - 1)));
      draw(want);
      callouts.forEach(c => c.classList.toggle('is-on', p >= +c.dataset.from && p < +c.dataset.to));
      if (deg) deg.textContent = Math.round(p * 360) + '°';
      dial?.style.setProperty('--p', p.toFixed(3));
      sec.classList.toggle('is-end', p > 0.9);
    };
    if (RM) { // static: show the first frame and all callouts
      callouts.forEach(c => c.classList.add('is-on'));
      return;
    }
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started) { started = true; size(); progressive(); }
    }, { rootMargin: '100% 0px' }).observe(sec);
    addEventListener('scroll', () => started && requestAnimationFrame(update), { passive: true });
    addEventListener('resize', () => started && size());
    update();
  });

  /* ── data-pv: pill viewer with crossfade */
  $$('[data-pv]').forEach(pv => {
    const pills = $$('[data-pv-pill]', pv);
    const set = key => {
      pills.forEach(p => { const on = p.dataset.pvPill === key; p.setAttribute('aria-selected', String(on)); p.tabIndex = on ? 0 : -1; });
      $$('[data-pv-item]', pv).forEach(f => f.classList.toggle('is-on', f.dataset.pvItem === key));
      $$('[data-pv-text]', pv).forEach(t => t.classList.toggle('is-on', t.dataset.pvText === key));
    };
    pills.forEach((p, k) => {
      p.addEventListener('click', () => set(p.dataset.pvPill));
      p.addEventListener('keydown', e => {
        const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (!d) return;
        const nx = pills[(k + d + pills.length) % pills.length]; nx.focus(); set(nx.dataset.pvPill);
      });
    });
    set(pills[0].dataset.pvPill);
  });

  /* ── data-plan: type + level switch, area table m²/ft², full-screen dialog */
  $$('[data-plan]').forEach(sec => {
    const P = T.plans || {}, typesEl = $('[data-plan-types]', sec), levelsEl = $('[data-plan-levels]', sec);
    const img = $('[data-plan-img]', sec), info = $('[data-plan-info]', sec), missing = $('[data-plan-missing]', sec), zoom = $('[data-plan-zoom]', sec);
    const dlg = $('[data-plan-dlg]', sec), dlgImg = $('[data-plan-dlg-img]', sec);
    let type = 2, level = 0;
    const tab = (label, on, fn) => { const b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', String(on)); b.textContent = label; b.addEventListener('click', fn); return b; };
    const render = () => {
      const t = D.types[type], lv = t.levels[level];
      typesEl.replaceChildren(...Object.keys(D.types).map(k => tab(`${P.type} ${k}`, +k === type, () => { type = +k; level = 0; render(); })));
      levelsEl.replaceChildren(...t.levels.map((l, i) => tab(P[l.key], i === level, () => { level = i; render(); })));
      if (lv.img) {
        img.style.opacity = 0;
        const src = `${window.BASE}img/plans/${lv.img}.webp`;
        const pre = new Image(); pre.onload = () => { img.src = src; img.alt = `${P.alt} ${type}, ${P[lv.key]}`; img.style.opacity = 1; }; pre.src = src;
        zoom.hidden = false; missing.hidden = true;
      } else { zoom.hidden = true; missing.hidden = false; }
      const rows = t.levels.filter(l => l.total).filter((l, i, a) => !(l.key === 'gf_b'));
      const facts = [`${t.suites} ${P.suites}`, `${t.baths} ${P.baths}`, P.kitchen, P.hammam].concat(t.lift ? [P.lift] : []);
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
    render();
  });

  /* ── data-master: clickable plots + filter by type */
  $$('[data-master]').forEach(sec => {
    const M = T.mp || {}, pins = $('[data-mp-pins]', sec), card = $('[data-mp-card]', sec), filter = $('[data-mp-filter]', sec);
    const label = s => M[s] || s;
    D.plots.forEach(p => {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = p.n; b.dataset.status = p.status; b.dataset.type = p.type;
      b.style.left = p.x + '%'; b.style.top = p.y + '%';
      b.setAttribute('aria-label', `${M.villa} ${p.n} · ${M.type} ${p.type} · ${label(p.status)}`);
      b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', () => show(p, b));
      pins.appendChild(b);
    });
    const show = (p, b) => {
      $$('button', pins).forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      const msg = (lang === 'fr' ? 'Bonjour, je souhaite des informations sur la villa ' : 'Hello, I would like information about villa ') + p.n + ' (Ceuil Private Residence).';
      card.innerHTML = `<p class="mp__status"><i class="st st--${p.status}"></i>${label(p.status)}</p>
        <h3>${M.villa} ${p.n}</h3><p class="mp__hint">${M.type} ${p.type}</p>
        <dl><dt>${M.land}</dt><dd>${fmt(p.land, 2)} m²<br><small>${fmt(Math.round(p.land * FT))} ft²</small></dd>
        <dt>${M.built}</dt><dd>${fmt(p.built)} m²<br><small>${fmt(Math.round(p.built * FT))} ft²</small></dd>
        <dt></dt><dd>${M.price}</dd></dl>
        <a class="btn btn--sm" href="${wa(msg)}" target="_blank" rel="noopener">${M.request}</a>`;
    };
    const types = ['all', 1, 2, 3, 4, 5];
    types.forEach(t => {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = t === 'all' ? M.all : `${M.type} ${t}`; b.setAttribute('aria-pressed', String(t === 'all'));
      b.addEventListener('click', () => {
        $$('button', filter).forEach(x => x.setAttribute('aria-pressed', String(x === b)));
        $$('button', pins).forEach(x => x.classList.toggle('is-dim', t !== 'all' && +x.dataset.type !== t));
      });
      filter.appendChild(b);
    });
  });

  /* ── data-say: quote revealed word by word, as if spoken */
  $$('[data-say]').forEach(el => {
    const words = el.textContent.trim().split(/\s+/);
    el.textContent = '';
    words.forEach((w, k) => { const s = document.createElement('span'); s.className = 'w'; s.textContent = w; el.append(s, k < words.length - 1 ? ' ' : ''); });
    if (RM) return;
    new IntersectionObserver(([e], o) => {
      if (!e.isIntersecting) return;
      $$('.w', el).forEach((s, k) => setTimeout(() => s.classList.add('is-on'), 280 + k * 110));
      o.disconnect();
    }, { threshold: 0.6 }).observe(el);
  });

  /* ── payment steps fill */
  const pay = $('[data-pay]');
  pay && new IntersectionObserver(([e], o) => { if (e.isIntersecting) { pay.classList.add('is-on'); o.disconnect(); } }, { threshold: 0.4 }).observe(pay);

  /* ── data-fcta: floating CTA after the hero, hidden near the form and footer */
  const fbtn = $('[data-fcta]'), foot = $('[data-foot]'), visit = $('#visit');
  function fcta() {
    if (!fbtn) return;
    const past = hero ? scrollY > hero.offsetHeight * 0.8 : true;
    const near = [foot, visit].some(el => el && el.getBoundingClientRect().top < innerHeight * 0.9 && el.getBoundingClientRect().bottom > 0);
    fbtn.classList.toggle('is-on', past && !near);
  }

  /* ── form (preview: not connected) */
  $$('[data-form]').forEach(f => f.addEventListener('submit', e => {
    e.preventDefault();
    const bad = $$('[required]', f).find(i => (i.type === 'checkbox' ? !i.checked : !i.value.trim()));
    if (bad) { bad.focus(); bad.setAttribute('aria-invalid', 'true'); return; }
    const msg = $('[data-form-msg]', f); msg.hidden = false; msg.focus?.();
  }));

  // French typography: thin space before % in the payment steps
  if (lang === 'fr') $$('.pay__steps b, .pay__steps i').forEach(el => { el.textContent = el.textContent.replace(/(\d)%/g, '$1\u202f%'); });

  onScroll();
})();
