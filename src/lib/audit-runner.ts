import { crawlWebsite } from './crawler'
import { runStaticChecks } from './checks'
import { analyzeWithAI } from './ai-analyzer'
import { prisma } from './prisma'
import type { AuditFinding } from '@/types'

export async function runAudit(
  auditId: string,
  url: string,
  onProgress?: (stage: string, percent: number, message: string) => void
): Promise<void> {
  try {
    // Mark as crawling
    await prisma.audit.update({
      where: { id: auditId },
      data: { status: 'CRAWLING' },
    })

    onProgress?.('crawling', 5, 'Starting website crawl...')

    // Crawl
    const crawl = await crawlWebsite(url, 20, (crawled, total, currentUrl) => {
      const pct = Math.round((crawled / Math.max(total, 1)) * 40) + 5
      onProgress?.('crawling', pct, `Crawling: ${currentUrl}`)
    })

    await prisma.audit.update({
      where: { id: auditId },
      data: { crawledPages: crawl.totalPages, status: 'ANALYZING' },
    })

    onProgress?.('analyzing', 50, 'Running static checks...')

    // Static checks
    const staticFindings = runStaticChecks(crawl)

    onProgress?.('analyzing', 65, 'Running AI analysis...')

    // AI enrichment
    const { enrichedFindings, summary, score } = await analyzeWithAI(crawl, staticFindings)

    onProgress?.('analyzing', 90, 'Saving report...')

    // Count by severity
    const criticalCount = enrichedFindings.filter(f => f.severity === 'CRITICAL').length
    const highCount = enrichedFindings.filter(f => f.severity === 'HIGH').length
    const mediumCount = enrichedFindings.filter(f => f.severity === 'MEDIUM').length
    const lowCount = enrichedFindings.filter(f => f.severity === 'LOW').length

    // Save findings
    await prisma.finding.createMany({
      data: enrichedFindings.map(f => ({
        auditId,
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

    // Update audit as complete
    await prisma.audit.update({
      where: { id: auditId },
      data: {
        status: 'COMPLETE',
        score,
        summary,
        totalIssues: enrichedFindings.length,
        criticalCount,
        highCount,
        mediumCount,
        lowCount,
        completedAt: new Date(),
      },
    })

    onProgress?.('complete', 100, 'Audit complete!')

  } catch (error) {
    console.error('Audit failed:', error)
    await prisma.audit.update({
      where: { id: auditId },
      data: { status: 'FAILED' },
    }).catch(() => {})
    onProgress?.('failed', 0, `Audit failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    throw error
  }
}
