# Mami’s Interior — South Indian homes & interiors

A frontend-first portfolio website for a **fictional Chennai architecture and interior design studio**. It has
editorial pages, real filtering and galleries, before/after sliders, a material library with live 3D previews, and an
interactive **Three.js walkthrough of a Chettinad-style courtyard house built entirely in Blender**. The copy is
seasoned with original Tamil-cinema-style punch dialogues in Tanglish, each with an English subtitle.

> Everything is sample content: the studio, team, projects, testimonials and recognition are fictional. Contact
> details use a reserved `.example` email and a 555 test number. Forms run in an honest **demo mode** (see below).

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server with hot reload |
| `npm run build` | Writes `public/sitemap.xml` + `robots.txt`, type-checks, builds to `dist/` |
| `npm run preview` | Serves the production build |
| `npm run typecheck` | `tsc -b` |
| `npm run lint` | oxlint |
| `npm run blender:build` | Rebuilds all textures, the GLB, renders and drawings (needs `blender` on PATH) |
| `npm run blender:model` | Rebuilds only textures, `.blend` and GLB (~20 s) |

### Environment variables (all optional, see `.env.example`)

| Variable | Purpose |
| --- | --- |
| `VITE_SITE_URL` | Canonical URL for SEO tags, sitemap and robots.txt (default `https://mamisinterior.example`) |
| `VITE_FORMS_ENDPOINT` | Base URL of a forms API. When set, forms POST multipart data to `/consultations`, `/contact` and `/newsletter`. When empty, forms stay in demo mode. |

No secrets are needed or stored in the frontend.

## What's in it

**Pages** (React Router, every route deep-linkable): `/`, `/projects`, `/projects/:slug`, `/studio`, `/services`,
`/experience`, `/transformations`, `/materials`, `/journal`, `/journal/:slug`, `/recognition`, `/consultation`,
`/contact`, plus a 404.

* **Home**: a live 3D hero of the courtyard house at dusk (lazy-loaded after first paint, with a static render first;
  pause-motion button), featured projects, a service preview with image swap, a GSAP pinned horizontal process
  scroll (*Pesuvom → Varaivom → Thittamiduvom → Kattuvom → Graha Pravesam*), recognition, a Tanglish testimonial
  carousel, journal previews and a consultation call to action.
* **Projects**: category, location, year and type filters synced to the URL, with an animated asymmetric grid, a
  live count and an empty state.
* **Project detail**: cover, concept, narrative, specs, image sequence with a fullscreen lightbox
  (keyboard and swipe), plans and elevations rendered from the model, materials, before/after, and an embedded 3D viewer
  for Mutram Veedu. It ends with previous/next and related projects.
* **3D Experience**: three Blender models you can switch between (`/experience?model=flat|office`): a **modern
  two-storey villa** (jali screen, teak-clad upper floor, pool, coconut palms), a cutaway **modern 2BHK flat** and a
  cutaway **modern open-plan office**. Each has orbit, zoom and pan limits, 5-7 hotspots with camera fly-to,
  Daylight/Dusk/Studio lighting, a section view (lifts the upper floor or the ceiling), fullscreen, keyboard controls
  and DOM toolbar buttons for every gesture, plus loading, error and no-WebGL fallbacks. The courtyard house
  (Mutram Veedu) is still embedded on its own project page.
* **Materials**: 27 materials, including Athangudi tiles, red oxide, teak, black granite, Mangalore tiles, brass,
  cane, silk and lime. Each has a category filter, swatch, description and care notes, plus a 3D preview on a sphere,
  block or room corner using the same procedural PBR textures as the renders. Four sample palettes complete the page.
* **Transformations**: three draggable, keyboard-accessible before/after sliders with category filters.
* **Journal**: a featured essay, search across the full text, category filters, article pages with reading progress,
  share links (LinkedIn, X, Pinterest, email, copy link), related reading and a newsletter form.
* **Studio, Services (10), Recognition, Consultation (5-step form), Contact**.

**Cross-cutting**: page transitions (Framer Motion), scroll reveals, parallax, a custom desktop cursor,
`prefers-reduced-motion` support everywhere, a reading-progress bar, a skip link, visible focus, accessible dialogs,
labelled form errors, breadcrumbs, page titles and descriptions, canonical URLs, Open Graph tags, JSON-LD
(`ProfessionalService`, `Article`), a sitemap and robots.txt. Images are responsive WebP (`srcset` with half-width
variants), pages are code-split, and the 3D stack (three.js, fiber and drei, ~356 KB gzipped) loads only on pages that
need it.

