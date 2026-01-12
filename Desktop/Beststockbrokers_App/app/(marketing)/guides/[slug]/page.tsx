import { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/db"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export async function generateMetadata({
  params,
}: {
  params: { slug: string }
}): Promise<Metadata> {
  const guide = await prisma.contentPage.findFirst({
    where: {
      slug: params.slug,
      type: "guide",
      status: "published",
    },
  })

  if (!guide) {
    return {
      title: "Guide Not Found",
    }
  }

  return {
    title: guide.metaTitle || guide.title,
    description: guide.metaDescription || guide.excerpt || undefined,
  }
}

export default async function GuidePage({
  params,
}: {
  params: { slug: string }
}) {
  const guide = await prisma.contentPage.findFirst({
    where: {
      slug: params.slug,
      type: "guide",
      status: "published",
    },
  })

  if (!guide) {
    notFound()
  }

  // Get related guides
  const relatedGuides = await prisma.contentPage.findMany({
    where: {
      type: "guide",
      status: "published",
      NOT: { id: guide.id },
      OR: [
        { category: guide.category },
        { tags: { hasSome: guide.tags } },
      ],
    },
    take: 3,
    orderBy: {
      publishedAt: "desc",
    },
  })

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <Link href="/guides">
        <Button variant="ghost" className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Guides
        </Button>
      </Link>

      <article>
        <header className="mb-8">
          <h1 className="text-4xl font-bold mb-4">{guide.title}</h1>
          {guide.category && (
            <div className="mb-4">
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                {guide.category}
              </span>
            </div>
          )}
        </header>

        <div
          className="prose prose-lg max-w-none"
          dangerouslySetInnerHTML={{ __html: guide.content }}
        />

        {guide.tags.length > 0 && (
          <div className="mt-8 pt-8 border-t">
            <div className="flex flex-wrap gap-2">
              {guide.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-700"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </article>

      {relatedGuides.length > 0 && (
        <div className="mt-16 pt-8 border-t">
          <h2 className="text-2xl font-bold mb-6">Related Guides</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {relatedGuides.map((relatedGuide) => (
              <Link
                key={relatedGuide.id}
                href={`/guides/${relatedGuide.slug}`}
                className="group rounded-lg border bg-white p-4 hover:shadow-md transition-shadow"
              >
                <h3 className="font-semibold mb-2 group-hover:text-blue-600 transition-colors">
                  {relatedGuide.title}
                </h3>
                {relatedGuide.excerpt && (
                  <p className="text-sm text-gray-600 line-clamp-2">{relatedGuide.excerpt}</p>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
