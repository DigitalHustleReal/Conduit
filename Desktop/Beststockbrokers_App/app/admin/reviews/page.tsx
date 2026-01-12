import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle, Eye, Trash2 } from "lucide-react"
import { ReviewActions } from "@/components/admin/ReviewActions"

export default async function AdminReviewsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const [pendingReviews, verifiedReviews, stats] = await Promise.all([
    prisma.brokerReview.findMany({
      where: { verified: false },
      include: {
        broker: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
    }),
    prisma.brokerReview.findMany({
      where: { verified: true },
      include: {
        broker: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 20,
    }),
    prisma.brokerReview.groupBy({
      by: ["verified"],
      _count: true,
    }),
  ])

  const pendingCount = stats.find((s) => !s.verified)?._count || 0
  const verifiedCount = stats.find((s) => s.verified)?._count || 0

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Reviews</h1>
        <p className="text-gray-600 mt-2">Manage and moderate broker reviews</p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-lg border p-6">
          <div className="text-sm text-gray-600 mb-1">Pending Reviews</div>
          <div className="text-3xl font-bold text-yellow-600">{pendingCount}</div>
        </div>
        <div className="bg-white rounded-lg border p-6">
          <div className="text-sm text-gray-600 mb-1">Verified Reviews</div>
          <div className="text-3xl font-bold text-green-600">{verifiedCount}</div>
        </div>
        <div className="bg-white rounded-lg border p-6">
          <div className="text-sm text-gray-600 mb-1">Total Reviews</div>
          <div className="text-3xl font-bold text-blue-600">{pendingCount + verifiedCount}</div>
        </div>
      </div>

      {/* Pending Reviews */}
      {pendingReviews.length > 0 && (
        <div className="bg-white rounded-lg border mb-8">
          <div className="px-6 py-4 border-b">
            <h2 className="text-xl font-semibold">Pending Approval ({pendingReviews.length})</h2>
          </div>
          <div className="divide-y">
            {pendingReviews.map((review) => (
              <div key={review.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <span
                            key={i}
                            className={`text-lg ${
                              i < review.rating ? "text-yellow-400" : "text-gray-300"
                            }`}
                          >
                            ★
                          </span>
                        ))}
                      </div>
                      <span className="text-sm text-gray-500">
                        by {review.authorName}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="mb-2">
                      <Link
                        href={`/brokers/${review.broker.slug}`}
                        className="text-blue-600 hover:underline font-medium"
                      >
                        {review.broker.name}
                      </Link>
                    </div>
                    {review.title && (
                      <h3 className="font-semibold mb-2">{review.title}</h3>
                    )}
                    <p className="text-gray-700 text-sm line-clamp-3">{review.content}</p>
                  </div>
                  <ReviewActions reviewId={review.id} initialVerified={review.verified} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Verified Reviews */}
      <div className="bg-white rounded-lg border">
        <div className="px-6 py-4 border-b">
          <h2 className="text-xl font-semibold">Verified Reviews</h2>
        </div>
        <div className="divide-y">
          {verifiedReviews.length > 0 ? (
            verifiedReviews.map((review) => (
              <div key={review.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <span
                            key={i}
                            className={`text-lg ${
                              i < review.rating ? "text-yellow-400" : "text-gray-300"
                            }`}
                          >
                            ★
                          </span>
                        ))}
                      </div>
                      <span className="text-sm text-gray-500">
                        by {review.authorName}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="mb-2">
                      <Link
                        href={`/brokers/${review.broker.slug}`}
                        className="text-blue-600 hover:underline font-medium"
                      >
                        {review.broker.name}
                      </Link>
                    </div>
                    {review.title && (
                      <h3 className="font-semibold mb-2">{review.title}</h3>
                    )}
                    <p className="text-gray-700 text-sm">{review.content}</p>
                  </div>
                  <ReviewActions reviewId={review.id} initialVerified={review.verified} />
                </div>
              </div>
            ))
          ) : (
            <div className="p-6 text-center text-gray-500">
              No verified reviews yet
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
