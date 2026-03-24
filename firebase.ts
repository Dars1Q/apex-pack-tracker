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
let unsubscribeListener: (() => void) | null = null;
let onStateChangeCallback: ((data: FirebaseState) => void) | null = null;

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
  subscribeToChanges: (callback: (data: FirebaseState) => void) => () => void;
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
    
    // Получаем Telegram user данные из initDataUnsafe (готовый объект)
    const tg = (window as any).Telegram?.WebApp;
    
    // Сначала пробуем получить из initDataUnsafe
    if (tg?.initDataUnsafe?.user) {
      const user = tg.initDataUnsafe.user;
      
      // Используем user.id - он одинаковый на всех устройствах!
      if (user.id) {
        telegramUserId = 'tg_' + user.id;
        // Сохраняем в localStorage для будущих сессий
        localStorage.setItem('apex_user_id', telegramUserId);
      }
      // Fallback на username если нет id
      else if (user.username) {
        telegramUserId = 'tg_' + user.username.toLowerCase();
        localStorage.setItem('apex_user_id', telegramUserId);
      }
    }
    
    // Если нет initDataUnsafe, пробуем получить из localStorage
    if (!telegramUserId) {
      const stored = localStorage.getItem('apex_user_id');
      if (stored) {
        telegramUserId = stored;
      }
    }
    
    // Fallback: если нет Telegram данных, используем stored anon или random ID
    if (!telegramUserId) {
      const storedAnon = localStorage.getItem('apex_anon_id');
      if (storedAnon) {
        telegramUserId = storedAnon;
      } else {
        telegramUserId = 'anon_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('apex_anon_id', telegramUserId);
      }
    }
    
    console.log('✓ Firebase initialized');
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

function getUserId(): string {
  if (telegramUserId) return telegramUserId;
  // Если нет Telegram ID, генерируем случайный
  return `anon_${Math.random().toString(36).substr(2, 9)}`;
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
    const userRef = db.collection('users').doc(userId);
    await userRef.set({
      ...data,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
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

/**
 * Подписка на изменения в Firestore (real-time синхронизация)
 */
function subscribeToChanges(callback: (data: FirebaseState) => void): () => void {
  if (!db) {
    console.warn('Firestore not available for real-time sync');
    return () => {};
  }

  try {
    const userId = getUserId();
    const userRef = db.collection('users').doc(userId);

    // Отписываемся от предыдущего слушателя если есть
    if (unsubscribeListener) {
      unsubscribeListener();
    }

    // Подписываемся на изменения
    unsubscribeListener = userRef.onSnapshot(
      (doc: any) => {
        if (doc.exists) {
          const data = doc.data() as FirebaseState;
          const state: FirebaseState = {
            totalPacks: data.totalPacks || 0,
            heirloom: data.heirloom || false,
            completedHeirlooms: data.completedHeirlooms || [],
            updatedAt: data.updatedAt || Date.now()
          };
          console.log('🔄 Real-time sync: received update from Firestore', state);
          callback(state);
        }
      },
      (error: any) => {
        console.error('Real-time sync error:', error);
      }
    );

    console.log('✓ Real-time sync enabled for user:', userId);
    return unsubscribeListener;
  } catch (error) {
    console.error('Subscribe to changes error:', error);
    return () => {};
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
  getCurrentUser: () => ({ uid: getUserId() }),
  subscribeToChanges
} as FirebaseAuthAPI;
