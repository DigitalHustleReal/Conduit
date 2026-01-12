# Broker Classification System

The scraping system now automatically classifies brokers based on geography and type.

## Broker Types

The system classifies brokers into the following types:

### 1. **Full Service Broker**
- Comprehensive financial services
- Investment advice and portfolio management
- Examples: Charles Schwab, Fidelity, Morgan Stanley

### 2. **Discount Broker**
- Lower-cost trading services
- Minimal advice
- Examples: Interactive Brokers, TD Ameritrade

### 3. **Commission-Free Broker**
- Zero commission on trades
- Examples: Robinhood, Webull, SoFi

### 4. **Robo Advisor**
- Automated investment management
- Algorithm-based portfolio management
- Examples: Betterment, Wealthfront, Acorns

### 5. **Day Trading Broker**
- Specialized for active/day trading
- Advanced trading tools
- Examples: TradeStation, Lightspeed

### 6. **Options Trading Broker**
- Specialized options platform
- Advanced options strategies
- Examples: Tastyworks, ThinkOrSwim

### 7. **Forex Broker**
- Focus on foreign exchange trading
- Examples: FXCM, Oanda, IG Markets

### 8. **Cryptocurrency Broker**
- Specialized in crypto trading
- Examples: Coinbase, Binance, Kraken

### 9. **Social Trading Platform**
- Copy trading features
- Examples: eToro, ZuluTrade

### 10. **International Broker**
- Operates across multiple countries
- Non-US focus

### 11. **Premium Broker**
- High-end service
- For affluent clients
- High minimum deposits

### 12. **Other**
- General/unspecified type

## Geography Classification

Brokers are classified by:

- **Primary Country**: Headquarters country
- **Primary Region**: Main operating region
- **Supported Regions**: All regions where broker operates
- **Is Global**: Boolean indicating global presence (10+ countries, 2+ regions)

### Regions

- **North America**: US, Canada, Mexico
- **Europe**: UK, Germany, France, Italy, Spain, etc.
- **Asia Pacific**: Australia, Japan, Singapore, Hong Kong, etc.
- **Latin America**: Brazil, Argentina, Chile, etc.
- **Middle East**: UAE, Saudi Arabia, Israel, Turkey
- **Africa**: South Africa, Egypt, Kenya, Nigeria

## Target Market Classification

Brokers are also classified by target market:

- **Beginner**: Easy to use, educational resources, low/no minimum deposit
- **Intermediate**: Moderate complexity, some advanced features
- **Advanced**: Sophisticated tools, complex features
- **Professional**: Institutional-grade tools, API access
- **Institutional**: Prime broker services, high minimums
- **Mixed**: No clear target market

## Usage

### Automatic Classification

Classification happens automatically when scraping:

```typescript
import { BrokerScraper } from "@/lib/scrapers/broker-scraper"

const scraper = new BrokerScraper("broker_website")
const result = await scraper.scrape("https://www.interactivebrokers.com")

if (result.success && result.data) {
  console.log("Broker Type:", result.data.brokerType)
  console.log("Classification:", result.data.classification)
  // {
  //   types: [...],
  //   primaryType: "discount",
  //   geography: {
  //     primaryCountry: "US",
  //     primaryRegion: "north_america",
  //     supportedRegions: ["north_america", "europe", "asia_pacific"],
  //     isGlobal: true
  //   },
  //   targetMarket: "advanced"
  // }
}
```

### Manual Classification

You can also classify existing data:

```typescript
import { BrokerClassifier } from "@/lib/scrapers/classifier"

const classifier = new BrokerClassifier()
const classification = classifier.classifyBroker(scrapedData)

console.log("Primary Type:", classification.primaryType)
console.log("Geography:", classification.geography)
```

### Using Classification Labels

```typescript
import { getBrokerTypeLabel, getBrokerTypeDescription } from "@/lib/scrapers/utils"

const type: BrokerType = "full_service"
console.log(getBrokerTypeLabel(type)) // "Full Service Broker"
console.log(getBrokerTypeDescription(type)) // Description text
```

### Grouping Brokers

```typescript
import { groupBrokersByType, groupBrokersByRegion } from "@/lib/scrapers/utils"

// Group by type
const byType = groupBrokersByType(brokers)
console.log(byType.full_service) // All full-service brokers
console.log(byType.discount) // All discount brokers

// Group by region
const byRegion = groupBrokersByRegion(brokers)
console.log(byRegion.north_america) // All North American brokers
console.log(byRegion.europe) // All European brokers
```

## Classification Logic

The classifier uses multiple signals:

1. **Name matching**: Recognizes known broker names
2. **Keyword matching**: Searches descriptions for keywords
3. **Feature analysis**: Analyzes fees, minimum deposits, features
4. **Geography analysis**: Examines supported countries
5. **Confidence scoring**: Assigns confidence scores to classifications

## Confidence Scores

Each type classification includes a confidence score (0-1):
- **High (0.7-1.0)**: Strong indicators match
- **Medium (0.4-0.7)**: Some indicators match
- **Low (0-0.4)**: Weak or conflicting indicators

The primary type is the one with the highest confidence.

## Filtering by Classification

You can filter brokers in API calls:

```typescript
// Filter by type (would need to be added to API)
GET /api/brokers?brokerType=full_service
GET /api/brokers?brokerType=discount,commission_free

// Filter by region (already supported via country)
GET /api/brokers?country=US
GET /api/brokers?region=north_america
```

## Database Storage

Classification data is stored in the scraped data structure. To persist it:

1. Add `brokerType` field to Broker model (if needed)
2. Store classification as JSON in a field
3. Or create separate BrokerClassification model

Currently, classification is included in the scraped data but may need database schema updates to persist.
