import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  BarChart3,
  Moon,
  Sun,
  LogOut,
  Lock,
  User as UserIcon,
  Users,
  Heart,
  Search,
  Download,
  Filter,
  Sparkles,
  MessageSquare,
  X,
  Camera,
  RefreshCw,
  ArrowRight,
  LayoutDashboard,
  Edit2
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
import { Responsive, WidthProvider } from 'react-grid-layout/legacy';
const ResponsiveGridLayout = WidthProvider(Responsive);
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import Markdown from 'react-markdown';
import { GoogleGenAI } from "@google/genai";
import { cn, type Category, type Expense, type Goal, type RecurringExpense } from './lib/utils';

const ICON_MAP: Record<string, any> = {
  Utensils,
  Car,
  Home,
  Gamepad2,
  HeartPulse,
  MoreHorizontal,
  Search,
  Download,
  Filter,
  Sparkles,
  MessageSquare,
  X,
  Camera,
  RefreshCw,
  ArrowRight,
  Wallet,
  Target,
  PieChartIcon,
  Calendar
};

const DEFAULT_LAYOUTS = {
  lg: [
    { i: 'summary-total', x: 0, y: 0, w: 4, h: 2 },
    { i: 'summary-month', x: 4, y: 0, w: 4, h: 2 },
    { i: 'summary-goals', x: 8, y: 0, w: 4, h: 2 },
    { i: 'charts', x: 0, y: 2, w: 8, h: 4 },
    { i: 'goals', x: 0, y: 6, w: 8, h: 3 },
    { i: 'budgets', x: 0, y: 9, w: 4, h: 4 },
    { i: 'recurring', x: 4, y: 9, w: 4, h: 4 },
    { i: 'sidebar', x: 8, y: 2, w: 4, h: 11 },
  ],
  md: [
    { i: 'summary-total', x: 0, y: 0, w: 3, h: 2 },
    { i: 'summary-month', x: 3, y: 0, w: 4, h: 2 },
    { i: 'summary-goals', x: 7, y: 0, w: 3, h: 2 },
    { i: 'charts', x: 0, y: 2, w: 10, h: 4 },
    { i: 'goals', x: 0, y: 6, w: 10, h: 3 },
    { i: 'budgets', x: 0, y: 9, w: 5, h: 4 },
    { i: 'recurring', x: 5, y: 9, w: 5, h: 4 },
    { i: 'sidebar', x: 0, y: 13, w: 10, h: 8 },
  ],
  sm: [
    { i: 'summary-total', x: 0, y: 0, w: 2, h: 2 },
    { i: 'summary-month', x: 2, y: 0, w: 2, h: 2 },
    { i: 'summary-goals', x: 4, y: 0, w: 2, h: 2 },
    { i: 'charts', x: 0, y: 2, w: 6, h: 4 },
    { i: 'goals', x: 0, y: 6, w: 6, h: 4 },
    { i: 'budgets', x: 0, y: 10, w: 6, h: 4 },
    { i: 'recurring', x: 0, y: 14, w: 6, h: 4 },
    { i: 'sidebar', x: 0, y: 18, w: 6, h: 8 },
  ],
  xs: [
    { i: 'summary-total', x: 0, y: 0, w: 4, h: 2 },
    { i: 'summary-month', x: 0, y: 2, w: 4, h: 2 },
    { i: 'summary-goals', x: 0, y: 4, w: 4, h: 2 },
    { i: 'charts', x: 0, y: 6, w: 4, h: 4 },
    { i: 'goals', x: 0, y: 10, w: 4, h: 4 },
    { i: 'budgets', x: 0, y: 14, w: 4, h: 4 },
    { i: 'recurring', x: 0, y: 18, w: 4, h: 4 },
    { i: 'sidebar', x: 0, y: 22, w: 4, h: 8 },
  ],
  xxs: [
    { i: 'summary-total', x: 0, y: 0, w: 2, h: 2 },
    { i: 'summary-month', x: 0, y: 2, w: 2, h: 2 },
    { i: 'summary-goals', x: 0, y: 4, w: 2, h: 2 },
    { i: 'charts', x: 0, y: 6, w: 2, h: 4 },
    { i: 'goals', x: 0, y: 10, w: 2, h: 4 },
    { i: 'budgets', x: 0, y: 14, w: 2, h: 4 },
    { i: 'recurring', x: 0, y: 18, w: 2, h: 4 },
    { i: 'sidebar', x: 0, y: 22, w: 2, h: 8 },
  ]
};

