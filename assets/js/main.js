/* ══════════════════════════════════════════════════════════════
   onuryunisli.com — BEHAVIOUR
   Every module checks for its own markup first, so one file
   serves every page. Content comes from /data/content.js
   ══════════════════════════════════════════════════════════════ */
(() => {
const S = window.SITE || {};
const $  = (q, r = document) => r.querySelector(q);
const $$ = (q, r = document) => [...r.querySelectorAll(q)];
const REDUCED = matchMedia('(prefers-reduced-motion:reduce)').matches;

// CMS text is content, never HTML. URL fields accept web/local paths only.
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g,
  char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
const safeURL = value => {
  if (typeof value !== 'string') return '';
  const url = value.trim();
  if (!url || /[\u0000-\u0020\u007f]/.test(url) || url.includes('\\')) return '';
  const scheme = url.match(/^([a-z][a-z\d+.-]*):/i);
  return scheme && !/^https?$/i.test(scheme[1]) ? '' : url;
};
const isVideo = src => /\.(mp4|webm|mov)(?:[?#]|$)/i.test(src || '');
const items = value => Array.isArray(value) ? value.filter(item => item && typeof item === 'object') : [];

/* _cms/scripts/posts.py içindəki slugify ilə eyni nəticəni verməlidir */
const SLUG_TRANS = { 'ə':'e', 'ı':'i', 'ğ':'g', 'ü':'u', 'ş':'s', 'ö':'o', 'ç':'c' };
const slugify = (text, fallback = 'post') => {
  let s = String(text ?? '').toLowerCase();
  s = [...s].map(c => SLUG_TRANS[c] ?? c).join('');
  s = s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  s = s.replace(/[^a-z0-9]+/g, '-').replace(/-{2,}/g, '-').replace(/^-+|-+$/g, '')
       .slice(0, 60).replace(/^-+|-+$/g, '');
  return s || fallback;
};
const postSlug = (post, index = 0) => {
  const raw = String(post?.slug ?? '').trim();
  return raw ? slugify(raw) : slugify(post?.title, `post-${index + 1}`);
};
/* xəbərin gedəcəyi ünvan: xarici link verilibsə ona, yoxsa öz səhifəsinə */
const postHref = (post, index = 0) => {
  const external = safeURL(post?.url);
  if (external && external !== '#' && /^https?:/i.test(external)) return external;
  return `/posts/${postSlug(post, index)}`;
};
const videoVisibility = new Map();
function syncVideos() {
  syncEmbeds();
  videoVisibility.forEach((visible, video) => {
    const frame = video.closest('.fr, .lf, .bg');
    const play = visible && !document.hidden && !REDUCED &&
      video.dataset.autoplay === 'true' && (!frame || frame.classList.contains('on'));
    const wasPlaying = video.dataset.wasPlaying === 'true';
    if (play && !wasPlaying) {
      try { video.currentTime = 0; } catch {}
    }
    video.dataset.wasPlaying = String(play);
    if (play && video.paused) video.play().catch(() => {});
    else if (!play && wasPlaying) {
      video.pause();
      try { video.currentTime = 0; } catch {}
    } else if (!play && !video.paused) video.pause();
  });
}


/* ── placeholder art, used until real media is dropped in ───── */
const PAL = [['#1F3A38','#4FD6C4'],['#2E3A5C','#6E86FF'],['#3B3323','#FFC46B'],
             ['#2A3340','#8FA6FF'],['#26323A','#7ED0E8'],['#3A2E4F','#B77BFF'],
             ['#22302B','#79D98F'],['#1E2A3A','#59B6FF'],['#332B2B','#FF9B7A']];
const plate = (i, w, h, v = 0) => {
  const [c, a] = PAL[i % PAL.length], k = 1 + v * .13, o = v * .035;
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <rect width="${w}" height="${h}" fill="${c}"/><g fill="none" stroke="${a}" stroke-opacity="${.55 - o}">
  <circle cx="${w * (.5 + v * .045)}" cy="${h / 2}" r="${h * .3 * k}"/>
  <circle cx="${w * (.5 + v * .045)}" cy="${h / 2}" r="${h * .44 * k}"/>
  <path d="M0 ${h * (.76 - v * .05)} Q${w * .26} ${h * .42} ${w * .5} ${h * .6} T${w} ${h * .46}"/>
  <path d="M0 ${h * (.86 - v * .05)} Q${w * .26} ${h * .52} ${w * .5} ${h * .7} T${w} ${h * .56}"/></g></svg>`;
};
const media = (src, poster = '', autoplay = false, type = '', alt = '') => {
  const parsedEmbed = window.ProjectContent?.embed(src);
  if (parsedEmbed) return window.ProjectContent.iframe(src, {background:autoplay, autoplay:autoplay && !REDUCED, muted:autoplay, loop:autoplay, defer:autoplay, title:alt});
  const url = safeURL(src), cover = safeURL(poster);
  if (!url) return '';
  const video = type === 'video' || (!type && isVideo(url));
  return video
    ? `<video src="${escapeHTML(url)}" data-autoplay="${!!autoplay}" muted loop playsinline preload="metadata"${cover ? ` poster="${escapeHTML(cover)}"` : ''}></video>`
    : `<img src="${escapeHTML(url)}" alt="${escapeHTML(alt)}" loading="lazy">`;
};


/* ══ PROJECT DETAIL ════════════════════════════════════════════ */
// Layout blocks are data; the same renderer serves every project and a future CMS.
function projectPage() {
  const root = $('#project-detail');
  if (!root) return;
  const projects = items(S.projects);
  const index = projects.findIndex(project => project.slug === root.dataset.project);
  if (index < 0) {
    root.innerHTML = '<header class="case-header wrap"><a class="case-back mono" href="/work">← All work</a><h1 class="case-title">Project unavailable</h1></header>';
    return;
  }
  const p = projects[index], detail = p.detail || {};
  const labels = { brand:'Brand identity', motion:'Motion', '3d':'3D & CGI', packaging:'Packaging', spatial:'Spatial & exhibition' };
  const services = (Array.isArray(p.services) ? p.services : []).map(key => labels[key] || key);
  const paragraphs = text => String(text || '').split(/\n\s*\n/).filter(Boolean)
    .map(line => `<p>${escapeHTML(line)}</p>`).join('');
  let ordinal = 0;
  const frame = (asset = {}, shape = 'wide', priority = false) => {
    asset = asset && typeof asset === 'object' ? asset : {};
    const count = ++ordinal;
    const src = safeURL(asset.src), poster = safeURL(asset.poster);
    const aspect = ['wide','square','portrait','natural'].includes(shape) ? shape : 'wide';
    const isFilm = asset.type === 'video' || (!asset.type && isVideo(src));
    let visual;
    if (src && isFilm) {
      // Detail films have native playback controls, including sound/fullscreen.
      // Unlike thumbnail loops, these are not managed by coverVideos().
      visual = `<video src="${escapeHTML(src)}"${poster ? ` poster="${escapeHTML(poster)}"` : ''} controls playsinline preload="metadata" aria-label="${escapeHTML(asset.alt || p.title)}"></video>`;
    } else if (src) {
      visual = `<img src="${escapeHTML(src)}" alt="${escapeHTML(asset.alt || p.title)}" loading="${priority ? 'eager' : 'lazy'}"${priority ? ' fetchpriority="high"' : ''} decoding="async">`;
    } else {
      visual = `<div class="case-placeholder" role="img" aria-label="${escapeHTML(p.client)} — visual placeholder">${plate(index, 1600, aspect === 'portrait' ? 2000 : aspect === 'square' ? 1600 : 1000, (count - 1) % 5)}<span class="case-placeholder-mark" aria-hidden="true">${escapeHTML(p.initials)}</span><span class="case-placeholder-note mono" aria-hidden="true">${String(count).padStart(2,'0')} / ${escapeHTML(p.client)}</span></div>`;
    }
    return `<figure class="case-figure"><div class="case-frame case-${aspect}">${visual}</div>${asset.caption ? `<figcaption>${escapeHTML(asset.caption)}</figcaption>` : ''}</figure>`;
  };
  const cover = detail.cover || (safeURL(p.video)
    ? {src:p.video,type:'video',poster:p.poster,alt:p.title}
    : {src:p.poster,alt:p.title});
  // Existing gallery shots work immediately. Explicit blocks override that fallback.
  const shots = Array.isArray(p.shots) ? p.shots.filter(src => safeURL(src)) : [];
  const blocks = Array.isArray(detail.blocks) ? items(detail.blocks)
    : shots.length ? shots.map(src => ({type:'media',asset:{src}}))
    : items(S.projectLayout?.blocks);
  const coverMarkup = frame(cover, detail.coverAspect || 'wide', true);
  const body = blocks.map(block => {
    if (block.type === 'media') return `<section class="case-block">${frame(block.asset, block.aspect)}</section>`;
    if (block.type === 'pair') {
      const assets = items(block.assets);
      return assets.length ? `<section class="case-block case-pair">${assets.map(asset => frame(asset,block.aspect || 'square')).join('')}</section>` : '';
    }
    if (block.type === 'text' && (block.title || block.text)) return `<section class="case-text case-block">${block.title ? `<h2>${escapeHTML(block.title)}</h2>` : '<div></div>'}<div class="case-copy">${paragraphs(block.text)}</div></section>`;
    return '';
  }).join('');
  /* the next three projects after this one, wrapping, never itself —
     same square card as the homepage grid, so it reuses .grid/.card */
  const more = [];
  for (let k = 1; k < projects.length && more.length < 3; k++) {
    const q = projects[(index + k) % projects.length];
    if (q && q.slug !== p.slug) more.push(q);
  }
  /* same card as the homepage; media paths rebased for work/ */
  const moreCard = (q, i) => projectCard(q, index + i + 1);
  /* film-style credits: what the project was, who made it, what my part was */
  const creditRows = [
    ['Client', p.client],
    ['Year', p.year],
    ['Studio', p.studio],
    ['Role', p.role || services.join(', ')]
  ].filter(([, value]) => String(value || '').trim());
  document.title = `${p.client} — ${S.name || 'Onur Yunisli'}`;
  const description = $('meta[name="description"]');
  if (description) description.setAttribute('content', detail.description || `${p.client}: ${p.title}. ${services.join(', ')}.`);
  root.innerHTML = `
    <header class="case-header wrap">
      <div class="case-eyebrow"><a class="case-back mono" href="/work">← All work</a><span class="mono">${String(index+1).padStart(2,'0')} / ${String(projects.length).padStart(2,'0')}</span></div>
      <h1 class="case-title">${escapeHTML(p.client)}</h1>
      <p class="case-lede">${escapeHTML(p.title)}</p>
    </header>
    <div class="${detail.layout === "stream" ? "case-stream-shell" : "case-gallery wrap"}">
      ${detail.layout === "stream" && window.ProjectContent ? window.ProjectContent.render(detail, {base:"/"}) : `<section class="case-cover">${coverMarkup}</section>`}
      ${detail.layout !== "stream" && detail.intro ? `<section class="case-text case-intro"><h2>Overview</h2><div class="case-copy">${paragraphs(detail.intro)}</div></section>` : ''}
      ${detail.layout === "stream" ? "" : body}
      ${detail.layout !== "stream" && detail.credits ? `<section class="case-credits"><h2 class="mono">Credits</h2><div class="case-copy">${paragraphs(detail.credits)}</div></section>` : ''}
    </div>
    ${creditRows.length ? `<section class="case-credit wrap rv-el">
      <h2 class="mono">Credits</h2>
      <dl class="case-credit-list">${creditRows.map(([label, value]) =>
        `<div><dt class="mono">${escapeHTML(label)}</dt><dd>${escapeHTML(value)}</dd></div>`).join('')}</dl>
      ${detail.layout === "stream" && detail.credits ? `<div class="case-credit-note">${paragraphs(detail.credits)}</div>` : ''}
    </section>` : ''}
    ${more.length ? `<section class="case-more wrap">
      <div class="case-more-head rv-el"><h2>More work</h2></div>
      <div class="grid">${more.map((q, i) => moreCard(q, i)).join('')}</div>
    </section>` : ''}`;
}


/* ══ POST PAGE ══════════════════════════════════════════════════ */
/* Səhifənin statik variantı Python tərəfindən yazılır — botlar onu görür.
   Burada yalnız blokların zəngin görünüşü onun üzərinə qurulur.        */
function postPage() {
  const root = $('#post-detail');
  if (!root) return;
  const list = items(S.posts);
  const slug = root.dataset.post;
  const post = list.find((p, i) => postSlug(p, i) === slug) || null;
  if (!post) return;
  const detail = post.detail || {};
  const body = $('#post-body');
  if (body && items(detail.blocks).length && window.ProjectContent) {
    body.className = 'case-stream-shell';
    body.innerHTML = window.ProjectContent.render(detail, { base: '/' });
  }
  document.title = `${post.title} — ${S.name || 'Onur Yunisli'}`;
}

/* Latest səhifəsində kateqoriya filtri */
function postFilters() {
  const bar = $('#postfilters');
  if (!bar) return;
  const cats = [...new Set(items(S.posts)
    .map(p => String(p.category || '').trim()).filter(Boolean))];
  if (cats.length < 2) return;
  bar.innerHTML = [`<button class="pill ghost on" data-c="all">All</button>`]
    .concat(cats.map(c => `<button class="pill ghost" data-c="${escapeHTML(c.toLowerCase())}">${escapeHTML(c)}</button>`))
    .join('');
  const cards = $$('#postgrid .card');
  bar.addEventListener('click', e => {
    const b = e.target.closest('.pill');
    if (!b) return;
    $$('.pill', bar).forEach(x => x.classList.toggle('on', x === b));
    const c = b.dataset.c;
    cards.forEach(card => card.classList.toggle('hide', c !== 'all' && card.dataset.cat !== c));
  });
}


/* ══ HERO ═══════════════════════════════════════════════════════ */
function hero() {
  const bgs = $('#bgs'), rail = $('#rail'), roller = $('#roller'), track = $('#track');
  if (!bgs || !rail || !roller) return;
  const D = items(S.disciplines);
  if (!D.length) return;
  const LEN = D.length, COPIES = 5, MID = 2 * LEN;

  D.forEach((d, i) => {
    const b = document.createElement('div');
    b.className = 'bg' + (i ? '' : ' on');
    b.innerHTML = d.video ? media(d.video, d.poster, true, 'video') : plate(i, 1600, 900);
    const video = b.querySelector('video');
    if (video) video.preload = 'auto';
    bgs.appendChild(b);
  });
  for (let c = 0; c < COPIES; c++) D.forEach((d, i) => {
    const s = document.createElement('span');
    s.className = 'slot';
    s.innerHTML = `<span>${escapeHTML(d.title)}</span>`;
    s.dataset.abs = c * LEN + i;
    s.addEventListener('click', () => { go(+s.dataset.abs); restart(); });
    rail.appendChild(s);
  });

  const bgEls = $$('.bg', bgs), slots = $$('.slot', rail);
  let pos = MID, n = 0, timer = null, playing = !REDUCED;
  const H = () => slots[0].offsetHeight;
  const paint = () => slots.forEach(s => s.classList.toggle('on', +s.dataset.abs === pos));

  function place(animate) {
    if (animate) { rail.style.transition = ''; rail.style.transform = `translateY(${-pos * H()}px)`; }
    else {
      rail.style.transition = 'none';
      rail.style.transform = `translateY(${-pos * H()}px)`;
      void rail.offsetHeight;                 /* commit, or both moves merge */
      rail.style.transition = '';
    }
  }
  function recentre() {
    while (pos < MID) pos += LEN;
    while (pos >= MID + LEN) pos -= LEN;
    place(false); paint();
  }
  function paintBackground() {
    const target = bgEls[n];
    const video = target.querySelector('video');
    const embed = target.querySelector('iframe[data-embed-src]');
    // Keep the previous visual until the next player has a decoded frame.
    if (video && video.readyState < 2) return;
    if (embed && embed.dataset.mediaReady !== 'true') return;
    bgEls.forEach((b, k) => b.classList.toggle('on', k === n));
    syncVideos();
  }
  bgEls.forEach(b => {
    b.querySelector('video')?.addEventListener('loadeddata', paintBackground);
    b.querySelector('iframe')?.addEventListener('mediaready', paintBackground);
  });
  function go(target) {
    const delta = target - pos;
    recentre();                               /* reset first, THEN animate */
    pos += delta;
    n = ((pos % LEN) + LEN) % LEN;
    place(true); paint();
    paintBackground();
    if (track) { track.classList.remove('run'); void track.offsetWidth; if (playing) track.classList.add('run'); }
  }
  const tick    = () => { clearInterval(timer); timer = setInterval(() => go(pos + 1), 7000); };
  const restart = () => { clearInterval(timer); if (playing) tick(); };

  rail.addEventListener('transitionend', e => { if (e.target === rail && e.propertyName === 'transform') recentre(); });
  place(false); paint();
  addEventListener('resize', () => place(false));

  if (REDUCED) { roller.classList.add('ready'); }
  else setTimeout(() => {                     /* let the film run for a beat */
    roller.classList.add('ready');
    if (track) track.classList.add('run');
    tick();
  }, 800);
}


/* ══ WORK GRID ══════════════════════════════════════════════════ */
const dlIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="#1C1C1C" stroke-width="2" stroke-linecap="round"><path d="M12 3v12m0 0l-4-4m4 4l4-4M4 19h16"/></svg>`;

function grid() {
  const g = $('#grid');
  if (!g) return;
  const all = items(S.projects);
  /* homepage shows at most nine, whatever is flagged featured.
     work.html has no data-only, so it keeps showing everything.   */
  const HOME_MAX = 9;
  const list = g.dataset.only === 'featured'
    ? all.filter(p => p.featured).slice(0, +g.dataset.max || HOME_MAX)
    : all;

  g.innerHTML = list.map((p, idx) => projectCard(p, idx)).join('');
}

/* One card, used by the homepage, work.html and the "More work" row on a
   project page. opts.base rewrites relative media paths for pages that do
   not sit at the site root; opts.href prefixes the link.                */
function projectCard(p, idx, opts = {}) {
  const rb = value => {                        /* embeds already carry absolute URLs */
    if (!value || window.ProjectContent?.embed(value)) return value;
    return window.ProjectContent?.assetURL(value, '/') || value;
  };
  const video = rb(p.video), poster = rb(p.poster);
  const shots = (Array.isArray(p.shots) ? p.shots.map(rb) : []).filter(src => safeURL(src));
  /* embed: keep the pasted code, not the resolved URL — the size attributes
     in it are what makes the cover crop to a square for any video ratio */
  const embedRaw = window.ProjectContent?.embed(video) ? video : '';
  const cover = embedRaw || safeURL(video) || safeURL(poster);
  // The cover is independent of the gallery: never discard the first shot.
  const coverImages = Array.isArray(p.coverImages)
    ? p.coverImages.map(rb).filter(src => safeURL(src)).slice(0,7) : null;
  const coverVideo = embedRaw || safeURL(video);
  const sources = coverImages ? [...(coverVideo ? [coverVideo] : []), ...coverImages]
    : cover ? [cover, ...shots.filter(src => src !== cover)]
    : shots.length ? shots : [0,1,2,3,4,5,6];
  if (!sources.length) sources.push(0);
  /* kartdakı kvadrat: layihənin logosu, yoxdursa baş hərfləri */
  const logoSrc = safeURL(rb(p.logo));
  const words = String(p.client || '').split(/[\s&]+/).filter(Boolean);
  const initials = (words.length > 1 ? words.slice(0, 2).map(w => w[0]).join('')
                                     : (words[0] || '').slice(0, 2)).toUpperCase();
  const logoMark = logoSrc
    ? `<img src="${escapeHTML(logoSrc)}" alt="${escapeHTML(p.client || '')}" loading="lazy">`
    : escapeHTML(initials);
  const frames = sources.map((src, k) => {
    const videoCover = k === 0 && !!(window.ProjectContent?.embed(video) || safeURL(video));
    const inner = typeof src === 'string'
      ? media(src, videoCover ? poster : '', videoCover, videoCover ? 'video' : '', p.title)
      : plate(idx, 1000, 1000, k);
    return `<div class="fr${k ? '' : ' on'}">${inner}</div>`;
  }).join('');
  return `
  <a class="card" href="/work/${escapeHTML(encodeURIComponent(String(p.slug ?? '')))}" data-svc="${escapeHTML((Array.isArray(p.services) ? p.services : []).join(' '))}">
    <div class="thumb">
      <div class="media">${frames}</div>
      <span class="dl">${dlIcon}</span>
      <span class="chip"><span class="sq${logoSrc ? ' logo' : ''}">${logoMark}</span><span><b>${escapeHTML(p.client)}</b><span>${escapeHTML(p.sector)}</span></span></span>
    </div>
    <h3>${escapeHTML(p.title)}</h3>
  </a>`;
}

/* cursor sweeps the stills */
function scrub() {
  const warmers = new Map();
  const nearby = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      warmers.get(entry.target)?.();
      nearby.unobserve(entry.target);
    });
  }, { rootMargin: '500px' });
  $$('.card .thumb').forEach(th => {
    const frs = $$('.fr', th);
    if (frs.length < 2) return;
    // Only still images define the equal-width hover zones; the video is the idle cover.
    const imageFrames = frs.map((frame, index) => ({frame,index}))
      .filter(({frame}) => !frame.querySelector('video, iframe'))
      .slice(0,7).map(({index}) => index);
    if (!imageFrames.length) return;
    let cur = 0, wanted = 0;
    const ready = frs.map(frame => !frame.querySelector('img, video, iframe[data-embed-src]'));
    const pending = [];
    const prepare = k => {
      if (ready[k]) return Promise.resolve(true);
      if (pending[k]) return pending[k];
      const video = frs[k].querySelector('video');
      const iframe = frs[k].querySelector('iframe[data-embed-src]');
      if (video || iframe) {
        const element = video || iframe;
        const isReady = video ? video.readyState >= 2 : iframe.dataset.mediaReady === 'true';
        if (isReady) { ready[k] = true; return Promise.resolve(true); }
        pending[k] = new Promise(resolve => element.addEventListener(video ? 'loadeddata' : 'mediaready', () => {ready[k]=true;resolve(true);}, {once:true}));
        if (video) video.preload = 'auto';
        else warmEmbed(iframe);
        return pending[k];
      }
      const img = frs[k].querySelector('img');
      img.loading = 'eager';
      pending[k] = (async () => {
        try {
          if (img.decode) await img.decode();
          else if (!img.complete) await new Promise((resolve, reject) => {
            img.addEventListener('load', resolve, {once:true});
            img.addEventListener('error', reject, {once:true});
          });
          ready[k] = img.naturalWidth > 0;
        } catch { ready[k] = false; }
        return ready[k];
      })();
      return pending[k];
    };
    const paint = k => {
      if (k === cur) return;
      cur = k;
      frs.forEach((frame, i) => frame.classList.toggle('on', i === k));
      syncVideos();
    };
    const show = k => {
      wanted = k;
      if (ready[k]) paint(k);
      else prepare(k).then(loaded => { if (loaded && wanted === k) paint(k); });
    };
    const warm = () => frs.forEach((_, k) => { prepare(k); });
    warmers.set(th, warm); nearby.observe(th);
    th.addEventListener('mouseenter', warm, {once:true});
    th.addEventListener('mousemove', e => {
      const r = th.getBoundingClientRect();
      const p = (e.clientX - r.left) / r.width;
      const zone = Math.max(0, Math.min(imageFrames.length - 1, Math.floor(p * imageFrames.length)));
      show(imageFrames[zone]);
    }, { passive: true });
    th.addEventListener('mouseleave', () => show(0));
  });
}

/* Play only visible, active media, including hero and latest previews. */
function coverVideos() {
  const vids = $$('video[data-autoplay]');
  if (!vids.length) return;
  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => videoVisibility.set(entry.target, entry.isIntersecting));
    syncVideos();
  }, { threshold: 0 });
  const preload = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.preload = 'auto';
      if (entry.target.networkState === 0) entry.target.load();
      preload.unobserve(entry.target);
    });
  }, {rootMargin:'600px'});
  vids.forEach(video => {
    videoVisibility.set(video, false); io.observe(video);
    preload.observe(video);
    video.addEventListener('canplay', syncVideos);
  });
  document.addEventListener('visibilitychange', syncVideos);
}

