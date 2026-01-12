"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Search, ArrowRight } from "lucide-react"
import Link from "next/link"

export function BrokerComparisonHero() {
  const [searchQuery, setSearchQuery] = useState("")

  return (
    <section className="bg-gradient-to-r from-blue-600 to-indigo-700 py-16 text-white">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-4 text-3xl font-bold md:text-4xl">
            Compare Brokers Side-by-Side
          </h2>
          <p className="mb-8 text-lg text-blue-100">
            Find the perfect broker by comparing fees, features, and ratings
          </p>
          
          {/* Search Bar */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search brokers by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border-0 bg-white px-10 py-3 text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <Button
              asChild
              size="lg"
              className="bg-white text-blue-600 hover:bg-gray-100"
            >
              <Link href={`/brokers?search=${encodeURIComponent(searchQuery)}`}>
                Search
              </Link>
            </Button>
          </div>

          <Button
            asChild
            variant="outline"
            size="lg"
            className="border-white text-white hover:bg-white/10"
          >
            <Link href="/compare">
              Start Comparing <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}






