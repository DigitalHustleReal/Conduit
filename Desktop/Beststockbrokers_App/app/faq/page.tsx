import { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Frequently Asked Questions - BestStockBrokers.org",
  description: "Find answers to common questions about stock brokers and our platform.",
}

const faqs = [
  {
    question: "What is BestStockBrokers.org?",
    answer: "BestStockBrokers.org is a comprehensive comparison platform that helps investors find and compare stock brokers from around the world. We provide detailed information, ratings, reviews, and tools to help you make informed decisions.",
  },
  {
    question: "How do you rate brokers?",
    answer: "We rate brokers based on multiple factors including fees, platform quality, customer support, regulation, and user reviews. Our ratings are regularly updated to reflect current conditions.",
  },
  {
    question: "Is your information free to use?",
    answer: "Yes! All the information on BestStockBrokers.org is free to access. We provide broker comparisons, reviews, and guides at no cost to users.",
  },
  {
    question: "Do you receive compensation from brokers?",
    answer: "Yes, we may receive affiliate compensation from brokers when users sign up through our links. However, this does not influence our reviews or ratings. We are committed to providing honest, unbiased information.",
  },
  {
    question: "How often is the information updated?",
    answer: "We regularly update broker information, fees, and features. However, broker terms can change, so we recommend verifying current details directly with the broker before opening an account.",
  },
  {
    question: "Can I submit a review?",
    answer: "Absolutely! We encourage users to share their experiences. You can submit reviews through broker detail pages. All reviews are moderated to ensure quality and authenticity.",
  },
  {
    question: "Is this financial advice?",
    answer: "No, BestStockBrokers.org provides informational content only. We do not provide personalized financial advice. Always consult with a qualified financial professional before making investment decisions.",
  },
  {
    question: "How do I choose the right broker?",
    answer: "Consider factors such as fees, minimum deposit requirements, supported markets, platform features, customer support, and regulation. Use our comparison tool to compare multiple brokers side-by-side.",
  },
  {
    question: "Are all brokers regulated?",
    answer: "Regulation varies by broker and jurisdiction. We indicate regulation status for each broker. Always verify regulation with the relevant financial authority before investing.",
  },
  {
    question: "How can I contact you?",
    answer: "You can reach us through our contact page, email us at contact@beststockbrokers.org, or submit feedback through our website. We typically respond within 24-48 hours.",
  },
]

export default function FAQPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold mb-4">Frequently Asked Questions</h1>
        <p className="text-gray-600 text-lg">
          Find answers to common questions about our platform and stock brokers
        </p>
      </div>

      <div className="space-y-6">
        {faqs.map((faq, index) => (
          <div key={index} className="bg-white rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-3 text-gray-900">{faq.question}</h2>
            <p className="text-gray-700 leading-relaxed">{faq.answer}</p>
          </div>
        ))}
      </div>

      <div className="mt-12 bg-blue-50 rounded-lg border border-blue-200 p-6 text-center">
        <h2 className="text-2xl font-semibold mb-4">Still Have Questions?</h2>
        <p className="text-gray-700 mb-4">
          Can't find the answer you're looking for? We're here to help!
        </p>
        <Link href="/contact">
          <button className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors">
            Contact Us
          </button>
        </Link>
      </div>
    </div>
  )
}