/* homepage: five pills filter the grid */
function filters() {
  const bar = $('#filters');
  if (!bar) return;
  const cards = $$('#grid .card');
  $$('.pill', bar).forEach(p => p.setAttribute('aria-pressed', String(p.classList.contains('on'))));
  bar.addEventListener('click', e => {
    const b = e.target.closest('.pill');
    if (!b) return;
    $$('.pill', bar).forEach(p => { p.classList.toggle('on', p === b); p.setAttribute('aria-pressed', String(p === b)); });
    const f = b.dataset.f;
    cards.forEach(c => c.classList.toggle('hide', f !== 'all' && !c.dataset.svc.split(' ').includes(f)));
  });
}

/* work page: twelve at a time */
function loadMore() {
  const more = $('#loadmore');
  if (!more) return;
  const cards = $$('#grid .card'), size = Number(more.dataset.page);
  const PAGE = Number.isInteger(size) && size > 0 ? size : 12;
  let shown = PAGE;
  const paint = () => {
    cards.forEach((c, i) => c.classList.toggle('hide', i >= shown));
    more.parentElement.style.display = cards.length > shown ? '' : 'none';
  };
  more.addEventListener('click', () => { shown += PAGE; paint(); });
  paint();
}


/* ══ LATEST ═════════════════════════════════════════════════════ */
function latest() {
  const listEl = $('#posts'), box = $('#latestImg');
  if (!listEl) return;
  const P = items(S.posts);
  listEl.innerHTML = P.map((p, i) => `
    <a class="post" href="${escapeHTML(postHref(p, i))}"><div>
      <div class="post-meta mono"><i class="sq"></i> ${escapeHTML(p.category)} <span>|</span> ${escapeHTML(p.date)}</div>
      <h3>${escapeHTML(p.title)}</h3>
    </div><span class="arrow" aria-hidden="true">↗</span></a>`).join('');

  if (!box) return;
  box.innerHTML = P.map((p, i) => {
    const src = safeURL(p.video) || safeURL(p.image) || safeURL(p.poster);
    return `<div class="lf${i ? '' : ' on'}">${src ? media(src, p.poster, !!safeURL(p.video), safeURL(p.video) ? 'video' : '', p.title) : plate(i + 1, 1000, 1000, i * 2)}</div>`;
  }).join('');
  const lfs = $$('.lf', box);
  $$('.post', listEl).forEach((post, i) => {
    const select = () => { lfs.forEach((f, k) => f.classList.toggle('on', k === i)); syncVideos(); };
    post.addEventListener('mouseenter', select);
    post.addEventListener('focus', select);
  });
}


