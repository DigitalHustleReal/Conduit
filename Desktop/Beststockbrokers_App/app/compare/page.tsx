import { EnhancedComparisonTool } from "@/components/compare/EnhancedComparisonTool"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Compare Stock Brokers Side-by-Side | BestStockBrokers.org",
  description: "Compare multiple stock brokers side-by-side. Compare fees, features, platforms, and ratings to find the best broker for your needs.",
  keywords: ["compare brokers", "broker comparison", "stock broker comparison", "trading platform comparison"],
  openGraph: {
    title: "Compare Stock Brokers Side-by-Side | BestStockBrokers.org",
    description: "Compare multiple stock brokers side-by-side. Compare fees, features, platforms, and ratings.",
    type: "website",
  },
}

export default function ComparePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="mb-4 text-4xl font-bold text-gray-900">Compare Brokers</h1>
        <p className="text-lg text-gray-600">
          Select up to 5 brokers to compare side-by-side
        </p>
      </div>
      <EnhancedComparisonTool />
    </div>
  )
}

