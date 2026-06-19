import {
  accountMeta,
  accountDetails,
  accountOrder,
  categories,
  chartPalette,
  holdingTypes,
  homeAccountOrder,
  investmentAccountOrder,
  investmentKinds,
  spendingAccountOrder,
  stylePresets,
  today,
  yuan
} from "./state.js?v=negative-neutral1";
import {
  amortizationMonths,
  applyLedgerAdvancedFilters,
  assetBudgetUsageTotal,
  assetTransferInTotal,
  assetTransferOutTotal,
  budgetRemaining,
  breakdownTotal,
  cashBalance,
  dailyExpenseTotal,
  holdingsCostBasis,
  holdingsMarketValue,
  investmentDirection,
  investmentPnl,
  monthTransactions,
  spentByAccount,
  spentBySection,
  ledgerAdvancedFilterCount,
  monthlyCashFlow,
  transactionDisplayAmount,
  totalIncome,
  totalBudget
} from "./calculations.js?v=negative-neutral1";

const uncategorizedInvestmentSection = "未分类资产调动";

export function renderApp(state, visibleResultInfo) {
  renderBudgetPage(state, visibleResultInfo);
  renderLedgerPage(state);
  renderAssetsPage(state);
  renderMePage(state);
  renderBudgetSettingsPage(state);
  renderQuickForm(state);
  renderAccountView(state);
}

export function renderBudgetPage(state, visibleResultInfo) {
  renderMonth(state);
  renderSummary(state);
  renderMonthlyResult(state, visibleResultInfo);
  renderAccounts(state);
}

export function renderLedgerPage(state) {
  const ledgerMonthInput = document.querySelector("#ledgerMonthInput");
  const ledgerMonthText = document.querySelector("#ledgerMonthText");
  if (ledgerMonthInput) ledgerMonthInput.value = state.currentMonth;
  if (ledgerMonthText) ledgerMonthText.textContent = formatMonthLabel(state.currentMonth);

  const allRows = [...monthTransactions(state)].sort((a, b) => {
    const dateDiff = String(b.date || "").localeCompare(String(a.date || ""));
    return dateDiff || Number(b.createdAt || 0) - Number(a.createdAt || 0);
  });
  const expenseTotal = allRows
    .filter((entry) => entry.type === "expense")
    .reduce((sum, entry) => sum + transactionAmount(entry), 0);
  const incomeTotal = allRows
    .filter((entry) => entry.type === "income")
    .reduce((sum, entry) => sum + transactionAmount(entry), 0);
  const investmentTotal = allRows
    .filter((entry) => entry.type === "investment")
    .reduce((sum, entry) => sum + (investmentDirection(entry) * transactionAmount(entry)), 0);

  document.querySelector("#ledgerExpenseTotal").textContent = yuan.format(expenseTotal);
  document.querySelector("#ledgerIncomeTotal").textContent = yuan.format(incomeTotal);
  document.querySelector("#ledgerInvestmentTotal").textContent = yuan.format(investmentTotal);

  const activeFilter = ["expense", "income", "investment"].includes(state.ledgerFilter) ? state.ledgerFilter : "all";
  const advancedFilterCount = ledgerAdvancedFilterCount(state.ledgerAdvancedFilters);
  document.querySelectorAll("[data-ledger-filter]").forEach((button) => {
    const isActive = button.dataset.ledgerFilter === activeFilter;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });
  const filterButton = document.querySelector("[data-open-ledger-filter]");
  const filterCount = document.querySelector("#ledgerFilterCount");
  if (filterButton) {
    filterButton.classList.toggle("is-active", advancedFilterCount > 0);
    filterButton.setAttribute("aria-pressed", String(advancedFilterCount > 0));
  }
  if (filterCount) {
    filterCount.hidden = advancedFilterCount === 0;
    filterCount.textContent = String(advancedFilterCount);
  }

  const baseRows = activeFilter === "all" ? allRows : allRows.filter((entry) => entry.type === activeFilter);
  const rows = applyLedgerAdvancedFilters(baseRows, state.ledgerAdvancedFilters);
  document.querySelector("#transactionList").innerHTML = renderLedgerResultSummary(rows, advancedFilterCount) + renderLedgerGroups(rows, state, advancedFilterCount > 0);
  renderLedgerFilterSheet(state, baseRows);
}

function renderLedgerResultSummary(rows, advancedFilterCount) {
  if (!advancedFilterCount) return "";
  return '<p class="ledger-filter-result">已筛选 ' + rows.length + " 笔流水</p>";
}

function renderLedgerGroups(rows, state, isFiltered = false) {
  if (!rows.length) return `<p class="ledger-empty empty-copy">${isFiltered ? "没有符合筛选的流水。" : "这个月还没有流水。"}</p>`;
  const groups = rows.reduce((result, entry) => {
    const key = entry.date || "未标日期";
    if (!result.has(key)) result.set(key, []);
    result.get(key).push(entry);
    return result;
  }, new Map());

  return [...groups.entries()].map(([date, entries]) => {
    const expense = entries.filter((entry) => entry.type === "expense").reduce((sum, entry) => sum + transactionAmount(entry), 0);
    const income = entries.filter((entry) => entry.type === "income").reduce((sum, entry) => sum + transactionAmount(entry), 0);
    const investment = entries.filter((entry) => entry.type === "investment").reduce((sum, entry) => sum + (investmentDirection(entry) * transactionAmount(entry)), 0);
    return [
      '<section class="ledger-day-group">',
      '<div class="ledger-day-head">',
      '<h2>' + formatLedgerDay(date) + "</h2>",
      '<span>支出 ' + yuan.format(expense) + ' | 收入 ' + yuan.format(income) + ' | 投资 ' + yuan.format(investment) + "</span>",
      "</div>",
      '<div class="ledger-day-card">',
      entries.map((entry) => renderLedgerRow(entry, state)).join(""),
      "</div>",
      "</section>"
    ].join("");
  }).join("");
}

function renderLedgerFilterSheet(state, baseRows) {
  const panel = document.querySelector("#ledgerFilterPanel");
  if (!panel) return;
  const filters = state.ledgerAdvancedFilters || {};
  const selectedAccounts = new Set(Array.isArray(filters.accounts) ? filters.accounts : []);
  const selectedCategory = filters.category || "";
  const hasCustomAmount = hasLedgerCustomAmount(filters);
  const amountRange = hasCustomAmount ? "" : filters.amountRange || "all";
  const sort = filters.sort || "newest";
  const previewCount = applyLedgerAdvancedFilters(baseRows, filters).length;
  panel.innerHTML = [
    '<div class="sheet-head">',
    "<h2>筛选流水</h2>",
    '<button class="icon-button" type="button" data-close-ledger-filter aria-label="关闭">×</button>',
    "</div>",
    '<label class="ledger-filter-search">',
    "<span>关键词</span>",
    '<input id="ledgerKeywordInput" type="search" placeholder="搜备注 / 分类 / 账户" value="' + escapeHtml(filters.keyword || "") + '">',
    "</label>",
    renderLedgerCategorySection(state, baseRows, selectedAccounts, selectedCategory),
    renderLedgerAmountFilterSection(amountRange, filters),
    renderLedgerFilterSection("排序", renderLedgerSortFilterOptions(sort)),
    '<div class="ledger-filter-actions">',
    '<button class="secondary-button" data-reset-ledger-filter type="button">重置</button>',
    '<button class="primary-button" id="ledgerFilterApplyButton" type="submit">查看 ' + previewCount + " 笔</button>",
    "</div>"
  ].join("");
}

function renderLedgerAmountFilterSection(selectedRange, filters) {
  return [
    '<section class="ledger-filter-section">',
    "<span>金额</span>",
    '<div class="ledger-filter-options">',
    renderLedgerAmountFilterOptions(selectedRange),
    "</div>",
    '<div class="ledger-custom-amount">',
    '<input id="ledgerAmountMinInput" type="number" min="0" step="1" inputmode="decimal" placeholder="最低" value="' + escapeHtml(filters.customAmountMin || "") + '">',
    '<span>至</span>',
    '<input id="ledgerAmountMaxInput" type="number" min="0" step="1" inputmode="decimal" placeholder="最高" value="' + escapeHtml(filters.customAmountMax || "") + '">',
    "</div>",
    "</section>"
  ].join("");
}

function renderLedgerFilterSection(title, body) {
  return [
    '<section class="ledger-filter-section">',
    "<span>" + title + "</span>",
    '<div class="ledger-filter-options">',
    body,
    "</div>",
    "</section>"
  ].join("");
}

function renderLedgerCategorySection(state, baseRows, selectedAccounts, selectedCategory) {
  const shouldShowSubcategories = selectedAccounts.size > 0;
  return [
    '<section class="ledger-filter-section">',
    "<span>分类</span>",
    '<div class="ledger-filter-options">',
    renderLedgerAccountFilterOptions(selectedAccounts),
    "</div>",
    '<div class="ledger-filter-subsection" data-ledger-category-section' + (shouldShowSubcategories ? "" : " hidden") + ">",
    "<span>二级类目</span>",
    '<div class="ledger-filter-options ledger-filter-suboptions" data-ledger-category-options>',
    shouldShowSubcategories ? renderLedgerCategoryFilterOptions(state, baseRows, selectedAccounts, selectedCategory) : "",
    "</div>",
    "</div>",
    "</section>"
  ].join("");
}

