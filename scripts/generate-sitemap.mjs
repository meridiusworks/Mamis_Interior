// Writes public/sitemap.xml from the route list and local content data.
// Runs automatically before `npm run build`; set VITE_SITE_URL for the real domain.
import { readFileSync, writeFileSync } from 'node:fs'

const root = new URL('../', import.meta.url)
const site = (process.env.VITE_SITE_URL || 'https://mamisinterior.example').replace(/\/$/, '')
const read = (p) => JSON.parse(readFileSync(new URL(p, root), 'utf8'))

const staticRoutes = [
  '/', '/projects', '/studio', '/services', '/experience', '/transformations',
  '/materials', '/journal', '/recognition', '/consultation', '/contact',
]
const projects = read('src/data/projects.json').map((p) => `/projects/${p.slug}`)
const articles = read('src/data/articles.json').map((a) => ({ path: `/journal/${a.slug}`, lastmod: a.date }))

const urls = [
  ...staticRoutes.map((path) => ({ path })),
  ...projects.map((path) => ({ path })),
  ...articles,
]

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(({ path, lastmod }) => `  <url><loc>${site}${path === '/' ? '/' : path}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`)
  .join('\n')}
</urlset>
`
writeFileSync(new URL('public/sitemap.xml', root), xml)
writeFileSync(
  new URL('public/robots.txt', root),
  `User-agent: *\nAllow: /\n\nSitemap: ${site}/sitemap.xml\n`,
)
console.log(`sitemap.xml: ${urls.length} URLs for ${site}`)
