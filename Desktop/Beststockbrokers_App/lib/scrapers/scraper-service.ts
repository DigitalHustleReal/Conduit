/**
 * Service layer for saving scraped data to database
 */

import { prisma } from "@/lib/db"
import { ScrapedBrokerData, ScrapedReview } from "./types"
import { validateScrapedBroker, validateScrapedReview } from "./validator"

export class ScraperService {
  /**
   * Save or update scraped broker data
   */
  async saveBrokerData(scrapedData: ScrapedBrokerData): Promise<{
    success: boolean
    brokerId?: string
    error?: string
  }> {
    try {
      // Validate data
      const validation = validateScrapedBroker(scrapedData)
      if (!validation.valid || !validation.data) {
        return {
          success: false,
          error: `Validation failed: ${validation.errors?.errors.map((e) => e.message).join(", ")}`,
        }
      }

      const data = validation.data

      // Generate slug if not provided
      const slug = data.slug || this.generateSlug(data.name)

      // Check if broker already exists
      const existingBroker = await prisma.broker.findUnique({
        where: { slug },
      })

      // Prepare broker data
      const brokerData: any = {
        name: data.name,
        slug,
        description: data.description,
        shortDescription: data.shortDescription,
        websiteUrl: data.websiteUrl,
        logoUrl: data.logoUrl,
        foundedYear: data.foundedYear,
        headquartersCountry: data.headquartersCountry,
        headquartersCity: data.headquartersCity,
        minimumDeposit: data.minimumDeposit,
        baseCurrency: data.baseCurrency || "USD",
        isRegulated: data.isRegulated ?? false,
        regulationBodies: data.regulationBodies || [],
        accountTypes: data.accountTypes || [],
        supportedCountries: data.supportedCountries || [],
        languagesSupported: data.languagesSupported || [],
        isActive: true,
      }

      // Upsert broker
      const broker = existingBroker
        ? await prisma.broker.update({
            where: { id: existingBroker.id },
            data: brokerData,
          })
        : await prisma.broker.create({
            data: brokerData,
          })

      // Save fees if provided
      if (data.fees && data.fees.length > 0) {
        await this.saveFees(broker.id, data.fees)
      }

      // Save features if provided
      if (data.features && data.features.length > 0) {
        await this.saveFeatures(broker.id, data.features)
      }

      // Save platforms if provided
      if (data.platforms && data.platforms.length > 0) {
        await this.savePlatforms(broker.id, data.platforms)
      }

      // Save rating if provided
      if (data.rating !== undefined) {
        await this.saveRating(broker.id, {
          rating: data.rating,
          pros: data.pros || [],
          cons: data.cons || [],
        })
      }

      return {
        success: true,
        brokerId: broker.id,
      }
    } catch (error: any) {
      console.error("Error saving broker data:", error)
      return {
        success: false,
        error: error.message || "Unknown error",
      }
    }
  }

  /**
   * Save fees
   */
  private async saveFees(brokerId: string, fees: ScrapedBrokerData["fees"]!) {
    // Delete existing fees (or you might want to merge/update)
    await prisma.brokerFee.deleteMany({
      where: { brokerId },
    })

    await prisma.brokerFee.createMany({
      data: fees.map((fee) => ({
        brokerId,
        feeType: fee.feeType,
        instrumentType: fee.instrumentType,
        feeAmount: fee.feeAmount,
        feeCurrency: fee.feeCurrency || "USD",
        feeStructure: fee.feeStructure || "fixed",
        description: fee.description,
      })),
    })
  }

  /**
   * Save features
   */
  private async saveFeatures(
    brokerId: string,
    features: ScrapedBrokerData["features"]!
  ) {
    await prisma.brokerFeature.deleteMany({
      where: { brokerId },
    })

    await prisma.brokerFeature.createMany({
      data: features.map((feature) => ({
        brokerId,
        category: feature.category,
        featureName: feature.featureName,
        featureValue: feature.featureValue,
        isAvailable: feature.isAvailable ?? true,
      })),
    })
  }

