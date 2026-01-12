import { prisma } from "@/lib/db"

export async function StatsSection() {
  const [brokerCount, reviewCount] = await Promise.all([
    prisma.broker.count({
      where: { isActive: true },
    }),
    prisma.brokerReview.count({
      where: { verified: true },
    }),
  ])

  // Get unique countries
  const brokers = await prisma.broker.findMany({
    where: { isActive: true },
    select: { supportedCountries: true },
  })
  const countrySet = new Set<string>()
  brokers.forEach((broker) => {
    broker.supportedCountries.forEach((country) => countrySet.add(country))
  })
  const countryCount = countrySet.size

  const stats = [
    { 
      label: "Brokers Listed", 
      value: brokerCount > 0 ? `${brokerCount}+` : "0", 
      description: `From ${countryCount}+ countries` 
    },
    { 
      label: "Countries Covered", 
      value: countryCount > 0 ? `${countryCount}+` : "0", 
      description: "Global coverage" 
    },
    { 
      label: "User Reviews", 
      value: reviewCount > 0 ? `${reviewCount}+` : "0", 
      description: "Verified reviews" 
    },
    { 
      label: "Monthly Visitors", 
      value: "100K+", 
      description: "Growing community" 
    },
  ]

  return (
    <section className="bg-white py-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="mb-2 text-4xl font-bold text-blue-600">{stat.value}</div>
              <div className="mb-1 text-lg font-semibold text-gray-900">{stat.label}</div>
              <div className="text-sm text-gray-600">{stat.description}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

