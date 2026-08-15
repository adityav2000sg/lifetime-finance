export type SpaceId = "personal" | "household";
export type ViewScope = SpaceId | "all";
export type AccountType = "checking" | "savings" | "credit" | "investment" | "cash" | "property" | "cpf" | "loan" | "insurance" | "other";
export type TransactionType = "expense" | "income" | "transfer";
export type TransactionSource = "manual" | "voice" | "sheet" | "bank" | "receipt" | "recurring";

export interface Account {
  id: string;
  name: string;
  institution: string;
  type: AccountType;
  space: SpaceId;
  owner: string;
  balance: number;
  currency: "SGD";
  last4?: string;
  accent: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  date: string;
  description: string;
  category: string;
  accountId: string;
  transferAccountId?: string;
  space: SpaceId;
  note?: string;
  source: TransactionSource;
}

export interface Goal {
  id: string;
  name: string;
  target: number;
  current: number;
  targetDate: string;
  space: SpaceId;
  icon: string;
  monthlyContribution?: number;
  priority?: "essential" | "important" | "flexible";
}

export interface RecurringItem {
  id: string;
  name: string;
  amount: number;
  cadence: "monthly" | "quarterly" | "yearly";
  nextDate: string;
  accountId: string;
  category: string;
  space: SpaceId;
  active: boolean;
}

export interface SpendingPlan {
  id: string;
  category: string;
  monthlyLimit: number;
  space: SpaceId;
}

export interface PlannedEvent {
  id: string;
  name: string;
  amount: number;
  date: string;
  kind: "travel" | "home" | "family" | "education" | "car" | "other";
  space: SpaceId;
  includeInPlan: boolean;
  note?: string;
}

export interface InboxItem {
  id: string;
  description: string;
  amount: number;
  date: string;
  source: "bank" | "receipt" | "sheet" | "screenshot";
  suggestedType: TransactionType;
  suggestedCategory: string;
  suggestedAccountId?: string;
  space: SpaceId;
  confidence: number;
  status: "review" | "approved" | "dismissed";
  reason: string;
}

export interface FinanceData {
  version: 3;
  profile: {
    name: string;
    partnerName: string;
    householdName: string;
    partnerEmail?: string;
    householdStartedAt?: string;
    voiceLocale?: string;
    voiceLexicon?: string[];
  };
  accounts: Account[];
  transactions: Transaction[];
  goals: Goal[];
  recurring: RecurringItem[];
  spendingPlans: SpendingPlan[];
  plannedEvents: PlannedEvent[];
  inbox: InboxItem[];
}

export const expenseCategories = [
  "Food & dining",
  "Groceries",
  "Transport",
  "Home",
  "Health",
  "Shopping",
  "Travel",
  "Entertainment",
  "Other",
];

export const categoryColors: Record<string, string> = {
  "Food & dining": "#ef8354",
  Groceries: "#82b47d",
  Transport: "#6da8c6",
  Home: "#b6a3d8",
  Health: "#e691a7",
  Shopping: "#e2b75e",
  Travel: "#4fb9a9",
  Entertainment: "#8695c9",
  Other: "#9ba5a0",
};

export const accountTypeLabels: Record<AccountType, string> = {
  checking: "Everyday",
  savings: "Savings",
  credit: "Credit card",
  investment: "Investment",
  cash: "Cash",
  property: "Property",
  cpf: "CPF / pension",
  loan: "Loan / mortgage",
  insurance: "Insurance value",
  other: "Other asset",
};

function isoDaysAgo(days: number) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

function isoMonthsAgo(months: number, day: number) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(1);
  date.setMonth(date.getMonth() - months);
  date.setDate(day);
  return date.toISOString().slice(0, 10);
}

