/**
 * Review scraper
 * Scrapes broker reviews from various sources
 */

import { BaseScraper } from "./base-scraper"
import {
  ScrapedReview,
  ScraperResult,
  ScraperSource,
  ScraperConfig,
} from "./types"

export class ReviewScraper extends BaseScraper {
  private source: ScraperSource

  constructor(source: ScraperSource = "trustpilot", config?: ScraperConfig) {
    super(config)
    this.source = source
  }

  /**
   * Main scrape method
   */
  async scrape(
    url: string,
    options?: { brokerName?: string; limit?: number }
  ): Promise<ScraperResult<ScrapedReview[]>> {
    try {
      let reviews: ScrapedReview[] = []

      switch (this.source) {
        case "trustpilot":
          reviews = await this.scrapeTrustpilot(url, options?.limit)
          break
        case "brokerchooser":
          reviews = await this.scrapeBrokerChooserReviews(url, options?.limit)
          break
        case "stockbrokers":
          reviews = await this.scrapeStockBrokersReviews(url, options?.limit)
          break
        default:
          throw new Error(`Unsupported review source: ${this.source}`)
      }

      return {
        success: true,
        data: reviews,
        source: this.source,
        timestamp: new Date(),
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Unknown error",
        source: this.source,
        timestamp: new Date(),
      }
    }
  }

  /**
   * Scrape reviews from Trustpilot
   */
  private async scrapeTrustpilot(
    url: string,
    limit: number = 50
  ): Promise<ScrapedReview[]> {
    try {
      // Trustpilot API or scraping approach
      // Note: Trustpilot has API access - prefer API over scraping
      // This is a basic implementation
      const html = await this.parseHTML(url)

      const reviews: ScrapedReview[] = []

      // Extract reviews from HTML
      // Trustpilot uses specific class names and data attributes
      // This is a simplified example - implement based on actual structure

      // Regex-based extraction (simplified)
      const reviewBlocks = html.match(
        /<article[^>]*class="[^"]*review[^"]*"[^>]*>(.*?)<\/article>/gis
      )

      if (reviewBlocks) {
        for (let i = 0; i < Math.min(reviewBlocks.length, limit); i++) {
          const block = reviewBlocks[i]

          // Extract rating
          const ratingMatch = block.match(/data-service-review-rating=["'](\d+)["']/i)
          const rating = ratingMatch ? parseInt(ratingMatch[1]) : 0

          // Extract review text
          const textMatch = block.match(/<p[^>]*class="[^"]*review-text[^"]*"[^>]*>(.*?)<\/p>/is)
          const content = textMatch
            ? textMatch[1].replace(/<[^>]+>/g, "").trim()
            : ""

          // Extract reviewer name
          const nameMatch = block.match(/<span[^>]*class="[^"]*consumer-name[^"]*"[^>]*>(.*?)<\/span>/is)
          const reviewerName = nameMatch
            ? nameMatch[1].replace(/<[^>]+>/g, "").trim()
            : ""

          // Extract date
          const dateMatch = block.match(/datetime=["']([^"']+)["']/i)
          const date = dateMatch ? new Date(dateMatch[1]) : undefined

          if (content && rating > 0) {
            reviews.push({
              rating,
              content,
              reviewerName,
              date,
              verified: true, // Trustpilot reviews are verified
              source: "trustpilot",
              sourceUrl: url,
            })
          }
        }
      }

      return reviews
    } catch (error: any) {
      console.error("Error scraping Trustpilot:", error)
      return []
    }
  }

  /**
   * Scrape reviews from BrokerChooser
   */
  private async scrapeBrokerChooserReviews(
    url: string,
    limit: number = 50
  ): Promise<ScrapedReview[]> {
    const html = await this.parseHTML(url)
    const reviews: ScrapedReview[] = []

    // Extract reviews from BrokerChooser review section
    // Implement specific parsing logic
    const reviewBlocks = html.match(/<div[^>]*class="[^"]*review[^"]*"[^>]*>(.*?)<\/div>/gis)

    if (reviewBlocks) {
      for (let i = 0; i < Math.min(reviewBlocks.length, limit); i++) {
        const block = reviewBlocks[i]

        // Extract rating (usually out of 5)
        const ratingMatch = block.match(/rating["']?\s*:?\s*(\d+\.?\d*)/i)
        const rating = ratingMatch ? parseFloat(ratingMatch[1]) : 0

        // Extract review text
        const textMatch = block.match(/<p[^>]*>(.*?)<\/p>/is)
        const content = textMatch
          ? textMatch[1].replace(/<[^>]+>/g, "").trim()
          : ""

        if (content && rating > 0) {
          reviews.push({
            rating,
            content,
            source: "brokerchooser",
            sourceUrl: url,
          })
        }
      }
    }

    return reviews
  }

  /**
   * Scrape reviews from StockBrokers.com
   */
  private async scrapeStockBrokersReviews(
    url: string,
    limit: number = 50
  ): Promise<ScrapedReview[]> {
    const html = await this.parseHTML(url)
    const reviews: ScrapedReview[] = []

    // Extract reviews from StockBrokers.com
    // Implement specific parsing logic based on their structure

    return reviews
  }

  /**
   * Scrape reviews from multiple sources and combine
   */
  async scrapeMultiple(
    urls: { url: string; source: ScraperSource }[],
    limitPerSource: number = 25
  ): Promise<ScrapedReview[]> {
    const allReviews: ScrapedReview[] = []

    for (const { url, source } of urls) {
      const scraper = new ReviewScraper(source, this.config)
      const result = await scraper.scrape(url, { limit: limitPerSource })

      if (result.success && result.data) {
        allReviews.push(...result.data)
      }

      // Rate limiting between sources
      await this.waitForRateLimit()
    }

    // Sort by date (newest first)
    return allReviews.sort((a, b) => {
      const dateA = a.date?.getTime() || 0
      const dateB = b.date?.getTime() || 0
      return dateB - dateA
    })
  }
}