function renderLedgerAccountFilterOptions(selectedAccounts) {
  const options = [
    ...["survival", "upgrade", "freedom", "assets"].map((id) => ({
      id,
      label: id === "assets" ? "资产" : accountMeta[id].shortTitle || accountMeta[id].title
    })),
    { id: "income", label: "收入" }
  ];
  return options.map((option) => {
    const active = selectedAccounts.has(option.id) ? " is-active" : "";
    return '<button class="' + active.trim() + '" data-ledger-account-filter="' + option.id + '" type="button">' + escapeHtml(option.label) + "</button>";
  }).join("");
}

function renderLedgerAmountFilterOptions(selectedRange) {
  const options = [
    ["all", "全部"],
    ["under100", "100以下"],
    ["100-1000", "100-1000"],
    ["over1000", "1000以上"]
  ];
  return options.map(([value, label]) => {
    const active = value === selectedRange ? " is-active" : "";
    return '<button class="' + active.trim() + '" data-ledger-amount-filter="' + value + '" type="button">' + label + "</button>";
  }).join("");
}

function renderLedgerCategoryFilterOptions(state, baseRows, selectedAccounts, selectedCategory) {
  const categoryOptions = ledgerCategoryOptionsForAccounts(state, baseRows, selectedAccounts);
  const options = selectedCategory && !categoryOptions.includes(selectedCategory)
    ? [selectedCategory, ...categoryOptions]
    : categoryOptions;
  return [
    '<button class="' + (!selectedCategory ? "is-active" : "") + '" data-ledger-category-filter="" type="button">全部</button>',
    options.map((category) => {
      const active = category === selectedCategory ? " is-active" : "";
      return '<button class="' + active.trim() + '" data-ledger-category-filter="' + escapeHtml(category) + '" type="button">' + escapeHtml(category) + "</button>";
    }).join("")
  ].join("");
}

function ledgerCategoryOptionsForAccounts(state, baseRows, selectedAccounts) {
  const options = [];
  selectedAccounts.forEach((accountId) => {
    categoryOptionsForAccount(state, accountId).forEach((category) => options.push(category));
  });
  baseRows
    .filter((entry) => selectedAccounts.has(ledgerFilterAccountKey(entry)))
    .forEach((entry) => {
      if (entry.category) options.push(entry.category);
    });
  return [...new Set(options)];
}

function ledgerFilterAccountKey(entry) {
  return entry.type === "income" ? "income" : entry.accountId;
}

function hasLedgerCustomAmount(filters) {
  return String(filters.customAmountMin || "").trim() !== "" || String(filters.customAmountMax || "").trim() !== "";
}

function renderLedgerSortFilterOptions(selectedSort) {
  const options = [
    ["newest", "最新优先"],
    ["amountDesc", "金额最高"],
    ["amountAsc", "金额最低"]
  ];
  return options.map(([value, label]) => {
    const active = value === selectedSort ? " is-active" : "";
    return '<button class="' + active.trim() + '" data-ledger-sort-filter="' + value + '" type="button">' + label + "</button>";
  }).join("");
}

function renderLedgerRow(entry, state) {
  const amount = transactionAmount(entry);
  const isInvestmentRedeem = entry.type === "investment" && investmentDirection(entry) < 0;
  const prefix = entry.type === "investment" ? "" : entry.type === "income" || isInvestmentRedeem ? "+" : "-";
  const accountMetaForEntry = entry.type === "income" ? null : accountMeta[entry.accountId];
  const account = entry.type === "income" ? "收入" : accountMetaForEntry?.title || "账户";
  const category = entry.type === "investment"
    ? investmentKinds[entry.investmentKind] || "投资"
    : entry.category;
  const title = ledgerEntryTitle(entry, category, account);
  const amortization = entry.type === "expense" && amortizationMonths(entry) > 1
    ? "摊销 " + entry.amortizationIndex + "/" + entry.amortizationMonths
    : "";
  const subtitle = ledgerEntrySubtitle(entry, state, account, category, amortization);
  const accountColor = accountMetaForEntry?.color || (entry.type === "income" ? "#4e8f52" : "#345f7d");
  const accountSoft = accountMetaForEntry?.soft || (entry.type === "income" ? "#edf4e8" : "#edf3f7");

  return [
    '<div class="ledger-swipe-row" data-swipe-row="' + escapeHtml(entry.id) + '">',
    '<button class="ledger-delete-action" data-ledger-delete="' + escapeHtml(entry.id) + '" type="button">删除</button>',
    '<button class="transaction-row ledger-transaction-row is-' + entry.type + '" data-ledger-open="' + escapeHtml(entry.id) + '" type="button" style="--account-color:' + accountColor + '; --account-soft:' + accountSoft + '">',
    '<span class="ledger-entry-icon" aria-hidden="true">' + ledgerIcon(entry) + "</span>",
    '<div class="ledger-entry-main">',
    "<strong>" + escapeHtml(title) + "</strong>",
    "<span>" + escapeHtml(subtitle || "未分类") + "</span>",
    "</div>",
    '<b class="ledger-amount">' + prefix + yuan.format(amount) + "</b>",
    "</button>",
    "</div>"
  ].join("");
}

function ledgerEntryTitle(entry, category, account) {
  if (entry.type === "investment") {
    return [category, entry.note].filter(Boolean).join("·") || account;
  }
  return entry.note || category || account;
}

function ledgerEntrySubtitle(entry, state, account, category, amortization) {
  if (entry.type === "investment") return investmentLedgerSubtitle(entry, state);
  return [
    account,
    entry.note ? category : "",
    amortization
  ].filter(Boolean).join(" · ");
}

function investmentLedgerSubtitle(entry, state) {
  const holding = findHolding(state, entry.holdingId);
  if (["valuation", "yield", "maturity"].includes(entry.investmentKind)) {
    return [
      holding?.name || "未关联持仓",
      entry.investmentKind === "valuation" ? "不影响现金流" : "计入资产变化"
    ].filter(Boolean).join(" · ");
  }
  if (entry.investmentKind === "transferOut") {
    return [
      holding?.name || "未关联持仓",
      entry.destination ? "到 " + entry.destination : ""
    ].filter(Boolean).join(" ");
  }
  const category = entry.category || holding?.category || "";
  const subcategory = entry.subcategory || holding?.subcategory || "";
  return [category, subcategory].filter(Boolean).join("-");
}

function findHolding(state, holdingId) {
  if (!holdingId) return null;
  return (state.assetSnapshot?.holdings ?? []).find((holding) => holding.id === holdingId) || null;
}

function transactionAmount(entry) {
  return transactionDisplayAmount(entry);
}

function ledgerIcon(entry) {
  if (entry.type === "income") return "入";
  return accountMeta[entry.accountId]?.icon || "·";
}

function formatLedgerDay(date) {
  if (date === today) return "今天";
  if (date === previousDate(today)) return "昨天";
  const [, month, day] = String(date || "").split("-");
  if (month && day) return Number(month) + "月" + Number(day) + "日";
  return escapeHtml(date || "未标日期");
}

function previousDate(date) {
  const value = new Date(date + "T00:00:00");
  value.setDate(value.getDate() - 1);
  return value.toISOString().slice(0, 10);
}

export function renderAssetsPage(state) {
  const container = document.querySelector("#assetsPageContent");
  if (!container) return;

  const snap = state.assetSnapshot ?? {};
  const holdings = snap.holdings ?? [];
  const history  = snap.history  ?? [];
  const privacy  = snap.privacyMode ?? false;
  const trendMonths = Math.max(2, Math.floor(Number(snap.trendMonths || 6)));
  const marketValue     = holdingsMarketValue(state);
  const costBasis       = holdingsCostBasis(state);
  const cumulativePnl   = marketValue - costBasis;
  const monthPnl        = investmentPnl(state);

  container.innerHTML = [
    renderAssetOverviewCard(marketValue, costBasis, cumulativePnl, monthPnl, privacy),
    renderAssetTrendChart(history, marketValue, state.currentMonth, trendMonths, privacy),
    renderHoldingsList(holdings, state),
    '<p class="asset-page-note">ETF、基金等净值资产用“更新市值”记录浮动盈亏，可正可负；利息、分红和到期收益进入资产变化，不计入本月收入。</p>'
  ].join("");
}

