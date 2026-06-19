export const storageKey = "budget-state-v3";

export const holdingTypes = {
  etf:     { label: "ETF基金",   abbr: "指", color: "#3a82e4" },
  fund:    { label: "主动基金",   abbr: "基", color: "#8c67b7" },
  bond:    { label: "债券/债基", abbr: "债", color: "#21b57a" },
  deposit: { label: "银行定期",   abbr: "存", color: "#ff8b2c" },
  money:   { label: "货币/活期", abbr: "货", color: "#6aab6a" },
  stock:   { label: "股票",       abbr: "股", color: "#e84040" }
};

export const accountOrder = ["survival", "assets", "upgrade", "freedom"];

export const accountMeta = {
  survival: {
    title: "生存账户",
    shortTitle: "生存",
    type: "spending",
    color: "#21b57a",
    soft: "#e9fbf4",
    icon: "◜",
    description: "维持每个月稳定生活状态所必须的重复性确定支出。"
  },
  assets: {
    title: "长期资产账户",
    shortTitle: "长期",
    type: "investment",
    color: "#8c67b7",
    soft: "#f5efff",
    icon: "▢",
    description: "现在不靠它生活，但未来会持续放大财富能力的钱。"
  },
  upgrade: {
    title: "生活升级账户",
    shortTitle: "升级",
    type: "spending",
    color: "#ff8b2c",
    soft: "#fff4ea",
    icon: "★",
    description: "不关乎生存，但能显著提升日常体验的计划内支出。"
  },
  freedom: {
    title: "自由账户",
    shortTitle: "自由",
    type: "spending",
    color: "#3a82e4",
    soft: "#edf5ff",
    icon: "●",
    description: "给即时冲动和情绪消费一个不会破坏结构的出口。"
  }
};

export const accountDetails = {
  survival: {
    principle: "不负责让你变好或开心，只负责让现有生活正常运转。",
    tests: ["不做这个事生活就不会正常进行", "不做决策也会自然发生", "是维持现有生活水平的必要成本"],
    sections: [
      { title: "固定居住成本", body: "房租、水电煤、宽带、物业费等，住在哪里的刚性成本，优先级最高。" },
      { title: "基础饮食成本", body: "日常吃饭的钱：外卖、食堂、便利店、超市、正常下馆子。不包括奖励自己吃点好的。" },
      { title: "通勤与基础出行", body: "地铁、共享单车、日常通勤里的打车等基础移动成本。" },
      { title: "数据基础设施", body: "手机话费、流量、iCloud、音乐、视频会员等基础订阅。" },
      { title: "健康基础支出", body: "偶尔药品、小病检查等日常概率性小支出。" },
      { title: "不可避免的杂项", body: "日用品、临时补充的小东西，金额不大但不可避免，不必逐笔拆得太细。" }
    ]
  },
  assets: {
    principle: "未来三年以上不用，不服务短期消费，可以承受波动换取长期收益。",
    tests: ["未来三年以上不用", "不服务短期消费", "可以承受波动换取长期收益"],
    sections: [
      { title: "增长层", body: "权益型长期资产，负责跑赢通胀。比如宽基指数，逻辑是长期持有、忽略波动。" },
      { title: "稳定层", body: "债券基金、中短债和利率债组合。作用不是赚大钱，而是防止市场下跌时情绪崩溃。" },
      { title: "现金类储备", body: "定期存款、货币基金和应急基金，负责绝对安全，覆盖至少 3-6 个月生活支出即可。" }
    ]
  },
  upgrade: {
    principle: "计划内、理性的体验改善，让长期待在家、身体状态和心情都更好。",
    tests: ["让你长期待在家里更舒服", "每天体验变好", "改善身体状态和心情"],
    sections: [
      { title: "居住环境升级", body: "更好的床垫、枕头、椅子桌子、空气净化器、洗碗机等长期受益型支出。" },
      { title: "电子产品升级", body: "电脑、显示器、键鼠、音响、手机等会改善每天使用体验的设备。" },
      { title: "体验型消费", body: "有节奏的改善，而不是随机冲动。比如更舒服的衣服和鞋子、出门旅游。" }
    ]
  },
  freedom: {
    principle: "承认人的消费有情绪维度，让当下舒服有预算边界。",
    tests: ["不关乎生存", "即时冲动或说不清买来干什么", "花完也不影响整体结构"],
    sections: [
      { title: "情绪出口", body: "不要求每笔都理性，不用证明它能提升长期生活，只要预算内就允许发生。" },
      { title: "冲动消费池", body: "零食、小玩意、临时娱乐、突然想买的东西，都从这里走。" },
      { title: "结构保护", body: "这个账户不是消灭情绪，而是避免情绪性消费侵蚀生存、资产和升级账户。" }
    ]
  }
};

