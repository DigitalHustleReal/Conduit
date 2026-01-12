import { prisma } from "@/lib/db"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { getCountryName } from "@/lib/countries"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Stock Brokers by Country | BestStockBrokers.org",
  description: "Find the best stock brokers available in your country. Browse brokers by country and compare options.",
  keywords: ["brokers by country", "country brokers", "regional brokers", "local brokers"],
  openGraph: {
    title: "Stock Brokers by Country | BestStockBrokers.org",
    description: "Find the best stock brokers available in your country.",
    type: "website",
  },
}

export default async function CountriesPage() {
  // Get all countries that have brokers
  const brokers = await prisma.broker.findMany({
    where: {
      isActive: true,
    },
    select: {
      supportedCountries: true,
    },
  })

  // Extract unique countries
  const countrySet = new Set<string>()
  brokers.forEach((broker) => {
    broker.supportedCountries.forEach((country) => countrySet.add(country))
  })

  const countries = Array.from(countrySet).sort()

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Brokers by Country</h1>
        <p className="text-lg text-gray-600">
          Find the best stock brokers available in your country
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {countries.map((code) => (
          <Link
            key={code}
            href={`/countries/${code.toLowerCase()}`}
            className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="font-semibold text-gray-900">
              {getCountryName(code)}
            </div>
            <div className="text-sm text-gray-500 mt-1">{code}</div>
          </Link>
        ))}
      </div>

      {countries.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-600">No countries available yet.</p>
          <p className="text-sm text-gray-500 mt-2">
            Add brokers to see countries listed here.
          </p>
        </div>
      )}
    </div>
  )
}

