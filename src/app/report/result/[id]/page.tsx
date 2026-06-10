import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import ReportView from '@/components/reports/ReportView'

export default async function ReportResultPage({ params }: { params: { id: string } }) {
  const audit = await prisma.audit.findUnique({
    where: { id: params.id },
    include: {
      findings: { orderBy: [{ severity: 'asc' }, { category: 'asc' }] },
      shareLinks: { where: { expiresAt: { gt: new Date() } }, orderBy: { createdAt: 'desc' }, take: 1 },
    },
  })

  if (!audit || audit.status !== 'COMPLETE') notFound()

  const data = {
    ...audit,
    score: audit.score ?? 0,
    shareLinks: audit.shareLinks.map(s => ({ slug: s.slug, expiresAt: s.expiresAt.toISOString() })),
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

  return <ReportView data={data} />
}
