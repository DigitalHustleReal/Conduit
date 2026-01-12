import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const broker = await prisma.broker.findUnique({
      where: {
        slug: params.slug,
        isActive: true,
      },
      include: {
        fees: true,
        features: true,
        platforms: true,
        ratings: true,
        reviews: {
          where: {
            verified: true,
          },
          take: 10,
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    })

    if (!broker) {
      return NextResponse.json(
        { error: "Broker not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(broker)
  } catch (error) {
    console.error("Error fetching broker:", error)
    return NextResponse.json(
      { error: "Failed to fetch broker" },
      { status: 500 }
    )
  }
}






