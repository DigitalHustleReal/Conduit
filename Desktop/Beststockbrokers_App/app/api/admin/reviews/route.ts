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
    const verified = searchParams.get("verified")
    const brokerId = searchParams.get("brokerId")
    const limit = parseInt(searchParams.get("limit") || "50")
    const offset = parseInt(searchParams.get("offset") || "0")

    const where: any = {}
    if (verified !== null) {
      where.verified = verified === "true"
    }
    if (brokerId) {
      where.brokerId = brokerId
    }

    const [reviews, total, pendingCount] = await Promise.all([
      prisma.brokerReview.findMany({
        where,
        include: {
          broker: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: limit,
        skip: offset,
      }),
      prisma.brokerReview.count({ where }),
      prisma.brokerReview.count({ where: { verified: false } }),
    ])

    return NextResponse.json({
      reviews,
      total,
      pendingCount,
      limit,
      offset,
    })
  } catch (error) {
    console.error("Error fetching reviews:", error)
    return NextResponse.json(
      { error: "Failed to fetch reviews" },
      { status: 500 }
    )
  }
}
