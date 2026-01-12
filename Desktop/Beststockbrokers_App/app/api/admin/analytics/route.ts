import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/db"

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
    const days = parseInt(searchParams.get("days") || "30")

    const since = new Date()
    since.setDate(since.getDate() - days)

    // Get statistics
    const [
      totalPageViews,
      uniqueVisitors,
      totalSearches,
      pageViewsByDay,
      topPages,
      topBrokers,
      topSearches,
    ] = await Promise.all([
      // Total page views
      prisma.pageView.count({
        where: {
          createdAt: {
            gte: since,
          },
        },
      }),

      // Unique visitors (by user agent/IP approximation)
      prisma.pageView.groupBy({
        by: ["userAgent"],
        where: {
          createdAt: {
            gte: since,
          },
        },
      }).then((result) => result.length),

      // Total searches
      prisma.searchQuery.count({
        where: {
          createdAt: {
            gte: since,
          },
        },
      }),

      // Page views by day
      prisma.$queryRaw`
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM "PageView"
        WHERE created_at >= ${since}
        GROUP BY DATE(created_at)
        ORDER BY date DESC
        LIMIT ${days}
      `,

      // Top pages
      prisma.pageView.groupBy({
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
        take: 10,
      }),

      // Top brokers (by slug)
      prisma.pageView.findMany({
        where: {
          path: {
            startsWith: "/brokers/",
          },
          createdAt: {
            gte: since,
          },
        },
        take: 1000,
      }).then((views) => {
        const brokerCounts: Record<string, number> = {}
        views.forEach((view) => {
          const slug = view.path.replace("/brokers/", "")
          if (slug) {
            brokerCounts[slug] = (brokerCounts[slug] || 0) + 1
          }
        })
        return Object.entries(brokerCounts)
          .map(([slug, count]) => ({ slug, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10)
      }),

      // Top searches
      prisma.searchQuery.groupBy({
        by: ["query"],
        where: {
          createdAt: {
            gte: since,
          },
        },
        _count: {
          query: true,
        },
        orderBy: {
          _count: {
            query: "desc",
          },
        },
        take: 10,
      }),
    ])

    return NextResponse.json({
      stats: {
        totalPageViews,
        uniqueVisitors,
        totalSearches,
        days,
      },
      pageViewsByDay,
      topPages,
      topBrokers,
      topSearches,
    })
  } catch (error) {
    console.error("Error fetching analytics:", error)
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    )
  }
}
