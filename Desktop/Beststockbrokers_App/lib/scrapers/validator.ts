/**
 * Data validation schemas for scraped data
 */

import { z } from "zod"
import { ScrapedBrokerData, ScrapedReview } from "./types"

/**
 * Validate scraped broker data
 */
export const scrapedBrokerSchema = z.object({
  name: z.string().min(1),
  slug: z.string().optional(),
  description: z.string().optional().nullable(),
  shortDescription: z.string().optional().nullable(),
  websiteUrl: z.string().url(),
  logoUrl: z.string().url().optional().nullable(),
  foundedYear: z.number().int().min(1800).max(new Date().getFullYear()).optional().nullable(),
  headquartersCountry: z.string().length(2).optional().nullable(),
  headquartersCity: z.string().optional().nullable(),
  minimumDeposit: z.number().min(0).optional().nullable(),
  baseCurrency: z.string().length(3).optional().nullable(),
  isRegulated: z.boolean().optional(),
  regulationBodies: z.array(z.string()).optional(),
  accountTypes: z.array(z.string()).optional(),
  supportedCountries: z.array(z.string().length(2)).optional(),
  languagesSupported: z.array(z.string().length(2)).optional(),
  source: z.string().optional(),
  sourceUrl: z.string().url().optional(),
})

export function validateScrapedBroker(data: any): {
  valid: boolean
  data?: ScrapedBrokerData
  errors?: z.ZodError
} {
  try {
    const validated = scrapedBrokerSchema.parse(data)
    return { valid: true, data: validated }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { valid: false, errors: error }
    }
    return { valid: false }
  }
}

/**
 * Validate scraped review data
 */
export const scrapedReviewSchema = z.object({
  brokerName: z.string().optional(),
  brokerSlug: z.string().optional(),
  reviewerName: z.string().optional(),
  rating: z.number().min(1).max(5),
  title: z.string().optional(),
  content: z.string().min(10), // At least 10 characters
  date: z.date().optional(),
  verified: z.boolean().optional(),
  helpfulCount: z.number().min(0).optional(),
  source: z.string().optional(),
  sourceUrl: z.string().url().optional(),
  pros: z.array(z.string()).optional(),
  cons: z.array(z.string()).optional(),
})

export function validateScrapedReview(data: any): {
  valid: boolean
  data?: ScrapedReview
  errors?: z.ZodError
} {
  try {
    const validated = scrapedReviewSchema.parse(data)
    return { valid: true, data: validated }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { valid: false, errors: error }
    }
    return { valid: false }
  }
}
