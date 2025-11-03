# TranslateAI Setup Guide

## 🚀 Complete B2B Translation Service with LiteLLM Integration

This service provides enterprise-grade translation capabilities with support for multiple LLM providers, user authentication, API key management, and usage tracking.

## Features

- **Multi-LLM Support**: OpenAI (GPT-4, GPT-3.5), Anthropic (Claude), Google (Gemini), and open-source models
- **User Authentication**: Email/password and OAuth providers
- **API Key Management**: Generate and manage API keys for programmatic access
- **Usage Tracking**: Monitor token usage and costs per user
- **Rate Limiting**: Prevent abuse with configurable limits
- **Cost Control**: Set monthly spending limits per user tier
- **Translation History**: Track all translations for analytics

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- API keys for at least one LLM provider

## Installation

1. **Install dependencies:**
```bash
npm install
```

2. **Set up environment variables:**

Copy `.env.local` to `.env` and fill in your API keys:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/translateai"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"

# LLM Provider API Keys (add at least one)
OPENAI_API_KEY="sk-..."
ANTHROPIC_API_KEY="sk-ant-..."
GOOGLE_API_KEY="..."

# Optional providers
AZURE_API_KEY="..."
COHERE_API_KEY="..."
REPLICATE_API_KEY="..."
HUGGINGFACE_API_KEY="..."
```

3. **Set up the database:**

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# (Optional) Seed the database
npx prisma db seed
```

4. **Start the development server:**

```bash
npm run dev
```

## Usage

### Web Interface

1. **Register an account** at http://localhost:3000/auth/register
2. **Navigate to the translator** at http://localhost:3000/translate
3. **Select your model and settings**
4. **Start translating!**

### API Access

1. **Generate an API key** from the Dashboard
2. **Make requests to the API:**

```bash
curl -X POST http://localhost:3000/api/v1/translate \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Your text to translate",
    "sourceLang": "en",
    "targetLang": "ru",
    "model": "gpt-4o",
    "style": "academic"
  }'
```

### Available Models

Based on your configured API keys:

- **OpenAI**: gpt-4o, gpt-4-turbo, gpt-3.5-turbo
- **Anthropic**: claude-3-opus, claude-3-sonnet, claude-3-haiku
- **Google**: gemini-pro, gemini-1.5-pro
- **Open Source**: llama-3, mistral-large (via Replicate)

### Translation Styles

- academic
- physics
- chemistry
- biology
- mathematics
- computer-science
- medicine
- engineering
- formal
- simplified

## User Tiers and Limits

| Tier | Monthly Cost Limit | Rate Limit |
|------|-------------------|------------|
| Free | $5 | 60 req/min |
| Pro | $100 | 120 req/min |
| Enterprise | $1000 | Unlimited |

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Sign in
- `GET /api/auth/session` - Get current session

### Translation
- `POST /api/v1/translate` - Translate text
- `GET /api/v1/translate` - Get available models and usage

### User Management
- `GET /api/keys` - List API keys
- `POST /api/keys` - Create new API key
- `DELETE /api/keys/:id` - Delete API key
- `GET /api/usage/stats` - Get usage statistics

## Production Deployment

### Vercel

1. **Push to GitHub**
2. **Import to Vercel**
3. **Set environment variables**
4. **Deploy!**

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npx prisma generate
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Environment Variables for Production

```env
# Use connection pooling for production
DATABASE_URL="postgresql://user:password@host:5432/db?pgbouncer=true"
DIRECT_URL="postgresql://user:password@host:5432/db"

# Secure session secret
NEXTAUTH_SECRET="[generated-secret]"
NEXTAUTH_URL="https://your-domain.com"

# Add all your API keys
```

## Cost Tracking

The service automatically tracks costs based on token usage:

| Model | Input (per 1K tokens) | Output (per 1K tokens) |
|-------|----------------------|------------------------|
| GPT-4o | $0.01 | $0.03 |
| GPT-3.5 Turbo | $0.0005 | $0.0015 |
| Claude 3 Opus | $0.015 | $0.075 |
| Claude 3 Sonnet | $0.003 | $0.015 |
| Gemini Pro | $0.0005 | $0.0015 |

## Security Considerations

1. **API Keys**: Store securely, never expose in client-side code
2. **Rate Limiting**: Implemented per user/IP
3. **Input Validation**: Max 10,000 characters per request
4. **CORS**: Configure for your domains
5. **Database**: Use connection pooling in production
6. **Secrets**: Rotate regularly

## Troubleshooting

### No models available
- Check that at least one API key is configured in `.env`
- Verify API keys are valid

### Database connection errors
- Ensure PostgreSQL is running
- Check DATABASE_URL format
- Run migrations: `npx prisma migrate dev`

### Authentication issues
- Verify NEXTAUTH_SECRET is set
- Check NEXTAUTH_URL matches your domain

## Support

For issues or questions, please open an issue on GitHub or contact support.

## License

MIT License - see LICENSE file for details