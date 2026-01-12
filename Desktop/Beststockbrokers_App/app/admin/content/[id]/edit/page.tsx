"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Save } from "lucide-react"
import Link from "next/link"

interface Content {
  id: string
  title: string
  slug: string
  content: string
  excerpt: string | null
  type: "blog" | "guide" | "page"
  status: "draft" | "published"
  metaTitle: string | null
  metaDescription: string | null
  featuredImage: string | null
  author: string | null
  publishedAt: string | null
  tags: string[]
  category: string | null
}

export default function EditContentPage() {
  const router = useRouter()
  const params = useParams()
  const contentId = params.id as string
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [content, setContent] = useState<Content | null>(null)
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    content: "",
    excerpt: "",
    type: "page" as "blog" | "guide" | "page",
    status: "draft" as "draft" | "published",
    metaTitle: "",
    metaDescription: "",
    featuredImage: "",
    author: "",
    category: "",
    tags: "",
  })

  useEffect(() => {
    fetchContent()
  }, [contentId])

  const fetchContent = async () => {
    try {
      const response = await fetch(`/api/admin/content/${contentId}`)
      if (response.ok) {
        const data = await response.json()
        const contentData = data.content
        setContent(contentData)
        setFormData({
          title: contentData.title || "",
          slug: contentData.slug || "",
          content: contentData.content || "",
          excerpt: contentData.excerpt || "",
          type: contentData.type || "page",
          status: contentData.status || "draft",
          metaTitle: contentData.metaTitle || "",
          metaDescription: contentData.metaDescription || "",
          featuredImage: contentData.featuredImage || "",
          author: contentData.author || "",
          category: contentData.category || "",
          tags: contentData.tags?.join(", ") || "",
        })
      } else {
        alert("Failed to load content")
        router.push("/admin/content")
      }
    } catch (error) {
      console.error("Error fetching content:", error)
      alert("Failed to load content")
      router.push("/admin/content")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const response = await fetch(`/api/admin/content/${contentId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          tags: formData.tags.split(",").map((s) => s.trim()).filter(Boolean),
          excerpt: formData.excerpt || null,
          metaTitle: formData.metaTitle || null,
          metaDescription: formData.metaDescription || null,
          featuredImage: formData.featuredImage || null,
          author: formData.author || null,
          category: formData.category || null,
          publishedAt: formData.status === "published" && !content?.publishedAt ? new Date().toISOString() : content?.publishedAt || null,
        }),
      })

      if (response.ok) {
        router.push("/admin/content")
      } else {
        const error = await response.json()
        alert(error.error || "Failed to update content")
      }
    } catch (error) {
      console.error("Error updating content:", error)
      alert("Failed to update content")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center gap-4">
        <Link href="/admin/content">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Edit Content</h1>
      </div>

      <form onSubmit={handleSubmit} className="max-w-4xl space-y-6">
        <div className="bg-white rounded-lg border p-6 space-y-4">
          <h2 className="text-xl font-semibold mb-4">Content</h2>
          
          <div>
            <label className="block text-sm font-medium mb-1">Title *</label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Slug *</label>
            <Input
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Excerpt</label>
            <textarea
              value={formData.excerpt}
              onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2"
              rows={3}
              maxLength={500}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Content *</label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 font-mono"
              rows={15}
              required
            />
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6 space-y-4">
          <h2 className="text-xl font-semibold mb-4">Metadata</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as "draft" | "published" })}
                className="w-full rounded-md border border-gray-300 px-3 py-2"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Author</label>
              <Input
                value={formData.author}
                onChange={(e) => setFormData({ ...formData, author: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <Input
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Tags (comma-separated)</label>
            <Input
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Featured Image URL</label>
            <Input
              type="url"
              value={formData.featuredImage}
              onChange={(e) => setFormData({ ...formData, featuredImage: e.target.value })}
            />
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6 space-y-4">
          <h2 className="text-xl font-semibold mb-4">SEO</h2>
          
          <div>
            <label className="block text-sm font-medium mb-1">Meta Title</label>
            <Input
              value={formData.metaTitle}
              onChange={(e) => setFormData({ ...formData, metaTitle: e.target.value })}
              maxLength={200}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Meta Description</label>
            <textarea
              value={formData.metaDescription}
              onChange={(e) => setFormData({ ...formData, metaDescription: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2"
              rows={3}
              maxLength={500}
            />
          </div>
        </div>

        <div className="flex gap-4">
          <Button type="submit" disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
          <Link href="/admin/content">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  )
}
