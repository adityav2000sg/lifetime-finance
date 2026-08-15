"use client";

import React, { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Bell,
  CalendarDays,
  ChartNoAxesCombined,
  Check,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  Download,
  FileSpreadsheet,
  Home,
  Landmark,
  Layers3,
  LayoutDashboard,
  Leaf,
  Menu,
  MoreHorizontal,
  PiggyBank,
  Plus,
  Repeat2,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  Upload,
  UserRound,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import {
  Account,
  AccountType,
  FinanceData,
  Goal,
  RecurringItem,
  SpaceId,
  Transaction,
  TransactionType,
  ViewScope,
  accountTypeLabels,
  categoryColors,
  createSeedData,
  expenseCategories,
  formatDate,
  formatMoney,
  inScope,
  monthKey,
  uid,
} from "@/lib/finance";

type ViewId = "overview" | "activity" | "accounts" | "plans" | "insights";
type ModalId = "transaction" | "account" | "goal" | "recurring" | "import" | null;

const navItems: { id: ViewId; label: string; icon: React.ElementType }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "activity", label: "Activity", icon: ArrowLeftRight },
  { id: "accounts", label: "Accounts", icon: WalletCards },
  { id: "plans", label: "Plans", icon: Target },
  { id: "insights", label: "Insights", icon: ChartNoAxesCombined },
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

