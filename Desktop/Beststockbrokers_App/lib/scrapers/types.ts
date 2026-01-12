/**
 * Types and interfaces for the scraping system
 */

export interface ScrapedBrokerData {
  name: string
  slug?: string
  description?: string
  shortDescription?: string
  websiteUrl: string
  logoUrl?: string
  foundedYear?: number
  headquartersCountry?: string
  headquartersCity?: string
  minimumDeposit?: number
  baseCurrency?: string
  isRegulated?: boolean
  regulationBodies?: string[]
  accountTypes?: string[]
  supportedCountries?: string[]
  languagesSupported?: string[]
  fees?: ScrapedFee[]
  features?: ScrapedFeature[]
  platforms?: ScrapedPlatform[]
  rating?: number
  pros?: string[]
  cons?: string[]
  source?: string
  sourceUrl?: string
  classification?: import("./classifier").BrokerClassification
  brokerType?: import("./classifier").BrokerType
}

// Export classification types (defined in classifier.ts)
export type {
  BrokerType,
  BrokerClassification,
} from "./classifier"

export interface ScrapedFee {
  feeType: "commission" | "spread" | "inactivity" | "withdrawal" | "other"
  instrumentType: "stocks" | "etf" | "options" | "futures" | "forex" | "crypto" | "other"
  feeAmount?: number
  feeCurrency?: string
  feeStructure?: "percentage" | "fixed" | "tiered"
  description?: string
}

export interface ScrapedFeature {
  category: string
  featureName: string
  featureValue?: string
  isAvailable?: boolean
}

export interface ScrapedPlatform {
  platformName: string
  platformType: "web" | "desktop" | "mobile"
  osSupport?: string[]
  features?: string[]
  isPrimary?: boolean
}

export interface ScrapedReview {
  brokerName?: string
  brokerSlug?: string
  reviewerName?: string
  rating: number
  title?: string
  content: string
  date?: Date
  verified?: boolean
  helpfulCount?: number
  source?: string
  sourceUrl?: string
  pros?: string[]
  cons?: string[]
}

export interface ScraperConfig {
  rateLimitDelay?: number // milliseconds between requests
  maxRetries?: number
  timeout?: number
  userAgent?: string
  headers?: Record<string, string>
  proxy?: string
}

export interface ScraperResult<T> {
  success: boolean
  data?: T
  error?: string
  source?: string
  timestamp?: Date
}

export type ScraperSource =
  | "brokerchooser"
  | "stockbrokers"
  | "trustpilot"
  | "broker_website"
  | "investopedia"
  | "nerdwallet"
  | "custom"

export interface BrokerClassification {
  types: Array<{
    type: BrokerType
    confidence: number
    reasons: string[]
  }>
  primaryType: BrokerType
  geography: {
    primaryCountry?: string
    primaryRegion?: string
    supportedRegions: string[]
    isGlobal: boolean
  }
  targetMarket: "beginner" | "intermediate" | "advanced" | "professional" | "institutional" | "mixed"
}

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
