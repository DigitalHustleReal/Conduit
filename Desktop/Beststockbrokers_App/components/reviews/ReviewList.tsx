"use client"

import { Star, CheckCircle } from "lucide-react"

interface Review {
  id: string
  authorName: string
  rating: number
  title: string | null
  content: string
  verified: boolean
  createdAt: Date
}

interface ReviewListProps {
  reviews: Review[]
  brokerId: string
}

export function ReviewList({ reviews, brokerId }: ReviewListProps) {
  if (reviews.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-8 text-center">
        <p className="text-gray-600">No reviews yet. Be the first to review!</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {reviews.map((review) => (
        <div key={review.id} className="bg-white rounded-lg border p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                {review.verified && (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                )}
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-5 w-5 ${
                        i < review.rating
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-gray-300"
                      }`}
                    />
                  ))}
                </div>
                <span className="font-semibold text-gray-900">{review.authorName}</span>
              </div>
              {review.title && (
                <h3 className="text-lg font-semibold mb-2">{review.title}</h3>
              )}
              <p className="text-gray-700 leading-relaxed">{review.content}</p>
            </div>
          </div>
          <div className="text-sm text-gray-500">
            {new Date(review.createdAt).toLocaleDateString()}
          </div>
        </div>
      ))}
    </div>
  )
}
