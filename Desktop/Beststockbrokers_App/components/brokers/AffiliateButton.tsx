"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ExternalLink, Loader2 } from "lucide-react"

interface AffiliateButtonProps {
  brokerId: string
  brokerName: string
  url: string
  variant?: "default" | "outline" | "ghost"
  size?: "default" | "sm" | "lg" | "icon"
  trackingSource?: string
  children?: React.ReactNode
}

export function AffiliateButton({
  brokerId,
  brokerName,
  url,
  variant = "default",
  size = "default",
  trackingSource = "broker_detail",
  children,
}: AffiliateButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Track the click
      const response = await fetch("/api/affiliate/click", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          brokerId,
          source: trackingSource,
          referrer: window.location.href,
        }),
      })

      const data = await response.json()

      if (data.success && data.trackingUrl) {
        // Redirect to tracking URL
        window.open(data.trackingUrl, "_blank", "noopener,noreferrer")
      } else {
        // Fallback to direct URL
        window.open(url, "_blank", "noopener,noreferrer")
      }
    } catch (err) {
      console.error("Error tracking affiliate click:", err)
      // Fallback to direct URL
      window.open(url, "_blank", "noopener,noreferrer")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      onClick={handleClick}
      variant={variant}
      size={size}
      disabled={loading}
      className="relative"
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Redirecting...
        </>
      ) : (
        <>
          {children || (
            <>
              Visit {brokerName}
              <ExternalLink className="ml-2 h-4 w-4" />
            </>
          )}
        </>
      )}
    </Button>
  )
}

