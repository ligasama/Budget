import {
  accountMeta,
  accountOrder,
  allocateIncome,
  categories,
  customRatios,
  defaultLedgerAdvancedFilters,
  defaultMonth,
  defaultState,
  investmentAccountOrder,
  investmentKinds,
  spendingAccountOrder,
  stylePresets,
  today,
  tx,
  yuan
} from "./state.js?v=ledger-detail1";
import { renderMonthlyResult, renderQuickForm } from "./render.js?v=ledger-detail1";
import {
  applyLedgerAdvancedFilters,
  monthTransactions
} from "./calculations.js?v=ledger-detail1";

export function bindEvents({ stateRef, setState, render, visibleResultInfo }) {
  let swipeState = null;
  let ignoreNextLedgerClick = false;

  document.addEventListener("click", (event) => {
    const target = event.target;
    const ledgerDeleteButton = target.closest?.("[data-ledger-delete]");
    if (ledgerDeleteButton) {
      deleteTransaction(stateRef.current, ledgerDeleteButton.dataset.ledgerDelete);
      closeTransactionDialog();
      render();
      return;
    }
    const ledgerOpenButton = target.closest?.("[data-ledger-open]");
    if (ledgerOpenButton) {
      const swipeRow = ledgerOpenButton.closest("[data-swipe-row]");
      if (ignoreNextLedgerClick || swipeRow?.dataset.skipOpen === "true") {
        event.preventDefault();
        return;
      }
      closeOpenSwipeRows();
      openTransactionDialog(stateRef.current, ledgerOpenButton.dataset.ledgerOpen);
      return;
    }
    if (target.closest?.("[data-close-transaction]")) {
      closeTransactionDialog();
      return;
    }
    if (target.closest?.("[data-open-ledger-filter]")) {
      openLedgerFilterSheet();
      updateLedgerFilterPreview(stateRef.current);
      return;
    }
    if (target.closest?.("[data-close-ledger-filter]")) {
      closeLedgerFilterSheet();
      return;
    }
    const ledgerAccountFilter = target.closest?.("[data-ledger-account-filter]");
    if (ledgerAccountFilter) {
      ledgerAccountFilter.classList.toggle("is-active");
      updateLedgerFilterPreview(stateRef.current);
      return;
    }
    const ledgerAmountFilter = target.closest?.("[data-ledger-amount-filter]");
    if (ledgerAmountFilter) {
      document.querySelectorAll("[data-ledger-amount-filter]").forEach((button) => button.classList.toggle("is-active", button === ledgerAmountFilter));
      updateLedgerFilterPreview(stateRef.current);
      return;
    }
    const ledgerSortFilter = target.closest?.("[data-ledger-sort-filter]");
    if (ledgerSortFilter) {
      document.querySelectorAll("[data-ledger-sort-filter]").forEach((button) => button.classList.toggle("is-active", button === ledgerSortFilter));
      updateLedgerFilterPreview(stateRef.current);
      return;
    }
    if (target.closest?.("[data-reset-ledger-filter]")) {
      stateRef.current.ledgerAdvancedFilters = defaultLedgerFilters();
      render();
      openLedgerFilterSheet();
      updateLedgerFilterPreview(stateRef.current);
      return;
    }
    const transactionSaveButton = target.closest?.("[data-save-transaction]");
    if (transactionSaveButton) {
      event.preventDefault();
      saveTransactionDialog(stateRef.current, render);
      return;
    }
    const accountViewButton = target.closest?.("[data-account-view]");
    if (accountViewButton) {
      stateRef.current.viewAccountId = accountViewButton.dataset.accountView;
      stateRef.current.viewMode = accountViewButton.dataset.viewMode;
      render();
    }
    const editAccountBudgetButton = target.closest?.("[data-edit-account-budget]");
    if (editAccountBudgetButton) {
      stateRef.current.managerAccountId = editAccountBudgetButton.dataset.editAccountBudget;
      stateRef.current.managerViewMode = "budget";
      render();
    }
    const managerAccountButton = target.closest?.("[data-manager-account]");
    if (managerAccountButton) {
      stateRef.current.managerAccountId = managerAccountButton.dataset.managerAccount;
      stateRef.current.managerViewMode = "budget";
      render();
      return;
    }
    const managerModeButton = target.closest?.("[data-manager-mode]");
    if (managerModeButton) {
      stateRef.current.managerViewMode = managerModeButton.dataset.managerMode === "spent" ? "spent" : "budget";
      render();
      return;
    }
    const nav = target.closest?.("[data-nav]");
    if (nav) {
      const screenName = nav.dataset.nav;
      if (screenName === "me") {
        stateRef.current.managerAccountId = "survival";
        stateRef.current.managerViewMode = "budget";
        render();
      }
      const activeNav = nav.dataset.parentNav || (screenName === "budget-settings" ? "budget" : screenName);
      document.querySelectorAll(".bottom-nav [data-nav]").forEach((button) => button.classList.toggle("is-active", button.dataset.nav === activeNav));
      document.querySelectorAll("[data-screen]").forEach((screen) => screen.classList.toggle("is-active", screen.dataset.screen === screenName));
      if (nav.dataset.focusTarget) {
        window.setTimeout(() => {
          const focusTarget = document.querySelector(nav.dataset.focusTarget);
          focusTarget?.focus();
          focusTarget?.select?.();
        }, 0);
      }
      return;
    }
    const infoButton = target.closest?.("[data-info-toggle]");
    if (infoButton) {
      const key = infoButton.dataset.infoToggle;
      if (visibleResultInfo.has(key)) {
        visibleResultInfo.delete(key);
      } else {
        visibleResultInfo.add(key);
      }
      renderMonthlyResult(stateRef.current, visibleResultInfo);
      return;
    }
    const scrollTarget = target.closest?.("[data-scroll-target]");
    if (scrollTarget) {
      const targetSection = document.querySelector(scrollTarget.dataset.scrollTarget);
      if (targetSection) {
        targetSection.scrollIntoView({ behavior: "smooth", block: "start" });
        targetSection.classList.add("is-attention");
        window.setTimeout(() => targetSection.classList.remove("is-attention"), 900);
      }
      return;
    }
    if (target.closest?.("#quickAddButton")) openSheet();
    if (target.closest?.("[data-close-sheet]")) closeSheet();
    if (target.closest?.("[data-close-custom-ratio]")) closeCustomRatioDialog();
    if (target.dataset?.budget) {
      window.setTimeout(() => target.select(), 0);
    }
    const breakdownToggle = target.closest?.("[data-breakdown-toggle]");
    if (breakdownToggle) {
      const section = breakdownToggle.closest(".budget-breakdown");
      const isOpen = section?.classList.toggle("is-open");
      breakdownToggle.setAttribute("aria-expanded", String(Boolean(isOpen)));
      return;
    }
    const breakdownDelete = target.closest?.("[data-breakdown-delete]");
    if (breakdownDelete) {
      removeBreakdownItem(stateRef.current, breakdownDelete.dataset.breakdownDelete, Number(breakdownDelete.dataset.sectionIndex), breakdownDelete.dataset.itemId);
      render();
      return;
    }
    const typeButton = target.closest?.("[data-type-button]");
    if (typeButton) {
      stateRef.current.quickType = typeButton.dataset.typeButton;
      renderQuickForm(stateRef.current);
    }
    const ledgerFilterButton = target.closest?.("[data-ledger-filter]");
    if (ledgerFilterButton) {
      stateRef.current.ledgerFilter = ledgerFilterButton.dataset.ledgerFilter;
      render();
      return;
    }
    const investmentKindButton = target.closest?.("[data-investment-kind]");
    if (investmentKindButton) {
      stateRef.current.investmentKind = investmentKindButton.dataset.investmentKind;
      renderQuickForm(stateRef.current);
    }
    const styleButton = target.closest?.("[data-style]");
    if (styleButton) {
      if (styleButton.dataset.style === "custom") {
        openCustomRatioDialog();
        return;
      }
      applyBudgetStyle(stateRef.current, styleButton.dataset.style);
      render();
    }
  });

  document.addEventListener("pointerdown", (event) => {
    const row = event.target.closest?.("[data-swipe-row]");
    if (!row || event.target.closest?.(".ledger-delete-action, input, select, textarea")) return;
    closeOpenSwipeRows(row);
    swipeState = {
      row,
      content: row.querySelector(".ledger-transaction-row"),
      startX: event.clientX,
      startY: event.clientY,
      lastX: 0,
      moved: false
    };
  });

  document.addEventListener("pointermove", (event) => {
    if (!swipeState?.content) return;
    const dx = event.clientX - swipeState.startX;
    const dy = event.clientY - swipeState.startY;
    if (Math.abs(dy) > Math.abs(dx) && !swipeState.moved) return;
    const nextX = Math.max(-88, Math.min(0, dx));
    if (Math.abs(nextX) > 6) swipeState.moved = true;
    swipeState.lastX = nextX;
    swipeState.content.style.transform = `translateX(${nextX}px)`;
    event.preventDefault();
  });

  document.addEventListener("pointerup", () => {
    if (!swipeState?.content) return;
    const shouldOpen = swipeState.lastX < -42;
    swipeState.content.style.transform = "";
    swipeState.row.classList.toggle("is-delete-open", shouldOpen);
    if (swipeState.moved) {
      ignoreNextLedgerClick = true;
      swipeState.row.dataset.skipOpen = "true";
      const swipedRow = swipeState.row;
      window.setTimeout(() => {
        ignoreNextLedgerClick = false;
        delete swipedRow.dataset.skipOpen;
      }, 700);
    }
    swipeState = null;
  });

  document.addEventListener("input", (event) => {
    const target = event.target;
    let shouldRender = false;
    if (target.dataset?.budget) {
      const budgetId = target.dataset.budget;
      const rawValue = target.value;
      stateRef.current.budgets[target.dataset.budget] = parseBudgetInput(target.value);
      applyManualBudgets(stateRef.current);
      render();
      restoreBudgetInput(budgetId, rawValue);
      return;
    }
    if (target.id === "ledgerKeywordInput") {
      updateLedgerFilterPreview(stateRef.current);
      return;
    }
    if (target.id === "plannedIncomeInput") {
      stateRef.current.plannedIncome = Number(target.value || 0);
      shouldRender = true;
    }
    if (target.id === "totalBudgetInput") {
      stateRef.current.totalBudget = parseBudgetInput(target.value);
      applyCurrentRatios(stateRef.current);
      shouldRender = true;
    }
    if (target.dataset?.breakdownName) {
      updateBreakdownItem(stateRef.current, target.dataset.breakdownName, Number(target.dataset.sectionIndex), target.dataset.itemId, {
        name: target.value
      });
    }
    if (target.dataset?.breakdownAmount) {
      updateBreakdownItem(stateRef.current, target.dataset.breakdownAmount, Number(target.dataset.sectionIndex), target.dataset.itemId, {
        amount: parseBudgetInput(target.value)
      });
    }
    if (shouldRender) render();
  });

  document.addEventListener("change", (event) => {
    const target = event.target;
    if (target.id === "monthInput" || target.id === "ledgerMonthInput") {
      stateRef.current.currentMonth = target.value || defaultMonth;
      render();
    }
    if (target.dataset?.budget) {
      stateRef.current.budgets[target.dataset.budget] = parseBudgetInput(target.value);
      applyManualBudgets(stateRef.current);
      render();
    }
    if (target.dataset?.breakdownName || target.dataset?.breakdownAmount) {
      render();
    }
    if (target.id === "accountInput") renderQuickForm(stateRef.current);
    if (target.id === "transactionAccountInput") updateTransactionCategoryOptions();
  });

  document.addEventListener("focusout", (event) => {
    const target = event.target;
    if (target.dataset?.budget) {
      render();
    }
  });

  document.querySelector("#entryForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const amount = Number(document.querySelector("#amountInput").value || 0);
    if (amount <= 0) return;
    const type = stateRef.current.quickType;
    const amortizationMonthsValue = Math.max(1, Math.floor(Number(document.querySelector("#amortizationInput").value || 1)));
    const accountId = type === "income"
      ? "income"
      : type === "investment"
        ? "assets"
        : document.querySelector("#accountInput").value;
    stateRef.current.transactions.push(tx(
      type,
      accountId,
      document.querySelector("#categoryInput").value,
      amount,
      document.querySelector("#noteInput").value.trim(),
      document.querySelector("#dateInput").value || today,
      type === "investment"
        ? { investmentKind: stateRef.current.investmentKind }
        : type === "expense"
          ? { amortizationMonths: amortizationMonthsValue }
          : {}
    ));
    document.querySelector("#amountInput").value = "";
    document.querySelector("#noteInput").value = "";
    document.querySelector("#amortizationInput").value = "1";
    closeSheet();
    document.querySelector('[data-nav="budget"]').click();
    render();
  });

  document.querySelector("#customRatioForm").addEventListener("submit", (event) => {
    event.preventDefault();
    stateRef.current.budgetStyle = "custom";
    stateRef.current.manualBudgetStyle = true;
    stateRef.current.ratios = accountOrder.reduce((result, id) => {
      const input = document.querySelector(`[data-custom-ratio="${id}"]`);
      result[id] = Number(input?.value || 0);
      return result;
    }, {});
    stateRef.current.customRatios = { ...stateRef.current.ratios };
    applyCurrentRatios(stateRef.current);
    closeCustomRatioDialog();
    render();
  });

  document.addEventListener("submit", (event) => {
    const form = event.target.closest?.("#ledgerFilterPanel");
    if (!form) return;
    event.preventDefault();
    stateRef.current.ledgerAdvancedFilters = readLedgerFilterDraft();
    closeLedgerFilterSheet();
    render();
  });

  document.addEventListener("submit", (event) => {
    const form = event.target.closest?.("[data-breakdown-form]");
    if (!form) return;
    event.preventDefault();
    const nameInput = form.querySelector('[name="name"]');
    const amountInput = form.querySelector('[name="amount"]');
    const name = nameInput.value.trim();
    const amount = parseBudgetInput(amountInput.value);
    if (!name) return;
    addBreakdownItem(stateRef.current, form.dataset.breakdownForm, Number(form.dataset.sectionIndex), name, amount);
    render();
  });

  document.querySelector("#transactionForm").addEventListener("submit", (event) => {
    event.preventDefault();
    saveTransactionDialog(stateRef.current, render);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeSheet();
      closeLedgerFilterSheet();
      closeCustomRatioDialog();
      closeTransactionDialog();
    }
  });
}