/* ══ LATEST PAGE ════════════════════════════════════════════════ */
function postGrid() {
  const g = $('#postgrid');
  if (!g) return;
  g.innerHTML = items(S.posts).map((p, i) => {
    const src = safeURL(p.video) || safeURL(p.image) || safeURL(p.poster);
    const inner = src ? media(src, p.poster, !!safeURL(p.video), safeURL(p.video) ? 'video' : '', p.title) : plate(i + 1, 1000, 1000, i * 2);
    return `
  <a class="card pcard" href="${escapeHTML(postHref(p, i))}" data-cat="${escapeHTML(String(p.category || '').toLowerCase())}">
    <div class="thumb"><div class="media"><div class="fr on">${inner}</div></div></div>
    <div class="pmeta mono"><i class="sq"></i> ${escapeHTML(p.category)} <span>|</span> ${escapeHTML(p.date)}</div>
    <h3>${escapeHTML(p.title)}</h3>
  </a>`;
  }).join('');
}


/* Shared settings already declared in content.js now update every page. */
function settings() {
  const value = key => key.split('.').reduce((obj, part) =>
    obj && Object.prototype.hasOwnProperty.call(obj, part) ? obj[part] : undefined, S);
  $$('[data-site-text]').forEach(el => {
    const text = value(el.dataset.siteText);
    if (typeof text === 'string') el.textContent = text;
  });
  $$('[data-site-link]').forEach(el => {
    const key = el.dataset.siteLink, raw = value(key);
    if (typeof raw !== 'string') return;
    let href;
    if (key === 'email') href = raw.trim() ? 'mailto:' + encodeURIComponent(raw.trim()).replace(/%40/g, '@') : '';
    else if (key === 'phoneRaw') href = /^[+\d(). \-]+$/.test(raw) ? 'tel:' + raw.replace(/[^+\d]/g, '') : '';
    else href = safeURL(raw);
    if (href) el.setAttribute('href', href);
    else el.removeAttribute('href');
  });
}

