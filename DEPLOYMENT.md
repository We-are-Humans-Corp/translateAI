# B2B Scientific Translation Service - Deployment Guide

## 🚀 Быстрый старт с Vercel

### Преимущества Vercel для B2B SaaS:
- **Edge Functions** - минимальная задержка для API
- **Automatic Scaling** - масштабирование под нагрузку
- **Global CDN** - быстрый доступ из любой точки мира
- **Built-in Analytics** - мониторинг производительности
- **Environment Variables** - безопасное хранение ключей
- **Preview Deployments** - тестирование перед продакшном

## 📋 Шаги развертывания

### 1. Подготовка проекта

```bash
# Клонируйте репозиторий
git clone your-repo-url
cd translation-service-b2b

# Установите зависимости
npm install

# Настройте базу данных Prisma
npx prisma generate
npx prisma db push
```

### 2. Настройка баз данных

#### PostgreSQL (рекомендуется Supabase или Neon):
```bash
# Supabase
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT].supabase.co:5432/postgres"

# Neon
DATABASE_URL="postgresql://[USER]:[PASSWORD]@[HOST]/[DATABASE]?sslmode=require"

# Vercel Postgres
DATABASE_URL="postgres://default:[PASSWORD]@[HOST]:5432/vercel"
```

#### Redis для кэширования (Vercel KV):
```bash
# В Vercel Dashboard:
# 1. Storage -> Create Database -> KV
# 2. Автоматически добавятся переменные окружения
```

### 3. Получение API ключей

#### OpenAI:
1. Перейдите на https://platform.openai.com/api-keys
2. Create new secret key
3. Скопируйте в `OPENAI_API_KEY`

#### Anthropic:
1. Перейдите на https://console.anthropic.com/
2. API Keys -> Create Key
3. Скопируйте в `ANTHROPIC_API_KEY`

#### Google AI:
1. https://makersuite.google.com/app/apikey
2. Create API Key
3. Скопируйте в `GOOGLE_AI_API_KEY`

### 4. Развертывание на Vercel

#### Через CLI:
```bash
# Установите Vercel CLI
npm i -g vercel

# Войдите в аккаунт
vercel login

# Разверните проект
vercel

# Для production
vercel --prod
```

#### Через GitHub:
1. Push код в GitHub
2. Импортируйте проект в Vercel
3. Настройте переменные окружения
4. Deploy

### 5. Настройка переменных окружения в Vercel

```bash
# В Vercel Dashboard -> Settings -> Environment Variables

# Обязательные переменные:
DATABASE_URL=
NEXTAUTH_URL=https://your-domain.vercel.app
NEXTAUTH_SECRET=

# LLM API Keys (минимум один):
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_AI_API_KEY=

# Stripe для биллинга:
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

## 🎯 Настройка стилей и промптов

### Добавление нового стиля перевода:

1. Создайте запись в базе данных:
```sql
INSERT INTO PromptTemplate (
  style, 
  name, 
  systemPrompt, 
  instructions, 
  temperature
) VALUES (
  'legal',
  'Legal Documents',
  'You are a legal translator specializing in contracts and legal texts...',
  'Translate this legal document while preserving all legal terminology...',
  0.2
);
```

2. Или через API:
```typescript
// app/api/admin/prompts/route.ts
export async function POST(request: Request) {
  const { style, name, systemPrompt, instructions } = await request.json();
  
  const template = await prisma.promptTemplate.create({
    data: {
      style,
      name,
      systemPrompt,
      instructions,
      temperature: 0.3,
      maxTokens: 2000,
    }
  });
  
  return NextResponse.json(template);
}
```

## 🔒 Безопасность

### 1. Rate Limiting
```typescript
// Настройка в vercel.json
{
  "functions": {
    "app/api/translate/route.ts": {
      "maxDuration": 30
    }
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "X-RateLimit-Limit",
          "value": "100"
        },
        {
          "key": "X-RateLimit-Window",
          "value": "3600"
        }
      ]
    }
  ]
}
```

### 2. CORS настройка
```typescript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: process.env.ALLOWED_ORIGIN || '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, x-api-key' },
        ],
      },
    ]
  },
}
```

## 💰 Настройка биллинга (Stripe)

### 1. Создание продуктов в Stripe:
```javascript
// scripts/setup-stripe.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function createProducts() {
  // Basic Plan
  const basicProduct = await stripe.products.create({
    name: 'Basic Plan',
    description: '100 translations/month, GPT-3.5',
  });

  const basicPrice = await stripe.prices.create({
    product: basicProduct.id,
    unit_amount: 1900, // $19.00
    currency: 'usd',
    recurring: { interval: 'month' },
  });

  // Pro Plan
  const proProduct = await stripe.products.create({
    name: 'Pro Plan',
    description: '1000 translations/month, All models',
  });

  const proPrice = await stripe.prices.create({
    product: proProduct.id,
    unit_amount: 9900, // $99.00
    currency: 'usd',
    recurring: { interval: 'month' },
  });

  console.log('Basic Price ID:', basicPrice.id);
  console.log('Pro Price ID:', proPrice.id);
}

