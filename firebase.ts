// Firebase конфигурация
const firebaseConfig = {
  apiKey: "AIzaSyBBS1j2VNH5pnj8Pk2ifybGtzu0YNYGWYs",
  authDomain: "apexcasecounter.firebaseapp.com",
  projectId: "apexcasecounter",
  storageBucket: "apexcasecounter.firebasestorage.app",
  messagingSenderId: "635418666813",
  appId: "1:635418666813:web:b63a52bf2b92aa7bd00754"
};

// Declare Firebase global
declare const firebase: any;

// Инициализация Firebase
let app: any = null;
let db: any = null;

// Telegram user ID для идентификации
let telegramUserId: string | null = null;

// Типы данных
type FirebaseState = {
  totalPacks: number;
  heirloom: boolean;
  completedHeirlooms: number[];
  updatedAt: number;
};

type FirebaseAccount = {
  id: string;
  name: string;
  state: FirebaseState;
  createdAt: number;
  updatedAt: number;
};

// Firebase API
interface FirebaseAuthAPI {
  initFirebase: () => Promise<boolean>;
  setTelegramUser: (id: string) => void;
  saveToFirestore: (data: FirebaseState) => Promise<void>;
  loadFromFirestore: () => Promise<FirebaseState | null>;
  saveAccountToFirestore: (accountId: string, name: string, state: FirebaseState) => Promise<void>;
  loadAccountsFromFirestore: () => Promise<any[]>;
  deleteAccountFromFirestore: (accountId: string) => Promise<void>;
  isSignedIn: () => boolean;
}

/**
 * Инициализация Firebase
 */
async function initFirebase(): Promise<boolean> {
  if (typeof firebase === 'undefined') {
    console.warn('Firebase SDK not loaded. Using local storage only.');
    return false;
  }

  try {
    app = firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    
    // Получаем Telegram user данные
    const tg = (window as any).Telegram?.WebApp;
    console.log('Telegram WebApp:', !!tg);
    console.log('Telegram initData:', tg?.initData ? 'present' : 'missing');
    
    // Сначала пробуем получить ID из localStorage (если уже сохраняли)
    const storedUserId = localStorage.getItem('telegram_user_id');
    if (storedUserId) {
      telegramUserId = storedUserId;
      console.log('✓ Using stored Telegram ID:', telegramUserId);
    }
    
    if (tg?.initData) {
      console.log('InitData length:', tg.initData.length);
      
      // Парсим initData для получения user данных
      const urlParams = new URLSearchParams(tg.initData);
      const userStr = urlParams.get('user');
      console.log('User string:', userStr ? 'found' : 'missing');
      
      if (userStr) {
        try {
          const user = JSON.parse(decodeURIComponent(userStr));
          
          // Используем user.id - он одинаковый на всех устройствах!
          if (user.id) {
            telegramUserId = 'tg_' + user.id;
            localStorage.setItem('telegram_user_id', telegramUserId);
            console.log('✓ Using user ID:', telegramUserId);
          }
          // Fallback на username если нет id
          else if (user.username) {
            telegramUserId = 'tg_' + user.username.toLowerCase();
            localStorage.setItem('telegram_user_id', telegramUserId);
            console.log('✓ Using username:', telegramUserId);
          }
        } catch (e) {
          console.error('Failed to parse Telegram user:', e);
        }
      }
    } else if (tg) {
      console.warn('Telegram WebApp available but no initData');
      console.log('WebApp version:', tg.version);
      console.log('WebApp platform:', tg.platform);
    }
    
    // Fallback: если нет Telegram данных, используем stored или random ID
    if (!telegramUserId) {
      const storedAnon = localStorage.getItem('anon_user_id');
      if (storedAnon) {
        telegramUserId = storedAnon;
        console.log('✓ Using stored anon ID:', telegramUserId);
      } else {
        telegramUserId = 'anon_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('anon_user_id', telegramUserId);
        console.log('⚠ Using new anon ID:', telegramUserId);
      }
    }
    
    console.log('✓ Firebase initialized');
    console.log('✓ User ID:', telegramUserId);
    return true;
  } catch (error) {
    console.error('Firebase init error:', error);
    return false;
  }
}

/**
 * Установить Telegram user ID
 */
function setTelegramUser(id: string): void {
  telegramUserId = id;
}

/**
 * Получить ID пользователя (Telegram ID или random)
 */
function getUserId(): string {
  console.log('getUserId called. telegramUserId:', telegramUserId);
  if (telegramUserId) return telegramUserId;
  // Если нет Telegram ID, генерируем случайный
  const anonId = `anon_${Math.random().toString(36).substr(2, 9)}`;
  console.log('Using anon ID:', anonId);
  return anonId;
}

/**
 * Сохранение состояния в Firestore
 */
async function saveToFirestore(data: FirebaseState): Promise<void> {
  if (!db) {
    console.warn('Firestore not available');
    return;
  }

  try {
    const userId = getUserId();
    console.log('>>> Saving to Firestore with userId:', userId);
    const userRef = db.collection('users').doc(userId);
    await userRef.set({
      ...data,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    console.log('✓ Saved to Firestore:', userId);
  } catch (error) {
    console.error('Save error:', error);
  }
}

/**
 * Загрузка состояния из Firestore
 */
async function loadFromFirestore(): Promise<FirebaseState | null> {
  if (!db) return null;

  try {
    const userId = getUserId();
    const userRef = db.collection('users').doc(userId);
    const doc = await userRef.get();
    
    if (doc.exists) {
      const data = doc.data() as FirebaseState;
      console.log('Loaded from Firestore:', userId);
      return {
        totalPacks: data.totalPacks || 0,
        heirloom: data.heirloom || false,
        completedHeirlooms: data.completedHeirlooms || [],
        updatedAt: data.updatedAt || Date.now()
      };
    }
    return null;
  } catch (error) {
    console.error('Load error:', error);
    return null;
  }
}

/**
 * Сохранение аккаунта в Firestore
 */
async function saveAccountToFirestore(accountId: string, name: string, state: FirebaseState): Promise<void> {
  if (!db) return;

  try {
    const userId = getUserId();
    const accountRef = db.collection('users').doc(userId).collection('accounts').doc(accountId);
    await accountRef.set({
      id: accountId,
      name,
      state,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  } catch (error) {
    console.error('Save account error:', error);
  }
}

/**
 * Загрузка всех аккаунтов из Firestore
 */
async function loadAccountsFromFirestore(): Promise<any[]> {
  if (!db) return [];

  try {
    const userId = getUserId();
    const snapshot = await db.collection('users').doc(userId).collection('accounts').get();
    const accounts: any[] = [];
    
    snapshot.forEach((doc: any) => {
      accounts.push(doc.data());
    });

    return accounts;
  } catch (error) {
    console.error('Load accounts error:', error);
    return [];
  }
}

/**
 * Удаление аккаунта из Firestore
 */
async function deleteAccountFromFirestore(accountId: string): Promise<void> {
  if (!db) return;

  try {
    const userId = getUserId();
    await db.collection('users').doc(userId).collection('accounts').doc(accountId).delete();
  } catch (error) {
    console.error('Delete account error:', error);
  }
}

// Экспорт для использования в app.ts
(window as any).firebaseAuth = {
  initFirebase,
  setTelegramUser,
  saveToFirestore,
  loadFromFirestore,
  saveAccountToFirestore,
  loadAccountsFromFirestore,
  deleteAccountFromFirestore,
  isSignedIn: () => !!db,
  getCurrentUser: () => ({ uid: getUserId() })
} as FirebaseAuthAPI;
