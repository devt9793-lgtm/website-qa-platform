import Anthropic from '@anthropic-ai/sdk'
import type { CrawlSummary, AuditFinding } from '@/types'

const client = new Anthropic()

export async function analyzeWithAI(
  crawl: CrawlSummary,
  staticFindings: AuditFinding[]
): Promise<{ enrichedFindings: AuditFinding[]; summary: string; score: number }> {

  // Build a compact summary for AI
  const pagesDigest = crawl.pages.slice(0, 10).map(p => ({
    url: p.url,
    status: p.statusCode,
    title: p.title,
    h1Count: p.h1Tags.length,
    imageCount: p.images.length,
    missingAlt: p.images.filter(i => !i.alt).length,
    metaDesc: !!p.metaDescription,
    loadMs: p.loadTimeMs,
    ssl: p.hasSSL,
    indexable: p.isIndexable,
    pageText: p.pageText.slice(0, 300),
  }))

  const findingsSummary = staticFindings.map(f => ({
    category: f.category,
    severity: f.severity,
    title: f.title,
    url: f.url,
  }))

  const prompt = `You are a senior website QA analyst. Analyze the following website audit data and provide expert analysis.

WEBSITE: ${crawl.baseUrl}
PAGES CRAWLED: ${crawl.totalPages}

PAGE DATA:
${JSON.stringify(pagesDigest, null, 2)}

STATIC ISSUES DETECTED:
${JSON.stringify(findingsSummary, null, 2)}

DEV URLS FOUND: ${crawl.devUrlsFound.join(', ') || 'None'}
BROKEN PAGE CODES: ${crawl.brokenPages.join(', ') || 'None'}

Your task:
1. Review all findings and page data
2. Identify any ADDITIONAL issues not caught by static checks (e.g. poor content quality, UX issues, SEO strategy gaps, technical architecture concerns)
3. Provide business impact context for critical findings
4. Generate a professional executive summary (2-3 paragraphs)
5. Calculate an overall quality score 0-100 (100 = perfect)

Scoring guide:
- Start at 100
- CRITICAL issue: -15 each
- HIGH issue: -8 each  
- MEDIUM issue: -4 each
- LOW issue: -1 each
- Bonus: SSL everywhere (+5), fast load times (+3), good SEO signals (+3)

Respond ONLY with valid JSON in this exact format:
{
  "score": <number 0-100>,
  "summary": "<executive summary 2-3 paragraphs>",
  "additionalFindings": [
    {
      "category": "<one of: Site Health|Navigation|URL Validation|Content|SEO|Accessibility|Performance|Security|Forms & Functionality>",
      "severity": "<CRITICAL|HIGH|MEDIUM|LOW>",
      "title": "<concise title>",
      "description": "<detailed description>",
      "url": "<url or null>",
      "evidence": "<what you observed>",
      "fixGuide": "<specific actionable fix>",
      "complexity": "<Low|Medium|High>",
      "businessImpact": "<business impact explanation>"
    }
  ]
}`

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  
  // Strip markdown fences if present
  const clean = text.replace(/```json\n?|\n?```/g, '').trim()
  
  let parsed: { score: number; summary: string; additionalFindings: AuditFinding[] }
  try {
    parsed = JSON.parse(clean)
  } catch {
    // Fallback if JSON parse fails
    return {
      enrichedFindings: staticFindings,
      summary: 'AI analysis completed. See detailed findings below.',
      score: Math.max(0, 100 - staticFindings.filter(f => f.severity === 'CRITICAL').length * 15
        - staticFindings.filter(f => f.severity === 'HIGH').length * 8
        - staticFindings.filter(f => f.severity === 'MEDIUM').length * 4),
    }
  }

  const allFindings = [
    ...staticFindings,
    ...(parsed.additionalFindings || []),
  ]

  return {
    enrichedFindings: allFindings,
    summary: parsed.summary,
    score: Math.max(0, Math.min(100, parsed.score)),
  }
}
