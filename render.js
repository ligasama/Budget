import {
  accountMeta,
  accountDetails,
  accountOrder,
  categories,
  chartPalette,
  homeAccountOrder,
  investmentAccountOrder,
  investmentKinds,
  spendingAccountOrder,
  stylePresets,
  today,
  yuan
} from "./state.js?v=ledger-detail1";
import {
  amortizationMonths,
  applyLedgerAdvancedFilters,
  assetTransferInTotal,
  assetTransferOutTotal,
  assetTransferTotal,
  budgetRemaining,
  breakdownTotal,
  cashBalance,
  dailyExpenseTotal,
  investmentDirection,
  investmentPnl,
  monthTransactions,
  spentByAccount,
  spentBySection,
  ledgerAdvancedFilterCount,
  transactionDisplayAmount,
  totalIncome,
  totalBudget
} from "./calculations.js?v=ledger-detail1";

export function renderApp(state, visibleResultInfo) {
  renderBudgetPage(state, visibleResultInfo);
  renderLedgerPage(state);
  renderAssetsPage(state);
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
    .filter((entry) => entry.type === "investment" && investmentDirection(entry) > 0)
    .reduce((sum, entry) => sum + transactionAmount(entry), 0);

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
  document.querySelector("#transactionList").innerHTML = renderLedgerResultSummary(rows, advancedFilterCount) + renderLedgerGroups(rows, advancedFilterCount > 0);
  renderLedgerFilterSheet(state, baseRows);
}

function renderLedgerResultSummary(rows, advancedFilterCount) {
  if (!advancedFilterCount) return "";
  return '<p class="ledger-filter-result">已筛选 ' + rows.length + " 笔流水</p>";
}

