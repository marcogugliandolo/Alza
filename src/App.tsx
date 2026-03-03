import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Trash2, 
  TrendingDown, 
  TrendingUp, 
  Wallet, 
  Target, 
  PieChart as PieChartIcon, 
  Calendar,
  ChevronRight,
  Utensils,
  Car,
  Home,
  Gamepad2,
  HeartPulse,
  MoreHorizontal,
  Loader2,
  BarChart3
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip,
  Legend
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn, type Category, type Expense, type Goal } from './lib/utils';

const ICON_MAP: Record<string, any> = {
  Utensils,
  Car,
  Home,
  Gamepad2,
  HeartPulse,
  MoreHorizontal
};

export default function App() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [activeChartTab, setActiveChartTab] = useState<'categories' | 'trend'>('categories');
  
  // Form states
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [newExpense, setNewExpense] = useState({ amount: '', description: '', category_id: '', date: format(new Date(), 'yyyy-MM-dd') });
  const [newGoal, setNewGoal] = useState({ name: '', target_amount: '', deadline: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [expRes, catRes, goalRes] = await Promise.all([
        fetch('/api/expenses'),
        fetch('/api/categories'),
        fetch('/api/goals')
      ]);
      const [expData, catData, goalData] = await Promise.all([
        expRes.json(),
        catRes.json(),
        goalRes.json()
      ]);
      setExpenses(expData);
      setCategories(catData);
      setGoals(goalData);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching data:", error);
      setLoading(false);
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpense.amount || !newExpense.category_id) return;

    try {
      await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newExpense,
          amount: parseFloat(newExpense.amount),
          category_id: parseInt(newExpense.category_id)
        })
      });
      setNewExpense({ amount: '', description: '', category_id: '', date: format(new Date(), 'yyyy-MM-dd') });
      setShowExpenseForm(false);
      fetchData();
    } catch (error) {
      console.error("Error adding expense:", error);
    }
  };

  const handleDeleteExpense = async (id: number) => {
    try {
      await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (error) {
      console.error("Error deleting expense:", error);
    }
  };

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoal.name || !newGoal.target_amount) return;

    try {
      await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newGoal,
          target_amount: parseFloat(newGoal.target_amount)
        })
      });
      setNewGoal({ name: '', target_amount: '', deadline: '' });
      setShowGoalForm(false);
      fetchData();
    } catch (error) {
      console.error("Error adding goal:", error);
    }
  };

  const handleUpdateGoalProgress = async (id: number, current: number, increment: number) => {
    try {
      await fetch(`/api/goals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_amount: current + increment })
      });
      fetchData();
    } catch (error) {
      console.error("Error updating goal:", error);
    }
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const filteredExpenses = expenses.filter(e => {
    const date = parseISO(e.date);
    return date.getMonth() === selectedMonth && date.getFullYear() === selectedYear;
  });

  const monthlyExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  const categoryData = categories.map(cat => ({
    name: cat.name,
    value: filteredExpenses.filter(e => e.category_id === cat.id).reduce((sum, e) => sum + e.amount, 0),
    color: cat.color
  })).filter(d => d.value > 0);

  const trendData = useMemo(() => {
    const data = [];
    for (let i = 11; i >= 0; i--) {
      const d = subMonths(new Date(), i);
      const month = d.getMonth();
      const year = d.getFullYear();
      const total = expenses
        .filter(e => {
          const expDate = parseISO(e.date);
          return expDate.getMonth() === month && expDate.getFullYear() === year;
        })
        .reduce((sum, e) => sum + e.amount, 0);
      
      data.push({
        name: format(d, 'MMM', { locale: es }),
        total,
        fullDate: format(d, 'MMMM yyyy', { locale: es })
      });
    }
    return data;
  }, [expenses]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-stone-50">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans pb-20">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-10 px-4 py-4 sm:px-6">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-600 rounded-xl text-white">
              <Wallet size={24} />
            </div>
            <h1 className="text-xl font-bold tracking-tight">AhorraPro</h1>
          </div>
          <button 
            onClick={() => setShowExpenseForm(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-full flex items-center gap-2 transition-all shadow-sm active:scale-95"
          >
            <Plus size={20} />
            <span className="hidden sm:inline">Nuevo Gasto</span>
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Summary Cards - Refined */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-5 rounded-3xl border border-stone-200/60 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-red-50 text-red-600 rounded-xl">
                <TrendingUp size={18} />
              </div>
              <span className="text-stone-500 text-xs font-bold uppercase tracking-wider">Gasto Total</span>
            </div>
            <div className="text-2xl font-bold tracking-tight">{totalExpenses.toLocaleString()}€</div>
            <div className="text-stone-400 text-[10px] mt-1 font-medium">Desde el inicio</div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-white p-5 rounded-3xl border border-stone-200/60 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                <Calendar size={18} />
              </div>
              <span className="text-stone-500 text-xs font-bold uppercase tracking-wider">Este Mes</span>
            </div>
            <div className="text-2xl font-bold tracking-tight">{monthlyExpenses.toLocaleString()}€</div>
            <div className="text-stone-400 text-[10px] mt-1 font-medium capitalize">
              {format(new Date(selectedYear, selectedMonth), 'MMMM yyyy', { locale: es })}
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white p-5 rounded-3xl border border-stone-200/60 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <Target size={18} />
              </div>
              <span className="text-stone-500 text-xs font-bold uppercase tracking-wider">Metas Activas</span>
            </div>
            <div className="text-2xl font-bold tracking-tight">{goals.length}</div>
            <div className="text-stone-400 text-[10px] mt-1 font-medium">Objetivos de ahorro</div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-emerald-600 text-white p-5 rounded-3xl shadow-lg shadow-emerald-100 flex flex-col justify-between group cursor-pointer"
            onClick={() => setShowExpenseForm(true)}
          >
            <div className="flex items-center justify-between">
              <span className="text-emerald-100 text-xs font-bold uppercase tracking-wider">Acción Rápida</span>
              <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
            </div>
            <div className="text-lg font-bold mt-2 text-white">Nuevo Gasto</div>
            <div className="text-emerald-200 text-[10px] mt-1 font-medium">Registra un pago ahora</div>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Content Area */}
          <div className="lg:col-span-8 space-y-8">
            {/* Charts & Visualization */}
            <div className="bg-white p-8 rounded-[2rem] border border-stone-200/60 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
                <div>
                  <h3 className="text-xl font-bold tracking-tight">
                    {activeChartTab === 'categories' ? 'Distribución de Gastos' : 'Tendencia de Gastos'}
                  </h3>
                  <p className="text-stone-400 text-sm">
                    {activeChartTab === 'categories' ? 'Análisis visual por categorías' : 'Gastos totales últimos 12 meses'}
                  </p>
                </div>
                <div className="flex bg-stone-100 p-1 rounded-xl self-start">
                  <button 
                    onClick={() => setActiveChartTab('categories')}
                    className={cn(
                      "px-4 py-1.5 text-xs font-bold rounded-lg transition-all",
                      activeChartTab === 'categories' ? "bg-white shadow-sm text-stone-900" : "text-stone-500 hover:text-stone-700"
                    )}
                  >
                    Categorías
                  </button>
                  <button 
                    onClick={() => setActiveChartTab('trend')}
                    className={cn(
                      "px-4 py-1.5 text-xs font-bold rounded-lg transition-all",
                      activeChartTab === 'trend' ? "bg-white shadow-sm text-stone-900" : "text-stone-500 hover:text-stone-700"
                    )}
                  >
                    Tendencia
                  </button>
                </div>
              </div>
              
              <div className="h-72">
                {activeChartTab === 'categories' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center h-full">
                    <div className="h-full">
                      {categoryData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={categoryData}
                              cx="50%"
                              cy="50%"
                              innerRadius={70}
                              outerRadius={90}
                              paddingAngle={8}
                              dataKey="value"
                              stroke="none"
                            >
                              {categoryData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip 
                              contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', padding: '12px' }}
                              itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                              formatter={(value: number) => [`${value.toLocaleString()}€`, 'Total']}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-stone-300 gap-2">
                          <PieChartIcon size={48} strokeWidth={1} />
                          <span className="text-sm italic">Sin datos suficientes</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-3 max-h-full overflow-y-auto pr-2 custom-scrollbar">
                      {categoryData.length > 0 ? categoryData.map((cat, i) => (
                        <div key={i} className="flex items-center justify-between group">
                          <div className="flex items-center gap-3">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                            <span className="text-sm font-medium text-stone-600 group-hover:text-stone-900 transition-colors">{cat.name}</span>
                          </div>
                          <div className="text-sm font-bold">{cat.value.toLocaleString()}€</div>
                        </div>
                      )) : (
                        <div className="text-stone-400 text-xs text-center">Registra gastos para ver el desglose</div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={trendData}>
                        <XAxis 
                          dataKey="name" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 10, fontWeight: 'bold', fill: '#a8a29e' }}
                          dy={10}
                        />
                        <YAxis hide />
                        <Tooltip 
                          cursor={{ fill: '#f5f5f4', radius: 12 }}
                          contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', padding: '12px' }}
                          itemStyle={{ fontSize: '12px', fontWeight: 'bold', color: '#059669' }}
                          labelStyle={{ fontSize: '10px', fontWeight: 'bold', color: '#a8a29e', marginBottom: '4px' }}
                          labelFormatter={(label, payload) => payload[0]?.payload?.fullDate || label}
                          formatter={(value: number) => [`${value.toLocaleString()}€`, 'Gasto']}
                        />
                        <Bar 
                          dataKey="total" 
                          fill="#10b981" 
                          radius={[6, 6, 6, 6]} 
                          barSize={24}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>

            {/* Savings Goals - Refined Grid */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-xl font-bold tracking-tight">Metas de Ahorro</h3>
                <button 
                  onClick={() => setShowGoalForm(true)}
                  className="text-emerald-600 hover:text-emerald-700 text-sm font-bold flex items-center gap-1.5"
                >
                  <Plus size={18} /> Nueva Meta
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {goals.length > 0 ? goals.map(goal => {
                  const progress = Math.min((goal.current_amount / goal.target_amount) * 100, 100);
                  return (
                    <motion.div 
                      layout
                      key={goal.id} 
                      className="bg-white p-6 rounded-3xl border border-stone-200/60 shadow-sm space-y-4"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-stone-800">{goal.name}</h4>
                          <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest mt-0.5">
                            {goal.deadline ? format(parseISO(goal.deadline), 'dd MMM yyyy', { locale: es }) : 'Sin fecha'}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-black text-emerald-600">{Math.round(progress)}%</div>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="h-2.5 bg-stone-100 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            className="h-full bg-emerald-500 rounded-full"
                          />
                        </div>
                        <div className="flex justify-between text-[11px] font-bold">
                          <span className="text-stone-400">{goal.current_amount.toLocaleString()}€</span>
                          <span className="text-stone-800">Objetivo: {goal.target_amount.toLocaleString()}€</span>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <button 
                          onClick={() => handleUpdateGoalProgress(goal.id, goal.current_amount, 50)}
                          className="flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider bg-stone-50 text-stone-500 hover:bg-emerald-50 hover:text-emerald-600 transition-all"
                        >
                          +50€
                        </button>
                        <button 
                          onClick={() => handleUpdateGoalProgress(goal.id, goal.current_amount, 100)}
                          className="flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider bg-stone-50 text-stone-500 hover:bg-emerald-50 hover:text-emerald-600 transition-all"
                        >
                          +100€
                        </button>
                      </div>
                    </motion.div>
                  );
                }) : (
                  <div className="col-span-2 bg-stone-100/50 border-2 border-dashed border-stone-200 rounded-[2rem] py-12 flex flex-col items-center justify-center text-stone-400 gap-3">
                    <Target size={40} strokeWidth={1} />
                    <p className="text-sm font-medium italic">Establece tu primera meta de ahorro</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar Area */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white p-6 rounded-[2rem] border border-stone-200/60 shadow-sm flex flex-col h-full max-h-[800px]">
              <div className="flex flex-col gap-4 mb-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold tracking-tight">Gastos</h3>
                  <div className="p-1.5 bg-stone-50 rounded-lg text-stone-400">
                    <TrendingDown size={16} />
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <select 
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                    className="flex-1 bg-stone-50 border-none rounded-xl px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-emerald-500 transition-all appearance-none"
                  >
                    {Array.from({ length: 12 }).map((_, i) => (
                      <option key={i} value={i}>
                        {format(new Date(2024, i), 'MMMM', { locale: es })}
                      </option>
                    ))}
                  </select>
                  <select 
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    className="bg-stone-50 border-none rounded-xl px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-emerald-500 transition-all appearance-none"
                  >
                    {Array.from({ length: 5 }).map((_, i) => {
                      const year = new Date().getFullYear() - 2 + i;
                      return <option key={year} value={year}>{year}</option>;
                    })}
                  </select>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto pr-2 space-y-1 custom-scrollbar">
                {filteredExpenses.length > 0 ? filteredExpenses.map(expense => {
                  const Icon = ICON_MAP[expense.category_icon] || MoreHorizontal;
                  return (
                    <motion.div 
                      layout
                      key={expense.id}
                      className="flex items-center justify-between p-3 hover:bg-stone-50 rounded-2xl transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className="p-2.5 rounded-xl text-white shadow-sm"
                          style={{ backgroundColor: expense.category_color }}
                        >
                          <Icon size={16} />
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-xs truncate text-stone-800">{expense.description || expense.category_name}</div>
                          <div className="text-[10px] text-stone-400 font-medium">{format(parseISO(expense.date), 'dd MMM', { locale: es })}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="font-black text-xs text-red-500">-{expense.amount.toLocaleString()}€</div>
                        <button 
                          onClick={() => handleDeleteExpense(expense.id)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 text-stone-300 hover:text-red-500 transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </motion.div>
                  );
                }) : (
                  <div className="flex flex-col items-center justify-center py-20 text-stone-300 gap-2">
                    <Wallet size={32} strokeWidth={1} />
                    <p className="text-xs italic">Sin gastos en este periodo</p>
                  </div>
                )}
              </div>
              
              {filteredExpenses.length > 0 && (
                <button className="w-full mt-4 py-3 text-stone-400 text-[10px] font-black uppercase tracking-widest hover:text-stone-900 transition-colors border-t border-stone-50 pt-4">
                  Ver Historial Completo
                </button>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Expense Modal */}
      <AnimatePresence>
        {showExpenseForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowExpenseForm(false)}
              className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl p-8"
            >
              <h2 className="text-2xl font-bold mb-6">Registrar Gasto</h2>
              <form onSubmit={handleAddExpense} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">Monto (€)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    required
                    value={newExpense.amount}
                    onChange={e => setNewExpense({...newExpense, amount: e.target.value})}
                    placeholder="0.00"
                    className="w-full bg-stone-50 border-none rounded-xl p-4 text-lg font-bold focus:ring-2 focus:ring-emerald-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">Descripción</label>
                  <input 
                    type="text" 
                    value={newExpense.description}
                    onChange={e => setNewExpense({...newExpense, description: e.target.value})}
                    placeholder="Ej. Almuerzo, Gasolina..."
                    className="w-full bg-stone-50 border-none rounded-xl p-4 focus:ring-2 focus:ring-emerald-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">Categoría</label>
                  <select 
                    required
                    value={newExpense.category_id}
                    onChange={e => setNewExpense({...newExpense, category_id: e.target.value})}
                    className="w-full bg-stone-50 border-none rounded-xl p-4 focus:ring-2 focus:ring-emerald-500 transition-all appearance-none"
                  >
                    <option value="">Selecciona una categoría</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">Fecha</label>
                  <input 
                    type="date" 
                    required
                    value={newExpense.date}
                    onChange={e => setNewExpense({...newExpense, date: e.target.value})}
                    className="w-full bg-stone-50 border-none rounded-xl p-4 focus:ring-2 focus:ring-emerald-500 transition-all"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowExpenseForm(false)}
                    className="flex-1 py-4 rounded-xl font-bold text-stone-500 hover:bg-stone-50 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-xl font-bold shadow-lg shadow-emerald-200 transition-all active:scale-95"
                  >
                    Guardar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Goal Modal */}
      <AnimatePresence>
        {showGoalForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowGoalForm(false)}
              className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl p-8"
            >
              <h2 className="text-2xl font-bold mb-6">Nueva Meta de Ahorro</h2>
              <form onSubmit={handleAddGoal} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">Nombre de la Meta</label>
                  <input 
                    type="text" 
                    required
                    value={newGoal.name}
                    onChange={e => setNewGoal({...newGoal, name: e.target.value})}
                    placeholder="Ej. Viaje a Japón, Fondo de Emergencia..."
                    className="w-full bg-stone-50 border-none rounded-xl p-4 focus:ring-2 focus:ring-emerald-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">Monto Objetivo (€)</label>
                  <input 
                    type="number" 
                    required
                    value={newGoal.target_amount}
                    onChange={e => setNewGoal({...newGoal, target_amount: e.target.value})}
                    placeholder="0.00"
                    className="w-full bg-stone-50 border-none rounded-xl p-4 text-lg font-bold focus:ring-2 focus:ring-emerald-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">Fecha Límite (Opcional)</label>
                  <input 
                    type="date" 
                    value={newGoal.deadline}
                    onChange={e => setNewGoal({...newGoal, deadline: e.target.value})}
                    className="w-full bg-stone-50 border-none rounded-xl p-4 focus:ring-2 focus:ring-emerald-500 transition-all"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowGoalForm(false)}
                    className="flex-1 py-4 rounded-xl font-bold text-stone-500 hover:bg-stone-50 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-xl font-bold shadow-lg shadow-emerald-200 transition-all active:scale-95"
                  >
                    Crear Meta
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
