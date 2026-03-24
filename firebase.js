// Firebase конфигурация
const firebaseConfig = {
    apiKey: "AIzaSyBBS1j2VNH5pnj8Pk2ifybGtzu0YNYGWYs",
    authDomain: "apexcasecounter.firebaseapp.com",
    projectId: "apexcasecounter",
    storageBucket: "apexcasecounter.firebasestorage.app",
    messagingSenderId: "635418666813",
    appId: "1:635418666813:web:b63a52bf2b92aa7bd00754"
};
// Инициализация Firebase
let app = null;
let db = null;
let unsubscribeListener = () => { };
let onStateChangeCallback = null;
// Telegram user ID для идентификации
let telegramUserId = null;
/**
 * Инициализация Firebase
 */
async function initFirebase() {
    var _a, _b;
    if (typeof firebase === 'undefined') {
        console.warn('Firebase SDK not loaded. Using local storage only.');
        return false;
    }
    try {
        app = firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
        // Получаем Telegram user данные из initDataUnsafe (готовый объект)
        const tg = (_a = window.Telegram) === null || _a === void 0 ? void 0 : _a.WebApp;
        // Сначала пробуем получить из initDataUnsafe
        if ((_b = tg === null || tg === void 0 ? void 0 : tg.initDataUnsafe) === null || _b === void 0 ? void 0 : _b.user) {
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
            }
            else {
                telegramUserId = 'anon_' + Math.random().toString(36).substr(2, 9);
                localStorage.setItem('apex_anon_id', telegramUserId);
            }
        }
        console.log('✓ Firebase initialized');
        return true;
    }
    catch (error) {
        console.error('Firebase init error:', error);
        return false;
    }
}
/**
 * Установить Telegram user ID
 */
function setTelegramUser(id) {
    telegramUserId = id;
}
function getUserId() {
    if (telegramUserId)
        return telegramUserId;
    // Если нет Telegram ID, генерируем случайный
    return `anon_${Math.random().toString(36).substr(2, 9)}`;
}
/**
 * Сохранение состояния в Firestore
 */
async function saveToFirestore(data) {
    if (!db) {
        console.warn('Firestore not available');
        return;
    }
    try {
        const userId = getUserId();
        const userRef = db.collection('users').doc(userId);
        await userRef.set(Object.assign(Object.assign({}, data), { updatedAt: firebase.firestore.FieldValue.serverTimestamp() }), { merge: true });
    }
    catch (error) {
        console.error('Save error:', error);
    }
}
/**
 * Загрузка состояния из Firestore
 */
async function loadFromFirestore() {
    if (!db)
        return null;
    try {
        const userId = getUserId();
        const userRef = db.collection('users').doc(userId);
        const doc = await userRef.get();
        if (doc.exists) {
            const data = doc.data();
            return {
                totalPacks: data.totalPacks || 0,
                heirloom: data.heirloom || false,
                completedHeirlooms: data.completedHeirlooms || [],
                updatedAt: data.updatedAt || Date.now()
            };
        }
        return null;
    }
    catch (error) {
        console.error('Load error:', error);
        return null;
    }
}
/**
 * Сохранение аккаунта в Firestore
 */
async function saveAccountToFirestore(accountId, name, state) {
    if (!db)
        return;
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
    }
    catch (error) {
        console.error('Save account error:', error);
    }
}
/**
 * Загрузка всех аккаунтов из Firestore
 */
async function loadAccountsFromFirestore() {
    if (!db)
        return [];
    try {
        const userId = getUserId();
        const snapshot = await db.collection('users').doc(userId).collection('accounts').get();
        const accounts = [];
        snapshot.forEach((doc) => {
            accounts.push(doc.data());
        });
        return accounts;
    }
    catch (error) {
        console.error('Load accounts error:', error);
        return [];
    }
}
/**
 * Удаление аккаунта из Firestore
 */
async function deleteAccountFromFirestore(accountId) {
    if (!db)
        return;
    try {
        const userId = getUserId();
        await db.collection('users').doc(userId).collection('accounts').doc(accountId).delete();
    }
    catch (error) {
        console.error('Delete account error:', error);
    }
}
/**
 * Подписка на изменения в Firestore (real-time синхронизация)
 */
function subscribeToChanges(callback) {
    if (!db) {
        console.warn('Firestore not available for real-time sync');
        return () => { };
    }
    try {
        const userId = getUserId();
        const userRef = db.collection('users').doc(userId);
        // Отписываемся от предыдущего слушателя
        unsubscribeListener();
        // Подписываемся на изменения
        unsubscribeListener = userRef.onSnapshot((doc) => {
            if (doc.exists) {
                const data = doc.data();
                const state = {
                    totalPacks: data.totalPacks || 0,
                    heirloom: data.heirloom || false,
                    completedHeirlooms: data.completedHeirlooms || [],
                    updatedAt: data.updatedAt || Date.now()
                };
                console.log('🔄 Real-time sync: received update from Firestore', state);
                callback(state);
            }
        }, (error) => {
            console.error('Real-time sync error:', error);
        });
        console.log('✓ Real-time sync enabled for user:', userId);
        return unsubscribeListener;
    }
    catch (error) {
        console.error('Subscribe to changes error:', error);
        return () => { };
    }
}
// Экспорт для использования в app.ts
window.firebaseAuth = {
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
};