export default function App() {
  const [user, setUser] = useState<{ id: number, username: string, profile_image?: string, account_mode?: string } | null>(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [authLoading, setAuthLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileData, setProfileData] = useState({ username: '', profile_image: '' });
  const [passwordData, setPasswordData] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [loginData, setLoginData] = useState({ username: '', password: '', account_mode: 'individual' });
  const [authError, setAuthError] = useState('');

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [activeChartTab, setActiveChartTab] = useState<'categories' | 'trend'>('categories');
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const [layouts, setLayouts] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        try {
          const parsedUser = JSON.parse(savedUser);
          const savedLayout = localStorage.getItem(`dashboard_layout_${parsedUser.id}`);
          if (savedLayout) {
            return JSON.parse(savedLayout);
          }
        } catch (e) {
          console.error("Error loading layout", e);
        }
      }
    }
    return DEFAULT_LAYOUTS;
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [showAIAnalyst, setShowAIAnalyst] = useState(false);
  const [showRecurringForm, setShowRecurringForm] = useState(false);
  const [newRecurring, setNewRecurring] = useState({ amount: '', description: '', category_id: '', frequency: 'monthly' as const, next_date: format(new Date(), 'yyyy-MM-dd') });
  const [aiMessages, setAiMessages] = useState<{ role: 'user' | 'model', text: string }[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [scanningReceipt, setScanningReceipt] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || 
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });
  
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  // Form states
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [showUserForm, setShowUserForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [usersList, setUsersList] = useState<{id: number, username: string}[]>([]);
  const [editingExpense, setEditingExpense] = useState<{ id: number, amount: string, description: string, category_id: string, date: string } | null>(null);
  const [newExpense, setNewExpense] = useState({ amount: '', description: '', category_id: '', date: format(new Date(), 'yyyy-MM-dd') });
  const [newGoal, setNewGoal] = useState({ name: '', target_amount: '', deadline: '' });
  const [newUser, setNewUser] = useState({ username: '', password: '' });
  const [newCategory, setNewCategory] = useState({ name: '', icon: 'MoreHorizontal', color: '#10b981' });

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
      fetchData();
      
      // Load user layout
      const savedLayout = localStorage.getItem(`dashboard_layout_${user.id}`);
      if (savedLayout) {
        try {
          setLayouts(JSON.parse(savedLayout));
        } catch (e) {
          console.error("Error loading layout", e);
        }
      } else {
        setLayouts(DEFAULT_LAYOUTS);
      }
    } else {
      localStorage.removeItem('user');
      setLayouts(DEFAULT_LAYOUTS);
    }
  }, [user]);

  const handleLayoutChange = (currentLayout: any, allLayouts: any) => {
    setLayouts(allLayouts);
    if (user) {
      localStorage.setItem(`dashboard_layout_${user.id}`, JSON.stringify(allLayouts));
    }
  };

  const resetLayout = () => {
    setLayouts(DEFAULT_LAYOUTS);
    if (user) {
      localStorage.removeItem(`dashboard_layout_${user.id}`);
    }
  };

  const getAuthHeaders = () => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (user) {
      headers['X-User-Id'] = user.id.toString();
    }
    return headers;
  };

  const checkAuth = async () => {
    console.log("Checking auth session...");
    try {
      const headers: Record<string, string> = {};
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        headers['X-User-Id'] = JSON.parse(savedUser).id.toString();
      }

      const res = await fetch('/api/auth/me', { headers });
      console.log("Auth check response status:", res.status);
      if (res.ok) {
        const data = await res.json();
        console.log("Auth check successful, user:", data);
        setUser(data);
      } else if (!savedUser) {
        setUser(null);
      }
    } catch (error) {
      console.error("Auth check failed:", error);
    } finally {
      setAuthLoading(false);
    }
  };

  const [debugRedirectUri, setDebugRedirectUri] = useState<string>('');

  const handleGoogleLogin = async () => {
    setAuthError('');
    setDebugRedirectUri('');
    try {
      const response = await fetch('/api/auth/google/url');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to get auth URL');
      }
      
      const { url, redirectUri } = data;
      setDebugRedirectUri(redirectUri);

      const authWindow = window.open(
        url,
        'oauth_popup',
        'width=600,height=700'
      );

      if (!authWindow) {
        setAuthError('Por favor, permite las ventanas emergentes (popups) para iniciar sesión con Google.');
      }
    } catch (error: any) {
      console.error('OAuth error:', error);
      setAuthError(error.message || 'Error al conectar con Google.');
    }
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost')) {
        return;
      }
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        checkAuth();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    const trimmedUsername = loginData.username.trim();
    console.log("Attempting login for:", trimmedUsername);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...loginData, username: trimmedUsername })
      });
      console.log("Login response status:", res.status);
      if (res.ok) {
        const data = await res.json();
        console.log("Login successful, user data:", data);
        localStorage.setItem('user', JSON.stringify(data));
        setUser(data);
      } else {
        const data = await res.json();
        console.log("Login failed, error:", data.error);
        setAuthError(data.error || 'Error al iniciar sesión');
      }
    } catch (error) {
      console.error("Login request error:", error);
      setAuthError('Error de conexión');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    const trimmedUsername = loginData.username.trim();
    if (!trimmedUsername || !loginData.password) {
      setAuthError('Usuario y contraseña requeridos');
      return;
    }
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...loginData, username: trimmedUsername })
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('user', JSON.stringify(data));
        setUser(data);
      } else {
        const data = await res.json();
        setAuthError(data.error || 'Error al registrarse');
      }
    } catch (error) {
      console.error("Registration request error:", error);
      setAuthError('Error de conexión');
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { 
        method: 'POST',
        headers: getAuthHeaders()
      });
      setUser(null);
      localStorage.removeItem('user');
      setExpenses([]);
      setCategories([]);
      setGoals([]);
    } catch (error) {
      console.error("Logout failed:", error);
      // Still clear local state
      setUser(null);
      localStorage.removeItem('user');
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(profileData)
      });
      if (res.ok) {
        const updatedUser = await res.json();
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setShowProfileModal(false);
      } else {
        const error = await res.json();
        alert(error.error || 'Error al actualizar el perfil');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess(false);

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('Las nuevas contraseñas no coinciden');
      return;
    }

    try {
      const res = await fetch('/api/auth/password', {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          oldPassword: passwordData.oldPassword,
          newPassword: passwordData.newPassword
        })
      });

      if (res.ok) {
        setPasswordSuccess(true);
        setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
        setTimeout(() => setPasswordSuccess(false), 3000);
      } else {
        const error = await res.json();
        setPasswordError(error.error || 'Error al cambiar la contraseña');
      }
    } catch (err) {
      console.error(err);
      setPasswordError('Error de conexión');
    }
  };

  const handleProfileImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setProfileData(prev => ({ ...prev, profile_image: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const fetchData = async () => {
    if (!user) return;
    try {
      const headers = getAuthHeaders();
      const [expRes, catRes, goalRes, recRes] = await Promise.all([
        fetch('/api/expenses', { headers }),
        fetch('/api/categories', { headers }),
        fetch('/api/goals', { headers }),
        fetch('/api/recurring', { headers })
      ]);
      
      if (expRes.status === 401 || catRes.status === 401 || goalRes.status === 401) {
        setUser(null);
        localStorage.removeItem('user');
        return;
      }

      const [expData, catData, goalData, recData] = await Promise.all([
        expRes.json(),
        catRes.json(),
        goalRes.json(),
        recRes.json()
      ]);
      setExpenses(expData);
      setCategories(catData);
      setGoals(goalData);
      setRecurringExpenses(recData);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching data:", error);
      setLoading(false);
    }
  };

  const handleUpdateBudget = async (categoryId: number, budget: number) => {
    try {
      const res = await fetch(`/api/categories/${categoryId}/budget`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ budget })
      });
      if (res.ok) fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddRecurring = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/recurring', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(newRecurring)
      });
      if (res.ok) {
        fetchData();
        setShowRecurringForm(false);
        setNewRecurring({ amount: '', description: '', category_id: '', frequency: 'monthly', next_date: format(new Date(), 'yyyy-MM-dd') });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(newCategory)
      });
      if (res.ok) {
        setShowCategoryForm(false);
        setNewCategory({ name: '', icon: 'MoreHorizontal', color: '#10b981' });
        fetchData();
      } else {
        const error = await res.json();
        alert(error.error || 'Error al crear la categoría');
      }
    } catch (err) {
      console.error(err);
      alert('Error al crear la categoría');
    }
  };

  const handleDeleteRecurring = async (id: number) => {
    try {
      const res = await fetch(`/api/recurring/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (res.ok) fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users', { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setUsersList(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este usuario?')) return;
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        fetchUsers();
      } else {
        const error = await res.json();
        alert(error.error || 'Error al eliminar usuario');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleExport = async () => {
    try {
      const res = await fetch('/api/expenses/export', { headers: getAuthHeaders() });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'gastos.csv';
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAISend = async (text: string) => {
    if (!text.trim()) return;
    const newMessages = [...aiMessages, { role: 'user' as const, text }];
    setAiMessages(newMessages);
    setAiLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const model = ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            role: "user",
            parts: [{ text: `Eres un analista financiero personal experto. Aquí están mis datos actuales:
              Gastos: ${JSON.stringify(expenses.map(e => ({ amount: e.amount, desc: e.description, cat: e.category_name, date: e.date })))}
              Categorías y Presupuestos: ${JSON.stringify(categories.map(c => ({ name: c.name, budget: c.budget })))}
              Metas: ${JSON.stringify(goals.map(g => ({ name: g.name, target: g.target_amount, current: g.current_amount })))}
              
              Responde de forma concisa y útil en español. Usuario pregunta: ${text}` }]
          }
        ]
      });
      const response = await model;
      setAiMessages([...newMessages, { role: 'model', text: response.text || 'No pude procesar tu solicitud.' }]);
    } catch (err) {
      console.error(err);
      setAiMessages([...newMessages, { role: 'model', text: 'Hubo un error al conectar con la IA.' }]);
    } finally {
      setAiLoading(false);
    }
  };

  const handleScanReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanningReceipt(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: [
            {
              parts: [
                { inlineData: { data: base64Data, mimeType: file.type } },
                { text: "Analiza este ticket y devuelve un JSON con: amount (número), description (texto corto), date (YYYY-MM-DD), category_name (una de: Comida, Transporte, Vivienda, Entretenimiento, Salud, Otros). Solo el JSON." }
              ]
            }
          ],
          config: { responseMimeType: "application/json" }
        });

        const result = JSON.parse(response.text || '{}');
        const category = categories.find(c => c.name.toLowerCase() === (result.category_name || '').toLowerCase()) || categories.find(c => c.name === 'Otros');
        
        setNewExpense({
          amount: result.amount?.toString() || '',
          description: result.description || 'Gasto escaneado',
          date: result.date || format(new Date(), 'yyyy-MM-dd'),
          category_id: category?.id.toString() || ''
        });
        setShowExpenseForm(true);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
    } finally {
      setScanningReceipt(false);
    }
  };
  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpense.amount || !newExpense.category_id || !user) return;

    try {
      if (editingExpense) {
        await fetch(`/api/expenses/${editingExpense.id}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            ...newExpense,
            amount: parseFloat(newExpense.amount),
            category_id: parseInt(newExpense.category_id)
          })
        });
      } else {
        await fetch('/api/expenses', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            ...newExpense,
            amount: parseFloat(newExpense.amount),
            category_id: parseInt(newExpense.category_id)
          })
        });
      }
      setNewExpense({ amount: '', description: '', category_id: '', date: format(new Date(), 'yyyy-MM-dd') });
      setEditingExpense(null);
      setShowExpenseForm(false);
      fetchData();
    } catch (error) {
      console.error("Error saving expense:", error);
    }
  };

  const openEditExpense = (expense: any) => {
    setEditingExpense({
      id: expense.id,
      amount: expense.amount.toString(),
      description: expense.description || '',
      category_id: expense.category_id.toString(),
      date: expense.date
    });
    setNewExpense({
      amount: expense.amount.toString(),
      description: expense.description || '',
      category_id: expense.category_id.toString(),
      date: expense.date
    });
    setShowExpenseForm(true);
  };

  const handleDeleteExpense = async (id: number) => {
    if (!user) return;
    try {
      await fetch(`/api/expenses/${id}`, { 
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      fetchData();
    } catch (error) {
      console.error("Error deleting expense:", error);
    }
  };

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoal.name || !newGoal.target_amount || !user) return;

    try {
      await fetch('/api/goals', {
        method: 'POST',
        headers: getAuthHeaders(),
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

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(newUser)
      });
      if (res.ok) {
        setNewUser({ username: '', password: '' });
        setShowUserForm(false);
        fetchUsers();
        setShowAdminPanel(true);
      } else {
        const error = await res.json();
        alert(error.error || 'Error al registrar usuario');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateGoalProgress = async (id: number, current: number, increment: number) => {
    if (!user) return;
    try {
      await fetch(`/api/goals/${id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ current_amount: current + increment })
      });
      fetchData();
    } catch (error) {
      console.error("Error updating goal:", error);
    }
  };

  const searchFilteredExpenses = useMemo(() => {
    if (!searchTerm) return expenses;
    return expenses.filter(e => 
      e.description?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      e.category_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [expenses, searchTerm]);

  const filteredExpenses = useMemo(() => {
    return searchFilteredExpenses.filter(e => {
      const expenseDate = parseISO(e.date);
      const matchesMonth = selectedMonth === -1 || (expenseDate.getMonth() === selectedMonth && expenseDate.getFullYear() === selectedYear);
      
      const matchesRange = (!dateRange.start || expenseDate >= parseISO(dateRange.start)) &&
                          (!dateRange.end || expenseDate <= parseISO(dateRange.end));

      return matchesMonth && matchesRange;
    });
  }, [searchFilteredExpenses, selectedMonth, selectedYear, dateRange]);

  const monthlyStats = useMemo(() => {
    const currentMonthExpenses = searchFilteredExpenses.filter(e => {
      const d = parseISO(e.date);
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
    });

    const currentMonthRecurring = recurringExpenses.filter(r => {
      const nextDate = parseISO(r.next_date);
      return nextDate.getMonth() === selectedMonth && nextDate.getFullYear() === selectedYear;
    });

    const total = currentMonthExpenses.reduce((sum, e) => sum + e.amount, 0) + 
                  currentMonthRecurring.reduce((sum, r) => sum + r.amount, 0);
    
    const byCategory = currentMonthExpenses.reduce((acc, e) => {
      acc[e.category_name] = (acc[e.category_name] || 0) + e.amount;
      return acc;
    }, {} as Record<string, number>);

    currentMonthRecurring.forEach(r => {
      byCategory[r.category_name] = (byCategory[r.category_name] || 0) + r.amount;
    });

    const emeraldShades = ['#059669', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0'];
    const chartData = Object.entries(byCategory).map(([name, value], index) => ({
      name,
      value,
      color: emeraldShades[index % emeraldShades.length]
    }));

    return { total, chartData };
  }, [searchFilteredExpenses, recurringExpenses, selectedMonth, selectedYear, categories]);

  const totalExpenses = searchFilteredExpenses.reduce((sum, e) => sum + e.amount, 0) + 
                        recurringExpenses.reduce((sum, r) => sum + r.amount, 0);
  const monthlyExpenses = monthlyStats.total;
  const categoryData = monthlyStats.chartData;

  const trendData = useMemo(() => {
    const data = [];
    for (let i = 11; i >= 0; i--) {
      const d = subMonths(new Date(), i);
      const month = d.getMonth();
      const year = d.getFullYear();
      const total = searchFilteredExpenses
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

  if (authLoading || (user && loading)) {
    return (
      <div className="flex items-center justify-center h-screen bg-stone-50 dark:bg-stone-950">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className={cn(darkMode && "dark")}>
        <div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex transition-colors duration-300">
          {/* Left Side - Form */}
          <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 sm:px-16 lg:px-24 xl:px-32 relative z-10">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="w-full max-w-md mx-auto"
            >
              <div className="flex items-center gap-3 mb-12">
                <div className="p-3 bg-emerald-600 rounded-2xl text-white shadow-lg shadow-emerald-200 dark:shadow-emerald-900/20">
                  <Wallet size={24} />
                </div>
                <span className="text-xl font-black tracking-tight text-stone-900 dark:text-stone-100">Cartera</span>
              </div>

              <div className="mb-10">
                <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-stone-900 dark:text-stone-100 mb-4 leading-tight">
                  {isRegistering ? 'Crea tu \ncuenta.' : 'Bienvenido de \nnuevo.'}
                </h1>
                <p className="text-stone-500 dark:text-stone-400 text-lg">
                  {isRegistering 
                    ? 'Únete a miles de usuarios que ya controlan sus finanzas.' 
                    : 'Gestiona tus finanzas con inteligencia y toma el control de tu futuro.'}
                </p>
              </div>

              <form onSubmit={isRegistering ? handleRegister : handleLogin} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest ml-1">Usuario</label>
                  <div className="relative group">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 group-focus-within:text-emerald-500 transition-colors" size={20} />
                    <input 
                      type="text"
                      required
                      value={loginData.username}
                      onChange={e => setLoginData({...loginData, username: e.target.value})}
                      placeholder="Tu nombre de usuario"
                      className="w-full bg-white dark:bg-stone-900 border-2 border-stone-100 dark:border-stone-800 rounded-2xl py-4 pl-12 pr-4 text-stone-900 dark:text-stone-100 focus:ring-0 focus:border-emerald-500 transition-all shadow-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest ml-1">Contraseña</label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 group-focus-within:text-emerald-500 transition-colors" size={20} />
                    <input 
                      type="password"
                      required
                      value={loginData.password}
                      onChange={e => setLoginData({...loginData, password: e.target.value})}
                      placeholder="••••••••"
                      className="w-full bg-white dark:bg-stone-900 border-2 border-stone-100 dark:border-stone-800 rounded-2xl py-4 pl-12 pr-4 text-stone-900 dark:text-stone-100 focus:ring-0 focus:border-emerald-500 transition-all shadow-sm"
                    />
                  </div>
                </div>

                {isRegistering && (
                  <div className="space-y-4">
                    <label className="text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest ml-1">Modo de Uso</label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { id: 'individual', label: 'Individual', icon: UserIcon },
                        { id: 'familiar', label: 'Familiar', icon: Users },
                        { id: 'amigos', label: 'Amigos', icon: Heart }
                      ].map((mode) => (
                        <button
                          key={mode.id}
                          type="button"
                          onClick={() => setLoginData({...loginData, account_mode: mode.id})}
                          className={cn(
                            "flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-2",
                            loginData.account_mode === mode.id 
                              ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400" 
                              : "border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-400 hover:border-stone-200 dark:hover:border-stone-700"
                          )}
                        >
                          <mode.icon size={20} />
                          <span className="text-[10px] font-bold uppercase tracking-wider">{mode.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {authError && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-red-500 text-sm font-bold bg-red-50 dark:bg-red-950/30 p-4 rounded-2xl border border-red-100 dark:border-red-900/50"
                  >
                    <p>{authError}</p>
                  </motion.div>
                )}

                <button 
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl font-bold shadow-xl shadow-emerald-200 dark:shadow-emerald-900/20 transition-all active:scale-[0.98] hover:-translate-y-1 mt-8 flex items-center justify-center gap-2 group"
                >
                  {isRegistering ? 'Registrarse' : 'Iniciar Sesión'}
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </button>

                <div className="text-center mt-6">
                  <button 
                    type="button"
                    onClick={() => {
                      setIsRegistering(!isRegistering);
                      setAuthError('');
                    }}
                    className="text-stone-500 dark:text-stone-400 text-sm font-medium hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                  >
                    {isRegistering ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate gratis'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>

          {/* Right Side - Visual */}
          <div className="hidden lg:flex w-1/2 bg-stone-100 dark:bg-stone-900 relative overflow-hidden items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent dark:from-emerald-500/5" />
            
            {/* Decorative elements */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative w-full max-w-lg aspect-square"
            >
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-emerald-500/20 dark:bg-emerald-500/10 blur-[100px] rounded-full" />
              
              <div className="relative z-10 grid grid-cols-2 gap-6 p-8">
                <div className="space-y-6 translate-y-12">
                  <div className="bg-white dark:bg-stone-950 p-6 rounded-3xl shadow-2xl border border-stone-100 dark:border-stone-800">
                    <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/50 rounded-full flex items-center justify-center mb-4">
                      <TrendingUp className="text-emerald-600 dark:text-emerald-400" size={20} />
                    </div>
                    <div className="text-sm text-stone-500 dark:text-stone-400 font-medium mb-1">Ingresos</div>
                    <div className="text-2xl font-black text-stone-900 dark:text-stone-100">+2,450€</div>
                  </div>
                  <div className="bg-white dark:bg-stone-950 p-6 rounded-3xl shadow-2xl border border-stone-100 dark:border-stone-800">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center mb-4">
                      <Target className="text-blue-600 dark:text-blue-400" size={20} />
                    </div>
                    <div className="text-sm text-stone-500 dark:text-stone-400 font-medium mb-1">Ahorro</div>
                    <div className="text-2xl font-black text-stone-900 dark:text-stone-100">850€</div>
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="bg-white dark:bg-stone-950 p-6 rounded-3xl shadow-2xl border border-stone-100 dark:border-stone-800">
                    <div className="w-10 h-10 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center mb-4">
                      <TrendingDown className="text-red-600 dark:text-red-400" size={20} />
                    </div>
                    <div className="text-sm text-stone-500 dark:text-stone-400 font-medium mb-1">Gastos</div>
                    <div className="text-2xl font-black text-stone-900 dark:text-stone-100">-1,240€</div>
                  </div>
                  <div className="bg-stone-900 dark:bg-stone-800 p-6 rounded-3xl shadow-2xl border border-stone-800 dark:border-stone-700 text-white">
                    <div className="w-10 h-10 bg-stone-800 dark:bg-stone-700 rounded-full flex items-center justify-center mb-4">
                      <PieChartIcon className="text-stone-300" size={20} />
                    </div>
                    <div className="text-sm text-stone-400 font-medium mb-1">Balance</div>
                    <div className="text-2xl font-black">1,210€</div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          <button
            onClick={() => setDarkMode(!darkMode)}
            className="fixed bottom-6 right-6 p-4 bg-white dark:bg-stone-900 text-stone-500 dark:text-stone-400 rounded-2xl shadow-xl border border-stone-200 dark:border-stone-800 transition-all z-50 hover:scale-110 active:scale-95"
          >
            {darkMode ? <Sun size={24} /> : <Moon size={24} />}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(darkMode && "dark")}>
      <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 font-sans pb-20 transition-colors duration-300 overflow-x-hidden">
        {/* Header */}
        <header className="bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 sticky top-0 z-10 px-4 py-4 sm:px-6">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-600 rounded-xl text-white">
              <Wallet size={24} />
            </div>
            <h1 className="text-xl font-bold tracking-tight">Cartera</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={resetLayout}
              className="p-2 text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition-colors"
              title="Restaurar diseño por defecto"
              aria-label="Restaurar diseño"
            >
              <LayoutDashboard size={20} />
            </button>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition-colors"
              aria-label="Toggle dark mode"
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button
              onClick={() => {
                setProfileData({ username: user?.username || '', profile_image: user?.profile_image || '' });
                setShowProfileModal(true);
              }}
              className="flex items-center gap-2 p-1 pr-3 bg-stone-100 dark:bg-stone-800 rounded-full hover:bg-stone-200 dark:hover:bg-stone-700 transition-all"
            >
              <div className="w-8 h-8 rounded-full overflow-hidden bg-stone-200 dark:bg-stone-700 flex items-center justify-center">
                {user?.profile_image ? (
                  <img src={user.profile_image} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <UserIcon size={16} className="text-stone-500" />
                )}
              </div>
              <span className="text-sm font-bold hidden sm:inline">{user?.username}</span>
            </button>
            <button
              onClick={handleLogout}
              className="p-2 text-stone-500 dark:text-stone-400 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 dark:hover:text-red-400 rounded-xl transition-colors"
              aria-label="Cerrar sesión"
            >
              <LogOut size={20} />
            </button>
            {(user?.username === 'gugliama' || user?.username === 'marcogugliandolo94@gmail.com') && (
              <button 
                onClick={() => {
                  fetchUsers();
                  setShowAdminPanel(true);
                }}
                className="bg-stone-800 hover:bg-stone-900 text-white px-4 py-2 rounded-full flex items-center gap-2 transition-all shadow-sm active:scale-95"
              >
                <UserIcon size={20} />
                <span className="hidden sm:inline">Admin</span>
              </button>
            )}
            <button 
              onClick={() => {
                setEditingExpense(null);
                setNewExpense({ amount: '', description: '', category_id: '', date: format(new Date(), 'yyyy-MM-dd') });
                setShowExpenseForm(true);
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-full flex items-center gap-2 transition-all shadow-sm active:scale-95"
            >
              <Plus size={20} />
              <span className="hidden sm:inline">Nuevo Gasto</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar gastos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all text-stone-900 dark:text-stone-100"
            />
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "p-3 rounded-2xl border transition-all flex items-center gap-2 text-sm font-bold",
                showFilters 
                  ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400" 
                  : "bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400"
              )}
            >
              <Filter size={18} />
              Filtros
            </button>
            <button 
              onClick={handleExport}
              className="p-3 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 transition-all flex items-center gap-2 text-sm font-bold"
            >
              <Download size={18} />
              Exportar
            </button>
          </div>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-8"
            >
              <div className="bg-white dark:bg-stone-900 p-6 rounded-3xl border border-stone-200 dark:border-stone-800 grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Rango de Fechas</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="date" 
                      value={dateRange.start}
                      onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                      className="flex-1 p-2 bg-stone-50 dark:bg-stone-800 border-none rounded-xl text-sm text-stone-900 dark:text-stone-100"
                    />
                    <span className="text-stone-400">a</span>
                    <input 
                      type="date" 
                      value={dateRange.end}
                      onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                      className="flex-1 p-2 bg-stone-50 dark:bg-stone-800 border-none rounded-xl text-sm text-stone-900 dark:text-stone-100"
                    />
                  </div>
                </div>
                <div className="flex items-end">
                  <button 
                    onClick={() => {
                      setDateRange({ start: '', end: '' });
                      setSearchTerm('');
                      setSelectedMonth(new Date().getMonth());
                    }}
                    className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 text-xs font-bold flex items-center gap-1"
                  >
                    <RefreshCw size={14} />
                    Limpiar Filtros
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="w-full">
          {mounted && (
            <ResponsiveGridLayout
              className="layout"
              layouts={layouts}
              breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
              cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
              rowHeight={100}
              onLayoutChange={handleLayoutChange}
              draggableHandle=".drag-handle"
              margin={[24, 24]}
              containerPadding={[0, 0]}
            >
              {/* Summary Total */}
              <div key="summary-total" className="bg-emerald-600 dark:bg-emerald-700 p-5 rounded-3xl shadow-lg hover:shadow-xl transition-shadow flex flex-col justify-center relative">
                <div className="drag-handle cursor-move absolute top-2 right-2 p-2 text-emerald-200 hover:text-white z-10">
                  <MoreHorizontal size={20} />
                </div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-emerald-500/30 text-white rounded-xl">
                    <TrendingUp size={18} />
                  </div>
                  <span className="text-emerald-50 text-sm font-bold uppercase tracking-wider">Gasto Total</span>
                </div>
                <div className="text-4xl sm:text-5xl font-black tracking-tighter text-white truncate">{totalExpenses.toLocaleString()}€</div>
                <div className="text-emerald-100/80 text-[10px] mt-1 font-medium">Desde el inicio</div>
              </div>

              {/* Summary Month */}
              <div key="summary-month" className="bg-emerald-50/50 dark:bg-emerald-950/10 p-5 rounded-3xl border border-emerald-200/30 dark:border-emerald-800/30 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-center relative">
                <div className="drag-handle cursor-move absolute top-2 right-2 p-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 z-10">
                  <MoreHorizontal size={20} />
                </div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 rounded-xl">
                    <Calendar size={18} />
                  </div>
                  <span className="text-emerald-700 dark:text-emerald-300 text-sm font-bold uppercase tracking-wider">Este Mes</span>
                </div>
                <div className="text-2xl sm:text-3xl font-bold tracking-tight text-emerald-900 dark:text-emerald-100 truncate">{monthlyExpenses.toLocaleString()}€</div>
                <div className="text-emerald-600/70 dark:text-emerald-400/70 text-[10px] mt-1 font-medium capitalize">
                  {format(new Date(selectedYear, selectedMonth), 'MMMM yyyy', { locale: es })}
                </div>
              </div>

              {/* Summary Goals */}
              <div key="summary-goals" className="bg-emerald-50/50 dark:bg-emerald-950/10 p-5 rounded-3xl border border-emerald-200/30 dark:border-emerald-800/30 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-center relative">
                <div className="drag-handle cursor-move absolute top-2 right-2 p-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 z-10">
                  <MoreHorizontal size={20} />
                </div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 rounded-xl">
                    <Target size={18} />
                  </div>
                  <span className="text-emerald-700 dark:text-emerald-300 text-sm font-bold uppercase tracking-wider">Metas Activas</span>
                </div>
                <div className="text-2xl sm:text-3xl font-bold tracking-tight text-emerald-900 dark:text-emerald-100">{goals.length}</div>
                <div className="text-emerald-600/70 dark:text-emerald-400/70 text-[10px] mt-1 font-medium">Objetivos de ahorro</div>
              </div>

              {/* Charts Card */}
              <div key="charts" className="bg-white/60 dark:bg-stone-900/60 backdrop-blur-2xl p-8 rounded-[2.5rem] border border-white/40 dark:border-stone-800/40 shadow-xl shadow-stone-200/20 dark:shadow-none hover:border-emerald-500/30 transition-all duration-500 flex flex-col h-full overflow-hidden relative">
                <div className="drag-handle cursor-move absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 z-10 bg-white/50 dark:bg-stone-800/50 rounded-xl backdrop-blur-sm">
                  <MoreHorizontal size={20} />
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4 pr-12">
                  <div>
                    <h3 className="text-2xl font-black tracking-tight text-stone-950 dark:text-stone-50">
                      {activeChartTab === 'categories' ? 'Distribución de Gastos' : 'Tendencia de Gastos'}
                    </h3>
                    <p className="text-stone-500 dark:text-stone-400 text-sm font-medium">
                      {activeChartTab === 'categories' ? 'Análisis visual por categorías' : 'Gastos totales últimos 12 meses'}
                    </p>
                  </div>
                  <div className="flex bg-stone-100/50 dark:bg-stone-800/50 p-1 rounded-2xl self-start border border-stone-200/50 dark:border-stone-700/50">
                    <button 
                      onClick={() => setActiveChartTab('categories')}
                      className={cn(
                        "px-5 py-2 text-xs font-bold rounded-xl transition-all",
                        activeChartTab === 'categories' ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "text-stone-600 dark:text-stone-400 hover:text-stone-900"
                      )}
                    >
                      Categorías
                    </button>
                    <button 
                      onClick={() => setActiveChartTab('trend')}
                      className={cn(
                        "px-5 py-2 text-xs font-bold rounded-xl transition-all",
                        activeChartTab === 'trend' ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "text-stone-600 dark:text-stone-400 hover:text-stone-900"
                      )}
                    >
                      Tendencia
                    </button>
                  </div>
                </div>
                
                <div className="flex-1 min-h-0">
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
                                contentStyle={{ 
                                  borderRadius: '16px', 
                                  border: 'none', 
                                  boxShadow: '0 10px 25px rgba(0,0,0,0.05)', 
                                  padding: '12px',
                                  backgroundColor: darkMode ? '#1c1917' : '#ffffff',
                                  color: darkMode ? '#f5f5f4' : '#1c1917'
                                }}
                                itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                                formatter={(value: number) => [`${value.toLocaleString()}€`, 'Total']}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center text-stone-300 dark:text-stone-700 gap-2">
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
                              <span className="text-sm font-medium text-stone-600 dark:text-stone-400 group-hover:text-stone-900 dark:group-hover:text-stone-100 transition-colors">{cat.name}</span>
                            </div>
                            <div className="text-sm font-bold text-stone-900 dark:text-stone-100">{cat.value.toLocaleString()}€</div>
                          </div>
                        )) : (
                          <div className="text-stone-400 dark:text-stone-500 text-xs text-center">Registra gastos para ver el desglose</div>
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
                            tick={{ fontSize: 10, fontWeight: 'bold', fill: darkMode ? '#78716c' : '#a8a29e' }}
                            dy={10}
                          />
                          <YAxis hide />
                          <Tooltip 
                            cursor={{ fill: darkMode ? '#292524' : '#f5f5f4', radius: 12 }}
                            contentStyle={{ 
                              borderRadius: '16px', 
                              border: 'none', 
                              boxShadow: '0 10px 25px rgba(0,0,0,0.05)', 
                              padding: '12px',
                              backgroundColor: darkMode ? '#1c1917' : '#ffffff',
                              color: darkMode ? '#f5f5f4' : '#1c1917'
                            }}
                            itemStyle={{ fontSize: '12px', fontWeight: 'bold', color: '#059669' }}
                            labelStyle={{ fontSize: '10px', fontWeight: 'bold', color: darkMode ? '#78716c' : '#a8a29e', marginBottom: '4px' }}
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

              {/* Savings Goals */}
              <div key="goals" className="space-y-4 h-full overflow-y-auto custom-scrollbar relative pr-2">
                <div className="drag-handle cursor-move absolute top-0 right-0 p-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 z-10 bg-white/50 dark:bg-stone-800/50 rounded-xl backdrop-blur-sm">
                  <MoreHorizontal size={20} />
                </div>
                <div className="flex items-center justify-between px-2 pr-12">
                  <h3 className="text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100">Metas de Ahorro</h3>
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
                        className="bg-white/60 dark:bg-stone-900/60 backdrop-blur-xl p-6 rounded-[2rem] border border-white/40 dark:border-stone-800/40 shadow-lg shadow-stone-200/10 dark:shadow-none space-y-4 hover:border-emerald-500/30 transition-all duration-500"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-stone-800 dark:text-stone-200">{goal.name}</h4>
                            <p className="text-[10px] text-stone-400 dark:text-stone-500 font-bold uppercase tracking-widest mt-0.5">
                              {goal.deadline ? format(parseISO(goal.deadline), 'dd MMM yyyy', { locale: es }) : 'Sin fecha'}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-black text-emerald-600 dark:text-emerald-500">{Math.round(progress)}%</div>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="h-2.5 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${progress}%` }}
                              className="h-full bg-emerald-500 rounded-full"
                            />
                          </div>
                          <div className="flex justify-between text-[11px] font-bold">
                            <span className="text-stone-400 dark:text-stone-500">{goal.current_amount.toLocaleString()}€</span>
                            <span className="text-stone-800 dark:text-stone-200">Objetivo: {goal.target_amount.toLocaleString()}€</span>
                          </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                          <button 
                            onClick={() => handleUpdateGoalProgress(goal.id, goal.current_amount, 50)}
                            className="flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider bg-stone-50 dark:bg-stone-800 text-stone-500 dark:text-stone-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all"
                          >
                            +50€
                          </button>
                          <button 
                            onClick={() => handleUpdateGoalProgress(goal.id, goal.current_amount, 100)}
                            className="flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider bg-stone-50 dark:bg-stone-800 text-stone-500 dark:text-stone-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all"
                          >
                            +100€
                          </button>
                        </div>
                      </motion.div>
                    );
                  }) : (
                    <div className="col-span-2 bg-stone-100/50 dark:bg-stone-900/50 border-2 border-dashed border-stone-200 dark:border-stone-800 rounded-[2rem] py-12 flex flex-col items-center justify-center text-stone-400 dark:text-stone-600 gap-3">
                      <Target size={40} strokeWidth={1} />
                      <p className="text-sm font-medium italic">Establece tu primera meta de ahorro</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Budgets */}
              <div key="budgets" className="bg-white dark:bg-stone-900 p-8 rounded-[2rem] border border-stone-200/60 dark:border-stone-800 shadow-sm h-full overflow-y-auto custom-scrollbar relative">
                <div className="drag-handle cursor-move absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 z-10 bg-white/50 dark:bg-stone-800/50 rounded-xl backdrop-blur-sm">
                  <MoreHorizontal size={20} />
                </div>
                <div className="flex items-center justify-between mb-8 pr-12">
                  <div>
                    <h3 className="text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100">Presupuestos por Categoría</h3>
                    <p className="text-stone-400 dark:text-stone-500 text-sm">Controla tus límites mensuales</p>
                  </div>
                  <div className="p-2 bg-stone-50 dark:bg-stone-800 rounded-xl text-stone-400">
                    <BarChart3 size={20} />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  {categories.map(cat => {
                    const spent = searchFilteredExpenses
                      .filter(e => e.category_id === cat.id && parseISO(e.date).getMonth() === selectedMonth && parseISO(e.date).getFullYear() === selectedYear)
                      .reduce((sum, e) => sum + e.amount, 0);
                    const percentage = cat.budget > 0 ? Math.min((spent / cat.budget) * 100, 100) : 0;
                    const isOver = cat.budget > 0 && spent > cat.budget;

                    return (
                      <div key={cat.id} className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                            <span className="text-sm font-bold text-stone-700 dark:text-stone-300">{cat.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-stone-900 dark:text-stone-100">{spent.toLocaleString()}€</span>
                            <span className="text-stone-400 text-[10px]">/</span>
                            <input 
                              type="number"
                              defaultValue={cat.budget}
                              onBlur={(e) => handleUpdateBudget(cat.id, parseFloat(e.target.value) || 0)}
                              className="w-16 bg-transparent border-none p-0 text-[10px] font-black text-stone-400 focus:text-emerald-600 focus:ring-0 transition-colors"
                            />
                          </div>
                        </div>
                        <div className="h-2 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            className={cn(
                              "h-full rounded-full transition-all duration-1000",
                              isOver ? "bg-red-500" : "bg-emerald-500"
                            )}
                          />
                        </div>
                        {isOver && (
                          <p className="text-[10px] text-red-500 font-bold flex items-center gap-1">
                            <TrendingUp size={10} />
                            ¡Presupuesto excedido!
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Recurring Expenses */}
              <div key="recurring" className="bg-white dark:bg-stone-900 p-8 rounded-[2rem] border border-stone-200/60 dark:border-stone-800 shadow-sm h-full overflow-y-auto custom-scrollbar relative">
                <div className="drag-handle cursor-move absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 z-10 bg-white/50 dark:bg-stone-800/50 rounded-xl backdrop-blur-sm">
                  <MoreHorizontal size={20} />
                </div>
                <div className="flex items-center justify-between mb-8 pr-12">
                  <div>
                    <h3 className="text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100">Gastos Recurrentes</h3>
                    <p className="text-stone-400 dark:text-stone-500 text-sm">Suscripciones y pagos fijos</p>
                  </div>
                  <button 
                    onClick={() => setShowRecurringForm(true)}
                    className="p-2 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-xl hover:bg-emerald-100 transition-all"
                  >
                    <Plus size={20} />
                  </button>
                </div>

                <div className="space-y-4">
                  {recurringExpenses.length > 0 ? recurringExpenses.map(rec => {
                    const Icon = ICON_MAP[rec.category_icon] || MoreHorizontal;
                    return (
                      <div key={rec.id} className="flex items-center justify-between p-4 bg-stone-50 dark:bg-stone-800/50 rounded-2xl border border-stone-100 dark:border-stone-800">
                        <div className="flex items-center gap-4">
                          <div className="p-2.5 rounded-xl text-white" style={{ backgroundColor: rec.category_color }}>
                            <Icon size={18} />
                          </div>
                          <div>
                            <div className="font-bold text-sm text-stone-900 dark:text-stone-100">{rec.description}</div>
                            <div className="text-[10px] text-stone-400 dark:text-stone-500 font-bold uppercase tracking-widest">
                              {rec.frequency === 'monthly' ? 'Mensual' : 'Semanal'} • Próximo: {format(parseISO(rec.next_date), 'dd MMM', { locale: es })}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="font-black text-stone-900 dark:text-stone-100">{rec.amount.toLocaleString()}€</div>
                          <button 
                            onClick={() => handleDeleteRecurring(rec.id)}
                            className="text-stone-300 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  }) : (
                    <div className="text-center py-8 text-stone-400 italic text-sm">No tienes gastos recurrentes configurados</div>
                  )}
                </div>
              </div>

              {/* Sidebar Area */}
              <div key="sidebar" className="bg-white/80 dark:bg-stone-900/80 backdrop-blur-md p-6 rounded-[2rem] border border-stone-200/50 dark:border-stone-800/50 shadow-lg shadow-stone-200/20 dark:shadow-none flex flex-col h-full relative">
                <div className="drag-handle cursor-move absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 z-10 bg-white/50 dark:bg-stone-800/50 rounded-xl backdrop-blur-sm">
                  <MoreHorizontal size={20} />
                </div>
                <div className="flex flex-col gap-4 mb-6 pr-12">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold tracking-tight text-stone-900 dark:text-stone-100">Gastos</h3>
                    <div className="p-1.5 bg-stone-50 dark:bg-stone-800 rounded-lg text-stone-400 dark:text-stone-500">
                      <TrendingDown size={16} />
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <select 
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                      className="flex-1 bg-stone-50 dark:bg-stone-800 border-none rounded-xl px-3 py-2 text-xs font-bold text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-emerald-500 transition-all appearance-none"
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
                      className="bg-stone-50 dark:bg-stone-800 border-none rounded-xl px-3 py-2 text-xs font-bold text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-emerald-500 transition-all appearance-none"
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
                        className="flex items-center justify-between p-4 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 rounded-2xl transition-all group border border-transparent hover:border-emerald-100 dark:hover:border-emerald-900"
                      >
                        <div className="flex items-center gap-4">
                          <div 
                            className="p-3 rounded-2xl text-white shadow-sm"
                            style={{ backgroundColor: expense.category_color }}
                          >
                            <Icon size={18} />
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-sm text-stone-800 dark:text-stone-200 truncate">{expense.description || expense.category_name}</div>
                            <div className="text-[11px] text-stone-400 dark:text-stone-500 font-medium">{format(parseISO(expense.date), 'dd MMM', { locale: es })}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="font-black text-sm text-emerald-600 dark:text-emerald-400">-{expense.amount.toLocaleString()}€</div>
                          <div className="flex items-center opacity-0 group-hover:opacity-100 transition-all">
                            <button 
                              onClick={() => openEditExpense(expense)}
                              className="p-2 text-stone-300 dark:text-stone-600 hover:text-emerald-500 dark:hover:text-emerald-400 transition-all"
                              title="Editar gasto"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button 
                              onClick={() => handleDeleteExpense(expense.id)}
                              className="p-2 text-stone-300 dark:text-stone-600 hover:text-red-500 dark:hover:text-red-400 transition-all"
                              title="Eliminar gasto"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  }) : (
                    <div className="flex flex-col items-center justify-center py-20 text-stone-300 dark:text-stone-700 gap-2">
                      <Wallet size={32} strokeWidth={1} />
                      <p className="text-xs italic">Sin gastos en este periodo</p>
                    </div>
                  )}
                </div>
                
                {filteredExpenses.length > 0 && (
                  <button className="w-full mt-4 py-3 text-stone-400 dark:text-stone-500 text-[10px] font-black uppercase tracking-widest hover:text-stone-900 dark:hover:text-stone-100 transition-colors border-t border-stone-50 dark:border-stone-800 pt-4">
                    Ver Historial Completo
                  </button>
                )}
              </div>
            </ResponsiveGridLayout>
          )}
        </div>
      </main>

      {/* Profile Modal */}
      <AnimatePresence>
        {showProfileModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowProfileModal(false)}
              className="absolute inset-0 bg-stone-900/40 dark:bg-stone-950/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white dark:bg-stone-900 w-full max-w-md rounded-3xl shadow-2xl p-8"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-stone-900 dark:text-stone-100">Mi Perfil</h2>
                <button onClick={() => setShowProfileModal(false)} className="p-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200">
                  <X size={24} />
                </button>
              </div>

              <div className="max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar space-y-8">
                <form onSubmit={handleUpdateProfile} className="space-y-6">
                  <div className="flex flex-col items-center gap-4 mb-4">
                    <div className="relative group">
                      <div className="w-32 h-32 rounded-full overflow-hidden bg-stone-100 dark:bg-stone-800 border-4 border-white dark:border-stone-800 shadow-xl">
                        {profileData.profile_image ? (
                          <img src={profileData.profile_image} alt="Profile Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-stone-300 dark:text-stone-700">
                            <UserIcon size={48} />
                          </div>
                        )}
                      </div>
                      <label className="absolute bottom-0 right-0 p-2 bg-emerald-600 text-white rounded-full shadow-lg cursor-pointer hover:bg-emerald-700 transition-all">
                        <Camera size={18} />
                        <input type="file" accept="image/*" onChange={handleProfileImageUpload} className="hidden" />
                      </label>
                    </div>
                    <p className="text-xs text-stone-400 font-medium">Haz clic en la cámara para cambiar tu foto</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest ml-1">Nombre de Usuario</label>
                    <input 
                      type="text"
                      required
                      value={profileData.username}
                      onChange={e => setProfileData({...profileData, username: e.target.value})}
                      className="w-full bg-stone-50 dark:bg-stone-800 border-none rounded-2xl py-4 px-6 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-emerald-500 transition-all"
                    />
                  </div>

                  {user?.account_mode && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest ml-1">Modo de Cuenta</label>
                      <div className="w-full bg-stone-50 dark:bg-stone-800 rounded-2xl py-4 px-6 text-stone-500 dark:text-stone-400 font-bold capitalize">
                        {user.account_mode}
                      </div>
                    </div>
                  )}

                  <button 
                    type="submit"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl font-bold shadow-xl shadow-emerald-200 dark:shadow-emerald-900/20 transition-all active:scale-[0.98]"
                  >
                    Guardar Perfil
                  </button>
                </form>

                <div className="h-px bg-stone-100 dark:bg-stone-800" />

                <form onSubmit={handleUpdatePassword} className="space-y-6 pb-4">
                  <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">Cambiar Contraseña</h3>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest ml-1">Contraseña Actual</label>
                    <input 
                      type="password"
                      required
                      value={passwordData.oldPassword}
                      onChange={e => setPasswordData({...passwordData, oldPassword: e.target.value})}
                      className="w-full bg-stone-50 dark:bg-stone-800 border-none rounded-2xl py-4 px-6 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-emerald-500 transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest ml-1">Nueva Contraseña</label>
                    <input 
                      type="password"
                      required
                      value={passwordData.newPassword}
                      onChange={e => setPasswordData({...passwordData, newPassword: e.target.value})}
                      className="w-full bg-stone-50 dark:bg-stone-800 border-none rounded-2xl py-4 px-6 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-emerald-500 transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest ml-1">Confirmar Nueva Contraseña</label>
                    <input 
                      type="password"
                      required
                      value={passwordData.confirmPassword}
                      onChange={e => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                      className="w-full bg-stone-50 dark:bg-stone-800 border-none rounded-2xl py-4 px-6 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-emerald-500 transition-all"
                    />
                  </div>

                  {passwordError && (
                    <div className="text-red-500 text-xs font-bold bg-red-50 dark:bg-red-950/30 p-3 rounded-xl border border-red-100 dark:border-red-900/50">
                      {passwordError}
                    </div>
                  )}

                  {passwordSuccess && (
                    <div className="text-emerald-600 text-xs font-bold bg-emerald-50 dark:bg-emerald-950/30 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/50">
                      Contraseña actualizada correctamente
                    </div>
                  )}

                  <button 
                    type="submit"
                    className="w-full bg-stone-800 hover:bg-stone-900 text-white py-4 rounded-2xl font-bold shadow-xl transition-all active:scale-[0.98]"
                  >
                    Actualizar Contraseña
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Expense Modal */}
      <AnimatePresence>
        {showExpenseForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowExpenseForm(false)}
              className="absolute inset-0 bg-stone-900/40 dark:bg-stone-950/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white dark:bg-stone-900 w-full max-w-md rounded-3xl shadow-2xl p-8"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-stone-900 dark:text-stone-100">{editingExpense ? 'Editar Gasto' : 'Registrar Gasto'}</h2>
                <div className="relative">
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleScanReceipt}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <button 
                    type="button"
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-all"
                  >
                    {scanningReceipt ? <Loader2 className="animate-spin" size={16} /> : <Camera size={16} />}
                    Escanear Ticket
                  </button>
                </div>
              </div>
              <form onSubmit={handleAddExpense} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-1">Monto (€)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    required
                    value={newExpense.amount}
                    onChange={e => setNewExpense({...newExpense, amount: e.target.value})}
                    placeholder="0.00"
                    className="w-full bg-stone-50 dark:bg-stone-800 border-none rounded-xl p-4 text-lg font-bold text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-emerald-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-1">Descripción</label>
                  <input 
                    type="text" 
                    value={newExpense.description}
                    onChange={e => setNewExpense({...newExpense, description: e.target.value})}
                    placeholder="Ej. Almuerzo, Gasolina..."
                    className="w-full bg-stone-50 dark:bg-stone-800 border-none rounded-xl p-4 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-emerald-500 transition-all"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider">Categoría</label>
                    <button 
                      type="button"
                      onClick={() => {
                        setShowExpenseForm(false);
                        setShowCategoryForm(true);
                      }}
                      className="text-xs font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-500 dark:hover:text-emerald-400"
                    >
                      + Nueva Categoría
                    </button>
                  </div>
                  <select 
                    required
                    value={newExpense.category_id}
                    onChange={e => setNewExpense({...newExpense, category_id: e.target.value})}
                    className="w-full bg-stone-50 dark:bg-stone-800 border-none rounded-xl p-4 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-emerald-500 transition-all appearance-none"
                  >
                    <option value="">Selecciona una categoría</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-1">Fecha</label>
                  <input 
                    type="date" 
                    required
                    value={newExpense.date}
                    onChange={e => setNewExpense({...newExpense, date: e.target.value})}
                    className="w-full bg-stone-50 dark:bg-stone-800 border-none rounded-xl p-4 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-emerald-500 transition-all"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowExpenseForm(false)}
                    className="flex-1 py-4 rounded-xl font-bold text-stone-500 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-xl font-bold shadow-lg shadow-emerald-200 dark:shadow-emerald-900/20 transition-all active:scale-95"
                  >
                    {editingExpense ? 'Guardar Cambios' : 'Guardar'}
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
              className="absolute inset-0 bg-stone-900/40 dark:bg-stone-950/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white dark:bg-stone-900 w-full max-w-md rounded-3xl shadow-2xl p-8"
            >
              <h2 className="text-2xl font-bold mb-6 text-stone-900 dark:text-stone-100">Nueva Meta de Ahorro</h2>
              <form onSubmit={handleAddGoal} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-1">Nombre de la Meta</label>
                  <input 
                    type="text" 
                    required
                    value={newGoal.name}
                    onChange={e => setNewGoal({...newGoal, name: e.target.value})}
                    placeholder="Ej. Viaje a Japón, Fondo de Emergencia..."
                    className="w-full bg-stone-50 dark:bg-stone-800 border-none rounded-xl p-4 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-emerald-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-1">Monto Objetivo (€)</label>
                  <input 
                    type="number" 
                    required
                    value={newGoal.target_amount}
                    onChange={e => setNewGoal({...newGoal, target_amount: e.target.value})}
                    placeholder="0.00"
                    className="w-full bg-stone-50 dark:bg-stone-800 border-none rounded-xl p-4 text-lg font-bold text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-emerald-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-1">Fecha Límite (Opcional)</label>
                  <input 
                    type="date" 
                    value={newGoal.deadline}
                    onChange={e => setNewGoal({...newGoal, deadline: e.target.value})}
                    className="w-full bg-stone-50 dark:bg-stone-800 border-none rounded-xl p-4 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-emerald-500 transition-all"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowGoalForm(false)}
                    className="flex-1 py-4 rounded-xl font-bold text-stone-500 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-xl font-bold shadow-lg shadow-emerald-200 dark:shadow-emerald-900/20 transition-all active:scale-95"
                  >
                    Crear Meta
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Category Modal */}
      <AnimatePresence>
        {showCategoryForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowCategoryForm(false);
                setShowExpenseForm(true);
              }}
              className="absolute inset-0 bg-stone-900/40 dark:bg-stone-950/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white dark:bg-stone-900 w-full max-w-md rounded-3xl shadow-2xl p-8"
            >
              <h2 className="text-2xl font-bold mb-6 text-stone-900 dark:text-stone-100">Nueva Categoría</h2>
              <form onSubmit={handleAddCategory} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-1">Nombre</label>
                  <input 
                    type="text" 
                    required
                    value={newCategory.name}
                    onChange={e => setNewCategory({...newCategory, name: e.target.value})}
                    placeholder="Ej. Mascotas, Suscripciones..."
                    className="w-full bg-stone-50 dark:bg-stone-800 border-none rounded-xl p-4 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-emerald-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-1">Color</label>
                  <div className="flex items-center gap-4">
                    <input 
                      type="color" 
                      required
                      value={newCategory.color}
                      onChange={e => setNewCategory({...newCategory, color: e.target.value})}
                      className="w-12 h-12 rounded-xl cursor-pointer border-none p-0 bg-transparent"
                    />
                    <span className="text-sm text-stone-500 font-medium">{newCategory.color}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-2">Icono</label>
                  <div className="grid grid-cols-6 gap-2">
                    {Object.keys(ICON_MAP).map(iconName => {
                      const IconComponent = ICON_MAP[iconName];
                      return (
                        <button
                          key={iconName}
                          type="button"
                          onClick={() => setNewCategory({...newCategory, icon: iconName})}
                          className={cn(
                            "p-3 rounded-xl flex items-center justify-center transition-all",
                            newCategory.icon === iconName 
                              ? "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 border-2 border-emerald-500" 
                              : "bg-stone-50 dark:bg-stone-800 text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-700 border-2 border-transparent"
                          )}
                        >
                          <IconComponent size={20} />
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => {
                      setShowCategoryForm(false);
                      setShowExpenseForm(true);
                    }}
                    className="flex-1 py-4 rounded-xl font-bold text-stone-500 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 transition-all"
                  >
                    Volver
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-xl font-bold shadow-lg shadow-emerald-200 dark:shadow-emerald-900/20 transition-all active:scale-95"
                  >
                    Crear
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Admin Panel Modal */}
      <AnimatePresence>
        {showAdminPanel && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAdminPanel(false)}
              className="absolute inset-0 bg-stone-900/40 dark:bg-stone-950/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white dark:bg-stone-900 w-full max-w-2xl rounded-3xl shadow-2xl p-8 max-h-[90vh] flex flex-col"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <UserIcon size={24} className="text-emerald-600" />
                  Gestión de Usuarios
                </h2>
                <button 
                  onClick={() => {
                    setShowAdminPanel(false);
                    setShowUserForm(true);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-all shadow-sm active:scale-95 text-sm font-bold"
                >
                  <Plus size={16} />
                  Nuevo Usuario
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                <div className="space-y-2">
                  {usersList.length > 0 ? (
                    usersList.map(u => (
                      <div key={u.id} className="flex items-center justify-between p-4 bg-stone-50 dark:bg-stone-800/50 rounded-2xl border border-stone-100 dark:border-stone-800 hover:border-emerald-200 dark:hover:border-emerald-900/30 transition-all group">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold">
                            {u.username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-stone-900 dark:text-stone-100">{u.username}</div>
                            <div className="text-xs text-stone-500 dark:text-stone-400">ID: {u.id}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {(u.username !== 'gugliama' && u.username !== 'marcogugliandolo94@gmail.com') ? (
                            <button 
                              onClick={() => handleDeleteUser(u.id)}
                              className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                              title="Eliminar usuario"
                            >
                              <Trash2 size={18} />
                            </button>
                          ) : (
                            <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1 rounded-full uppercase tracking-widest">
                              Admin
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12 bg-stone-50 dark:bg-stone-800/30 rounded-3xl border-2 border-dashed border-stone-100 dark:border-stone-800">
                      <div className="w-12 h-12 bg-stone-100 dark:bg-stone-800 rounded-full flex items-center justify-center mx-auto mb-4 text-stone-400">
                        <UserIcon size={24} />
                      </div>
                      <p className="text-stone-500 dark:text-stone-400 font-medium">Cargando lista de usuarios...</p>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="pt-6 mt-6 border-t border-stone-100 dark:border-stone-800">
                <button 
                  onClick={() => setShowAdminPanel(false)}
                  className="w-full py-4 rounded-xl font-bold text-stone-500 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 transition-all"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* User Modal */}
      <AnimatePresence>
        {showUserForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowUserForm(false)}
              className="absolute inset-0 bg-stone-900/40 dark:bg-stone-950/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white dark:bg-stone-900 w-full max-w-md rounded-3xl shadow-2xl p-8"
            >
              <h2 className="text-2xl font-bold mb-6 text-stone-900 dark:text-stone-100">Nuevo Usuario</h2>
              <form onSubmit={handleAddUser} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-1">Usuario</label>
                  <input 
                    type="text" 
                    required
                    value={newUser.username}
                    onChange={e => setNewUser({...newUser, username: e.target.value})}
                    className="w-full bg-stone-50 dark:bg-stone-800 border-none rounded-xl p-4 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-emerald-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-1">Contraseña</label>
                  <input 
                    type="password" 
                    required
                    value={newUser.password}
                    onChange={e => setNewUser({...newUser, password: e.target.value})}
                    className="w-full bg-stone-50 dark:bg-stone-800 border-none rounded-xl p-4 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-emerald-500 transition-all"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowUserForm(false)}
                    className="flex-1 py-4 rounded-xl font-bold text-stone-500 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-xl font-bold shadow-lg shadow-emerald-200 dark:shadow-emerald-900/20 transition-all active:scale-95"
                  >
                    Registrar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Recurring Expense Modal */}
      <AnimatePresence>
        {showRecurringForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowRecurringForm(false)}
              className="absolute inset-0 bg-stone-900/40 dark:bg-stone-950/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white dark:bg-stone-900 w-full max-w-md rounded-3xl shadow-2xl p-8"
            >
              <h2 className="text-2xl font-bold mb-6 text-stone-900 dark:text-stone-100">Nuevo Gasto Recurrente</h2>
              <form onSubmit={handleAddRecurring} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-1">Monto (€)</label>
                  <input 
                    type="number" 
                    required
                    value={newRecurring.amount}
                    onChange={e => setNewRecurring({...newRecurring, amount: e.target.value})}
                    placeholder="0.00"
                    className="w-full bg-stone-50 dark:bg-stone-800 border-none rounded-xl p-4 text-2xl font-black text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-emerald-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-1">Descripción</label>
                  <input 
                    type="text" 
                    required
                    value={newRecurring.description}
                    onChange={e => setNewRecurring({...newRecurring, description: e.target.value})}
                    placeholder="Ej. Netflix, Gimnasio..."
                    className="w-full bg-stone-50 dark:bg-stone-800 border-none rounded-xl p-4 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-emerald-500 transition-all"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-1">Frecuencia</label>
                    <select 
                      value={newRecurring.frequency}
                      onChange={e => setNewRecurring({...newRecurring, frequency: e.target.value as any})}
                      className="w-full bg-stone-50 dark:bg-stone-800 border-none rounded-xl p-4 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-emerald-500 transition-all"
                    >
                      <option value="monthly">Mensual</option>
                      <option value="weekly">Semanal</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-1">Categoría</label>
                    <select 
                      required
                      value={newRecurring.category_id}
                      onChange={e => setNewRecurring({...newRecurring, category_id: e.target.value})}
                      className="w-full bg-stone-50 dark:bg-stone-800 border-none rounded-xl p-4 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-emerald-500 transition-all"
                    >
                      <option value="">Seleccionar</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-1">Próxima Fecha</label>
                  <input 
                    type="date" 
                    required
                    value={newRecurring.next_date}
                    onChange={e => setNewRecurring({...newRecurring, next_date: e.target.value})}
                    className="w-full bg-stone-50 dark:bg-stone-800 border-none rounded-xl p-4 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-emerald-500 transition-all"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowRecurringForm(false)}
                    className="flex-1 py-4 rounded-xl font-bold text-stone-500 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-xl font-bold shadow-lg shadow-emerald-200 dark:shadow-emerald-900/20 transition-all active:scale-95"
                  >
                    Guardar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}
