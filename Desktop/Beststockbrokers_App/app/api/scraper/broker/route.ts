/**
 * API endpoint for scraping broker data
 * POST /api/scraper/broker
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { BrokerScraper } from "@/lib/scrapers/broker-scraper"
import { ScraperService } from "@/lib/scrapers/scraper-service"
import { ScraperSource } from "@/lib/scrapers/types"
import { z } from "zod"

const scrapeBrokerSchema = z.object({
  url: z.string().url(),
  source: z.enum([
    "brokerchooser",
    "stockbrokers",
    "broker_website",
    "investopedia",
    "nerdwallet",
  ]).optional().default("broker_website"),
  brokerName: z.string().optional(),
  saveToDatabase: z.boolean().optional().default(true),
})

export async function POST(request: NextRequest) {
  try {
    // Check authentication (optional - can be public with rate limiting)
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // For production, require authentication or implement rate limiting
    // if (!user) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    // }

    const body = await request.json()
    const validatedData = scrapeBrokerSchema.parse(body)

    // Initialize scraper
    const scraper = new BrokerScraper(
      validatedData.source as ScraperSource,
      {
        rateLimitDelay: 2000,
        maxRetries: 3,
        timeout: 30000,
      }
    )

    // Scrape data
    const result = await scraper.scrape(validatedData.url, {
      brokerName: validatedData.brokerName,
    })

    if (!result.success || !result.data) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Scraping failed",
        },
        { status: 400 }
      )
    }

    // Save to database if requested
    let savedResult = null
    if (validatedData.saveToDatabase) {
      const service = new ScraperService()
      savedResult = await service.saveBrokerData(result.data)

      if (!savedResult.success) {
        return NextResponse.json(
          {
            success: false,
            error: savedResult.error || "Failed to save data",
            scrapedData: result.data,
          },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      brokerId: savedResult?.brokerId,
      source: result.source,
      timestamp: result.timestamp,
    })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation error",
          details: error.errors,
        },
        { status: 400 }
      )
    }

    console.error("Error scraping broker:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Internal server error",
      },
      { status: 500 }
    )
  }
}
