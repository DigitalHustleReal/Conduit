# BestStockBrokers.org

> The world's most comprehensive stock broker comparison platform. Compare brokers from around the globe to find the perfect trading platform for your needs.

## 🌟 Features

### For Users
- **Broker Comparison** - Side-by-side comparison of brokers with detailed metrics
- **Advanced Filtering** - Filter brokers by country, region, type, features, and more
- **Detailed Reviews** - User reviews and ratings for each broker
- **Comprehensive Data** - Fees, platforms, features, regulation, and more
- **Geographic Filtering** - Find brokers by country, continent, or global coverage
- **Broker Classification** - Full-service, discount, robo-advisor, and more

### For Administrators
- **Full CRUD Management** - Create, edit, and delete brokers
- **Image Upload** - Upload broker logos via Cloudinary
- **Review Moderation** - Approve, reject, and manage user reviews
- **Content Management** - Blog posts, guides, and pages (CMS)
- **Analytics Dashboard** - Track page views, searches, and popular content
- **Affiliate Tracking** - Monitor affiliate clicks and conversions

## 🚀 Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Database:** PostgreSQL (Supabase)
- **ORM:** Prisma
- **Authentication:** Supabase Auth
- **Image Storage:** Cloudinary
- **Email:** Resend
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui
- **Deployment:** Vercel (recommended)

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account
- Cloudinary account (optional, for image uploads)
- Resend account (optional, for emails)

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Beststockbrokers_App
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example.txt .env
   ```
   
   Fill in your environment variables (see `SETUP_FREE_TIER.md` for details):
   - Supabase URL and keys
   - Cloudinary credentials
   - Resend API key

4. **Set up the database**
   ```bash
   # Generate Prisma client
   npm run db:generate
   
   # Push schema to database
   npm run db:push
   
   # (Optional) Seed with sample data
   npm run db:seed
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
Beststockbrokers_App/
├── app/                      # Next.js app directory
│   ├── (marketing)/         # Marketing pages
│   ├── admin/               # Admin panel
│   ├── api/                 # API routes
│   ├── brokers/             # Broker listing & detail pages
│   ├── compare/             # Comparison tool
│   └── countries/           # Country-specific pages
├── components/              # React components
│   ├── admin/               # Admin components
│   ├── brokers/             # Broker-related components
│   ├── compare/             # Comparison components
│   ├── filters/             # Filter components
│   ├── home/                # Homepage components
│   ├── layout/              # Layout components
│   ├── reviews/             # Review components
│   └── ui/                  # UI components (shadcn/ui)
├── lib/                     # Utilities and helpers
│   ├── categorization/      # Broker categorization
│   ├── compare/             # Comparison utilities
│   ├── scrapers/            # Web scraping system
│   ├── seo/                 # SEO utilities
│   └── supabase/            # Supabase clients
├── prisma/                  # Database schema and migrations
└── public/                  # Static assets
```

## 🎯 Key Features Implementation

### Broker Management
- ✅ Create, edit, and delete brokers
- ✅ Image upload (Cloudinary)
- ✅ Advanced filtering (geography, type, features)
- ✅ Broker classification system

### Review System
- ✅ User review submission
- ✅ Admin review moderation
- ✅ Review approval/rejection workflow

### Content Management (CMS)
- ✅ Blog posts, guides, and pages
- ✅ Full CRUD operations
- ✅ SEO metadata management
- ✅ Draft/Published workflow

### Analytics
- ✅ Page view tracking
- ✅ Search query tracking
- ✅ Analytics dashboard
- ✅ Popular content tracking

### Comparison Tool
- ✅ Side-by-side comparison
- ✅ Enhanced UI/UX
- ✅ Visual highlighting
- ✅ Share functionality

## 📚 Documentation

- `PROJECT_PLAN.md` - Overall project vision and plan
- `SETUP_FREE_TIER.md` - Detailed setup instructions
- `QUICK_START.md` - Quick start guide
- `SCRAPER_SETUP.md` - Scraper setup and usage
- `TOP_5_FEATURES_STATUS.md` - Feature implementation status

## 🔐 Admin Access

1. Set up Supabase authentication
2. Create an admin user in Supabase dashboard
3. Access admin panel at `/admin`
4. Login at `/login`

## 🛠️ Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema to database
- `npm run db:seed` - Seed database with sample data

## 📊 Database Models

- **Broker** - Main broker information
- **BrokerFee** - Trading fees and commissions
- **BrokerFeature** - Features and capabilities
- **BrokerPlatform** - Supported platforms
- **BrokerRating** - Ratings by category
- **BrokerReview** - User reviews
- **ContentPage** - Blog posts, guides, pages
- **PageView** - Analytics tracking
- **SearchQuery** - Search analytics
- **AffiliateProgram** - Affiliate programs
- **AffiliateClick** - Click tracking
- **Country** - Country information

## 🌍 Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project to Vercel
3. Add environment variables
4. Deploy!

See `SETUP_INSTRUCTIONS.md` for detailed deployment steps.

## 📝 License

[Add your license here]

## 🤝 Contributing

[Add contribution guidelines here]

## 📧 Contact

- Website: [BestStockBrokers.org](https://beststockbrokers.org)
- Email: contact@beststockbrokers.org
- Contact Page: `/contact`

## 🙏 Acknowledgments

- Built with Next.js and modern web technologies
- UI components from shadcn/ui
- Database hosted on Supabase
- Images optimized with Cloudinary

---

**Note:** This platform provides informational content only. Always consult with qualified financial professionals before making investment decisions.
