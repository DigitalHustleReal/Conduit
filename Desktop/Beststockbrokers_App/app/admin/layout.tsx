import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { BarChart3, Building2, FileText, Settings, LogOut, FileEdit, TrendingUp, DollarSign } from "lucide-react"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-blue-600">Admin Panel</h1>
          <p className="text-sm text-gray-500 mt-1">BestStockBrokers.org</p>
        </div>
        <nav className="px-4 space-y-2">
          <Link href="/admin">
            <Button variant="ghost" className="w-full justify-start">
              <BarChart3 className="mr-2 h-4 w-4" />
              Dashboard
            </Button>
          </Link>
          <Link href="/admin/brokers">
            <Button variant="ghost" className="w-full justify-start">
              <Building2 className="mr-2 h-4 w-4" />
              Brokers
            </Button>
          </Link>
          <Link href="/admin/reviews">
            <Button variant="ghost" className="w-full justify-start">
              <FileText className="mr-2 h-4 w-4" />
              Reviews
            </Button>
          </Link>
          <Link href="/admin/settings">
            <Button variant="ghost" className="w-full justify-start">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Button>
          </Link>
          <form action="/api/auth/logout" method="post">
            <Button type="submit" variant="ghost" className="w-full justify-start text-red-600 hover:text-red-700">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </form>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8">
        {children}
      </main>
    </div>
  )
}

