# Broker Scrapers - Production Ready

A comprehensive scraping system for collecting broker details and reviews from various sources.

## Features

- ✅ **Production-ready infrastructure** with error handling, retries, and rate limiting
- ✅ **Multiple source support**: BrokerChooser, StockBrokers.com, Trustpilot, broker websites, Investopedia, NerdWallet
- ✅ **Data validation** using Zod schemas
- ✅ **Database integration** via Prisma
- ✅ **Batch processing** support
- ✅ **Type-safe** with TypeScript

## Architecture

```
lib/scrapers/
├── types.ts              # Type definitions
├── base-scraper.ts       # Base class with common functionality
├── broker-scraper.ts     # Broker details scraper
├── review-scraper.ts     # Reviews scraper
├── validator.ts          # Data validation schemas
└── scraper-service.ts    # Database service layer
```

## Usage

### Basic Broker Scraping

```typescript
import { BrokerScraper } from "@/lib/scrapers/broker-scraper"

const scraper = new BrokerScraper("broker_website", {
  rateLimitDelay: 2000,
  maxRetries: 3,
  timeout: 30000,
})

const result = await scraper.scrape("https://www.interactivebrokers.com", {
  brokerName: "Interactive Brokers",
})

if (result.success && result.data) {
  console.log("Scraped data:", result.data)
}
```

### Basic Review Scraping

```typescript
import { ReviewScraper } from "@/lib/scrapers/review-scraper"

const scraper = new ReviewScraper("trustpilot", {
  rateLimitDelay: 2000,
  maxRetries: 3,
})

const result = await scraper.scrape("https://www.trustpilot.com/review/interactivebrokers.com", {
  limit: 50,
})

if (result.success && result.data) {
  console.log(`Found ${result.data.length} reviews`)
}
```

### Saving to Database

```typescript
import { ScraperService } from "@/lib/scrapers/scraper-service"
import { BrokerScraper } from "@/lib/scrapers/broker-scraper"

const scraper = new BrokerScraper("broker_website")
const service = new ScraperService()

const result = await scraper.scrape("https://www.interactivebrokers.com")

if (result.success && result.data) {
  const saveResult = await service.saveBrokerData(result.data)
  
  if (saveResult.success) {
    console.log("Broker saved with ID:", saveResult.brokerId)
  }
}
```

### Using API Endpoints

#### Scrape Broker

```bash
POST /api/scraper/broker
Content-Type: application/json

{
  "url": "https://www.interactivebrokers.com",
  "source": "broker_website",
  "brokerName": "Interactive Brokers",
  "saveToDatabase": true
}
```

#### Scrape Reviews

```bash
POST /api/scraper/reviews
Content-Type: application/json

{
  "url": "https://www.trustpilot.com/review/interactivebrokers.com",
  "source": "trustpilot",
  "brokerIdOrSlug": "interactive-brokers",
  "limit": 50,
  "saveToDatabase": true
}
```

#### Batch Scraping

```bash
POST /api/scraper/batch
Authorization: Bearer <token>
Content-Type: application/json

{
  "brokers": [
    {
      "url": "https://www.interactivebrokers.com",
      "source": "broker_website",
      "brokerName": "Interactive Brokers"
    },
    {
      "url": "https://www.schwab.com",
      "source": "broker_website",
      "brokerName": "Charles Schwab"
    }
  ],
  "reviews": [
    {
      "url": "https://www.trustpilot.com/review/interactivebrokers.com",
      "source": "trustpilot",
      "brokerIdOrSlug": "interactive-brokers",
      "limit": 50
    }
  ]
}
```

## Supported Sources

### Broker Details
- `broker_website` - Scrapes directly from broker's website
- `brokerchooser` - BrokerChooser.com reviews
- `stockbrokers` - StockBrokers.com reviews
- `investopedia` - Investopedia broker reviews
- `nerdwallet` - NerdWallet reviews

### Reviews
- `trustpilot` - Trustpilot reviews
- `brokerchooser` - BrokerChooser reviews
- `stockbrokers` - StockBrokers.com reviews

