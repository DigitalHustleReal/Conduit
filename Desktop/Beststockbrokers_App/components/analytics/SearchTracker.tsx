"use client"

export function trackSearch(query: string, resultsCount: number) {
  if (!query || query.trim().length === 0) return

  fetch("/api/analytics/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: query.trim(),
      resultsCount,
    }),
  }).catch((error) => {
    // Silent fail
    console.error("Error tracking search:", error)
  })
}
