import { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/db"
import Image from "next/image"
import { Calendar, User, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export async function generateMetadata({
  params,
}: {
  params: { slug: string }
}): Promise<Metadata> {
  const post = await prisma.contentPage.findFirst({
    where: {
      slug: params.slug,
      type: "blog",
      status: "published",
    },
  })

  if (!post) {
    return {
      title: "Post Not Found",
    }
  }

  return {
    title: post.metaTitle || post.title,
    description: post.metaDescription || post.excerpt || undefined,
    openGraph: {
      title: post.title,
      description: post.excerpt || undefined,
      images: post.featuredImage ? [post.featuredImage] : undefined,
    },
  }
}

export default async function BlogPostPage({
  params,
}: {
  params: { slug: string }
}) {
  const post = await prisma.contentPage.findFirst({
    where: {
      slug: params.slug,
      type: "blog",
      status: "published",
    },
  })

  if (!post) {
    notFound()
  }

  // Get related posts
  const relatedPosts = await prisma.contentPage.findMany({
    where: {
      type: "blog",
      status: "published",
      NOT: { id: post.id },
      OR: [
        { category: post.category },
        { tags: { hasSome: post.tags } },
      ],
    },
    take: 3,
    orderBy: {
      publishedAt: "desc",
    },
  })

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <Link href="/blog">
        <Button variant="ghost" className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Blog
        </Button>
      </Link>

      <article>
        <header className="mb-8">
          <h1 className="text-4xl font-bold mb-4">{post.title}</h1>
          <div className="flex items-center gap-4 text-gray-600 mb-4">
            {post.publishedAt && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>{new Date(post.publishedAt).toLocaleDateString()}</span>
              </div>
            )}
            {post.author && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span>{post.author}</span>
              </div>
            )}
          </div>
          {post.featuredImage && (
            <div className="relative h-96 w-full bg-gray-200 rounded-lg overflow-hidden mb-6">
              <Image
                src={post.featuredImage}
                alt={post.title}
                fill
                className="object-cover"
              />
            </div>
          )}
        </header>

        <div
          className="prose prose-lg max-w-none"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {post.tags.length > 0 && (
          <div className="mt-8 pt-8 border-t">
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
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

      {relatedPosts.length > 0 && (
        <div className="mt-16 pt-8 border-t">
          <h2 className="text-2xl font-bold mb-6">Related Posts</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {relatedPosts.map((relatedPost) => (
              <Link
                key={relatedPost.id}
                href={`/blog/${relatedPost.slug}`}
                className="group rounded-lg border bg-white p-4 hover:shadow-md transition-shadow"
              >
                <h3 className="font-semibold mb-2 group-hover:text-blue-600 transition-colors">
                  {relatedPost.title}
                </h3>
                {relatedPost.excerpt && (
                  <p className="text-sm text-gray-600 line-clamp-2">{relatedPost.excerpt}</p>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
