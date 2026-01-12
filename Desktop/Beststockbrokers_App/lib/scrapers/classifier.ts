/**
 * Broker Classification System
 * Classifies brokers by type, geography, and other attributes
 */

import { ScrapedBrokerData } from "./types"

export type BrokerType =
  | "full_service"
  | "discount"
  | "robo_advisor"
  | "day_trading"
  | "forex"
  | "crypto"
  | "options_focused"
  | "international"
  | "commission_free"
  | "premium"
  | "social_trading"
  | "other"

export type BrokerCategory = {
  type: BrokerType
  confidence: number // 0-1
  reasons: string[]
}

export interface BrokerClassification {
  types: BrokerCategory[]
  primaryType: BrokerType
  geography: GeographyInfo
  targetMarket: TargetMarket
}

export interface GeographyInfo {
  primaryCountry?: string
  primaryRegion?: string
  supportedRegions: string[]
  isGlobal: boolean
}

export type TargetMarket =
  | "beginner"
  | "intermediate"
  | "advanced"
  | "professional"
  | "institutional"
  | "mixed"

/**
 * Broker Type Classifier
 */
export class BrokerClassifier {
  /**
   * Classify broker based on scraped data
   */
  classifyBroker(data: ScrapedBrokerData): BrokerClassification {
    const types = this.identifyTypes(data)
    const geography = this.identifyGeography(data)
    const targetMarket = this.identifyTargetMarket(data)

    // Find primary type (highest confidence)
    const primaryType =
      types.length > 0
        ? types.reduce((prev, current) =>
            current.confidence > prev.confidence ? current : prev
          ).type
        : "other"

    return {
      types,
      primaryType,
      geography,
      targetMarket,
    }
  }

