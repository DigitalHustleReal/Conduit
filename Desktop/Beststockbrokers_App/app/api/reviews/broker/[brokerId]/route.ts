import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(
  request: NextRequest,
  { params }: { params: { brokerId: string } }
) {
  try {
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get("limit") || "10")
    const offset = parseInt(searchParams.get("offset") || "0")

    const [reviews, total] = await Promise.all([
      prisma.brokerReview.findMany({
        where: {
          brokerId: params.brokerId,
          verified: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: limit,
        skip: offset,
      }),
      prisma.brokerReview.count({
        where: {
          brokerId: params.brokerId,
          verified: true,
        },
      }),
    ])

    return NextResponse.json({ reviews, total, limit, offset })
  } catch (error) {
    console.error("Error fetching reviews:", error)
    return NextResponse.json(
      { error: "Failed to fetch reviews" },
      { status: 500 }
    )
  }
}