function renderAssetOverviewCard(marketValue, costBasis, cumulativePnl, monthPnl, privacy) {
  const mask       = (v) => privacy ? "•••••" : yuan.format(v);
  const maskSigned = (v) => privacy ? (v >= 0 ? "+•••••" : "-•••••") : formatSignedCurrency(v);
  const pnlClass   = cumulativePnl >= 0 ? "is-positive" : "is-negative";
  const monthClass = monthPnl >= 0 ? "is-positive" : "is-negative";
  return `
    <div class="card-section asset-overview">
      <div class="section-head">
        <div class="asset-title-row">
          <h2>资产总览</h2>
          <button class="asset-privacy-toggle" type="button" data-assets-privacy aria-label="显示/隐藏金额" aria-pressed="${privacy}">
            ${privacyIcon(privacy)}
          </button>
        </div>
      </div>
      <div class="asset-overview-grid">
        <div class="asset-metric">
          <span>当前总市值</span>
          <strong>${mask(marketValue)}</strong>
        </div>
        <div class="asset-metric">
          <span>累计投入</span>
          <strong>${mask(costBasis)}</strong>
        </div>
        <div class="asset-metric">
          <span>累计盈亏</span>
          <strong class="${pnlClass}">${maskSigned(cumulativePnl)}</strong>
        </div>
        <div class="asset-metric">
          <span>本月盈亏</span>
          <strong class="${monthClass}">${maskSigned(monthPnl)}</strong>
        </div>
      </div>
    </div>`;
}

function privacyIcon(isHidden) {
  return isHidden
    ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.6 10.6a2 2 0 0 0 2.8 2.8"/><path d="M9.4 5.4A10.8 10.8 0 0 1 12 5c5 0 8.5 4.3 9.6 6.1a1.7 1.7 0 0 1 0 1.8 16.4 16.4 0 0 1-2.9 3.5"/><path d="M6.5 6.9A16.2 16.2 0 0 0 2.4 11a1.7 1.7 0 0 0 0 1.8C3.5 14.7 7 19 12 19a10.7 10.7 0 0 0 4.1-.8"/></svg>'
    : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.4 11.1C3.5 9.3 7 5 12 5s8.5 4.3 9.6 6.1a1.7 1.7 0 0 1 0 1.8C20.5 14.7 17 19 12 19s-8.5-4.3-9.6-6.1a1.7 1.7 0 0 1 0-1.8Z"/><circle cx="12" cy="12" r="3"/></svg>';
}

export function renderMePage(state) {
  const container = document.querySelector("#mePageContent");
  if (!container) return;
  const snap = state.assetSnapshot ?? {};
  const holdings = snap.holdings ?? [];
  const privacy = snap.privacyMode ?? false;
  const budget = totalBudget(state);
  const cash = cashBalance(state);
  const marketValue = holdingsMarketValue(state);

  container.innerHTML = [
    renderEmergencyFundCard(state, holdings, privacy),
    `<section class="me-action-list" aria-label="个人设置">
      <button class="me-action-row" type="button" data-nav="budget-settings">
        <span class="me-action-icon" aria-hidden="true">¥</span>
        <span><strong>预算设置</strong><em>本月预算 ${yuan.format(budget)}</em></span>
        <b aria-hidden="true">›</b>
      </button>
      <button class="me-action-row" type="button" data-nav="charts">
        <span class="me-action-icon" aria-hidden="true">◌</span>
        <span><strong>资产持仓</strong><em>当前市值 ${privacy ? "•••••" : yuan.format(marketValue)}</em></span>
        <b aria-hidden="true">›</b>
      </button>
      <button class="me-action-row" type="button" data-nav="ledger">
        <span class="me-action-icon" aria-hidden="true">≡</span>
        <span><strong>流水记录</strong><em>现金结余 ${privacy ? "•••••" : yuan.format(cash)}</em></span>
        <b aria-hidden="true">›</b>
      </button>
    </section>`
  ].join("");
}

function renderEmergencyFundCard(state, holdings, privacy) {
  const months = Math.max(1, Math.floor(Number(state.assetSnapshot?.safetyMonths || 6)));
  const monthlyBudget = monthlyLivingBudget(state);
  const target = monthlyBudget * months;
  const reserve = cashReserveValue(holdings);
  const gap = target - reserve;
  const percent = target > 0 ? Math.round((reserve / target) * 100) : 100;
  const progress = Math.min(100, Math.max(0, percent));
  const status = gap <= 0 ? "is-safe" : "is-gap";
  const mask = (value) => privacy ? "•••••" : yuan.format(value);
  const coveredMonths = monthlyBudget > 0 ? reserve / monthlyBudget : 0;
  const coveredValue = privacy ? "••" : `${coveredMonths >= 10 ? Math.round(coveredMonths) : coveredMonths.toFixed(1).replace(/\.0$/, "")}`;
  const statusLabel = gap <= 0 ? "已覆盖目标" : "距离目标还差";
  const gapLabel = gap <= 0 ? "超出目标" : "目标缺口";
  const gapValue = privacy ? (gap <= 0 ? "+•••••" : "•••••") : (gap <= 0 ? formatSignedCurrency(Math.abs(gap)) : yuan.format(Math.abs(gap)));
  return `
    <section class="card-section emergency-card ${status}">
      <div class="emergency-head">
        <span class="emergency-icon" aria-hidden="true">✓</span>
        <div class="emergency-title">
          <h2>应急金</h2>
          <p>${statusLabel}</p>
        </div>
        <label class="safety-month-control" aria-label="应急金目标月份">
          <span>目标</span>
          <i aria-hidden="true"></i>
          <input data-safety-months type="number" min="1" max="36" step="1" inputmode="numeric" value="${months}">
          <b>个月</b>
        </label>
      </div>
      <div class="emergency-cover">
        <div>
          <strong>${coveredValue}<span>个月</span></strong>
          <em>当前现金储备可覆盖</em>
        </div>
        <b>${privacy ? "••%" : percent + "%"}</b>
      </div>
      <div class="safety-bar" aria-hidden="true"><span style="width:${progress}%"></span></div>
      <div class="emergency-metrics">
        <span><em>现金储备</em><b>${mask(reserve)}</b></span>
        <span><em>${months}个月目标</em><b>${mask(target)}</b></span>
        <span><em>${gapLabel}</em><b class="${gap <= 0 ? "is-positive" : "is-negative"}">${gapValue}</b></span>
      </div>
    </section>`;
}

function monthlyLivingBudget(state) {
  const history = Array.isArray(state.livingBudgetHistory) ? state.livingBudgetHistory : [];
  const values = history.map((row) => Number(row.amount || 0)).filter((amount) => amount > 0);
  if (values.length) return values.reduce((sum, amount) => sum + amount, 0) / values.length;
  return spendingAccountOrder.reduce((sum, id) => sum + Number(state.budgets?.[id] || 0), 0);
}

function cashReserveValue(holdings) {
  return holdings
    .filter((holding) => holding.category === "现金类储备" || ["money", "deposit"].includes(holding.type))
    .reduce((sum, holding) => sum + Number(holding.marketValue || 0), 0);
}

function renderHoldingsList(allHoldings, state) {
  const assetSections = accountSectionsFor(state, "assets");
  const knownCategories = assetSections.map((section) => section.title);
  const groups = [
    ...assetSections.map((section) => ({
      title: section.title,
      subtitle: section.body,
      holdings: allHoldings.filter((holding) => holding.category === section.title)
    })),
    {
      title: "未分类资产",
      subtitle: "还没有归入长期资产账户分类的持仓",
      holdings: allHoldings.filter((holding) => !knownCategories.includes(holding.category))
    }
  ];
  const rows = groups.map((group) => renderHoldingGroup(group)).join("");

  return `
    <div class="card-section holdings-section">
      <div class="section-head">
        <div>
          <h2>资产记录</h2>
          <p>资产是对象，投入、赎回、利息分红和市值更新都是它的履历。</p>
        </div>
        <div class="asset-action-menu">
          <button class="asset-add-button" type="button" aria-haspopup="menu" aria-label="资产记录">
            <span aria-hidden="true">+</span>
            <em>资产记录</em>
          </button>
          <div class="asset-action-popover" role="menu">
            <button type="button" data-add-holding role="menuitem">
              <strong>录入已有资产</strong>
              <span>只填当前金额也可以，从今天开始追踪</span>
            </button>
            <button type="button" data-record-asset-change role="menuitem">
              <strong>记录资产变动</strong>
              <span>追加、赎回、更新市值、利息分红或到期</span>
            </button>
          </div>
        </div>
      </div>
      ${rows || '<p class="holdings-empty">暂无持仓，点击右上角录入资产</p>'}
    </div>`;
}

function renderHoldingGroup(group) {
  if (!group.holdings.length) return "";
  const rows = group.holdings.map((h) => {
    const meta   = holdingTypes[h.type] ?? holdingTypes.fund;
    const profit = Number(h.marketValue || 0) - Number(h.costBasis || 0);
    const rate   = Number(h.costBasis || 0) > 0 ? profit / Number(h.costBasis) : 0;
    const cls    = profit >= 0 ? "is-positive" : "is-negative";
    const statusText = holdingStatusText(h, rate);
    const profitText = h.type === "deposit" && profit === 0 ? "未结算" : formatSignedCurrency(profit);
    return `
      <button class="holding-row" type="button" data-edit-holding="${escapeAttr(h.id)}">
        <span class="holding-name-cell">
          <span class="holding-icon" style="--hc:${meta.color}">${meta.abbr}</span>
          <span class="holding-name">
            <b>${escapeHtml(h.name)}</b>
            <em>${escapeHtml([h.category, h.subcategory].filter(Boolean).join(" · ") || "未分类")}</em>
            ${h.code ? `<em>${escapeHtml(h.code)}</em>` : ""}
            ${h.term ? `<em class="holding-term">${escapeHtml(h.term)}</em>` : ""}
          </span>
        </span>
        <span class="holding-value">${yuan.format(Number(h.marketValue || 0))}</span>
        <span class="holding-profit ${cls}">${profitText}</span>
        <span class="holding-rate ${cls}">${escapeHtml(statusText)}</span>
      </button>`;
  }).join("");

  return `
    <section class="holding-group">
      <div class="holding-group-head">
        <strong>${group.title}</strong>
        <span>${group.subtitle}</span>
      </div>
      <div class="holdings-header">
        <span>资产名称</span>
        <span>当前金额</span>
        <span>盈亏</span>
        <span>状态</span>
      </div>
      ${rows}
    </section>`;
}

