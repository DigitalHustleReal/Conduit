"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Save } from "lucide-react"
import Link from "next/link"

export default function NewBrokerPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
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
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch("/api/admin/brokers", {
        method: "POST",
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
        }),
      })

      if (response.ok) {
        router.push("/admin/brokers")
      } else {
        const error = await response.json()
        alert(error.error || "Failed to create broker")
      }
    } catch (error) {
      console.error("Error creating broker:", error)
      alert("Failed to create broker")
    } finally {
      setLoading(false)
    }
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
        <h1 className="text-3xl font-bold">Add New Broker</h1>
      </div>

      <form onSubmit={handleSubmit} className="max-w-4xl space-y-6">
        <div className="bg-white rounded-lg border p-6 space-y-4">
          <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
          
          <div>
            <label className="block text-sm font-medium mb-1">Broker Name *</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="e.g., Interactive Brokers"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Slug *</label>
            <Input
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              required
              placeholder="e.g., interactive-brokers"
            />
            <p className="text-xs text-gray-500 mt-1">URL-friendly version of the name</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Short Description</label>
            <Input
              value={formData.shortDescription}
              onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
              placeholder="Brief one-line description"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Full Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2"
              rows={4}
              placeholder="Detailed description of the broker"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Website URL *</label>
            <Input
              type="url"
              value={formData.websiteUrl}
              onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
              required
              placeholder="https://www.example.com"
            />
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
                placeholder="e.g., 1978"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Headquarters Country</label>
              <Input
                value={formData.headquartersCountry}
                onChange={(e) => setFormData({ ...formData, headquartersCountry: e.target.value })}
                placeholder="e.g., US"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Headquarters City</label>
            <Input
              value={formData.headquartersCity}
              onChange={(e) => setFormData({ ...formData, headquartersCity: e.target.value })}
              placeholder="e.g., Greenwich, Connecticut"
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
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Base Currency</label>
              <Input
                value={formData.baseCurrency}
                onChange={(e) => setFormData({ ...formData, baseCurrency: e.target.value })}
                placeholder="USD"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Account Types (comma-separated)</label>
            <Input
              value={formData.accountTypes}
              onChange={(e) => setFormData({ ...formData, accountTypes: e.target.value })}
              placeholder="Individual, Corporate, IRA"
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
              placeholder="SEC, FINRA, FCA"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Supported Countries (comma-separated, ISO codes)</label>
            <Input
              value={formData.supportedCountries}
              onChange={(e) => setFormData({ ...formData, supportedCountries: e.target.value })}
              placeholder="US, UK, CA, AU"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Languages Supported (comma-separated, ISO codes)</label>
            <Input
              value={formData.languagesSupported}
              onChange={(e) => setFormData({ ...formData, languagesSupported: e.target.value })}
              placeholder="en, es, fr, de"
            />
          </div>
        </div>

        <div className="flex gap-4">
          <Button type="submit" disabled={loading}>
            <Save className="mr-2 h-4 w-4" />
            {loading ? "Creating..." : "Create Broker"}
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






