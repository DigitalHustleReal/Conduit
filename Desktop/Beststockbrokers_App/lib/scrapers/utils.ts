/**
 * Utility functions for scraping
 */

import { BrokerType } from "./classifier"

/**
 * Get human-readable broker type label
 */
export function getBrokerTypeLabel(type: BrokerType): string {
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
export function getBrokerTypeDescription(type: BrokerType): string {
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

/**
 * Get region label
 */
export function getRegionLabel(region: string): string {
  const labels: Record<string, string> = {
    north_america: "North America",
    europe: "Europe",
    asia_pacific: "Asia Pacific",
    latin_america: "Latin America",
    middle_east: "Middle East",
    africa: "Africa",
  }
  return labels[region] || region
}

/**
 * Group brokers by type
 */
export function groupBrokersByType<T extends { brokerType?: BrokerType }>(
  brokers: T[]
): Record<BrokerType, T[]> {
  const grouped = brokers.reduce(
    (acc, broker) => {
      const type = broker.brokerType || "other"
      if (!acc[type]) {
        acc[type] = []
      }
      acc[type].push(broker)
      return acc
    },
    {} as Record<BrokerType, T[]>
  )

  // Initialize all types
  const allTypes: BrokerType[] = [
    "full_service",
    "discount",
    "robo_advisor",
    "day_trading",
    "forex",
    "crypto",
    "options_focused",
    "international",
    "commission_free",
    "premium",
    "social_trading",
    "other",
  ]

  allTypes.forEach((type) => {
    if (!grouped[type]) {
      grouped[type] = []
    }
  })

  return grouped
}

/**
 * Group brokers by region
 */
export function groupBrokersByRegion<T extends {
  classification?: {
    geography: { primaryRegion?: string; supportedRegions: string[] }
  }
}>(
  brokers: T[]
): Record<string, T[]> {
  const grouped: Record<string, T[]> = {}

  brokers.forEach((broker) => {
    const regions =
      broker.classification?.geography.supportedRegions || []
    const primaryRegion =
      broker.classification?.geography.primaryRegion

    if (primaryRegion) {
      if (!grouped[primaryRegion]) {
        grouped[primaryRegion] = []
      }
      grouped[primaryRegion].push(broker)
    } else if (regions.length > 0) {
      regions.forEach((region) => {
        if (!grouped[region]) {
          grouped[region] = []
        }
        grouped[region].push(broker)
      })
    } else {
      if (!grouped["other"]) {
        grouped["other"] = []
      }
      grouped["other"].push(broker)
    }
  })

  return grouped
}
