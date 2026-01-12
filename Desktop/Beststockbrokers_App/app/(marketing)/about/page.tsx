import { Metadata } from "next"
import { prisma } from "@/lib/db"
import { Check, Target, Users, Award } from "lucide-react"

export const metadata: Metadata = {
  title: "About Us - BestStockBrokers.org",
  description: "Learn about BestStockBrokers.org - your trusted source for broker comparisons and trading insights.",
}

export default async function AboutPage() {
  // Try to get content from CMS, fallback to static content
  const aboutPage = await prisma.contentPage.findFirst({
    where: {
      type: "page",
      slug: "about",
      status: "published",
    },
  })

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold mb-4">About BestStockBrokers.org</h1>
        <p className="text-lg text-gray-600">
          Your trusted source for broker comparisons and trading insights
        </p>
      </div>

      {aboutPage ? (
        <div
          className="prose prose-lg max-w-none"
          dangerouslySetInnerHTML={{ __html: aboutPage.content }}
        />
      ) : (
        <div className="prose prose-lg max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">Our Mission</h2>
            <p className="text-gray-700 leading-relaxed">
              At BestStockBrokers.org, we are committed to helping investors find the perfect stock broker for their needs. Our mission is to provide transparent, comprehensive, and unbiased broker comparisons to empower investors worldwide.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">What We Do</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              We provide:
            </p>
            <ul className="space-y-3 text-gray-700">
              <li className="flex items-start gap-3">
                <Check className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <span>Comprehensive broker comparisons with detailed information</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <span>In-depth reviews and ratings based on multiple factors</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <span>Educational guides to help you make informed decisions</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <span>Global broker coverage across multiple countries and regions</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Our Values</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center p-6 bg-blue-50 rounded-lg">
                <Target className="h-10 w-10 text-blue-600 mx-auto mb-3" />
                <h3 className="font-semibold mb-2">Transparency</h3>
                <p className="text-sm text-gray-600">
                  We provide honest, unbiased information to help you make informed decisions
                </p>
              </div>
              <div className="text-center p-6 bg-green-50 rounded-lg">
                <Users className="h-10 w-10 text-green-600 mx-auto mb-3" />
                <h3 className="font-semibold mb-2">User Focus</h3>
                <p className="text-sm text-gray-600">
                  Your needs come first. We design our platform with your best interests in mind
                </p>
              </div>
              <div className="text-center p-6 bg-purple-50 rounded-lg">
                <Award className="h-10 w-10 text-purple-600 mx-auto mb-3" />
                <h3 className="font-semibold mb-2">Quality</h3>
                <p className="text-sm text-gray-600">
                  We maintain high standards in our research, reviews, and content
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Why Choose Us</h2>
            <p className="text-gray-700 leading-relaxed">
              BestStockBrokers.org stands out through our comprehensive database, advanced filtering capabilities, and commitment to providing accurate, up-to-date information. We cover brokers from around the world and provide detailed comparisons to help you find the perfect match for your trading needs.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Contact Us</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Have questions or feedback? We'd love to hear from you!
            </p>
            <p className="text-gray-700">
              <a href="/contact" className="text-blue-600 hover:underline">
                Visit our contact page
              </a> to get in touch.
            </p>
          </section>
        </div>
      )}
    </div>
  )
}
