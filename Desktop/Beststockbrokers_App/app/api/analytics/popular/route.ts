import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get("limit") || "10")
    const days = parseInt(searchParams.get("days") || "30")

    const since = new Date()
    since.setDate(since.getDate() - days)

    // Get popular pages
    const popularPages = await prisma.pageView.groupBy({
      by: ["path"],
      where: {
        createdAt: {
          gte: since,
        },
      },
      _count: {
        path: true,
      },
      orderBy: {
        _count: {
          path: "desc",
        },
      },
      take: limit,
    })

    // Get popular brokers (by path matching /brokers/[slug])
    const brokerViews = await prisma.pageView.findMany({
      where: {
        path: {
          startsWith: "/brokers/",
        },
        createdAt: {
          gte: since,
        },
      },
    })

    const brokerCounts: Record<string, number> = {}
    brokerViews.forEach((view) => {
      const slug = view.path.replace("/brokers/", "")
      brokerCounts[slug] = (brokerCounts[slug] || 0) + 1
    })

    const popularBrokers = Object.entries(brokerCounts)
      .map(([slug, count]) => ({ slug, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)

    return NextResponse.json({
      popularPages,
      popularBrokers,
    })
  } catch (error) {
    console.error("Error fetching popular analytics:", error)
    return NextResponse.json(
      { error: "Failed to fetch popular analytics" },
      { status: 500 }
    )
  }
}