export function createSeedData(): FinanceData {
  return {
    version: 3,
    profile: {
      name: "Peter",
      partnerName: "MJ",
      householdName: "Parker household",
      voiceLocale: "en-SG",
      voiceLexicon: ["Yochi", "kopitiam", "hawker centre", "PayNow", "DBS", "CPF"],
    },
    accounts: [
      {
        id: "dbs-everyday",
        name: "Everyday",
        institution: "DBS",
        type: "checking",
        space: "personal",
        owner: "Peter",
        balance: 12480.4,
        currency: "SGD",
        last4: "2841",
        accent: "mint",
      },
      {
        id: "hsbc-horizon",
        name: "Horizon savings",
        institution: "HSBC",
        type: "savings",
        space: "personal",
        owner: "Peter",
        balance: 48600,
        currency: "SGD",
        last4: "7720",
        accent: "sky",
      },
      {
        id: "revolut-card",
        name: "Daily card",
        institution: "Revolut",
        type: "credit",
        space: "personal",
        owner: "Peter",
        balance: -1240.8,
        currency: "SGD",
        last4: "1908",
        accent: "coral",
      },
      {
        id: "endowus-growth",
        name: "Future fund",
        institution: "Endowus",
        type: "investment",
        space: "personal",
        owner: "Peter",
        balance: 82300,
        currency: "SGD",
        last4: "4412",
        accent: "violet",
      },
      {
        id: "dbs-joint",
        name: "Joint everyday",
        institution: "DBS",
        type: "checking",
        space: "household",
        owner: "Peter + MJ",
        balance: 18750.5,
        currency: "SGD",
        last4: "6632",
        accent: "lime",
      },
      {
        id: "home-fund",
        name: "Home fund",
        institution: "HSBC",
        type: "savings",
        space: "household",
        owner: "Peter + MJ",
        balance: 34500,
        currency: "SGD",
        last4: "5204",
        accent: "gold",
      },
      {
        id: "cpf-oa",
        name: "CPF overview",
        institution: "CPF",
        type: "cpf",
        space: "personal",
        owner: "Peter",
        balance: 68400,
        currency: "SGD",
        accent: "mint",
      },
      {
        id: "home-value",
        name: "Home estimate",
        institution: "Manual valuation",
        type: "property",
        space: "household",
        owner: "Peter + MJ",
        balance: 760000,
        currency: "SGD",
        accent: "sky",
      },
      {
        id: "home-loan",
        name: "Home mortgage",
        institution: "DBS",
        type: "loan",
        space: "household",
        owner: "Peter + MJ",
        balance: -548000,
        currency: "SGD",
        accent: "coral",
      },
    ],
    transactions: [
      { id: "t-01", type: "income", amount: 7600, date: isoDaysAgo(14), description: "Salary", category: "Income", accountId: "dbs-everyday", space: "personal", source: "bank" },
      { id: "t-02", type: "income", amount: 3200, date: isoDaysAgo(13), description: "Household contribution", category: "Income", accountId: "dbs-joint", space: "household", source: "bank" },
      { id: "t-03", type: "transfer", amount: 2500, date: isoDaysAgo(12), description: "Move to joint account", category: "Transfer", accountId: "dbs-everyday", transferAccountId: "dbs-joint", space: "household", source: "bank" },
      { id: "t-04", type: "expense", amount: 86.2, date: isoDaysAgo(10), description: "FairPrice Finest", category: "Groceries", accountId: "dbs-joint", space: "household", source: "bank" },
      { id: "t-05", type: "expense", amount: 18.4, date: isoDaysAgo(9), description: "Grab", category: "Transport", accountId: "revolut-card", space: "personal", source: "bank" },
      { id: "t-06", type: "expense", amount: 142.3, date: isoDaysAgo(8), description: "SP Utilities", category: "Home", accountId: "dbs-joint", space: "household", source: "bank" },
      { id: "t-07", type: "transfer", amount: 1200, date: isoDaysAgo(7), description: "Monthly investing", category: "Transfer", accountId: "dbs-everyday", transferAccountId: "endowus-growth", space: "personal", source: "recurring" },
      { id: "t-08", type: "expense", amount: 12.5, date: isoDaysAgo(6), description: "Tiong Bahru Market", category: "Food & dining", accountId: "revolut-card", space: "personal", source: "bank" },
      { id: "t-09", type: "expense", amount: 112, date: isoDaysAgo(5), description: "Friday dinner", category: "Food & dining", accountId: "dbs-joint", space: "household", source: "manual" },
      { id: "t-10", type: "expense", amount: 95, date: isoDaysAgo(4), description: "Physiotherapy", category: "Health", accountId: "hsbc-horizon", space: "personal", source: "manual" },
      { id: "t-11", type: "expense", amount: 19.98, date: isoDaysAgo(3), description: "Netflix", category: "Entertainment", accountId: "dbs-joint", space: "household", source: "recurring" },
      { id: "t-12", type: "expense", amount: 46.7, date: isoDaysAgo(1), description: "Muji", category: "Shopping", accountId: "revolut-card", space: "personal", source: "bank" },
      { id: "old-01", type: "income", amount: 7600, date: isoMonthsAgo(1, 2), description: "Salary", category: "Income", accountId: "dbs-everyday", space: "personal", source: "bank" },
      { id: "old-02", type: "expense", amount: 1680, date: isoMonthsAgo(1, 8), description: "Monthly living", category: "Home", accountId: "dbs-everyday", space: "personal", source: "bank" },
      { id: "old-03", type: "expense", amount: 740, date: isoMonthsAgo(1, 14), description: "Food and transport", category: "Food & dining", accountId: "revolut-card", space: "personal", source: "bank" },
      { id: "old-04", type: "income", amount: 7600, date: isoMonthsAgo(2, 2), description: "Salary", category: "Income", accountId: "dbs-everyday", space: "personal", source: "bank" },
      { id: "old-05", type: "expense", amount: 2180, date: isoMonthsAgo(2, 10), description: "Monthly living", category: "Home", accountId: "dbs-everyday", space: "personal", source: "bank" },
      { id: "old-06", type: "income", amount: 7200, date: isoMonthsAgo(3, 2), description: "Salary", category: "Income", accountId: "dbs-everyday", space: "personal", source: "bank" },
      { id: "old-07", type: "expense", amount: 3050, date: isoMonthsAgo(3, 12), description: "Monthly living", category: "Home", accountId: "dbs-everyday", space: "personal", source: "bank" },
      { id: "old-08", type: "income", amount: 7200, date: isoMonthsAgo(4, 2), description: "Salary", category: "Income", accountId: "dbs-everyday", space: "personal", source: "bank" },
      { id: "old-09", type: "expense", amount: 2800, date: isoMonthsAgo(4, 18), description: "Monthly living", category: "Home", accountId: "dbs-everyday", space: "personal", source: "bank" },
      { id: "old-10", type: "income", amount: 7200, date: isoMonthsAgo(5, 2), description: "Salary", category: "Income", accountId: "dbs-everyday", space: "personal", source: "bank" },
      { id: "old-11", type: "expense", amount: 3320, date: isoMonthsAgo(5, 16), description: "Monthly living", category: "Home", accountId: "dbs-everyday", space: "personal", source: "bank" },
    ],
    goals: [
      { id: "goal-home", name: "Our next home", target: 120000, current: 74200, targetDate: "2028-06-01", space: "household", icon: "home", monthlyContribution: 1800, priority: "important" },
      { id: "goal-buffer", name: "Peace-of-mind fund", target: 30000, current: 21600, targetDate: "2027-01-01", space: "household", icon: "shield", monthlyContribution: 900, priority: "essential" },
      { id: "goal-sabbatical", name: "Creative sabbatical", target: 18000, current: 7450, targetDate: "2027-09-01", space: "personal", icon: "spark", monthlyContribution: 650, priority: "flexible" },
    ],
    recurring: [
      { id: "r-01", name: "Netflix", amount: 19.98, cadence: "monthly", nextDate: isoDaysAgo(-12), accountId: "dbs-joint", category: "Entertainment", space: "household", active: true },
      { id: "r-02", name: "Gym membership", amount: 118, cadence: "monthly", nextDate: isoDaysAgo(-5), accountId: "revolut-card", category: "Health", space: "personal", active: true },
      { id: "r-03", name: "Home insurance", amount: 680, cadence: "yearly", nextDate: isoDaysAgo(-28), accountId: "dbs-joint", category: "Home", space: "household", active: true },
    ],
    spendingPlans: [
      { id: "plan-food", category: "Food & dining", monthlyLimit: 900, space: "household" },
      { id: "plan-groceries", category: "Groceries", monthlyLimit: 700, space: "household" },
      { id: "plan-transport", category: "Transport", monthlyLimit: 450, space: "personal" },
      { id: "plan-home", category: "Home", monthlyLimit: 1900, space: "household" },
      { id: "plan-fun", category: "Entertainment", monthlyLimit: 320, space: "personal" },
    ],
    plannedEvents: [
      { id: "event-japan", name: "Japan in spring", amount: 12000, date: isoMonthsAgo(-8, 12), kind: "travel", space: "household", includeInPlan: true, note: "Flights, hotels, food and shopping" },
      { id: "event-reno", name: "Kitchen refresh", amount: 18000, date: isoMonthsAgo(-15, 8), kind: "home", space: "household", includeInPlan: true },
    ],
    inbox: [],
  };
}

