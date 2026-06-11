import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { crawlPage, normalizeUrl, fetchSitemapUrls, fetchRobotsTxt, isDevUrl } from '@/lib/crawler'

const BATCH_SIZE = 5

export const maxDuration = 30

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const audit = await prisma.audit.findUnique({
    where: { id: params.id },
  })

  if (!audit) {
    return NextResponse.json({ error: 'Audit not found' }, { status: 404 })
  }

  const baseUrl = (() => {
    try {
      const u = new URL(audit.url)
      return `${u.protocol}//${u.hostname}`
    } catch { return audit.url }
  })()

  // ── First batch: initialise queue from sitemap ──────────────────────────
  let queue: string[] = []
  let visited: string[] = []
  let sitemapUrls: string[] = []
  let robotsTxtData: any = null
  let isFirstBatch = false

  if (!audit.crawlQueue) {
    isFirstBatch = true

    // Fetch sitemap + robots in parallel
    const [robots, smUrls] = await Promise.all([
      fetchRobotsTxt(baseUrl),
      fetchSitemapUrls(baseUrl),
    ])

    robotsTxtData = robots
    sitemapUrls = smUrls

    // Seed queue: homepage + sitemap URLs
    const normalizedStart = audit.url.replace(/\/$/, '') || audit.url
    queue = [normalizedStart]

    for (const u of sitemapUrls) {
      const n = normalizeUrl(u, baseUrl)
      if (n && !queue.includes(n)) queue.push(n)
    }

    // Store robots + sitemap data in audit
    await prisma.audit.update({
      where: { id: params.id },
      data: {
        status: 'CRAWLING',
        sitemapUrls: JSON.stringify(sitemapUrls),
        // @ts-ignore
        crawlRobots: JSON.stringify(robots),
      },
    })
  } else {
    queue = JSON.parse(audit.crawlQueue || '[]')
    visited = JSON.parse(audit.crawlVisited || '[]')
    sitemapUrls = JSON.parse(audit.sitemapUrls || '[]')
  }

  if (queue.length === 0) {
    return NextResponse.json({ done: true, crawledPages: visited.length })
  }

  // ── Process this batch ──────────────────────────────────────────────────
  const batch = queue.splice(0, BATCH_SIZE)
  const newFindings: any[] = []

  for (const url of batch) {
    if (visited.includes(url)) continue
    visited.push(url)

    const page = await crawlPage(url) as any

    // Store page finding data
    newFindings.push({
      auditId: params.id,
      url,
      statusCode: page.statusCode,
      title: page.title,
      metaDescription: page.metaDescription,
      h1Count: page.h1Tags?.length ?? 0,
      missingAlt: page.images?.filter((i: any) => !i.alt).length ?? 0,
      hasCanonical: page.hasCanonical,
      isIndexable: page.isIndexable,
      loadTimeMs: page.loadTimeMs,
      hasSSL: page.hasSSL,
      hasGA4: page.hasGA4,
      hasGTM: page.hasGTM,
      trackingIds: page.trackingIds,
      pageData: JSON.stringify({
        h1Tags: page.h1Tags,
        h2Tags: page.h2Tags,
        images: page.images?.slice(0, 20),
        links: page.links?.slice(0, 50),
        pageText: page.pageText?.slice(0, 1000),
        canonicalUrl: page.canonicalUrl,
        contentLength: page.contentLength,
      })
    })

    // Enqueue new internal links found
    for (const link of (page.links || [])) {
      if (link.isInternal) {
        const normalized = normalizeUrl(link.href, baseUrl)
        if (normalized && !visited.includes(normalized) && !queue.includes(normalized) && !batch.includes(normalized)) {
          queue.push(normalized)
        }
      }
    }
  }

  // ── Save progress to DB ─────────────────────────────────────────────────
  await prisma.audit.update({
    where: { id: params.id },
    data: {
      crawledPages: visited.length,
      crawlQueue: JSON.stringify(queue),
      crawlVisited: JSON.stringify(visited),
      status: 'CRAWLING',
    },
  })

  const isDone = queue.length === 0

  return NextResponse.json({
    done: isDone,
    crawledPages: visited.length,
    remaining: queue.length,
    batchPages: newFindings.map(p => ({
      url: p.url,
      statusCode: p.statusCode,
      title: p.title,
      h1Count: p.h1Count,
      missingAlt: p.missingAlt,
      hasCanonical: p.hasCanonical,
      isIndexable: p.isIndexable,
      loadTimeMs: p.loadTimeMs,
      hasSSL: p.hasSSL,
      hasGA4: p.hasGA4,
      hasGTM: p.hasGTM,
      trackingIds: p.trackingIds,
      pageData: p.pageData,
    })),
    isFirstBatch,
    sitemapCount: sitemapUrls.length,
  })
}
