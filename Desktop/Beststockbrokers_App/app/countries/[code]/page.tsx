import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Star, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getCountryName } from "@/lib/countries"
import { Metadata } from "next"

export async function generateMetadata({
  params,
}: {
  params: { code: string }
}): Promise<Metadata> {
  const countryCode = params.code.toUpperCase()
  const countryName = getCountryName(countryCode)

  return {
    title: `Best Stock Brokers in ${countryName} | BestStockBrokers.org`,
    description: `Compare the best stock brokers available in ${countryName}. Find fees, features, and ratings for brokers in ${countryName}.`,
    keywords: [`brokers in ${countryName}`, `${countryName} brokers`, `stock brokers ${countryName}`],
    openGraph: {
      title: `Best Stock Brokers in ${countryName}`,
      description: `Compare the best stock brokers available in ${countryName}.`,
      type: "website",
    },
  }
}

export default async function CountryBrokersPage({
  params,
}: {
  params: { code: string }
}) {
  const countryCode = params.code.toUpperCase()

  const brokers = await prisma.broker.findMany({
    where: {
      isActive: true,
      supportedCountries: {
        has: countryCode,
      },
    },
    include: {
      ratings: {
        where: {
          category: "overall",
        },
      },
      fees: {
        where: {
          instrumentType: "stocks",
          feeType: "commission",
        },
        take: 1,
      },
    },
    orderBy: {
      featured: "desc",
    },
  })

  if (brokers.length === 0) {
    notFound()
  }

  const countryName = getCountryName(countryCode)

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Best Stock Brokers in {countryName}
        </h1>
        <p className="text-lg text-gray-600">
          Compare {brokers.length} broker{brokers.length !== 1 ? "s" : ""} available in {countryName}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {brokers.map((broker) => {
          const overallRating = broker.ratings[0]
          const rating = overallRating?.rating || 0

          return (
            <div
              key={broker.id}
              className="border rounded-lg bg-white p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="h-12 w-12 rounded bg-gray-200 flex items-center justify-center">
                  {broker.logoUrl ? (
                    <img src={broker.logoUrl} alt={broker.name} className="h-full w-full object-contain" />
                  ) : (
                    <span className="text-xs text-gray-400">Logo</span>
                  )}
                </div>
                {rating > 0 && (
                  <div className="flex items-center gap-1">
                    <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    <span className="font-semibold">{rating.toFixed(1)}</span>
                  </div>
                )}
              </div>

              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {broker.name}
              </h3>
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                {broker.shortDescription || broker.description || "No description available"}
              </p>

              <div className="flex items-center justify-between">
                {broker.minimumDeposit && (
                  <span className="text-sm text-gray-600">
                    Min: ${broker.minimumDeposit}
                  </span>
                )}
                <Link href={`/brokers/${broker.slug}`}>
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                </Link>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-8 text-center">
        <Link href="/compare">
          <Button size="lg">
            Compare All Brokers
          </Button>
        </Link>
      </div>
    </div>
  )
}

