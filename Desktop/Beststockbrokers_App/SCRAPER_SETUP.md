# Scraper Setup Guide

## Quick Start

The scraping system is ready to use! Here's how to get started.

## Installation

No additional dependencies required - uses built-in Node.js `fetch` API.

For advanced features (optional):
```bash
# For better HTML parsing (recommended)
npm install cheerio

# For JavaScript-heavy sites (optional)
npm install puppeteer
```

## Basic Usage

### 1. Scrape a Broker

```typescript
import { BrokerScraper } from "@/lib/scrapers/broker-scraper"
import { ScraperService } from "@/lib/scrapers/scraper-service"

const scraper = new BrokerScraper("broker_website")
const service = new ScraperService()

// Scrape broker data
const result = await scraper.scrape("https://www.interactivebrokers.com")

if (result.success && result.data) {
  // Save to database
  const saveResult = await service.saveBrokerData(result.data)
  console.log("Saved broker:", saveResult.brokerId)
}
```

### 2. Scrape Reviews

```typescript
import { ReviewScraper } from "@/lib/scrapers/review-scraper"
import { ScraperService } from "@/lib/scrapers/scraper-service"

const scraper = new ReviewScraper("trustpilot")
const service = new ScraperService()

// Scrape reviews
const result = await scraper.scrape(
  "https://www.trustpilot.com/review/interactivebrokers.com",
  { limit: 50 }
)

if (result.success && result.data) {
  // Save to database
  const saveResult = await service.saveReviews(
    "interactive-brokers", // broker slug or ID
    result.data
  )
  console.log(`Saved ${saveResult.savedCount} reviews`)
}
```

### 3. Using API Endpoints

#### Via curl

```bash
# Scrape broker
curl -X POST http://localhost:3000/api/scraper/broker \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.interactivebrokers.com",
    "source": "broker_website",
    "saveToDatabase": true
  }'

# Scrape reviews
curl -X POST http://localhost:3000/api/scraper/reviews \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.trustpilot.com/review/interactivebrokers.com",
    "source": "trustpilot",
    "brokerIdOrSlug": "interactive-brokers",
    "limit": 50,
    "saveToDatabase": true
  }'
```

#### Via JavaScript/TypeScript

```typescript
// Scrape broker
const response = await fetch("/api/scraper/broker", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    url: "https://www.interactivebrokers.com",
    source: "broker_website",
    saveToDatabase: true,
  }),
})

const result = await response.json()
console.log(result)
```

## Configuration

### Environment Variables

Add to `.env` if needed:

```env
# Optional: Custom user agent
SCRAPER_USER_AGENT="Your Custom User Agent"

# Optional: Proxy (if needed)
SCRAPER_PROXY="http://proxy.example.com:8080"
```

### Scraper Configuration

```typescript
const scraper = new BrokerScraper("broker_website", {
  rateLimitDelay: 3000,    // 3 seconds between requests
  maxRetries: 3,           // Retry 3 times on failure
  timeout: 30000,          // 30 second timeout
  userAgent: "Custom UA",  // Custom user agent
  headers: {               // Custom headers
    "Accept": "text/html",
  },
  proxy: "http://proxy:8080", // Proxy (optional)
})
```

## Testing

### Test Script

Create `scripts/test-scraper.ts`:

```typescript
import { BrokerScraper } from "../lib/scrapers/broker-scraper"
import { ReviewScraper } from "../lib/scrapers/review-scraper"

async function test() {
  // Test broker scraper
  const brokerScraper = new BrokerScraper("broker_website")
  const brokerResult = await brokerScraper.scrape("https://www.interactivebrokers.com")
  console.log("Broker scrape result:", brokerResult)

  // Test review scraper
  const reviewScraper = new ReviewScraper("trustpilot")
  const reviewResult = await reviewScraper.scrape(
    "https://www.trustpilot.com/review/interactivebrokers.com",
    { limit: 5 }
  )
  console.log("Review scrape result:", reviewResult)
}

test().catch(console.error)
```

Run with:
```bash
npx tsx scripts/test-scraper.ts
```

## Production Deployment

### 1. Rate Limiting

Increase delays for production:

```typescript
const scraper = new BrokerScraper("broker_website", {
  rateLimitDelay: 5000, // 5 seconds in production
})
```

### 2. Error Monitoring

Set up error logging:

```typescript
try {
  const result = await scraper.scrape(url)
  if (!result.success) {
    // Log to error tracking service (Sentry, etc.)
    console.error("Scraping failed:", result.error)
  }
} catch (error) {
  // Log unexpected errors
  console.error("Scraping error:", error)
}
```

### 3. Batch Processing

Use batch endpoint for multiple items:

```typescript
// Better for production - processes sequentially with delays
const batchResult = await fetch("/api/scraper/batch", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer <token>",
  },
  body: JSON.stringify({
    brokers: [
      { url: "https://broker1.com", source: "broker_website" },
      { url: "https://broker2.com", source: "broker_website" },
    ],
  }),
})
```

### 4. Scheduled Jobs

Set up cron jobs for regular scraping:

```typescript
// Example: Update broker data daily
// Use Vercel Cron, GitHub Actions, or similar
export async function scheduledScrape() {
  const brokers = await prisma.broker.findMany({ select: { id: true, websiteUrl: true } })
  
  for (const broker of brokers) {
    const scraper = new BrokerScraper("broker_website")
    const result = await scraper.scrape(broker.websiteUrl)
    
    if (result.success && result.data) {
      const service = new ScraperService()
      await service.saveBrokerData(result.data)
    }
    
    // Delay between brokers
    await new Promise(resolve => setTimeout(resolve, 5000))
  }
}
```

## Troubleshooting

See `lib/scrapers/README.md` for detailed troubleshooting guide.

## Next Steps

1. Test with a few brokers
2. Set up scheduled scraping jobs
3. Monitor error rates
4. Adjust rate limits as needed
5. Add more sources if needed

For detailed documentation, see `lib/scrapers/README.md`.
