import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { DollarSign, TrendingUp, MousePointerClick } from "lucide-react"

export default async function AdminAffiliatePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Get affiliate statistics
  const [totalClicks, totalPrograms, recentClicks] = await Promise.all([
    prisma.affiliateClick.count(),
    prisma.affiliateProgram.count({
      where: { isActive: true },
    }),
    prisma.affiliateClick.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        affiliateProgram: {
          include: {
            broker: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
    }),
  ])

  // Group clicks by program
  const clicksByProgram: Record<string, number> = {}
  recentClicks.forEach((click) => {
    const programId = click.affiliateProgramId
    clicksByProgram[programId] = (clicksByProgram[programId] || 0) + 1
  })

  const topPrograms = Object.entries(clicksByProgram)
    .map(([programId, count]) => {
      const click = recentClicks.find((c) => c.affiliateProgramId === programId)
      return {
        programId,
        count,
        broker: click?.affiliateProgram.broker,
        program: click?.affiliateProgram,
      }
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Affiliate Dashboard</h1>
        <p className="text-gray-600 mt-2">Track affiliate performance and clicks</p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600 mb-1">Total Clicks</div>
              <div className="text-3xl font-bold text-blue-600">{totalClicks.toLocaleString()}</div>
            </div>
            <MousePointerClick className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600 mb-1">Active Programs</div>
              <div className="text-3xl font-bold text-green-600">{totalPrograms}</div>
            </div>
            <DollarSign className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600 mb-1">Top Performing</div>
              <div className="text-3xl font-bold text-purple-600">
                {topPrograms.length > 0 ? topPrograms[0].count : 0}
              </div>
            </div>
            <TrendingUp className="h-8 w-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Top Programs */}
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-xl font-semibold mb-4">Top Performing Programs</h2>
        {topPrograms.length > 0 ? (
          <div className="space-y-3">
            {topPrograms.map((item, index) => (
              <div key={item.programId} className="flex items-center justify-between py-3 border-b">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-gray-500 w-6">{index + 1}</span>
                  <div>
                    <div className="font-semibold text-gray-900">
                      {item.broker?.name || "Unknown Broker"}
                    </div>
                    <div className="text-sm text-gray-500">
                      {item.program?.url || "No URL"}
                    </div>
                  </div>
                </div>
                <span className="text-sm font-semibold text-blue-600">
                  {item.count.toLocaleString()} clicks
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No affiliate clicks yet</p>
        )}
      </div>

      {/* Recent Clicks */}
      <div className="bg-white rounded-lg border p-6 mt-8">
        <h2 className="text-xl font-semibold mb-4">Recent Clicks</h2>
        {recentClicks.length > 0 ? (
          <div className="space-y-3">
            {recentClicks.slice(0, 20).map((click) => (
              <div key={click.id} className="flex items-center justify-between py-2 border-b text-sm">
                <div className="flex-1">
                  <div className="font-medium">
                    {click.affiliateProgram.broker.name}
                  </div>
                  <div className="text-gray-500">
                    {click.utmCampaign && `Campaign: ${click.utmCampaign} • `}
                    {new Date(click.createdAt).toLocaleString()}
                  </div>
                </div>
                <div className="text-gray-500">
                  {click.utmSource || "Direct"}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No clicks yet</p>
        )}
      </div>
    </div>
  )
}
