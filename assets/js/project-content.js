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
    const width = Number(raw.match(/\bwidth\s*=\s*["']\s*(\d+)/i)?.[1]);
    const height = Number(raw.match(/\bheight\s*=\s*["']\s*(\d+)/i)?.[1]);
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
    if (!parsed) return '<div class="pc-empty">Vimeo və ya YouTube linki əlavə edin</div>';
    const source = options.defer ? `data-embed-src="${esc(parsed.src)}"` : `src="${esc(parsed.src)}"`;
    const ar = parsed.ratio > 0 ? ` style="--ar:${(Math.round(parsed.ratio * 10000) / 10000)}"` : '';
    return `<iframe ${source}${ar} title="${esc(options.title || parsed.provider + ' video')}" loading="${parsed.autoplay?'eager':'lazy'}" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`;
  }
  function figure(asset = {}, options = {}) {
    const src = assetURL(asset.src, options.base), poster = assetURL(asset.poster, options.base);
    const video = asset.type === 'video' || /\.(mp4|webm|mov)(?:[?#]|$)/i.test(src);
    const visual = !src ? '<div class="pc-empty">Şəkil və ya video əlavə edin</div>' : embed(src) ? `<div class="pc-film">${iframe(src, {title:asset.alt})}</div>` : video
      ? `<video src="${esc(src)}" ${poster ? `poster="${esc(poster)}"` : ''} controls playsinline preload="metadata"></video>`
      : `<img src="${esc(src)}" alt="${esc(asset.alt)}" loading="lazy">`;
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
    else if (b.type === 'grid' || b.type === 'pair') body = `<div class="pc-grid" style="--columns:${number(b.columns || 2,1,4,2)};gap:${number(b.gap ?? 0,0,80,0)}px">${(b.assets || []).map(a=>figure(a,options)).join('') || '<div class="pc-empty">Qalereyaya şəkillər əlavə edin</div>'}</div>`;
    else if (b.type === 'media') body = figure(b.asset, options);
    return `<section class="pc-block" style="padding:${padding}px;background:${color(b.background, 'transparent')}">${body}</section>`;
  }
  function render(detail, options = {}) {
    return `<div class="project-stream" style="--pc-gap:${number(detail.spacing ?? 0,0,120,0)}px;--pc-bg:${color(detail.background, '#ffffff')};--pc-ink:${color(detail.color, '#161616')};--pc-width:${number(detail.width ?? 1400,600,1920,1400)}px">${(detail.blocks || []).map(b=>block(b,options)).join('')}</div>`;
  }
  root.ProjectContent = {esc, assetURL, embed, iframe, figure, block, render};
})(typeof window !== 'undefined' ? window : globalThis);
