const STORAGE_KEY = "teserrufat_crm_data_v1";
const SESSION_KEY = "teserrufat_crm_session_v1";
const DEFAULT_OWNER_LOGIN = "admin";
const DEFAULT_OWNER_PASSWORD = "admin123";
const SERVER_DATA_URL = "/.netlify/functions/data";
const SERVER_SYNC_DEBOUNCE_MS = 700;

const defaultSettings = {
  companyName: "AVSFERMA",
  seasonName: "2026 Çiyələk",
  primaryCurrency: "AZN",
  secondaryCurrency: "USD",
  usdRate: 1.7,
  logo: "",
  demoSeeded: false,
  compactView: false,
  mobileCardView: true,
  dashboardMode: "simple"
};

const appData = {
  lands: [],
  greenhouses: [],
  seedlings: [],
  workers: [],
  salaries: [],
  expenses: [],
  machines: [],
  harvests: [],
  coldStorageEntries: [],
  sales: [],
  customers: [],
  debtPayments: [],
  stockAdjustments: [],
  calibers: [],
  settings: {}
};

const emptyData = structuredClone(appData);
let activeSection = "dashboard";
let deleteCallback = null;
let analyticsPeriod = {
  type: "season",
  startDate: "",
  endDate: ""
};
let activeReportTab = "finance";
let chartInstances = [];
let activeUser = null;
let serverSyncReady = false;
let serverSyncTimer = null;
let serverSyncInProgress = false;
let serverSyncPending = false;

const menuItems = [
  { id: "dashboard", title: "Ana səhifə", icon: "home", active: true },
  { id: "lands", title: "Torpaq və sahələr", icon: "land", active: true },
  { id: "greenhouses", title: "İstixanalar", icon: "greenhouse", active: true },
  { id: "seedlings", title: "Fidanlar", icon: "seedling", active: true },
  { id: "workers", title: "İşçilər", icon: "workers", active: true },
  { id: "salaries", title: "Maaşlar", icon: "salary", active: true },
  { id: "expenses", title: "Xərclər", icon: "expenses", active: true },
  { id: "machines", title: "Texnika", icon: "machine", active: true },
  { id: "harvests", title: "Məhsul yığımı", icon: "harvest", active: true },
  { id: "coldStorageEntries", title: "Soyuducu / Anbar", icon: "storage", active: true },
  { id: "sales", title: "Satışlar", icon: "sales", active: true },
  { id: "customers", title: "Müştərilər", icon: "customers", active: true },
  { id: "debtPayments", title: "Borclar", icon: "debts", active: true },
  { id: "reports", title: "Hesabatlar", icon: "reports", active: true },
  { id: "export", title: "Excel ixracı", icon: "export", active: true },
  { id: "settings", title: "Ayarlar", icon: "settings", active: true }
];

const menuGroups = [
  { title: "Əsas", items: ["dashboard", "reports"] },
  { title: "Təsərrüfat", items: ["lands", "greenhouses", "seedlings", "machines"] },
  { title: "Əməliyyatlar", items: ["harvests", "coldStorageEntries", "sales"] },
  { title: "Maliyyə", items: ["expenses", "salaries", "debtPayments", "export"] },
  { title: "İnsanlar", items: ["workers", "customers"] },
  { title: "Sistem", items: ["settings"] }
];

const landTypes = [
  { value: "açıq sahə", label: "Açıq sahə" },
  { value: "istixana sahəsi", label: "İstixana sahəsi" },
  { value: "qarışıq", label: "Qarışıq" }
];

const greenhouseStatuses = [
  { value: "aktiv", label: "Aktiv" },
  { value: "təmir olunur", label: "Təmir olunur" },
  { value: "passiv", label: "Passiv" }
];

const machineStatuses = [
  { value: "şəxsi", label: "Şəxsi" },
  { value: "icarə", label: "İcarə" },
  { value: "təmir olunur", label: "Təmir olunur" },
  { value: "passiv", label: "Passiv" }
];

const machineExpenseTypes = [
  { value: "alış", label: "Alış" },
  { value: "icarə", label: "İcarə" },
  { value: "təmir", label: "Təmir" },
  { value: "yanacaq", label: "Yanacaq" },
  { value: "servis", label: "Servis" },
  { value: "digər", label: "Digər" }
];

const workerRoles = [
  { value: "Sahibkar", label: "Sahibkar" },
  { value: "Aqronom", label: "Aqronom" },
  { value: "Sahə rəisi", label: "Sahə rəisi" },
  { value: "Sürücü", label: "Sürücü" },
  { value: "İşçi", label: "İşçi" },
  { value: "Digər", label: "Digər" }
];

const paymentTypes = [
  { value: "gündəlik", label: "Gündəlik" },
  { value: "aylıq", label: "Aylıq" }
];

const workerStatuses = [
  { value: "aktiv", label: "Aktiv" },
  { value: "passiv", label: "Passiv" }
];

const workerPermissionItems = [
  { key: "addData", label: "Məlumat əlavə edə bilər" },
  { key: "editData", label: "Məlumat redaktə edə bilər" },
  { key: "deleteData", label: "Məlumat silə bilər" },
  { key: "manageWorkers", label: "İşçi əlavə/redaktə edə bilər" },
  { key: "deleteWorkers", label: "İşçi silə bilər" },
  { key: "viewReports", label: "Hesabatları görə bilər" },
  { key: "manageSettings", label: "Ayarlar və backup idarə edə bilər" }
];

const sectionPermissionMap = {
  dashboard: null,
  lands: "addData",
  greenhouses: "addData",
  seedlings: "addData",
  machines: "addData",
  harvests: "addData",
  coldStorageEntries: "addData",
  sales: "addData",
  customers: "addData",
  salaries: "manageWorkers",
  expenses: "addData",
  debtPayments: "addData",
  workers: "manageWorkers",
  reports: "viewReports",
  export: "viewReports",
  settings: "manageSettings"
};

const quickActionSections = {
  dashboard: "dashboard",
  harvest: "harvests",
  sale: "sales",
  expense: "expenses"
};

const salaryPaymentTypes = [
  { value: "gündəlik maaş", label: "Gündəlik maaş" },
  { value: "aylıq maaş", label: "Aylıq maaş" },
  { value: "overtime", label: "Overtime" },
  { value: "bonus", label: "Bonus" },
  { value: "avans", label: "Avans" },
  { value: "digər", label: "Digər" }
];

const expenseCategories = [
  "Torpaq icarəsi",
  "Torpaq hazırlığı",
  "Fidanlar",
  "Gübrələr",
  "Su",
  "Elektrik",
  "İstixana",
  "Təmir",
  "Texnika",
  "Maaşlar",
  "Yanacaq",
  "Nəqliyyat",
  "Soyuducu / Anbar",
  "Qablaşdırma",
  "Digər"
];

const manualExpenseCategories = [
  "Gübrələr",
  "Su",
  "Elektrik",
  "Təmir",
  "Yanacaq",
  "Nəqliyyat",
  "Qablaşdırma",
  "Digər"
];

const expenseCategoryFields = {
  "Gübrələr": ["supplier", "land", "note"],
  "Su": ["period", "land", "note"],
  "Elektrik": ["period", "land", "note"],
  "Təmir": ["objectType", "land", "greenhouse", "machine", "note"],
  "Yanacaq": ["machine", "driver", "note"],
  "Nəqliyyat": ["driver", "land", "note"],
  "Qablaşdırma": ["quantity", "supplier", "note"],
  "Digər": ["supplier", "land", "greenhouse", "description", "note"]
};

const defaultCaliberNames = [
  "Xırda",
  "Orta",
  "İri",
  "Extra / Premium",
  "Emal üçün",
  "Zay / yararsız"
];

const qualityOptions = [
  { value: "1-ci sort", label: "1-ci sort" },
  { value: "2-ci sort", label: "2-ci sort" },
  { value: "xırda", label: "Xırda" },
  { value: "yararsız", label: "Yararsız" },
  { value: "emal üçün", label: "Emal üçün" }
];

const stockAdjustmentTypes = [
  { value: "əlavə", label: "Əlavə" },
  { value: "silinmə", label: "Silinmə" }
];

const coldStorageStatuses = [
  { value: "gözləmədə", label: "Gözləmədə" },
  { value: "qismən ödənib", label: "Qismən ödənib" },
  { value: "ödənib", label: "Ödənib" }
];

const saleChannels = [
  { value: "Topdançı", label: "Topdançı" },
  { value: "Bazar", label: "Bazar" },
  { value: "Soyuducu topdan", label: "Soyuducu topdan" },
  { value: "Şəxsi müştəri", label: "Şəxsi müştəri" }
];

const productSources = [
  { value: "sahədən", label: "Sahədən" },
  { value: "soyuducudan", label: "Soyuducudan" },
  { value: "anbardan", label: "Anbardan" }
];

const saleStatuses = [
  { value: "ödənib", label: "Ödənib" },
  { value: "qismən ödənib", label: "Qismən ödənib" },
  { value: "ödənməyib", label: "Ödənməyib" }
];

const customerTypes = [
  { value: "topdançı", label: "Topdançı" },
  { value: "bazar", label: "Bazar" },
  { value: "soyuducu", label: "Soyuducu" },
  { value: "şəxsi müştəri", label: "Şəxsi müştəri" }
];

const paymentMethods = [
  { value: "nağd", label: "Nağd" },
  { value: "bank köçürməsi", label: "Bank köçürməsi" },
  { value: "kart", label: "Kart" },
  { value: "borc", label: "Borc" }
];

const greenhouseCostFields = [
  { key: "constructionCost", label: "Tikinti xərci", category: "İstixana" },
  { key: "repairCost", label: "Təmir xərci", category: "Təmir" },
  { key: "filmCost", label: "Plyonka xərci", category: "İstixana" },
  { key: "pipeFrameCost", label: "Boru/karkas xərci", category: "İstixana" },
  { key: "dripIrrigationCost", label: "Damcı suvarma xərci", category: "İstixana" },
  { key: "energyHeatingCost", label: "Elektrik/istilik xərci", category: "İstixana" }
];

const sectionRenderers = {
  dashboard: renderDashboard,
  lands: renderLandsPage,
  greenhouses: renderGreenhousesPage,
  seedlings: renderSeedlingsPage,
  workers: renderWorkersPage,
  salaries: renderSalariesPage,
  expenses: renderExpensesPage,
  machines: renderMachinesPage,
  harvests: renderHarvestsPage,
  coldStorageEntries: renderColdStoragePage,
  sales: renderSalesPage,
  customers: renderCustomersPage,
  debtPayments: renderDebtsPage,
  reports: renderReportsPage,
  export: renderExportPage,
  settings: renderSettings
};

const dom = {};

document.addEventListener("DOMContentLoaded", async () => {
  cacheDom();
  observeTableChanges();
  loadData();
  await loadServerData();
  seedDemoData();
  ensureOwnerAccount();
  serverSyncReady = true;
  saveData();
  restoreSession();
  bindGlobalEvents();
  if (activeUser) {
    showAppScreen();
    renderNavigation();
    renderApp();
    showToast("Təsərrüfat CRM hazırdır.", "success");
  } else {
    showLoginScreen();
  }
});

function observeTableChanges() {
  const observer = new MutationObserver(() => {
    labelTablesForMobile();
    enhanceActionButtonIcons();
    applyPermissionVisibility();
  });
  observer.observe(dom.contentArea, { childList: true, subtree: true });
}