function holdingStatusText(holding, rate) {
  if (holding.type === "deposit") return holding.term || "待到期";
  if (holding.type === "money") return "追踪中";
  return formatSignedPercent(rate);
}

function renderAssetTrendChart(history, currentValue, currentMonth, trendMonths = 6, privacy = false) {
  const months = Math.max(2, Math.min(60, Math.floor(Number(trendMonths || 6))));
  const allPoints = normalizeAssetTrendPoints(history, currentMonth, currentValue, months);
  const change = currentValue - Number(allPoints[0]?.value || 0);
  const changeClass = change >= 0 ? "is-positive" : "is-negative";

  const W = 340, H = 140;
  const PL = 46, PR = 12, PT = 14, PB = 24;
  const cW = W - PL - PR;
  const cH = H - PT - PB;

  const vals   = allPoints.map(p => p.value);
  const rawMin = Math.min(...vals);
  const rawMax = Math.max(...vals);
  const step   = Math.pow(10, Math.floor(Math.log10(rawMax - rawMin || 1)));
  const minV   = Math.floor(rawMin / step) * step;
  const maxV   = Math.ceil(rawMax  / step) * step;
  const range  = maxV - minV || 1;

  const toX = (i) => PL + (i / (allPoints.length - 1)) * cW;
  const toY = (v) => PT + (1 - (v - minV) / range) * cH;

  const coords  = allPoints.map((p, i) => [toX(i), toY(p.value)]);
  const lastC   = coords[coords.length - 1];
  const linePts = coords.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" L ");
  const linePath = `M ${linePts}`;
  const areaPath = `${linePath} L ${lastC[0].toFixed(1)},${(PT + cH).toFixed(1)} L ${PL.toFixed(1)},${(PT + cH).toFixed(1)} Z`;

  const gridCount = 4;
  const gridLines = Array.from({ length: gridCount + 1 }, (_, i) => {
    const v = minV + (i / gridCount) * range;
    const y = toY(v).toFixed(1);
    const label = v >= 10000 ? `${(v / 10000).toFixed(v % 10000 === 0 ? 0 : 1)}万` : `${v}`;
    return `<line x1="${PL}" y1="${y}" x2="${W - PR}" y2="${y}" stroke="#e6ebe8" stroke-width="0.8"/>
      <text x="${(PL - 4).toFixed(0)}" y="${(Number(y) + 3.5).toFixed(1)}" text-anchor="end" font-size="9" fill="#9aab9e">${label}</text>`;
  });

  const xLabels = allPoints.map((p, i) => {
    if (i !== 0 && i !== allPoints.length - 1 && i % Math.ceil(allPoints.length / 5) !== 0) return "";
    const x = toX(i).toFixed(1);
    const mmdd = p.month.slice(5) + "/16";
    return `<text x="${x}" y="${(H - 3).toFixed(1)}" text-anchor="middle" font-size="9" fill="#9aab9e">${mmdd}</text>`;
  }).join("");

  const tooltipDate  = allPoints[allPoints.length - 1].month.replace("-", "/") + "/16";
  const tooltipValue = `¥${Math.round(currentValue).toLocaleString("zh-CN")}`;
  const tx = Math.max(PL + 44, Math.min(lastC[0], W - PR - 44)).toFixed(1);
  const ty = Math.max(PT + 2, lastC[1] - 34).toFixed(1);

  return `
    <div class="card-section asset-chart-card">
      ${renderAssetChartHead(months, currentValue, change, changeClass, privacy)}
      <svg viewBox="0 0 ${W} ${H}" width="100%" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#23bf83" stop-opacity="0.18"/>
            <stop offset="100%" stop-color="#23bf83" stop-opacity="0"/>
          </linearGradient>
        </defs>
        ${gridLines.join("")}
        <path d="${areaPath}" fill="url(#areaGrad)"/>
        <path d="${linePath}" fill="none" stroke="#23bf83" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        ${xLabels}
        <circle cx="${lastC[0].toFixed(1)}" cy="${lastC[1].toFixed(1)}" r="4.5" fill="#23bf83"/>
        <rect x="${(Number(tx) - 44).toFixed(1)}" y="${ty}" width="88" height="28" rx="7" fill="white" stroke="#e6ebe8" stroke-width="1"/>
        <text x="${tx}" y="${(Number(ty) + 11).toFixed(1)}" text-anchor="middle" font-size="9" fill="#6f7883">${tooltipDate}</text>
        <text x="${tx}" y="${(Number(ty) + 23).toFixed(1)}" text-anchor="middle" font-size="11" font-weight="700" fill="#23bf83">${tooltipValue}</text>
      </svg>
    </div>`;
}

function renderAssetChartHead(months, currentValue, change, changeClass, privacy) {
  return `
    <div class="asset-chart-head">
      <div>
        <h2>资产变化</h2>
        <span>${privacy ? "•••••" : yuan.format(currentValue)} · <b class="${changeClass}">${privacy ? "••••" : formatSignedCurrency(change)}</b></span>
      </div>
      <label class="asset-trend-control" aria-label="资产变化显示月份">
        <span>最近</span>
        <input data-asset-trend-months type="number" min="2" max="60" step="1" inputmode="numeric" value="${months}">
        <b>个月</b>
      </label>
    </div>`;
}

function normalizeAssetTrendPoints(history, currentMonth, currentValue, trendMonths) {
  const byMonth = new Map();
  (Array.isArray(history) ? history : []).forEach((point) => {
    const month = String(point?.month || "").slice(0, 7);
    const value = Number(point?.value || 0);
    if (/^\d{4}-\d{2}$/.test(month) && Number.isFinite(value)) byMonth.set(month, { month, value });
  });
  byMonth.set(currentMonth, { month: currentMonth, value: Number(currentValue || 0) });
  const currentIndex = assetMonthIndex(currentMonth);
  return Array.from({ length: trendMonths }, (_, index) => {
    const month = assetMonthFromIndex(currentIndex - trendMonths + 1 + index);
    return byMonth.get(month) || { month, value: 0 };
  });
}

function assetMonthIndex(month) {
  const [year, monthNumber] = String(month || "").split("-").map(Number);
  return (year * 12) + monthNumber - 1;
}

function assetMonthFromIndex(index) {
  const year = Math.floor(index / 12);
  const month = (index % 12) + 1;
  return `${year}-${String(month).padStart(2, "0")}`;
}

function escapeAttr(value) {
  return String(value || "").replaceAll('"', "&quot;");
}

export function renderBudgetSettingsPage(state) {
  renderStyleOptions(state);
  renderPie(state);
  const totalBudgetInput = document.querySelector("#totalBudgetInput");
  if (totalBudgetInput) totalBudgetInput.value = state.totalBudget;
  const plannedIncomeInput = document.querySelector("#plannedIncomeInput");
  if (plannedIncomeInput) plannedIncomeInput.value = state.plannedIncome;
  document.querySelector("#customRatioEditor").innerHTML = accountOrder.map((id) => `
    <label class="budget-row">
      <span>${accountMeta[id].title}比例</span>
      <input data-custom-ratio="${id}" type="number" min="0" step="1" value="${Number(state.ratios[id] || 0)}">
    </label>
  `).join("");
  const accountManager = document.querySelector("#accountManager");
  if (!accountManager) return;
  const activeId = accountMeta[state.managerAccountId] ? state.managerAccountId : "survival";
  state.managerAccountId = activeId;
  state.managerViewMode = state.managerViewMode === "spent" ? "spent" : "budget";
  accountManager.innerHTML = '<div class="section-head"><h2>预算账户</h2></div>' + renderAccountManagerTabs(activeId) + renderManagedAccount(state, activeId);
}

function renderAccountManagerTabs(activeId) {
  return [
    '<div class="account-manager-tabs" role="tablist" aria-label="选择账户">',
    homeAccountOrder.map((id) => {
      const meta = accountMeta[id];
      const isActive = id === activeId;
      return [
        '<button class="account-manager-tab ' + (isActive ? "is-active" : "") + '" style="--accent:' + meta.color + '" data-manager-account="' + id + '" type="button" role="tab" aria-selected="' + isActive + '">',
        '<span class="account-tab-icon">' + meta.icon + "</span>",
        "<strong>" + meta.title + "</strong>",
        "</button>"
      ].join("");
    }).join(""),
    "</div>"
  ].join("");
}

