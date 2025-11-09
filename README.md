# URL Shortener

A fast and reliable URL shortening service built with Next.js, featuring collision-resistant hashing and efficient database management.

## Overview

This URL shortener takes long URLs and converts them into short, shareable links. When users visit the short URL, they are automatically redirected to the original long URL.

**Example:**

- Input: `https://www.example.com/very/long/url/with/many/parameters?param1=value1&param2=value2`
- Output: `https://yourdomain.com/a1b2c3d4`

## Technical Architecture

### Hashing Algorithm

- **CRC32 with Collision Detection**: Uses CRC32 algorithm for generating short URL hashes
- **Collision Resolution**: Implements intelligent collision handling by:
  1. First checking if the original URL already exists in the database
  2. If a true collision occurs, appending a random character and rehashing (up to 3 attempts)
  3. Ensuring hash uniqueness while maintaining performance

### Database & ORM

- **Prisma ORM**: Type-safe database operations with auto-generated client
- **PostgreSQL**: Robust relational database for storing URL mappings
- **pgBouncer**: Connection pooling for efficient database connection management and reuse

### Technology Stack

- **Framework**: Next.js 16 with App Router
- **Runtime**: React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **Database**: PostgreSQL with Prisma ORM
- **Testing**: Jest with React Testing Library
- **Hashing**: @hqtsm/crc (CRC32 implementation)

## Database Schema

```prisma
model Url {
  id        Int      @id @default(autoincrement())
  longUrl   String
  hash      String   @unique
  createdAt DateTime @default(now())
}
```

## API Endpoints

### Create Short URL

```
POST /api
```

**Body:**

```json
{
  "longUrl": "https://example.com/very/long/url"
}
```

**Response:**

```json
{
  "shortUrl": "https://yourdomain.com/a1b2c3d4"
}
```

### Redirect to Long URL

```
GET /{hash}
```

Automatically redirects to the original long URL or returns 404 if not found.

## Getting Started

### Prerequisites

- Node.js 18 or later
- PostgreSQL database
- npm, yarn, pnpm, or bun

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd url-shortener
   ```

2. **Install dependencies**

   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:

   ```env
   DATABASE_URL= direct postgres connection string
   PRISMA_CUSTOM_URL= pgbouncer enabled connection string
   ```

4. **Set up the database**

   ```bash
   npx prisma migrate dev
   ```

5. **Generate Prisma client**
   ```bash
   npx prisma generate
   ```

### Development

Start the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

### Testing

Run the test suite:

```bash
npm test
# or
yarn test
# or
pnpm test
```

## Project Structure

```
url-shortener/
├── app/                   # Next.js App Router pages and API routes
│   ├── api/               # API endpoints
│   │   ├── route.ts       # Main URL shortening endpoint
│   │   ├── urlService.ts  # Core business logic
│   │   └── [hash]/        # Dynamic route for redirects
│   └── generated/         # Auto-generated Prisma client
├── components/            # React components
├── lib/                   # Utility functions
│   ├── hashUrl.ts        # CRC32 hashing implementation
│   ├── prisma.ts         # Prisma client configuration
│   └── utils.ts          # General utilities
├── prisma/               # Database schema and migrations
│   └── schema.prisma     # Database schema definition
└── public/               # Static assets
```

## Performance Features

- **Connection Pooling**: pgBouncer integration for efficient database connections
- **Type Safety**: Full TypeScript coverage with Prisma-generated types
- **Collision Handling**: Smart collision detection with minimal performance impact
- **Caching**: Built-in Next.js caching for optimal performance

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
