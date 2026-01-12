"use client"

import { useState, useEffect } from "react"
import { BarChart3, Eye, Search, Users, TrendingUp } from "lucide-react"

interface AnalyticsData {
  stats: {
    totalPageViews: number
    uniqueVisitors: number
    totalSearches: number
    days: number
  }
  topPages: Array<{
    path: string
    _count: {
      path: number
    }
  }>
  topBrokers: Array<{
    slug: string
    count: number
  }>
  topSearches: Array<{
    query: string
    _count: {
      query: number
    }
  }>
}

export function AnalyticsDashboard() {
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(30)
  const [data, setData] = useState<AnalyticsData | null>(null)

  useEffect(() => {
    fetchAnalytics()
  }, [days])

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/analytics?days=${days}`)
      if (response.ok) {
        const analyticsData = await response.json()
        setData(analyticsData)
      } else {
        console.error("Failed to fetch analytics")
      }
    } catch (error) {
      console.error("Error fetching analytics:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analytics...</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="bg-white rounded-lg border p-8 text-center">
        <p className="text-gray-600">No analytics data available</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Time Period Selector */}
      <div className="bg-white rounded-lg border p-4 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">Time Period:</span>
        <div className="flex gap-2">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                days === d
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {d} days
            </button>
          ))}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600 mb-1">Total Page Views</div>
              <div className="text-3xl font-bold text-blue-600">{data.stats.totalPageViews.toLocaleString()}</div>
            </div>
            <Eye className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600 mb-1">Unique Visitors</div>
              <div className="text-3xl font-bold text-green-600">{data.stats.uniqueVisitors.toLocaleString()}</div>
            </div>
            <Users className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600 mb-1">Total Searches</div>
              <div className="text-3xl font-bold text-purple-600">{data.stats.totalSearches.toLocaleString()}</div>
            </div>
            <Search className="h-8 w-8 text-purple-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600 mb-1">Period</div>
              <div className="text-3xl font-bold text-gray-600">{data.stats.days} days</div>
            </div>
            <BarChart3 className="h-8 w-8 text-gray-600" />
          </div>
        </div>
      </div>

      {/* Top Pages */}
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-xl font-semibold mb-4">Top Pages</h2>
        <div className="space-y-3">
          {data.topPages.length > 0 ? (
            data.topPages.map((page, index) => (
              <div key={page.path} className="flex items-center justify-between py-2 border-b">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-500 w-6">{index + 1}</span>
                  <span className="text-sm text-gray-900">{page.path}</span>
                </div>
                <span className="text-sm font-semibold text-blue-600">{page._count.path.toLocaleString()} views</span>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-center py-4">No page views data</p>
          )}
        </div>
      </div>

      {/* Top Brokers */}
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-xl font-semibold mb-4">Top Brokers</h2>
        <div className="space-y-3">
          {data.topBrokers.length > 0 ? (
            data.topBrokers.map((broker, index) => (
              <div key={broker.slug} className="flex items-center justify-between py-2 border-b">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-500 w-6">{index + 1}</span>
                  <span className="text-sm text-gray-900">{broker.slug}</span>
                </div>
                <span className="text-sm font-semibold text-green-600">{broker.count.toLocaleString()} views</span>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-center py-4">No broker views data</p>
          )}
        </div>
      </div>

      {/* Top Searches */}
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-xl font-semibold mb-4">Top Search Queries</h2>
        <div className="space-y-3">
          {data.topSearches.length > 0 ? (
            data.topSearches.map((search, index) => (
              <div key={search.query} className="flex items-center justify-between py-2 border-b">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-500 w-6">{index + 1}</span>
                  <span className="text-sm text-gray-900">"{search.query}"</span>
                </div>
                <span className="text-sm font-semibold text-purple-600">{search._count.query.toLocaleString()} searches</span>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-center py-4">No search data</p>
          )}
        </div>
      </div>
    </div>
  )
}
