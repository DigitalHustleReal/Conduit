import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/db"
import { z } from "zod"

const contentSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z.string().min(1).max(200),
  content: z.string().min(1),
  excerpt: z.string().max(500).optional().nullable(),
  type: z.enum(["blog", "guide", "page"]),
  status: z.enum(["draft", "published"]).default("draft"),
  metaTitle: z.string().max(200).optional().nullable(),
  metaDescription: z.string().max(500).optional().nullable(),
  featuredImage: z.string().url().optional().nullable(),
  author: z.string().max(100).optional().nullable(),
  publishedAt: z.string().datetime().optional().nullable(),
  tags: z.array(z.string()).default([]),
  category: z.string().max(100).optional().nullable(),
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
    const validatedData = contentSchema.parse(body)

    // Check if slug already exists
    const existing = await prisma.contentPage.findFirst({
      where: { slug: validatedData.slug, type: validatedData.type },
    })

    if (existing) {
      return NextResponse.json(
        { error: "Slug already exists for this content type" },
        { status: 400 }
      )
    }

    const content = await prisma.contentPage.create({
      data: {
        ...validatedData,
        publishedAt: validatedData.publishedAt ? new Date(validatedData.publishedAt) : null,
      },
    })

    return NextResponse.json({ content })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Error creating content:", error)
    return NextResponse.json(
      { error: "Failed to create content" },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get("type") as "blog" | "guide" | "page" | null
    const status = searchParams.get("status") as "draft" | "published" | null
    const limit = parseInt(searchParams.get("limit") || "50")
    const offset = parseInt(searchParams.get("offset") || "0")

    const where: any = {}
    if (type) {
      where.type = type
    }
    if (status) {
      where.status = status
    }

    const [content, total] = await Promise.all([
      prisma.contentPage.findMany({
        where,
        orderBy: {
          createdAt: "desc",
        },
        take: limit,
        skip: offset,
      }),
      prisma.contentPage.count({ where }),
    ])

    return NextResponse.json({ content, total, limit, offset })
  } catch (error) {
    console.error("Error fetching content:", error)
    return NextResponse.json(
      { error: "Failed to fetch content" },
      { status: 500 }
    )
  }
}
