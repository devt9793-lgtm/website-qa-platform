import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const audits = await prisma.audit.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true,
      url: true,
      status: true,
      score: true,
      totalIssues: true,
      criticalCount: true,
      highCount: true,
      crawledPages: true,
      createdAt: true,
      completedAt: true,
    },
  })

  return NextResponse.json(audits)
}
