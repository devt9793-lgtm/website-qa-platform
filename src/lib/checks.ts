import type { CrawlSummary, AuditFinding, Severity } from '@/types'
import { isDevUrl } from './crawler'

function finding(
  category: AuditFinding['category'],
  severity: Severity,
  title: string,
  description: string,
  url?: string,
  evidence?: string,
  fixGuide?: string,
  complexity?: AuditFinding['complexity'],
  businessImpact?: string
): AuditFinding {
  return { category, severity, title, description, url, evidence, fixGuide, complexity, businessImpact }
}

export function runStaticChecks(crawl: CrawlSummary): AuditFinding[] {
  const findings: AuditFinding[] = []
  const titlesSeen = new Map<string, string[]>()
  const descsSeen = new Map<string, string[]>()

  for (const page of crawl.pages) {
    const u = page.url

    // ─── Site Health ───────────────────────────────────────────────
    if (page.statusCode === 404) {
      findings.push(finding('Site Health', 'HIGH', 'Page returns 404', `Page not found: ${u}`, u,
        `HTTP status: 404`,
        'Remove or fix the link pointing to this page, or create a redirect.',
        'Low', 'Broken pages hurt SEO rankings and user trust.'))
    }
    if (page.statusCode === 500) {
      findings.push(finding('Site Health', 'CRITICAL', 'Server Error (500)', `Server error on: ${u}`, u,
        `HTTP status: 500`,
        'Check server logs and fix the underlying application error immediately.',
        'High', 'Server errors indicate broken functionality and can drive users away.'))
    }
    if (!page.hasSSL) {
      findings.push(finding('Security', 'CRITICAL', 'Page served over HTTP (not HTTPS)', `URL is not secure: ${u}`, u,
        'Protocol: http://',
        'Install an SSL certificate and redirect all HTTP traffic to HTTPS.',
        'Medium', 'Insecure pages are flagged by browsers, damaging user trust and SEO.'))
    }

    // ─── SEO ───────────────────────────────────────────────────────
    if (!page.title) {
      findings.push(finding('SEO', 'HIGH', 'Missing page title', `No <title> tag found on ${u}`, u,
        'No <title> element detected',
        'Add a descriptive, unique <title> tag (50–60 characters).',
        'Low', 'Missing titles prevent search engines from understanding page content.'))
    } else {
      const t = page.title
      if (!titlesSeen.has(t)) titlesSeen.set(t, [])
      titlesSeen.get(t)!.push(u)
    }

    if (!page.metaDescription) {
      findings.push(finding('SEO', 'MEDIUM', 'Missing meta description', `No meta description on ${u}`, u,
        'No <meta name="description"> detected',
        'Add a compelling meta description (150–160 characters).',
        'Low', 'Meta descriptions influence click-through rates from search results.'))
    } else {
      const d = page.metaDescription
      if (!descsSeen.has(d)) descsSeen.set(d, [])
      descsSeen.get(d)!.push(u)
    }

    if (page.h1Tags.length === 0) {
      findings.push(finding('SEO', 'HIGH', 'Missing H1 tag', `No H1 heading found on ${u}`, u,
        'No <h1> element detected',
        'Add a single, descriptive H1 tag containing the primary keyword.',
        'Low', 'H1 tags are key on-page SEO signals.'))
    }
    if (page.h1Tags.length > 1) {
      findings.push(finding('SEO', 'MEDIUM', 'Multiple H1 tags', `${page.h1Tags.length} H1 tags found on ${u}`, u,
        `H1 tags: ${page.h1Tags.join(' | ')}`,
        'Keep exactly one H1 per page. Convert others to H2/H3.',
        'Low', 'Multiple H1s confuse search engine crawlers.'))
    }
    if (!page.isIndexable) {
      findings.push(finding('SEO', 'HIGH', 'Page marked noindex', `Search engines are blocked from indexing ${u}`, u,
        'robots meta: noindex',
        'Remove noindex unless you intentionally want this page excluded from search.',
        'Low', 'Noindex pages cannot rank in search results.'))
    }
    if (page.hasCanonical && page.canonicalUrl && page.canonicalUrl !== u &&
        !page.canonicalUrl.replace(/\/$/, '').endsWith(new URL(u).pathname)) {
      findings.push(finding('SEO', 'MEDIUM', 'Canonical points to different URL', `Canonical on ${u} points to ${page.canonicalUrl}`, u,
        `Canonical: ${page.canonicalUrl}`,
        'Verify the canonical URL is intentional. Ensure it resolves correctly.',
        'Medium', 'Incorrect canonicals can consolidate ranking signals to the wrong page.'))
    }

    // ─── Accessibility ─────────────────────────────────────────────
    const missingAlt = page.images.filter((i) => i.alt === undefined || i.alt === null)
    if (missingAlt.length > 0) {
      findings.push(finding('Accessibility', 'HIGH', 'Images missing alt text',
        `${missingAlt.length} image(s) on ${u} have no alt attribute.`, u,
        `Images: ${missingAlt.slice(0, 3).map(i => i.src.split('/').pop()).join(', ')}${missingAlt.length > 3 ? '...' : ''}`,
        'Add descriptive alt text to all informational images. Use alt="" for decorative images.',
        'Low', 'Missing alt text breaks screen reader accessibility and violates WCAG 2.1.'))
    }

    // ─── Content ───────────────────────────────────────────────────
    if (page.pageText.toLowerCase().includes('lorem ipsum')) {
      findings.push(finding('Content', 'CRITICAL', 'Lorem Ipsum placeholder text detected',
        `Placeholder content found on ${u}`, u,
        'Text contains "Lorem Ipsum"',
        'Replace all placeholder text with real, meaningful content before launch.',
        'Low', 'Placeholder text damages brand credibility and user trust.'))
    }
    const testPhrases = ['test content', 'sample text', 'placeholder', 'coming soon', 'under construction']
    for (const phrase of testPhrases) {
      if (page.pageText.toLowerCase().includes(phrase)) {
        findings.push(finding('Content', 'HIGH', `Possible test content: "${phrase}"`,
          `Found "${phrase}" on ${u}`, u,
          `Text excerpt contains: "${phrase}"`,
          'Review page content and replace any test/placeholder text.',
          'Low', 'Test content signals an unfinished website.'))
        break
      }
    }

    // ─── URL Validation ─────────────────────────────────────────────
    const allPageUrls = [...page.images.map(i => i.src), ...page.links.map(l => l.href)]
    for (const refUrl of allPageUrls) {
      if (isDevUrl(refUrl)) {
        findings.push(finding('URL Validation', 'CRITICAL', 'Development/staging URL found in page',
          `Dev URL referenced on ${u}: ${refUrl}`, u,
          `Referenced URL: ${refUrl}`,
          'Replace with production URL. Search your codebase for this exact URL and update.',
          'Low', 'Dev URLs can expose internal infrastructure and break production functionality.'))
      }
    }

    // ─── Performance ───────────────────────────────────────────────
    if (page.loadTimeMs && page.loadTimeMs > 3000) {
      findings.push(finding('Performance', 'HIGH', 'Slow page load time',
        `${u} took ${page.loadTimeMs}ms to load (>3s threshold).`, u,
        `Load time: ${page.loadTimeMs}ms`,
        'Audit render-blocking resources, enable caching, compress assets, use a CDN.',
        'High', 'Slow pages increase bounce rate and harm search rankings.'))
    }
    if (page.contentLength && page.contentLength > 500000) {
      findings.push(finding('Performance', 'MEDIUM', 'Large page size',
        `${u} HTML is ${Math.round(page.contentLength / 1024)}KB (>500KB).`, u,
        `HTML size: ${Math.round(page.contentLength / 1024)}KB`,
        'Minify HTML/CSS/JS. Remove unused code. Lazy-load off-screen content.',
        'Medium', 'Large pages slow initial render and hurt Core Web Vitals.'))
    }
    const largeImages = page.images.filter(i => !i.width && !i.height && i.src)
    if (largeImages.length > 5) {
      findings.push(finding('Performance', 'MEDIUM', 'Images missing width/height attributes',
        `${largeImages.length} images on ${u} lack width/height, causing layout shift.`, u,
        `${largeImages.length} images without dimensions`,
        'Add explicit width and height attributes to all images to prevent Cumulative Layout Shift (CLS).',
        'Low', 'Layout shifts harm user experience and CLS score.'))
    }
  }

  // ─── Duplicate titles ──────────────────────────────────────────
  for (const [title, urls] of titlesSeen.entries()) {
    if (urls.length > 1) {
      findings.push(finding('SEO', 'HIGH', 'Duplicate page titles',
        `Title "${title}" is used on ${urls.length} pages.`, undefined,
        `Affected pages: ${urls.slice(0, 3).join(', ')}`,
        'Give each page a unique, descriptive title that reflects its content.',
        'Low', 'Duplicate titles confuse search engines about which page to rank.'))
    }
  }
  for (const [desc, urls] of descsSeen.entries()) {
    if (urls.length > 1) {
      findings.push(finding('SEO', 'MEDIUM', 'Duplicate meta descriptions',
        `Same meta description used on ${urls.length} pages.`, undefined,
        `Affected pages: ${urls.slice(0, 3).join(', ')}`,
        'Write unique meta descriptions for each page.',
        'Low', 'Duplicate meta descriptions reduce click-through rates from search results.'))
    }
  }

  return findings
}
