/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, Component } from 'react';
import { 
  LayoutDashboard, 
  BarChart3,
  Package, 
  ArrowLeftRight, 
  ChevronDown,
  ChevronRight,
  XCircle,
  CheckCircle2,
  AlertTriangle,
  Wallet
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth } from './firebase';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  setPersistence,
  browserSessionPersistence
} from 'firebase/auth';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  updateDoc,
  doc, 
  query, 
  orderBy,
  getDoc,
  runTransaction,
  Timestamp,
  type DocumentData
} from 'firebase/firestore';
import { Product, ProductRiskMetrics, Transaction, User, View, Toast, Expense, WeeklySalesComparison, DashboardMetrics } from './types';
import { LoginView, HomeView, DashboardView, InventoryOverviewView, StockView, ProductsView, ExpensesView } from './components/Views';
import { formatDateTimeLabel, getRangeByMonth, getRangeByPeriod, isWithinRange, timestampToDate } from './lib/timeWindow';


// --- Error Handling ---

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  return errInfo;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = "发生了一些错误。";
      try {
        const parsed = JSON.parse(this.state.error?.message || "{}");
        if (parsed.error) {
          errorMessage = `数据库错误: ${parsed.error} (${parsed.operationType} at ${parsed.path})`;
        }
      } catch (e) {
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="ios-shell min-h-screen flex items-center justify-center p-4">
          <div className="glass p-8 rounded-3xl border border-white/60 max-w-md w-full text-center">
            <XCircle className="text-rose-500 mx-auto mb-4" size={48} />
            <h2 className="text-xl font-black text-slate-900 mb-2">出错了</h2>
            <p className="text-slate-600 mb-6">{errorMessage}</p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-3 rounded-xl font-bold ios-primary hover:brightness-105 transition-all"
            >
              刷新页面
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- Helper Functions ---

const formatStock = (total: number, spec: number) => {
  if (spec <= 1) return `${total} 个`;
  const boxes = Math.floor(total / spec);
  const rem = total % spec;
  if (boxes === 0) return `${total} 个`;
  return `${boxes} 箱${rem > 0 ? ` + ${rem} 个` : ''}`;
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('zh-CN').format(amount) + ' XOF';
};

const toLocalDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};
const getTogoDate = () => toLocalDateInputValue(new Date());
const getTogoMonth = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  return `${year}-${month}`;
};
const getPreviousMonth = (monthValue: string) => {
  const [year, month] = monthValue.split('-');
  const base = new Date(Number.parseInt(year, 10), Number.parseInt(month, 10) - 1, 1);
  base.setMonth(base.getMonth() - 1);
  const prevYear = base.getFullYear();
  const prevMonth = `${base.getMonth() + 1}`.padStart(2, '0');
  return `${prevYear}-${prevMonth}`;
};
const getTogoWeek = () => {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
};

const IN_TOTAL_BASELINE_VALUE = 193154500;
const IN_TOTAL_BASELINE_DATE = new Date(2026, 3, 23, 0, 0, 0, 0);

function coerceTimestamp(primary: unknown, legacyDate: unknown): Timestamp {
  if (primary instanceof Timestamp) return primary;
  if (legacyDate instanceof Timestamp) return legacyDate;
  if (typeof primary === 'string') {
    const parsed = new Date(primary.replace(' ', 'T'));
    if (!Number.isNaN(parsed.getTime())) return Timestamp.fromDate(parsed);
  }
  if (typeof legacyDate === 'string') {
    const parsed = new Date(legacyDate.replace(' ', 'T'));
    if (!Number.isNaN(parsed.getTime())) return Timestamp.fromDate(parsed);
  }
  return Timestamp.fromDate(new Date(0));
}

function mapTransactionDoc(id: string, data: DocumentData): Transaction {
  return {
    id,
    productId: String(data.productId ?? ''),
    type: data.type === 'in' ? 'in' : 'out',
    quantity: Number(data.quantity ?? 0),
    unitPrice: Number(data.unitPrice ?? data.price ?? 0),
    occurredAt: coerceTimestamp(data.occurredAt, data.date),
    operatorUid: String(data.operatorUid ?? 'legacy'),
    remark: String(data.remark ?? '')
  };
}

function mapExpenseDoc(id: string, data: DocumentData): Expense {
  return {
    id,
    occurredAt: coerceTimestamp(data.occurredAt, data.date),
    operatorUid: String(data.operatorUid ?? 'legacy'),
    amount: Number(data.amount ?? 0),
    category: String(data.category ?? ''),
    remark: String(data.remark ?? '')
  };
}

function coerceProductCreatedAt(value: unknown): Timestamp {
  if (value instanceof Timestamp) return value;
  if (typeof value === 'string') {
    const parsed = new Date(value.replace(' ', 'T'));
    if (!Number.isNaN(parsed.getTime())) return Timestamp.fromDate(parsed);
  }
  return Timestamp.fromDate(new Date(0));
}

function mapProductDoc(id: string, data: DocumentData): Product {
  return {
    id,
    name: String(data.name ?? ''),
    spec: Number(data.spec ?? 0),
    price: Number(data.price ?? 0),
    stock: Number(data.stock ?? 0),
    isActive: data.isActive !== false,
    createdAt: coerceProductCreatedAt(data.createdAt)
  };
}

function sortProductsByCreatedAtDesc(items: Product[]): Product[] {
  return [...items].sort((a, b) => {
    const millisDiff = (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0);
    if (millisDiff !== 0) return millisDiff;
    return a.name.localeCompare(b.name);
  });
}

function timestampFromDateInput(dateValue: string): Timestamp {
  const safe = new Date(`${dateValue}T00:00:00`);
  return Timestamp.fromDate(safe);
}

