/**
 * Geography categorization utilities
 */

export type GeographyCategory = "global" | "continent" | "country"

export interface Continent {
  code: string
  name: string
  countries: string[]
}

export const CONTINENTS: Record<string, Continent> = {
  north_america: {
    code: "north_america",
    name: "North America",
    countries: ["US", "CA", "MX"],
  },
  south_america: {
    code: "south_america",
    name: "South America",
    countries: ["BR", "AR", "CL", "CO", "PE", "VE", "EC", "PY", "UY", "BO"],
  },
  europe: {
    code: "europe",
    name: "Europe",
    countries: [
      "GB", "DE", "FR", "IT", "ES", "NL", "BE", "AT", "CH", "SE", "NO", "DK",
      "FI", "PL", "IE", "PT", "GR", "CZ", "HU", "RO", "BG", "HR", "SK", "SI",
      "EE", "LV", "LT", "LU", "MT", "CY", "IS", "LI", "MC", "AD", "SM", "VA",
    ],
  },
  asia: {
    code: "asia",
    name: "Asia",
    countries: [
      "CN", "JP", "IN", "KR", "SG", "HK", "TW", "TH", "MY", "ID", "PH", "VN",
      "PK", "BD", "LK", "MM", "KH", "LA", "MN", "NP", "BT", "AF", "KZ", "UZ",
      "AZ", "GE", "AM", "KG", "TJ", "TM",
    ],
  },
  oceania: {
    code: "oceania",
    name: "Oceania",
    countries: ["AU", "NZ", "FJ", "PG", "NC", "PF", "WS", "TO", "VU", "SB"],
  },
  africa: {
    code: "africa",
    name: "Africa",
    countries: [
      "ZA", "EG", "KE", "NG", "MA", "GH", "TZ", "ET", "UG", "AO", "DZ", "SD",
      "ZW", "ZM", "TN", "CM", "CI", "MG", "SN", "MW", "ML", "BF", "RW", "BJ",
    ],
  },
  middle_east: {
    code: "middle_east",
    name: "Middle East",
    countries: ["AE", "SA", "IL", "TR", "IQ", "IR", "JO", "LB", "KW", "OM", "QA", "BH", "YE"],
  },
}

/**
 * Get continent for a country code
 */
export function getContinentForCountry(countryCode: string): string | null {
  const code = countryCode.toUpperCase()
  for (const [continentCode, continent] of Object.entries(CONTINENTS)) {
    if (continent.countries.includes(code)) {
      return continentCode
    }
  }
  return null
}

/**
 * Get all continents for multiple countries
 */
export function getContinentsForCountries(countryCodes: string[]): string[] {
  const continents = new Set<string>()
  countryCodes.forEach((code) => {
    const continent = getContinentForCountry(code)
    if (continent) {
      continents.add(continent)
    }
  })
  return Array.from(continents)
}

/**
 * Check if broker is global (supports 10+ countries across 2+ continents)
 */
export function isGlobalBroker(countryCodes: string[]): boolean {
  if (countryCodes.length < 10) return false
  const continents = getContinentsForCountries(countryCodes)
  return continents.length >= 2
}

/**
 * Categorize broker geography
 */
export function categorizeBrokerGeography(countryCodes: string[]): {
  category: GeographyCategory
  continents: string[]
  isGlobal: boolean
  primaryContinent?: string
} {
  const isGlobal = isGlobalBroker(countryCodes)
  const continents = getContinentsForCountries(countryCodes)
  
  // Determine primary continent (most countries)
  const continentCounts: Record<string, number> = {}
  countryCodes.forEach((code) => {
    const continent = getContinentForCountry(code)
    if (continent) {
      continentCounts[continent] = (continentCounts[continent] || 0) + 1
    }
  })
  
  const primaryContinent = Object.entries(continentCounts).sort(
    (a, b) => b[1] - a[1]
  )[0]?.[0]

  return {
    category: isGlobal ? "global" : continents.length > 1 ? "continent" : "country",
    continents,
    isGlobal,
    primaryContinent,
  }
}

/**
 * Filter brokers by geography category
 */
export function filterByGeography(
  brokers: Array<{ supportedCountries?: string[] | null }>,
  category: GeographyCategory,
  value?: string // continent code or country code
): Array<{ supportedCountries?: string[] | null }> {
  if (category === "global") {
    return brokers.filter((broker) => {
      const countries = broker.supportedCountries || []
      return isGlobalBroker(countries)
    })
  }

  if (category === "continent" && value) {
    const continent = CONTINENTS[value]
    if (!continent) return brokers
    
    return brokers.filter((broker) => {
      const countries = broker.supportedCountries || []
      return continent.countries.some((country) => countries.includes(country))
    })
  }

  if (category === "country" && value) {
    return brokers.filter((broker) => {
      const countries = broker.supportedCountries || []
      return countries.includes(value.toUpperCase())
    })
  }

  return brokers
}

/**
 * Get continent label
 */
export function getContinentLabel(continentCode: string): string {
  return CONTINENTS[continentCode]?.name || continentCode
}
