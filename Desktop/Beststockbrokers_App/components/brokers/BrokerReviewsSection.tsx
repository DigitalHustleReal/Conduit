"use client"

import { useState, useEffect } from "react"
import { ReviewForm } from "@/components/reviews/ReviewForm"
import { ReviewList } from "@/components/reviews/ReviewList"
import { Button } from "@/components/ui/button"
import { MessageSquare } from "lucide-react"

interface Review {
  id: string
  authorName: string
  rating: number
  title: string | null
  content: string
  verified: boolean
  createdAt: string
}

interface BrokerReviewsSectionProps {
  brokerId: string
  brokerName: string
  initialReviews?: Review[]
}

export function BrokerReviewsSection({
  brokerId,
  brokerName,
  initialReviews = [],
}: BrokerReviewsSectionProps) {
  const [reviews, setReviews] = useState<Review[]>(initialReviews)
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [offset, setOffset] = useState(initialReviews.length)
  const [hasMore, setHasMore] = useState(initialReviews.length >= 10)

  const fetchMoreReviews = async () => {
    setLoading(true)
    try {
      const response = await fetch(
        `/api/reviews/broker/${brokerId}?limit=10&offset=${offset}`
      )
      if (response.ok) {
        const data = await response.json()
        setReviews([...reviews, ...data.reviews])
        setOffset(offset + data.reviews.length)
        setHasMore(data.reviews.length >= 10)
      }
    } catch (error) {
      console.error("Error fetching reviews:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleReviewSubmitted = () => {
    // Refresh reviews
    fetch(`/api/reviews/broker/${brokerId}?limit=10&offset=0`)
      .then((res) => res.json())
      .then((data) => {
        setReviews(data.reviews)
        setOffset(data.reviews.length)
        setHasMore(data.reviews.length >= 10)
      })
    setShowForm(false)
  }

  return (
    <div className="mt-8 rounded-lg border bg-white p-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-semibold flex items-center gap-2">
          <MessageSquare className="h-6 w-6" />
          Reviews ({reviews.length})
        </h2>
        {!showForm && (
          <Button onClick={() => setShowForm(true)}>
            Write a Review
          </Button>
        )}
      </div>

      {showForm && (
        <div className="mb-8 rounded-lg border bg-gray-50 p-6">
          <ReviewForm
            brokerId={brokerId}
            brokerName={brokerName}
            onSubmitSuccess={handleReviewSubmitted}
          />
        </div>
      )}

      <ReviewList reviews={reviews} brokerId={brokerId} />

      {hasMore && (
        <div className="mt-6 text-center">
          <Button
            variant="outline"
            onClick={fetchMoreReviews}
            disabled={loading}
          >
            {loading ? "Loading..." : "Load More Reviews"}
          </Button>
        </div>
      )}
    </div>
  )
}