function openTransactionDialog(state, id) {
  const entry = findTransaction(state, id);
  if (!entry) return;
  const dialog = document.querySelector("#transactionDialog");
  dialog.dataset.transactionType = entry.type;
  const account = entry.type === "income" ? null : accountMeta[entry.accountId];
  const amount = Math.abs(Number(entry.amount || 0));
  const prefix = entry.type === "income" || entry.investmentKind === "redeem" ? "+" : "-";
  document.querySelector("#transactionIdInput").value = entry.id;
  document.querySelector("#transactionAmountInput").value = amount || "";
  document.querySelector("#transactionNoteInput").value = entry.note || "";
  document.querySelector("#transactionDateInput").value = entry.date || today;
  document.querySelector("#transactionAmortizationInput").value = Math.max(1, Math.floor(Number(entry.amortizationMonths || 1)));
  document.querySelector("#transactionDetailIcon").textContent = entry.type === "income" ? "入" : account?.icon || "·";
  document.querySelector("#transactionDetailTitle").textContent = entry.note || entry.category || transactionTypeLabel(entry.type);
  document.querySelector("#transactionDetailMeta").textContent = transactionMetaLabel(entry);
  document.querySelector("#transactionDetailAmount").textContent = prefix + yuan.format(amount);
  document.querySelector(".transaction-detail-card").style.setProperty("--detail-color", account?.color || "#4e8f52");
  document.querySelector(".transaction-detail-card").style.setProperty("--detail-soft", account?.soft || "#edf4e8");

  renderTransactionAccountOptions(entry);
  renderTransactionInvestmentOptions(entry);
  updateTransactionCategoryOptions(entry.category);
  document.querySelector("#transactionAccountField").hidden = entry.type === "income";
  document.querySelector("#transactionInvestmentKindField").hidden = entry.type !== "investment";
  document.querySelector("#transactionAmortizationField").hidden = entry.type !== "expense";
  dialog.classList.add("is-open");
  dialog.setAttribute("aria-hidden", "false");
  window.setTimeout(() => document.querySelector("#transactionAmountInput")?.focus(), 0);
}

