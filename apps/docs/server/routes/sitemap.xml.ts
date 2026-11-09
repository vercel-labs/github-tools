import { queryCollection } from '@nuxt/content/server'

/**
 * Replaces Docus's sitemap, which only lists content pages, so the landing page and the
 * `/docs` home (both Vue pages) are listed too.
 */
const APP_PAGES = ['/', '/docs']

export default defineEventHandler(async (event) => {
  const siteUrl = getSiteConfig(event).url?.replace(/\/$/, '') ?? ''
  const pages = await queryCollection(event, 'docs').select('path', 'meta').all()

  const urls = [
    ...APP_PAGES.map(loc => ({ loc, lastmod: undefined })),
    ...pages
      .filter(page => !page.path.endsWith('/.navigation') && (page.meta as { sitemap?: boolean }).sitemap !== false)
      .map(page => ({ loc: page.path, lastmod: (page.meta as { modifiedAt?: string }).modifiedAt?.split('T')[0] }))
  ]

  const entries = urls.map(({ loc, lastmod }) => [
    '  <url>',
    `    <loc>${escapeXml(`${siteUrl}${loc}`)}</loc>`,
    ...(lastmod ? [`    <lastmod>${escapeXml(lastmod)}</lastmod>`] : []),
    '  </url>'
  ].join('\n'))

  setResponseHeader(event, 'content-type', 'application/xml')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>`
})

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
