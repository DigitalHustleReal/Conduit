"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { X, Search, Star, TrendingUp, DollarSign, CheckCircle2, XCircle, Download, Share2, ArrowUpDown } from "lucide-react"
import { formatCurrency, formatRating, compareRatings, compareFees, compareDeposits, compareBooleanValues, getComparisonBadgeClass, groupComparisonRowsByCategory } from "@/lib/compare/comparison-utils"

interface Broker {
  id: string
  name: string
  slug: string
  logoUrl?: string | null
  description: string | null
  minimumDeposit: number | null
  isRegulated: boolean
  regulationBodies: string[]
  accountTypes: string[]
  supportedCountries: string[]
  fees: Array<{
    feeType: string
    instrumentType: string
    feeAmount: number | null
    feePercentage: number | null
    feeCurrency: string
    feeStructure?: string
  }>
  features: Array<{
    category: string
    featureName: string
    featureValue?: string | null
    isAvailable: boolean
  }>
  platforms: Array<{
    platformName: string
    platformType: string
    osSupport: string[]
  }>
  ratings: Array<{
    category: string
    rating: number
  }>
}

interface ComparisonRow {
  label: string
  category: string
  values: Array<{
    value: string | number | boolean | null
    displayValue: string
    isBest?: boolean
    isWorst?: boolean
  }>
  highlightBest?: boolean
}