function renderManagedAccount(state, id) {
  const meta = accountMeta[id];
  const details = accountDetails[id];
  const budget = Number(state.budgets[id] || 0);
  const spent = meta.type === "investment" ? assetBudgetUsageTotal(state) : spentByAccount(state, id);
  const spentLabel = meta.type === "investment" ? "已投入" : "已用";
  const mode = state.managerViewMode === "spent" ? "spent" : "budget";
  const sections = displayedAccountSectionsFor(state, id, mode);
  const budgetStatus = renderBudgetAllocationStatus(budget, breakdownTotal(state, id));
  return `
    <article class="account-detail" style="--accent:${meta.color}; --soft:${meta.soft}">
      <div class="account-detail-head">
        <span class="account-icon">${meta.icon}</span>
        <div>
          <h2>${meta.title}</h2>
          <p>${meta.description}</p>
        </div>
      </div>
      <div class="account-detail-metrics">
        <button class="metric-link ${mode === "budget" ? "is-active" : ""}" data-manager-mode="budget" type="button" aria-pressed="${mode === "budget"}">预算 <b>${yuan.format(budget)}</b>${budgetStatus}</button>
        <button class="metric-link ${mode === "spent" ? "is-active" : ""}" data-manager-mode="spent" type="button" aria-pressed="${mode === "spent"}">${spentLabel} <b>${yuan.format(spent)}</b></button>
      </div>
      <div class="account-tests" aria-label="${meta.title}判断条件">
        ${details.tests.map((test) => `<span>${escapeHtml(test)}</span>`).join("")}
      </div>
      <div class="breakdown-list">
        ${sections.map((section, sectionIndex) => renderBreakdownSection(state, id, section, sectionIndex, mode)).join("")}
        ${mode === "budget" ? renderSectionAddForm(id) : ""}
      </div>
    </article>
  `;
}

function renderBreakdownSection(state, accountId, section, sectionIndex, mode = "budget") {
  const items = state.accountBreakdowns?.[accountId]?.[sectionIndex] ?? [];
  const budget = items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const spent = spentBySection(state, accountId, section.title);
  const spentClass = spent > budget && budget > 0 ? "is-overspent" : "";
  const isBudgetMode = mode !== "spent";
  const transactions = isBudgetMode ? [] : sectionTransactions(state, accountId, section.title);
  return `
    <section class="account-submodule budget-breakdown section-swipe-row" data-swipe-row="${escapeAttr(accountId + '-' + sectionIndex)}" data-breakdown-section="${accountId}" data-breakdown-index="${sectionIndex}">
      ${isBudgetMode ? `<button class="section-delete-action" data-section-delete="${accountId}" data-section-index="${sectionIndex}" type="button">删除</button>` : ""}
      <div class="section-swipe-content">
      <div class="breakdown-head">
        <label class="section-title-field">
          <input data-section-name="${accountId}" data-section-index="${sectionIndex}" type="text" value="${escapeHtml(section.title)}" aria-label="细分分类名称">
          <em>${isBudgetMode ? items.length + " 个条目" : transactions.length + " 笔明细"}</em>
        </label>
        <span class="breakdown-metrics">
          <span><b class="${!isBudgetMode ? spentClass : ""}">${yuan.format(isBudgetMode ? budget : spent)}</b></span>
        </span>
        <button class="icon-button breakdown-toggle" data-breakdown-toggle type="button" aria-expanded="false" aria-label="展开${escapeHtml(section.title)}">⌄</button>
      </div>
      <div class="breakdown-panel">
        ${isBudgetMode ? renderBudgetBreakdownItems(accountId, sectionIndex, items) : renderSpentBreakdownItems(transactions, accountId, section.title, state)}
      </div>
      </div>
    </section>
  `;
}

function renderSectionAddForm(accountId) {
  return `
    <form class="section-add-form" data-section-add="${accountId}">
      <input name="title" type="text" placeholder="新增细分分类" aria-label="新增细分分类名称">
      <button class="secondary-button" type="submit">添加分类</button>
    </form>
  `;
}

function renderBudgetAllocationStatus(accountBudget, detailsTotal) {
  const diff = Number(accountBudget || 0) - Number(detailsTotal || 0);
  if (diff > 0) {
    return '<em class="budget-allocation-status is-gap">剩余 ' + yuan.format(diff) + " 未分配</em>";
  }
  if (diff < 0) {
    return '<em class="budget-allocation-status is-over">已超过预算 ' + yuan.format(Math.abs(diff)) + "</em>";
  }
  return "";
}

function renderBudgetBreakdownItems(accountId, sectionIndex, items) {
  return `
    <div class="breakdown-items">
      ${items.map((item) => `
        <div class="breakdown-item" data-breakdown-item="${item.id}">
          <input data-breakdown-name="${accountId}" data-section-index="${sectionIndex}" data-item-id="${item.id}" type="text" value="${escapeHtml(item.name)}" aria-label="条目名称">
          <label>
            <span>¥</span>
            <input data-breakdown-amount="${accountId}" data-section-index="${sectionIndex}" data-item-id="${item.id}" type="number" min="0" step="1" value="${Number(item.amount || 0)}" aria-label="条目金额">
          </label>
          <button class="icon-button breakdown-delete" data-breakdown-delete="${accountId}" data-section-index="${sectionIndex}" data-item-id="${item.id}" type="button" aria-label="删除条目">×</button>
        </div>
      `).join("") || '<p class="empty-copy">还没有条目。</p>'}
    </div>
    <form class="breakdown-add-form" data-breakdown-form="${accountId}" data-section-index="${sectionIndex}">
      <input name="name" type="text" placeholder="新建条目" aria-label="新建条目名称">
      <input name="amount" type="number" min="0" step="1" placeholder="金额" aria-label="新建条目金额">
      <button class="secondary-button" type="submit">添加</button>
    </form>
  `;
}

function renderSpentBreakdownItems(transactions, accountId, sectionTitle, state) {
  if (!transactions.length) return '<p class="empty-copy">本月还没有明细。</p>';
  const amounts = transactions.map(t => sectionTransactionAmount(t, accountId)).sort((a, b) => a - b);
  const total = amounts.reduce((sum, a) => sum + a, 0);
  const average = total / amounts.length;
  const mid = Math.floor(amounts.length / 2);
  const median = amounts.length % 2 === 0 ? (amounts[mid - 1] + amounts[mid]) / 2 : amounts[mid];
  const max = amounts[amounts.length - 1];
  const recent = transactions.slice(0, 3);
  const showLink = transactions.length > 3;
  return `
    <div class="spent-breakdown-section-head"><strong>数据概览</strong></div>
    <div class="spent-breakdown-summary">
      <span><em>均值</em><b>${formatSectionAmount(average, accountId)}</b></span>
      <span><em>中位</em><b>${formatSectionAmount(median, accountId)}</b></span>
      <span><em>最大</em><b>${formatSectionAmount(max, accountId)}</b></span>
    </div>
    <div class="spent-breakdown-preview">
      <strong>最近 ${recent.length} 笔</strong>
      <div class="spent-compact-items">
        ${recent.map(entry => `
          <div class="spent-compact-item">
            <span>${escapeHtml(compactTransactionMeta(entry, state))}</span>
            <b>${formatSectionAmount(sectionTransactionAmount(entry, accountId), accountId)}</b>
          </div>
        `).join("")}
      </div>
    </div>
    ${showLink ? `<button class="spent-ledger-link" data-ledger-section-account="${escapeHtml(accountId)}" data-ledger-section-category="${escapeHtml(sectionTitle)}" type="button">查看全部 ${transactions.length} 笔流水</button>` : ""}
  `;
}

function sectionTransactionAmount(entry, accountId) {
  if (accountMeta[accountId]?.type === "investment") {
    return investmentDirection(entry) * transactionDisplayAmount(entry);
  }
  return transactionDisplayAmount(entry);
}

function formatSectionAmount(value, accountId) {
  if (accountMeta[accountId]?.type === "investment") {
    const amount = Number(value || 0);
    return (amount < 0 ? "-" : "") + yuan.format(Math.abs(amount));
  }
  return yuan.format(value);
}

function compactTransactionMeta(entry, state) {
  const parts = [entry.date];
  if (entry.type === "investment") {
    const holding = findHolding(state, entry.holdingId);
    parts.push(investmentKinds[entry.investmentKind] || "投资");
    parts.push(holding?.name || "未关联持仓");
  } else {
    if (entry.amortizationMonths && entry.amortizationMonths > 1) {
      parts.push("摊销 " + entry.amortizationIndex + "/" + entry.amortizationMonths);
    }
  }
  if (entry.note) parts.push(entry.note);
  return parts.filter(Boolean).join(" · ");
}

function sectionTransactions(state, accountId, sectionTitle) {
  return monthTransactions(state)
    .filter((entry) => {
      if (accountMeta[accountId]?.type === "investment") {
        return entry.type === "investment" && entry.investmentKind === "transferIn" && investmentEntrySectionTitle(state, entry) === sectionTitle;
      }
      return entry.type === "expense" && entry.accountId === accountId && entry.category === sectionTitle;
    })
    .sort((a, b) => b.createdAt - a.createdAt);
}

