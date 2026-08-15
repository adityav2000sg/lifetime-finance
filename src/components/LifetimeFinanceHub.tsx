"use client";

import React, { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Bell,
  CalendarDays,
  Cloud,
  CloudOff,
  ChartNoAxesCombined,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  Download,
  Edit3,
  FileSpreadsheet,
  Gauge,
  Home,
  Inbox,
  Landmark,
  Layers3,
  LayoutDashboard,
  Leaf,
  List,
  LogOut,
  Menu,
  MessageCircle,
  Mic,
  PiggyBank,
  Plus,
  Repeat2,
  ReceiptText,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Target,
  Table2,
  Trash2,
  TrendingUp,
  Upload,
  UserRound,
  Users,
  WalletCards,
  WandSparkles,
  X,
} from "lucide-react";
import {
  Account,
  AccountType,
  FinanceData,
  FinanceForecast,
  Goal,
  InboxItem,
  PlannedEvent,
  RecurringItem,
  SpaceId,
  Transaction,
  TransactionType,
  ViewScope,
  accountTypeLabels,
  buildForecast,
  categoryColors,
  createSeedData,
  expenseCategories,
  formatDate,
  formatMoney,
  inScope,
  monthKey,
  monthlyEquivalent,
  normalizeFinanceData,
  uid,
} from "@/lib/finance";

type ViewId = "today" | "money" | "future" | "coach" | "household";
type MoneySection = "snapshot" | "activity" | "accounts" | "plan" | "inbox";
type ModalId = "capture" | "transaction" | "account" | "goal" | "event" | "recurring" | "import" | "household" | null;
type ActivityMode = "feed" | "ledger";
type ActivityFilter = "all" | TransactionType;
type ActivityPeriod = "month" | "all";

const navItems: { id: ViewId; label: string; icon: React.ElementType }[] = [
  { id: "today", label: "Today", icon: LayoutDashboard },
  { id: "money", label: "Money", icon: WalletCards },
  { id: "future", label: "Future", icon: Target },
  { id: "coach", label: "Coach", icon: WandSparkles },
  { id: "household", label: "Household", icon: Users },
];

const scopeOptions: { id: ViewScope; label: string; shortLabel: string; icon: React.ElementType }[] = [
  { id: "personal", label: "Personal", shortLabel: "Me", icon: UserRound },
  { id: "household", label: "Household", shortLabel: "Us", icon: Users },
  { id: "all", label: "Together", shortLabel: "All", icon: Layers3 },
];

const accountAccents = ["mint", "sky", "coral", "violet", "lime", "gold"];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

type Viewer = {
  userId: string;
  displayName: string;
  email: string;
};

function createViewerSeed(viewer: Viewer) {
  const seed = createSeedData();
  const emailName = viewer.email.split("@")[0];
  const displayName = viewer.displayName === viewer.email ? emailName : viewer.displayName;
  const firstName = displayName.split(/\s+/)[0] || "You";
  return {
    ...seed,
    profile: {
      name: displayName,
      partnerName: "Partner",
      householdName: `${firstName}’s household`,
      partnerEmail: "",
    },
  };
}

