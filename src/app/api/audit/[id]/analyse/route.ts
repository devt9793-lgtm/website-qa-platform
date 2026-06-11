import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { runStaticChecksFromData, runExtraChecksFromData } from '@/lib/checks'
import { analyzeWithAI } from '@/lib/ai-analyzer'

export const maxDuration = 60

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const anthropicKey = req.headers.get('x-anthropic-key')
  if (!anthropicKey) {
    return NextResponse.json({ error: 'API key required' }, { status: 401 })
  }

  const audit = await prisma.audit.findUnique({
    where: { id: params.id },
  })

  if (!audit) {
    return NextResponse.json({ error: 'Audit not found' }, { status: 404 })
  }

  try {
    await prisma.audit.update({
      where: { id: params.id },
      data: { status: 'ANALYZING' },
    })

    const visited: string[] = JSON.parse(audit.crawlVisited || '[]')
    const sitemapUrls: string[] = JSON.parse(audit.sitemapUrls || '[]')
    const robotsTxt = JSON.parse((audit as any).crawlRobots || 'null')

    // Rebuild crawl summary from stored data
    const crawlSummary = {
      baseUrl: (() => {
        try { const u = new URL(audit.url); return `${u.protocol}//${u.hostname}` } catch { return audit.url }
      })(),
      totalPages: visited.length,
      pages: [],
      brokenPages: [],
      devUrlsFound: [],
      robotsTxt,
      sitemapUrls,
      hasGA4: false,
      hasGTM: false,
      analyticsIds: [] as string[],
    }

    // Run checks
    const staticFindings = runStaticChecksFromData(audit as any)
    const extraFindings = runExtraChecksFromData(crawlSummary as any)
    const allFindings = [...staticFindings, ...extraFindings]

    // AI analysis
    const { enrichedFindings, summary, score } = await analyzeWithAI(
      crawlSummary as any,
      allFindings,
      anthropicKey
    )

    const criticalCount = enrichedFindings.filter(f => f.severity === 'CRITICAL').length
    const highCount     = enrichedFindings.filter(f => f.severity === 'HIGH').length
    const mediumCount   = enrichedFindings.filter(f => f.severity === 'MEDIUM').length
    const lowCount      = enrichedFindings.filter(f => f.severity === 'LOW').length

    await prisma.finding.createMany({
      data: enrichedFindings.map(f => ({
        auditId: params.id,
        category: f.category,
        severity: f.severity,
        title: f.title,
        description: f.description,
        url: f.url ?? null,
        evidence: f.evidence ?? null,
        fixGuide: f.fixGuide ?? null,
        complexity: f.complexity ?? null,
        businessImpact: f.businessImpact ?? null,
      })),
    })

    await prisma.audit.update({
      where: { id: params.id },
      data: {
        status: 'COMPLETE', score, summary,
        totalIssues: enrichedFindings.length,
        criticalCount, highCount, mediumCount, lowCount,
        completedAt: new Date(),
      },
    })

    return NextResponse.json({ success: true, score, totalIssues: enrichedFindings.length })

  } catch (error) {
    await prisma.audit.update({
      where: { id: params.id },
      data: { status: 'FAILED' },
    }).catch(() => {})
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Analysis failed' },
      { status: 500 }
    )
  }
}