export const defaultAccountSections = buildDefaultAccountSections();

export const homeAccountOrder = ["survival", "upgrade", "freedom", "assets"];
export const spendingAccountOrder = accountOrder.filter((id) => accountMeta[id].type === "spending");
export const investmentAccountOrder = accountOrder.filter((id) => accountMeta[id].type === "investment");

export const chartPalette = {
  survival: "#6f9e70",
  assets: "#5a9bd8",
  upgrade: "#e39132",
  freedom: "#d66f79"
};

export const chartHighlightPalette = {
  survival: "#a8c99b",
  assets: "#8ec4ee",
  upgrade: "#f2b55f",
  freedom: "#e59aa0"
};

export const stylePresets = {
  stable: {
    title: "稳健",
    mark: "S",
    icon: "◇",
    note: "先稳生活和现金流",
    ratios: { survival: 40, assets: 35, upgrade: 15, freedom: 10 }
  },
  balanced: {
    title: "平衡",
    mark: "B",
    icon: "⚖",
    note: "生活、资产和自由度均衡",
    ratios: { survival: 34, assets: 38, upgrade: 17, freedom: 11 }
  },
  growth: {
    title: "激进",
    mark: "G",
    icon: "⌁",
    note: "更多沉淀到长期资产",
    ratios: { survival: 30, assets: 50, upgrade: 12, freedom: 8 }
  },
  custom: {
    title: "自定义",
    mark: "",
    icon: "◌",
    note: "使用你手动调整的比例",
    ratios: null
  }
};

export const categories = {
  survival: ["固定居住成本", "基础饮食成本", "通勤与基础出行", "数据基础设施", "健康基础支出", "不可避免的杂项"],
  assets: ["增长层", "稳定层", "现金类储备"],
  upgrade: ["居住环境升级", "电子产品升级", "体验型消费"],
  freedom: ["情绪出口", "冲动消费池", "结构保护"],
  income: ["工资", "奖金", "副业", "理财", "报销", "红包", "退款", "其他"]
};

export const investmentKinds = {
  transferIn: "追加投入",
  transferOut: "赎回/转出",
  valuation: "更新市值",
  yield: "利息/分红",
  maturity: "到期结算"
};

export const defaultLedgerAdvancedFilters = {
  keyword: "",
  accounts: [],
  category: "",
  amountRange: "all",
  customAmountMin: "",
  customAmountMax: "",
  sort: "newest"
};

const now = new Date();
export const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
export const today = now.toISOString().slice(0, 10);
export const yuan = new Intl.NumberFormat("zh-CN", { style: "currency", currency: "CNY", maximumFractionDigits: 0 });

export const customRatios = { survival: 30, assets: 50, upgrade: 12, freedom: 8 };
export const defaultAssetSnapshot = {
  floatingPnl: 128,
  privacyMode: false,
  safetyMonths: 6,
  trendMonths: 6,
  holdings: [
    { id: "hold_1", name: "沪深300ETF",  code: "510300",     type: "etf",   category: "增长层", subcategory: "宽基指数基金", marketValue: 68240, costBasis: 60000 },
    { id: "hold_2", name: "中证红利ETF", code: "515080",     type: "etf",   category: "增长层", subcategory: "权益基金", marketValue: 46800, costBasis: 43000 },
    { id: "hold_3", name: "货币基金",    code: "余额宝-天弘", type: "money", category: "现金类储备", subcategory: "货币基金", marketValue: 37340, costBasis: 25000 }
  ],
  assetEvents: [],
  history: []
};

