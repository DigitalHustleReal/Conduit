import { BrokerList } from "@/components/brokers/BrokerList"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "All Stock Brokers | Compare & Review | BestStockBrokers.org",
  description: "Browse and compare stock brokers from around the world. Find detailed information on fees, features, platforms, and ratings.",
  keywords: ["stock brokers", "broker list", "compare brokers", "trading platforms", "broker reviews"],
  openGraph: {
    title: "All Stock Brokers | Compare & Review | BestStockBrokers.org",
    description: "Browse and compare stock brokers from around the world.",
    type: "website",
  },
}

export default function BrokersPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="mb-4 text-4xl font-bold text-gray-900">All Brokers</h1>
        <p className="text-lg text-gray-600">
          Browse and compare stock brokers from around the world
        </p>
      </div>
      <BrokerList />
    </div>
  )
}

