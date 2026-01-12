/**
 * API endpoint for scraping broker reviews
 * POST /api/scraper/reviews
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { ReviewScraper } from "@/lib/scrapers/review-scraper"
import { ScraperService } from "@/lib/scrapers/scraper-service"
import { ScraperSource } from "@/lib/scrapers/types"
import { z } from "zod"

const scrapeReviewsSchema = z.object({
  url: z.string().url(),
  source: z.enum(["trustpilot", "brokerchooser", "stockbrokers"]).optional().default("trustpilot"),
  brokerIdOrSlug: z.string(),
  limit: z.number().int().min(1).max(100).optional().default(50),
  saveToDatabase: z.boolean().optional().default(true),
})

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // For production, require authentication or implement rate limiting
    // if (!user) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    // }

    const body = await request.json()
    const validatedData = scrapeReviewsSchema.parse(body)

    // Initialize scraper
    const scraper = new ReviewScraper(validatedData.source as ScraperSource, {
      rateLimitDelay: 2000,
      maxRetries: 3,
      timeout: 30000,
    })

    // Scrape reviews
    const result = await scraper.scrape(validatedData.url, {
      limit: validatedData.limit,
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
      savedResult = await service.saveReviews(
        validatedData.brokerIdOrSlug,
        result.data
      )

      if (!savedResult.success && savedResult.savedCount === 0) {
        return NextResponse.json(
          {
            success: false,
            error: savedResult.errors.join(", ") || "Failed to save reviews",
            scrapedReviews: result.data,
          },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      reviews: result.data,
      savedCount: savedResult?.savedCount || result.data.length,
      errors: savedResult?.errors || [],
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

    console.error("Error scraping reviews:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Internal server error",
      },
      { status: 500 }
    )
  }
}
