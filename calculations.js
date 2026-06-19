import { accountMeta, accountOrder, investmentKinds } from "./state.js?v=negative-neutral1";

export function monthKeyFromDate(date) {
  return String(date || "").slice(0, 7);
}

export function monthIndex(month) {
  const [year, monthNumber] = String(month || "").split("-").map(Number);
  return (year * 12) + monthNumber - 1;
}

export function amortizationMonths(entry) {
  return Math.max(1, Math.floor(Number(entry.amortizationMonths || 1)));
}

export function amortizationOffset(entry, month) {
  const startMonth = monthKeyFromDate(entry.date);
  if (!startMonth || !month) return -1;
  return monthIndex(month) - monthIndex(startMonth);
}

export function isExpenseActiveInMonth(entry, month) {
  if (entry.type !== "expense") return false;
  const offset = amortizationOffset(entry, month);
  return offset >= 0 && offset < amortizationMonths(entry);
}

export function expenseAmountForMonth(entry) {
  return Number(entry.amount || 0) / amortizationMonths(entry);
}

export function withAmortizationView(entry, month) {
  if (entry.type !== "expense") return entry;
  const months = amortizationMonths(entry);
  const offset = amortizationOffset(entry, month);
  return {
    ...entry,
    monthAmount: expenseAmountForMonth(entry),
    amortizationIndex: offset + 1,
    amortizationMonths: months
  };
}

export function monthTransactions(state) {
  const directRows = state.transactions.filter((entry) => entry.type !== "expense" && entry.date?.startsWith(state.currentMonth));
  const expenseRows = state.transactions
    .filter((entry) => isExpenseActiveInMonth(entry, state.currentMonth))
    .map((entry) => withAmortizationView(entry, state.currentMonth));
  return [...directRows, ...expenseRows];
}

export function transactionDisplayAmount(entry) {
  return Math.abs(Number(entry.monthAmount ?? entry.amount ?? 0));
}

export function ledgerAdvancedFilterCount(filters = {}) {
  let count = 0;
  const hasCustomAmount = String(filters.customAmountMin || "").trim() !== "" || String(filters.customAmountMax || "").trim() !== "";
  if (String(filters.keyword || "").trim()) count += 1;
  if (Array.isArray(filters.accounts) && filters.accounts.length) count += 1;
  if (Array.isArray(filters.accounts) && filters.accounts.length && String(filters.category || "").trim()) count += 1;
  if ((filters.amountRange && filters.amountRange !== "all") || hasCustomAmount) count += 1;
  if (filters.sort && filters.sort !== "newest") count += 1;
  return count;
}

export function applyLedgerAdvancedFilters(rows, filters = {}) {
  const keyword = String(filters.keyword || "").trim().toLowerCase();
  const accounts = Array.isArray(filters.accounts) ? filters.accounts : [];
  const category = accounts.length ? String(filters.category || "").trim() : "";
  const sort = filters.sort || "newest";
  return rows
    .filter((entry) => {
      if (accounts.length && !accounts.includes(ledgerAccountKey(entry))) return false;
      if (category && entry.category !== category) return false;
      if (!matchesLedgerAmountRange(transactionDisplayAmount(entry), filters)) return false;
      if (keyword && !ledgerSearchText(entry).includes(keyword)) return false;
      return true;
    })
    .sort((a, b) => compareLedgerRows(a, b, sort));
}

function ledgerAccountKey(entry) {
  return entry.type === "income" ? "income" : entry.accountId;
}

function matchesLedgerAmountRange(amount, filters) {
  const range = filters.amountRange || "all";
  if (range === "under100") return amount < 100;
  if (range === "100-1000") return amount >= 100 && amount <= 1000;
  if (range === "over1000") return amount > 1000;
  const min = Number(filters.customAmountMin);
  const max = Number(filters.customAmountMax);
  if (Number.isFinite(min) && String(filters.customAmountMin).trim() !== "" && amount < min) return false;
  if (Number.isFinite(max) && String(filters.customAmountMax).trim() !== "" && amount > max) return false;
  return true;
}

function compareLedgerRows(a, b, sort) {
  if (sort === "amountDesc") {
    return transactionDisplayAmount(b) - transactionDisplayAmount(a) || compareLedgerRows(a, b, "newest");
  }
  if (sort === "amountAsc") {
    return transactionDisplayAmount(a) - transactionDisplayAmount(b) || compareLedgerRows(a, b, "newest");
  }
  const dateDiff = String(b.date || "").localeCompare(String(a.date || ""));
  return dateDiff || Number(b.createdAt || 0) - Number(a.createdAt || 0);
}

