# onuryunisli.com

Static site. No build step, no framework, no dependencies. Open the files, edit, push.

```
.
├── index.html            homepage
├── work.html             all projects
├── assets/
│   ├── css/style.css     every style, one file
│   └── js/main.js        every behaviour, one file
└── data/
    └── content.js        ← projects, posts, hero and shared contact settings
```

---

## Adding work

Open `data/content.js` and add an entry to `projects`:

```js
{ slug:"sirab-identity", client:"SIRAB", initials:"SR", sector:"FMCG & Beverage",
  title:"A mineral identity, poured into every format", year:"2025",
  services:["brand","3d","packaging"], featured:true,
  video:"https://cdn.onuryunisli.com/sirab/cover.mp4",
  poster:"https://cdn.onuryunisli.com/sirab/cover.jpg",
  shots:[
    "https://cdn.onuryunisli.com/sirab/01.jpg",
    "https://cdn.onuryunisli.com/sirab/02.jpg",
    "https://cdn.onuryunisli.com/sirab/03.jpg"
  ]}
```

| field | what it does |
|---|---|
| `slug` | becomes the case-study URL: `work/sirab-identity.html` |
| `featured` | `true` puts it on the homepage too — keep that list to nine |
| `services` | `brand` · `motion` · `3d` · `packaging` · `spatial`, used by the homepage filter |
| `video` | plays by itself on the cover, muted and looping |
| `poster` | the still shown until the video loads, or the cover image when there is no video |
| `shots` | the cursor sweeps through these when it moves across the cover |

Leave `video`, `poster` and `shots` empty and a placeholder is drawn, so nothing breaks while you are still producing the media.

The hero films live in the same file under `disciplines` — one 20-second loop per entry.

---

## Media

Do not commit video to the repository. GitHub is not a CDN and the repo will be unusable within a month.

Put the files on object storage and paste the URL:

**Cloudflare R2** — free egress, which is the whole argument. About $0.015/GB stored. Create a bucket, connect a subdomain like `cdn.onuryunisli.com`, upload, use the public URL.

**Bunny.net Stream** — pay per GB delivered, handles transcoding and gives adaptive playback. Worth it once the hero films are live and traffic grows.

**Cloudinary** — free tier, automatic format conversion. Easiest start, gets expensive later.

Encoding for covers and hero films:

```
ffmpeg -i in.mov -t 20 -an -c:v libx264 -crf 24 -preset slow \
       -vf "scale=1920:-2" -movflags +faststart out.mp4
```

`-an` strips audio — browsers block autoplay with sound, and the files get smaller. Keep each clip under 6 MB.

---

## Running it locally

Double-clicking `index.html` works, because the content is a plain script rather than a fetched JSON file.

For a proper local server:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

---

## Deploying

**GitHub Pages** — push the repo, Settings → Pages → deploy from `main`, root folder. Add a `CNAME` file containing `onuryunisli.com` and point the domain's DNS at GitHub.

**Netlify or Vercel** — connect the repo, leave the build command empty, publish directory `.`. Both give instant rollbacks and preview URLs, which Pages does not.

Either way there is nothing to build.

---

## CMS readiness (local stage)

The current site remains static and works locally without a build step. No CMS,
backend, database, upload integration or authentication has been implemented yet.

- `data/content.js` supplies projects, posts, hero media, portrait, name, email,
  phone, city/country and social links. Shared HTML fallbacks are connected using
  `data-site-text` and `data-site-link` attributes; their styling is unchanged.
- `video` fields explicitly render video, including extensionless Cloudinary
  delivery URLs. Gallery string URLs infer video from `.mp4`, `.webm` or `.mov`,
  including query strings. Use browser-compatible video encodings.
- A project's `poster` also works as a standalone cover. A cover does not replace
  the first gallery image. Array order controls project and gallery order.
- Text from data is escaped before rendering. Link/media schemes are restricted
  to HTTP(S) and relative paths. Future server-side validation is still required.
- `portraitType: "video"` can be added for extensionless portrait video URLs.
- Page copy, service/process rows, metadata, navigation labels and Element content
  still live in HTML. These need structured fields when the CMS model is designed.
- `work/[slug].html` project pages are generated from the shared Work shell.
  Post detail pages and the `#` post links remain for later work.
- Future project detail content needs stable IDs, slugs, ordered content blocks,
  draft/publish status, and media metadata (Cloudinary public ID, resource type,
  delivery URL and alt text). These are not a database schema yet.

GitHub will store source code; Cloudinary will store media. A backend/database
and hosting will be chosen later. Cloudinary API secrets must stay on the server,
never in `content.js` or committed to GitHub. Draft data must not be sent in the
public site's content payload.

## Code checks

With Node.js installed, run `node --test tests/main.test.cjs`.
These are logic/regression tests, not browser layout tests.

## Project detail pages

All 18 existing project links now have detail pages. They use the shared site
navigation/footer and `assets/css/project.css`. Existing page CSS is unchanged.
The layout is visual-first: client/title, project facts, wide cover, flexible
media blocks, optional short overview/credits, and next-project navigation.
Unfilled media slots show design placeholders, not invented project artwork.

Add `detail` to any project in `data/content.js`:

```js
detail: {
  intro: "A short, factual project overview.",
  cover: { src: "https://res.cloudinary.com/YOUR_CLOUD/image/upload/cover.webp", alt: "Describe the cover" },
  coverAspect: "wide",
  blocks: [
    { type: "media", aspect: "wide", asset: { src: "IMAGE_URL", alt: "Description", caption: "Optional caption" } },
    { type: "pair", aspect: "square", assets: [
      { src: "IMAGE_URL_1", alt: "First image" },
      { src: "IMAGE_URL_2", alt: "Second image" }
    ] },
    { type: "media", aspect: "natural", asset: { src: "VIDEO_URL", type: "video", poster: "POSTER_URL", alt: "Project film" } },
    { type: "text", title: "Direction", text: "Optional short text." }
  ],
  credits: "Optional factual credits.",
  description: "Optional search description."
}
```

- Blocks render in array order. Media aspects: `wide`, `square`, `portrait`,
  `natural` (original proportions). Paired blocks stack on mobile.
- Detail videos use playback controls; they are separate from muted cover loops.
- Without `detail.cover`, the page uses the existing project's `video`/`poster`.
- Without `detail.blocks`, existing `shots` render; if there are no shots, the
  shared `projectLayout.blocks` supplies the design placeholders. Use `blocks: []`
  to deliberately omit all additional blocks. Empty overview/credits are hidden.
- Run `node scripts/generate-project-pages.cjs` after adding a project slug or
  updating shared navigation/footer markup. It regenerates the files in `work/`
  from `work.html`; do not manually edit those generated files. It never deletes
  removed slugs automatically. Review those separately if projects are removed.
- Titles and descriptions have static fallbacks; rerun the generator after
  changing these fields to refresh the initial HTML metadata as well.
- All paths are relative, so `work/sirab-identity.html` opens locally with no server.

This is the local design/content layer, not a CMS or publishing backend. No
project claims, results or actual media have been fabricated.