function applyTransaction(accounts: Account[], transaction: Transaction, direction: 1 | -1 = 1) {
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

export default function LifetimeFinanceHub({ viewer, signOutPath }: { viewer: Viewer; signOutPath: string }) {
  const [data, setData] = useState<FinanceData>(() => createViewerSeed(viewer));
  const [scope, setScope] = useState<ViewScope>("all");
  const [activeView, setActiveView] = useState<ViewId>("today");
  const [moneySection, setMoneySection] = useState<MoneySection>("snapshot");
  const [modal, setModal] = useState<ModalId>(null);
  const [search, setSearch] = useState("");
  const [activityMode, setActivityMode] = useState<ActivityMode>("feed");
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>("all");
  const [activityPeriod, setActivityPeriod] = useState<ActivityPeriod>("month");
  const [selectedMonth, setSelectedMonth] = useState(() => monthKey(new Date()));
  const [toast, setToast] = useState<string | null>(null);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [goalContribution, setGoalContribution] = useState<string | null>(null);
  const [contributionAmount, setContributionAmount] = useState("");
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [captureDraft, setCaptureDraft] = useState<Partial<Transaction> | null>(null);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"loading" | "saving" | "saved" | "offline">("loading");
  const [householdMembers, setHouseholdMembers] = useState<Array<{ email: string; display_name: string; role: string; status: string }>>([]);
  const [qwenConfigured, setQwenConfigured] = useState(false);
  const loaded = useRef(false);
  const storageKey = `lifetimeFinanceDataV3:${viewer.userId}`;

  useEffect(() => {
    let cancelled = false;
    const defaults = createViewerSeed(viewer);
    async function hydrate() {
      try {
        const response = await fetch("/api/finance", { cache: "no-store" });
        if (!response.ok) throw new Error("cloud unavailable");
        const payload = await response.json() as { data?: Partial<FinanceData> | null; members?: typeof householdMembers };
        if (cancelled) return;
        setData(payload.data ? normalizeFinanceData(payload.data, defaults) : defaults);
        setHouseholdMembers(payload.members || []);
        setSyncStatus("saved");
      } catch {
        const saved = window.localStorage.getItem(storageKey) || window.localStorage.getItem(`lifetimeFinanceDataV2:${viewer.userId}`);
        if (saved) {
          try { setData(normalizeFinanceData(JSON.parse(saved) as Partial<FinanceData>, defaults)); }
          catch { setData(defaults); }
        } else setData(defaults);
        setSyncStatus("offline");
      } finally {
        if (!cancelled) {
          loaded.current = true;
          setHydrated(true);
        }
      }
    }
    hydrate();
    return () => { cancelled = true; };
  }, [storageKey, viewer]);

  useEffect(() => {
    if (!loaded.current || !hydrated) return;
    window.localStorage.setItem(storageKey, JSON.stringify(data));
    setSyncStatus((current) => current === "offline" ? "offline" : "saving");
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/finance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
        if (!response.ok) throw new Error("save failed");
        setSyncStatus("saved");
      } catch { setSyncStatus("offline"); }
    }, 650);
    return () => window.clearTimeout(timer);
  }, [data, hydrated, storageKey]);

  useEffect(() => {
    fetch("/api/coach", { cache: "no-store" }).then((response) => response.ok ? response.json() : null)
      .then((payload: { configured?: boolean } | null) => setQwenConfigured(Boolean(payload?.configured))).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const scopedAccounts = useMemo(() => inScope(data.accounts, scope), [data.accounts, scope]);
  const scopedTransactions = useMemo(() => {
    if (scope === "all") return [...data.transactions].sort((a, b) => b.date.localeCompare(a.date));
    const accountSpaces = new Map(data.accounts.map((account) => [account.id, account.space]));
    return data.transactions
      .filter((transaction) =>
        transaction.space === scope ||
        accountSpaces.get(transaction.accountId) === scope ||
        (transaction.transferAccountId && accountSpaces.get(transaction.transferAccountId) === scope),
      )
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [data.accounts, data.transactions, scope]);
  const scopedGoals = useMemo(() => inScope(data.goals, scope), [data.goals, scope]);
  const scopedRecurring = useMemo(() => inScope(data.recurring, scope), [data.recurring, scope]);
  const scopedPlans = useMemo(() => inScope(data.spendingPlans, scope), [data.spendingPlans, scope]);
  const scopedEvents = useMemo(() => inScope(data.plannedEvents, scope), [data.plannedEvents, scope]);
  const scopedInbox = useMemo(() => inScope(data.inbox, scope), [data.inbox, scope]);
  const forecast = useMemo(() => buildForecast(data, scope), [data, scope]);
  const monthTransactions = useMemo(
    () => scopedTransactions.filter((transaction) => monthKey(transaction.date) === selectedMonth),
    [scopedTransactions, selectedMonth],
  );

  const netWorth = scopedAccounts.reduce((sum, account) => sum + account.balance, 0);
  const monthIncome = monthTransactions
    .filter((transaction) => transaction.type === "income")
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const monthSpending = monthTransactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const monthCashFlow = monthIncome - monthSpending;
  const savingsRate = monthIncome > 0 ? Math.max(0, (monthCashFlow / monthIncome) * 100) : 0;
  const activeRecurringCost = scopedRecurring
    .filter((item) => item.active)
    .reduce((sum, item) => sum + monthlyEquivalent(item), 0);

  const categoryTotals = useMemo(() => {
    const totals = new Map<string, number>();
    monthTransactions
      .filter((transaction) => transaction.type === "expense")
      .forEach((transaction) => totals.set(transaction.category, (totals.get(transaction.category) || 0) + transaction.amount));
    return [...totals.entries()].sort((a, b) => b[1] - a[1]);
  }, [monthTransactions]);

  const visibleTransactions = useMemo(() => {
    const query = search.trim().toLowerCase();
    return scopedTransactions.filter((transaction) => {
      const matchesMonth = activityPeriod === "all" || monthKey(transaction.date) === selectedMonth;
      const matchesType = activityFilter === "all" || transaction.type === activityFilter;
      const matchesSearch = !query || [transaction.description, transaction.category, transaction.note, transaction.source]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
      return matchesMonth && matchesType && matchesSearch;
    });
  }, [scopedTransactions, search, selectedMonth, activityFilter, activityPeriod]);

  const monthSeries = useMemo(() => {
    return Array.from({ length: 6 }, (_, index) => {
      const date = new Date();
      date.setDate(1);
      date.setMonth(date.getMonth() - (5 - index));
      const key = monthKey(date);
      const transactions = scopedTransactions.filter((item) => monthKey(item.date) === key);
      const income = transactions.filter((item) => item.type === "income").reduce((sum, item) => sum + item.amount, 0);
      const spending = transactions.filter((item) => item.type === "expense").reduce((sum, item) => sum + item.amount, 0);
      return {
        key,
        label: date.toLocaleDateString("en-SG", { month: "short" }),
        income,
        spending,
      };
    });
  }, [scopedTransactions]);

  const maxSeriesValue = Math.max(1, ...monthSeries.flatMap((month) => [month.income, month.spending]));
  const currentScope = scopeOptions.find((option) => option.id === scope) || scopeOptions[2];
  const selectedMonthLabel = new Date(`${selectedMonth}-01T12:00:00`).toLocaleDateString("en-SG", { month: "long", year: "numeric" });

  function notify(message: string) {
    setToast(message);
  }

  function openNewTransaction(type?: TransactionType) {
    if (!data.accounts.length) {
      setEditingAccount(null);
      setModal("account");
      notify("Add an account before recording transactions.");
      return;
    }
    setEditingTransaction(null);
    setCaptureDraft(type ? { type } : null);
    if (type) setActivityFilter(type);
    setModal("transaction");
  }

  function openCaptureDraft(draft: Partial<Transaction>) {
    if (!data.accounts.length) {
      setModal("account");
      notify("Add an account before recording transactions.");
      return;
    }
    setEditingTransaction(null);
    setCaptureDraft(draft);
    setModal("transaction");
  }

  function openEditTransaction(transaction: Transaction) {
    setCaptureDraft(null);
    setEditingTransaction(transaction);
    setModal("transaction");
  }

  function saveTransaction(transaction: Transaction) {
    setData((current) => {
      if (editingTransaction) {
        const restoredAccounts = applyTransaction(current.accounts, editingTransaction, -1);
        return {
          ...current,
          accounts: applyTransaction(restoredAccounts, transaction),
          transactions: current.transactions.map((item) => item.id === editingTransaction.id ? transaction : item),
        };
      }
      return {
        ...current,
        accounts: applyTransaction(current.accounts, transaction),
        transactions: [transaction, ...current.transactions],
      };
    });
    setModal(null);
    setEditingTransaction(null);
    notify(editingTransaction ? "Transaction updated and balances recalculated." : transaction.type === "transfer" ? "Transfer recorded — spending stayed unchanged." : "Transaction added.");
  }

  function deleteTransaction(transaction: Transaction) {
    if (!window.confirm(`Delete “${transaction.description}”? Its account balance will be restored.`)) return;
    setData((current) => ({
      ...current,
      accounts: applyTransaction(current.accounts, transaction, -1),
      transactions: current.transactions.filter((item) => item.id !== transaction.id),
    }));
    setEditingTransaction(null);
    notify("Transaction removed and balances restored.");
  }

  function openNewAccount() {
    setEditingAccount(null);
    setModal("account");
  }

  function openEditAccount(account: Account) {
    setEditingAccount(account);
    setModal("account");
  }

  function saveAccount(account: Account) {
    setData((current) => ({
      ...current,
      accounts: editingAccount
        ? current.accounts.map((item) => item.id === editingAccount.id ? account : item)
        : [...current.accounts, account],
    }));
    setModal(null);
    setEditingAccount(null);
    notify(editingAccount ? "Account details updated." : "Account added to your workspace.");
  }

  function saveHousehold(profile: FinanceData["profile"]) {
    setData((current) => ({ ...current, profile }));
    setModal(null);
    notify("Household setup updated.");
  }

  function shiftSelectedMonth(offset: number) {
    const date = new Date(`${selectedMonth}-01T12:00:00`);
    date.setMonth(date.getMonth() + offset);
    setSelectedMonth(monthKey(date));
  }

  function openActivity(filter: ActivityFilter = "all", mode: ActivityMode = "feed") {
    setActivityFilter(filter);
    setActivityMode(mode);
    setActivityPeriod(mode === "ledger" ? "all" : "month");
    setMoneySection("activity");
    setActiveView("money");
  }

  function openImport() {
    if (!data.accounts.length) {
      setEditingAccount(null);
      setModal("account");
      notify("Add an account before importing transactions.");
      return;
    }
    setModal("import");
  }

  function addGoal(goal: Goal) {
    setData((current) => ({ ...current, goals: [...current.goals, goal] }));
    setModal(null);
    notify("Goal created.");
  }

  function addRecurring(item: RecurringItem) {
    setData((current) => ({ ...current, recurring: [...current.recurring, item] }));
    setModal(null);
    notify("Recurring payment added.");
  }

  function addPlannedEvent(item: PlannedEvent) {
    setData((current) => ({ ...current, plannedEvents: [...current.plannedEvents, item] }));
    setModal(null);
    setActiveView("future");
    notify("Future plan added to your forecast.");
  }

  function approveInboxItem(item: InboxItem) {
    if (item.suggestedType === "transfer") {
      const destination = data.accounts.find((account) => account.id !== item.suggestedAccountId && account.institution !== data.accounts.find((source) => source.id === item.suggestedAccountId)?.institution);
      openCaptureDraft({ type: "transfer", amount: item.amount, description: item.description, date: item.date, accountId: item.suggestedAccountId, transferAccountId: destination?.id, source: item.source === "receipt" ? "receipt" : "bank" });
      return;
    }
    openCaptureDraft({ type: item.suggestedType, amount: item.amount, description: item.description, date: item.date, category: item.suggestedCategory, accountId: item.suggestedAccountId, space: item.space, source: item.source === "receipt" ? "receipt" : "bank" });
    setData((current) => ({ ...current, inbox: current.inbox.map((entry) => entry.id === item.id ? { ...entry, status: "approved" } : entry) }));
  }

  function dismissInboxItem(id: string) {
    setData((current) => ({ ...current, inbox: current.inbox.map((item) => item.id === id ? { ...item, status: "dismissed" } : item) }));
    notify("Inbox item dismissed.");
  }

  function saveSpendingPlan(category: string, monthlyLimit: number, planScope: SpaceId) {
    setData((current) => {
      const existing = current.spendingPlans.find((item) => item.category === category && item.space === planScope);
      return {
        ...current,
        spendingPlans: existing
          ? current.spendingPlans.map((item) => item.id === existing.id ? { ...item, monthlyLimit } : item)
          : [...current.spendingPlans, { id: uid("plan"), category, monthlyLimit, space: planScope }],
      };
    });
    notify("Spending plan updated.");
  }

  function fundGoal(goalId: string) {
    const amount = Number(contributionAmount);
    if (!Number.isFinite(amount) || amount <= 0) return;
    setData((current) => ({
      ...current,
      goals: current.goals.map((goal) => goal.id === goalId ? { ...goal, current: Math.min(goal.target, goal.current + amount) } : goal),
    }));
    setGoalContribution(null);
    setContributionAmount("");
    notify("Goal progress updated.");
  }

  function toggleRecurring(id: string) {
    setData((current) => ({
      ...current,
      recurring: current.recurring.map((item) => item.id === id ? { ...item, active: !item.active } : item),
    }));
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `lifetime-finance-${todayIso()}.json`;
    link.click();
    window.URL.revokeObjectURL(url);
    notify("A private backup was downloaded.");
  }

  function resetSample() {
    if (!window.confirm("Clear every sample account, transaction, goal, and recurring payment? Your household profile will stay in place.")) return;
    setData((current) => ({ ...createViewerSeed(viewer), profile: current.profile, accounts: [], transactions: [], goals: [], recurring: [], spendingPlans: [], plannedEvents: [], inbox: [] }));
    setScope("all");
    setActiveView("today");
    notify("Sample data cleared. Add your first account when you’re ready.");
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileMenu ? "sidebar-open" : ""}`}>
        <div className="brand-lockup">
          <span className="brand-mark"><Leaf size={20} strokeWidth={2.4} /></span>
          <div>
            <strong>LIFETIME</strong>
            <span>Finance, for the life you’re building.</span>
          </div>
        </div>

        <nav className="main-nav" aria-label="Main navigation">
          <p className="eyebrow nav-eyebrow">Workspace</p>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={activeView === item.id ? "nav-item nav-active" : "nav-item"}
                onClick={() => { setActiveView(item.id); setMobileMenu(false); }}
              >
                <Icon size={19} />
                <span>{item.label}</span>
                {activeView === item.id && <span className="nav-dot" />}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-grow" />
        <div className="foundation-card">
          <div className="foundation-icon"><Sparkles size={18} /></div>
          <p className="eyebrow">Monthly signal</p>
          <strong>{savingsRate.toFixed(0)}% savings rate</strong>
          <span>You kept {formatMoney(monthCashFlow)} this month.</span>
          <div className="mini-progress"><i style={{ width: `${Math.min(savingsRate, 100)}%` }} /></div>
        </div>

        <div className="profile-chip">
          <span className="avatar">{data.profile.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</span>
          <div><strong>{data.profile.name}</strong><small>{viewer.email}</small></div>
          <span className="profile-actions"><button className="signout-button" onClick={() => { setModal("household"); setMobileMenu(false); }} aria-label="Household settings" title="Household settings"><Settings2 size={17} /></button><a className="signout-button" href={signOutPath} aria-label="Sign out of ChatGPT" title="Sign out"><LogOut size={17} /></a></span>
        </div>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <button className="icon-button mobile-menu-button" onClick={() => setMobileMenu((open) => !open)} aria-label="Open navigation">
            <Menu size={21} />
          </button>

          <div className="scope-switcher" aria-label="Financial view">
            {scopeOptions.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.id}
                  className={scope === option.id ? "scope-option scope-active" : "scope-option"}
                  onClick={() => { setScope(option.id); if (option.id === "household" && !data.profile.householdStartedAt) setModal("household"); }}
                  aria-pressed={scope === option.id}
                >
                  <Icon size={15} />
                  <span className="scope-long">{option.label}</span>
                  <span className="scope-short">{option.shortLabel}</span>
                </button>
              );
            })}
          </div>

          <div className="top-actions">
            <span className={`sync-pill sync-${syncStatus}`} title={syncStatus === "saved" ? "Saved across your signed-in devices" : syncStatus === "offline" ? "Using the private on-device backup" : "Saving changes"}>
              {syncStatus === "offline" ? <CloudOff size={15} /> : <Cloud size={15} />}
              <span>{syncStatus === "saved" ? "Saved" : syncStatus === "saving" ? "Saving" : syncStatus === "offline" ? "On device" : "Loading"}</span>
            </span>
            <button className="icon-button" onClick={() => notify("You’re all caught up.")} aria-label="Notifications"><Bell size={19} /><span className="notification-dot" /></button>
            <button className="primary-button compact-button capture-button" onClick={() => setModal("capture")}><Mic size={18} /> Capture</button>
          </div>
        </header>

        <main className="content">
          {activeView === "today" && (
            <Overview
              scope={scope}
              scopeLabel={currentScope.label}
              profileName={data.profile.name}
              selectedMonth={selectedMonth}
              selectedMonthLabel={selectedMonthLabel}
              setSelectedMonth={setSelectedMonth}
              shiftMonth={shiftSelectedMonth}
              netWorth={netWorth}
              monthIncome={monthIncome}
              monthSpending={monthSpending}
              monthCashFlow={monthCashFlow}
              savingsRate={savingsRate}
              accounts={scopedAccounts}
              transactions={scopedTransactions}
              goals={scopedGoals}
              recurring={scopedRecurring}
              categoryTotals={categoryTotals}
              onAdd={() => openNewTransaction()}
              onView={(view) => setActiveView(view)}
              onMetric={openActivity}
              goalContribution={goalContribution}
              setGoalContribution={setGoalContribution}
              contributionAmount={contributionAmount}
              setContributionAmount={setContributionAmount}
              fundGoal={fundGoal}
              data={data}
              forecast={forecast}
              onCapture={() => setModal("capture")}
            />
          )}

          {activeView === "money" && (
            <MoneyView
              section={moneySection}
              setSection={setMoneySection}
              accounts={scopedAccounts}
              allAccounts={data.accounts}
              transactions={visibleTransactions}
              monthTransactions={monthTransactions}
              plans={scopedPlans}
              inbox={scopedInbox}
              netWorth={netWorth}
              monthIncome={monthIncome}
              monthSpending={monthSpending}
              search={search}
              setSearch={setSearch}
              onAdd={() => openNewTransaction()}
              onImport={openImport}
              onDelete={deleteTransaction}
              onEditTransaction={openEditTransaction}
              onAddAccount={openNewAccount}
              onEditAccount={openEditAccount}
              selectedMonthLabel={selectedMonthLabel}
              selectedMonth={selectedMonth}
              setSelectedMonth={setSelectedMonth}
              shiftMonth={shiftSelectedMonth}
              mode={activityMode}
              setMode={setActivityMode}
              filter={activityFilter}
              setFilter={setActivityFilter}
              period={activityPeriod}
              setPeriod={setActivityPeriod}
              onApproveInbox={approveInboxItem}
              onDismissInbox={dismissInboxItem}
              onSavePlan={saveSpendingPlan}
              onExport={exportData}
              onReset={resetSample}
              scope={scope}
            />
          )}

          {activeView === "future" && (
            <FutureView
              goals={scopedGoals}
              recurring={scopedRecurring}
              events={scopedEvents}
              accounts={data.accounts}
              forecast={forecast}
              recurringCost={activeRecurringCost}
              onAddGoal={() => setModal("goal")}
              onAddEvent={() => setModal("event")}
              onAddRecurring={() => setModal("recurring")}
              onToggleRecurring={toggleRecurring}
              goalContribution={goalContribution}
              setGoalContribution={setGoalContribution}
              contributionAmount={contributionAmount}
              setContributionAmount={setContributionAmount}
              fundGoal={fundGoal}
              onToggleEvent={(id) => setData((current) => ({ ...current, plannedEvents: current.plannedEvents.map((item) => item.id === id ? { ...item, includeInPlan: !item.includeInPlan } : item) }))}
            />
          )}

          {activeView === "coach" && (
            <CoachView data={data} scope={scope} forecast={forecast} categoryTotals={categoryTotals} qwenConfigured={qwenConfigured} onCapture={() => setModal("capture")} />
          )}

          {activeView === "household" && (
            <HouseholdView data={data} accounts={scopedAccounts} members={householdMembers} onSetup={() => setModal("household")} onEditAccount={openEditAccount} />
          )}
        </main>
      </div>

      <nav className="mobile-nav" aria-label="Mobile navigation">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button key={item.id} className={activeView === item.id ? "mobile-nav-active" : ""} onClick={() => setActiveView(item.id)}>
              <Icon size={20} /><span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <button className="mobile-fab voice-fab" onClick={() => setModal("capture")} aria-label="Capture with voice or text"><Mic size={24} /></button>

      {modal === "capture" && <CaptureModal accounts={data.accounts} profile={data.profile} scope={scope} qwenConfigured={qwenConfigured} onClose={() => setModal(null)} onTransaction={(draft) => openCaptureDraft(draft)} onPlan={(event) => addPlannedEvent(event)} onAsk={(prompt) => { setModal(null); setActiveView("coach"); window.setTimeout(() => window.dispatchEvent(new CustomEvent("lifetime-coach-question", { detail: prompt })), 100); }} onProfile={(profile) => setData((current) => ({ ...current, profile }))} />}
      {modal === "transaction" && <TransactionModal initial={editingTransaction || captureDraft} accounts={data.accounts} scope={scope} onClose={() => { setModal(null); setEditingTransaction(null); setCaptureDraft(null); }} onSubmit={saveTransaction} />}
      {modal === "account" && <AccountModal initial={editingAccount} scope={scope} profileName={data.profile.name} partnerName={data.profile.partnerName} onClose={() => { setModal(null); setEditingAccount(null); }} onSubmit={saveAccount} />}
      {modal === "goal" && <GoalModal scope={scope} onClose={() => setModal(null)} onSubmit={addGoal} />}
      {modal === "event" && <PlannedEventModal scope={scope} onClose={() => setModal(null)} onSubmit={addPlannedEvent} />}
      {modal === "recurring" && <RecurringModal scope={scope} accounts={data.accounts} onClose={() => setModal(null)} onSubmit={addRecurring} />}
      {modal === "import" && <ImportModal data={data} scope={scope} onClose={() => setModal(null)} setData={setData} notify={notify} />}
      {modal === "household" && <HouseholdModal profile={data.profile} viewerEmail={viewer.email} onClose={() => setModal(null)} onSubmit={saveHousehold} />}

      {toast && <div className="toast"><Check size={17} />{toast}</div>}
    </div>
  );
}

function Overview({
  scope,
  scopeLabel,
  profileName,
  selectedMonth,
  selectedMonthLabel,
  setSelectedMonth,
  shiftMonth,
  netWorth,
  monthIncome,
  monthSpending,
  monthCashFlow,
  savingsRate,
  accounts,
  transactions,
  goals,
  recurring,
  categoryTotals,
  onAdd,
  onView,
  onMetric,
  goalContribution,
  setGoalContribution,
  contributionAmount,
  setContributionAmount,
  fundGoal,
  data,
  forecast,
  onCapture,
}: {
  scope: ViewScope;
  scopeLabel: string;
  profileName: string;
  selectedMonth: string;
  selectedMonthLabel: string;
  setSelectedMonth: (value: string) => void;
  shiftMonth: (offset: number) => void;
  netWorth: number;
  monthIncome: number;
  monthSpending: number;
  monthCashFlow: number;
  savingsRate: number;
  accounts: Account[];
  transactions: Transaction[];
  goals: Goal[];
  recurring: RecurringItem[];
  categoryTotals: [string, number][];
  onAdd: () => void;
  onView: (view: ViewId) => void;
  onMetric: (filter: ActivityFilter, mode?: ActivityMode) => void;
  goalContribution: string | null;
  setGoalContribution: (id: string | null) => void;
  contributionAmount: string;
  setContributionAmount: (value: string) => void;
  fundGoal: (id: string) => void;
  data: FinanceData;
  forecast: FinanceForecast;
  onCapture: () => void;
}) {
  const today = new Date();
  const firstName = profileName.split(" ")[0];
  const scopeCopy = scope === "all" ? "your whole financial life" : scope === "household" ? "the life you’re building together" : "your personal foundation";
  const goal = goals[0];

  return (
    <div className="page-stack">
      <section className="hero-card">
        <div className="hero-orb hero-orb-one" />
        <div className="hero-orb hero-orb-two" />
        <div className="hero-grid" />
        <div className="hero-content">
          <div>
            <p className="eyebrow hero-eyebrow">{today.toLocaleDateString("en-SG", { weekday: "long", day: "numeric", month: "long" })}</p>
            <h1>Good morning, {firstName}.</h1>
            <p className="hero-copy">Here’s how {scopeCopy} is growing.</p>
          </div>
          <div className="hero-balance">
            <div className="hero-label-row"><span>{scopeLabel} net worth</span><span className="live-pill"><i /> Live overview</span></div>
            <strong>{formatMoney(netWorth)}</strong>
            <p><TrendingUp size={16} /> Up 4.8% over the last 90 days</p>
          </div>
        </div>
        <div className="hero-actions">
          <button className="hero-button" onClick={onCapture}><Mic size={18} /> Tell Lifetime</button>
          <button className="hero-secondary" onClick={() => onView("money")}>Explore your money <ChevronRight size={17} /></button>
        </div>
      </section>

      <section className="coach-glance">
        <div className="coach-glance-icon"><WandSparkles size={21} /></div>
        <div>
          <p className="eyebrow">Lifetime outlook</p>
          <h2>{forecast.safeToSpend > 0 ? `${formatMoney(forecast.safeToSpend)} is flexible each month.` : "Your current commitments use the monthly surplus."}</h2>
          <p>You have {forecast.emergencyMonths.toFixed(1)} months of liquid cover. {forecast.goalForecasts.some((item) => !item.onTrack) ? "At least one goal needs a timing or contribution adjustment." : "Your modelled goals are currently on track."}</p>
        </div>
        <button className="secondary-button" onClick={() => onView("coach")}>Ask Coach <ChevronRight size={16} /></button>
      </section>

      <div className="month-row">
        <div>
          <p className="eyebrow">Monthly pulse</p>
          <h2>{selectedMonthLabel}</h2>
        </div>
        <div className="month-controls">
          <button className="month-arrow" onClick={() => shiftMonth(-1)} aria-label="Previous month"><ChevronLeft size={18} /></button>
          <label className="month-picker"><CalendarDays size={17} /><span>Change month</span><input type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} aria-label="Choose month" /></label>
          <button className="month-arrow" onClick={() => shiftMonth(1)} aria-label="Next month"><ChevronRight size={18} /></button>
        </div>
      </div>

      <section className="metric-grid">
        <MetricCard label="Income" value={monthIncome} note="Open income activity" tone="green" icon={<ArrowDownLeft size={19} />} onClick={() => onMetric("income")} />
        <MetricCard label="Spending" value={monthSpending} note={`${transactions.filter((item) => item.type === "expense" && monthKey(item.date) === selectedMonth).length} transactions · open`} tone="coral" icon={<ArrowUpRight size={19} />} onClick={() => onMetric("expense")} />
        <MetricCard label="Cash flow" value={monthCashFlow} note="Open full ledger" tone="blue" icon={<ArrowLeftRight size={19} />} onClick={() => onMetric("all", "ledger")} />
        <MetricCard label="Savings rate" value={savingsRate} suffix="%" note="Open Coach" tone="gold" icon={<PiggyBank size={19} />} money={false} onClick={() => onView("coach")} />
      </section>

      <div className="dashboard-grid">
        <section className="panel accounts-panel">
          <PanelHeading eyebrow="Accounts" title="Where your money lives" action="See all" onAction={() => onView("money")} />
          <div className="account-list">
            {accounts.length ? accounts.slice(0, 4).map((account) => <AccountRow key={account.id} account={account} />) : <EmptyState icon={<WalletCards />} title="Add your first account" copy="Start with a bank, card, cash, or investment account." />}
          </div>
        </section>

        <section className="panel spending-panel">
          <PanelHeading eyebrow="Spending" title="This month by category" action="Open Money" onAction={() => onView("money")} />
          {categoryTotals.length ? (
            <>
              <div className="category-meter" aria-label="Spending category breakdown">
                {categoryTotals.map(([category, amount]) => (
                  <i key={category} style={{ width: `${(amount / Math.max(monthSpending, 1)) * 100}%`, background: categoryColors[category] || categoryColors.Other }} />
                ))}
              </div>
              <div className="category-list">
                {categoryTotals.slice(0, 5).map(([category, amount]) => (
                  <div key={category}><span><i style={{ background: categoryColors[category] || categoryColors.Other }} />{category}</span><strong>{formatMoney(amount)}</strong></div>
                ))}
              </div>
            </>
          ) : <EmptyState icon={<CircleDollarSign />} title="No spending yet" copy="Add an expense to see the pattern." />}
        </section>

        <section className="panel activity-panel">
          <PanelHeading eyebrow="Activity" title="Recent transactions" action="See all" onAction={() => onView("money")} />
          <div className="transaction-list compact-list">
            {transactions.length ? transactions.slice(0, 6).map((transaction) => <TransactionRow key={transaction.id} transaction={transaction} accounts={data.accounts} />) : <EmptyState icon={<ArrowLeftRight />} title="No activity yet" copy="Transactions you add or import will appear here." />}
          </div>
        </section>

        <section className="panel goal-panel">
          <PanelHeading eyebrow="Next milestone" title={goal ? goal.name : "Create your first goal"} action="Open Future" onAction={() => onView("future")} />
          {goal ? (
            <GoalCard
              goal={goal}
              compact
              contributionOpen={goalContribution === goal.id}
              onContribution={() => setGoalContribution(goalContribution === goal.id ? null : goal.id)}
              contributionAmount={contributionAmount}
              setContributionAmount={setContributionAmount}
              fundGoal={() => fundGoal(goal.id)}
            />
          ) : <EmptyState icon={<Target />} title="A future worth funding" copy="Set a shared or personal goal." />}
        </section>

        <section className="panel recurring-panel">
          <PanelHeading eyebrow="On the horizon" title="Upcoming payments" action="Manage" onAction={() => onView("future")} />
          <div className="upcoming-list">
            {recurring.some((item) => item.active) ? recurring.filter((item) => item.active).slice(0, 3).map((item) => (
              <div key={item.id}>
                <span className="date-tile"><strong>{new Date(`${item.nextDate}T12:00:00`).getDate()}</strong><small>{new Date(`${item.nextDate}T12:00:00`).toLocaleDateString("en-SG", { month: "short" })}</small></span>
                <span className="upcoming-name"><strong>{item.name}</strong><small>{item.cadence}</small></span>
                <strong>{formatMoney(item.amount)}</strong>
              </div>
            )) : <EmptyState icon={<Repeat2 />} title="Nothing scheduled" copy="Add recurring bills to see what’s coming." />}
          </div>
        </section>
      </div>
    </div>
  );
}

function MoneyView({ section, setSection, accounts, allAccounts, transactions, monthTransactions, plans, inbox, netWorth, monthIncome, monthSpending, search, setSearch, onAdd, onImport, onDelete, onEditTransaction, onAddAccount, onEditAccount, selectedMonthLabel, selectedMonth, setSelectedMonth, shiftMonth, mode, setMode, filter, setFilter, period, setPeriod, onApproveInbox, onDismissInbox, onSavePlan, onExport, onReset, scope }: {
  section: MoneySection;
  setSection: (section: MoneySection) => void;
  accounts: Account[];
  allAccounts: Account[];
  transactions: Transaction[];
  monthTransactions: Transaction[];
  plans: FinanceData["spendingPlans"];
  inbox: InboxItem[];
  netWorth: number;
  monthIncome: number;
  monthSpending: number;
  search: string;
  setSearch: (value: string) => void;
  onAdd: () => void;
  onImport: () => void;
  onDelete: (transaction: Transaction) => void;
  onEditTransaction: (transaction: Transaction) => void;
  onAddAccount: () => void;
  onEditAccount: (account: Account) => void;
  selectedMonthLabel: string;
  selectedMonth: string;
  setSelectedMonth: (value: string) => void;
  shiftMonth: (offset: number) => void;
  mode: ActivityMode;
  setMode: (mode: ActivityMode) => void;
  filter: ActivityFilter;
  setFilter: (filter: ActivityFilter) => void;
  period: ActivityPeriod;
  setPeriod: (period: ActivityPeriod) => void;
  onApproveInbox: (item: InboxItem) => void;
  onDismissInbox: (id: string) => void;
  onSavePlan: (category: string, amount: number, scope: SpaceId) => void;
  onExport: () => void;
  onReset: () => void;
  scope: ViewScope;
}) {
  const tabs: Array<{ id: MoneySection; label: string; icon: React.ElementType; count?: number }> = [
    { id: "snapshot", label: "Snapshot", icon: Gauge },
    { id: "activity", label: "Activity", icon: ArrowLeftRight },
    { id: "accounts", label: "Accounts", icon: WalletCards },
    { id: "plan", label: "Spending plan", icon: PiggyBank },
    { id: "inbox", label: "Inbox", icon: Inbox, count: inbox.filter((item) => item.status === "review").length },
  ];
  const assets = accounts.filter((account) => account.balance >= 0);
  const liabilities = accounts.filter((account) => account.balance < 0);
  const reviewItems = inbox.filter((item) => item.status === "review");

  return (
    <div className="page-stack">
      <PageHeading eyebrow="The full picture" title="Money" copy="Balances, transactions, spending decisions and incoming data—one trusted ledger.">
        <button className="secondary-button" onClick={onImport}><Upload size={17} /> Import</button>
        <button className="primary-button" onClick={onAdd}><Plus size={17} /> Transaction</button>
      </PageHeading>
      <div className="section-tabs money-tabs" role="tablist" aria-label="Money sections">
        {tabs.map(({ id, label, icon: Icon, count }) => <button key={id} className={section === id ? "section-tab section-tab-active" : "section-tab"} onClick={() => setSection(id)} role="tab" aria-selected={section === id}><Icon size={17} />{label}{Boolean(count) && <span>{count}</span>}</button>)}
      </div>

      {section === "snapshot" && <>
        <section className="money-snapshot-grid">
          <div className="money-total-card"><p className="eyebrow">Net worth</p><strong>{formatMoney(netWorth)}</strong><span>Assets {formatMoney(assets.reduce((sum, item) => sum + item.balance, 0))} · Liabilities {formatMoney(Math.abs(liabilities.reduce((sum, item) => sum + item.balance, 0)))}</span></div>
          <div className="money-mini-card"><span><ArrowDownLeft size={17} /> Income</span><strong>{formatMoney(monthIncome)}</strong><small>{selectedMonthLabel}</small></div>
          <div className="money-mini-card"><span><ArrowUpRight size={17} /> Spending</span><strong>{formatMoney(monthSpending)}</strong><small>Transfers excluded</small></div>
          <button className="money-mini-card actionable-card" onClick={() => setSection("inbox")}><span><Inbox size={17} /> Needs review</span><strong>{reviewItems.length}</strong><small>Keep the ledger trustworthy</small></button>
        </section>
        <div className="dashboard-grid">
          <section className="panel accounts-panel">
            <PanelHeading eyebrow="Balance sheet" title="Assets and liabilities" action="Manage" onAction={() => setSection("accounts")} />
            <div className="account-list">
              {accounts.slice(0, 7).map((account) => <button className="account-edit-row" key={account.id} onClick={() => onEditAccount(account)}><AccountRow account={account} /></button>)}
              {!accounts.length && <EmptyState icon={<WalletCards />} title="Build your balance sheet" copy="Add cash, cards, CPF, investments, property, insurance values and loans." />}
            </div>
          </section>
          <section className="panel spending-panel">
            <PanelHeading eyebrow="Plan vs actual" title="This month" action="Edit plan" onAction={() => setSection("plan")} />
            <SpendingPlanList plans={plans} transactions={monthTransactions} compact onSave={onSavePlan} scope={scope} />
          </section>
        </div>
        <section className="panel inbox-panel">
          <PanelHeading eyebrow="Financial inbox" title="New information, before it changes your story" action="Review all" onAction={() => setSection("inbox")} />
          <InboxList items={reviewItems.slice(0, 3)} accounts={allAccounts} onApprove={onApproveInbox} onDismiss={onDismissInbox} />
        </section>
        <section className="data-controls"><div><p className="eyebrow">Your data</p><strong>Start clean or keep a private backup.</strong><span>Sample data is only a first-run tour. Clearing it preserves your profile and household setup.</span></div><div><button className="secondary-button" onClick={onExport}><Download size={16} /> Download backup</button><button className="secondary-button danger-button" onClick={onReset}><Trash2 size={16} /> Clear sample data</button></div></section>
      </>}

      {section === "activity" && <ActivityView transactions={transactions} accounts={allAccounts} search={search} setSearch={setSearch} onAdd={onAdd} onImport={onImport} onDelete={onDelete} onEdit={onEditTransaction} selectedMonthLabel={selectedMonthLabel} selectedMonth={selectedMonth} setSelectedMonth={setSelectedMonth} shiftMonth={shiftMonth} mode={mode} setMode={setMode} filter={filter} setFilter={setFilter} period={period} setPeriod={setPeriod} />}
      {section === "accounts" && <AccountsView accounts={accounts} netWorth={netWorth} onAdd={onAddAccount} onEdit={onEditAccount} />}
      {section === "plan" && <section className="panel plan-editor-panel"><PanelHeading eyebrow="A plan, not a punishment" title="Monthly spending boundaries" /><SpendingPlanList plans={plans} transactions={monthTransactions} onSave={onSavePlan} scope={scope} /></section>}
      {section === "inbox" && <section className="panel inbox-panel full-inbox"><div className="inbox-intro"><span className="import-icon"><Inbox size={22} /></span><div><strong>Review before it reaches the ledger</strong><p>Imported statements, receipts, screenshots and future bank connections arrive here. Lifetime checks duplicates, categorisation and possible transfers first.</p></div></div><InboxList items={reviewItems} accounts={allAccounts} onApprove={onApproveInbox} onDismiss={onDismissInbox} />{!reviewItems.length && <EmptyState icon={<Check />} title="Inbox zero" copy="Everything has been reviewed. Your numbers are up to date." />}</section>}
    </div>
  );
}

function SpendingPlanList({ plans, transactions, compact = false, onSave, scope }: { plans: FinanceData["spendingPlans"]; transactions: Transaction[]; compact?: boolean; onSave: (category: string, amount: number, scope: SpaceId) => void; scope: ViewScope }) {
  const spending = new Map<string, number>();
  transactions.filter((item) => item.type === "expense").forEach((item) => spending.set(item.category, (spending.get(item.category) || 0) + item.amount));
  const visible = plans.length ? plans : expenseCategories.slice(0, compact ? 4 : 7).map((category, index) => ({ id: category, category, monthlyLimit: [800, 650, 400, 1700, 300, 450, 500][index], space: scope === "household" ? "household" as const : "personal" as const }));
  return <div className="plan-list">{visible.slice(0, compact ? 5 : undefined).map((plan) => <SpendingPlanRow key={plan.id} plan={plan} spent={spending.get(plan.category) || 0} onSave={onSave} />)}</div>;
}

function SpendingPlanRow({ plan, spent, onSave }: { plan: FinanceData["spendingPlans"][number]; spent: number; onSave: (category: string, amount: number, scope: SpaceId) => void }) {
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState(String(plan.monthlyLimit));
  const ratio = plan.monthlyLimit > 0 ? spent / plan.monthlyLimit : 0;
  return <div className="plan-row"><div className="plan-row-top"><span><i style={{ background: categoryColors[plan.category] || categoryColors.Other }} />{plan.category}<small>{formatMoney(spent)} spent</small></span>{editing ? <span className="inline-plan-edit"><input autoFocus type="number" min="0" value={amount} onChange={(event) => setAmount(event.target.value)} aria-label={`${plan.category} monthly plan`} /><button onClick={() => { onSave(plan.category, Number(amount) || 0, plan.space); setEditing(false); }}><Check size={15} /></button></span> : <button onClick={() => setEditing(true)}>{formatMoney(plan.monthlyLimit)} <Edit3 size={14} /></button>}</div><div className="plan-progress"><i className={ratio > 1 ? "over-plan" : ""} style={{ width: `${Math.min(100, ratio * 100)}%`, background: categoryColors[plan.category] || categoryColors.Other }} /></div><small>{ratio > 1 ? `${formatMoney(spent - plan.monthlyLimit)} over` : `${formatMoney(Math.max(0, plan.monthlyLimit - spent))} left`}</small></div>;
}

function InboxList({ items, accounts, onApprove, onDismiss }: { items: InboxItem[]; accounts: Account[]; onApprove: (item: InboxItem) => void; onDismiss: (id: string) => void }) {
  if (!items.length) return null;
  return <div className="inbox-list">{items.map((item) => <div className="inbox-row" key={item.id}><span className="inbox-source">{item.source === "receipt" ? <ReceiptText size={19} /> : item.source === "bank" ? <Landmark size={19} /> : item.source === "sheet" ? <FileSpreadsheet size={19} /> : <CreditCard size={19} />}</span><span className="inbox-copy"><strong>{item.description}</strong><small>{item.reason} · {Math.round(item.confidence * 100)}% confidence</small><span>{item.suggestedType} · {item.suggestedCategory} · {accounts.find((account) => account.id === item.suggestedAccountId)?.name || "Choose account"}</span></span><strong className={item.suggestedType === "income" ? "amount-income" : ""}>{formatMoney(item.amount)}</strong><span className="inbox-actions"><button className="secondary-button" onClick={() => onDismiss(item.id)}>Dismiss</button><button className="primary-button" onClick={() => onApprove(item)}>Review</button></span></div>)}</div>;
}

function FutureView({ goals, recurring, events, accounts, forecast, recurringCost, onAddGoal, onAddEvent, onAddRecurring, onToggleRecurring, goalContribution, setGoalContribution, contributionAmount, setContributionAmount, fundGoal, onToggleEvent }: {
  goals: Goal[]; recurring: RecurringItem[]; events: PlannedEvent[]; accounts: Account[]; forecast: FinanceForecast; recurringCost: number; onAddGoal: () => void; onAddEvent: () => void; onAddRecurring: () => void; onToggleRecurring: (id: string) => void; goalContribution: string | null; setGoalContribution: (id: string | null) => void; contributionAmount: string; setContributionAmount: (value: string) => void; fundGoal: (id: string) => void; onToggleEvent: (id: string) => void;
}) {
  const plannedTotal = events.filter((item) => item.includeInPlan).reduce((sum, item) => sum + item.amount, 0);
  return <div className="page-stack"><PageHeading eyebrow="From today to someday" title="Future" copy="Goals, life plans and scenarios share one model, so every choice reveals its trade-off."><button className="secondary-button" onClick={onAddEvent}><CalendarDays size={17} /> Plan an event</button><button className="primary-button" onClick={onAddGoal}><Target size={17} /> New goal</button></PageHeading>
    <section className="future-hero"><div><p className="eyebrow hero-eyebrow">Forecast runway</p><h2>{formatMoney(forecast.monthlySurplus)} monthly surplus</h2><p>Based on {forecast.historyMonths} month{forecast.historyMonths === 1 ? "" : "s"} of activity · {forecast.confidence} confidence</p></div><div className="future-stat"><span>Safe to spend</span><strong>{formatMoney(forecast.safeToSpend)}</strong><small>after goal contributions</small></div><div className="future-stat"><span>Emergency cover</span><strong>{forecast.emergencyMonths.toFixed(1)} months</strong><small>{formatMoney(forecast.liquidBalance)} liquid</small></div></section>
    <section className="goal-runway-grid">{goals.map((goal) => { const model = forecast.goalForecasts.find((item) => item.goalId === goal.id); return <div className="runway-card" key={goal.id}><div className="runway-top"><span className={`goal-symbol goal-${goal.icon}`}><Target size={18} /></span><span className={model?.onTrack ? "status-on-track" : "status-watch"}>{model?.onTrack ? "On track" : "Needs attention"}</span></div><h3>{goal.name}</h3><strong>{model?.estimatedDate ? new Date(`${model.estimatedDate}T12:00:00`).toLocaleDateString("en-SG", { month: "long", year: "numeric" }) : "No forecast yet"}</strong><p>{model?.plannedEventDelayMonths ? `Planned events add about ${model.plannedEventDelayMonths} months.` : "No planned event delay modelled."}</p><div className="goal-progress"><i style={{ width: `${Math.min(100, (goal.current / goal.target) * 100)}%` }} /></div><small>{formatMoney(goal.current)} of {formatMoney(goal.target)}</small></div>; })}{!goals.length && <EmptyState icon={<Target />} title="Give the future a number" copy="Create a goal and Lifetime will estimate when you can reach it." />}</section>
    <div className="dashboard-grid"><section className="panel scenario-panel"><PanelHeading eyebrow="Scenario lab" title="What your plans change" action="Add event" onAction={onAddEvent} /><div className="scenario-summary"><span>Included life plans</span><strong>{formatMoney(plannedTotal)}</strong><small>Turn an event off to compare the forecast without it.</small></div><div className="event-list">{events.map((event) => <button className={event.includeInPlan ? "event-row" : "event-row event-muted"} key={event.id} onClick={() => onToggleEvent(event.id)}><span className="event-date"><strong>{new Date(`${event.date}T12:00:00`).toLocaleDateString("en-SG", { month: "short" })}</strong><small>{new Date(`${event.date}T12:00:00`).getFullYear()}</small></span><span><strong>{event.name}</strong><small>{event.kind} · {event.includeInPlan ? "included" : "not modelled"}</small></span><strong>{formatMoney(event.amount)}</strong><span className={event.includeInPlan ? "tiny-toggle tiny-toggle-on" : "tiny-toggle"}><i /></span></button>)}</div></section><section className="panel forecast-explain"><span className="coach-glance-icon"><WandSparkles size={21} /></span><p className="eyebrow">Scenario signal</p><h3>{plannedTotal ? `${formatMoney(plannedTotal)} of plans are competing with your goals.` : "No planned events are competing with your goals."}</h3><p>{forecast.goalForecasts.some((item) => item.plannedEventDelayMonths > 0) ? `The largest modelled delay is ${Math.max(...forecast.goalForecasts.map((item) => item.plannedEventDelayMonths))} months. Lifetime recalculates this when spending or contributions change.` : "Your forecast currently has no event-driven delays."}</p><small>Forecasts are estimates, not guarantees. Evidence: transaction averages, current balances, goal contributions and included events.</small></section></div>
    <PlansView goals={goals} recurring={recurring} accounts={accounts} recurringCost={recurringCost} onAddGoal={onAddGoal} onAddRecurring={onAddRecurring} onToggleRecurring={onToggleRecurring} goalContribution={goalContribution} setGoalContribution={setGoalContribution} contributionAmount={contributionAmount} setContributionAmount={setContributionAmount} fundGoal={fundGoal} />
  </div>;
}

function CoachView({ data, scope, forecast, categoryTotals, qwenConfigured, onCapture }: { data: FinanceData; scope: ViewScope; forecast: FinanceForecast; categoryTotals: [string, number][]; qwenConfigured: boolean; onCapture: () => void }) {
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<Array<{ role: "user" | "coach"; text: string }>>([]);
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const listener = (event: Event) => { const value = (event as CustomEvent<string>).detail; if (value) { setPrompt(value); window.setTimeout(() => document.getElementById("coach-submit")?.click(), 20); } };
    window.addEventListener("lifetime-coach-question", listener);
    return () => window.removeEventListener("lifetime-coach-question", listener);
  }, []);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages, thinking]);
  function localCoach(question: string) {
    const lower = question.toLowerCase();
    if (lower.includes("emergency") || lower.includes("safe")) return `You have about ${forecast.emergencyMonths.toFixed(1)} months of liquid cover. After current goal contributions, the model leaves ${formatMoney(forecast.safeToSpend)} flexible each month. I’d protect the emergency buffer before raising discretionary plans.`;
    if (lower.includes("goal") || lower.includes("afford") || lower.includes("trip")) { const delayed = Math.max(0, ...forecast.goalForecasts.map((item) => item.plannedEventDelayMonths)); return delayed ? `Your included life plans could push the most affected goal back by about ${delayed} months. That estimate uses the plan costs divided by the goal’s current monthly contribution; change either input and it recalculates.` : "Your current goal model does not show an event-driven delay. Add a future event with a cost to compare the trade-off."; }
    return `The strongest signal is a modelled monthly surplus of ${formatMoney(forecast.monthlySurplus)} with ${forecast.confidence} confidence. Your largest current spending category is ${categoryTotals[0]?.[0] || "not established yet"}. Add more history or ask about a specific goal for a sharper answer.`;
  }
  async function ask(questionOverride?: string) {
    const question = (questionOverride || prompt).trim();
    if (!question || thinking) return;
    setPrompt(""); setMessages((current) => [...current, { role: "user", text: question }]); setThinking(true);
    let answer = localCoach(question);
    if (qwenConfigured) {
      try {
        const response = await fetch("/api/coach", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "coach", prompt: question, context: { scope, forecast, goals: data.goals, plannedEvents: data.plannedEvents, categories: categoryTotals.slice(0, 6), accounts: data.accounts.map(({ name, type, balance, space }) => ({ name, type, balance, space })) }, lexicon: data.profile.voiceLexicon }) });
        const payload = await response.json() as { answer?: string };
        if (response.ok && payload.answer) answer = payload.answer;
      } catch { /* deterministic answer remains available */ }
    }
    setMessages((current) => [...current, { role: "coach", text: answer }]); setThinking(false);
  }
  return <div className="page-stack"><PageHeading eyebrow="Evidence, explained" title="Coach" copy="A financial co-pilot that reasons from your numbers, shows assumptions and never moves money for you."><span className={qwenConfigured ? "ai-status ai-online" : "ai-status"}><i />{qwenConfigured ? "Qwen Flash connected" : "Planning engine active"}</span><button className="primary-button" onClick={onCapture}><Mic size={17} /> Ask by voice</button></PageHeading>
    <section className="coach-brief"><div className="coach-avatar"><WandSparkles size={24} /></div><div><p className="eyebrow">Your brief today</p><h2>{forecast.goalForecasts.some((item) => !item.onTrack) ? "One plan deserves a closer look." : "Your foundation is holding."}</h2><p>{forecast.emergencyMonths >= 6 ? "Your liquid buffer is above six months of modelled spending." : `Your liquid buffer covers ${forecast.emergencyMonths.toFixed(1)} months of modelled spending.`} {forecast.safeToSpend > 0 ? `${formatMoney(forecast.safeToSpend)} remains flexible after goal contributions.` : "There is no unallocated surplus in the current model."}</p><span>Confidence: {forecast.confidence} · {forecast.historyMonths} months of ledger evidence</span></div></section>
    <div className="coach-layout"><section className="panel coach-chat"><div className="coach-thread" ref={scrollRef}>{!messages.length && <div className="coach-starters"><p>Try asking</p>{["Can I afford my planned trip?", "How strong is my emergency fund?", "What is slowing down my goals?"].map((item) => <button key={item} onClick={() => ask(item)}>{item}<ChevronRight size={15} /></button>)}</div>}{messages.map((message, index) => <div key={`${message.role}-${index}`} className={`coach-message coach-message-${message.role}`}>{message.role === "coach" && <span><WandSparkles size={15} /></span>}<p>{message.text}</p></div>)}{thinking && <div className="coach-thinking"><i /><i /><i /></div>}</div><form className="coach-composer" onSubmit={(event) => { event.preventDefault(); ask(); }}><button type="button" onClick={onCapture} aria-label="Ask by voice"><Mic size={19} /></button><input value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Ask about a goal, trade-off, or pattern…" /><button id="coach-submit" className="primary-button" type="submit">Ask</button></form></section><aside className="coach-evidence"><div className="evidence-card"><span><Gauge size={18} /> Monthly model</span><strong>{formatMoney(forecast.averageIncome)} in</strong><p>{formatMoney(forecast.averageSpending)} average spending</p></div><div className="evidence-card"><span><ShieldCheck size={18} /> Resilience</span><strong>{forecast.emergencyMonths.toFixed(1)} months</strong><p>{formatMoney(forecast.liquidBalance)} liquid</p></div><div className="evidence-card"><span><Target size={18} /> Goals</span><strong>{forecast.goalForecasts.filter((item) => item.onTrack).length} on track</strong><p>{forecast.goalForecasts.length} modelled</p></div><p className="evidence-note">Coach explains the deterministic model. It does not calculate balances itself or recommend securities.</p></aside></div>
  </div>;
}

function HouseholdView({ data, accounts, members, onSetup, onEditAccount }: { data: FinanceData; accounts: Account[]; members: Array<{ email: string; display_name: string; role: string; status: string }>; onSetup: () => void; onEditAccount: (account: Account) => void }) {
  const sharedAccounts = data.accounts.filter((item) => item.space === "household");
  const personalAccounts = data.accounts.filter((item) => item.space === "personal");
  const visibleMembers = members.length ? members : [{ email: "Signed-in account", display_name: data.profile.name, role: "owner", status: "active" }, ...(data.profile.partnerEmail ? [{ email: data.profile.partnerEmail, display_name: data.profile.partnerName, role: "member", status: "pending" }] : [])];
  return <div className="page-stack"><PageHeading eyebrow="Private by default, shared on purpose" title={data.profile.householdName || "Household"} copy="Personal and shared finances feed one combined view without erasing ownership or duplicating transfers."><button className="primary-button" onClick={onSetup}><Settings2 size={17} /> Manage household</button></PageHeading>
    <section className="household-hero"><div className="household-orbits"><span className="avatar">{data.profile.name.slice(0, 1)}</span><span className="avatar partner-avatar">{data.profile.partnerName?.slice(0, 1) || "P"}</span></div><div><p className="eyebrow hero-eyebrow">Together, with boundaries</p><h2>{formatMoney(sharedAccounts.reduce((sum, item) => sum + item.balance, 0))} shared net worth</h2><p>{sharedAccounts.length} shared accounts · {personalAccounts.length} personal accounts stay private in each member’s Personal view.</p></div></section>
    <div className="dashboard-grid"><section className="panel members-panel"><PanelHeading eyebrow="People and access" title="Household members" action="Manage" onAction={onSetup} /><div className="member-list">{visibleMembers.map((member) => <div key={member.email}><span className="avatar">{(member.display_name || member.email).slice(0, 1).toUpperCase()}</span><span><strong>{member.display_name || member.email}</strong><small>{member.email}</small></span><span className={member.status === "active" ? "member-status active-member" : "member-status"}>{member.status === "active" ? "Active" : "Invite pending"}</span><small>{member.role}</small></div>)}</div><div className="info-note"><ShieldCheck size={17} /><span>Invited members claim the shared space when they sign in with the same email. Personal records remain in their own space.</span></div></section><section className="panel access-panel"><PanelHeading eyebrow="Ownership map" title="What appears where" /><div className="access-map"><div><span>Personal</span><strong>{personalAccounts.length} accounts</strong><small>Visible to their owner</small></div><ChevronRight size={18} /><div><span>Household</span><strong>{sharedAccounts.length} accounts</strong><small>Visible to active members</small></div><ChevronRight size={18} /><div><span>Together</span><strong>{accounts.length} accounts</strong><small>Combined without duplication</small></div></div></section></div>
    <section className="panel household-accounts"><PanelHeading eyebrow="Shared balance sheet" title="Accounts this household can see" /><div className="account-card-grid">{sharedAccounts.map((account) => <AccountCard key={account.id} account={account} onEdit={() => onEditAccount(account)} />)}{!sharedAccounts.length && <EmptyState icon={<Users />} title="Nothing shared yet" copy="Edit an account and set Belongs to Household." />}</div></section>
  </div>;
}

function ActivityView({ transactions, accounts, search, setSearch, onAdd, onImport, onDelete, onEdit, selectedMonthLabel, selectedMonth, setSelectedMonth, shiftMonth, mode, setMode, filter, setFilter, period, setPeriod }: {
  transactions: Transaction[];
  accounts: Account[];
  search: string;
  setSearch: (value: string) => void;
  onAdd: () => void;
  onImport: () => void;
  onDelete: (transaction: Transaction) => void;
  onEdit: (transaction: Transaction) => void;
  selectedMonthLabel: string;
  selectedMonth: string;
  setSelectedMonth: (value: string) => void;
  shiftMonth: (offset: number) => void;
  mode: ActivityMode;
  setMode: (mode: ActivityMode) => void;
  filter: ActivityFilter;
  setFilter: (filter: ActivityFilter) => void;
  period: ActivityPeriod;
  setPeriod: (period: ActivityPeriod) => void;
}) {
  const grouped = transactions.reduce<Record<string, Transaction[]>>((result, transaction) => {
    (result[transaction.date] ||= []).push(transaction);
    return result;
  }, {});
  const visibleIncome = transactions.filter((transaction) => transaction.type === "income").reduce((sum, transaction) => sum + transaction.amount, 0);
  const visibleSpending = transactions.filter((transaction) => transaction.type === "expense").reduce((sum, transaction) => sum + transaction.amount, 0);
  const visibleCashFlow = visibleIncome - visibleSpending;

  return (
    <div className="page-stack activity-page">
      <PageHeading eyebrow="Unified ledger" title="Activity" copy={`Every movement, across every account. Transfers never count as income or spending.`}>
        <button className="secondary-button" onClick={onImport}><Upload size={17} /> Import</button>
        <button className="primary-button" onClick={onAdd}><Plus size={18} /> Add transaction</button>
      </PageHeading>

      <section className="activity-sticky-summary">
        <div className="activity-summary-top">
          <div className="activity-month-stepper">
            <button disabled={period === "all"} onClick={() => shiftMonth(-1)} aria-label="Previous month"><ChevronLeft size={18} /></button>
            <label><CalendarDays size={17} /><strong>{period === "all" ? "All transactions" : selectedMonthLabel}</strong><input disabled={period === "all"} type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} aria-label="Choose activity month" /></label>
            <button disabled={period === "all"} onClick={() => shiftMonth(1)} aria-label="Next month"><ChevronRight size={18} /></button>
          </div>
          <div className="activity-balance">
            <span>{filter === "all" ? "Net cash flow" : "Filtered flow"}</span>
            <strong className={visibleCashFlow < 0 ? "negative-value" : ""}>{visibleCashFlow >= 0 ? "+" : ""}{formatMoney(visibleCashFlow)}</strong>
          </div>
          <div className="activity-mini-stat"><span>In</span><strong>+{formatMoney(visibleIncome)}</strong></div>
          <div className="activity-mini-stat"><span>Out</span><strong>−{formatMoney(visibleSpending)}</strong></div>
        </div>

        <div className="activity-controls">
          <div className="view-switcher" aria-label="Activity layout">
            <button className={mode === "feed" ? "view-active" : ""} onClick={() => setMode("feed")}><List size={17} /> Feed</button>
            <button className={mode === "ledger" ? "view-active" : ""} onClick={() => setMode("ledger")}><Table2 size={17} /> Ledger</button>
          </div>
          <label className="search-field"><Search size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search merchant, category, or note" /></label>
          <label className="select-filter"><span className="sr-only">Transaction type</span><select value={filter} onChange={(event) => setFilter(event.target.value as ActivityFilter)}><option value="all">All types</option><option value="expense">Expenses</option><option value="income">Income</option><option value="transfer">Transfers</option></select><ChevronDown size={15} /></label>
          <label className="select-filter period-filter"><span className="sr-only">Date range</span><select value={period} onChange={(event) => setPeriod(event.target.value as ActivityPeriod)}><option value="month">This month</option><option value="all">All time</option></select><ChevronDown size={15} /></label>
        </div>
      </section>

      {mode === "feed" ? (
        <section className="panel activity-feed-panel">
          {Object.entries(grouped).length ? Object.entries(grouped).map(([date, items]) => (
            <div className="transaction-day" key={date}>
              <div className="day-heading"><span>{formatDate(date)}</span><small>{items.length} item{items.length === 1 ? "" : "s"}</small></div>
              {items.map((transaction) => (
                <TransactionRow key={transaction.id} transaction={transaction} accounts={accounts} showSpace onEdit={() => onEdit(transaction)} onDelete={() => onDelete(transaction)} />
              ))}
            </div>
          )) : <EmptyState icon={<Search />} title="Nothing matched" copy="Try another month or filter, or add a transaction." />}
        </section>
      ) : (
        <LedgerTable transactions={transactions} accounts={accounts} onEdit={onEdit} onDelete={onDelete} />
      )}
    </div>
  );
}

function LedgerTable({ transactions, accounts, onEdit, onDelete }: { transactions: Transaction[]; accounts: Account[]; onEdit: (transaction: Transaction) => void; onDelete: (transaction: Transaction) => void }) {
  return (
    <section className="panel spreadsheet-shell">
      {transactions.length ? (
        <div className="spreadsheet-scroll">
          <table className="transaction-table">
            <thead><tr><th>Date</th><th>Description</th><th>Account</th><th>Category</th><th>Space</th><th>Type</th><th>Amount</th><th aria-label="Actions" /></tr></thead>
            <tbody>{transactions.map((transaction) => {
              const account = accounts.find((candidate) => candidate.id === transaction.accountId);
              return (
                <tr key={transaction.id} onClick={() => onEdit(transaction)}>
                  <td>{formatDate(transaction.date, true)}</td>
                  <td><strong>{transaction.description}</strong>{transaction.note && <small>{transaction.note}</small>}</td>
                  <td>{account?.name || "Unknown"}</td>
                  <td>{transaction.category}</td>
                  <td>{transaction.space === "household" ? "Household" : "Personal"}</td>
                  <td><span className={`table-type type-${transaction.type}`}>{transaction.type}</span></td>
                  <td className={`table-amount amount-${transaction.type}`}>{transaction.type === "income" ? "+" : transaction.type === "expense" ? "−" : ""}{formatMoney(transaction.amount)}</td>
                  <td><div className="table-actions"><button onClick={(event) => { event.stopPropagation(); onEdit(transaction); }} aria-label={`Edit ${transaction.description}`}><Edit3 size={16} /></button><button onClick={(event) => { event.stopPropagation(); onDelete(transaction); }} aria-label={`Delete ${transaction.description}`}><Trash2 size={16} /></button></div></td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      ) : <EmptyState icon={<Table2 />} title="Your ledger is clear" copy="Adjust the filters or add your first transaction for this month." />}
    </section>
  );
}

function AccountsView({ accounts, netWorth, onAdd, onEdit }: { accounts: Account[]; netWorth: number; onAdd: () => void; onEdit: (account: Account) => void }) {
  const liquid = accounts.filter((account) => ["checking", "savings", "cash"].includes(account.type)).reduce((sum, account) => sum + account.balance, 0);
  const investments = accounts.filter((account) => account.type === "investment").reduce((sum, account) => sum + account.balance, 0);
  const credit = accounts.filter((account) => account.type === "credit").reduce((sum, account) => sum + Math.abs(Math.min(0, account.balance)), 0);

  return (
    <div className="page-stack">
      <PageHeading eyebrow="Balance sheet" title="Accounts" copy="One calm view of cash, savings, cards, and investments.">
        <button className="primary-button" onClick={onAdd}><Plus size={18} /> Add account</button>
      </PageHeading>
      <section className="accounts-hero">
        <div><p className="eyebrow">Total net worth</p><strong>{formatMoney(netWorth)}</strong><span><TrendingUp size={15} /> Healthy upward trend</span></div>
        <div className="balance-breakdown">
          <div><span>Cash & savings</span><strong>{formatMoney(liquid)}</strong></div>
          <div><span>Investments</span><strong>{formatMoney(investments)}</strong></div>
          <div><span>Card balance</span><strong>{formatMoney(credit)}</strong></div>
        </div>
      </section>
      <section className="account-card-grid">
        {accounts.map((account) => <AccountCard key={account.id} account={account} onEdit={() => onEdit(account)} />)}
        <button className="add-account-card" onClick={onAdd}><span><Plus size={22} /></span><strong>Add another account</strong><small>Bank, card, cash, or investment</small></button>
      </section>
    </div>
  );
}

function PlansView({ goals, recurring, accounts, recurringCost, onAddGoal, onAddRecurring, onToggleRecurring, goalContribution, setGoalContribution, contributionAmount, setContributionAmount, fundGoal }: {
  goals: Goal[];
  recurring: RecurringItem[];
  accounts: Account[];
  recurringCost: number;
  onAddGoal: () => void;
  onAddRecurring: () => void;
  onToggleRecurring: (id: string) => void;
  goalContribution: string | null;
  setGoalContribution: (id: string | null) => void;
  contributionAmount: string;
  setContributionAmount: (value: string) => void;
  fundGoal: (id: string) => void;
}) {
  return (
    <div className="page-stack">
      <PageHeading eyebrow="The life ahead" title="Plans" copy="Shared ambitions and quiet personal goals, each with a clear path.">
        <button className="secondary-button" onClick={onAddRecurring}><Repeat2 size={17} /> Add recurring</button>
        <button className="primary-button" onClick={onAddGoal}><Plus size={18} /> New goal</button>
      </PageHeading>

      <div className="section-heading"><div><p className="eyebrow">Milestones</p><h2>Goals in motion</h2></div><span>{goals.length} active</span></div>
      <section className="goal-grid">
        {goals.map((goal) => (
          <GoalCard
            key={goal.id}
            goal={goal}
            contributionOpen={goalContribution === goal.id}
            onContribution={() => setGoalContribution(goalContribution === goal.id ? null : goal.id)}
            contributionAmount={contributionAmount}
            setContributionAmount={setContributionAmount}
            fundGoal={() => fundGoal(goal.id)}
          />
        ))}
        {!goals.length && <EmptyState icon={<Target />} title="No goals in this view" copy="Create a personal or shared milestone." />}
      </section>

      <div className="section-heading plans-recurring-heading"><div><p className="eyebrow">Predictable spending</p><h2>Recurring payments</h2></div><span>{formatMoney(recurringCost)}/month</span></div>
      <section className="panel recurring-table">
        <div className="recurring-table-head"><span>Payment</span><span>Paid from</span><span>Next date</span><span>Amount</span><span>Status</span></div>
        {recurring.map((item) => {
          const account = accounts.find((candidate) => candidate.id === item.accountId);
          return (
            <div className={!item.active ? "recurring-row muted-row" : "recurring-row"} key={item.id}>
              <span className="recurring-main"><i><Repeat2 size={17} /></i><span><strong>{item.name}</strong><small>{item.category} · {item.cadence}</small></span></span>
              <span>{account?.name || "Unknown"}</span>
              <span>{formatDate(item.nextDate, true)}</span>
              <strong>{formatMoney(item.amount)}</strong>
              <button className={item.active ? "status-toggle active" : "status-toggle"} onClick={() => onToggleRecurring(item.id)} aria-label={`${item.active ? "Pause" : "Resume"} ${item.name}`}><i /></button>
            </div>
          );
        })}
      </section>
    </div>
  );
}

function InsightsView({ monthSeries, maxSeriesValue, categoryTotals, monthSpending, savingsRate, recurringCost, onExport, onImport, onReset }: {
  monthSeries: { key: string; label: string; income: number; spending: number }[];
  maxSeriesValue: number;
  categoryTotals: [string, number][];
  monthSpending: number;
  savingsRate: number;
  recurringCost: number;
  onExport: () => void;
  onImport: () => void;
  onReset: () => void;
}) {
  return (
    <div className="page-stack">
      <PageHeading eyebrow="Patterns, not noise" title="Insights" copy="A clearer view of the habits shaping your future.">
        <button className="secondary-button" onClick={onImport}><FileSpreadsheet size={17} /> Import sheet</button>
        <button className="primary-button" onClick={onExport}><Download size={17} /> Private backup</button>
      </PageHeading>

      <section className="insight-grid">
        <div className="panel cashflow-chart-card">
          <PanelHeading eyebrow="Six-month view" title="Income and spending" />
          <div className="chart-legend"><span><i className="income-key" />Income</span><span><i className="spend-key" />Spending</span></div>
          <div className="bar-chart">
            {monthSeries.map((month) => (
              <div className="bar-group" key={month.key}>
                <div className="bars"><i className="income-bar" style={{ height: `${Math.max(3, (month.income / maxSeriesValue) * 100)}%` }} title={`Income ${formatMoney(month.income)}`} /><i className="spend-bar" style={{ height: `${Math.max(3, (month.spending / maxSeriesValue) * 100)}%` }} title={`Spending ${formatMoney(month.spending)}`} /></div>
                <span>{month.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel insight-score-card">
          <p className="eyebrow">Foundation score</p>
          <div className="score-ring" style={{ "--score": `${Math.min(100, Math.round(64 + savingsRate / 3)) * 3.6}deg` } as React.CSSProperties}>
            <span><strong>{Math.min(100, Math.round(64 + savingsRate / 3))}</strong><small>Strong</small></span>
          </div>
          <p>Your cash buffer and savings rhythm are doing the heavy lifting.</p>
          <div className="score-points"><span><Check size={15} /> Positive monthly cash flow</span><span><Check size={15} /> Goals actively funded</span><span><Check size={15} /> Transfers classified correctly</span></div>
        </div>

        <div className="panel category-insight-card">
          <PanelHeading eyebrow="Current month" title="Spending pattern" />
          <div className="category-list large-category-list">
            {categoryTotals.map(([category, amount]) => (
              <div key={category}>
                <span><i style={{ background: categoryColors[category] || categoryColors.Other }} />{category}</span>
                <span className="category-value"><small>{monthSpending ? ((amount / monthSpending) * 100).toFixed(0) : 0}%</small><strong>{formatMoney(amount)}</strong></span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel commitments-card">
          <p className="eyebrow">Commitments</p>
          <h3>{formatMoney(recurringCost)}<small> / month</small></h3>
          <p>Your recurring payments are visible before they land.</p>
          <div className="commitment-line"><span>Subscriptions & bills</span><strong>{formatMoney(recurringCost)}</strong></div>
          <button className="text-button danger-text" onClick={onReset}>Clear sample data and start fresh</button>
        </div>
      </section>
    </div>
  );
}

function MetricCard({ label, value, note, tone, icon, suffix = "", money = true, onClick }: { label: string; value: number; note: string; tone: string; icon: React.ReactNode; suffix?: string; money?: boolean; onClick: () => void }) {
  return (
    <button className={`metric-card metric-${tone}`} onClick={onClick}>
      <div className="metric-top"><span>{label}</span><i>{icon}</i></div>
      <strong>{money ? formatMoney(value) : `${value.toFixed(0)}${suffix}`}</strong>
      <small>{note}<ChevronRight size={14} /></small>
    </button>
  );
}

function PanelHeading({ eyebrow, title, action, onAction }: { eyebrow: string; title: string; action?: string; onAction?: () => void }) {
  return (
    <div className="panel-heading">
      <div><p className="eyebrow">{eyebrow}</p><h3>{title}</h3></div>
      {action && <button className="text-button" onClick={onAction}>{action}<ChevronRight size={16} /></button>}
    </div>
  );
}

function PageHeading({ eyebrow, title, copy, children }: { eyebrow: string; title: string; copy: string; children?: React.ReactNode }) {
  return (
    <header className="page-heading">
      <div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{copy}</p></div>
      {children && <div className="page-heading-actions">{children}</div>}
    </header>
  );
}

function accountIcon(type: AccountType) {
  if (type === "credit") return CreditCard;
  if (type === "investment") return TrendingUp;
  if (type === "savings" || type === "cpf" || type === "insurance") return PiggyBank;
  if (type === "property") return Home;
  if (type === "loan") return CircleDollarSign;
  return Landmark;
}

function AccountRow({ account }: { account: Account }) {
  const Icon = accountIcon(account.type);
  return (
    <div className="account-row">
      <span className={`account-icon accent-${account.accent}`}><Icon size={18} /></span>
      <span className="account-name"><strong>{account.name}</strong><small>{account.institution}{account.last4 ? ` · •${account.last4}` : ` · ${accountTypeLabels[account.type]}`}</small></span>
      <span className="account-scope">{account.space === "household" ? <Users size={13} /> : <UserRound size={13} />}{account.space === "household" ? "Shared" : "Personal"}</span>
      <strong className={account.balance < 0 ? "negative-value" : ""}>{formatMoney(account.balance)}</strong>
    </div>
  );
}

function AccountCard({ account, onEdit }: { account: Account; onEdit: () => void }) {
  const Icon = accountIcon(account.type);
  return (
    <button className={`account-card account-card-${account.accent}`} onClick={onEdit} aria-label={`Edit ${account.name}`}>
      <div className="account-card-top"><span><Icon size={20} /></span><span className="edit-account-pill"><Edit3 size={15} /> Edit</span></div>
      <p>{account.institution}</p>
      <h3>{account.name}</h3>
      <strong>{formatMoney(account.balance)}</strong>
      <div><span>{accountTypeLabels[account.type]}{account.last4 ? ` · •${account.last4}` : ""}</span><span>{account.space === "household" ? <Users size={14} /> : <UserRound size={14} />}{account.space === "household" ? "Shared" : account.owner}</span></div>
    </button>
  );
}

function TransactionRow({ transaction, accounts, showSpace = false, onDelete, onEdit }: { transaction: Transaction; accounts: Account[]; showSpace?: boolean; onDelete?: () => void; onEdit?: () => void }) {
  const source = accounts.find((account) => account.id === transaction.accountId);
  const destination = accounts.find((account) => account.id === transaction.transferAccountId);
  const Icon = transaction.type === "income" ? ArrowDownLeft : transaction.type === "transfer" ? ArrowLeftRight : ArrowUpRight;
  return (
    <div className={`transaction-row ${onEdit ? "editable-row" : ""}`} onClick={onEdit} onKeyDown={(event) => { if (onEdit && (event.key === "Enter" || event.key === " ")) onEdit(); }} role={onEdit ? "button" : undefined} tabIndex={onEdit ? 0 : undefined}>
      <span className={`transaction-icon transaction-${transaction.type}`}><Icon size={18} /></span>
      <span className="transaction-name">
        <strong>{transaction.description}</strong>
        <small>{transaction.type === "transfer" ? `${source?.name || "Account"} → ${destination?.name || "Account"}` : `${transaction.category} · ${source?.name || "Account"}`}</small>
      </span>
      {showSpace && <span className="transaction-space">{transaction.space === "household" ? <Users size={13} /> : <UserRound size={13} />}{transaction.space === "household" ? "Shared" : "Personal"}</span>}
      <span className="transaction-date">{formatDate(transaction.date, true)}</span>
      <strong className={`transaction-amount amount-${transaction.type}`}>
        {transaction.type === "income" ? "+" : transaction.type === "expense" ? "−" : ""}{formatMoney(transaction.amount)}
      </strong>
      {(onEdit || onDelete) && <span className="row-actions">{onEdit && <button onClick={(event) => { event.stopPropagation(); onEdit(); }} aria-label={`Edit ${transaction.description}`}><Edit3 size={16} /></button>}{onDelete && <button onClick={(event) => { event.stopPropagation(); onDelete(); }} aria-label={`Delete ${transaction.description}`}><Trash2 size={16} /></button>}</span>}
    </div>
  );
}

function GoalCard({ goal, compact = false, contributionOpen, onContribution, contributionAmount, setContributionAmount, fundGoal }: {
  goal: Goal;
  compact?: boolean;
  contributionOpen: boolean;
  onContribution: () => void;
  contributionAmount: string;
  setContributionAmount: (value: string) => void;
  fundGoal: () => void;
}) {
  const progress = Math.min(100, (goal.current / goal.target) * 100);
  const Icon = goal.icon === "home" ? Home : goal.icon === "shield" ? ShieldCheck : Sparkles;
  return (
    <article className={compact ? "goal-card compact-goal" : "goal-card"}>
      <div className="goal-card-top"><span className="goal-icon"><Icon size={19} /></span><span className="space-badge">{goal.space === "household" ? <Users size={13} /> : <UserRound size={13} />}{goal.space === "household" ? "Shared" : "Personal"}</span></div>
      {!compact && <h3>{goal.name}</h3>}
      <div className="goal-numbers"><strong>{formatMoney(goal.current)}</strong><span>of {formatMoney(goal.target)}</span></div>
      <div className="goal-progress"><i style={{ width: `${progress}%` }} /></div>
      <div className="goal-footer"><span>{progress.toFixed(0)}% funded</span><span>Target {formatDate(goal.targetDate, true)}</span></div>
      <button className="goal-contribute" onClick={onContribution}><Plus size={15} /> Add contribution</button>
      {contributionOpen && (
        <div className="contribution-form">
          <label><span>S$</span><input autoFocus type="number" min="0" step="10" value={contributionAmount} onChange={(event) => setContributionAmount(event.target.value)} placeholder="500" /></label>
          <button onClick={fundGoal}>Add</button>
        </div>
      )}
    </article>
  );
}

function EmptyState({ icon, title, copy }: { icon: React.ReactNode; title: string; copy: string }) {
  return <div className="empty-state"><span>{icon}</span><strong>{title}</strong><p>{copy}</p></div>;
}

function ModalShell({ title, eyebrow, onClose, children }: { title: string; eyebrow: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal-sheet" role="dialog" aria-modal="true" aria-label={title}>
        <header><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close"><X size={20} /></button></header>
        {children}
      </section>
    </div>
  );
}

type SpeechRecognizer = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

function localCaptureDraft(text: string, accounts: Account[], scope: ViewScope): Partial<Transaction> {
  const lower = text.toLowerCase();
  const amountMatch = text.match(/(?:s\$|\$)?\s*(\d+(?:\.\d{1,2})?)/i);
  const type: TransactionType = /\b(transfer|move|shift|paynow to)\b/.test(lower) ? "transfer" : /\b(salary|income|earned|received|refund)\b/.test(lower) ? "income" : "expense";
  const account = accounts.find((item) => lower.includes(item.name.toLowerCase()) || lower.includes(item.institution.toLowerCase())) || accounts.find((item) => item.space === (scope === "household" ? "household" : "personal")) || accounts[0];
  const destination = type === "transfer" ? accounts.find((item) => item.id !== account?.id && lower.includes(item.name.toLowerCase())) : undefined;
  const category = /grab|taxi|mrt|bus|transport/.test(lower) ? "Transport" : /grocery|fairprice|cold storage|supermarket/.test(lower) ? "Groceries" : /netflix|movie|spotify|entertainment/.test(lower) ? "Entertainment" : /doctor|gym|health|physio/.test(lower) ? "Health" : /rent|utility|home/.test(lower) ? "Home" : /trip|flight|hotel|travel/.test(lower) ? "Travel" : "Food & dining";
  let description = text.replace(/(?:s\$|\$)?\s*\d+(?:\.\d{1,2})?/i, "").replace(/\b(i|just|spent|paid|received|earned|transfer|transferred|move|moved|dollars?|bucks?|at|from|using|today|yesterday)\b/gi, " ").replace(/\s+/g, " ").trim();
  description = description.replace(/^to\s+/i, "").replace(/\s+to\s+.+$/i, "").trim() || (type === "transfer" ? "Account transfer" : type === "income" ? "Income" : "Expense");
  return { type, amount: amountMatch ? Number(amountMatch[1]) : undefined, description, date: todayIso(), category: type === "expense" ? category : type === "income" ? "Income" : "Transfer", accountId: account?.id, transferAccountId: destination?.id, space: account?.space || (scope === "household" ? "household" : "personal"), source: "voice" };
}

function CaptureModal({ accounts, profile, scope, qwenConfigured, onClose, onTransaction, onPlan, onAsk, onProfile }: { accounts: Account[]; profile: FinanceData["profile"]; scope: ViewScope; qwenConfigured: boolean; onClose: () => void; onTransaction: (draft: Partial<Transaction>) => void; onPlan: (event: PlannedEvent) => void; onAsk: (prompt: string) => void; onProfile: (profile: FinanceData["profile"]) => void }) {
  const [intent, setIntent] = useState<"transaction" | "plan" | "question">("transaction");
  const [inputMode, setInputMode] = useState<"voice" | "type">("voice");
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [newWord, setNewWord] = useState("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const speechRef = useRef<SpeechRecognizer | null>(null);

  useEffect(() => () => { speechRef.current?.stop(); recorderRef.current?.stop(); streamRef.current?.getTracks().forEach((track) => track.stop()); }, []);

  async function transcribeBlob(blob: Blob) {
    setProcessing(true);
    try {
      const audio = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(reader.error); reader.readAsDataURL(blob); });
      const response = await fetch("/api/voice", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ audio, locale: profile.voiceLocale || "en-SG", lexicon: profile.voiceLexicon || [] }) });
      const payload = await response.json() as { transcript?: string; error?: string };
      if (!response.ok || !payload.transcript) throw new Error(payload.error || "Voice transcription failed");
      setText(payload.transcript); setError("");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Voice transcription failed"); }
    finally { setProcessing(false); }
  }

  async function startVoice() {
    setError("");
    if (qwenConfigured && navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined") {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        streamRef.current = stream; recorderRef.current = recorder; chunksRef.current = [];
        recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
        recorder.onstop = () => { const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" }); stream.getTracks().forEach((track) => track.stop()); streamRef.current = null; if (blob.size) transcribeBlob(blob); };
        recorder.start(); setListening(true); return;
      } catch { setError("Microphone access was not available. You can type instead."); setInputMode("type"); return; }
    }
    const constructors = window as unknown as { SpeechRecognition?: new () => SpeechRecognizer; webkitSpeechRecognition?: new () => SpeechRecognizer };
    const Recognition = constructors.SpeechRecognition || constructors.webkitSpeechRecognition;
    if (!Recognition) { setError("Voice capture is not supported in this browser yet. You can type the same sentence."); setInputMode("type"); return; }
    const recognition = new Recognition(); speechRef.current = recognition; recognition.lang = profile.voiceLocale || "en-SG"; recognition.interimResults = true; recognition.continuous = false;
    recognition.onresult = (event) => { let transcript = ""; for (let index = 0; index < event.results.length; index += 1) transcript += event.results[index][0].transcript; setText(transcript.trim()); };
    recognition.onend = () => setListening(false); recognition.onerror = () => { setListening(false); setError("I couldn’t hear that clearly. Try again or type it."); };
    recognition.start(); setListening(true);
  }

  function stopVoice() { if (recorderRef.current?.state === "recording") recorderRef.current.stop(); speechRef.current?.stop(); setListening(false); }

  async function continueCapture() {
    const trimmed = text.trim(); if (!trimmed) { setError("Say or type something first."); return; }
    if (intent === "question") { onAsk(trimmed); return; }
    if (intent === "plan") {
      const amount = Number(trimmed.match(/(?:s\$|\$)?\s*(\d+(?:\.\d{1,2})?)/i)?.[1] || 0);
      const target = new Date(); target.setMonth(target.getMonth() + 6);
      onPlan({ id: uid("event"), name: trimmed.replace(/(?:s\$|\$)?\s*\d+(?:\.\d{1,2})?/i, "").replace(/\b(plan|budget|for|a|an)\b/gi, " ").replace(/\s+/g, " ").trim() || "Future plan", amount, date: target.toISOString().slice(0, 10), kind: /trip|holiday|japan|travel|flight/i.test(trimmed) ? "travel" : /car|lambo/i.test(trimmed) ? "car" : /home|reno|house/i.test(trimmed) ? "home" : "other", space: scope === "household" ? "household" : "personal", includeInPlan: true, note: trimmed });
      return;
    }
    let draft = localCaptureDraft(trimmed, accounts, scope);
    if (qwenConfigured) {
      setProcessing(true);
      try {
        const response = await fetch("/api/coach", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "capture", prompt: trimmed, lexicon: profile.voiceLexicon }) });
        const payload = await response.json() as { parsed?: { intent?: TransactionType; description?: string; amount?: number; date?: string; category?: string; sourceAccount?: string; destinationAccount?: string } };
        if (response.ok && payload.parsed) {
          const parsed = payload.parsed; const source = accounts.find((item) => [item.name, item.institution].some((value) => parsed.sourceAccount?.toLowerCase().includes(value.toLowerCase()))) || accounts.find((item) => item.id === draft.accountId); const destination = accounts.find((item) => [item.name, item.institution].some((value) => parsed.destinationAccount?.toLowerCase().includes(value.toLowerCase())));
          draft = { ...draft, type: parsed.intent || draft.type, description: parsed.description || draft.description, amount: parsed.amount || draft.amount, date: parsed.date || draft.date, category: parsed.category || draft.category, accountId: source?.id || draft.accountId, transferAccountId: destination?.id || draft.transferAccountId };
        }
      } catch { /* local parser remains available */ }
      finally { setProcessing(false); }
    }
    onTransaction(draft);
  }

  function addLexiconWord() { const value = newWord.trim(); if (!value) return; onProfile({ ...profile, voiceLexicon: [...new Set([...(profile.voiceLexicon || []), value])] }); setNewWord(""); }

  return <ModalShell eyebrow="Voice-first financial capture" title="Tell Lifetime" onClose={onClose}><div className="capture-shell"><div className="capture-intents">{(["transaction", "plan", "question"] as const).map((item) => <button key={item} className={intent === item ? "capture-intent-active" : ""} onClick={() => setIntent(item)}>{item === "transaction" ? <ArrowLeftRight size={17} /> : item === "plan" ? <CalendarDays size={17} /> : <MessageCircle size={17} />}{item === "transaction" ? "Log money" : item === "plan" ? "Plan ahead" : "Ask Coach"}</button>)}</div><div className="capture-mode-switch"><button className={inputMode === "voice" ? "active" : ""} onClick={() => setInputMode("voice")}><Mic size={16} /> Talk</button><button className={inputMode === "type" ? "active" : ""} onClick={() => setInputMode("type")}><Edit3 size={16} /> Type</button></div>{inputMode === "voice" && <div className={listening ? "voice-stage voice-listening" : "voice-stage"}><button className="voice-orb" onClick={listening ? stopVoice : startVoice} aria-label={listening ? "Stop listening" : "Start listening"}><span><Mic size={28} /></span><i /><i /><i /></button><strong>{processing ? "Understanding your words…" : listening ? "I’m listening… tap when finished" : "Tap, then speak naturally"}</strong><p>{qwenConfigured ? "Qwen speech recognises multilingual accents; your own vocabulary nudges exact spellings." : "Browser speech capture is active. Qwen speech will take over when its key is connected."}</p></div>}<label className="field capture-transcript"><span>{inputMode === "voice" ? "Transcript — correct anything before continuing" : intent === "transaction" ? "Try “Spent $13.80 at Yochi on Revolut”" : intent === "plan" ? "Try “Plan $12,000 for Japan next April”" : "What do you want to understand?"}</span><textarea autoFocus={inputMode === "type"} value={text} onChange={(event) => setText(event.target.value)} placeholder="Your words appear here…" /></label><div className="voice-lexicon"><div><strong>Your vocabulary</strong><small>Names, Singlish, merchants and community terms that should be spelt exactly.</small></div><div className="lexicon-tags">{(profile.voiceLexicon || []).slice(0, 8).map((word) => <span key={word}>{word}</span>)}</div><div className="lexicon-add"><input value={newWord} onChange={(event) => setNewWord(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addLexiconWord(); } }} placeholder="Add Yochi, PayNow…" /><button onClick={addLexiconWord}><Plus size={16} /></button></div></div>{error && <p className="form-error">{error}</p>}<div className="form-actions"><button className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button" onClick={continueCapture} disabled={processing}>{processing ? "Understanding…" : intent === "transaction" ? "Review transaction" : intent === "plan" ? "Add to forecast" : "Ask Coach"}</button></div></div></ModalShell>;
}

function TransactionModal({ initial, accounts, scope, onClose, onSubmit }: { initial?: Partial<Transaction> | null; accounts: Account[]; scope: ViewScope; onClose: () => void; onSubmit: (transaction: Transaction) => void }) {
  const defaultAccount = accounts.find((account) => account.space === (scope === "all" ? "personal" : scope)) || accounts[0];
  const [type, setType] = useState<TransactionType>(initial?.type || "expense");
  const [amount, setAmount] = useState(initial?.amount != null ? String(initial.amount) : "");
  const [description, setDescription] = useState(initial?.description || "");
  const [category, setCategory] = useState(initial?.type === "expense" ? initial.category || expenseCategories[0] : expenseCategories[0]);
  const [date, setDate] = useState(initial?.date || todayIso());
  const [accountId, setAccountId] = useState(initial?.accountId || defaultAccount?.id || "");
  const [transferAccountId, setTransferAccountId] = useState(initial?.transferAccountId || "");
  const [note, setNote] = useState(initial?.note || "");

  const selectedAccount = accounts.find((account) => account.id === accountId);
  const destination = accounts.find((account) => account.id === transferAccountId);

  function submit(event: FormEvent) {
    event.preventDefault();
    const parsedAmount = Number(amount);
    if (!description.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0 || !accountId) return;
    if (type === "transfer" && (!transferAccountId || transferAccountId === accountId)) return;
    const transactionScope: SpaceId = type === "transfer" && destination?.space === "household"
      ? "household"
      : selectedAccount?.space || (scope === "household" ? "household" : "personal");
    onSubmit({
      id: initial?.id || uid("tx"),
      type,
      amount: parsedAmount,
      description: description.trim(),
      category: type === "transfer" ? "Transfer" : type === "income" ? "Income" : category,
      date,
      accountId,
      transferAccountId: type === "transfer" ? transferAccountId : undefined,
      note: note.trim() || undefined,
      space: transactionScope,
      source: initial?.source || "manual",
    });
  }

  return (
    <ModalShell eyebrow={initial?.id ? "Update the ledger" : "Quick capture"} title={initial?.id ? "Edit transaction" : "Review transaction"} onClose={onClose}>
      <form className="form-stack" onSubmit={submit}>
        <div className="type-switcher">
          {(["expense", "income", "transfer"] as TransactionType[]).map((option) => <button type="button" key={option} className={type === option ? "type-active" : ""} onClick={() => setType(option)}>{option === "expense" ? <ArrowUpRight size={16} /> : option === "income" ? <ArrowDownLeft size={16} /> : <ArrowLeftRight size={16} />}{option}</button>)}
        </div>
        <label className="amount-field"><span>S$</span><input autoFocus required inputMode="decimal" type="number" min="0" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" /></label>
        <div className="form-grid">
          <label className="field full-field"><span>{type === "income" ? "Source" : type === "transfer" ? "Transfer note" : "Merchant or description"}</span><input required value={description} onChange={(event) => setDescription(event.target.value)} placeholder={type === "transfer" ? "Move to savings" : "What was this for?"} /></label>
          <label className="field"><span>{type === "income" ? "Paid into" : type === "transfer" ? "From account" : "Paid from"}</span><select value={accountId} onChange={(event) => setAccountId(event.target.value)}>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name} · {formatMoney(account.balance)}</option>)}</select></label>
          {type === "transfer" ? (
            <label className="field"><span>To account</span><select required value={transferAccountId} onChange={(event) => setTransferAccountId(event.target.value)}><option value="">Choose destination</option>{accounts.filter((account) => account.id !== accountId).map((account) => <option key={account.id} value={account.id}>{account.name} · {formatMoney(account.balance)}</option>)}</select></label>
          ) : type === "expense" ? (
            <label className="field"><span>Category</span><select value={category} onChange={(event) => setCategory(event.target.value)}>{expenseCategories.map((item) => <option key={item}>{item}</option>)}</select></label>
          ) : <label className="field"><span>Category</span><input value="Income" disabled /></label>}
          <label className="field"><span>Date</span><input required type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
          <label className="field"><span>Note (optional)</span><input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Add context" /></label>
        </div>
        {type === "transfer" && <div className="info-note"><ShieldCheck size={17} /><span>This moves money between accounts. It will not change your income, spending, or savings rate.</span></div>}
        <div className="form-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button" type="submit">{initial?.id ? "Save changes" : `Save ${type}`}</button></div>
      </form>
    </ModalShell>
  );
}

function AccountModal({ initial, scope, profileName, partnerName, onClose, onSubmit }: { initial?: Account | null; scope: ViewScope; profileName: string; partnerName: string; onClose: () => void; onSubmit: (account: Account) => void }) {
  const [name, setName] = useState(initial?.name || "");
  const [institution, setInstitution] = useState(initial?.institution || "");
  const [type, setType] = useState<AccountType>(initial?.type || "checking");
  const [balance, setBalance] = useState(initial ? String(initial.balance) : "");
  const [space, setSpace] = useState<SpaceId>(initial?.space || (scope === "household" ? "household" : "personal"));
  const [last4, setLast4] = useState(initial?.last4 || "");

  function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = Number(balance);
    if (!name.trim() || !institution.trim() || !Number.isFinite(parsed)) return;
    const normalizedBalance = ["credit", "loan"].includes(type) && parsed > 0 ? -parsed : parsed;
    onSubmit({ id: initial?.id || uid("acct"), name: name.trim(), institution: institution.trim(), type, balance: normalizedBalance, space, owner: space === "household" ? `${profileName} + ${partnerName}` : profileName, currency: initial?.currency || "SGD", last4: last4.slice(-4), accent: initial?.accent || accountAccents[Math.floor(Math.random() * accountAccents.length)] });
  }

  return (
    <ModalShell eyebrow="Balance sheet" title={initial ? "Edit account" : "Add an account"} onClose={onClose}>
      <form className="form-stack" onSubmit={submit}>
        <div className="form-grid">
          <label className="field"><span>Account name</span><input autoFocus required value={name} onChange={(event) => setName(event.target.value)} placeholder="Rainy day fund" /></label>
          <label className="field"><span>Institution</span><input required value={institution} onChange={(event) => setInstitution(event.target.value)} placeholder="DBS, HSBC, Revolut…" /></label>
          <label className="field"><span>Account type</span><select value={type} onChange={(event) => setType(event.target.value as AccountType)}>{Object.entries(accountTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="field"><span>{["credit", "loan"].includes(type) ? "Amount owed" : "Current value or balance"}</span><input required type="number" step="0.01" value={balance} onChange={(event) => setBalance(event.target.value)} placeholder="0.00" /></label>
          <label className="field"><span>Belongs to</span><select value={space} onChange={(event) => setSpace(event.target.value as SpaceId)}><option value="personal">Personal</option><option value="household">Household</option></select></label>
          <label className="field"><span>Last four digits (optional)</span><input maxLength={4} inputMode="numeric" value={last4} onChange={(event) => setLast4(event.target.value.replace(/\D/g, ""))} placeholder="2841" /></label>
        </div>
        <div className="form-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button" type="submit">{initial ? "Save changes" : "Add account"}</button></div>
      </form>
    </ModalShell>
  );
}

function HouseholdModal({ profile, viewerEmail, onClose, onSubmit }: { profile: FinanceData["profile"]; viewerEmail: string; onClose: () => void; onSubmit: (profile: FinanceData["profile"]) => void }) {
  const [name, setName] = useState(profile.name);
  const [householdName, setHouseholdName] = useState(profile.householdName);
  const [partnerName, setPartnerName] = useState(profile.partnerName || "");
  const [partnerEmail, setPartnerEmail] = useState(profile.partnerEmail || "");
  const [voiceLocale, setVoiceLocale] = useState(profile.voiceLocale || "en-SG");
  const [voiceLexicon, setVoiceLexicon] = useState((profile.voiceLexicon || []).join(", "));

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || !householdName.trim() || !partnerName.trim()) return;
    onSubmit({
      ...profile,
      name: name.trim(),
      householdName: householdName.trim(),
      partnerName: partnerName.trim(),
      partnerEmail: partnerEmail.trim(),
      householdStartedAt: profile.householdStartedAt || todayIso(),
      voiceLocale,
      voiceLexicon: voiceLexicon.split(",").map((item) => item.trim()).filter(Boolean),
    });
  }

  return (
    <ModalShell eyebrow="Personal + household" title="Set up your household" onClose={onClose}>
      <form className="form-stack" onSubmit={submit}>
        <div className="household-people">
          <div><span className="avatar">{name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</span><span><strong>{name || "You"}</strong><small>{viewerEmail} · signed in</small></span><Check size={17} /></div>
          <div><span className="avatar partner-avatar">{partnerName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "P"}</span><span><strong>{partnerName || "Partner"}</strong><small>{partnerEmail || "Add their email below"}</small></span><Users size={17} /></div>
        </div>
        <div className="form-grid">
          <label className="field"><span>Your display name</span><input required value={name} onChange={(event) => setName(event.target.value)} /></label>
          <label className="field"><span>Household name</span><input required value={householdName} onChange={(event) => setHouseholdName(event.target.value)} placeholder="Parker household" /></label>
          <label className="field"><span>Partner or family member</span><input required value={partnerName} onChange={(event) => setPartnerName(event.target.value)} placeholder="Their name" /></label>
          <label className="field"><span>Their email</span><input type="email" value={partnerEmail} onChange={(event) => setPartnerEmail(event.target.value)} placeholder="partner@example.com" /></label>
          <label className="field"><span>Voice and accent region</span><select value={voiceLocale} onChange={(event) => setVoiceLocale(event.target.value)}><option value="en-SG">English · Singapore</option><option value="en-IN">English · India</option><option value="en-GB">English · United Kingdom</option><option value="en-US">English · United States</option><option value="ms-MY">Malay · Malaysia</option><option value="zh-SG">Mandarin · Singapore</option></select></label>
          <label className="field"><span>Voice vocabulary</span><input value={voiceLexicon} onChange={(event) => setVoiceLexicon(event.target.value)} placeholder="Yochi, PayNow, kopitiam…" /></label>
        </div>
        <div className="info-note"><ShieldCheck size={17} /><span>Use Personal for private accounts and Household for shared ones. An invite is claimed when that person signs in with the same email. Together combines both spaces without counting transfers as spending.</span></div>
        <div className="form-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button" type="submit">Save household</button></div>
      </form>
    </ModalShell>
  );
}

function GoalModal({ scope, onClose, onSubmit }: { scope: ViewScope; onClose: () => void; onSubmit: (goal: Goal) => void }) {
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [current, setCurrent] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [monthlyContribution, setMonthlyContribution] = useState("");
  const [priority, setPriority] = useState<NonNullable<Goal["priority"]>>("important");
  const [space, setSpace] = useState<SpaceId>(scope === "household" ? "household" : "personal");

  function submit(event: FormEvent) {
    event.preventDefault();
    const targetAmount = Number(target);
    const currentAmount = Number(current || 0);
    if (!name.trim() || !targetDate || targetAmount <= 0) return;
    onSubmit({ id: uid("goal"), name: name.trim(), target: targetAmount, current: currentAmount, targetDate, space, icon: space === "household" ? "home" : "spark", monthlyContribution: Math.max(0, Number(monthlyContribution) || 0), priority });
  }

  return (
    <ModalShell eyebrow="A future worth funding" title="Create a goal" onClose={onClose}>
      <form className="form-stack" onSubmit={submit}>
        <div className="form-grid">
          <label className="field full-field"><span>Goal name</span><input autoFocus required value={name} onChange={(event) => setName(event.target.value)} placeholder="What are you building toward?" /></label>
          <label className="field"><span>Target amount</span><input required type="number" min="1" step="1" value={target} onChange={(event) => setTarget(event.target.value)} placeholder="30000" /></label>
          <label className="field"><span>Already saved</span><input type="number" min="0" step="1" value={current} onChange={(event) => setCurrent(event.target.value)} placeholder="0" /></label>
          <label className="field"><span>Target date</span><input required type="date" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} /></label>
          <label className="field"><span>Monthly contribution</span><input type="number" min="0" step="1" value={monthlyContribution} onChange={(event) => setMonthlyContribution(event.target.value)} placeholder="800" /></label>
          <label className="field"><span>Priority</span><select value={priority} onChange={(event) => setPriority(event.target.value as NonNullable<Goal["priority"]>)}><option value="essential">Essential</option><option value="important">Important</option><option value="flexible">Flexible</option></select></label>
          <label className="field"><span>Goal space</span><select value={space} onChange={(event) => setSpace(event.target.value as SpaceId)}><option value="personal">Personal</option><option value="household">Household</option></select></label>
        </div>
        <div className="form-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button" type="submit">Create goal</button></div>
      </form>
    </ModalShell>
  );
}

function PlannedEventModal({ scope, onClose, onSubmit }: { scope: ViewScope; onClose: () => void; onSubmit: (event: PlannedEvent) => void }) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [kind, setKind] = useState<PlannedEvent["kind"]>("travel");
  const [space, setSpace] = useState<SpaceId>(scope === "household" ? "household" : "personal");
  const [note, setNote] = useState("");
  function submit(event: FormEvent) {
    event.preventDefault(); const parsed = Number(amount); if (!name.trim() || !date || parsed <= 0) return;
    onSubmit({ id: uid("event"), name: name.trim(), amount: parsed, date, kind, space, includeInPlan: true, note: note.trim() || undefined });
  }
  return <ModalShell eyebrow="Life happens in the forecast" title="Plan a future event" onClose={onClose}><form className="form-stack" onSubmit={submit}><div className="form-grid"><label className="field full-field"><span>What are you planning?</span><input autoFocus required value={name} onChange={(event) => setName(event.target.value)} placeholder="Japan in spring" /></label><label className="field"><span>Estimated total cost</span><input required type="number" min="1" step="1" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="12000" /></label><label className="field"><span>When</span><input required type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label><label className="field"><span>Kind of plan</span><select value={kind} onChange={(event) => setKind(event.target.value as PlannedEvent["kind"])}><option value="travel">Travel</option><option value="home">Home</option><option value="family">Family</option><option value="education">Education</option><option value="car">Car</option><option value="other">Other</option></select></label><label className="field"><span>Plan space</span><select value={space} onChange={(event) => setSpace(event.target.value as SpaceId)}><option value="personal">Personal</option><option value="household">Household</option></select></label><label className="field full-field"><span>Assumptions or notes</span><input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Flights, hotels, food and shopping" /></label></div><div className="info-note"><WandSparkles size={17} /><span>Lifetime will compare this cost with your monthly surplus and goal contributions, then show the estimated timing trade-off.</span></div><div className="form-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button" type="submit">Add to forecast</button></div></form></ModalShell>;
}

function RecurringModal({ scope, accounts, onClose, onSubmit }: { scope: ViewScope; accounts: Account[]; onClose: () => void; onSubmit: (item: RecurringItem) => void }) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [cadence, setCadence] = useState<RecurringItem["cadence"]>("monthly");
  const [nextDate, setNextDate] = useState("");
  const [accountId, setAccountId] = useState(accounts[0]?.id || "");
  const [category, setCategory] = useState(expenseCategories[0]);
  const selectedAccount = accounts.find((account) => account.id === accountId);

  function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = Number(amount);
    if (!name.trim() || !nextDate || !accountId || parsed <= 0) return;
    onSubmit({ id: uid("recurring"), name: name.trim(), amount: parsed, cadence, nextDate, accountId, category, space: selectedAccount?.space || (scope === "household" ? "household" : "personal"), active: true });
  }

  return (
    <ModalShell eyebrow="Predict what’s next" title="Add recurring payment" onClose={onClose}>
      <form className="form-stack" onSubmit={submit}>
        <div className="form-grid">
          <label className="field"><span>Name</span><input autoFocus required value={name} onChange={(event) => setName(event.target.value)} placeholder="Phone plan" /></label>
          <label className="field"><span>Amount</span><input required type="number" min="0" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="45.00" /></label>
          <label className="field"><span>Cadence</span><select value={cadence} onChange={(event) => setCadence(event.target.value as RecurringItem["cadence"])}><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="yearly">Yearly</option></select></label>
          <label className="field"><span>Next date</span><input required type="date" value={nextDate} onChange={(event) => setNextDate(event.target.value)} /></label>
          <label className="field"><span>Paid from</span><select value={accountId} onChange={(event) => setAccountId(event.target.value)}>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
          <label className="field"><span>Category</span><select value={category} onChange={(event) => setCategory(event.target.value)}>{expenseCategories.map((item) => <option key={item}>{item}</option>)}</select></label>
        </div>
        <div className="form-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button" type="submit">Add recurring payment</button></div>
      </form>
    </ModalShell>
  );
}

function ImportModal({ data, scope, onClose, setData, notify }: { data: FinanceData; scope: ViewScope; onClose: () => void; setData: React.Dispatch<React.SetStateAction<FinanceData>>; notify: (message: string) => void }) {
  const [text, setText] = useState("date,description,amount,type,category,account\n2026-08-14,Coffee,6.50,expense,Food & dining,Everyday");
  const [error, setError] = useState("");

  function importRows() {
    const lines = text.trim().split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) { setError("Add a header and at least one transaction row."); return; }
    const headers = lines[0].split(",").map((value) => value.trim().toLowerCase());
    const required = ["date", "description", "amount"];
    if (required.some((header) => !headers.includes(header))) { setError("The sheet needs date, description, and amount columns."); return; }
    const imported: Transaction[] = [];
    for (const line of lines.slice(1)) {
      const cells = line.split(",").map((value) => value.trim());
      const row = Object.fromEntries(headers.map((header, index) => [header, cells[index] || ""]));
      const amount = Math.abs(Number(row.amount));
      const account = data.accounts.find((item) => item.name.toLowerCase() === row.account?.toLowerCase()) || data.accounts[0];
      const explicitType = row.type?.toLowerCase();
      const type: TransactionType = explicitType === "income" || explicitType === "transfer" || explicitType === "expense"
        ? explicitType
        : Number(row.amount) < 0 ? "expense" : "income";
      if (!row.date || !row.description || !Number.isFinite(amount) || amount <= 0 || !account || type === "transfer") continue;
      imported.push({ id: uid("sheet"), type, amount, date: row.date, description: row.description, category: row.category || (type === "income" ? "Income" : "Other"), accountId: account.id, space: account.space || (scope === "household" ? "household" : "personal"), source: "sheet" });
    }
    if (!imported.length) { setError("No valid rows were found. Transfers should be added in the app so both accounts stay linked."); return; }
    setData((current) => ({
      ...current,
      accounts: imported.reduce((accounts, transaction) => applyTransaction(accounts, transaction), current.accounts),
      transactions: [...imported, ...current.transactions],
    }));
    onClose();
    notify(`${imported.length} transaction${imported.length === 1 ? "" : "s"} imported from your sheet.`);
  }

  return (
    <ModalShell eyebrow="Sheets and statements" title="Import transactions" onClose={onClose}>
      <div className="import-copy"><span className="import-icon"><FileSpreadsheet size={22} /></span><div><strong>Paste rows from Google Sheets or a CSV</strong><p>Use the columns date, description, amount, type, category, and account. Negative amounts become expenses when type is blank.</p></div></div>
      <textarea className="import-textarea" value={text} onChange={(event) => { setText(event.target.value); setError(""); }} aria-label="Transaction CSV data" />
      <div className="info-note"><ShieldCheck size={17} /><span>Imported rows are saved to your signed-in workspace. Transfers are intentionally skipped here so they can be linked safely between two accounts in the ledger.</span></div>
      {error && <p className="form-error">{error}</p>}
      <div className="form-actions"><button className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button" onClick={importRows}>Import rows</button></div>
    </ModalShell>
  );
}
