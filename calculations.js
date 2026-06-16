import { accountMeta, accountOrder, investmentKinds } from "./state.js?v=budget-analysis1";

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