function iconSvg(name) {
  const icons = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 10v10h5v-6h4v6h5V10"/>',
    land: '<path d="M3 17c4-4 8-4 12 0 2 2 4 2 6 0"/><path d="M4 12h16"/><path d="M7 7h10"/>',
    greenhouse: '<path d="M4 19V9l8-5 8 5v10"/><path d="M4 9h16"/><path d="M12 4v15"/><path d="M8 19v-5h8v5"/>',
    seedling: '<path d="M12 20V9"/><path d="M12 12c-4 0-6-2-6-5 4 0 6 2 6 5Z"/><path d="M12 10c4 0 6-2 6-5-4 0-6 2-6 5Z"/>',
    workers: '<path d="M16 11a4 4 0 1 0-8 0"/><path d="M4 21a8 8 0 0 1 16 0"/><path d="M18 8a3 3 0 0 1 3 3"/><path d="M3 11a3 3 0 0 1 3-3"/>',
    salary: '<rect x="3" y="6" width="18" height="12" rx="3"/><path d="M7 10h4"/><path d="M16 14h1"/><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/>',
    expenses: '<path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7H14a3.5 3.5 0 0 1 0 7H6"/>',
    machine: '<path d="M4 16h16"/><path d="M6 16v-5h7l3 5"/><circle cx="8" cy="18" r="2"/><circle cx="17" cy="18" r="2"/><path d="M8 11V7h4"/>',
    harvest: '<path d="M12 21V5"/><path d="M8 8c-3 0-5-2-5-5 3 0 5 2 5 5Z"/><path d="M16 10c3 0 5-2 5-5-3 0-5 2-5 5Z"/><path d="M7 16h10"/>',
    storage: '<path d="M5 4h14v16H5z"/><path d="M8 8h8"/><path d="M8 12h8"/><path d="M8 16h4"/>',
    sales: '<path d="M4 6h16v12H4z"/><path d="M8 10h5"/><path d="M16 14h1"/><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/>',
    customers: '<path d="M16 11a4 4 0 1 0-8 0"/><path d="M5 21a7 7 0 0 1 14 0"/><path d="M18 5h3"/><path d="M19.5 3.5v3"/>',
    debts: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z"/><path d="M9 8h6"/><path d="M9 12h6"/><path d="M9 16h3"/>',
    reports: '<path d="M4 19V5"/><path d="M4 19h16"/><path d="M8 16v-5"/><path d="M12 16V8"/><path d="M16 16v-7"/>',
    export: '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>',
    settings: '<path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/><path d="M19.4 15a1.8 1.8 0 0 0 .36 1.98l.05.05-2 3-.07-.03a1.8 1.8 0 0 0-2.03.28 1.8 1.8 0 0 0-.54 1.72H8.83a1.8 1.8 0 0 0-2.57-1.72l-.07.03-2-3 .05-.05A1.8 1.8 0 0 0 4.6 15 1.8 1.8 0 0 0 3 13.8v-3.6A1.8 1.8 0 0 0 4.6 9a1.8 1.8 0 0 0-.36-1.98l-.05-.05 2-3 .07.03A1.8 1.8 0 0 0 8.83 2h6.34a1.8 1.8 0 0 0 2.57 1.72l.07-.03 2 3-.05.05A1.8 1.8 0 0 0 19.4 9 1.8 1.8 0 0 0 21 10.2v3.6A1.8 1.8 0 0 0 19.4 15Z"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 10v6"/><path d="M12 7h.01"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    trash: '<path d="M4 7h16"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M6 7l1 14h10l1-14"/><path d="M9 7V4h6v3"/>',
    history: '<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/><path d="M12 7v5l3 2"/>',
    external: '<path d="M14 3h7v7"/><path d="M10 14 21 3"/><path d="M20 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5"/>',
    profit: '<path d="M4 18 10 12l4 4 6-8"/><path d="M15 8h5v5"/>',
    income: '<path d="M12 3v18"/><path d="m7 8 5-5 5 5"/><path d="M5 15h14"/>',
    stock: '<path d="M4 7h16v13H4z"/><path d="M7 7V4h10v3"/><path d="M8 12h8"/>',
    calendar: '<path d="M7 3v4"/><path d="M17 3v4"/><path d="M4 8h16"/><rect x="4" y="5" width="16" height="16" rx="3"/>'
  };
  const body = icons[name] || icons.reports;
  return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${body}</svg>`;
}

function cacheDom() {
  dom.appShell = document.querySelector(".app-shell");
  dom.loginScreen = document.getElementById("loginScreen");
  dom.loginForm = document.getElementById("loginForm");
  dom.loginUsername = document.getElementById("loginUsername");
  dom.loginPassword = document.getElementById("loginPassword");
  dom.syncStatus = document.getElementById("syncStatus");
  dom.navMenu = document.getElementById("navMenu");
  dom.contentArea = document.getElementById("contentArea");
  dom.pageTitle = document.getElementById("pageTitle");
  dom.currentSectionEyebrow = document.getElementById("currentSectionEyebrow");
  dom.ratePill = document.getElementById("ratePill");
  dom.sidebarLogo = document.getElementById("sidebarLogo");
  dom.sidebarSeason = document.getElementById("sidebarSeason");
  dom.toastContainer = document.getElementById("toastContainer");
  dom.modalBackdrop = document.getElementById("modalBackdrop");
  dom.modalTitle = document.getElementById("modalTitle");
  dom.modalKicker = document.getElementById("modalKicker");
  dom.modalBody = document.getElementById("modalBody");
  dom.modalCloseButton = document.getElementById("modalCloseButton");
  dom.mobileMenuButton = document.getElementById("mobileMenuButton");
  dom.sidebar = document.getElementById("sidebar");
  dom.mobileOverlay = document.getElementById("mobileOverlay");
  dom.mobileQuickActions = document.getElementById("mobileQuickActions");
  dom.quickBackupButton = document.getElementById("quickBackupButton");
  dom.logoutButton = document.getElementById("logoutButton");
  dom.backupFileInput = document.getElementById("backupFileInput");
}

function loadData() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    replaceAppData({ ...emptyData, settings: { ...defaultSettings } });
    saveData();
    return;
  }

  try {
    replaceAppData(JSON.parse(stored));
    saveData();
  } catch (error) {
    replaceAppData({ ...emptyData, settings: { ...defaultSettings } });
    saveData();
    showToast("Yaddaş məlumatı oxunmadı, standart baza açıldı.", "error");
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
  if (serverSyncReady) scheduleServerSave();
}

async function loadServerData() {
  if (!canUseServerSync()) {
    setSyncStatus("Yerli yaddaş", "offline");
    return false;
  }

  try {
    setSyncStatus("Server yoxlanılır", "loading");
    const response = await fetch(SERVER_DATA_URL, {
      method: "GET",
      cache: "no-store",
      headers: { "Accept": "application/json" }
    });
    if (!response.ok) throw new Error(`Server cavabı: ${response.status}`);
    const payload = await response.json();
    if (payload?.data && typeof payload.data === "object") {
      replaceAppData(payload.data);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
      setSyncStatus("Serverdən yükləndi", "online");
      return true;
    }
    setSyncStatus("Server hazırdır", "online");
    return false;
  } catch (error) {
    console.warn("Server data load failed:", error);
    setSyncStatus("Offline backup", "offline");
    return false;
  }
}

function canUseServerSync() {
  return window.location.protocol === "http:" || window.location.protocol === "https:";
}

function scheduleServerSave() {
  if (!canUseServerSync()) return;
  window.clearTimeout(serverSyncTimer);
  serverSyncTimer = window.setTimeout(syncServerData, SERVER_SYNC_DEBOUNCE_MS);
}

async function syncServerData() {
  if (!canUseServerSync()) return;
  if (serverSyncInProgress) {
    serverSyncPending = true;
    return;
  }

  serverSyncInProgress = true;
  serverSyncPending = false;
  try {
    setSyncStatus("Serverə yazılır", "loading");
    const response = await fetch(SERVER_DATA_URL, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        data: appData,
        savedAt: new Date().toISOString()
      })
    });
    if (!response.ok) throw new Error(`Server cavabı: ${response.status}`);
    setSyncStatus("Serverdə saxlandı", "online");
  } catch (error) {
    console.warn("Server data save failed:", error);
    setSyncStatus("Offline backup", "offline");
  } finally {
    serverSyncInProgress = false;
    if (serverSyncPending) scheduleServerSave();
  }
}

function setSyncStatus(text, state = "offline") {
  if (!dom.syncStatus) return;
  dom.syncStatus.textContent = text;
  dom.syncStatus.dataset.state = state;
}

function mergeData(data = {}) {
  const merged = structuredClone(emptyData);
  Object.keys(merged).forEach((key) => {
    if (key === "settings") {
      merged.settings = { ...defaultSettings, ...(data.settings || {}) };
    } else {
      merged[key] = Array.isArray(data[key]) ? structuredClone(data[key]) : [];
    }
  });
  return merged;
}

function replaceAppData(data) {
  const merged = normalizeData(mergeData(data));
  Object.keys(emptyData).forEach((key) => {
    appData[key] = merged[key];
  });
}

function normalizeData(data) {
  data.calibers = data.calibers.map((item) => ({
    id: item.id || generateId("caliber"),
    name: item.name || "",
    type: item.type || "caliber",
    note: item.note || ""
  })).filter((item) => item.name);
  ensureDefaultCalibers(data);

  data.lands = data.lands.map((land) => {
    const inputUnit = land.areaInputUnit === "sot" ? "sot" : "hektar";
    const baseHectare = Number(land.areaHectare ?? land.area ?? 0);
    const baseSot = Number(land.areaSot ?? (baseHectare * 100));
    const inputValue = Number(land.areaInputValue ?? (inputUnit === "sot" ? baseSot : baseHectare));
    const converted = convertLandArea(inputValue, inputUnit);
    return {
      id: land.id || generateId("land"),
      name: land.name || "Ümumi sahə",
      type: land.type || "açıq sahə",
      area: converted.areaHectare,
      areaHectare: converted.areaHectare,
      areaSot: converted.areaSot,
      areaInputValue: inputValue,
      areaInputUnit: inputUnit,
      rentOwner: land.rentOwner || "",
      leaseStartDate: land.leaseStartDate || "",
      leaseEndDate: land.leaseEndDate || "",
      annualRent: Number(land.annualRent || land.rentAmount || 0),
      currency: land.currency || "AZN",
      location: land.location || "",
      note: land.note || ""
    };
  });

  data.greenhouses = data.greenhouses.map((item) => ({
    id: item.id || generateId("greenhouse"),
    name: item.name || "İstixana",
    landId: item.landId || "",
    size: Number(item.size || 0),
    status: item.status || "aktiv",
    constructionCost: Number(item.constructionCost || 0),
    repairCost: Number(item.repairCost || 0),
    filmCost: Number(item.filmCost || 0),
    pipeFrameCost: Number(item.pipeFrameCost || 0),
    dripIrrigationCost: Number(item.dripIrrigationCost || 0),
    energyHeatingCost: Number(item.energyHeatingCost || 0),
    currency: item.currency || "AZN",
    note: item.note || ""
  }));

  data.seedlings = data.seedlings.map((item) => ({
    id: item.id || generateId("seedling"),
    date: item.date || todayISO(),
    sortName: item.sortName || item.sort || "Murano",
    quantity: Number(item.quantity || 0),
    unitPrice: Number(item.unitPrice || 0),
    totalAmount: Number(item.totalAmount || 0),
    currency: item.currency || "AZN",
    supplier: item.supplier || "",
    landId: item.landId || "",
    plantingDate: item.plantingDate || "",
    lostCount: Number(item.lostCount || 0),
    note: item.note || ""
  }));

  data.workers = data.workers.map((item) => {
    const role = normalizeWorkerRole(item.role || item.position || "İşçi");
    return {
      id: item.id || generateId("worker"),
      fullName: item.fullName || item.name || "",
      phone: item.phone || "",
      role,
      paymentType: item.paymentType || (Number(item.monthlySalary || 0) > 0 ? "aylıq" : "gündəlik"),
      dailyRate: Number(item.dailyRate || 0),
      monthlySalary: Number(item.monthlySalary || 0),
      canLogin: role === "Sahibkar" || item.canLogin === true,
      username: item.username || "",
      password: item.password || "",
      permissions: normalizeWorkerPermissions(role, item.permissions),
      status: item.status || (item.active === false ? "passiv" : "aktiv"),
      note: item.note || ""
    };
  });

  data.salaries = data.salaries.map((item) => ({
    id: item.id || generateId("salary"),
    date: item.date || todayISO(),
    workerId: item.workerId || "",
    workerName: item.workerName || "",
    paymentType: item.paymentType || "gündəlik maaş",
    amount: Number(item.amount || 0),
    workerCount: Number(item.workerCount || item.quantity || 1),
    dailyRate: Number(item.dailyRate || 0),
    workDays: Number(item.workDays || 1),
    currency: item.currency || "AZN",
    period: item.period || "",
    landId: item.landId || "",
    note: item.note || ""
  }));

  data.harvests = data.harvests.map((item) => {
    const rows = Array.isArray(item.rows) && item.rows.length
      ? item.rows
      : Array.isArray(item.items) && item.items.length
        ? item.items
        : item.caliber
          ? [{ caliberId: item.caliberId || "", caliberName: item.caliber, quantityKg: item.quantityKg || item.totalKg || 0, quality: item.quality || "1-ci sort", note: item.note || "" }]
          : [];

    const normalizedRows = rows.map((row) => {
      const caliberName = row.caliberName || getCaliberName(row.caliberId, data) || row.caliber || "Orta";
      return {
        id: row.id || generateId("harvest_row"),
        caliberId: row.caliberId || findCaliberIdByName(caliberName, data),
        caliberName,
        quantityKg: Number(row.quantityKg || row.kg || row.amount || 0),
        quality: row.quality || "1-ci sort",
        note: row.note || ""
      };
    });

    return {
      id: item.id || generateId("harvest"),
      date: item.date || todayISO(),
      landId: item.landId || "",
      greenhouseId: item.greenhouseId || "",
      sortName: item.sortName || item.sort || "Murano",
      responsiblePerson: item.responsiblePerson || item.workerName || item.responsible || "",
      note: item.note || "",
      rows: normalizedRows,
      totalKg: normalizedRows.reduce((sum, row) => sum + Number(row.quantityKg || 0), 0)
    };
  });

  data.stockAdjustments = data.stockAdjustments.map((item) => {
    const caliberName = item.caliberName || getCaliberName(item.caliberId, data) || item.caliber || "Orta";
    return {
      id: item.id || generateId("stock_adjustment"),
      date: item.date || todayISO(),
      caliberId: item.caliberId || findCaliberIdByName(caliberName, data),
      caliberName,
      type: item.type || "əlavə",
      quantityKg: Number(item.quantityKg || item.kg || 0),
      reason: item.reason || "",
      note: item.note || ""
    };
  });

  data.coldStorageEntries = data.coldStorageEntries.map((item) => {
    const rows = normalizeMoneyRows(item.rows || item.items || [], data);
    const totals = calculateMoneyRowsTotals(rows, Number(item.commissionPercent || 0), Number(item.storageCost || 0), Number(item.paidAmount || 0));
    return {
      id: item.id || generateId("cold_storage"),
      date: item.date || todayISO(),
      storageName: item.storageName || item.name || "",
      phone: item.phone || "",
      note: item.note || "",
      rows,
      totalKg: totals.totalKg,
      commissionPercent: Number(item.commissionPercent || 0),
      commissionAmount: Number(item.commissionAmount || totals.commissionAmount),
      storageCost: Number(item.storageCost || 0),
      totalAmount: Number(item.totalAmount || totals.totalAmount),
      netAmount: Number(item.netAmount || totals.netAmount),
      paidAmount: Number(item.paidAmount || 0),
      debtAmount: Number(item.debtAmount || totals.debtAmount),
      currency: item.currency || "AZN",
      status: item.status || deriveColdStatus(Number(item.paidAmount || 0), Number(item.netAmount || totals.netAmount))
    };
  });

  data.customers = data.customers.map((item) => ({
    id: item.id || generateId("customer"),
    name: item.name || item.customerName || "",
    phone: item.phone || "",
    type: item.type || "topdançı",
    address: item.address || "",
    note: item.note || "",
    debt: Number(item.debt || 0)
  })).filter((item) => item.name);

  data.sales = data.sales.map((item) => {
    const rows = normalizeMoneyRows(item.rows || item.items || [], data);
    const totals = calculateMoneyRowsTotals(rows, 0, 0, Number(item.paidAmount || 0));
    return {
      id: item.id || generateId("sale"),
      date: item.date || todayISO(),
      channel: item.channel || item.saleChannel || "Topdançı",
      customerId: item.customerId || "",
      customerName: item.customerName || item.customer || "",
      phone: item.phone || "",
      productSource: item.productSource || "sahədən",
      landId: item.landId || "",
      greenhouseId: item.greenhouseId || "",
      sortName: item.sortName || item.sort || "Murano",
      note: item.note || "",
      rows,
      totalKg: Number(item.totalKg || totals.totalKg),
      totalAmount: Number(item.totalAmount || item.amount || totals.totalAmount),
      paidAmount: Number(item.paidAmount || 0),
      debtAmount: Number(item.debtAmount || Math.max(0, Number(item.totalAmount || item.amount || totals.totalAmount) - Number(item.paidAmount || 0))),
      paymentMethod: item.paymentMethod || "nağd",
      currency: item.currency || "AZN",
      status: item.status || deriveSaleStatus(Number(item.paidAmount || 0), Number(item.totalAmount || item.amount || totals.totalAmount)),
      transportCost: Number(item.transportCost || 0),
      driver: item.driver || ""
    };
  });

  data.debtPayments = data.debtPayments.map((item) => ({
    id: item.id || generateId("debt_payment"),
    date: item.date || todayISO(),
    sourceType: item.sourceType || item.type || "sale",
    sourceId: item.sourceId || "",
    amount: Number(item.amount || 0),
    currency: item.currency || "AZN",
    paymentMethod: item.paymentMethod || "nağd",
    payer: item.payer || "",
    note: item.note || ""
  }));

  data.machines = data.machines.map((item) => ({
    id: item.id || generateId("machine"),
    name: item.name || "Texnika",
    type: item.type || "",
    status: item.status || "şəxsi",
    expenseType: item.expenseType || "digər",
    amount: Number(item.amount || 0),
    currency: item.currency || "AZN",
    date: item.date || todayISO(),
    landId: item.landId || "",
    note: item.note || ""
  }));

  data.expenses = data.expenses.map((item) => ({
    id: item.id || generateId("expense"),
    sourceType: item.sourceType || "manual",
    sourceId: item.sourceId || "",
    sourceKey: item.sourceKey || "",
    isAutoGenerated: item.isAutoGenerated ?? Boolean(item.sourceType && item.sourceType !== "manual"),
    category: item.category || "Digər",
    description: item.description || "",
    amount: Number(item.amount || 0),
    currency: item.currency || "AZN",
    date: item.date || todayISO(),
    paymentMethod: item.paymentMethod || "nağd",
    supplier: item.supplier || "",
    landId: item.landId || "",
    greenhouseId: item.greenhouseId || "",
    machineId: item.machineId || "",
    driver: item.driver || "",
    period: item.period || "",
    objectType: item.objectType || "",
    quantity: Number(item.quantity || 0),
    note: item.note || ""
  }));

  return data;
}

function seedDemoData() {
  if (appData.settings.demoSeeded) return;

  appData.lands.push({
    id: generateId("land"),
    name: "Ümumi sahə",
    type: "qarışıq",
    area: 2.4,
    areaHectare: 2.4,
    areaSot: 240,
    areaInputValue: 2.4,
    areaInputUnit: "hektar",
    rentOwner: "Demo icarə sahibi",
    leaseStartDate: todayISO(),
    leaseEndDate: nextYearISO(),
    annualRent: 1200,
    currency: "AZN",
    location: "Quba rayonu",
    note: "Demo torpaq sahəsi"
  });

  appData.workers.push({
    id: generateId("worker"),
    fullName: "Elvin Məmmədov",
    role: "İşçi",
    phone: "+994 50 000 00 00",
    paymentType: "gündəlik",
    dailyRate: 25,
    monthlySalary: 0,
    status: "aktiv",
    active: true,
    note: "Demo işçi"
  });

  appData.calibers = [
    { id: generateId("caliber"), name: "Murano", type: "sort", note: "Əsas çiyələk sortu" },
    { id: generateId("caliber"), name: "Xırda", type: "caliber", note: "" },
    { id: generateId("caliber"), name: "Orta", type: "caliber", note: "" },
    { id: generateId("caliber"), name: "İri", type: "caliber", note: "" },
    { id: generateId("caliber"), name: "Extra / Premium", type: "caliber", note: "" },
    { id: generateId("caliber"), name: "Emal üçün", type: "caliber", note: "" },
    { id: generateId("caliber"), name: "Zay / yararsız", type: "caliber", note: "" }
  ];

  syncLandExpense(appData.lands[0]);
  appData.settings.demoSeeded = true;
  saveData();
}

function generateId(prefix = "id") {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

function bindGlobalEvents() {
  dom.loginForm?.addEventListener("submit", handleLogin);
  dom.logoutButton?.addEventListener("click", logout);
  dom.modalCloseButton.addEventListener("click", closeModal);
  dom.modalBackdrop.addEventListener("click", (event) => {
    if (event.target === dom.modalBackdrop) closeModal();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeModal();
  });

  dom.mobileMenuButton.addEventListener("click", openMobileMenu);
  dom.mobileOverlay.addEventListener("click", closeMobileMenu);
  dom.mobileQuickActions?.querySelectorAll("[data-quick-action]").forEach((button) => {
    button.addEventListener("click", () => handleQuickAction(button.dataset.quickAction));
  });
  dom.quickBackupButton?.addEventListener("click", createBackup);
  dom.backupFileInput.addEventListener("change", handleBackupUpload);
}

function ensureOwnerAccount() {
  let changed = false;
  let owner = appData.workers.find((worker) => worker.role === "Sahibkar")
    || appData.workers.find((worker) => normalizeLogin(worker.username) === DEFAULT_OWNER_LOGIN);

  if (!owner) {
    owner = {
      id: generateId("worker"),
      fullName: "Sahibkar",
      phone: "",
      role: "Sahibkar",
      paymentType: "aylıq",
      dailyRate: 0,
      monthlySalary: 0,
      canLogin: true,
      username: DEFAULT_OWNER_LOGIN,
      password: DEFAULT_OWNER_PASSWORD,
      permissions: getDefaultWorkerPermissions("Sahibkar"),
      status: "aktiv",
      note: "Sistem administratoru"
    };
    appData.workers.unshift(owner);
    changed = true;
  } else {
    if (owner.role !== "Sahibkar") {
      owner.role = "Sahibkar";
      changed = true;
    }
    if (!owner.fullName) {
      owner.fullName = "Sahibkar";
      changed = true;
    }
    if (owner.paymentType !== "aylıq") {
      owner.paymentType = "aylıq";
      changed = true;
    }
    if (!owner.canLogin) {
      owner.canLogin = true;
      changed = true;
    }
    if (!owner.username) {
      owner.username = DEFAULT_OWNER_LOGIN;
      changed = true;
    }
    if (!owner.password) {
      owner.password = DEFAULT_OWNER_PASSWORD;
      changed = true;
    }
    const ownerPermissions = getDefaultWorkerPermissions("Sahibkar");
    if (JSON.stringify(owner.permissions || {}) !== JSON.stringify(ownerPermissions)) changed = true;
    owner.permissions = ownerPermissions;
  }

  if (changed) saveData();
}

function normalizeLogin(value = "") {
  return String(value).trim().toLocaleLowerCase("az-AZ");
}

function restoreSession() {
  const sessionId = sessionStorage.getItem(SESSION_KEY);
  activeUser = appData.workers.find((worker) => worker.id === sessionId && worker.canLogin && worker.status !== "passiv") || null;
  if (!activeUser) sessionStorage.removeItem(SESSION_KEY);
}

function handleLogin(event) {
  event.preventDefault();
  const username = normalizeLogin(dom.loginUsername?.value || "");
  const password = String(dom.loginPassword?.value || "");
  const worker = appData.workers.find((item) => {
    const loginNames = [
      normalizeLogin(item.username),
      normalizeLogin(item.fullName)
    ].filter(Boolean);
    return item.canLogin
      && item.status !== "passiv"
      && loginNames.includes(username)
      && String(item.password || "") === password;
  });

  if (!worker) {
    showToast("Login və ya parol yanlışdır.", "error");
    return;
  }

  activeUser = worker;
  sessionStorage.setItem(SESSION_KEY, worker.id);
  showAppScreen();
  activeSection = canAccessSection(activeSection) ? activeSection : getFirstAccessibleSection();
  renderNavigation();
  renderApp();
  showToast(`${worker.fullName || worker.username} daxil oldu.`, "success");
}

function logout() {
  sessionStorage.removeItem(SESSION_KEY);
  activeUser = null;
  closeMobileMenu();
  closeModal();
  showLoginScreen();
  showToast("Sistemdən çıxış edildi.", "warning");
}

function showLoginScreen() {
  document.body.classList.add("auth-locked");
  dom.loginScreen?.removeAttribute("hidden");
  dom.appShell?.setAttribute("aria-hidden", "true");
  dom.mobileQuickActions?.setAttribute("aria-hidden", "true");
  if (dom.loginPassword) dom.loginPassword.value = "";
  setTimeout(() => dom.loginUsername?.focus(), 60);
}

function showAppScreen() {
  document.body.classList.remove("auth-locked");
  dom.loginScreen?.setAttribute("hidden", "");
  dom.appShell?.removeAttribute("aria-hidden");
  dom.mobileQuickActions?.removeAttribute("aria-hidden");
}

function refreshActiveUser() {
  if (!activeUser) return;
  const current = appData.workers.find((worker) => worker.id === activeUser.id && worker.canLogin && worker.status !== "passiv");
  if (!current) {
    logout();
    return;
  }
  activeUser = current;
}

function isOwnerUser(user = activeUser) {
  return user?.role === "Sahibkar";
}

function getActivePermissions() {
  return normalizeWorkerPermissions(activeUser?.role, activeUser?.permissions);
}

function userHasPermission(permissionKey) {
  if (!activeUser) return false;
  if (!permissionKey || isOwnerUser()) return true;
  return Boolean(getActivePermissions()[permissionKey]);
}

function canAccessSection(sectionId) {
  if (!activeUser) return false;
  return userHasPermission(sectionPermissionMap[sectionId]);
}

function getFirstAccessibleSection() {
  return menuItems.find((item) => canAccessSection(item.id))?.id || "dashboard";
}

function requirePermission(permissionKey, message = "Bu əməliyyat üçün icazəniz yoxdur.") {
  if (userHasPermission(permissionKey)) return true;
  showToast(message, "error");
  return false;
}

function renderNavigation() {
  const menuById = Object.fromEntries(menuItems.map((item) => [item.id, item]));
  dom.navMenu.innerHTML = menuGroups.map((group) => {
    const allowedItems = group.items.filter((id) => canAccessSection(id));
    if (!allowedItems.length) return "";
    return `
    <div class="nav-group">
      <div class="nav-group-title">${escapeHtml(group.title)}</div>
      ${allowedItems.map((id) => {
        const item = menuById[id];
        if (!item) return "";
        return `
          <button class="nav-item ${item.id === activeSection ? "active" : ""}" type="button" data-section="${item.id}">
            <span class="nav-icon">${iconSvg(item.icon)}</span>
            <span>${item.title}</span>
          </button>
        `;
      }).join("")}
    </div>
  `;
  }).join("");

  dom.navMenu.querySelectorAll(".nav-item").forEach((button) => {
    button.addEventListener("click", () => {
      activeSection = button.dataset.section;
      closeMobileMenu();
      renderApp();
    });
  });
}

function renderApp() {
  refreshActiveUser();
  if (!activeUser) return;
  if (!canAccessSection(activeSection)) activeSection = getFirstAccessibleSection();
  const item = menuItems.find((menuItem) => menuItem.id === activeSection) || menuItems[0];
  document.body.classList.toggle("compact-view", Boolean(appData.settings.compactView));
  document.body.classList.toggle("mobile-card-view", appData.settings.mobileCardView !== false);
  document.body.classList.toggle("dashboard-wide", appData.settings.dashboardMode === "wide");
  dom.pageTitle.textContent = item.title;
  dom.currentSectionEyebrow.textContent = appData.settings.companyName || "AV Systems";
  if (dom.logoutButton) dom.logoutButton.textContent = `${activeUser.fullName || activeUser.username || "İstifadəçi"} · Çıxış`;
  if (dom.ratePill) dom.ratePill.textContent = `1 USD = ${Number(appData.settings.usdRate || 0).toFixed(2)} AZN`;
  dom.sidebarSeason.textContent = appData.settings.seasonName || "Mövsüm";
  renderLogo();
  renderNavigation();

  const renderSection = sectionRenderers[activeSection];
  if (renderSection) renderSection();
  else renderEmptySection(item.title);
  updateQuickActions();
  labelTablesForMobile();
  enhanceActionButtonIcons();
  applyPermissionVisibility();
}

function enhanceActionButtonIcons() {
  dom.contentArea.querySelectorAll(".data-actions .small-button").forEach((button) => {
    if (button.classList.contains("has-action-icon")) return;
    const iconName = getActionIconName(button);
    if (!iconName) return;
    button.insertAdjacentHTML("afterbegin", `<span class="action-icon">${iconSvg(iconName)}</span>`);
    button.classList.add("has-action-icon");
  });
}

function getActionIconName(button) {
  const keys = Object.keys(button.dataset);
  if (keys.some((key) => key.startsWith("detail"))) return "info";
  if (keys.some((key) => key.startsWith("edit"))) return "edit";
  if (keys.some((key) => key.startsWith("delete"))) return "trash";
  if (keys.some((key) => key.startsWith("pay") || key.startsWith("full"))) return "salary";
  if (keys.some((key) => key.startsWith("history"))) return "history";
  if (keys.some((key) => key.startsWith("open"))) return "external";
  return "";
}

function applyPermissionVisibility(root = dom.contentArea) {
  if (!root || isOwnerUser()) return;
  root.querySelectorAll("button").forEach((button) => {
    const keys = Object.keys(button.dataset);
    let permission = "";

    if (button.id === "addWorkerPageButton" || keys.some((key) => key.includes("Worker"))) {
      permission = keys.some((key) => key.startsWith("delete")) ? "deleteWorkers" : "manageWorkers";
    } else if (button.id?.startsWith("add")) {
      permission = activeSection === "settings" ? "manageSettings" : "addData";
    } else if (keys.some((key) => key.startsWith("delete"))) {
      permission = "deleteData";
    } else if (keys.some((key) => key.startsWith("edit"))) {
      permission = "editData";
    } else if (keys.some((key) => key.startsWith("pay") || key.startsWith("full"))) {
      permission = "addData";
    }

    if (permission && !userHasPermission(permission)) button.hidden = true;
  });
}

function labelTablesForMobile() {
  dom.contentArea.querySelectorAll("table").forEach((table) => {
    const headers = [...table.querySelectorAll("thead th")].map((cell) => cell.textContent.trim());
    table.classList.add("responsive-table-enhanced");
    table.querySelectorAll("tbody tr").forEach((row) => {
      const cells = [...row.children];
      if (!row.querySelector(".empty-cell") && cells.length) {
        row.dataset.cardTitle = cells[0]?.innerText.trim() || "";
        row.dataset.cardMeta = cells[2]?.innerText.trim() || cells[1]?.innerText.trim() || "";
      }
      cells.forEach((cell, index) => {
        if (headers[index]) cell.dataset.label = headers[index];
      });
    });
  });
}

function updateQuickActions() {
  if (!dom.mobileQuickActions) return;
  const activeMap = {
    dashboard: activeSection === "dashboard",
    harvest: activeSection === "harvests",
    sale: activeSection === "sales",
    expense: activeSection === "expenses"
  };
  dom.mobileQuickActions.querySelectorAll("[data-quick-action]").forEach((button) => {
    const sectionId = quickActionSections[button.dataset.quickAction];
    button.hidden = sectionId ? !canAccessSection(sectionId) : false;
    button.classList.toggle("active", Boolean(activeMap[button.dataset.quickAction]));
  });
}

function handleQuickAction(action) {
  closeMobileMenu();
  const targetSection = quickActionSections[action];
  if (targetSection && !canAccessSection(targetSection)) {
    showToast("Bu bölmə üçün icazəniz yoxdur.", "error");
    return;
  }
  if (action === "dashboard") {
    activeSection = "dashboard";
    renderApp();
    return;
  }
  if (action === "harvest") {
    activeSection = "harvests";
    renderApp();
    openHarvestModal();
    return;
  }
  if (action === "sale") {
    activeSection = "sales";
    renderApp();
    openSaleModal();
    return;
  }
  if (action === "expense") {
    activeSection = "expenses";
    renderApp();
    openExpenseModal();
  }
}

function renderLogo() {
  const logo = appData.settings.logo;
  if (logo) {
    dom.sidebarLogo.innerHTML = `<img src="${logo}" alt="AV Systems logosu">`;
  } else {
    dom.sidebarLogo.textContent = "AV";
  }
}

function renderDashboard() {
  const periodMetrics = getPeriodMainMetrics();
  const metrics = getPrimaryDashboardMetrics(periodMetrics);
  const detailMetrics = getDashboardMetrics();
  const wideDashboard = appData.settings.dashboardMode === "wide";
  dom.contentArea.innerHTML = `
    ${renderPeriodControls("dashboard")}
    <section class="panel dashboard-intro">
      <div class="section-title">
        <div>
          <h2>Qısa icmal</h2>
          <p class="muted">${escapeHtml(getPeriodLabel())}</p>
        </div>
      </div>
      <div class="dashboard-grid primary-dashboard-grid">
        ${metrics.map((metric) => `
        <article class="metric-card">
          <div class="metric-top">
            <div class="metric-title">${metric.title}</div>
            <div class="metric-icon">${iconSvg(metric.icon)}</div>
          </div>
          <div>
            <div class="metric-value">${metric.value}</div>
            <div class="metric-note">${metric.note}</div>
          </div>
        </article>
        `).join("")}
      </div>
    </section>

    ${renderDashboardSection("Maliyyə", `
      <div class="summary-grid analytics-summary-grid">
        ${summaryCard("Faktiki daxil olan pul", formatMoney(periodMetrics.cashIn), "Ödənilən satış + soyuducu")}
        ${summaryCard("Ümumi xərc", formatMoney(periodMetrics.expenses), "Dövr üzrə xərclər")}
        ${summaryCard("Kassa mənfəəti", formatMoney(periodMetrics.cashProfit), "Faktiki pul - faktiki xərc")}
        ${summaryCard("Potensial mənfəət", formatMoney(periodMetrics.potentialProfit), "Bütün satış - bütün xərc")}
        ${summaryCard("Orta satış qiyməti", formatMoney(periodMetrics.avgPrice), "Ümumi satış / satılan kg")}
        ${summaryCard("Ən böyük xərc kateqoriyası", periodMetrics.topExpenseCategory.name, formatMoney(periodMetrics.topExpenseCategory.amount))}
      </div>
    `, true)}

    ${renderDashboardSection("Məhsul", `
      <div class="summary-grid analytics-summary-grid">
        ${summaryCard("Ümumi məhsul, kg", `${periodMetrics.harvestKg.toLocaleString("az-AZ")} kg`, "Toplanan məhsul")}
        ${summaryCard("Ən çox satılan kalibr", periodMetrics.topSoldCaliber.name, `${periodMetrics.topSoldCaliber.kg.toLocaleString("az-AZ")} kg`)}
        ${summaryCard("Ən gəlirli kalibr", periodMetrics.topRevenueCaliber.name, formatMoney(periodMetrics.topRevenueCaliber.revenue))}
        ${summaryCard("Ən yaxşı satış kanalı", periodMetrics.topChannel.name, formatMoney(periodMetrics.topChannel.revenue))}
      </div>
      ${renderCaliberStockBlock()}
    `, wideDashboard)}

    ${renderDashboardSection("Borclar", `
      <div class="summary-grid analytics-summary-grid">
        ${summaryCard("Müştəri borcları", formatMoney(periodMetrics.customerDebt), "Qalan satış borcu")}
        ${summaryCard("Soyuducu/anbar borcu", formatMoney(periodMetrics.coldDebt), "Qalan soyuducu borcu")}
      </div>
    `, wideDashboard)}

    ${renderDashboardSection("Son əməliyyatlar", renderRecentOperations(), true)}

    ${wideDashboard ? renderDashboardSection("Geniş göstəricilər", `
      <div class="dashboard-grid compact-grid">
        ${detailMetrics.map((metric) => summaryCard(metric.title, metric.value, metric.note)).join("")}
      </div>
    `, true) : ""}
  `;

  bindPeriodControls("dashboard");
}

function getPrimaryDashboardMetrics(periodMetrics = getPeriodMainMetrics()) {
  const stockKg = getCaliberStockSummaries().reduce((sum, item) => sum + Number(item.remaining || 0), 0);
  const monthKey = todayISO().slice(0, 7);
  const monthSales = appData.sales
    .filter((sale) => String(sale.date || "").startsWith(monthKey))
    .reduce((sum, sale) => sum + convertToAZN(sale.totalAmount || 0, sale.currency || "AZN"), 0);

  return [
    { title: "Kassa mənfəəti", value: formatMoney(periodMetrics.cashProfit), note: "Faktiki pul - faktiki xərc", icon: "profit" },
    { title: "Ümumi gəlir", value: formatMoney(periodMetrics.salesTotal), note: "Seçilən dövr üzrə satış", icon: "income" },
    { title: "Ümumi xərclər", value: formatMoney(periodMetrics.expenses), note: "Manual və avtomatik xərclər", icon: "expenses" },
    { title: "Məhsul qalığı", value: `${stockKg.toLocaleString("az-AZ")} kg`, note: "Kalibrlər üzrə anbar qalığı", icon: "stock" },
    { title: "Müştəri borcları", value: formatMoney(periodMetrics.customerDebt), note: "Satışlardan qalan borc", icon: "debts" },
    { title: "Bu ay satış", value: formatMoney(monthSales), note: "Cari ay üzrə ümumi satış", icon: "sales" }
  ];
}

function renderDashboardSection(title, content, open = false) {
  return `
    <details class="dashboard-section" ${open ? "open" : ""}>
      <summary>
        <span>${title}</span>
        <span class="dashboard-section-icon">+</span>
      </summary>
      <div class="dashboard-section-body">${content}</div>
    </details>
  `;
}

function renderRecentOperations() {
  const operations = [
    ...appData.sales.map((sale) => ({ date: sale.date, title: "Satış", text: sale.customerName || sale.channel, amount: formatMoney(sale.totalAmount || 0, sale.currency) })),
    ...appData.expenses.map((expense) => ({ date: expense.date, title: "Xərc", text: expense.category, amount: formatMoney(expense.amount || 0, expense.currency) })),
    ...appData.harvests.map((harvest) => ({ date: harvest.date, title: "Məhsul", text: harvest.sortName, amount: `${Number(harvest.totalKg || 0).toLocaleString("az-AZ")} kg` })),
    ...appData.salaries.map((salary) => ({ date: salary.date, title: "Maaş", text: getSalaryWorkerLabel(salary), amount: formatMoney(salary.amount || 0, salary.currency) })),
    ...appData.coldStorageEntries.map((entry) => ({ date: entry.date, title: "Soyuducu / Anbar", text: entry.storageName, amount: formatMoney(entry.netAmount || 0, entry.currency) }))
  ].filter((item) => item.date)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .slice(0, 8);

  if (!operations.length) return `<p class="muted">Boş məlumat yoxdur.</p>`;

  return `
    <div class="mini-list recent-list">
      ${operations.map((item) => `
        <div class="mini-row">
          <div>
            <strong>${escapeHtml(item.title)}</strong>
            <span class="muted">${formatDate(item.date)} · ${escapeHtml(item.text || "-")}</span>
          </div>
          <strong>${escapeHtml(item.amount)}</strong>
        </div>
      `).join("")}
    </div>
  `;
}

function getDashboardMetrics() {
  const totalExpenses = sumExpenses();
  const seedlingExpenses = sumExpensesByCategory("Fidanlar");
  const landRentExpenses = sumExpensesByCategory("Torpaq icarəsi");
  const greenhouseExpenses = sumExpensesBySource("greenhouse");
  const machineExpenses = sumExpensesByCategory("Texnika");
  const salaryExpenses = sumExpensesByCategory("Maaşlar");
  const dailySalaryExpenses = sumSalariesByType("gündəlik maaş");
  const monthlySalaryExpenses = sumSalariesByType("aylıq maaş");
  const bonusExpenses = sumSalariesByType("bonus");
  const overtimeExpenses = sumSalariesByType("overtime");
  const topCategory = getTopExpenseCategory();
  const totalSales = sumSalesTotal();
  const actualCashIn = sumSalesPaid() + sumColdPaid();
  const customerDebt = sumCustomerDebt();
  const coldDebt = sumColdDebt();
  const soldKg = sumSoldKg();
  const channelText = getSalesChannelStatsText();
  const totalIncome = totalSales;
  const cashProfit = totalIncome - totalExpenses;

  return [
    { title: "Ümumi satış", value: formatMoney(totalSales), note: "Satış sənədləri üzrə", icon: "Sa" },
    { title: "Faktiki daxil olan pul", value: formatMoney(actualCashIn), note: "Satış və soyuducu ödənişləri", icon: "₼" },
    { title: "Müştəri borcları", value: formatMoney(customerDebt), note: "Ödənməmiş satış qalıqları", icon: "Mü" },
    { title: "Soyuducu/anbar borcu", value: formatMoney(coldDebt), note: "Soyuducu qalıq borcları", icon: "S" },
    { title: "Ümumi satılan kg", value: `${soldKg.toLocaleString("az-AZ")} kg`, note: "Bütün satış sətirləri", icon: "Kg" },
    { title: "Satış kanalları", value: channelText.value, note: channelText.note, icon: "K" },
    { title: "Aktiv işçilər", value: appData.workers.filter((worker) => worker.status === "aktiv").length, note: "Hazırda aktiv işçilər", icon: "İş" },
    { title: "Maaş xərcləri", value: formatMoney(salaryExpenses), note: "Bütün maaş ödənişləri", icon: "M" },
    { title: "Gündəlik maaşlar", value: formatMoney(dailySalaryExpenses), note: "Gündəlik ödənişlər", icon: "G" },
    { title: "Aylıq maaşlar", value: formatMoney(monthlySalaryExpenses), note: "Aylıq ödənişlər", icon: "A" },
    { title: "Bonuslar", value: formatMoney(bonusExpenses), note: "Bonus ödənişləri", icon: "B" },
    { title: "Overtime", value: formatMoney(overtimeExpenses), note: "Əlavə iş saatı ödənişi", icon: "O" },
    { title: "Ümumi xərclər", value: formatMoney(totalExpenses), note: "Bütün avtomatik və manual xərclər", icon: "X" },
    { title: "Ən böyük xərc kateqoriyası", value: topCategory.name, note: formatMoney(topCategory.amount), icon: "Ə" },
    { title: "Sahələrin sayı", value: appData.lands.length, note: `İcarə: ${formatMoney(landRentExpenses)}`, icon: "S" },
    { title: "İstixanaların sayı", value: appData.greenhouses.length, note: `Xərc: ${formatMoney(greenhouseExpenses)}`, icon: "İs" },
    { title: "Fidan xərcləri", value: formatMoney(seedlingExpenses), note: "Fidan alışlarından", icon: "F" },
    { title: "Texnika xərcləri", value: formatMoney(machineExpenses), note: `Kassa mənfəəti: ${formatMoney(cashProfit)}`, icon: "Te" }
  ];
}

function renderLandsPage() {
  dom.contentArea.innerHTML = `
    ${moduleHeader("Torpaq və sahələr", "İcarə məlumatları, ölçü, qalan gün və bağlı xərclər.", "Sahə əlavə et", "addLandPageButton")}
    <section class="table-card module-card">
      <div class="filter-row">
        <div class="field">
          <label for="landSearch">Axtarış</label>
          <input id="landSearch" placeholder="Sahə adı, icarə sahibi və ya qeyd">
        </div>
        <div class="field">
          <label for="landTypeFilter">Filtr</label>
          <select id="landTypeFilter">
            <option value="">Bütün tiplər</option>
            ${optionsHtml(landTypes)}
          </select>
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Sahə adı</th>
              <th>Tip</th>
              <th>Ölçü</th>
              <th>İcarə sahibi</th>
              <th>İcarə bitmə tarixi</th>
              <th>İllik icarə</th>
              <th>Qalan gün</th>
              <th>Qeyd</th>
              <th>Əməliyyatlar</th>
            </tr>
          </thead>
          <tbody id="landsTableBody"></tbody>
        </table>
      </div>
    </section>
  `;

  document.getElementById("addLandPageButton").addEventListener("click", () => openLandModal());
  document.getElementById("landSearch").addEventListener("input", renderLandsTable);
  document.getElementById("landTypeFilter").addEventListener("change", renderLandsTable);
  renderLandsTable();
}

function renderLandsTable() {
  const body = document.getElementById("landsTableBody");
  if (!body) return;

  const search = normalizeSearch(document.getElementById("landSearch")?.value || "");
  const typeFilter = document.getElementById("landTypeFilter")?.value || "";
  const rows = appData.lands.filter((land) => {
    const matchesType = !typeFilter || land.type === typeFilter;
    const haystack = normalizeSearch(`${land.name} ${land.rentOwner} ${land.note} ${land.location}`);
    return matchesType && haystack.includes(search);
  });

  body.innerHTML = rows.length ? rows.map((land) => `
    <tr>
      <td><strong>${escapeHtml(land.name)}</strong></td>
      <td>${escapeHtml(land.type)}</td>
      <td>${formatLandArea(land)}</td>
      <td>${escapeHtml(land.rentOwner || "-")}</td>
      <td>${formatDate(land.leaseEndDate) || "-"}</td>
      <td>${formatMoney(land.annualRent || 0, land.currency || "AZN")}</td>
      <td>${formatRemainingDays(land.leaseEndDate)}</td>
      <td>${escapeHtml(land.note || "-")}</td>
      <td>
        <div class="data-actions">
          <button class="small-button" type="button" data-edit-land="${land.id}">Redaktə et</button>
          <button class="small-button danger" type="button" data-delete-land="${land.id}">Sil</button>
        </div>
      </td>
    </tr>
  `).join("") : emptyTableRow(9, "Sahə tapılmadı.");

  body.querySelectorAll("[data-edit-land]").forEach((button) => {
    button.addEventListener("click", () => openLandModal(button.dataset.editLand));
  });
  body.querySelectorAll("[data-delete-land]").forEach((button) => {
    button.addEventListener("click", () => confirmDelete("Sahəni silmək istəyirsiniz?", () => deleteLand(button.dataset.deleteLand)));
  });
}

function renderGreenhousesPage() {
  dom.contentArea.innerHTML = `
    ${moduleHeader("İstixanalar", "İstixana ölçüsü, statusu və bütün tikinti/təmir xərcləri.", "İstixana əlavə et", "addGreenhouseButton")}
    <section class="table-card module-card">
      <div class="filter-row">
        <div class="field">
          <label for="greenhouseSearch">Axtarış</label>
          <input id="greenhouseSearch" placeholder="İstixana adı, sahə və ya qeyd">
        </div>
        <div class="field">
          <label for="greenhouseStatusFilter">Status</label>
          <select id="greenhouseStatusFilter">
            <option value="">Bütün statuslar</option>
            ${optionsHtml(greenhouseStatuses)}
          </select>
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>İstixana adı</th>
              <th>Sahə</th>
              <th>Ölçü</th>
              <th>Status</th>
              <th>Ümumi xərc</th>
              <th>Qeyd</th>
              <th>Əməliyyatlar</th>
            </tr>
          </thead>
          <tbody id="greenhousesTableBody"></tbody>
        </table>
      </div>
    </section>
  `;

  document.getElementById("addGreenhouseButton").addEventListener("click", () => openGreenhouseModal());
  document.getElementById("greenhouseSearch").addEventListener("input", renderGreenhousesTable);
  document.getElementById("greenhouseStatusFilter").addEventListener("change", renderGreenhousesTable);
  renderGreenhousesTable();
}

function renderGreenhousesTable() {
  const body = document.getElementById("greenhousesTableBody");
  if (!body) return;

  const search = normalizeSearch(document.getElementById("greenhouseSearch")?.value || "");
  const statusFilter = document.getElementById("greenhouseStatusFilter")?.value || "";
  const rows = appData.greenhouses.filter((item) => {
    const landName = getLandName(item.landId);
    const haystack = normalizeSearch(`${item.name} ${landName} ${item.note}`);
    return (!statusFilter || item.status === statusFilter) && haystack.includes(search);
  });

  body.innerHTML = rows.length ? rows.map((item) => `
    <tr>
      <td><strong>${escapeHtml(item.name)}</strong></td>
      <td>${escapeHtml(getLandName(item.landId))}</td>
      <td>${Number(item.size || 0).toLocaleString("az-AZ")}</td>
      <td><span class="badge">${escapeHtml(item.status)}</span></td>
      <td>${formatMoney(getGreenhouseTotal(item), item.currency)}</td>
      <td>${escapeHtml(item.note || "-")}</td>
      <td>
        <div class="data-actions">
          <button class="small-button" type="button" data-edit-greenhouse="${item.id}">Redaktə et</button>
          <button class="small-button danger" type="button" data-delete-greenhouse="${item.id}">Sil</button>
        </div>
      </td>
    </tr>
  `).join("") : emptyTableRow(7, "İstixana tapılmadı.");

  body.querySelectorAll("[data-edit-greenhouse]").forEach((button) => {
    button.addEventListener("click", () => openGreenhouseModal(button.dataset.editGreenhouse));
  });
  body.querySelectorAll("[data-delete-greenhouse]").forEach((button) => {
    button.addEventListener("click", () => confirmDelete("İstixananı silmək istəyirsiniz?", () => deleteGreenhouse(button.dataset.deleteGreenhouse)));
  });
}

function renderSeedlingsPage() {
  dom.contentArea.innerHTML = `
    ${moduleHeader("Fidanlar", "Murano əsas sortdur; digər sortları əl ilə daxil etmək olar.", "Fidan əlavə et", "addSeedlingButton")}
    <section class="table-card module-card">
      <div class="filter-row">
        <div class="field">
          <label for="seedlingSearch">Axtarış</label>
          <input id="seedlingSearch" placeholder="Sort, təchizatçı, sahə və ya qeyd">
        </div>
        <div class="field">
          <label for="seedlingSortFilter">Sort</label>
          <select id="seedlingSortFilter">
            <option value="">Bütün sortlar</option>
            ${getSortNames().map((sort) => `<option value="${escapeHtml(sort)}">${escapeHtml(sort)}</option>`).join("")}
          </select>
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Tarix</th>
              <th>Sort</th>
              <th>Miqdar</th>
              <th>Qiymət</th>
              <th>Ümumi məbləğ</th>
              <th>Sahə</th>
              <th>Təchizatçı</th>
              <th>Tutmayan fidan</th>
              <th>Əməliyyatlar</th>
            </tr>
          </thead>
          <tbody id="seedlingsTableBody"></tbody>
        </table>
      </div>
    </section>
  `;

  document.getElementById("addSeedlingButton").addEventListener("click", () => openSeedlingModal());
  document.getElementById("seedlingSearch").addEventListener("input", renderSeedlingsTable);
  document.getElementById("seedlingSortFilter").addEventListener("change", renderSeedlingsTable);
  renderSeedlingsTable();
}

function renderSeedlingsTable() {
  const body = document.getElementById("seedlingsTableBody");
  if (!body) return;

  const search = normalizeSearch(document.getElementById("seedlingSearch")?.value || "");
  const sortFilter = document.getElementById("seedlingSortFilter")?.value || "";
  const rows = appData.seedlings.filter((item) => {
    const landName = getLandName(item.landId);
    const haystack = normalizeSearch(`${item.sortName} ${item.supplier} ${landName} ${item.note}`);
    return (!sortFilter || item.sortName === sortFilter) && haystack.includes(search);
  });

  body.innerHTML = rows.length ? rows.map((item) => `
    <tr>
      <td>${formatDate(item.date)}</td>
      <td><strong>${escapeHtml(item.sortName)}</strong></td>
      <td>${Number(item.quantity || 0).toLocaleString("az-AZ")} ədəd</td>
      <td>${formatMoney(item.unitPrice || 0, item.currency)}</td>
      <td>${formatMoney(item.totalAmount || 0, item.currency)}</td>
      <td>${escapeHtml(getLandName(item.landId))}</td>
      <td>${escapeHtml(item.supplier || "-")}</td>
      <td>${Number(item.lostCount || 0).toLocaleString("az-AZ")}</td>
      <td>
        <div class="data-actions">
          <button class="small-button" type="button" data-edit-seedling="${item.id}">Redaktə et</button>
          <button class="small-button danger" type="button" data-delete-seedling="${item.id}">Sil</button>
        </div>
      </td>
    </tr>
  `).join("") : emptyTableRow(9, "Fidan qeydi tapılmadı.");

  body.querySelectorAll("[data-edit-seedling]").forEach((button) => {
    button.addEventListener("click", () => openSeedlingModal(button.dataset.editSeedling));
  });
  body.querySelectorAll("[data-delete-seedling]").forEach((button) => {
    button.addEventListener("click", () => confirmDelete("Fidan qeydini silmək istəyirsiniz?", () => deleteSeedling(button.dataset.deleteSeedling)));
  });
}

function renderMachinesPage() {
  dom.contentArea.innerHTML = `
    ${moduleHeader("Texnika", "Texnika, icarə, təmir, yanacaq və servis xərcləri üçün çevik qeydiyyat.", "Texnika əlavə et", "addMachineButton")}
    <section class="table-card module-card">
      <div class="filter-row">
        <div class="field">
          <label for="machineSearch">Axtarış</label>
          <input id="machineSearch" placeholder="Texnika adı, tip, sahə və ya qeyd">
        </div>
        <div class="field">
          <label for="machineStatusFilter">Status</label>
          <select id="machineStatusFilter">
            <option value="">Bütün statuslar</option>
            ${optionsHtml(machineStatuses)}
          </select>
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Texnika adı</th>
              <th>Tip</th>
              <th>Status</th>
              <th>Xərc növü</th>
              <th>Məbləğ</th>
              <th>Tarix</th>
              <th>Sahə</th>
              <th>Qeyd</th>
              <th>Əməliyyatlar</th>
            </tr>
          </thead>
          <tbody id="machinesTableBody"></tbody>
        </table>
      </div>
    </section>
  `;

  document.getElementById("addMachineButton").addEventListener("click", () => openMachineModal());
  document.getElementById("machineSearch").addEventListener("input", renderMachinesTable);
  document.getElementById("machineStatusFilter").addEventListener("change", renderMachinesTable);
  renderMachinesTable();
}

function renderMachinesTable() {
  const body = document.getElementById("machinesTableBody");
  if (!body) return;

  const search = normalizeSearch(document.getElementById("machineSearch")?.value || "");
  const statusFilter = document.getElementById("machineStatusFilter")?.value || "";
  const rows = appData.machines.filter((item) => {
    const landName = getLandName(item.landId);
    const haystack = normalizeSearch(`${item.name} ${item.type} ${item.expenseType} ${landName} ${item.note}`);
    return (!statusFilter || item.status === statusFilter) && haystack.includes(search);
  });

  body.innerHTML = rows.length ? rows.map((item) => `
    <tr>
      <td><strong>${escapeHtml(item.name)}</strong></td>
      <td>${escapeHtml(item.type || "-")}</td>
      <td><span class="badge">${escapeHtml(item.status)}</span></td>
      <td>${escapeHtml(item.expenseType)}</td>
      <td>${formatMoney(item.amount || 0, item.currency)}</td>
      <td>${formatDate(item.date)}</td>
      <td>${escapeHtml(getLandName(item.landId))}</td>
      <td>${escapeHtml(item.note || "-")}</td>
      <td>
        <div class="data-actions">
          <button class="small-button" type="button" data-edit-machine="${item.id}">Redaktə et</button>
          <button class="small-button danger" type="button" data-delete-machine="${item.id}">Sil</button>
        </div>
      </td>
    </tr>
  `).join("") : emptyTableRow(9, "Texnika qeydi tapılmadı.");

  body.querySelectorAll("[data-edit-machine]").forEach((button) => {
    button.addEventListener("click", () => openMachineModal(button.dataset.editMachine));
  });
  body.querySelectorAll("[data-delete-machine]").forEach((button) => {
    button.addEventListener("click", () => confirmDelete("Texnika qeydini silmək istəyirsiniz?", () => deleteMachine(button.dataset.deleteMachine)));
  });
}

function renderHarvestsPage() {
  dom.contentArea.innerHTML = `
    ${moduleHeader("Məhsul yığımı", "Partiya daxilində bir neçə kalibr, keyfiyyət və kg miqdarı ilə məhsul qeydiyyatı.", "Məhsul partiyası əlavə et", "addHarvestButton")}
    ${renderCaliberStockBlock()}
    <section class="table-card module-card">
      <div class="filter-row harvests">
        <div class="field">
          <label for="harvestSearch">Axtarış</label>
          <input id="harvestSearch" placeholder="Sort, məsul şəxs və ya qeyd">
        </div>
        <div class="field">
          <label for="harvestDateFilter">Tarix</label>
          <input id="harvestDateFilter" type="date">
        </div>
        <div class="field">
          <label for="harvestLandFilter">Sahə</label>
          <select id="harvestLandFilter">
            <option value="">Bütün sahələr</option>
            ${landOptions()}
          </select>
        </div>
        <div class="field">
          <label for="harvestGreenhouseFilter">İstixana</label>
          <select id="harvestGreenhouseFilter">${greenhouseOptions()}</select>
        </div>
        <div class="field">
          <label for="harvestSortFilter">Sort</label>
          <select id="harvestSortFilter">
            <option value="">Bütün sortlar</option>
            ${getSortNames().map((sort) => `<option value="${escapeHtml(sort)}">${escapeHtml(sort)}</option>`).join("")}
          </select>
        </div>
        <div class="field">
          <label for="harvestCaliberFilter">Kalibr</label>
          <select id="harvestCaliberFilter">
            <option value="">Bütün kalibrlər</option>
            ${caliberOptions()}
          </select>
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Tarix</th>
              <th>Sahə</th>
              <th>İstixana</th>
              <th>Sort</th>
              <th>Kalibrlər üzrə miqdar</th>
              <th>Ümumi kg</th>
              <th>Məsul şəxs</th>
              <th>Qeyd</th>
              <th>Əməliyyatlar</th>
            </tr>
          </thead>
          <tbody id="harvestsTableBody"></tbody>
        </table>
      </div>
    </section>

    <section class="table-card module-card stock-adjustment-card">
      <div class="section-title">
        <div>
          <h2>Sklad düzəlişləri</h2>
          <p class="muted">Əlavə, silinmə və səbəb üzrə manual qalıq düzəlişi.</p>
        </div>
        <button class="secondary-button" id="addStockAdjustmentButton" type="button">Düzəliş əlavə et</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Tarix</th>
              <th>Kalibr</th>
              <th>Tip</th>
              <th>Miqdar, kg</th>
              <th>Səbəb</th>
              <th>Qeyd</th>
              <th>Əməliyyatlar</th>
            </tr>
          </thead>
          <tbody id="stockAdjustmentsTableBody"></tbody>
        </table>
      </div>
    </section>
  `;

  document.getElementById("addHarvestButton").addEventListener("click", () => openHarvestModal());
  document.getElementById("addStockAdjustmentButton").addEventListener("click", () => openStockAdjustmentModal());
  ["harvestSearch", "harvestDateFilter", "harvestLandFilter", "harvestGreenhouseFilter", "harvestSortFilter", "harvestCaliberFilter"].forEach((idValue) => {
    const element = document.getElementById(idValue);
    element.addEventListener(element.tagName === "INPUT" && element.type === "text" ? "input" : "change", renderHarvestsTable);
  });
  renderHarvestsTable();
  renderStockAdjustmentsTable();
}

function renderHarvestsTable() {
  const body = document.getElementById("harvestsTableBody");
  if (!body) return;

  const search = normalizeSearch(document.getElementById("harvestSearch")?.value || "");
  const dateFilter = document.getElementById("harvestDateFilter")?.value || "";
  const landFilter = document.getElementById("harvestLandFilter")?.value || "";
  const greenhouseFilter = document.getElementById("harvestGreenhouseFilter")?.value || "";
  const sortFilter = document.getElementById("harvestSortFilter")?.value || "";
  const caliberFilter = document.getElementById("harvestCaliberFilter")?.value || "";

  const rows = appData.harvests.filter((harvest) => {
    const haystack = normalizeSearch(`${harvest.sortName} ${harvest.responsiblePerson} ${harvest.note} ${getLandName(harvest.landId)} ${getGreenhouseName(harvest.greenhouseId)}`);
    const hasCaliber = !caliberFilter || harvest.rows.some((row) => row.caliberId === caliberFilter || row.caliberName === getCaliberName(caliberFilter));
    return haystack.includes(search)
      && (!dateFilter || harvest.date === dateFilter)
      && (!landFilter || harvest.landId === landFilter)
      && (!greenhouseFilter || harvest.greenhouseId === greenhouseFilter)
      && (!sortFilter || harvest.sortName === sortFilter)
      && hasCaliber;
  });

  body.innerHTML = rows.length ? rows.map((harvest) => `
    <tr>
      <td>${formatDate(harvest.date)}</td>
      <td>${escapeHtml(getLandName(harvest.landId))}</td>
      <td>${escapeHtml(getGreenhouseName(harvest.greenhouseId))}</td>
      <td><strong>${escapeHtml(harvest.sortName)}</strong></td>
      <td>${formatHarvestRowsSummary(harvest.rows)}</td>
      <td>${Number(harvest.totalKg || 0).toLocaleString("az-AZ")} kg</td>
      <td>${escapeHtml(harvest.responsiblePerson || "-")}</td>
      <td>${escapeHtml(harvest.note || "-")}</td>
      <td>
        <div class="data-actions">
          <button class="small-button" type="button" data-edit-harvest="${harvest.id}">Redaktə et</button>
          <button class="small-button danger" type="button" data-delete-harvest="${harvest.id}">Sil</button>
        </div>
      </td>
    </tr>
  `).join("") : emptyTableRow(9, "Məhsul partiyası tapılmadı.");

  body.querySelectorAll("[data-edit-harvest]").forEach((button) => {
    button.addEventListener("click", () => openHarvestModal(button.dataset.editHarvest));
  });
  body.querySelectorAll("[data-delete-harvest]").forEach((button) => {
    button.addEventListener("click", () => confirmDelete("Məhsul partiyasını silmək istəyirsiniz?", () => deleteHarvest(button.dataset.deleteHarvest)));
  });
}

function renderStockAdjustmentsTable() {
  const body = document.getElementById("stockAdjustmentsTableBody");
  if (!body) return;

  body.innerHTML = appData.stockAdjustments.length ? appData.stockAdjustments.map((item) => `
    <tr>
      <td>${formatDate(item.date)}</td>
      <td><strong>${escapeHtml(item.caliberName || getCaliberName(item.caliberId))}</strong></td>
      <td><span class="badge">${escapeHtml(item.type)}</span></td>
      <td>${Number(item.quantityKg || 0).toLocaleString("az-AZ")} kg</td>
      <td>${escapeHtml(item.reason || "-")}</td>
      <td>${escapeHtml(item.note || "-")}</td>
      <td>
        <div class="data-actions">
          <button class="small-button" type="button" data-edit-adjustment="${item.id}">Redaktə et</button>
          <button class="small-button danger" type="button" data-delete-adjustment="${item.id}">Sil</button>
        </div>
      </td>
    </tr>
  `).join("") : emptyTableRow(7, "Sklad düzəlişi yoxdur.");

  body.querySelectorAll("[data-edit-adjustment]").forEach((button) => {
    button.addEventListener("click", () => openStockAdjustmentModal(button.dataset.editAdjustment));
  });
  body.querySelectorAll("[data-delete-adjustment]").forEach((button) => {
    button.addEventListener("click", () => confirmDelete("Sklad düzəlişini silmək istəyirsiniz?", () => deleteStockAdjustment(button.dataset.deleteAdjustment)));
  });
}

function renderColdStoragePage() {
  dom.contentArea.innerHTML = `
    ${moduleHeader("Soyuducu / Anbar", "Kalibr üzrə təhvil, komissiya, saxlama xərci və borc izləmə.", "Soyuducu qeydi əlavə et", "addColdStorageButton")}
    <section class="table-card module-card">
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Tarix</th>
              <th>Soyuducu / anbar</th>
              <th>Kalibrlər</th>
              <th>Ümumi kg</th>
              <th>Ümumi məbləğ</th>
              <th>Xalis məbləğ</th>
              <th>Ödənilib</th>
              <th>Qalan borc</th>
              <th>Status</th>
              <th>Əməliyyatlar</th>
            </tr>
          </thead>
          <tbody id="coldStorageTableBody"></tbody>
        </table>
      </div>
    </section>
  `;
  document.getElementById("addColdStorageButton").addEventListener("click", () => openColdStorageModal());
  renderColdStorageTable();
}

function renderColdStorageTable() {
  const body = document.getElementById("coldStorageTableBody");
  if (!body) return;
  body.innerHTML = appData.coldStorageEntries.length ? appData.coldStorageEntries.map((entry) => `
    <tr>
      <td>${formatDate(entry.date)}</td>
      <td><strong>${escapeHtml(entry.storageName || "-")}</strong><div class="source-note">${escapeHtml(entry.phone || "")}</div></td>
      <td>${formatMoneyRowsSummary(entry.rows)}</td>
      <td>${Number(entry.totalKg || 0).toLocaleString("az-AZ")} kg</td>
      <td>${formatMoney(entry.totalAmount || 0, entry.currency)}</td>
      <td>${formatMoney(entry.netAmount || 0, entry.currency)}</td>
      <td>${formatMoney(entry.paidAmount || 0, entry.currency)}</td>
      <td>${formatMoney(entry.debtAmount || 0, entry.currency)}</td>
      <td><span class="badge">${escapeHtml(entry.status)}</span></td>
      <td>
        <div class="data-actions">
          <button class="small-button" type="button" data-pay-cold="${entry.id}">Ödəniş</button>
          <button class="small-button" type="button" data-history-cold="${entry.id}">Tarixçə</button>
          <button class="small-button" type="button" data-edit-cold="${entry.id}">Redaktə et</button>
          <button class="small-button danger" type="button" data-delete-cold="${entry.id}">Sil</button>
        </div>
      </td>
    </tr>
  `).join("") : emptyTableRow(10, "Soyuducu/anbar qeydi yoxdur.");

  body.querySelectorAll("[data-pay-cold]").forEach((button) => button.addEventListener("click", () => openDebtPaymentModal("coldStorage", button.dataset.payCold)));
  body.querySelectorAll("[data-history-cold]").forEach((button) => button.addEventListener("click", () => openDebtHistoryModal("coldStorage", button.dataset.historyCold)));
  body.querySelectorAll("[data-edit-cold]").forEach((button) => button.addEventListener("click", () => openColdStorageModal(button.dataset.editCold)));
  body.querySelectorAll("[data-delete-cold]").forEach((button) => button.addEventListener("click", () => confirmDelete("Soyuducu/anbar qeydini silmək istəyirsiniz?", () => deleteColdStorageEntry(button.dataset.deleteCold))));
}

function renderSalesPage() {
  dom.contentArea.innerHTML = `
    ${moduleHeader("Satışlar", "Bir satışda bir neçə kalibr, fərqli qiymət və borc izləmə.", "Satış əlavə et", "addSaleButton")}
    <section class="table-card module-card">
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Tarix</th>
              <th>Kanal</th>
              <th>Müştəri</th>
              <th>Mənbə</th>
              <th>Kalibrlər</th>
              <th>Ümumi kg</th>
              <th>Ümumi məbləğ</th>
              <th>Ödənilib</th>
              <th>Qalan borc</th>
              <th>Status</th>
              <th>Əməliyyatlar</th>
            </tr>
          </thead>
          <tbody id="salesTableBody"></tbody>
        </table>
      </div>
    </section>
  `;
  document.getElementById("addSaleButton").addEventListener("click", () => openSaleModal());
  renderSalesTable();
}

function renderSalesTable() {
  const body = document.getElementById("salesTableBody");
  if (!body) return;
  body.innerHTML = appData.sales.length ? appData.sales.map((sale) => `
    <tr>
      <td>${formatDate(sale.date)}</td>
      <td>${escapeHtml(sale.channel)}</td>
      <td><strong>${escapeHtml(sale.customerName || "-")}</strong><div class="source-note">${escapeHtml(sale.phone || "")}</div></td>
      <td>${escapeHtml(sale.productSource)}</td>
      <td>${formatMoneyRowsSummary(sale.rows)}</td>
      <td>${Number(sale.totalKg || 0).toLocaleString("az-AZ")} kg</td>
      <td>${formatMoney(sale.totalAmount || 0, sale.currency)}</td>
      <td>${formatMoney(sale.paidAmount || 0, sale.currency)}</td>
      <td>${formatMoney(sale.debtAmount || 0, sale.currency)}</td>
      <td><span class="badge">${escapeHtml(sale.status)}</span></td>
      <td>
        <div class="data-actions">
          <button class="small-button" type="button" data-pay-sale="${sale.id}">Ödəniş</button>
          <button class="small-button" type="button" data-history-sale="${sale.id}">Tarixçə</button>
          <button class="small-button" type="button" data-edit-sale="${sale.id}">Redaktə et</button>
          <button class="small-button danger" type="button" data-delete-sale="${sale.id}">Sil</button>
        </div>
      </td>
    </tr>
  `).join("") : emptyTableRow(11, "Satış qeydi yoxdur.");

  body.querySelectorAll("[data-pay-sale]").forEach((button) => button.addEventListener("click", () => openDebtPaymentModal("sale", button.dataset.paySale)));
  body.querySelectorAll("[data-history-sale]").forEach((button) => button.addEventListener("click", () => openDebtHistoryModal("sale", button.dataset.historySale)));
  body.querySelectorAll("[data-edit-sale]").forEach((button) => button.addEventListener("click", () => openSaleModal(button.dataset.editSale)));
  body.querySelectorAll("[data-delete-sale]").forEach((button) => button.addEventListener("click", () => confirmDelete("Satışı silmək istəyirsiniz?", () => deleteSale(button.dataset.deleteSale))));
}

function renderCustomersPage() {
  dom.contentArea.innerHTML = `
    ${moduleHeader("Müştərilər", "Müştəri kartı, alış tarixçəsi və borc izləmə.", "Müştəri əlavə et", "addCustomerButton")}
    <section class="table-card module-card">
      <div class="filter-row three">
        <div class="field">
          <label for="customerSearch">Axtarış</label>
          <input id="customerSearch" placeholder="Müştəri, telefon və ya ünvan">
        </div>
        <div class="field">
          <label for="customerTypeFilter">Tip</label>
          <select id="customerTypeFilter">
            <option value="">Bütün tiplər</option>
            ${optionsHtml(customerTypes)}
          </select>
        </div>
        <div class="field">
          <label for="customerDebtFilter">Borc</label>
          <select id="customerDebtFilter">
            <option value="">Hamısı</option>
            <option value="debt">Borcu olanlar</option>
          </select>
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Müştəri</th>
              <th>Telefon</th>
              <th>Tip</th>
              <th>Ünvan</th>
              <th>Ümumi alış</th>
              <th>Ödənilib</th>
              <th>Borc</th>
              <th>Son alış</th>
              <th>Əməliyyatlar</th>
            </tr>
          </thead>
          <tbody id="customersTableBody"></tbody>
        </table>
      </div>
    </section>
  `;
  document.getElementById("addCustomerButton").addEventListener("click", () => openCustomerModal());
  ["customerSearch", "customerTypeFilter", "customerDebtFilter"].forEach((idValue) => {
    const el = document.getElementById(idValue);
    el.addEventListener(idValue === "customerSearch" ? "input" : "change", renderCustomersTable);
  });
  renderCustomersTable();
}

function renderCustomersTable() {
  const body = document.getElementById("customersTableBody");
  if (!body) return;
  const search = normalizeSearch(document.getElementById("customerSearch")?.value || "");
  const type = document.getElementById("customerTypeFilter")?.value || "";
  const debtOnly = document.getElementById("customerDebtFilter")?.value === "debt";
  const rows = appData.customers.filter((customer) => {
    const stats = getCustomerStats(customer.id);
    const haystack = normalizeSearch(`${customer.name} ${customer.phone} ${customer.address} ${customer.note}`);
    return haystack.includes(search) && (!type || customer.type === type) && (!debtOnly || stats.debt > 0);
  });

  body.innerHTML = rows.length ? rows.map((customer) => {
    const stats = getCustomerStats(customer.id);
    return `
      <tr>
        <td><strong>${escapeHtml(customer.name)}</strong></td>
        <td>${escapeHtml(customer.phone || "-")}</td>
        <td>${escapeHtml(customer.type)}</td>
        <td>${escapeHtml(customer.address || "-")}</td>
        <td>${formatMoney(stats.total)}</td>
        <td>${formatMoney(stats.paid)}</td>
        <td>${formatMoney(stats.debt)}</td>
        <td>${formatDate(stats.lastDate) || "-"}</td>
        <td>
          <div class="data-actions">
            <button class="small-button" type="button" data-detail-customer="${customer.id}">Ətraflı</button>
            <button class="small-button" type="button" data-edit-customer="${customer.id}">Redaktə et</button>
            <button class="small-button danger" type="button" data-delete-customer="${customer.id}">Sil</button>
          </div>
        </td>
      </tr>
    `;
  }).join("") : emptyTableRow(9, "Müştəri tapılmadı.");

  body.querySelectorAll("[data-detail-customer]").forEach((button) => button.addEventListener("click", () => openCustomerDetails(button.dataset.detailCustomer)));
  body.querySelectorAll("[data-edit-customer]").forEach((button) => button.addEventListener("click", () => openCustomerModal(button.dataset.editCustomer)));
  body.querySelectorAll("[data-delete-customer]").forEach((button) => button.addEventListener("click", () => confirmDelete("Müştərini silmək istəyirsiniz?", () => deleteCustomer(button.dataset.deleteCustomer))));
}

function renderDebtsPage() {
  dom.contentArea.innerHTML = `
    <section class="module-header">
      <div>
        <h2>Borclar</h2>
        <p class="muted">Müştəri və soyuducu/anbar borcları ayrı-ayrı izlənir.</p>
      </div>
    </section>
    <div class="dashboard-lower">
      <section class="table-card module-card">
        <div class="section-title"><h2>Müştəri borcları</h2></div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>Tarix</th><th>Müştəri</th><th>Borc</th><th>Status</th><th>Əməliyyatlar</th></tr>
            </thead>
            <tbody id="customerDebtsBody"></tbody>
          </table>
        </div>
      </section>
      <section class="table-card module-card">
        <div class="section-title"><h2>Soyuducu/anbar borcları</h2></div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>Tarix</th><th>Soyuducu</th><th>Borc</th><th>Status</th><th>Əməliyyatlar</th></tr>
            </thead>
            <tbody id="coldDebtsBody"></tbody>
          </table>
        </div>
      </section>
    </div>
  `;
  renderDebtTables();
}

function renderDebtTables() {
  const customerBody = document.getElementById("customerDebtsBody");
  const coldBody = document.getElementById("coldDebtsBody");
  const saleDebts = appData.sales.filter((sale) => Number(sale.debtAmount || 0) > 0);
  const coldDebts = appData.coldStorageEntries.filter((entry) => Number(entry.debtAmount || 0) > 0);

  customerBody.innerHTML = saleDebts.length ? saleDebts.map((sale) => `
    <tr>
      <td>${formatDate(sale.date)}</td>
      <td><strong>${escapeHtml(sale.customerName || "-")}</strong></td>
      <td>${formatMoney(sale.debtAmount || 0, sale.currency)}</td>
      <td><span class="badge">${escapeHtml(sale.status)}</span></td>
      <td><div class="data-actions">
        <button class="small-button" type="button" data-pay-sale="${sale.id}">Qismən ödə</button>
        <button class="small-button" type="button" data-full-sale="${sale.id}">Tam ödənib</button>
        <button class="small-button" type="button" data-history-sale="${sale.id}">Tarixçə</button>
      </div></td>
    </tr>
  `).join("") : emptyTableRow(5, "Müştəri borcu yoxdur.");

  coldBody.innerHTML = coldDebts.length ? coldDebts.map((entry) => `
    <tr>
      <td>${formatDate(entry.date)}</td>
      <td><strong>${escapeHtml(entry.storageName || "-")}</strong></td>
      <td>${formatMoney(entry.debtAmount || 0, entry.currency)}</td>
      <td><span class="badge">${escapeHtml(entry.status)}</span></td>
      <td><div class="data-actions">
        <button class="small-button" type="button" data-pay-cold="${entry.id}">Qismən ödə</button>
        <button class="small-button" type="button" data-full-cold="${entry.id}">Tam ödənib</button>
        <button class="small-button" type="button" data-history-cold="${entry.id}">Tarixçə</button>
      </div></td>
    </tr>
  `).join("") : emptyTableRow(5, "Soyuducu/anbar borcu yoxdur.");

  document.querySelectorAll("[data-pay-sale]").forEach((button) => button.addEventListener("click", () => openDebtPaymentModal("sale", button.dataset.paySale)));
  document.querySelectorAll("[data-full-sale]").forEach((button) => button.addEventListener("click", () => markDebtFullyPaid("sale", button.dataset.fullSale)));
  document.querySelectorAll("[data-history-sale]").forEach((button) => button.addEventListener("click", () => openDebtHistoryModal("sale", button.dataset.historySale)));
  document.querySelectorAll("[data-pay-cold]").forEach((button) => button.addEventListener("click", () => openDebtPaymentModal("coldStorage", button.dataset.payCold)));
  document.querySelectorAll("[data-full-cold]").forEach((button) => button.addEventListener("click", () => markDebtFullyPaid("coldStorage", button.dataset.fullCold)));
  document.querySelectorAll("[data-history-cold]").forEach((button) => button.addEventListener("click", () => openDebtHistoryModal("coldStorage", button.dataset.historyCold)));
}

function renderCaliberStockBlock() {
  const summaries = getCaliberStockSummaries();
  return `
    <section class="panel caliber-stock-panel">
      <div class="section-title">
        <div>
          <h2>Kalibr üzrə qalıq</h2>
          <p class="muted">Toplanan məhsul, mövcud qalıq və zay/yararsız kg göstəriciləri.</p>
        </div>
      </div>
      <div class="stock-grid">
        ${summaries.length ? summaries.map((item) => `
          <article class="stock-card">
            <div>
              <strong>${escapeHtml(item.name)}</strong>
              <span class="muted">${Number(item.collected).toLocaleString("az-AZ")} kg toplanıb</span>
            </div>
            <div class="stock-card-values">
              <span>Qalıq: <b>${Number(item.remaining).toLocaleString("az-AZ")} kg</b></span>
              <span>Zay: <b>${Number(item.waste).toLocaleString("az-AZ")} kg</b></span>
            </div>
          </article>
        `).join("") : `<p class="muted">Kalibr məlumatı yoxdur.</p>`}
      </div>
    </section>
  `;
}

function renderWorkersPage() {
  dom.contentArea.innerHTML = `
    ${moduleHeader("İşçilər", "İşçi kartları, ödəniş tipi və ödənilmiş məbləğlərin tarixçəsi.", "İşçi əlavə et", "addWorkerPageButton")}
    <section class="table-card module-card">
      <div class="filter-row three">
        <div class="field">
          <label for="workerSearch">Axtarış</label>
          <input id="workerSearch" placeholder="Ad, telefon, vəzifə və ya qeyd">
        </div>
        <div class="field">
          <label for="workerRoleFilter">Vəzifə</label>
          <select id="workerRoleFilter">
            <option value="">Bütün vəzifələr</option>
            ${optionsHtml(workerRoles)}
          </select>
        </div>
        <div class="field">
          <label for="workerStatusFilter">Status</label>
          <select id="workerStatusFilter">
            <option value="">Bütün statuslar</option>
            ${optionsHtml(workerStatuses)}
          </select>
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>İşçi</th>
              <th>Vəzifə / səlahiyyət</th>
              <th>Maaş</th>
              <th>Status</th>
              <th>Ümumi ödənilib</th>
              <th>Əməliyyatlar</th>
            </tr>
          </thead>
          <tbody id="workersTableBody"></tbody>
        </table>
      </div>
    </section>
  `;

  document.getElementById("addWorkerPageButton").addEventListener("click", () => openWorkerModal());
  document.getElementById("workerSearch").addEventListener("input", renderWorkersTable);
  document.getElementById("workerRoleFilter").addEventListener("change", renderWorkersTable);
  document.getElementById("workerStatusFilter").addEventListener("change", renderWorkersTable);
  renderWorkersTable();
}

function renderWorkersTable() {
  const body = document.getElementById("workersTableBody");
  if (!body) return;

  const search = normalizeSearch(document.getElementById("workerSearch")?.value || "");
  const roleFilter = document.getElementById("workerRoleFilter")?.value || "";
  const statusFilter = document.getElementById("workerStatusFilter")?.value || "";
  const rows = appData.workers.filter((worker) => {
    const haystack = normalizeSearch(`${worker.fullName} ${worker.phone} ${worker.role} ${worker.note}`);
    return (!roleFilter || worker.role === roleFilter) && (!statusFilter || worker.status === statusFilter) && haystack.includes(search);
  });

  body.innerHTML = rows.length ? rows.map((worker) => `
    <tr>
      <td><strong>${escapeHtml(worker.fullName)}</strong>${worker.phone ? `<div class="source-note">${escapeHtml(worker.phone)}</div>` : ""}</td>
      <td>${escapeHtml(worker.role || "-")}<div class="source-note">${escapeHtml(getWorkerPermissionSummary(worker))}</div></td>
      <td>${worker.paymentType === "gündəlik" ? `${formatMoney(worker.dailyRate || 0)} / gün` : `${formatMoney(worker.monthlySalary || 0)} / ay`}</td>
      <td><span class="badge">${escapeHtml(worker.status || "aktiv")}</span></td>
      <td>${formatMoney(getWorkerPaidTotal(worker.id))}</td>
      <td>
        <div class="data-actions">
          <button class="small-button" type="button" data-detail-worker="${worker.id}">Ətraflı</button>
          <button class="small-button" type="button" data-edit-worker="${worker.id}">Redaktə et</button>
          <button class="small-button danger" type="button" data-delete-worker="${worker.id}">Sil</button>
        </div>
      </td>
    </tr>
  `).join("") : emptyTableRow(6, "İşçi tapılmadı.");

  body.querySelectorAll("[data-detail-worker]").forEach((button) => {
    button.addEventListener("click", () => openWorkerDetails(button.dataset.detailWorker));
  });
  body.querySelectorAll("[data-edit-worker]").forEach((button) => {
    button.addEventListener("click", () => openWorkerModal(button.dataset.editWorker));
  });
  body.querySelectorAll("[data-delete-worker]").forEach((button) => {
    button.addEventListener("click", () => confirmDelete("İşçini silmək istəyirsiniz?", () => deleteWorker(button.dataset.deleteWorker)));
  });
}

function renderSalariesPage() {
  const todayTotal = sumSalariesByDate(todayISO());
  const monthTotal = sumSalariesByMonth(todayISO().slice(0, 7));
  const bonusTotal = sumSalariesByType("bonus");
  const overtimeTotal = sumSalariesByType("overtime");
  const advanceTotal = sumSalariesByType("avans");
  const totalSalary = sumExpensesByCategory("Maaşlar");

  dom.contentArea.innerHTML = `
    ${moduleHeader("Maaşlar", "Gündəlik, aylıq, overtime, bonus, avans və digər maaş ödənişləri.", "Ödəniş əlavə et", "addSalaryButton")}
    <div class="summary-grid">
      ${summaryCard("Bugünkü ödənişlər", formatMoney(todayTotal), "Bu gün üzrə")}
      ${summaryCard("Bu ay", formatMoney(monthTotal), "Cari ay üzrə")}
      ${summaryCard("Bonuslar", formatMoney(bonusTotal), "Bütün bonuslar")}
      ${summaryCard("Overtime", formatMoney(overtimeTotal), "Əlavə iş")}
      ${summaryCard("Avanslar", formatMoney(advanceTotal), "Avans ödənişləri")}
      ${summaryCard("Ümumi maaşlar", formatMoney(totalSalary), "Maaşlar kateqoriyası")}
    </div>
    <section class="panel salary-workers-panel">
      <div class="section-title">
        <h2>İşçilər üzrə ödənişlər</h2>
      </div>
      <div class="mini-list">
        ${appData.workers.length ? appData.workers.map((worker) => `
          <div class="mini-row">
            <div>
              <strong>${escapeHtml(worker.fullName)}</strong>
              <span class="muted">${escapeHtml(worker.role || "-")} · ${escapeHtml(worker.paymentType || "-")}</span>
            </div>
            <span class="badge">${formatMoney(getWorkerPaidTotal(worker.id))}</span>
          </div>
        `).join("") : `<p class="muted">İşçi əlavə edilməyib.</p>`}
      </div>
    </section>
    <section class="table-card module-card">
      <div class="filter-row three">
        <div class="field">
          <label for="salarySearch">Axtarış</label>
          <input id="salarySearch" placeholder="İşçi, dövr, sahə və ya qeyd">
        </div>
        <div class="field">
          <label for="salaryTypeFilter">Ödəniş növü</label>
          <select id="salaryTypeFilter">
            <option value="">Bütün növlər</option>
            ${optionsHtml(salaryPaymentTypes)}
          </select>
        </div>
        <div class="field">
          <label for="salaryWorkerFilter">İşçi</label>
          <select id="salaryWorkerFilter">
            <option value="">Bütün işçilər</option>
            ${workerOptions()}
          </select>
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Tarix</th>
              <th>İşçi</th>
              <th>Ödəniş növü</th>
              <th>Hesablama</th>
              <th>Məbləğ</th>
              <th>Dövr / sahə</th>
              <th>Qeyd</th>
              <th>Əməliyyatlar</th>
            </tr>
          </thead>
          <tbody id="salariesTableBody"></tbody>
        </table>
      </div>
    </section>
  `;

  document.getElementById("addSalaryButton").addEventListener("click", () => openSalaryModal());
  document.getElementById("salarySearch").addEventListener("input", renderSalariesTable);
  document.getElementById("salaryTypeFilter").addEventListener("change", renderSalariesTable);
  document.getElementById("salaryWorkerFilter").addEventListener("change", renderSalariesTable);
  renderSalariesTable();
}

function renderSalariesTable() {
  const body = document.getElementById("salariesTableBody");
  if (!body) return;

  const search = normalizeSearch(document.getElementById("salarySearch")?.value || "");
  const typeFilter = document.getElementById("salaryTypeFilter")?.value || "";
  const workerFilter = document.getElementById("salaryWorkerFilter")?.value || "";
  const rows = appData.salaries.filter((salary) => {
    const workerName = getSalaryWorkerLabel(salary);
    const landName = getLandName(salary.landId);
    const haystack = normalizeSearch(`${workerName} ${salary.paymentType} ${salary.period} ${landName} ${salary.note}`);
    return (!typeFilter || salary.paymentType === typeFilter) && (!workerFilter || salary.workerId === workerFilter) && haystack.includes(search);
  });

  body.innerHTML = rows.length ? rows.map((salary) => `
      <tr>
      <td>${formatDate(salary.date)}</td>
      <td><strong>${escapeHtml(getSalaryWorkerLabel(salary))}</strong></td>
      <td>${escapeHtml(salary.paymentType)}</td>
      <td>${salary.paymentType === "gündəlik maaş" ? `${Number(salary.workerCount || 1).toLocaleString("az-AZ")} nəfər × ${formatMoney(salary.dailyRate || 0, salary.currency)} × ${Number(salary.workDays || 1).toLocaleString("az-AZ")} gün` : "-"}</td>
      <td>${formatMoney(salary.amount || 0, salary.currency)}</td>
      <td>${escapeHtml(salary.period || "-")}<div class="source-note">${escapeHtml(getLandName(salary.landId))}</div></td>
      <td>${escapeHtml(salary.note || "-")}</td>
      <td>
        <div class="data-actions">
          <button class="small-button" type="button" data-edit-salary="${salary.id}">Redaktə et</button>
          <button class="small-button danger" type="button" data-delete-salary="${salary.id}">Sil</button>
        </div>
      </td>
    </tr>
  `).join("") : emptyTableRow(8, "Maaş ödənişi tapılmadı.");

  body.querySelectorAll("[data-edit-salary]").forEach((button) => {
    button.addEventListener("click", () => openSalaryModal(button.dataset.editSalary));
  });
  body.querySelectorAll("[data-delete-salary]").forEach((button) => {
    button.addEventListener("click", () => confirmDelete("Maaş ödənişini silmək istəyirsiniz?", () => deleteSalary(button.dataset.deleteSalary)));
  });
}

function renderExpensesPage() {
  dom.contentArea.innerHTML = `
    ${moduleHeader("Xərclər", "Avtomatik xərclər mənbə bölmələrindən idarə olunur, əl ilə xərclər isə buradan əlavə edilir.", "Əl ilə xərc əlavə et", "addExpenseButton")}
    <section class="table-card module-card">
      <div class="filter-row expenses">
        <div class="field">
          <label for="expenseTypeFilter">Tip</label>
          <select id="expenseTypeFilter">
            <option value="">Bütün xərclər</option>
            <option value="manual">Əl ilə</option>
            <option value="auto">Avtomatik</option>
          </select>
        </div>
        <div class="field">
          <label for="expenseDateFilter">Tarix</label>
          <input id="expenseDateFilter" type="date">
        </div>
        <div class="field">
          <label for="expenseCategoryFilter">Kateqoriya</label>
          <select id="expenseCategoryFilter">
            <option value="">Bütün kateqoriyalar</option>
            ${expenseCategories.map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join("")}
          </select>
        </div>
        <div class="field">
          <label for="expenseLandFilter">Sahə</label>
          <select id="expenseLandFilter">
            <option value="">Bütün sahələr</option>
            ${landOptions()}
          </select>
        </div>
        <div class="field">
          <label for="expenseCurrencyFilter">Valyuta</label>
          <select id="expenseCurrencyFilter">
            <option value="">Bütün valyutalar</option>
            <option value="AZN">AZN</option>
            <option value="USD">USD</option>
          </select>
        </div>
        <div class="field">
          <label for="expenseMethodFilter">Ödəniş üsulu</label>
          <select id="expenseMethodFilter">
            <option value="">Bütün üsullar</option>
            ${optionsHtml(paymentMethods)}
          </select>
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Tarix</th>
              <th>Tip</th>
              <th>Kateqoriya</th>
              <th>Məbləğ</th>
              <th>Valyuta</th>
              <th>Ödəniş üsulu</th>
              <th>Sahə</th>
              <th>İstixana</th>
              <th>Təchizatçı</th>
              <th>Təsvir</th>
              <th>Əməliyyatlar</th>
            </tr>
          </thead>
          <tbody id="expensesTableBody"></tbody>
        </table>
      </div>
    </section>
  `;

  document.getElementById("addExpenseButton").addEventListener("click", () => openExpenseModal());
  ["expenseTypeFilter", "expenseDateFilter", "expenseCategoryFilter", "expenseLandFilter", "expenseCurrencyFilter", "expenseMethodFilter"].forEach((idValue) => {
    document.getElementById(idValue).addEventListener("change", renderExpensesTable);
  });
  renderExpensesTable();
}

function renderExpensesTable() {
  const body = document.getElementById("expensesTableBody");
  if (!body) return;

  const dateFilter = document.getElementById("expenseDateFilter")?.value || "";
  const typeFilter = document.getElementById("expenseTypeFilter")?.value || "";
  const categoryFilter = document.getElementById("expenseCategoryFilter")?.value || "";
  const landFilter = document.getElementById("expenseLandFilter")?.value || "";
  const currencyFilter = document.getElementById("expenseCurrencyFilter")?.value || "";
  const methodFilter = document.getElementById("expenseMethodFilter")?.value || "";

  const rows = appData.expenses.filter((expense) => {
    const isAuto = isAutoExpense(expense);
    return (!typeFilter || (typeFilter === "auto" ? isAuto : !isAuto))
      && (!dateFilter || expense.date === dateFilter)
      && (!categoryFilter || expense.category === categoryFilter)
      && (!landFilter || expense.landId === landFilter)
      && (!currencyFilter || expense.currency === currencyFilter)
      && (!methodFilter || expense.paymentMethod === methodFilter);
  });

  body.innerHTML = rows.length ? rows.map((expense) => {
    const isManual = !isAutoExpense(expense);
    return `
      <tr>
        <td>${formatDate(expense.date)}</td>
        <td><span class="badge ${isManual ? "manual" : "auto"}">${isManual ? "Manual" : "Avtomatik"}</span></td>
        <td>${escapeHtml(expense.category)}</td>
        <td>${formatMoney(expense.amount || 0, expense.currency)}</td>
        <td>${escapeHtml(expense.currency || "AZN")}</td>
        <td>${escapeHtml(expense.paymentMethod || "nağd")}</td>
        <td>${escapeHtml(getLandName(expense.landId))}</td>
        <td>${escapeHtml(getGreenhouseName(expense.greenhouseId))}</td>
        <td>${escapeHtml(expense.supplier || "-")}</td>
        <td>${escapeHtml(expense.description || "-")}${isManual ? "" : `<div class="source-note">Avtomatik: ${escapeHtml(expense.sourceType)}</div>`}</td>
        <td>
          <div class="data-actions">
            ${isManual ? `
              <button class="small-button" type="button" data-edit-expense="${expense.id}">Redaktə et</button>
              <button class="small-button danger" type="button" data-delete-expense="${expense.id}">Sil</button>
            ` : `
              <button class="small-button" type="button" data-open-expense-source="${expense.id}">Mənbəni aç</button>
            `}
          </div>
        </td>
      </tr>
    `;
  }).join("") : emptyTableRow(11, "Boş məlumat yoxdur.");

  body.querySelectorAll("[data-edit-expense]").forEach((button) => {
    button.addEventListener("click", () => openExpenseModal(button.dataset.editExpense));
  });
  body.querySelectorAll("[data-delete-expense]").forEach((button) => {
    button.addEventListener("click", () => confirmDelete("Xərci silmək istəyirsiniz?", () => deleteExpense(button.dataset.deleteExpense)));
  });
  body.querySelectorAll("[data-open-expense-source]").forEach((button) => {
    button.addEventListener("click", () => openExpenseSource(button.dataset.openExpenseSource));
  });
}

function isAutoExpense(expense) {
  return Boolean(expense?.isAutoGenerated || (expense?.sourceType && expense.sourceType !== "manual"));
}

function openExpenseSource(expenseId) {
  const expense = appData.expenses.find((item) => item.id === expenseId);
  if (!expense || !expense.sourceType || expense.sourceType === "manual") return;
  const source = getExpenseSourceDetails(expense);
  if (!source) {
    showToast("Mənbə bölməsi tapılmadı.", "warning");
    return;
  }

  openModal("Avtomatik xərc mənbəyi", `
    <div class="source-card">
      <div>
        <span class="badge auto">Avtomatik</span>
        <h3>${escapeHtml(expense.category)}</h3>
        <p class="muted">${escapeHtml(source.label)}</p>
      </div>
      <div class="source-card-amount">${formatMoney(expense.amount || 0, expense.currency)}</div>
    </div>
    <div class="detail-grid source-detail-grid">
      <div><span>Tarix</span><strong>${formatDate(expense.date) || "-"}</strong></div>
      <div><span>Mənbə tipi</span><strong>${escapeHtml(source.typeLabel)}</strong></div>
      <div><span>Mənbə adı</span><strong>${escapeHtml(source.name)}</strong></div>
      <div><span>Ödəniş üsulu</span><strong>${escapeHtml(expense.paymentMethod || "-")}</strong></div>
      <div><span>Sahə</span><strong>${escapeHtml(getLandName(expense.landId))}</strong></div>
      <div><span>İstixana</span><strong>${escapeHtml(getGreenhouseName(expense.greenhouseId))}</strong></div>
    </div>
    <p class="muted source-help">Bu xərc əlaqəli bölmədən yaranıb. Məbləğ, tarix və əsas sahələr mənbə qeydi redaktə ediləndə avtomatik yenilənir.</p>
    <div class="button-row">
      <button class="primary-button" id="openExpenseSourceEditorButton" type="button">Mənbəni aç</button>
      <button class="ghost-button" type="button" data-close-modal>Ləğv et</button>
    </div>
  `, "Xərclər");

  document.getElementById("openExpenseSourceEditorButton").addEventListener("click", () => openExpenseSourceEditor(expense));
  bindCloseButtons();
}

function openExpenseSourceEditor(expense) {
  const sourceActions = {
    landRent: () => openLandModal(expense.sourceId),
    greenhouse: () => openGreenhouseModal(expense.sourceId),
    seedling: () => openSeedlingModal(expense.sourceId),
    salary: () => openSalaryModal(expense.sourceId),
    machine: () => openMachineModal(expense.sourceId),
    coldStorage: () => openColdStorageModal(expense.sourceId),
    saleTransport: () => openSaleModal(expense.sourceId)
  };

  const action = sourceActions[expense.sourceType];
  if (action) action();
  else showToast("Mənbə bölməsi tapılmadı.", "warning");
}

function getExpenseSourceDetails(expense) {
  const details = {
    landRent: {
      typeLabel: "Torpaq icarəsi",
      record: appData.lands.find((item) => item.id === expense.sourceId),
      nameKey: "name"
    },
    greenhouse: {
      typeLabel: "İstixana",
      record: appData.greenhouses.find((item) => item.id === expense.sourceId),
      nameKey: "name"
    },
    seedling: {
      typeLabel: "Fidan",
      record: appData.seedlings.find((item) => item.id === expense.sourceId),
      nameKey: "sortName"
    },
    salary: {
      typeLabel: "Maaş",
      record: appData.salaries.find((item) => item.id === expense.sourceId),
      nameKey: "paymentType"
    },
    machine: {
      typeLabel: "Texnika",
      record: appData.machines.find((item) => item.id === expense.sourceId),
      nameKey: "name"
    },
    coldStorage: {
      typeLabel: "Soyuducu / Anbar",
      record: appData.coldStorageEntries.find((item) => item.id === expense.sourceId),
      nameKey: "storageName"
    },
    saleTransport: {
      typeLabel: "Satış nəqliyyatı",
      record: appData.sales.find((item) => item.id === expense.sourceId),
      nameKey: "customerName"
    }
  }[expense.sourceType];

  if (!details?.record) return null;
  return {
    typeLabel: details.typeLabel,
    name: details.record[details.nameKey] || details.typeLabel,
    label: expense.description || `${details.typeLabel} mənbəsindən yaradılıb`
  };
}

function moduleHeader(title, description, buttonText, buttonId) {
  return `
    <section class="module-header">
      <div>
        <h2>${title}</h2>
        <p class="muted">${description}</p>
      </div>
      <button class="primary-button" id="${buttonId}" type="button">${buttonText}</button>
    </section>
  `;
}

function renderLandList() {
  const landList = document.getElementById("landList");
  if (!landList) return;

  landList.innerHTML = appData.lands.length ? appData.lands.map((land) => `
    <div class="mini-row">
      <div>
        <strong>${escapeHtml(land.name)}</strong>
        <span class="muted">${escapeHtml(land.type)} · ${formatLandArea(land)} · ${formatMoney(land.annualRent || 0, land.currency)}</span>
      </div>
      <div class="data-actions">
        <button class="small-button" type="button" data-edit-land="${land.id}">Redaktə et</button>
        <button class="small-button danger" type="button" data-delete-land="${land.id}">Sil</button>
      </div>
    </div>
  `).join("") : `<p class="muted">Hələ sahə əlavə edilməyib.</p>`;

  landList.querySelectorAll("[data-edit-land]").forEach((button) => {
    button.addEventListener("click", () => openLandModal(button.dataset.editLand));
  });
  landList.querySelectorAll("[data-delete-land]").forEach((button) => {
    button.addEventListener("click", () => confirmDelete("Sahəni silmək istəyirsiniz?", () => deleteLand(button.dataset.deleteLand)));
  });
}

function renderWorkerList() {
  const workerList = document.getElementById("workerList");
  if (!workerList) return;

  workerList.innerHTML = appData.workers.length ? appData.workers.map((worker) => `
    <div class="mini-row">
      <div>
        <strong>${escapeHtml(worker.fullName)}</strong>
        <span class="muted">${escapeHtml(worker.role || "Vəzifə yoxdur")} · ${formatMoney(worker.dailyRate || 0)} / gün</span>
      </div>
      <div class="data-actions">
        <button class="small-button" type="button" data-edit-worker="${worker.id}">Redaktə et</button>
        <button class="small-button danger" type="button" data-delete-worker="${worker.id}">Sil</button>
      </div>
    </div>
  `).join("") : `<p class="muted">Hələ işçi əlavə edilməyib.</p>`;

  workerList.querySelectorAll("[data-edit-worker]").forEach((button) => {
    button.addEventListener("click", () => openWorkerModal(button.dataset.editWorker));
  });
  workerList.querySelectorAll("[data-delete-worker]").forEach((button) => {
    button.addEventListener("click", () => confirmDelete("İşçini silmək istəyirsiniz?", () => deleteWorker(button.dataset.deleteWorker)));
  });
}

function renderSettings() {
  const settings = appData.settings;
  dom.contentArea.innerHTML = `
    <div class="settings-grid">
      <section class="setting-card">
        <div class="section-title">
          <h2>Əsas ayarlar</h2>
          <span class="badge">AZN / USD / kg</span>
        </div>
        <form id="settingsForm" class="form-grid">
          <div class="field">
            <label for="companyName">Şirkət adı</label>
            <input id="companyName" name="companyName" value="${escapeHtml(settings.companyName)}" required>
          </div>
          <div class="field">
            <label for="seasonName">Mövsüm adı</label>
            <input id="seasonName" name="seasonName" value="${escapeHtml(settings.seasonName)}" required>
          </div>
          <div class="field">
            <label for="primaryCurrency">Əsas valyuta</label>
            <input id="primaryCurrency" value="AZN" disabled>
          </div>
          <div class="field">
            <label for="secondaryCurrency">Əlavə valyuta</label>
            <input id="secondaryCurrency" value="USD" disabled>
          </div>
          <div class="field">
            <label for="usdRate">USD məzənnəsi</label>
            <input id="usdRate" name="usdRate" type="number" min="0" step="0.0001" value="${Number(settings.usdRate || 0)}" required>
          </div>
          <div class="field">
            <label for="unit">Ölçü vahidi</label>
            <input id="unit" value="kg" disabled>
          </div>
          <div class="field full form-section">
            <h3>Görünüş</h3>
            <p class="muted">Mobil istifadə üçün daha sakit və yığcam görünüş.</p>
          </div>
          <div class="field">
            <label for="compactView">Kompakt görünüş</label>
            <select id="compactView" name="compactView">
              <option value="false" ${settings.compactView ? "" : "selected"}>Bağlı</option>
              <option value="true" ${settings.compactView ? "selected" : ""}>Açıq</option>
            </select>
          </div>
          <div class="field">
            <label for="mobileCardView">Kart görünüşü mobil üçün</label>
            <select id="mobileCardView" name="mobileCardView">
              <option value="true" ${settings.mobileCardView !== false ? "selected" : ""}>Açıq</option>
              <option value="false" ${settings.mobileCardView === false ? "selected" : ""}>Bağlı</option>
            </select>
          </div>
          <div class="field">
            <label for="dashboardMode">Dashboard</label>
            <select id="dashboardMode" name="dashboardMode">
              <option value="simple" ${settings.dashboardMode !== "wide" ? "selected" : ""}>Sadə</option>
              <option value="wide" ${settings.dashboardMode === "wide" ? "selected" : ""}>Geniş</option>
            </select>
          </div>
          <div class="field full">
            <label for="logoInput">Logo yükləmə imkanı</label>
            <input id="logoInput" type="file" accept="image/*">
            <div class="logo-preview-wrap">
              <div class="logo-preview" id="logoPreview">${settings.logo ? `<img src="${settings.logo}" alt="AV Systems logosu">` : "AV"}</div>
              <div>
                <strong>AV Systems logosu</strong>
                <p class="muted">Logo base64 formatında localStorage daxilində saxlanılır.</p>
              </div>
            </div>
          </div>
          <div class="field full">
            <div class="button-row">
              <button class="primary-button" type="submit">Yadda saxla</button>
              <button class="secondary-button" id="removeLogoButton" type="button">Logonu sil</button>
            </div>
          </div>
        </form>
      </section>

      <section class="setting-card">
        <div class="section-title">
          <h2>Məlumat idarəetməsi</h2>
        </div>
        <p class="muted">JSON backup faylı bütün CRM məlumatlarını saxlayır və sonradan bərpa edə bilir.</p>
        <div class="button-row">
          <button class="secondary-button" id="createBackupButton" type="button">JSON backup yarat</button>
          <button class="secondary-button" id="uploadBackupButton" type="button">JSON backup yüklə</button>
          <button class="danger-button" id="clearDemoButton" type="button">Demo məlumatları sil</button>
          <button class="danger-button" id="clearAllButton" type="button">Bütün məlumatları sil</button>
        </div>

        <div class="data-list">
          <div class="data-item">
            <div>
              <strong>Kalibrlər və sortlar</strong>
              <p class="muted">Murano və standart kalibrlər burada saxlanılır.</p>
            </div>
            <button class="small-button" id="addCaliberButton" type="button">Əlavə et</button>
          </div>
          <div id="caliberList"></div>
        </div>
      </section>
    </div>
  `;

  document.getElementById("settingsForm").addEventListener("submit", saveSettings);
  document.getElementById("logoInput").addEventListener("change", handleLogoUpload);
  document.getElementById("removeLogoButton").addEventListener("click", removeLogo);
  document.getElementById("createBackupButton").addEventListener("click", createBackup);
  document.getElementById("uploadBackupButton").addEventListener("click", () => dom.backupFileInput.click());
  document.getElementById("clearAllButton").addEventListener("click", () => confirmDelete("Bütün məlumatları silmək istəyirsiniz?", clearAllData));
  document.getElementById("clearDemoButton").addEventListener("click", () => confirmDelete("Demo məlumatları silmək istəyirsiniz?", clearDemoData));
  document.getElementById("addCaliberButton").addEventListener("click", () => openCaliberModal());
  renderCaliberList();
}

function renderCaliberList() {
  const list = document.getElementById("caliberList");
  if (!list) return;

  list.innerHTML = appData.calibers.length ? appData.calibers.map((caliber) => `
    <div class="data-item">
      <div>
        <strong>${escapeHtml(caliber.name)}</strong>
        <p class="muted">${caliber.type === "sort" ? "Sort" : "Kalibr"} ${caliber.note ? `· ${escapeHtml(caliber.note)}` : ""}</p>
      </div>
      <div class="data-actions">
        <button class="small-button" type="button" data-edit-caliber="${caliber.id}">Redaktə et</button>
        <button class="small-button danger" type="button" data-delete-caliber="${caliber.id}">Sil</button>
      </div>
    </div>
  `).join("") : `<p class="muted">Kalibr siyahısı boşdur.</p>`;

  list.querySelectorAll("[data-edit-caliber]").forEach((button) => {
    button.addEventListener("click", () => openCaliberModal(button.dataset.editCaliber));
  });
  list.querySelectorAll("[data-delete-caliber]").forEach((button) => {
    button.addEventListener("click", () => confirmDelete("Kalibri silmək istəyirsiniz?", () => deleteRecord("calibers", button.dataset.deleteCaliber)));
  });
}

function renderEmptySection(title) {
  dom.contentArea.innerHTML = `
    <section class="empty-page">
      <div>
        <h2>${title}</h2>
        <p class="muted">Bu bölmə növbəti mərhələdə əlavə olunacaq.</p>
      </div>
    </section>
  `;
}

function renderReportsPage() {
  dom.contentArea.innerHTML = `
    ${moduleHeader("Hesabatlar", "Maliyyə, satış, kalibr, xərc, mənfəət və borc hesabatları.", "Yenilə", "refreshReportsButton")}
    ${renderPeriodControls("reports")}
    <div class="report-tabs" id="reportTabs">
      ${getReportTabs().map((tab) => `<button class="report-tab ${tab.id === activeReportTab ? "active" : ""}" type="button" data-report-tab="${tab.id}">${tab.title}</button>`).join("")}
    </div>
    <section class="panel chart-panel">
      <div class="charts-grid">
        <div><canvas id="chartCaliberKg"></canvas></div>
        <div><canvas id="chartCaliberRevenue"></canvas></div>
        <div><canvas id="chartExpenseCategories"></canvas></div>
        <div><canvas id="chartSalesChannels"></canvas></div>
        <div><canvas id="chartMonthlyProfit"></canvas></div>
        <div><canvas id="chartLandHarvest"></canvas></div>
      </div>
      <p class="muted chart-fallback" id="chartFallback"></p>
    </section>
    <section class="table-card module-card" id="reportContent"></section>
  `;
  document.getElementById("refreshReportsButton").addEventListener("click", renderReportsPage);
  bindPeriodControls("reports");
  document.querySelectorAll("[data-report-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      activeReportTab = button.dataset.reportTab;
      renderReportsPage();
    });
  });
  renderReportContent();
  renderReportCharts();
}

function renderReportContent() {
  const container = document.getElementById("reportContent");
  if (!container) return;
  const rows = getReportRows(activeReportTab);
  const title = getReportTabs().find((tab) => tab.id === activeReportTab)?.title || "Hesabat";
  container.innerHTML = `
    <div class="section-title">
      <div>
        <h2>${title}</h2>
        <p class="muted">${activeReportTab === "calibers" ? "Xərclər kalibrlər üzrə məhsul çəkisinə əsasən təxmini bölüşdürülüb." : getPeriodLabel()}</p>
      </div>
    </div>
    ${renderSimpleTable(rows)}
  `;
}

function renderExportPage() {
  const buttons = [
    ["all", "Bütün məlumatları Excel-ə ixrac et"],
    ["sales", "Satışlar Excel"],
    ["expenses", "Xərclər Excel"],
    ["salaries", "Maaşlar Excel"],
    ["harvests", "Məhsul yığımı Excel"],
    ["debts", "Borclar Excel"],
    ["cold", "Soyuducu/anbar Excel"],
    ["landProfit", "Sahə üzrə mənfəət Excel"],
    ["finance", "Ümumi maliyyə hesabatı Excel"],
    ["calibers", "Kalibr analitikası Excel"]
  ];
  dom.contentArea.innerHTML = `
    ${moduleHeader("Excel ixracı", "SheetJS vasitəsilə .xlsx formatında hesabat və baza ixracı.", "Bütün məlumatları Excel-ə ixrac et", "exportAllTopButton")}
    ${renderPeriodControls("export")}
    <section class="panel">
      <div class="export-grid">
        ${buttons.map(([type, label]) => `<button class="secondary-button" type="button" data-export-type="${type}">${label}</button>`).join("")}
      </div>
      <p class="muted export-note">Excel ixracı üçün internet olduqda SheetJS CDN yüklənir. CDN bloklanarsa JSON backup yenə işlək qalır.</p>
    </section>
  `;
  document.getElementById("exportAllTopButton").addEventListener("click", () => exportWorkbook("all"));
  dom.contentArea.querySelectorAll("[data-export-type]").forEach((button) => {
    button.addEventListener("click", () => exportWorkbook(button.dataset.exportType));
  });
  bindPeriodControls("export");
}

function openLandModal(id = null) {
  const land = appData.lands.find((item) => item.id === id) || {
    name: "",
    type: "açıq sahə",
    area: "",
    areaHectare: 0,
    areaSot: 0,
    areaInputValue: "",
    areaInputUnit: "hektar",
    rentOwner: "",
    leaseStartDate: "",
    leaseEndDate: "",
    annualRent: "",
    currency: "AZN",
    note: ""
  };
  const areaInputUnit = land.areaInputUnit === "sot" ? "sot" : "hektar";
  const areaInputValue = land.areaInputValue !== "" && land.areaInputValue !== undefined
    ? land.areaInputValue
    : (areaInputUnit === "sot" ? (land.areaSot || 0) : (land.areaHectare ?? land.area ?? 0));

  openModal(id ? "Sahəni düzəlt" : "Sahə əlavə et", `
    <form id="landForm" class="form-grid">
      <div class="field">
        <label for="landName">Sahə adı</label>
        <input id="landName" name="name" value="${escapeHtml(land.name)}" required>
      </div>
      <div class="field">
        <label for="landType">Sahə tipi</label>
        <select id="landType" name="type">${optionsHtml(landTypes, land.type)}</select>
      </div>
      <div class="field">
        <label for="landAreaUnit">Ölçü vahidi</label>
        <select id="landAreaUnit" name="areaInputUnit">
          <option value="hektar" ${areaInputUnit === "hektar" ? "selected" : ""}>Hektar</option>
          <option value="sot" ${areaInputUnit === "sot" ? "selected" : ""}>Sot</option>
        </select>
      </div>
      <div class="field">
        <label for="landAreaValue">Ölçü</label>
        <input id="landAreaValue" name="areaInputValue" type="number" min="0" step="0.01" value="${areaInputValue}" required>
      </div>
      <div class="field full">
        <div class="conversion-note" id="landAreaConversion">Avtomatik çevrilmə hesablanır...</div>
      </div>
      <div class="field">
        <label for="rentOwner">İcarə sahibi</label>
        <input id="rentOwner" name="rentOwner" value="${escapeHtml(land.rentOwner || "")}">
      </div>
      <div class="field">
        <label for="leaseStartDate">İcarə başlanğıc tarixi</label>
        <input id="leaseStartDate" name="leaseStartDate" type="date" value="${land.leaseStartDate || ""}">
      </div>
      <div class="field">
        <label for="leaseEndDate">İcarə bitmə tarixi</label>
        <input id="leaseEndDate" name="leaseEndDate" type="date" value="${land.leaseEndDate || ""}">
      </div>
      <div class="field">
        <label for="annualRent">İllik icarə məbləği</label>
        <input id="annualRent" name="annualRent" type="number" min="0" step="0.01" value="${land.annualRent || 0}">
      </div>
      <div class="field">
        <label for="landCurrency">Valyuta</label>
        <select id="landCurrency" name="currency">${currencyOptions(land.currency)}</select>
      </div>
      <div class="field full">
        <label for="landNote">Qeyd</label>
        <textarea id="landNote" name="note" rows="3">${escapeHtml(land.note || "")}</textarea>
      </div>
      <div class="field full">
        <div class="button-row">
          <button class="primary-button" type="submit">Yadda saxla</button>
          <button class="ghost-button" type="button" data-close-modal>Ləğv et</button>
        </div>
      </div>
    </form>
  `, "Torpaq və sahələr");

  document.getElementById("landForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const areaInputValue = Number(form.get("areaInputValue")) || 0;
    const areaInputUnit = form.get("areaInputUnit");
    const convertedArea = convertLandArea(areaInputValue, areaInputUnit);
    saveLand(id, {
      name: form.get("name").trim(),
      type: form.get("type"),
      area: convertedArea.areaHectare,
      areaHectare: convertedArea.areaHectare,
      areaSot: convertedArea.areaSot,
      areaInputValue,
      areaInputUnit,
      rentOwner: form.get("rentOwner").trim(),
      leaseStartDate: form.get("leaseStartDate"),
      leaseEndDate: form.get("leaseEndDate"),
      annualRent: Number(form.get("annualRent")) || 0,
      currency: form.get("currency"),
      note: form.get("note").trim()
    });
  });
  const updateAreaConversion = () => {
    const value = Number(document.getElementById("landAreaValue")?.value) || 0;
    const unit = document.getElementById("landAreaUnit")?.value || "hektar";
    const converted = convertLandArea(value, unit);
    const conversion = document.getElementById("landAreaConversion");
    if (conversion) {
      conversion.textContent = `${converted.areaHectare.toLocaleString("az-AZ", { maximumFractionDigits: 2 })} ha / ${converted.areaSot.toLocaleString("az-AZ", { maximumFractionDigits: 2 })} sot`;
    }
  };
  document.getElementById("landAreaValue").addEventListener("input", updateAreaConversion);
  document.getElementById("landAreaUnit").addEventListener("change", updateAreaConversion);
  updateAreaConversion();
  bindCloseButtons();
}

function openGreenhouseModal(id = null) {
  const greenhouse = appData.greenhouses.find((item) => item.id === id) || {
    name: "",
    landId: appData.lands[0]?.id || "",
    size: "",
    status: "aktiv",
    constructionCost: 0,
    repairCost: 0,
    filmCost: 0,
    pipeFrameCost: 0,
    dripIrrigationCost: 0,
    energyHeatingCost: 0,
    currency: "AZN",
    note: ""
  };

  openModal(id ? "İstixananı düzəlt" : "İstixana əlavə et", `
    <form id="greenhouseForm" class="form-grid">
      <div class="field">
        <label for="greenhouseName">İstixana adı</label>
        <input id="greenhouseName" name="name" value="${escapeHtml(greenhouse.name)}" required>
      </div>
      <div class="field">
        <label for="greenhouseLand">Aid olduğu sahə</label>
        <select id="greenhouseLand" name="landId">${landOptions(greenhouse.landId)}</select>
      </div>
      <div class="field">
        <label for="greenhouseSize">Ölçü</label>
        <input id="greenhouseSize" name="size" type="number" min="0" step="0.01" value="${greenhouse.size}" required>
      </div>
      <div class="field">
        <label for="greenhouseStatus">Status</label>
        <select id="greenhouseStatus" name="status">${optionsHtml(greenhouseStatuses, greenhouse.status)}</select>
      </div>
      ${greenhouseCostFields.map((field) => `
        <div class="field">
          <label for="${field.key}">${field.label}</label>
          <input id="${field.key}" name="${field.key}" type="number" min="0" step="0.01" value="${greenhouse[field.key] || 0}">
        </div>
      `).join("")}
      <div class="field">
        <label for="greenhouseCurrency">Valyuta</label>
        <select id="greenhouseCurrency" name="currency">${currencyOptions(greenhouse.currency)}</select>
      </div>
      <div class="field full">
        <label for="greenhouseNote">Qeyd</label>
        <textarea id="greenhouseNote" name="note" rows="3">${escapeHtml(greenhouse.note || "")}</textarea>
      </div>
      <div class="field full">
        <div class="button-row">
          <button class="primary-button" type="submit">Yadda saxla</button>
          <button class="ghost-button" type="button" data-close-modal>Ləğv et</button>
        </div>
      </div>
    </form>
  `, "İstixanalar");

  document.getElementById("greenhouseForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      name: form.get("name").trim(),
      landId: form.get("landId"),
      size: Number(form.get("size")) || 0,
      status: form.get("status"),
      currency: form.get("currency"),
      note: form.get("note").trim()
    };
    greenhouseCostFields.forEach((field) => {
      payload[field.key] = Number(form.get(field.key)) || 0;
    });
    saveGreenhouse(id, payload);
  });
  bindCloseButtons();
}

function openSeedlingModal(id = null) {
  const seedling = appData.seedlings.find((item) => item.id === id) || {
    date: todayISO(),
    sortName: "Murano",
    quantity: 0,
    unitPrice: 0,
    totalAmount: 0,
    currency: "AZN",
    supplier: "",
    landId: appData.lands[0]?.id || "",
    plantingDate: "",
    lostCount: 0,
    note: ""
  };

  openModal(id ? "Fidan qeydini düzəlt" : "Fidan əlavə et", `
    <form id="seedlingForm" class="form-grid">
      <div class="field">
        <label for="seedlingDate">Tarix</label>
        <input id="seedlingDate" name="date" type="date" value="${seedling.date || todayISO()}" required>
      </div>
      <div class="field">
        <label for="sortName">Sort adı</label>
        <input id="sortName" name="sortName" list="sortList" value="${escapeHtml(seedling.sortName || "Murano")}" required>
        <datalist id="sortList">${getSortNames().map((sort) => `<option value="${escapeHtml(sort)}"></option>`).join("")}</datalist>
      </div>
      <div class="field">
        <label for="seedlingQuantity">Miqdar, ədəd</label>
        <input id="seedlingQuantity" name="quantity" type="number" min="0" step="1" value="${seedling.quantity || 0}" required>
      </div>
      <div class="field">
        <label for="seedlingUnitPrice">Bir ədədin qiyməti</label>
        <input id="seedlingUnitPrice" name="unitPrice" type="number" min="0" step="0.0001" value="${seedling.unitPrice || 0}" required>
      </div>
      <div class="field">
        <label for="seedlingTotal">Ümumi məbləğ</label>
        <input id="seedlingTotal" name="totalAmount" value="${formatMoney(seedling.totalAmount || 0, seedling.currency)}" disabled>
      </div>
      <div class="field">
        <label for="seedlingCurrency">Valyuta</label>
        <select id="seedlingCurrency" name="currency">${currencyOptions(seedling.currency)}</select>
      </div>
      <div class="field">
        <label for="seedlingSupplier">Təchizatçı</label>
        <input id="seedlingSupplier" name="supplier" value="${escapeHtml(seedling.supplier || "")}">
      </div>
      <div class="field">
        <label for="seedlingLand">Hansı sahəyə əkildi</label>
        <select id="seedlingLand" name="landId">${landOptions(seedling.landId)}</select>
      </div>
      <div class="field">
        <label for="plantingDate">Əkin tarixi</label>
        <input id="plantingDate" name="plantingDate" type="date" value="${seedling.plantingDate || ""}">
      </div>
      <div class="field">
        <label for="lostCount">Tutmayan / məhv olan fidan sayı</label>
        <input id="lostCount" name="lostCount" type="number" min="0" step="1" value="${seedling.lostCount || 0}">
      </div>
      <div class="field full">
        <label for="seedlingNote">Qeyd</label>
        <textarea id="seedlingNote" name="note" rows="3">${escapeHtml(seedling.note || "")}</textarea>
      </div>
      <div class="field full">
        <div class="button-row">
          <button class="primary-button" type="submit">Yadda saxla</button>
          <button class="ghost-button" type="button" data-close-modal>Ləğv et</button>
        </div>
      </div>
    </form>
  `, "Fidanlar");

  const updateTotal = () => {
    const quantity = Number(document.getElementById("seedlingQuantity").value) || 0;
    const unitPrice = Number(document.getElementById("seedlingUnitPrice").value) || 0;
    const currency = document.getElementById("seedlingCurrency").value;
    document.getElementById("seedlingTotal").value = formatMoney(quantity * unitPrice, currency);
  };
  ["seedlingQuantity", "seedlingUnitPrice", "seedlingCurrency"].forEach((idValue) => {
    document.getElementById(idValue).addEventListener("input", updateTotal);
    document.getElementById(idValue).addEventListener("change", updateTotal);
  });
  updateTotal();

  document.getElementById("seedlingForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const quantity = Number(form.get("quantity")) || 0;
    const unitPrice = Number(form.get("unitPrice")) || 0;
    saveSeedling(id, {
      date: form.get("date"),
      sortName: form.get("sortName").trim(),
      quantity,
      unitPrice,
      totalAmount: quantity * unitPrice,
      currency: form.get("currency"),
      supplier: form.get("supplier").trim(),
      landId: form.get("landId"),
      plantingDate: form.get("plantingDate"),
      lostCount: Number(form.get("lostCount")) || 0,
      note: form.get("note").trim()
    });
  });
  bindCloseButtons();
}

function openMachineModal(id = null) {
  const machine = appData.machines.find((item) => item.id === id) || {
    name: "",
    type: "",
    status: "şəxsi",
    expenseType: "digər",
    amount: 0,
    currency: "AZN",
    date: todayISO(),
    landId: appData.lands[0]?.id || "",
    note: ""
  };

  openModal(id ? "Texnika qeydini düzəlt" : "Texnika əlavə et", `
    <form id="machineForm" class="form-grid">
      <div class="field">
        <label for="machineName">Texnika adı</label>
        <input id="machineName" name="name" value="${escapeHtml(machine.name)}" required>
      </div>
      <div class="field">
        <label for="machineType">Tip</label>
        <input id="machineType" name="type" value="${escapeHtml(machine.type || "")}">
      </div>
      <div class="field">
        <label for="machineStatus">Status</label>
        <select id="machineStatus" name="status">${optionsHtml(machineStatuses, machine.status)}</select>
      </div>
      <div class="field">
        <label for="machineExpenseType">Xərc növü</label>
        <select id="machineExpenseType" name="expenseType">${optionsHtml(machineExpenseTypes, machine.expenseType)}</select>
      </div>
      <div class="field">
        <label for="machineAmount">Məbləğ</label>
        <input id="machineAmount" name="amount" type="number" min="0" step="0.01" value="${machine.amount || 0}">
      </div>
      <div class="field">
        <label for="machineCurrency">Valyuta</label>
        <select id="machineCurrency" name="currency">${currencyOptions(machine.currency)}</select>
      </div>
      <div class="field">
        <label for="machineDate">Tarix</label>
        <input id="machineDate" name="date" type="date" value="${machine.date || todayISO()}">
      </div>
      <div class="field">
        <label for="machineLand">Aid olduğu sahə</label>
        <select id="machineLand" name="landId">${landOptions(machine.landId)}</select>
      </div>
      <div class="field full">
        <label for="machineNote">Qeyd</label>
        <textarea id="machineNote" name="note" rows="3">${escapeHtml(machine.note || "")}</textarea>
      </div>
      <div class="field full">
        <div class="button-row">
          <button class="primary-button" type="submit">Yadda saxla</button>
          <button class="ghost-button" type="button" data-close-modal>Ləğv et</button>
        </div>
      </div>
    </form>
  `, "Texnika");

  document.getElementById("machineForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    saveMachine(id, {
      name: form.get("name").trim(),
      type: form.get("type").trim(),
      status: form.get("status"),
      expenseType: form.get("expenseType"),
      amount: Number(form.get("amount")) || 0,
      currency: form.get("currency"),
      date: form.get("date") || todayISO(),
      landId: form.get("landId"),
      note: form.get("note").trim()
    });
  });
  bindCloseButtons();
}

function openWorkerModal(id = null) {
  const worker = appData.workers.find((item) => item.id === id) || {
    fullName: "",
    phone: "",
    role: "İşçi",
    paymentType: "gündəlik",
    dailyRate: 0,
    monthlySalary: 0,
    canLogin: false,
    username: "",
    password: "",
    permissions: getDefaultWorkerPermissions("İşçi"),
    status: "aktiv",
    note: ""
  };
  const workerPermissions = normalizeWorkerPermissions(worker.role, worker.permissions);
  const workerCanLogin = worker.role === "Sahibkar" || Boolean(worker.canLogin);

  openModal(id ? "İşçini düzəlt" : "İşçi əlavə et", `
    <form id="workerForm" class="form-grid">
      <div class="field worker-personal-field">
        <label for="workerFullName">Ad və soyad</label>
        <input id="workerFullName" name="fullName" value="${escapeHtml(worker.fullName)}">
      </div>
      <div class="field worker-personal-field">
        <label for="workerPhone">Telefon</label>
        <input id="workerPhone" name="phone" value="${escapeHtml(worker.phone || "")}">
      </div>
      <div class="field">
        <label for="workerRole">Vəzifə</label>
        <select id="workerRole" name="role">${optionsHtml(workerRoles, worker.role)}</select>
      </div>
      <div class="field">
        <label for="workerPaymentType">Ödəniş tipi</label>
        <select id="workerPaymentType" name="paymentType">${optionsHtml(paymentTypes, worker.paymentType)}</select>
      </div>
      <div class="field worker-daily-field">
        <label for="workerDailyRate">Gündəlik məbləğ</label>
        <input id="workerDailyRate" name="dailyRate" type="number" min="0" step="0.01" value="${worker.dailyRate || 0}">
      </div>
      <div class="field worker-monthly-field">
        <label for="workerMonthlySalary">Aylıq maaş</label>
        <input id="workerMonthlySalary" name="monthlySalary" type="number" min="0" step="0.01" value="${worker.monthlySalary || 0}">
      </div>
      <div class="field">
        <label for="workerStatus">Status</label>
        <select id="workerStatus" name="status">${optionsHtml(workerStatuses, worker.status)}</select>
      </div>
      <div class="field full form-section login-section">
        <h3>Sistem girişi</h3>
        <p class="muted">Login və parol yalnız bu işçiyə proqramdan istifadə icazəsi veriləndə lazımdır.</p>
      </div>
      <div class="field">
        <label for="workerCanLogin">Proqrama giriş</label>
        <select id="workerCanLogin" name="canLogin">
          <option value="false" ${workerCanLogin ? "" : "selected"}>Bağlı</option>
          <option value="true" ${workerCanLogin ? "selected" : ""}>Açıq</option>
        </select>
      </div>
      <div class="field worker-login-field">
        <label for="workerUsername">Login</label>
        <input id="workerUsername" name="username" autocomplete="off" value="${escapeHtml(worker.username || "")}">
        <span class="source-note">Sistemə giriş üçün bu login yazılır. Ad və soyad da giriş kimi qəbul olunur.</span>
      </div>
      <div class="field worker-login-field">
        <label for="workerPassword">Parol</label>
        <input id="workerPassword" name="password" autocomplete="new-password" value="${escapeHtml(worker.password || "")}">
      </div>
      <div class="field full form-section permission-section">
        <h3>Səlahiyyətlər</h3>
        <p class="muted">Sahibkar bütün sistem üzrə admindir. Digər rollar üçün icazələri ayrıca seçmək olar.</p>
        <div class="permission-grid" id="workerPermissions">
          ${renderWorkerPermissionFields(workerPermissions, worker.role === "Sahibkar")}
        </div>
      </div>
      <div class="field full">
        <label for="workerNote">Qeyd</label>
        <textarea id="workerNote" name="note" rows="3">${escapeHtml(worker.note || "")}</textarea>
      </div>
      <div class="field full">
        <div class="button-row">
          <button class="primary-button" type="submit">Yadda saxla</button>
          <button class="ghost-button" type="button" data-close-modal>Ləğv et</button>
        </div>
      </div>
    </form>
  `, "İşçilər");

  document.getElementById("workerForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const paymentType = form.get("paymentType");
    const isDaily = paymentType === "gündəlik";
    const role = form.get("role");
    const canLogin = role === "Sahibkar" || form.get("canLogin") === "true";
    const fullName = isDaily && role !== "Sahibkar" ? (form.get("fullName").trim() || "Gündəlik işçilər") : form.get("fullName").trim();
    const username = canLogin ? form.get("username").trim() : "";
    const password = canLogin ? form.get("password").trim() : "";
    if (canLogin && (!username || !password)) {
      showToast("Giriş açıqdırsa login və parol yazılmalıdır.", "error");
      return;
    }
    saveWorker(id, {
      fullName,
      phone: isDaily ? "" : form.get("phone").trim(),
      role,
      paymentType,
      dailyRate: isDaily ? Number(form.get("dailyRate")) || 0 : 0,
      monthlySalary: isDaily ? 0 : Number(form.get("monthlySalary")) || 0,
      canLogin,
      username,
      password,
      permissions: collectWorkerPermissions(form, role),
      status: form.get("status"),
      note: form.get("note").trim()
    });
  });
  const updateWorkerPaymentFields = () => {
    const role = document.getElementById("workerRole").value;
    if (role === "Sahibkar") document.getElementById("workerPaymentType").value = "aylıq";
    const isDaily = document.getElementById("workerPaymentType").value === "gündəlik";
    const isOwner = role === "Sahibkar";
    const loginSelect = document.getElementById("workerCanLogin");
    if (isOwner) loginSelect.value = "true";
    loginSelect.disabled = isOwner;
    const canLogin = loginSelect.value === "true";
    document.querySelectorAll(".worker-personal-field").forEach((field) => {
      field.hidden = isDaily && !isOwner;
    });
    document.querySelectorAll(".worker-login-field").forEach((field) => {
      field.hidden = !canLogin;
    });
    document.querySelectorAll(".worker-daily-field").forEach((field) => {
      field.hidden = !isDaily;
    });
    document.querySelectorAll(".worker-monthly-field").forEach((field) => {
      field.hidden = isDaily;
    });
    document.getElementById("workerFullName").required = !isDaily || isOwner;
    if (isDaily) {
      document.getElementById("workerPhone").value = "";
      document.getElementById("workerMonthlySalary").value = "0";
    } else {
      document.getElementById("workerDailyRate").value = "0";
    }
    refreshWorkerPermissionInputs(role);
  };
  document.getElementById("workerPaymentType").addEventListener("change", updateWorkerPaymentFields);
  document.getElementById("workerRole").addEventListener("change", updateWorkerPaymentFields);
  document.getElementById("workerCanLogin").addEventListener("change", updateWorkerPaymentFields);
  updateWorkerPaymentFields();
  bindCloseButtons();
}

function openWorkerDetails(id) {
  const worker = appData.workers.find((item) => item.id === id);
  if (!worker) return;
  const salaries = appData.salaries.filter((salary) => salary.workerId === id);
  const bonus = getWorkerPaidByType(id, "bonus");
  const overtime = getWorkerPaidByType(id, "overtime");
  const advances = getWorkerPaidByType(id, "avans");
  const total = getWorkerPaidTotal(id);

  openModal("İşçi kartı", `
    <div class="detail-grid">
      <div class="detail-item"><span>Ad və soyad</span><strong>${escapeHtml(worker.fullName)}</strong></div>
      <div class="detail-item"><span>Telefon</span><strong>${escapeHtml(worker.phone || "-")}</strong></div>
      <div class="detail-item"><span>Vəzifə</span><strong>${escapeHtml(worker.role || "-")}</strong></div>
      <div class="detail-item"><span>Ödəniş tipi</span><strong>${escapeHtml(worker.paymentType || "-")}</strong></div>
      <div class="detail-item"><span>Gündəlik məbləğ</span><strong>${formatMoney(worker.dailyRate || 0)}</strong></div>
      <div class="detail-item"><span>Aylıq maaş</span><strong>${formatMoney(worker.monthlySalary || 0)}</strong></div>
      <div class="detail-item"><span>Bonuslar</span><strong>${formatMoney(bonus)}</strong></div>
      <div class="detail-item"><span>Overtime</span><strong>${formatMoney(overtime)}</strong></div>
      <div class="detail-item"><span>Avanslar</span><strong>${formatMoney(advances)}</strong></div>
      <div class="detail-item"><span>Ümumi ödənilib</span><strong>${formatMoney(total)}</strong></div>
    </div>
    <div class="section-title compact">
      <h2>Ödəniş tarixçəsi</h2>
      <button class="small-button" id="detailAddSalaryButton" type="button">Ödəniş əlavə et</button>
    </div>
    <div class="table-wrap compact-table">
      <table>
        <thead>
          <tr>
            <th>Tarix</th>
            <th>Növ</th>
            <th>Məbləğ</th>
            <th>Dövr</th>
            <th>Qeyd</th>
          </tr>
        </thead>
        <tbody>
          ${salaries.length ? salaries.map((salary) => `
            <tr>
              <td>${formatDate(salary.date)}</td>
              <td>${escapeHtml(salary.paymentType)}</td>
              <td>${formatMoney(salary.amount || 0, salary.currency)}</td>
              <td>${escapeHtml(salary.period || "-")}</td>
              <td>${escapeHtml(salary.note || "-")}</td>
            </tr>
          `).join("") : emptyTableRow(5, "Ödəniş tarixçəsi yoxdur.")}
        </tbody>
      </table>
    </div>
  `, "İşçilər");

  document.getElementById("detailAddSalaryButton").addEventListener("click", () => openSalaryModal(null, worker.id));
}

function openSalaryModal(id = null, presetWorkerId = "") {
  const salary = appData.salaries.find((item) => item.id === id) || {
    date: todayISO(),
    workerId: presetWorkerId || "",
    workerName: "",
    paymentType: "gündəlik maaş",
    amount: 0,
    workerCount: 1,
    dailyRate: 0,
    workDays: 1,
    currency: "AZN",
    period: "",
    landId: appData.lands[0]?.id || "",
    note: ""
  };

  openModal(id ? "Maaş ödənişini düzəlt" : "Maaş ödənişi əlavə et", `
    <form id="salaryForm" class="form-grid">
      <div class="field">
        <label for="salaryDate">Tarix</label>
        <input id="salaryDate" name="date" type="date" value="${salary.date || todayISO()}" required>
      </div>
      <div class="field">
        <label for="salaryWorker">İşçi</label>
        <select id="salaryWorker" name="workerId">
          <option value="">Briqada / ümumi qeyd</option>
          ${workerOptions(salary.workerId)}
        </select>
      </div>
      <div class="field salary-daily-field">
        <label for="salaryWorkerName">Briqada və ya qeyd adı</label>
        <input id="salaryWorkerName" name="workerName" value="${escapeHtml(salary.workerName || "")}" placeholder="Məs: Gündəlik işçilər">
      </div>
      <div class="field">
        <label for="salaryPaymentType">Ödəniş növü</label>
        <select id="salaryPaymentType" name="paymentType">${optionsHtml(salaryPaymentTypes, salary.paymentType)}</select>
      </div>
      <div class="field salary-daily-field">
        <label for="salaryWorkerCount">İşçi sayı</label>
        <input id="salaryWorkerCount" name="workerCount" type="number" min="1" step="1" value="${salary.workerCount || 1}">
      </div>
      <div class="field salary-daily-field">
        <label for="salaryDailyRate">Gündəlik ödəniş</label>
        <input id="salaryDailyRate" name="dailyRate" type="number" min="0" step="0.01" value="${salary.dailyRate || 0}">
      </div>
      <div class="field salary-daily-field">
        <label for="salaryWorkDays">Gün sayı</label>
        <input id="salaryWorkDays" name="workDays" type="number" min="1" step="0.5" value="${salary.workDays || 1}">
      </div>
      <div class="field">
        <label for="salaryAmount">Məbləğ</label>
        <input id="salaryAmount" name="amount" type="number" min="0" step="0.01" value="${salary.amount || 0}" required>
      </div>
      <div class="field salary-daily-field">
        <label>Avtomatik hesablama</label>
        <div class="conversion-note" id="salaryAutoTotal">0 işçi × 0 AZN × 1 gün = 0 AZN</div>
      </div>
      <div class="field">
        <label for="salaryCurrency">Valyuta</label>
        <select id="salaryCurrency" name="currency">${currencyOptions(salary.currency)}</select>
      </div>
      <div class="field">
        <label for="salaryPeriod">Hansı dövr üçün</label>
        <input id="salaryPeriod" name="period" value="${escapeHtml(salary.period || "")}" placeholder="Məs: 2026-06 və ya 01-07 iyun">
      </div>
      <div class="field">
        <label for="salaryLand">Hansı sahə ilə bağlıdır</label>
        <select id="salaryLand" name="landId">${landOptions(salary.landId)}</select>
      </div>
      <div class="field full">
        <label for="salaryNote">Qeyd</label>
        <textarea id="salaryNote" name="note" rows="3">${escapeHtml(salary.note || "")}</textarea>
      </div>
      <div class="field full">
        <div class="button-row">
          <button class="primary-button" type="submit">Yadda saxla</button>
          <button class="ghost-button" type="button" data-close-modal>Ləğv et</button>
        </div>
      </div>
    </form>
  `, "Maaşlar");

  document.getElementById("salaryForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const paymentType = form.get("paymentType");
    const workerCount = Math.max(1, Number(form.get("workerCount")) || 1);
    const dailyRate = Number(form.get("dailyRate")) || 0;
    const workDays = Math.max(1, Number(form.get("workDays")) || 1);
    const amount = paymentType === "gündəlik maaş" ? workerCount * dailyRate * workDays : Number(form.get("amount")) || 0;
    saveSalary(id, {
      date: form.get("date"),
      workerId: form.get("workerId"),
      workerName: form.get("workerName").trim(),
      paymentType,
      amount,
      workerCount,
      dailyRate,
      workDays,
      currency: form.get("currency"),
      period: form.get("period").trim(),
      landId: form.get("landId"),
      note: form.get("note").trim()
    });
  });
  const updateSalaryDailyFields = () => {
    const isDaily = document.getElementById("salaryPaymentType").value === "gündəlik maaş";
    document.querySelectorAll(".salary-daily-field").forEach((field) => {
      field.hidden = !isDaily;
    });
    const workerCount = Math.max(1, Number(document.getElementById("salaryWorkerCount")?.value) || 1);
    const dailyRate = Number(document.getElementById("salaryDailyRate")?.value) || 0;
    const workDays = Math.max(1, Number(document.getElementById("salaryWorkDays")?.value) || 1);
    const total = workerCount * dailyRate * workDays;
    document.getElementById("salaryAmount").readOnly = isDaily;
    if (isDaily) document.getElementById("salaryAmount").value = total.toFixed(2);
    const totalBox = document.getElementById("salaryAutoTotal");
    if (totalBox) {
      totalBox.textContent = `${workerCount.toLocaleString("az-AZ")} işçi × ${formatMoney(dailyRate, document.getElementById("salaryCurrency").value)} × ${workDays.toLocaleString("az-AZ")} gün = ${formatMoney(total, document.getElementById("salaryCurrency").value)}`;
    }
  };
  ["salaryPaymentType", "salaryWorkerCount", "salaryDailyRate", "salaryWorkDays", "salaryCurrency"].forEach((fieldId) => {
    document.getElementById(fieldId).addEventListener("input", updateSalaryDailyFields);
    document.getElementById(fieldId).addEventListener("change", updateSalaryDailyFields);
  });
  updateSalaryDailyFields();
  bindCloseButtons();
}

function openExpenseModal(id = null) {
  const expense = appData.expenses.find((item) => item.id === id) || {
    date: todayISO(),
    category: "Digər",
    amount: 0,
    currency: "AZN",
    paymentMethod: "nağd",
    supplier: "",
    landId: appData.lands[0]?.id || "",
    greenhouseId: "",
    machineId: "",
    driver: "",
    period: "",
    objectType: "sahə",
    quantity: 0,
    description: "",
    note: "",
    sourceType: "manual",
    sourceId: "",
    isAutoGenerated: false
  };

  if (isAutoExpense(expense)) {
    showToast("Avtomatik xərc mənbə bölməsindən dəyişdirilir.", "warning");
    return;
  }

  openModal(id ? "Xərci redaktə et" : "Əl ilə xərc əlavə et", `
    <form id="expenseForm" class="form-grid">
      <div class="field full form-section">
        <h3>Əsas məlumat</h3>
        <p class="muted">Manual xərci qısa formada daxil edin. Avtomatik xərclər öz mənbəsindən yenilənir.</p>
      </div>
      <div class="field">
        <label for="expenseDate">Tarix</label>
        <input id="expenseDate" name="date" type="date" value="${expense.date || todayISO()}" required>
      </div>
      <div class="field">
        <label for="expenseCategory">Kateqoriya</label>
        <select id="expenseCategory" name="category">${manualExpenseCategories.map((category) => `<option value="${escapeHtml(category)}" ${category === expense.category ? "selected" : ""}>${escapeHtml(category)}</option>`).join("")}</select>
      </div>
      <div class="field">
        <label for="expenseAmount">Məbləğ</label>
        <input id="expenseAmount" name="amount" type="number" min="0" step="0.01" value="${expense.amount || 0}" required>
      </div>
      <div class="field">
        <label for="expenseCurrency">Valyuta</label>
        <select id="expenseCurrency" name="currency">${currencyOptions(expense.currency)}</select>
      </div>
      <div class="field">
        <label for="expensePaymentMethod">Ödəniş üsulu</label>
        <select id="expensePaymentMethod" name="paymentMethod">${optionsHtml(paymentMethods, expense.paymentMethod)}</select>
      </div>
      <div class="field expense-dynamic-field" data-expense-field="supplier">
        <label for="expenseSupplier">Təchizatçı və ya alan şəxs</label>
        <input id="expenseSupplier" name="supplier" value="${escapeHtml(expense.supplier || "")}">
      </div>
      <div class="field expense-dynamic-field" data-expense-field="period">
        <label for="expensePeriod">Dövr</label>
        <input id="expensePeriod" name="period" value="${escapeHtml(expense.period || "")}" placeholder="Məsələn: İyun 2026">
      </div>
      <div class="field expense-dynamic-field" data-expense-field="objectType">
        <label for="expenseObjectType">Aid olduğu obyekt</label>
        <select id="expenseObjectType" name="objectType">
          <option value="sahə" ${expense.objectType === "sahə" ? "selected" : ""}>Sahə</option>
          <option value="istixana" ${expense.objectType === "istixana" ? "selected" : ""}>İstixana</option>
          <option value="texnika" ${expense.objectType === "texnika" ? "selected" : ""}>Texnika</option>
        </select>
      </div>
      <div class="field expense-dynamic-field" data-expense-field="quantity">
        <label for="expenseQuantity">Miqdar</label>
        <input id="expenseQuantity" name="quantity" type="number" min="0" step="0.01" value="${expense.quantity || 0}">
      </div>
      <div class="field expense-dynamic-field" data-expense-field="machine">
        <label for="expenseMachine">Texnika</label>
        <select id="expenseMachine" name="machineId">
          <option value="">Seçilməyib</option>
          ${appData.machines.map((machine) => `<option value="${machine.id}" ${machine.id === expense.machineId ? "selected" : ""}>${escapeHtml(machine.name)}</option>`).join("")}
        </select>
      </div>
      <div class="field expense-dynamic-field" data-expense-field="driver">
        <label for="expenseDriver">Sürücü</label>
        <input id="expenseDriver" name="driver" value="${escapeHtml(expense.driver || "")}">
      </div>
      <div class="field expense-dynamic-field" data-expense-field="land">
        <label for="expenseLand">Aid olduğu sahə</label>
        <select id="expenseLand" name="landId">${landOptions(expense.landId)}</select>
      </div>
      <div class="field expense-dynamic-field" data-expense-field="greenhouse">
        <label for="expenseGreenhouse">Aid olduğu istixana</label>
        <select id="expenseGreenhouse" name="greenhouseId">${greenhouseOptions(expense.greenhouseId)}</select>
      </div>
      <div class="field full expense-dynamic-field" data-expense-field="description">
        <label for="expenseDescription">Təsvir</label>
        <input id="expenseDescription" name="description" value="${escapeHtml(expense.description || "")}">
      </div>
      <div class="field full expense-dynamic-field" data-expense-field="note">
        <label for="expenseNote">Qeyd</label>
        <textarea id="expenseNote" name="note" rows="3">${escapeHtml(expense.note || "")}</textarea>
      </div>
      <div class="field full">
        <div class="button-row">
          <button class="primary-button" type="submit">Yadda saxla</button>
          <button class="ghost-button" type="button" data-close-modal>Ləğv et</button>
        </div>
      </div>
    </form>
  `, "Xərclər");

  document.getElementById("expenseForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    saveExpense(id, {
      date: form.get("date"),
      category: form.get("category"),
      amount: Number(form.get("amount")) || 0,
      currency: form.get("currency"),
      paymentMethod: form.get("paymentMethod"),
      supplier: form.get("supplier").trim(),
      landId: form.get("landId"),
      greenhouseId: form.get("greenhouseId"),
      description: form.get("description").trim(),
      machineId: form.get("machineId") || "",
      driver: form.get("driver").trim(),
      period: form.get("period").trim(),
      objectType: form.get("objectType") || "",
      quantity: Number(form.get("quantity")) || 0,
      note: form.get("note").trim(),
      sourceType: "manual",
      sourceId: "",
      isAutoGenerated: false
    });
  });
  const updateExpenseFields = () => {
    const category = document.getElementById("expenseCategory")?.value || "Digər";
    const visible = new Set(expenseCategoryFields[category] || expenseCategoryFields["Digər"]);
    document.querySelectorAll(".expense-dynamic-field").forEach((field) => {
      field.hidden = !visible.has(field.dataset.expenseField);
    });
  };
  document.getElementById("expenseCategory").addEventListener("change", updateExpenseFields);
  updateExpenseFields();
  bindCloseButtons();
}

function openHarvestModal(id = null) {
  const harvest = appData.harvests.find((item) => item.id === id) || {
    date: todayISO(),
    landId: appData.lands[0]?.id || "",
    greenhouseId: "",
    sortName: "Murano",
    responsiblePerson: appData.workers[0]?.fullName || "",
    note: "",
    rows: [createEmptyHarvestRow()]
  };
  const rows = harvest.rows.length ? structuredClone(harvest.rows) : [createEmptyHarvestRow()];

  openModal(id ? "Məhsul partiyasını düzəlt" : "Məhsul partiyası əlavə et", `
    <form id="harvestForm" class="form-grid">
      <div class="field">
        <label for="harvestDate">Tarix</label>
        <input id="harvestDate" name="date" type="date" value="${harvest.date || todayISO()}" required>
      </div>
      <div class="field">
        <label for="harvestLand">Sahə</label>
        <select id="harvestLand" name="landId">${landOptions(harvest.landId)}</select>
      </div>
      <div class="field">
        <label for="harvestGreenhouse">İstixana</label>
        <select id="harvestGreenhouse" name="greenhouseId">${greenhouseOptions(harvest.greenhouseId)}</select>
      </div>
      <div class="field">
        <label for="harvestSort">Sort</label>
        <input id="harvestSort" name="sortName" list="harvestSortList" value="${escapeHtml(harvest.sortName || "Murano")}" required>
        <datalist id="harvestSortList">${getSortNames().map((sort) => `<option value="${escapeHtml(sort)}"></option>`).join("")}</datalist>
      </div>
      <div class="field">
        <label for="responsiblePerson">Məsul şəxs</label>
        <input id="responsiblePerson" name="responsiblePerson" list="workerNameList" value="${escapeHtml(harvest.responsiblePerson || "")}">
        <datalist id="workerNameList">${appData.workers.map((worker) => `<option value="${escapeHtml(worker.fullName)}"></option>`).join("")}</datalist>
      </div>
      <div class="field full">
        <label for="harvestNote">Qeyd</label>
        <textarea id="harvestNote" name="note" rows="2">${escapeHtml(harvest.note || "")}</textarea>
      </div>
      <div class="field full">
        <div class="harvest-lines-header">
          <strong>Kalibr sətirləri</strong>
          <button class="small-button" id="addHarvestRowButton" type="button">Sətir əlavə et</button>
        </div>
        <div class="harvest-lines" id="harvestRowsEditor"></div>
        <div class="harvest-total">Ümumi kg: <strong id="harvestTotalKg">0 kg</strong></div>
      </div>
      <div class="field full">
        <div class="button-row">
          <button class="primary-button" type="submit">Yadda saxla</button>
          <button class="ghost-button" type="button" data-close-modal>Ləğv et</button>
        </div>
      </div>
    </form>
  `, "Məhsul yığımı");

  const renderRows = () => {
    renderHarvestRowsEditor(rows);
    updateHarvestTotal(rows);
  };
  renderRows();

  document.getElementById("addHarvestRowButton").addEventListener("click", () => {
    rows.push(createEmptyHarvestRow());
    renderRows();
  });

  document.getElementById("harvestForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const validRows = collectHarvestRows(rows).filter((row) => row.quantityKg > 0);
    if (!validRows.length) {
      showToast("Ən azı bir kalibr sətri daxil edin.", "error");
      return;
    }

    saveHarvest(id, {
      date: form.get("date"),
      landId: form.get("landId"),
      greenhouseId: form.get("greenhouseId"),
      sortName: form.get("sortName").trim(),
      responsiblePerson: form.get("responsiblePerson").trim(),
      note: form.get("note").trim(),
      rows: validRows,
      totalKg: validRows.reduce((sum, row) => sum + Number(row.quantityKg || 0), 0)
    });
  });
  bindCloseButtons();
}

function renderHarvestRowsEditor(rows) {
  const container = document.getElementById("harvestRowsEditor");
  if (!container) return;

  container.innerHTML = rows.map((row, index) => `
    <div class="harvest-line" data-row-index="${index}">
      <div class="field">
        <label>Kalibr</label>
        <select data-harvest-field="caliberId">${caliberOptions(row.caliberId)}</select>
      </div>
      <div class="field">
        <label>Miqdar, kg</label>
        <input data-harvest-field="quantityKg" type="number" min="0" step="0.01" value="${row.quantityKg || 0}">
      </div>
      <div class="field">
        <label>Keyfiyyət</label>
        <select data-harvest-field="quality">${optionsHtml(qualityOptions, row.quality)}</select>
      </div>
      <div class="field">
        <label>Qeyd</label>
        <input data-harvest-field="note" value="${escapeHtml(row.note || "")}">
      </div>
      <button class="small-button danger harvest-row-remove" type="button" data-remove-row="${index}">Sil</button>
    </div>
  `).join("");

  container.querySelectorAll("[data-harvest-field]").forEach((field) => {
    field.addEventListener("input", () => syncHarvestRowsFromDom(rows));
    field.addEventListener("change", () => syncHarvestRowsFromDom(rows));
  });
  container.querySelectorAll("[data-remove-row]").forEach((button) => {
    button.addEventListener("click", () => {
      syncHarvestRowsFromDom(rows);
      rows.splice(Number(button.dataset.removeRow), 1);
      if (!rows.length) rows.push(createEmptyHarvestRow());
      renderHarvestRowsEditor(rows);
      updateHarvestTotal(rows);
    });
  });
}

function syncHarvestRowsFromDom(rows) {
  const container = document.getElementById("harvestRowsEditor");
  if (!container) return;
  container.querySelectorAll(".harvest-line").forEach((line) => {
    const index = Number(line.dataset.rowIndex);
    const caliberId = line.querySelector('[data-harvest-field="caliberId"]').value;
    rows[index] = {
      id: rows[index]?.id || generateId("harvest_row"),
      caliberId,
      caliberName: getCaliberName(caliberId),
      quantityKg: Number(line.querySelector('[data-harvest-field="quantityKg"]').value) || 0,
      quality: line.querySelector('[data-harvest-field="quality"]').value,
      note: line.querySelector('[data-harvest-field="note"]').value.trim()
    };
  });
  updateHarvestTotal(rows);
}

function collectHarvestRows(rows) {
  syncHarvestRowsFromDom(rows);
  return rows.map((row) => ({
    id: row.id || generateId("harvest_row"),
    caliberId: row.caliberId || getDefaultCaliberId(),
    caliberName: row.caliberName || getCaliberName(row.caliberId) || "Orta",
    quantityKg: Number(row.quantityKg || 0),
    quality: row.quality || "1-ci sort",
    note: row.note || ""
  }));
}

function updateHarvestTotal(rows) {
  const totalElement = document.getElementById("harvestTotalKg");
  if (!totalElement) return;
  const total = rows.reduce((sum, row) => sum + Number(row.quantityKg || 0), 0);
  totalElement.textContent = `${total.toLocaleString("az-AZ")} kg`;
}

function openStockAdjustmentModal(id = null) {
  const adjustment = appData.stockAdjustments.find((item) => item.id === id) || {
    date: todayISO(),
    caliberId: getDefaultCaliberId(),
    caliberName: getCaliberName(getDefaultCaliberId()),
    type: "əlavə",
    quantityKg: 0,
    reason: "",
    note: ""
  };

  openModal(id ? "Sklad düzəlişini düzəlt" : "Sklad düzəlişi əlavə et", `
    <form id="stockAdjustmentForm" class="form-grid">
      <div class="field">
        <label for="adjustmentDate">Tarix</label>
        <input id="adjustmentDate" name="date" type="date" value="${adjustment.date || todayISO()}" required>
      </div>
      <div class="field">
        <label for="adjustmentCaliber">Kalibr</label>
        <select id="adjustmentCaliber" name="caliberId">${caliberOptions(adjustment.caliberId)}</select>
      </div>
      <div class="field">
        <label for="adjustmentType">Tip</label>
        <select id="adjustmentType" name="type">${optionsHtml(stockAdjustmentTypes, adjustment.type)}</select>
      </div>
      <div class="field">
        <label for="adjustmentQuantity">Miqdar, kg</label>
        <input id="adjustmentQuantity" name="quantityKg" type="number" min="0" step="0.01" value="${adjustment.quantityKg || 0}" required>
      </div>
      <div class="field full">
        <label for="adjustmentReason">Səbəb</label>
        <input id="adjustmentReason" name="reason" value="${escapeHtml(adjustment.reason || "")}" required>
      </div>
      <div class="field full">
        <label for="adjustmentNote">Qeyd</label>
        <textarea id="adjustmentNote" name="note" rows="3">${escapeHtml(adjustment.note || "")}</textarea>
      </div>
      <div class="field full">
        <div class="button-row">
          <button class="primary-button" type="submit">Yadda saxla</button>
          <button class="ghost-button" type="button" data-close-modal>Ləğv et</button>
        </div>
      </div>
    </form>
  `, "Sklad");

  document.getElementById("stockAdjustmentForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const caliberId = form.get("caliberId");
    saveStockAdjustment(id, {
      date: form.get("date"),
      caliberId,
      caliberName: getCaliberName(caliberId),
      type: form.get("type"),
      quantityKg: Number(form.get("quantityKg")) || 0,
      reason: form.get("reason").trim(),
      note: form.get("note").trim()
    });
  });
  bindCloseButtons();
}

function openColdStorageModal(id = null) {
  const entry = appData.coldStorageEntries.find((item) => item.id === id) || {
    date: todayISO(),
    storageName: "",
    phone: "",
    note: "",
    rows: [createEmptyMoneyRow()],
    commissionPercent: 0,
    storageCost: 0,
    paidAmount: 0,
    currency: "AZN",
    status: "gözləmədə"
  };
  const rows = entry.rows.length ? structuredClone(entry.rows) : [createEmptyMoneyRow()];

  openModal(id ? "Soyuducu/anbar qeydini düzəlt" : "Soyuducu/anbar qeydi əlavə et", `
    <form id="coldStorageForm" class="form-grid">
      <div class="field"><label for="coldDate">Tarix</label><input id="coldDate" name="date" type="date" value="${entry.date || todayISO()}" required></div>
      <div class="field"><label for="coldName">Soyuducu / anbar adı</label><input id="coldName" name="storageName" value="${escapeHtml(entry.storageName || "")}" required></div>
      <div class="field"><label for="coldPhone">Əlaqə nömrəsi</label><input id="coldPhone" name="phone" value="${escapeHtml(entry.phone || "")}"></div>
      <div class="field"><label for="coldCurrency">Valyuta</label><select id="coldCurrency" name="currency">${currencyOptions(entry.currency)}</select></div>
      <div class="field full">
        <div class="harvest-lines-header"><strong>Kalibr sətirləri</strong><button class="small-button" id="addColdRowButton" type="button">Sətir əlavə et</button></div>
        <div class="harvest-lines" id="coldRowsEditor"></div>
      </div>
      <div class="field"><label for="commissionPercent">Komissiya faizi</label><input id="commissionPercent" name="commissionPercent" type="number" min="0" step="0.01" value="${entry.commissionPercent || 0}"></div>
      <div class="field"><label for="commissionAmount">Komissiya məbləği</label><input id="commissionAmount" disabled></div>
      <div class="field"><label for="storageCost">Saxlama xərci</label><input id="storageCost" name="storageCost" type="number" min="0" step="0.01" value="${entry.storageCost || 0}"></div>
      <div class="field"><label for="coldTotalAmount">Ümumi məbləğ</label><input id="coldTotalAmount" disabled></div>
      <div class="field"><label for="coldNetAmount">Xalis məbləğ</label><input id="coldNetAmount" disabled></div>
      <div class="field"><label for="coldPaidAmount">Ödənilən məbləğ</label><input id="coldPaidAmount" name="paidAmount" type="number" min="0" step="0.01" value="${entry.paidAmount || 0}"></div>
      <div class="field"><label for="coldDebtAmount">Qalan borc</label><input id="coldDebtAmount" disabled></div>
      <div class="field"><label for="coldStatus">Status</label><select id="coldStatus" name="status">${optionsHtml(coldStorageStatuses, entry.status)}</select></div>
      <div class="field full"><label for="coldNote">Qeyd</label><textarea id="coldNote" name="note" rows="3">${escapeHtml(entry.note || "")}</textarea></div>
      <div class="field full"><div class="button-row"><button class="primary-button" type="submit">Yadda saxla</button><button class="ghost-button" type="button" data-close-modal>Ləğv et</button></div></div>
    </form>
  `, "Soyuducu / Anbar");

  setupMoneyRowsEditor("coldRowsEditor", rows, refreshColdTotals);
  document.getElementById("addColdRowButton").addEventListener("click", () => {
    rows.push(createEmptyMoneyRow());
    setupMoneyRowsEditor("coldRowsEditor", rows, refreshColdTotals);
    refreshColdTotals(rows);
  });
  ["commissionPercent", "storageCost", "coldPaidAmount", "coldCurrency"].forEach((fieldId) => {
    document.getElementById(fieldId).addEventListener("input", () => refreshColdTotals(rows));
    document.getElementById(fieldId).addEventListener("change", () => refreshColdTotals(rows));
  });
  refreshColdTotals(rows);

  document.getElementById("coldStorageForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const validRows = collectMoneyRows("coldRowsEditor", rows).filter((row) => row.quantityKg > 0);
    if (!validRows.length) return showToast("Ən azı bir kalibr sətri daxil edin.", "error");
    const commissionPercent = Number(form.get("commissionPercent")) || 0;
    const storageCost = Number(form.get("storageCost")) || 0;
    const paidAmount = Number(form.get("paidAmount")) || 0;
    const totals = calculateMoneyRowsTotals(validRows, commissionPercent, storageCost, paidAmount);
    if (!canUseStockRows(validRows, id ? { type: "coldStorage", id } : null)) return;
    saveColdStorageEntry(id, {
      date: form.get("date"),
      storageName: form.get("storageName").trim(),
      phone: form.get("phone").trim(),
      note: form.get("note").trim(),
      rows: validRows,
      currency: form.get("currency"),
      status: deriveColdStatus(paidAmount, totals.netAmount),
      commissionPercent,
      commissionAmount: totals.commissionAmount,
      storageCost,
      ...totals
    });
  });
  bindCloseButtons();
}

function openSaleModal(id = null) {
  const sale = appData.sales.find((item) => item.id === id) || {
    date: todayISO(),
    channel: "Topdançı",
    customerName: "",
    phone: "",
    productSource: "sahədən",
    landId: appData.lands[0]?.id || "",
    greenhouseId: "",
    sortName: "Murano",
    note: "",
    rows: [createEmptyMoneyRow()],
    paidAmount: 0,
    paymentMethod: "nağd",
    currency: "AZN",
    status: "ödənməyib",
    transportCost: 0,
    driver: ""
  };
  const rows = sale.rows.length ? structuredClone(sale.rows) : [createEmptyMoneyRow()];

  openModal(id ? "Satışı düzəlt" : "Satış əlavə et", `
    <form id="saleForm" class="form-grid">
      <div class="field"><label for="saleDate">Tarix</label><input id="saleDate" name="date" type="date" value="${sale.date || todayISO()}" required></div>
      <div class="field"><label for="saleChannel">Satış kanalı</label><select id="saleChannel" name="channel">${optionsHtml(saleChannels, sale.channel)}</select></div>
      <div class="field"><label for="saleCustomer">Müştəri adı</label><input id="saleCustomer" name="customerName" value="${escapeHtml(sale.customerName || "")}" required></div>
      <div class="field"><label for="salePhone">Telefon</label><input id="salePhone" name="phone" value="${escapeHtml(sale.phone || "")}"></div>
      <div class="field"><label for="productSource">Məhsul mənbəyi</label><select id="productSource" name="productSource">${optionsHtml(productSources, sale.productSource)}</select></div>
      <div class="field"><label for="saleLand">Sahə</label><select id="saleLand" name="landId">${landOptions(sale.landId)}</select></div>
      <div class="field"><label for="saleGreenhouse">İstixana</label><select id="saleGreenhouse" name="greenhouseId">${greenhouseOptions(sale.greenhouseId)}</select></div>
      <div class="field"><label for="saleSort">Sort</label><input id="saleSort" name="sortName" list="saleSortList" value="${escapeHtml(sale.sortName || "Murano")}"><datalist id="saleSortList">${getSortNames().map((sort) => `<option value="${escapeHtml(sort)}"></option>`).join("")}</datalist></div>
      <div class="field full">
        <div class="harvest-lines-header"><strong>Kalibr sətirləri</strong><button class="small-button" id="addSaleRowButton" type="button">Sətir əlavə et</button></div>
        <div class="harvest-lines" id="saleRowsEditor"></div>
      </div>
      <div class="field"><label for="saleTotalAmount">Ümumi məbləğ</label><input id="saleTotalAmount" disabled></div>
      <div class="field"><label for="salePaidAmount">Ödənilən məbləğ</label><input id="salePaidAmount" name="paidAmount" type="number" min="0" step="0.01" value="${sale.paidAmount || 0}"></div>
      <div class="field"><label for="saleDebtAmount">Qalan borc</label><input id="saleDebtAmount" disabled></div>
      <div class="field"><label for="salePaymentMethod">Ödəniş üsulu</label><select id="salePaymentMethod" name="paymentMethod">${optionsHtml(paymentMethods, sale.paymentMethod)}</select></div>
      <div class="field"><label for="saleCurrency">Valyuta</label><select id="saleCurrency" name="currency">${currencyOptions(sale.currency)}</select></div>
      <div class="field"><label for="saleStatus">Status</label><select id="saleStatus" name="status">${optionsHtml(saleStatuses, sale.status)}</select></div>
      <div class="field"><label for="transportCost">Nəqliyyat xərci</label><input id="transportCost" name="transportCost" type="number" min="0" step="0.01" value="${sale.transportCost || 0}"></div>
      <div class="field"><label for="saleDriver">Sürücü</label><input id="saleDriver" name="driver" value="${escapeHtml(sale.driver || "")}"></div>
      <div class="field full"><label for="saleNote">Qeyd</label><textarea id="saleNote" name="note" rows="3">${escapeHtml(sale.note || "")}</textarea></div>
      <div class="field full"><div class="button-row"><button class="primary-button" type="submit">Yadda saxla</button><button class="ghost-button" type="button" data-close-modal>Ləğv et</button></div></div>
    </form>
  `, "Satışlar");

  setupMoneyRowsEditor("saleRowsEditor", rows, refreshSaleTotals);
  document.getElementById("addSaleRowButton").addEventListener("click", () => {
    rows.push(createEmptyMoneyRow());
    setupMoneyRowsEditor("saleRowsEditor", rows, refreshSaleTotals);
    refreshSaleTotals(rows);
  });
  ["salePaidAmount", "saleCurrency"].forEach((fieldId) => {
    document.getElementById(fieldId).addEventListener("input", () => refreshSaleTotals(rows));
    document.getElementById(fieldId).addEventListener("change", () => refreshSaleTotals(rows));
  });
  refreshSaleTotals(rows);

  document.getElementById("saleForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const validRows = collectMoneyRows("saleRowsEditor", rows).filter((row) => row.quantityKg > 0);
    if (!validRows.length) return showToast("Ən azı bir kalibr sətri daxil edin.", "error");
    if (!canUseStockRows(validRows, id ? { type: "sale", id } : null)) return;
    const paidAmount = Number(form.get("paidAmount")) || 0;
    const totals = calculateMoneyRowsTotals(validRows, 0, 0, paidAmount);
    saveSale(id, {
      date: form.get("date"),
      channel: form.get("channel"),
      customerName: form.get("customerName").trim(),
      phone: form.get("phone").trim(),
      productSource: form.get("productSource"),
      landId: form.get("landId"),
      greenhouseId: form.get("greenhouseId"),
      sortName: form.get("sortName").trim() || "Murano",
      note: form.get("note").trim(),
      rows: validRows,
      currency: form.get("currency"),
      paymentMethod: form.get("paymentMethod"),
      paidAmount,
      status: deriveSaleStatus(paidAmount, totals.totalAmount),
      transportCost: Number(form.get("transportCost")) || 0,
      driver: form.get("driver").trim(),
      totalKg: totals.totalKg,
      totalAmount: totals.totalAmount,
      debtAmount: Math.max(0, totals.totalAmount - paidAmount)
    });
  });
  bindCloseButtons();
}

function openCustomerModal(id = null) {
  const customer = appData.customers.find((item) => item.id === id) || {
    name: "",
    phone: "",
    type: "topdançı",
    address: "",
    note: ""
  };
  openModal(id ? "Müştərini düzəlt" : "Müştəri əlavə et", `
    <form id="customerForm" class="form-grid">
      <div class="field"><label for="customerName">Müştəri adı</label><input id="customerName" name="name" value="${escapeHtml(customer.name)}" required></div>
      <div class="field"><label for="customerPhone">Telefon</label><input id="customerPhone" name="phone" value="${escapeHtml(customer.phone || "")}"></div>
      <div class="field"><label for="customerType">Tip</label><select id="customerType" name="type">${optionsHtml(customerTypes, customer.type)}</select></div>
      <div class="field"><label for="customerAddress">Ünvan</label><input id="customerAddress" name="address" value="${escapeHtml(customer.address || "")}"></div>
      <div class="field full"><label for="customerNote">Qeyd</label><textarea id="customerNote" name="note" rows="3">${escapeHtml(customer.note || "")}</textarea></div>
      <div class="field full"><div class="button-row"><button class="primary-button" type="submit">Yadda saxla</button><button class="ghost-button" type="button" data-close-modal>Ləğv et</button></div></div>
    </form>
  `, "Müştərilər");
  document.getElementById("customerForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    saveCustomer(id, {
      name: form.get("name").trim(),
      phone: form.get("phone").trim(),
      type: form.get("type"),
      address: form.get("address").trim(),
      note: form.get("note").trim()
    });
  });
  bindCloseButtons();
}

function openCustomerDetails(id) {
  const customer = appData.customers.find((item) => item.id === id);
  if (!customer) return;
  const stats = getCustomerStats(id);
  const sales = appData.sales.filter((sale) => sale.customerId === id);
  openModal("Müştəri kartı", `
    <div class="detail-grid">
      <div class="detail-item"><span>Müştəri</span><strong>${escapeHtml(customer.name)}</strong></div>
      <div class="detail-item"><span>Telefon</span><strong>${escapeHtml(customer.phone || "-")}</strong></div>
      <div class="detail-item"><span>Tip</span><strong>${escapeHtml(customer.type || "-")}</strong></div>
      <div class="detail-item"><span>Son alış</span><strong>${formatDate(stats.lastDate) || "-"}</strong></div>
      <div class="detail-item"><span>Ümumi alış</span><strong>${formatMoney(stats.total)}</strong></div>
      <div class="detail-item"><span>Ödənilib</span><strong>${formatMoney(stats.paid)}</strong></div>
      <div class="detail-item"><span>Borc</span><strong>${formatMoney(stats.debt)}</strong></div>
    </div>
    <div class="section-title compact"><h2>Satış tarixçəsi</h2></div>
    <div class="table-wrap compact-table">
      <table>
        <thead><tr><th>Tarix</th><th>Kalibrlər</th><th>Ümumi</th><th>Ödənilib</th><th>Borc</th></tr></thead>
        <tbody>
          ${sales.length ? sales.map((sale) => `
            <tr>
              <td>${formatDate(sale.date)}</td>
              <td>${formatMoneyRowsSummary(sale.rows)}</td>
              <td>${formatMoney(sale.totalAmount || 0, sale.currency)}</td>
              <td>${formatMoney(sale.paidAmount || 0, sale.currency)}</td>
              <td>${formatMoney(sale.debtAmount || 0, sale.currency)}</td>
            </tr>
          `).join("") : emptyTableRow(5, "Satış tarixçəsi yoxdur.")}
        </tbody>
      </table>
    </div>
  `, "Müştərilər");
}

function openDebtPaymentModal(sourceType, sourceId) {
  const source = getDebtSource(sourceType, sourceId);
  if (!source) return;
  const remaining = Number(source.debtAmount || 0);
  openModal("Qismən ödəniş", `
    <form id="debtPaymentForm" class="form-grid">
      <div class="field"><label>Borc qalığı</label><input value="${formatMoney(remaining, source.currency)}" disabled></div>
      <div class="field"><label for="debtPaymentDate">Tarix</label><input id="debtPaymentDate" name="date" type="date" value="${todayISO()}" required></div>
      <div class="field"><label for="debtPaymentAmount">Məbləğ</label><input id="debtPaymentAmount" name="amount" type="number" min="0" max="${remaining}" step="0.01" value="${remaining}" required></div>
      <div class="field"><label for="debtPaymentMethod">Ödəniş üsulu</label><select id="debtPaymentMethod" name="paymentMethod">${optionsHtml(paymentMethods, "nağd")}</select></div>
      <div class="field full"><label for="debtPaymentNote">Qeyd</label><textarea id="debtPaymentNote" name="note" rows="3"></textarea></div>
      <div class="field full"><div class="button-row"><button class="primary-button" type="submit">Ödənişi yadda saxla</button><button class="ghost-button" type="button" data-close-modal>Ləğv et</button></div></div>
    </form>
  `, "Borclar");
  document.getElementById("debtPaymentForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    applyDebtPayment(sourceType, sourceId, {
      date: form.get("date"),
      amount: Math.min(Number(form.get("amount")) || 0, remaining),
      currency: source.currency,
      paymentMethod: form.get("paymentMethod"),
      payer: source.customerName || source.storageName || "",
      note: form.get("note").trim()
    });
  });
  bindCloseButtons();
}

function openDebtHistoryModal(sourceType, sourceId) {
  const source = getDebtSource(sourceType, sourceId);
  if (!source) return;
  const payments = appData.debtPayments.filter((payment) => payment.sourceType === sourceType && payment.sourceId === sourceId);
  openModal("Ödəniş tarixçəsi", `
    <div class="detail-grid">
      <div class="detail-item"><span>Mənbə</span><strong>${escapeHtml(source.customerName || source.storageName || "-")}</strong></div>
      <div class="detail-item"><span>Qalan borc</span><strong>${formatMoney(source.debtAmount || 0, source.currency)}</strong></div>
    </div>
    <div class="table-wrap compact-table">
      <table>
        <thead><tr><th>Tarix</th><th>Məbləğ</th><th>Üsul</th><th>Qeyd</th></tr></thead>
        <tbody>
          ${payments.length ? payments.map((payment) => `
            <tr>
              <td>${formatDate(payment.date)}</td>
              <td>${formatMoney(payment.amount || 0, payment.currency)}</td>
              <td>${escapeHtml(payment.paymentMethod || "-")}</td>
              <td>${escapeHtml(payment.note || "-")}</td>
            </tr>
          `).join("") : emptyTableRow(4, "Ödəniş tarixçəsi yoxdur.")}
        </tbody>
      </table>
    </div>
  `, "Borclar");
}

function openCaliberModal(id = null) {
  const caliber = appData.calibers.find((item) => item.id === id) || { name: "", type: "caliber", note: "" };
  openModal(id ? "Kalibri düzəlt" : "Kalibr əlavə et", `
    <form id="caliberForm" class="form-grid">
      <div class="field">
        <label for="caliberName">Ad</label>
        <input id="caliberName" name="name" value="${escapeHtml(caliber.name)}" required>
      </div>
      <div class="field">
        <label for="caliberType">Tip</label>
        <select id="caliberType" name="type">
          <option value="caliber" ${caliber.type === "caliber" ? "selected" : ""}>Kalibr</option>
          <option value="sort" ${caliber.type === "sort" ? "selected" : ""}>Sort</option>
        </select>
      </div>
      <div class="field full">
        <label for="caliberNote">Qeyd</label>
        <input id="caliberNote" name="note" value="${escapeHtml(caliber.note || "")}">
      </div>
      <div class="field full">
        <div class="button-row">
          <button class="primary-button" type="submit">Yadda saxla</button>
          <button class="ghost-button" type="button" data-close-modal>Ləğv et</button>
        </div>
      </div>
    </form>
  `, "Ayarlar");

  document.getElementById("caliberForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      name: form.get("name").trim(),
      type: form.get("type"),
      note: form.get("note").trim()
    };

    if (id) updateRecord("calibers", id, payload);
    else addRecord("calibers", payload, "caliber");
  });
  bindCloseButtons();
}

function saveHarvest(id, payload) {
  const record = id ? { ...appData.harvests.find((item) => item.id === id), ...payload, id } : { id: generateId("harvest"), ...payload };
  if (id) {
    appData.harvests = appData.harvests.map((item) => item.id === id ? record : item);
  } else {
    appData.harvests.push(record);
  }
  ensureSort(record.sortName);
  saveData();
  closeModal();
  renderApp();
  showToast(id ? "Məhsul partiyası yeniləndi." : "Məhsul partiyası əlavə edildi.", "success");
}

function saveColdStorageEntry(id, payload) {
  const record = id ? { ...appData.coldStorageEntries.find((item) => item.id === id), ...payload, id } : { id: generateId("cold_storage"), ...payload };
  if (id) appData.coldStorageEntries = appData.coldStorageEntries.map((item) => item.id === id ? record : item);
  else appData.coldStorageEntries.push(record);
  syncColdStorageExpense(record);
  saveData();
  closeModal();
  renderApp();
  showToast(id ? "Soyuducu/anbar qeydi yeniləndi." : "Soyuducu/anbar qeydi əlavə edildi.", "success");
}

function deleteColdStorageEntry(id) {
  appData.coldStorageEntries = appData.coldStorageEntries.filter((item) => item.id !== id);
  appData.debtPayments = appData.debtPayments.filter((payment) => !(payment.sourceType === "coldStorage" && payment.sourceId === id));
  removeLinkedExpenses("coldStorage", id);
  saveData();
  closeModal();
  renderApp();
  showToast("Soyuducu/anbar qeydi silindi.", "warning");
}

function saveSale(id, payload) {
  const customer = ensureCustomerFromSale(payload);
  const record = id ? { ...appData.sales.find((item) => item.id === id), ...payload, customerId: customer.id, id } : { id: generateId("sale"), ...payload, customerId: customer.id };
  if (id) appData.sales = appData.sales.map((item) => item.id === id ? record : item);
  else appData.sales.push(record);
  ensureSort(record.sortName);
  syncSaleTransportExpense(record);
  saveData();
  closeModal();
  renderApp();
  showToast(id ? "Satış yeniləndi." : "Satış əlavə edildi.", "success");
}

function deleteSale(id) {
  appData.sales = appData.sales.filter((item) => item.id !== id);
  appData.debtPayments = appData.debtPayments.filter((payment) => !(payment.sourceType === "sale" && payment.sourceId === id));
  removeLinkedExpenses("saleTransport", id);
  saveData();
  closeModal();
  renderApp();
  showToast("Satış silindi.", "warning");
}

function saveCustomer(id, payload) {
  const record = id ? { ...appData.customers.find((item) => item.id === id), ...payload, id } : { id: generateId("customer"), ...payload };
  if (id) appData.customers = appData.customers.map((item) => item.id === id ? record : item);
  else appData.customers.push(record);
  saveData();
  closeModal();
  renderApp();
  showToast(id ? "Müştəri yeniləndi." : "Müştəri əlavə edildi.", "success");
}

function deleteCustomer(id) {
  if (appData.sales.some((sale) => sale.customerId === id)) {
    closeModal();
    showToast("Bu müştərinin satış tarixçəsi var, əvvəl satışları silin.", "warning");
    return;
  }
  appData.customers = appData.customers.filter((item) => item.id !== id);
  saveData();
  closeModal();
  renderApp();
  showToast("Müştəri silindi.", "warning");
}

function applyDebtPayment(sourceType, sourceId, payment) {
  if (payment.amount <= 0) return showToast("Ödəniş məbləği 0-dan böyük olmalıdır.", "error");
  const source = getDebtSource(sourceType, sourceId);
  if (!source) return;
  const amount = Math.min(payment.amount, Number(source.debtAmount || 0));
  appData.debtPayments.push({ id: generateId("debt_payment"), sourceType, sourceId, ...payment, amount });
  source.paidAmount = Number(source.paidAmount || 0) + amount;
  if (sourceType === "sale") {
    source.debtAmount = Math.max(0, Number(source.totalAmount || 0) - Number(source.paidAmount || 0));
    source.status = deriveSaleStatus(source.paidAmount, source.totalAmount);
  } else {
    source.debtAmount = Math.max(0, Number(source.netAmount || 0) - Number(source.paidAmount || 0));
    source.status = deriveColdStatus(source.paidAmount, source.netAmount);
  }
  saveData();
  closeModal();
  renderApp();
  showToast("Ödəniş qeydə alındı.", "success");
}

function markDebtFullyPaid(sourceType, sourceId) {
  const source = getDebtSource(sourceType, sourceId);
  if (!source || Number(source.debtAmount || 0) <= 0) return;
  applyDebtPayment(sourceType, sourceId, {
    date: todayISO(),
    amount: Number(source.debtAmount || 0),
    currency: source.currency || "AZN",
    paymentMethod: "nağd",
    payer: source.customerName || source.storageName || "",
    note: "Tam ödəniş"
  });
}

function deleteHarvest(id) {
  appData.harvests = appData.harvests.filter((item) => item.id !== id);
  saveData();
  closeModal();
  renderApp();
  showToast("Məhsul partiyası silindi.", "warning");
}

function saveStockAdjustment(id, payload) {
  const record = id ? { ...appData.stockAdjustments.find((item) => item.id === id), ...payload, id } : { id: generateId("stock_adjustment"), ...payload };
  if (id) {
    appData.stockAdjustments = appData.stockAdjustments.map((item) => item.id === id ? record : item);
  } else {
    appData.stockAdjustments.push(record);
  }
  saveData();
  closeModal();
  renderApp();
  showToast(id ? "Sklad düzəlişi yeniləndi." : "Sklad düzəlişi əlavə edildi.", "success");
}

function deleteStockAdjustment(id) {
  appData.stockAdjustments = appData.stockAdjustments.filter((item) => item.id !== id);
  saveData();
  closeModal();
  renderApp();
  showToast("Sklad düzəlişi silindi.", "warning");
}

function saveWorker(id, payload) {
  const role = normalizeWorkerRole(payload.role);
  const canLogin = role === "Sahibkar" || Boolean(payload.canLogin);
  const username = canLogin ? String(payload.username || "").trim() : "";
  if (canLogin) {
    const duplicate = appData.workers.some((worker) => worker.id !== id && worker.canLogin && normalizeLogin(worker.username) === normalizeLogin(username));
    if (duplicate) {
      showToast("Bu login artıq istifadə olunur.", "error");
      return;
    }
  }
  const record = id
    ? { ...appData.workers.find((item) => item.id === id), ...payload, id, role, canLogin }
    : { id: generateId("worker"), ...payload, role, canLogin };
  record.username = username;
  record.password = canLogin ? String(payload.password || "") : "";
  record.permissions = normalizeWorkerPermissions(role, payload.permissions);
  if (role === "Sahibkar") {
    record.paymentType = "aylıq";
    record.dailyRate = 0;
    record.permissions = getDefaultWorkerPermissions("Sahibkar");
  }
  if (id) {
    appData.workers = appData.workers.map((item) => item.id === id ? record : item);
  } else {
    appData.workers.push(record);
  }
  if (activeUser?.id === record.id) activeUser = record;
  completeSave(id ? "İşçi yeniləndi." : "İşçi əlavə edildi.");
}

function deleteWorker(id) {
  const worker = appData.workers.find((item) => item.id === id);
  if (worker?.role === "Sahibkar") {
    showToast("Sahibkar hesabını silmək olmaz.", "error");
    closeModal();
    return;
  }
  const salaryIds = appData.salaries.filter((salary) => salary.workerId === id).map((salary) => salary.id);
  appData.workers = appData.workers.filter((worker) => worker.id !== id);
  appData.salaries = appData.salaries.filter((salary) => salary.workerId !== id);
  appData.expenses = appData.expenses.filter((expense) => !(expense.sourceType === "salary" && salaryIds.includes(expense.sourceId)));
  saveData();
  closeModal();
  renderApp();
  showToast("İşçi, maaş tarixçəsi və bağlı xərclər silindi.", "warning");
}

function saveSalary(id, payload) {
  const record = id ? { ...appData.salaries.find((item) => item.id === id), ...payload, id } : { id: generateId("salary"), ...payload };
  if (id) {
    appData.salaries = appData.salaries.map((item) => item.id === id ? record : item);
  } else {
    appData.salaries.push(record);
  }
  syncSalaryExpense(record);
  completeSave(id ? "Maaş ödənişi yeniləndi." : "Maaş ödənişi əlavə edildi.");
}

function deleteSalary(id) {
  appData.salaries = appData.salaries.filter((salary) => salary.id !== id);
  removeLinkedExpenses("salary", id);
  saveData();
  closeModal();
  renderApp();
  showToast("Maaş ödənişi və bağlı xərc silindi.", "warning");
}

function saveExpense(id, payload) {
  const record = id
    ? { ...appData.expenses.find((item) => item.id === id), ...payload, id, sourceType: "manual", sourceId: "", sourceKey: "", isAutoGenerated: false }
    : { id: generateId("expense"), ...payload, sourceType: "manual", sourceId: "", sourceKey: "", isAutoGenerated: false };
  if (id) {
    appData.expenses = appData.expenses.map((item) => item.id === id ? record : item);
  } else {
    appData.expenses.push(record);
  }
  completeSave(id ? "Xərc yeniləndi." : "Xərc əlavə edildi.");
}

function deleteExpense(id) {
  const expense = appData.expenses.find((item) => item.id === id);
  if (expense?.sourceType && expense.sourceType !== "manual") {
    closeModal();
    showToast("Avtomatik xərc mənbə bölməsindən silinir.", "warning");
    return;
  }
  appData.expenses = appData.expenses.filter((item) => item.id !== id);
  saveData();
  closeModal();
  renderApp();
  showToast("Xərc silindi.", "warning");
}

function saveLand(id, payload) {
  const record = id ? { ...appData.lands.find((item) => item.id === id), ...payload, id } : { id: generateId("land"), ...payload };
  if (id) {
    appData.lands = appData.lands.map((item) => item.id === id ? record : item);
  } else {
    appData.lands.push(record);
  }
  syncLandExpense(record);
  completeSave(id ? "Sahə yeniləndi." : "Sahə əlavə edildi.");
}

function deleteLand(id) {
  appData.lands = appData.lands.filter((item) => item.id !== id);
  removeLinkedExpenses("landRent", id);
  saveData();
  closeModal();
  renderApp();
  showToast("Sahə və bağlı icarə xərci silindi.", "warning");
}

function saveGreenhouse(id, payload) {
  const record = id ? { ...appData.greenhouses.find((item) => item.id === id), ...payload, id } : { id: generateId("greenhouse"), ...payload };
  if (id) {
    appData.greenhouses = appData.greenhouses.map((item) => item.id === id ? record : item);
  } else {
    appData.greenhouses.push(record);
  }
  syncGreenhouseExpenses(record);
  completeSave(id ? "İstixana yeniləndi." : "İstixana əlavə edildi.");
}

function deleteGreenhouse(id) {
  appData.greenhouses = appData.greenhouses.filter((item) => item.id !== id);
  removeLinkedExpenses("greenhouse", id);
  saveData();
  closeModal();
  renderApp();
  showToast("İstixana və bağlı xərclər silindi.", "warning");
}

function saveSeedling(id, payload) {
  const record = id ? { ...appData.seedlings.find((item) => item.id === id), ...payload, id } : { id: generateId("seedling"), ...payload };
  if (id) {
    appData.seedlings = appData.seedlings.map((item) => item.id === id ? record : item);
  } else {
    appData.seedlings.push(record);
  }
  ensureSort(record.sortName);
  syncSeedlingExpense(record);
  completeSave(id ? "Fidan qeydi yeniləndi." : "Fidan qeydi əlavə edildi.");
}

function deleteSeedling(id) {
  appData.seedlings = appData.seedlings.filter((item) => item.id !== id);
  removeLinkedExpenses("seedling", id);
  saveData();
  closeModal();
  renderApp();
  showToast("Fidan qeydi və bağlı xərc silindi.", "warning");
}

function saveMachine(id, payload) {
  const record = id ? { ...appData.machines.find((item) => item.id === id), ...payload, id } : { id: generateId("machine"), ...payload };
  if (id) {
    appData.machines = appData.machines.map((item) => item.id === id ? record : item);
  } else {
    appData.machines.push(record);
  }
  syncMachineExpense(record);
  completeSave(id ? "Texnika qeydi yeniləndi." : "Texnika qeydi əlavə edildi.");
}

function deleteMachine(id) {
  appData.machines = appData.machines.filter((item) => item.id !== id);
  removeLinkedExpenses("machine", id);
  saveData();
  closeModal();
  renderApp();
  showToast("Texnika qeydi və bağlı xərc silindi.", "warning");
}

function completeSave(message) {
  saveData();
  closeModal();
  renderApp();
  showToast(message, "success");
}

function syncLandExpense(land) {
  const records = [];
  if (Number(land.annualRent) > 0) {
    records.push({
      sourceType: "landRent",
      sourceId: land.id,
      sourceKey: "annualRent",
      category: "Torpaq icarəsi",
      description: `${land.name} - illik torpaq icarəsi`,
      amount: Number(land.annualRent) || 0,
      currency: land.currency || "AZN",
      date: land.leaseStartDate || todayISO(),
      paymentMethod: "bank köçürməsi",
      supplier: land.rentOwner || "",
      landId: land.id,
      greenhouseId: "",
      note: land.note || ""
    });
  }
  replaceLinkedExpenses("landRent", land.id, records);
}

function syncGreenhouseExpenses(greenhouse) {
  const records = greenhouseCostFields
    .filter((field) => Number(greenhouse[field.key]) > 0)
    .map((field) => ({
      sourceType: "greenhouse",
      sourceId: greenhouse.id,
      sourceKey: field.key,
      category: field.category,
      description: `${greenhouse.name} - ${field.label}`,
      amount: Number(greenhouse[field.key]) || 0,
      currency: greenhouse.currency || "AZN",
      date: todayISO(),
      paymentMethod: "nağd",
      supplier: "",
      landId: greenhouse.landId || "",
      greenhouseId: greenhouse.id,
      note: greenhouse.note || ""
    }));
  replaceLinkedExpenses("greenhouse", greenhouse.id, records);
}

function syncSeedlingExpense(seedling) {
  const records = [];
  if (Number(seedling.totalAmount) > 0) {
    records.push({
      sourceType: "seedling",
      sourceId: seedling.id,
      sourceKey: "totalAmount",
      category: "Fidanlar",
      description: `${seedling.sortName} fidan alışı`,
      amount: Number(seedling.totalAmount) || 0,
      currency: seedling.currency || "AZN",
      date: seedling.date || todayISO(),
      paymentMethod: "bank köçürməsi",
      supplier: seedling.supplier || "",
      landId: seedling.landId || "",
      greenhouseId: "",
      note: seedling.note || ""
    });
  }
  replaceLinkedExpenses("seedling", seedling.id, records);
}

function syncSalaryExpense(salary) {
  const records = [];
  if (Number(salary.amount) > 0) {
    records.push({
      sourceType: "salary",
      sourceId: salary.id,
      sourceKey: salary.paymentType,
      category: "Maaşlar",
      description: `${getSalaryWorkerLabel(salary)} - ${salary.paymentType}`,
      amount: Number(salary.amount) || 0,
      currency: salary.currency || "AZN",
      date: salary.date || todayISO(),
      paymentMethod: "nağd",
      supplier: getSalaryWorkerLabel(salary),
      landId: salary.landId || "",
      greenhouseId: "",
      note: salary.note || ""
    });
  }
  replaceLinkedExpenses("salary", salary.id, records);
}

function syncMachineExpense(machine) {
  const records = [];
  if (Number(machine.amount) > 0) {
    records.push({
      sourceType: "machine",
      sourceId: machine.id,
      sourceKey: machine.expenseType,
      category: "Texnika",
      description: `${machine.name} - ${machine.expenseType}`,
      amount: Number(machine.amount) || 0,
      currency: machine.currency || "AZN",
      date: machine.date || todayISO(),
      paymentMethod: machine.expenseType === "yanacaq" ? "nağd" : "bank köçürməsi",
      supplier: "",
      landId: machine.landId || "",
      greenhouseId: "",
      note: machine.note || ""
    });
  }
  replaceLinkedExpenses("machine", machine.id, records);
}

function syncColdStorageExpense(entry) {
  const records = [];
  if (Number(entry.storageCost) > 0) {
    records.push({
      sourceType: "coldStorage",
      sourceId: entry.id,
      sourceKey: "storageCost",
      category: "Soyuducu / Anbar",
      description: `${entry.storageName || "Soyuducu/anbar"} - saxlama xərci`,
      amount: Number(entry.storageCost) || 0,
      currency: entry.currency || "AZN",
      date: entry.date || todayISO(),
      paymentMethod: "borc",
      supplier: entry.storageName || "",
      landId: "",
      greenhouseId: "",
      note: entry.note || ""
    });
  }
  replaceLinkedExpenses("coldStorage", entry.id, records);
}

function syncSaleTransportExpense(sale) {
  const records = [];
  if (Number(sale.transportCost) > 0) {
    records.push({
      sourceType: "saleTransport",
      sourceId: sale.id,
      sourceKey: "transportCost",
      category: "Nəqliyyat",
      description: `${sale.customerName || "Satış"} - nəqliyyat xərci`,
      amount: Number(sale.transportCost) || 0,
      currency: sale.currency || "AZN",
      date: sale.date || todayISO(),
      paymentMethod: "nağd",
      supplier: sale.driver || "",
      landId: sale.landId || "",
      greenhouseId: sale.greenhouseId || "",
      driver: sale.driver || "",
      note: sale.note || ""
    });
  }
  replaceLinkedExpenses("saleTransport", sale.id, records);
}

function replaceLinkedExpenses(sourceType, sourceId, records) {
  removeLinkedExpenses(sourceType, sourceId);
  records.forEach((record) => {
    appData.expenses.push({ id: generateId("expense"), ...record, isAutoGenerated: true });
  });
}

function removeLinkedExpenses(sourceType, sourceId) {
  appData.expenses = appData.expenses.filter((expense) => !(expense.sourceType === sourceType && expense.sourceId === sourceId));
}

function addRecord(collection, payload, prefix) {
  appData[collection].push({ id: generateId(prefix), ...payload });
  saveData();
  closeModal();
  renderApp();
  showToast("Məlumat əlavə edildi.", "success");
}

function updateRecord(collection, id, payload) {
  appData[collection] = appData[collection].map((item) => item.id === id ? { ...item, ...payload } : item);
  saveData();
  closeModal();
  renderApp();
  showToast("Məlumat yeniləndi.", "success");
}

function deleteRecord(collection, id) {
  appData[collection] = appData[collection].filter((item) => item.id !== id);
  saveData();
  closeModal();
  renderApp();
  showToast("Məlumat silindi.", "warning");
}

function saveSettings(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  appData.settings.companyName = form.get("companyName").trim() || defaultSettings.companyName;
  appData.settings.seasonName = form.get("seasonName").trim() || defaultSettings.seasonName;
  appData.settings.primaryCurrency = "AZN";
  appData.settings.secondaryCurrency = "USD";
  appData.settings.usdRate = Number(form.get("usdRate")) || defaultSettings.usdRate;
  appData.settings.compactView = form.get("compactView") === "true";
  appData.settings.mobileCardView = form.get("mobileCardView") !== "false";
  appData.settings.dashboardMode = form.get("dashboardMode") === "wide" ? "wide" : "simple";
  saveData();
  renderApp();
  showToast("Ayarlar saxlanıldı.", "success");
}

function handleLogoUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    showToast("Zəhmət olmasa şəkil faylı seçin.", "error");
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    appData.settings.logo = reader.result;
    saveData();
    renderApp();
    showToast("Logo yükləndi.", "success");
  };
  reader.readAsDataURL(file);
}

function removeLogo() {
  appData.settings.logo = "";
  saveData();
  renderApp();
  showToast("Logo silindi.", "success");
}

function createBackup() {
  const blob = new Blob([JSON.stringify(appData, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `teserrufat-crm-backup-${date}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showToast("JSON backup yaradıldı.", "success");
}

function handleBackupUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      replaceAppData(JSON.parse(reader.result));
      saveData();
      renderApp();
      showToast("Backup uğurla yükləndi.", "success");
    } catch (error) {
      showToast("Backup faylı oxunmadı.", "error");
    } finally {
      event.target.value = "";
    }
  };
  reader.readAsText(file);
}

function clearAllData() {
  replaceAppData({ ...emptyData, settings: { ...defaultSettings, demoSeeded: true } });
  saveData();
  closeModal();
  renderApp();
  showToast("Bütün məlumatlar silindi.", "warning");
}

function clearDemoData() {
  const demoLandIds = appData.lands
    .filter((land) => ["Ümumi sahə", "Şimal sahəsi"].includes(land.name))
    .map((land) => land.id);
  appData.lands = appData.lands.filter((land) => !demoLandIds.includes(land.id));
  appData.expenses = appData.expenses.filter((expense) => !(expense.sourceType === "landRent" && demoLandIds.includes(expense.sourceId)));
  appData.workers = appData.workers.filter((worker) => worker.fullName !== "Elvin Məmmədov");
  appData.calibers = appData.calibers.filter((caliber) => !["Murano", "Xırda", "Orta", "İri", "Extra / Premium", "Emal üçün", "Zay / yararsız"].includes(caliber.name));
  appData.settings.demoSeeded = true;
  saveData();
  closeModal();
  renderApp();
  showToast("Demo məlumatları silindi.", "warning");
}