export default function LifetimeFinanceHub() {
  const [data, setData] = useState<FinanceData>(() => createSeedData());
  const [scope, setScope] = useState<ViewScope>("all");
  const [activeView, setActiveView] = useState<ViewId>("overview");
  const [modal, setModal] = useState<ModalId>(null);
  const [search, setSearch] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(() => monthKey(new Date()));
  const [toast, setToast] = useState<string | null>(null);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [goalContribution, setGoalContribution] = useState<string | null>(null);
  const [contributionAmount, setContributionAmount] = useState("");
  const loaded = useRef(false);

  useEffect(() => {
    const saved = window.localStorage.getItem("lifetimeFinanceDataV2");
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as FinanceData;
        if (parsed.version === 2) setData(parsed);
      } catch {
        setToast("We could not read the saved copy, so the sample workspace is open.");
      }
    }
    loaded.current = true;
  }, []);

  useEffect(() => {
    if (loaded.current) {
      window.localStorage.setItem("lifetimeFinanceDataV2", JSON.stringify(data));
    }
  }, [data]);

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
    .reduce((sum, item) => sum + (item.cadence === "monthly" ? item.amount : item.cadence === "quarterly" ? item.amount / 3 : item.amount / 12), 0);

  const categoryTotals = useMemo(() => {
    const totals = new Map<string, number>();
    monthTransactions
      .filter((transaction) => transaction.type === "expense")
      .forEach((transaction) => totals.set(transaction.category, (totals.get(transaction.category) || 0) + transaction.amount));
    return [...totals.entries()].sort((a, b) => b[1] - a[1]);
  }, [monthTransactions]);

  const visibleTransactions = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return scopedTransactions;
    return scopedTransactions.filter((transaction) =>
      [transaction.description, transaction.category, transaction.note, transaction.source]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [scopedTransactions, search]);

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

  function addTransaction(transaction: Transaction) {
    setData((current) => ({
      ...current,
      accounts: applyTransaction(current.accounts, transaction),
      transactions: [transaction, ...current.transactions],
    }));
    setModal(null);
    notify(transaction.type === "transfer" ? "Transfer recorded — spending stayed unchanged." : "Transaction added.");
  }

  function deleteTransaction(transaction: Transaction) {
    setData((current) => ({
      ...current,
      accounts: applyTransaction(current.accounts, transaction, -1),
      transactions: current.transactions.filter((item) => item.id !== transaction.id),
    }));
    notify("Transaction removed and balances restored.");
  }

  function addAccount(account: Account) {
    setData((current) => ({ ...current, accounts: [...current.accounts, account] }));
    setModal(null);
    notify("Account added to your workspace.");
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
    setData(createSeedData());
    setScope("all");
    setActiveView("overview");
    notify("Sample workspace restored.");
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
          <span className="avatar">PP</span>
          <div><strong>{data.profile.name}</strong><small>{data.profile.householdName}</small></div>
          <MoreHorizontal size={18} />
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
                  onClick={() => setScope(option.id)}
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
            <button className="icon-button" aria-label="Notifications"><Bell size={19} /><span className="notification-dot" /></button>
            <button className="primary-button compact-button" onClick={() => setModal("transaction")}><Plus size={18} /> Add transaction</button>
          </div>
        </header>

        <main className="content">
          {activeView === "overview" && (
            <Overview
              scope={scope}
              scopeLabel={currentScope.label}
              profileName={data.profile.name}
              selectedMonth={selectedMonth}
              selectedMonthLabel={selectedMonthLabel}
              setSelectedMonth={setSelectedMonth}
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
              onAdd={() => setModal("transaction")}
              onView={(view) => setActiveView(view)}
              goalContribution={goalContribution}
              setGoalContribution={setGoalContribution}
              contributionAmount={contributionAmount}
              setContributionAmount={setContributionAmount}
              fundGoal={fundGoal}
              data={data}
            />
          )}

          {activeView === "activity" && (
            <ActivityView
              transactions={visibleTransactions}
              accounts={data.accounts}
              search={search}
              setSearch={setSearch}
              onAdd={() => setModal("transaction")}
              onImport={() => setModal("import")}
              onDelete={deleteTransaction}
              selectedMonthLabel={selectedMonthLabel}
            />
          )}

          {activeView === "accounts" && (
            <AccountsView
              accounts={scopedAccounts}
              netWorth={netWorth}
              onAdd={() => setModal("account")}
            />
          )}

          {activeView === "plans" && (
            <PlansView
              goals={scopedGoals}
              recurring={scopedRecurring}
              accounts={data.accounts}
              recurringCost={activeRecurringCost}
              onAddGoal={() => setModal("goal")}
              onAddRecurring={() => setModal("recurring")}
              onToggleRecurring={toggleRecurring}
              goalContribution={goalContribution}
              setGoalContribution={setGoalContribution}
              contributionAmount={contributionAmount}
              setContributionAmount={setContributionAmount}
              fundGoal={fundGoal}
            />
          )}

          {activeView === "insights" && (
            <InsightsView
              monthSeries={monthSeries}
              maxSeriesValue={maxSeriesValue}
              categoryTotals={categoryTotals}
              monthSpending={monthSpending}
              savingsRate={savingsRate}
              recurringCost={activeRecurringCost}
              onExport={exportData}
              onImport={() => setModal("import")}
              onReset={resetSample}
            />
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

      <button className="mobile-fab" onClick={() => setModal("transaction")} aria-label="Add transaction"><Plus size={24} /></button>

      {modal === "transaction" && <TransactionModal accounts={data.accounts} scope={scope} onClose={() => setModal(null)} onSubmit={addTransaction} />}
      {modal === "account" && <AccountModal scope={scope} profileName={data.profile.name} partnerName={data.profile.partnerName} onClose={() => setModal(null)} onSubmit={addAccount} />}
      {modal === "goal" && <GoalModal scope={scope} onClose={() => setModal(null)} onSubmit={addGoal} />}
      {modal === "recurring" && <RecurringModal scope={scope} accounts={data.accounts} onClose={() => setModal(null)} onSubmit={addRecurring} />}
      {modal === "import" && <ImportModal data={data} scope={scope} onClose={() => setModal(null)} setData={setData} notify={notify} />}

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
  goalContribution,
  setGoalContribution,
  contributionAmount,
  setContributionAmount,
  fundGoal,
  data,
}: {
  scope: ViewScope;
  scopeLabel: string;
  profileName: string;
  selectedMonth: string;
  selectedMonthLabel: string;
  setSelectedMonth: (value: string) => void;
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
  goalContribution: string | null;
  setGoalContribution: (id: string | null) => void;
  contributionAmount: string;
  setContributionAmount: (value: string) => void;
  fundGoal: (id: string) => void;
  data: FinanceData;
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
          <button className="hero-button" onClick={onAdd}><Plus size={18} /> Add transaction</button>
          <button className="hero-secondary" onClick={() => onView("accounts")}>View accounts <ChevronRight size={17} /></button>
        </div>
      </section>

      <div className="month-row">
        <div>
          <p className="eyebrow">Monthly pulse</p>
          <h2>{selectedMonthLabel}</h2>
        </div>
        <label className="month-picker"><CalendarDays size={17} /><span>Change month</span><input type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} /></label>
      </div>

      <section className="metric-grid">
        <MetricCard label="Income" value={monthIncome} note="Money added" tone="green" icon={<ArrowDownLeft size={19} />} />
        <MetricCard label="Spending" value={monthSpending} note={`${transactions.filter((item) => item.type === "expense" && monthKey(item.date) === selectedMonth).length} transactions`} tone="coral" icon={<ArrowUpRight size={19} />} />
        <MetricCard label="Cash flow" value={monthCashFlow} note="Transfers excluded" tone="blue" icon={<ArrowLeftRight size={19} />} />
        <MetricCard label="Savings rate" value={savingsRate} suffix="%" note="After spending" tone="gold" icon={<PiggyBank size={19} />} money={false} />
      </section>

      <div className="dashboard-grid">
        <section className="panel accounts-panel">
          <PanelHeading eyebrow="Accounts" title="Where your money lives" action="See all" onAction={() => onView("accounts")} />
          <div className="account-list">
            {accounts.slice(0, 4).map((account) => <AccountRow key={account.id} account={account} />)}
          </div>
        </section>

        <section className="panel spending-panel">
          <PanelHeading eyebrow="Spending" title="This month by category" action="Insights" onAction={() => onView("insights")} />
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
          <PanelHeading eyebrow="Activity" title="Recent transactions" action="See all" onAction={() => onView("activity")} />
          <div className="transaction-list compact-list">
            {transactions.slice(0, 6).map((transaction) => <TransactionRow key={transaction.id} transaction={transaction} accounts={data.accounts} />)}
          </div>
        </section>

        <section className="panel goal-panel">
          <PanelHeading eyebrow="Next milestone" title={goal ? goal.name : "Create your first goal"} action="All plans" onAction={() => onView("plans")} />
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
          <PanelHeading eyebrow="On the horizon" title="Upcoming payments" action="Manage" onAction={() => onView("plans")} />
          <div className="upcoming-list">
            {recurring.filter((item) => item.active).slice(0, 3).map((item) => (
              <div key={item.id}>
                <span className="date-tile"><strong>{new Date(`${item.nextDate}T12:00:00`).getDate()}</strong><small>{new Date(`${item.nextDate}T12:00:00`).toLocaleDateString("en-SG", { month: "short" })}</small></span>
                <span className="upcoming-name"><strong>{item.name}</strong><small>{item.cadence}</small></span>
                <strong>{formatMoney(item.amount)}</strong>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function ActivityView({ transactions, accounts, search, setSearch, onAdd, onImport, onDelete, selectedMonthLabel }: {
  transactions: Transaction[];
  accounts: Account[];
  search: string;
  setSearch: (value: string) => void;
  onAdd: () => void;
  onImport: () => void;
  onDelete: (transaction: Transaction) => void;
  selectedMonthLabel: string;
}) {
  const grouped = transactions.reduce<Record<string, Transaction[]>>((result, transaction) => {
    (result[transaction.date] ||= []).push(transaction);
    return result;
  }, {});

  return (
    <div className="page-stack">
      <PageHeading eyebrow="Unified ledger" title="Activity" copy={`Every movement, across every account. Transfers never count as income or spending.`}>
        <button className="secondary-button" onClick={onImport}><Upload size={17} /> Import</button>
        <button className="primary-button" onClick={onAdd}><Plus size={18} /> Add transaction</button>
      </PageHeading>

      <div className="ledger-toolbar">
        <label className="search-field"><Search size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search merchant, category, or note" /></label>
        <span className="filter-chip"><CalendarDays size={16} /> {selectedMonthLabel}<ChevronDown size={15} /></span>
        <span className="filter-chip">All types<ChevronDown size={15} /></span>
      </div>

      <section className="panel ledger-panel">
        {Object.entries(grouped).length ? Object.entries(grouped).map(([date, items]) => (
          <div className="transaction-day" key={date}>
            <div className="day-heading"><span>{formatDate(date)}</span><small>{items.length} item{items.length === 1 ? "" : "s"}</small></div>
            {items.map((transaction) => (
              <TransactionRow key={transaction.id} transaction={transaction} accounts={accounts} showSpace onDelete={() => onDelete(transaction)} />
            ))}
          </div>
        )) : <EmptyState icon={<Search />} title="Nothing matched" copy="Try a different search or add a transaction." />}
      </section>
    </div>
  );
}

function AccountsView({ accounts, netWorth, onAdd }: { accounts: Account[]; netWorth: number; onAdd: () => void }) {
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
        {accounts.map((account) => <AccountCard key={account.id} account={account} />)}
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
          <button className="text-button danger-text" onClick={onReset}>Restore sample workspace</button>
        </div>
      </section>
    </div>
  );
}

function MetricCard({ label, value, note, tone, icon, suffix = "", money = true }: { label: string; value: number; note: string; tone: string; icon: React.ReactNode; suffix?: string; money?: boolean }) {
  return (
    <article className={`metric-card metric-${tone}`}>
      <div className="metric-top"><span>{label}</span><i>{icon}</i></div>
      <strong>{money ? formatMoney(value) : `${value.toFixed(0)}${suffix}`}</strong>
      <small>{note}</small>
    </article>
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
  if (type === "savings") return PiggyBank;
  return Landmark;
}

function AccountRow({ account }: { account: Account }) {
  const Icon = accountIcon(account.type);
  return (
    <div className="account-row">
      <span className={`account-icon accent-${account.accent}`}><Icon size={18} /></span>
      <span className="account-name"><strong>{account.name}</strong><small>{account.institution} · •{account.last4}</small></span>
      <span className="account-scope">{account.space === "household" ? <Users size={13} /> : <UserRound size={13} />}{account.space === "household" ? "Shared" : "Personal"}</span>
      <strong className={account.balance < 0 ? "negative-value" : ""}>{formatMoney(account.balance)}</strong>
    </div>
  );
}

function AccountCard({ account }: { account: Account }) {
  const Icon = accountIcon(account.type);
  return (
    <article className={`account-card account-card-${account.accent}`}>
      <div className="account-card-top"><span><Icon size={20} /></span><MoreHorizontal size={19} /></div>
      <p>{account.institution}</p>
      <h3>{account.name}</h3>
      <strong>{formatMoney(account.balance)}</strong>
      <div><span>{accountTypeLabels[account.type]} · •{account.last4}</span><span>{account.space === "household" ? <Users size={14} /> : <UserRound size={14} />}{account.space === "household" ? "Shared" : account.owner}</span></div>
    </article>
  );
}

function TransactionRow({ transaction, accounts, showSpace = false, onDelete }: { transaction: Transaction; accounts: Account[]; showSpace?: boolean; onDelete?: () => void }) {
  const source = accounts.find((account) => account.id === transaction.accountId);
  const destination = accounts.find((account) => account.id === transaction.transferAccountId);
  const Icon = transaction.type === "income" ? ArrowDownLeft : transaction.type === "transfer" ? ArrowLeftRight : ArrowUpRight;
  return (
    <div className="transaction-row">
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
      {onDelete && <button className="row-delete" onClick={onDelete} aria-label={`Delete ${transaction.description}`}><Trash2 size={16} /></button>}
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

function TransactionModal({ accounts, scope, onClose, onSubmit }: { accounts: Account[]; scope: ViewScope; onClose: () => void; onSubmit: (transaction: Transaction) => void }) {
  const defaultAccount = accounts.find((account) => account.space === (scope === "all" ? "personal" : scope)) || accounts[0];
  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(expenseCategories[0]);
  const [date, setDate] = useState(todayIso());
  const [accountId, setAccountId] = useState(defaultAccount?.id || "");
  const [transferAccountId, setTransferAccountId] = useState("");
  const [note, setNote] = useState("");

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
      id: uid("tx"),
      type,
      amount: parsedAmount,
      description: description.trim(),
      category: type === "transfer" ? "Transfer" : type === "income" ? "Income" : category,
      date,
      accountId,
      transferAccountId: type === "transfer" ? transferAccountId : undefined,
      note: note.trim() || undefined,
      space: transactionScope,
      source: "manual",
    });
  }

  return (
    <ModalShell eyebrow="Quick capture" title="Add transaction" onClose={onClose}>
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
        <div className="form-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button" type="submit">Save {type}</button></div>
      </form>
    </ModalShell>
  );
}

function AccountModal({ scope, profileName, partnerName, onClose, onSubmit }: { scope: ViewScope; profileName: string; partnerName: string; onClose: () => void; onSubmit: (account: Account) => void }) {
  const [name, setName] = useState("");
  const [institution, setInstitution] = useState("");
  const [type, setType] = useState<AccountType>("checking");
  const [balance, setBalance] = useState("");
  const [space, setSpace] = useState<SpaceId>(scope === "household" ? "household" : "personal");
  const [last4, setLast4] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = Number(balance);
    if (!name.trim() || !institution.trim() || !Number.isFinite(parsed)) return;
    onSubmit({ id: uid("acct"), name: name.trim(), institution: institution.trim(), type, balance: parsed, space, owner: space === "household" ? `${profileName} + ${partnerName}` : profileName, currency: "SGD", last4: last4.slice(-4), accent: accountAccents[Math.floor(Math.random() * accountAccents.length)] });
  }

  return (
    <ModalShell eyebrow="Balance sheet" title="Add an account" onClose={onClose}>
      <form className="form-stack" onSubmit={submit}>
        <div className="form-grid">
          <label className="field"><span>Account name</span><input autoFocus required value={name} onChange={(event) => setName(event.target.value)} placeholder="Rainy day fund" /></label>
          <label className="field"><span>Institution</span><input required value={institution} onChange={(event) => setInstitution(event.target.value)} placeholder="DBS, HSBC, Revolut…" /></label>
          <label className="field"><span>Account type</span><select value={type} onChange={(event) => setType(event.target.value as AccountType)}>{Object.entries(accountTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="field"><span>Current balance</span><input required type="number" step="0.01" value={balance} onChange={(event) => setBalance(event.target.value)} placeholder="0.00" /></label>
          <label className="field"><span>Belongs to</span><select value={space} onChange={(event) => setSpace(event.target.value as SpaceId)}><option value="personal">Personal</option><option value="household">Household</option></select></label>
          <label className="field"><span>Last four digits (optional)</span><input maxLength={4} inputMode="numeric" value={last4} onChange={(event) => setLast4(event.target.value.replace(/\D/g, ""))} placeholder="2841" /></label>
        </div>
        <div className="form-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button" type="submit">Add account</button></div>
      </form>
    </ModalShell>
  );
}

function GoalModal({ scope, onClose, onSubmit }: { scope: ViewScope; onClose: () => void; onSubmit: (goal: Goal) => void }) {
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [current, setCurrent] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [space, setSpace] = useState<SpaceId>(scope === "household" ? "household" : "personal");

  function submit(event: FormEvent) {
    event.preventDefault();
    const targetAmount = Number(target);
    const currentAmount = Number(current || 0);
    if (!name.trim() || !targetDate || targetAmount <= 0) return;
    onSubmit({ id: uid("goal"), name: name.trim(), target: targetAmount, current: currentAmount, targetDate, space, icon: space === "household" ? "home" : "spark" });
  }

  return (
    <ModalShell eyebrow="A future worth funding" title="Create a goal" onClose={onClose}>
      <form className="form-stack" onSubmit={submit}>
        <div className="form-grid">
          <label className="field full-field"><span>Goal name</span><input autoFocus required value={name} onChange={(event) => setName(event.target.value)} placeholder="What are you building toward?" /></label>
          <label className="field"><span>Target amount</span><input required type="number" min="1" step="1" value={target} onChange={(event) => setTarget(event.target.value)} placeholder="30000" /></label>
          <label className="field"><span>Already saved</span><input type="number" min="0" step="1" value={current} onChange={(event) => setCurrent(event.target.value)} placeholder="0" /></label>
          <label className="field"><span>Target date</span><input required type="date" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} /></label>
          <label className="field"><span>Goal space</span><select value={space} onChange={(event) => setSpace(event.target.value as SpaceId)}><option value="personal">Personal</option><option value="household">Household</option></select></label>
        </div>
        <div className="form-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button" type="submit">Create goal</button></div>
      </form>
    </ModalShell>
  );
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
      <div className="info-note"><ShieldCheck size={17} /><span>Your pasted data stays on this device. Imported transfers are intentionally skipped so they can be linked safely in the ledger.</span></div>
      {error && <p className="form-error">{error}</p>}
      <div className="form-actions"><button className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button" onClick={importRows}>Import rows</button></div>
    </ModalShell>
  );
}