  /**
   * Save platforms
   */
  private async savePlatforms(
    brokerId: string,
    platforms: ScrapedBrokerData["platforms"]!
  ) {
    await prisma.brokerPlatform.deleteMany({
      where: { brokerId },
    })

    await prisma.brokerPlatform.createMany({
      data: platforms.map((platform) => ({
        brokerId,
        platformName: platform.platformName,
        platformType: platform.platformType,
        osSupport: platform.osSupport || [],
        features: platform.features || [],
        isPrimary: platform.isPrimary ?? false,
      })),
    })
  }

  /**
   * Save rating
   */
  private async saveRating(
    brokerId: string,
    ratingData: { rating: number; pros: string[]; cons: string[] }
  ) {
    await prisma.brokerRating.upsert({
      where: {
        brokerId_category: {
          brokerId,
          category: "overall",
        },
      },
      update: {
        rating: ratingData.rating,
        pros: ratingData.pros,
        cons: ratingData.cons,
      },
      create: {
        brokerId,
        category: "overall",
        rating: ratingData.rating,
        reviewCount: 0,
        pros: ratingData.pros,
        cons: ratingData.cons,
      },
    })
  }

  /**
   * Save scraped reviews
   */
  async saveReviews(
    brokerIdOrSlug: string,
    reviews: ScrapedReview[]
  ): Promise<{ success: boolean; savedCount: number; errors: string[] }> {
    try {
      // Find broker
      const broker = await prisma.broker.findFirst({
        where: {
          OR: [{ id: brokerIdOrSlug }, { slug: brokerIdOrSlug }],
        },
      })

      if (!broker) {
        return {
          success: false,
          savedCount: 0,
          errors: ["Broker not found"],
        }
      }

      const errors: string[] = []
      let savedCount = 0

      for (const review of reviews) {
        try {
          // Validate review
          const validation = validateScrapedReview(review)
          if (!validation.valid || !validation.data) {
            errors.push(
              `Review validation failed: ${validation.errors?.errors.map((e) => e.message).join(", ")}`
            )
            continue
          }

          const data = validation.data

          // Check if review already exists (by content hash or source URL)
          const existingReview = data.sourceUrl
            ? await prisma.brokerReview.findFirst({
                where: {
                  brokerId: broker.id,
                  sourceUrl: data.sourceUrl,
                },
              })
            : null

          if (existingReview) {
            // Update existing review
            await prisma.brokerReview.update({
              where: { id: existingReview.id },
              data: {
                rating: data.rating,
                title: data.title,
                content: data.content,
                reviewerName: data.reviewerName,
                verified: data.verified ?? false,
                helpfulCount: data.helpfulCount ?? 0,
                source: data.source,
                sourceUrl: data.sourceUrl,
              },
            })
          } else {
            // Create new review (pending verification)
            await prisma.brokerReview.create({
              data: {
                brokerId: broker.id,
                rating: data.rating,
                title: data.title,
                content: data.content,
                reviewerName: data.reviewerName,
                verified: data.verified ?? false,
                helpfulCount: data.helpfulCount ?? 0,
                source: data.source,
                sourceUrl: data.sourceUrl,
              },
            })
          }

          savedCount++
        } catch (error: any) {
          errors.push(`Error saving review: ${error.message}`)
        }
      }

      // Update broker rating based on reviews
      await this.updateBrokerRatingFromReviews(broker.id)

      return {
        success: errors.length < reviews.length,
        savedCount,
        errors,
      }
    } catch (error: any) {
      return {
        success: false,
        savedCount: 0,
        errors: [error.message || "Unknown error"],
      }
    }
  }

  /**
   * Update broker rating based on reviews
   */
  private async updateBrokerRatingFromReviews(brokerId: string) {
    const reviews = await prisma.brokerReview.findMany({
      where: {
        brokerId,
        verified: true,
      },
    })

    if (reviews.length === 0) return

    const avgRating =
      reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length

    await prisma.brokerRating.upsert({
      where: {
        brokerId_category: {
          brokerId,
          category: "overall",
        },
      },
      update: {
        rating: avgRating,
        reviewCount: reviews.length,
      },
      create: {
        brokerId,
        category: "overall",
        rating: avgRating,
        reviewCount: reviews.length,
        pros: [],
        cons: [],
      },
    })
  }

  /**
   * Generate slug from name
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
  }
}