/* ══ CONTACT ════════════════════════════════════════════════════ */
function contact() {
  const clocks = $$('#clock, .clock');
  if (clocks.length) {
    const set = () => {
      const format = zone => new Intl.DateTimeFormat('en-GB', {
        hour: '2-digit', minute: '2-digit', hour12: true,
        timeZone: zone, timeZoneName: 'shortOffset'
      }).formatToParts(new Date());
      let parts;
      try { parts = format(S.timezone || 'Asia/Baku'); }
      catch { parts = format('Asia/Baku'); }
      const part = type => parts.find(p => p.type === type)?.value || '';
      const t = `${part('hour')}:${part('minute')} ${part('dayPeriod').toUpperCase()} ${part('timeZoneName')}`;
      clocks.forEach(c => c.textContent = t);
    };
    set(); setInterval(set, 20000);
  }
  const av = $('#avatar');
  if (av) av.innerHTML = S.portrait
    ? media(S.portrait, '', true, S.portraitType || '', S.name)
    : `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="#343941"/><circle cx="50" cy="38" r="17" fill="#565C66"/><path d="M14 100c0-22 16-34 36-34s36 12 36 34z" fill="#565C66"/></svg>`;
}


/* ══ CONTACT FORM ═══════════════════════════════════════════════ */
/* Posts to a form relay (no backend). Web3Forms when SITE.formKey is set,
   otherwise FormSubmit addressed to SITE.email. */
