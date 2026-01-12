"use client"

import { useEffect } from "react"
import { usePathname, useSearchParams } from "next/navigation"

export function PageViewTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Track page view
    const trackPageView = async () => {
      const path = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : "")
      
      try {
        await fetch("/api/analytics/pageview", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            path,
            referrer: document.referrer || null,
            userAgent: navigator.userAgent || null,
          }),
        })
      } catch (error) {
        // Silent fail - don't interrupt user experience
        console.error("Error tracking page view:", error)
      }
    }

    trackPageView()
  }, [pathname, searchParams])

  return null
}