export function normalizeFinanceData(input: Partial<FinanceData>, fallback: FinanceData): FinanceData {
  return {
    ...fallback,
    ...input,
    version: 3,
    profile: { ...fallback.profile, ...(input.profile || {}) },
    accounts: input.accounts || fallback.accounts,
    transactions: input.transactions || fallback.transactions,
    goals: input.goals || fallback.goals,
    recurring: input.recurring || fallback.recurring,
    spendingPlans: input.spendingPlans || [],
    plannedEvents: input.plannedEvents || [],
    inbox: input.inbox || [],
  };
}

export function monthlyEquivalent(item: RecurringItem) {
  return item.cadence === "monthly" ? item.amount : item.cadence === "quarterly" ? item.amount / 3 : item.amount / 12;
}

// Applies a transaction to account balances. Pass direction -1 to reverse it,
// which is how edits (reverse the old, apply the new) and deletes are handled.
export function applyTransaction(accounts: Account[], transaction: Transaction, direction: 1 | -1 = 1) {
  return accounts.map((account) => {
    if (transaction.type === "expense" && account.id === transaction.accountId) {
      return { ...account, balance: account.balance - transaction.amount * direction };
    }
    if (transaction.type === "income" && account.id === transaction.accountId) {
      return { ...account, balance: account.balance + transaction.amount * direction };
    }
    if (transaction.type === "transfer") {
      if (account.id === transaction.accountId) {
        return { ...account, balance: account.balance - transaction.amount * direction };
      }
      if (account.id === transaction.transferAccountId) {
        return { ...account, balance: account.balance + transaction.amount * direction };
      }
    }
    return account;
  });
}