function openModal(title, content, kicker = "CRM") {
  dom.modalTitle.textContent = title;
  dom.modalKicker.textContent = kicker;
  dom.modalBody.innerHTML = content;
  dom.modalBackdrop.classList.add("active");
  dom.modalBackdrop.setAttribute("aria-hidden", "false");
}

function closeModal() {
  dom.modalBackdrop.classList.remove("active");
  dom.modalBackdrop.setAttribute("aria-hidden", "true");
  dom.modalBody.innerHTML = "";
  deleteCallback = null;
}

function confirmDelete(message, onConfirm) {
  deleteCallback = onConfirm;
  openModal("Təsdiq", `
    <p class="muted">${message}</p>
    <div class="button-row">
      <button class="danger-button" id="confirmDeleteButton" type="button">Bəli, sil</button>
      <button class="ghost-button" type="button" data-close-modal>Ləğv et</button>
    </div>
  `, "Silinmə");

  document.getElementById("confirmDeleteButton").addEventListener("click", () => {
    if (typeof deleteCallback === "function") deleteCallback();
  });
  bindCloseButtons();
}

function bindCloseButtons() {
  dom.modalBody.querySelectorAll("[data-close-modal]").forEach((button) => {
    button.addEventListener("click", closeModal);
  });
}

function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  dom.toastContainer.appendChild(toast);

  window.setTimeout(() => {
    toast.remove();
  }, 3200);
}

