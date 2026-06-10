import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { runAudit } from '@/lib/audit-runner'
import { z } from 'zod'

const schema = z.object({
  url: z.string().url('Please enter a valid URL'),
})

export async function POST(req: NextRequest) {
  // Get API key from header (set by frontend, never stored in DB)
  const anthropicKey = req.headers.get('x-anthropic-key')
  if (!anthropicKey) {
    return NextResponse.json(
      { error: 'Anthropic API key is required. Please add it via the API Keys button.' },
      { status: 401 }
    )
  }

  const session = await auth()
  const body = await req.json()

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
  }

  let { url } = parsed.data
  if (!url.startsWith('http')) url = `https://${url}`

  const audit = await prisma.audit.create({
    data: {
      url,
      status: 'PENDING',
      userId: session?.user?.id ?? null,
    },
  })

  // Pass the API key directly to the runner — never stored
  runAudit(audit.id, url, anthropicKey).catch(console.error)

  return NextResponse.json({ auditId: audit.id }, { status: 201 })
}
