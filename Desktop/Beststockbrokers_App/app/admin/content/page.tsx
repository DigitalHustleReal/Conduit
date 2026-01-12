import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Plus, FileText, Book, File } from "lucide-react"
import { ContentTable } from "@/components/admin/ContentTable"

export default async function AdminContentPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const [allContent, stats] = await Promise.all([
    prisma.contentPage.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 100,
    }),
    prisma.contentPage.groupBy({
      by: ["type", "status"],
      _count: true,
    }),
  ])

  const blogCount = allContent.filter((c) => c.type === "blog").length
  const guideCount = allContent.filter((c) => c.type === "guide").length
  const pageCount = allContent.filter((c) => c.type === "page").length
  const publishedCount = allContent.filter((c) => c.status === "published").length
  const draftCount = allContent.filter((c) => c.status === "draft").length

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Content Management</h1>
          <p className="text-gray-600 mt-2">Manage blog posts, guides, and pages</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/content/new?type=blog">
            <Button variant="outline">
              <FileText className="mr-2 h-4 w-4" />
              New Blog
            </Button>
          </Link>
          <Link href="/admin/content/new?type=guide">
            <Button variant="outline">
              <Book className="mr-2 h-4 w-4" />
              New Guide
            </Button>
          </Link>
          <Link href="/admin/content/new?type=page">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Page
            </Button>
          </Link>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-white rounded-lg border p-6">
          <div className="text-sm text-gray-600 mb-1">Blog Posts</div>
          <div className="text-3xl font-bold text-blue-600">{blogCount}</div>
        </div>
        <div className="bg-white rounded-lg border p-6">
          <div className="text-sm text-gray-600 mb-1">Guides</div>
          <div className="text-3xl font-bold text-green-600">{guideCount}</div>
        </div>
        <div className="bg-white rounded-lg border p-6">
          <div className="text-sm text-gray-600 mb-1">Pages</div>
          <div className="text-3xl font-bold text-purple-600">{pageCount}</div>
        </div>
        <div className="bg-white rounded-lg border p-6">
          <div className="text-sm text-gray-600 mb-1">Published</div>
          <div className="text-3xl font-bold text-green-600">{publishedCount}</div>
        </div>
        <div className="bg-white rounded-lg border p-6">
          <div className="text-sm text-gray-600 mb-1">Drafts</div>
          <div className="text-3xl font-bold text-yellow-600">{draftCount}</div>
        </div>
      </div>

      {/* Content Table */}
      <ContentTable initialContent={allContent} />
    </div>
  )
}
