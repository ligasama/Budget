import {
  accountMeta,
  accountOrder,
  allocateIncome,
  categories,
  customRatios,
  defaultAccountSections,
  defaultLedgerAdvancedFilters,
  defaultMonth,
  defaultState,
  holdingTypes,
  investmentAccountOrder,
  investmentKinds,
  livingBudgetFromBudgets,
  spendingAccountOrder,
  stylePresets,
  today,
  tx,
  upsertLivingBudgetSnapshot,
  yuan
} from "./state.js?v=negative-neutral1";
import { renderMonthlyResult, renderQuickForm } from "./render.js?v=negative-neutral1";
import {
  applyLedgerAdvancedFilters,
  monthTransactions,
  monthlyCashFlow,
  setOpeningCashBalance
} from "./calculations.js?v=negative-neutral1";

export function bindEvents({ stateRef, setState, render, visibleResultInfo }) {
  let swipeState = null;
  let ignoreNextLedgerClick = false;
  let datePickerState = null;

  document.addEventListener("click", (event) => {
    const target = event.target;
    const datePicker = document.querySelector("#customDatePicker");
    const pickerCommand = target.closest?.("[data-calendar-command]");
    if (pickerCommand && datePicker?.contains(pickerCommand)) {
      datePickerState = handleDatePickerCommand(datePickerState, pickerCommand.dataset.calendarCommand, render);
      return;
    }
    const pickerValue = target.closest?.("[data-calendar-value]");
    if (pickerValue && datePicker?.contains(pickerValue)) {
      applyDatePickerValue(datePickerState, pickerValue.dataset.calendarValue);
      datePickerState = closeDatePicker();
      return;
    }
    const datePickerInput = target.closest?.("[data-date-picker]");
    if (datePickerInput) {
      event.preventDefault();
      datePickerState = openDatePicker(datePickerInput, datePickerState);
      return;
    }
    if (datePickerState && !datePicker?.contains(target)) {
      datePickerState = closeDatePicker();
    }
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
      refreshLedgerCategoryFilterOptions(stateRef.current);
      updateLedgerFilterPreview(stateRef.current);
      return;
    }
    const ledgerAmountFilter = target.closest?.("[data-ledger-amount-filter]");
    if (ledgerAmountFilter) {
      document.querySelectorAll("[data-ledger-amount-filter]").forEach((button) => button.classList.toggle("is-active", button === ledgerAmountFilter));
      document.querySelector("#ledgerAmountMinInput").value = "";
      document.querySelector("#ledgerAmountMaxInput").value = "";
      updateLedgerFilterPreview(stateRef.current);
      return;
    }
    const ledgerCategoryFilter = target.closest?.("[data-ledger-category-filter]");
    if (ledgerCategoryFilter) {
      document.querySelectorAll("[data-ledger-category-filter]").forEach((button) => button.classList.toggle("is-active", button === ledgerCategoryFilter));
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
    if (target.closest?.("[data-toggle-cash-calibration]")) {
      const row = document.querySelector("#cashCalibrationRow");
      if (row) {
        row.hidden = !row.hidden;
        if (!row.hidden) {
          window.setTimeout(() => {
            document.querySelector("#overviewCurrentCashInput")?.focus();
            document.querySelector("#overviewCurrentCashInput")?.select?.();
          }, 0);
        }
      }
      return;
    }
    if (target.closest?.("[data-save-cash-calibration]")) {
      saveCashCalibration(stateRef.current, render);
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
    const sectionLedgerButton = target.closest?.("[data-ledger-section-account]");
    if (sectionLedgerButton) {
      const accountId = sectionLedgerButton.dataset.ledgerSectionAccount;
      const category = sectionLedgerButton.dataset.ledgerSectionCategory || "";
      stateRef.current.ledgerFilter = accountMeta[accountId]?.type === "investment" ? "investment" : "expense";
      stateRef.current.ledgerAdvancedFilters = {
        ...defaultLedgerFilters(),
        accounts: [accountId],
        category
      };
      render();
      activateScreen("ledger", "ledger");
      return;
    }
    const nav = target.closest?.("[data-nav]");
    if (nav) {
      const screenName = nav.dataset.nav;
      const activeNav = nav.dataset.parentNav || (screenName === "budget-settings" ? "budget" : screenName);
      activateScreen(screenName, activeNav);
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
    if (target.closest?.("#quickAddButton")) {
      if (stateRef.current.quickType === "investment") stateRef.current.quickType = "expense";
      renderQuickForm(stateRef.current);
      openSheet();
      return;
    }
    if (target.closest?.("[data-close-sheet]")) closeSheet();
    if (target.closest?.("[data-close-custom-ratio]")) closeCustomRatioDialog();
    if (target.closest?.("[data-close-holding-sheet]")) { closeHoldingSheet(); return; }
    if (target.closest?.("[data-add-holding]")) { openHoldingSheet(stateRef.current, null); return; }
    if (target.closest?.("[data-record-asset-change]")) {
      stateRef.current.quickType = "investment";
      stateRef.current.investmentKind ||= "transferIn";
      renderQuickForm(stateRef.current);
      openSheet();
      return;
    }
    if (target.closest?.("[data-assets-privacy]")) {
      stateRef.current.assetSnapshot = { ...(stateRef.current.assetSnapshot ?? {}), privacyMode: !(stateRef.current.assetSnapshot?.privacyMode) };
      render();
      return;
    }
    if (target.closest?.("[data-assets-show-all]")) {
      stateRef.current.assetsShowAllHoldings = !stateRef.current.assetsShowAllHoldings;
      render();
      return;
    }
    const safetyPreset = target.closest?.("[data-safety-preset]");
    if (safetyPreset) {
      stateRef.current.assetSnapshot = {
        ...(stateRef.current.assetSnapshot ?? {}),
        safetyMonths: Number(safetyPreset.dataset.safetyPreset || 6)
      };
      render();
      return;
    }
    const editHoldingBtn = target.closest?.("[data-edit-holding]");
    if (editHoldingBtn) { openHoldingSheet(stateRef.current, editHoldingBtn.dataset.editHolding); return; }
    if (target.closest?.("[data-delete-holding]")) {
      const id = document.querySelector("#holdingIdInput")?.value;
      if (id) {
        const snap = stateRef.current.assetSnapshot ?? {};
        stateRef.current.assetSnapshot = { ...snap, holdings: (snap.holdings ?? []).filter(h => h.id !== id) };
        recordAssetSnapshot(stateRef.current);
      }
      closeHoldingSheet();
      render();
      return;
    }
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
    const sectionDelete = target.closest?.("[data-section-delete]");
    if (sectionDelete) {
      removeAccountSection(stateRef.current, sectionDelete.dataset.sectionDelete, Number(sectionDelete.dataset.sectionIndex));
      render();
      return;
    }
    const customSelectTrigger = target.closest?.(".custom-select-trigger");
    if (customSelectTrigger) {
      const selectEl = customSelectTrigger.closest(".custom-select");
      const isOpen = selectEl.classList.contains("is-open");
      document.querySelectorAll(".custom-select.is-open").forEach((s) => closeCustomSelect(s));
      if (!isOpen) openCustomSelect(selectEl);
      return;
    }
    const customSelectOption = target.closest?.(".custom-select-option");
    if (customSelectOption) {
      const selectEl = customSelectOption.closest(".custom-select");
      const hidden = selectEl.querySelector("input[type=hidden]");
      if (handleCustomSelectCommand(customSelectOption.dataset.value, stateRef.current, render)) {
        closeCustomSelect(selectEl);
        return;
      }
      selectEl.querySelector("[data-select-display]").textContent = customSelectOption.textContent;
      selectEl.querySelectorAll(".custom-select-option").forEach((o) => o.classList.toggle("is-selected", o === customSelectOption));
      hidden.value = customSelectOption.dataset.value;
      closeCustomSelect(selectEl);
      hidden.dispatchEvent(new Event("change", { bubbles: true }));
      return;
    }
    document.querySelectorAll(".custom-select.is-open").forEach((s) => closeCustomSelect(s));
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


  document.addEventListener("change", (event) => {
    if (event.target.id === "holdingSelectInput") {
      const isNew = event.target.value === "__new__";
      document.querySelector("#newHoldingInlineFields").hidden = !isNew;
      if (isNew) document.querySelector("#newHoldingNameInput")?.focus();
    }
  });

  document.addEventListener("pointerdown", (event) => {
    const row = event.target.closest?.("[data-swipe-row]");
    if (!row || event.target.closest?.(".ledger-delete-action, .section-delete-action, input, select, textarea, .custom-select")) return;
    closeOpenSwipeRows(row);
    swipeState = {
      row,
      content: row.querySelector(".ledger-transaction-row, .section-swipe-content"),
      startX: event.clientX,
      startY: event.clientY,
      lastX: 0,
      moved: false
    };
    row.classList.add("is-swiping");
  });

  document.addEventListener("pointermove", (event) => {
    if (!swipeState?.content) return;
    const dx = event.clientX - swipeState.startX;
    const dy = event.clientY - swipeState.startY;
    if (Math.abs(dy) > Math.abs(dx) && !swipeState.moved) return;
    const nextX = Math.max(-82, Math.min(0, dx));
    if (Math.abs(nextX) > 6) swipeState.moved = true;
    swipeState.lastX = nextX;
    if (swipeState.row.classList.contains("ledger-swipe-row")) {
      swipeState.row.style.setProperty("--swipe-shift", `${Math.abs(nextX)}px`);
    } else {
      swipeState.content.style.transform = `translateX(${nextX}px)`;
    }
    event.preventDefault();
  });

  document.addEventListener("pointerup", () => {
    if (!swipeState?.content) return;
    const shouldOpen = swipeState.lastX < -42;
    swipeState.content.style.transform = "";
    swipeState.row.classList.remove("is-swiping");
    swipeState.row.style.removeProperty("--swipe-shift");
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
      updateCurrentLivingBudgetSnapshot(stateRef.current);
      render();
      restoreBudgetInput(budgetId, rawValue);
      return;
    }
    if (target.id === "ledgerKeywordInput") {
      updateLedgerFilterPreview(stateRef.current);
      return;
    }
    if (target.id === "ledgerAmountMinInput" || target.id === "ledgerAmountMaxInput") {
      document.querySelectorAll("[data-ledger-amount-filter]").forEach((button) => {
        button.classList.remove("is-active");
      });
      updateLedgerFilterPreview(stateRef.current);
      return;
    }
    if (target.dataset?.safetyMonths !== undefined) {
      stateRef.current.assetSnapshot = {
        ...(stateRef.current.assetSnapshot ?? {}),
        safetyMonths: Math.max(1, Math.floor(Number(target.value || 1)))
      };
      render();
      return;
    }
    if (target.dataset?.assetTrendMonths !== undefined) {
      stateRef.current.assetSnapshot = {
        ...(stateRef.current.assetSnapshot ?? {}),
        trendMonths: Math.max(2, Math.min(60, Math.floor(Number(target.value || 6))))
      };
      render();
      return;
    }
    if (target.id === "plannedIncomeInput") {
      stateRef.current.plannedIncome = Number(target.value || 0);
      shouldRender = true;
    }
    if (target.id === "totalBudgetInput") {
      stateRef.current.totalBudget = parseBudgetInput(target.value);
      applyCurrentRatios(stateRef.current);
      updateCurrentLivingBudgetSnapshot(stateRef.current);
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
    if (target.dataset?.sectionName) {
      updateAccountSectionName(stateRef.current, target.dataset.sectionName, Number(target.dataset.sectionIndex), target.value);
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
      updateCurrentLivingBudgetSnapshot(stateRef.current);
      render();
    }
    if (target.dataset?.breakdownName || target.dataset?.breakdownAmount || target.dataset?.sectionName) {
      render();
    }
    if (target.id === "accountInput") renderQuickForm(stateRef.current);
    if (target.id === "categoryInput" && stateRef.current.quickType === "investment") renderQuickForm(stateRef.current);
    if (target.id === "transactionAccountInput") updateTransactionCategoryOptions(stateRef.current);
    if (target.id === "transactionInvestmentKindInput") updateTransactionInvestmentDetailFields(stateRef.current);
    if (target.id === "transactionCategoryInput") updateTransactionSubcategoryOptions(stateRef.current);
    if (target.id === "holdingCategoryInput") updateHoldingSubcategoryOptions(stateRef.current);
  });

  document.addEventListener("focusout", (event) => {
    const target = event.target;
    if (target.dataset?.budget) {
      render();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && datePickerState) {
      datePickerState = closeDatePicker();
    }
  });

  window.addEventListener("resize", () => {
    if (datePickerState) datePickerState = closeDatePicker();
  });

  document.querySelector("#entryForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const amount = Number(document.querySelector("#amountInput").value || 0);
    if (amount <= 0) return;
    const type = stateRef.current.quickType;
    const kind = stateRef.current.investmentKind;
    const amortizationMonthsValue = Math.max(1, Math.floor(Number(document.querySelector("#amortizationInput").value || 1)));
    const accountId = type === "income"
      ? "income"
      : type === "investment"
        ? "assets"
        : document.querySelector("#accountInput").value;
    const destination = type === "investment" && kind === "transferOut"
      ? document.querySelector("#transferOutDestInput").value.trim()
      : undefined;
    const category = type === "investment" && kind === "transferOut" ? "" : document.querySelector("#categoryInput").value;
    const subcategory = type === "investment" && kind === "transferOut" ? "" : document.querySelector("#subcategoryInput").value;
    const newEntry = tx(
      type,
      accountId,
      category,
      amount,
      document.querySelector("#noteInput").value.trim(),
      document.querySelector("#dateInput").value || today,
      type === "investment"
        ? { investmentKind: kind, subcategory, assetEventId: createAssetEventId(), assetAction: assetActionForKind(kind), ...(destination ? { destination } : {}) }
        : type === "expense"
          ? { amortizationMonths: amortizationMonthsValue }
          : {}
    );
    let createdHoldingName = "";

    if (type === "investment") {
      createdHoldingName = prepareInvestmentEntryFromQuickForm(stateRef.current, newEntry, amount, category, subcategory);
    }

    stateRef.current.transactions.push(newEntry);
    document.querySelector("#amountInput").value = "";
    document.querySelector("#noteInput").value = "";
    document.querySelector("#amortizationInput").value = "1";
    closeSheet();
    render();
    if (createdHoldingName) showToast("已保存新持仓：" + createdHoldingName);
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

  document.addEventListener("submit", (event) => {
    const form = event.target.closest?.("[data-section-add]");
    if (!form) return;
    event.preventDefault();
    const input = form.querySelector('[name="title"]');
    const title = input.value.trim();
    if (!title) return;
    addAccountSection(stateRef.current, form.dataset.sectionAdd, title);
    render();
  });

  document.querySelector("#transactionForm").addEventListener("submit", (event) => {
    event.preventDefault();
    saveTransactionDialog(stateRef.current, render);
  });

  document.querySelector("#holdingForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const snap     = stateRef.current.assetSnapshot ?? {};
    const holdings = [...(snap.holdings ?? [])];
    const id       = document.querySelector("#holdingIdInput").value;
    const isNew    = !id;
    const marketValue = Number(document.querySelector("#holdingMarketValueInput").value || 0);
    const costBasisRaw = document.querySelector("#holdingCostBasisInput").value.trim();
    const holding  = {
      id:          isNew ? `hold_${Date.now().toString(36)}` : id,
      name:        document.querySelector("#holdingNameInput").value.trim(),
      code:        document.querySelector("#holdingCodeInput").value.trim(),
      term:        document.querySelector("#holdingTermInput").value.trim(),
      category:    document.querySelector("#holdingCategoryInput").value,
      subcategory: document.querySelector("#holdingSubcategoryInput").value,
      marketValue,
      costBasis:   costBasisRaw === "" ? marketValue : Number(costBasisRaw || 0),
      trackingFromCurrent: costBasisRaw === ""
    };
    holding.type = inferHoldingType(holding, document.querySelector("#holdingTypeInput").value);
    if (isNew) {
      holdings.push(holding);
    } else {
      const idx = holdings.findIndex(h => h.id === id);
      if (idx >= 0) holdings[idx] = holding;
    }
    stateRef.current.assetSnapshot = { ...snap, holdings };
    recordAssetSnapshot(stateRef.current);
    closeHoldingSheet();
    render();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && event.target?.id === "overviewCurrentCashInput") {
      event.preventDefault();
      saveCashCalibration(stateRef.current, render);
      return;
    }
    if (event.key === "Escape") {
      closeSheet();
      closeLedgerFilterSheet();
      closeCustomRatioDialog();
      closeTransactionDialog();
      closeHoldingSheet();
    }
  });
}

function openDatePicker(input, currentState) {
  const mode = input.dataset.datePicker === "month" ? "month" : "date";
  const value = mode === "month"
    ? normalizeMonthValue(input.value || defaultMonth)
    : normalizeDateValue(input.value || today);
  const view = mode === "month" ? parseMonthValue(value) : parseDateValue(value);
  const state = {
    input,
    mode,
    selectedValue: value,
    viewYear: view.year,
    viewMonth: view.month
  };
  if (currentState?.input === input) return closeDatePicker();
  renderDatePicker(state);
  return state;
}

function closeDatePicker() {
  const picker = document.querySelector("#customDatePicker");
  if (picker) {
    picker.className = "custom-date-picker";
    picker.setAttribute("aria-hidden", "true");
    picker.innerHTML = "";
    picker.style.left = "";
    picker.style.top = "";
  }
  return null;
}

function handleDatePickerCommand(state, command) {
  if (!state) return state;
  if (command === "clear") {
    applyDatePickerValue(state, "");
    return closeDatePicker();
  }
  if (command === "today") {
    applyDatePickerValue(state, state.mode === "month" ? defaultMonth : today);
    return closeDatePicker();
  }
  if (state.mode === "month") {
    state.viewYear += command === "next" ? 1 : -1;
  } else {
    const offset = command === "next" ? 1 : -1;
    const next = new Date(state.viewYear, state.viewMonth - 1 + offset, 1);
    state.viewYear = next.getFullYear();
    state.viewMonth = next.getMonth() + 1;
  }
  renderDatePicker(state);
  return state;
}

function applyDatePickerValue(state, value) {
  if (!state?.input) return;
  state.input.value = value;
  state.input.dispatchEvent(new Event("change", { bubbles: true }));
}

function renderDatePicker(state) {
  const picker = document.querySelector("#customDatePicker");
  if (!picker) return;
  picker.className = `custom-date-picker is-open is-${state.mode}`;
  picker.setAttribute("aria-hidden", "false");
  picker.innerHTML = `
    <div class="custom-calendar-panel" role="dialog" aria-label="${state.mode === "month" ? "选择月份" : "选择日期"}">
      <div class="custom-calendar-head">
        <button type="button" data-calendar-command="prev" aria-label="${state.mode === "month" ? "上一年" : "上个月"}">&lt;</button>
        <strong>${state.mode === "month" ? `${state.viewYear}年` : `${state.viewYear}年${pad2(state.viewMonth)}月`}</strong>
        <button type="button" data-calendar-command="next" aria-label="${state.mode === "month" ? "下一年" : "下个月"}">&gt;</button>
      </div>
      ${state.mode === "month" ? renderMonthPickerGrid(state) : renderDayPickerGrid(state)}
      <div class="custom-calendar-foot">
        <button type="button" data-calendar-command="clear">清除</button>
        <button type="button" data-calendar-command="today">${state.mode === "month" ? "本月" : "今天"}</button>
      </div>
    </div>
  `;
  positionDatePicker(state.input, picker);
}

function renderMonthPickerGrid(state) {
  const selected = normalizeMonthValue(state.selectedValue || defaultMonth);
  const thisMonth = defaultMonth;
  const months = Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    const value = `${state.viewYear}-${pad2(month)}`;
    const classes = [
      "custom-calendar-cell",
      "custom-calendar-month",
      value === selected ? "is-selected" : "",
      value === thisMonth ? "is-today" : ""
    ].filter(Boolean).join(" ");
    return `<button type="button" class="${classes}" data-calendar-value="${value}">${month}月</button>`;
  }).join("");
  return `<div class="custom-calendar-month-grid">${months}</div>`;
}

function renderDayPickerGrid(state) {
  const selected = normalizeDateValue(state.selectedValue || today);
  const todayValue = today;
  const firstWeekday = (new Date(state.viewYear, state.viewMonth - 1, 1).getDay() + 6) % 7;
  const days = Array.from({ length: 42 }, (_, index) => {
    const dayOffset = index - firstWeekday + 1;
    const cellDate = new Date(state.viewYear, state.viewMonth - 1, dayOffset);
    const value = formatDateValue(cellDate.getFullYear(), cellDate.getMonth() + 1, cellDate.getDate());
    const isOutside = cellDate.getMonth() + 1 !== state.viewMonth;
    const classes = [
      "custom-calendar-cell",
      "custom-calendar-day",
      isOutside ? "is-outside" : "",
      value === selected ? "is-selected" : "",
      value === todayValue ? "is-today" : ""
    ].filter(Boolean).join(" ");
    return `<button type="button" class="${classes}" data-calendar-value="${value}">${cellDate.getDate()}</button>`;
  }).join("");
  return `
    <div class="custom-calendar-weekdays" aria-hidden="true">
      <span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span><span>日</span>
    </div>
    <div class="custom-calendar-day-grid">${days}</div>
  `;
}

function positionDatePicker(input, picker) {
  const rect = input.closest(".month-control")?.getBoundingClientRect() || input.getBoundingClientRect();
  const margin = 10;
  const panelWidth = picker.offsetWidth || 318;
  const panelHeight = picker.offsetHeight || 360;
  const left = Math.min(
    Math.max(margin, rect.left),
    Math.max(margin, window.innerWidth - panelWidth - margin)
  );
  const below = rect.bottom + 8;
  const above = rect.top - panelHeight - 8;
  const top = below + panelHeight + margin > window.innerHeight && above > margin ? above : below;
  picker.style.left = `${left}px`;
  picker.style.top = `${Math.max(margin, top)}px`;
}

function normalizeMonthValue(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})/);
  if (!match) return defaultMonth;
  return `${match[1]}-${match[2]}`;
}

