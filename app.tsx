import React, { useState, useEffect, useMemo } from 'react';
import { 
  Package, 
  ShoppingCart, 
  TrendingDown, 
  BarChart2, 
  Plus, 
  Minus, 
  Edit3, 
  Trash2, 
  AlertTriangle, 
  CheckCircle, 
  Search, 
  Filter, 
  RefreshCw, 
  Calendar, 
  Users, 
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  CookingPot,
  Share2,
  Tag
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';

// Firebase imports
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp 
} from 'firebase/firestore';

// Firebase Initialization
const firebaseConfigStr = typeof __firebase_config !== 'undefined' ? __firebase_config : '{}';
let firebaseApp, auth, db;

try {
  const firebaseConfig = JSON.parse(firebaseConfigStr);
  if (firebaseConfig.apiKey) {
    firebaseApp = initializeApp(firebaseConfig);
    auth = getAuth(firebaseApp);
    db = getFirestore(firebaseApp);
  }
} catch (e) {
  console.error("Firebase config parse error:", e);
}

const appId = typeof __app_id !== 'undefined' ? __app_id : 'spajz-app-default';

// Sample fallback data for initial presentation or offline
const INITIAL_ITEMS = [
  { id: '1', name: 'Búzaliszt BL-55', category: 'Alapvető élelmiszer', stock: 3.5, unit: 'kg', minStock: 2, lastUpdated: new Date().toISOString() },
  { id: '2', name: 'Kristálycukor', category: 'Alapvető élelmiszer', stock: 0.5, unit: 'kg', minStock: 1, lastUpdated: new Date().toISOString() },
  { id: '3', name: 'Tej 2.8%', category: 'Hűtő / Tejtermék', stock: 1, unit: 'l', minStock: 3, lastUpdated: new Date().toISOString() },
  { id: '4', name: 'Tojás (M)', category: 'Hűtő / Tejtermék', stock: 12, unit: 'db', minStock: 10, lastUpdated: new Date().toISOString() },
  { id: '5', name: 'Trappista sajt', category: 'Hűtő / Tejtermék', stock: 0.2, unit: 'kg', minStock: 0.5, lastUpdated: new Date().toISOString() },
  { id: '6', name: 'Napraforgóolaj', category: 'Alapvető élelmiszer', stock: 2, unit: 'l', minStock: 1, lastUpdated: new Date().toISOString() },
  { id: '7', name: 'Spagetti tészta', category: 'Tészta & Gabona', stock: 4, unit: 'csomag', minStock: 2, lastUpdated: new Date().toISOString() },
  { id: '8', name: 'Kávé (szemese)', category: 'Italok / Kávé', stock: 0, unit: 'kg', minStock: 0.5, lastUpdated: new Date().toISOString() },
];

const CATEGORIES = [
  'Összes kategória',
  'Alapvető élelmiszer',
  'Hűtő / Tejtermék',
  'Fagyasztó',
  'Konszerv & Úveg',
  'Tészta & Gabona',
  'Fűszerek & Ízesítők',
  'Italok / Kávé',
  'Nasi & Édesség',
  'Tisztítószerek & Háztartás'
];

const UNITS = ['db', 'kg', 'g', 'l', 'dl', 'ml', 'csomag', 'üveg', 'doboz', 'tubus'];