function closeTransactionDialog() {
  const dialog = document.querySelector("#transactionDialog");
  dialog?.classList.remove("is-open");
  dialog?.setAttribute("aria-hidden", "true");
}

function saveTransactionDialog(state, render) {
  const id = document.querySelector("#transactionIdInput").value;
  const entry = findTransaction(state, id);
  if (!entry) return;
  const amount = Number(document.querySelector("#transactionAmountInput").value || 0);
  if (amount <= 0) return;
  entry.amount = amount;
  entry.note = document.querySelector("#transactionNoteInput").value.trim();
  entry.date = document.querySelector("#transactionDateInput").value || today;
  entry.category = document.querySelector("#transactionCategoryInput").value;
  if (entry.type === "income") {
    entry.accountId = "income";
  } else {
    entry.accountId = document.querySelector("#transactionAccountInput").value;
  }
  if (entry.type === "investment") {
    entry.investmentKind = document.querySelector("#transactionInvestmentKindInput").value;
  }
  if (entry.type === "expense") {
    entry.amortizationMonths = Math.max(1, Math.floor(Number(document.querySelector("#transactionAmortizationInput").value || 1)));
  }
  closeTransactionDialog();
  render();
}

function renderTransactionAccountOptions(entry) {
  const accountInput = document.querySelector("#transactionAccountInput");
  const accountIds = entry.type === "investment" ? investmentAccountOrder : spendingAccountOrder;
  accountInput.innerHTML = accountIds.map((id) => `<option value="${id}">${accountMeta[id].title}</option>`).join("");
  if (accountIds.includes(entry.accountId)) accountInput.value = entry.accountId;
}

