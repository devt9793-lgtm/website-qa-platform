import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { nanoid } from 'nanoid'
import { addDays } from 'date-fns'

export async function POST(req: NextRequest) {
  const { auditId } = await req.json()

  if (!auditId) {
    return NextResponse.json({ error: 'auditId required' }, { status: 400 })
  }

  const audit = await prisma.audit.findUnique({ where: { id: auditId } })
  if (!audit) {
    return NextResponse.json({ error: 'Audit not found' }, { status: 404 })
  }

  const slug = nanoid(12)
  const expiresAt = addDays(new Date(), 30)

  const link = await prisma.shareLink.create({
    data: { auditId, slug, expiresAt },
  })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  return NextResponse.json({
    slug: link.slug,
    url: `${appUrl}/report/${link.slug}`,
    expiresAt: link.expiresAt,
  })
}
