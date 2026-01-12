import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/db"
import { z } from "zod"

const contentUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  slug: z.string().min(1).max(200).optional(),
  content: z.string().min(1).optional(),
  excerpt: z.string().max(500).optional().nullable(),
  type: z.enum(["blog", "guide", "page"]).optional(),
  status: z.enum(["draft", "published"]).optional(),
  metaTitle: z.string().max(200).optional().nullable(),
  metaDescription: z.string().max(500).optional().nullable(),
  featuredImage: z.string().url().optional().nullable(),
  author: z.string().max(100).optional().nullable(),
  publishedAt: z.string().datetime().optional().nullable(),
  tags: z.array(z.string()).optional(),
  category: z.string().max(100).optional().nullable(),
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

    const content = await prisma.contentPage.findUnique({
      where: { id: params.id },
    })

    if (!content) {
      return NextResponse.json({ error: "Content not found" }, { status: 404 })
    }

    return NextResponse.json({ content })
  } catch (error) {
    console.error("Error fetching content:", error)
    return NextResponse.json(
      { error: "Failed to fetch content" },
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
    const validatedData = contentUpdateSchema.parse(body)

    // Check if slug already exists (excluding current content)
    if (validatedData.slug) {
      const existing = await prisma.contentPage.findFirst({
        where: {
          slug: validatedData.slug,
          type: validatedData.type || undefined,
          NOT: { id: params.id },
        },
      })

      if (existing) {
        return NextResponse.json(
          { error: "Slug already exists for this content type" },
          { status: 400 }
        )
      }
    }

    const updateData: any = { ...validatedData }
    if (validatedData.publishedAt) {
      updateData.publishedAt = new Date(validatedData.publishedAt)
    }

    const content = await prisma.contentPage.update({
      where: { id: params.id },
      data: updateData,
    })

    return NextResponse.json({ content })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Error updating content:", error)
    return NextResponse.json(
      { error: "Failed to update content" },
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

    const content = await prisma.contentPage.findUnique({
      where: { id: params.id },
    })

    if (!content) {
      return NextResponse.json({ error: "Content not found" }, { status: 404 })
    }

    await prisma.contentPage.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true, message: "Content deleted" })
  } catch (error) {
    console.error("Error deleting content:", error)
    return NextResponse.json(
      { error: "Failed to delete content" },
      { status: 500 }
    )
  }
}