createProducts();
```

### 2. Webhook для обработки платежей:
```typescript
// app/api/webhooks/stripe/route.ts
export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature')!;

  const event = stripe.webhooks.constructEvent(
    body,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!
  );

  switch (event.type) {
    case 'checkout.session.completed':
      // Активировать подписку
      break;
    case 'invoice.payment_succeeded':
      // Обновить лимиты
      break;
    case 'customer.subscription.deleted':
      // Отменить подписку
      break;
  }

  return NextResponse.json({ received: true });
}
```

## 📊 Мониторинг и аналитика

### Vercel Analytics:
```typescript
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

### Custom метрики:
```typescript
// lib/metrics.ts
export async function trackTranslation(data: {
  model: string;
  sourceLang: string;
  targetLang: string;
  tokens: number;
  responseTime: number;
}) {
  await fetch('/api/analytics', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
```

## 🔧 Оптимизация производительности

### 1. Edge Config для быстрых настроек:
```typescript
import { get } from '@vercel/edge-config';

export async function getModelConfig(model: string) {
  return await get(`models.${model}`);
}
```

### 2. Кэширование с ISR:
```typescript
export const revalidate = 3600; // Обновлять каждый час

export async function generateStaticParams() {
  return [
    { style: 'academic' },
    { style: 'physics' },
    { style: 'chemistry' },
  ];
}
```

### 3. Streaming ответов:
```typescript
// app/api/translate/stream/route.ts
export async function POST(request: Request) {
  const stream = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [...],
    stream: true,
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

## 📝 Пример использования API

### JavaScript/TypeScript:
```typescript
const response = await fetch('https://your-app.vercel.app/api/translate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'sk-your-api-key',
  },
  body: JSON.stringify({
    text: 'Your scientific text here',
    sourceLang: 'en',
    targetLang: 'ru',
    model: 'gpt-4o',
    style: 'physics',
    temperature: 0.3,
    showChanges: true,
  }),
});

const data = await response.json();
console.log(data.translation);
```

### Python:
```python
import requests

response = requests.post(
    'https://your-app.vercel.app/api/translate',
    headers={
        'Content-Type': 'application/json',
        'x-api-key': 'sk-your-api-key',
    },
    json={
        'text': 'Your scientific text here',
        'sourceLang': 'en',
        'targetLang': 'ru',
        'model': 'gpt-4o',
        'style': 'physics',
    }
)

print(response.json()['translation'])
```

## 🚨 Troubleshooting

### Частые проблемы:

1. **504 Gateway Timeout**
   - Увеличьте `maxDuration` в vercel.json
   - Используйте streaming для длинных текстов

2. **Database connection issues**
   - Проверьте SSL настройки: `?sslmode=require`
   - Используйте connection pooling

3. **Rate limiting**
   - Настройте Vercel KV для распределенного счетчика
   - Используйте Edge Config для лимитов

## 📞 Поддержка

- Documentation: https://your-docs.vercel.app
- API Status: https://status.your-app.com
- Support: support@your-app.com

## 🎯 Roadmap

- [ ] Batch processing API
- [ ] Webhook notifications
- [ ] Custom model fine-tuning
- [ ] Document upload (PDF, DOCX)
- [ ] Translation memory
- [ ] Glossary management
- [ ] Team collaboration
- [ ] White-label solution
