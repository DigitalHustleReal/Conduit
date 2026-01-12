/**
 * Broker details scraper
 * Scrapes broker information from various sources
 */

import { BaseScraper } from "./base-scraper"
import {
  ScrapedBrokerData,
  ScraperResult,
  ScraperSource,
  ScraperConfig,
} from "./types"
import { BrokerClassifier } from "./classifier"

export class BrokerScraper extends BaseScraper {
  private source: ScraperSource

  constructor(source: ScraperSource = "broker_website", config?: ScraperConfig) {
    super(config)
    this.source = source
  }

  /**
   * Main scrape method
   */
  async scrape(
    url: string,
    options?: { brokerName?: string }
  ): Promise<ScraperResult<ScrapedBrokerData>> {
    try {
      let data: ScrapedBrokerData | undefined

      switch (this.source) {
        case "brokerchooser":
          data = await this.scrapeBrokerChooser(url)
          break
        case "stockbrokers":
          data = await this.scrapeStockBrokers(url)
          break
        case "broker_website":
          data = await this.scrapeBrokerWebsite(url, options?.brokerName)
          break
        case "investopedia":
          data = await this.scrapeInvestopedia(url)
          break
        case "nerdwallet":
          data = await this.scrapeNerdWallet(url)
          break
      default:
        throw new Error(`Unsupported source: ${this.source}`)
      }

      if (!data) {
        return {
          success: false,
          error: "No data scraped",
          source: this.source,
          timestamp: new Date(),
        }
      }

      // Classify broker based on scraped data
      const classifier = new BrokerClassifier()
      const classification = classifier.classifyBroker(data)
      
      // Add classification to scraped data
      data.classification = classification
      data.brokerType = classification.primaryType

      return {
        success: true,
        data,
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
   * Scrape from BrokerChooser
   */
  private async scrapeBrokerChooser(url: string): Promise<ScrapedBrokerData> {
    // This is a placeholder - implement actual scraping logic
    // BrokerChooser has structured data that can be scraped
    const html = await this.parseHTML(url)

    // Extract data using regex/DOM parsing
    // Note: In production, use cheerio or jsdom for better parsing
    const nameMatch = html.match(/<h1[^>]*>(.*?)<\/h1>/i)
    const name = nameMatch ? this.extractText({ text: () => nameMatch[1] }) : ""

    return {
      name,
      websiteUrl: url,
      source: "brokerchooser",
      sourceUrl: url,
    }
  }

  /**
   * Scrape from StockBrokers.com
   */
  private async scrapeStockBrokers(url: string): Promise<ScrapedBrokerData> {
    const html = await this.parseHTML(url)

    // Extract broker information
    // Implement specific parsing logic for stockbrokers.com structure
    const nameMatch = html.match(/<title[^>]*>(.*?)<\/title>/i)
    const name = nameMatch
      ? nameMatch[1].replace(/\s*-\s*StockBrokers\.com.*/i, "").trim()
      : ""

    return {
      name,
      websiteUrl: url,
      source: "stockbrokers",
      sourceUrl: url,
    }
  }

  /**
   * Scrape directly from broker website
   */
  private async scrapeBrokerWebsite(
    url: string,
    brokerName?: string
  ): Promise<ScrapedBrokerData> {
    try {
      const html = await this.parseHTML(url)

      // Try to extract structured data (JSON-LD)
      const jsonLdMatch = html.match(
        /<script[^>]*type=["']application\/ld\+json["'][^>]*>(.*?)<\/script>/is
      )

      if (jsonLdMatch) {
        try {
          const structuredData = JSON.parse(jsonLdMatch[1])
          if (structuredData["@type"] === "Organization") {
            return {
              name: structuredData.name || brokerName || "",
              description: structuredData.description,
              websiteUrl: structuredData.url || url,
              logoUrl: structuredData.logo?.url || structuredData.logo,
              foundedYear: structuredData.foundingDate
                ? new Date(structuredData.foundingDate).getFullYear()
                : undefined,
              source: "broker_website",
              sourceUrl: url,
            }
          }
        } catch (e) {
          // Fall through to basic parsing
        }
      }

      // Basic metadata extraction
      const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i)
      const name =
        titleMatch?.replace(/<[^>]+>/g, "").split("|")[0].trim() || brokerName || ""

      const metaDescMatch = html.match(
        /<meta[^>]*name=["']description["'][^>]*content=["'](.*?)["']/i
      )
      const description = metaDescMatch ? metaDescMatch[1] : undefined

      return {
        name,
        description,
        websiteUrl: url,
        source: "broker_website",
        sourceUrl: url,
      }
    } catch (error: any) {
      throw new Error(`Failed to scrape broker website: ${error.message}`)
    }
  }

  /**
   * Scrape from Investopedia
   */
  private async scrapeInvestopedia(url: string): Promise<ScrapedBrokerData> {
    const html = await this.parseHTML(url)

    // Investopedia has structured broker reviews
    // Extract relevant information
    const nameMatch = html.match(/<h1[^>]*>(.*?)<\/h1>/i)
    const name = nameMatch
      ? this.extractText({ text: () => nameMatch[1] }).replace(/Review.*/i, "").trim()
      : ""

    return {
      name,
      websiteUrl: url,
      source: "investopedia",
      sourceUrl: url,
    }
  }

  /**
   * Scrape from NerdWallet
   */
  private async scrapeNerdWallet(url: string): Promise<ScrapedBrokerData> {
    const html = await this.parseHTML(url)

    // Extract broker information from NerdWallet review pages
    const nameMatch = html.match(/<h1[^>]*>(.*?)<\/h1>/i)
    const name = nameMatch
      ? this.extractText({ text: () => nameMatch[1] }).replace(/Review.*/i, "").trim()
      : ""

    return {
      name,
      websiteUrl: url,
      source: "nerdwallet",
      sourceUrl: url,
    }
  }

  /**
   * Multi-source scraping: combine data from multiple sources
   */
  async scrapeMultiple(
    urls: { url: string; source: ScraperSource }[]
  ): Promise<ScrapedBrokerData> {
    const results: ScrapedBrokerData[] = []

    for (const { url, source } of urls) {
      const scraper = new BrokerScraper(source, this.config)
      const result = await scraper.scrape(url)

      if (result.success && result.data) {
        results.push(result.data)
      }

      // Rate limiting between sources
      await this.waitForRateLimit()
    }

    // Merge results (later sources override earlier ones)
    return results.reduce(
      (merged, current) => ({ ...merged, ...current }),
      {} as ScrapedBrokerData
    )
  }
}
