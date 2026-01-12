"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Star, Search, Filter, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FilterSidebar } from "@/components/filters/FilterSidebar"

interface Broker {
  id: string
  name: string
  slug: string
  description: string | null
  logoUrl: string | null
  minimumDeposit: number | null
  ratings: Array<{
    rating: number
    category: string
  }>
  fees: Array<{
    feeAmount: number | null
    feeCurrency: string
  }>
}

export function BrokerList() {
  const [brokers, setBrokers] = useState<Broker[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [filters, setFilters] = useState({
    countries: [] as string[],
    instruments: [] as string[],
    minDeposit: null as number | null,
    maxDeposit: null as number | null,
    minRating: null as number | null,
  })

  useEffect(() => {
    fetchBrokers()
  }, [filters])

  const fetchBrokers = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      
      if (search) params.append("search", search)
      if (filters.countries.length > 0) params.append("country", filters.countries.join(","))
      if (filters.minDeposit !== null) params.append("minDeposit", filters.minDeposit.toString())
      if (filters.maxDeposit !== null) params.append("maxDeposit", filters.maxDeposit.toString())
      if (filters.minRating !== null) params.append("minRating", filters.minRating.toString())

      const response = await fetch(`/api/brokers?${params.toString()}`)
      const data = await response.json()
      setBrokers(data.brokers || [])
    } catch (error) {
      console.error("Error fetching brokers:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (newFilters: typeof filters) => {
    setFilters(newFilters)
    setFiltersOpen(false)
  }

  const clearFilter = (filterType: keyof typeof filters) => {
    setFilters({ ...filters, [filterType]: filterType === "countries" || filterType === "instruments" ? [] : null })
  }

  const hasActiveFilters = 
    filters.countries.length > 0 ||
    filters.instruments.length > 0 ||
    filters.minDeposit !== null ||
    filters.maxDeposit !== null ||
    filters.minRating !== null

  const filteredBrokers = brokers.filter((broker) => {
    if (search && !broker.name.toLowerCase().includes(search.toLowerCase())) {
      return false
    }
    return true
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-lg text-gray-600">Loading brokers...</div>
      </div>
    )
  }

  return (
    <div className="flex gap-6">
      {/* Desktop Filter Sidebar */}
      <FilterSidebar
        isOpen={false}
        onClose={() => {}}
        filters={filters}
        onFilterChange={handleFilterChange}
      />

      <div className="flex-1">
      {/* Search and Filter Bar */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search brokers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-10 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>
        <Button 
          variant={hasActiveFilters ? "default" : "outline"}
          onClick={() => setFiltersOpen(true)}
        >
          <Filter className="mr-2 h-4 w-4" />
          Filters
          {hasActiveFilters && (
            <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-xs">
              {[
                filters.countries.length,
                filters.instruments.length,
                filters.minDeposit !== null ? 1 : 0,
                filters.maxDeposit !== null ? 1 : 0,
                filters.minRating !== null ? 1 : 0,
              ].reduce((a, b) => a + b, 0)}
            </span>
          )}
        </Button>
      </div>

      {/* Active Filters */}
      {hasActiveFilters && (
        <div className="mb-4 flex flex-wrap gap-2">
          {filters.countries.map((country) => (
            <span
              key={country}
              className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800"
            >
              {country}
              <button
                onClick={() => clearFilter("countries")}
                className="hover:text-blue-900"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          {filters.minDeposit !== null && (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800">
              Min: ${filters.minDeposit}
              <button onClick={() => clearFilter("minDeposit")} className="hover:text-blue-900">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {filters.minRating !== null && (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800">
              Rating: {filters.minRating}+
              <button onClick={() => clearFilter("minRating")} className="hover:text-blue-900">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFilters({
                countries: [],
                instruments: [],
                minDeposit: null,
                maxDeposit: null,
                minRating: null,
              })
            }}
          >
            Clear All
          </Button>
        </div>
      )}

      {/* Mobile Filter Sidebar */}
      <FilterSidebar
        isOpen={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        filters={filters}
        onFilterChange={handleFilterChange}
      />

      {/* Broker Grid */}
      {filteredBrokers.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-lg text-gray-600">No brokers found.</p>
          <p className="mt-2 text-sm text-gray-500">
            Try adjusting your search or filters.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredBrokers.map((broker) => {
            const overallRating = broker.ratings.find((r) => r.category === "overall")
            const rating = overallRating?.rating || 0

            return (
              <Link
                key={broker.id}
                href={`/brokers/${broker.slug}`}
                className="group rounded-lg border bg-white p-6 shadow-sm transition-all hover:shadow-lg"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div className="h-16 w-16 rounded bg-gray-200 flex items-center justify-center">
                    {broker.logoUrl ? (
                      <img src={broker.logoUrl} alt={broker.name} className="h-full w-full object-contain" />
                    ) : (
                      <span className="text-xs text-gray-400">Logo</span>
                    )}
                  </div>
                  {rating > 0 && (
                    <div className="flex items-center gap-1">
                      <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                      <span className="font-semibold">{rating.toFixed(1)}</span>
                    </div>
                  )}
                </div>
                <h3 className="mb-2 text-xl font-semibold text-gray-900 group-hover:text-blue-600">
                  {broker.name}
                </h3>
                <p className="mb-4 line-clamp-2 text-sm text-gray-600">
                  {broker.description || "No description available"}
                </p>
                <div className="flex items-center justify-between text-sm">
                  {broker.minimumDeposit && (
                    <span className="text-gray-600">
                      Min: ${broker.minimumDeposit}
                    </span>
                  )}
                  <span className="font-medium text-blue-600 group-hover:underline">
                    View Details →
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
      </div>
    </div>
  )
}

