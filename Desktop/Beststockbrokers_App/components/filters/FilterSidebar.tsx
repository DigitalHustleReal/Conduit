"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { X, Filter } from "lucide-react"

interface FilterSidebarProps {
  isOpen: boolean
  onClose: () => void
  filters: {
    countries: string[]
    instruments: string[]
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
]

const instruments = [
  "Stocks",
  "ETFs",
  "Options",
  "Futures",
  "Forex",
  "Crypto",
  "Bonds",
]

export function FilterSidebar({
  isOpen,
  onClose,
  filters,
  onFilterChange,
}: FilterSidebarProps) {
  const [localFilters, setLocalFilters] = useState(filters)

  const handleApply = () => {
    onFilterChange(localFilters)
  }

  const handleReset = () => {
    const resetFilters = {
      countries: [],
      instruments: [],
      minDeposit: null,
      maxDeposit: null,
      minRating: null,
    }
    setLocalFilters(resetFilters)
    onFilterChange(resetFilters)
  }

  // Filter content component (reusable for both desktop and mobile)
  const filterContent = (
    <div className="space-y-6">
      {/* Countries */}
      <div>
        <h3 className="font-medium mb-3">Countries</h3>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {countries.map((country) => (
            <label key={country.code} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={localFilters.countries.includes(country.code)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setLocalFilters({
                      ...localFilters,
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

      {/* Trading Instruments */}
      <div>
        <h3 className="font-medium mb-3">Trading Instruments</h3>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {instruments.map((instrument) => (
            <label key={instrument} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={localFilters.instruments.includes(instrument)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setLocalFilters({
                      ...localFilters,
                      instruments: [...localFilters.instruments, instrument],
                    })
                  } else {
                    setLocalFilters({
                      ...localFilters,
                      instruments: localFilters.instruments.filter((i) => i !== instrument),
                    })
                  }
                }}
                className="rounded"
              />
              <span className="text-sm">{instrument}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Minimum Deposit */}
      <div>
        <h3 className="font-medium mb-3">Minimum Deposit</h3>
        <div className="space-y-2">
          <input
            type="number"
            placeholder="Min"
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
            placeholder="Max"
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
        <h3 className="font-medium mb-3">Minimum Rating</h3>
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

      {/* Actions */}
      <div className="flex gap-2 pt-4 border-t">
        <Button onClick={handleApply} className="flex-1" size="sm">
          Apply
        </Button>
        <Button variant="outline" onClick={handleReset} size="sm">
          Reset
        </Button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar (always visible on large screens) */}
      <div className="hidden lg:block w-64 flex-shrink-0">
        <div className="sticky top-4 rounded-lg border bg-white p-4 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </h2>
          {filterContent}
        </div>
      </div>

      {/* Mobile sidebar (overlay) */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />
        <div className="absolute right-0 top-0 h-full w-80 bg-white shadow-xl overflow-y-auto">
          <div className="absolute inset-0 bg-black/50" onClick={onClose} />
          <div className="absolute right-0 top-0 h-full w-80 bg-white shadow-xl overflow-y-auto">
            <div className="p-4 border-b flex items-center justify-between">
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