  /**
   * Identify broker types
   */
  private identifyTypes(data: ScrapedBrokerData): BrokerCategory[] {
    const categories: BrokerCategory[] = []

    const name = data.name?.toLowerCase() || ""
    const description = data.description?.toLowerCase() || ""
    const shortDesc = data.shortDescription?.toLowerCase() || ""
    const text = `${name} ${description} ${shortDesc}`.toLowerCase()

    // Full Service Broker
    if (
      this.matchesKeywords(text, [
        "full service",
        "full-service",
        "wealth management",
        "financial advisor",
        "investment advisory",
        "portfolio management",
        "comprehensive services",
      ]) ||
      name.includes("schwab") ||
      name.includes("fidelity") ||
      name.includes("morgan stanley") ||
      name.includes("merrill")
    ) {
      categories.push({
        type: "full_service",
        confidence: this.calculateConfidence(text, [
          "full service",
          "wealth management",
          "financial advisor",
        ]),
        reasons: ["Offers comprehensive financial services"],
      })
    }

    // Discount Broker
    if (
      this.matchesKeywords(text, [
        "discount broker",
        "low cost",
        "low-cost",
        "low commission",
        "low fees",
        "cheap trading",
        "affordable",
      ]) ||
      name.includes("interactive brokers") ||
      name.includes("td ameritrade")
    ) {
      categories.push({
        type: "discount",
        confidence: this.calculateConfidence(text, [
          "discount",
          "low cost",
          "low fees",
        ]),
        reasons: ["Low-cost trading platform"],
      })
    }

    // Commission-Free Broker
    if (
      this.matchesKeywords(text, [
        "zero commission",
        "zero-commission",
        "commission free",
        "commission-free",
        "no commission",
        "no-commission",
        "free trading",
        "$0 commission",
      ]) ||
      name.includes("robinhood") ||
      name.includes("webull") ||
      name.includes("sofi")
    ) {
      categories.push({
        type: "commission_free",
        confidence: this.calculateConfidence(text, [
          "zero commission",
          "commission free",
          "$0 commission",
        ]),
        reasons: ["Commission-free trading"],
      })
    }

    // Robo Advisor
    if (
      this.matchesKeywords(text, [
        "robo advisor",
        "robo-advisor",
        "automated investing",
        "algorithmic",
        "digital advisor",
        "automated portfolio",
      ]) ||
      name.includes("betterment") ||
      name.includes("wealthfront") ||
      name.includes("acorns")
    ) {
      categories.push({
        type: "robo_advisor",
        confidence: this.calculateConfidence(text, [
          "robo advisor",
          "automated investing",
        ]),
        reasons: ["Automated investment management"],
      })
    }

    // Day Trading Broker
    if (
      this.matchesKeywords(text, [
        "day trading",
        "active trader",
        "scalping",
        "high frequency",
        "pattern day trader",
      ]) ||
      name.includes("tradestation") ||
      name.includes("lightspeed")
    ) {
      categories.push({
        type: "day_trading",
        confidence: this.calculateConfidence(text, [
          "day trading",
          "active trader",
        ]),
        reasons: ["Specialized for active/day trading"],
      })
    }

    // Options Focused
    if (
      this.matchesKeywords(text, [
        "options trading",
        "options specialist",
        "complex options",
        "options platform",
      ]) ||
      name.includes("tastyworks") ||
      name.includes("thinkorswim")
    ) {
      categories.push({
        type: "options_focused",
        confidence: this.calculateConfidence(text, [
          "options trading",
          "options platform",
        ]),
        reasons: ["Specialized options trading platform"],
      })
    }

    // Forex Broker
    if (
      this.matchesKeywords(text, [
        "forex",
        "fx trading",
        "currency trading",
        "foreign exchange",
        "cfd",
      ]) ||
      name.includes("fxcm") ||
      name.includes("oanda") ||
      name.includes("ig markets")
    ) {
      categories.push({
        type: "forex",
        confidence: this.calculateConfidence(text, ["forex", "fx trading"]),
        reasons: ["Forex/currency trading focus"],
      })
    }

    // Crypto Broker
    if (
      this.matchesKeywords(text, [
        "cryptocurrency",
        "crypto trading",
        "bitcoin",
        "digital assets",
        "blockchain",
      ]) ||
      name.includes("coinbase") ||
      name.includes("binance") ||
      name.includes("kraken")
    ) {
      categories.push({
        type: "crypto",
        confidence: this.calculateConfidence(text, [
          "cryptocurrency",
          "crypto trading",
        ]),
        reasons: ["Cryptocurrency trading focus"],
      })
    }

    // Social Trading
    if (
      this.matchesKeywords(text, [
        "social trading",
        "copy trading",
        "mirror trading",
        "follow traders",
      ]) ||
      name.includes("etoro") ||
      name.includes("zuluTrade")
    ) {
      categories.push({
        type: "social_trading",
        confidence: this.calculateConfidence(text, [
          "social trading",
          "copy trading",
        ]),
        reasons: ["Social/copy trading platform"],
      })
    }

    // International Broker
    if (
      data.supportedCountries &&
      data.supportedCountries.length > 5 &&
      !data.supportedCountries.includes("US")
    ) {
      categories.push({
        type: "international",
        confidence: 0.8,
        reasons: ["Supports multiple countries, non-US focus"],
      })
    }

    // Premium Broker
    if (
      this.matchesKeywords(text, [
        "premium",
        "exclusive",
        "high net worth",
        "private client",
        "institutional",
      ]) ||
      (data.minimumDeposit && data.minimumDeposit > 10000)
    ) {
      categories.push({
        type: "premium",
        confidence: this.calculateConfidence(text, ["premium", "exclusive"]),
        reasons: ["Premium/high-end service"],
      })
    }

    // Sort by confidence
    return categories.sort((a, b) => b.confidence - a.confidence)
  }

  /**
   * Identify geography information
   */
  private identifyGeography(data: ScrapedBrokerData): GeographyInfo {
    const supportedCountries = data.supportedCountries || []
    const headquartersCountry = data.headquartersCountry

    // Identify primary country
    const primaryCountry = headquartersCountry || supportedCountries[0]

    // Identify regions
    const regions = this.getRegions(supportedCountries)
    const primaryRegion = regions.length > 0 ? regions[0] : undefined

    // Check if global (supports 10+ countries across multiple regions)
    const isGlobal = supportedCountries.length >= 10 && regions.length >= 2

    return {
      primaryCountry,
      primaryRegion,
      supportedRegions: regions,
      isGlobal,
    }
  }