function renderTransactionInvestmentOptions(entry) {
  const input = document.querySelector("#transactionInvestmentKindInput");
  input.innerHTML = Object.entries(investmentKinds)
    .map(([key, label]) => `<option value="${key}">${label}</option>`)
    .join("");
  input.value = entry.investmentKind || "buyFund";
}

function updateTransactionCategoryOptions(selectedCategory = "") {
  const id = document.querySelector("#transactionIdInput")?.value;
  const type = transactionDialogEntryType(id);
  const accountId = document.querySelector("#transactionAccountInput")?.value || "survival";
  const input = document.querySelector("#transactionCategoryInput");
  const currentValue = selectedCategory || input.value;
  const categorySet = type === "income"
    ? categories.income
    : type === "investment"
      ? categories.assets
      : categories[accountId] || [];
  const options = categorySet.includes(currentValue) || !currentValue
    ? categorySet
    : [currentValue, ...categorySet];
  input.innerHTML = options.map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("");
  input.value = options.includes(currentValue) ? currentValue : options[0] || "";
}

function transactionDialogEntryType(id) {
  return document.querySelector("#transactionDialog")?.dataset.transactionType || "expense";
}

function transactionMetaLabel(entry) {
  const account = entry.type === "income" ? "收入" : accountMeta[entry.accountId]?.title || "账户";
  const kind = entry.type === "investment" ? investmentKinds[entry.investmentKind] || "投资" : entry.category || "未分类";
  return [account, kind, entry.date].filter(Boolean).join(" · ");
}

