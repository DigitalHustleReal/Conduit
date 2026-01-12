import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { query, resultsCount } = body

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 })
    }

    // Track search query
    await prisma.searchQuery.create({
      data: {
        query,
        resultsCount: resultsCount || 0,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error tracking search query:", error)
    return NextResponse.json(
      { error: "Failed to track search query" },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get("limit") || "50")
    const days = parseInt(searchParams.get("days") || "30")

    const since = new Date()
    since.setDate(since.getDate() - days)

    const queries = await prisma.searchQuery.groupBy({
      by: ["query"],
      where: {
        createdAt: {
          gte: since,
        },
      },
      _count: {
        query: true,
      },
      _sum: {
        resultsCount: true,
      },
      orderBy: {
        _count: {
          query: "desc",
        },
      },
      take: limit,
    })

    return NextResponse.json({ queries })
  } catch (error) {
    console.error("Error fetching search analytics:", error)
    return NextResponse.json(
      { error: "Failed to fetch search analytics" },
      { status: 500 }
    )
  }
}
