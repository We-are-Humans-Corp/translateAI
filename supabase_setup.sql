-- TranslateAI Database Schema for Supabase
-- Выполните этот скрипт в Supabase SQL Editor

-- Создание таблицы пользователей
CREATE TABLE IF NOT EXISTS "User" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    password TEXT NOT NULL,
    image TEXT,
    tier TEXT DEFAULT 'free',
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Создание таблицы аккаунтов (для OAuth)
CREATE TABLE IF NOT EXISTS "Account" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL,
    type TEXT NOT NULL,
    provider TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    refresh_token TEXT,
    access_token TEXT,
    expires_at INTEGER,
    token_type TEXT,
    scope TEXT,
    id_token TEXT,
    session_state TEXT,
    FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE,
    UNIQUE(provider, "providerAccountId")
);

-- Создание таблицы сессий
CREATE TABLE IF NOT EXISTS "Session" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "sessionToken" TEXT UNIQUE NOT NULL,
    "userId" TEXT NOT NULL,
    expires TIMESTAMP NOT NULL,
    FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE
);

-- Создание таблицы API ключей
CREATE TABLE IF NOT EXISTS "ApiKey" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    key TEXT UNIQUE DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    active BOOLEAN DEFAULT true,
    "lastUsed" TIMESTAMP,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "expiresAt" TIMESTAMP DEFAULT (NOW() + INTERVAL '1 year'),
    FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE
);

-- Создание таблицы переводов
CREATE TABLE IF NOT EXISTS "Translation" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL,
    "sourceText" TEXT NOT NULL,
    "targetText" TEXT NOT NULL,
    "sourceLang" TEXT NOT NULL,
    "targetLang" TEXT NOT NULL,
    model TEXT NOT NULL,
    provider TEXT NOT NULL,
    style TEXT NOT NULL,
    "tokensUsed" INTEGER NOT NULL,
    cost DOUBLE PRECISION NOT NULL,
    "responseTime" INTEGER NOT NULL,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE
);

-- Создание таблицы использования (для биллинга)
CREATE TABLE IF NOT EXISTS "Usage" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL,
    "apiKeyId" TEXT,
    model TEXT NOT NULL,
    provider TEXT NOT NULL,
    "tokensUsed" INTEGER NOT NULL,
    cost DOUBLE PRECISION NOT NULL,
    timestamp TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE,
    FOREIGN KEY ("apiKeyId") REFERENCES "ApiKey"(id) ON DELETE SET NULL
);

-- Создание таблицы для rate limiting
CREATE TABLE IF NOT EXISTS "RateLimit" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    identifier TEXT UNIQUE NOT NULL,
    requests INTEGER DEFAULT 0,
    "window" TIMESTAMP DEFAULT NOW()
);

-- Создание таблицы системных настроек
CREATE TABLE IF NOT EXISTS "SystemConfig" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    key TEXT UNIQUE NOT NULL,
    value TEXT NOT NULL,
    description TEXT,
    "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Создание индексов для оптимизации
CREATE INDEX IF NOT EXISTS idx_usage_user_timestamp ON "Usage"("userId", timestamp);
CREATE INDEX IF NOT EXISTS idx_ratelimit_identifier_window ON "RateLimit"(identifier, "window");

-- Создание функции для автоматического обновления updatedAt
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Создание триггеров для автоматического обновления updatedAt
CREATE TRIGGER update_user_updated_at BEFORE UPDATE ON "User"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_systemconfig_updated_at BEFORE UPDATE ON "SystemConfig"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Вставка начальных настроек
INSERT INTO "SystemConfig" (key, value, description) VALUES
    ('MAX_TOKENS_FREE', '1000', 'Maximum tokens per request for free tier'),
    ('MAX_TOKENS_PRO', '4000', 'Maximum tokens per request for pro tier'),
    ('MAX_TOKENS_ENTERPRISE', '8000', 'Maximum tokens per request for enterprise tier'),
    ('RATE_LIMIT_FREE', '60', 'Requests per hour for free tier'),
    ('RATE_LIMIT_PRO', '600', 'Requests per hour for pro tier'),
    ('RATE_LIMIT_ENTERPRISE', '6000', 'Requests per hour for enterprise tier')
ON CONFLICT (key) DO NOTHING;

-- Включение Row Level Security (RLS) для безопасности
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ApiKey" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Translation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Usage" ENABLE ROW LEVEL SECURITY;

-- Создание политик RLS
CREATE POLICY "Users can view own profile" ON "User"
    FOR SELECT USING (auth.uid()::text = id);

CREATE POLICY "Users can update own profile" ON "User"
    FOR UPDATE USING (auth.uid()::text = id);

CREATE POLICY "Users can view own API keys" ON "ApiKey"
    FOR ALL USING (auth.uid()::text = "userId");

CREATE POLICY "Users can view own translations" ON "Translation"
    FOR ALL USING (auth.uid()::text = "userId");

CREATE POLICY "Users can view own usage" ON "Usage"
    FOR SELECT USING (auth.uid()::text = "userId");

-- Успешно! Все таблицы созданы
-- Теперь ваш сервис TranslateAI готов к работе!