function contactForm() {
  const form = $('#cform');
  if (!form) return;
  const note = $('#cform-status');
  const button = $('#cform-send');
  const rest = note ? note.textContent : '';
  const EMAIL = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
  const at = name => form.querySelector(`[name="${name}"]`);

  const clear = el => {
    const box = el && el.closest('.f');
    if (!box) return;
    box.classList.remove('bad');
    const err = box.querySelector('.f-err');
    if (err) err.textContent = '';
  };
  const fail = (el, message) => {
    const box = el && el.closest('.f');
    if (!box) return;
    box.classList.add('bad');
    const err = box.querySelector('.f-err');
    if (err) err.textContent = message;
  };
  const say = (html, state) => {
    if (!note) return;
    note.innerHTML = html;
    note.classList.remove('bad', 'ok');
    if (state) note.classList.add(state);
  };

  ['name', 'email', 'phone', 'message'].forEach(n => {
    const el = at(n);
    if (el) el.addEventListener('input', () => clear(el));
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (form.dataset.busy === '1') return;
    if (at('_honey') && at('_honey').value) return;          /* bot */

    const name = at('name').value.trim();
    const email = at('email').value.trim();
    const phone = at('phone').value.trim();
    const message = at('message').value.trim();

    [at('name'), at('email'), at('message')].forEach(clear);
    let ok = true;
    if (name.length < 2) { fail(at('name'), 'Write your name'); ok = false; }
    if (!EMAIL.test(email)) { fail(at('email'), 'Write a valid email address'); ok = false; }
    if (message.length < 10) { fail(at('message'), 'Add a few words about the job'); ok = false; }
    if (!ok) {
      say('Check the highlighted fields.', 'bad');
      const first = form.querySelector('.f.bad input, .f.bad textarea');
      if (first) first.focus();
      return;
    }

    const inbox = (S.email || '').trim();
    const key = (S.formKey || '').trim();
    const endpoint = (S.formEndpoint || '').trim()
      || (key ? 'https://api.web3forms.com/submit'
              : 'https://formsubmit.co/ajax/' + encodeURIComponent(inbox));

    const line = `New enquiry from ${name} — onuryunisli.com`;
    const payload = key
      ? { access_key: key, subject: line, from_name: 'onuryunisli.com',
          name, email, phone: phone || '—', message, replyto: email, page: location.href }
      : { name, email, phone: phone || '—', message,
          _subject: line, _template: 'table', _captcha: 'false',
          _replyto: email, page: location.href };

    form.dataset.busy = '1';
    if (button) { button.disabled = true; button.textContent = 'Sending…'; }
    say('Sending…');

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload)
      });
      let data = {};
      try { data = await res.json(); } catch {}
      const sent = res.ok && data.success !== false && String(data.success ?? 'true') !== 'false';
      if (!sent) throw new Error(data.message || 'relay refused');
      form.innerHTML = `<div class="cform-done"><h3>Message sent</h3>`
        + `<p>Thanks ${escapeHTML(name.split(/\s+/)[0])} — it is in my inbox. `
        + `I reply within one working day, usually sooner.</p></div>`;
    } catch {
      form.dataset.busy = '';
      if (button) { button.disabled = false; button.textContent = 'Send message'; }
      const href = inbox ? 'mailto:' + encodeURIComponent(inbox).replace(/%40/g, '@') : '';
      say(inbox
        ? `Could not send just now. Write to <a href="${href}">${escapeHTML(inbox)}</a> instead.`
        : 'Could not send just now. Please try again in a moment.', 'bad');
    }
  });

  form.addEventListener('reset', () => say(escapeHTML(rest)));
}


