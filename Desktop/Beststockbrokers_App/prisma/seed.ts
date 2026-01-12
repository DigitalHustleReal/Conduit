import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  console.log("Seeding database...")

  // Create sample brokers
  const brokers = [
    {
      name: "Interactive Brokers",
      slug: "interactive-brokers",
      description: "Low-cost trading with access to global markets. One of the largest online brokers with advanced trading tools.",
      shortDescription: "Low-cost global trading platform",
      websiteUrl: "https://www.interactivebrokers.com",
      foundedYear: 1978,
      headquartersCountry: "US",
      headquartersCity: "Greenwich, Connecticut",
      isRegulated: true,
      regulationBodies: ["SEC", "FINRA", "FCA", "ASIC"],
      minimumDeposit: 0,
      baseCurrency: "USD",
      accountTypes: ["Individual", "Corporate", "Trust", "IRA"],
      supportedCountries: ["US", "UK", "CA", "AU", "DE", "FR", "IT", "ES", "NL", "CH"],
      languagesSupported: ["en", "es", "fr", "de", "it"],
      featured: true,
      isActive: true,
    },
    {
      name: "Charles Schwab",
      slug: "charles-schwab",
      description: "Full-service broker with excellent research tools, zero-commission stock trading, and comprehensive investment services.",
      shortDescription: "Full-service broker with zero commissions",
      websiteUrl: "https://www.schwab.com",
      foundedYear: 1971,
      headquartersCountry: "US",
      headquartersCity: "Westlake, Texas",
      isRegulated: true,
      regulationBodies: ["SEC", "FINRA"],
      minimumDeposit: 0,
      baseCurrency: "USD",
      accountTypes: ["Individual", "Joint", "IRA", "Trust", "Corporate"],
      supportedCountries: ["US"],
      languagesSupported: ["en"],
      featured: true,
      isActive: true,
    },
    {
      name: "Fidelity",
      slug: "fidelity",
      description: "Zero-commission stock trading and robust platform. One of the largest asset managers with excellent customer service.",
      shortDescription: "Zero-commission trading with excellent service",
      websiteUrl: "https://www.fidelity.com",
      foundedYear: 1946,
      headquartersCountry: "US",
      headquartersCity: "Boston, Massachusetts",
      isRegulated: true,
      regulationBodies: ["SEC", "FINRA"],
      minimumDeposit: 0,
      baseCurrency: "USD",
      accountTypes: ["Individual", "Joint", "IRA", "529", "Trust"],
      supportedCountries: ["US"],
      languagesSupported: ["en"],
      featured: true,
      isActive: true,
    },
    {
      name: "TD Ameritrade",
      slug: "td-ameritrade",
      description: "Comprehensive trading platform with extensive research tools and educational resources. Now part of Charles Schwab.",
      shortDescription: "Comprehensive platform with extensive research",
      websiteUrl: "https://www.tdameritrade.com",
      foundedYear: 1971,
      headquartersCountry: "US",
      headquartersCity: "Omaha, Nebraska",
      isRegulated: true,
      regulationBodies: ["SEC", "FINRA"],
      minimumDeposit: 0,
      baseCurrency: "USD",
      accountTypes: ["Individual", "Joint", "IRA", "Trust"],
      supportedCountries: ["US"],
      languagesSupported: ["en"],
      featured: false,
      isActive: true,
    },
    {
      name: "eToro",
      slug: "etoro",
      description: "Social trading platform with copy trading features. Popular for beginners and social trading enthusiasts.",
      shortDescription: "Social trading platform with copy trading",
      websiteUrl: "https://www.etoro.com",
      foundedYear: 2007,
      headquartersCountry: "IL",
      headquartersCity: "Limassol, Cyprus",
      isRegulated: true,
      regulationBodies: ["FCA", "CySEC", "ASIC"],
      minimumDeposit: 200,
      baseCurrency: "USD",
      accountTypes: ["Individual", "Corporate"],
      supportedCountries: ["US", "UK", "AU", "DE", "FR", "IT", "ES", "NL"],
      languagesSupported: ["en", "es", "fr", "de", "it", "pt", "nl"],
      featured: false,
      isActive: true,
    },
    {
      name: "Robinhood",
      slug: "robinhood",
      description: "Commission-free stock trading app designed for mobile-first trading. Popular among young investors.",
      shortDescription: "Commission-free mobile trading app",
      websiteUrl: "https://www.robinhood.com",
      foundedYear: 2013,
      headquartersCountry: "US",
      headquartersCity: "Menlo Park, California",
      isRegulated: true,
      regulationBodies: ["SEC", "FINRA"],
      minimumDeposit: 0,
      baseCurrency: "USD",
      accountTypes: ["Individual", "IRA"],
      supportedCountries: ["US"],
      languagesSupported: ["en"],
      featured: true,
      isActive: true,
    },
    {
      name: "TD Ameritrade",
      slug: "td-ameritrade",
      description: "Comprehensive trading platform with extensive research tools and educational resources. Now part of Charles Schwab.",
      shortDescription: "Comprehensive platform with extensive research",
      websiteUrl: "https://www.tdameritrade.com",
      foundedYear: 1971,
      headquartersCountry: "US",
      headquartersCity: "Omaha, Nebraska",
      isRegulated: true,
      regulationBodies: ["SEC", "FINRA"],
      minimumDeposit: 0,
      baseCurrency: "USD",
      accountTypes: ["Individual", "Joint", "IRA", "Trust"],
      supportedCountries: ["US"],
      languagesSupported: ["en"],
      featured: false,
      isActive: true,
    },
    {
      name: "E*TRADE",
      slug: "etrade",
      description: "Online broker with powerful trading tools and research capabilities. Now part of Morgan Stanley.",
      shortDescription: "Powerful trading tools and research",
      websiteUrl: "https://www.etrade.com",
      foundedYear: 1982,
      headquartersCountry: "US",
      headquartersCity: "New York, New York",
      isRegulated: true,
      regulationBodies: ["SEC", "FINRA"],
      minimumDeposit: 0,
      baseCurrency: "USD",
      accountTypes: ["Individual", "Joint", "IRA", "Trust"],
      supportedCountries: ["US"],
      languagesSupported: ["en"],
      featured: false,
      isActive: true,
    },
    {
      name: "IG Group",
      slug: "ig-group",
      description: "Leading online trading platform with access to global markets including stocks, forex, and CFDs.",
      shortDescription: "Leading global trading platform",
      websiteUrl: "https://www.ig.com",
      foundedYear: 1974,
      headquartersCountry: "UK",
      headquartersCity: "London, England",
      isRegulated: true,
      regulationBodies: ["FCA", "ASIC", "MAS"],
      minimumDeposit: 0,
      baseCurrency: "GBP",
      accountTypes: ["Individual", "Corporate", "Spread Betting"],
      supportedCountries: ["UK", "AU", "SG", "DE", "FR", "IT", "ES", "NL"],
      languagesSupported: ["en", "de", "fr", "it", "es"],
      featured: false,
      isActive: true,
    },
    {
      name: "Saxo Bank",
      slug: "saxo-bank",
      description: "Multi-asset trading platform with access to 40,000+ instruments across global markets.",
      shortDescription: "Multi-asset platform with 40K+ instruments",
      websiteUrl: "https://www.saxobank.com",
      foundedYear: 1992,
      headquartersCountry: "DK",
      headquartersCity: "Copenhagen, Denmark",
      isRegulated: true,
      regulationBodies: ["FSA", "FCA", "ASIC"],
      minimumDeposit: 2000,
      baseCurrency: "USD",
      accountTypes: ["Individual", "Corporate"],
      supportedCountries: ["DK", "UK", "AU", "DE", "FR", "IT", "ES", "NL", "CH"],
      languagesSupported: ["en", "da", "de", "fr", "it", "es"],
      featured: false,
      isActive: true,
    },
  ]

  for (const brokerData of brokers) {
    const broker = await prisma.broker.upsert({
      where: { slug: brokerData.slug },
      update: {},
      create: brokerData,
    })

    // Add fees
    if (broker.slug === "interactive-brokers") {
      await prisma.brokerFee.createMany({
        data: [
          {
            brokerId: broker.id,
            feeType: "commission",
            instrumentType: "stocks",
            feeAmount: 0.005,
            feeCurrency: "USD",
            feeStructure: "percentage",
            description: "0.5% of trade value, minimum $1",
          },
          {
            brokerId: broker.id,
            feeType: "commission",
            instrumentType: "etf",
            feeAmount: 0.005,
            feeCurrency: "USD",
            feeStructure: "percentage",
          },
        ],
      })
    } else if (broker.slug === "charles-schwab" || broker.slug === "fidelity" || broker.slug === "robinhood" || broker.slug === "td-ameritrade" || broker.slug === "etrade") {
      await prisma.brokerFee.createMany({
        data: [
          {
            brokerId: broker.id,
            feeType: "commission",
            instrumentType: "stocks",
            feeAmount: 0,
            feeCurrency: "USD",
            feeStructure: "fixed",
            description: "Zero commission on US stocks",
          },
          {
            brokerId: broker.id,
            feeType: "commission",
            instrumentType: "etf",
            feeAmount: 0,
            feeCurrency: "USD",
            feeStructure: "fixed",
          },
        ],
      })
    } else if (broker.slug === "etoro") {
      await prisma.brokerFee.createMany({
        data: [
          {
            brokerId: broker.id,
            feeType: "spread",
            instrumentType: "stocks",
            feePercentage: 0.1,
            feeCurrency: "USD",
            feeStructure: "percentage",
            description: "Variable spread, no commission",
          },
        ],
      })
    } else if (broker.slug === "ig-group") {
      await prisma.brokerFee.createMany({
        data: [
          {
            brokerId: broker.id,
            feeType: "commission",
            instrumentType: "stocks",
            feeAmount: 8,
            feeCurrency: "GBP",
            feeStructure: "fixed",
            description: "£8 per trade for UK stocks",
          },
        ],
      })
    } else if (broker.slug === "saxo-bank") {
      await prisma.brokerFee.createMany({
        data: [
          {
            brokerId: broker.id,
            feeType: "commission",
            instrumentType: "stocks",
            feeAmount: 0.08,
            feeCurrency: "USD",
            feeStructure: "percentage",
            description: "0.08% commission, minimum $1",
          },
        ],
      })
    }

    // Add ratings with broker-specific data
    const ratingData: Record<string, { rating: number; pros: string[]; cons: string[] }> = {
      "interactive-brokers": {
        rating: 4.8,
        pros: ["Low fees", "Access to global markets", "Advanced trading tools", "Excellent research"],
        cons: ["Complex interface", "High minimum for some features"],
      },
      "charles-schwab": {
        rating: 4.7,
        pros: ["Zero commissions", "Excellent research tools", "Great customer service", "Full-service broker"],
        cons: ["Higher fees for some services", "Can be overwhelming for beginners"],
      },
      "fidelity": {
        rating: 4.6,
        pros: ["Zero commissions", "Excellent customer service", "Great research", "Strong mobile app"],
        cons: ["Some advanced features cost extra"],
      },
      "robinhood": {
        rating: 4.2,
        pros: ["Zero commissions", "Easy to use", "Mobile-first design", "No minimum deposit"],
        cons: ["Limited research tools", "Limited account types", "Customer service issues"],
      },
      "td-ameritrade": {
        rating: 4.5,
        pros: ["Zero commissions", "Excellent platform", "Great research", "Good education"],
        cons: ["Being merged into Schwab"],
      },
      "etrade": {
        rating: 4.4,
        pros: ["Zero commissions", "Powerful platform", "Good research", "Now part of Morgan Stanley"],
        cons: ["Some fees for advanced features"],
      },
      "etoro": {
        rating: 4.1,
        pros: ["Social trading", "Copy trading", "User-friendly", "No commission on stocks"],
        cons: ["Higher spreads", "Limited to certain countries"],
      },
      "ig-group": {
        rating: 4.3,
        pros: ["Global markets access", "Good platform", "Educational resources", "Regulated"],
        cons: ["Higher fees for some instruments"],
      },
      "saxo-bank": {
        rating: 4.5,
        pros: ["40,000+ instruments", "Professional platform", "Global access", "Good research"],
        cons: ["High minimum deposit", "Complex for beginners"],
      },
    }

    const brokerRating = ratingData[broker.slug] || {
      rating: broker.featured ? 4.5 : 4.0,
      pros: ["Low fees", "Good platform", "Reliable service"],
      cons: ["Can be complex for beginners"],
    }

    await prisma.brokerRating.upsert({
      where: {
        brokerId_category: {
          brokerId: broker.id,
          category: "overall",
        },
      },
      update: {},
      create: {
        brokerId: broker.id,
        category: "overall",
        rating: brokerRating.rating,
        reviewCount: Math.floor(Math.random() * 1000) + 100,
        pros: brokerRating.pros,
        cons: brokerRating.cons,
      },
    })

    // Add platforms
    await prisma.brokerPlatform.createMany({
      data: [
        {
          brokerId: broker.id,
          platformName: "Web Platform",
          platformType: "web",
          osSupport: ["web"],
          features: ["Real-time quotes", "Charting", "Order management"],
          isPrimary: true,
        },
        {
          brokerId: broker.id,
          platformName: "Mobile App",
          platformType: "mobile",
          osSupport: ["ios", "android"],
          features: ["Mobile trading", "Alerts", "Account management"],
          isPrimary: false,
        },
      ],
    })

    // Add features
    await prisma.brokerFeature.createMany({
      data: [
        {
          brokerId: broker.id,
          category: "trading",
          featureName: "Fractional Shares",
          isAvailable: true,
        },
        {
          brokerId: broker.id,
          category: "trading",
          featureName: "Options Trading",
          isAvailable: true,
        },
        {
          brokerId: broker.id,
          category: "account",
          featureName: "IRA Accounts",
          isAvailable: true,
        },
        {
          brokerId: broker.id,
          category: "education",
          featureName: "Educational Resources",
          isAvailable: true,
        },
        {
          brokerId: broker.id,
          category: "support",
          featureName: "24/7 Customer Support",
          isAvailable: broker.slug === "fidelity" || broker.slug === "charles-schwab",
        },
      ],
    })

    console.log(`Created broker: ${broker.name}`)
  }

  console.log("Seeding completed!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

