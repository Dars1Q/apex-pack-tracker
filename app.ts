const STORAGE_KEY = "apex-pack-tracker";
const HISTORY_KEY = "apex-pack-history";
const ACCOUNTS_KEY = "apex-accounts";
const CURRENT_ACCOUNT_KEY = "apex-current-account";

type StoredState = {
  totalPacks: number;
  heirloom: boolean;
  completedHeirlooms: number[];
};

type Account = {
  id: string;
  name: string;
  state: StoredState;
  createdAt: number;
};

type HistoryEntry = {
  timestamp: number;
  action: string;
  totalPacks: number;
};

const totalPacksInput = document.getElementById("quick-add-packs") as HTMLInputElement | null;
const toggleHeirloom = document.getElementById("toggle-heirloom") as HTMLButtonElement | null;
const activeProgressSection = document.getElementById("active-progress-section") as HTMLDivElement | null;
const completedSection = document.getElementById("completed-section") as HTMLDivElement | null;
const heirloomListEl = document.getElementById("heirloom-list") as HTMLDivElement | null;

const ui = {
  welcomeTotal: document.getElementById("welcome-total") as HTMLSpanElement | null,
  welcomeProgress: document.getElementById("welcome-progress") as HTMLDivElement | null,
  welcomePercent: document.getElementById("welcome-percent") as HTMLSpanElement | null,
  welcomeRemaining: document.getElementById("welcome-remaining") as HTMLSpanElement | null
};

const screens = Array.from(document.querySelectorAll("[data-screen]"));
const navItems = Array.from(document.querySelectorAll(".nav-item"));

function toNumber(value: string | null | undefined): number {
  const n = Number.parseInt(value ?? "", 10);
  return Number.isFinite(n) ? n : 0;
}

function readState(): StoredState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const completedRaw = localStorage.getItem(STORAGE_KEY + "_completed");
    if (!raw) return { totalPacks: 0, heirloom: false, completedHeirlooms: [] };
    const parsed = JSON.parse(raw) as StoredState;
    return {
      totalPacks: parsed.totalPacks || 0,
      heirloom: parsed.heirloom || false,
      completedHeirlooms: completedRaw ? JSON.parse(completedRaw) : (parsed.completedHeirlooms || [])
    };
  } catch {
    return { totalPacks: 0, heirloom: false, completedHeirlooms: [] };
  }
}

let lastState: StoredState | null = null;

function writeState(state: StoredState): void {
  // Проверяем изменилось ли что-то
  if (lastState && 
      lastState.totalPacks === state.totalPacks && 
      lastState.heirloom === state.heirloom &&
      JSON.stringify(lastState.completedHeirlooms) === JSON.stringify(state.completedHeirlooms)) {
    return; // Ничего не изменилось
  }
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
  
  // Сохраняем в Firestore если доступен
  if (window.firebaseAuth?.isSignedIn()) {
    window.firebaseAuth.saveToFirestore({
      totalPacks: state.totalPacks,
      heirloom: state.heirloom,
      completedHeirlooms: state.completedHeirlooms,
      updatedAt: Date.now()
    });
  }
  
  lastState = { ...state };
}

// Account management
function readAccounts(): Account[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Account[];
  } catch {
    return [];
  }
}

