import { accountMeta, accountOrder, investmentKinds } from "./state.js?v=ledger-detail1";

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
  if (String(filters.keyword || "").trim()) count += 1;
  if (Array.isArray(filters.accounts) && filters.accounts.length) count += 1;
  if (filters.amountRange && filters.amountRange !== "all") count += 1;
  if (filters.sort && filters.sort !== "newest") count += 1;
  return count;
}

export function applyLedgerAdvancedFilters(rows, filters = {}) {
  const keyword = String(filters.keyword || "").trim().toLowerCase();
  const accounts = Array.isArray(filters.accounts) ? filters.accounts : [];
  const amountRange = filters.amountRange || "all";
  const sort = filters.sort || "newest";
  return rows
    .filter((entry) => {
      if (accounts.length && !accounts.includes(ledgerAccountKey(entry))) return false;
      if (!matchesLedgerAmountRange(transactionDisplayAmount(entry), amountRange)) return false;
      if (keyword && !ledgerSearchText(entry).includes(keyword)) return false;
      return true;
    })
    .sort((a, b) => compareLedgerRows(a, b, sort));
}

function ledgerAccountKey(entry) {
  return entry.type === "income" ? "income" : entry.accountId;
}

function matchesLedgerAmountRange(amount, range) {
  if (range === "under100") return amount < 100;
  if (range === "100-500") return amount >= 100 && amount <= 500;
  if (range === "500-2000") return amount >= 500 && amount <= 2000;
  if (range === "over2000") return amount > 2000;
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
  const kind = entry.investmentKind || (entry.category === investmentKinds.redeem ? "redeem" : "buyFund");
  return kind === "redeem" ? -1 : 1;
}

export function investmentFlowTotal(state) {
  return investmentTransactions(state).reduce((sum, entry) => {
    return sum + (investmentDirection(entry) * Number(entry.amount || 0));
  }, 0);
}

export function assetTransferInTotal(state) {
  return Number(state.assetSnapshot?.invested || 0) + investmentTransactions(state)
    .filter((entry) => investmentDirection(entry) > 0)
    .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
}

export function assetTransferOutTotal(state) {
  return investmentTransactions(state)
    .filter((entry) => investmentDirection(entry) < 0)
    .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
}

export function assetTransferTotal(state) {
  return assetTransferInTotal(state) - assetTransferOutTotal(state);
}

export function budgetRemaining(state) {
  return totalBudget(state) - dailyExpenseTotal(state) - assetTransferTotal(state);
}

export function cashBalance(state) {
  return totalIncome(state) - dailyExpenseTotal(state) - assetTransferTotal(state);
}

export function investmentPnl(state) {
  return Number(state.assetSnapshot?.floatingPnl || 0);
}

export function totalAssetChange(state) {
  return cashBalance(state) + investmentPnl(state);
}

export function breakdownTotal(state, accountId) {
  const sections = state.accountBreakdowns?.[accountId] ?? [];
  return sections.reduce((sum, items) =>
    sum + (Array.isArray(items) ? items.reduce((s, item) => s + Number(item.amount || 0), 0) : 0), 0);
}

export function spentBySection(state, accountId, sectionTitle) {
  if (accountMeta[accountId]?.type === "investment") {
    return investmentTransactions(state)
      .filter((entry) => entry.category === sectionTitle && investmentDirection(entry) > 0)
      .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
  }
  return expenseTransactions(state)
    .filter((entry) => entry.accountId === accountId && entry.category === sectionTitle)
    .reduce((sum, entry) => sum + Number(entry.monthAmount ?? entry.amount ?? 0), 0);
}