function transactionTypeLabel(type) {
  if (type === "income") return "收入";
  if (type === "investment") return "投资";
  return "支出";
}

function findTransaction(state, id) {
  return state.transactions.find((entry) => entry.id === id);
}

function deleteTransaction(state, id) {
  state.transactions = state.transactions.filter((entry) => entry.id !== id);
}

function closeOpenSwipeRows(exceptRow = null) {
  document.querySelectorAll(".ledger-swipe-row.is-delete-open").forEach((row) => {
    if (row !== exceptRow) row.classList.remove("is-delete-open");
  });
}

function escapeHtml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function openSheet() {
  document.querySelector("#entrySheet").classList.add("is-open");
  document.querySelector("#entrySheet").setAttribute("aria-hidden", "false");
  document.querySelector("#amountInput").focus();
}

function closeSheet() {
  document.querySelector("#entrySheet").classList.remove("is-open");
  document.querySelector("#entrySheet").setAttribute("aria-hidden", "true");
}

function openLedgerFilterSheet() {
  const sheet = document.querySelector("#ledgerFilterSheet");
  sheet?.classList.add("is-open");
  sheet?.setAttribute("aria-hidden", "false");
  window.setTimeout(() => document.querySelector("#ledgerKeywordInput")?.focus(), 0);
}

function closeLedgerFilterSheet() {
  const sheet = document.querySelector("#ledgerFilterSheet");
  sheet?.classList.remove("is-open");
  sheet?.setAttribute("aria-hidden", "true");
}

function defaultLedgerFilters() {
  return structuredClone(defaultLedgerAdvancedFilters);
}

function readLedgerFilterDraft() {
  const activeAmount = document.querySelector("[data-ledger-amount-filter].is-active")?.dataset.ledgerAmountFilter || "all";
  const activeSort = document.querySelector("[data-ledger-sort-filter].is-active")?.dataset.ledgerSortFilter || "newest";
  const accounts = [...document.querySelectorAll("[data-ledger-account-filter].is-active")].map((button) => button.dataset.ledgerAccountFilter);
  return {
    keyword: document.querySelector("#ledgerKeywordInput")?.value.trim() || "",
    accounts,
    amountRange: activeAmount,
    sort: activeSort
  };
}

