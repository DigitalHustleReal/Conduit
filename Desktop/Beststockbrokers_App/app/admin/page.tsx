import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"
import { Users, Building2, Star, TrendingUp } from "lucide-react"

export default async function AdminDashboard() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Get statistics
  const [
    totalBrokers,
    activeBrokers,
    totalReviews,
    totalRatings,
  ] = await Promise.all([
    prisma.broker.count(),
    prisma.broker.count({ where: { isActive: true } }),
    prisma.brokerReview.count(),
    prisma.brokerRating.count(),
  ])

  const stats = [
    {
      name: "Total Brokers",
      value: totalBrokers,
      icon: Building2,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      name: "Active Brokers",
      value: activeBrokers,
      icon: TrendingUp,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      name: "Total Reviews",
      value: totalReviews,
      icon: Users,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
    {
      name: "Ratings",
      value: totalRatings,
      icon: Star,
      color: "text-yellow-600",
      bgColor: "bg-yellow-100",
    },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Welcome back! Here&apos;s an overview of your platform.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.name} className="bg-white rounded-lg border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{stat.name}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                </div>
                <div className={`${stat.bgColor} p-3 rounded-lg`}>
                  <Icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            href="/admin/brokers/new"
            className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <h3 className="font-semibold">Add New Broker</h3>
            <p className="text-sm text-gray-600 mt-1">Create a new broker profile</p>
          </a>
          <a
            href="/admin/reviews"
            className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <h3 className="font-semibold">Review Queue</h3>
            <p className="text-sm text-gray-600 mt-1">Approve pending reviews</p>
          </a>
          <a
            href="/admin/settings"
            className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <h3 className="font-semibold">Settings</h3>
            <p className="text-sm text-gray-600 mt-1">Configure platform settings</p>
          </a>
        </div>
      </div>
    </div>
  )
}

