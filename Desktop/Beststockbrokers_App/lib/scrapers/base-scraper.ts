/**
 * Base scraper class with common functionality
 * Provides rate limiting, error handling, retries, and logging
 */

import { ScraperConfig, ScraperResult } from "./types"

export abstract class BaseScraper {
  protected config: Required<ScraperConfig>
  protected lastRequestTime: number = 0

  constructor(config: ScraperConfig = {}) {
    this.config = {
      rateLimitDelay: config.rateLimitDelay ?? 2000, // 2 seconds default
      maxRetries: config.maxRetries ?? 3,
      timeout: config.timeout ?? 30000, // 30 seconds
      userAgent:
        config.userAgent ??
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      headers: config.headers ?? {},
      proxy: config.proxy ?? "",
    }
  }

  /**
   * Fetch with rate limiting, retries, and error handling
   */
  protected async fetchWithRetry(
    url: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const maxRetries = this.config.maxRetries
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Rate limiting
        await this.waitForRateLimit()

        // Add default headers
        const headers = {
          "User-Agent": this.config.userAgent,
          ...this.config.headers,
          ...options.headers,
        }

        // Create abort controller for timeout
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout)

        try {
          const response = await fetch(url, {
            ...options,
            headers,
            signal: controller.signal,
          })

          clearTimeout(timeoutId)

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
          }

          return response
        } catch (error: any) {
          clearTimeout(timeoutId)
          if (error.name === "AbortError") {
            throw new Error(`Request timeout after ${this.config.timeout}ms`)
          }
          throw error
        }
      } catch (error: any) {
        lastError = error
        const isLastAttempt = attempt === maxRetries

        if (isLastAttempt) {
          break
        }

        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000)
        console.warn(
          `Attempt ${attempt}/${maxRetries} failed for ${url}. Retrying in ${delay}ms...`
        )
        await this.sleep(delay)
      }
    }

    throw lastError || new Error("Unknown error in fetchWithRetry")
  }

  /**
   * Rate limiting: wait if needed before next request
   */
  protected async waitForRateLimit(): Promise<void> {
    const now = Date.now()
    const timeSinceLastRequest = now - this.lastRequestTime

    if (timeSinceLastRequest < this.config.rateLimitDelay) {
      const waitTime = this.config.rateLimitDelay - timeSinceLastRequest
      await this.sleep(waitTime)
    }

    this.lastRequestTime = Date.now()
  }

  /**
   * Sleep utility
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * Parse HTML text (for use with cheerio if needed)
   */
  protected async parseHTML(url: string): Promise<string> {
    const response = await this.fetchWithRetry(url)
    return await response.text()
  }

  /**
   * Parse JSON response
   */
  protected async parseJSON<T>(url: string): Promise<T> {
    const response = await this.fetchWithRetry(url)
    return await response.json()
  }

  /**
   * Extract text from HTML element (helper for cheerio/jSDOM)
   */
  protected extractText(element: any): string {
    return element?.text()?.trim() || element?.textContent?.trim() || ""
  }

  /**
   * Extract number from text
   */
  protected extractNumber(text: string): number | null {
    const match = text.match(/[\d,.]+/)
    if (!match) return null
    return parseFloat(match[0].replace(/,/g, ""))
  }

  /**
   * Extract currency and amount
   */
  protected extractCurrencyAmount(text: string): {
    amount: number | null
    currency: string | null
  } {
    const currencyMatch = text.match(/([A-Z]{3}|\$|€|£)/)
    const amountMatch = text.match(/[\d,.]+/)

    return {
      amount: amountMatch ? parseFloat(amountMatch[0].replace(/,/g, "")) : null,
      currency: currencyMatch ? currencyMatch[1] : null,
    }
  }

  /**
   * Generate slug from name
   */
  protected generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
  }

  /**
   * Abstract method to be implemented by subclasses
   */
  abstract scrape(url: string, options?: any): Promise<ScraperResult<any>>

  /**
   * Validate scraped data
   */
  protected validateData<T>(data: T, validator: (d: T) => boolean): boolean {
    try {
      return validator(data)
    } catch (error) {
      console.error("Validation error:", error)
      return false
    }
  }
}