function investmentEntrySectionTitle(state, entry) {
  if (entry.category) return entry.category;
  return findHolding(state, entry.holdingId)?.category || uncategorizedInvestmentSection;
}

function setCustomSelect(hiddenInput, options, value) {
  const wrapper = hiddenInput.closest(".custom-select");
  const panel = wrapper.querySelector(".custom-select-panel");
  const display = wrapper.querySelector("[data-select-display]");
  panel.innerHTML = options.map((o) =>
    `<button type="button" class="custom-select-option${String(o.value) === String(value) ? " is-selected" : ""}" data-value="${escapeHtml(String(o.value))}">${escapeHtml(o.label)}</button>`
  ).join("");
  hiddenInput.value = value;
  display.textContent = options.find((o) => String(o.value) === String(value))?.label ?? "";
}

function accountSectionsFor(state, accountId) {
  const sections = state.accountSections?.[accountId];
  if (Array.isArray(sections)) return sections;
  return accountDetails[accountId]?.sections ?? [];
}

function displayedAccountSectionsFor(state, accountId, mode = "budget") {
  const sections = accountSectionsFor(state, accountId);
  if (mode === "spent" && accountMeta[accountId]?.type === "investment" && hasUncategorizedInvestmentRows(state)) {
    return [
      ...sections,
      { id: "assets-section-uncategorized", title: uncategorizedInvestmentSection, body: "" }
    ];
  }
  return sections;
}

function hasUncategorizedInvestmentRows(state) {
  return monthTransactions(state).some((entry) =>
    entry.type === "investment" &&
    investmentDirection(entry) > 0 &&
    investmentEntrySectionTitle(state, entry) === uncategorizedInvestmentSection
  );
}

function categoryOptionsForAccount(state, accountId) {
  if (accountId === "income") return state.incomeCategories || categories.income;
  return accountSectionsFor(state, accountId).map((section) => section.title).filter(Boolean);
}

export function renderQuickForm(state) {
  document.querySelectorAll("[data-type-button]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.typeButton === state.quickType);
  });
  const accountInput = document.querySelector("#accountInput");
  const accountField = document.querySelector("#accountField");
  const categoryField = document.querySelector("#categoryField");
  const amortizationField = document.querySelector("#amortizationField");
  const investmentTypeField = document.querySelector("#investmentTypeField");
  const subcategoryField = document.querySelector("#subcategoryField");
  const categoryLabel = document.querySelector("#categoryLabel");
  const formTitle = document.querySelector("#entrySheetTitle");
  const segmented = document.querySelector("#entryForm .segmented");
  const amountLabel = document.querySelector("#amountLabel");
  const isIncome = state.quickType === "income";
  const isInvestment = state.quickType === "investment";
  const selectedAccount = accountInput.value;
  const isTransferIn = isInvestment && state.investmentKind === "transferIn";
  const isTransferOut = isInvestment && state.investmentKind === "transferOut";
  const isValuation = isInvestment && state.investmentKind === "valuation";
  const isAssetIncome = isInvestment && ["yield", "maturity"].includes(state.investmentKind);
  accountField.hidden = isIncome || isInvestment;
  categoryField.hidden = isInvestment && !isTransferIn;
  amortizationField.hidden = isIncome || isInvestment;
  investmentTypeField.hidden = !isInvestment;
  subcategoryField.hidden = !isTransferIn;
  if (formTitle) formTitle.textContent = isInvestment ? "资产记录" : "快速记账";
  if (segmented) segmented.hidden = isInvestment;
  if (amountLabel) {
    amountLabel.textContent = isValuation ? "当前金额/市值" : isAssetIncome ? "利息/分红金额" : "金额";
  }
  document.querySelector("#investmentTypeRow").innerHTML = Object.entries(investmentKinds).map(([key, label]) => `
    <button class="${state.investmentKind === key ? "is-active" : ""}" data-investment-kind="${key}" type="button">${label}</button>
  `).join("");

  const holdingSelectField = document.querySelector("#holdingSelectField");
  const newHoldingInlineFields = document.querySelector("#newHoldingInlineFields");
  const transferOutSourceField = document.querySelector("#transferOutSourceField");
  const transferOutDestField = document.querySelector("#transferOutDestField");
  const assetEventHoldingField = document.querySelector("#assetEventHoldingField");
  holdingSelectField.hidden = !isTransferIn;
  transferOutSourceField.hidden = !isTransferOut;
  transferOutDestField.hidden = !isTransferOut;
  if (assetEventHoldingField) assetEventHoldingField.hidden = !(isValuation || isAssetIncome);

  const holdings = state.assetSnapshot?.holdings ?? [];
  if (isTransferIn) {
    const sel = document.querySelector("#holdingSelectInput");
    const prev = sel.value;
    const holdingOptions = [
      ...holdings.map(h => ({ value: h.id, label: h.name })),
      { value: "__new__", label: "＋ 添加新持仓" }
    ];
    setCustomSelect(sel, holdingOptions, holdingOptions.some((option) => option.value === prev) ? prev : holdingOptions[0]?.value || "__new__");
    const newTypeInput = document.querySelector("#newHoldingTypeInput");
    const typeOptions = Object.entries(holdingTypes).map(([key, meta]) => ({ value: key, label: meta.label }));
    setCustomSelect(newTypeInput, typeOptions, newTypeInput.value || "etf");
    newHoldingInlineFields.hidden = sel.value !== "__new__";
  } else {
    newHoldingInlineFields.hidden = true;
  }

  if (isTransferOut) {
    const sel = document.querySelector("#transferOutSourceInput");
    const prev = sel.value;
    const holdingOptions = holdings.map(h => ({ value: h.id, label: h.name }));
    setCustomSelect(sel, holdingOptions, holdingOptions.some((option) => option.value === prev) ? prev : holdingOptions[0]?.value || "");
  }
  if (isValuation || isAssetIncome) {
    const sel = document.querySelector("#assetEventHoldingInput");
    const prev = sel?.value;
    const holdingOptions = holdings.map(h => ({ value: h.id, label: h.name }));
    if (sel) setCustomSelect(sel, holdingOptions, holdingOptions.some((option) => option.value === prev) ? prev : holdingOptions[0]?.value || "");
  }

  if (isTransferIn) {
    categoryLabel.textContent = "资产一级分类";
    const categoryInput = document.querySelector("#categoryInput");
    const categorySet = categoryOptionsForAccount(state, "assets");
    const categoryValue = categoryInput.value && categorySet.includes(categoryInput.value) ? categoryInput.value : categorySet[0];
    setCustomSelect(categoryInput, withEditOption(categorySet.map((name) => ({ value: name, label: name })), "__edit_asset_categories__", "编辑资产分类"), categoryValue);
    const subcategoryInput = document.querySelector("#subcategoryInput");
    const subcategorySet = assetSubcategoryOptions(state, categoryInput.value);
    const subcategoryValue = subcategoryInput.value && subcategorySet.includes(subcategoryInput.value) ? subcategoryInput.value : subcategorySet[0] || "";
    setCustomSelect(subcategoryInput, withEditOption(subcategorySet.map((name) => ({ value: name, label: name })), "__edit_asset_categories__", "编辑资产子类"), subcategoryValue);
  } else if (!isInvestment) {
    const val = spendingAccountOrder.includes(selectedAccount) ? selectedAccount : "survival";
    setCustomSelect(accountInput, spendingAccountOrder.map((id) => ({ value: id, label: accountMeta[id].title })), val);
    categoryLabel.textContent = isIncome ? "收入分类" : "分类";
    const categorySet = isIncome ? categoryOptionsForAccount(state, "income") : categoryOptionsForAccount(state, accountInput.value || "survival");
    const categoryInput = document.querySelector("#categoryInput");
    const editValue = isIncome ? "__edit_income_categories__" : "__edit_account_categories__";
    const editLabel = isIncome ? "编辑收入分类" : "编辑分类";
    setCustomSelect(categoryInput, withEditOption(categorySet.map((name) => ({ value: name, label: name })), editValue, editLabel), categoryInput.value && categorySet.includes(categoryInput.value) ? categoryInput.value : categorySet[0]);
  }

  document.querySelector("#dateInput").value ||= today;
  document.querySelector("#incomeAllocationNote").textContent = isIncome
    ? "收入只计入本月收入统计，不会自动增加总预算。"
    : isInvestment
      ? assetRecordNote(state.investmentKind)
      : "";
}

function assetRecordNote(kind) {
  if (kind === "valuation") return "更新市值会按当前市值重算浮动盈亏，涨跌都可以记录，不生成收入或支出。";
  if (kind === "yield") return "利息/分红计入资产变化，不计入本月收入；ETF 浮动涨跌请用更新市值。";
  if (kind === "maturity") return "到期结算计入资产变化，不计入本月收入。";
  if (kind === "transferOut") return "赎回/转出会减少持仓，并进入现金结余里的资产调动。";
  return "追加投入会增加持仓，并进入现金结余里的资产调动。";
}

function withEditOption(options, value, label) {
  return [...options, { value, label }];
}

