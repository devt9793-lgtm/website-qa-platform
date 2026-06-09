import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const audit = await prisma.audit.findUnique({
    where: { id: params.id },
    include: {
      findings: { orderBy: [{ severity: 'asc' }, { category: 'asc' }] },
      shareLinks: { where: { expiresAt: { gt: new Date() } }, orderBy: { createdAt: 'desc' } },
    },
  })

  if (!audit) {
    return NextResponse.json({ error: 'Audit not found' }, { status: 404 })
  }

  return NextResponse.json(audit)
}
