/**
 * API endpoint for batch scraping
 * POST /api/scraper/batch
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { BrokerScraper } from "@/lib/scrapers/broker-scraper"
import { ReviewScraper } from "@/lib/scrapers/review-scraper"
import { ScraperService } from "@/lib/scrapers/scraper-service"
import { ScraperSource } from "@/lib/scrapers/types"
import { z } from "zod"

const batchScrapeSchema = z.object({
  brokers: z.array(
    z.object({
      url: z.string().url(),
      source: z.enum([
        "brokerchooser",
        "stockbrokers",
        "broker_website",
        "investopedia",
        "nerdwallet",
      ]).optional(),
      brokerName: z.string().optional(),
    })
  ).optional(),
  reviews: z.array(
    z.object({
      url: z.string().url(),
      source: z.enum(["trustpilot", "brokerchooser", "stockbrokers"]).optional(),
      brokerIdOrSlug: z.string(),
      limit: z.number().int().min(1).max(100).optional(),
    })
  ).optional(),
})

export async function POST(request: NextRequest) {
  try {
    // Require authentication for batch operations
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = batchScrapeSchema.parse(body)

    const results = {
      brokers: [] as any[],
      reviews: [] as any[],
      errors: [] as string[],
    }

    const service = new ScraperService()

    // Scrape brokers
    if (validatedData.brokers && validatedData.brokers.length > 0) {
      for (const brokerConfig of validatedData.brokers) {
        try {
          const scraper = new BrokerScraper(
            (brokerConfig.source as ScraperSource) || "broker_website",
            {
              rateLimitDelay: 3000, // Slower for batch
              maxRetries: 3,
            }
          )

          const scrapeResult = await scraper.scrape(brokerConfig.url, {
            brokerName: brokerConfig.brokerName,
          })

          if (scrapeResult.success && scrapeResult.data) {
            const saveResult = await service.saveBrokerData(scrapeResult.data)
            results.brokers.push({
              url: brokerConfig.url,
              success: saveResult.success,
              brokerId: saveResult.brokerId,
              error: saveResult.error,
            })
          } else {
            results.errors.push(
              `Failed to scrape broker: ${brokerConfig.url} - ${scrapeResult.error}`
            )
          }
        } catch (error: any) {
          results.errors.push(
            `Error scraping broker ${brokerConfig.url}: ${error.message}`
          )
        }

        // Rate limiting between requests
        await new Promise((resolve) => setTimeout(resolve, 3000))
      }
    }

    // Scrape reviews
    if (validatedData.reviews && validatedData.reviews.length > 0) {
      for (const reviewConfig of validatedData.reviews) {
        try {
          const scraper = new ReviewScraper(
            (reviewConfig.source as ScraperSource) || "trustpilot",
            {
              rateLimitDelay: 3000,
              maxRetries: 3,
            }
          )

          const scrapeResult = await scraper.scrape(reviewConfig.url, {
            limit: reviewConfig.limit || 50,
          })

          if (scrapeResult.success && scrapeResult.data) {
            const saveResult = await service.saveReviews(
              reviewConfig.brokerIdOrSlug,
              scrapeResult.data
            )
            results.reviews.push({
              url: reviewConfig.url,
              brokerIdOrSlug: reviewConfig.brokerIdOrSlug,
              success: saveResult.success,
              savedCount: saveResult.savedCount,
              errors: saveResult.errors,
            })
          } else {
            results.errors.push(
              `Failed to scrape reviews: ${reviewConfig.url} - ${scrapeResult.error}`
            )
          }
        } catch (error: any) {
          results.errors.push(
            `Error scraping reviews ${reviewConfig.url}: ${error.message}`
          )
        }

        // Rate limiting between requests
        await new Promise((resolve) => setTimeout(resolve, 3000))
      }
    }

    return NextResponse.json({
      success: results.errors.length === 0,
      results,
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

    console.error("Error in batch scraping:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Internal server error",
      },
      { status: 500 }
    )
  }
}
