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
} from "./state.js?v=budget-fix3";
import {
  amortizationMonths,
  assetTransferInTotal,
  assetTransferOutTotal,
  assetTransferTotal,
  budgetRemaining,
  cashBalance,
  dailyExpenseTotal,
  investmentDirection,
  investmentPnl,
  monthTransactions,
  spentByAccount,
  totalIncome,
  totalBudget
} from "./calculations.js?v=budget-fix3";

export function renderApp(state, visibleResultInfo) {
  renderBudgetPage(state, visibleResultInfo);
  renderLedgerPage(state);
  renderAssetsPage(state);
  renderBudgetSettingsPage(state);
  renderQuickForm(state);
}

export function renderBudgetPage(state, visibleResultInfo) {
  renderMonth(state);
  renderSummary(state);
  renderMonthlyResult(state, visibleResultInfo);
  renderAccounts(state);
}

export function renderLedgerPage(state) {
  const rows = [...monthTransactions(state)].sort((a, b) => b.createdAt - a.createdAt).map((entry) => {
    const isInvestmentRedeem = entry.type === "investment" && investmentDirection(entry) < 0;
    const prefix = entry.type === "income" || isInvestmentRedeem ? "+" : "-";
    const account = entry.type === "income" ? "收入" : accountMeta[entry.accountId]?.title;
    const amount = Number(entry.monthAmount ?? entry.amount ?? 0);
    const isAmortized = entry.type === "expense" && amortizationMonths(entry) > 1;
    const noteParts = [
      entry.date,
      isAmortized ? `摊销 ${entry.amortizationIndex}/${entry.amortizationMonths} · 原金额 ${yuan.format(entry.amount)}` : "",
      entry.note ? escapeHtml(entry.note) : ""
    ].filter(Boolean);
    const category = entry.type === "investment"
      ? `${investmentKinds[entry.investmentKind] || "投资"} · ${entry.category}`
      : entry.category;
    return `
      <div class="transaction-row">
        <div>
          <strong>${escapeHtml(category)} · ${account}</strong>
          <span>${noteParts.join(" · ")}</span>
        </div>
        <b>${prefix}${yuan.format(amount)}</b>
      </div>
    `;
  }).join("");
  document.querySelector("#transactionList").innerHTML = rows || `<p class="empty-copy">这个月还没有流水。</p>`;
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
  accountManager.innerHTML = accountOrder.map((id) => {
    const meta = accountMeta[id];
    const details = accountDetails[id];
    const budget = Number(state.budgets[id] || 0);
    const spent = meta.type === "investment" ? Math.max(assetTransferTotal(state), 0) : spentByAccount(state, id);
    const remaining = budget - spent;
    const categoryList = [];
    const remainingClass = remaining < 0 ? "is-negative" : "";
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
          <span>预算 <b>${yuan.format(budget)}</b></span>
          <span>${meta.type === "investment" ? "已投入" : "已用"} <b>${yuan.format(spent)}</b></span>
          <span>${meta.type === "investment" ? "待投入" : "剩余"} <b class="${remainingClass}">${yuan.format(remaining)}</b></span>
        </div>
        <div class="account-tests" aria-label="${meta.title}判断条件">
          ${details.tests.map((test) => `<span>${escapeHtml(test)}</span>`).join("")}
        </div>
        <div class="account-submodules">
          ${details.sections.map((section) => `
            <section class="account-submodule">
              <h3>${escapeHtml(section.title)}</h3>
              <p>${escapeHtml(section.body)}</p>
            </section>
          `).join("")}
        </div>
        <div class="category-tags" aria-label="${meta.title}记账分类">
          ${categoryList.map((name) => `<span>${escapeHtml(name)}</span>`).join("")}
        </div>
        <div class="breakdown-list">
          ${details.sections.map((section, sectionIndex) => renderBreakdownSection(state, id, section, sectionIndex)).join("")}
        </div>
      </article>
    `;
  }).join("");
}

function renderBreakdownSection(state, accountId, section, sectionIndex) {
  const items = state.accountBreakdowns?.[accountId]?.[sectionIndex] ?? [];
  const total = items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  return `
    <section class="account-submodule budget-breakdown" data-breakdown-section="${accountId}" data-breakdown-index="${sectionIndex}">
      <button class="breakdown-toggle" data-breakdown-toggle type="button" aria-expanded="false">
        <span>
          <strong>${escapeHtml(section.title)}</strong>
          <em>${items.length} 个条目</em>
        </span>
        <b>${yuan.format(total)}</b>
        <i aria-hidden="true">⌄</i>
      </button>
      <div class="breakdown-panel">
        <div class="breakdown-items">
          ${items.map((item) => `
            <div class="breakdown-item" data-breakdown-item="${item.id}">
              <input data-breakdown-name="${accountId}" data-section-index="${sectionIndex}" data-item-id="${item.id}" type="text" value="${escapeHtml(item.name)}" aria-label="条目名称">
              <label>
                <span>¥</span>
                <input data-breakdown-amount="${accountId}" data-section-index="${sectionIndex}" data-item-id="${item.id}" type="number" min="0" step="1" value="${Number(item.amount || 0)}" aria-label="条目金额">
              </label>
              <button class="icon-button breakdown-delete" data-breakdown-delete="${accountId}" data-section-index="${sectionIndex}" data-item-id="${item.id}" type="button" aria-label="删除条目">×</button>
            </div>
          `).join("")}
        </div>
        <form class="breakdown-add-form" data-breakdown-form="${accountId}" data-section-index="${sectionIndex}">
          <input name="name" type="text" placeholder="新建条目" aria-label="新建条目名称">
          <input name="amount" type="number" min="0" step="1" placeholder="金额" aria-label="新建条目金额">
          <button class="secondary-button" type="submit">添加</button>
        </form>
      </div>
    </section>
  `;
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
      const pending = budget - invested;
      const marketValue = Number(state.assetSnapshot?.marketValue || 0);
      const pnl = investmentPnl(state);
      const pnlDegrees = Math.min(360, Math.max(12, Math.round((Math.abs(pnl) / Math.max(budget, 1)) * 360)));
      const pendingClass = pending < 0 ? "is-negative" : "";
      const pnlClass = pnl < 0 ? "is-negative" : "is-positive";
      return [
        '<article class="account-row asset-account-row" style="--accent:' + meta.color + '; --soft:' + meta.soft + '; --pnl:' + pnlDegrees + 'deg">',
        '<span class="account-icon">' + meta.icon + "</span>",
        '<div class="account-main">',
        "<h3>" + meta.title + "</h3>",
        "<p>" + meta.description + "</p>",
        '<div class="account-metrics asset-metrics">',
        "<span>本月计划投入 <b>" + yuan.format(budget) + "</b></span>",
        "<span>本月已投入 <b>" + yuan.format(invested) + "</b></span>",
        '<span>待投入 <b class="' + pendingClass + '">' + yuan.format(pending) + "</b></span>",
        "<span>当前市值 <b>" + yuan.format(marketValue) + "</b></span>",
        '<span>本月浮盈亏 <b class="' + pnlClass + '">' + formatSignedCurrency(pnl) + "</b></span>",
        "</div>",
        "</div>",
        '<div class="pnl-visual ' + pnlClass + '" aria-label="' + meta.title + '本月浮盈亏' + formatSignedCurrency(pnl) + '">',
        "<span>浮盈亏</span>",
        "<b>" + formatSignedCurrency(pnl) + "</b>",
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
      "<span>预算 <b>" + yuan.format(budget) + "</b></span>",
      "<span>已用 <b>" + yuan.format(spent) + "</b></span>",
      "<span>剩余 <b>" + yuan.format(left) + "</b></span>",
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