/* ══ ABOUT ═════════════════════════════════════════════════════ */
function portrait() {
  const box = $('#portrait');
  if (!box) return;
  box.innerHTML = S.portrait
    ? media(S.portrait, '', true, S.portraitType || '', S.name)
    : plate(4, 800, 1000);
}

/* client list is derived from the projects, so adding work updates it */
function clients() {
  const box = $('#clients');
  if (!box) return;
  const seen = new Map();
  items(S.projects).forEach(p => {
    const sector = String(p.sector || '').trim();
    if (sector && !seen.has(p.client)) seen.set(p.client, sector);
  });
  box.innerHTML = [...seen].map(([c, sec]) =>
    `<div class="client"><b>${escapeHTML(c)}</b><span>${escapeHTML(sec)}</span></div>`).join('');
}


/* ══ SCROLL REVEAL ══════════════════════════════════════════════ */
function reveal() {
  const h = $('[data-split]');
  if (h) {                                   /* headline builds word by word */
    const walk = document.createTreeWalker(h, NodeFilter.SHOW_TEXT), nodes = [];
    while (walk.nextNode()) nodes.push(walk.currentNode);
    nodes.forEach(t => {
      const frag = document.createDocumentFragment();
      t.nodeValue.split(/(\s+)/).forEach(chunk => {
        if (!chunk) return;
        if (/^\s+$/.test(chunk)) { frag.appendChild(document.createTextNode(' ')); return; }
        const w = document.createElement('span');
        w.className = 'w'; w.textContent = chunk;
        frag.appendChild(w);
      });
      t.parentNode.replaceChild(frag, t);
    });
  }
  const words = $$('[data-split] .w');
  words.forEach((w, i) => w.style.transitionDelay = (i * 70) + 'ms');

  const rv = [
    ...$$('.rv-el'), ...$$('.row'), ...$$('.client'), ...$$('.abt-facts > div'),
    ...$$('.state .pill'), ...$$('.work-head'), ...$$('.viewall'), ...$$('.loadwrap'),
    ...$$('.latest-top h2'), ...$$('.latest-img'), ...$$('.post'),
    ...$$('.cta-head'), ...$$('.cta-rule'), ...$$('.cta-pills .pill'), ...$$('.cta-foot > div')
  ];
  rv.forEach(el => el.classList.add('rv'));
  $$('.post').forEach((p, i) => p.style.transitionDelay = (i * 140) + 'ms');
  $$('.cta-foot > div').forEach((d, i) => d.style.transitionDelay = (i * 110) + 'ms');
  $$('.cta-pills .pill').forEach((p, i) => p.style.transitionDelay = (i * 120) + 'ms');
  $$('.row').forEach((r, i) => r.style.transitionDelay = (i * 90) + 'ms');
  $$('.client').forEach((c, i) => c.style.transitionDelay = (i * 55) + 'ms');
  $$('.abt-facts > div').forEach((d, i) => d.style.transitionDelay = (i * 110) + 'ms');

  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in'); io.unobserve(e.target);
  }), { threshold: .2, rootMargin: '0px 0px -14% 0px' });
  [...words, ...rv].forEach(el => io.observe(el));

  /* cards rise a whole row at a time, and only once properly in view */
  const cards = $$('.card');
  const cols = () => innerWidth > 1000 ? 3 : innerWidth > 640 ? 2 : 1;
  const ioCards = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    const visible = cards.filter(card => !card.classList.contains('hide'));
    const index = visible.indexOf(e.target);
    if (index < 0) return;
    const c = cols(), row = Math.floor(index / c);
    visible.slice(row * c, row * c + c).forEach(k => { k.classList.add('in'); ioCards.unobserve(k); });
  }), { threshold: .45, rootMargin: '0px 0px -22% 0px' });
  cards.forEach(el => ioCards.observe(el));
}