function assetSubcategoryOptions(state, category) {
  const sectionIndex = accountSectionsFor(state, "assets").findIndex((section) => section.title === category);
  const items = state.accountBreakdowns?.assets?.[sectionIndex] ?? [];
  return items.map((item) => item.name).filter(Boolean);
}

function renderMonth(state) {
  document.querySelector("#monthInput").value = state.currentMonth;
  document.querySelector("#monthText").textContent = formatMonthLabel(state.currentMonth);
  document.querySelector("#monthLabel").textContent = Number(state.currentMonth.split("-")[1]) + "月预算剩余";
}

function renderStyleOptions(state) {
  const styleOptions = document.querySelector("#styleOptions");
  if (!styleOptions) return;
  styleOptions.innerHTML = Object.entries(stylePresets).map(([key, preset]) => {
    const isActive = state.budgetStyle === key;
    return [
      '<button class="style-option ' + (isActive ? "is-active" : "") + '" data-style="' + key + '" type="button" aria-pressed="' + isActive + '">',
      '<span class="style-icon" aria-hidden="true">' + preset.icon + "</span>",
      "<span>",
      "<strong>" + preset.title + "</strong>",
      "<em>" + preset.note + "</em>",
      "</span>",
      '<span class="style-radio" aria-hidden="true">✓</span>',
      "</button>"
    ].join("");
  }).join("");
}

function renderSummary(state) {
  const budget = totalBudget(state);
  document.querySelector("#budgetLeft").textContent = yuan.format(budgetRemaining(state));
  document.querySelector("#heroBudgetTotal").textContent = yuan.format(budget);
}

export function renderMonthlyResult(state, visibleResultInfo) {
  const cash = cashBalance(state);
  const flow = monthlyCashFlow(state);
  const pnl = investmentPnl(state);
  const pnlBase = holdingsCostBasis(state);
  const returnRate = pnlBase > 0 ? pnl / pnlBase : 0;
  const income = totalIncome(state);
  const expense = dailyExpenseTotal(state);
  const transferIn = assetTransferInTotal(state);
  const transferOut = assetTransferOutTotal(state);
  const change = transferIn - transferOut + pnl;
  document.querySelector("#cashBalanceTotal").textContent = yuan.format(cash);
  document.querySelector("#overviewCurrentCashInput").value = formatPlainNumber(cash);
  document.querySelector("#overviewCashFlow").textContent = formatSignedCurrency(flow);
  document.querySelector("#investmentPnlTotal").textContent = formatSignedCurrency(pnl);
  document.querySelector("#investmentReturnRate").textContent = formatSignedPercent(returnRate);
  document.querySelector("#assetChangeTotal").textContent = formatSignedCurrency(change);
  document.querySelector("#overviewIncome").textContent = yuan.format(income);
  document.querySelector("#overviewExpense").textContent = yuan.format(expense);
  document.querySelector("#overviewAssetTransfer").textContent = formatSignedCurrency(transferOut - transferIn);
  document.querySelector("#overviewAssetChangeTransfer").textContent = yuan.format(transferIn);
  document.querySelector("#overviewAssetTransferOut").textContent = yuan.format(transferOut);
  document.querySelector("#cashBalanceTotal").classList.remove("is-negative");
  document.querySelector("#overviewCashFlow").classList.remove("is-negative");
  document.querySelector("#investmentPnlTotal").classList.remove("is-negative");
  document.querySelector("#investmentReturnRate").classList.remove("is-negative");
  document.querySelector("#assetChangeTotal").classList.remove("is-negative");
  document.querySelector("#overviewAssetTransfer").classList.remove("is-negative");
  document.querySelector("#overviewAssetChangeTransfer").classList.remove("is-negative");
  document.querySelector("#overviewAssetTransferOut").classList.remove("is-negative");
  if (cash < 0) document.querySelector("#cashBalanceTotal").classList.add("is-negative");
  if (flow < 0) document.querySelector("#overviewCashFlow").classList.add("is-negative");
  if (pnl < 0) document.querySelector("#investmentPnlTotal").classList.add("is-negative");
  if (returnRate < 0) document.querySelector("#investmentReturnRate").classList.add("is-negative");
  if (change < 0) document.querySelector("#assetChangeTotal").classList.add("is-negative");
  if (transferOut - transferIn < 0) document.querySelector("#overviewAssetTransfer").classList.add("is-negative");
  document.querySelectorAll("[data-info-toggle]").forEach((button) => {
    const isOpen = visibleResultInfo.has(button.dataset.infoToggle);
    button.classList.toggle("is-active", isOpen);
    button.setAttribute("aria-expanded", String(isOpen));
  });
  const rows = [
    ["cash", "当前现金由校准余额底账加上本月现金流得到；本月现金流 = 收入 - 日常支出 + 资产账户调动（转出−转入）"],
    ["assetChange", "资产变化 = 转入 - 转出 + 本月浮盈亏；本月收益率 = 本月浮盈亏 / 当前累计投入"]
  ].filter(([key]) => visibleResultInfo.has(key));
  const tray = document.querySelector("#resultInfoTray");
  if (!tray) return;
  tray.hidden = rows.length === 0;
  tray.innerHTML = rows.map(([, text]) => [
    "<p>",
    '<span class="formula-leaf" aria-hidden="true"></span>',
    "<span>" + text + "</span>",
    "</p>"
  ].join("")).join("");
}

function renderPie(state) {
  const budget = totalBudget(state);
  let cursor = 0;
  const segments = accountOrder.map((id) => {
    const value = Number(state.budgets[id] || 0);
    const degrees = budget > 0 ? (value / budget) * 360 : 0;
    const start = cursor;
    const end = cursor + degrees;
    cursor = end;
    return { id, start, end, color: chartPalette[id] ?? accountMeta[id].color };
  });
  document.querySelector("#accountPie").innerHTML = renderCleanDonut(segments);
  document.querySelector("#chartTotal").textContent = yuan.format(budget);
  document.querySelector("#pieLegend").innerHTML = accountOrder.map((id) => {
    const value = Number(state.budgets[id] || 0);
    const percent = budget > 0 ? Math.round((value / budget) * 100) : 0;
    const color = chartPalette[id] ?? accountMeta[id].color;
    return [
      '<div class="legend-row">',
      '<span class="dot" style="--dot:' + color + '"></span>',
      '<span class="legend-copy">',
      '<strong>' + accountMeta[id].title + "</strong>",
      "<em>" + percent + "%</em>",
      "</span>",
      '<label class="legend-budget-field" aria-label="' + accountMeta[id].title + '预算金额">',
      "<span>¥</span>",
      '<input data-budget="' + id + '" type="text" inputmode="numeric" value="' + formatPlainNumber(value) + '">',
      "</label>",
      "</div>"
    ].join("");
  }).join("");
}

function renderAccountView(state) {
  const container = document.querySelector("#accountViewContent");
  const titleEl = document.querySelector("#accountViewTitle");
  if (!container || !titleEl) return;
  const id = state.viewAccountId;
  if (!id || !accountMeta[id]) return;
  const meta = accountMeta[id];
  const details = accountDetails[id];
  const mode = state.viewMode;
  const isInvestment = meta.type === "investment";
  const spentLabel = isInvestment ? "已投入" : "已用";
  titleEl.textContent = meta.title + " · " + (mode === "budget" ? "预算分析" : spentLabel + "分析");
  if (mode === "budget") {
    container.innerHTML = renderAccountBudgetView(state, id, details, meta);
  } else {
    container.innerHTML = renderAccountSpentView(state, id, details, meta, spentLabel);
  }
}

function renderAccountBudgetView(state, id, details, meta) {
  const accountBudget = Number(state.budgets[id] || 0);
  const sections = accountSectionsFor(state, id).map((section, sectionIndex) => {
    const items = state.accountBreakdowns?.[id]?.[sectionIndex] ?? [];
    const value = items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    return { title: section.title, value };
  });
  const breakdownSum = sections.reduce((sum, section) => sum + section.value, 0);
  const diff = accountBudget - breakdownSum;
  const diffClass = diff < 0 ? "is-over" : diff > 0 ? "is-gap" : "is-balanced";
  const diffLabel = diff < 0 ? "超出预算" : diff > 0 ? "未分配" : "已全部分配";
  const diffValue = diff === 0 ? "¥0" : yuan.format(Math.abs(diff));
  const summaryNote = diff < 0
    ? "明细预算已经高于账户预算"
    : diff > 0
      ? "还可以继续分配到下方分类"
      : "分类预算与账户预算一致";

  return [
    '<section class="account-view-dashboard" style="--accent:' + meta.color + '; --soft:' + meta.soft + '">',
    '<button class="account-view-hero" data-edit-account-budget="' + id + '" data-nav="budget-settings" data-parent-nav="budget" data-focus-target="[data-budget=&quot;' + id + '&quot;]" type="button">',
    '<span>账户预算</span>',
    '<strong>' + yuan.format(accountBudget) + "</strong>",
    '<em>点击调整</em>',
    "</button>",
    '<div class="account-view-status ' + diffClass + '">',
    "<span>" + diffLabel + "</span>",
    "<strong>" + diffValue + "</strong>",
    "<em>" + summaryNote + "</em>",
    "</div>",
    '<section class="account-view-chart" aria-label="' + meta.title + '预算明细排行">',
    '<div class="account-view-chart-head">',
    "<span>明细预算排行</span>",
    "<b>合计 " + yuan.format(breakdownSum) + "</b>",
    "</div>",
    renderAccountDistributionRows(sections, accountBudget, "budget"),
    "</section>",
    "</section>"
  ].join("");
}

