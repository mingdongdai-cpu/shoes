/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, Component } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  ArrowLeftRight, 
  XCircle,
  CheckCircle2,
  Pencil,
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
  doc, 
  query, 
  orderBy,
  getDocFromServer,
  getDocs,
  limit,
  runTransaction,
  startAfter,
  Timestamp,
  type DocumentData,
  type QueryDocumentSnapshot
} from 'firebase/firestore';
import { Product, Transaction, User, View, Toast, Expense } from './types';
import { LoginView, HomeView, StockView, ProductsView, ExpensesView } from './components/Views';
import { formatDateTimeLabel, getRangeByMonth, getRangeByPeriod, isWithinRange } from './lib/timeWindow';


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
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
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

const getTogoDate = () => new Date().toISOString().split('T')[0];
const getTogoMonth = () => new Date().toISOString().slice(0, 7);
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

const isIsolatedMode = import.meta.env.VITE_ISOLATED_MODE === 'true';
const makeLocalId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const PAGE_SIZE = 200;

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
  const [reportPeriod, setReportPeriod] = useState<'day' | 'week' | 'month'>('day');
  
  const [selectedDate, setSelectedDate] = useState(getTogoDate());
  const [selectedWeek, setSelectedWeek] = useState(getTogoWeek()); 
  const [selectedMonth, setSelectedMonth] = useState(getTogoMonth());
  
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteExpenseId, setConfirmDeleteExpenseId] = useState<string | null>(null);
  const [transactionsCursor, setTransactionsCursor] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [expensesCursor, setExpensesCursor] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMoreTransactions, setHasMoreTransactions] = useState(false);
  const [hasMoreExpenses, setHasMoreExpenses] = useState(false);
  const [loadingMoreTransactions, setLoadingMoreTransactions] = useState(false);
  const [loadingMoreExpenses, setLoadingMoreExpenses] = useState(false);

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
    if (isIsolatedMode) {
      setHasMoreTransactions(false);
      setHasMoreExpenses(false);
      setLoading(false);
      return;
    }

    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. ");
        }
      }
    }
    testConnection();

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
            setTransactionsCursor(null);
            setExpensesCursor(null);
            setHasMoreTransactions(false);
            setHasMoreExpenses(false);
            setLoading(false);
            return;
          }

          try {
            const role: User['role'] = firebaseUser.email === 'admin@topstar.com' ? 'admin' : 'staff';
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
    if (isIsolatedMode) return;

    // 确保不仅 user 状态存在，Firebase 底层 auth 对象也已识别到当前用户
    if (!user || !auth.currentUser) return;

    // Sync Products
    const qProducts = query(collection(db, 'products'), orderBy('name'));
    const unsubscribeProducts = onSnapshot(qProducts, 
      (snapshot) => {
        const productsData: Product[] = [];
        snapshot.forEach((itemDoc) => {
          productsData.push({ id: itemDoc.id, ...itemDoc.data() } as Product);
        });
        setProducts(productsData);
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
      setTransactionsCursor(null);
      setHasMoreTransactions(false);
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
      setExpensesCursor(null);
      setHasMoreExpenses(false);
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
    const inTotal = transactions
      .filter(t => t.type === 'in')
      .reduce((sum, t) => sum + t.quantity * t.unitPrice, 0);
    const outTotal = transactions
      .filter(t => t.type === 'out')
      .reduce((sum, t) => sum + t.quantity * t.unitPrice, 0);
    return {
      inTotal,
      outTotal,
      balance: inTotal - outTotal
    };
  }, [transactions]);

  const warnings = useMemo(() => {
    return products.filter(p => p.stock < p.spec * 30);
  }, [products]);

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
      items: Object.values(reportMap).sort((a, b) => b.amount - a.amount),
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
      salesMoM,
      expenseMoM
    };
  }, [selectedMonth, transactions, expenses, warnings.length]);

  const loadMoreTransactions = async () => {
    if (isIsolatedMode || !transactionsCursor || loadingMoreTransactions || !hasMoreTransactions) return;
    try {
      setLoadingMoreTransactions(true);
      const q = query(
        collection(db, 'transactions'),
        orderBy('occurredAt', 'desc'),
        startAfter(transactionsCursor),
        limit(PAGE_SIZE)
      );
      const snap = await getDocs(q);
      const next = snap.docs.map((itemDoc) => mapTransactionDoc(itemDoc.id, itemDoc.data()));
      setTransactions(prev => {
        const ids = new Set(prev.map(item => item.id));
        const merged = [...prev];
        for (const item of next) {
          if (!ids.has(item.id)) merged.push(item);
        }
        return merged;
      });
      setTransactionsCursor(snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null);
      setHasMoreTransactions(snap.docs.length === PAGE_SIZE);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'transactions');
    } finally {
      setLoadingMoreTransactions(false);
    }
  };

  const loadMoreExpenses = async () => {
    if (isIsolatedMode || !expensesCursor || loadingMoreExpenses || !hasMoreExpenses) return;
    try {
      setLoadingMoreExpenses(true);
      const q = query(
        collection(db, 'expenses'),
        orderBy('occurredAt', 'desc'),
        startAfter(expensesCursor),
        limit(PAGE_SIZE)
      );
      const snap = await getDocs(q);
      const next = snap.docs.map((itemDoc) => mapExpenseDoc(itemDoc.id, itemDoc.data()));
      setExpenses(prev => {
        const ids = new Set(prev.map(item => item.id));
        const merged = [...prev];
        for (const item of next) {
          if (!ids.has(item.id)) merged.push(item);
        }
        return merged;
      });
      setExpensesCursor(snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null);
      setHasMoreExpenses(snap.docs.length === PAGE_SIZE);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'expenses');
    } finally {
      setLoadingMoreExpenses(false);
    }
  };

  // --- Actions ---
  const handleLogin = async (username: string, pass: string) => {
    if (isIsolatedMode) {
      if (!username || !pass) {
        showToast('请输入用户名和密码', 'error');
        return false;
      }
      const normalized = username.trim().toLowerCase();
      const role = normalized.includes('admin') ? 'admin' : 'staff';
      setUser({ uid: `local-${normalized || 'user'}`, username: username.trim(), role });
      showToast('隔离模式登录成功');
      return true;
    }

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
    if (isIsolatedMode) {
      setUser(null);
      setProducts([]);
      setTransactions([]);
      setExpenses([]);
      showToast('已退出隔离模式会话');
      return;
    }

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
    if (isIsolatedMode) {
      const nextProduct: Product = {
        id: makeLocalId('product'),
        name,
        spec,
        price,
        stock: 0
      };
      setProducts(prev => [...prev, nextProduct].sort((a, b) => a.name.localeCompare(b.name)));
      showToast('隔离模式：商品添加成功');
      return true;
    }
    try {
      await addDoc(collection(db, 'products'), {
        name,
        spec,
        price,
        stock: 0
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
    if (isIsolatedMode) {
      setProducts(prev => prev.filter(p => p.id !== id));
      showToast('隔离模式：商品已删除');
      return;
    }
    try {
      await deleteDoc(doc(db, 'products', id));
      showToast('商品已删除');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `products/${id}`);
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

      if (isIsolatedMode) {
        setProducts(prev => prev.map(p => (p.id === t.productId ? { ...p, stock: newStock } : p)));
        setTransactions(prev => prev.filter(trans => trans.id !== id));
        showToast('隔离模式：流水已删除，库存已回滚');
        setConfirmDeleteId(null);
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
    if (!product) return;

    const totalQuantity = boxes * product.spec + items;
    
    if (type === 'out' && totalQuantity > product.stock) {
      showToast('库存不足', 'error');
      return false;
    }

    if (isIsolatedMode) {
      const currentStock = product.stock || 0;
      const newStock = type === 'in' ? currentStock + totalQuantity : currentStock - totalQuantity;
      const nextTransaction: Transaction = {
        id: makeLocalId('transaction'),
        productId,
        type,
        quantity: totalQuantity,
        unitPrice: product.price,
        occurredAt: Timestamp.now(),
        operatorUid: user.uid,
        remark
      };

      setProducts(prev => prev.map(p => (p.id === productId ? { ...p, stock: newStock } : p)));
      setTransactions(prev => [nextTransaction, ...prev]);
      showToast(type === 'in' ? '隔离模式：入库成功' : '隔离模式：出库成功');
      return true;
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
        if (dbSpec <= 0) throw new Error('商品规格错误');

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

    showToast('正在开始批量导入...', 'success');

    for (const line of lines) {
      if (!line.trim()) continue;
      const columns = line.split('\t');
      if (columns.length < 3) {
        errorCount++;
        continue;
      }

      const pName = columns[0].trim();
      const pSpec = parseInt(columns[1]);
      const pPrice = parseInt(columns[2]);
      const pBoxes = columns[3] ? parseInt(columns[3]) : 0;
      const pStock = pBoxes * pSpec;

      if (!pName || isNaN(pSpec) || isNaN(pPrice)) {
        errorCount++;
        continue;
      }

      // Check duplicate
      if (products.some(p => p.name === pName)) {
        errorCount++;
        continue;
      }

      if (isIsolatedMode) {
        const productId = makeLocalId('product');
        setProducts(prev => [
          ...prev,
          {
            id: productId,
            name: pName,
            spec: pSpec,
            price: pPrice,
            stock: pStock
          }
        ].sort((a, b) => a.name.localeCompare(b.name)));
        if (pStock > 0) {
          setTransactions(prev => [
            {
              id: makeLocalId('transaction'),
              productId,
              type: 'in',
              quantity: pStock,
              unitPrice: pPrice,
              occurredAt: Timestamp.now(),
              operatorUid: user.uid,
              remark: '隔离模式批量导入初始库存'
            },
            ...prev
          ]);
        }
        successCount++;
        continue;
      }

      try {
        if (!auth.currentUser?.uid) throw new Error('登录状态异常');
        const productRef = doc(collection(db, 'products'));
        const initTransactionRef = doc(collection(db, 'transactions'));
        await runTransaction(db, async (trx) => {
          trx.set(productRef, {
            name: pName,
            spec: pSpec,
            price: pPrice,
            stock: pStock
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

      if (isIsolatedMode) {
        let oldProductFinalStock = oldProduct.stock || 0;
        if (t.type === 'in') {
          oldProductFinalStock -= t.quantity;
        } else {
          oldProductFinalStock += t.quantity;
        }

        const newProductCurrentStock = newProduct.stock || 0;
        let newProductFinalStock =
          newType === 'in'
            ? newProductCurrentStock + newQuantity
            : newProductCurrentStock - newQuantity;

        if (oldProduct.id === newProduct.id) {
          newProductFinalStock =
            newType === 'in'
              ? oldProductFinalStock + newQuantity
              : oldProductFinalStock - newQuantity;
        }

        if (oldProductFinalStock < 0 || newProductFinalStock < 0) {
          showToast('修改失败：库存将变为负数', 'error');
          return false;
        }

        setProducts(prev => prev.map(p => {
          if (oldProduct.id === newProduct.id && p.id === oldProduct.id) {
            return { ...p, stock: newProductFinalStock };
          }
          if (p.id === oldProduct.id) return { ...p, stock: oldProductFinalStock };
          if (p.id === newProduct.id) return { ...p, stock: newProductFinalStock };
          return p;
        }));

        setTransactions(prev => prev.map(trans => (
          trans.id === transactionId
            ? {
                ...trans,
                productId: newProductId,
                type: newType,
                quantity: newQuantity,
                remark: newRemark
              }
            : trans
        )));

        showToast('隔离模式：流水修改成功，库存已同步');
        setEditingTransaction(null);
        return true;
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
          unitPrice: newUnitPrice,
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
    if (isIsolatedMode) {
      const nextExpense: Expense = {
        id: makeLocalId('expense'),
        occurredAt,
        operatorUid: user.uid,
        amount,
        category,
        remark
      };
      setExpenses(prev => [nextExpense, ...prev]);
      showToast('隔离模式：记账成功');
      return true;
    }
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
    if (isIsolatedMode) {
      setExpenses(prev => prev.filter(expense => expense.id !== id));
      showToast('隔离模式：记录已删除');
      setConfirmDeleteExpenseId(null);
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
      <div className="ios-shell min-h-screen font-sans text-slate-900 pb-20">
        {/* Header & Nav */}
      <header className="glass sticky top-0 z-20 border-b border-white/55">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between py-3.5 gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl ios-primary flex items-center justify-center border border-white/30">
                <Package className="text-white" size={24} />
              </div>
                <div>
                  <h1 className="text-xl font-black tracking-tight text-slate-900">TOP STAR SHOES</h1>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                    <span className={`w-1.5 h-1.5 rounded-full ${user.role === 'admin' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                    {user.role === 'admin' ? '管理员' : '查询员'} · {user.username}
                    {isIsolatedMode && (
                      <span className="px-2 py-0.5 rounded-full border border-amber-200 bg-amber-50 text-amber-700">
                        隔离模式
                      </span>
                    )}
                  </div>
                </div>
              </div>
            
            <div className="flex w-full md:w-auto items-center justify-between md:justify-end gap-3">
              <nav className="ios-segmented flex flex-wrap items-center gap-1">
                <NavButton 
                  active={currentView === 'home'} 
                  onClick={() => setCurrentView('home')}
                  icon={<LayoutDashboard size={18} />}
                  label="首页概览"
                />
                <NavButton 
                  active={currentView === 'stock'} 
                  onClick={() => setCurrentView('stock')}
                  icon={<ArrowLeftRight size={18} />}
                  label="进出库管理"
                />
                <NavButton 
                  active={currentView === 'products'} 
                  onClick={() => setCurrentView('products')}
                  icon={<Package size={18} />}
                  label="商品管理"
                />
                <NavButton 
                  active={currentView === 'expenses'} 
                  onClick={() => setCurrentView('expenses')}
                  icon={<Wallet size={18} />}
                  label="记账管理"
                />
              </nav>
              <button 
                onClick={handleLogout}
                className="ios-float-button p-2.5 rounded-xl text-slate-500 hover:text-rose-500 transition-all"
                title="退出登录"
              >
                <XCircle size={20} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                  warnings={warnings}
                  products={products}
                  homeMetrics={homeMetrics}
                />
              )}
              {currentView === 'stock' && (
                <StockView 
                  products={products}
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
                  hasMoreTransactions={hasMoreTransactions}
                  loadingMoreTransactions={loadingMoreTransactions}
                  loadMoreTransactions={loadMoreTransactions}
                />
              )}
            {currentView === 'products' && (
              <ProductsView 
                user={user}
                products={products}
                addProduct={addProduct}
                deleteProduct={deleteProduct}
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
            {currentView === 'expenses' && (
                <ExpensesView 
                  expenses={expenses}
                  transactions={transactions}
                  addExpense={addExpense}
                  deleteExpense={setConfirmDeleteExpenseId}
                  formatCurrency={formatCurrency}
                  user={user}
                  formatDateTime={formatDateTimeLabel}
                  hasMoreExpenses={hasMoreExpenses}
                  loadingMoreExpenses={loadingMoreExpenses}
                  loadMoreExpenses={loadMoreExpenses}
                />
              )}
          </motion.div>
        </AnimatePresence>
      </main>

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
      <div className="fixed bottom-6 left-4 right-4 sm:left-auto sm:right-8 sm:w-[360px] z-50 flex flex-col gap-3">
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

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
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