export default function App() {
  // --- State ---
  const [user, setUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [currentView, setCurrentView] = useState<View>('home');
  const [isInventoryMenuOpen, setIsInventoryMenuOpen] = useState(false);
  const [inventoryComparisonMode, setInventoryComparisonMode] = useState<'week' | 'month'>('week');
  const [reportPeriod, setReportPeriod] = useState<'day' | 'week' | 'month'>('day');
  
  const [selectedDate, setSelectedDate] = useState(getTogoDate());
  const [selectedWeek, setSelectedWeek] = useState(getTogoWeek()); 
  const [selectedMonth, setSelectedMonth] = useState(getTogoMonth());
  
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteExpenseId, setConfirmDeleteExpenseId] = useState<string | null>(null);

  // --- StockView State (Persistent) ---
  const [stockType, setStockType] = useState<'in' | 'out'>('in');
  const [selectedStockId, setSelectedStockId] = useState('');
  const [stockSearchTerm, setStockSearchTerm] = useState('');
  const [showStockDropdown, setShowStockDropdown] = useState(false);
  const [stockBoxes, setStockBoxes] = useState('');
  const [stockItems, setStockItems] = useState('');
  const [stockRemark, setStockRemark] = useState('');

  // --- ProductsView State (Persistent) ---
  const [newProductName, setNewProductName] = useState('');
  const [newProductSpec, setNewProductSpec] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [batchText, setBatchText] = useState('');

  // --- Editing Transaction State ---
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // --- Firebase Auth & Persistence ---
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    // Set persistence to session-based (requires re-login after closing browser)
    setPersistence(auth, browserSessionPersistence)
      .then(() => {
        unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          if (!firebaseUser) {
            setUser(null);
            setProducts([]);
            setTransactions([]);
            setExpenses([]);
            setLoading(false);
            return;
          }

          try {
            const email = (firebaseUser.email ?? '').toLowerCase();
            const adminEmails = new Set(['admin@topstar.com', 'mingdongdai@gmail.com']);
            let role: User['role'] = adminEmails.has(email) ? 'admin' : 'staff';

            try {
              const profileSnap = await getDoc(doc(db, 'users', firebaseUser.uid));
              if (profileSnap.exists()) {
                const profileRole = profileSnap.data().role;
                if (profileRole === 'admin' || profileRole === 'staff') {
                  role = profileRole;
                }
              }
            } catch (profileError) {
              handleFirestoreError(profileError, OperationType.GET, `users/${firebaseUser.uid}`);
            }

            setUser({
              uid: firebaseUser.uid,
              username: firebaseUser.email?.split('@')[0] || firebaseUser.uid,
              role
            });
          } catch (error) {
            handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
          } finally {
            setLoading(false);
          }
        });
      })
      .catch((error) => {
        console.error("Auth persistence error:", error);
        setLoading(false);
      });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // --- Firebase Data Sync ---
  useEffect(() => {
    // 确保不仅 user 状态存在，Firebase 底层 auth 对象也已识别到当前用户
    if (!user || !auth.currentUser) return;

    // Sync Products
    const qProducts = query(collection(db, 'products'));
    const unsubscribeProducts = onSnapshot(qProducts, 
      (snapshot) => {
        const productsData: Product[] = [];
        snapshot.forEach((itemDoc) => {
          productsData.push(mapProductDoc(itemDoc.id, itemDoc.data()));
        });
        setProducts(sortProductsByCreatedAtDesc(productsData));
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'products');
      }
    );

    // Sync Transactions (new schema + legacy schema merge)
    let txModern: Transaction[] = [];
    let txLegacy: Transaction[] = [];
    const syncMergedTransactions = () => {
      const map = new Map<string, Transaction>();
      for (const item of txLegacy) map.set(item.id, item);
      for (const item of txModern) map.set(item.id, item);
      const merged = [...map.values()].sort(
        (a, b) => b.occurredAt.toMillis() - a.occurredAt.toMillis()
      );
      setTransactions(merged);
    };

    const qTransactionsModern = query(collection(db, 'transactions'), orderBy('occurredAt', 'desc'));
    const unsubscribeTransactionsModern = onSnapshot(qTransactionsModern, 
      (snapshot) => {
        txModern = snapshot.docs.map((itemDoc) => mapTransactionDoc(itemDoc.id, itemDoc.data()));
        syncMergedTransactions();
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'transactions/modern');
      }
    );
    const qTransactionsLegacy = query(collection(db, 'transactions'), orderBy('date', 'desc'));
    const unsubscribeTransactionsLegacy = onSnapshot(qTransactionsLegacy, 
      (snapshot) => {
        txLegacy = snapshot.docs.map((itemDoc) => mapTransactionDoc(itemDoc.id, itemDoc.data()));
        syncMergedTransactions();
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'transactions/legacy');
      }
    );

    // Sync Expenses (new schema + legacy schema merge)
    let expenseModern: Expense[] = [];
    let expenseLegacy: Expense[] = [];
    const syncMergedExpenses = () => {
      const map = new Map<string, Expense>();
      for (const item of expenseLegacy) map.set(item.id, item);
      for (const item of expenseModern) map.set(item.id, item);
      const merged = [...map.values()].sort(
        (a, b) => b.occurredAt.toMillis() - a.occurredAt.toMillis()
      );
      setExpenses(merged);
    };

    const qExpensesModern = query(collection(db, 'expenses'), orderBy('occurredAt', 'desc'));
    const unsubscribeExpensesModern = onSnapshot(qExpensesModern,
      (snapshot) => {
        expenseModern = snapshot.docs.map((itemDoc) => mapExpenseDoc(itemDoc.id, itemDoc.data()));
        syncMergedExpenses();
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'expenses/modern');
      }
    );
    const qExpensesLegacy = query(collection(db, 'expenses'), orderBy('date', 'desc'));
    const unsubscribeExpensesLegacy = onSnapshot(qExpensesLegacy,
      (snapshot) => {
        expenseLegacy = snapshot.docs.map((itemDoc) => mapExpenseDoc(itemDoc.id, itemDoc.data()));
        syncMergedExpenses();
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'expenses/legacy');
      }
    );

    return () => {
      unsubscribeProducts();
      unsubscribeTransactionsModern();
      unsubscribeTransactionsLegacy();
      unsubscribeExpensesModern();
      unsubscribeExpensesLegacy();
    };
  }, [user]);

  // --- Toast Logic ---
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  // --- Computed Data ---
  const stats = useMemo(() => {
    const inAfterBaseline = transactions
      .filter(t => t.type === 'in')
      .filter(t => timestampToDate(t.occurredAt) >= IN_TOTAL_BASELINE_DATE)
      .reduce((sum, t) => sum + t.quantity * t.unitPrice, 0);
    const inTotal = IN_TOTAL_BASELINE_VALUE + inAfterBaseline;
    const outTotal = transactions
      .filter(t => t.type === 'out')
      .reduce((sum, t) => sum + t.quantity * t.unitPrice, 0);
    return {
      inTotal,
      outTotal,
      balance: inTotal - outTotal
    };
  }, [transactions]);

  const activeProducts = useMemo(() => {
    return products.filter((product) => product.isActive !== false);
  }, [products]);

  const productRiskMetricsByProduct = useMemo(() => {
    const STOCK_WARNING_BOX_THRESHOLD = 30;
    const DAYS_OF_COVER_WARNING_THRESHOLD = 14;
    const STALE_DAYS_THRESHOLD = 30;
    const LOOKBACK_DAYS = 30;
    const MS_PER_DAY = 1000 * 60 * 60 * 24;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const lookbackStart = new Date(todayStart);
    lookbackStart.setDate(lookbackStart.getDate() - LOOKBACK_DAYS);

    const recentOutQtyByProduct: Record<string, number> = {};
    const lastSaleByProduct: Record<string, Date | null> = {};

    for (const product of activeProducts) {
      recentOutQtyByProduct[product.id] = 0;
      lastSaleByProduct[product.id] = null;
    }

    for (const transaction of transactions) {
      if (transaction.type !== 'out') continue;
      if (!(transaction.productId in recentOutQtyByProduct)) continue;
      const occurredAt = timestampToDate(transaction.occurredAt);

      if (occurredAt >= lookbackStart) {
        recentOutQtyByProduct[transaction.productId] += transaction.quantity;
      }

      const currentLastSale = lastSaleByProduct[transaction.productId];
      if (!currentLastSale || occurredAt > currentLastSale) {
        lastSaleByProduct[transaction.productId] = occurredAt;
      }
    }

    const metricsMap: Record<string, ProductRiskMetrics> = {};
    for (const product of activeProducts) {
      const spec = product.spec > 0 ? product.spec : 1;
      const stockBoxes = product.stock / spec;
      const outBoxes30d = recentOutQtyByProduct[product.id] / spec;
      const avgDailyBoxes30d = outBoxes30d / LOOKBACK_DAYS;
      const daysOfCover = avgDailyBoxes30d > 0 ? stockBoxes / avgDailyBoxes30d : Number.POSITIVE_INFINITY;
      const lastSaleAt = lastSaleByProduct[product.id];
      const daysSinceLastSale = lastSaleAt
        ? Math.max(
            0,
            Math.floor(
              (todayStart.getTime() - new Date(lastSaleAt.getFullYear(), lastSaleAt.getMonth(), lastSaleAt.getDate()).getTime()) / MS_PER_DAY
            )
          )
        : null;

      const warningReasons: string[] = [];
      if (stockBoxes < STOCK_WARNING_BOX_THRESHOLD) {
        warningReasons.push('库存低于30箱');
      }
      if (daysOfCover < DAYS_OF_COVER_WARNING_THRESHOLD) {
        warningReasons.push('可售天数低于14天');
      }

      metricsMap[product.id] = {
        productId: product.id,
        stockBoxes,
        avgDailyBoxes30d,
        daysOfCover,
        lastSaleAt,
        daysSinceLastSale,
        isWarning: warningReasons.length > 0,
        isStale: stockBoxes > 0 && (daysSinceLastSale === null || daysSinceLastSale >= STALE_DAYS_THRESHOLD),
        warningReasons
      };
    }

    return metricsMap;
  }, [activeProducts, transactions]);

  const warnings = useMemo(() => {
    return activeProducts.filter((product) => productRiskMetricsByProduct[product.id]?.isWarning);
  }, [activeProducts, productRiskMetricsByProduct]);

  const staleProducts = useMemo(() => {
    return activeProducts.filter((product) => productRiskMetricsByProduct[product.id]?.isStale);
  }, [activeProducts, productRiskMetricsByProduct]);

  const isInventoryView = (
    currentView === 'inventory-warnings' ||
    currentView === 'inventory-stale' ||
    currentView === 'inventory-stock' ||
    currentView === 'inventory-comparison'
  );

  const handleViewChange = (nextView: View) => {
    setCurrentView(nextView);
    const nextIsInventoryView = (
      nextView === 'inventory-warnings' ||
      nextView === 'inventory-stale' ||
      nextView === 'inventory-stock' ||
      nextView === 'inventory-comparison'
    );
    setIsInventoryMenuOpen(nextIsInventoryView);
  };

  const weeklySalesComparisons = useMemo<WeeklySalesComparison[]>(() => {
    const getWeekStart = (input: Date) => {
      const date = new Date(input.getFullYear(), input.getMonth(), input.getDate());
      const day = date.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      date.setDate(date.getDate() + diff);
      date.setHours(0, 0, 0, 0);
      return date;
    };

    const currentWeekStart = getWeekStart(new Date());
    const nextWeekStart = new Date(currentWeekStart);
    nextWeekStart.setDate(nextWeekStart.getDate() + 7);
    const previousWeekStart = new Date(currentWeekStart);
    previousWeekStart.setDate(previousWeekStart.getDate() - 7);

    const currentWeekOutByProduct: Record<string, number> = {};
    const previousWeekOutByProduct: Record<string, number> = {};

    for (const product of activeProducts) {
      currentWeekOutByProduct[product.id] = 0;
      previousWeekOutByProduct[product.id] = 0;
    }

    for (const transaction of transactions) {
      if (transaction.type !== 'out') continue;
      if (!(transaction.productId in currentWeekOutByProduct)) continue;
      const occurredAt = timestampToDate(transaction.occurredAt);
      if (occurredAt >= currentWeekStart && occurredAt < nextWeekStart) {
        currentWeekOutByProduct[transaction.productId] += transaction.quantity;
      } else if (occurredAt >= previousWeekStart && occurredAt < currentWeekStart) {
        previousWeekOutByProduct[transaction.productId] += transaction.quantity;
      }
    }

    return activeProducts
      .map((product) => {
        const spec = product.spec > 0 ? product.spec : 1;
        const currentWeekBoxes = currentWeekOutByProduct[product.id] / spec;
        const previousWeekBoxes = previousWeekOutByProduct[product.id] / spec;
        const isNewGrowth = previousWeekBoxes === 0 && currentWeekBoxes > 0;
        const changePercent = previousWeekBoxes > 0
          ? ((currentWeekBoxes - previousWeekBoxes) / previousWeekBoxes) * 100
          : null;
        const trend: WeeklySalesComparison['trend'] =
          isNewGrowth
            ? 'new'
            : changePercent === null || changePercent === 0
              ? 'flat'
              : changePercent > 0
                ? 'up'
                : 'down';

        return {
          productId: product.id,
          name: product.name,
          spec: product.spec,
          currentWeekBoxes,
          previousWeekBoxes,
          changePercent,
          trend
        };
      })
      .sort((a, b) => {
        const aScore = a.changePercent ?? (a.trend === 'new' ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY);
        const bScore = b.changePercent ?? (b.trend === 'new' ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY);
        if (aScore !== bScore) return bScore - aScore;
        if (b.currentWeekBoxes !== a.currentWeekBoxes) return b.currentWeekBoxes - a.currentWeekBoxes;
        return a.name.localeCompare(b.name);
      });
  }, [activeProducts, transactions]);

  const monthlySalesComparisons = useMemo<WeeklySalesComparison[]>(() => {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    currentMonthStart.setHours(0, 0, 0, 0);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    nextMonthStart.setHours(0, 0, 0, 0);
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    previousMonthStart.setHours(0, 0, 0, 0);

    const currentMonthOutByProduct: Record<string, number> = {};
    const previousMonthOutByProduct: Record<string, number> = {};

    for (const product of activeProducts) {
      currentMonthOutByProduct[product.id] = 0;
      previousMonthOutByProduct[product.id] = 0;
    }

    for (const transaction of transactions) {
      if (transaction.type !== 'out') continue;
      if (!(transaction.productId in currentMonthOutByProduct)) continue;
      const occurredAt = timestampToDate(transaction.occurredAt);
      if (occurredAt >= currentMonthStart && occurredAt < nextMonthStart) {
        currentMonthOutByProduct[transaction.productId] += transaction.quantity;
      } else if (occurredAt >= previousMonthStart && occurredAt < currentMonthStart) {
        previousMonthOutByProduct[transaction.productId] += transaction.quantity;
      }
    }

    return activeProducts
      .map((product) => {
        const spec = product.spec > 0 ? product.spec : 1;
        const currentWeekBoxes = currentMonthOutByProduct[product.id] / spec;
        const previousWeekBoxes = previousMonthOutByProduct[product.id] / spec;
        const isNewGrowth = previousWeekBoxes === 0 && currentWeekBoxes > 0;
        const changePercent = previousWeekBoxes > 0
          ? ((currentWeekBoxes - previousWeekBoxes) / previousWeekBoxes) * 100
          : null;
        const trend: WeeklySalesComparison['trend'] =
          isNewGrowth
            ? 'new'
            : changePercent === null || changePercent === 0
              ? 'flat'
              : changePercent > 0
                ? 'up'
                : 'down';

        return {
          productId: product.id,
          name: product.name,
          spec: product.spec,
          currentWeekBoxes,
          previousWeekBoxes,
          changePercent,
          trend
        };
      })
      .sort((a, b) => {
        const aScore = a.changePercent ?? (a.trend === 'new' ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY);
        const bScore = b.changePercent ?? (b.trend === 'new' ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY);
        if (aScore !== bScore) return bScore - aScore;
        if (b.currentWeekBoxes !== a.currentWeekBoxes) return b.currentWeekBoxes - a.currentWeekBoxes;
        return a.name.localeCompare(b.name);
      });
  }, [activeProducts, transactions]);

  const currentReportRange = useMemo(() => {
    return getRangeByPeriod(reportPeriod, selectedDate, selectedWeek, selectedMonth);
  }, [reportPeriod, selectedDate, selectedWeek, selectedMonth]);

  const salesReport = useMemo(() => {
    const filtered = transactions.filter(t => {
      if (t.type !== 'out') return false;
      return isWithinRange(t.occurredAt, currentReportRange);
    });

    const reportMap: Record<string, { name: string, quantity: number, amount: number, spec: number }> = {};
    filtered.forEach(t => {
      if (!reportMap[t.productId]) {
        const p = products.find(prod => prod.id === t.productId);
        reportMap[t.productId] = { 
          name: p?.name || '未知商品', 
          quantity: 0, 
          amount: 0,
          spec: p?.spec || 1
        };
      }
      reportMap[t.productId].quantity += t.quantity;
      reportMap[t.productId].amount += t.quantity * t.unitPrice;
    });

    const totalExpenses = expenses
      .filter(e => isWithinRange(e.occurredAt, currentReportRange))
      .reduce((sum, e) => sum + e.amount, 0);

    return {
      items: Object.values(reportMap).sort((a, b) => {
        const aBoxes = a.quantity / (a.spec || 1);
        const bBoxes = b.quantity / (b.spec || 1);
        if (bBoxes !== aBoxes) return bBoxes - aBoxes;
        if (b.amount !== a.amount) return b.amount - a.amount;
        return a.name.localeCompare(b.name);
      }),
      totalAmount: filtered.reduce((sum, t) => sum + t.quantity * t.unitPrice, 0),
      totalQuantity: filtered.reduce((sum, t) => sum + t.quantity, 0),
      totalExpenses
    };
  }, [transactions, products, expenses, currentReportRange]);

  const homeMetrics = useMemo(() => {
    const currentMonthRange = getRangeByMonth(selectedMonth);
    const previousMonth = getPreviousMonth(selectedMonth);
    const previousMonthRange = getRangeByMonth(previousMonth);

    const currentMonthSales = transactions
      .filter((t) => t.type === 'out' && isWithinRange(t.occurredAt, currentMonthRange))
      .reduce((sum, t) => sum + t.quantity * t.unitPrice, 0);

    const previousMonthSales = transactions
      .filter((t) => t.type === 'out' && isWithinRange(t.occurredAt, previousMonthRange))
      .reduce((sum, t) => sum + t.quantity * t.unitPrice, 0);

    const currentMonthExpenses = expenses
      .filter((e) => isWithinRange(e.occurredAt, currentMonthRange))
      .reduce((sum, e) => sum + e.amount, 0);

    const previousMonthExpenses = expenses
      .filter((e) => isWithinRange(e.occurredAt, previousMonthRange))
      .reduce((sum, e) => sum + e.amount, 0);

    const salesMoM = previousMonthSales > 0
      ? ((currentMonthSales - previousMonthSales) / previousMonthSales) * 100
      : null;

    const expenseMoM = previousMonthExpenses > 0
      ? ((currentMonthExpenses - previousMonthExpenses) / previousMonthExpenses) * 100
      : null;

    return {
      selectedMonth,
      previousMonth,
      estimatedCommission: currentMonthSales * 0.035 - currentMonthExpenses,
      warningCount: warnings.length,
      staleCount: staleProducts.length,
      salesMoM,
      expenseMoM
    };
  }, [selectedMonth, transactions, expenses, warnings.length, staleProducts.length]);

  const dashboardMetrics = useMemo<DashboardMetrics>(() => {
    const now = new Date();
    const selectedYear = now.getFullYear();
    const currentMonthIndex = now.getMonth();
    const selectedMonthKey = `${selectedYear}-${`${currentMonthIndex + 1}`.padStart(2, '0')}`;

    const monthlyBuckets = Array.from({ length: currentMonthIndex + 1 }, (_, monthIndex) => {
      const monthKey = `${selectedYear}-${`${monthIndex + 1}`.padStart(2, '0')}`;
      return {
        monthKey,
        monthLabel: `${monthIndex + 1}月`,
        salesTotal: 0
      };
    });

    type ProductAggItem = {
      productId: string;
      productName: string;
      spec: number;
      amount: number;
      quantity: number;
      boxes: number;
    };

    const productById = new Map(products.map((product) => [product.id, product]));
    const currentMonthByProduct = new Map<string, ProductAggItem>();

    for (const transaction of transactions) {
      if (transaction.type !== 'out') continue;

      const occurredAt = timestampToDate(transaction.occurredAt);
      if (occurredAt.getFullYear() !== selectedYear) continue;

      const monthIndex = occurredAt.getMonth();
      if (monthIndex < 0 || monthIndex > currentMonthIndex) continue;

      const amount = transaction.quantity * transaction.unitPrice;
      monthlyBuckets[monthIndex].salesTotal += amount;

      const monthKey = monthlyBuckets[monthIndex].monthKey;
      if (monthKey !== selectedMonthKey) continue;

      const product = productById.get(transaction.productId);
      const spec = product && product.spec > 0 ? product.spec : 1;
      const existing = currentMonthByProduct.get(transaction.productId);
      if (existing) {
        existing.amount += amount;
        existing.quantity += transaction.quantity;
        existing.boxes += transaction.quantity / spec;
        continue;
      }

      currentMonthByProduct.set(transaction.productId, {
        productId: transaction.productId,
        productName: product?.name || '未知商品',
        spec,
        amount,
        quantity: transaction.quantity,
        boxes: transaction.quantity / spec
      });
    }

    const monthlySalesSeries = monthlyBuckets.map((bucket) => ({
      monthKey: bucket.monthKey,
      monthLabel: bucket.monthLabel,
      salesTotal: bucket.salesTotal
    }));

    const monthlyMomSeries = monthlyBuckets.map((bucket, index) => {
      if (index === 0) {
        return {
          monthKey: bucket.monthKey,
          salesMoM: null
        };
      }

      const previous = monthlyBuckets[index - 1];
      const salesMoM = previous.salesTotal > 0
        ? ((bucket.salesTotal - previous.salesTotal) / previous.salesTotal) * 100
        : null;

      return {
        monthKey: bucket.monthKey,
        salesMoM
      };
    });

    const currentMonthSalesTotal = monthlyBuckets[currentMonthIndex]?.salesTotal ?? 0;
    const currentMonthSalesMoM = monthlyMomSeries[monthlyMomSeries.length - 1]?.salesMoM ?? null;

    const currentMonthProducts = [...currentMonthByProduct.values()];
    const totalAmount = currentMonthProducts.reduce((sum, item) => sum + item.amount, 0);
    const totalBoxes = currentMonthProducts.reduce((sum, item) => sum + item.boxes, 0);

    const hotByAmount = [...currentMonthProducts]
      .sort((a, b) => {
        if (b.amount !== a.amount) return b.amount - a.amount;
        if (b.boxes !== a.boxes) return b.boxes - a.boxes;
        return a.productName.localeCompare(b.productName);
      })
      .slice(0, 5)
      .map((item) => ({
        productId: item.productId,
        productName: item.productName,
        value: item.amount,
        share: totalAmount > 0 ? (item.amount / totalAmount) * 100 : 0,
        quantity: item.quantity,
        boxes: item.boxes,
        spec: item.spec
      }));

    const hotByVolume = [...currentMonthProducts]
      .sort((a, b) => {
        if (b.boxes !== a.boxes) return b.boxes - a.boxes;
        if (b.amount !== a.amount) return b.amount - a.amount;
        return a.productName.localeCompare(b.productName);
      })
      .slice(0, 5)
      .map((item) => ({
        productId: item.productId,
        productName: item.productName,
        value: item.boxes,
        share: totalBoxes > 0 ? (item.boxes / totalBoxes) * 100 : 0,
        quantity: item.quantity,
        boxes: item.boxes,
        spec: item.spec
      }));

    return {
      selectedYear,
      selectedMonthKey,
      monthlySalesSeries,
      monthlyMomSeries,
      currentMonthSalesTotal,
      currentMonthSalesMoM,
      hotByAmount,
      hotByVolume
    };
  }, [transactions, products]);

  // --- Actions ---
  const handleLogin = async (username: string, pass: string) => {
    const normalized = username.trim().toLowerCase();
    try {
      // 统一用户名输入，确保 admin/staff 可稳定登录
      const emailAliasMap: Record<string, string> = {
        admin: 'admin@topstar.com',
        staff: 'staff@topstar.com'
      };
      const email = emailAliasMap[normalized] ?? (normalized.includes('@') ? normalized : `${normalized}@topstar.com`);
      await signInWithEmailAndPassword(auth, email, pass);
      showToast('登录成功');
      return true;
    } catch (error: unknown) {
      const authErrorCode = typeof error === 'object' && error !== null && 'code' in error
        ? String((error as { code?: string }).code)
        : '';

      let msg = '登录失败';
      if (authErrorCode === 'auth/user-not-found' || authErrorCode === 'auth/wrong-password' || authErrorCode === 'auth/invalid-credential') {
        msg = '用户名或密码错误';
      } else if (authErrorCode === 'auth/too-many-requests') {
        msg = '尝试次数过多，请稍后再试';
      } else if (authErrorCode === 'auth/network-request-failed') {
        msg = '网络异常，请检查网络后重试';
      }
      showToast(msg, 'error');
      return false;
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      showToast('已退出登录');
    } catch (error) {
      showToast('退出失败', 'error');
    }
  };

  const addProduct = async (name: string, spec: number, price: number) => {
    if (user?.role !== 'admin') {
      showToast('权限不足', 'error');
      return false;
    }
    if (products.some(p => p.name === name)) {
      showToast('商品名称已存在', 'error');
      return false;
    }
    try {
      await addDoc(collection(db, 'products'), {
        name,
        spec,
        price,
        stock: 0,
        isActive: true,
        createdAt: Timestamp.now()
      });
      showToast('商品添加成功');
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'products');
      return false;
    }
  };

  const deleteProduct = async (id: string) => {
    if (user?.role !== 'admin') {
      showToast('权限不足', 'error');
      return;
    }
    const product = products.find(p => p.id === id);
    if (product && product.stock > 0) {
      showToast('请先清空库存再删除', 'error');
      return;
    }
    try {
      await deleteDoc(doc(db, 'products', id));
      showToast('商品已删除');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `products/${id}`);
    }
  };

  const updateProductStock = async (
    id: string,
    newStock: number,
    nextName?: string,
    nextSpec?: number,
    nextPrice?: number
  ) => {
    if (user?.role !== 'admin') {
      showToast('权限不足', 'error');
      return false;
    }
    if (!Number.isFinite(newStock) || newStock < 0 || !Number.isInteger(newStock)) {
      showToast('库存数量必须是非负整数', 'error');
      return false;
    }

    const targetProduct = products.find((product) => product.id === id);
    if (!targetProduct) {
      showToast('商品不存在', 'error');
      return false;
    }

    const wantsNameOrSpecUpdate = nextName !== undefined || nextSpec !== undefined;
    if (wantsNameOrSpecUpdate && targetProduct.stock !== 0) {
      showToast('仅当库存为0时才可修改商品名和规格', 'error');
      return false;
    }

    const normalizedName = nextName?.trim();
    if (normalizedName !== undefined && !normalizedName) {
      showToast('商品名不能为空', 'error');
      return false;
    }

    if (nextSpec !== undefined && (!Number.isInteger(nextSpec) || nextSpec <= 0)) {
      showToast('规格必须是大于0的整数', 'error');
      return false;
    }

    if (nextPrice !== undefined && (!Number.isInteger(nextPrice) || nextPrice < 0)) {
      showToast('单价必须是非负整数', 'error');
      return false;
    }

    if (normalizedName !== undefined) {
      const duplicated = products.some(
        (product) => product.id !== id && product.name.toLowerCase() === normalizedName.toLowerCase()
      );
      if (duplicated) {
        showToast('商品名称已存在', 'error');
        return false;
      }
    }

    try {
      const productRef = doc(db, 'products', id);
      const patch: { stock: number; name?: string; spec?: number; price?: number } = { stock: newStock };
      if (normalizedName !== undefined) {
        patch.name = normalizedName;
      }
      if (nextSpec !== undefined) {
        patch.spec = nextSpec;
      }
      if (nextPrice !== undefined) {
        patch.price = nextPrice;
      }

      await updateDoc(productRef, patch);
      const wantsMetaUpdate = nextName !== undefined || nextSpec !== undefined || nextPrice !== undefined;
      showToast(wantsMetaUpdate ? '商品信息与库存修改成功' : '库存修改成功');
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `products/${id}`);
      return false;
    }
  };

  const toggleProductActive = async (id: string, nextActive: boolean) => {
    if (user?.role !== 'admin') {
      showToast('权限不足', 'error');
      return false;
    }
    const targetProduct = products.find((product) => product.id === id);
    if (!targetProduct) {
      showToast('商品不存在', 'error');
      return false;
    }

    try {
      await updateDoc(doc(db, 'products', id), { isActive: nextActive });
      showToast(nextActive ? '商品已重新上架' : '商品已下架（数据保留）');
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `products/${id}/isActive`);
      return false;
    }
  };

  const deleteTransaction = async (id: string) => {
    try {
      if (user?.role !== 'admin') {
        showToast('权限不足：只有管理员可以删除流水', 'error');
        return;
      }
      
      const t = transactions.find(trans => trans.id === id);
      if (!t) {
        showToast('错误：找不到该流水记录', 'error');
        return;
      }

      const product = products.find(p => p.id === t.productId);
      if (!product) {
        showToast('错误：找不到关联商品', 'error');
        return;
      }

      // 1. Revert Product Stock calculation
      const currentStock = product.stock || 0;
      const newStock = t.type === 'in' ? currentStock - t.quantity : currentStock + t.quantity;
      if (newStock < 0) {
        showToast('删除失败：回滚后库存将变为负数，操作已取消', 'error');
        return;
      }

      const transactionRef = doc(db, 'transactions', id);
      const productRef = doc(db, 'products', t.productId);
      await runTransaction(db, async (trx) => {
        const txSnap = await trx.get(transactionRef);
        if (!txSnap.exists()) throw new Error('目标流水不存在');
        const dbTx = mapTransactionDoc(txSnap.id, txSnap.data());

        const prodSnap = await trx.get(productRef);
        if (!prodSnap.exists()) throw new Error('关联商品不存在');
        const productData = prodSnap.data() as Product;
        const currentDbStock = Number(productData.stock ?? 0);
        const revertedStock = dbTx.type === 'in' ? currentDbStock - dbTx.quantity : currentDbStock + dbTx.quantity;
        if (revertedStock < 0) throw new Error('回滚后库存将变为负数');

        trx.update(productRef, { stock: revertedStock });
        trx.delete(transactionRef);
      });
      showToast('流水已成功删除，库存已回滚', 'success');
      setConfirmDeleteId(null);
    } catch (error: any) {
      handleFirestoreError(error, OperationType.DELETE, `transactions/${id}`);
    }
  };

  const handleTransaction = async (
    productId: string, 
    type: 'in' | 'out', 
    boxes: number, 
    items: number, 
    remark: string
  ) => {
    if (user?.role !== 'admin') {
      showToast('权限不足', 'error');
      return false;
    }
    const product = products.find(p => p.id === productId);
    if (!product) return false;
    if (product.isActive === false) {
      showToast('商品已下架，无法进出库', 'error');
      return false;
    }

    const totalQuantity = boxes * product.spec + items;
    
    if (type === 'out' && totalQuantity > product.stock) {
      showToast('库存不足', 'error');
      return false;
    }

    try {
      if (!auth.currentUser?.uid) {
        showToast('登录状态异常，请重新登录', 'error');
        return false;
      }
      const productRef = doc(db, 'products', productId);
      const transactionRef = doc(collection(db, 'transactions'));
      await runTransaction(db, async (trx) => {
        const productSnap = await trx.get(productRef);
        if (!productSnap.exists()) throw new Error('商品不存在');
        const productData = productSnap.data() as Product;
        const currentStock = Number(productData.stock ?? 0);
        const dbSpec = Number(productData.spec ?? 0);
        const dbUnitPrice = Number(productData.price ?? 0);
        const dbIsActive = productData.isActive !== false;
        if (dbSpec <= 0) throw new Error('商品规格错误');
        if (!dbIsActive) throw new Error('商品已下架，无法进出库');

        const nextStock = type === 'in' ? currentStock + totalQuantity : currentStock - totalQuantity;
        if (nextStock < 0) throw new Error('库存不足');

        trx.set(transactionRef, {
          productId,
          type,
          quantity: totalQuantity,
          unitPrice: dbUnitPrice,
          occurredAt: Timestamp.now(),
          operatorUid: auth.currentUser.uid,
          remark
        });
        trx.update(productRef, { stock: nextStock });
      });

      showToast(type === 'in' ? '入库成功' : '出库成功');
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'transactions/products');
      return false;
    }
  };

  const handleBatchImport = async () => {
    if (user?.role !== 'admin') return showToast('权限不足', 'error');
    if (!batchText.trim()) return showToast('请输入导入数据', 'error');

    const lines = batchText.trim().split('\n');
    let successCount = 0;
    let errorCount = 0;
    const existingNames = new Set(
      products.map((product) => product.name.trim().toLowerCase())
    );
    const importedNames = new Set<string>();

    showToast('正在开始批量导入...', 'success');

    for (const line of lines) {
      if (!line.trim()) continue;
      const columns = line.split('\t');
      if (columns.length < 3) {
        errorCount++;
        continue;
      }

      const pName = columns[0].trim();
      const pSpec = Number.parseInt(columns[1], 10);
      const pPrice = Number.parseInt(columns[2], 10);
      const pBoxes = columns[3] ? Number.parseInt(columns[3], 10) : 0;
      const pStock = pBoxes * pSpec;
      const normalizedName = pName.toLowerCase();

      if (
        !pName ||
        Number.isNaN(pSpec) ||
        Number.isNaN(pPrice) ||
        Number.isNaN(pBoxes) ||
        pSpec <= 0 ||
        pPrice < 0 ||
        pBoxes < 0
      ) {
        errorCount++;
        continue;
      }

      // Block duplicates against existing list and the same import batch.
      if (existingNames.has(normalizedName) || importedNames.has(normalizedName)) {
        errorCount++;
        continue;
      }

      try {
        if (!auth.currentUser?.uid) throw new Error('登录状态异常');
        const productRef = doc(collection(db, 'products'));
        const initTransactionRef = doc(collection(db, 'transactions'));
        await runTransaction(db, async (trx) => {
          const createdAt = Timestamp.now();
          trx.set(productRef, {
            name: pName,
            spec: pSpec,
            price: pPrice,
            stock: pStock,
            isActive: true,
            createdAt
          });

          if (pStock > 0) {
            trx.set(initTransactionRef, {
              productId: productRef.id,
              type: 'in',
              quantity: pStock,
              unitPrice: pPrice,
              occurredAt: Timestamp.now(),
              operatorUid: auth.currentUser.uid,
              remark: '系统批量导入初始库存'
            });
          }
        });
        successCount++;
        importedNames.add(normalizedName);
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, 'batch_import');
        errorCount++;
      }
    }

    showToast(`导入完成！成功: ${successCount}, 失败: ${errorCount}`);
    if (successCount > 0) {
      setBatchText('');
      setIsBatchMode(false);
    }
  };

  const updateTransaction = async (
    transactionId: string,
    newProductId: string,
    newType: 'in' | 'out',
    newQuantity: number,
    newRemark: string
  ) => {
    try {
      if (user?.role !== 'admin') {
        showToast('权限不足', 'error');
        return false;
      }

      const t = transactions.find(trans => trans.id === transactionId);
      if (!t) return false;

      const oldProduct = products.find(p => p.id === t.productId);
      const newProduct = products.find(p => p.id === newProductId);
      
      if (!oldProduct || !newProduct) {
        showToast('商品信息错误', 'error');
        return false;
      }

      if (!auth.currentUser?.uid) {
        showToast('登录状态异常，请重新登录', 'error');
        return false;
      }

      const transactionRef = doc(db, 'transactions', transactionId);
      const oldProductRef = doc(db, 'products', t.productId);
      const newProductRef = doc(db, 'products', newProductId);
      await runTransaction(db, async (trx) => {
        const txSnap = await trx.get(transactionRef);
        if (!txSnap.exists()) throw new Error('流水不存在');
        const currentTx = mapTransactionDoc(txSnap.id, txSnap.data());

        const oldProductSnap = await trx.get(oldProductRef);
        if (!oldProductSnap.exists()) throw new Error('原商品不存在');
        const oldProductData = oldProductSnap.data() as Product;
        const oldCurrentStock = Number(oldProductData.stock ?? 0);

        const newProductSnap = currentTx.productId === newProductId ? oldProductSnap : await trx.get(newProductRef);
        if (!newProductSnap.exists()) throw new Error('新商品不存在');
        const newProductData = newProductSnap.data() as Product;
        const newCurrentStock = Number(newProductData.stock ?? 0);
        const newUnitPrice = Number(newProductData.price ?? 0);
        const finalUnitPrice =
          currentTx.productId === newProductId ? Number(currentTx.unitPrice ?? newUnitPrice) : newUnitPrice;

        const revertedOldStock =
          currentTx.type === 'in'
            ? oldCurrentStock - currentTx.quantity
            : oldCurrentStock + currentTx.quantity;

        if (revertedOldStock < 0) throw new Error('回滚库存后小于0，拒绝修改');

        if (currentTx.productId === newProductId) {
          const sameProductFinalStock =
            newType === 'in'
              ? revertedOldStock + newQuantity
              : revertedOldStock - newQuantity;
          if (sameProductFinalStock < 0) throw new Error('修改后库存不足');

          trx.update(oldProductRef, { stock: sameProductFinalStock });
        } else {
          const newProductFinalStock =
            newType === 'in'
              ? newCurrentStock + newQuantity
              : newCurrentStock - newQuantity;
          if (newProductFinalStock < 0) throw new Error('新商品库存不足');

          trx.update(oldProductRef, { stock: revertedOldStock });
          trx.update(newProductRef, { stock: newProductFinalStock });
        }

        trx.update(transactionRef, {
          productId: newProductId,
          type: newType,
          quantity: newQuantity,
          unitPrice: finalUnitPrice,
          operatorUid: auth.currentUser.uid,
          remark: newRemark
        });
      });

      showToast('流水修改成功，库存已同步', 'success');
      setEditingTransaction(null);
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `transactions/${transactionId}`);
      return false;
    }
  };

  const addExpense = async (amount: number, category: string, remark: string, date: string) => {
    if (user?.role !== 'admin') {
      showToast('权限不足', 'error');
      return false;
    }
    const occurredAt = timestampFromDateInput(date);
    try {
      if (!auth.currentUser?.uid) {
        showToast('登录状态异常，请重新登录', 'error');
        return false;
      }
      await addDoc(collection(db, 'expenses'), {
        occurredAt,
        operatorUid: auth.currentUser.uid,
        amount,
        category,
        remark
      });
      showToast('记账成功');
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'expenses');
      return false;
    }
  };

  const deleteExpense = async (id: string) => {
    if (user?.role !== 'admin') {
      showToast('权限不足', 'error');
      return;
    }
    try {
      await deleteDoc(doc(db, 'expenses', id));
      showToast('记录已删除');
      setConfirmDeleteExpenseId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `expenses/${id}`);
    }
  };

  // --- Render Logic ---

  if (loading) {
    return (
      <div className="ios-shell min-h-screen flex items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-[3px] border-sky-100 border-t-sky-500"></div>
      </div>
    );
  }

  if (!user) return <LoginView handleLogin={handleLogin} />;

  return (
    <ErrorBoundary>
      <div className="ios-shell min-h-screen font-sans text-slate-900 pb-28 md:pb-8">
        {/* Mobile Header */}
      <header className="md:hidden glass sticky top-0 z-20 border-b border-white/55">
        <div className="px-4 sm:px-6">
          <div className="flex items-center justify-between py-3.5 gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-2xl ios-primary flex items-center justify-center border border-white/30">
                <Package className="text-white" size={24} />
              </div>
                <div className="min-w-0">
                  <h1 className="text-xl font-black tracking-tight text-slate-900 truncate">TOP STAR SHOES</h1>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                    <span className={`w-1.5 h-1.5 rounded-full ${user.role === 'admin' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                    <span className="truncate">{user.role === 'admin' ? '管理员' : '查询员'} · {user.username}</span>
                  </div>
                </div>
              </div>
            <button
              onClick={handleLogout}
              className="ios-float-button p-2.5 rounded-xl text-slate-500 hover:text-rose-500 transition-all shrink-0"
              title="退出登录"
            >
              <XCircle size={20} />
            </button>
          </div>
        </div>
      </header>

      <div className="md:flex md:items-start md:gap-5 md:px-5 md:pt-6">
        {/* Desktop Sidebar */}
        <aside className="hidden md:block md:w-[250px] md:shrink-0">
          <div className="glass fixed left-5 top-6 h-[calc(100vh-3rem)] w-[250px] rounded-3xl border border-white/60 shadow-xl p-5 flex flex-col">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-2xl ios-primary flex items-center justify-center border border-white/30">
                <Package className="text-white" size={24} />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl font-black tracking-tight text-slate-900 truncate">TOP STAR</h1>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                  <span className={`w-1.5 h-1.5 rounded-full ${user.role === 'admin' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                  <span className="truncate">{user.role === 'admin' ? '管理员' : '查询员'} · {user.username}</span>
                </div>
              </div>
            </div>

            <nav className="mt-7 flex flex-col gap-2">
              <NavButton
                active={currentView === 'home'}
                onClick={() => handleViewChange('home')}
                icon={<LayoutDashboard size={18} />}
                label="首页概览"
                variant="sidebar"
              />
              <NavButton
                active={currentView === 'dashboard'}
                onClick={() => handleViewChange('dashboard')}
                icon={<BarChart3 size={18} />}
                label="数据看板"
                variant="sidebar"
              />
              <button
                type="button"
                onClick={() => setIsInventoryMenuOpen((prev) => !prev)}
                className={`w-full rounded-2xl px-4 py-3 text-sm font-semibold transition-all flex items-center justify-between ${
                  isInventoryView
                    ? 'bg-white/70 text-indigo-600'
                    : 'text-slate-600 hover:bg-white/55 hover:text-slate-800'
                }`}
              >
                <span className="flex items-center gap-2">
                  <AlertTriangle size={18} />
                  <span>库存概况</span>
                </span>
                {isInventoryMenuOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
              {isInventoryMenuOpen && (
                <div className="ml-3 pl-3 border-l border-white/45 flex flex-col gap-1">
                  <NavButton
                    active={currentView === 'inventory-warnings'}
                    onClick={() => handleViewChange('inventory-warnings')}
                    icon={<AlertTriangle size={16} />}
                    label="库存预警"
                    variant="sidebar-sub"
                  />
                  <NavButton
                    active={currentView === 'inventory-stale'}
                    onClick={() => handleViewChange('inventory-stale')}
                    icon={<AlertTriangle size={16} />}
                    label="滞销品"
                    variant="sidebar-sub"
                  />
                  <NavButton
                    active={currentView === 'inventory-stock'}
                    onClick={() => handleViewChange('inventory-stock')}
                    icon={<Package size={16} />}
                    label="库存总览"
                    variant="sidebar-sub"
                  />
                  <NavButton
                    active={currentView === 'inventory-comparison'}
                    onClick={() => handleViewChange('inventory-comparison')}
                    icon={<LayoutDashboard size={16} />}
                    label="销售对比"
                    variant="sidebar-sub"
                  />
                </div>
              )}
              <NavButton
                active={currentView === 'stock'}
                onClick={() => handleViewChange('stock')}
                icon={<ArrowLeftRight size={18} />}
                label="进出库管理"
                variant="sidebar"
              />
              <NavButton
                active={currentView === 'products'}
                onClick={() => handleViewChange('products')}
                icon={<Package size={18} />}
                label="商品管理"
                variant="sidebar"
              />
              <NavButton
                active={currentView === 'expenses'}
                onClick={() => handleViewChange('expenses')}
                icon={<Wallet size={18} />}
                label="记账管理"
                variant="sidebar"
              />
            </nav>

            <button
              onClick={handleLogout}
              className="mt-auto ios-float-button rounded-2xl px-4 py-3 text-slate-600 hover:text-rose-500 transition-all flex items-center gap-2 justify-center font-semibold"
              title="退出登录"
            >
              <XCircle size={18} />
              <span>退出登录</span>
            </button>
          </div>
        </aside>

      {/* Main Content */}
      <main className="relative z-10 flex-1 min-w-0 px-4 sm:px-6 lg:px-8 pt-8 pb-28 md:px-0 md:pt-0 md:pb-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {currentView === 'home' && (
                <HomeView 
                  stats={stats}
                  formatCurrency={formatCurrency}
                  reportPeriod={reportPeriod}
                  setReportPeriod={setReportPeriod}
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
                selectedWeek={selectedWeek}
                setSelectedWeek={setSelectedWeek}
                selectedMonth={selectedMonth}
                setSelectedMonth={setSelectedMonth}
                  salesReport={salesReport}
                  formatStock={formatStock}
                  homeMetrics={homeMetrics}
                />
              )}
              {currentView === 'inventory-warnings' && (
                <InventoryOverviewView
                  mode="warnings"
                  warnings={warnings}
                  staleProducts={staleProducts}
                  productRiskMetricsByProduct={productRiskMetricsByProduct}
                  products={activeProducts}
                  transactions={transactions}
                  formatStock={formatStock}
                  weeklySalesComparisons={weeklySalesComparisons}
                  monthlySalesComparisons={monthlySalesComparisons}
                  comparisonMode={inventoryComparisonMode}
                  setComparisonMode={setInventoryComparisonMode}
                  showToast={showToast}
                />
              )}
              {currentView === 'inventory-stale' && (
                <InventoryOverviewView
                  mode="stale"
                  warnings={warnings}
                  staleProducts={staleProducts}
                  productRiskMetricsByProduct={productRiskMetricsByProduct}
                  products={activeProducts}
                  transactions={transactions}
                  formatStock={formatStock}
                  weeklySalesComparisons={weeklySalesComparisons}
                  monthlySalesComparisons={monthlySalesComparisons}
                  comparisonMode={inventoryComparisonMode}
                  setComparisonMode={setInventoryComparisonMode}
                  showToast={showToast}
                />
              )}
              {currentView === 'inventory-stock' && (
                <InventoryOverviewView
                  mode="stock"
                  warnings={warnings}
                  staleProducts={staleProducts}
                  productRiskMetricsByProduct={productRiskMetricsByProduct}
                  products={activeProducts}
                  transactions={transactions}
                  formatStock={formatStock}
                  weeklySalesComparisons={weeklySalesComparisons}
                  monthlySalesComparisons={monthlySalesComparisons}
                  comparisonMode={inventoryComparisonMode}
                  setComparisonMode={setInventoryComparisonMode}
                  showToast={showToast}
                />
              )}
              {currentView === 'inventory-comparison' && (
                <InventoryOverviewView
                  mode="comparison"
                  warnings={warnings}
                  staleProducts={staleProducts}
                  productRiskMetricsByProduct={productRiskMetricsByProduct}
                  products={activeProducts}
                  transactions={transactions}
                  formatStock={formatStock}
                  weeklySalesComparisons={weeklySalesComparisons}
                  monthlySalesComparisons={monthlySalesComparisons}
                  comparisonMode={inventoryComparisonMode}
                  setComparisonMode={setInventoryComparisonMode}
                  showToast={showToast}
                />
              )}
              {currentView === 'stock' && (
                <StockView 
                  products={activeProducts}
                transactions={transactions}
                handleTransaction={handleTransaction}
                deleteTransaction={setConfirmDeleteId}
                updateTransaction={updateTransaction}
                editingTransaction={editingTransaction}
                setEditingTransaction={setEditingTransaction}
                user={user}
                formatStock={formatStock}
                showToast={showToast}
                type={stockType}
                setType={setStockType}
                selectedId={selectedStockId}
                setSelectedId={setSelectedStockId}
                searchTerm={stockSearchTerm}
                setSearchTerm={setStockSearchTerm}
                showDropdown={showStockDropdown}
                setShowDropdown={setShowStockDropdown}
                boxes={stockBoxes}
                setBoxes={setStockBoxes}
                  items={stockItems}
                  setItems={setStockItems}
                  remark={stockRemark}
                  setRemark={setStockRemark}
                  formatDateTime={formatDateTimeLabel}
                />
              )}
            {currentView === 'products' && (
              <ProductsView 
                user={user}
                products={products}
                addProduct={addProduct}
                deleteProduct={deleteProduct}
                updateProductStock={updateProductStock}
                toggleProductActive={toggleProductActive}
                showToast={showToast}
                formatCurrency={formatCurrency}
                formatStock={formatStock}
                name={newProductName}
                setName={setNewProductName}
                spec={newProductSpec}
                setSpec={setNewProductSpec}
                price={newProductPrice}
                setPrice={setNewProductPrice}
                isBatchMode={isBatchMode}
                setIsBatchMode={setIsBatchMode}
                batchText={batchText}
                setBatchText={setBatchText}
                handleBatchImport={handleBatchImport}
              />
            )}
            {currentView === 'dashboard' && (
              <DashboardView
                metrics={dashboardMetrics}
                formatCurrency={formatCurrency}
                formatStock={formatStock}
              />
            )}
            {currentView === 'expenses' && (
                <ExpensesView 
                  expenses={expenses}
                  transactions={transactions}
                  addExpense={addExpense}
                  deleteExpense={setConfirmDeleteExpenseId}
                  formatCurrency={formatCurrency}
                  user={user}
                  formatDateTime={formatDateTimeLabel}
                />
              )}
          </motion.div>
        </AnimatePresence>
      </main>
      </div>

      {/* Mobile Dock */}
      <nav
        className="md:hidden fixed left-1/2 -translate-x-1/2 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] w-[calc(100%-1.25rem)] max-w-[28rem] z-40"
        aria-label="手机底部导航"
      >
        <div className="ios-dock p-2">
          <div className="grid grid-cols-5 gap-1">
            <NavButton
              active={currentView === 'home'}
              onClick={() => handleViewChange('home')}
              icon={<LayoutDashboard size={18} />}
              label="首页"
              variant="mobile"
            />
            <NavButton
              active={isInventoryView}
              onClick={() => handleViewChange('inventory-warnings')}
              icon={<AlertTriangle size={18} />}
              label="库存"
              variant="mobile"
            />
            <NavButton
              active={currentView === 'stock'}
              onClick={() => handleViewChange('stock')}
              icon={<ArrowLeftRight size={18} />}
              label="进出库"
              variant="mobile"
            />
            <NavButton
              active={currentView === 'products'}
              onClick={() => handleViewChange('products')}
              icon={<Package size={18} />}
              label="商品"
              variant="mobile"
            />
            <NavButton
              active={currentView === 'expenses'}
              onClick={() => handleViewChange('expenses')}
              icon={<Wallet size={18} />}
              label="记账"
              variant="mobile"
            />
          </div>
        </div>
      </nav>

      {/* Confirm Delete Modal */}
      <AnimatePresence>
        {confirmDeleteId && (
          <div className="fixed inset-0 bg-slate-900/25 backdrop-blur-lg z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass rounded-3xl p-8 w-full max-w-sm border border-white/60 text-center"
            >
              <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="text-rose-500" size={32} />
              </div>
              <h3 className="text-xl font-black text-slate-800 mb-2">确认删除？</h3>
              <p className="text-slate-500 mb-8">确定要彻底删除此流水记录吗？此操作不可撤销，库存将自动回滚。</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDeleteId(null)}
                  className="flex-1 py-3 rounded-xl font-semibold text-slate-600 ios-float-button hover:bg-white/90 transition-all"
                >
                  取消
                </button>
                <button
                  onClick={() => deleteTransaction(confirmDeleteId)}
                  className="flex-1 py-3 rounded-xl font-semibold text-white bg-rose-500/90 hover:bg-rose-600 shadow-lg shadow-rose-300/30 transition-all"
                >
                  确认删除
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirm Delete Expense Modal */}
      <AnimatePresence>
        {confirmDeleteExpenseId && (
          <div className="fixed inset-0 bg-slate-900/25 backdrop-blur-lg z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass rounded-3xl p-8 w-full max-w-sm border border-white/60 text-center"
            >
              <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="text-rose-500" size={32} />
              </div>
              <h3 className="text-xl font-black text-slate-800 mb-2">确认删除？</h3>
              <p className="text-slate-500 mb-8">确定要彻底删除此支出明细吗？此操作不可撤销。</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDeleteExpenseId(null)}
                  className="flex-1 py-3 rounded-xl font-semibold text-slate-600 ios-float-button hover:bg-white/90 transition-all"
                >
                  取消
                </button>
                <button
                  onClick={() => deleteExpense(confirmDeleteExpenseId)}
                  className="flex-1 py-3 rounded-xl font-semibold text-white bg-rose-500/90 hover:bg-rose-600 shadow-lg shadow-rose-300/30 transition-all"
                >
                  确认删除
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toasts */}
      <div className="fixed left-4 right-4 bottom-[calc(6.25rem+env(safe-area-inset-bottom))] md:bottom-6 md:left-auto md:right-8 md:w-[360px] z-50 flex flex-col gap-3">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 20, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.9 }}
              className={`flex items-center gap-3 px-5 py-3 rounded-2xl border glass ${
                toast.type === 'success' 
                  ? 'border-emerald-200/50 text-emerald-900' 
                  : 'border-rose-200/50 text-rose-900'
              }`}
            >
              {toast.type === 'success' ? <CheckCircle2 className="text-emerald-500" size={20} /> : <XCircle className="text-rose-500" size={20} />}
              <span className="font-medium">{toast.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  </ErrorBoundary>
);
}