function renderAccountSpentView(state, id, details, meta, spentLabel) {
  const accountBudget = Number(state.budgets[id] || 0);
  const totalSpent = meta.type === "investment" ? assetBudgetUsageTotal(state) : spentByAccount(state, id);
  const left = accountBudget - totalSpent;
  const statusClass = left < 0 ? "is-over" : "is-gap";
  const statusLabel = left < 0 ? "超出预算" : meta.type === "investment" ? "还可投入" : "剩余额度";
  const sections = displayedAccountSectionsFor(state, id, "spent").map((section) => ({
    title: section.title,
    value: spentBySection(state, id, section.title)
  }));

  return [
    '<section class="account-view-dashboard" style="--accent:' + meta.color + '; --soft:' + meta.soft + '">',
    '<div class="account-view-hero is-static">',
    "<span>" + spentLabel + "合计</span>",
    "<strong>" + yuan.format(totalSpent) + "</strong>",
    "<em>本月实际发生</em>",
    "</div>",
    '<div class="account-view-status ' + statusClass + '">',
    "<span>" + statusLabel + "</span>",
    "<strong>" + yuan.format(Math.abs(left)) + "</strong>",
    "<em>账户预算 " + yuan.format(accountBudget) + "</em>",
    "</div>",
    '<section class="account-view-chart" aria-label="' + meta.title + spentLabel + '明细排行">',
    '<div class="account-view-chart-head">',
    "<span>" + spentLabel + "排行</span>",
    "<b>按金额从高到低</b>",
    "</div>",
    renderAccountDistributionRows(sections, Math.max(totalSpent, accountBudget), "spent"),
    "</section>",
    "</section>"
  ].join("");
}

function renderAccountDistributionRows(sections, basis, mode) {
  const sorted = [...sections].sort((a, b) => b.value - a.value);
  const max = Math.max(...sorted.map((section) => section.value), 1);
  const totalBasis = Math.max(Number(basis || 0), 1);
  const rows = sorted.map((section) => {
    const percent = Math.round((section.value / totalBasis) * 100);
    const width = Math.max(section.value > 0 ? 6 : 0, Math.round((section.value / max) * 100));
    return [
      '<div class="account-view-bar-row">',
      '<div class="account-view-bar-copy">',
      "<strong>" + escapeHtml(section.title) + "</strong>",
      "<span>" + percent + "%</span>",
      "</div>",
      '<div class="account-view-bar-track" aria-hidden="true"><span style="--bar:' + width + '%"></span></div>',
      '<b>' + yuan.format(section.value) + "</b>",
      "</div>"
    ].join("");
  }).join("");
  return rows || '<p class="empty-copy">' + (mode === "spent" ? "本月还没有已用明细。" : "还没有预算明细。") + "</p>";
}

function renderAccounts(state) {
  document.querySelector("#accountList").innerHTML = homeAccountOrder.map((id) => {
    const meta = accountMeta[id];
    const budget = Number(state.budgets[id] || 0);
    const spent = spentByAccount(state, id);
    const left = budget - spent;
    const percent = budget > 0 ? Math.round((spent / budget) * 100) : 0;
    const progress = Math.min(percent, 100);
    if (id === "assets") {
      const invested = assetBudgetUsageTotal(state);
      const investPercent = budget > 0 ? Math.round((invested / budget) * 100) : 0;
      const investProgress = Math.min(investPercent, 100);
      return [
        '<article class="account-row asset-account-row" style="--accent:' + meta.color + '; --soft:' + meta.soft + '; --progress:' + (investProgress * 3.6) + 'deg">',
        '<span class="account-icon">' + meta.icon + "</span>",
      '<div class="account-main">',
      "<h3>" + meta.title + "</h3>",
      "<p>" + meta.description + "</p>",
      '<div class="account-metrics asset-metrics">',
      '<button class="metric-link" data-account-view="' + id + '" data-view-mode="budget" data-nav="account-view" data-parent-nav="budget" type="button">预算 <b>' + yuan.format(budget) + "</b></button>",
      '<button class="metric-link" data-account-view="' + id + '" data-view-mode="spent" data-nav="account-view" data-parent-nav="budget" type="button">已投入 <b>' + yuan.format(invested) + "</b></button>",
        "</div>",
        "</div>",
        '<div class="account-progress" aria-label="' + meta.title + '已投入' + investPercent + '%">',
        "<span>" + investPercent + "%</span>",
        "</div>",
        "</article>"
      ].join("");
    }
    return [
      '<article class="account-row" style="--accent:' + meta.color + '; --soft:' + meta.soft + '; --progress:' + (progress * 3.6) + 'deg">',
      '<span class="account-icon">' + meta.icon + "</span>",
      '<div class="account-main">',
      "<h3>" + meta.title + "</h3>",
      "<p>" + meta.description + "</p>",
      '<div class="account-metrics">',
      '<button class="metric-link" data-account-view="' + id + '" data-view-mode="budget" data-nav="account-view" data-parent-nav="budget" type="button">预算 <b>' + yuan.format(budget) + "</b></button>",
      '<button class="metric-link" data-account-view="' + id + '" data-view-mode="spent" data-nav="account-view" data-parent-nav="budget" type="button">已用 <b>' + yuan.format(spent) + "</b></button>",
      "</div>",
      "</div>",
      '<div class="account-progress" aria-label="' + meta.title + '已用' + percent + '%">',
      "<span>" + percent + "%</span>",
      "</div>",
      "</article>"
    ].join("");
  }).join("");
}

function formatSignedCurrency(value) {
  const amount = Number(value || 0);
  const sign = amount > 0 ? "+" : amount < 0 ? "-" : "";
  return sign + yuan.format(Math.abs(amount));
}

function formatSignedPercent(value) {
  const amount = Number(value || 0);
  const sign = amount > 0 ? "+" : amount < 0 ? "-" : "";
  return sign + (Math.abs(amount) * 100).toFixed(1) + "%";
}

function formatPlainNumber(value) {
  return new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 0 }).format(Number(value || 0));
}

function formatMonthLabel(month) {
  const [year, monthNumber] = month.split("-");
  return year + "年" + monthNumber + "月";
}

function pointOnCircle(cx, cy, radius, angle) {
  const radians = ((angle - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(radians),
    y: cy + radius * Math.sin(radians)
  };
}

function donutSegmentPath(cx, cy, outerRadius, innerRadius, startAngle, endAngle) {
  const outerStart = pointOnCircle(cx, cy, outerRadius, startAngle);
  const outerEnd = pointOnCircle(cx, cy, outerRadius, endAngle);
  const innerStart = pointOnCircle(cx, cy, innerRadius, startAngle);
  const innerEnd = pointOnCircle(cx, cy, innerRadius, endAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return [
    "M " + outerStart.x.toFixed(2) + " " + outerStart.y.toFixed(2),
    "A " + outerRadius + " " + outerRadius + " 0 " + largeArc + " 1 " + outerEnd.x.toFixed(2) + " " + outerEnd.y.toFixed(2),
    "L " + innerEnd.x.toFixed(2) + " " + innerEnd.y.toFixed(2),
    "A " + innerRadius + " " + innerRadius + " 0 " + largeArc + " 0 " + innerStart.x.toFixed(2) + " " + innerStart.y.toFixed(2),
    "Z"
  ].join(" ");
}

function renderCleanDonut(segments) {
  const gap = 1.2;
  const paths = segments.map((segment) => {
    const start = segment.start + gap;
    const end = segment.end - gap;
    return {
      ...segment,
      d: donutSegmentPath(60, 60, 54, 26, start, Math.max(start + 0.1, end))
    };
  });
  const segmentMarkup = paths.map((segment) => '<path d="' + segment.d + '" fill="' + segment.color + '" stroke="#fffaf2" stroke-width="3.4" stroke-linejoin="round"></path>').join("");

  return [
    '<svg class="account-donut" viewBox="0 0 120 120" aria-hidden="true">',
    "<defs>",
    '<filter id="donutSoftShadow" x="-16%" y="-16%" width="132%" height="132%">',
    '<feDropShadow dx="0" dy="5" stdDeviation="4" flood-color="#314332" flood-opacity="0.16"></feDropShadow>',
    "</filter>",
    "</defs>",
    '<circle cx="60" cy="60" r="55" fill="#f6f1e8"></circle>',
    '<g filter="url(#donutSoftShadow)">',
    segmentMarkup,
    "</g>",
    '<circle cx="60" cy="60" r="26.8" fill="#fffdf8" stroke="#efe8dd" stroke-width="2"></circle>',
    "</svg>"
  ].join("");
}

function escapeHtml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}
