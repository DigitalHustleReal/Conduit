import { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Terms of Service - BestStockBrokers.org",
  description: "Read our terms of service and user agreement.",
}

export default function TermsOfServicePage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <h1 className="text-4xl font-bold mb-6">Terms of Service</h1>
      <p className="text-gray-600 mb-8">Last updated: {new Date().toLocaleDateString()}</p>

      <div className="prose prose-lg max-w-none space-y-8">
        <section>
          <h2 className="text-2xl font-semibold mb-4">Agreement to Terms</h2>
          <p className="text-gray-700 leading-relaxed">
            By accessing and using BestStockBrokers.org, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing this site.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Use License</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            Permission is granted to temporarily access the materials on BestStockBrokers.org for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-gray-700">
            <li>Modify or copy the materials</li>
            <li>Use the materials for any commercial purpose or for any public display</li>
            <li>Attempt to reverse engineer any software contained on the website</li>
            <li>Remove any copyright or other proprietary notations from the materials</li>
            <li>Transfer the materials to another person or "mirror" the materials on any other server</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Disclaimer</h2>
          <p className="text-gray-700 leading-relaxed">
            The materials on BestStockBrokers.org are provided on an 'as is' basis. We make no warranties, expressed or implied, and hereby disclaim and negate all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Financial Disclaimer</h2>
          <p className="text-gray-700 leading-relaxed">
            <strong>Important:</strong> BestStockBrokers.org provides information for educational and informational purposes only. We are not financial advisors, and the information on this website should not be considered financial advice. Always consult with a qualified financial professional before making investment decisions. Trading and investing involve substantial risk of loss and are not suitable for every investor.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Accuracy of Materials</h2>
          <p className="text-gray-700 leading-relaxed">
            The materials appearing on BestStockBrokers.org could include technical, typographical, or photographic errors. We do not warrant that any of the materials on its website are accurate, complete, or current. We may make changes to the materials contained on its website at any time without notice.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Affiliate Relationships</h2>
          <p className="text-gray-700 leading-relaxed">
            BestStockBrokers.org may receive compensation from brokers featured on our website through affiliate relationships. This compensation does not influence our reviews or rankings. We are committed to providing honest and unbiased information to help you make informed decisions.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">User Content</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            By submitting reviews, comments, or other content to our website, you grant us a non-exclusive, royalty-free, perpetual, and worldwide license to use, modify, and display such content. You represent and warrant that:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-gray-700">
            <li>You own or have the right to submit the content</li>
            <li>The content is accurate and truthful</li>
            <li>The content does not violate any third-party rights</li>
            <li>The content complies with all applicable laws</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Limitations</h2>
          <p className="text-gray-700 leading-relaxed">
            In no event shall BestStockBrokers.org or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on BestStockBrokers.org, even if we or an authorized representative have been notified orally or in writing of the possibility of such damage.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Revisions</h2>
          <p className="text-gray-700 leading-relaxed">
            BestStockBrokers.org may revise these terms of service at any time without notice. By using this website, you are agreeing to be bound by the then current version of these terms of service.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Contact Information</h2>
          <p className="text-gray-700 leading-relaxed">
            If you have any questions about these Terms of Service, please contact us through{" "}
            <Link href="/contact" className="text-blue-600 hover:underline">
              our contact page
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  )
}
