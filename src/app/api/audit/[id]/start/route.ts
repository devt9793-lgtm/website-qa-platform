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

  const audit = await prisma.audit.findUnique({
    where: { id: params.id },
  })

  console.log('Audit fetched:', JSON.stringify(audit))

  if (!audit) {
    return NextResponse.json({ error: `Audit not found: ${params.id}` }, { status: 404 })
  }

  const auditUrl = audit.url
  console.log('Audit URL:', auditUrl, 'Type:', typeof auditUrl)

  if (!auditUrl || auditUrl === 'undefined' || auditUrl === 'null') {
    return NextResponse.json({ error: `Bad URL in DB: "${auditUrl}"` }, { status: 400 })
  }

  const finalUrl = auditUrl.startsWith('http') ? auditUrl : `https://${auditUrl}`

  try {
    await runAudit(audit.id, finalUrl, anthropicKey)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Audit failed' },
      { status: 500 }
    )
  }
}