## Tamil dialogues

All punch lines live in **`src/data/dialogues.json`**. Each has `ta` (Tanglish), an optional `script` (Tamil script)
and `en` (the subtitle). They're rendered by `<Dialogue id="…" />` and marked `lang="ta-Latn"` for screen readers. The
lines are **original** and written for this site, not quotes from films, so they're safe to use commercially. Edit or
replace them freely.

## Brand and contact config

`src/config/site.ts` holds the studio name, wordmark, tagline, email, phone, hours, optional real address, optional map
embed URL, social links (shown only when set) and the forms endpoint. Change them there.

## Data and the path to a backend

Content lives in `src/data/*.json` and is read **only** through `src/services/content.ts`: async functions such as
`getProjects()`, `getProject(slug)` and `searchArticles()`. To move to a CMS or REST API, replace those functions'
bodies with `fetch()` calls that return the same types in `src/types/content.ts`. The UI needs no changes.

Form submissions go through `src/services/submissions.ts`.

### Demo vs production

| Feature | Status in this build | What production needs |
| --- | --- | --- |
| Consultation, contact and newsletter forms | **Demo**: validated in the browser (Zod and react-hook-form, honeypot field, file type and size checks), then discarded. The UI says nothing was sent, and consultations are described as requests, never confirmed bookings. | A backend at `VITE_FORMS_ENDPOINT` that validates server-side, rate-limits, stores data (e.g. MongoDB), handles uploads securely, and sends email. |
| Appointment times | Preferences only | A calendar integration if real availability is required |
| Content | Local JSON | Optional CMS or API behind `content.ts` |
| Map, social links, address | Hidden until configured | Real values in `site.ts` |
| Awards, press, testimonials | Clearly labelled sample content | Real, verifiable entries |

## Blender → Three.js workflow

See **[blender/README.md](blender/README.md)**. In short, `blender/scripts/generate_scenes.py` builds:

* procedural textures (Athangudi, kolam floor, roof tiles…)
* the courtyard house, exported as Draco GLB to `public/models/mutram-veedu.glb`
* the modern villa, flat and office (`blender/scripts/modern_scenes.py`), exported to `public/models/modern-*.glb`
* four interior studies, 34 EEVEE renders including before/after pairs, and Workbench plan and elevation drawings
* the source file `blender/scenes/atelier-noir.blend`

Named empties become the viewer's hotspots. The Draco decoder is self-hosted in `public/draco/`.

## Project structure

```
├── blender/            scripts/generate_scenes.py · scripts/modern_scenes.py · scenes/atelier-noir.blend · README.md
├── public/
│   ├── models/         modern-villa.glb · modern-flat.glb · modern-office.glb · mutram-veedu.glb
│   ├── textures/       procedural PBR maps (also used by the material previews)
│   ├── images/         renders/ and drawings/ (WebP + -sm variants)
│   ├── env/            CC0 HDRIs (Poly Haven, via Blender)
│   └── draco/          Draco decoder
├── scripts/            generate-sitemap.mjs
└── src/
    ├── components/     layout · navigation · ui · forms · galleries · projects · three · animations
    ├── pages/          one file per route
    ├── data/           projects, services, articles, materials, studio, hotspots, hotspots-modern, dialogues (JSON)
    ├── services/       content.ts (data access) · submissions.ts (forms)
    ├── config/         site.ts (brand)
    ├── hooks/ types/ utils/
```

Deploying as a single-page app needs a fallback to `index.html` for deep links. `public/_redirects` (Netlify) and
`vercel.json` are included.

## Credits

* HDR environments: Blender's bundled studio lights, CC0 from Poly Haven (`public/env/LICENSE-polyhaven-cc0.txt`).
* Fonts: Instrument Serif and Inter (SIL OFL), self-hosted via Fontsource.
* All geometry, textures and images were generated for this project by the Blender script.

## Known limitations

* The 3D assets are stylised procedural models: clean rather than photoreal, with simplified trees, and no people or
  vehicles. Real-time lighting is simpler than the offline renders.
* Text is in English with Tanglish dialogue lines; there is no full Tamil-language version yet.
* The three.js chunk is about 1.3 MB minified (356 KB gzipped), but it's fetched only on 3D pages.
* No backend, database, authentication or admin panel in this frontend-first build (see the table above).
