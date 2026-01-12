/**
 * Feature-based categorization
 */

export interface FeatureCategory {
  key: string
  label: string
  features: string[]
  description: string
}

export const FEATURE_CATEGORIES: FeatureCategory[] = [
  {
    key: "trading_features",
    label: "Trading Features",
    features: ["Options Trading", "Futures Trading", "Forex Trading", "Crypto Trading", "Fractional Shares"],
    description: "Advanced trading capabilities",
  },
  {
    key: "platform_access",
    label: "Platform Access",
    features: ["Mobile App", "Desktop Platform", "Web Platform", "API Access"],
    description: "Available platforms and access methods",
  },
  {
    key: "research_tools",
    label: "Research Tools",
    features: ["Research Tools", "Charting Tools", "Screeners", "Market Data"],
    description: "Research and analysis tools",
  },
  {
    key: "education",
    label: "Education",
    features: ["Educational Resources", "Webinars", "Paper Trading", "Tutorials"],
    description: "Educational resources and learning tools",
  },
  {
    key: "account_types",
    label: "Account Types",
    features: ["IRA", "Roth IRA", "Trust Account", "Corporate Account", "Joint Account"],
    description: "Available account types",
  },
  {
    key: "customer_support",
    label: "Customer Support",
    features: ["24/7 Support", "Live Chat", "Phone Support", "Email Support"],
    description: "Customer support options",
  },
]

/**
 * Check if broker has feature category
 */
export function brokerHasFeatureCategory(
  brokerFeatures: Array<{ featureName: string; isAvailable?: boolean }>,
  categoryKey: string
): boolean {
  const category = FEATURE_CATEGORIES.find((c) => c.key === categoryKey)
  if (!category) return false

  return category.features.some((featureName) => {
    return brokerFeatures.some(
      (f) =>
        f.featureName.toLowerCase().includes(featureName.toLowerCase()) &&
        f.isAvailable === true
    )
  })
}

/**
 * Filter brokers by feature category
 */
export function filterByFeatureCategory(
  brokers: Array<{ features?: Array<{ featureName: string; isAvailable?: boolean }> }>,
  categoryKey: string
): typeof brokers {
  return brokers.filter((broker) => {
    const features = broker.features || []
    return brokerHasFeatureCategory(features, categoryKey)
  })
}

/**
 * Get feature category label
 */
export function getFeatureCategoryLabel(key: string): string {
  return FEATURE_CATEGORIES.find((c) => c.key === key)?.label || key
}
