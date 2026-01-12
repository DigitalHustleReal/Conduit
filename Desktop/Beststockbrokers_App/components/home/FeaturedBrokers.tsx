import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Star, ArrowRight } from "lucide-react"
import { prisma } from "@/lib/db"

export async function FeaturedBrokers() {
  const featuredBrokers = await prisma.broker.findMany({
    where: {
      isActive: true,
      featured: true,
    },
    include: {
      ratings: {
        where: {
          category: "overall",
        },
      },
    },
    take: 6,
    orderBy: {
      createdAt: "desc",
    },
  })

  if (featuredBrokers.length === 0) {
    return null
  }

  return (
    <section className="bg-gray-50 py-16">
      <div className="container mx-auto px-4">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold text-gray-900">Featured Brokers</h2>
          <p className="text-lg text-gray-600">
            Top-rated brokers trusted by traders worldwide
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {featuredBrokers.map((broker) => {
            const overallRating = broker.ratings[0]
            const rating = overallRating?.rating || 0

            return (
              <Link
                key={broker.id}
                href={`/brokers/${broker.slug}`}
                className="group rounded-lg border bg-white p-6 shadow-sm transition-all hover:shadow-lg"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div className="h-12 w-12 rounded bg-gray-200 flex items-center justify-center">
                    {broker.logoUrl ? (
                      <img
                        src={broker.logoUrl}
                        alt={broker.name}
                        className="h-full w-full object-contain rounded"
                      />
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
                <h3 className="mb-2 text-xl font-semibold text-gray-900 group-hover:text-blue-600">
                  {broker.name}
                </h3>
                <p className="mb-4 text-sm text-gray-600 line-clamp-2">
                  {broker.shortDescription || broker.description || "No description available"}
                </p>
                <div className="flex items-center text-sm font-medium text-blue-600">
                  View Details
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            )
          })}
        </div>

        <div className="mt-12 text-center">
          <Button asChild variant="outline" size="lg">
            <Link href="/brokers">
              View All Brokers <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}

