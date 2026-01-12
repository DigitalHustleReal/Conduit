"use client"

import Link from "next/link"
import { Facebook, Twitter, Linkedin, Instagram, Youtube, Mail } from "lucide-react"

const socialLinks = [
  {
    name: "Facebook",
    href: "https://facebook.com/beststockbrokers",
    icon: Facebook,
    color: "hover:text-blue-600",
  },
  {
    name: "Twitter",
    href: "https://twitter.com/beststockbrokers",
    icon: Twitter,
    color: "hover:text-blue-400",
  },
  {
    name: "LinkedIn",
    href: "https://linkedin.com/company/beststockbrokers",
    icon: Linkedin,
    color: "hover:text-blue-700",
  },
  {
    name: "Instagram",
    href: "https://instagram.com/beststockbrokers",
    icon: Instagram,
    color: "hover:text-pink-600",
  },
  {
    name: "YouTube",
    href: "https://youtube.com/@beststockbrokers",
    icon: Youtube,
    color: "hover:text-red-600",
  },
  {
    name: "Email",
    href: "mailto:contact@beststockbrokers.org",
    icon: Mail,
    color: "hover:text-gray-700",
  },
]

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t bg-gray-50">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4 lg:grid-cols-5">
          {/* About */}
          <div className="lg:col-span-2">
            <Link href="/" className="mb-4 inline-block">
              <span className="text-2xl font-bold text-blue-600">BestStockBrokers</span>
              <span className="text-xs text-gray-500">.org</span>
            </Link>
            <p className="mb-4 text-sm text-gray-600">
              The world&apos;s most comprehensive stock broker comparison platform. Compare brokers from around the globe to find the perfect trading platform for your needs.
            </p>
            {/* Social Media Links */}
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-700">Follow us:</span>
              <div className="flex items-center gap-3">
                {socialLinks.map((social) => {
                  const Icon = social.icon
                  return (
                    <a
                      key={social.name}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`text-gray-500 transition-colors ${social.color}`}
                      aria-label={social.name}
                    >
                      <Icon className="h-5 w-5" />
                    </a>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="mb-4 text-lg font-semibold">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/brokers" className="text-gray-600 transition-colors hover:text-blue-600">
                  All Brokers
                </Link>
              </li>
              <li>
                <Link href="/compare" className="text-gray-600 transition-colors hover:text-blue-600">
                  Compare Brokers
                </Link>
              </li>
              <li>
                <Link href="/countries" className="text-gray-600 transition-colors hover:text-blue-600">
                  Brokers by Country
                </Link>
              </li>
              <li>
                <Link href="/guides" className="text-gray-600 transition-colors hover:text-blue-600">
                  Trading Guides
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="mb-4 text-lg font-semibold">Resources</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/blog" className="text-gray-600 transition-colors hover:text-blue-600">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="/guides" className="text-gray-600 transition-colors hover:text-blue-600">
                  Trading Guides
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-gray-600 transition-colors hover:text-blue-600">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-gray-600 transition-colors hover:text-blue-600">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & Contact */}
          <div>
            <h3 className="mb-4 text-lg font-semibold">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/privacy" className="text-gray-600 transition-colors hover:text-blue-600">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-gray-600 transition-colors hover:text-blue-600">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-gray-600 transition-colors hover:text-blue-600">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link href="/affiliate-disclosure" className="text-gray-600 transition-colors hover:text-blue-600">
                  Affiliate Disclosure
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t pt-8">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <p className="text-sm text-gray-600">
              &copy; {currentYear} BestStockBrokers.org. All rights reserved.
            </p>
            <p className="text-xs text-gray-500">
              Not financial advice. Always do your own research before investing.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}

