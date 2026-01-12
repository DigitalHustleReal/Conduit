import { Globe, Database, TrendingUp, Shield, Users, Award } from "lucide-react"

const features = [
  {
    icon: Globe,
    title: "Global Coverage",
    description: "Brokers from 50+ countries worldwide, covering all major markets",
  },
  {
    icon: Database,
    title: "Comprehensive Data",
    description: "Detailed information on fees, features, platforms, and regulations",
  },
  {
    icon: TrendingUp,
    title: "Real-time Comparison",
    description: "Compare multiple brokers side-by-side with up-to-date information",
  },
  {
    icon: Shield,
    title: "Verified Reviews",
    description: "Authentic user reviews and ratings from verified traders",
  },
  {
    icon: Users,
    title: "Expert Analysis",
    description: "In-depth broker analysis and recommendations from our team",
  },
  {
    icon: Award,
    title: "Award-Winning Platform",
    description: "Recognized as the best broker comparison tool in the industry",
  },
]

export function WhyChooseUs() {
  return (
    <section className="bg-white py-16">
      <div className="container mx-auto px-4">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold text-gray-900">Why Choose Us?</h2>
          <p className="text-lg text-gray-600">
            We provide the most comprehensive and up-to-date broker comparison platform
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <div key={index} className="rounded-lg border p-6 transition-shadow hover:shadow-lg">
                <div className="mb-4 inline-flex rounded-lg bg-blue-100 p-3">
                  <Icon className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="mb-2 text-xl font-semibold text-gray-900">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}






