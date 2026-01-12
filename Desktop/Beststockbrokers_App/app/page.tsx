import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BrokerComparisonHero } from "@/components/home/BrokerComparisonHero";
import { FeaturedBrokers } from "@/components/home/FeaturedBrokers";
import { WhyChooseUs } from "@/components/home/WhyChooseUs";
import { StatsSection } from "@/components/home/StatsSection";

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-20 lg:py-32">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="mb-6 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl md:text-6xl lg:text-7xl">
              Find the Best Stock Broker
              <span className="block text-blue-600">for Your Needs</span>
            </h1>
            <p className="mb-8 text-lg text-gray-600 sm:text-xl md:text-2xl">
              Compare brokers from around the world. Get detailed insights, real user reviews, and find the perfect trading platform.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Button asChild size="lg" className="text-lg px-8 py-6">
                <Link href="/compare">Compare Brokers</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="text-lg px-8 py-6">
                <Link href="/brokers">Browse All Brokers</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <StatsSection />

      {/* Quick Comparison Tool */}
      <BrokerComparisonHero />

      {/* Featured Brokers */}
      <FeaturedBrokers />

      {/* Why Choose Us */}
      <WhyChooseUs />
    </div>
  );
}






