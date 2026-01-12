"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { X, Plus, Search } from "lucide-react"

interface Broker {
  id: string
  name: string
  slug: string
  description: string | null
  minimumDeposit: number | null
  fees: Array<{
    feeType: string
    instrumentType: string
    feeAmount: number | null
    feePercentage: number | null
    feeCurrency: string
  }>
  features: Array<{
    category: string
    featureName: string
    isAvailable: boolean
  }>
  ratings: Array<{
    category: string
    rating: number
  }>
}

export function ComparisonTool() {
  const [selectedBrokers, setSelectedBrokers] = useState<string[]>([])
  const [brokerData, setBrokerData] = useState<Broker[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<Broker[]>([])
  const [loading, setLoading] = useState(false)

  const maxBrokers = 5

  const handleSearch = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([])
      return
    }

    try {
      const response = await fetch(`/api/brokers?search=${encodeURIComponent(query)}`)
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
      setBrokerData(data.brokers || [])
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBrokers])

  return (
    <div>
      {/* Broker Selection */}
      <div className="mb-8 rounded-lg border bg-white p-6">
        <h2 className="mb-4 text-xl font-semibold">Select Brokers to Compare</h2>
        
        {/* Selected Brokers */}
        <div className="mb-4 flex flex-wrap gap-2">
          {selectedBrokers.map((brokerId) => {
            const broker = brokerData.find((b) => b.id === brokerId) || 
                          searchResults.find((b) => b.id === brokerId)
            return (
              <div
                key={brokerId}
                className="flex items-center gap-2 rounded-lg bg-blue-100 px-3 py-1.5"
              >
                <span className="text-sm font-medium">{broker?.name || brokerId}</span>
                <button
                  onClick={() => removeBroker(brokerId)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )
          })}
          
          {selectedBrokers.length < maxBrokers && (
            <div className="relative">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search broker..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    handleSearch(e.target.value)
                  }}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
              
              {searchResults.length > 0 && (
                <div className="absolute z-10 mt-1 w-full rounded-lg border bg-white shadow-lg">
                  {searchResults
                    .filter((b) => !selectedBrokers.includes(b.id))
                    .slice(0, 5)
                    .map((broker) => (
                      <button
                        key={broker.id}
                        onClick={() => addBroker(broker.id)}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
                      >
                        {broker.name}
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

      {/* Comparison Table */}
      {brokerData.length >= 2 && (
        <div className="overflow-x-auto rounded-lg border bg-white">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                  Feature
                </th>
                {brokerData.map((broker) => (
                  <th key={broker.id} className="px-6 py-4 text-center text-sm font-semibold text-gray-900">
                    {broker.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {/* Minimum Deposit */}
              <tr>
                <td className="px-6 py-4 font-medium">Minimum Deposit</td>
                {brokerData.map((broker) => (
                  <td key={broker.id} className="px-6 py-4 text-center text-sm">
                    {broker.minimumDeposit
                      ? `$${broker.minimumDeposit}`
                      : "N/A"}
                  </td>
                ))}
              </tr>

              {/* Stock Commission */}
              <tr className="bg-gray-50">
                <td className="px-6 py-4 font-medium">Stock Commission</td>
                {brokerData.map((broker) => {
                  const stockFee = broker.fees.find(
                    (f) => f.instrumentType === "stocks" && f.feeType === "commission"
                  )
                  return (
                    <td key={broker.id} className="px-6 py-4 text-center text-sm">
                      {stockFee
                        ? stockFee.feeAmount
                          ? `$${stockFee.feeAmount}`
                          : stockFee.feePercentage
                          ? `${stockFee.feePercentage}%`
                          : "N/A"
                        : "N/A"}
                    </td>
                  )
                })}
              </tr>

              {/* Overall Rating */}
              <tr className="bg-gray-50">
                <td className="px-6 py-4 font-medium">Overall Rating</td>
                {brokerData.map((broker) => {
                  const overallRating = broker.ratings.find((r) => r.category === "overall")
                  return (
                    <td key={broker.id} className="px-6 py-4 text-center text-sm">
                      {overallRating ? overallRating.rating.toFixed(1) : "N/A"}
                    </td>
                  )
                })}
              </tr>

              {/* Regulation */}
              <tr>
                <td className="px-6 py-4 font-medium">Regulated</td>
                {brokerData.map((broker) => (
                  <td key={broker.id} className="px-6 py-4 text-center text-sm">
                    {broker.isRegulated ? "Yes" : "No"}
                  </td>
                ))}
              </tr>

              {/* Regulation Bodies */}
              <tr className="bg-gray-50">
                <td className="px-6 py-4 font-medium">Regulation Bodies</td>
                {brokerData.map((broker) => (
                  <td key={broker.id} className="px-6 py-4 text-center text-sm">
                    {broker.regulationBodies && broker.regulationBodies.length > 0
                      ? broker.regulationBodies.join(", ")
                      : "N/A"}
                  </td>
                ))}
              </tr>

              {/* Account Types */}
              <tr>
                <td className="px-6 py-4 font-medium">Account Types</td>
                {brokerData.map((broker) => (
                  <td key={broker.id} className="px-6 py-4 text-center text-sm">
                    {broker.accountTypes && broker.accountTypes.length > 0
                      ? broker.accountTypes.join(", ")
                      : "N/A"}
                  </td>
                ))}
              </tr>

              {/* Supported Countries */}
              <tr className="bg-gray-50">
                <td className="px-6 py-4 font-medium">Supported Countries</td>
                {brokerData.map((broker) => (
                  <td key={broker.id} className="px-6 py-4 text-center text-sm">
                    {broker.supportedCountries && broker.supportedCountries.length > 0
                      ? `${broker.supportedCountries.length} countries`
                      : "N/A"}
                  </td>
                ))}
              </tr>

              {/* ETF Commission */}
              <tr>
                <td className="px-6 py-4 font-medium">ETF Commission</td>
                {brokerData.map((broker) => {
                  const etfFee = broker.fees.find(
                    (f) => f.instrumentType === "etf" && f.feeType === "commission"
                  )
                  return (
                    <td key={broker.id} className="px-6 py-4 text-center text-sm">
                      {etfFee
                        ? etfFee.feeAmount
                          ? `$${etfFee.feeAmount}`
                          : etfFee.feePercentage
                          ? `${etfFee.feePercentage}%`
                          : "Free"
                        : "N/A"}
                    </td>
                  )
                })}
              </tr>

              {/* Options Trading */}
              <tr className="bg-gray-50">
                <td className="px-6 py-4 font-medium">Options Trading</td>
                {brokerData.map((broker) => {
                  const optionsFeature = broker.features.find(
                    (f) => f.featureName === "Options Trading" && f.category === "trading"
                  )
                  return (
                    <td key={broker.id} className="px-6 py-4 text-center text-sm">
                      {optionsFeature?.isAvailable ? "Yes" : "No"}
                    </td>
                  )
                })}
              </tr>

              {/* Fractional Shares */}
              <tr>
                <td className="px-6 py-4 font-medium">Fractional Shares</td>
                {brokerData.map((broker) => {
                  const fractionalFeature = broker.features.find(
                    (f) => f.featureName === "Fractional Shares" && f.category === "trading"
                  )
                  return (
                    <td key={broker.id} className="px-6 py-4 text-center text-sm">
                      {fractionalFeature?.isAvailable ? "Yes" : "No"}
                    </td>
                  )
                })}
              </tr>

              {/* Mobile App */}
              <tr className="bg-gray-50">
                <td className="px-6 py-4 font-medium">Mobile App</td>
                {brokerData.map((broker) => {
                  const mobilePlatform = broker.platforms.find(
                    (p) => p.platformType === "mobile"
                  )
                  return (
                    <td key={broker.id} className="px-6 py-4 text-center text-sm">
                      {mobilePlatform ? "Yes" : "No"}
                    </td>
                  )
                })}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {selectedBrokers.length < 2 && (
        <div className="rounded-lg border bg-gray-50 p-12 text-center">
          <p className="text-lg text-gray-600">
            Select at least 2 brokers to start comparing
          </p>
        </div>
      )}
    </div>
  )
}