## Configuration

### ScraperConfig Options

```typescript
{
  rateLimitDelay?: number      // Milliseconds between requests (default: 2000)
  maxRetries?: number          // Maximum retry attempts (default: 3)
  timeout?: number             // Request timeout in ms (default: 30000)
  userAgent?: string           // Custom user agent
  headers?: Record<string, string>  // Custom headers
  proxy?: string               // Proxy URL (optional)
}
```

## Error Handling

All scrapers return a `ScraperResult` object:

```typescript
{
  success: boolean
  data?: T
  error?: string
  source?: string
  timestamp?: Date
}
```

Always check `success` before using `data`.

## Rate Limiting

The scrapers automatically implement rate limiting to avoid being blocked:
- Default: 2 seconds between requests
- Configurable per scraper instance
- Exponential backoff on retries

## Data Validation

All scraped data is validated using Zod schemas before saving to database:
- Broker data validation
- Review data validation
- Automatic error reporting for invalid data

## Best Practices

1. **Always use rate limiting** - Don't set `rateLimitDelay` too low
2. **Handle errors gracefully** - Check `success` before using data
3. **Use batch endpoints for multiple items** - More efficient than individual requests
4. **Validate data before saving** - Validation happens automatically, but check errors
5. **Respect robots.txt** - Check target sites' robots.txt before scraping
6. **Use appropriate user agents** - Default is set, but can be customized
7. **Monitor for blocks** - Watch for HTTP 429 (rate limit) or 403 (forbidden) errors

## Production Considerations

### Rate Limiting
- Increase `rateLimitDelay` for production (3-5 seconds recommended)
- Use batch endpoints with delays between items

### Error Handling
- Implement retry logic (built-in, but can be customized)
- Log all errors for monitoring
- Set up alerts for high error rates

### Monitoring
- Track scraping success rates
- Monitor response times
- Alert on rate limit errors (429)

### Legal & Ethical
- ✅ Always check robots.txt
- ✅ Respect rate limits
- ✅ Use for public data only
- ✅ Consider API access when available (e.g., Trustpilot API)
- ⚠️ Some sites may require permission for scraping
- ⚠️ Review terms of service for target sites

## Extending the System

### Adding a New Source

1. Add source type to `types.ts`:
```typescript
export type ScraperSource = ... | "new_source"
```

2. Implement scraping logic in the appropriate scraper class
3. Add validation if needed
4. Update API endpoint schemas

### Example: Adding a New Broker Source

```typescript
// In broker-scraper.ts
private async scrapeNewSource(url: string): Promise<ScrapedBrokerData> {
  const html = await this.parseHTML(url)
  
  // Implement parsing logic
  const name = // extract name
  const description = // extract description
  
  return {
    name,
    description,
    websiteUrl: url,
    source: "new_source",
    sourceUrl: url,
  }
}

// Add to scrape() method switch statement
case "new_source":
  data = await this.scrapeNewSource(url)
  break
```

## Troubleshooting

### Common Issues

1. **Timeout errors**
   - Increase `timeout` in config
   - Check network connectivity
   - Site may be slow/down

2. **429 Rate Limit errors**
   - Increase `rateLimitDelay`
   - Reduce batch size
   - Check if site has stricter limits

3. **403 Forbidden errors**
   - Site may be blocking scrapers
   - Check user agent
   - May need proxy or different approach

4. **Validation errors**
   - Check scraped data format
   - Update parsing logic if site structure changed
   - Review validation schema

5. **Empty results**
   - Site structure may have changed
   - Check if URL is correct
   - Verify selectors/parsing logic

## Future Enhancements

- [ ] Add Puppeteer/Playwright for JS-heavy sites
- [ ] Add proxy rotation support
- [ ] Add caching layer
- [ ] Add scheduled scraping jobs
- [ ] Add webhook notifications
- [ ] Add scraping analytics dashboard
- [ ] Support for more sources
- [ ] Advanced retry strategies
- [ ] Distributed scraping support
