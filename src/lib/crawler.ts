import * as cheerio from 'cheerio'
import type { PageCrawlResult, ImageData, LinkData, CrawlSummary } from '@/types'

const DEV_URL_PATTERNS = [
  /localhost/i,
  /127\.0\.0\.1/,
  /192\.168\.\d+\.\d+/,
  /dev\./i,
  /staging\./i,
  /test\./i,
  /uat\./i,
  /qa\./i,
  /\.development\./i,
  /\.local$/i,
  /ngrok\.io/i,
  /\.ngrok-free\.app/i,
]

export function isDevUrl(url: string): boolean {
  return DEV_URL_PATTERNS.some((p) => p.test(url))
}

export function normalizeUrl(url: string, baseUrl: string): string | null {
  try {
    if (url.startsWith('mailto:') || url.startsWith('tel:') || url.startsWith('javascript:')) {
      return null
    }
    const base = new URL(baseUrl)
    const resolved = new URL(url, base)
    // Only same-origin
    if (resolved.hostname !== base.hostname) return null
    // Strip hash + trailing slash normalisation
    resolved.hash = ''
    return resolved.href.replace(/\/$/, '') || resolved.href
  } catch {
    return null
  }
}

async function fetchPage(url: string, timeoutMs = 10000): Promise<{ html: string; status: number; loadTimeMs: number } | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  const start = Date.now()
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'WebsiteQA-Bot/1.0 (+https://websiteqa.app/bot)',
        Accept: 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    })
    clearTimeout(timer)
    const html = await res.text()
    return { html, status: res.status, loadTimeMs: Date.now() - start }
  } catch {
    clearTimeout(timer)
    return null
  }
}

export async function crawlPage(url: string): Promise<PageCrawlResult> {
  const fetched = await fetchPage(url)

  if (!fetched || fetched.status >= 400) {
    return {
      url,
      statusCode: fetched?.status ?? 0,
      h1Tags: [],
      h2Tags: [],
      images: [],
      links: [],
      hasCanonical: false,
      isIndexable: false,
      hasSSL: url.startsWith('https://'),
      pageText: '',
      rawHtml: '',
    }
  }

  const $ = cheerio.load(fetched.html)
  const base = new URL(url)

  // Extract images
  const images: ImageData[] = []
  $('img').each((_, el) => {
    const src = $(el).attr('src') || ''
    const alt = $(el).attr('alt')
    images.push({
      src: src ? new URL(src, url).href : '',
      alt,
      width: parseInt($(el).attr('width') || '0') || undefined,
      height: parseInt($(el).attr('height') || '0') || undefined,
    })
  })

  // Extract links
  const links: LinkData[] = []
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') || ''
    const text = $(el).text().trim()
    try {
      const resolved = new URL(href, url)
      const isInternal = resolved.hostname === base.hostname
      links.push({ href: resolved.href, text, isInternal })
    } catch {
      links.push({ href, text, isInternal: false })
    }
  })

  const robotsMeta = $('meta[name="robots"]').attr('content') || ''
  const isIndexable = !robotsMeta.includes('noindex')

  const canonicalHref = $('link[rel="canonical"]').attr('href')

  // Extract visible text (limit size)
  $('script, style, noscript').remove()
  const pageText = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 5000)

  return {
    url,
    statusCode: fetched.status,
    title: $('title').text().trim() || undefined,
    metaDescription: $('meta[name="description"]').attr('content') || undefined,
    h1Tags: $('h1').map((_, el) => $(el).text().trim()).get(),
    h2Tags: $('h2').map((_, el) => $(el).text().trim()).get(),
    images,
    links,
    hasCanonical: !!canonicalHref,
    canonicalUrl: canonicalHref,
    isIndexable,
    loadTimeMs: fetched.loadTimeMs,
    contentLength: fetched.html.length,
    hasSSL: url.startsWith('https://'),
    pageText,
    rawHtml: fetched.html.slice(0, 20000),
  }
}

export async function crawlWebsite(
  startUrl: string,
  maxPages = 20,
  onProgress?: (crawled: number, total: number, currentUrl: string) => void
): Promise<CrawlSummary> {
  const base = new URL(startUrl)
  const baseUrl = `${base.protocol}//${base.hostname}`

  const visited = new Set<string>()
  const queue: string[] = [startUrl.replace(/\/$/, '') || startUrl]
  const results: PageCrawlResult[] = []
  const brokenPages: number[] = []
  const devUrlsFound: string[] = []

  while (queue.length > 0 && visited.size < maxPages) {
    const url = queue.shift()!
    if (visited.has(url)) continue
    visited.add(url)

    onProgress?.(visited.size, Math.max(queue.length + visited.size, visited.size), url)

    const page = await crawlPage(url)
    results.push(page)

    if (page.statusCode >= 400 || page.statusCode === 0) {
      brokenPages.push(page.statusCode)
    }

    // Find dev URLs in page
    const allUrls = [...page.images.map((i) => i.src), ...page.links.map((l) => l.href)]
    for (const u of allUrls) {
      if (isDevUrl(u) && !devUrlsFound.includes(u)) {
        devUrlsFound.push(u)
      }
    }

    // Enqueue internal links
    for (const link of page.links) {
      if (link.isInternal) {
        const normalized = normalizeUrl(link.href, baseUrl)
        if (normalized && !visited.has(normalized) && !queue.includes(normalized)) {
          queue.push(normalized)
        }
      }
    }

    // Small delay to be polite
    await new Promise((r) => setTimeout(r, 300))
  }

  return {
    pages: results,
    baseUrl,
    totalPages: results.length,
    brokenPages,
    devUrlsFound,
  }
}