function writeAccounts(accounts: Account[]): void {
  try {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch {
    // ignore
  }
}

function getCurrentAccountId(): string | null {
  return localStorage.getItem(CURRENT_ACCOUNT_KEY);
}

function setCurrentAccountId(id: string): void {
  localStorage.setItem(CURRENT_ACCOUNT_KEY, id);
}

function createAccount(name: string): Account {
  const accounts = readAccounts();
  const id = `acc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const account: Account = {
    id,
    name,
    state: { totalPacks: 0, heirloom: false, completedHeirlooms: [] },
    createdAt: Date.now()
  };
  accounts.push(account);
  writeAccounts(accounts);
  return account;
}

function switchAccount(id: string): boolean {
  const accounts = readAccounts();
  const account = accounts.find(a => a.id === id);
  if (!account) return false;

  // Сохраняем текущее состояние ТЕКУЩЕГО аккаунта
  const currentState = getState();
  
  // Находим и обновляем текущий аккаунт в списке
  const currentId = getCurrentAccountId();
  if (currentId) {
    const currentAccountIndex = accounts.findIndex(a => a.id === currentId);
    if (currentAccountIndex >= 0) {
      accounts[currentAccountIndex].state = { ...currentState };
    }
  }
  
  writeState(currentState);

  // Переключаемся на новый аккаунт
  setCurrentAccountId(id);

  // Применяем состояние нового аккаунта
  applyState(account.state);
  writeState(account.state);
  
  // Сохраняем обновлённый список аккаунтов
  writeAccounts(accounts);

  return true;
}

function deleteAccount(id: string): boolean {
  let accounts = readAccounts();
  const idx = accounts.findIndex(a => a.id === id);
  if (idx === -1) return false;
  
  accounts.splice(idx, 1);
  writeAccounts(accounts);
  
  const currentId = getCurrentAccountId();
  if (currentId === id) {
    if (accounts.length > 0) {
      switchAccount(accounts[0].id);
    } else {
      localStorage.removeItem(CURRENT_ACCOUNT_KEY);
    }
  }
  return true;
}

function renderAccountSwitcher(): void {
  const container = document.getElementById("account-list");
  if (!container) return;

  const accounts = readAccounts();
  const currentId = getCurrentAccountId();

  if (accounts.length === 0) {
    container.innerHTML = `<div class="text-center py-4"><p class="text-on-surface-variant text-sm">No saved accounts</p></div>`;
    return;
  }

  container.innerHTML = accounts.map((account) => {
    const isActive = account.id === currentId;
    const completed = account.state?.completedHeirlooms || [];
    const packs = account.state?.totalPacks || 0;
    return `
      <div class="bg-surface-container-high rounded-xl p-4 border ${isActive ? 'border-primary/50' : 'border-outline-variant/10'} flex items-center gap-4">
        <div class="w-10 h-10 rounded-full ${isActive ? 'bg-primary/20' : 'bg-surface-container-highest'} flex items-center justify-center flex-shrink-0">
          <span class="material-symbols-outlined ${isActive ? 'text-primary' : 'text-outline-variant'} text-xl">person</span>
        </div>
        <div class="flex-1 min-w-0">
          <p class="font-headline text-sm font-bold ${isActive ? 'text-primary' : 'text-on-surface'} truncate">${account.name}</p>
          <p class="text-[10px] text-on-surface-variant">${packs} packs • ${completed.length} heirlooms</p>
        </div>
        <div class="flex items-center gap-2">
          ${!isActive ? `
            <button class="account-switch p-2 rounded-lg hover:bg-primary/10" data-account-id="${account.id}">
              <span class="material-symbols-outlined text-on-surface-variant text-lg">login</span>
            </button>
          ` : `<span class="material-symbols-outlined text-primary text-lg">check_circle</span>`}
          <button class="account-delete p-2 rounded-lg hover:bg-error/10" data-account-id="${account.id}">
            <span class="material-symbols-outlined text-error text-lg">delete</span>
          </button>
        </div>
      </div>
    `;
  }).join("");

  container.querySelectorAll(".account-switch").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const accountId = (e.currentTarget as HTMLElement).getAttribute("data-account-id");
      if (accountId) {
        const account = readAccounts().find(a => a.id === accountId);
        if (account) {
          switchAccount(accountId);
          updateUI();
          renderAccountSwitcher();
          showToast(`Switched to ${account.name}`, "success");
        }
      }
    });
  });

  container.querySelectorAll(".account-delete").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const accountId = (e.currentTarget as HTMLElement).getAttribute("data-account-id");
      if (accountId) {
        const account = readAccounts().find(a => a.id === accountId);
        if (confirm(`Delete "${account?.name}"?`)) {
          deleteAccount(accountId);
          renderAccountSwitcher();
          updateUI();
          showToast("Account deleted", "info");
        }
      }
    });
  });
}

// History
function readHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as HistoryEntry[];
  } catch {
    return [];
  }
}

function writeHistory(history: HistoryEntry[]): void {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch {
    // ignore
  }
}

function addToHistory(action: string, totalPacks: number): void {
  const history = readHistory();
  history.unshift({ timestamp: Date.now(), action, totalPacks });
  if (history.length > 50) history.pop();
  writeHistory(history);
}

function renderHistory(): void {
  const container = document.getElementById("history-list");
  if (!container) return;
  
  const history = readHistory();
  
  if (history.length === 0) {
    container.innerHTML = `<div class="bg-surface-container rounded-xl p-8 text-center"><span class="material-symbols-outlined text-outline-variant text-4xl mb-3">history</span><p class="text-on-surface-variant text-sm">History is empty</p></div>`;
    return;
  }
  
  container.innerHTML = history.map((entry) => {
    const date = new Date(entry.timestamp);
    const dateStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const timeStr = date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    return `
      <div class="bg-surface-container-high rounded-xl p-4 border border-outline-variant/10 flex items-center gap-4">
        <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <span class="material-symbols-outlined text-primary text-xl">update</span>
        </div>
        <div class="flex-1">
          <p class="font-headline text-sm font-bold text-on-surface">${entry.action}</p>
          <p class="text-[10px] text-on-surface-variant">${dateStr} at ${timeStr}</p>
        </div>
        <div class="text-right">
          <p class="font-label text-[10px] uppercase text-primary/60 font-bold">PACKS</p>
          <p class="font-headline text-lg font-bold text-primary">${entry.totalPacks}</p>
        </div>
      </div>
    `;
  }).join("");
}

function clearHistory(): void {
  writeHistory([]);
  renderHistory();
  showToast("History cleared", "info");
}

// Toast
type ToastType = "success" | "error" | "info";

function showToast(message: string, type: ToastType = "info", duration = 3000): void {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const icons: Record<ToastType, string> = { success: "check_circle", error: "error", info: "info" };
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span class="material-symbols-outlined toast-icon">${icons[type]}</span><span class="toast-message">${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("toast-hiding");
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

function getState(): StoredState {
  const stored = readState();
  return {
    totalPacks: toNumber(totalPacksInput?.value) || stored.totalPacks || 0,
    heirloom: toggleHeirloom?.getAttribute("aria-pressed") === "true",
    completedHeirlooms: stored.completedHeirlooms || []
  };
}

function applyState(state: StoredState): void {
  if (totalPacksInput) totalPacksInput.value = state.totalPacks ? String(state.totalPacks) : "";
  if (toggleHeirloom) {
    toggleHeirloom.setAttribute("aria-pressed", String(state.heirloom));
    const knob = toggleHeirloom.querySelector("div");
    if (knob) {
      knob.classList.toggle("translate-x-6", state.heirloom);
      knob.classList.toggle("bg-primary", state.heirloom);
    }
  }
  // Сохраняем completedHeirlooms в localStorage
  localStorage.setItem(STORAGE_KEY + "_completed", JSON.stringify(state.completedHeirlooms));
}

function updateUI(): void {
  const state = readState();
  const remaining = Math.max(500 - state.totalPacks, 0);
  const percent = Math.min(state.totalPacks / 500, 1);
  const percentText = `${Math.round(percent * 100)}%`;

  if (ui.welcomeTotal) ui.welcomeTotal.textContent = String(state.totalPacks);
  if (ui.welcomeProgress) ui.welcomeProgress.style.width = percentText;
  if (ui.welcomePercent) ui.welcomePercent.textContent = `${percentText} PROGRESS`;
  if (ui.welcomeRemaining) ui.welcomeRemaining.textContent = `${remaining} REMAINING`;

  // Render completed heirlooms
  if (completedSection && heirloomListEl) {
    if (state.completedHeirlooms.length > 0) {
      completedSection.classList.remove("hidden");
      heirloomListEl.innerHTML = state.completedHeirlooms.map((packs, index) => `
        <div class="bg-surface-container-high rounded-xl p-4 border border-tertiary/20 flex items-center gap-4">
          <div class="w-10 h-10 rounded-full bg-tertiary/10 flex items-center justify-center flex-shrink-0">
            <span class="material-symbols-outlined text-tertiary text-xl">military_tech</span>
          </div>
          <div class="flex-1">
            <p class="font-headline text-sm font-bold text-tertiary">Heirloom #${index + 1}</p>
            <p class="text-[10px] text-on-surface-variant">${packs} packs opened</p>
          </div>
          <div class="text-right">
            <p class="text-[10px] font-label text-tertiary/60 uppercase font-bold">COMPLETE</p>
            <p class="font-headline text-lg font-bold text-tertiary">${packs}/500</p>
          </div>
        </div>
      `).join("");
    } else {
      completedSection.classList.add("hidden");
    }
  }

  // Reset toggle button to OFF (always)
  if (toggleHeirloom) {
    toggleHeirloom.setAttribute("aria-pressed", "false");
    const knob = toggleHeirloom.querySelector("div");
    if (knob) {
      knob.classList.remove("translate-x-6", "bg-primary");
    }
  }

  writeState(state);
}

function calculateLevelPacks(totalLevel: number): number {
  let packs = 0;
  
  // Prestige 1 (1-500): 199 packs total
  // Levels 2-20: 1 pack per level = 19 packs
  if (totalLevel >= 2) {
    const end = Math.min(totalLevel, 20);
    packs += end - 2 + 1;
  }
  
  // Levels 22-300: 1 pack per 2 levels = 140 packs
  if (totalLevel >= 22) {
    const end = Math.min(totalLevel, 300);
    packs += Math.floor((end - 22) / 2) + 1;
  }
  
  // Levels 305-500: 1 pack per 5 levels = 40 packs
  if (totalLevel >= 305) {
    const end = Math.min(totalLevel, 500);
    packs += Math.floor((end - 305) / 5) + 1;
  }
  
  // Prestige 2 (501-1000): 120 packs (~1 per 4.17 levels)
  // Prestige 3 (1001-1500): 100 packs (1 per 5 levels)
  // Prestige 4 (1501-2000): 81 packs (~1 per 6.17 levels)
  if (totalLevel > 500) {
    const p = totalLevel - 500;
    
    if (p >= 1) {
      const end = Math.min(p, 500);
      packs += Math.floor(end / 4.17);
    }
    
    if (p >= 500) {
      const end = Math.min(p - 500, 500);
      packs += Math.floor(end / 5);
    }
    
    if (p >= 1000) {
      const end = Math.min(p - 1000, 500);
      packs += Math.floor(end / 6.17);
    }
  }
  
  return packs;
}

function quickAddPacks(count: number): void {
  if (count <= 0) {
    showToast("Enter a positive number", "error");
    return;
  }
  
  const state = readState();
  state.totalPacks += count;
  writeState(state);
  addToHistory(`Quick Add: +${count} packs`, state.totalPacks);
  updateUI();
  showToast(`Added ${count} packs`, "success");
}

function markHeirloomObtained(): void {
  const state = readState();

  if (state.totalPacks <= 0) {
    showToast("No packs to save!", "error");
    return;
  }

  const savedPacks = state.totalPacks;

  // Сохраняем текущий прогресс как завершённую реликвию
  state.completedHeirlooms.push(savedPacks);
  
  // Сбрасываем счётчик на 0
  state.totalPacks = 0;
  
  // Включаем Heirloom
  state.heirloom = true;

  // Сохраняем completedHeirlooms в ОТДЕЛЬНЫЙ ключ localStorage
  localStorage.setItem(STORAGE_KEY + "_completed", JSON.stringify(state.completedHeirlooms));
  
  // Сохраняем состояние в localStorage
  writeState(state);
  
  // Сохраняем в текущий аккаунт если есть
  const currentId = getCurrentAccountId();
  if (currentId) {
    const accounts = readAccounts();
    const accountIndex = accounts.findIndex(a => a.id === currentId);
    if (accountIndex >= 0) {
      accounts[accountIndex].state = { ...state };
      writeAccounts(accounts);
    }
  }
  
  // Сохраняем в Firestore
  if (window.firebaseAuth?.isSignedIn()) {
    window.firebaseAuth.saveToFirestore({
      totalPacks: state.totalPacks,
      heirloom: state.heirloom,
      completedHeirlooms: state.completedHeirlooms,
      updatedAt: Date.now()
    });
  }

  addToHistory(`Heirloom saved! (${state.completedHeirlooms.length})`, state.totalPacks);
  
  // Обновляем переключатель
  if (toggleHeirloom) {
    toggleHeirloom.setAttribute("aria-pressed", "true");
    const knob = toggleHeirloom.querySelector("div");
    if (knob) {
      knob.classList.add("translate-x-6", "bg-primary");
    }
  }

  updateUI();
  showToast(`Progress saved! ${savedPacks} packs → Heirloom #${state.completedHeirlooms.length}`, "success");
}

function resetAllData(): void {
  const emptyState: StoredState = { totalPacks: 0, heirloom: false, completedHeirlooms: [] };
  writeState(emptyState);
  localStorage.removeItem(STORAGE_KEY + "_completed");
  if (totalPacksInput) totalPacksInput.value = "";
  if (toggleHeirloom) {
    toggleHeirloom.setAttribute("aria-pressed", "false");
    const knob = toggleHeirloom.querySelector("div");
    if (knob) {
      knob.classList.remove("translate-x-6", "bg-primary");
    }
  }
  updateUI();
  showToast("All data reset", "info");
}

function setScreen(name: string): void {
  screens.forEach((screen) => {
    const isActive = screen.getAttribute("data-screen") === name;
    screen.classList.toggle("hidden", !isActive);
  });

  navItems.forEach((item) => {
    const isActive = item.getAttribute("data-target") === name;
    item.classList.toggle("text-[#ffb3ad]", isActive);
    item.classList.toggle("bg-[#2a2a2a]", isActive);
    item.classList.toggle("text-[#353534]", !isActive);
  });
}

function bindEvents(): void {
  // Navigation
  navItems.forEach((item) => {
    item.addEventListener("click", () => {
      const target = item.getAttribute("data-target") || "welcome";
      setScreen(target);
      if (target === "history") renderHistory();
    });
  });

  // Quick Add
  document.getElementById("btn-quick-add")?.addEventListener("click", () => {
    const count = toNumber(totalPacksInput?.value);
    if (count > 0) {
      quickAddPacks(count);
      if (totalPacksInput) totalPacksInput.value = "";
    } else {
      showToast("Enter pack count", "error");
    }
  });

  // Level Calculator
  document.getElementById("btn-calculate-levels")?.addEventListener("click", () => {
    const fromLevel = toNumber((document.getElementById("calc-from-level") as HTMLInputElement | null)?.value);
    const fromPrestige = toNumber((document.getElementById("calc-from-prestige") as HTMLSelectElement | null)?.value) - 1;
    const toLevel = toNumber((document.getElementById("calc-to-level") as HTMLInputElement | null)?.value);
    const toPrestige = toNumber((document.getElementById("calc-to-prestige") as HTMLSelectElement | null)?.value) - 1;
    
    if (fromLevel <= 0 || toLevel <= 0) {
      showToast("Enter valid levels", "error");
      return;
    }
    
    const totalFrom = fromLevel + (fromPrestige * 500);
    const totalTo = toLevel + (toPrestige * 500);
    
    if (totalFrom >= totalTo) {
      showToast("From must be less than to", "error");
      return;
    }
    
    const packsFrom = calculateLevelPacks(totalFrom);
    const packsTo = calculateLevelPacks(totalTo);
    const diff = packsTo - packsFrom;
    
    const resultEl = document.getElementById("calc-result");
    const packsEl = document.getElementById("calc-packs");
    
    if (resultEl && packsEl) {
      resultEl.classList.remove("hidden");
      packsEl.textContent = String(diff);
    }
    
    showToast(`Calculated: ${diff} packs`, "success");
  });

  // Heirloom toggle
  toggleHeirloom?.addEventListener("click", () => {
    const isPressed = toggleHeirloom.getAttribute("aria-pressed") === "true";
    if (!isPressed) {
      markHeirloomObtained();
      toggleHeirloom.setAttribute("aria-pressed", "true");
      const knob = toggleHeirloom.querySelector("div");
      if (knob) {
        knob.classList.add("translate-x-6", "bg-primary");
      }
    }
  });

  // Reset button
  document.getElementById("btn-reset")?.addEventListener("click", () => {
    const modal = document.getElementById("modal-reset");
    modal?.classList.remove("hidden");
  });

  document.querySelectorAll("[data-modal-close]").forEach((el) => {
    el.addEventListener("click", () => {
      document.getElementById("modal-reset")?.classList.add("hidden");
    });
  });

  document.getElementById("btn-confirm-reset")?.addEventListener("click", () => {
    resetAllData();
    document.getElementById("modal-reset")?.classList.add("hidden");
  });

  document.getElementById("modal-reset")?.addEventListener("click", (e) => {
    if (e.target === e.currentTarget) {
      (e.currentTarget as HTMLElement).classList.add("hidden");
    }
  });

  // Accounts
  document.getElementById("btn-accounts")?.addEventListener("click", () => {
    const modal = document.getElementById("modal-accounts");
    modal?.classList.remove("hidden");
    renderAccountSwitcher();
  });

  document.querySelectorAll("[data-accounts-modal-close]").forEach((el) => {
    el.addEventListener("click", () => {
      document.getElementById("modal-accounts")?.classList.add("hidden");
    });
  });

  document.getElementById("btn-add-account")?.addEventListener("click", () => {
    const input = document.getElementById("new-account-name") as HTMLInputElement | null;
    const name = input?.value?.trim() || "";
    if (!name) {
      showToast("Enter account name", "error");
      return;
    }
    const account = createAccount(name);
    switchAccount(account.id);
    renderAccountSwitcher();
    input!.value = "";
    showToast(`Account "${name}" created`, "success");
  });

  document.getElementById("modal-accounts")?.addEventListener("click", (e) => {
    if (e.target === e.currentTarget) {
      (e.currentTarget as HTMLElement).classList.add("hidden");
    }
  });

  // Clear history
  document.getElementById("btn-clear-history")?.addEventListener("click", () => {
    if (confirm("Delete all history?")) {
      clearHistory();
    }
  });
}

// Initialize
async function initializeApp() {
  // Ждём инициализации Firebase
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Пытаемся загрузить из Firestore
  if (window.firebaseAuth?.isSignedIn()) {
    const firebaseData = await window.firebaseAuth.loadFromFirestore();
    if (firebaseData) {
      const state = {
        totalPacks: firebaseData.totalPacks || 0,
        heirloom: firebaseData.heirloom || false,
        completedHeirlooms: firebaseData.completedHeirlooms || []
      };
      applyState(state);
      writeState(state);
      console.log('Loaded from Firebase');
    }
  }
  
  bindEvents();
  updateUI();
  setScreen("welcome");
}

initializeApp();
