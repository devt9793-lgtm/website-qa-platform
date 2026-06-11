import { NextRequest, NextResponse } from 'next/server'
import { runAudit } from '@/lib/audit-runner'

export const maxDuration = 300

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const anthropicKey = req.headers.get('x-anthropic-key')
  if (!anthropicKey) {
    return NextResponse.json({ error: 'API key required' }, { status: 401 })
  }

  try {
    await runAudit(params.id, undefined as any, anthropicKey)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Audit failed' },
      { status: 500 }
    )
  }
}