/* ══ NAV ════════════════════════════════════════════════════════ */
function navDot() {
  const links = $$('.nav-links a');
  const secs = links.map(a => {
    const h = a.getAttribute('href');
    return h && h.length > 1 && h.startsWith('#') ? document.getElementById(h.slice(1)) : null;
  }).filter(Boolean);
  if (!secs.length) return;
  const io = new IntersectionObserver(es => es.forEach(e => {
    const a = links.find(l => l.getAttribute('href') === '#' + e.target.id);
    if (a) a.classList.toggle('active', e.isIntersecting);
  }), { rootMargin: '-45% 0px -45% 0px' });
  secs.forEach(x => io.observe(x));
}

function navBar() {
  const nav = $('.nav'), hero = $('.hero'), dark = $('[data-dark]');
  if (!nav) return;
  let last = scrollY, ticking = false;
  function update() {
    const y = scrollY, edge = hero ? hero.offsetHeight - 80 : 0;
    if (hero && y < edge) {
      nav.classList.remove('pinned', 'away', 'ondark');
    } else {
      nav.classList.add('pinned');
      if (y > last + 5) nav.classList.add('away');
      else if (y < last - 5) nav.classList.remove('away');
      if (dark) {
        const t = dark.offsetTop, b = t + dark.offsetHeight, mid = y + 34;
        nav.classList.toggle('ondark', mid > t && mid < b);
      }
    }
    last = y; ticking = false;
  }
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  update();
}


/* ══ MAGNETIC ELEMENTS ══════════════════════════════════════════ */
function magnet() {
  if (REDUCED || matchMedia('(hover:none)').matches) return;
  const mags = $$('.nav-links a, .mark, .orb, .pill.outline, .pill.ink');
  if (!mags.length) return;
  const IN = 6, OUT = 20, PULL = .38, MAX = 15, LAG = .11;
  const st = mags.map(() => ({ tx:0, ty:0, x:0, y:0, on:false, held:false }));

  /* layout geometry — offsetLeft/Top ignore transforms, so the zone never moves */
  const inFixed = el => { for (let n = el; n; n = n.parentElement) if (getComputedStyle(n).position === 'fixed') return true; return false; };
  const zone = el => {
    let x = 0, y = 0;
    for (let n = el; n; n = n.offsetParent) { x += n.offsetLeft; y += n.offsetTop; }
    const f = inFixed(el);
    return { cx: x + el.offsetWidth / 2 - (f ? 0 : scrollX),
             cy: y + el.offsetHeight / 2 - (f ? 0 : scrollY),
             w: el.offsetWidth, h: el.offsetHeight };
  };
  const current = el => { const m = new DOMMatrixReadOnly(getComputedStyle(el).transform); return { x: m.m41, y: m.m42 }; };
  const radii = el =>
      el.classList.contains('orb')     ? { i:20, o:35 }
    : el.classList.contains('mark')    ? { i:IN * .5, o:OUT * .5 }
    : (el.classList.contains('outline') || el.classList.contains('ink')) ? { i:0, o:5 }
    : { i:IN, o:OUT };

  mags.forEach((el, i) => el.addEventListener('mousedown', () => st[i].held = true));
  addEventListener('mouseup', () => st.forEach(s => s.held = false));

  addEventListener('mousemove', e => {
    const nav = $('.nav');
    const flat = nav ? nav.classList.contains('pinned') : false;
    mags.forEach((el, i) => {
      const s = st[i], z = zone(el), R = radii(el), pad = s.on ? R.o : R.i;
      const dx = e.clientX - z.cx, dy = e.clientY - z.cy;
      const orb  = el.classList.contains('orb');
      const pill = el.classList.contains('outline') || el.classList.contains('ink');
      const inside = orb
        ? (dx * dx) / Math.pow(z.w / 2 + pad, 2) + (dy * dy) / Math.pow(z.h / 2 + pad, 2) <= 1
        : Math.abs(dx) < z.w / 2 + pad && Math.abs(dy) < z.h / 2 + pad;

      if (inside || s.held) {
        if (!s.on) { s.on = true; const c = current(el); s.x = c.x; s.y = c.y; el.style.transition = 'none'; }
        const m = orb ? MAX * 2.4 : pill ? MAX * 1.4 : MAX;
        s.tx = Math.max(-m, Math.min(m, dx * PULL));
        s.ty = (flat && !orb && !pill) ? 0 : Math.max(-m, Math.min(m, dy * PULL));
      } else if (s.on) {
        s.on = false; s.tx = s.ty = s.x = s.y = 0;
        el.style.transition = orb  ? 'transform 1.25s cubic-bezier(.1,2.9,.3,1)'
                            : pill ? 'transform .95s cubic-bezier(.12,2.4,.32,1)'
                            :        'transform .8s cubic-bezier(.18,1.7,.4,1)';
        el.style.transform = 'translate(0,0)';
      }
    });
  }, { passive: true });

  (function loop() {
    mags.forEach((el, i) => {
      const s = st[i]; if (!s.on) return;
      s.x += (s.tx - s.x) * LAG; s.y += (s.ty - s.y) * LAG;
      el.style.transform = `translate(${s.x.toFixed(2)}px,${s.y.toFixed(2)}px)`;
    });
    requestAnimationFrame(loop);
  })();
}

