import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { runAudit } from '@/lib/audit-runner'
import { z } from 'zod'

const schema = z.object({
  url: z.string().url('Please enter a valid URL'),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  const body = await req.json()

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
  }

  let { url } = parsed.data
  // Ensure https
  if (!url.startsWith('http')) url = `https://${url}`

  // Create audit record
  const audit = await prisma.audit.create({
    data: {
      url,
      status: 'PENDING',
      userId: session?.user?.id ?? null,
    },
  })

  // Run audit in background (fire and forget)
  runAudit(audit.id, url).catch(console.error)

  return NextResponse.json({ auditId: audit.id }, { status: 201 })
}
