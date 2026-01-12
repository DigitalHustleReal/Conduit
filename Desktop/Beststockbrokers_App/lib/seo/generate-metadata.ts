import { Metadata } from "next"
import { generateBrokerStructuredData } from "./structured-data"

interface BrokerSeoData {
  name: string
  description?: string | null
  shortDescription?: string | null
  slug: string
  rating?: number
  minimumDeposit?: number | null
  baseCurrency?: string
}

export function generateBrokerMetadata(broker: BrokerSeoData): Metadata {
  const title = broker.rating
    ? `${broker.name} Review ${broker.rating.toFixed(1)}/5.0 - BestStockBrokers.org`
    : `${broker.name} Review - BestStockBrokers.org`

  const description =
    broker.shortDescription ||
    broker.description?.substring(0, 150) ||
    `Compare ${broker.name} with other stock brokers. Find fees, features, ratings, and reviews.`

  return {
    title,
    description,
    keywords: [
      broker.name,
      `${broker.name} review`,
      `${broker.name} broker`,
      "stock broker",
      "compare brokers",
      "trading platform",
    ],
    openGraph: {
      title,
      description,
      type: "website",
      url: `https://beststockbrokers.org/brokers/${broker.slug}`,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  }
}

export function generateComparisonMetadata(broker1: string, broker2: string): Metadata {
  const title = `${broker1} vs ${broker2} - Side-by-Side Comparison | BestStockBrokers.org`
  const description = `Compare ${broker1} and ${broker2} side-by-side. Compare fees, features, platforms, and ratings to find the best broker for you.`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
    },
  }
}