function formatMoney(amount, currency = "AZN") {
  return new Intl.NumberFormat("az-AZ", {
    style: "currency",
    currency,
    minimumFractionDigits: 2
  }).format(Number(amount) || 0);
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("az-AZ").format(date);
}

function convertToAZN(amount, currency = "AZN") {
  const numericAmount = Number(amount) || 0;
  if (currency === "USD") {
    return numericAmount * (Number(appData.settings.usdRate) || defaultSettings.usdRate);
  }
  return numericAmount;
}

function convertLandArea(value, unit = "hektar") {
  const numericValue = Number(value) || 0;
  if (unit === "sot") {
    return {
      areaHectare: numericValue / 100,
      areaSot: numericValue
    };
  }
  return {
    areaHectare: numericValue,
    areaSot: numericValue * 100
  };
}

function formatLandArea(land = {}) {
  const hectare = Number(land.areaHectare ?? land.area ?? 0);
  const sot = Number(land.areaSot ?? (hectare * 100));
  return `${hectare.toLocaleString("az-AZ", { maximumFractionDigits: 2 })} ha / ${sot.toLocaleString("az-AZ", { maximumFractionDigits: 2 })} sot`;
}

function sumExpenses() {
  return appData.expenses.reduce((sum, item) => sum + convertToAZN(item.amount || 0, item.currency || "AZN"), 0);
}

