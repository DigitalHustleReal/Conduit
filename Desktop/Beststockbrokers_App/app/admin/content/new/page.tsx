"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Save, Upload } from "lucide-react"
import Link from "next/link"

export default function NewContentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const contentType = (searchParams.get("type") as "blog" | "guide" | "page") || "page"
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    content: "",
    excerpt: "",
    type: contentType,
    status: "draft" as "draft" | "published",
    metaTitle: "",
    metaDescription: "",
    featuredImage: "",
    author: "",
    category: "",
    tags: "",
  })

  useEffect(() => {
    // Auto-generate slug from title
    if (formData.title && !formData.slug) {
      const slug = formData.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
      setFormData({ ...formData, slug })
    }
  }, [formData.title])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch("/api/admin/content", {
        method: "POST",
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
          publishedAt: formData.status === "published" ? new Date().toISOString() : null,
        }),
      })

      if (response.ok) {
        router.push("/admin/content")
      } else {
        const error = await response.json()
        alert(error.error || "Failed to create content")
      }
    } catch (error) {
      console.error("Error creating content:", error)
      alert("Failed to create content")
    } finally {
      setLoading(false)
    }
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
        <h1 className="text-3xl font-bold">New {contentType === "blog" ? "Blog Post" : contentType === "guide" ? "Guide" : "Page"}</h1>
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
            <p className="text-xs text-gray-500 mt-1">URL-friendly version (e.g., my-article-title)</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Excerpt</label>
            <textarea
              value={formData.excerpt}
              onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2"
              rows={3}
              maxLength={500}
              placeholder="Short summary (max 500 characters)"
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
              placeholder="Write your content here (markdown supported)"
            />
            <p className="text-xs text-gray-500 mt-1">Supports Markdown formatting</p>
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
                placeholder="Author name"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <Input
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              placeholder="Category (optional)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Tags (comma-separated)</label>
            <Input
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="tag1, tag2, tag3"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Featured Image URL</label>
            <Input
              type="url"
              value={formData.featuredImage}
              onChange={(e) => setFormData({ ...formData, featuredImage: e.target.value })}
              placeholder="https://example.com/image.jpg"
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
              placeholder="SEO title (defaults to title if empty)"
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
              placeholder="SEO description (defaults to excerpt if empty)"
            />
          </div>
        </div>

        <div className="flex gap-4">
          <Button type="submit" disabled={loading}>
            <Save className="mr-2 h-4 w-4" />
            {loading ? "Creating..." : "Create Content"}
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