function ledgerSearchText(entry) {
  const account = entry.type === "income" ? "收入" : accountMeta[entry.accountId]?.title || "";
  const shortAccount = entry.type === "income" ? "收入" : accountMeta[entry.accountId]?.shortTitle || "";
  const investmentKind = entry.type === "investment" ? investmentKinds[entry.investmentKind] || "" : "";
  const typeLabel = entry.type === "income" ? "收入" : entry.type === "investment" ? "投资" : "支出";
  return [
    entry.note,
    entry.category,
    entry.date,
    account,
    shortAccount,
    investmentKind,
    typeLabel
  ].filter(Boolean).join(" ").toLowerCase();
}

export function expenseTransactions(state) {
  return monthTransactions(state).filter((entry) => entry.type === "expense");
}

export function incomeTransactions(state) {
  return monthTransactions(state).filter((entry) => entry.type === "income");
}

export function investmentTransactions(state) {
  return monthTransactions(state).filter((entry) => entry.type === "investment");
}

export function totalBudget(state) {
  const configuredBudget = Number(state.totalBudget);
  if (Number.isFinite(configuredBudget)) return configuredBudget;
  return accountOrder.reduce((sum, id) => sum + Number(state.budgets[id] || 0), 0);
}

export function totalExpense(state) {
  return expenseTransactions(state).reduce((sum, entry) => sum + Number(entry.monthAmount ?? entry.amount ?? 0), 0);
}

export function totalIncome(state) {
  return incomeTransactions(state).reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
}

export function spentByAccount(state, accountId) {
  return expenseTransactions(state)
    .filter((entry) => entry.accountId === accountId)
    .reduce((sum, entry) => sum + Number(entry.monthAmount ?? entry.amount ?? 0), 0);
}

export function dailyExpenseTotal(state) {
  return expenseTransactions(state)
    .filter((entry) => accountMeta[entry.accountId]?.type !== "investment")
    .reduce((sum, entry) => sum + Number(entry.monthAmount ?? entry.amount ?? 0), 0);
}

export function investmentDirection(entry) {
  const kind = entry.investmentKind || "transferIn";
  if (kind === "transferOut") return -1;
  if (kind === "transferIn") return 1;
  return 0;
}

export function investmentFlowTotal(state) {
  return investmentTransactions(state).reduce((sum, entry) => {
    return sum + (investmentDirection(entry) * Number(entry.amount || 0));
  }, 0);
}

export function assetTransferInTotal(state) {
  return investmentTransactions(state)
    .filter((entry) => entry.investmentKind === "transferIn")
    .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
}

export function assetTransferOutTotal(state) {
  return investmentTransactions(state)
    .filter((entry) => entry.investmentKind === "transferOut")
    .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
}

export function assetTransferTotal(state) {
  return assetTransferInTotal(state) - assetTransferOutTotal(state);
}

export function assetBudgetUsageTotal(state) {
  return assetTransferInTotal(state);
}

export function budgetRemaining(state) {
  return totalBudget(state) - dailyExpenseTotal(state) - assetBudgetUsageTotal(state);
}

export function cashBalance(state) {
  return openingCashBalance(state) + monthlyCashFlow(state);
}

export function monthlyCashFlow(state) {
  return totalIncome(state) - dailyExpenseTotal(state) - assetTransferTotal(state);
}

export function openingCashBalance(state) {
  return cashOpeningBalanceForMonth(state, state.currentMonth);
}

export function setOpeningCashBalance(state, month, amount) {
  state.cashOpeningBalances ??= {};
  state.cashCalibratedMonths = Array.isArray(state.cashCalibratedMonths) ? state.cashCalibratedMonths : [];
  const targetMonth = String(month || state.currentMonth).slice(0, 7);
  state.cashOpeningBalances[targetMonth] = Number(amount || 0);
  if (!state.cashCalibratedMonths.includes(targetMonth)) state.cashCalibratedMonths.push(targetMonth);
}

function cashOpeningBalanceForMonth(state, month) {
  const targetMonth = String(month || state.currentMonth || "").slice(0, 7);
  const openings = state.cashOpeningBalances && typeof state.cashOpeningBalances === "object" ? state.cashOpeningBalances : {};
  const calibratedMonths = calibratedCashMonths(state);
  if (hasCashOpeningForMonth(openings, calibratedMonths, targetMonth)) return Number(openings[targetMonth] || 0);

  const targetIndex = monthIndex(targetMonth);
  const priorMonths = Object.keys(openings)
    .filter((key) => hasCashOpeningForMonth(openings, calibratedMonths, key) && monthIndex(key) < targetIndex)
    .sort((a, b) => monthIndex(b) - monthIndex(a));
  const firstTransactionMonth = earliestTransactionMonthBefore(state, targetMonth);
  if (!priorMonths.length && !firstTransactionMonth) return 0;

  const startMonth = priorMonths[0] || firstTransactionMonth;
  let balance = priorMonths[0] ? Number(openings[startMonth] || 0) : 0;
  for (let idx = monthIndex(startMonth); idx < targetIndex; idx += 1) {
    balance += cashFlowForMonth(state, monthFromIndex(idx));
  }
  return balance;
}

