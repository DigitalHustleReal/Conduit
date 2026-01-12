import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { isGlobalBroker, CONTINENTS } from "@/lib/categorization/geography"
import { FEATURE_CATEGORIES } from "@/lib/categorization/features"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get("search")
    const country = searchParams.get("country")
    const geographyCategory = searchParams.get("geographyCategory") as "global" | "continent" | "country" | null
    const geographyValue = searchParams.get("geographyValue")
    const brokerTypes = searchParams.get("brokerTypes")?.split(",") || []
    const featureCategories = searchParams.get("featureCategories")?.split(",") || []
    const minDeposit = searchParams.get("minDeposit")
    const maxDeposit = searchParams.get("maxDeposit")
    const minRating = searchParams.get("minRating")
    const limit = parseInt(searchParams.get("limit") || "20")
    const offset = parseInt(searchParams.get("offset") || "0")

    const where: any = {
      isActive: true,
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { shortDescription: { contains: search, mode: "insensitive" } },
      ]
    }

    // Geography filtering
    if (geographyCategory === "global") {
      // Filter will be applied after fetching (need to check country count)
    } else if (geographyCategory === "continent" && geographyValue) {
      const continent = CONTINENTS[geographyValue]
      if (continent) {
        where.supportedCountries = {
          hasSome: continent.countries,
        }
      }
    } else if (country) {
      const countries = country.split(",")
      where.supportedCountries = {
        hasSome: countries,
      }
    }

    if (minDeposit !== null) {
      where.minimumDeposit = {
        gte: parseFloat(minDeposit),
      }
    }

    if (maxDeposit !== null) {
      where.minimumDeposit = {
        ...where.minimumDeposit,
        lte: parseFloat(maxDeposit),
      }
    }

    if (minRating !== null) {
      where.ratings = {
        some: {
          category: "overall",
          rating: {
            gte: parseFloat(minRating),
          },
        },
      }
    }

    const [allBrokers, totalBeforeFilters] = await Promise.all([
      prisma.broker.findMany({
        where,
        include: {
          ratings: {
            where: {
              category: "overall",
            },
          },
          fees: {
            orderBy: {
              instrumentType: "asc",
            },
          },
          features: {
            orderBy: {
              category: "asc",
            },
          },
          platforms: true,
        },
        orderBy: {
          featured: "desc",
        },
      }),
      prisma.broker.count({ where }),
    ])

    // Apply additional filters that need feature/data access
    let filteredBrokers = allBrokers

    // Filter by global brokers
    if (geographyCategory === "global") {
      filteredBrokers = filteredBrokers.filter((broker) => {
        const countries = broker.supportedCountries || []
        return isGlobalBroker(countries)
      })
    }

    // Filter by broker types (would need brokerType field in database)
    // For now, this is a placeholder - you'd need to add brokerType to the Broker model
    // if (brokerTypes.length > 0) {
    //   filteredBrokers = filteredBrokers.filter((broker) => {
    //     return brokerTypes.includes(broker.brokerType || "")
    //   })
    // }

    // Filter by feature categories
    if (featureCategories.length > 0) {
      filteredBrokers = filteredBrokers.filter((broker) => {
        const brokerFeatures = broker.features || []
        return featureCategories.some((categoryKey) => {
          const category = FEATURE_CATEGORIES.find((c) => c.key === categoryKey)
          if (!category) return false

          return category.features.some((featureName) => {
            return brokerFeatures.some(
              (f) =>
                f.featureName.toLowerCase().includes(featureName.toLowerCase()) &&
                f.isAvailable === true
            )
          })
        })
      })
    }

    // Apply pagination
    const total = filteredBrokers.length
    const brokers = filteredBrokers.slice(offset, offset + limit)

    return NextResponse.json({
      brokers: brokers.map((broker) => ({
        ...broker,
        fees: broker.fees?.filter((f) => f.instrumentType === "stocks" && f.feeType === "commission").slice(0, 1) || [],
      })),
      total,
      limit,
      offset,
    })
  } catch (error) {
    console.error("Error fetching brokers:", error)
    return NextResponse.json(
      { error: "Failed to fetch brokers" },
      { status: 500 }
    )
  }
}

