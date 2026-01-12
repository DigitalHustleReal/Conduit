import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get("type") as "blog" | "guide" | "page" | null
    const slug = searchParams.get("slug")
    const limit = parseInt(searchParams.get("limit") || "20")
    const offset = parseInt(searchParams.get("offset") || "0")
    const category = searchParams.get("category")
    const tag = searchParams.get("tag")

    const where: any = {
      status: "published",
    }

    if (slug) {
      where.slug = slug
    }

    if (type) {
      where.type = type
    }

    if (category) {
      where.category = category
    }

    if (tag) {
      where.tags = {
        has: tag,
      }
    }

    const [content, total] = await Promise.all([
      prisma.contentPage.findMany({
        where,
        orderBy: {
          publishedAt: "desc",
        },
        take: limit,
        skip: offset,
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          type: true,
          featuredImage: true,
          author: true,
          publishedAt: true,
          tags: true,
          category: true,
          createdAt: true,
        },
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