function calibratedCashMonths(state) {
  return new Set((Array.isArray(state.cashCalibratedMonths) ? state.cashCalibratedMonths : [])
    .map((month) => String(month || "").slice(0, 7))
    .filter((month) => /^\d{4}-\d{2}$/.test(month)));
}

function hasCashOpeningForMonth(openings, calibratedMonths, month) {
  const key = String(month || "").slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(key) || !Object.prototype.hasOwnProperty.call(openings, key)) return false;
  const amount = Number(openings[key] || 0);
  return amount !== 0 || calibratedMonths.has(key);
}

function earliestTransactionMonthBefore(state, targetMonth) {
  const targetIndex = monthIndex(targetMonth);
  return (state.transactions ?? [])
    .map((entry) => String(entry.date || "").slice(0, 7))
    .filter((month) => /^\d{4}-\d{2}$/.test(month) && monthIndex(month) < targetIndex)
    .sort((a, b) => monthIndex(a) - monthIndex(b))[0] || "";
}

function cashFlowForMonth(state, month) {
  const rows = transactionsForMonth(state, month);
  const income = rows
    .filter((entry) => entry.type === "income")
    .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
  const expense = rows
    .filter((entry) => entry.type === "expense" && accountMeta[entry.accountId]?.type !== "investment")
    .reduce((sum, entry) => sum + Number(entry.monthAmount ?? entry.amount ?? 0), 0);
  const assetTransfer = rows
    .filter((entry) => entry.type === "investment")
    .reduce((sum, entry) => sum + (investmentDirection(entry) * Number(entry.amount || 0)), 0);
  return income - expense - assetTransfer;
}

function transactionsForMonth(state, month) {
  const directRows = state.transactions.filter((entry) => entry.type !== "expense" && entry.date?.startsWith(month));
  const expenseRows = state.transactions
    .filter((entry) => isExpenseActiveInMonth(entry, month))
    .map((entry) => withAmortizationView(entry, month));
  return [...directRows, ...expenseRows];
}

function monthFromIndex(index) {
  const year = Math.floor(index / 12);
  const month = (index % 12) + 1;
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function holdingsMarketValue(state) {
  return (state.assetSnapshot?.holdings ?? []).reduce((s, h) => s + Number(h.marketValue || 0), 0);
}

export function holdingsCostBasis(state) {
  return (state.assetSnapshot?.holdings ?? []).reduce((s, h) => s + Number(h.costBasis || 0), 0);
}

export function investmentPnl(state) {
  const snap = state.assetSnapshot ?? {};
  const history = snap.history ?? [];
  const holdings = snap.holdings ?? [];
  if (history.length > 0 && holdings.length > 0) {
    const currentValue = holdings.reduce((s, h) => s + Number(h.marketValue || 0), 0);
    const [year, month] = (state.currentMonth || "").split("-").map(Number);
    if (year && month) {
      const prevKey = month === 1
        ? `${year - 1}-12`
        : `${year}-${String(month - 1).padStart(2, "0")}`;
      const prev = history.find(h => h.month === prevKey);
      if (prev) return currentValue - prev.value;
    }
  }
  return currentMonthAssetEventPnl(state);
}

export function totalAssetChange(state) {
  return monthlyCashFlow(state) + investmentPnl(state);
}

export function breakdownTotal(state, accountId) {
  const sections = state.accountBreakdowns?.[accountId] ?? [];
  return sections.reduce((sum, items) =>
    sum + (Array.isArray(items) ? items.reduce((s, item) => s + Number(item.amount || 0), 0) : 0), 0);
}

export function spentBySection(state, accountId, sectionTitle) {
  if (accountMeta[accountId]?.type === "investment") {
    return investmentTransactions(state)
      .filter((entry) => investmentSectionTitle(state, entry) === sectionTitle)
      .filter((entry) => entry.investmentKind === "transferIn")
      .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
  }
  return expenseTransactions(state)
    .filter((entry) => entry.accountId === accountId && entry.category === sectionTitle)
    .reduce((sum, entry) => sum + Number(entry.monthAmount ?? entry.amount ?? 0), 0);
}

function currentMonthAssetEventPnl(state) {
  const month = state.currentMonth || "";
  const events = state.assetSnapshot?.assetEvents ?? [];
  return events
    .filter((event) => String(event.date || "").startsWith(month))
    .reduce((sum, event) => {
      if (event.action === "yield" || event.action === "maturity") {
        return sum + Number(event.amount || 0);
      }
      if (event.action === "valuation") {
        return sum + Number(event.pnlDelta || 0);
      }
      return sum;
    }, 0);
}

function investmentSectionTitle(state, entry) {
  if (entry.category) return entry.category;
  const holding = (state.assetSnapshot?.holdings ?? []).find((item) => item.id === entry.holdingId);
  return holding?.category || "未分类资产调动";
}
