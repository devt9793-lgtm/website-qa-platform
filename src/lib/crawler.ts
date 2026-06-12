import * as cheerio from 'cheerio'
import type { PageCrawlResult, ImageData, LinkData, CrawlSummary } from '@/types'

const DEV_URL_PATTERNS = [
  /localhost/i, /127\.0\.0\.1/, /192\.168\.\d+\.\d+/,
  /dev\./i, /staging\./i, /test\./i, /uat\./i, /qa\./i,
  /\.development\./i, /\.local$/i, /ngrok\.io/i, /\.ngrok-free\.app/i,
]

export function isDevUrl(url: string): boolean {
  return DEV_URL_PATTERNS.some((p) => p.test(url))
}

export function normalizeUrl(url: string, baseUrl: string): string | null {
  try {
    if (url.startsWith('mailto:') || url.startsWith('tel:') || url.startsWith('javascript:')) return null
    const base = new URL(baseUrl)
    const resolved = new URL(url, base)
    if (resolved.hostname !== base.hostname) return null
    resolved.hash = ''
    return resolved.href.replace(/\/$/, '') || resolved.href
  } catch { return null }
}

async function fetchText(url: string, timeoutMs = 5000): Promise<{ text: string; status: number; loadTimeMs: number } | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  const start = Date.now()
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'WebsiteQA-Bot/1.0 (+https://websiteqa.app/bot)',
        Accept: 'text/html,application/xhtml+xml,application/xml,*/*',
      },
      redirect: 'follow',
    })
    clearTimeout(timer)
    const text = await res.text()
    return { text, status: res.status, loadTimeMs: Date.now() - start }
  } catch {
    clearTimeout(timer)
    return null
  }
}

// ─── Sitemap parser ────────────────────────────────────────────────────────
export async function fetchSitemapUrls(baseUrl: string): Promise<string[]> {
  const urls: string[] = []
  const sitemapUrls = [
    `${baseUrl}/sitemap.xml`,
    `${baseUrl}/sitemap_index.xml`,
    `${baseUrl}/sitemap/sitemap.xml`,
  ]

  for (const sitemapUrl of sitemapUrls) {
    const res = await fetchText(sitemapUrl)
    if (!res || res.status !== 200) continue

    // Parse sitemap index (links to other sitemaps)
    const indexMatches = res.text.match(/<loc>(.*?)<\/loc>/g) || []
    for (const match of indexMatches) {
      const url = match.replace(/<\/?loc>/g, '').trim()
      if (url.endsWith('.xml')) {
        // Fetch child sitemap
        const childRes = await fetchText(url)
        if (childRes && childRes.status === 200) {
          const childMatches = childRes.text.match(/<loc>(.*?)<\/loc>/g) || []
          for (const cm of childMatches) {
            const childUrl = cm.replace(/<\/?loc>/g, '').trim()
            if (!childUrl.endsWith('.xml')) urls.push(childUrl)
          }
        }
      } else {
        urls.push(url)
      }
    }
    if (urls.length > 0) break
  }

  return [...new Set(urls)]
}

// ─── Robots.txt parser ─────────────────────────────────────────────────────
export async function fetchRobotsTxt(baseUrl: string): Promise<{
  exists: boolean
  allowsIndexing: boolean
  hasSitemapRef: boolean
  disallowedPaths: string[]
  raw: string
}> {
  const res = await fetchText(`${baseUrl}/robots.txt`)
  if (!res || res.status !== 200) {
    return { exists: false, allowsIndexing: true, hasSitemapRef: false, disallowedPaths: [], raw: '' }
  }

  const lines = res.text.split('\n').map(l => l.trim())
  const disallowedPaths: string[] = []
  let inUserAgentAll = false
  let allowsIndexing = true
  let hasSitemapRef = false

  for (const line of lines) {
    if (line.toLowerCase().startsWith('user-agent: *')) inUserAgentAll = true
    if (line.toLowerCase().startsWith('user-agent:') && !line.includes('*')) inUserAgentAll = false
    if (inUserAgentAll && line.toLowerCase().startsWith('disallow:')) {
      const path = line.split(':')[1]?.trim()
      if (path === '/') allowsIndexing = false
      if (path) disallowedPaths.push(path)
    }
    if (line.toLowerCase().startsWith('sitemap:')) hasSitemapRef = true
  }

  return { exists: true, allowsIndexing, hasSitemapRef, disallowedPaths, raw: res.text.slice(0, 2000) }
}

// ─── GA4 detector ──────────────────────────────────────────────────────────
function detectAnalytics(html: string): {
  hasGA4: boolean
  hasGTM: boolean
  hasUA: boolean
  trackingIds: string[]
} {
  const trackingIds: string[] = []
  const hasGA4 = /G-[A-Z0-9]+/.test(html)
  const hasGTM = /GTM-[A-Z0-9]+/.test(html) || /googletagmanager\.com\/gtm\.js/.test(html)
  const hasUA  = /UA-\d+-\d+/.test(html)

  const ga4Matches  = html.match(/G-[A-Z0-9]+/g)  || []
  const gtmMatches  = html.match(/GTM-[A-Z0-9]+/g) || []
  const uaMatches   = html.match(/UA-\d+-\d+/g)    || []

  trackingIds.push(...new Set([...ga4Matches, ...gtmMatches, ...uaMatches]))

  return { hasGA4, hasGTM, hasUA, trackingIds }
}

