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
    
    if (tg?.initData) {
      console.log('InitData length:', tg.initData.length);
      console.log('InitData preview:', tg.initData.substr(0, 50) + '...');
      
      // Парсим initData для получения user данных
      const urlParams = new URLSearchParams(tg.initData);
      const userStr = urlParams.get('user');
      console.log('User string:', userStr ? 'found' : 'missing');
      
      if (userStr) {
        try {
          const user = JSON.parse(decodeURIComponent(userStr));
          console.log('Parsed Telegram user:', user);
          console.log('Username:', user.username);
          console.log('User ID:', user.id);
          
          // Используем username если есть - он одинаковый на всех устройствах!
          if (user.username) {
            telegramUserId = 'tg_' + user.username.toLowerCase();
            console.log('✓ Using username:', telegramUserId);
          } 
          // Если нет username - используем user.id (тоже одинаковый!)
          else if (user.id) {
            telegramUserId = 'tg_' + user.id;
            console.log('✓ Using user ID:', telegramUserId);
          }
          else {
            console.error('No username or user.id in Telegram data!');
          }
        } catch (e) {
          console.error('Failed to parse Telegram user:', e);
          console.error('Raw user string:', userStr);
        }
      } else {
        console.error('No user data in Telegram initData!');
      }
    } else if (tg) {
      console.warn('Telegram WebApp available but no initData');
      console.log('WebApp version:', tg.version);
      console.log('WebApp platform:', tg.platform);
    }
    
    // Fallback: если нет Telegram данных, используем случайный ID
    if (!telegramUserId) {
      telegramUserId = 'anon_' + Math.random().toString(36).substr(2, 9);
      console.log('⚠ Using anonymous ID:', telegramUserId);
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
  if (telegramUserId) return `tg_${telegramUserId}`;
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
    console.log('Saved to Firestore:', userId);
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
