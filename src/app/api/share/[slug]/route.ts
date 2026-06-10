import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
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

  if (!link) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 })
  }

  if (link.expiresAt < new Date()) {
    return NextResponse.json({ error: 'This report link has expired' }, { status: 410 })
  }

  return NextResponse.json({ ...link.audit, expiresAt: link.expiresAt })
}
