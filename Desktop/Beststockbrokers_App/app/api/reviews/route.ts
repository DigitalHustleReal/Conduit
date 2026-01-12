import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { z } from "zod"

const reviewSchema = z.object({
  brokerId: z.string(),
  authorName: z.string().min(1).max(100),
  authorEmail: z.string().email().optional().nullable(),
  rating: z.number().int().min(1).max(5),
  title: z.string().min(1).max(200).optional().nullable(),
  content: z.string().min(10).max(5000),
  verified: z.boolean().default(false),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = reviewSchema.parse(body)

    // Check if broker exists
    const broker = await prisma.broker.findUnique({
      where: { id: validatedData.brokerId },
    })

    if (!broker) {
      return NextResponse.json({ error: "Broker not found" }, { status: 404 })
    }

    // Create review (defaults to unverified, needs admin approval)
    const review = await prisma.brokerReview.create({
      data: {
        brokerId: validatedData.brokerId,
        authorName: validatedData.authorName,
        authorEmail: validatedData.authorEmail,
        rating: validatedData.rating,
        title: validatedData.title,
        content: validatedData.content,
        verified: false, // Require admin approval
      },
      include: {
        broker: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    })

    return NextResponse.json({ review, message: "Review submitted for approval" })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Error creating review:", error)
    return NextResponse.json(
      { error: "Failed to submit review" },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const brokerId = searchParams.get("brokerId")
    const verified = searchParams.get("verified")
    const limit = parseInt(searchParams.get("limit") || "20")
    const offset = parseInt(searchParams.get("offset") || "0")

    const where: any = {}
    if (brokerId) {
      where.brokerId = brokerId
    }
    if (verified !== null) {
      where.verified = verified === "true"
    }

    const [reviews, total] = await Promise.all([
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