export function EnhancedComparisonTool() {
  const [selectedBrokers, setSelectedBrokers] = useState<string[]>([])
  const [brokerData, setBrokerData] = useState<Broker[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<Broker[]>([])
  const [loading, setLoading] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(["overview", "fees"]))
  const [sortBy, setSortBy] = useState<"default" | "rating" | "fees" | "deposit">("default")

  const maxBrokers = 5

  const handleSearch = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([])
      return
    }

    try {
      const response = await fetch(`/api/brokers?search=${encodeURIComponent(query)}&limit=10`)
      const data = await response.json()
      setSearchResults(data.brokers || [])
    } catch (error) {
      console.error("Error searching brokers:", error)
    }
  }

  const addBroker = (brokerId: string) => {
    if (selectedBrokers.length < maxBrokers && !selectedBrokers.includes(brokerId)) {
      setSelectedBrokers([...selectedBrokers, brokerId])
      setSearchQuery("")
      setSearchResults([])
    }
  }

  const removeBroker = (brokerId: string) => {
    setSelectedBrokers(selectedBrokers.filter((id) => id !== brokerId))
  }

  const compareBrokers = async () => {
    if (selectedBrokers.length < 2) return

    setLoading(true)
    try {
      const response = await fetch(`/api/compare?ids=${selectedBrokers.join(",")}`)
      const data = await response.json()
      
      // Sort brokers based on selected criteria
      let brokers = data.brokers || []
      if (sortBy !== "default") {
        brokers = [...brokers].sort((a, b) => {
          if (sortBy === "rating") {
            const aRating = a.ratings?.find((r: any) => r.category === "overall")?.rating || 0
            const bRating = b.ratings?.find((r: any) => r.category === "overall")?.rating || 0
            return bRating - aRating
          }
          if (sortBy === "fees") {
            const aFee = a.fees?.find((f: any) => f.instrumentType === "stocks" && f.feeType === "commission")?.feeAmount || Infinity
            const bFee = b.fees?.find((f: any) => f.instrumentType === "stocks" && f.feeType === "commission")?.feeAmount || Infinity
            return aFee - bFee
          }
          if (sortBy === "deposit") {
            return (a.minimumDeposit || Infinity) - (b.minimumDeposit || Infinity)
          }
          return 0
        })
      }
      
      setBrokerData(brokers)
    } catch (error) {
      console.error("Error comparing brokers:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (selectedBrokers.length >= 2) {
      compareBrokers()
    } else {
      setBrokerData([])
    }
  }, [selectedBrokers, sortBy])

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(category)) {
      newExpanded.delete(category)
    } else {
      newExpanded.add(category)
    }
    setExpandedCategories(newExpanded)
  }

  const buildComparisonRows = (): ComparisonRow[] => {
    if (brokerData.length < 2) return []

    const rows: ComparisonRow[] = []

    // Overview Section
    rows.push({
      label: "Overall Rating",
      category: "overview",
      values: compareRatings(
        brokerData.map((b) => {
          const rating = b.ratings?.find((r) => r.category === "overall")
          return rating?.rating || null
        })
      ),
      highlightBest: true,
    })

    rows.push({
      label: "Minimum Deposit",
      category: "overview",
      values: compareDeposits(brokerData.map((b) => b.minimumDeposit)),
      highlightBest: true,
    })

    rows.push({
      label: "Regulated",
      category: "overview",
      values: compareBooleanValues(brokerData.map((b) => b.isRegulated)),
      highlightBest: true,
    })

    rows.push({
      label: "Regulation Bodies",
      category: "overview",
      values: brokerData.map((b) => ({
        value: b.regulationBodies?.join(", ") || null,
        displayValue: b.regulationBodies?.length
          ? `${b.regulationBodies.length} regulator${b.regulationBodies.length > 1 ? "s" : ""}`
          : "N/A",
      })),
    })

    rows.push({
      label: "Supported Countries",
      category: "overview",
      values: brokerData.map((b) => ({
        value: b.supportedCountries?.length || null,
        displayValue: b.supportedCountries?.length
          ? `${b.supportedCountries.length} countries`
          : "N/A",
      })),
    })

    // Fees Section
    const stockFees = brokerData.map((b) => {
      const fee = b.fees?.find((f) => f.instrumentType === "stocks" && f.feeType === "commission")
      return fee?.feeAmount || fee?.feePercentage || null
    })

    rows.push({
      label: "Stock Commission",
      category: "fees",
      values: compareFees(stockFees).map((v, i) => ({
        ...v,
        displayValue:
          v.value === null
            ? "N/A"
            : brokerData[i].fees?.find((f) => f.instrumentType === "stocks" && f.feeType === "commission")
                ?.feeAmount
            ? formatCurrency(v.value as number)
            : `${v.value}%`,
      })),
      highlightBest: true,
    })

    const etfFees = brokerData.map((b) => {
      const fee = b.fees?.find((f) => f.instrumentType === "etf" && f.feeType === "commission")
      return fee?.feeAmount || fee?.feePercentage || null
    })

    rows.push({
      label: "ETF Commission",
      category: "fees",
      values: compareFees(etfFees).map((v, i) => ({
        ...v,
        displayValue:
          v.value === null
            ? "Free"
            : brokerData[i].fees?.find((f) => f.instrumentType === "etf" && f.feeType === "commission")
                ?.feeAmount
            ? formatCurrency(v.value as number)
            : `${v.value}%`,
      })),
      highlightBest: true,
    })

    // Features Section
    const keyFeatures = [
      "Options Trading",
      "Fractional Shares",
      "Mobile App",
      "Research Tools",
      "Paper Trading",
      "API Access",
    ]

    keyFeatures.forEach((featureName) => {
      const featureValues = brokerData.map((b) => {
        const feature = b.features?.find(
          (f) => f.featureName === featureName || f.featureName.toLowerCase().includes(featureName.toLowerCase())
        )
        return feature?.isAvailable || false
      })

      rows.push({
        label: featureName,
        category: "features",
        values: compareBooleanValues(featureValues),
        highlightBest: true,
      })
    })

    // Platforms Section
    rows.push({
      label: "Web Platform",
      category: "platforms",
      values: compareBooleanValues(
        brokerData.map((b) => b.platforms?.some((p) => p.platformType === "web") || false)
      ),
      highlightBest: true,
    })

    rows.push({
      label: "Desktop Platform",
      category: "platforms",
      values: compareBooleanValues(
        brokerData.map((b) => b.platforms?.some((p) => p.platformType === "desktop") || false)
      ),
      highlightBest: true,
    })

    rows.push({
      label: "Mobile App",
      category: "platforms",
      values: compareBooleanValues(
        brokerData.map((b) => b.platforms?.some((p) => p.platformType === "mobile") || false)
      ),
      highlightBest: true,
    })

    return rows
  }

  const comparisonRows = buildComparisonRows()
  const groupedRows = groupComparisonRowsByCategory(comparisonRows)

  const categoryLabels: Record<string, string> = {
    overview: "Overview",
    fees: "Fees & Commissions",
    features: "Features",
    platforms: "Platforms",
    ratings: "Ratings",
    other: "Other",
  }

  const shareComparison = () => {
    const url = `${window.location.origin}/compare?ids=${selectedBrokers.join(",")}`
    if (navigator.share) {
      navigator.share({
        title: "Broker Comparison",
        text: `Compare ${brokerData.map((b) => b.name).join(" vs ")}`,
        url,
      })
    } else {
      navigator.clipboard.writeText(url)
      alert("Comparison link copied to clipboard!")
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      {brokerData.length >= 2 && (
        <div className="flex flex-col gap-4 rounded-lg border bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="default">Default</option>
              <option value="rating">Rating (Highest)</option>
              <option value="fees">Fees (Lowest)</option>
              <option value="deposit">Deposit (Lowest)</option>
            </select>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={shareComparison}>
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </Button>
          </div>
        </div>
      )}

      {/* Broker Selection */}
      <div className="rounded-lg border bg-white p-6">
        <h2 className="mb-4 text-xl font-semibold">Select Brokers to Compare</h2>

        {/* Selected Brokers */}
        <div className="mb-4 flex flex-wrap gap-3">
          {selectedBrokers.map((brokerId) => {
            const broker = brokerData.find((b) => b.id === brokerId) || searchResults.find((b) => b.id === brokerId)
            return (
              <div
                key={brokerId}
                className="group flex items-center gap-2 rounded-lg border-2 border-blue-200 bg-blue-50 px-4 py-2 transition-colors hover:border-blue-300"
              >
                {broker?.logoUrl && (
                  <img
                    src={broker.logoUrl}
                    alt={broker.name}
                    className="h-6 w-6 rounded object-contain"
                  />
                )}
                <span className="text-sm font-medium text-gray-900">{broker?.name || brokerId}</span>
                <button
                  onClick={() => removeBroker(brokerId)}
                  className="text-gray-400 transition-colors hover:text-red-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )
          })}

          {selectedBrokers.length < maxBrokers && (
            <div className="relative flex-1 min-w-[200px]">
              <div className="relative flex items-center">
                <Search className="absolute left-3 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search broker to add..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    handleSearch(e.target.value)
                  }}
                  className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>

              {searchResults.length > 0 && (
                <div className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border bg-white shadow-lg">
                  {searchResults
                    .filter((b) => !selectedBrokers.includes(b.id))
                    .slice(0, 8)
                    .map((broker) => (
                      <button
                        key={broker.id}
                        onClick={() => addBroker(broker.id)}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50"
                      >
                        {broker.logoUrl && (
                          <img
                            src={broker.logoUrl}
                            alt={broker.name}
                            className="h-8 w-8 rounded object-contain"
                          />
                        )}
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{broker.name}</div>
                          {broker.shortDescription && (
                            <div className="text-xs text-gray-500">{broker.shortDescription}</div>
                          )}
                        </div>
                      </button>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>

        <p className="text-sm text-gray-600">
          {selectedBrokers.length} of {maxBrokers} brokers selected
        </p>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="rounded-lg border bg-white p-12 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-600">Loading comparison data...</p>
        </div>
      )}

      {/* Comparison Table */}
      {!loading && brokerData.length >= 2 && (
        <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
          {/* Sticky Header */}
          <div className="sticky top-0 z-10 bg-gray-50 border-b">
            <div className="grid gap-4 p-4" style={{ gridTemplateColumns: `200px repeat(${brokerData.length}, minmax(180px, 1fr))` }}>
              <div className="font-semibold text-gray-900">Feature</div>
              {brokerData.map((broker) => (
                <div key={broker.id} className="text-center">
                  {broker.logoUrl && (
                    <img
                      src={broker.logoUrl}
                      alt={broker.name}
                      className="mx-auto mb-2 h-10 w-10 rounded object-contain"
                    />
                  )}
                  <div className="font-semibold text-gray-900">{broker.name}</div>
                  <a
                    href={`/brokers/${broker.slug}`}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    View Details →
                  </a>
                </div>
              ))}
            </div>
          </div>

          {/* Comparison Rows by Category */}
          <div className="divide-y">
            {Object.entries(groupedRows).map(([category, rows]) => (
              <div key={category} className="border-b last:border-b-0">
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(category)}
                  className="flex w-full items-center justify-between bg-gray-50 px-6 py-4 text-left font-semibold text-gray-900 transition-colors hover:bg-gray-100"
                >
                  <span>{categoryLabels[category] || category}</span>
                  <ArrowUpDown
                    className={`h-4 w-4 text-gray-500 transition-transform ${
                      expandedCategories.has(category) ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* Category Rows */}
                {expandedCategories.has(category) && (
                  <div className="divide-y">
                    {rows.map((row, rowIndex) => (
                      <div
                        key={rowIndex}
                        className="grid gap-4 px-6 py-4 transition-colors hover:bg-gray-50"
                        style={{ gridTemplateColumns: `200px repeat(${brokerData.length}, minmax(180px, 1fr))` }}
                      >
                        <div className="flex items-center font-medium text-gray-700">
                          {row.label}
                        </div>
                        {row.values.map((value, valueIndex) => (
                          <div
                            key={valueIndex}
                            className={`flex items-center justify-center rounded-md border px-3 py-2 text-center text-sm font-medium ${
                              value.isBest && row.highlightBest
                                ? "bg-green-50 border-green-200 text-green-800"
                                : value.isWorst && row.highlightBest
                                ? "bg-red-50 border-red-200 text-red-700"
                                : "bg-white border-gray-200 text-gray-700"
                            }`}
                          >
                            {value.displayValue}
                            {value.isBest && row.highlightBest && (
                              <TrendingUp className="ml-1.5 h-3.5 w-3.5 text-green-600" />
                            )}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && selectedBrokers.length < 2 && (
        <div className="rounded-lg border border-dashed bg-gray-50 p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
            <Search className="h-8 w-8 text-blue-600" />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-gray-900">Select Brokers to Compare</h3>
          <p className="text-gray-600">
            Choose at least 2 brokers to see a detailed side-by-side comparison
          </p>
        </div>
      )}
    </div>
  )
}
