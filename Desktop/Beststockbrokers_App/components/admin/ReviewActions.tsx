"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle, Trash2 } from "lucide-react"

interface ReviewActionsProps {
  reviewId: string
  initialVerified: boolean
}

export function ReviewActions({ reviewId, initialVerified }: ReviewActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [verified, setVerified] = useState(initialVerified)

  const handleApprove = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/reviews/${reviewId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ verified: true }),
      })

      if (response.ok) {
        setVerified(true)
        router.refresh()
      } else {
        const error = await response.json()
        alert(error.error || "Failed to approve review")
      }
    } catch (error) {
      console.error("Error approving review:", error)
      alert("Failed to approve review")
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/reviews/${reviewId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ verified: false }),
      })

      if (response.ok) {
        setVerified(false)
        router.refresh()
      } else {
        const error = await response.json()
        alert(error.error || "Failed to reject review")
      }
    } catch (error) {
      console.error("Error rejecting review:", error)
      alert("Failed to reject review")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this review? This action cannot be undone.")) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/admin/reviews/${reviewId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        router.refresh()
      } else {
        const error = await response.json()
        alert(error.error || "Failed to delete review")
      }
    } catch (error) {
      console.error("Error deleting review:", error)
      alert("Failed to delete review")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex gap-2 ml-4">
      {!verified ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleApprove}
          disabled={loading}
          className="text-green-600 border-green-600 hover:bg-green-50"
        >
          <CheckCircle className="h-4 w-4 mr-1" />
          Approve
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleReject}
          disabled={loading}
          className="text-yellow-600 border-yellow-600 hover:bg-yellow-50"
        >
          <XCircle className="h-4 w-4 mr-1" />
          Unverify
        </Button>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleDelete}
        disabled={loading}
        className="text-red-600 border-red-600 hover:bg-red-50"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}
