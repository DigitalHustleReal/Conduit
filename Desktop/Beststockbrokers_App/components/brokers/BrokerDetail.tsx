import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Star, ExternalLink, Check, X } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { AffiliateButton } from "./AffiliateButton"
import { BrokerReviewsSection } from "./BrokerReviewsSection"
import Script from "next/script"
import { generateBrokerStructuredData } from "@/lib/seo/structured-data"

interface BrokerDetailProps {
  broker: any
}

export function BrokerDetail({ broker }: BrokerDetailProps) {
  const overallRating = broker.ratings?.find((r: any) => r.category === "overall")
  const rating = overallRating?.rating || 0

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8 rounded-lg border bg-white p-6">
        <div className="flex flex-col gap-6 md:flex-row">
          <div className="flex-shrink-0">
            <div className="h-24 w-24 rounded-lg bg-gray-200 flex items-center justify-center">
              {broker.logoUrl ? (
                <img src={broker.logoUrl} alt={broker.name} className="h-full w-full object-contain" />
              ) : (
                <span className="text-sm text-gray-400">Logo</span>
              )}
            </div>
          </div>
          <div className="flex-1">
            <div className="mb-2 flex items-center justify-between">
              <h1 className="text-3xl font-bold text-gray-900">{broker.name}</h1>
              {rating > 0 && (
                <div className="flex items-center gap-2">
                  <Star className="h-6 w-6 fill-yellow-400 text-yellow-400" />
                  <span className="text-2xl font-bold">{rating.toFixed(1)}</span>
                </div>
              )}
            </div>
            <p className="mb-4 text-lg text-gray-600">{broker.shortDescription || broker.description}</p>
            <div className="flex flex-wrap gap-4">
              {broker.minimumDeposit !== null && (
                <div>
                  <span className="text-sm text-gray-500">Min. Deposit: </span>
                  <span className="font-semibold">{formatCurrency(broker.minimumDeposit, broker.baseCurrency)}</span>
                </div>
              )}
              {broker.isRegulated && (
                <div>
                  <span className="text-sm text-gray-500">Regulated: </span>
                  <span className="font-semibold text-green-600">Yes</span>
                </div>
              )}
              <Button asChild variant="outline" size="sm">
                <a href={broker.websiteUrl} target="_blank" rel="noopener noreferrer">
                  Visit Website <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      {broker.description && (
        <div className="mb-8 rounded-lg border bg-white p-6">
          <h2 className="mb-4 text-2xl font-semibold">About {broker.name}</h2>
          <p className="text-gray-700 leading-relaxed">{broker.description}</p>
        </div>
      )}

      {/* Key Information */}
      <div className="mb-8 grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border bg-white p-6">
          <h3 className="mb-4 text-xl font-semibold">Key Information</h3>
          <dl className="space-y-3">
            {broker.foundedYear && (
              <>
                <dt className="text-sm text-gray-500">Founded</dt>
                <dd className="font-medium">{broker.foundedYear}</dd>
              </>
            )}
            {broker.headquartersCountry && (
              <>
                <dt className="text-sm text-gray-500">Headquarters</dt>
                <dd className="font-medium">
                  {broker.headquartersCity && `${broker.headquartersCity}, `}
                  {broker.headquartersCountry}
                </dd>
              </>
            )}
            {broker.regulationBodies && broker.regulationBodies.length > 0 && (
              <>
                <dt className="text-sm text-gray-500">Regulated By</dt>
                <dd className="font-medium">{broker.regulationBodies.join(", ")}</dd>
              </>
            )}
            {broker.supportedCountries && broker.supportedCountries.length > 0 && (
              <>
                <dt className="text-sm text-gray-500">Supported Countries</dt>
                <dd className="font-medium">{broker.supportedCountries.length} countries</dd>
              </>
            )}
          </dl>
        </div>

        <div className="rounded-lg border bg-white p-6">
          <h3 className="mb-4 text-xl font-semibold">Trading Fees</h3>
          {broker.fees && broker.fees.length > 0 ? (
            <div className="space-y-2">
              {broker.fees.slice(0, 5).map((fee: any, index: number) => (
                <div key={index} className="flex justify-between text-sm">
                  <span className="text-gray-600">{fee.instrumentType} ({fee.feeType})</span>
                  <span className="font-medium">
                    {fee.feeAmount ? formatCurrency(fee.feeAmount, fee.feeCurrency) : 
                     fee.feePercentage ? `${fee.feePercentage}%` : "N/A"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">Fee information not available</p>
          )}
        </div>
      </div>

      {/* Features */}
      {broker.features && broker.features.length > 0 && (
        <div className="mb-8 rounded-lg border bg-white p-6">
          <h3 className="mb-4 text-xl font-semibold">Features</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {broker.features.map((feature: any, index: number) => (
              <div key={index} className="flex items-center gap-2">
                {feature.isAvailable ? (
                  <Check className="h-5 w-5 text-green-600" />
                ) : (
                  <X className="h-5 w-5 text-gray-400" />
                )}
                <span className={feature.isAvailable ? "text-gray-900" : "text-gray-400"}>
                  {feature.featureName}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Platforms */}
      {broker.platforms && broker.platforms.length > 0 && (
        <div className="mb-8 rounded-lg border bg-white p-6">
          <h3 className="mb-4 text-xl font-semibold">Trading Platforms</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {broker.platforms.map((platform: any, index: number) => (
              <div key={index} className="rounded-lg border p-4">
                <h4 className="mb-2 font-semibold">{platform.platformName}</h4>
                <p className="mb-2 text-sm text-gray-600">Type: {platform.platformType}</p>
                <p className="text-sm text-gray-600">
                  OS Support: {platform.osSupport.join(", ")}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pros and Cons */}
      {overallRating && (overallRating.pros.length > 0 || overallRating.cons.length > 0) && (
        <div className="mb-8 grid gap-6 md:grid-cols-2">
          {overallRating.pros.length > 0 && (
            <div className="rounded-lg border bg-green-50 p-6">
              <h3 className="mb-4 text-xl font-semibold text-green-900">Pros</h3>
              <ul className="space-y-2">
                {overallRating.pros.map((pro: string, index: number) => (
                  <li key={index} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
                    <span className="text-green-800">{pro}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {overallRating.cons.length > 0 && (
            <div className="rounded-lg border bg-red-50 p-6">
              <h3 className="mb-4 text-xl font-semibold text-red-900">Cons</h3>
              <ul className="space-y-2">
                {overallRating.cons.map((con: string, index: number) => (
                  <li key={index} className="flex items-start gap-2">
                    <X className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
                    <span className="text-red-800">{con}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-4">
        <Button asChild size="lg">
          <Link href={`/compare?ids=${broker.id}`}>Compare with Others</Link>
        </Button>
        <AffiliateButton
          brokerId={broker.id}
          brokerName={broker.name}
          url={broker.websiteUrl}
          size="lg"
          variant="outline"
          trackingSource="broker_detail_page"
        />
      </div>

      {/* Reviews Section */}
      <BrokerReviewsSection
        brokerId={broker.id}
        brokerName={broker.name}
        initialReviews={broker.reviews || []}
      />

      {/* Structured Data for SEO */}
      <Script
        id="broker-structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(generateBrokerStructuredData(broker)),
        }}
      />
    </div>
  )
}