export interface FinanceForecast {
  averageIncome: number;
  averageSpending: number;
  monthlySurplus: number;
  recurringCost: number;
  liquidBalance: number;
  emergencyMonths: number;
  safeToSpend: number;
  historyMonths: number;
  confidence: "low" | "medium" | "high";
  goalForecasts: Array<{
    goalId: string;
    monthlyContribution: number;
    monthsRemaining: number;
    estimatedDate: string | null;
    onTrack: boolean;
    plannedEventDelayMonths: number;
  }>;
}

export function buildForecast(data: FinanceData, scope: ViewScope): FinanceForecast {
  const accounts = inScope(data.accounts, scope);
  const transactions = inScope(data.transactions, scope).filter((item) => item.type !== "transfer");
  const monthTotals = new Map<string, { income: number; spending: number }>();
  transactions.forEach((item) => {
    const key = monthKey(item.date);
    const value = monthTotals.get(key) || { income: 0, spending: 0 };
    if (item.type === "income") value.income += item.amount;
    if (item.type === "expense") value.spending += item.amount;
    monthTotals.set(key, value);
  });
  // Month keys are YYYY-MM, so sorting them as strings orders them
  // chronologically. Without this the "last six months" would really be the
  // last six months *encountered*, which depends on transaction insertion order.
  const completeishMonths = [...monthTotals.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([, value]) => value)
    .filter((item) => item.income > 0 || item.spending > 0)
    .slice(-6);
  const divisor = Math.max(1, completeishMonths.length);
  const averageIncome = completeishMonths.reduce((sum, item) => sum + item.income, 0) / divisor;
  const averageSpending = completeishMonths.reduce((sum, item) => sum + item.spending, 0) / divisor;
  const recurringCost = inScope(data.recurring, scope).filter((item) => item.active).reduce((sum, item) => sum + monthlyEquivalent(item), 0);
  // Not floored at zero: spending more than you earn must report as a deficit.
  const monthlySurplus = averageIncome - averageSpending;
  const liquidBalance = accounts.filter((item) => ["checking", "savings", "cash"].includes(item.type)).reduce((sum, item) => sum + Math.max(0, item.balance), 0);
  const emergencyMonths = averageSpending > 0 ? liquidBalance / averageSpending : 0;
  const monthlyGoalCommitments = inScope(data.goals, scope).reduce((sum, goal) => sum + (goal.monthlyContribution || 0), 0);
  const safeToSpend = Math.max(0, monthlySurplus - monthlyGoalCommitments);
  const includedEvents = inScope(data.plannedEvents, scope).filter((item) => item.includeInPlan && new Date(`${item.date}T12:00:00`) >= new Date());
  const goalForecasts = inScope(data.goals, scope).map((goal) => {
    const remaining = Math.max(0, goal.target - goal.current);
    const contribution = Math.max(0, goal.monthlyContribution || Math.min(monthlySurplus / Math.max(1, inScope(data.goals, scope).length), remaining));
    const monthsRemaining = remaining === 0 ? 0 : contribution > 0 ? Math.ceil(remaining / contribution) : Number.POSITIVE_INFINITY;
    const plannedCost = includedEvents.filter((event) => event.space === goal.space).reduce((sum, event) => sum + event.amount, 0);
    const plannedEventDelayMonths = contribution > 0 ? Math.ceil(plannedCost / contribution) : 0;
    const estimated = Number.isFinite(monthsRemaining) ? new Date(new Date().getFullYear(), new Date().getMonth() + monthsRemaining + plannedEventDelayMonths, 1) : null;
    return {
      goalId: goal.id,
      monthlyContribution: contribution,
      monthsRemaining,
      estimatedDate: estimated ? estimated.toISOString().slice(0, 10) : null,
      onTrack: estimated ? estimated <= new Date(`${goal.targetDate}T12:00:00`) : false,
      plannedEventDelayMonths,
    };
  });
  return {
    averageIncome,
    averageSpending,
    monthlySurplus,
    recurringCost,
    liquidBalance,
    emergencyMonths,
    safeToSpend,
    historyMonths: completeishMonths.length,
    confidence: completeishMonths.length >= 5 ? "high" : completeishMonths.length >= 3 ? "medium" : "low",
    goalForecasts,
  };
}

export function formatMoney(value: number, compact = false) {
  return new Intl.NumberFormat("en-SG", {
    style: "currency",
    currency: "SGD",
    currencyDisplay: "narrowSymbol",
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: compact ? 1 : 2,
  }).format(value);
}

export function formatDate(date: string, short = false) {
  return new Intl.DateTimeFormat("en-SG", {
    day: "numeric",
    month: short ? "short" : "long",
    year: short ? undefined : "numeric",
  }).format(new Date(`${date}T12:00:00`));
}

export function monthKey(date: string | Date) {
  const parsed = typeof date === "string" ? new Date(`${date}T12:00:00`) : date;
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}`;
}

export function inScope<T extends { space: SpaceId }>(items: T[], scope: ViewScope) {
  return scope === "all" ? items : items.filter((item) => item.space === scope);
}

export function uid(prefix: string) {
  const random = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${random}`;
}