function sumExpensesByCategory(category) {
  return appData.expenses
    .filter((expense) => expense.category === category)
    .reduce((sum, item) => sum + convertToAZN(item.amount || 0, item.currency || "AZN"), 0);
}

function sumExpensesBySource(sourceType) {
  return appData.expenses
    .filter((expense) => expense.sourceType === sourceType)
    .reduce((sum, item) => sum + convertToAZN(item.amount || 0, item.currency || "AZN"), 0);
}

function getGreenhouseTotal(greenhouse) {
  return greenhouseCostFields.reduce((sum, field) => sum + Number(greenhouse[field.key] || 0), 0);
}

function getLandName(landId) {
  return appData.lands.find((land) => land.id === landId)?.name || "-";
}

function getSortNames() {
  const names = new Set(["Murano"]);
  appData.calibers.filter((item) => item.type === "sort").forEach((item) => names.add(item.name));
  appData.seedlings.forEach((item) => names.add(item.sortName));
  appData.harvests.forEach((item) => names.add(item.sortName));
  return [...names].filter(Boolean).sort((a, b) => a.localeCompare(b, "az"));
}

function getCaliberList(source = appData) {
  return source.calibers.filter((item) => item.type === "caliber");
}

function ensureDefaultCalibers(target = appData) {
  defaultCaliberNames.forEach((name) => {
    const exists = target.calibers.some((item) => item.type === "caliber" && item.name.toLocaleLowerCase("az-AZ") === name.toLocaleLowerCase("az-AZ"));
    if (!exists) {
      target.calibers.push({ id: generateId("caliber"), name, type: "caliber", note: "Standart kalibr" });
    }
  });
}

