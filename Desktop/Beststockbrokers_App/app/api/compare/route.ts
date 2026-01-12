import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const brokerIds = searchParams.get("ids")?.split(",") || []

    if (brokerIds.length === 0) {
      return NextResponse.json(
        { error: "No broker IDs provided" },
        { status: 400 }
      )
    }

    const brokers = await prisma.broker.findMany({
      where: {
        id: {
          in: brokerIds,
        },
        isActive: true,
      },
      include: {
        fees: {
          orderBy: {
            instrumentType: "asc",
          },
        },
        features: {
          orderBy: {
            category: "asc",
          },
        },
        platforms: true,
        ratings: true,
      },
    })

    return NextResponse.json({ brokers })
  } catch (error) {
    console.error("Error comparing brokers:", error)
    return NextResponse.json(
      { error: "Failed to compare brokers" },
      { status: 500 }
    )
  }
}






