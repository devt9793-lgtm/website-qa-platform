import { NextRequest, NextResponse } from 'next/server'
import { runAudit } from '@/lib/audit-runner'
import { prisma } from '@/lib/prisma'

export const maxDuration = 300

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const anthropicKey = req.headers.get('x-anthropic-key')
  if (!anthropicKey) {
    return NextResponse.json({ error: 'API key required' }, { status: 401 })
  }

  // Fetch the audit record to get the URL
  const audit = await prisma.audit.findUnique({
    where: { id: params.id },
    select: { id: true, url: true, status: true }
  })

  if (!audit) {
    return NextResponse.json({ error: 'Audit not found' }, { status: 404 })
  }

  if (!audit.url) {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }

  try {
    await runAudit(audit.id, audit.url, anthropicKey)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Audit failed' },
      { status: 500 }
    )
  }
}