function getCaliberName(caliberId, source = appData) {
  return source.calibers.find((item) => item.id === caliberId)?.name || "";
}

function findCaliberIdByName(name, source = appData) {
  return source.calibers.find((item) => item.type === "caliber" && item.name === name)?.id || "";
}

function getDefaultCaliberId() {
  ensureDefaultCalibers();
  return findCaliberIdByName("Orta") || getCaliberList()[0]?.id || "";
}

function caliberOptions(selected = "") {
  ensureDefaultCalibers();
  return getCaliberList().map((caliber) => `
    <option value="${caliber.id}" ${caliber.id === selected ? "selected" : ""}>${escapeHtml(caliber.name)}</option>
  `).join("");
}

function createEmptyHarvestRow() {
  const caliberId = getDefaultCaliberId();
  return {
    id: generateId("harvest_row"),
    caliberId,
    caliberName: getCaliberName(caliberId),
    quantityKg: 0,
    quality: "1-ci sort",
    note: ""
  };
}

function createEmptyMoneyRow() {
  const caliberId = getDefaultCaliberId();
  return {
    id: generateId("money_row"),
    caliberId,
    caliberName: getCaliberName(caliberId),
    quantityKg: 0,
    unitPrice: 0,
    totalAmount: 0
  };
}

function normalizeMoneyRows(rows = [], source = appData) {
  return rows.map((row) => {
    const caliberName = row.caliberName || getCaliberName(row.caliberId, source) || row.caliber || "Orta";
    const quantityKg = Number(row.quantityKg || row.kg || 0);
    const unitPrice = Number(row.unitPrice || row.price || 0);
    return {
      id: row.id || generateId("money_row"),
      caliberId: row.caliberId || findCaliberIdByName(caliberName, source),
      caliberName,
      quantityKg,
      unitPrice,
      totalAmount: Number(row.totalAmount || quantityKg * unitPrice)
    };
  });
}

function setupMoneyRowsEditor(containerId, rows, onChange) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = rows.map((row, index) => `
    <div class="harvest-line money-line" data-row-index="${index}">
      <div class="field"><label>Kalibr</label><select data-money-field="caliberId">${caliberOptions(row.caliberId)}</select></div>
      <div class="field"><label>Miqdar, kg</label><input data-money-field="quantityKg" type="number" min="0" step="0.01" value="${row.quantityKg || 0}"></div>
      <div class="field"><label>1 kg qiyməti</label><input data-money-field="unitPrice" type="number" min="0" step="0.01" value="${row.unitPrice || 0}"></div>
      <div class="field"><label>Ümumi məbləğ</label><input data-money-field="totalAmount" value="${Number(row.totalAmount || 0).toLocaleString("az-AZ")}" disabled></div>
      <button class="small-button danger harvest-row-remove" type="button" data-remove-money-row="${index}">Sil</button>
    </div>
  `).join("");

  container.querySelectorAll("[data-money-field]").forEach((field) => {
    field.addEventListener("input", () => {
      syncMoneyRowsFromDom(containerId, rows);
      onChange(rows);
    });
    field.addEventListener("change", () => {
      syncMoneyRowsFromDom(containerId, rows);
      onChange(rows);
    });
  });
  container.querySelectorAll("[data-remove-money-row]").forEach((button) => {
    button.addEventListener("click", () => {
      syncMoneyRowsFromDom(containerId, rows);
      rows.splice(Number(button.dataset.removeMoneyRow), 1);
      if (!rows.length) rows.push(createEmptyMoneyRow());
      setupMoneyRowsEditor(containerId, rows, onChange);
      onChange(rows);
    });
  });
}

function syncMoneyRowsFromDom(containerId, rows) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.querySelectorAll(".money-line").forEach((line) => {
    const index = Number(line.dataset.rowIndex);
    const caliberId = line.querySelector('[data-money-field="caliberId"]').value;
    const quantityKg = Number(line.querySelector('[data-money-field="quantityKg"]').value) || 0;
    const unitPrice = Number(line.querySelector('[data-money-field="unitPrice"]').value) || 0;
    rows[index] = {
      id: rows[index]?.id || generateId("money_row"),
      caliberId,
      caliberName: getCaliberName(caliberId),
      quantityKg,
      unitPrice,
      totalAmount: quantityKg * unitPrice
    };
  });
  container.querySelectorAll(".money-line").forEach((line) => {
    const index = Number(line.dataset.rowIndex);
    const totalInput = line.querySelector('[data-money-field="totalAmount"]');
    if (totalInput) totalInput.value = Number(rows[index]?.totalAmount || 0).toLocaleString("az-AZ");
  });
}

function collectMoneyRows(containerId, rows) {
  syncMoneyRowsFromDom(containerId, rows);
  return rows.map((row) => ({
    id: row.id || generateId("money_row"),
    caliberId: row.caliberId || getDefaultCaliberId(),
    caliberName: row.caliberName || getCaliberName(row.caliberId) || "Orta",
    quantityKg: Number(row.quantityKg || 0),
    unitPrice: Number(row.unitPrice || 0),
    totalAmount: Number(row.quantityKg || 0) * Number(row.unitPrice || 0)
  }));
}

function calculateMoneyRowsTotals(rows, commissionPercent = 0, storageCost = 0, paidAmount = 0) {
  const totalKg = rows.reduce((sum, row) => sum + Number(row.quantityKg || 0), 0);
  const totalAmount = rows.reduce((sum, row) => sum + Number(row.totalAmount || 0), 0);
  const commissionAmount = totalAmount * (Number(commissionPercent || 0) / 100);
  const netAmount = Math.max(0, totalAmount - commissionAmount - Number(storageCost || 0));
  const debtAmount = Math.max(0, netAmount - Number(paidAmount || 0));
  return { totalKg, totalAmount, commissionAmount, netAmount, paidAmount: Number(paidAmount || 0), debtAmount };
}

function refreshColdTotals(rows) {
  syncMoneyRowsFromDom("coldRowsEditor", rows);
  const currency = document.getElementById("coldCurrency")?.value || "AZN";
  const commissionPercent = Number(document.getElementById("commissionPercent")?.value) || 0;
  const storageCost = Number(document.getElementById("storageCost")?.value) || 0;
  const paidAmount = Number(document.getElementById("coldPaidAmount")?.value) || 0;
  const totals = calculateMoneyRowsTotals(rows, commissionPercent, storageCost, paidAmount);
  setInputValue("commissionAmount", formatMoney(totals.commissionAmount, currency));
  setInputValue("coldTotalAmount", formatMoney(totals.totalAmount, currency));
  setInputValue("coldNetAmount", formatMoney(totals.netAmount, currency));
  setInputValue("coldDebtAmount", formatMoney(totals.debtAmount, currency));
  const status = document.getElementById("coldStatus");
  if (status) status.value = deriveColdStatus(paidAmount, totals.netAmount);
}

function refreshSaleTotals(rows) {
  syncMoneyRowsFromDom("saleRowsEditor", rows);
  const currency = document.getElementById("saleCurrency")?.value || "AZN";
  const paidAmount = Number(document.getElementById("salePaidAmount")?.value) || 0;
  const totals = calculateMoneyRowsTotals(rows, 0, 0, paidAmount);
  setInputValue("saleTotalAmount", formatMoney(totals.totalAmount, currency));
  setInputValue("saleDebtAmount", formatMoney(Math.max(0, totals.totalAmount - paidAmount), currency));
  const status = document.getElementById("saleStatus");
  if (status) status.value = deriveSaleStatus(paidAmount, totals.totalAmount);
}

function setInputValue(id, value) {
  const element = document.getElementById(id);
  if (element) element.value = value;
}

function formatMoneyRowsSummary(rows = []) {
  return rows.map((row) => `
    <span class="inline-chip">${escapeHtml(row.caliberName || getCaliberName(row.caliberId))}: ${Number(row.quantityKg || 0).toLocaleString("az-AZ")} kg × ${Number(row.unitPrice || 0).toLocaleString("az-AZ")}</span>
  `).join("");
}

function deriveColdStatus(paid, net) {
  if (Number(net || 0) <= 0 || Number(paid || 0) <= 0) return Number(paid || 0) >= Number(net || 0) && Number(net || 0) > 0 ? "ödənib" : "gözləmədə";
  if (Number(paid || 0) >= Number(net || 0)) return "ödənib";
  return "qismən ödənib";
}

function deriveSaleStatus(paid, total) {
  if (Number(paid || 0) >= Number(total || 0) && Number(total || 0) > 0) return "ödənib";
  if (Number(paid || 0) > 0) return "qismən ödənib";
  return "ödənməyib";
}

function canUseStockRows(rows, currentSource = null) {
  const usage = rows.reduce((map, row) => {
    map[row.caliberId] = (map[row.caliberId] || 0) + Number(row.quantityKg || 0);
    return map;
  }, {});
  return Object.entries(usage).every(([caliberId, quantity]) => {
    const available = getAvailableForCaliber(caliberId, currentSource);
    if (quantity > available) {
      showToast(`${getCaliberName(caliberId)} qalığı kifayət deyil. Mövcud: ${available.toLocaleString("az-AZ")} kg`, "error");
      return false;
    }
    return true;
  });
}

function getAvailableForCaliber(caliberId, currentSource = null) {
  const summary = getCaliberStockSummaries().find((item) => item.id === caliberId);
  let available = summary?.remaining || 0;
  if (currentSource?.type === "sale") {
    const sale = appData.sales.find((item) => item.id === currentSource.id);
    available += sumRowsByCaliber(sale?.rows || [], caliberId);
  }
  if (currentSource?.type === "coldStorage") {
    const entry = appData.coldStorageEntries.find((item) => item.id === currentSource.id);
    available += sumRowsByCaliber(entry?.rows || [], caliberId);
  }
  return available;
}

function sumRowsByCaliber(rows, caliberId) {
  return rows.filter((row) => row.caliberId === caliberId).reduce((sum, row) => sum + Number(row.quantityKg || 0), 0);
}

function formatHarvestRowsSummary(rows = []) {
  return rows.map((row) => `
    <span class="inline-chip">${escapeHtml(row.caliberName || getCaliberName(row.caliberId))}: ${Number(row.quantityKg || 0).toLocaleString("az-AZ")} kg</span>
  `).join("");
}

function getCaliberStockSummaries() {
  ensureDefaultCalibers();
  return getCaliberList().map((caliber) => {
    const collected = getHarvestCollectedByCaliber(caliber.id);
    const manualAdd = getManualAdjustmentByCaliber(caliber.id, "əlavə");
    const manualRemove = getManualAdjustmentByCaliber(caliber.id, "silinmə");
    const sold = getSoldByCaliber(caliber.id);
    const coldStored = getColdStorageByCaliber(caliber.id);
    const waste = getWasteByCaliber(caliber.id);
    const remaining = Math.max(0, collected + manualAdd - sold - coldStored - manualRemove - waste);
    return {
      id: caliber.id,
      name: caliber.name,
      collected,
      manualAdd,
      manualRemove,
      sold,
      coldStored,
      waste,
      remaining
    };
  });
}

function getHarvestCollectedByCaliber(caliberId) {
  return appData.harvests.reduce((sum, harvest) => {
    return sum + harvest.rows
      .filter((row) => row.caliberId === caliberId)
      .reduce((rowSum, row) => rowSum + Number(row.quantityKg || 0), 0);
  }, 0);
}

function getManualAdjustmentByCaliber(caliberId, type) {
  return appData.stockAdjustments
    .filter((item) => item.caliberId === caliberId && item.type === type)
    .reduce((sum, item) => sum + Number(item.quantityKg || 0), 0);
}

function getWasteByCaliber(caliberId) {
  return appData.harvests.reduce((sum, harvest) => {
    return sum + harvest.rows
      .filter((row) => row.caliberId === caliberId && isWasteHarvestRow(row))
      .reduce((rowSum, row) => rowSum + Number(row.quantityKg || 0), 0);
  }, 0);
}

function isWasteHarvestRow(row) {
  const caliberName = row.caliberName || getCaliberName(row.caliberId);
  const quality = String(row.quality || "").toLocaleLowerCase("az-AZ");
  return caliberName === "Zay / yararsız" || quality === "yararsız";
}

function getSoldByCaliber(caliberId) {
  return appData.sales.reduce((sum, sale) => {
    if (Array.isArray(sale.rows)) {
      return sum + sale.rows
        .filter((row) => row.caliberId === caliberId || row.caliberName === getCaliberName(caliberId))
        .reduce((rowSum, row) => rowSum + Number(row.quantityKg || row.kg || 0), 0);
    }
    if (sale.caliberId === caliberId || sale.caliberName === getCaliberName(caliberId)) {
      return sum + Number(sale.quantityKg || sale.kg || 0);
    }
    return sum;
  }, 0);
}

function getColdStorageByCaliber(caliberId) {
  return appData.coldStorageEntries.reduce((sum, entry) => {
    return sum + (entry.rows || [])
      .filter((row) => row.caliberId === caliberId || row.caliberName === getCaliberName(caliberId))
      .reduce((rowSum, row) => rowSum + Number(row.quantityKg || 0), 0);
  }, 0);
}

function ensureSort(name) {
  if (!name) return;
  const exists = appData.calibers.some((item) => item.type === "sort" && item.name.toLowerCase() === name.toLowerCase());
  if (!exists) {
    appData.calibers.push({ id: generateId("caliber"), name, type: "sort", note: "Fidanlar bölməsindən əlavə edildi" });
  }
}

function getWorkerName(workerId) {
  return appData.workers.find((worker) => worker.id === workerId)?.fullName || "-";
}

function getSalaryWorkerLabel(salary = {}) {
  if (salary.workerId) return getWorkerName(salary.workerId);
  return salary.workerName || "Gündəlik işçilər";
}

function getDefaultWorkerPermissions(role = "İşçi") {
  return Object.fromEntries(workerPermissionItems.map((item) => [item.key, role === "Sahibkar"]));
}

function normalizeWorkerPermissions(role = "İşçi", permissions = {}) {
  if (role === "Sahibkar") return getDefaultWorkerPermissions("Sahibkar");
  return Object.fromEntries(workerPermissionItems.map((item) => [item.key, Boolean(permissions?.[item.key])]));
}

