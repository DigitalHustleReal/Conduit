"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { X, Filter, Globe, Layers, Zap } from "lucide-react"
import { CONTINENTS, getContinentLabel } from "@/lib/categorization/geography"
import { BROKER_TYPES, getBrokerTypesByCategory } from "@/lib/categorization/broker-types"
import { FEATURE_CATEGORIES } from "@/lib/categorization/features"

interface EnhancedFilterSidebarProps {
  isOpen: boolean
  onClose: () => void
  filters: {
    geographyCategory?: "global" | "continent" | "country"
    geographyValue?: string
    countries: string[]
    brokerTypes: string[]
    featureCategories: string[]
    minDeposit: number | null
    maxDeposit: number | null
    minRating: number | null
  }
  onFilterChange: (filters: any) => void
}

const countries = [
  { code: "US", name: "United States" },
  { code: "UK", name: "United Kingdom" },
  { code: "CA", name: "Canada" },
  { code: "AU", name: "Australia" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "IT", name: "Italy" },
  { code: "ES", name: "Spain" },
  { code: "NL", name: "Netherlands" },
  { code: "JP", name: "Japan" },
  { code: "SG", name: "Singapore" },
  { code: "HK", name: "Hong Kong" },
]

export function EnhancedFilterSidebar({
  isOpen,
  onClose,
  filters,
  onFilterChange,
}: EnhancedFilterSidebarProps) {
  const [localFilters, setLocalFilters] = useState(filters)
  const [activeTab, setActiveTab] = useState<"geography" | "type" | "features" | "other">("geography")

  const handleApply = () => {
    onFilterChange(localFilters)
  }

  const handleReset = () => {
    const resetFilters = {
      geographyCategory: undefined,
      geographyValue: undefined,
      countries: [],
      brokerTypes: [],
      featureCategories: [],
      minDeposit: null,
      maxDeposit: null,
      minRating: null,
    }
    setLocalFilters(resetFilters)
    onFilterChange(resetFilters)
  }

  const serviceModeTypes = getBrokerTypesByCategory("service_mode")
  const specializationTypes = getBrokerTypesByCategory("specialization")

  const filterContent = (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab("geography")}
          className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
            activeTab === "geography"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <Globe className="mx-auto mb-1 h-4 w-4" />
          Geography
        </button>
        <button
          onClick={() => setActiveTab("type")}
          className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
            activeTab === "type"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <Layers className="mx-auto mb-1 h-4 w-4" />
          Type
        </button>
        <button
          onClick={() => setActiveTab("features")}
          className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
            activeTab === "features"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <Zap className="mx-auto mb-1 h-4 w-4" />
          Features
        </button>
      </div>

      {/* Geography Tab */}
      {activeTab === "geography" && (
        <div className="space-y-4">
          {/* Global Brokers */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="geography"
                checked={localFilters.geographyCategory === "global"}
                onChange={() =>
                  setLocalFilters({
                    ...localFilters,
                    geographyCategory: "global",
                    geographyValue: undefined,
                    countries: [],
                  })
                }
                className="rounded"
              />
              <div>
                <span className="font-medium text-sm">Global Brokers</span>
                <p className="text-xs text-gray-500">Operate in 10+ countries across multiple continents</p>
              </div>
            </label>
          </div>

          {/* Continents */}
          <div>
            <h3 className="font-medium mb-2 text-sm">Continents</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {Object.entries(CONTINENTS).map(([code, continent]) => (
                <label key={code} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="geography"
                    checked={
                      localFilters.geographyCategory === "continent" &&
                      localFilters.geographyValue === code
                    }
                    onChange={() =>
                      setLocalFilters({
                        ...localFilters,
                        geographyCategory: "continent",
                        geographyValue: code,
                        countries: [],
                      })
                    }
                    className="rounded"
                  />
                  <span className="text-sm">{continent.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Countries */}
          <div>
            <h3 className="font-medium mb-2 text-sm">Specific Countries</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {countries.map((country) => (
                <label key={country.code} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localFilters.countries.includes(country.code)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setLocalFilters({
                          ...localFilters,
                          geographyCategory: "country",
                          countries: [...localFilters.countries, country.code],
                        })
                      } else {
                        setLocalFilters({
                          ...localFilters,
                          countries: localFilters.countries.filter((c) => c !== country.code),
                        })
                      }
                    }}
                    className="rounded"
                  />
                  <span className="text-sm">{country.name}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Broker Type Tab */}
      {activeTab === "type" && (
        <div className="space-y-4">
          {/* Service Mode */}
          <div>
            <h3 className="font-medium mb-2 text-sm">Service Mode</h3>
            <div className="space-y-2">
              {serviceModeTypes.map((type) => (
                <label key={type.value} className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localFilters.brokerTypes.includes(type.value)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setLocalFilters({
                          ...localFilters,
                          brokerTypes: [...localFilters.brokerTypes, type.value],
                        })
                      } else {
                        setLocalFilters({
                          ...localFilters,
                          brokerTypes: localFilters.brokerTypes.filter((t) => t !== type.value),
                        })
                      }
                    }}
                    className="mt-1 rounded"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium">{type.label}</span>
                    <p className="text-xs text-gray-500">{type.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Specializations */}
          <div>
            <h3 className="font-medium mb-2 text-sm">Specializations</h3>
            <div className="space-y-2">
              {specializationTypes.map((type) => (
                <label key={type.value} className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localFilters.brokerTypes.includes(type.value)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setLocalFilters({
                          ...localFilters,
                          brokerTypes: [...localFilters.brokerTypes, type.value],
                        })
                      } else {
                        setLocalFilters({
                          ...localFilters,
                          brokerTypes: localFilters.brokerTypes.filter((t) => t !== type.value),
                        })
                      }
                    }}
                    className="mt-1 rounded"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium">{type.label}</span>
                    <p className="text-xs text-gray-500">{type.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Features Tab */}
      {activeTab === "features" && (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {FEATURE_CATEGORIES.map((category) => (
            <label key={category.key} className="flex items-start gap-2 cursor-pointer p-2 rounded hover:bg-gray-50">
              <input
                type="checkbox"
                checked={localFilters.featureCategories.includes(category.key)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setLocalFilters({
                      ...localFilters,
                      featureCategories: [...localFilters.featureCategories, category.key],
                    })
                  } else {
                    setLocalFilters({
                      ...localFilters,
                      featureCategories: localFilters.featureCategories.filter((c) => c !== category.key),
                    })
                  }
                }}
                className="mt-1 rounded"
              />
              <div className="flex-1">
                <span className="text-sm font-medium">{category.label}</span>
                <p className="text-xs text-gray-500">{category.description}</p>
              </div>
            </label>
          ))}
        </div>
      )}

      {/* Other Filters (always visible) */}
      <div className="pt-4 border-t space-y-4">
        {/* Minimum Deposit */}
        <div>
          <h3 className="font-medium mb-2 text-sm">Minimum Deposit</h3>
          <div className="space-y-2">
            <input
              type="number"
              placeholder="Min ($)"
              value={localFilters.minDeposit || ""}
              onChange={(e) =>
                setLocalFilters({
                  ...localFilters,
                  minDeposit: e.target.value ? parseFloat(e.target.value) : null,
                })
              }
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <input
              type="number"
              placeholder="Max ($)"
              value={localFilters.maxDeposit || ""}
              onChange={(e) =>
                setLocalFilters({
                  ...localFilters,
                  maxDeposit: e.target.value ? parseFloat(e.target.value) : null,
                })
              }
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        {/* Minimum Rating */}
        <div>
          <h3 className="font-medium mb-2 text-sm">Minimum Rating</h3>
          <input
            type="number"
            min="1"
            max="5"
            step="0.1"
            placeholder="e.g., 4.0"
            value={localFilters.minRating || ""}
            onChange={(e) =>
              setLocalFilters({
                ...localFilters,
                minRating: e.target.value ? parseFloat(e.target.value) : null,
              })
            }
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-4 border-t">
        <Button onClick={handleApply} className="flex-1" size="sm">
          Apply Filters
        </Button>
        <Button variant="outline" onClick={handleReset} size="sm">
          Reset
        </Button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:block w-72 flex-shrink-0">
        <div className="sticky top-4 rounded-lg border bg-white p-4 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </h2>
          {filterContent}
        </div>
      </div>

      {/* Mobile sidebar */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={onClose} />
          <div className="absolute right-0 top-0 h-full w-80 bg-white shadow-xl overflow-y-auto">
            <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
              </h2>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4">{filterContent}</div>
          </div>
        </div>
      )}
    </>
  )
}