export const defaultAccountBreakdowns = {
  survival: [
    [
      { id: "survival-rent", name: "房租", amount: 5200 },
      { id: "survival-utilities", name: "水电煤", amount: 420 },
      { id: "survival-broadband", name: "宽带", amount: 160 },
      { id: "survival-property", name: "物业费", amount: 220 }
    ],
    [
      { id: "survival-meals", name: "工作餐", amount: 1200 },
      { id: "survival-grocery", name: "超市食材", amount: 800 }
    ],
    [
      { id: "survival-metro", name: "地铁公交", amount: 360 },
      { id: "survival-taxi", name: "必要打车", amount: 240 }
    ],
    [
      { id: "survival-phone", name: "手机话费", amount: 120 },
      { id: "survival-subscriptions", name: "基础订阅", amount: 180 }
    ],
    [
      { id: "survival-medicine", name: "日常药品", amount: 160 },
      { id: "survival-checkup", name: "小病检查", amount: 240 }
    ],
    [
      { id: "survival-daily", name: "日用品", amount: 260 },
      { id: "survival-repair", name: "临时补充", amount: 220 }
    ]
  ],
  assets: [
    [
      { id: "assets-index", name: "宽基指数基金", amount: 4200 },
      { id: "assets-enhanced-index", name: "指数增强基金", amount: 0 },
      { id: "assets-equity", name: "主动权益基金", amount: 1800 },
      { id: "assets-sector-fund", name: "行业主题基金", amount: 0 },
      { id: "assets-stock", name: "股票", amount: 0 },
      { id: "assets-reit", name: "公募REITs", amount: 0 },
      { id: "assets-qdii", name: "QDII基金", amount: 0 },
      { id: "assets-gold", name: "黄金ETF/积存金", amount: 0 }
    ],
    [
      { id: "assets-bond", name: "债券基金", amount: 900 },
      { id: "assets-short-bond", name: "短债基金", amount: 0 },
      { id: "assets-medium-bond", name: "中短债基金", amount: 0 },
      { id: "assets-rate", name: "利率债基金", amount: 600 },
      { id: "assets-credit-bond", name: "信用债基金", amount: 0 },
      { id: "assets-pure-bond", name: "纯债基金", amount: 0 },
      { id: "assets-bond-plus", name: "固收+", amount: 0 },
      { id: "assets-certificate", name: "大额存单", amount: 0 },
      { id: "assets-structured-deposit", name: "结构性存款", amount: 0 },
      { id: "assets-insurance-saving", name: "储蓄险/年金险", amount: 0 }
    ],
    [
      { id: "assets-cash", name: "货币基金", amount: 600 },
      { id: "assets-demand-deposit", name: "活期存款", amount: 0 },
      { id: "assets-call-deposit", name: "通知存款", amount: 0 },
      { id: "assets-deposit", name: "定期存款", amount: 600 },
      { id: "assets-cash-management", name: "现金管理类理财", amount: 0 },
      { id: "assets-reverse-repo", name: "国债逆回购", amount: 0 },
      { id: "assets-tbill", name: "储蓄国债", amount: 0 },
      { id: "assets-bank-demand", name: "银行活钱理财", amount: 0 },
      { id: "assets-emergency", name: "应急储备", amount: 900 }
    ]
  ],
  upgrade: [
    [
      { id: "upgrade-home", name: "居家设备", amount: 900 },
      { id: "upgrade-bedding", name: "床品清洁", amount: 400 }
    ],
    [
      { id: "upgrade-digital", name: "电子设备", amount: 900 },
      { id: "upgrade-accessory", name: "配件耗材", amount: 300 }
    ],
    [
      { id: "upgrade-experience", name: "体验消费", amount: 500 },
      { id: "upgrade-clothing", name: "衣物鞋包", amount: 400 }
    ]
  ],
  freedom: [
    [
      { id: "freedom-mood", name: "情绪消费", amount: 700 }
    ],
    [
      { id: "freedom-snack", name: "零食小玩意", amount: 500 },
      { id: "freedom-fun", name: "临时娱乐", amount: 400 }
    ],
    [
      { id: "freedom-buffer", name: "结构缓冲", amount: 400 }
    ]
  ]
};

