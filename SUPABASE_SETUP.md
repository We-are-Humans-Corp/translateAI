# 🚀 Настройка Supabase для TranslateAI

## ✅ Что вам нужно сделать:

### 1. Создайте проект в Supabase

1. Перейдите на **[app.supabase.com](https://app.supabase.com)**
2. Войдите через GitHub/Google
3. Нажмите **"New project"**
4. Заполните:
   - **Organization**: выберите или создайте
   - **Project name**: `translateai`
   - **Database Password**: [СГЕНЕРИРУЙТЕ И СОХРАНИТЕ!]
   - **Region**: Frankfurt (eu-central-1) или ближайший
   - **Pricing Plan**: Free

### 2. Получите Connection String

После создания проекта (1-2 минуты):

1. Перейдите в **Settings** (иконка шестеренки)
2. Выберите **Database** в боковом меню
3. Найдите секцию **Connection string**
4. Выберите **URI**
5. Скопируйте строку подключения

Она выглядит так:
```
postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxx.supabase.co:5432/postgres
```

### 3. Обновите .env.local

Замените в файле `.env.local`:

```env
# Вместо [YOUR-PASSWORD] - пароль от БД
# Вместо [YOUR-PROJECT-REF] - ваш ID проекта (xxxxxxxxxxxxx)

DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"
```

Пример:
```env
DATABASE_URL="postgresql://postgres:MyStr0ngP@ssw0rd@db.abcdefghijklmnop.supabase.co:5432/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:MyStr0ngP@ssw0rd@db.abcdefghijklmnop.supabase.co:5432/postgres"
```

### 4. После обновления .env.local запустите:

```bash
# Остановите сервер (Ctrl+C)
# Затем выполните:

# 1. Генерируем Prisma Client
npx prisma generate

# 2. Создаем таблицы в Supabase
npx prisma db push

# 3. Перезапускаем сервер
npm run dev
```

## 📝 Где найти нужные данные в Supabase:

### Project Reference (ID проекта):
- **Settings → General → Reference ID**
- Или в URL: `app.supabase.com/project/[ВОТ_ЭТО_ID]/`

### Database Password:
- Тот, который вы задали при создании проекта
- Если забыли: **Settings → Database → Reset database password**

## 🔍 Проверка подключения:

После настройки выполните:
```bash
npx prisma db push
```

Если все настроено правильно, вы увидите:
```
🚀 Your database is now in sync with your Prisma schema
```

## 💡 Дополнительно в Supabase:

После подключения вы можете:
1. **Table Editor** - визуально просматривать данные
2. **SQL Editor** - выполнять SQL запросы
3. **Database → Backups** - автоматические бэкапы (7 дней на Free)

## ❓ Если возникли проблемы:

1. **Connection refused** - проверьте пароль и project reference
2. **SSL required** - убедитесь что в URL есть `?pgbouncer=true`
3. **Permission denied** - проверьте что используете пользователя `postgres`

## 🎉 После успешной настройки:

1. Откройте http://localhost:3000/auth/register
2. Зарегистрируйте аккаунт
3. Перейдите на http://localhost:3000/translate
4. Начинайте переводить!

---

**Нужна помощь?** Покажите мне ваш Project Reference из Supabase, и я помогу составить правильную строку подключения!