// --- Components ---

function NavButton({
  active,
  onClick,
  icon,
  label,
  variant = 'desktop'
}: {
  active: boolean,
  onClick: () => void,
  icon: React.ReactNode,
  label: string,
  variant?: 'desktop' | 'mobile' | 'sidebar' | 'sidebar-sub'
}) {
  if (variant === 'mobile') {
    return (
      <button
        onClick={onClick}
        className={`ios-dock-item flex flex-col items-center justify-center gap-0.5 py-2 px-1 text-[11px] font-bold ${
          active ? 'ios-dock-item-active' : 'text-slate-500'
        }`}
      >
        {icon}
        <span>{label}</span>
      </button>
    );
  }

  if (variant === 'sidebar') {
    return (
      <button
        onClick={onClick}
        className={`w-full rounded-2xl px-4 py-3 text-sm font-semibold transition-all flex items-center gap-2 ${
          active
            ? 'bg-white/85 text-indigo-600 shadow-[0_10px_26px_rgba(99,102,241,0.18)]'
            : 'text-slate-600 hover:bg-white/55 hover:text-slate-800'
        }`}
      >
        {icon}
        <span>{label}</span>
      </button>
    );
  }

  if (variant === 'sidebar-sub') {
    return (
      <button
        onClick={onClick}
        className={`w-full rounded-xl px-3 py-2 text-xs font-semibold transition-all flex items-center gap-2 ${
          active
            ? 'bg-white/88 text-indigo-600 shadow-[0_8px_20px_rgba(99,102,241,0.16)]'
            : 'text-slate-500 hover:bg-white/60 hover:text-slate-700'
        }`}
      >
        {icon}
        <span>{label}</span>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`ios-segment-item flex items-center gap-2 px-4 sm:px-5 py-2.5 text-sm font-semibold ${
        active 
          ? 'ios-segment-item-active' 
          : 'hover:bg-white/55 hover:text-slate-700'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
