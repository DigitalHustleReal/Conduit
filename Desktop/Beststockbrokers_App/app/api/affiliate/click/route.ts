import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { cookies } from "next/headers"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { brokerId, source, referrer } = body

    if (!brokerId) {
      return NextResponse.json(
        { error: "Broker ID is required" },
        { status: 400 }
      )
    }

    // Get or create session ID
    const cookieStore = await cookies()
    let sessionId = cookieStore.get("session_id")?.value

    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      cookieStore.set("session_id", sessionId, {
        maxAge: 60 * 60 * 24 * 30, // 30 days
        httpOnly: true,
        sameSite: "lax",
      })
    }

    // Get client info
    const userAgent = request.headers.get("user-agent") || ""
    const ipAddress = request.headers.get("x-forwarded-for") || 
                     request.headers.get("x-real-ip") || 
                     "unknown"

    // Check if affiliate program exists for this broker
    const affiliateProgram = await prisma.affiliateProgram.findUnique({
      where: { brokerId },
    })

    if (!affiliateProgram || !affiliateProgram.isActive) {
      return NextResponse.json(
        { error: "Affiliate program not available for this broker" },
        { status: 404 }
      )
    }

    // Record the click
    const click = await prisma.affiliateClick.create({
      data: {
        affiliateProgramId: affiliateProgram.id,
        brokerId,
        sessionId,
        ipAddress,
        userAgent,
        referrer: referrer || null,
        clickedAt: new Date(),
      },
    })

    // Get tracking URL
    const trackingUrl = buildTrackingUrl(affiliateProgram, click.id, source)

    return NextResponse.json({
      success: true,
      clickId: click.id,
      trackingUrl,
    })
  } catch (error) {
    console.error("Error tracking affiliate click:", error)
    return NextResponse.json(
      { error: "Failed to track click" },
      { status: 500 }
    )
  }
}

function buildTrackingUrl(
  program: any,
  clickId: string,
  source?: string
): string {
  const baseUrl = program.trackingUrl
  const params = new URLSearchParams({
    affiliate_id: program.affiliateId,
    click_id: clickId,
    source: source || "beststockbrokers",
    utm_source: "beststockbrokers",
    utm_medium: "affiliate",
    utm_campaign: "broker_comparison",
  })

  return `${baseUrl}?${params.toString()}`
}