function normalizeDateValue(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return today;
  return `${match[1]}-${match[2]}-${match[3]}`;
}

function parseMonthValue(value) {
  const [year, month] = normalizeMonthValue(value).split("-").map(Number);
  return { year, month };
}

function parseDateValue(value) {
  const [year, month, day] = normalizeDateValue(value).split("-").map(Number);
  return { year, month, day };
}

function formatDateValue(year, month, day) {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function saveCashCalibration(state, render) {
  const input = document.querySelector("#overviewCurrentCashInput");
  if (!input) return;
  const targetCash = parseBudgetInput(input.value);
  const openingCash = targetCash - monthlyCashFlow(state);
  setOpeningCashBalance(state, state.currentMonth, openingCash);
  document.querySelector("#cashCalibrationRow").hidden = true;
  render();
}

function activateScreen(screenName, activeNav = screenName) {
  document.querySelectorAll(".bottom-nav [data-nav]").forEach((button) => button.classList.toggle("is-active", button.dataset.nav === activeNav));
  document.querySelectorAll("[data-screen]").forEach((screen) => screen.classList.toggle("is-active", screen.dataset.screen === screenName));
}

function openTransactionDialog(state, id) {
  const entry = findTransaction(state, id);
  if (!entry) return;
  const dialog = document.querySelector("#transactionDialog");
  dialog.dataset.transactionType = entry.type;
  const account = entry.type === "income" ? null : accountMeta[entry.accountId];
  const amount = Math.abs(Number(entry.amount || 0));
  const prefix = entry.type === "income" || entry.investmentKind === "transferOut" ? "+" : "-";
  document.querySelector("#transactionIdInput").value = entry.id;
  document.querySelector("#transactionAmountInput").value = amount || "";
  document.querySelector("#transactionNoteInput").value = entry.note || "";
  document.querySelector("#transactionDateInput").value = entry.date || today;
  document.querySelector("#transactionAmortizationInput").value = Math.max(1, Math.floor(Number(entry.amortizationMonths || 1)));
  document.querySelector("#transactionDetailIcon").textContent = entry.type === "income" ? "入" : account?.icon || "·";
  document.querySelector("#transactionDetailTitle").textContent = transactionDetailTitle(entry);
  document.querySelector("#transactionDetailMeta").textContent = transactionMetaLabel(entry);
  document.querySelector("#transactionDetailAmount").textContent = prefix + yuan.format(amount);
  document.querySelector(".transaction-detail-card").style.setProperty("--detail-color", account?.color || "#4e8f52");
  document.querySelector(".transaction-detail-card").style.setProperty("--detail-soft", account?.soft || "#edf4e8");

  renderTransactionAccountOptions(entry);
  renderTransactionInvestmentOptions(entry);
  renderTransactionHoldingOptions(state, entry);
  updateTransactionCategoryOptions(state, entry.category);
  updateTransactionSubcategoryOptions(state, entry.subcategory);
  updateTransactionInvestmentDetailFields(state);
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
  const previousEntry = structuredClone(entry);
  if (entry.type === "investment") revertInvestmentEntry(state, previousEntry);
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
    const isTransferIn = entry.investmentKind === "transferIn";
    entry.category = isTransferIn ? document.querySelector("#transactionCategoryInput").value : "";
    entry.subcategory = isTransferIn ? document.querySelector("#transactionSubcategoryInput").value : "";
    entry.holdingId = document.querySelector("#transactionHoldingInput").value;
    if (!isTransferIn) {
      const holding = (state.assetSnapshot?.holdings ?? []).find((item) => item.id === entry.holdingId);
      entry.category = holding?.category || "";
      entry.subcategory = holding?.subcategory || "";
    }
    entry.assetAction = assetActionForKind(entry.investmentKind);
    entry.assetEventId ||= createAssetEventId();
    delete entry.previousMarketValue;
    applyInvestmentEntry(state, entry);
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
  input.value = entry.investmentKind || "transferIn";
}

function renderTransactionHoldingOptions(state, entry) {
  const input = document.querySelector("#transactionHoldingInput");
  if (!input) return;
  const holdings = state.assetSnapshot?.holdings ?? [];
  input.innerHTML = holdings.map((holding) => `<option value="${escapeHtml(holding.id)}">${escapeHtml(holding.name)}</option>`).join("");
  if (holdings.some((holding) => holding.id === entry.holdingId)) {
    input.value = entry.holdingId;
  }
}

function updateTransactionCategoryOptions(state, selectedCategory = "") {
  const id = document.querySelector("#transactionIdInput")?.value;
  const type = transactionDialogEntryType(id);
  const accountId = document.querySelector("#transactionAccountInput")?.value || "survival";
  const input = document.querySelector("#transactionCategoryInput");
  const currentValue = selectedCategory || input.value;
  const categorySet = type === "income"
    ? categories.income
    : type === "investment"
      ? categoryOptionsForAccount(state, "assets")
      : categoryOptionsForAccount(state, accountId);
  const options = categorySet.includes(currentValue) || !currentValue
    ? categorySet
    : [currentValue, ...categorySet];
  input.innerHTML = options.map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("");
  input.value = options.includes(currentValue) ? currentValue : options[0] || "";
}

function updateTransactionSubcategoryOptions(state, selectedSubcategory = "") {
  const input = document.querySelector("#transactionSubcategoryInput");
  if (!input) return;
  const category = document.querySelector("#transactionCategoryInput")?.value || categoryOptionsForAccount(state, "assets")[0] || "";
  const options = assetSubcategoryOptions(state, category);
  const currentValue = selectedSubcategory || input.value;
  const nextOptions = currentValue && !options.includes(currentValue) ? [currentValue, ...options] : options;
  input.innerHTML = nextOptions.map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("");
  input.value = nextOptions.includes(currentValue) ? currentValue : nextOptions[0] || "";
}

function updateTransactionInvestmentDetailFields(state) {
  const type = transactionDialogEntryType();
  const kind = document.querySelector("#transactionInvestmentKindInput")?.value || "transferIn";
  const isInvestment = type === "investment";
  const isTransferIn = isInvestment && kind === "transferIn";
  const categoryField = document.querySelector("#transactionCategoryField");
  const subcategoryField = document.querySelector("#transactionSubcategoryField");
  const holdingField = document.querySelector("#transactionHoldingField");
  if (categoryField) categoryField.hidden = isInvestment && !isTransferIn;
  if (subcategoryField) subcategoryField.hidden = !isTransferIn;
  if (holdingField) holdingField.hidden = !isInvestment;
  if (isTransferIn) {
    updateTransactionCategoryOptions(state);
    updateTransactionSubcategoryOptions(state);
  }
}

function transactionDialogEntryType(id) {
  return document.querySelector("#transactionDialog")?.dataset.transactionType || "expense";
}

function transactionMetaLabel(entry) {
  const account = entry.type === "income" ? "收入" : accountMeta[entry.accountId]?.title || "账户";
  const kind = entry.type === "investment" ? investmentKinds[entry.investmentKind] || "投资" : entry.category || "未分类";
  return [account, kind, entry.date].filter(Boolean).join(" · ");
}

function transactionDetailTitle(entry) {
  if (entry.type === "investment") {
    const kind = investmentKinds[entry.investmentKind] || transactionTypeLabel(entry.type);
    return [kind, entry.note].filter(Boolean).join("·");
  }
  return entry.note || entry.category || transactionTypeLabel(entry.type);
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
  const entry = findTransaction(state, id);
  if (entry?.type === "investment") revertInvestmentEntry(state, entry);
  state.transactions = state.transactions.filter((entry) => entry.id !== id);
}

function closeOpenSwipeRows(exceptRow = null) {
  document.querySelectorAll(".ledger-swipe-row.is-delete-open, .section-swipe-row.is-delete-open").forEach((row) => {
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
  document.querySelectorAll(".custom-select.is-open").forEach((s) => closeCustomSelect(s));
}

function openCustomSelect(selectEl) {
  selectEl.classList.add("is-open");
  selectEl.querySelector(".custom-select-trigger").setAttribute("aria-expanded", "true");
  selectEl.querySelector(".custom-select-panel").hidden = false;
}

function closeCustomSelect(selectEl) {
  selectEl.classList.remove("is-open");
  selectEl.querySelector(".custom-select-trigger").setAttribute("aria-expanded", "false");
  selectEl.querySelector(".custom-select-panel").hidden = true;
}

function handleCustomSelectCommand(value, state, render) {
  if (value === "__edit_account_categories__") {
    const accountId = document.querySelector("#accountInput")?.value || "survival";
    jumpToCategoryManager(state, render, accountId);
    return true;
  }
  if (value === "__edit_asset_categories__") {
    jumpToCategoryManager(state, render, "assets");
    return true;
  }
  if (value === "__edit_income_categories__") {
    const current = categoryOptionsForAccount(state, "income").join("、");
    const next = window.prompt("编辑收入分类，用顿号或逗号分隔", current);
    if (next !== null) {
      const items = next.split(/[、,，]/).map((item) => item.trim()).filter(Boolean);
      if (items.length) {
        state.incomeCategories = [...new Set(items)];
        render();
      }
    }
    return true;
  }
  return false;
}

function jumpToCategoryManager(state, render, accountId) {
  state.managerAccountId = accountId;
  state.managerViewMode = "budget";
  closeSheet();
  render();
  activateScreen("budget-settings", "budget");
  window.setTimeout(() => {
    document.querySelector("#accountManager")?.scrollIntoView({ behavior: "smooth", block: "start" });
    playSectionSwipeDemo(accountId);
  }, 0);
}

function playSectionSwipeDemo(accountId) {
  const row = document.querySelector(`[data-breakdown-section="${accountId}"]`);
  if (!row) return;
  row.classList.remove("is-swipe-demo", "is-delete-open");
  void row.offsetWidth;
  row.classList.add("is-swipe-demo");
  window.setTimeout(() => row.classList.remove("is-swipe-demo"), 1450);
}

function showToast(message) {
  const toast = document.querySelector("#appToast");
  if (!toast) return;
  toast.textContent = message;
  toast.hidden = false;
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    toast.hidden = true;
  }, 2200);
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
  const categorySection = document.querySelector("[data-ledger-category-section]");
  const activeCategory = categorySection?.hidden ? "" : document.querySelector("[data-ledger-category-filter].is-active")?.dataset.ledgerCategoryFilter || "";
  const activeSort = document.querySelector("[data-ledger-sort-filter].is-active")?.dataset.ledgerSortFilter || "newest";
  const accounts = [...document.querySelectorAll("[data-ledger-account-filter].is-active")].map((button) => button.dataset.ledgerAccountFilter);
  return {
    keyword: document.querySelector("#ledgerKeywordInput")?.value.trim() || "",
    accounts,
    category: activeCategory,
    amountRange: activeAmount,
    customAmountMin: document.querySelector("#ledgerAmountMinInput")?.value.trim() || "",
    customAmountMax: document.querySelector("#ledgerAmountMaxInput")?.value.trim() || "",
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

function refreshLedgerCategoryFilterOptions(state) {
  const section = document.querySelector("[data-ledger-category-section]");
  const container = document.querySelector("[data-ledger-category-options]");
  if (!section || !container) return;
  const selectedAccounts = new Set([...document.querySelectorAll("[data-ledger-account-filter].is-active")].map((button) => button.dataset.ledgerAccountFilter));
  const shouldShow = selectedAccounts.size > 0;
  section.hidden = !shouldShow;
  if (!shouldShow) {
    container.innerHTML = "";
    return;
  }
  const categoryOptions = ledgerCategoryOptionsForAccounts(state, ledgerBaseRows(state), selectedAccounts);
  const selectedCategory = document.querySelector("[data-ledger-category-filter].is-active")?.dataset.ledgerCategoryFilter || "";
  const nextCategory = categoryOptions.includes(selectedCategory) ? selectedCategory : "";
  container.innerHTML = renderLedgerCategoryFilterButtons(categoryOptions, nextCategory);
}

function renderLedgerCategoryFilterButtons(categories, selectedCategory) {
  return [
    '<button class="' + (!selectedCategory ? "is-active" : "") + '" data-ledger-category-filter="" type="button">全部</button>',
    categories.map((category) => {
      const active = category === selectedCategory ? " is-active" : "";
      return '<button class="' + active.trim() + '" data-ledger-category-filter="' + escapeHtml(category) + '" type="button">' + escapeHtml(category) + "</button>";
    }).join("")
  ].join("");
}

function ledgerCategoryOptionsForAccounts(state, rows, selectedAccounts) {
  const options = [];
  selectedAccounts.forEach((accountId) => {
    categoryOptionsForAccount(state, accountId).forEach((category) => options.push(category));
  });
  rows
    .filter((entry) => selectedAccounts.has(ledgerFilterAccountKey(entry)))
    .forEach((entry) => {
      if (entry.category) options.push(entry.category);
    });
  return [...new Set(options)];
}

function ledgerFilterAccountKey(entry) {
  return entry.type === "income" ? "income" : entry.accountId;
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
  updateCurrentLivingBudgetSnapshot(state);
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

function updateCurrentLivingBudgetSnapshot(state) {
  state.livingBudgetHistory = upsertLivingBudgetSnapshot(
    state.livingBudgetHistory,
    state.currentMonth,
    livingBudgetFromBudgets(state.budgets)
  );
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

function prepareInvestmentEntryFromQuickForm(state, entry, amount, category, subcategory) {
  const kind = entry.investmentKind || "transferIn";
  const snap = state.assetSnapshot ?? {};
  const holdings = [...(snap.holdings ?? [])];
  let createdHoldingName = "";

  if (kind === "transferIn") {
    const holdingId = document.querySelector("#holdingSelectInput")?.value;
    if (holdingId === "__new__") {
      const name = document.querySelector("#newHoldingNameInput").value.trim();
      if (name) {
        holdings.push({
          id: `hold_${Date.now().toString(36)}`,
          name,
          code: document.querySelector("#newHoldingCodeInput").value.trim(),
          type: inferHoldingType({ name, category, subcategory, term: document.querySelector("#newHoldingTermInput").value.trim() }, document.querySelector("#newHoldingTypeInput").value),
          category,
          subcategory,
          term: document.querySelector("#newHoldingTermInput").value.trim(),
          marketValue: amount,
          costBasis: amount
        });
        entry.holdingId = holdings[holdings.length - 1].id;
        createdHoldingName = name;
      }
    } else if (holdingId) {
      entry.holdingId = holdingId;
      adjustHoldingCollection(holdings, entry, 1);
    }
    document.querySelector("#newHoldingNameInput").value = "";
    document.querySelector("#newHoldingCodeInput").value = "";
    document.querySelector("#newHoldingTermInput").value = "";
  } else {
    entry.holdingId = kind === "transferOut"
      ? document.querySelector("#transferOutSourceInput")?.value
      : document.querySelector("#assetEventHoldingInput")?.value;
    const holding = holdings.find((item) => item.id === entry.holdingId);
    if (holding) {
      entry.category = holding.category || "";
      entry.subcategory = holding.subcategory || "";
    }
    adjustHoldingCollection(holdings, entry, 1);
  }

  state.assetSnapshot = appendAssetEvent({ ...snap, holdings }, entry);
  recordAssetSnapshot(state);
  return createdHoldingName;
}

function createAssetEventId() {
  return `asset_evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function recordAssetSnapshot(state) {
  const snap = state.assetSnapshot ?? {};
  const month = String(state.currentMonth || today).slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(month)) return;
  const value = (snap.holdings ?? []).reduce((sum, holding) => sum + Number(holding.marketValue || 0), 0);
  const history = Array.isArray(snap.history) ? snap.history : [];
  state.assetSnapshot = {
    ...snap,
    history: [
      ...history.filter((point) => String(point?.month || "").slice(0, 7) !== month),
      { month, value }
    ].sort((a, b) => String(a.month).localeCompare(String(b.month)))
  };
}

function appendAssetEvent(snapshot, entry) {
  if (!entry.holdingId) return snapshot;
  const assetEvents = Array.isArray(snapshot.assetEvents) ? snapshot.assetEvents : [];
  return {
    ...snapshot,
    assetEvents: [
      ...assetEvents.filter((event) => event.id !== entry.assetEventId),
      assetEventFromEntry(entry)
    ]
  };
}

function assetEventFromEntry(entry) {
  return {
    id: entry.assetEventId || createAssetEventId(),
    transactionId: entry.id,
    holdingId: entry.holdingId,
    action: assetActionForKind(entry.investmentKind),
    amount: Number(entry.amount || 0),
    previousMarketValue: entry.previousMarketValue,
    pnlDelta: entry.pnlDelta,
    category: entry.category,
    subcategory: entry.subcategory,
    date: entry.date
  };
}

function applyInvestmentEntry(state, entry) {
  if (entry.investmentKind === "valuation") {
    delete entry.previousMarketValue;
    delete entry.pnlDelta;
  }
  adjustHoldingByEntry(state, entry, 1);
  state.assetSnapshot = appendAssetEvent(state.assetSnapshot ?? {}, entry);
  recordAssetSnapshot(state);
}

function revertInvestmentEntry(state, entry) {
  adjustHoldingByEntry(state, entry, -1);
  const snap = state.assetSnapshot ?? {};
  state.assetSnapshot = {
    ...snap,
    assetEvents: (snap.assetEvents ?? []).filter((event) => event.transactionId !== entry.id)
  };
  recordAssetSnapshot(state);
}

function adjustHoldingByEntry(state, entry, multiplier) {
  if (!entry.holdingId) return;
  const snap = state.assetSnapshot ?? {};
  const holdings = [...(snap.holdings ?? [])];
  adjustHoldingCollection(holdings, entry, multiplier);
  state.assetSnapshot = { ...snap, holdings };
}

function adjustHoldingCollection(holdings, entry, multiplier) {
  if (!entry.holdingId) return;
  const idx = holdings.findIndex((holding) => holding.id === entry.holdingId);
  if (idx < 0) return;
  const holding = holdings[idx];
  const amount = Number(entry.amount || 0);
  const kind = entry.investmentKind || "transferIn";

  if (kind === "valuation") {
    if (multiplier > 0) {
      const previous = Number(holding.marketValue || 0);
      entry.previousMarketValue = previous;
      entry.pnlDelta = amount - previous;
      holdings[idx] = {
        ...holding,
        marketValue: Math.max(0, amount)
      };
    } else if (entry.previousMarketValue !== undefined) {
      holdings[idx] = {
        ...holding,
        marketValue: Math.max(0, Number(entry.previousMarketValue || 0))
      };
    }
    return;
  }

  const direction = kind === "transferOut" ? -1 : 1;
  const affectsCost = kind === "transferIn" || kind === "transferOut";
  const delta = amount * direction * multiplier;
  holdings[idx] = {
    ...holding,
    category: holding.category || entry.category,
    subcategory: holding.subcategory || entry.subcategory,
    costBasis: affectsCost ? Math.max(0, Number(holding.costBasis || 0) + delta) : Number(holding.costBasis || 0),
    marketValue: Math.max(0, Number(holding.marketValue || 0) + delta)
  };
}

function assetActionForKind(kind) {
  if (kind === "transferOut") return "sell";
  if (kind === "valuation") return "valuation";
  if (kind === "yield") return "yield";
  if (kind === "maturity") return "maturity";
  return "buy";
}

function ensureAccountSections(state, accountId) {
  state.accountSections ??= structuredClone(defaultAccountSections);
  state.accountSections[accountId] ??= structuredClone(defaultAccountSections[accountId] ?? []);
  return state.accountSections[accountId];
}

function accountSectionsFor(state, accountId) {
  return ensureAccountSections(state, accountId);
}

function categoryOptionsForAccount(state, accountId) {
  if (accountId === "income") return state.incomeCategories || categories.income;
  return accountSectionsFor(state, accountId).map((section) => section.title).filter(Boolean);
}

function updateAccountSectionName(state, accountId, sectionIndex, nextTitle) {
  const sections = ensureAccountSections(state, accountId);
  const section = sections[sectionIndex];
  if (!section) return;
  const oldTitle = section.title;
  section.title = nextTitle;
  if (!oldTitle || oldTitle === nextTitle) return;
  state.transactions?.forEach((entry) => {
    if (entry.accountId === accountId && entry.category === oldTitle) entry.category = nextTitle;
  });
  if (accountId === "assets") {
    (state.assetSnapshot?.holdings ?? []).forEach((holding) => {
      if (holding.category === oldTitle) holding.category = nextTitle;
    });
  }
}

function removeAccountSection(state, accountId, sectionIndex) {
  const sections = ensureAccountSections(state, accountId);
  if (sectionIndex < 0 || sectionIndex >= sections.length) return;
  sections.splice(sectionIndex, 1);
  state.accountBreakdowns ??= {};
  state.accountBreakdowns[accountId] ??= [];
  state.accountBreakdowns[accountId].splice(sectionIndex, 1);
}

function addAccountSection(state, accountId, title) {
  const sections = ensureAccountSections(state, accountId);
  sections.push({
    id: `${accountId}-section-${Date.now().toString(36)}`,
    title,
    body: ""
  });
  state.accountBreakdowns ??= {};
  state.accountBreakdowns[accountId] ??= [];
  state.accountBreakdowns[accountId].push([]);
}

function assetSubcategoryOptions(state, category) {
  const sectionIndex = accountSectionsFor(state, "assets").findIndex((section) => section.title === category);
  const items = state.accountBreakdowns?.assets?.[sectionIndex] ?? [];
  return items.map((item) => item.name).filter(Boolean);
}

function inferHoldingType(holding, fallback = "fund") {
  const text = [holding.name, holding.category, holding.subcategory, holding.term]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (/定期|存款|存单|国债|到期|封闭/.test(text)) return "deposit";
  if (/货币|活期|余额宝|现金|通知存款|现金管理|活钱/.test(text)) return "money";
  if (/债|固收/.test(text)) return "bond";
  if (/股票/.test(text)) return "stock";
  if (/etf|指数|qdii|reit|黄金/.test(text)) return "etf";
  return fallback || "fund";
}

function updateHoldingCategoryOptions(state, selectedCategory = "") {
  const input = document.querySelector("#holdingCategoryInput");
  if (!input) return;
  const assetCategories = categoryOptionsForAccount(state, "assets");
  const value = selectedCategory && assetCategories.includes(selectedCategory) ? selectedCategory : assetCategories[0] || "";
  input.innerHTML = assetCategories.map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join("");
  input.value = value;
}

function updateHoldingSubcategoryOptions(state, selectedSubcategory = "") {
  const input = document.querySelector("#holdingSubcategoryInput");
  if (!input) return;
  const category = document.querySelector("#holdingCategoryInput")?.value || categoryOptionsForAccount(state, "assets")[0] || "";
  const options = assetSubcategoryOptions(state, category);
  const currentValue = selectedSubcategory || input.value;
  const nextOptions = currentValue && !options.includes(currentValue) ? [currentValue, ...options] : options;
  input.innerHTML = nextOptions.map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("");
  input.value = nextOptions.includes(currentValue) ? currentValue : nextOptions[0] || "";
}

function openHoldingSheet(state, holdingId) {
  const isNew    = !holdingId;
  const holding  = isNew ? null : (state.assetSnapshot?.holdings ?? []).find(h => h.id === holdingId);
  document.querySelector("#holdingFormTitle").textContent = isNew ? "录入已有资产" : "编辑持仓";
  document.querySelector("#holdingIdInput").value         = holdingId ?? "";
  document.querySelector("#holdingNameInput").value       = holding?.name ?? "";
  document.querySelector("#holdingCodeInput").value       = holding?.code ?? "";
  document.querySelector("#holdingTermInput").value       = holding?.term ?? "";
  document.querySelector("#holdingMarketValueInput").value = holding?.marketValue ?? "";
  document.querySelector("#holdingCostBasisInput").value  = holding?.trackingFromCurrent ? "" : (holding?.costBasis ?? "");
  document.querySelector("#holdingDeleteButton").hidden   = isNew;
  const typeSelect = document.querySelector("#holdingTypeInput");
  typeSelect.innerHTML = Object.entries(holdingTypes)
    .map(([key, meta]) => `<option value="${key}">${meta.label}</option>`)
    .join("");
  typeSelect.value = holding?.type ?? "etf";
  updateHoldingCategoryOptions(state, holding?.category);
  updateHoldingSubcategoryOptions(state, holding?.subcategory);
  const sheet = document.querySelector("#holdingSheet");
  sheet.classList.add("is-open");
  sheet.setAttribute("aria-hidden", "false");
  window.setTimeout(() => document.querySelector("#holdingNameInput")?.focus(), 0);
}

function closeHoldingSheet() {
  const sheet = document.querySelector("#holdingSheet");
  sheet?.classList.remove("is-open");
  sheet?.setAttribute("aria-hidden", "true");
}

function parseBudgetInput(value) {
  const numericValue = String(value).replace(/[^\d.]/g, "");
  return Number(numericValue || 0);
}
