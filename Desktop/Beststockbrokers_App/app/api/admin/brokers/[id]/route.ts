import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/db"
import { z } from "zod"

const brokerSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  shortDescription: z.string().optional().nullable(),
  websiteUrl: z.string().url().optional(),
  foundedYear: z.number().int().optional().nullable(),
  headquartersCountry: z.string().optional().nullable(),
  headquartersCity: z.string().optional().nullable(),
  minimumDeposit: z.number().optional().nullable(),
  baseCurrency: z.string().optional(),
  isRegulated: z.boolean().optional(),
  regulationBodies: z.array(z.string()).optional(),
  accountTypes: z.array(z.string()).optional(),
  supportedCountries: z.array(z.string()).optional(),
  languagesSupported: z.array(z.string()).optional(),
  logoUrl: z.string().url().optional().nullable(),
  isActive: z.boolean().optional(),
  featured: z.boolean().optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const broker = await prisma.broker.findUnique({
      where: { id: params.id },
      include: {
        fees: true,
        features: true,
        platforms: true,
        ratings: true,
      },
    })

    if (!broker) {
      return NextResponse.json({ error: "Broker not found" }, { status: 404 })
    }

    return NextResponse.json({ broker })
  } catch (error) {
    console.error("Error fetching broker:", error)
    return NextResponse.json(
      { error: "Failed to fetch broker" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const broker = await prisma.broker.update({
      where: { id: params.id },
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

    console.error("Error updating broker:", error)
    return NextResponse.json(
      { error: "Failed to update broker" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if broker exists
    const broker = await prisma.broker.findUnique({
      where: { id: params.id },
    })

    if (!broker) {
      return NextResponse.json({ error: "Broker not found" }, { status: 404 })
    }

    // Delete broker (cascade will handle related records if configured)
    await prisma.broker.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true, message: "Broker deleted" })
  } catch (error) {
    console.error("Error deleting broker:", error)
    return NextResponse.json(
      { error: "Failed to delete broker" },
      { status: 500 }
    )
  }
}
