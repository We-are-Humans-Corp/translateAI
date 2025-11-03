# 🔬 Scientific Translation B2B Service

Enterprise-grade AI-powered translation service specialized for scientific and academic texts. Built with Next.js 14, TypeScript, and deployed on Vercel.

## ✨ Features

### Core Functionality
- **Multi-LLM Support**: OpenAI GPT-4, Anthropic Claude, Google Gemini, Open Source models
- **Specialized Styles**: Academic, Physics, Chemistry, Biology, Mathematics, Medicine, Engineering
- **Change Tracking**: Visual diff showing translation modifications
- **Batch Processing**: Translate multiple documents simultaneously
- **Real-time Streaming**: Stream responses for long texts

### B2B Features
- **API Key Management**: Secure key generation and rotation
- **Usage Analytics**: Detailed usage statistics and cost tracking
- **Team Collaboration**: Multi-user accounts with role-based access
- **Custom Billing**: Stripe integration with tiered pricing
- **Rate Limiting**: Configurable limits per tier
- **SLA Monitoring**: Response time and uptime tracking

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL database
- Vercel account
- At least one LLM API key (OpenAI/Anthropic/Google)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-company/translation-service
cd translation-service

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your credentials

# Set up database
npx prisma generate
npx prisma db push
npx prisma db seed

# Run development server
npm run dev
```

## 📦 Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL + Prisma ORM
- **Authentication**: NextAuth.js
- **Styling**: Tailwind CSS
- **Payments**: Stripe
- **Caching**: Vercel KV (Redis)
- **Deployment**: Vercel
- **Analytics**: Vercel Analytics

## 🏗️ Architecture

```
translation-service-b2b/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   │   ├── translate/     # Translation endpoints
│   │   ├── auth/          # Authentication
│   │   ├── keys/          # API key management
│   │   └── webhooks/      # Stripe webhooks
│   ├── dashboard/         # User dashboard
│   └── (marketing)/       # Landing pages
├── components/            # React components
├── lib/                   # Utility functions
├── prisma/               # Database schema
├── sdk/                  # Client SDK
└── public/               # Static assets
```

## 🔑 API Usage

### Authentication
```bash
curl -X POST https://api.your-domain.com/api/translate \
  -H "Content-Type: application/json" \
  -H "x-api-key: sk-your-api-key" \
  -d '{
    "text": "Your scientific text",
    "targetLang": "ru",
    "model": "gpt-4o",
    "style": "physics"
  }'
```

### JavaScript SDK
```javascript
import { TranslatorClient } from '@your-company/translator-sdk';

const client = new TranslatorClient({
  apiKey: 'sk-your-api-key'
});

const result = await client.translate({
  text: 'Scientific text here',
  targetLang: 'de',
  style: 'chemistry'
});
```

## 💳 Pricing Tiers

| Feature | Free | Basic | Pro | Enterprise |
|---------|------|-------|-----|------------|
| Translations/month | 10 | 100 | 1,000 | Unlimited |
| API Keys | 1 | 3 | 10 | Unlimited |
| Models | GPT-3.5 | GPT-3.5/4 | All | All + Custom |
| Support | Community | Email | Priority | Dedicated |
| SLA | - | 99% | 99.9% | 99.99% |
| Price | $0 | $19/mo | $99/mo | Custom |

## 🔒 Security

- **API Key Hashing**: SHA-256 hashed storage
- **Rate Limiting**: Per-tier configurable limits
- **CORS Protection**: Whitelist allowed origins
- **Input Validation**: Zod schema validation
- **SQL Injection**: Prisma parameterized queries
- **XSS Protection**: Content Security Policy headers
- **HTTPS Only**: Enforced SSL/TLS

## 📊 Monitoring

### Health Check
```bash
GET /api/health
```

### Metrics Endpoint
```bash
GET /api/metrics
Authorization: Bearer admin-token
```

### Status Page
https://status.your-domain.com

## 🧪 Testing

```bash
# Unit tests
npm run test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Load testing
npm run test:load
```

## 📝 Environment Variables

```env
# Database
DATABASE_URL=postgresql://...

# Authentication
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=...

# LLM Providers (at least one required)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_AI_API_KEY=...

# Stripe Billing
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Vercel KV (Redis)
KV_REST_API_URL=...
KV_REST_API_TOKEN=...

# Email
RESEND_API_KEY=...
```

## 🚀 Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import to Vercel
3. Configure environment variables
4. Deploy

```bash
# CLI deployment
vercel --prod
```

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm ci --only=production
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: translator-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: translator
  template:
    metadata:
      labels:
        app: translator
    spec:
      containers:
      - name: api
        image: your-registry/translator:latest
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: translator-secrets
              key: database-url
```

## 📚 Documentation

- [API Reference](https://docs.your-domain.com/api)
- [SDK Documentation](https://docs.your-domain.com/sdk)
- [Deployment Guide](./DEPLOYMENT.md)
- [Contributing Guide](./CONTRIBUTING.md)

## 🤝 Support

- **Documentation**: https://docs.your-domain.com
- **Email**: support@your-domain.com
- **Discord**: https://discord.gg/your-channel
- **Status Page**: https://status.your-domain.com

## 📄 License

MIT © Your Company

---

Built with ❤️ by Your Company