/* blue ink: --ox/--oy where it starts, --mx/--my where the light is now */
function ink() {
  $$('.pill.outline, .pill.ink, .orb').forEach(p => {
    const at = e => { const r = p.getBoundingClientRect(); return [(e.clientX - r.left) + 'px', (e.clientY - r.top) + 'px']; };
    const spot = e => { const [x, y] = at(e); p.style.setProperty('--mx', x); p.style.setProperty('--my', y); };
    p.addEventListener('mouseenter', e => { const [x, y] = at(e); p.style.setProperty('--ox', x); p.style.setProperty('--oy', y); spot(e); });
    p.addEventListener('mousemove', spot, { passive: true });
    p.addEventListener('mouseleave', e => { const [x, y] = at(e); p.style.setProperty('--ox', x); p.style.setProperty('--oy', y); });
  });
}


/* ══ ELEMENT BAND ═══════════════════════════════════════════════ */
function elementLogo() {
  if (REDUCED || matchMedia('(hover:none)').matches) return;
  const link = $('.endlink'), svg = link && $('.el-logo', link);
  if (!svg) return;
  const dots = $$('.dot', svg);
  const IN = 90, OUT = 150;
  const centres = [[75.45, 151.43], [277.8, 151.43], [704.95, 151.43]];
  addEventListener('mousemove', e => {
    const r = svg.getBoundingClientRect(), k = r.width / 1058.02;
    dots.forEach((d, i) => {
      const cx = r.left + centres[i][0] * k, cy = r.top + centres[i][1] * k;
      const dist = Math.hypot(e.clientX - cx, e.clientY - cy);
      const on = d.classList.contains('spun');
      if (!on && dist < IN) d.classList.add('spun');
      else if (on && dist > OUT) d.classList.remove('spun');
    });
  }, { passive: true });
}


const embedVisibility = new Map();
const embedPlayers = new Map();
const playerScripts = new Map();
function loadPlayerScript(url) {
  if (!playerScripts.has(url)) playerScripts.set(url, new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = url; script.async = true;
    script.onload = resolve; script.onerror = reject;
    document.head.appendChild(script);
  }));
  return playerScripts.get(url);
}
let youtubeReady;
function youtubeAPI() {
  if (window.YT?.Player) return Promise.resolve();
  if (!youtubeReady) youtubeReady = new Promise((resolve,reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { previous?.(); resolve(); };
    loadPlayerScript('https://www.youtube.com/iframe_api').catch(reject);
  });
  return youtubeReady;
}
function embedActive(frame) {
  const parent = frame.closest('.fr, .bg, .lf');
  return embedVisibility.get(frame) && !document.hidden && !REDUCED && (!parent || parent.classList.contains('on'));
}
function syncEmbeds() {
  embedPlayers.forEach((state, frame) => {
    if (!state.ready) return;
    const play = embedActive(frame) || (state.warming && !document.hidden && !REDUCED);
    if (state.playing === play) return;
    state.playing = play;
    // Serialize seeking and playback so fast slide changes cannot resume an old position.
    state.operation = (state.operation || Promise.resolve()).catch(() => {}).then(async () => {
      if (state.playing !== play) return;
      if (play) {
        if (!state.warming) await state.seekStart();
        if (state.playing) await state.play();
      } else {
        await state.pause();
        await state.seekStart();
      }
    }).catch(() => { state.playing = null; });
  });
}
async function warmEmbed(frame) {
  if (embedPlayers.has(frame)) return;
  const state = {ready:false, playing:null, warming:!REDUCED};
  embedPlayers.set(frame,state);
  const url = new URL(frame.dataset.embedSrc);
  url.searchParams.set('autoplay','0');
  frame.loading = 'eager';
  const markReady = () => {
    if (frame.dataset.mediaReady === 'true') return;
    state.warming = false;
    frame.dataset.mediaReady = 'true';
    frame.dispatchEvent(new Event('mediaready'));
    syncEmbeds();
  };
  try {
    if (url.hostname === 'player.vimeo.com') {
      frame.src = url.href;
      await loadPlayerScript('https://player.vimeo.com/api/player.js');
      const player = new window.Vimeo.Player(frame);
      state.play = () => player.play(); state.pause = () => player.pause();
      state.seekStart = () => player.setCurrentTime(0);
      player.on('timeupdate', markReady);
      player.on('error', () => { state.warming = false; });
      await player.ready(); await player.setVolume(0);
      state.ready = true;
      if (REDUCED) markReady();
      syncEmbeds();
    } else {
      url.searchParams.set('enablejsapi','1');
      if (location.protocol !== 'file:') url.searchParams.set('origin',location.origin);
      frame.src = url.href;
      await youtubeAPI();
      new window.YT.Player(frame, {events:{
        onReady: event => {
          const player = event.target; player.mute();
          state.play = () => player.playVideo(); state.pause = () => player.pauseVideo();
          state.seekStart = () => player.seekTo(0, true);
          state.ready = true;
          if (REDUCED) markReady();
          syncEmbeds();
        },
        onStateChange: event => { if (event.data === 1) markReady(); },
        onError: () => { state.warming = false; }
      }});
    }
  } catch { state.warming = false; }
}
function observeEmbeds() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => embedVisibility.set(e.target,e.isIntersecting)); syncEmbeds();
  }, {threshold:0.01});
  const preload = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { warmEmbed(e.target); preload.unobserve(e.target); } });
  }, {rootMargin:'600px'});
  $$('iframe[data-embed-src]').forEach(frame => {
    embedVisibility.set(frame,false); observer.observe(frame);
    if (frame.closest('.bg')) warmEmbed(frame);
    else preload.observe(frame);
  });
  document.addEventListener('visibilitychange',syncVideos);
}

/* ══ BOOT ═══════════════════════════════════════════════════════ */
settings(); projectPage(); postPage(); hero();
grid(); latest(); postGrid(); postFilters(); contact(); contactForm(); portrait(); clients();
scrub(); filters(); loadMore(); coverVideos(); observeEmbeds();
reveal(); navDot(); navBar(); magnet(); ink(); elementLogo();
})();
