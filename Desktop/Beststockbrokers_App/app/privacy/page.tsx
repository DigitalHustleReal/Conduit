import { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Privacy Policy - BestStockBrokers.org",
  description: "Our privacy policy explains how we collect, use, and protect your personal information.",
}

export default function PrivacyPolicyPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <h1 className="text-4xl font-bold mb-6">Privacy Policy</h1>
      <p className="text-gray-600 mb-8">Last updated: {new Date().toLocaleDateString()}</p>

      <div className="prose prose-lg max-w-none space-y-8">
        <section>
          <h2 className="text-2xl font-semibold mb-4">Introduction</h2>
          <p className="text-gray-700 leading-relaxed">
            Welcome to BestStockBrokers.org. We are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Information We Collect</h2>
          <p className="text-gray-700 leading-relaxed mb-4">We may collect the following types of information:</p>
          <ul className="list-disc pl-6 space-y-2 text-gray-700">
            <li><strong>Personal Information:</strong> Name, email address, and other information you provide when contacting us or submitting reviews.</li>
            <li><strong>Usage Data:</strong> Information about how you interact with our website, including pages visited, time spent, and referring websites.</li>
            <li><strong>Device Information:</strong> Browser type, device type, IP address, and other technical information.</li>
            <li><strong>Cookies:</strong> We use cookies to enhance your experience and analyze website traffic.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">How We Use Your Information</h2>
          <p className="text-gray-700 leading-relaxed mb-4">We use the collected information for:</p>
          <ul className="list-disc pl-6 space-y-2 text-gray-700">
            <li>Providing and maintaining our services</li>
            <li>Improving user experience and website functionality</li>
            <li>Analyzing website usage and trends</li>
            <li>Responding to your inquiries and requests</li>
            <li>Sending newsletters and updates (with your consent)</li>
            <li>Preventing fraud and ensuring security</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Data Sharing</h2>
          <p className="text-gray-700 leading-relaxed">
            We do not sell your personal information. We may share your information with:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-gray-700 mt-4">
            <li>Service providers who assist in operating our website</li>
            <li>Analytics and advertising partners (with appropriate safeguards)</li>
            <li>Legal authorities when required by law</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Your Rights</h2>
          <p className="text-gray-700 leading-relaxed mb-4">You have the right to:</p>
          <ul className="list-disc pl-6 space-y-2 text-gray-700">
            <li>Access your personal data</li>
            <li>Request correction of inaccurate data</li>
            <li>Request deletion of your data</li>
            <li>Opt-out of marketing communications</li>
            <li>Object to certain data processing activities</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Cookies</h2>
          <p className="text-gray-700 leading-relaxed">
            We use cookies to enhance your browsing experience. You can control cookie settings through your browser preferences. However, disabling cookies may affect website functionality.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Data Security</h2>
          <p className="text-gray-700 leading-relaxed">
            We implement appropriate security measures to protect your personal information. However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Changes to This Policy</h2>
          <p className="text-gray-700 leading-relaxed">
            We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Contact Us</h2>
          <p className="text-gray-700 leading-relaxed">
            If you have questions about this Privacy Policy, please contact us at{" "}
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