function updateLedgerFilterPreview(state) {
  const applyButton = document.querySelector("#ledgerFilterApplyButton");
  if (!applyButton) return;
  const rows = ledgerBaseRows(state);
  const draft = readLedgerFilterDraft();
  const count = applyLedgerAdvancedFilters(rows, draft).length;
  applyButton.textContent = "查看 " + count + " 笔";
}

function ledgerBaseRows(state) {
  const activeFilter = ["expense", "income", "investment"].includes(state.ledgerFilter) ? state.ledgerFilter : "all";
  const rows = [...monthTransactions(state)].sort((a, b) => {
    const dateDiff = String(b.date || "").localeCompare(String(a.date || ""));
    return dateDiff || Number(b.createdAt || 0) - Number(a.createdAt || 0);
  });
  return activeFilter === "all" ? rows : rows.filter((entry) => entry.type === activeFilter);
}

function openCustomRatioDialog() {
  document.querySelector("#customRatioDialog").classList.add("is-open");
  document.querySelector("#customRatioDialog").setAttribute("aria-hidden", "false");
  window.setTimeout(() => document.querySelector("#customRatioEditor input")?.focus(), 0);
}

function closeCustomRatioDialog() {
  document.querySelector("#customRatioDialog").classList.remove("is-open");
  document.querySelector("#customRatioDialog").setAttribute("aria-hidden", "true");
}

function applyCurrentRatios(state) {
  state.budgets = allocateIncome(Number(state.totalBudget || 0), state.ratios);
}

function applyBudgetStyle(state, style) {
  state.budgetStyle = stylePresets[style] ? style : "stable";
  state.manualBudgetStyle = state.budgetStyle === "custom";
  if (stylePresets[state.budgetStyle].ratios) {
    state.ratios = structuredClone(stylePresets[state.budgetStyle].ratios);
  } else {
    state.ratios = structuredClone(state.customRatios ?? customRatios);
  }
  applyCurrentRatios(state);
}

function applyManualBudgets(state) {
  state.budgetStyle = "custom";
  state.manualBudgetStyle = true;
  state.totalBudget = accountOrder.reduce((sum, id) => sum + Number(state.budgets[id] || 0), 0);
  state.ratios = accountOrder.reduce((result, id) => {
    result[id] = state.totalBudget > 0
      ? (Number(state.budgets[id] || 0) / state.totalBudget) * 100
      : 0;
    return result;
  }, {});
  state.customRatios = { ...state.ratios };
}

function ensureBreakdownSection(state, accountId, sectionIndex) {
  state.accountBreakdowns ??= {};
  state.accountBreakdowns[accountId] ??= [];
  state.accountBreakdowns[accountId][sectionIndex] ??= [];
  return state.accountBreakdowns[accountId][sectionIndex];
}

function updateBreakdownItem(state, accountId, sectionIndex, itemId, patch) {
  const items = ensureBreakdownSection(state, accountId, sectionIndex);
  const item = items.find((entry) => entry.id === itemId);
  if (!item) return;
  Object.assign(item, patch);
}

function addBreakdownItem(state, accountId, sectionIndex, name, amount) {
  const items = ensureBreakdownSection(state, accountId, sectionIndex);
  items.push({
    id: `item_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    name,
    amount
  });
}

function removeBreakdownItem(state, accountId, sectionIndex, itemId) {
  const items = ensureBreakdownSection(state, accountId, sectionIndex);
  const nextItems = items.filter((entry) => entry.id !== itemId);
  state.accountBreakdowns[accountId][sectionIndex] = nextItems;
}

function syncBudgetFromBreakdown(state, accountId) {
  return;
}

export function syncAllBreakdownBudgets(state) {
  accountOrder.forEach((id) => syncBudgetFromBreakdown(state, id));
}

function restoreBudgetInput(budgetId, value) {
  const input = document.querySelector(`[data-budget="${budgetId}"]`);
  if (!input) return;
  input.value = value;
  input.focus();
  const cursor = String(value).length;
  input.setSelectionRange?.(cursor, cursor);
}

function parseBudgetInput(value) {
  const numericValue = String(value).replace(/[^\d.]/g, "");
  return Number(numericValue || 0);
}
