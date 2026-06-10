import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const format = req.nextUrl.searchParams.get('format') ?? 'json'

  const audit = await prisma.audit.findUnique({
    where: { id: params.id },
    include: { findings: { orderBy: [{ severity: 'asc' }] } },
  })

  if (!audit) {
    return NextResponse.json({ error: 'Audit not found' }, { status: 404 })
  }

  if (format === 'json') {
    return new NextResponse(JSON.stringify(audit, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="audit-${audit.id}.json"`,
      },
    })
  }

  if (format === 'csv') {
    const header = ['Category', 'Severity', 'Title', 'URL', 'Description', 'Fix Guide', 'Complexity', 'Business Impact']
    const rows = audit.findings.map(f => [
      f.category,
      f.severity,
      `"${f.title.replace(/"/g, '""')}"`,
      f.url ?? '',
      `"${f.description.replace(/"/g, '""')}"`,
      `"${(f.fixGuide ?? '').replace(/"/g, '""')}"`,
      f.complexity ?? '',
      `"${(f.businessImpact ?? '').replace(/"/g, '""')}"`,
    ])
    const csv = [header.join(','), ...rows.map(r => r.join(','))].join('\n')

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="audit-${audit.id}.csv"`,
      },
    })
  }

  return NextResponse.json({ error: 'Unsupported format' }, { status: 400 })
}
