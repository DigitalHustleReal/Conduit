import { Metadata } from "next"
import Link from "next/link"
import { prisma } from "@/lib/db"
import Image from "next/image"
import { BookOpen, ArrowRight } from "lucide-react"

export const metadata: Metadata = {
  title: "Trading Guides - BestStockBrokers.org",
  description: "Comprehensive guides to help you choose the right stock broker and understand trading platforms.",
}

export default async function GuidesPage() {
  const guides = await prisma.contentPage.findMany({
    where: {
      type: "guide",
      status: "published",
    },
    orderBy: {
      publishedAt: "desc",
    },
    take: 50,
  })

  // Group by category
  const guidesByCategory = guides.reduce((acc, guide) => {
    const category = guide.category || "General"
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(guide)
    return acc
  }, {} as Record<string, typeof guides>)

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold mb-4">Trading Guides</h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Comprehensive guides to help you choose the right stock broker and understand trading platforms
        </p>
      </div>

      {guides.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500 text-lg">No guides yet. Check back soon!</p>
        </div>
      ) : (
        <div className="space-y-12">
          {Object.entries(guidesByCategory).map(([category, categoryGuides]) => (
            <div key={category}>
              <h2 className="text-2xl font-bold mb-6">{category}</h2>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {categoryGuides.map((guide) => (
                  <Link
                    key={guide.id}
                    href={`/guides/${guide.slug}`}
                    className="group rounded-lg border bg-white p-6 hover:shadow-lg transition-shadow"
                  >
                    <div className="flex items-start gap-4">
                      <BookOpen className="h-8 w-8 text-blue-600 flex-shrink-0 mt-1" />
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold mb-2 group-hover:text-blue-600 transition-colors">
                          {guide.title}
                        </h3>
                        {guide.excerpt && (
                          <p className="text-gray-600 text-sm line-clamp-2 mb-4">{guide.excerpt}</p>
                        )}
                        <div className="flex items-center text-blue-600 font-medium text-sm">
                          Read guide <ArrowRight className="ml-2 h-4 w-4" />
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
