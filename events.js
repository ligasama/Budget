import { accountOrder, allocateIncome, customRatios, defaultMonth, defaultState, stylePresets, today, tx } from "./state.js?v=budget-analysis1";
import { renderMonthlyResult, renderQuickForm } from "./render.js?v=budget-analysis1";

export function bindEvents({ stateRef, setState, render, visibleResultInfo }) {
  document.addEventListener("click", (event) => {
    const target = event.target;
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
    if (target.id === "monthInput") {
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

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeSheet();
      closeCustomRatioDialog();
    }
  });
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
