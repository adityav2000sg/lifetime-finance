'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, ChevronLeft, ChevronRight, Download, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

interface MonthData {
  expenses: any[];
  subscriptions: any[];
  investments: any[];
  goals: any[];
  income: any[];
  monthNotes: string;
}

interface Data {
  months: Record<string, MonthData>;
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
  prefix?: string;
}

export default function LifetimeFinanceHub() {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [data, setData] = useState<Data>({ months: {} });
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [showAddForm, setShowAddForm] = useState<string | null>(null);

  const getMonthKey = (date: Date): string => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  };

  const monthKey = getMonthKey(currentMonth);
  const monthData: MonthData = data.months[monthKey] || {
    expenses: [],
    subscriptions: [],
    investments: [],
    goals: [],
    income: [],
    monthNotes: ''
  };

  const [forms, setForms] = useState({
    expense: { name: '', amount: '', category: 'food', day: String(new Date().getDate()).padStart(2, '0'), notes: '' },
    subscription: { name: '', amount: '', billingCycle: 'monthly', notes: '' },
    investment: { name: '', amount: '', type: 'stocks', expectedReturn: '', notes: '' },
    goal: { name: '', targetAmount: '', currentAmount: '', category: 'savings', notes: '' },
    income: { source: '', amount: '', frequency: 'monthly', notes: '' }
  });

  const expenseCategories = ['food', 'transport', 'utilities', 'entertainment', 'health', 'shopping', 'other'];
  const investmentTypes = ['stocks', 'crypto', 'bonds', 'real_estate', 'mutual_funds', 'other'];
  const goalCategories = ['savings', 'travel', 'property', 'car', 'emergency', 'retirement', 'education'];

  useEffect(() => {
    const saved = localStorage.getItem('lifetimeFinanceData');
    if (saved) {
      try {
        setData(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load data:', e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('lifetimeFinanceData', JSON.stringify(data));
  }, [data]);

  const updateMonthData = (updater: (m: MonthData) => MonthData): void => {
    setData({
      ...data,
      months: {
        ...data.months,
        [monthKey]: updater(monthData)
      }
    });
  };

  const getTotalExpenses = (month: string): number => {
    const m = data.months[month] || monthData;
    return m.expenses.reduce((sum: number, e: any) => sum + (parseFloat(e.amount) || 0), 0);
  };

  const getTotalSubscriptions = (month: string): number => {
    const m = data.months[month] || monthData;
    return m.subscriptions.reduce((sum: number, s: any) => sum + (parseFloat(s.amount) || 0), 0);
  };

  const getTotalIncome = (month: string): number => {
    const m = data.months[month] || monthData;
    return m.income.reduce((sum: number, i: any) => sum + (parseFloat(i.amount) || 0), 0);
  };

  const getTotalInvestments = (month: string): number => {
    const m = data.months[month] || monthData;
    return m.investments.reduce((sum: number, i: any) => sum + (parseFloat(i.amount) || 0), 0);
  };

  const currentExpenses = getTotalExpenses(monthKey);
  const currentSubscriptions = getTotalSubscriptions(monthKey);
  const currentIncome = getTotalIncome(monthKey);
  const currentInvestments = getTotalInvestments(monthKey);
  const netMonthly = currentIncome - currentExpenses - currentSubscriptions - currentInvestments;

  const getAllMonthKeys = (): string[] => {
    return Object.keys(data.months || {}).sort();
  };

  const getYearToDateStats = () => {
    const currentYear = currentMonth.getFullYear();
    const keys = getAllMonthKeys().filter(key => parseInt(key.split('-')[0]) === currentYear);
    const expenses = keys.reduce((sum, k) => sum + getTotalExpenses(k), 0);
    const income = keys.reduce((sum, k) => sum + getTotalIncome(k), 0);
    const investments = keys.reduce((sum, k) => sum + getTotalInvestments(k), 0);
    return { expenses, income, investments, net: income - expenses - investments };
  };

  const getAllTimeStats = () => {
    const keys = getAllMonthKeys();
    const expenses = keys.reduce((sum, k) => sum + getTotalExpenses(k), 0);
    const income = keys.reduce((sum, k) => sum + getTotalIncome(k), 0);
    const investments = keys.reduce((sum, k) => sum + getTotalInvestments(k), 0);
    return { expenses, income, investments, net: income - expenses - investments };
  };

  const addExpense = (): void => {
    if (forms.expense.name && forms.expense.amount) {
      updateMonthData(m => ({
        ...m,
        expenses: [...m.expenses, { ...forms.expense, id: Date.now(), amount: parseFloat(forms.expense.amount) }]
      }));
      setForms({ ...forms, expense: { name: '', amount: '', category: 'food', day: String(new Date().getDate()).padStart(2, '0'), notes: '' } });
      setShowAddForm('');
    }
  };

  const addSubscription = (): void => {
    if (forms.subscription.name && forms.subscription.amount) {
      updateMonthData(m => ({
        ...m,
        subscriptions: [...m.subscriptions, { ...forms.subscription, id: Date.now(), amount: parseFloat(forms.subscription.amount) }]
      }));
      setForms({ ...forms, subscription: { name: '', amount: '', billingCycle: 'monthly', notes: '' } });
      setShowAddForm('');
    }
  };

  const addInvestment = (): void => {
    if (forms.investment.name && forms.investment.amount) {
      updateMonthData(m => ({
        ...m,
        investments: [...m.investments, { ...forms.investment, id: Date.now(), amount: parseFloat(forms.investment.amount), expectedReturn: parseFloat(forms.investment.expectedReturn) || 0 }]
      }));
      setForms({ ...forms, investment: { name: '', amount: '', type: 'stocks', expectedReturn: '', notes: '' } });
      setShowAddForm('');
    }
  };

  const addGoal = (): void => {
    if (forms.goal.name && forms.goal.targetAmount) {
      updateMonthData(m => ({
        ...m,
        goals: [...m.goals, { ...forms.goal, id: Date.now(), targetAmount: parseFloat(forms.goal.targetAmount), currentAmount: parseFloat(forms.goal.currentAmount) || 0 }]
      }));
      setForms({ ...forms, goal: { name: '', targetAmount: '', currentAmount: '', category: 'savings', notes: '' } });
      setShowAddForm('');
    }
  };

  const addIncome = (): void => {
    if (forms.income.source && forms.income.amount) {
      updateMonthData(m => ({
        ...m,
        income: [...m.income, { ...forms.income, id: Date.now(), amount: parseFloat(forms.income.amount) }]
      }));
      setForms({ ...forms, income: { source: '', amount: '', frequency: 'monthly', notes: '' } });
      setShowAddForm('');
    }
  };

  const deleteExpense = (id: number): void => {
    updateMonthData(m => ({ ...m, expenses: m.expenses.filter((e: any) => e.id !== id) }));
  };

  const deleteSubscription = (id: number): void => {
    updateMonthData(m => ({ ...m, subscriptions: m.subscriptions.filter((s: any) => s.id !== id) }));
  };

  const deleteInvestment = (id: number): void => {
    updateMonthData(m => ({ ...m, investments: m.investments.filter((i: any) => i.id !== id) }));
  };

  const deleteGoal = (id: number): void => {
    updateMonthData(m => ({ ...m, goals: m.goals.filter((g: any) => g.id !== id) }));
  };

  const deleteIncome = (id: number): void => {
    updateMonthData(m => ({ ...m, income: m.income.filter((i: any) => i.id !== id) }));
  };

  const goToPreviousMonth = (): void => {
    const prev = new Date(currentMonth);
    prev.setMonth(prev.getMonth() - 1);
    setCurrentMonth(prev);
  };

  const goToNextMonth = (): void => {
    const next = new Date(currentMonth);
    next.setMonth(next.getMonth() + 1);
    setCurrentMonth(next);
  };

  const goToToday = (): void => {
    setCurrentMonth(new Date());
  };

  const exportData = (): void => {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lifetime-finance-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const ytdStats = getYearToDateStats();
  const allTimeStats = getAllTimeStats();
  const isCurrentMonth = monthKey === getMonthKey(new Date());

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black text-white">
      <div className="fixed inset-0 opacity-5 pointer-events-none">
        <div style={{
          backgroundImage: 'linear-gradient(rgba(0,255,150,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,150,0.1) 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }}></div>
      </div>

      <div className="relative z-10">
        <header className="border-b border-cyan-500/20 backdrop-blur-sm bg-black/30 sticky top-0">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h1 className="text-4xl font-black tracking-tighter" style={{
                  background: 'linear-gradient(135deg, #00ff96 0%, #00d4ff 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}>
                  LIFETIME LEDGER
                </h1>
                <p className="text-cyan-400/60 text-xs tracking-widest mt-1">Your Complete Financial Archive</p>
              </div>
              <button
                onClick={exportData}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg hover:border-cyan-500/60 hover:bg-cyan-500/20 transition-all text-sm font-semibold"
              >
                <Download className="w-4 h-4" />
                Export All
              </button>
            </div>

            <div className="flex items-center justify-between bg-black/50 border border-cyan-500/20 rounded-xl p-4">
              <button onClick={goToPreviousMonth} className="p-2 hover:bg-cyan-500/10 rounded transition-all">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="flex-1 text-center">
                <p className="text-2xl font-black tracking-tighter">
                  {currentMonth.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
                </p>
                {!isCurrentMonth && (
                  <button onClick={goToToday} className="text-xs text-cyan-400 hover:text-cyan-300 mt-1 underline">
                    Go to today
                  </button>
                )}
              </div>
              <button
                onClick={goToNextMonth}
                disabled={!isCurrentMonth}
                className={`p-2 rounded transition-all ${isCurrentMonth ? 'hover:bg-cyan-500/10' : 'opacity-50 cursor-not-allowed'}`}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        <div className="border-b border-cyan-500/10 backdrop-blur-sm bg-black/20 sticky top-20 z-20">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex gap-1 overflow-x-auto">
              {['dashboard', 'expenses', 'subscriptions', 'investments', 'goals', 'income', 'history'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-3 text-sm font-semibold tracking-widest whitespace-nowrap transition-all border-b-2 ${
                    activeTab === tab
                      ? 'border-cyan-500 text-cyan-400'
                      : 'border-transparent text-cyan-400/50 hover:text-cyan-400'
                  }`}
                >
                  {tab === 'dashboard' ? '📊 Dashboard' : tab === 'history' ? '📈 History' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <main className="max-w-7xl mx-auto px-6 py-12">
          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <StatCard icon={<DollarSign />} label="Income" value={currentIncome} color="emerald" />
                <StatCard icon={<TrendingDown />} label="Expenses" value={currentExpenses} color="red" />
                <StatCard icon={<TrendingDown />} label="Subscriptions" value={currentSubscriptions} color="orange" />
                <StatCard icon={<TrendingUp />} label="Invested" value={currentInvestments} color="cyan" />
                <StatCard
                  icon={<DollarSign />}
                  label="Net"
                  value={Math.abs(netMonthly)}
                  color={netMonthly >= 0 ? 'emerald' : 'red'}
                  prefix={netMonthly >= 0 ? '+' : '-'}
                />
              </section>

              <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-black/50 backdrop-blur border border-cyan-500/20 rounded-2xl p-6">
                  <p className="text-cyan-400/60 text-sm tracking-widest mb-4">YEAR TO DATE</p>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <p className="text-sm">Income</p>
                      <p className="font-bold text-emerald-400">${ytdStats.income.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-sm">Expenses</p>
                      <p className="font-bold text-red-400">${ytdStats.expenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-sm">Invested</p>
                      <p className="font-bold text-cyan-400">${ytdStats.investments.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                    <div className="border-t border-cyan-500/20 pt-3 flex justify-between items-center">
                      <p className="text-sm font-semibold">Net</p>
                      <p className={`font-black text-lg ${ytdStats.net >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        ${Math.abs(ytdStats.net).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-black/50 backdrop-blur border border-cyan-500/20 rounded-2xl p-6">
                  <p className="text-cyan-400/60 text-sm tracking-widest mb-4">ALL-TIME TOTAL</p>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <p className="text-sm">Income</p>
                      <p className="font-bold text-emerald-400">${allTimeStats.income.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-sm">Expenses</p>
                      <p className="font-bold text-red-400">${allTimeStats.expenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-sm">Invested</p>
                      <p className="font-bold text-cyan-400">${allTimeStats.investments.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                    <div className="border-t border-cyan-500/20 pt-3 flex justify-between items-center">
                      <p className="text-sm font-semibold">Net</p>
                      <p className={`font-black text-lg ${allTimeStats.net >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        ${Math.abs(allTimeStats.net).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-black tracking-tighter mb-4">Recent Expenses</h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {monthData.expenses.length === 0 ? (
                      <p className="text-cyan-400/50 text-sm">No expenses this month</p>
                    ) : (
                      monthData.expenses.map((exp: any) => (
                        <div key={exp.id} className="flex justify-between items-center p-3 bg-black/30 rounded-lg border border-cyan-500/10 hover:border-cyan-500/30 transition-all group">
                          <div className="flex-1">
                            <p className="font-semibold text-sm">{exp.name}</p>
                            <p className="text-cyan-400/50 text-xs">{exp.category} • Day {exp.day}</p>
                          </div>
                          <p className="text-red-400 font-bold ml-2">${parseFloat(exp.amount).toFixed(2)}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-black tracking-tighter mb-4">Income Sources</h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {monthData.income.length === 0 ? (
                      <p className="text-cyan-400/50 text-sm">No income tracked this month</p>
                    ) : (
                      monthData.income.map((inc: any) => (
                        <div key={inc.id} className="flex justify-between items-center p-3 bg-black/30 rounded-lg border border-cyan-500/10 hover:border-cyan-500/30 transition-all group">
                          <div className="flex-1">
                            <p className="font-semibold text-sm">{inc.source}</p>
                            <p className="text-cyan-400/50 text-xs">{inc.frequency}</p>
                          </div>
                          <p className="text-emerald-400 font-bold ml-2">+${parseFloat(inc.amount).toFixed(2)}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'expenses' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black tracking-tighter">Expenses</h2>
                <button
                  onClick={() => setShowAddForm(showAddForm === 'expense' ? '' : 'expense')}
                  className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-black font-semibold rounded-lg hover:bg-cyan-400 transition-all"
                >
                  <Plus className="w-4 h-4" /> Add
                </button>
              </div>

              {showAddForm === 'expense' && (
                <ExpenseForm
                  form={forms.expense}
                  setForm={(form: any) => setForms({ ...forms, expense: form })}
                  onSubmit={addExpense}
                  onCancel={() => setShowAddForm('')}
                  categories={expenseCategories}
                />
              )}

              <div className="space-y-2">
                {monthData.expenses.length === 0 ? (
                  <p className="text-cyan-400/50 text-center py-8">No expenses this month</p>
                ) : (
                  monthData.expenses.map((exp: any) => (
                    <div key={exp.id} className="flex justify-between items-center p-4 bg-black/30 rounded-lg border border-cyan-500/10 hover:border-cyan-500/30 transition-all group">
                      <div>
                        <p className="font-semibold">{exp.name}</p>
                        <p className="text-cyan-400/50 text-xs">{exp.category} • Day {exp.day} {exp.notes && `• ${exp.notes}`}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="text-red-400 font-bold">${parseFloat(exp.amount).toFixed(2)}</p>
                        <button
                          onClick={() => deleteExpense(exp.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'subscriptions' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black tracking-tighter">Subscriptions</h2>
                <button
                  onClick={() => setShowAddForm(showAddForm === 'subscription' ? '' : 'subscription')}
                  className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-black font-semibold rounded-lg hover:bg-cyan-400 transition-all"
                >
                  <Plus className="w-4 h-4" /> Add
                </button>
              </div>

              {showAddForm === 'subscription' && (
                <SubscriptionForm
                  form={forms.subscription}
setForm={(form: any) => setForms({ ...forms, subscription: form })}
                  onSubmit={addSubscription}
                  onCancel={() => setShowAddForm('')}
                />
              )}

              <div className="space-y-2">
                {monthData.subscriptions.length === 0 ? (
                  <p className="text-cyan-400/50 text-center py-8">No subscriptions this month</p>
                ) : (
                  monthData.subscriptions.map((sub: any) => (
                    <div key={sub.id} className="flex justify-between items-center p-4 bg-black/30 rounded-lg border border-cyan-500/10 hover:border-cyan-500/30 transition-all group">
                      <div>
                        <p className="font-semibold">{sub.name}</p>
                        <p className="text-cyan-400/50 text-xs">{sub.billingCycle} {sub.notes && `• ${sub.notes}`}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="text-orange-400 font-bold">${parseFloat(sub.amount).toFixed(2)}</p>
                        <button
                          onClick={() => deleteSubscription(sub.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'investments' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black tracking-tighter">Investments</h2>
                <button
                  onClick={() => setShowAddForm(showAddForm === 'investment' ? '' : 'investment')}
                  className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-black font-semibold rounded-lg hover:bg-cyan-400 transition-all"
                >
                  <Plus className="w-4 h-4" /> Add
                </button>
              </div>

              {showAddForm === 'investment' && (
                <InvestmentForm
                  form={forms.investment}
setForm={(form: any) => setForms({ ...forms, investment: form })}
                  onSubmit={addInvestment}
                  onCancel={() => setShowAddForm('')}
                  types={investmentTypes}
                />
              )}

              <div className="space-y-2">
                {monthData.investments.length === 0 ? (
                  <p className="text-cyan-400/50 text-center py-8">No investments this month</p>
                ) : (
                  monthData.investments.map((inv: any) => (
                    <div key={inv.id} className="flex justify-between items-center p-4 bg-black/30 rounded-lg border border-cyan-500/10 hover:border-cyan-500/30 transition-all group">
                      <div>
                        <p className="font-semibold">{inv.name}</p>
                        <p className="text-cyan-400/50 text-xs">{inv.type} • {inv.expectedReturn}% expected return {inv.notes && `• ${inv.notes}`}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="text-cyan-400 font-bold">${parseFloat(inv.amount).toFixed(2)}</p>
                        <button
                          onClick={() => deleteInvestment(inv.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'goals' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black tracking-tighter">Savings Goals</h2>
                <button
                  onClick={() => setShowAddForm(showAddForm === 'goal' ? '' : 'goal')}
                  className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-black font-semibold rounded-lg hover:bg-cyan-400 transition-all"
                >
                  <Plus className="w-4 h-4" /> Add
                </button>
              </div>

              {showAddForm === 'goal' && (
                <GoalForm
                  form={forms.goal}
setForm={(form: any) => setForms({ ...forms, goal: form })}
                  onSubmit={addGoal}
                  onCancel={() => setShowAddForm('')}
                  categories={goalCategories}
                />
              )}

              <div className="space-y-3">
                {monthData.goals.length === 0 ? (
                  <p className="text-cyan-400/50 text-center py-8">No goals set</p>
                ) : (
                  monthData.goals.map((goal: any) => {
                    const progress = (goal.currentAmount / goal.targetAmount) * 100;
                    return (
                      <div key={goal.id} className="p-4 bg-black/30 rounded-lg border border-cyan-500/10 hover:border-cyan-500/30 transition-all group">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="font-semibold">{goal.name}</p>
                            <p className="text-cyan-400/50 text-xs">{goal.category} {goal.notes && `• ${goal.notes}`}</p>
                          </div>
                          <button
                            onClick={() => deleteGoal(goal.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex justify-between items-center mb-2 text-sm">
                          <p className="text-cyan-400">${parseFloat(goal.currentAmount).toFixed(2)}</p>
                          <p className="font-bold">{progress.toFixed(0)}%</p>
                          <p className="text-cyan-400/50">${parseFloat(goal.targetAmount).toFixed(2)}</p>
                        </div>
                        <div className="h-2 bg-cyan-500/10 rounded-full overflow-hidden border border-cyan-500/20">
                          <div
                            className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400"
                            style={{ width: `${Math.min(progress, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {activeTab === 'income' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black tracking-tighter">Income Sources</h2>
                <button
                  onClick={() => setShowAddForm(showAddForm === 'income' ? '' : 'income')}
                  className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-black font-semibold rounded-lg hover:bg-cyan-400 transition-all"
                >
                  <Plus className="w-4 h-4" /> Add
                </button>
              </div>

              {showAddForm === 'income' && (
                <IncomeForm
                  form={forms.income}
setForm={(form: any) => setForms({ ...forms, income: form })}
                  onSubmit={addIncome}
                  onCancel={() => setShowAddForm('')}
                />
              )}

              <div className="space-y-2">
                {monthData.income.length === 0 ? (
                  <p className="text-cyan-400/50 text-center py-8">No income tracked</p>
                ) : (
                  monthData.income.map((inc: any) => (
                    <div key={inc.id} className="flex justify-between items-center p-4 bg-black/30 rounded-lg border border-cyan-500/10 hover:border-cyan-500/30 transition-all group">
                      <div>
                        <p className="font-semibold">{inc.source}</p>
                        <p className="text-cyan-400/50 text-xs">{inc.frequency} {inc.notes && `• ${inc.notes}`}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="text-emerald-400 font-bold">+${parseFloat(inc.amount).toFixed(2)}</p>
                        <button
                          onClick={() => deleteIncome(inc.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-black tracking-tighter">Financial History</h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                <div className="lg:col-span-4 bg-black/50 backdrop-blur border border-cyan-500/20 rounded-2xl p-6">
                  <p className="text-cyan-400/60 text-sm tracking-widest mb-4">MONTHS TRACKED</p>
                  <p className="text-4xl font-black tracking-tighter mb-4">{getAllMonthKeys().length}</p>
                  <div className="text-sm text-cyan-400/60">
                    <p>From: {getAllMonthKeys().length > 0 ? getAllMonthKeys()[0] : 'N/A'}</p>
                    <p>To: {getAllMonthKeys().length > 0 ? getAllMonthKeys()[getAllMonthKeys().length - 1] : 'N/A'}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-black/50 backdrop-blur border border-cyan-500/20 rounded-2xl p-6">
                  <p className="text-cyan-400/60 text-sm tracking-widest mb-4">MONTHLY AVERAGE</p>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <p className="text-sm">Income</p>
                      <p className="font-bold text-emerald-400">${(allTimeStats.income / Math.max(getAllMonthKeys().length, 1)).toFixed(2)}</p>
                    </div>
                    <div className="flex justify-between">
                      <p className="text-sm">Expenses</p>
                      <p className="font-bold text-red-400">${(allTimeStats.expenses / Math.max(getAllMonthKeys().length, 1)).toFixed(2)}</p>
                    </div>
                    <div className="flex justify-between">
                      <p className="text-sm">Invested</p>
                      <p className="font-bold text-cyan-400">${(allTimeStats.investments / Math.max(getAllMonthKeys().length, 1)).toFixed(2)}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-black/50 backdrop-blur border border-cyan-500/20 rounded-2xl p-6">
                  <p className="text-cyan-400/60 text-sm tracking-widest mb-4">EXPENSE BREAKDOWN</p>
                  <div className="space-y-2">
                    {expenseCategories.map((cat) => {
                      const total = getAllMonthKeys().reduce((sum, k) => {
                        const m = data.months[k] || {};
                        return sum + (m.expenses || []).filter((e: any) => e.category === cat).reduce((s, e: any) => s + parseFloat(e.amount), 0);
                      }, 0);
                      return total > 0 && (
                        <div key={cat} className="flex justify-between">
                          <p className="text-sm capitalize">{cat}</p>
                          <p className="font-bold text-red-400">${total.toFixed(2)}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div>
                <p className="text-cyan-400/60 text-sm tracking-widest mb-4">RECENT MONTHS</p>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {getAllMonthKeys().reverse().slice(0, 12).map((key) => {
                    const exp = getTotalExpenses(key);
                    const inc = getTotalIncome(key);
                    const net = inc - exp;
                    return (
                      <div key={key} className="flex justify-between items-center p-3 bg-black/30 rounded-lg border border-cyan-500/10 hover:border-cyan-500/30 transition-all cursor-pointer" onClick={() => { setCurrentMonth(new Date(`${key.split('-')[0]}-${key.split('-')[1]}-01`)); setActiveTab('dashboard'); }}>
                        <p className="font-semibold">{new Date(`${key}-01`).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}</p>
                        <div className="text-right text-sm">
                          <p className="text-cyan-400/50">Income: ${inc.toFixed(2)}</p>
                          <p className={net >= 0 ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>Net: ${net.toFixed(2)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color, prefix = '' }: StatCardProps) {
  const colorClasses: Record<string, string> = {
    emerald: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5',
    red: 'text-red-400 border-red-500/20 bg-red-500/5',
    orange: 'text-orange-400 border-orange-500/20 bg-orange-500/5',
    cyan: 'text-cyan-400 border-cyan-500/20 bg-cyan-500/5',
    purple: 'text-purple-400 border-purple-500/20 bg-purple-500/5',
  };

  return (
    <div className={`border rounded-xl p-4 backdrop-blur ${colorClasses[color]}`}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-semibold tracking-widest opacity-70">{label}</p>
        {icon}
      </div>
      <p className="text-2xl font-black tracking-tighter">{prefix}${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
    </div>
  );
}

function ExpenseForm({ form, setForm, onSubmit, onCancel, categories }: any) {
  return (
    <div className="bg-black/50 backdrop-blur border border-cyan-500/20 rounded-2xl p-6 space-y-4">
      <input type="text" placeholder="Item name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full bg-black/50 border border-cyan-500/20 rounded-lg px-4 py-2 text-white placeholder-cyan-400/50 focus:border-cyan-500/60 outline-none" />
      <div className="grid grid-cols-4 gap-3">
        <input type="number" placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="bg-black/50 border border-cyan-500/20 rounded-lg px-4 py-2 text-white placeholder-cyan-400/50 focus:border-cyan-500/60 outline-none" />
        <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="bg-black/50 border border-cyan-500/20 rounded-lg px-4 py-2 text-white focus:border-cyan-500/60 outline-none">
          {categories.map((cat: string) => (<option key={cat} value={cat}>{cat}</option>))}
        </select>
        <input type="number" min="1" max="31" placeholder="Day" value={form.day} onChange={(e) => setForm({ ...form, day: e.target.value.padStart(2, '0') })} className="bg-black/50 border border-cyan-500/20 rounded-lg px-4 py-2 text-white placeholder-cyan-400/50 focus:border-cyan-500/60 outline-none" />
        <input type="text" placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="bg-black/50 border border-cyan-500/20 rounded-lg px-4 py-2 text-white placeholder-cyan-400/50 focus:border-cyan-500/60 outline-none" />
      </div>
      <div className="flex gap-2">
        <button onClick={onSubmit} className="flex-1 bg-cyan-500 text-black font-semibold rounded-lg py-2 hover:bg-cyan-400 transition-all">Add</button>
        <button onClick={onCancel} className="flex-1 bg-black/50 border border-cyan-500/20 text-white font-semibold rounded-lg py-2 hover:border-cyan-500/60 transition-all">Cancel</button>
      </div>
    </div>
  );
}

function SubscriptionForm({ form, setForm, onSubmit, onCancel }: any) {
  return (
    <div className="bg-black/50 backdrop-blur border border-cyan-500/20 rounded-2xl p-6 space-y-4">
      <input type="text" placeholder="Subscription name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full bg-black/50 border border-cyan-500/20 rounded-lg px-4 py-2 text-white placeholder-cyan-400/50 focus:border-cyan-500/60 outline-none" />
      <div className="grid grid-cols-3 gap-3">
        <input type="number" placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="bg-black/50 border border-cyan-500/20 rounded-lg px-4 py-2 text-white placeholder-cyan-400/50 focus:border-cyan-500/60 outline-none" />
        <select value={form.billingCycle} onChange={(e) => setForm({ ...form, billingCycle: e.target.value })} className="bg-black/50 border border-cyan-500/20 rounded-lg px-4 py-2 text-white focus:border-cyan-500/60 outline-none">
          <option value="monthly">Monthly</option>
          <option value="quarterly">Quarterly</option>
          <option value="annual">Annual</option>
        </select>
        <input type="text" placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="bg-black/50 border border-cyan-500/20 rounded-lg px-4 py-2 text-white placeholder-cyan-400/50 focus:border-cyan-500/60 outline-none" />
      </div>
      <div className="flex gap-2">
        <button onClick={onSubmit} className="flex-1 bg-cyan-500 text-black font-semibold rounded-lg py-2 hover:bg-cyan-400 transition-all">Add</button>
        <button onClick={onCancel} className="flex-1 bg-black/50 border border-cyan-500/20 text-white font-semibold rounded-lg py-2 hover:border-cyan-500/60 transition-all">Cancel</button>
      </div>
    </div>
  );
}

function InvestmentForm({ form, setForm, onSubmit, onCancel, types }: any) {
  return (
    <div className="bg-black/50 backdrop-blur border border-cyan-500/20 rounded-2xl p-6 space-y-4">
      <input type="text" placeholder="Investment name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full bg-black/50 border border-cyan-500/20 rounded-lg px-4 py-2 text-white placeholder-cyan-400/50 focus:border-cyan-500/60 outline-none" />
      <div className="grid grid-cols-4 gap-3">
        <input type="number" placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="bg-black/50 border border-cyan-500/20 rounded-lg px-4 py-2 text-white placeholder-cyan-400/50 focus:border-cyan-500/60 outline-none" />
        <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="bg-black/50 border border-cyan-500/20 rounded-lg px-4 py-2 text-white focus:border-cyan-500/60 outline-none">
          {types.map((t: string) => (<option key={t} value={t}>{t}</option>))}
        </select>
        <input type="number" placeholder="Return %" value={form.expectedReturn} onChange={(e) => setForm({ ...form, expectedReturn: e.target.value })} className="bg-black/50 border border-cyan-500/20 rounded-lg px-4 py-2 text-white placeholder-cyan-400/50 focus:border-cyan-500/60 outline-none" />
        <input type="text" placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="bg-black/50 border border-cyan-500/20 rounded-lg px-4 py-2 text-white placeholder-cyan-400/50 focus:border-cyan-500/60 outline-none" />
      </div>
      <div className="flex gap-2">
        <button onClick={onSubmit} className="flex-1 bg-cyan-500 text-black font-semibold rounded-lg py-2 hover:bg-cyan-400 transition-all">Add</button>
        <button onClick={onCancel} className="flex-1 bg-black/50 border border-cyan-500/20 text-white font-semibold rounded-lg py-2 hover:border-cyan-500/60 transition-all">Cancel</button>
      </div>
    </div>
  );
}

function GoalForm({ form, setForm, onSubmit, onCancel, categories }: any) {
  return (
    <div className="bg-black/50 backdrop-blur border border-cyan-500/20 rounded-2xl p-6 space-y-4">
      <input type="text" placeholder="Goal name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full bg-black/50 border border-cyan-500/20 rounded-lg px-4 py-2 text-white placeholder-cyan-400/50 focus:border-cyan-500/60 outline-none" />
      <div className="grid grid-cols-4 gap-3">
        <input type="number" placeholder="Target" value={form.targetAmount} onChange={(e) => setForm({ ...form, targetAmount: e.target.value })} className="bg-black/50 border border-cyan-500/20 rounded-lg px-4 py-2 text-white placeholder-cyan-400/50 focus:border-cyan-500/60 outline-none" />
        <input type="number" placeholder="Current" value={form.currentAmount} onChange={(e) => setForm({ ...form, currentAmount: e.target.value })} className="bg-black/50 border border-cyan-500/20 rounded-lg px-4 py-2 text-white placeholder-cyan-400/50 focus:border-cyan-500/60 outline-none" />
        <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="bg-black/50 border border-cyan-500/20 rounded-lg px-4 py-2 text-white focus:border-cyan-500/60 outline-none">
          {categories.map((cat: string) => (<option key={cat} value={cat}>{cat}</option>))}
        </select>
        <input type="text" placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="bg-black/50 border border-cyan-500/20 rounded-lg px-4 py-2 text-white placeholder-cyan-400/50 focus:border-cyan-500/60 outline-none" />
      </div>
      <div className="flex gap-2">
        <button onClick={onSubmit} className="flex-1 bg-cyan-500 text-black font-semibold rounded-lg py-2 hover:bg-cyan-400 transition-all">Add</button>
        <button onClick={onCancel} className="flex-1 bg-black/50 border border-cyan-500/20 text-white font-semibold rounded-lg py-2 hover:border-cyan-500/60 transition-all">Cancel</button>
      </div>
    </div>
  );
}

function IncomeForm({ form, setForm, onSubmit, onCancel }: any) {
  return (
    <div className="bg-black/50 backdrop-blur border border-cyan-500/20 rounded-2xl p-6 space-y-4">
      <input type="text" placeholder="Income source" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} className="w-full bg-black/50 border border-cyan-500/20 rounded-lg px-4 py-2 text-white placeholder-cyan-400/50 focus:border-cyan-500/60 outline-none" />
      <div className="grid grid-cols-3 gap-3">
        <input type="number" placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="bg-black/50 border border-cyan-500/20 rounded-lg px-4 py-2 text-white placeholder-cyan-400/50 focus:border-cyan-500/60 outline-none" />
        <select value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })} className="bg-black/50 border border-cyan-500/20 rounded-lg px-4 py-2 text-white focus:border-cyan-500/60 outline-none">
          <option value="one-time">One-time</option>
          <option value="weekly">Weekly</option>
          <option value="biweekly">Biweekly</option>
          <option value="monthly">Monthly</option>
        </select>
        <input type="text" placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="bg-black/50 border border-cyan-500/20 rounded-lg px-4 py-2 text-white placeholder-cyan-400/50 focus:border-cyan-500/60 outline-none" />
      </div>
      <div className="flex gap-2">
        <button onClick={onSubmit} className="flex-1 bg-cyan-500 text-black font-semibold rounded-lg py-2 hover:bg-cyan-400 transition-all">Add</button>
        <button onClick={onCancel} className="flex-1 bg-black/50 border border-cyan-500/20 text-white font-semibold rounded-lg py-2 hover:border-cyan-500/60 transition-all">Cancel</button>
      </div>
    </div>
  );
}