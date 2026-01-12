export interface StructuredData {
  "@context": string
  "@type": string
  [key: string]: any
}

export function generateBrokerStructuredData(broker: {
  name: string
  description?: string | null
  websiteUrl: string
  logoUrl?: string | null
  rating?: number
  reviewCount?: number
  foundedYear?: number | null
  headquartersCountry?: string | null
}) {
  const structuredData: StructuredData = {
    "@context": "https://schema.org",
    "@type": "FinancialService",
    name: broker.name,
    description: broker.description || "",
    url: broker.websiteUrl,
  }

  if (broker.logoUrl) {
    structuredData.logo = broker.logoUrl
  }

  if (broker.rating && broker.reviewCount) {
    structuredData.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: broker.rating,
      reviewCount: broker.reviewCount,
      bestRating: "5",
      worstRating: "1",
    }
  }

  if (broker.foundedYear) {
    structuredData.foundingDate = `${broker.foundedYear}-01-01`
  }

  if (broker.headquartersCountry) {
    structuredData.address = {
      "@type": "PostalAddress",
      addressCountry: broker.headquartersCountry,
    }
  }

  return structuredData
}

export function generateReviewStructuredData(review: {
  author: string
  rating: number
  reviewBody: string
  datePublished: string
  brokerName: string
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Review",
    author: {
      "@type": "Person",
      name: review.author,
    },
    reviewRating: {
      "@type": "Rating",
      ratingValue: review.rating,
      bestRating: "5",
      worstRating: "1",
    },
    reviewBody: review.reviewBody,
    datePublished: review.datePublished,
    itemReviewed: {
      "@type": "FinancialService",
      name: review.brokerName,
    },
  }
}

export function generateFAQStructuredData(faqs: Array<{ question: string; answer: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  }
}
