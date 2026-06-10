import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import ReportView from '@/components/reports/ReportView'

export default async function SharedReportPage({ params }: { params: { slug: string } }) {
  const link = await prisma.shareLink.findUnique({
    where: { slug: params.slug },
    include: {
      audit: {
        include: {
          findings: { orderBy: [{ severity: 'asc' }, { category: 'asc' }] },
        },
      },
    },
  })

  if (!link) notFound()
  if (link.expiresAt < new Date()) {
    return (
      <div className="min-h-screen bg-[#0a0d14] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Report Expired</h1>
          <p className="text-white/40">This shared report link has expired.</p>
        </div>
      </div>
    )
  }

  const audit = link.audit
  const data = {
    ...audit,
    score: audit.score ?? 0,
    expiresAt: link.expiresAt.toISOString(),
    startedAt: audit.startedAt.toISOString(),
    completedAt: audit.completedAt?.toISOString() ?? null,
    findings: audit.findings.map(f => ({
      ...f,
      url: f.url ?? undefined,
      evidence: f.evidence ?? undefined,
      fixGuide: f.fixGuide ?? undefined,
      complexity: f.complexity ?? undefined,
      businessImpact: f.businessImpact ?? undefined,
    })),
  }

  return <ReportView data={data} isShared />
}