export function tx(type, accountId, category, amount, note, date, extra = {}) {
  return {
    id: `tx_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    type,
    accountId,
    category,
    amount,
    note,
    date,
    createdAt: Date.now(),
    ...extra
  };
}

export const defaultState = {
  currentMonth: defaultMonth,
  plannedIncome: 29000,
  totalBudget: 29000,
  quickType: "expense",
  ledgerFilter: "all",
  ledgerAdvancedFilters: structuredClone(defaultLedgerAdvancedFilters),
  investmentKind: "transferIn",
  budgetStyle: "stable",
  manualBudgetStyle: false,
  managerAccountId: "survival",
  managerViewMode: "budget",
  assetsShowAllHoldings: false,
  ratios: structuredClone(stylePresets.stable.ratios),
  customRatios: structuredClone(customRatios),
  budgets: allocateIncome(29000, stylePresets.stable.ratios),
  livingBudgetHistory: [{ month: defaultMonth, amount: livingBudgetFromBudgets(allocateIncome(29000, stylePresets.stable.ratios)) }],
  cashOpeningBalances: {},
  cashCalibratedMonths: [],
  assetSnapshot: structuredClone(defaultAssetSnapshot),
  accountBreakdowns: structuredClone(defaultAccountBreakdowns),
  accountSections: structuredClone(defaultAccountSections),
  incomeCategories: structuredClone(categories.income),
  transactions: [
    tx("income", "income", "工资", 29000, "本月工资", `${defaultMonth}-01`),
    tx("expense", "survival", "基础饮食成本", 86, "早餐和午餐", today),
    tx("expense", "freedom", "情绪出口", 168, "周末电影", today),
    tx("expense", "upgrade", "体验型消费", 299, "课程体验", today)
  ]
};

export function normalizeState(candidate) {
  const requestedStyle = stylePresets[candidate.budgetStyle] ? candidate.budgetStyle : "stable";
  const budgetStyle = requestedStyle === "custom" && candidate.manualBudgetStyle !== true ? "stable" : requestedStyle;
  const savedCustomRatios = {
    ...customRatios,
    ...(candidate.customRatios ?? (budgetStyle === "custom" ? candidate.ratios : {}))
  };
  const ratios = budgetStyle === "custom"
    ? { ...savedCustomRatios, ...(candidate.ratios ?? {}) }
    : structuredClone(stylePresets[budgetStyle]?.ratios ?? savedCustomRatios);
  const migratedBudget = accountOrder.reduce((sum, id) => sum + Number(candidate.budgets?.[id] || 0), 0);
  const totalBudget = Number(candidate.totalBudget ?? (migratedBudget || defaultState.totalBudget));
  const currentMonth = candidate.currentMonth || defaultState.currentMonth;
  const budgets = { ...allocateIncome(totalBudget, ratios), ...(candidate.budgets ?? {}) };
  const cashOpeningBalances = normalizeCashOpeningBalances(candidate.cashOpeningBalances, currentMonth);
  return {
    ...structuredClone(defaultState),
    ...candidate,
    currentMonth,
    totalBudget,
    budgetStyle,
    managerAccountId: accountOrder.includes(candidate.managerAccountId) ? candidate.managerAccountId : "survival",
    managerViewMode: candidate.managerViewMode === "spent" ? "spent" : "budget",
    ledgerFilter: ["all", "expense", "income", "investment"].includes(candidate.ledgerFilter) ? candidate.ledgerFilter : "all",
    ledgerAdvancedFilters: normalizeLedgerAdvancedFilters(candidate.ledgerAdvancedFilters),
    ratios,
    customRatios: savedCustomRatios,
    budgets,
    livingBudgetHistory: normalizeLivingBudgetHistory(candidate.livingBudgetHistory, budgets, currentMonth),
    cashOpeningBalances,
    cashCalibratedMonths: normalizeCashCalibratedMonths(candidate.cashCalibratedMonths, cashOpeningBalances),
    assetsShowAllHoldings: candidate.assetsShowAllHoldings === true,
    assetSnapshot: {
      ...defaultAssetSnapshot,
      ...(candidate.assetSnapshot ?? {}),
      safetyMonths: normalizeSafetyMonths(candidate.assetSnapshot?.safetyMonths),
      trendMonths: normalizeTrendMonths(candidate.assetSnapshot?.trendMonths),
      holdings: normalizeHoldings(candidate.assetSnapshot?.holdings),
      assetEvents: Array.isArray(candidate.assetSnapshot?.assetEvents) ? candidate.assetSnapshot.assetEvents : [],
      history:  Array.isArray(candidate.assetSnapshot?.history)  ? candidate.assetSnapshot.history  : defaultAssetSnapshot.history
    },
    accountBreakdowns: mergeAccountBreakdowns(candidate.accountBreakdowns),
    accountSections: normalizeAccountSections(candidate.accountSections),
    incomeCategories: normalizeIncomeCategories(candidate.incomeCategories),
    transactions: Array.isArray(candidate.transactions) ? candidate.transactions : []
  };
}

function normalizeCashOpeningBalances(openings, currentMonth) {
  const source = openings && typeof openings === "object" ? openings : {};
  const normalized = Object.entries(source).reduce((result, [month, value]) => {
    const key = String(month || "").slice(0, 7);
    const amount = Number(value || 0);
    if (/^\d{4}-\d{2}$/.test(key) && Number.isFinite(amount)) result[key] = amount;
    return result;
  }, {});
  const entries = Object.entries(normalized);
  if (entries.length === 1 && entries[0][1] === 0) return {};
  return normalized;
}

function normalizeCashCalibratedMonths(months, openings) {
  const source = Array.isArray(months) ? months : [];
  const openingMonths = openings && typeof openings === "object" ? openings : {};
  return [...new Set(source
    .map((month) => String(month || "").slice(0, 7))
    .filter((month) => /^\d{4}-\d{2}$/.test(month) && Object.prototype.hasOwnProperty.call(openingMonths, month)))];
}

function normalizeLivingBudgetHistory(history, budgets, currentMonth) {
  const rows = Array.isArray(history) ? history : [];
  const normalized = rows
    .map((row) => ({
      month: String(row?.month || "").slice(0, 7),
      amount: Number(row?.amount || 0)
    }))
    .filter((row) => /^\d{4}-\d{2}$/.test(row.month) && Number.isFinite(row.amount) && row.amount > 0);
  return upsertLivingBudgetSnapshot(normalized, currentMonth, livingBudgetFromBudgets(budgets));
}

export function livingBudgetFromBudgets(budgets) {
  return spendingAccountOrder.reduce((sum, id) => sum + Number(budgets?.[id] || 0), 0);
}

export function upsertLivingBudgetSnapshot(history, month, amount) {
  const safeMonth = String(month || defaultMonth).slice(0, 7);
  const safeAmount = Number(amount || 0);
  const rows = Array.isArray(history) ? history : [];
  if (!/^\d{4}-\d{2}$/.test(safeMonth) || !Number.isFinite(safeAmount) || safeAmount <= 0) {
    return rows;
  }
  return [
    ...rows.filter((row) => row.month !== safeMonth),
    { month: safeMonth, amount: safeAmount }
  ].sort((a, b) => String(a.month).localeCompare(String(b.month)));
}

function normalizeIncomeCategories(savedCategories) {
  if (!Array.isArray(savedCategories)) return structuredClone(categories.income);
  const items = savedCategories.map((item) => String(item || "").trim()).filter(Boolean);
  return items.length ? [...new Set(items)] : structuredClone(categories.income);
}

function buildDefaultAccountSections() {
  return accountOrder.reduce((result, accountId) => {
    result[accountId] = (accountDetails[accountId]?.sections ?? []).map((section, index) => ({
      id: `${accountId}-section-${index}`,
      title: section.title,
      body: section.body
    }));
    return result;
  }, {});
}

function normalizeAccountSections(savedSections) {
  if (!savedSections || typeof savedSections !== "object") return structuredClone(defaultAccountSections);
  return accountOrder.reduce((result, accountId) => {
    const sections = Array.isArray(savedSections[accountId])
      ? savedSections[accountId]
      : defaultAccountSections[accountId];
    result[accountId] = sections
      .filter((section) => section && typeof section === "object")
      .map((section, index) => ({
        id: section.id || `${accountId}-section-${index}`,
        title: String(section.title || `细分 ${index + 1}`),
        body: String(section.body || "")
      }));
    return result;
  }, {});
}

function normalizeSafetyMonths(value) {
  const months = Math.max(1, Math.floor(Number(value || defaultAssetSnapshot.safetyMonths)));
  return Number.isFinite(months) ? months : defaultAssetSnapshot.safetyMonths;
}

function normalizeTrendMonths(value) {
  const months = Math.max(2, Math.min(60, Math.floor(Number(value || defaultAssetSnapshot.trendMonths))));
  return Number.isFinite(months) ? months : defaultAssetSnapshot.trendMonths;
}

function normalizeHoldings(holdings) {
  const source = Array.isArray(holdings) ? holdings : defaultAssetSnapshot.holdings;
  return source.map((holding) => ({
    ...holding,
    category: holding.category || defaultHoldingCategory(holding),
    subcategory: holding.subcategory || defaultHoldingSubcategory(holding)
  }));
}

function defaultHoldingCategory(holding) {
  if (["money", "deposit"].includes(holding.type)) return "现金类储备";
  if (holding.type === "bond") return "稳定层";
  return "增长层";
}

function defaultHoldingSubcategory(holding) {
  if (holding.subcategory) return holding.subcategory;
  if (holding.type === "deposit") return "定期存款";
  if (holding.type === "money") return "货币基金";
  if (holding.type === "bond") return "债券基金";
  return "宽基指数基金";
}

function mergeAccountBreakdowns(savedBreakdowns) {
  const merged = structuredClone(defaultAccountBreakdowns);
  if (!savedBreakdowns || typeof savedBreakdowns !== "object") return merged;
  accountOrder.forEach((accountId) => {
    if (!Array.isArray(savedBreakdowns[accountId])) return;
    merged[accountId] = merged[accountId].map((sectionItems, index) => {
      if (!Array.isArray(savedBreakdowns[accountId][index])) return sectionItems;
      const savedItems = savedBreakdowns[accountId][index];
      const savedIds = new Set(savedItems.map((item) => item.id));
      return [
        ...savedItems,
        ...sectionItems.filter((item) => !savedIds.has(item.id))
      ];
    });
  });
  return merged;
}

function normalizeLedgerAdvancedFilters(filters = {}) {
  const accountCandidates = Array.isArray(filters.accounts) ? filters.accounts : [];
  return {
    keyword: typeof filters.keyword === "string" ? filters.keyword : "",
    accounts: accountCandidates.filter((id) => [...accountOrder, "income"].includes(id)),
    category: typeof filters.category === "string" ? filters.category : "",
    amountRange: ["under100", "100-1000", "over1000"].includes(filters.amountRange) ? filters.amountRange : "all",
    customAmountMin: filters.customAmountMin === undefined || filters.customAmountMin === null ? "" : String(filters.customAmountMin),
    customAmountMax: filters.customAmountMax === undefined || filters.customAmountMax === null ? "" : String(filters.customAmountMax),
    sort: ["newest", "amountDesc", "amountAsc"].includes(filters.sort) ? filters.sort : "newest"
  };
}

export function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (saved) return normalizeState(saved);
  } catch {
    return structuredClone(defaultState);
  }
  return structuredClone(defaultState);
}

export function saveState(state) {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

export function allocateIncome(amount, ratios) {
  const totalRatio = accountOrder.reduce((sum, id) => sum + Number(ratios[id] || 0), 0) || 100;
  let assigned = 0;
  return accountOrder.reduce((result, id, index) => {
    const value = index === accountOrder.length - 1
      ? Math.max(0, Math.round(amount - assigned))
      : Math.max(0, Math.round((amount * Number(ratios[id] || 0)) / totalRatio));
    assigned += value;
    result[id] = value;
    return result;
  }, {});
}