  /**
   * Get regions from country codes
   */
  private getRegions(countries: string[]): string[] {
    const regionMap: Record<string, string[]> = {
      north_america: ["US", "CA", "MX"],
      europe: [
        "GB",
        "DE",
        "FR",
        "IT",
        "ES",
        "NL",
        "BE",
        "AT",
        "CH",
        "SE",
        "NO",
        "DK",
        "FI",
        "PL",
        "IE",
        "PT",
        "GR",
      ],
      asia_pacific: [
        "AU",
        "NZ",
        "JP",
        "CN",
        "HK",
        "SG",
        "KR",
        "IN",
        "TW",
        "TH",
        "MY",
        "ID",
        "PH",
      ],
      latin_america: ["BR", "AR", "CL", "CO", "PE", "MX"],
      middle_east: ["AE", "SA", "IL", "TR"],
      africa: ["ZA", "EG", "KE", "NG"],
    }

    const foundRegions = new Set<string>()

    for (const country of countries) {
      for (const [region, codes] of Object.entries(regionMap)) {
        if (codes.includes(country.toUpperCase())) {
          foundRegions.add(region)
        }
      }
    }

    return Array.from(foundRegions)
  }

  /**
   * Identify target market
   */
  private identifyTargetMarket(data: ScrapedBrokerData): TargetMarket {
    const text = `${data.name} ${data.description} ${data.shortDescription}`
      .toLowerCase()

    // Beginner indicators
    if (
      this.matchesKeywords(text, [
        "beginner",
        "easy to use",
        "user friendly",
        "simple",
        "starter",
        "novice",
        "learning",
        "education",
      ]) ||
      (data.minimumDeposit !== undefined && data.minimumDeposit === 0)
    ) {
      return "beginner"
    }

    // Professional/Institutional indicators
    if (
      this.matchesKeywords(text, [
        "professional",
        "institutional",
        "prime broker",
        "execution only",
        "api access",
        "advanced tools",
      ]) ||
      (data.minimumDeposit && data.minimumDeposit > 100000)
    ) {
      return "professional"
    }

    // Advanced indicators
    if (
      this.matchesKeywords(text, [
        "advanced",
        "sophisticated",
        "complex",
        "powerful",
        "professional platform",
      ])
    ) {
      return "advanced"
    }

    // Default to mixed if no clear indicators
    return "mixed"
  }

  /**
   * Check if text matches any keywords
   */
  private matchesKeywords(text: string, keywords: string[]): boolean {
    return keywords.some((keyword) => text.includes(keyword.toLowerCase()))
  }

  /**
   * Calculate confidence based on keyword matches
   */
  private calculateConfidence(
    text: string,
    keywords: string[]
  ): number {
    const matches = keywords.filter((keyword) =>
      text.includes(keyword.toLowerCase())
    ).length
    return Math.min(matches / keywords.length, 1.0)
  }

  /**
   * Get broker type label for display
   */
  static getTypeLabel(type: BrokerType): string {
    const labels: Record<BrokerType, string> = {
      full_service: "Full Service Broker",
      discount: "Discount Broker",
      robo_advisor: "Robo Advisor",
      day_trading: "Day Trading Broker",
      forex: "Forex Broker",
      crypto: "Cryptocurrency Broker",
      options_focused: "Options Trading Broker",
      international: "International Broker",
      commission_free: "Commission-Free Broker",
      premium: "Premium Broker",
      social_trading: "Social Trading Platform",
      other: "Other",
    }
    return labels[type] || "Other"
  }

  /**
   * Get broker type description
   */
  static getTypeDescription(type: BrokerType): string {
    const descriptions: Record<BrokerType, string> = {
      full_service:
        "Provides comprehensive financial services including investment advice, portfolio management, and planning",
      discount: "Offers trading services at lower costs with minimal advice",
      robo_advisor:
        "Automated investment management using algorithms and minimal human intervention",
      day_trading:
        "Specialized platform for active traders and day trading with advanced tools",
      forex: "Focuses on foreign exchange and currency trading",
      crypto: "Specialized in cryptocurrency and digital asset trading",
      options_focused:
        "Optimized platform for options trading with advanced strategies",
      international:
        "Broker operating across multiple countries and regions globally",
      commission_free: "No commission fees on stock trades",
      premium:
        "High-end service for affluent clients with exclusive features",
      social_trading:
        "Platform allowing users to copy trades from other traders",
      other: "General broker type",
    }
    return descriptions[type] || ""
  }
}
