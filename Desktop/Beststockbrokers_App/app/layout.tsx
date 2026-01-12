import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Header } from "@/components/layout/Header"
import { Footer } from "@/components/layout/Footer"
import { ScrollToTop } from "@/components/layout/ScrollToTop"
import { PageViewTracker } from "@/components/analytics/PageViewTracker"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "BestStockBrokers.org - Compare Stock Brokers Worldwide",
  description: "Compare stock brokers from around the world. Find the best trading platform with detailed reviews, fees, and features comparison.",
  keywords: ["stock brokers", "broker comparison", "trading platforms", "online brokers", "investment brokers"],
  authors: [{ name: "BestStockBrokers.org" }],
  openGraph: {
    title: "BestStockBrokers.org - Compare Stock Brokers Worldwide",
    description: "Compare stock brokers from around the world. Find the best trading platform.",
    type: "website",
    siteName: "BestStockBrokers.org",
  },
  twitter: {
    card: "summary_large_image",
    title: "BestStockBrokers.org - Compare Stock Brokers",
    description: "Compare stock brokers from around the world.",
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <PageViewTracker />
        <Header />
        <main className="min-h-screen">
          {children}
        </main>
        <Footer />
        <ScrollToTop />
      </body>
    </html>
  )
}
