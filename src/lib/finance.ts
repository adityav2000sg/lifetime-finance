export type SpaceId = "personal" | "household";
export type ViewScope = SpaceId | "all";
export type AccountType = "checking" | "savings" | "credit" | "investment" | "cash";
export type TransactionType = "expense" | "income" | "transfer";
export type TransactionSource = "manual" | "sheet" | "bank" | "recurring";

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

export interface FinanceData {
  version: 2;
  profile: {
    name: string;
    partnerName: string;
    householdName: string;
    partnerEmail?: string;
    householdStartedAt?: string;
  };
  accounts: Account[];
  transactions: Transaction[];
  goals: Goal[];
  recurring: RecurringItem[];
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
    version: 2,
    profile: {
      name: "Peter",
      partnerName: "MJ",
      householdName: "Parker household",
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
      { id: "goal-home", name: "Our first home", target: 120000, current: 74200, targetDate: "2028-06-01", space: "household", icon: "home" },
      { id: "goal-buffer", name: "Peace-of-mind fund", target: 30000, current: 21600, targetDate: "2027-01-01", space: "household", icon: "shield" },
      { id: "goal-sabbatical", name: "Creative sabbatical", target: 18000, current: 7450, targetDate: "2027-09-01", space: "personal", icon: "spark" },
    ],
    recurring: [
      { id: "r-01", name: "Netflix", amount: 19.98, cadence: "monthly", nextDate: isoDaysAgo(-12), accountId: "dbs-joint", category: "Entertainment", space: "household", active: true },
      { id: "r-02", name: "Gym membership", amount: 118, cadence: "monthly", nextDate: isoDaysAgo(-5), accountId: "revolut-card", category: "Health", space: "personal", active: true },
      { id: "r-03", name: "Home insurance", amount: 680, cadence: "yearly", nextDate: isoDaysAgo(-28), accountId: "dbs-joint", category: "Home", space: "household", active: true },
    ],
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
