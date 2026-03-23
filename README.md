# Apex Pack Tracker

Трекер прогресса до Heirloom shards в Apex Legends с поддержкой Telegram WebApp и Firebase.

## Функции

- ✅ Отслеживание прогресса до 500 паков
- ✅ Авто-расчёт паков из уровней (1 пак за 2 уровня до 500, 1 пак за уровень престижа)
- ✅ История изменений с таймстампами
- ✅ Мультиаккаунты - переключение между несколькими аккаунтами
- ✅ Telegram WebApp интеграция (темизация, MainButton, BackButton)
- ✅ Firebase синхронизация (Auth через Telegram, Firestore)
- ✅ Адаптивный UI с анимациями и тост-уведомлениями

## Быстрый старт

### 1. Локальный запуск

Просто откройте `index.html` в браузере или используйте локальный сервер:

```bash
# Python
python -m http.server 8000

# Node.js (требуется npx)
npx serve .
```

### 2. Настройка Firebase

1. Создайте проект в [Firebase Console](https://console.firebase.google.com/)
2. Включите Authentication (анонимная или кастомные токены)
3. Включите Firestore Database
4. Скопируйте конфиг из Firebase Console

5. Отредактируйте `firebase.ts`, заменив значения:

```typescript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### 3. Деплой на GitHub Pages

```bash
# Инициализация git (если ещё не инициализирован)
git init
git add .
git commit -m "Initial commit"

# Создайте репозиторий на GitHub и запушьте
git remote add origin https://github.com/YOUR_USERNAME/apex-pack-tracker.git
git branch -M main
git push -u origin main

# Включите GitHub Pages:
# Settings -> Pages -> Source: Deploy from branch (main / root)
```

После деплоя приложение будет доступно по адресу:
`https://YOUR_USERNAME.github.io/apex-pack-tracker/`

### 4. Интеграция с Telegram Bot

1. Создайте бота через [@BotFather](https://t.me/botfather)
2. Создайте Web App:
   - `/newapp` → выберите бота
   - Отправьте URL вашего приложения (GitHub Pages)
   - Получите shortname

3. Или добавьте кнопку в бота:
   ```
   /setmenubutton → выберите бота → отправьте URL
   ```

## Структура проекта

```
├── index.html          # Основной HTML с UI
├── app.ts / app.js     # Логика приложения
├── firebase.ts / firebase.js  # Firebase интеграция
├── types.d.ts          # TypeScript типы
├── tsconfig.json       # TypeScript конфиг
└── stitch/             # Дизайн макеты
```

## Использование

1. **Welcome экран** - общий прогресс
2. **Tracker экран** - ввод данных:
   - Account Level (до 500)
   - Prestige Level (после 500)
   - Купленные/ивент/боевые/бонус паки
   - Авто-расчёт из уровней
3. **History экран** - история изменений
4. **Results экран** - детальный прогресс

## Мультиаккаунты

- Нажмите на иконку аккаунта вверху слева
- Добавьте новый аккаунт (название + создать)
- Переключайтесь между аккаунтами
- Каждый аккаунт хранится отдельно

## Telegram WebApp особенности

- Автоматическая темизация под тему Telegram
- MainButton для расчёта (на экране калькулятора)
- BackButton для навигации
- initData для авторизации через Firebase

## Лицензия

MIT
