"use strict";
const STORAGE_KEY = "apex-pack-tracker";
const HISTORY_KEY = "apex-pack-history";
const ACCOUNTS_KEY = "apex-accounts";
const CURRENT_ACCOUNT_KEY = "apex-current-account";
const totalPacksInput = document.getElementById("quick-add-packs");
const toggleHeirloom = document.getElementById("toggle-heirloom");
const activeProgressSection = document.getElementById("active-progress-section");
const completedSection = document.getElementById("completed-section");
const heirloomListEl = document.getElementById("heirloom-list");
const ui = {
    welcomeTotal: document.getElementById("welcome-total"),
    welcomeProgress: document.getElementById("welcome-progress"),
    welcomePercent: document.getElementById("welcome-percent"),
    welcomeRemaining: document.getElementById("welcome-remaining")
};
const screens = Array.from(document.querySelectorAll("[data-screen]"));
const navItems = Array.from(document.querySelectorAll(".nav-item"));
function toNumber(value) {
    const n = Number.parseInt(value !== null && value !== void 0 ? value : "", 10);
    return Number.isFinite(n) ? n : 0;
}
function readState() {
    return {
        totalPacks: toNumber(totalPacksInput === null || totalPacksInput === void 0 ? void 0 : totalPacksInput.value),
        heirloom: (toggleHeirloom === null || toggleHeirloom === void 0 ? void 0 : toggleHeirloom.getAttribute("aria-pressed")) === "true",
        completedHeirlooms: appState.completedHeirlooms
    };
}
function writeState(state) {
    // Сохраняем в Firestore ВСЕГДА
    if (window.firebaseAuth) {
        window.firebaseAuth.saveToFirestore({
            totalPacks: state.totalPacks,
            heirloom: state.heirloom,
            completedHeirlooms: state.completedHeirlooms,
            updatedAt: Date.now()
        });
    }
    // НЕ сохраняем в localStorage здесь - это делает real-time listener
}
// Account management
function readAccounts() {
    try {
        const raw = localStorage.getItem(ACCOUNTS_KEY);
        if (!raw)
            return [];
        return JSON.parse(raw);
    }
    catch (_a) {
        return [];
    }
}
function writeAccounts(accounts) {
    try {
        localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
    }
    catch (_a) {
        // ignore
    }
}
function getCurrentAccountId() {
    return localStorage.getItem(CURRENT_ACCOUNT_KEY);
}
function setCurrentAccountId(id) {
    localStorage.setItem(CURRENT_ACCOUNT_KEY, id);
}
function createAccount(name) {
    const accounts = readAccounts();
    const id = `acc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const account = {
        id,
        name,
        state: { totalPacks: 0, heirloom: false, completedHeirlooms: [] },
        createdAt: Date.now()
    };
    accounts.push(account);
    writeAccounts(accounts);
    return account;
}
function switchAccount(id) {
    const accounts = readAccounts();
    const account = accounts.find(a => a.id === id);
    if (!account)
        return false;
    // Сохраняем текущее состояние ТЕКУЩЕГО аккаунта
    const currentState = getState();
    // Находим и обновляем текущий аккаунт в списке
    const currentId = getCurrentAccountId();
    if (currentId) {
        const currentAccountIndex = accounts.findIndex(a => a.id === currentId);
        if (currentAccountIndex >= 0) {
            accounts[currentAccountIndex].state = Object.assign({}, currentState);
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
function deleteAccount(id) {
    let accounts = readAccounts();
    const idx = accounts.findIndex(a => a.id === id);
    if (idx === -1)
        return false;
    accounts.splice(idx, 1);
    writeAccounts(accounts);
    const currentId = getCurrentAccountId();
    if (currentId === id) {
        if (accounts.length > 0) {
            switchAccount(accounts[0].id);
        }
        else {
            localStorage.removeItem(CURRENT_ACCOUNT_KEY);
        }
    }
    return true;
}
function renderAccountSwitcher() {
    const container = document.getElementById("account-list");
    if (!container)
        return;
    const accounts = readAccounts();
    const currentId = getCurrentAccountId();
    if (accounts.length === 0) {
        container.innerHTML = `<div class="text-center py-4"><p class="text-on-surface-variant text-sm">No saved accounts</p></div>`;
        return;
    }
    container.innerHTML = accounts.map((account) => {
        var _a, _b;
        const isActive = account.id === currentId;
        const completed = ((_a = account.state) === null || _a === void 0 ? void 0 : _a.completedHeirlooms) || [];
        const packs = ((_b = account.state) === null || _b === void 0 ? void 0 : _b.totalPacks) || 0;
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
            const accountId = e.currentTarget.getAttribute("data-account-id");
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
            const accountId = e.currentTarget.getAttribute("data-account-id");
            if (accountId) {
                const account = readAccounts().find(a => a.id === accountId);
                if (confirm(`Delete "${account === null || account === void 0 ? void 0 : account.name}"?`)) {
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
function readHistory() {
    try {
        const raw = localStorage.getItem(HISTORY_KEY);
        if (!raw)
            return [];
        return JSON.parse(raw);
    }
    catch (_a) {
        return [];
    }
}
function writeHistory(history) {
    try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    }
    catch (_a) {
        // ignore
    }
}
function addToHistory(action, totalPacks) {
    const history = readHistory();
    history.unshift({ timestamp: Date.now(), action, totalPacks });
    if (history.length > 50)
        history.pop();
    writeHistory(history);
}
function renderHistory() {
    const container = document.getElementById("history-list");
    if (!container)
        return;
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
function clearHistory() {
    writeHistory([]);
    renderHistory();
    showToast("History cleared", "info");
}
function showToast(message, type = "info", duration = 3000) {
    const container = document.getElementById("toast-container");
    if (!container)
        return;
    const icons = { success: "check_circle", error: "error", info: "info" };
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span class="material-symbols-outlined toast-icon">${icons[type]}</span><span class="toast-message">${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add("toast-hiding");
        setTimeout(() => toast.remove(), 300);
    }, duration);
}
function getState() {
    return {
        totalPacks: toNumber(totalPacksInput === null || totalPacksInput === void 0 ? void 0 : totalPacksInput.value),
        heirloom: (toggleHeirloom === null || toggleHeirloom === void 0 ? void 0 : toggleHeirloom.getAttribute("aria-pressed")) === "true",
        completedHeirlooms: appState.completedHeirlooms
    };
}
function applyState(state) {
    appState = Object.assign({}, state);
    if (toggleHeirloom) {
        toggleHeirloom.setAttribute("aria-pressed", String(state.heirloom));
        const knob = toggleHeirloom.querySelector("div");
        if (knob) {
            knob.classList.toggle("translate-x-6", state.heirloom);
            knob.classList.toggle("bg-primary", state.heirloom);
        }
    }
}
function updateUI() {
    // Используем appState напрямую, а не getState() чтобы не читать из input
    const state = appState;
    const remaining = Math.max(500 - state.totalPacks, 0);
    const percent = Math.min(state.totalPacks / 500, 1);
    const percentText = `${Math.round(percent * 100)}%`;
    if (ui.welcomeTotal)
        ui.welcomeTotal.textContent = String(state.totalPacks);
    if (ui.welcomeProgress)
        ui.welcomeProgress.style.width = percentText;
    if (ui.welcomePercent)
        ui.welcomePercent.textContent = `${percentText} PROGRESS`;
    if (ui.welcomeRemaining)
        ui.welcomeRemaining.textContent = `${remaining} REMAINING`;
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
        }
        else {
            completedSection.classList.add("hidden");
        }
    }
    // Сохраняем в Firestore
    writeState(state);
}
/**
 * Обновление UI из Firestore (вызывается из real-time listener)
 */
function updateUIFromFirestore(state) {
    appState = Object.assign({}, state);
    // Обновляем input поле
    if (totalPacksInput) {
        totalPacksInput.value = String(state.totalPacks);
    }
    // Обновляем toggle Heirloom
    if (toggleHeirloom) {
        toggleHeirloom.setAttribute("aria-pressed", String(state.heirloom));
        const knob = toggleHeirloom.querySelector("div");
        if (knob) {
            knob.classList.toggle("translate-x-6", state.heirloom);
            knob.classList.toggle("bg-primary", state.heirloom);
        }
    }
    // Обновляем отображение прогресса
    const remaining = Math.max(500 - state.totalPacks, 0);
    const percent = Math.min(state.totalPacks / 500, 1);
    const percentText = `${Math.round(percent * 100)}%`;
    if (ui.welcomeTotal)
        ui.welcomeTotal.textContent = String(state.totalPacks);
    if (ui.welcomeProgress)
        ui.welcomeProgress.style.width = percentText;
    if (ui.welcomePercent)
        ui.welcomePercent.textContent = `${percentText} PROGRESS`;
    if (ui.welcomeRemaining)
        ui.welcomeRemaining.textContent = `${remaining} REMAINING`;
    // Render completed heirlooms
    if (completedSection && heirloomListEl) {
        if (state.completedHeirlooms.length > 0) {
            completedSection.classList.remove("hidden");
            if (heirloomListEl) {
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
            }
        }
        else {
            completedSection.classList.add("hidden");
        }
    }
}
function calculateLevelPacks(totalLevel) {
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
function quickAddPacks(count) {
    if (count <= 0) {
        showToast("Enter a positive number", "error");
        return;
    }
    // Добавляем к текущему значению
    const newTotal = appState.totalPacks + count;
    // Обновляем appState
    appState.totalPacks = newTotal;
    // Обновляем input поле
    if (totalPacksInput) {
        totalPacksInput.value = String(newTotal);
    }
    // Сохраняем в Firestore
    writeState(appState);
    addToHistory(`Quick Add: +${count} packs`, newTotal);
    updateUI();
    showToast(`Added ${count} packs`, "success");
}
function markHeirloomObtained() {
    const currentPacks = appState.totalPacks;
    if (currentPacks <= 0) {
        showToast("No packs to save!", "error");
        return;
    }
    // Сохраняем текущий прогресс как завершённую реликвию
    appState.completedHeirlooms.push(currentPacks);
    // Сбрасываем счётчик на 0
    appState.totalPacks = 0;
    // Выключаем Heirloom переключатель (сбрасываем в false)
    appState.heirloom = false;
    // Применяем состояние и обновляем UI переключателя
    applyState(appState);
    // Сохраняем в Firestore
    writeState(appState);
    addToHistory(`Heirloom saved! (${appState.completedHeirlooms.length})`, 0);
    updateUI();
    showToast(`Progress saved! ${currentPacks} packs → Heirloom #${appState.completedHeirlooms.length}`, "success");
}
function resetAllData() {
    const emptyState = { totalPacks: 0, heirloom: false, completedHeirlooms: [] };
    writeState(emptyState);
    localStorage.removeItem(STORAGE_KEY + "_completed");
    if (totalPacksInput)
        totalPacksInput.value = "";
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
function setScreen(name) {
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
function bindEvents() {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    // Navigation
    navItems.forEach((item) => {
        item.addEventListener("click", () => {
            const target = item.getAttribute("data-target") || "welcome";
            setScreen(target);
            if (target === "history")
                renderHistory();
        });
    });
    // Quick Add
    (_a = document.getElementById("btn-quick-add")) === null || _a === void 0 ? void 0 : _a.addEventListener("click", () => {
        const count = toNumber(totalPacksInput === null || totalPacksInput === void 0 ? void 0 : totalPacksInput.value);
        if (count > 0) {
            quickAddPacks(count);
            if (totalPacksInput)
                totalPacksInput.value = "";
        }
        else {
            showToast("Enter pack count", "error");
        }
    });
    // Level Calculator
    (_b = document.getElementById("btn-calculate-levels")) === null || _b === void 0 ? void 0 : _b.addEventListener("click", () => {
        var _a, _b, _c, _d;
        const fromLevel = toNumber((_a = document.getElementById("calc-from-level")) === null || _a === void 0 ? void 0 : _a.value);
        const fromPrestige = toNumber((_b = document.getElementById("calc-from-prestige")) === null || _b === void 0 ? void 0 : _b.value) - 1;
        const toLevel = toNumber((_c = document.getElementById("calc-to-level")) === null || _c === void 0 ? void 0 : _c.value);
        const toPrestige = toNumber((_d = document.getElementById("calc-to-prestige")) === null || _d === void 0 ? void 0 : _d.value) - 1;
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
    toggleHeirloom === null || toggleHeirloom === void 0 ? void 0 : toggleHeirloom.addEventListener("click", () => {
        const isPressed = toggleHeirloom.getAttribute("aria-pressed") === "true";
        if (!isPressed) {
            // Используем appState.totalPacks вместо значения input
            if (appState.totalPacks <= 0) {
                showToast("No packs to save!", "error");
                return;
            }
            markHeirloomObtained();
        }
    });
    // Reset button
    (_c = document.getElementById("btn-reset")) === null || _c === void 0 ? void 0 : _c.addEventListener("click", () => {
        const modal = document.getElementById("modal-reset");
        modal === null || modal === void 0 ? void 0 : modal.classList.remove("hidden");
    });
    document.querySelectorAll("[data-modal-close]").forEach((el) => {
        el.addEventListener("click", () => {
            var _a;
            (_a = document.getElementById("modal-reset")) === null || _a === void 0 ? void 0 : _a.classList.add("hidden");
        });
    });
    (_d = document.getElementById("btn-confirm-reset")) === null || _d === void 0 ? void 0 : _d.addEventListener("click", () => {
        var _a;
        resetAllData();
        (_a = document.getElementById("modal-reset")) === null || _a === void 0 ? void 0 : _a.classList.add("hidden");
    });
    (_e = document.getElementById("modal-reset")) === null || _e === void 0 ? void 0 : _e.addEventListener("click", (e) => {
        if (e.target === e.currentTarget) {
            e.currentTarget.classList.add("hidden");
        }
    });
    // Accounts
    (_f = document.getElementById("btn-accounts")) === null || _f === void 0 ? void 0 : _f.addEventListener("click", () => {
        const modal = document.getElementById("modal-accounts");
        modal === null || modal === void 0 ? void 0 : modal.classList.remove("hidden");
        renderAccountSwitcher();
    });
    document.querySelectorAll("[data-accounts-modal-close]").forEach((el) => {
        el.addEventListener("click", () => {
            var _a;
            (_a = document.getElementById("modal-accounts")) === null || _a === void 0 ? void 0 : _a.classList.add("hidden");
        });
    });
    (_g = document.getElementById("btn-add-account")) === null || _g === void 0 ? void 0 : _g.addEventListener("click", () => {
        var _a;
        const input = document.getElementById("new-account-name");
        const name = ((_a = input === null || input === void 0 ? void 0 : input.value) === null || _a === void 0 ? void 0 : _a.trim()) || "";
        if (!name) {
            showToast("Enter account name", "error");
            return;
        }
        const account = createAccount(name);
        switchAccount(account.id);
        renderAccountSwitcher();
        input.value = "";
        showToast(`Account "${name}" created`, "success");
    });
    (_h = document.getElementById("modal-accounts")) === null || _h === void 0 ? void 0 : _h.addEventListener("click", (e) => {
        if (e.target === e.currentTarget) {
            e.currentTarget.classList.add("hidden");
        }
    });
    // Clear history
    (_j = document.getElementById("btn-clear-history")) === null || _j === void 0 ? void 0 : _j.addEventListener("click", () => {
        if (confirm("Delete all history?")) {
            clearHistory();
        }
    });
}
// Initialize
let appState = { totalPacks: 0, heirloom: false, completedHeirlooms: [] };
async function initializeApp() {
    // Ждём инициализации Firebase
    await new Promise(resolve => setTimeout(resolve, 500));
    // ВСЕГДА загружаем из Firestore если доступен
    if (window.firebaseAuth) {
        const firebaseData = await window.firebaseAuth.loadFromFirestore();
        if (firebaseData && firebaseData.totalPacks > 0) {
            appState = {
                totalPacks: firebaseData.totalPacks || 0,
                heirloom: firebaseData.heirloom || false,
                completedHeirlooms: firebaseData.completedHeirlooms || []
            };
        }
        // Подключаем real-time синхронизацию
        window.firebaseAuth.subscribeToChanges((data) => {
            console.log('🔄 Sync from Firestore:', data);
            updateUIFromFirestore(data);
        });
    }
    bindEvents();
    updateUI();
    setScreen("welcome");
}
initializeApp();
