/**
 * Broker type categorization
 */

import { BrokerType } from "@/lib/scrapers/classifier"

export const BROKER_TYPES: Array<{
  value: BrokerType
  label: string
  description: string
  category: "service_mode" | "specialization" | "other"
}> = [
  {
    value: "full_service",
    label: "Full Service Broker",
    description: "Comprehensive financial services with investment advice",
    category: "service_mode",
  },
  {
    value: "discount",
    label: "Discount Broker",
    description: "Low-cost trading with minimal advice",
    category: "service_mode",
  },
  {
    value: "commission_free",
    label: "Commission-Free Broker",
    description: "Zero commission on stock trades",
    category: "service_mode",
  },
  {
    value: "robo_advisor",
    label: "Robo Advisor",
    description: "Automated investment management",
    category: "service_mode",
  },
  {
    value: "day_trading",
    label: "Day Trading Broker",
    description: "Specialized for active/day trading",
    category: "specialization",
  },
  {
    value: "options_focused",
    label: "Options Trading Broker",
    description: "Optimized for options trading",
    category: "specialization",
  },
  {
    value: "forex",
    label: "Forex Broker",
    description: "Focus on currency trading",
    category: "specialization",
  },
  {
    value: "crypto",
    label: "Cryptocurrency Broker",
    description: "Specialized in crypto trading",
    category: "specialization",
  },
  {
    value: "social_trading",
    label: "Social Trading Platform",
    description: "Copy trading features",
    category: "specialization",
  },
  {
    value: "premium",
    label: "Premium Broker",
    description: "High-end service for affluent clients",
    category: "service_mode",
  },
  {
    value: "international",
    label: "International Broker",
    description: "Multi-country operations",
    category: "other",
  },
]

/**
 * Get broker types by category
 */
export function getBrokerTypesByCategory(category: "service_mode" | "specialization" | "other"): typeof BROKER_TYPES {
  return BROKER_TYPES.filter((type) => type.category === category)
}

/**
 * Get broker type label
 */
export function getBrokerTypeLabel(type: BrokerType): string {
  return BROKER_TYPES.find((t) => t.value === type)?.label || type
}
