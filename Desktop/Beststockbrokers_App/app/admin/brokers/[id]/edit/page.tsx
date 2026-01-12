"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Save, Upload, X } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

interface Broker {
  id: string
  name: string
  slug: string
  description: string | null
  shortDescription: string | null
  websiteUrl: string
  foundedYear: number | null
  headquartersCountry: string | null
  headquartersCity: string | null
  minimumDeposit: number | null
  baseCurrency: string
  isRegulated: boolean
  regulationBodies: string[]
  accountTypes: string[]
  supportedCountries: string[]
  languagesSupported: string[]
  logoUrl: string | null
  isActive: boolean
  featured: boolean
}

export default function EditBrokerPage() {
  const router = useRouter()
  const params = useParams()
  const brokerId = params.id as string
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [broker, setBroker] = useState<Broker | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    shortDescription: "",
    websiteUrl: "",
    foundedYear: "",
    headquartersCountry: "",
    headquartersCity: "",
    minimumDeposit: "",
    baseCurrency: "USD",
    isRegulated: false,
    regulationBodies: "",
    accountTypes: "",
    supportedCountries: "",
    languagesSupported: "",
    logoUrl: "",
    isActive: true,
    featured: false,
  })

  useEffect(() => {
    fetchBroker()
  }, [brokerId])

  const fetchBroker = async () => {
    try {
      const response = await fetch(`/api/admin/brokers/${brokerId}`)
      if (response.ok) {
        const data = await response.json()
        const brokerData = data.broker
        setBroker(brokerData)
        setFormData({
          name: brokerData.name || "",
          slug: brokerData.slug || "",
          description: brokerData.description || "",
          shortDescription: brokerData.shortDescription || "",
          websiteUrl: brokerData.websiteUrl || "",
          foundedYear: brokerData.foundedYear?.toString() || "",
          headquartersCountry: brokerData.headquartersCountry || "",
          headquartersCity: brokerData.headquartersCity || "",
          minimumDeposit: brokerData.minimumDeposit?.toString() || "",
          baseCurrency: brokerData.baseCurrency || "USD",
          isRegulated: brokerData.isRegulated || false,
          regulationBodies: brokerData.regulationBodies?.join(", ") || "",
          accountTypes: brokerData.accountTypes?.join(", ") || "",
          supportedCountries: brokerData.supportedCountries?.join(", ") || "",
          languagesSupported: brokerData.languagesSupported?.join(", ") || "",
          logoUrl: brokerData.logoUrl || "",
          isActive: brokerData.isActive ?? true,
          featured: brokerData.featured || false,
        })
      } else {
        alert("Failed to load broker")
        router.push("/admin/brokers")
      }
    } catch (error) {
      console.error("Error fetching broker:", error)
      alert("Failed to load broker")
      router.push("/admin/brokers")
    } finally {
      setLoading(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("folder", "brokers")

      const response = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        setFormData({ ...formData, logoUrl: data.url })
      } else {
        const error = await response.json()
        alert(error.error || "Failed to upload image")
      }
    } catch (error) {
      console.error("Error uploading image:", error)
      alert("Failed to upload image")
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const response = await fetch(`/api/admin/brokers/${brokerId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          foundedYear: formData.foundedYear ? parseInt(formData.foundedYear) : null,
          minimumDeposit: formData.minimumDeposit ? parseFloat(formData.minimumDeposit) : null,
          regulationBodies: formData.regulationBodies.split(",").map((s) => s.trim()).filter(Boolean),
          accountTypes: formData.accountTypes.split(",").map((s) => s.trim()).filter(Boolean),
          supportedCountries: formData.supportedCountries.split(",").map((s) => s.trim()).filter(Boolean),
          languagesSupported: formData.languagesSupported.split(",").map((s) => s.trim()).filter(Boolean),
          logoUrl: formData.logoUrl || null,
        }),
      })

      if (response.ok) {
        router.push("/admin/brokers")
      } else {
        const error = await response.json()
        alert(error.error || "Failed to update broker")
      }
    } catch (error) {
      console.error("Error updating broker:", error)
      alert("Failed to update broker")
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
        <Link href="/admin/brokers">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Edit Broker</h1>
      </div>

      <form onSubmit={handleSubmit} className="max-w-4xl space-y-6">
        <div className="bg-white rounded-lg border p-6 space-y-4">
          <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
          
          <div>
            <label className="block text-sm font-medium mb-1">Logo</label>
            <div className="flex items-center gap-4">
              {formData.logoUrl && (
                <div className="relative w-24 h-24 border rounded-lg overflow-hidden">
                  <Image
                    src={formData.logoUrl}
                    alt="Broker logo"
                    fill
                    className="object-contain"
                  />
                </div>
              )}
              <div className="flex-1">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                  <Button type="button" variant="outline" disabled={uploading} asChild>
                    <span>
                      <Upload className="mr-2 h-4 w-4" />
                      {uploading ? "Uploading..." : formData.logoUrl ? "Change Logo" : "Upload Logo"}
                    </span>
                  </Button>
                </label>
                {formData.logoUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="mt-2"
                    onClick={() => setFormData({ ...formData, logoUrl: "" })}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Remove
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Broker Name *</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
            <label className="block text-sm font-medium mb-1">Short Description</label>
            <Input
              value={formData.shortDescription}
              onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Full Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2"
              rows={4}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Website URL *</label>
            <Input
              type="url"
              value={formData.websiteUrl}
              onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="rounded"
              />
              <label className="text-sm font-medium">Active</label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.featured}
                onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                className="rounded"
              />
              <label className="text-sm font-medium">Featured</label>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6 space-y-4">
          <h2 className="text-xl font-semibold mb-4">Company Details</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Founded Year</label>
              <Input
                type="number"
                value={formData.foundedYear}
                onChange={(e) => setFormData({ ...formData, foundedYear: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Headquarters Country</label>
              <Input
                value={formData.headquartersCountry}
                onChange={(e) => setFormData({ ...formData, headquartersCountry: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Headquarters City</label>
            <Input
              value={formData.headquartersCity}
              onChange={(e) => setFormData({ ...formData, headquartersCity: e.target.value })}
            />
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6 space-y-4">
          <h2 className="text-xl font-semibold mb-4">Account & Trading</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Minimum Deposit</label>
              <Input
                type="number"
                step="0.01"
                value={formData.minimumDeposit}
                onChange={(e) => setFormData({ ...formData, minimumDeposit: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Base Currency</label>
              <Input
                value={formData.baseCurrency}
                onChange={(e) => setFormData({ ...formData, baseCurrency: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Account Types (comma-separated)</label>
            <Input
              value={formData.accountTypes}
              onChange={(e) => setFormData({ ...formData, accountTypes: e.target.value })}
            />
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6 space-y-4">
          <h2 className="text-xl font-semibold mb-4">Regulation & Coverage</h2>
          
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.isRegulated}
              onChange={(e) => setFormData({ ...formData, isRegulated: e.target.checked })}
              className="rounded"
            />
            <label className="text-sm font-medium">Is Regulated</label>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Regulation Bodies (comma-separated)</label>
            <Input
              value={formData.regulationBodies}
              onChange={(e) => setFormData({ ...formData, regulationBodies: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Supported Countries (comma-separated, ISO codes)</label>
            <Input
              value={formData.supportedCountries}
              onChange={(e) => setFormData({ ...formData, supportedCountries: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Languages Supported (comma-separated, ISO codes)</label>
            <Input
              value={formData.languagesSupported}
              onChange={(e) => setFormData({ ...formData, languagesSupported: e.target.value })}
            />
          </div>
        </div>

        <div className="flex gap-4">
          <Button type="submit" disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
          <Link href="/admin/brokers">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  )
}