function renderLedgerGroups(rows, isFiltered = false) {
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
    const investment = entries.filter((entry) => entry.type === "investment").reduce((sum, entry) => sum + transactionAmount(entry), 0);
    return [
      '<section class="ledger-day-group">',
      '<div class="ledger-day-head">',
      '<h2>' + formatLedgerDay(date) + "</h2>",
      '<span>支出 ' + yuan.format(expense) + ' | 收入 ' + yuan.format(income) + ' | 投资 ' + yuan.format(investment) + "</span>",
      "</div>",
      '<div class="ledger-day-card">',
      entries.map(renderLedgerRow).join(""),
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
    renderLedgerCategorySection(baseRows, selectedAccounts, selectedCategory),
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

function renderLedgerCategorySection(baseRows, selectedAccounts, selectedCategory) {
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
    shouldShowSubcategories ? renderLedgerCategoryFilterOptions(baseRows, selectedAccounts, selectedCategory) : "",
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

function renderLedgerCategoryFilterOptions(baseRows, selectedAccounts, selectedCategory) {
  const categories = ledgerCategoryOptionsForAccounts(baseRows, selectedAccounts);
  const options = selectedCategory && !categories.includes(selectedCategory)
    ? [selectedCategory, ...categories]
    : categories;
  return [
    '<button class="' + (!selectedCategory ? "is-active" : "") + '" data-ledger-category-filter="" type="button">全部</button>',
    options.map((category) => {
      const active = category === selectedCategory ? " is-active" : "";
      return '<button class="' + active.trim() + '" data-ledger-category-filter="' + escapeHtml(category) + '" type="button">' + escapeHtml(category) + "</button>";
    }).join("")
  ].join("");
}

function ledgerCategoryOptionsForAccounts(baseRows, selectedAccounts) {
  const options = [];
  selectedAccounts.forEach((accountId) => {
    (categories[accountId] || []).forEach((category) => options.push(category));
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

function renderLedgerRow(entry) {
  const amount = transactionAmount(entry);
  const isInvestmentRedeem = entry.type === "investment" && investmentDirection(entry) < 0;
  const prefix = entry.type === "income" || isInvestmentRedeem ? "+" : "-";
  const accountMetaForEntry = entry.type === "income" ? null : accountMeta[entry.accountId];
  const account = entry.type === "income" ? "收入" : accountMetaForEntry?.title || "账户";
  const category = entry.type === "investment"
    ? investmentKinds[entry.investmentKind] || "投资"
    : entry.category;
  const title = entry.note || category || account;
  const amortization = entry.type === "expense" && amortizationMonths(entry) > 1
    ? "摊销 " + entry.amortizationIndex + "/" + entry.amortizationMonths
    : "";
  const subtitle = [
    account,
    entry.note ? category : "",
    amortization
  ].filter(Boolean).join(" · ");
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
  const accountActivity = (id) => accountMeta[id].type === "investment" ? Math.max(assetTransferTotal(state), 0) : spentByAccount(state, id);
  const max = Math.max(...accountOrder.map((id) => accountActivity(id)), 1);
  document.querySelector("#chartBars").innerHTML = accountOrder.map((id) => {
    const spent = accountActivity(id);
    const meta = accountMeta[id];
    return `
      <div class="bar-row" style="--accent:${meta.color}">
        <strong>${meta.title}</strong>
        <div class="bar-track"><div style="--bar:${Math.round((spent / max) * 100)}%"></div></div>
        <span>${yuan.format(spent)}</span>
      </div>
    `;
  }).join("");
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
  accountManager.innerHTML = renderAccountManagerTabs(activeId) + renderManagedAccount(state, activeId);
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
  const spent = meta.type === "investment" ? Math.max(assetTransferTotal(state), 0) : spentByAccount(state, id);
  const spentLabel = meta.type === "investment" ? "已投入" : "已用";
  const mode = state.managerViewMode === "spent" ? "spent" : "budget";
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
        ${details.sections.map((section, sectionIndex) => renderBreakdownSection(state, id, section, sectionIndex, mode)).join("")}
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
    <section class="account-submodule budget-breakdown" data-breakdown-section="${accountId}" data-breakdown-index="${sectionIndex}">
      <button class="breakdown-toggle" data-breakdown-toggle type="button" aria-expanded="false">
        <span>
          <strong>${escapeHtml(section.title)}</strong>
          <em>${isBudgetMode ? items.length + " 个条目" : transactions.length + " 笔明细"}</em>
        </span>
        <span class="breakdown-metrics">
          <span><b class="${!isBudgetMode ? spentClass : ""}">${yuan.format(isBudgetMode ? budget : spent)}</b></span>
        </span>
        <i aria-hidden="true">⌄</i>
      </button>
      <div class="breakdown-panel">
        ${isBudgetMode ? renderBudgetBreakdownItems(accountId, sectionIndex, items) : renderSpentBreakdownItems(transactions, accountId, section.title)}
      </div>
    </section>
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

function renderSpentBreakdownItems(transactions, accountId, sectionTitle) {
  if (!transactions.length) return '<p class="empty-copy">本月还没有明细。</p>';
  const amounts = transactions.map(t => transactionDisplayAmount(t)).sort((a, b) => a - b);
  const total = amounts.reduce((sum, a) => sum + a, 0);
  const average = total / amounts.length;
  const mid = Math.floor(amounts.length / 2);
  const median = amounts.length % 2 === 0 ? (amounts[mid - 1] + amounts[mid]) / 2 : amounts[mid];
  const max = amounts[amounts.length - 1];
  const recent = transactions.slice(0, 3);
  const showLink = transactions.length > 3;
  return `
    <div class="spent-breakdown-summary">
      <span><em>均值</em><b>${yuan.format(average)}</b></span>
      <span><em>中位</em><b>${yuan.format(median)}</b></span>
      <span><em>最大</em><b>${yuan.format(max)}</b></span>
    </div>
    <div class="spent-breakdown-preview">
      <strong>最近 ${recent.length} 笔</strong>
      <div class="spent-compact-items">
        ${recent.map(entry => `
          <div class="spent-compact-item">
            <span>${escapeHtml(entry.date)}</span>
            <b>${yuan.format(transactionDisplayAmount(entry))}</b>
          </div>
        `).join("")}
      </div>
    </div>
    ${showLink ? `<button class="spent-ledger-link" data-ledger-section-account="${escapeHtml(accountId)}" data-ledger-section-category="${escapeHtml(sectionTitle)}" type="button">查看全部 ${transactions.length} 笔流水</button>` : ""}
  `;
}

function sectionTransactions(state, accountId, sectionTitle) {
  return monthTransactions(state)
    .filter((entry) => {
      if (accountMeta[accountId]?.type === "investment") {
        return entry.type === "investment" && entry.category === sectionTitle && investmentDirection(entry) > 0;
      }
      return entry.type === "expense" && entry.accountId === accountId && entry.category === sectionTitle;
    })
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function renderQuickForm(state) {
  document.querySelectorAll("[data-type-button]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.typeButton === state.quickType);
  });
  const accountInput = document.querySelector("#accountInput");
  const accountField = document.querySelector("#accountField");
  const amortizationField = document.querySelector("#amortizationField");
  const investmentTypeField = document.querySelector("#investmentTypeField");
  const categoryLabel = document.querySelector("#categoryLabel");
  const isIncome = state.quickType === "income";
  const isInvestment = state.quickType === "investment";
  const selectedAccount = accountInput.value;
  accountField.hidden = isIncome;
  amortizationField.hidden = isIncome || isInvestment;
  investmentTypeField.hidden = !isInvestment;
  document.querySelector("#investmentTypeRow").innerHTML = Object.entries(investmentKinds).map(([key, label]) => `
    <button class="${state.investmentKind === key ? "is-active" : ""}" data-investment-kind="${key}" type="button">${label}</button>
  `).join("");

  if (isInvestment) {
    accountInput.innerHTML = investmentAccountOrder.map((id) => `<option value="${id}">${accountMeta[id].title}</option>`).join("");
    accountInput.value = investmentAccountOrder.includes(selectedAccount) ? selectedAccount : "assets";
    categoryLabel.textContent = "资产分类";
  } else {
    accountInput.innerHTML = spendingAccountOrder.map((id) => `<option value="${id}">${accountMeta[id].title}</option>`).join("");
    accountInput.value = spendingAccountOrder.includes(selectedAccount) ? selectedAccount : "survival";
    categoryLabel.textContent = isIncome ? "收入分类" : "分类";
  }

  const categorySet = isIncome
    ? categories.income
    : isInvestment
      ? categories.assets
      : categories[accountInput.value || "survival"];
  document.querySelector("#categoryInput").innerHTML = categorySet.map((name) => `<option value="${name}">${name}</option>`).join("");
  document.querySelector("#dateInput").value ||= today;
  document.querySelector("#incomeAllocationNote").textContent = isIncome
    ? "收入只计入本月收入统计，不会自动增加总预算。"
    : isInvestment
      ? "投资记录计入资产账户，不计入消费支出。"
      : "";
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
  const pnl = investmentPnl(state);
  const income = totalIncome(state);
  const expense = dailyExpenseTotal(state);
  const transfer = assetTransferTotal(state);
  const transferIn = assetTransferInTotal(state);
  const transferOut = assetTransferOutTotal(state);
  const change = transferIn - transferOut + pnl;
  document.querySelector("#cashBalanceTotal").textContent = yuan.format(cash);
  document.querySelector("#investmentPnlTotal").textContent = formatSignedCurrency(pnl);
  document.querySelector("#assetChangeTotal").textContent = formatSignedCurrency(change);
  document.querySelector("#overviewIncome").textContent = yuan.format(income);
  document.querySelector("#overviewExpense").textContent = yuan.format(expense);
  document.querySelector("#overviewAssetTransfer").textContent = yuan.format(transfer);
  document.querySelector("#overviewAssetChangeTransfer").textContent = formatSignedCurrency(transferIn);
  document.querySelector("#overviewAssetTransferOut").textContent = formatSignedCurrency(-transferOut);
  document.querySelector("#cashBalanceTotal").classList.toggle("is-negative", cash < 0);
  document.querySelector("#investmentPnlTotal").classList.toggle("is-negative", pnl < 0);
  document.querySelector("#assetChangeTotal").classList.toggle("is-negative", change < 0);
  document.querySelector("#overviewAssetTransfer").classList.toggle("is-negative", transfer < 0);
  document.querySelector("#overviewAssetChangeTransfer").classList.toggle("is-negative", transferIn < 0);
  document.querySelector("#overviewAssetTransferOut").classList.toggle("is-negative", transferOut > 0);
  document.querySelectorAll("[data-info-toggle]").forEach((button) => {
    const isOpen = visibleResultInfo.has(button.dataset.infoToggle);
    button.classList.toggle("is-active", isOpen);
    button.setAttribute("aria-expanded", String(isOpen));
  });
  const rows = [
    ["cash", "现金结余 = 收入 - 日常支出 - 转入资产"],
    ["assetChange", "总资产变化 = 现金结余 + 投资浮盈亏"]
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
  const sections = details.sections.map((section, sectionIndex) => {
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
  const totalSpent = meta.type === "investment" ? Math.max(assetTransferTotal(state), 0) : spentByAccount(state, id);
  const left = accountBudget - totalSpent;
  const statusClass = left < 0 ? "is-over" : "is-gap";
  const statusLabel = left < 0 ? "超出预算" : meta.type === "investment" ? "还可投入" : "剩余额度";
  const sections = details.sections.map((section) => ({
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
      const invested = assetTransferTotal(state);
      const pnl = investmentPnl(state);
      const returnRate = invested > 0 ? pnl / invested : 0;
      const investPercent = budget > 0 ? Math.round((invested / budget) * 100) : 0;
      const investProgress = Math.min(investPercent, 100);
      const pnlClass = pnl < 0 ? "is-negative" : "is-positive";
      return [
        '<article class="account-row asset-account-row" style="--accent:' + meta.color + '; --soft:' + meta.soft + '; --progress:' + (investProgress * 3.6) + 'deg">',
        '<span class="account-icon">' + meta.icon + "</span>",
      '<div class="account-main">',
      "<h3>" + meta.title + "</h3>",
      "<p>" + meta.description + "</p>",
      '<div class="account-metrics asset-metrics">',
      '<button class="metric-link" data-account-view="' + id + '" data-view-mode="budget" data-nav="account-view" data-parent-nav="budget" type="button">预算 <b>' + yuan.format(budget) + "</b></button>",
      '<button class="metric-link" data-account-view="' + id + '" data-view-mode="spent" data-nav="account-view" data-parent-nav="budget" type="button">已投入 <b>' + yuan.format(invested) + "</b></button>",
      '<span>收益率 <b class="' + pnlClass + '">' + formatSignedPercent(returnRate) + "</b></span>",
      '<span>本月浮盈亏 <b class="' + pnlClass + '">' + formatSignedCurrency(pnl) + "</b></span>",
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