export async function crawlPage(url: string): Promise<PageCrawlResult & {
  hasGA4?: boolean; hasGTM?: boolean; hasUA?: boolean; trackingIds?: string[]
}> {
  const fetched = await fetchText(url)

  if (!fetched || fetched.status >= 400) {
    return {
      url, statusCode: fetched?.status ?? 0,
      h1Tags: [], h2Tags: [], images: [], links: [],
      hasCanonical: false, isIndexable: false,
      hasSSL: url.startsWith('https://'),
      pageText: '', rawHtml: '',
    }
  }

  const $ = cheerio.load(fetched.text)
  const base = new URL(url)

  const images: ImageData[] = []
  $('img').each((_, el) => {
    const src = $(el).attr('src') || ''
    const alt = $(el).attr('alt')
    images.push({
      src: src ? (() => { try { return new URL(src, url).href } catch { return src } })() : '',
      alt,
      width: parseInt($(el).attr('width') || '0') || undefined,
      height: parseInt($(el).attr('height') || '0') || undefined,
    })
  })

  const links: LinkData[] = []
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') || ''
    const text = $(el).text().trim()
    try {
      const resolved = new URL(href, url)
      links.push({ href: resolved.href, text, isInternal: resolved.hostname === base.hostname })
    } catch {
      links.push({ href, text, isInternal: false })
    }
  })

  const robotsMeta = $('meta[name="robots"]').attr('content') || ''
  const canonicalHref = $('link[rel="canonical"]').attr('href')
  const analytics = detectAnalytics(fetched.text)

  $('script, style, noscript').remove()
  const pageText = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 5000)

  return {
    url, statusCode: fetched.status,
    title: $('title').text().trim() || undefined,
    metaDescription: $('meta[name="description"]').attr('content') || undefined,
    h1Tags: $('h1').map((_, el) => $(el).text().trim()).get(),
    h2Tags: $('h2').map((_, el) => $(el).text().trim()).get(),
    images, links,
    hasCanonical: !!canonicalHref, canonicalUrl: canonicalHref,
    isIndexable: !robotsMeta.includes('noindex'),
    loadTimeMs: fetched.loadTimeMs,
    contentLength: fetched.text.length,
    hasSSL: url.startsWith('https://'),
    pageText,
    rawHtml: fetched.text.slice(0, 20000),
    ...analytics,
  }
}

export async function crawlWebsite(
  startUrl: string,
  maxPages = 10,
  onProgress?: (crawled: number, total: number, currentUrl: string) => void
): Promise<CrawlSummary & {
  robotsTxt: Awaited<ReturnType<typeof fetchRobotsTxt>>
  sitemapUrls: string[]
  hasGA4: boolean
  hasGTM: boolean
  analyticsIds: string[]
}> {
  if (!startUrl || startUrl === 'undefined') throw new Error(`Invalid URL: ${startUrl}`)
  if (!startUrl.startsWith('http')) startUrl = `https://${startUrl}`

  const base = new URL(startUrl)
  const baseUrl = `${base.protocol}//${base.hostname}`

  // Fetch robots.txt and sitemap in parallel
  const [robotsTxt, sitemapUrls] = await Promise.all([
    fetchRobotsTxt(baseUrl),
    fetchSitemapUrls(baseUrl),
  ])

  // Seed queue: homepage first, then sitemap URLs
  const visited = new Set<string>()
  const normalizedStart = startUrl.replace(/\/$/, '') || startUrl
  const queue: string[] = [normalizedStart]

  // Add sitemap URLs to queue (up to maxPages * 3 candidates)
  for (const u of sitemapUrls.slice(0, maxPages * 3)) {
    const n = normalizeUrl(u, baseUrl)
    if (n && !queue.includes(n)) queue.push(n)
  }

  const results: PageCrawlResult[] = []
  const brokenPages: number[] = []
  const devUrlsFound: string[] = []
  let hasGA4 = false
  let hasGTM = false
  const analyticsIds: string[] = []

  while (queue.length > 0 && visited.size < maxPages) {
    const url = queue.shift()!
    if (visited.has(url)) continue
    visited.add(url)

    onProgress?.(visited.size, Math.max(queue.length + visited.size, visited.size), url)

    const page = await crawlPage(url) as any
    results.push(page)

    if (page.hasGA4) hasGA4 = true
    if (page.hasGTM) hasGTM = true
    if (page.trackingIds) {
      for (const id of page.trackingIds) {
        if (!analyticsIds.includes(id)) analyticsIds.push(id)
      }
    }

    if (page.statusCode >= 400 || page.statusCode === 0) brokenPages.push(page.statusCode)

    const allUrls = [...page.images.map((i: any) => i.src), ...page.links.map((l: any) => l.href)]
    for (const u of allUrls) {
      if (isDevUrl(u) && !devUrlsFound.includes(u)) devUrlsFound.push(u)
    }

    // Enqueue internal links
    for (const link of page.links) {
      if ((link as any).isInternal) {
        const normalized = normalizeUrl((link as any).href, baseUrl)
        if (normalized && !visited.has(normalized) && !queue.includes(normalized)) {
          queue.push(normalized)
        }
      }
    }

    await new Promise((r) => setTimeout(r, 200))
  }

  return {
    pages: results, baseUrl,
    totalPages: results.length,
    brokenPages, devUrlsFound,
    robotsTxt, sitemapUrls,
    hasGA4, hasGTM, analyticsIds,
  }
}
