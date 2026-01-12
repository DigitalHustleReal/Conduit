"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Star, Send } from "lucide-react"

interface ReviewFormProps {
  brokerId: string
  brokerName: string
  onSubmitSuccess?: () => void
}

export function ReviewForm({ brokerId, brokerName, onSubmitSuccess }: ReviewFormProps) {
  const [loading, setLoading] = useState(false)
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [formData, setFormData] = useState({
    authorName: "",
    authorEmail: "",
    title: "",
    content: "",
  })
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (rating === 0) {
      alert("Please select a rating")
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          brokerId,
          rating,
          ...formData,
          authorEmail: formData.authorEmail || null,
          title: formData.title || null,
        }),
      })

      if (response.ok) {
        setSubmitted(true)
        setFormData({ authorName: "", authorEmail: "", title: "", content: "" })
        setRating(0)
        if (onSubmitSuccess) {
          onSubmitSuccess()
        }
      } else {
        const error = await response.json()
        alert(error.error || "Failed to submit review")
      }
    } catch (error) {
      console.error("Error submitting review:", error)
      alert("Failed to submit review")
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
        <h3 className="text-lg font-semibold text-green-800 mb-2">Thank You!</h3>
        <p className="text-green-700">
          Your review has been submitted and is pending approval.
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-4"
          onClick={() => setSubmitted(false)}
        >
          Submit Another Review
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">
          Your Rating *
        </label>
        <div className="flex gap-1">
          {Array.from({ length: 5 }).map((_, i) => {
            const starValue = i + 1
            return (
              <button
                key={i}
                type="button"
                onClick={() => setRating(starValue)}
                onMouseEnter={() => setHoverRating(starValue)}
                onMouseLeave={() => setHoverRating(0)}
                className="focus:outline-none"
              >
                <Star
                  className={`h-8 w-8 ${
                    starValue <= (hoverRating || rating)
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-gray-300"
                  } transition-colors`}
                />
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Your Name *
        </label>
        <Input
          value={formData.authorName}
          onChange={(e) => setFormData({ ...formData, authorName: e.target.value })}
          required
          placeholder="John Doe"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Your Email (Optional)
        </label>
        <Input
          type="email"
          value={formData.authorEmail}
          onChange={(e) => setFormData({ ...formData, authorEmail: e.target.value })}
          placeholder="john@example.com"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Review Title (Optional)
        </label>
        <Input
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Great broker experience"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Your Review *
        </label>
        <textarea
          value={formData.content}
          onChange={(e) => setFormData({ ...formData, content: e.target.value })}
          className="w-full rounded-md border border-gray-300 px-3 py-2"
          rows={5}
          required
          minLength={10}
          placeholder="Share your experience with this broker..."
        />
        <p className="text-xs text-gray-500 mt-1">
          Minimum 10 characters. Reviews are moderated before publication.
        </p>
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        <Send className="mr-2 h-4 w-4" />
        {loading ? "Submitting..." : "Submit Review"}
      </Button>
    </form>
  )
}
