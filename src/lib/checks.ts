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

// ─── Extra checks using sitemap / robots / analytics ───────────────────────
export function runExtraChecks(crawl: any): AuditFinding[] {
  const findings: AuditFinding[] = []

  // Robots.txt checks
  if (!crawl.robotsTxt?.exists) {
    findings.push(finding('SEO', 'MEDIUM', 'Missing robots.txt',
      'No robots.txt file found at the root of the domain.',
      `${crawl.baseUrl}/robots.txt`,
      'HTTP 404 on /robots.txt',
      'Create a robots.txt file at the root of your domain. At minimum include: User-agent: * Allow: /',
      'Low', 'Without robots.txt search engines have no directives — can cause unwanted pages to be indexed.'))
  } else if (!crawl.robotsTxt?.allowsIndexing) {
    findings.push(finding('SEO', 'CRITICAL', 'robots.txt is blocking all search engines',
      'The robots.txt contains "Disallow: /" for all user agents, preventing all search engine indexing.',
      `${crawl.baseUrl}/robots.txt`,
      'Disallow: / for User-agent: *',
      'Update robots.txt to allow indexing. Remove or modify the Disallow: / rule.',
      'Low', 'Your entire website is invisible to search engines. This will destroy organic search traffic.'))
  }

  if (crawl.robotsTxt?.exists && !crawl.robotsTxt?.hasSitemapRef) {
    findings.push(finding('SEO', 'LOW', 'robots.txt does not reference sitemap',
      'No Sitemap: directive found in robots.txt.',
      `${crawl.baseUrl}/robots.txt`,
      'No Sitemap: line in robots.txt',
      'Add "Sitemap: https://yourdomain.com/sitemap.xml" to your robots.txt file.',
      'Low', 'Helps search engines discover your sitemap faster.'))
  }

  // Sitemap checks
  if (!crawl.sitemapUrls || crawl.sitemapUrls.length === 0) {
    findings.push(finding('SEO', 'HIGH', 'No XML sitemap found',
      'Could not find a sitemap.xml at common locations.',
      `${crawl.baseUrl}/sitemap.xml`,
      'HTTP 404 on /sitemap.xml and /sitemap_index.xml',
      'Generate and publish an XML sitemap. Submit it to Google Search Console.',
      'Medium', 'Without a sitemap, search engines may miss pages on your site.'))
  } else {
    findings.push(finding('SEO', 'LOW', `Sitemap found with ${crawl.sitemapUrls.length} URLs`,
      `XML sitemap discovered with ${crawl.sitemapUrls.length} URLs listed.`,
      `${crawl.baseUrl}/sitemap.xml`,
      `${crawl.sitemapUrls.length} URLs in sitemap`,
      'Ensure all important pages are included and submit to Google Search Console.',
      'Low', 'Good — sitemap helps search engines crawl and index your content.'))
  }

  // Analytics checks
  if (!crawl.hasGA4 && !crawl.hasGTM) {
    findings.push(finding('Site Health', 'HIGH', 'No analytics tracking detected',
      'No Google Analytics 4 (GA4) or Google Tag Manager (GTM) code found on the homepage.',
      crawl.baseUrl,
      'No G- or GTM- tracking IDs found in page source',
      'Install Google Analytics 4 via Google Tag Manager. Add GTM snippet to <head> and <body>.',
      'Low', 'Without analytics you have no visibility into traffic, user behaviour, or conversion data.'))
  } else {
    if (crawl.hasGA4) {
      findings.push(finding('Site Health', 'LOW', `GA4 tracking detected`,
        `Google Analytics 4 found. Tracking IDs: ${crawl.analyticsIds.filter((id: string) => id.startsWith('G-')).join(', ')}`,
        crawl.baseUrl,
        `GA4 IDs: ${crawl.analyticsIds.filter((id: string) => id.startsWith('G-')).join(', ')}`,
        'Verify data is flowing correctly in GA4 dashboard.',
        'Low', 'Good — GA4 tracking is in place.'))
    }
    if (crawl.hasGTM) {
      findings.push(finding('Site Health', 'LOW', `Google Tag Manager detected`,
        `GTM container found. IDs: ${crawl.analyticsIds.filter((id: string) => id.startsWith('GTM-')).join(', ')}`,
        crawl.baseUrl,
        `GTM IDs: ${crawl.analyticsIds.filter((id: string) => id.startsWith('GTM-')).join(', ')}`,
        'Audit GTM tags to ensure no duplicate or conflicting tags.',
        'Low', 'Good — GTM is in place for tag management.'))
    }
    if (crawl.hasUA) {
      findings.push(finding('Site Health', 'HIGH', 'Legacy Universal Analytics (UA) detected',
        'Old Google Analytics UA tracking code found. UA was sunset in July 2023.',
        crawl.baseUrl,
        `UA IDs found: ${crawl.analyticsIds.filter((id: string) => id.startsWith('UA-')).join(', ')}`,
        'Remove UA tracking code and ensure GA4 is properly configured.',
        'Low', 'UA stopped processing data in 2023. This code is dead weight and should be removed.'))
    }
  }

  return findings
}

// ─── Checks that work from stored audit DB data ────────────────────────────
export function runStaticChecksFromData(audit: any): AuditFinding[] {
  const visited: string[] = JSON.parse(audit.crawlVisited || '[]')
  // Return minimal findings based on page count
  const findings: AuditFinding[] = []
  if (visited.length === 0) {
    findings.push(finding('Site Health', 'HIGH', 'No pages could be crawled',
      'The crawler was unable to access any pages on this website.',
      audit.url, 'Zero pages crawled',
      'Check the website is publicly accessible and not behind authentication.',
      'High', 'If users cannot access the site, there may be a server or DNS issue.'))
  }
  return findings
}

export function runExtraChecksFromData(crawl: any): AuditFinding[] {
  return runExtraChecks(crawl)
}
