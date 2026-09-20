/* Shared by the public project page and local visual editor. */
(function (root) {
  'use strict';
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const color = (v, fallback) => /^#[\da-f]{6}$/i.test(v || '') ? v : fallback;
  const number = (v, min, max, fallback) => Number.isFinite(+v) ? Math.min(max, Math.max(min, +v)) : fallback;
  function assetURL(value, base = '/') {
    const src = String(value || '').trim();
    if (!src || /[\u0000-\u0020\u007f\\]/.test(src) || /^(?!https?:)[a-z][a-z\d+.-]*:/i.test(src)) return '';
    if (/^(https?:)?\/\//i.test(src) || src[0] === '/') return src;
    return base + src.replace(/^\.\//, '');
  }
  function embed(input, options = {}) {
    const raw = String(input || '').trim().replace(/&amp;/g, '&');
    let src = raw;
    /* only a plain pixel count counts; width="100%" tells us nothing */
    const width = Number(raw.match(/\bwidth\s*=\s*["']\s*(\d+)\s*["']/i)?.[1]);
    const height = Number(raw.match(/\bheight\s*=\s*["']\s*(\d+)\s*["']/i)?.[1]);
    if (src.startsWith('<')) src = src.match(/\bsrc\s*=\s*["']([^"']+)["']/i)?.[1] || '';
    src = src.replace(/^\[([^\]]+)\]\([^)]*\)$/, '$1').replace(/\\&/g, '&').replace(/title=0byline=0/g, 'title=0&byline=0');
    let url; try { url = new URL(src); } catch { return null; }
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    const query = url.searchParams;
    const flag = (key, fallback=false) => query.has(key) ? ['1','true'].includes(query.get(key)) : fallback;
    const background = options.background ?? flag('background');
    const autoplay = options.autoplay ?? flag('autoplay', background);
    const loop = options.loop ?? flag('loop', background);
    const muted = options.muted ?? flag(host.includes('vimeo') ? 'muted' : 'mute', background || autoplay);
    const controls = options.controls ?? flag('controls', !background);
    /* Knight Lab Juxtapose — the before/after slider. It is interactive,
       not a video, so none of the playback flags apply to it. */
    if (host === 'cdn.knightlab.com' && /\/juxtapose\//i.test(url.pathname)) {
      const uid = query.get('uid');
      if (!/^[\w-]{6,64}$/.test(uid || '')) return null;
      const slider = new URL('https://cdn.knightlab.com/libs/juxtapose/latest/embed/index.html');
      slider.searchParams.set('uid', uid);
      return {src: slider.href, provider: 'Juxtapose', id: uid, interactive: true,
              background: false, autoplay: false, loop: false, muted: true, controls: true,
              ratio: width > 0 && height > 0 ? width / height : 16 / 9};
    }
    let id, target;
    if (['vimeo.com', 'player.vimeo.com'].includes(host)) {
      const parts = url.pathname.split('/').filter(Boolean);
      id = host === 'player.vimeo.com' && parts[0] === 'video' ? parts[1] : parts[0];
      if (!/^\d+$/.test(id || '')) return null;
      target = new URL('https://player.vimeo.com/video/' + id);
      const hash = query.get('h') || (host === 'vimeo.com' ? parts[1] : '');
      if (hash && /^[a-z\d]+$/i.test(hash)) target.searchParams.set('h', hash);
      for (const key of ['title','byline','portrait','badge','autopause','dnt','quality','speed','pip','sidedock']) {
        if (query.has(key)) target.searchParams.set(key, query.get(key));
      }
      target.searchParams.set('background', background ? '1' : '0');
      target.searchParams.set('controls', controls ? '1' : '0');
      if (background) for (const key of ['title','byline','portrait','badge','sidedock']) target.searchParams.set(key,'0');
    } else if (['youtube.com', 'm.youtube.com', 'youtu.be', 'youtube-nocookie.com'].includes(host)) {
      id = host === 'youtu.be' ? url.pathname.split('/')[1] : query.get('v') || url.pathname.match(/^\/(?:embed|shorts)\/([\w-]+)/)?.[1];
      if (!/^[\w-]{11}$/.test(id || '')) return null;
      target = new URL('https://www.youtube-nocookie.com/embed/' + id);
      target.searchParams.set('rel', '0'); target.searchParams.set('playsinline', '1');
      if (loop) target.searchParams.set('playlist', id);
      target.searchParams.set('controls', controls ? '1' : '0');
      for (const key of ['start','end']) if (/^\d+$/.test(query.get(key) || '')) target.searchParams.set(key,query.get(key));
    } else return null;
    target.searchParams.set('autoplay', autoplay ? '1' : '0');
    target.searchParams.set('loop', loop ? '1' : '0');
    target.searchParams.set(host.includes('vimeo') ? 'muted' : 'mute', muted ? '1' : '0');
    return {src:target.href, provider:host.includes('vimeo')?'Vimeo':'YouTube', id, background, autoplay, loop, muted, controls, ratio:width>0 && height>0 ? width/height : 16/9};
  }
  function iframe(input, options = {}) {
    const parsed = embed(input, options);
    if (!parsed) return '<div class="pc-empty">Vimeo, YouTube və ya Juxtapose linki əlavə edin</div>';
    const source = options.defer ? `data-embed-src="${esc(parsed.src)}"` : `src="${esc(parsed.src)}"`;
    const ar = parsed.ratio > 0 ? ` style="--ar:${(Math.round(parsed.ratio * 10000) / 10000)}"` : '';
    return `<iframe ${source}${ar} title="${esc(options.title || parsed.provider + ' video')}" loading="${parsed.autoplay?'eager':'lazy'}" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`;
  }
  /* Behance'dən gələn şəkillər tam ölçülü PNG olur — bir səhifədə 26 dənəsi
     telefonun yaddaşını doldurur. Cloudinary URL-inə f_auto,q_auto və en
     əlavə edirik: heç nə yenidən yüklənmir, sadəcə çatdırılma dəyişir. */
  const CLOUD_IMG = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(v\d+\/.+)$/i;
  const IMG_WIDTHS = [640, 960, 1280, 1600, 2000];
  function sized(src) {
    const raw = String(src || '');
    const parts = raw.match(CLOUD_IMG);
    if (!parts || /\.(gif|svg)(?:[?#]|$)/i.test(raw)) return null;
    const at = w => parts[1] + 'f_auto,q_auto,w_' + w + '/' + parts[2];
    return {src: at(1600), srcset: IMG_WIDTHS.map(w => at(w) + ' ' + w + 'w').join(', ')};
  }
  function imgTag(src, alt) {
    const fit = sized(src);
    return fit
      ? `<img src="${esc(fit.src)}" srcset="${esc(fit.srcset)}" sizes="(max-width:1500px) 100vw, 1400px" alt="${esc(alt || '')}" loading="lazy" decoding="async">`
      : `<img src="${esc(src)}" alt="${esc(alt || '')}" loading="lazy" decoding="async">`;
  }
  /* An animated gif on Cloudinary is delivered as a looping muted video:
     it always loops (some gifs carry no loop flag and stop after one pass)
     and the file is a fraction of the size. */
  const CLOUD_GIF = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.+)\.gif(?:[?#].*)?$/i;
  function gifVideo(src) {
    const parts = String(src || '').match(CLOUD_GIF);
    if (!parts) return null;
    return {webm: parts[1] + parts[2] + '.webm', mp4: parts[1] + parts[2] + '.mp4'};
  }
  function gifMarkup(src, alt) {
    const clip = gifVideo(src);
    if (!clip) return '';
    return `<video data-gif="1" autoplay muted loop playsinline preload="auto" aria-label="${esc(alt || '')}">`
      + `<source src="${esc(clip.webm)}" type="video/webm">`
      + `<source src="${esc(clip.mp4)}" type="video/mp4">`
      + `<img src="${esc(src)}" alt="${esc(alt || '')}" loading="lazy"></video>`;
  }
  /* A <video> written through innerHTML often ignores its own autoplay
     attribute: the browser checks the muted state before the markup is
     live. Setting it from script and calling play() starts them for good,
     both on the site and inside the CMS canvas. */
  function startClips(scope) {
    const root = scope && scope.querySelectorAll ? scope : (typeof document !== 'undefined' ? document : null);
    if (!root) return;
    root.querySelectorAll('video[data-gif]').forEach(clip => {
      if (clip.dataset.rolling) return;
      clip.dataset.rolling = '1';
      clip.muted = true;
      clip.loop = true;
      clip.playsInline = true;
      const go = () => {
        if (clip.dataset.offscreen === '1' || document.hidden) return;
        const run = clip.play(); if (run && run.catch) run.catch(() => {});
      };
      /* a page can hold a dozen clips; only the ones in view may run,
         otherwise a phone runs out of decoders and the tab is dropped */
      if (typeof IntersectionObserver !== 'undefined') {
        new IntersectionObserver(entries => {
          entries.forEach(entry => {
            clip.dataset.offscreen = entry.isIntersecting ? '0' : '1';
            if (entry.isIntersecting) go(); else clip.pause();
          });
        }, {rootMargin: '150px'}).observe(clip);
      }
      if (clip.readyState >= 2) go();
      else clip.addEventListener('loadeddata', go, {once:true});
      clip.addEventListener('pause', () => {
        if (!clip.ended && !document.hidden && clip.dataset.offscreen !== '1') go();
      });
    });
  }
  if (typeof document !== 'undefined' && typeof MutationObserver !== 'undefined') {
    let queued = false;
    const sweep = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => { queued = false; startClips(); });
    };
    document.addEventListener('DOMContentLoaded', sweep);
    document.addEventListener('visibilitychange', sweep);
    new MutationObserver(sweep).observe(document.documentElement, {childList:true, subtree:true});
    sweep();
  }

  function figure(asset = {}, options = {}) {
    const src = assetURL(asset.src, options.base), poster = assetURL(asset.poster, options.base);
    const video = asset.type === 'video' || /\.(mp4|webm|mov)(?:[?#]|$)/i.test(src);
    const clip = gifMarkup(src, asset.alt);
    const visual = !src ? '<div class="pc-empty">Şəkil və ya video əlavə edin</div>' : clip ? clip : embed(src) ? `<div class="pc-film">${iframe(src, {title:asset.alt})}</div>` : video
      ? `<video src="${esc(src)}" ${poster ? `poster="${esc(poster)}"` : ''} controls playsinline preload="metadata"></video>`
      : imgTag(src, asset.alt);
    return `<figure>${visual}${asset.caption ? `<figcaption>${esc(asset.caption)}</figcaption>` : ''}</figure>`;
  }
  function block(b, options = {}) {
    const padding = number(b.padding ?? 0, 0, 160, 0);
    let body = '';
    if (b.type === 'text') body = `<div class="pc-text" style="text-align:${['left','center','right'].includes(b.align) ? b.align : 'left'}">${b.title ? `<h2>${esc(b.title)}</h2>` : ''}${String(b.text || '').split(/\n\s*\n/).filter(Boolean).map(p=>`<p>${esc(p).replace(/\n/g,'<br>')}</p>`).join('') || (!b.title ? '<p>Mətn əlavə edin…</p>' : '')}</div>`;
    else if (b.type === 'embed') {
      const parsed = embed(b.src);
      const config = b.embedCustom ? {background:b.backgroundVideo,autoplay:b.autoplay,muted:b.muted,loop:b.loop,controls:b.controls} : {};
      const ratio = b.embedCustom ? b.ratio : parsed?.ratio;
      body = `<div class="pc-film" style="aspect-ratio:${number(ratio ?? 16/9,.1,10,16/9)}">${iframe(b.src,{...config,title:b.title})}</div>${b.caption ? `<figcaption>${esc(b.caption)}</figcaption>` : ''}`;
    }
    else if (b.type === 'grid' || b.type === 'pair') {
      /* a justified row: every image keeps its own ratio, the row shares one
         height, and the split between them shifts left or right to match */
      const cols = number(b.columns || 2, 1, 4, 2);
      const gap = number(b.gap ?? 0, 0, 80, 0);
      const assets = b.assets || [];
      const rows = [];
      for (let i = 0; i < assets.length; i += cols) rows.push(assets.slice(i, i + cols));
      body = `<div class="pc-grid" style="--columns:${cols};gap:${gap}px">${
        rows.map(row =>
          `<div class="pc-row" style="gap:${gap}px">${row.map(a=>figure(a,options)).join('')}</div>`
        ).join('') || '<div class="pc-empty">Qalereyaya şəkillər əlavə edin</div>'}</div>`;
    }
    else if (b.type === 'media') body = figure(b.asset, options);
    return `<section class="pc-block" style="padding:${padding}px;background:${color(b.background, 'transparent')}">${body}</section>`;
  }
  function render(detail, options = {}) {
    return `<div class="project-stream" style="--pc-gap:${number(detail.spacing ?? 0,0,120,0)}px;--pc-bg:${color(detail.background, '#ffffff')};--pc-ink:${color(detail.color, '#161616')};--pc-width:${number(detail.width ?? 1400,600,1920,1400)}px">${(detail.blocks || []).map(b=>block(b,options)).join('')}</div>`;
  }
  root.ProjectContent = {esc, assetURL, embed, iframe, figure, block, render, gifVideo, startClips, sized};
})(typeof window !== 'undefined' ? window : globalThis);
