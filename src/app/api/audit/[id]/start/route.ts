import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // Reset audit to PENDING so batch crawl can start fresh
  await prisma.audit.update({
    where: { id: params.id },
    data: {
      status: 'PENDING',
      crawlQueue: null,
      crawlVisited: null,
      crawlRobots: null,
      sitemapUrls: null,
      crawledPages: 0,
    },
  })
  return NextResponse.json({ ready: true })
}
