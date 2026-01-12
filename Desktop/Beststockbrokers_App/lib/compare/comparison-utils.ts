/**
 * Comparison utilities for broker comparison
 */

export interface ComparisonValue {
  value: string | number | boolean | null
  isBest?: boolean
  isWorst?: boolean
  displayValue: string
}

export interface ComparisonRow {
  label: string
  category: string
  values: ComparisonValue[]
  sortOrder?: number
  highlightBest?: boolean
}

/**
 * Find the best value in an array (for numbers - lowest is best, for booleans - true is best)
 */
export function findBestValue(
  values: (number | string | boolean | null)[],
  lowerIsBetter: boolean = true
): number | null {
  const numericValues = values.filter(
    (v) => typeof v === "number" && v !== null
  ) as number[]

  if (numericValues.length === 0) return null

  return lowerIsBetter
    ? Math.min(...numericValues)
    : Math.max(...numericValues)
}

/**
 * Format currency value
 */
export function formatCurrency(
  amount: number | null,
  currency: string = "USD"
): string {
  if (amount === null || amount === undefined) return "N/A"
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Format percentage
 */
export function formatPercentage(value: number | null): string {
  if (value === null || value === undefined) return "N/A"
  return `${value.toFixed(2)}%`
}

/**
 * Format rating
 */
export function formatRating(rating: number | null): string {
  if (rating === null || rating === undefined) return "N/A"
  return rating.toFixed(1)
}

/**
 * Compare numeric values and mark best/worst
 */
export function compareNumericValues(
  values: (number | null)[],
  lowerIsBetter: boolean = true
): ComparisonValue[] {
  const best = findBestValue(values, lowerIsBetter)
  const worst = lowerIsBetter
    ? Math.max(...(values.filter((v) => v !== null) as number[]))
    : Math.min(...(values.filter((v) => v !== null) as number[]))

  return values.map((value) => {
    const displayValue =
      value === null ? "N/A" : typeof value === "number" ? value.toString() : value

    return {
      value,
      displayValue,
      isBest: value === best && value !== null,
      isWorst: value === worst && value !== null && best !== worst,
    }
  })
}

/**
 * Compare boolean values (true is best)
 */
export function compareBooleanValues(values: (boolean | null)[]): ComparisonValue[] {
  const hasTrue = values.some((v) => v === true)

  return values.map((value) => ({
    value,
    displayValue: value === null ? "N/A" : value ? "Yes" : "No",
    isBest: value === true && hasTrue,
    isWorst: value === false && hasTrue,
  }))
}

/**
 * Compare rating values (higher is better)
 */
export function compareRatings(values: (number | null)[]): ComparisonValue[] {
  return compareNumericValues(values, false)
}

/**
 * Compare fee values (lower is better)
 */
export function compareFees(values: (number | null)[]): ComparisonValue[] {
  return compareNumericValues(values, true)
}

/**
 * Compare deposit values (lower is better)
 */
export function compareDeposits(values: (number | null)[]): ComparisonValue[] {
  return compareNumericValues(values, true)
}

/**
 * Get comparison badge class for styling
 */
export function getComparisonBadgeClass(
  isBest: boolean | undefined,
  isWorst: boolean | undefined
): string {
  if (isBest) return "bg-green-100 text-green-800 border-green-200"
  if (isWorst) return "bg-red-50 text-red-600 border-red-100"
  return "bg-gray-50 text-gray-700 border-gray-200"
}

/**
 * Sort comparison rows by category
 */
export function sortComparisonRows(rows: ComparisonRow[]): ComparisonRow[] {
  const categoryOrder = [
    "overview",
    "fees",
    "features",
    "platforms",
    "ratings",
    "other",
  ]

  return rows.sort((a, b) => {
    const aIndex = categoryOrder.indexOf(a.category)
    const bIndex = categoryOrder.indexOf(b.category)

    if (aIndex !== bIndex) {
      return aIndex - bIndex
    }

    return (a.sortOrder || 0) - (b.sortOrder || 0)
  })
}

/**
 * Group comparison rows by category
 */
export function groupComparisonRowsByCategory(
  rows: ComparisonRow[]
): Record<string, ComparisonRow[]> {
  return rows.reduce(
    (acc, row) => {
      if (!acc[row.category]) {
        acc[row.category] = []
      }
      acc[row.category].push(row)
      return acc
    },
    {} as Record<string, ComparisonRow[]>
  )
}
