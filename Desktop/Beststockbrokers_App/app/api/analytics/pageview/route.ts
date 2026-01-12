import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      path,
      referrer,
      userAgent,
      utmSource,
      utmMedium,
      utmCampaign,
      utmTerm,
      utmContent,
    } = body

    if (!path) {
      return NextResponse.json({ error: "Path is required" }, { status: 400 })
    }

    // Track page view
    await prisma.pageView.create({
      data: {
        path,
        referrer: referrer || null,
        userAgent: userAgent || null,
        utmSource: utmSource || null,
        utmMedium: utmMedium || null,
        utmCampaign: utmCampaign || null,
        utmTerm: utmTerm || null,
        utmContent: utmContent || null,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error tracking page view:", error)
    return NextResponse.json(
      { error: "Failed to track page view" },
      { status: 500 }
    )
  }
}
