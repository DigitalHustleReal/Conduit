import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/db"
import { z } from "zod"

const brokerSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional().nullable(),
  shortDescription: z.string().optional().nullable(),
  websiteUrl: z.string().url(),
  foundedYear: z.number().int().optional().nullable(),
  headquartersCountry: z.string().optional().nullable(),
  headquartersCity: z.string().optional().nullable(),
  minimumDeposit: z.number().optional().nullable(),
  baseCurrency: z.string().default("USD"),
  isRegulated: z.boolean().default(false),
  regulationBodies: z.array(z.string()).default([]),
  accountTypes: z.array(z.string()).default([]),
  supportedCountries: z.array(z.string()).default([]),
  languagesSupported: z.array(z.string()).default([]),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = brokerSchema.parse(body)

    const broker = await prisma.broker.create({
      data: validatedData,
    })

    return NextResponse.json({ broker })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Error creating broker:", error)
    return NextResponse.json(
      { error: "Failed to create broker" },
      { status: 500 }
    )
  }
}