export default function App() {
  const [activeTab, setActiveTab] = useState('inventory'); // inventory, shopping, log, stats
  const [user, setUser] = useState(null);
  const [items, setItems] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Összes kategória');
  const [stockFilter, setStockFilter] = useState('all'); // all, low, out

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'Alapvető élelmiszer',
    stock: '',
    unit: 'db',
    minStock: ''
  });

  // Custom Log Modal State
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [logItem, setLogItem] = useState(null);
  const [logType, setLogType] = useState('consume'); // consume | restock
  const [logAmount, setLogAmount] = useState('');
  const [logNote, setLogNote] = useState('');

  // Authentication Setup
  useEffect(() => {
    if (!auth) {
      // Demo mode fallback
      setItems(INITIAL_ITEMS);
      setLoading(false);
      return;
    }

    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth initialization failed:", err);
      }
    };

    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (usr) => {
      setUser(usr);
      if (!usr) setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Sync Items from Firestore
  useEffect(() => {
    if (!db || !user) return;

    // Public collection inside artifact for shared family access
    const itemsRef = collection(db, 'artifacts', appId, 'public', 'data', 'pantry_items');
    const unsubscribeItems = onSnapshot(itemsRef, (snapshot) => {
      const itemData = [];
      snapshot.forEach((doc) => {
        itemData.push({ id: doc.id, ...doc.data() });
      });
      
      // Seed initial items if empty
      if (itemData.length === 0 && snapshot.empty) {
        INITIAL_ITEMS.forEach(async (it) => {
          await addDoc(itemsRef, {
            ...it,
            createdAt: new Date().toISOString()
          });
        });
      } else {
        setItems(itemData);
      }
      setLoading(false);
    }, (error) => {
      console.error("Error fetching items:", error);
      setLoading(false);
    });

    // Logs collection
    const logsRef = collection(db, 'artifacts', appId, 'public', 'data', 'pantry_logs');
    const unsubscribeLogs = onSnapshot(logsRef, (snapshot) => {
      const logData = [];
      snapshot.forEach((doc) => {
        logData.push({ id: doc.id, ...doc.data() });
      });
      // Sort newest first
      logData.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setLogs(logData);
    }, (error) => {
      console.error("Error fetching logs:", error);
    });

    return () => {
      unsubscribeItems();
      unsubscribeLogs();
    };
  }, [user]);

  // Helper Functions
  const getItemStatus = (item) => {
    const stock = Number(item.stock) || 0;
    const min = Number(item.minStock) || 0;
    if (stock <= 0) return { label: 'Elfogyott', code: 'out', color: 'bg-red-500/10 text-red-600 border-red-200' };
    if (stock <= min) return { label: 'Kevés van', code: 'low', color: 'bg-amber-500/10 text-amber-600 border-amber-200' };
    return { label: 'Rendben', code: 'ok', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-200' };
  };

  const handleOpenModal = (item = null) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        category: item.category || 'Alapvető élelmiszer',
        stock: item.stock,
        unit: item.unit || 'db',
        minStock: item.minStock
      });
    } else {
      setEditingItem(null);
      setFormData({
        name: '',
        category: 'Alapvető élelmiszer',
        stock: 1,
        unit: 'db',
        minStock: 1
      });
    }
    setIsModalOpen(true);
  };

  const handleSaveItem = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    const payload = {
      name: formData.name.trim(),
      category: formData.category,
      stock: Math.max(0, parseFloat(formData.stock) || 0),
      unit: formData.unit,
      minStock: Math.max(0, parseFloat(formData.minStock) || 0),
      lastUpdated: new Date().toISOString()
    };

    if (db && user) {
      const itemsRef = collection(db, 'artifacts', appId, 'public', 'data', 'pantry_items');
      if (editingItem) {
        await updateDoc(doc(itemsRef, editingItem.id), payload);
      } else {
        await addDoc(itemsRef, { ...payload, createdAt: new Date().toISOString() });
      }
    } else {
      // Local Fallback
      if (editingItem) {
        setItems(prev => prev.map(i => i.id === editingItem.id ? { ...i, ...payload } : i));
      } else {
        setItems(prev => [...prev, { id: Date.now().toString(), ...payload }]);
      }
    }

    setIsModalOpen(false);
  };

  const handleDeleteItem = async (id) => {
    if (db && user) {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'pantry_items', id));
    } else {
      setItems(prev => prev.filter(i => i.id !== id));
    }
  };

  const handleQuickAdjust = async (item, delta) => {
    const current = Number(item.stock) || 0;
    const newStock = Math.max(0, Number((current + delta).toFixed(2)));
    const diff = Number((newStock - current).toFixed(2));
    
    if (diff === 0) return;

    const payload = {
      stock: newStock,
      lastUpdated: new Date().toISOString()
    };

    // Update Item
    if (db && user) {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'pantry_items', item.id), payload);
      // Log entry
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'pantry_logs'), {
        itemId: item.id,
        itemName: item.name,
        type: diff > 0 ? 'restock' : 'consume',
        amount: Math.abs(diff),
        unit: item.unit,
        note: diff > 0 ? 'Gyors feltöltés' : 'Gyors levonás',
        timestamp: new Date().toISOString()
      });
    } else {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, ...payload } : i));
      setLogs(prev => [{
        id: Date.now().toString(),
        itemId: item.id,
        itemName: item.name,
        type: diff > 0 ? 'restock' : 'consume',
        amount: Math.abs(diff),
        unit: item.unit,
        note: diff > 0 ? 'Gyors feltöltés' : 'Gyors levonás',
        timestamp: new Date().toISOString()
      }, ...prev]);
    }
  };

  const handleOpenLogModal = (item, type = 'consume') => {
    setLogItem(item);
    setLogType(type);
    setLogAmount(type === 'consume' ? '1' : '1');
    setLogNote('');
    setIsLogModalOpen(true);
  };

  const handleSaveLog = async (e) => {
    e.preventDefault();
    if (!logItem || !logAmount || parseFloat(logAmount) <= 0) return;

    const amountNum = parseFloat(logAmount);
    const delta = logType === 'consume' ? -amountNum : amountNum;
    const newStock = Math.max(0, Number(((Number(logItem.stock) || 0) + delta).toFixed(2)));

    const itemPayload = {
      stock: newStock,
      lastUpdated: new Date().toISOString()
    };

    const logPayload = {
      itemId: logItem.id,
      itemName: logItem.name,
      type: logType,
      amount: amountNum,
      unit: logItem.unit,
      note: logNote.trim() || (logType === 'consume' ? 'Fogyasztás rögzítve' : 'Feltöltés rögzítve'),
      timestamp: new Date().toISOString()
    };

    if (db && user) {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'pantry_items', logItem.id), itemPayload);
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'pantry_logs'), logPayload);
    } else {
      setItems(prev => prev.map(i => i.id === logItem.id ? { ...i, ...itemPayload } : i));
      setLogs(prev => [{ id: Date.now().toString(), ...logPayload }, ...prev]);
    }

    setIsLogModalOpen(false);
  };

  // Filtered Items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'Összes kategória' || item.category === selectedCategory;
      const status = getItemStatus(item).code;
      const matchesStock = stockFilter === 'all' || 
        (stockFilter === 'low' && status === 'low') || 
        (stockFilter === 'out' && status === 'out') ||
        (stockFilter === 'warning' && (status === 'low' || status === 'out'));
      return matchesSearch && matchesCategory && matchesStock;
    });
  }, [items, searchTerm, selectedCategory, stockFilter]);

  // Shopping List Items (low or out of stock)
  const shoppingListItems = useMemo(() => {
    return items.filter(i => {
      const status = getItemStatus(i).code;
      return status === 'low' || status === 'out';
    });
  }, [items]);

  // Stats & Analytics Calculation
  const statsData = useMemo(() => {
    // Group consumption logs per item
    const consumptionByItem = {};
    const daysWindow = 30; // Evaluate last 30 days
    const now = new Date();
    const cutoffDate = new Date(now.valueOf() - daysWindow * 24 * 60 * 60 * 1000);

    logs.forEach(log => {
      if (log.type === 'consume' && new Date(log.timestamp) >= cutoffDate) {
        if (!consumptionByItem[log.itemId]) {
          consumptionByItem[log.itemId] = { totalAmount: 0, count: 0, name: log.itemName };
        }
        consumptionByItem[log.itemId].totalAmount += log.amount;
        consumptionByItem[log.itemId].count += 1;
      }
    });

    const itemAnalysis = items.map(item => {
      const logData = consumptionByItem[item.id] || { totalAmount: 0, count: 0 };
      const dailyAvg = logData.totalAmount / daysWindow; // average per day over 30 days
      const weeklyAvg = dailyAvg * 7;
      
      const daysRemaining = dailyAvg > 0 ? Math.round(item.stock / dailyAvg) : null;
      
      // Recommended min stock: covers 7 days of average usage plus buffer
      const recommendedMin = dailyAvg > 0 ? Math.max(1, Math.ceil(dailyAvg * 7)) : item.minStock;

      return {
        id: item.id,
        name: item.name,
        category: item.category,
        currentStock: item.stock,
        unit: item.unit,
        currentMin: item.minStock,
        total30Days: logData.totalAmount,
        dailyAvg: Number(dailyAvg.toFixed(2)),
        weeklyAvg: Number(weeklyAvg.toFixed(2)),
        daysRemaining: daysRemaining,
        recommendedMin: recommendedMin
      };
    });

    // Summary KPI metrics
    const totalItems = items.length;
    const outOfStockCount = items.filter(i => getItemStatus(i).code === 'out').length;
    const lowStockCount = items.filter(i => getItemStatus(i).code === 'low').length;
    const okStockCount = items.filter(i => getItemStatus(i).code === 'ok').length;

    // Top consumed items chart data
    const topConsumedChart = itemAnalysis
      .filter(i => i.total30Days > 0)
      .sort((a, b) => b.total30Days - a.total30Days)
      .slice(0, 6)
      .map(i => ({
        name: i.name.length > 12 ? i.name.substring(0, 10) + '...' : i.name,
        mennyiseg: i.total30Days,
        unit: i.unit
      }));

    return {
      totalItems,
      outOfStockCount,
      lowStockCount,
      okStockCount,
      itemAnalysis,
      topConsumedChart
    };
  }, [items, logs]);

  return (
    <div className="min-h-screen bg-amber-50/50 text-stone-800 flex flex-col font-sans">
      {/* Top Header */}
      <header className="bg-stone-900 text-stone-100 shadow-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500 text-stone-950 rounded-xl shadow-lg shadow-amber-500/20 font-bold">
              <CookingPot className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-amber-400 flex items-center gap-2">
                Online Spájz
                <span className="text-xs bg-stone-800 text-stone-300 font-normal px-2 py-0.5 rounded-full border border-stone-700">
                  Családi Készlet
                </span>
              </h1>
              <p className="text-xs text-stone-400">Konyhai raktárkészlet & Okos fogyáskövetés</p>
            </div>
          </div>

          {/* Quick Stats Pill Header */}
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 bg-stone-800 px-3 py-1.5 rounded-lg border border-stone-700/60">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span className="text-stone-300">Rendben: {statsData.okStockCount}</span>
            </div>
            {statsData.lowStockCount > 0 && (
              <div className="flex items-center gap-1.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 px-3 py-1.5 rounded-lg">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>Kevés: {statsData.lowStockCount}</span>
              </div>
            )}
            {statsData.outOfStockCount > 0 && (
              <div className="flex items-center gap-1.5 bg-red-500/20 text-red-300 border border-red-500/30 px-3 py-1.5 rounded-lg animate-pulse">
                <span className="w-2 h-2 rounded-full bg-red-400"></span>
                <span>Elfogyott: {statsData.outOfStockCount}</span>
              </div>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-stone-800 flex overflow-x-auto">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'inventory'
                ? 'border-amber-400 text-amber-400 bg-stone-800/50'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Package className="w-4 h-4" />
            Raktárkészlet ({items.length})
          </button>

          <button
            onClick={() => setActiveTab('shopping')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors relative ${
              activeTab === 'shopping'
                ? 'border-amber-400 text-amber-400 bg-stone-800/50'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            Bevásárlólista
            {shoppingListItems.length > 0 && (
              <span className="ml-1 bg-amber-500 text-stone-950 text-xs px-2 py-0.2 rounded-full font-bold">
                {shoppingListItems.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('log')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'log'
                ? 'border-amber-400 text-amber-400 bg-stone-800/50'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Fogyási Napló
          </button>

          <button
            onClick={() => setActiveTab('stats')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'stats'
                ? 'border-amber-400 text-amber-400 bg-stone-800/50'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <BarChart2 className="w-4 h-4" />
            Statisztika & Optimális Készlet
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-stone-500">
            <RefreshCw className="w-8 h-8 animate-spin mb-3 text-amber-600" />
            <p>Spájz adatainak betöltése...</p>
          </div>
        ) : (
          <>
            {/* TAB 1: INVENTORY */}
            {activeTab === 'inventory' && (
              <div className="space-y-5">
                {/* Search & Control Bar */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-stone-200/80 flex flex-col md:flex-row gap-3 items-center justify-between">
                  {/* Search input */}
                  <div className="relative w-full md:w-72">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      type="text"
                      placeholder="Tétel keresése..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-stone-50 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:bg-white transition-all"
                    />
                  </div>

                  {/* Filters */}
                  <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                    {/* Category Selector */}
                    <div className="relative flex-1 sm:flex-initial">
                      <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="w-full sm:w-auto px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 font-medium"
                      >
                        {CATEGORIES.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    {/* Stock status filter */}
                    <div className="flex bg-stone-100 p-1 rounded-xl border border-stone-200/60 text-xs font-medium">
                      <button
                        onClick={() => setStockFilter('all')}
                        className={`px-3 py-1 rounded-lg transition-all ${
                          stockFilter === 'all' ? 'bg-white shadow text-stone-900 font-semibold' : 'text-stone-600'
                        }`}
                      >
                        Mind ({items.length})
                      </button>
                      <button
                        onClick={() => setStockFilter('warning')}
                        className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1 ${
                          stockFilter === 'warning' ? 'bg-white shadow text-amber-700 font-semibold' : 'text-stone-600'
                        }`}
                      >
                        <AlertTriangle className="w-3 h-3 text-amber-500" />
                        Figyelmeztetés ({statsData.lowStockCount + statsData.outOfStockCount})
                      </button>
                    </div>

                    {/* Add Button */}
                    <button
                      onClick={() => handleOpenModal()}
                      className="flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 active:scale-95 text-stone-950 font-semibold px-4 py-2 rounded-xl shadow-md shadow-amber-500/20 transition-all text-sm ml-auto md:ml-0"
                    >
                      <Plus className="w-4 h-4" />
                      Új tétel
                    </button>
                  </div>
                </div>

                {/* Items Grid */}
                {filteredItems.length === 0 ? (
                  <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-stone-300">
                    <Package className="w-12 h-12 mx-auto text-stone-300 mb-3" />
                    <h3 className="font-semibold text-stone-700 mb-1">Nincs találat</h3>
                    <p className="text-stone-500 text-sm mb-4">Próbáld meg megváltoztatni a keresést vagy a szűrőket.</p>
                    <button
                      onClick={() => { setSearchTerm(''); setSelectedCategory('Összes kategória'); setStockFilter('all'); }}
                      className="text-amber-600 font-medium text-sm hover:underline"
                    >
                      Szűrők törlése
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredItems.map(item => {
                      const status = getItemStatus(item);
                      return (
                        <div
                          key={item.id}
                          className="bg-white rounded-2xl p-4 shadow-sm border border-stone-200/80 hover:shadow-md transition-all flex flex-col justify-between group"
                        >
                          <div>
                            {/* Card Header */}
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div>
                                <span className="inline-block text-[11px] font-medium text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md mb-1">
                                  {item.category || 'Élelmiszer'}
                                </span>
                                <h3 className="font-bold text-stone-800 text-base leading-snug group-hover:text-amber-600 transition-colors">
                                  {item.name}
                                </h3>
                              </div>

                              {/* Status Badge */}
                              <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border whitespace-nowrap flex items-center gap-1 ${status.color}`}>
                                {status.code === 'out' && <AlertTriangle className="w-3 h-3" />}
                                {status.code === 'low' && <AlertTriangle className="w-3 h-3" />}
                                {status.code === 'ok' && <CheckCircle className="w-3 h-3" />}
                                {status.label}
                              </span>
                            </div>

                            {/* Stock Display */}
                            <div className="my-4 bg-stone-50 rounded-xl p-3 border border-stone-100 flex items-baseline justify-between">
                              <div className="text-xs text-stone-500">Jelenlegi készlet:</div>
                              <div className="flex items-baseline gap-1">
                                <span className={`text-2xl font-black ${
                                  status.code === 'out' ? 'text-red-600' : status.code === 'low' ? 'text-amber-600' : 'text-stone-800'
                                }`}>
                                  {item.stock}
                                </span>
                                <span className="text-stone-600 font-medium text-sm">{item.unit}</span>
                              </div>
                            </div>

                            <div className="text-xs text-stone-400 flex items-center justify-between px-1 mb-4">
                              <span>Minimális készlet: <strong>{item.minStock} {item.unit}</strong></span>
                            </div>
                          </div>

                          {/* Actions Bar */}
                          <div className="pt-3 border-t border-stone-100 space-y-2">
                            {/* Quick + / - Adjuster */}
                            <div className="flex items-center justify-between gap-2 bg-stone-100 p-1 rounded-xl">
                              <button
                                onClick={() => handleQuickAdjust(item, -1)}
                                className="p-1.5 bg-white hover:bg-stone-200 active:scale-95 text-stone-700 rounded-lg shadow-sm border border-stone-200 transition-all flex-1 flex justify-center items-center font-bold text-xs"
                                title="Levonás -1"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => handleOpenLogModal(item, 'consume')}
                                className="px-2 py-1 text-xs font-semibold text-stone-700 hover:text-amber-600 transition-colors"
                              >
                                Egyedi...
                              </button>

                              <button
                                onClick={() => handleQuickAdjust(item, 1)}
                                className="p-1.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-stone-950 rounded-lg shadow-sm font-bold text-xs transition-all flex-1 flex justify-center items-center"
                                title="Feltöltés +1"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Card Footer Tools */}
                            <div className="flex items-center justify-between text-stone-400 px-1 text-xs">
                              <button
                                onClick={() => handleOpenLogModal(item, 'restock')}
                                className="hover:text-emerald-600 text-[11px] font-medium flex items-center gap-1 transition-colors"
                              >
                                <Plus className="w-3 h-3 text-emerald-500" /> Feltöltés
                              </button>

                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleOpenModal(item)}
                                  className="p-1 hover:text-stone-700 transition-colors"
                                  title="Szerkesztés"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteItem(item.id)}
                                  className="p-1 hover:text-red-500 transition-colors"
                                  title="Törlés"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: SHOPPING LIST */}
            {activeTab === 'shopping' && (
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-stone-900 to-stone-800 text-white rounded-2xl p-6 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-amber-400 flex items-center gap-2">
                      <ShoppingCart className="w-6 h-6" />
                      Automatikus Bevásárlólista
                    </h2>
                    <p className="text-stone-300 text-sm mt-1">
                      Ezekből a tételekből a jelenlegi készlet elérte vagy átlépte a beállított minimális szintet.
                    </p>
                  </div>
                  <div className="bg-stone-800/80 px-4 py-2.5 rounded-xl border border-stone-700 text-sm flex items-center gap-2">
                    <span className="text-amber-400 font-bold text-lg">{shoppingListItems.length}</span>
                    <span className="text-stone-300">beszerzendő tétel</span>
                  </div>
                </div>

                {shoppingListItems.length === 0 ? (
                  <div className="bg-white rounded-2xl p-12 text-center border border-stone-200">
                    <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-3" />
                    <h3 className="text-lg font-bold text-stone-800">Minden rendben a spájzban!</h3>
                    <p className="text-stone-500 text-sm mt-1">Egyetlen tételből sincs hiány a beállított minimumok alapján.</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
                    <div className="divide-y divide-stone-100">
                      {shoppingListItems.map(item => {
                        const status = getItemStatus(item);
                        const neededAmount = Math.max(1, Number((item.minStock * 2 - item.stock).toFixed(1)));
                        return (
                          <div key={item.id} className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-stone-50/80 transition-colors">
                            <div className="flex items-start gap-3">
                              <div className={`p-2.5 rounded-xl mt-0.5 ${
                                status.code === 'out' ? 'bg-red-500/10 text-red-600' : 'bg-amber-500/10 text-amber-600'
                              }`}>
                                <AlertTriangle className="w-5 h-5" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="font-bold text-stone-900 text-base">{item.name}</h4>
                                  <span className="text-xs text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md">
                                    {item.category}
                                  </span>
                                </div>
                                <div className="text-xs text-stone-500 mt-1 flex flex-wrap gap-x-4 gap-y-1">
                                  <span>Jelenleg: <strong className={status.code === 'out' ? 'text-red-600' : 'text-amber-600'}>{item.stock} {item.unit}</strong></span>
                                  <span>Minimum elvárás: <strong>{item.minStock} {item.unit}</strong></span>
                                  <span className="text-stone-700 font-medium bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded">
                                    Ajánlott vétel: ~{neededAmount} {item.unit}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Restock action */}
                            <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-100">
                              <button
                                onClick={() => handleOpenLogModal(item, 'restock')}
                                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4 py-2 rounded-xl text-xs shadow transition-all active:scale-95"
                              >
                                <Plus className="w-4 h-4" />
                                Vettem / Feltöltés
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: TRANSACTION LOG */}
            {activeTab === 'log' && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-stone-900">Spájz Mozgási Napló</h2>
                    <p className="text-xs text-stone-500">A rögzített fogyasztások és feltöltések időrendben</p>
                  </div>
                </div>

                {logs.length === 0 ? (
                  <div className="bg-white rounded-2xl p-12 text-center border border-stone-200">
                    <Calendar className="w-12 h-12 text-stone-300 mx-auto mb-2" />
                    <p className="text-stone-500 text-sm">Még nincs rögzített tranzakció a naplóban.</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
                    <div className="divide-y divide-stone-100">
                      {logs.map(log => {
                        const isConsume = log.type === 'consume';
                        return (
                          <div key={log.id} className="p-4 flex items-center justify-between gap-3 hover:bg-stone-50/60 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className={`p-2.5 rounded-xl ${
                                isConsume ? 'bg-amber-500/10 text-amber-600' : 'bg-emerald-500/10 text-emerald-600'
                              }`}>
                                {isConsume ? <ArrowDownRight className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                              </div>
                              <div>
                                <h4 className="font-semibold text-stone-900 text-sm">{log.itemName}</h4>
                                <div className="text-xs text-stone-400 flex items-center gap-2 mt-0.5">
                                  <span>{new Date(log.timestamp).toLocaleString('hu-HU', { dateStyle: 'short', timeStyle: 'short' })}</span>
                                  <span>•</span>
                                  <span className="italic">{log.note || (isConsume ? 'Fogyasztás' : 'Feltöltés')}</span>
                                </div>
                              </div>
                            </div>

                            <div className={`font-bold text-sm ${isConsume ? 'text-amber-700' : 'text-emerald-700'}`}>
                              {isConsume ? '-' : '+'}{log.amount} {log.unit}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: STATISTICS & OPTIMAL STOCK */}
            {activeTab === 'stats' && (
              <div className="space-y-6">
                {/* Stats Header Banner */}
                <div className="bg-stone-900 text-stone-100 p-6 rounded-2xl shadow-sm flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
                  <div>
                    <h2 className="text-xl font-bold text-amber-400 flex items-center gap-2">
                      <Sparkles className="w-5 h-5" />
                      Fogyási Statisztika & Optimális Minimumok
                    </h2>
                    <p className="text-stone-300 text-sm mt-1 max-w-2xl">
                      A rögzített fogyási adatok alapján kiszámítottuk a várható elfogyási időket és a heti átlagos szükségletet.
                    </p>
                  </div>
                </div>

                {/* Top Consumed Items Chart */}
                {statsData.topConsumedChart.length > 0 && (
                  <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
                    <h3 className="font-bold text-stone-800 text-base mb-4 flex items-center gap-2">
                      <BarChart2 className="w-4 h-4 text-amber-600" />
                      Legnagyobb fogyás az utóbbi 30 napban
                    </h3>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={statsData.topConsumedChart} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7e5e4" />
                          <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#78716c' }} />
                          <YAxis tick={{ fontSize: 12, fill: '#78716c' }} />
                          <Tooltip 
                            formatter={(value, name, props) => [`${value} ${props.payload.unit}`, 'Összes fogyás']}
                            contentStyle={{ backgroundColor: '#1c1917', color: '#fff', borderRadius: '12px', border: 'none' }}
                          />
                          <Bar dataKey="mennyiseg" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Detailed Analysis Table */}
                <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
                  <div className="p-4 border-b border-stone-100 bg-stone-50/50 flex items-center justify-between">
                    <h3 className="font-bold text-stone-800 text-sm">Tételek fogyási elemzése & Ajánlott készlet</h3>
                    <span className="text-xs text-stone-500">Utolsó 30 nap mérései alapján</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs sm:text-sm text-stone-700">
                      <thead className="bg-stone-100 text-stone-600 font-semibold uppercase text-[11px] tracking-wider">
                        <tr>
                          <th className="py-3 px-4">Tétel</th>
                          <th className="py-3 px-4">Jelenlegi készlet</th>
                          <th className="py-3 px-4">Napi átlag fogyás</th>
                          <th className="py-3 px-4">Heti átlag fogyás</th>
                          <th className="py-3 px-4">Becsült hátramaradt idő</th>
                          <th className="py-3 px-4">Beállított min.</th>
                          <th className="py-3 px-4 text-emerald-700 font-bold">Ajánlott min. készlet</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {statsData.itemAnalysis.map(row => (
                          <tr key={row.id} className="hover:bg-stone-50 transition-colors">
                            <td className="py-3.5 px-4 font-semibold text-stone-900">
                              {row.name}
                              <span className="block text-[11px] font-normal text-stone-400">{row.category}</span>
                            </td>
                            <td className="py-3.5 px-4 font-bold text-stone-800">
                              {row.currentStock} {row.unit}
                            </td>
                            <td className="py-3.5 px-4 text-stone-600">
                              {row.dailyAvg > 0 ? `${row.dailyAvg} ${row.unit}/nap` : '-'}
                            </td>
                            <td className="py-3.5 px-4 text-stone-600">
                              {row.weeklyAvg > 0 ? `${row.weeklyAvg} ${row.unit}/hét` : '-'}
                            </td>
                            <td className="py-3.5 px-4">
                              {row.daysRemaining !== null ? (
                                <span className={`px-2 py-0.5 rounded font-medium text-xs ${
                                  row.daysRemaining <= 3 
                                    ? 'bg-red-100 text-red-700' 
                                    : row.daysRemaining <= 7 
                                    ? 'bg-amber-100 text-amber-800' 
                                    : 'bg-stone-100 text-stone-700'
                                }`}>
                                  ~{row.daysRemaining} nap
                                </span>
                              ) : (
                                <span className="text-stone-400 text-xs">Nincs adat</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 font-medium text-stone-500">
                              {row.currentMin} {row.unit}
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                                  {row.recommendedMin} {row.unit}
                                </span>
                                {row.recommendedMin !== row.currentMin && (
                                  <button
                                    onClick={() => {
                                      const updated = { ...items.find(i => i.id === row.id), minStock: row.recommendedMin };
                                      handleOpenModal(updated);
                                    }}
                                    className="text-[11px] text-amber-600 hover:underline font-medium"
                                  >
                                    Beállítás
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* MODAL: ADD / EDIT ITEM */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl border border-stone-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-stone-900 px-6 py-4 text-white flex items-center justify-between">
              <h3 className="font-bold text-base text-amber-400">
                {editingItem ? 'Tétel szerkesztése' : 'Új tétel hozzáadása'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-white font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Tétel neve *</label>
                <input
                  type="text"
                  required
                  placeholder="pl. Riasz, Tej, Kristálycukor"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-sm focus:ring-2 focus:ring-amber-500/40 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Kategória</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-sm focus:ring-2 focus:ring-amber-500/40 focus:outline-none bg-white"
                >
                  {CATEGORIES.filter(c => c !== 'Összes kategória').map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Jelenlegi mennyiség</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-sm focus:ring-2 focus:ring-amber-500/40 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Mértékegység</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-sm focus:ring-2 focus:ring-amber-500/40 focus:outline-none bg-white"
                  >
                    {UNITS.map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Minimális készlet korlát (Figyelmeztetéshez)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={formData.minStock}
                  onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-sm focus:ring-2 focus:ring-amber-500/40 focus:outline-none"
                />
                <p className="text-[11px] text-stone-400 mt-1">
                  Ha a készlet ez alá csökken, a tétel automatikusan bekerül a bevásárlólistába.
                </p>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 rounded-xl"
                >
                  Mégse
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-stone-950 rounded-xl shadow-md active:scale-95 transition-all"
                >
                  Mentés
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CUSTOM LOG ENTRY (CONSUME / RESTOCK) */}
      {isLogModalOpen && logItem && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl border border-stone-200 max-w-md w-full overflow-hidden">
            <div className="bg-stone-900 px-6 py-4 text-white flex items-center justify-between">
              <h3 className="font-bold text-base text-amber-400 flex items-center gap-2">
                {logType === 'consume' ? 'Fogyasztás rögzítése' : 'Készlet feltöltése'}
              </h3>
              <button 
                onClick={() => setIsLogModalOpen(false)}
                className="text-stone-400 hover:text-white font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveLog} className="p-6 space-y-4">
              <div className="bg-stone-50 p-3 rounded-xl border border-stone-100 flex items-center justify-between">
                <span className="font-bold text-stone-800">{logItem.name}</span>
                <span className="text-xs text-stone-500">Jelenleg: {logItem.stock} {logItem.unit}</span>
              </div>

              {/* Type Switcher */}
              <div className="grid grid-cols-2 gap-2 bg-stone-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setLogType('consume')}
                  className={`py-2 text-xs font-bold rounded-lg transition-all ${
                    logType === 'consume' ? 'bg-amber-500 text-stone-950 shadow-sm' : 'text-stone-600'
                  }`}
                >
                  - Fogyasztás (Levonás)
                </button>
                <button
                  type="button"
                  onClick={() => setLogType('restock')}
                  className={`py-2 text-xs font-bold rounded-lg transition-all ${
                    logType === 'restock' ? 'bg-emerald-600 text-white shadow-sm' : 'text-stone-600'
                  }`}
                >
                  + Feltöltés (Vásárlás)
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Mennyiség ({logItem.unit})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={logAmount}
                  onChange={(e) => setLogAmount(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-sm focus:ring-2 focus:ring-amber-500/40 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Megjegyzés (Opcionális)</label>
                <input
                  type="text"
                  placeholder={logType === 'consume' ? 'pl. Vasárnapi sütihez' : 'pl. Spar heti bevásárlás'}
                  value={logNote}
                  onChange={(e) => setLogNote(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-sm focus:ring-2 focus:ring-amber-500/40 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsLogModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 rounded-xl"
                >
                  Mégse
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 ${
                    logType === 'consume' ? 'bg-amber-500 text-stone-950 hover:bg-amber-600' : 'bg-emerald-600 text-white hover:bg-emerald-700'
                  }`}
                >
                  Rögzítés
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}