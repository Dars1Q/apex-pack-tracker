# Настройка Firebase и Telegram Bot

## 1. Firebase Console Setup

### 1.1 Создай проект
1. Зайди на https://console.firebase.google.com/
2. Нажми **Add project**
3. Введи название (например: `apex-pack-tracker`)
4. Отключи Google Analytics (не нужно)
5. Нажми **Create project**

### 1.2 Создай Web App
1. В проекте нажми **</>** (Web app)
2. Введи название (например: `Apex Pack Tracker`)
3. Скопируй конфиг из **Firebase SDK snippet**
4. Вставь его в `firebase.ts` вместо `YOUR_API_KEY` и т.д.

### 1.3 Включи Authentication
1. В меню слева: **Build** → **Authentication**
2. Нажми **Get started**
3. Включи **Anonymous** (Sign-in method → Anonymous → Enable → Save)

### 1.4 Создай Firestore Database
1. В меню: **Build** → **Firestore Database**
2. Нажми **Create database**
3. Выбери **Start in test mode** (потом сменим правила)
4. Выбери локацию (например: `europe-west`)

### 1.5 Настрой Security Rules
1. В Firestore: вкладка **Rules**
2. Замени всё содержимое на код из `firestore.rules`
3. Нажми **Publish**

### 1.6 Deploy на Firebase Hosting (опционально)
```bash
# Установи Firebase CLI
npm install -g firebase-tools

# Логин
firebase login

# Инициализация
firebase init hosting

# Выбери:
# - Use existing project: apex-pack-tracker
# - Public directory: . (current directory)
# - Configure as single-page app: No
# - Set up automatic builds: No

# Деплой
firebase deploy
```

---

## 2. Telegram Bot Setup

### 2.1 Создай бота
1. В Telegram найди [@BotFather](https://t.me/botfather)
2. Отправь `/newbot`
3. Введи название (например: `Apex Pack Tracker`)
4. Введи username (должен заканчиваться на `bot`, например: `apex_pack_tracker_bot`)
5. Скопируй **API Token** (сохрани в секретном месте!)

### 2.2 Настрой Web App
1. Отправь BotFather: `/mybots`
2. Выбери своего бота
3. Нажми **Bot Settings** → **Menu Button** → **Configure Menu Button**
4. Отправь URL твоего приложения:
   - Для тестов: `https://YOUR_USERNAME.github.io/apex-pack-tracker/`
   - Для продакшена: `https://YOUR_PROJECT.web.app/`
5. Введи название кнопки (например: `Open Tracker`)

### 2.3 Альтернативно: создай Web App напрямую
1. Отправь BotFather: `/newapp`
2. Выбери бота
3. Отправь URL приложения
4. Введи название и shortname
5. Бот получит ссылку вида: `t.me/YOUR_BOT/YOUR_SHORTNAME`

---

## 3. Интеграция с приложением

### 3.1 Обновите firebase.ts
Вставь свой конфиг из Firebase Console:

```typescript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "apex-pack-tracker.firebaseapp.com",
  projectId: "apex-pack-tracker",
  storageBucket: "apex-pack-tracker.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890"
};
```

### 3.2 Пересобери проект
```bash
tsc && tsc firebase.ts --outFile firebase.js --target ES2017
```

### 3.3 Задеплой на GitHub Pages
```bash
git add .
git commit -m "Add Firebase integration"
git push
```

---

## 4. Проверка работы

### 4.1 Открой приложение
- GitHub Pages: `https://YOUR_USERNAME.github.io/apex-pack-tracker/`
- Firebase Hosting: `https://YOUR_PROJECT.web.app/`

### 4.2 Проверь консоль
Должно быть:
```
Firebase initialized: true
Signed in anonymously: XXXXXXXX
```

### 4.3 Проверь Firestore
1. Зайди в Firebase Console → Firestore Database
2. Должна появиться коллекция `users` с документами

---

## 5. Структура данных в Firestore

```
users/
  {userId}/
    // Основное состояние
    totalPacks: number
    heirloom: boolean
    completedHeirlooms: number[]
    updatedAt: timestamp
    
    // Аккаунты
    accounts/
      {accountId}/
        id: string
        name: string
        state: {
          totalPacks: number
          heirloom: boolean
          completedHeirlooms: number[]
        }
        createdAt: timestamp
        updatedAt: timestamp
```

---

## 6. Security Rules (firestore.rules)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Пользователи могут читать/писать только свои данные
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Публичный доступ на чтение (опционально)
    match /public/{document=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

---

## 7. Что дальше?

### Для продакшена:
1. **Включи Email/Password auth** в Firebase Authentication
2. **Настрой Cloud Functions** для валидации Telegram initData
3. **Добавь реальную авторизацию** через Telegram
4. **Настрой Firebase Hosting** с кастомным доменом

### Cloud Function для Telegram auth (пример):
```typescript
// functions/src/index.ts
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

export const telegramAuth = functions.https.onCall(async (data, context) => {
  // Валидация initData от Telegram
  // Выдача custom token
  
  const uid = `telegram:${telegramId}`;
  const token = await admin.auth().createCustomToken(uid);
  
  return { customToken: token };
});
```

---

## Вопросы?

Если что-то не работает:
1. Проверь консоль браузера (F12)
2. Проверь Firebase Console → Firestore → данные
3. Убедись что Security Rules опубликованы