function renderWorkerPermissionFields(permissions = {}, disabled = false) {
  return workerPermissionItems.map((item) => `
    <label class="permission-item">
      <input type="checkbox" name="perm_${item.key}" ${permissions[item.key] ? "checked" : ""} ${disabled ? "disabled" : ""}>
      <span>${escapeHtml(item.label)}</span>
    </label>
  `).join("");
}

function collectWorkerPermissions(form, role) {
  if (role === "Sahibkar") return getDefaultWorkerPermissions("Sahibkar");
  return Object.fromEntries(workerPermissionItems.map((item) => [item.key, form.get(`perm_${item.key}`) === "on"]));
}

function refreshWorkerPermissionInputs(role) {
  document.querySelectorAll("#workerPermissions input[type='checkbox']").forEach((input) => {
    if (role === "Sahibkar") {
      input.checked = true;
      input.disabled = true;
    } else {
      input.disabled = false;
    }
  });
}

function getWorkerPermissionSummary(worker = {}) {
  if (worker.role === "Sahibkar") return "Admin: bütün səlahiyyətlər";
  const permissions = normalizeWorkerPermissions(worker.role, worker.permissions);
  const count = Object.values(permissions).filter(Boolean).length;
  if (!count) return `${worker.paymentType || "-"} · səlahiyyət yoxdur`;
  return `${worker.paymentType || "-"} · ${count} səlahiyyət`;
}

function normalizeWorkerRole(role) {
  if (workerRoles.some((item) => item.value === role)) return role;
  if (String(role || "").toLocaleLowerCase("az-AZ").includes("sahə")) return "İşçi";
  return "Digər";
}

function getGreenhouseName(greenhouseId) {
  return appData.greenhouses.find((greenhouse) => greenhouse.id === greenhouseId)?.name || "-";
}

function getWorkerPaidTotal(workerId) {
  return appData.salaries
    .filter((salary) => salary.workerId === workerId)
    .reduce((sum, salary) => sum + convertToAZN(salary.amount || 0, salary.currency || "AZN"), 0);
}

function getWorkerPaidByType(workerId, type) {
  return appData.salaries
    .filter((salary) => salary.workerId === workerId && salary.paymentType === type)
    .reduce((sum, salary) => sum + convertToAZN(salary.amount || 0, salary.currency || "AZN"), 0);
}

function sumSalariesByType(type) {
  return appData.salaries
    .filter((salary) => salary.paymentType === type)
    .reduce((sum, salary) => sum + convertToAZN(salary.amount || 0, salary.currency || "AZN"), 0);
}

function sumSalariesByDate(date) {
  return appData.salaries
    .filter((salary) => salary.date === date)
    .reduce((sum, salary) => sum + convertToAZN(salary.amount || 0, salary.currency || "AZN"), 0);
}

function sumSalariesByMonth(month) {
  return appData.salaries
    .filter((salary) => String(salary.date || "").startsWith(month))
    .reduce((sum, salary) => sum + convertToAZN(salary.amount || 0, salary.currency || "AZN"), 0);
}

function getTopExpenseCategory() {
  const totals = appData.expenses.reduce((map, expense) => {
    const category = expense.category || "Digər";
    map[category] = (map[category] || 0) + convertToAZN(expense.amount || 0, expense.currency || "AZN");
    return map;
  }, {});
  const [name, amount] = Object.entries(totals).sort((a, b) => b[1] - a[1])[0] || ["-", 0];
  return { name, amount };
}

function sumSalesTotal() {
  return appData.sales.reduce((sum, sale) => sum + convertToAZN(sale.totalAmount || 0, sale.currency || "AZN"), 0);
}

function sumSalesPaid() {
  return appData.sales.reduce((sum, sale) => sum + convertToAZN(sale.paidAmount || 0, sale.currency || "AZN"), 0);
}

function sumColdPaid() {
  return appData.coldStorageEntries.reduce((sum, entry) => sum + convertToAZN(entry.paidAmount || 0, entry.currency || "AZN"), 0);
}

function sumCustomerDebt() {
  return appData.sales.reduce((sum, sale) => sum + convertToAZN(sale.debtAmount || 0, sale.currency || "AZN"), 0);
}

function sumColdDebt() {
  return appData.coldStorageEntries.reduce((sum, entry) => sum + convertToAZN(entry.debtAmount || 0, entry.currency || "AZN"), 0);
}

function sumSoldKg() {
  return appData.sales.reduce((sum, sale) => sum + Number(sale.totalKg || 0), 0);
}

function getSalesChannelStatsText() {
  const totals = appData.sales.reduce((map, sale) => {
    map[sale.channel] = (map[sale.channel] || 0) + Number(sale.totalKg || 0);
    return map;
  }, {});
  const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  if (!entries.length) return { value: "-", note: "Satış yoxdur" };
  return {
    value: entries[0][0],
    note: entries.map(([name, kg]) => `${name}: ${kg.toLocaleString("az-AZ")} kg`).join(" · ")
  };
}

function ensureCustomerFromSale(sale) {
  const name = sale.customerName.trim();
  const phone = sale.phone.trim();
  let customer = appData.customers.find((item) => normalizeSearch(item.name) === normalizeSearch(name) && (!phone || item.phone === phone));
  if (!customer) {
    customer = {
      id: generateId("customer"),
      name,
      phone,
      type: mapCustomerTypeFromChannel(sale.channel),
      address: "",
      note: "Satışdan avtomatik əlavə edildi"
    };
    appData.customers.push(customer);
  } else {
    customer.phone = customer.phone || phone;
    customer.type = customer.type || mapCustomerTypeFromChannel(sale.channel);
  }
  return customer;
}

function mapCustomerTypeFromChannel(channel) {
  if (channel === "Bazar") return "bazar";
  if (channel === "Soyuducu topdan") return "soyuducu";
  if (channel === "Şəxsi müştəri") return "şəxsi müştəri";
  return "topdançı";
}

function getCustomerStats(customerId) {
  const sales = appData.sales.filter((sale) => sale.customerId === customerId);
  const total = sales.reduce((sum, sale) => sum + convertToAZN(sale.totalAmount || 0, sale.currency || "AZN"), 0);
  const paid = sales.reduce((sum, sale) => sum + convertToAZN(sale.paidAmount || 0, sale.currency || "AZN"), 0);
  const debt = sales.reduce((sum, sale) => sum + convertToAZN(sale.debtAmount || 0, sale.currency || "AZN"), 0);
  const lastDate = sales.map((sale) => sale.date).filter(Boolean).sort().at(-1) || "";
  return { total, paid, debt, lastDate };
}

function getDebtSource(sourceType, sourceId) {
  if (sourceType === "sale") return appData.sales.find((sale) => sale.id === sourceId);
  if (sourceType === "coldStorage") return appData.coldStorageEntries.find((entry) => entry.id === sourceId);
  return null;
}

function renderPeriodControls(scope) {
  return `
    <section class="panel period-panel">
      <div class="period-controls" data-period-scope="${scope}">
        <div class="field">
          <label>Dövr</label>
          <select data-period-type>
            ${[["today", "Bugün"], ["week", "Bu həftə"], ["month", "Bu ay"], ["season", "Bu mövsüm"], ["year", "Bu il"], ["range", "Tarix aralığı"]].map(([value, label]) => `<option value="${value}" ${analyticsPeriod.type === value ? "selected" : ""}>${label}</option>`).join("")}
          </select>
        </div>
        <div class="field"><label>Başlanğıc</label><input type="date" data-period-start value="${analyticsPeriod.startDate}"></div>
        <div class="field"><label>Bitmə</label><input type="date" data-period-end value="${analyticsPeriod.endDate}"></div>
        <button class="secondary-button" type="button" data-period-apply>Tətbiq et</button>
      </div>
    </section>
  `;
}

function bindPeriodControls(scope) {
  const root = document.querySelector(`[data-period-scope="${scope}"]`);
  if (!root) return;
  root.querySelector("[data-period-apply]").addEventListener("click", () => {
    analyticsPeriod.type = root.querySelector("[data-period-type]").value;
    analyticsPeriod.startDate = root.querySelector("[data-period-start]").value;
    analyticsPeriod.endDate = root.querySelector("[data-period-end]").value;
    renderApp();
  });
  root.querySelector("[data-period-type]").addEventListener("change", (event) => {
    analyticsPeriod.type = event.target.value;
    if (analyticsPeriod.type !== "range") renderApp();
  });
}

function getPeriodRange() {
  const today = new Date(`${todayISO()}T00:00:00`);
  const start = new Date(today);
  const end = new Date(today);
  if (analyticsPeriod.type === "today") return { start: toLocalISODate(start), end: toLocalISODate(end) };
  if (analyticsPeriod.type === "week") {
    const day = start.getDay() || 7;
    start.setDate(start.getDate() - day + 1);
    end.setTime(start.getTime());
    end.setDate(start.getDate() + 6);
    return { start: toLocalISODate(start), end: toLocalISODate(end) };
  }
  if (analyticsPeriod.type === "month") {
    start.setDate(1);
    end.setMonth(start.getMonth() + 1, 0);
    return { start: toLocalISODate(start), end: toLocalISODate(end) };
  }
  if (analyticsPeriod.type === "year") {
    start.setMonth(0, 1);
    end.setMonth(11, 31);
    return { start: toLocalISODate(start), end: toLocalISODate(end) };
  }
  if (analyticsPeriod.type === "range") return { start: analyticsPeriod.startDate || "1900-01-01", end: analyticsPeriod.endDate || "2999-12-31" };
  return { start: "1900-01-01", end: "2999-12-31" };
}

function getPeriodLabel() {
  const labels = { today: "Bugün", week: "Bu həftə", month: "Bu ay", season: "Bu mövsüm", year: "Bu il", range: "Tarix aralığı" };
  const range = getPeriodRange();
  return `${labels[analyticsPeriod.type] || "Dövr"}: ${range.start} - ${range.end}`;
}

function isDateInPeriod(value) {
  if (!value) return false;
  const range = getPeriodRange();
  return value >= range.start && value <= range.end;
}

function getPeriodSales() {
  return appData.sales.filter((sale) => isDateInPeriod(sale.date));
}

function getPeriodExpenses() {
  return appData.expenses.filter((expense) => isDateInPeriod(expense.date));
}

function getPeriodHarvests() {
  return appData.harvests.filter((harvest) => isDateInPeriod(harvest.date));
}

function getPeriodColdEntries() {
  return appData.coldStorageEntries.filter((entry) => isDateInPeriod(entry.date));
}

function getSaleRowsFlat(sales = getPeriodSales()) {
  return sales.flatMap((sale) => (sale.rows || []).map((row) => ({
    sale,
    caliberId: row.caliberId,
    caliberName: row.caliberName || getCaliberName(row.caliberId),
    quantityKg: Number(row.quantityKg || 0),
    unitPrice: Number(row.unitPrice || 0),
    revenue: convertToAZN(row.totalAmount || 0, sale.currency || "AZN")
  })));
}

function getPeriodMainMetrics() {
  const sales = getPeriodSales();
  const expenses = getPeriodExpenses();
  const harvests = getPeriodHarvests();
  const coldEntries = getPeriodColdEntries();
  const salesTotal = sales.reduce((sum, sale) => sum + convertToAZN(sale.totalAmount || 0, sale.currency), 0);
  const paidSales = sales.reduce((sum, sale) => sum + convertToAZN(sale.paidAmount || 0, sale.currency), 0);
  const paidCold = coldEntries.reduce((sum, entry) => sum + convertToAZN(entry.paidAmount || 0, entry.currency), 0);
  const expenseTotal = expenses.reduce((sum, expense) => sum + convertToAZN(expense.amount || 0, expense.currency), 0);
  const soldKg = sales.reduce((sum, sale) => sum + Number(sale.totalKg || 0), 0);
  return {
    harvestKg: harvests.reduce((sum, harvest) => sum + Number(harvest.totalKg || 0), 0),
    salesTotal,
    cashIn: paidSales + paidCold,
    customerDebt: sales.reduce((sum, sale) => sum + convertToAZN(sale.debtAmount || 0, sale.currency), 0),
    coldDebt: coldEntries.reduce((sum, entry) => sum + convertToAZN(entry.debtAmount || 0, entry.currency), 0),
    avgPrice: safeDivide(salesTotal, soldKg),
    expenses: expenseTotal,
    cashProfit: paidSales + paidCold - expenseTotal,
    potentialProfit: salesTotal - expenseTotal,
    topSoldCaliber: getTopCaliberBy("kg"),
    topRevenueCaliber: getTopCaliberBy("revenue"),
    topChannel: getTopChannelByRevenue(),
    topExpenseCategory: getTopExpenseCategoryForRows(expenses)
  };
}

function weightedAverage(rows) {
  const amount = rows.reduce((sum, row) => sum + Number(row.revenue || 0), 0);
  const kg = rows.reduce((sum, row) => sum + Number(row.quantityKg || 0), 0);
  return safeDivide(amount, kg);
}

function getTopCaliberBy(mode) {
  const grouped = groupBy(getSaleRowsFlat(), "caliberName");
  return Object.entries(grouped).map(([name, items]) => ({
    name,
    kg: items.reduce((sum, item) => sum + item.quantityKg, 0),
    revenue: items.reduce((sum, item) => sum + item.revenue, 0)
  })).sort((a, b) => mode === "kg" ? b.kg - a.kg : b.revenue - a.revenue)[0] || { name: "-", kg: 0, revenue: 0 };
}

function getTopChannelByRevenue() {
  const grouped = groupBy(getPeriodSales(), "channel");
  return Object.entries(grouped).map(([name, sales]) => ({
    name,
    revenue: sales.reduce((sum, sale) => sum + convertToAZN(sale.totalAmount || 0, sale.currency), 0)
  })).sort((a, b) => b.revenue - a.revenue)[0] || { name: "-", revenue: 0 };
}

function getTopExpenseCategoryForRows(expenses = getPeriodExpenses()) {
  const grouped = groupBy(expenses, "category");
  return Object.entries(grouped).map(([name, items]) => ({
    name,
    amount: items.reduce((sum, item) => sum + convertToAZN(item.amount || 0, item.currency), 0)
  })).sort((a, b) => b.amount - a.amount)[0] || { name: "-", amount: 0 };
}

function getCaliberAnalyticsRows() {
  const expenses = getPeriodExpenses().reduce((sum, item) => sum + convertToAZN(item.amount || 0, item.currency), 0);
  const harvestRows = getPeriodHarvests().flatMap((harvest) => harvest.rows || []);
  const totalHarvestKg = harvestRows.reduce((sum, row) => sum + Number(row.quantityKg || 0), 0);
  const stock = getCaliberStockSummaries();
  return getCaliberList().map((caliber) => {
    const caliberHarvestRows = harvestRows.filter((row) => row.caliberId === caliber.id);
    const soldRows = getSaleRowsFlat().filter((row) => row.caliberId === caliber.id);
    const collected = caliberHarvestRows.reduce((sum, row) => sum + Number(row.quantityKg || 0), 0);
    const sold = soldRows.reduce((sum, row) => sum + row.quantityKg, 0);
    const coldKg = getPeriodColdEntries().reduce((sum, entry) => sum + sumRowsByCaliber(entry.rows || [], caliber.id), 0);
    const revenue = soldRows.reduce((sum, row) => sum + row.revenue, 0);
    const prices = soldRows.map((row) => row.unitPrice).filter((price) => price > 0);
    const allocatedExpense = totalHarvestKg ? expenses * (collected / totalHarvestKg) : 0;
    const profit = revenue - allocatedExpense;
    return {
      Kalibr: caliber.name,
      "Toplanıb, kg": round2(collected),
      "Satılıb, kg": round2(sold),
      "Soyuducuya göndərilib, kg": round2(coldKg),
      "Qalıq, kg": round2(stock.find((item) => item.id === caliber.id)?.remaining || 0),
      "Orta qiymət": round2(weightedAverage(soldRows)),
      "Minimum qiymət": prices.length ? Math.min(...prices) : 0,
      "Maksimum qiymət": prices.length ? Math.max(...prices) : 0,
      "Gəlir": round2(revenue),
      "Təxmini xərc": round2(allocatedExpense),
      "Təxmini mənfəət": round2(profit),
      "Mənfəət %": round2(safeDivide(profit, revenue) * 100)
    };
  });
}

function getReportTabs() {
  return [
    { id: "finance", title: "Ümumi maliyyə" },
    { id: "calibers", title: "Kalibr analitikası" },
    { id: "channels", title: "Satış kanalları" },
    { id: "expenseCategories", title: "Xərc kateqoriyaları" },
    { id: "landProfit", title: "Sahə üzrə mənfəət" },
    { id: "greenhouseProfit", title: "İstixana üzrə mənfəət" },
    { id: "customerDebts", title: "Müştəri borcları" },
    { id: "coldReport", title: "Soyuducu/anbar hesabatı" },
    { id: "salaryReport", title: "Maaş hesabatı" },
    { id: "stock", title: "Məhsul qalığı" }
  ];
}

function getReportRows(tabId) {
  const metrics = getPeriodMainMetrics();
  if (tabId === "finance") return [
    { Göstərici: "Ümumi məhsul, kg", Dəyər: round2(metrics.harvestKg) },
    { Göstərici: "Ümumi satış", Dəyər: round2(metrics.salesTotal) },
    { Göstərici: "Faktiki daxil olan pul", Dəyər: round2(metrics.cashIn) },
    { Göstərici: "Ümumi xərc", Dəyər: round2(metrics.expenses) },
    { Göstərici: "Kassa mənfəəti", Dəyər: round2(metrics.cashProfit) },
    { Göstərici: "Potensial mənfəət", Dəyər: round2(metrics.potentialProfit) }
  ];
  if (tabId === "calibers") return getCaliberAnalyticsRows();
  if (tabId === "channels") return Object.entries(groupBy(getPeriodSales(), "channel")).map(([Kanal, sales]) => {
    const flat = getSaleRowsFlat(sales);
    return { Kanal, "Satılan kg": round2(flat.reduce((s, r) => s + r.quantityKg, 0)), Gəlir: round2(flat.reduce((s, r) => s + r.revenue, 0)), "Orta qiymət": round2(weightedAverage(flat)) };
  });
  if (tabId === "expenseCategories") return Object.entries(groupBy(getPeriodExpenses(), "category")).map(([Kateqoriya, rows]) => ({ Kateqoriya, Məbləğ: round2(rows.reduce((s, r) => s + convertToAZN(r.amount || 0, r.currency), 0)) }));
  if (tabId === "landProfit") return getLandProfitRows();
  if (tabId === "greenhouseProfit") return getGreenhouseProfitRows();
  if (tabId === "customerDebts") return appData.sales.filter((sale) => Number(sale.debtAmount || 0) > 0).map((sale) => ({ Tarix: sale.date, Müştəri: sale.customerName, Borc: round2(convertToAZN(sale.debtAmount || 0, sale.currency)), Status: sale.status }));
  if (tabId === "coldReport") return getPeriodColdEntries().map((entry) => ({ Tarix: entry.date, Anbar: entry.storageName, Kg: entry.totalKg, "Xalis məbləğ": entry.netAmount, Ödənilib: entry.paidAmount, Borc: entry.debtAmount, Status: entry.status }));
  if (tabId === "salaryReport") return appData.salaries.filter((salary) => isDateInPeriod(salary.date)).map((salary) => ({ Tarix: salary.date, İşçi: getSalaryWorkerLabel(salary), Növ: salary.paymentType, Say: salary.workerCount || "", "Gündəlik ödəniş": salary.dailyRate || "", Gün: salary.workDays || "", Məbləğ: salary.amount, Valyuta: salary.currency, Sahə: getLandName(salary.landId) }));
  if (tabId === "stock") return getCaliberStockSummaries().map((item) => ({ Kalibr: item.name, Toplanıb: item.collected, Satılıb: item.sold, Soyuducu: item.coldStored, Zay: item.waste, Qalıq: item.remaining }));
  return [];
}

function getLandProfitRows() {
  return appData.lands.map((land) => {
    const sales = getPeriodSales().filter((sale) => sale.landId === land.id);
    const expenses = getPeriodExpenses().filter((expense) => expense.landId === land.id);
    const revenue = sales.reduce((sum, sale) => sum + convertToAZN(sale.totalAmount || 0, sale.currency), 0);
    const cost = expenses.reduce((sum, expense) => sum + convertToAZN(expense.amount || 0, expense.currency), 0);
    return { Sahə: land.name, Gəlir: round2(revenue), Xərc: round2(cost), Mənfəət: round2(revenue - cost), "Orta qiymət": round2(weightedAverage(getSaleRowsFlat(sales))) };
  });
}

function getGreenhouseProfitRows() {
  return appData.greenhouses.map((greenhouse) => {
    const sales = getPeriodSales().filter((sale) => sale.greenhouseId === greenhouse.id);
    const expenses = getPeriodExpenses().filter((expense) => expense.greenhouseId === greenhouse.id);
    const revenue = sales.reduce((sum, sale) => sum + convertToAZN(sale.totalAmount || 0, sale.currency), 0);
    const cost = expenses.reduce((sum, expense) => sum + convertToAZN(expense.amount || 0, expense.currency), 0);
    return { İstixana: greenhouse.name, Gəlir: round2(revenue), Xərc: round2(cost), Mənfəət: round2(revenue - cost), "Orta qiymət": round2(weightedAverage(getSaleRowsFlat(sales))) };
  });
}

function renderSimpleTable(rows) {
  if (!rows.length) return `<p class="muted">Bu dövr üçün məlumat yoxdur.</p>`;
  const columns = Object.keys(rows[0]);
  return `<div class="table-wrap"><table><thead><tr>${columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${columns.map((column) => `<td>${escapeHtml(row[column])}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
}

function groupBy(rows, key) {
  return rows.reduce((map, row) => {
    const value = row[key] || "-";
    if (!map[value]) map[value] = [];
    map[value].push(row);
    return map;
  }, {});
}

function safeDivide(a, b) {
  return Number(b || 0) ? Number(a || 0) / Number(b || 0) : 0;
}

function round2(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function renderReportCharts() {
  chartInstances.forEach((chart) => chart.destroy());
  chartInstances = [];
  const fallback = document.getElementById("chartFallback");
  if (typeof Chart === "undefined") {
    if (fallback) fallback.textContent = "Chart.js CDN yüklənməyib. Qrafiklər üçün internet bağlantısını yoxlayın.";
    return;
  }
  if (fallback) fallback.textContent = "";
  const caliberRows = getCaliberAnalyticsRows();
  const channelRows = getReportRows("channels");
  const expenseRows = getReportRows("expenseCategories");
  const landRows = getLandProfitRows();
  createChart("chartCaliberKg", "bar", "Kalibr üzrə satış kg", caliberRows.map((r) => r.Kalibr), caliberRows.map((r) => r["Satılıb, kg"]));
  createChart("chartCaliberRevenue", "bar", "Kalibr üzrə gəlir", caliberRows.map((r) => r.Kalibr), caliberRows.map((r) => r.Gəlir));
  createChart("chartExpenseCategories", "doughnut", "Xərclər kateqoriyalar üzrə", expenseRows.map((r) => r.Kateqoriya), expenseRows.map((r) => r.Məbləğ));
  createChart("chartSalesChannels", "bar", "Satış kanalları üzrə gəlir", channelRows.map((r) => r.Kanal), channelRows.map((r) => r.Gəlir));
  const monthlyRows = getMonthlyProfitRows();
  createChart("chartMonthlyProfit", "line", "Aylar üzrə mənfəət", monthlyRows.map((r) => r.Ay), monthlyRows.map((r) => r.Mənfəət));
  createChart("chartLandHarvest", "bar", "Sahələr üzrə məhsul", landRows.map((r) => r.Sahə), landRows.map((r) => getHarvestKgByLandName(r.Sahə)));
}

function createChart(id, type, label, labels, data) {
  const canvas = document.getElementById(id);
  if (!canvas) return;
  chartInstances.push(new Chart(canvas, {
    type,
    data: {
      labels,
      datasets: [{
        label,
        data,
        borderColor: "#176b4d",
        backgroundColor: ["#176b4d", "#c0263a", "#b7791f", "#2f6fed", "#667085", "#0f513a"],
        tension: 0.25
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: type !== "bar" } }
    }
  }));
}

function getMonthlyProfitRows() {
  const months = new Set([
    ...appData.sales.map((sale) => String(sale.date || "").slice(0, 7)),
    ...appData.expenses.map((expense) => String(expense.date || "").slice(0, 7))
  ].filter(Boolean));
  return [...months].sort().map((month) => {
    const sales = appData.sales.filter((sale) => String(sale.date || "").startsWith(month));
    const expenses = appData.expenses.filter((expense) => String(expense.date || "").startsWith(month));
    const revenue = sales.reduce((sum, sale) => sum + convertToAZN(sale.totalAmount || 0, sale.currency), 0);
    const cost = expenses.reduce((sum, expense) => sum + convertToAZN(expense.amount || 0, expense.currency), 0);
    return { Ay: month, Gəlir: round2(revenue), Xərc: round2(cost), Mənfəət: round2(revenue - cost) };
  });
}

function getHarvestKgByLandName(landName) {
  const land = appData.lands.find((item) => item.name === landName);
  return appData.harvests
    .filter((harvest) => harvest.landId === land?.id && isDateInPeriod(harvest.date))
    .reduce((sum, harvest) => sum + Number(harvest.totalKg || 0), 0);
}

function exportWorkbook(type = "all") {
  if (typeof XLSX === "undefined") {
    showToast("SheetJS CDN yüklənməyib. Excel ixracı üçün internet bağlantısı lazımdır.", "error");
    return;
  }
  const wb = XLSX.utils.book_new();
  const sheets = getExcelSheets(type);
  sheets.forEach(({ name, rows }) => {
    const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ Məlumat: "Boşdur" }]);
    XLSX.utils.book_append_sheet(wb, ws, sanitizeSheetName(name));
  });
  XLSX.writeFile(wb, `teserrufat-crm-${type}-${todayISO()}.xlsx`);
  showToast("Excel faylı yaradıldı.", "success");
}

function getExcelSheets(type = "all") {
  const all = [
    { key: "dashboard", name: "Dashboard", rows: getReportRows("finance") },
    { key: "lands", name: "Sahələr", rows: appData.lands },
    { key: "greenhouses", name: "İstixanalar", rows: appData.greenhouses },
    { key: "seedlings", name: "Fidanlar", rows: appData.seedlings },
    { key: "workers", name: "İşçilər", rows: appData.workers },
    { key: "salaries", name: "Maaşlar", rows: appData.salaries.map((s) => ({ ...s, worker: getSalaryWorkerLabel(s), land: getLandName(s.landId) })) },
    { key: "expenses", name: "Xərclər", rows: appData.expenses.map((e) => ({ ...e, land: getLandName(e.landId), greenhouse: getGreenhouseName(e.greenhouseId) })) },
    { key: "machines", name: "Texnika", rows: appData.machines },
    { key: "harvests", name: "Məhsul yığımı", rows: appData.harvests.map((h) => ({ ...h, rows: formatHarvestRowsPlain(h.rows), land: getLandName(h.landId), greenhouse: getGreenhouseName(h.greenhouseId) })) },
    { key: "cold", name: "Soyuducu Anbar", rows: appData.coldStorageEntries.map((c) => ({ ...c, rows: formatMoneyRowsPlain(c.rows) })) },
    { key: "sales", name: "Satışlar", rows: appData.sales.map((s) => ({ ...s, rows: formatMoneyRowsPlain(s.rows), land: getLandName(s.landId), greenhouse: getGreenhouseName(s.greenhouseId) })) },
    { key: "customers", name: "Müştərilər", rows: appData.customers.map((c) => ({ ...c, ...getCustomerStats(c.id) })) },
    { key: "debts", name: "Borclar", rows: getDebtExportRows() },
    { key: "calibers", name: "Kalibr Analitikası", rows: getCaliberAnalyticsRows() },
    { key: "channels", name: "Satış Kanalları", rows: getReportRows("channels") },
    { key: "landProfit", name: "Sahə Mənfəəti", rows: getLandProfitRows() },
    { key: "greenhouseProfit", name: "İstixana Mənfəəti", rows: getGreenhouseProfitRows() },
    { key: "reports", name: "Hesabatlar", rows: getReportRows("finance") }
  ];
  const map = {
    all: all,
    sales: all.filter((s) => s.key === "sales"),
    expenses: all.filter((s) => s.key === "expenses"),
    salaries: all.filter((s) => s.key === "salaries"),
    harvests: all.filter((s) => s.key === "harvests"),
    debts: all.filter((s) => s.key === "debts"),
    cold: all.filter((s) => s.key === "cold"),
    landProfit: all.filter((s) => s.key === "landProfit"),
    finance: all.filter((s) => s.key === "dashboard" || s.key === "reports"),
    calibers: all.filter((s) => s.key === "calibers")
  };
  return map[type] || all;
}

function getDebtExportRows() {
  const saleDebts = appData.sales.map((sale) => ({ Tip: "Müştəri", Tarix: sale.date, Ad: sale.customerName, Ümumi: sale.totalAmount, Ödənilib: sale.paidAmount, Borc: sale.debtAmount, Status: sale.status }));
  const coldDebts = appData.coldStorageEntries.map((entry) => ({ Tip: "Soyuducu/anbar", Tarix: entry.date, Ad: entry.storageName, Ümumi: entry.netAmount, Ödənilib: entry.paidAmount, Borc: entry.debtAmount, Status: entry.status }));
  return [...saleDebts, ...coldDebts];
}

function formatMoneyRowsPlain(rows = []) {
  return rows.map((row) => `${row.caliberName}: ${row.quantityKg} kg x ${row.unitPrice} = ${row.totalAmount}`).join("; ");
}

function formatHarvestRowsPlain(rows = []) {
  return rows.map((row) => `${row.caliberName}: ${row.quantityKg} kg (${row.quality})`).join("; ");
}

function sanitizeSheetName(name) {
  return String(name).replace(/[\\/?*[\]:]/g, " ").slice(0, 31);
}

function summaryCard(title, value, note) {
  return `
    <article class="summary-card">
      <span>${title}</span>
      <strong>${value}</strong>
      <small>${note}</small>
    </article>
  `;
}

function optionsHtml(options, selected = "") {
  return options.map((option) => `
    <option value="${escapeHtml(option.value)}" ${option.value === selected ? "selected" : ""}>${escapeHtml(option.label)}</option>
  `).join("");
}

function currencyOptions(selected = "AZN") {
  return ["AZN", "USD"].map((currency) => `
    <option value="${currency}" ${currency === selected ? "selected" : ""}>${currency}</option>
  `).join("");
}

function landOptions(selected = "") {
  if (!appData.lands.length) return `<option value="">Sahə yoxdur</option>`;
  return appData.lands.map((land) => `
    <option value="${land.id}" ${land.id === selected ? "selected" : ""}>${escapeHtml(land.name)}</option>
  `).join("");
}

function workerOptions(selected = "") {
  if (!appData.workers.length) return `<option value="">İşçi yoxdur</option>`;
  return appData.workers.map((worker) => `
    <option value="${worker.id}" ${worker.id === selected ? "selected" : ""}>${escapeHtml(worker.fullName)}</option>
  `).join("");
}

function greenhouseOptions(selected = "") {
  return `<option value="">İstixana seçilməyib</option>${appData.greenhouses.map((greenhouse) => `
    <option value="${greenhouse.id}" ${greenhouse.id === selected ? "selected" : ""}>${escapeHtml(greenhouse.name)}</option>
  `).join("")}`;
}

function emptyTableRow(columns, text) {
  return `<tr><td class="empty-cell" colspan="${columns}">${text}</td></tr>`;
}

function normalizeSearch(value) {
  return String(value || "").trim().toLocaleLowerCase("az-AZ");
}

function formatRemainingDays(value) {
  if (!value) return "-";
  const end = new Date(`${value}T00:00:00`);
  if (Number.isNaN(end.getTime())) return "-";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.ceil((end - today) / 86400000);
  if (diff < 0) return "Bitib";
  if (diff === 0) return "Bu gün";
  return `${diff} gün`;
}

function todayISO() {
  return toLocalISODate(new Date());
}

function nextYearISO() {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1);
  return toLocalISODate(date);
}

function toLocalISODate(date) {
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 10);
}

function openMobileMenu() {
  dom.sidebar.classList.add("open");
  dom.mobileOverlay.classList.add("active");
}

function closeMobileMenu() {
  dom.sidebar.classList.remove("open");
  dom.mobileOverlay.classList.remove("active");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
