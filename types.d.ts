// Глобальные типы для приложения
export {};

interface TelegramWebApp {
  initData: string;
  initDataUnsafe?: any;
  version: string;
  platform: string;
  colorScheme: string;
  themeParams: any;
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  headerColor: string;
  backgroundColor: string;
  isClosingConfirmationEnabled: boolean;
  isVerticalSwipesEnabled: boolean;
  BackButton: any;
  MainButton: any;
  ready: () => void;
  expand: () => void;
  close: () => void;
  showPopup: (params: any) => void;
  showAlert: (message: string) => void;
  showConfirm: (message: string, callback: (confirmed: boolean) => void) => void;
  onEvent: (eventType: string, eventHandler: () => void) => void;
  offEvent: (eventType: string, eventHandler: () => void) => void;
  sendData: (data: string) => void;
  switchInlineQuery: (query: string, chatTypes?: string[]) => void;
  openLink: (url: string) => void;
  openTelegramLink: (url: string) => void;
  openInvoice: (url: string, callback?: (status: string) => void) => void;
  HapticFeedback: any;
  CloudStorage: any;
  BiometricManager: any;
  webAppVersion: string;
  platformVersion: string;
  botInline: boolean;
  isVersionAtLeast: (version: string) => boolean;
  setHeaderColor: (color: string) => void;
  setBackgroundColor: (color: string) => void;
  enableClosingConfirmation: () => void;
  disableVerticalSwipes: () => void;
}

interface FirebaseState {
  totalPacks: number;
  heirloom: boolean;
  completedHeirlooms: number[];
  updatedAt: number;
}

declare global {
  interface Window {
    firebase: any;
    firebaseAuth: {
      initFirebase: () => Promise<boolean>;
      setTelegramUser: (id: string) => void;
      saveToFirestore: (data: FirebaseState) => Promise<void>;
      loadFromFirestore: () => Promise<FirebaseState | null>;
      saveAccountToFirestore: (accountId: string, name: string, state: FirebaseState) => Promise<void>;
      loadAccountsFromFirestore: () => Promise<any[]>;
      deleteAccountFromFirestore: (accountId: string) => Promise<void>;
      isSignedIn: () => boolean;
      getCurrentUser: () => { uid: string };
      subscribeToChanges: (callback: (data: FirebaseState) => void) => () => void;
    };
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}
