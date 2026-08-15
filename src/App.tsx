/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef, Component } from 'react';
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
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
  setDoc,
  doc, 
  query, 
  where,
  orderBy,
  limit,
  getDoc,
  getDocs,
  writeBatch,
  runTransaction,
  Timestamp,
  increment,
  serverTimestamp,
  deleteField,
  type Transaction as FirestoreWriteTransaction,
  type DocumentData
} from 'firebase/firestore';
import { Product, OrderProduct, CustomerOrder, CustomerOrderItem, CustomerOrderSync, OrderCashCount, OrderDailyExpense, CashDenominationCounts, ProductRiskMetrics, Transaction, User, View, Toast, Expense, Debt, SalesPeriodData, DashboardMetrics, AnalyticsOverview, AnalyticsMonth } from './types';
import { LoginView, HomeView, DashboardView, InventoryOverviewView, StockView, OrderEntryView, ProductsView, ExpensesView, DebtsView } from './components/Views';
import { CustomerOrdersView, OrderDebtsView, OrderPriceListView } from './components/OrderViews';
import { OrderAccountingView } from './components/OrderAccountingView';
import { AppShell } from './components/AppShell';
import { formatDateTimeLabel, getRangeByMonth, getRangeByPeriod, isWithinRange, timestampToDate, type ReportPeriod } from './lib/timeWindow';
import { hasDuplicateProductName, normalizeProductName } from './lib/productNames';
import { aggregateBatchOutLines, getStockAfterTransactionDeletion, type BatchOutLine } from './lib/inventoryOperations';
import { isCustomerOrderDebt, isOrderDate, normalizeCustomerOrderDebtHistory, normalizeCustomerOrderPaidAmount, normalizeCustomerOrderUnpaid } from './lib/customerOrders';
import { calculateCashTotal, normalizeCashCounts } from './lib/orderAccounting';
import { buildAnalyticsDelta, IN_TOTAL_BASELINE_VALUE, type AnalyticsDelta, type AnalyticsExpenseInput, type AnalyticsTransactionInput } from './lib/analytics';
import { aggregateCustomerOrdersForInventory } from './lib/customerOrderSync';


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
        <div className="app-shell min-h-screen flex items-center justify-center p-4">
          <div className="surface p-8 rounded-xl border border-stone-200 max-w-md w-full text-center">
            <XCircle className="text-rose-500 mx-auto mb-4" size={48} />
            <h2 className="text-xl font-black text-slate-900 mb-2">出错了</h2>
            <p className="text-slate-600 mb-6">{errorMessage}</p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-3 rounded-xl font-bold button-primary hover:brightness-105 transition-all"
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

interface SalesPeriodWindow {
  key: string;
  label: string;
  start: Date;
  end: Date;
}

const buildSalesPeriodData = (
  title: string,
  products: Product[],
  transactions: Transaction[],
  periods: SalesPeriodWindow[]
): SalesPeriodData => {
  const productRows = new Map(
    products.map((product) => [
      product.id,
      {
        product,
        boxesByPeriod: Array<number>(periods.length).fill(0)
      }
    ])
  );

  for (const transaction of transactions) {
    if (transaction.type !== 'out') continue;
    const row = productRows.get(transaction.productId);
    if (!row) continue;

    const occurredAt = timestampToDate(transaction.occurredAt);
    const periodIndex = periods.findIndex(
      (period) => occurredAt >= period.start && occurredAt < period.end
    );
    if (periodIndex === -1) continue;

    if (row.product.spec <= 0) {
      throw new Error(`商品 ${row.product.name} 的规格必须大于 0`);
    }
    row.boxesByPeriod[periodIndex] += transaction.quantity / row.product.spec;
  }

  const rowsWithTotals = Array.from(productRows.values())
    .map(({ product, boxesByPeriod }) => ({
      productId: product.id,
      name: product.name,
      boxesByPeriod,
      totalBoxes: boxesByPeriod.reduce((total, boxes) => total + boxes, 0)
    }))
    .sort((a, b) => b.totalBoxes - a.totalBoxes || a.name.localeCompare(b.name));
  const rows = rowsWithTotals.map(({ productId, name, boxesByPeriod }) => ({
    productId,
    name,
    boxesByPeriod
  }));

  return {
    title,
    columns: periods.map(({ key, label }) => ({ key, label })),
    rows
  };
};

function requireTimestamp(value: unknown, fieldName: string): Timestamp {
  if (value instanceof Timestamp) return value;
  throw new Error(`${fieldName} 必须是 Firestore Timestamp`);
}

function mapTransactionDoc(id: string, data: DocumentData): Transaction {
  return {
    id,
    productId: String(data.productId ?? ''),
    type: data.type === 'in' ? 'in' : 'out',
    quantity: Number(data.quantity ?? 0),
    unitPrice: Number(data.unitPrice ?? data.price ?? 0),
    occurredAt: requireTimestamp(data.occurredAt, 'transactions.occurredAt'),
    operatorUid: String(data.operatorUid ?? 'legacy'),
    remark: String(data.remark ?? ''),
    sourceOrderSyncId: typeof data.sourceOrderSyncId === 'string' ? data.sourceOrderSyncId : undefined
  };
}

function mapExpenseDoc(id: string, data: DocumentData): Expense {
  return {
    id,
    occurredAt: requireTimestamp(data.occurredAt, 'expenses.occurredAt'),
    operatorUid: String(data.operatorUid ?? 'legacy'),
    amount: Number(data.amount ?? 0),
    category: String(data.category ?? ''),
    remark: String(data.remark ?? '')
  };
}

function mapDebtDoc(id: string, data: DocumentData): Debt {
  return {
    id,
    customerName: data.customerName as string,
    amount: data.amount as number,
    paidAmount: data.paidAmount as number,
    occurredAt: data.occurredAt as Timestamp,
    operatorUid: data.operatorUid as string
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
    createdAt: coerceProductCreatedAt(data.createdAt),
    lastOutAt: data.lastOutAt instanceof Timestamp ? data.lastOutAt : null
  };
}

function mapAnalyticsOverview(data: DocumentData): AnalyticsOverview {
  return {
    inTotal: Number(data.inTotal ?? IN_TOTAL_BASELINE_VALUE),
    outTotal: Number(data.outTotal ?? 0),
    balance: Number(data.balance ?? IN_TOTAL_BASELINE_VALUE),
    transactionCount: Number(data.transactionCount ?? 0),
    expenseCount: Number(data.expenseCount ?? 0)
  };
}

function mapAnalyticsMonth(id: string, data: DocumentData): AnalyticsMonth {
  const outByProduct = data.outByProduct && typeof data.outByProduct === 'object'
    ? Object.fromEntries(Object.entries(data.outByProduct).map(([productId, value]) => {
        const item = value as { quantity?: unknown; amount?: unknown };
        return [productId, { quantity: Number(item?.quantity ?? 0), amount: Number(item?.amount ?? 0) }];
      }))
    : {};
  const [fallbackYear, fallbackMonth] = id.split('-').map(Number);
  return {
    monthKey: String(data.monthKey ?? id),
    year: Number(data.year ?? fallbackYear),
    month: Number(data.month ?? fallbackMonth),
    inAmount: Number(data.inAmount ?? 0),
    outAmount: Number(data.outAmount ?? 0),
    expenseAmount: Number(data.expenseAmount ?? 0),
    outByProduct
  };
}

function analyticsTransactionInput(transaction: Transaction): AnalyticsTransactionInput {
  return { ...transaction, occurredAt: transaction.occurredAt.toDate() };
}

function analyticsExpenseInput(expense: Expense): AnalyticsExpenseInput {
  return { amount: expense.amount, occurredAt: expense.occurredAt.toDate() };
}

function writeAnalyticsDelta(trx: FirestoreWriteTransaction, delta: AnalyticsDelta) {
  const overview = delta.overview;
  trx.set(doc(db, 'analytics', 'overview'), {
    inTotal: increment(overview.inTotal),
    outTotal: increment(overview.outTotal),
    balance: increment(overview.balance),
    transactionCount: increment(overview.transactionCount),
    expenseCount: increment(overview.expenseCount),
    schemaVersion: 1,
    updatedAt: serverTimestamp()
  }, { merge: true });

  for (const [monthKey, month] of Object.entries(delta.months)) {
    const [year, monthNumber] = monthKey.split('-').map(Number);
    const outByProduct = Object.fromEntries(
      Object.entries(month.outByProduct).map(([productId, product]) => [
        productId,
        { quantity: increment(product.quantity), amount: increment(product.amount) }
      ])
    );
    trx.set(doc(db, 'analyticsMonths', monthKey), {
      monthKey,
      year,
      month: monthNumber,
      inAmount: increment(month.inAmount),
      outAmount: increment(month.outAmount),
      expenseAmount: increment(month.expenseAmount),
      ...(Object.keys(outByProduct).length > 0 ? { outByProduct } : {}),
      schemaVersion: 1,
      updatedAt: serverTimestamp()
    }, { merge: true });
  }
}

function mapOrderProductDoc(id: string, data: DocumentData): OrderProduct {
  return {
    id,
    name: String(data.name ?? ''),
    spec: Number(data.spec ?? 0),
    price: Number(data.price ?? 0)
  };
}

function mapCustomerOrderDoc(id: string, data: DocumentData): CustomerOrder {
  const items = Array.isArray(data.items)
    ? data.items.map((item): CustomerOrderItem => ({
        productId: String(item?.productId ?? ''),
        productName: String(item?.productName ?? ''),
        spec: Number(item?.spec ?? 0),
        unitPrice: Number(item?.unitPrice ?? 0),
        boxes: Number(item?.boxes ?? 0),
        quantity: Number(item?.quantity ?? 0),
        subtotal: Number(item?.subtotal ?? 0)
      }))
    : [];
  const totalAmount = Number(data.totalAmount ?? 0);
  const isUnpaid = normalizeCustomerOrderUnpaid(data.isUnpaid);

  return {
    id,
    customerName: String(data.customerName ?? ''),
    orderDate: String(data.orderDate ?? ''),
    isUnpaid,
    paidAmount: normalizeCustomerOrderPaidAmount(data.paidAmount, isUnpaid, totalAmount),
    hasDebtHistory: normalizeCustomerOrderDebtHistory(data.hasDebtHistory),
    items,
    totalAmount,
    operatorUid: String(data.operatorUid ?? ''),
    createdAt: requireTimestamp(data.createdAt, 'customerOrders.createdAt'),
    inventorySyncId: typeof data.inventorySyncId === 'string' ? data.inventorySyncId : undefined
  };
}

function mapCustomerOrderSyncDoc(id: string, data: DocumentData): CustomerOrderSync {
  return {
    id,
    orderDate: String(data.orderDate ?? id),
    orderIds: Array.isArray(data.orderIds) ? data.orderIds.map(String) : [],
    transactionIds: Array.isArray(data.transactionIds) ? data.transactionIds.map(String) : [],
    lines: Array.isArray(data.lines) ? data.lines.map((line) => ({
      transactionId: String(line?.transactionId ?? ''),
      productId: String(line?.productId ?? ''),
      productName: String(line?.productName ?? ''),
      quantity: Number(line?.quantity ?? 0),
      amount: Number(line?.amount ?? 0),
      unitPrice: Number(line?.unitPrice ?? 0)
    })) : [],
    operatorUid: String(data.operatorUid ?? ''),
    createdAt: requireTimestamp(data.createdAt, 'customerOrderSyncs.createdAt')
  };
}

function mapOrderCashCountDoc(id: string, data: DocumentData): OrderCashCount {
  const counts = normalizeCashCounts(data.counts);
  return {
    id,
    recordDate: String(data.recordDate ?? id),
    counts,
    totalAmount: calculateCashTotal(counts),
    operatorUid: String(data.operatorUid ?? ''),
    createdAt: requireTimestamp(data.createdAt, 'orderCashCounts.createdAt'),
    updatedAt: requireTimestamp(data.updatedAt, 'orderCashCounts.updatedAt')
  };
}

function mapOrderDailyExpenseDoc(id: string, data: DocumentData): OrderDailyExpense {
  return {
    id,
    expenseDate: String(data.expenseDate ?? ''),
    amount: Number(data.amount ?? 0),
    remark: String(data.remark ?? ''),
    operatorUid: String(data.operatorUid ?? ''),
    createdAt: requireTimestamp(data.createdAt, 'orderDailyExpenses.createdAt'),
    updatedAt: requireTimestamp(data.updatedAt, 'orderDailyExpenses.updatedAt')
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
  const [orderProducts, setOrderProducts] = useState<OrderProduct[]>([]);
  const [customerOrders, setCustomerOrders] = useState<CustomerOrder[]>([]);
  const [customerOrderSync, setCustomerOrderSync] = useState<CustomerOrderSync | null>(null);
  const [orderCashCounts, setOrderCashCounts] = useState<OrderCashCount[]>([]);
  const [orderDailyExpenses, setOrderDailyExpenses] = useState<OrderDailyExpense[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [analyticsOverview, setAnalyticsOverview] = useState<AnalyticsOverview | null>(null);
  const [analyticsMonths, setAnalyticsMonths] = useState<AnalyticsMonth[]>([]);
  const [currentView, setCurrentView] = useState<View>('home');
  const [inventoryComparisonMode, setInventoryComparisonMode] = useState<'week' | 'month'>('week');
  const [reportPeriod, setReportPeriod] = useState<ReportPeriod>('day');
  
  const [selectedDate, setSelectedDate] = useState(getTogoDate());
  const [selectedWeek, setSelectedWeek] = useState(getTogoWeek()); 
  const [selectedMonth, setSelectedMonth] = useState(getTogoMonth());
  const [reportStartDate, setReportStartDate] = useState(getTogoDate());
  const [reportEndDate, setReportEndDate] = useState(getTogoDate());
  const [dashboardHotMonth, setDashboardHotMonth] = useState(getTogoMonth());
  const [customerOrdersDate, setCustomerOrdersDate] = useState(getTogoDate());
  const [accountingDate, setAccountingDate] = useState(getTogoDate());
  const [adminOrderAccountingDate, setAdminOrderAccountingDate] = useState(getTogoDate());
  const [expenseFilterMonth, setExpenseFilterMonth] = useState(getTogoMonth());
  const [stockHistoryRequest, setStockHistoryRequest] = useState(() => ({
    startDate: getTogoDate(),
    endDate: getTogoDate(),
    productId: '',
    allTime: false
  }));
  
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastIdRef = useRef(0);
  const [loading, setLoading] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isDeletingTransaction, setIsDeletingTransaction] = useState(false);
  const deletingTransactionRef = useRef(false);
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
    const builtInRoles: Record<string, User['role']> = {
      'admin@topstar.com': 'admin',
      'staff@topstar.com': 'staff',
      'order@topstar.com': 'order'
    };
    const clearLocalSession = () => {
      setUser(null);
      setProducts([]);
      setOrderProducts([]);
      setCustomerOrders([]);
      setCustomerOrderSync(null);
      setOrderCashCounts([]);
      setOrderDailyExpenses([]);
      setTransactions([]);
      setExpenses([]);
      setDebts([]);
      setAnalyticsOverview(null);
      setAnalyticsMonths([]);
    };

    // Set persistence to session-based (requires re-login after closing browser)
    setPersistence(auth, browserSessionPersistence)
      .then(() => {
        unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          if (!firebaseUser) {
            clearLocalSession();
            setLoading(false);
            return;
          }

          try {
            const email = (firebaseUser.email ?? '').toLowerCase();
            const profileSnap = await getDoc(doc(db, 'users', firebaseUser.uid));
            const profileRole = profileSnap.exists() ? profileSnap.data().role : null;
            const role = profileRole === 'admin' || profileRole === 'staff' || profileRole === 'order'
              ? profileRole
              : builtInRoles[email];

            if (!role) {
              clearLocalSession();
              showToast('账号未配置权限，请先在用户表配置角色', 'error');
              await signOut(auth);
              return;
            }

            setUser({
              uid: firebaseUser.uid,
              username: firebaseUser.email?.split('@')[0] || firebaseUser.uid,
              role
            });
            setCurrentView('home');
          } catch (error) {
            handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
            clearLocalSession();
            await signOut(auth);
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
    if (!user || !auth.currentUser) return;

    if (user.role === 'order') {
      const unsubscribeOrderProducts = onSnapshot(
        collection(db, 'orderCatalog'),
        (snapshot) => {
          const catalog = snapshot.docs
            .map((itemDoc) => mapOrderProductDoc(itemDoc.id, itemDoc.data()))
            .sort((a, b) => a.name.localeCompare(b.name));
          setOrderProducts(catalog);
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, 'orderCatalog');
        }
      );
      return unsubscribeOrderProducts;
    }

    const unsubscribeProducts = onSnapshot(collection(db, 'products'),
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

    const unsubscribeOverview = onSnapshot(
      doc(db, 'analytics', 'overview'),
      (snapshot) => {
        setAnalyticsOverview(snapshot.exists() ? mapAnalyticsOverview(snapshot.data()) : null);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'analytics/overview');
      }
    );
    const unsubscribeMonths = onSnapshot(
      collection(db, 'analyticsMonths'),
      (snapshot) => {
        setAnalyticsMonths(snapshot.docs.map((itemDoc) => mapAnalyticsMonth(itemDoc.id, itemDoc.data())));
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'analyticsMonths');
      }
    );

    return () => {
      unsubscribeProducts();
      unsubscribeOverview();
      unsubscribeMonths();
    };
  }, [user]);

  // --- Toast Logic ---
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    toastIdRef.current += 1;
    const id = toastIdRef.current;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  // --- Computed Data ---
  const stats = useMemo(() => {
    return analyticsOverview ?? {
      inTotal: IN_TOTAL_BASELINE_VALUE,
      outTotal: 0,
      balance: IN_TOTAL_BASELINE_VALUE
    };
  }, [analyticsOverview]);

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
      lastSaleByProduct[product.id] = product.lastOutAt?.toDate() ?? null;
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

  const handleViewChange = (nextView: View) => {
    if (user?.role === 'order') {
      if (nextView === 'home' || nextView === 'order-entry' || nextView === 'order-accounting' || nextView === 'order-debts') {
        setCurrentView(nextView);
      }
      return;
    }
    if (nextView === 'order-entry') return;
    if (nextView === 'customer-orders' && user?.role !== 'admin') return;
    setCurrentView(nextView);
  };

  useEffect(() => {
    if (user?.role === 'order' && currentView !== 'home' && currentView !== 'order-entry' && currentView !== 'order-accounting' && currentView !== 'order-debts') {
      setCurrentView('home');
      return;
    }
    if (user?.role !== 'order' && currentView === 'order-entry') {
      setCurrentView('home');
      return;
    }
    if (user?.role !== 'admin' && currentView === 'customer-orders') {
      setCurrentView('home');
    }
  }, [currentView, user?.role]);

  const weeklySalesPeriods = useMemo<SalesPeriodData>(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const periods: SalesPeriodWindow[] = [];
    let periodStart = monthStart;

    while (periodStart < nextMonthStart) {
      const day = periodStart.getDay();
      const daysToNextMonday = day === 0 ? 1 : 8 - day;
      const nextMonday = new Date(periodStart);
      nextMonday.setDate(nextMonday.getDate() + daysToNextMonday);
      const periodEnd = nextMonday < nextMonthStart ? nextMonday : nextMonthStart;
      const finalDay = new Date(periodEnd);
      finalDay.setDate(finalDay.getDate() - 1);
      const weekNumber = periods.length + 1;

      periods.push({
        key: `${now.getFullYear()}-${now.getMonth() + 1}-W${weekNumber}`,
        label: `第${weekNumber}周 ${periodStart.getMonth() + 1}/${periodStart.getDate()}-${finalDay.getMonth() + 1}/${finalDay.getDate()}`,
        start: periodStart,
        end: periodEnd
      });
      periodStart = periodEnd;
    }

    return buildSalesPeriodData(
      `${now.getFullYear()}年${now.getMonth() + 1}月每周销量`,
      activeProducts,
      transactions,
      periods
    );
  }, [activeProducts, transactions]);

  const monthlySalesPeriods = useMemo<SalesPeriodData>(() => {
    const now = new Date();
    const months = Array.from({ length: now.getMonth() + 1 }, (_, index) => `${now.getFullYear()}-${String(index + 1).padStart(2, '0')}`);
    const summaries = new Map(analyticsMonths.map((item) => [item.monthKey, item]));
    return {
      title: `${now.getFullYear()}年月度销量`,
      columns: months.map((key, index) => ({ key, label: `${index + 1}月` })),
      rows: activeProducts.map((product) => ({
        productId: product.id,
        name: product.name,
        boxesByPeriod: months.map((key) => (summaries.get(key)?.outByProduct[product.id]?.quantity ?? 0) / (product.spec || 1))
      })).sort((left, right) => (
        right.boxesByPeriod.reduce((sum, value) => sum + value, 0) - left.boxesByPeriod.reduce((sum, value) => sum + value, 0) ||
        left.name.localeCompare(right.name)
      ))
    };
  }, [activeProducts, analyticsMonths]);

  const totalOutQuantityByProduct = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const month of analyticsMonths) {
      for (const [productId, aggregate] of Object.entries(month.outByProduct)) {
        totals[productId] = (totals[productId] ?? 0) + aggregate.quantity;
      }
    }
    return totals;
  }, [analyticsMonths]);

  const currentReportRange = useMemo(() => {
    return getRangeByPeriod(
      reportPeriod,
      selectedDate,
      selectedWeek,
      selectedMonth,
      reportStartDate,
      reportEndDate
    );
  }, [reportPeriod, selectedDate, selectedWeek, selectedMonth, reportStartDate, reportEndDate]);

  useEffect(() => {
    if (!user || !auth.currentUser) return;
    const unsubscribers: Array<() => void> = [];
    const listenTransactions = (sourceQuery: ReturnType<typeof query>) => {
      unsubscribers.push(onSnapshot(sourceQuery, (snapshot) => {
        setTransactions(snapshot.docs
          .map((itemDoc) => mapTransactionDoc(itemDoc.id, itemDoc.data()))
          .sort((left, right) => right.occurredAt.toMillis() - left.occurredAt.toMillis()));
      }, (error) => handleFirestoreError(error, OperationType.GET, 'transactions')));
    };
    const listenCustomerOrders = (sourceQuery: ReturnType<typeof query>) => {
      unsubscribers.push(onSnapshot(sourceQuery, (snapshot) => {
        setCustomerOrders(snapshot.docs
          .map((itemDoc) => mapCustomerOrderDoc(itemDoc.id, itemDoc.data()))
          .sort((left, right) => (
            right.orderDate.localeCompare(left.orderDate) ||
            right.createdAt.toMillis() - left.createdAt.toMillis()
          )));
      }, (error) => handleFirestoreError(error, OperationType.GET, 'customerOrders')));
    };

    setTransactions([]);
    setExpenses([]);
    setDebts([]);
    setCustomerOrders([]);
    setCustomerOrderSync(null);

    if (user.role === 'order') {
      if (currentView === 'order-debts') {
        listenCustomerOrders(query(collection(db, 'customerOrders'), where('hasDebtHistory', '==', true)));
      } else if (currentView === 'order-entry') {
        listenCustomerOrders(query(collection(db, 'customerOrders'), where('orderDate', '==', customerOrdersDate)));
      }
      return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
    }

    if (currentView === 'home') {
      listenTransactions(query(
        collection(db, 'transactions'),
        where('occurredAt', '>=', Timestamp.fromDate(currentReportRange.start)),
        where('occurredAt', '<=', Timestamp.fromDate(currentReportRange.end)),
        orderBy('occurredAt', 'desc')
      ));
      unsubscribers.push(onSnapshot(query(
        collection(db, 'expenses'),
        where('occurredAt', '>=', Timestamp.fromDate(currentReportRange.start)),
        where('occurredAt', '<=', Timestamp.fromDate(currentReportRange.end)),
        orderBy('occurredAt', 'desc')
      ), (snapshot) => setExpenses(snapshot.docs.map((itemDoc) => mapExpenseDoc(itemDoc.id, itemDoc.data()))),
      (error) => handleFirestoreError(error, OperationType.GET, 'expenses')));
    } else if (currentView === 'stock') {
      if (stockHistoryRequest.allTime) {
        listenTransactions(stockHistoryRequest.productId
          ? query(collection(db, 'transactions'), where('productId', '==', stockHistoryRequest.productId), orderBy('occurredAt', 'desc'))
          : query(collection(db, 'transactions'), orderBy('occurredAt', 'desc')));
      } else {
        const start = timestampFromDateInput(stockHistoryRequest.startDate);
        const endDate = new Date(`${stockHistoryRequest.endDate}T23:59:59.999`);
        listenTransactions(stockHistoryRequest.productId
          ? query(
              collection(db, 'transactions'),
              where('productId', '==', stockHistoryRequest.productId),
              where('occurredAt', '>=', start),
              where('occurredAt', '<=', Timestamp.fromDate(endDate)),
              orderBy('occurredAt', 'desc')
            )
          : query(
              collection(db, 'transactions'),
              where('occurredAt', '>=', start),
              where('occurredAt', '<=', Timestamp.fromDate(endDate)),
              orderBy('occurredAt', 'desc')
            ));
      }
    } else if (currentView.startsWith('inventory-')) {
      const lookbackStart = new Date();
      lookbackStart.setHours(0, 0, 0, 0);
      lookbackStart.setDate(lookbackStart.getDate() - 30);
      listenTransactions(query(
        collection(db, 'transactions'),
        where('occurredAt', '>=', Timestamp.fromDate(lookbackStart)),
        orderBy('occurredAt', 'desc')
      ));
    } else if (currentView === 'expenses') {
      const range = getRangeByMonth(expenseFilterMonth);
      unsubscribers.push(onSnapshot(query(
        collection(db, 'expenses'),
        where('occurredAt', '>=', Timestamp.fromDate(range.start)),
        where('occurredAt', '<=', Timestamp.fromDate(range.end)),
        orderBy('occurredAt', 'desc')
      ), (snapshot) => setExpenses(snapshot.docs.map((itemDoc) => mapExpenseDoc(itemDoc.id, itemDoc.data()))),
      (error) => handleFirestoreError(error, OperationType.GET, 'expenses')));
      listenCustomerOrders(query(
        collection(db, 'customerOrders'),
        where('orderDate', '==', adminOrderAccountingDate)
      ));
    } else if (currentView === 'customer-orders' && user.role === 'admin') {
      listenCustomerOrders(query(collection(db, 'customerOrders'), where('orderDate', '==', customerOrdersDate)));
      unsubscribers.push(onSnapshot(doc(db, 'customerOrderSyncs', customerOrdersDate), (snapshot) => {
        setCustomerOrderSync(snapshot.exists() ? mapCustomerOrderSyncDoc(snapshot.id, snapshot.data()) : null);
      }, (error) => handleFirestoreError(error, OperationType.GET, `customerOrderSyncs/${customerOrdersDate}`)));
    } else if (currentView === 'debts') {
      unsubscribers.push(onSnapshot(
        query(collection(db, 'debts'), orderBy('occurredAt', 'desc')),
        (snapshot) => setDebts(snapshot.docs.map((itemDoc) => mapDebtDoc(itemDoc.id, itemDoc.data()))),
        (error) => handleFirestoreError(error, OperationType.GET, 'debts')
      ));
      if (user.role === 'admin') {
        listenCustomerOrders(query(collection(db, 'customerOrders'), where('hasDebtHistory', '==', true)));
      }
    }

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [user, currentView, currentReportRange, customerOrdersDate, adminOrderAccountingDate, expenseFilterMonth, stockHistoryRequest]);

  useEffect(() => {
    setOrderCashCounts([]);
    setOrderDailyExpenses([]);
    if (!user || !auth.currentUser) return;
    const isOrderAccounting = user.role === 'order' && currentView === 'order-accounting';
    const isAdminAccounting = user.role === 'admin' && currentView === 'expenses';
    if (!isOrderAccounting && !isAdminAccounting) return;

    const selectedAccountingDate = isAdminAccounting ? adminOrderAccountingDate : accountingDate;
    const unsubscribeCash = onSnapshot(doc(db, 'orderCashCounts', selectedAccountingDate), (snapshot) => {
      setOrderCashCounts(snapshot.exists() ? [mapOrderCashCountDoc(snapshot.id, snapshot.data())] : []);
    }, (error) => handleFirestoreError(error, OperationType.GET, `orderCashCounts/${selectedAccountingDate}`));
    const unsubscribeExpenses = onSnapshot(
      query(collection(db, 'orderDailyExpenses'), where('expenseDate', '==', selectedAccountingDate)),
      (snapshot) => setOrderDailyExpenses(snapshot.docs
        .map((itemDoc) => mapOrderDailyExpenseDoc(itemDoc.id, itemDoc.data()))
        .sort((left, right) => right.createdAt.toMillis() - left.createdAt.toMillis())),
      (error) => handleFirestoreError(error, OperationType.GET, 'orderDailyExpenses')
    );
    return () => {
      unsubscribeCash();
      unsubscribeExpenses();
    };
  }, [user, currentView, accountingDate, adminOrderAccountingDate]);

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
    const previousMonth = getPreviousMonth(selectedMonth);
    const summaries = new Map(analyticsMonths.map((item) => [item.monthKey, item]));
    const currentSummary = summaries.get(selectedMonth);
    const previousSummary = summaries.get(previousMonth);
    const currentMonthSales = currentSummary?.outAmount ?? 0;
    const previousMonthSales = previousSummary?.outAmount ?? 0;
    const currentMonthExpenses = currentSummary?.expenseAmount ?? 0;
    const previousMonthExpenses = previousSummary?.expenseAmount ?? 0;

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
  }, [selectedMonth, analyticsMonths, warnings.length, staleProducts.length]);

  const dashboardMetrics = useMemo<DashboardMetrics>(() => {
    const now = new Date();
    const selectedYear = now.getFullYear();
    const currentMonthIndex = now.getMonth();
    const selectedMonthKey = `${selectedYear}-${`${currentMonthIndex + 1}`.padStart(2, '0')}`;

    const summaryByMonth = new Map(analyticsMonths.map((item) => [item.monthKey, item]));
    const monthlyBuckets = Array.from({ length: currentMonthIndex + 1 }, (_, monthIndex) => {
      const monthKey = `${selectedYear}-${`${monthIndex + 1}`.padStart(2, '0')}`;
      return {
        monthKey,
        monthLabel: `${monthIndex + 1}月`,
        salesTotal: summaryByMonth.get(monthKey)?.outAmount ?? 0
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
    const hotMonthByProduct = new Map<string, ProductAggItem>();

    const hotMonth = summaryByMonth.get(dashboardHotMonth);
    for (const [productId, aggregate] of Object.entries(hotMonth?.outByProduct ?? {})) {
      const product = productById.get(productId);
      const spec = product && product.spec > 0 ? product.spec : 1;
      hotMonthByProduct.set(productId, {
        productId,
        productName: product?.name || '未知商品',
        spec,
        amount: aggregate.amount,
        quantity: aggregate.quantity,
        boxes: aggregate.quantity / spec
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

    const currentMonthProducts = [...hotMonthByProduct.values()];
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
      hotMonthKey: dashboardHotMonth,
      monthlySalesSeries,
      monthlyMomSeries,
      currentMonthSalesTotal,
      currentMonthSalesMoM,
      hotByAmount,
      hotByVolume
    };
  }, [analyticsMonths, products, dashboardHotMonth]);

  // --- Actions ---
  const handleLogin = async (username: string, pass: string) => {
    const normalized = username.trim().toLowerCase();
    try {
      const emailAliasMap: Record<string, string> = {
        admin: 'admin@topstar.com',
        staff: 'staff@topstar.com',
        order: 'order@topstar.com'
      };
      const email = emailAliasMap[normalized] ?? normalized;
      await signInWithEmailAndPassword(auth, email, pass);
      showToast(email === 'order@topstar.com' ? 'Connexion réussie' : '登录成功');
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
    const isOrderUser = user?.role === 'order';
    try {
      await signOut(auth);
      showToast(isOrderUser ? 'Déconnexion réussie' : '已退出登录');
    } catch (error) {
      showToast(isOrderUser ? 'Échec de la déconnexion' : '退出失败', 'error');
    }
  };

  const createCustomerOrder = async ({
    customerName,
    orderDate,
    isUnpaid,
    items
  }: {
    customerName: string;
    orderDate: string;
    isUnpaid: boolean;
    items: CustomerOrderItem[];
  }) => {
    if (user?.role !== 'order') {
      showToast('权限不足', 'error');
      return false;
    }
    if (!auth.currentUser?.uid) {
      showToast('Session expirée, veuillez vous reconnecter', 'error');
      return false;
    }

    const normalizedCustomerName = customerName.trim();
    if (!normalizedCustomerName || normalizedCustomerName.length > 100) {
      showToast('Saisissez un nom de client valide', 'error');
      return false;
    }
    if (!isOrderDate(orderDate)) {
      showToast('Sélectionnez une date valide', 'error');
      return false;
    }
    if (items.length === 0 || items.length > 100) {
      showToast('Ajoutez au moins un produit', 'error');
      return false;
    }
    const totalAmount = items.reduce((sum, item) => sum + item.subtotal, 0);

    try {
      await addDoc(collection(db, 'customerOrders'), {
        customerName: normalizedCustomerName,
        orderDate,
        isUnpaid,
        paidAmount: isUnpaid ? 0 : totalAmount,
        hasDebtHistory: isUnpaid,
        items,
        totalAmount,
        operatorUid: auth.currentUser.uid,
        createdAt: Timestamp.now()
      });
      showToast('Commande enregistrée');
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'customerOrders');
      showToast('Échec de l’enregistrement de la commande', 'error');
      return false;
    }
  };

  const updateCustomerOrder = async (
    orderId: string,
    customerName: string,
    items: CustomerOrderItem[],
    isUnpaid: boolean,
    paidAmount: number
  ) => {
    if (user?.role !== 'admin' && user?.role !== 'order') {
      showToast('权限不足', 'error');
      return false;
    }
    const currentUid = auth.currentUser?.uid;
    if (!currentUid) {
      showToast(user.role === 'order' ? 'Session expirée, veuillez vous reconnecter' : '登录已失效，请重新登录', 'error');
      return false;
    }

    const normalizedCustomerName = customerName.trim();
    if (!normalizedCustomerName || normalizedCustomerName.length > 100 || items.length === 0 || items.length > 100) {
      showToast(user.role === 'order' ? 'Commande invalide' : '订单内容不完整', 'error');
      return false;
    }
    const totalAmount = items.reduce((sum, item) => sum + item.subtotal, 0);
    if (!Number.isFinite(totalAmount) || totalAmount < 0 || !Number.isFinite(paidAmount) || paidAmount < 0 || !Number.isInteger(paidAmount)) {
      showToast(user.role === 'order' ? 'Commande invalide' : '订单金额无效', 'error');
      return false;
    }

    try {
      const orderRef = doc(db, 'customerOrders', orderId);
      const orderSnapshot = await getDoc(orderRef);
      if (!orderSnapshot.exists()) {
        showToast(user.role === 'order' ? 'Commande introuvable' : '订单不存在', 'error');
        return false;
      }
      const existingOrder = mapCustomerOrderDoc(orderSnapshot.id, orderSnapshot.data());
      if (user.role === 'order' && existingOrder.operatorUid !== currentUid) {
        showToast('Vous ne pouvez modifier que vos commandes', 'error');
        return false;
      }
      const inventoryDetailsChanged = existingOrder.customerName !== normalizedCustomerName ||
        existingOrder.totalAmount !== totalAmount ||
        JSON.stringify(existingOrder.items) !== JSON.stringify(items);
      if (existingOrder.inventorySyncId && inventoryDetailsChanged) {
        showToast(user.role === 'order' ? 'La synchronisation doit être annulée par l’administrateur avant modification' : '该订单已同步出库，请先撤销当天同步', 'error');
        return false;
      }

      const normalizedPaidAmount = isUnpaid ? 0 : paidAmount;
      const hasDebtHistory = existingOrder.hasDebtHistory ||
        isCustomerOrderDebt(existingOrder) ||
        isUnpaid ||
        normalizedPaidAmount < totalAmount;

      await updateDoc(orderRef, {
        customerName: normalizedCustomerName,
        items,
        totalAmount,
        isUnpaid,
        paidAmount: normalizedPaidAmount,
        hasDebtHistory
      });
      showToast(user.role === 'order' ? 'Commande modifiée' : '订单已更新');
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `customerOrders/${orderId}`);
      showToast(user.role === 'order' ? 'Échec de la modification' : '订单更新失败', 'error');
      return false;
    }
  };

  const deleteCustomerOrder = async (orderId: string) => {
    if (user?.role !== 'admin' && user?.role !== 'order') {
      showToast('权限不足', 'error');
      return false;
    }
    const currentUid = auth.currentUser?.uid;
    if (!currentUid) {
      showToast(user.role === 'order' ? 'Session expirée, veuillez vous reconnecter' : '登录已失效，请重新登录', 'error');
      return false;
    }

    const existingOrder = customerOrders.find((order) => order.id === orderId);
    if (user.role === 'order' && existingOrder?.operatorUid !== currentUid) {
      showToast('Vous ne pouvez supprimer que vos commandes', 'error');
      return false;
    }
    if (existingOrder?.inventorySyncId) {
      showToast(user.role === 'order' ? 'La synchronisation doit être annulée par l’administrateur avant suppression' : '该订单已同步出库，请先撤销当天同步', 'error');
      return false;
    }

    try {
      await deleteDoc(doc(db, 'customerOrders', orderId));
      showToast(user.role === 'order' ? 'Commande supprimée' : '订单已删除');
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `customerOrders/${orderId}`);
      showToast(user.role === 'order' ? 'Échec de la suppression' : '订单删除失败', 'error');
      return false;
    }
  };

  const syncCustomerOrdersToInventory = async (orderDate: string) => {
    if (user?.role !== 'admin' || !auth.currentUser?.uid) {
      showToast('仅管理员可以同步客户订单', 'error');
      return false;
    }
    if (!isOrderDate(orderDate)) {
      showToast('同步日期无效', 'error');
      return false;
    }

    try {
      const initialOrders = await getDocs(query(collection(db, 'customerOrders'), where('orderDate', '==', orderDate)));
      if (initialOrders.empty) {
        showToast('该日期没有可同步的客户订单', 'error');
        return false;
      }
      const orderRefs = initialOrders.docs.map((snapshot) => snapshot.ref);
      const syncRef = doc(db, 'customerOrderSyncs', orderDate);
      const operatorUid = auth.currentUser.uid;
      const occurredAt = Timestamp.fromDate(new Date(`${orderDate}T12:00:00.000Z`));

      const result = await runTransaction(db, async (trx) => {
        const syncSnapshot = await trx.get(syncRef);
        if (syncSnapshot.exists()) throw new Error('该日期已经同步，请勿重复操作');

        const orderSnapshots = await Promise.all(orderRefs.map((orderRef) => trx.get(orderRef)));
        const orders = orderSnapshots.map((snapshot) => {
          if (!snapshot.exists()) throw new Error('同步期间订单发生变化，请重试');
          const order = mapCustomerOrderDoc(snapshot.id, snapshot.data());
          if (order.orderDate !== orderDate) throw new Error('订单日期不一致，无法同步');
          if (order.inventorySyncId) throw new Error('存在已同步订单，请先撤销原同步');
          return order;
        });
        const lines = aggregateCustomerOrdersForInventory(orders);
        if (lines.length === 0) throw new Error('订单中没有可同步的商品');
        if (orders.length + lines.length * 2 + 4 > 450) throw new Error('该日期订单过多，请联系管理员分批处理');

        const productRefs = lines.map((line) => doc(db, 'products', line.productId));
        const productSnapshots = await Promise.all(productRefs.map((productRef) => trx.get(productRef)));
        const transactionRefs = lines.map(() => doc(collection(db, 'transactions')));
        const transactionsToCreate: Transaction[] = [];

        lines.forEach((line, index) => {
          const productSnapshot = productSnapshots[index];
          if (!productSnapshot.exists()) throw new Error(`商品“${line.productName}”不存在`);
          const product = mapProductDoc(productSnapshot.id, productSnapshot.data());
          if (!product.isActive) throw new Error(`商品“${product.name}”已下架，无法同步`);
          if (product.stock < line.quantity) {
            throw new Error(`商品“${product.name}”库存不足，需要 ${formatStock(line.quantity, product.spec)}，当前 ${formatStock(product.stock, product.spec)}`);
          }
          const currentLastOutAt = product.lastOutAt instanceof Timestamp ? product.lastOutAt : null;
          trx.update(productRefs[index], {
            stock: product.stock - line.quantity,
            lastOutAt: !currentLastOutAt || occurredAt.toMillis() > currentLastOutAt.toMillis() ? occurredAt : currentLastOutAt
          });
          const transactionData = {
            productId: line.productId,
            type: 'out' as const,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            occurredAt,
            operatorUid,
            remark: `客户订单同步 ${orderDate}（${orders.length} 张订单）`,
            sourceOrderSyncId: orderDate
          };
          trx.set(transactionRefs[index], transactionData);
          transactionsToCreate.push({ id: transactionRefs[index].id, ...transactionData });
        });

        orderRefs.forEach((orderRef) => trx.update(orderRef, { inventorySyncId: orderDate }));
        const syncLines = lines.map((line, index) => ({ ...line, transactionId: transactionRefs[index].id }));
        trx.set(syncRef, {
          orderDate,
          orderIds: orders.map((order) => order.id),
          transactionIds: transactionRefs.map((transactionRef) => transactionRef.id),
          lines: syncLines,
          operatorUid,
          createdAt: Timestamp.now()
        });
        writeAnalyticsDelta(trx, buildAnalyticsDelta({
          afterTransactions: transactionsToCreate.map(analyticsTransactionInput)
        }));
        return { orderCount: orders.length, productCount: lines.length };
      });

      showToast(`同步完成：${result.orderCount} 张订单，生成 ${result.productCount} 条出库流水`);
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `customerOrderSyncs/${orderDate}`);
      showToast(error instanceof Error ? error.message : '客户订单同步失败', 'error');
      return false;
    }
  };

  const undoCustomerOrdersInventorySync = async (orderDate: string) => {
    if (user?.role !== 'admin' || !auth.currentUser?.uid) {
      showToast('仅管理员可以撤销同步', 'error');
      return false;
    }
    try {
      const syncRef = doc(db, 'customerOrderSyncs', orderDate);
      const initialSyncSnapshot = await getDoc(syncRef);
      if (!initialSyncSnapshot.exists()) throw new Error('该日期没有可撤销的同步记录');
      const initialSync = mapCustomerOrderSyncDoc(initialSyncSnapshot.id, initialSyncSnapshot.data());
      const initialProductIds = [...new Set(initialSync.lines.map((line) => line.productId))];
      const previousLastOutEntries = await Promise.all(initialProductIds.map(async (productId) => {
        const latest = await getDocs(query(
          collection(db, 'transactions'),
          where('productId', '==', productId),
          where('type', '==', 'out'),
          orderBy('occurredAt', 'desc'),
          limit(2)
        ));
        const previous = latest.docs
          .map((snapshot) => mapTransactionDoc(snapshot.id, snapshot.data()))
          .find((transaction) => transaction.sourceOrderSyncId !== orderDate);
        return [productId, previous?.occurredAt ?? null] as const;
      }));
      const previousLastOutByProduct = new Map(previousLastOutEntries);

      await runTransaction(db, async (trx) => {
        const syncSnapshot = await trx.get(syncRef);
        if (!syncSnapshot.exists()) throw new Error('该日期没有可撤销的同步记录');
        const syncRecord = mapCustomerOrderSyncDoc(syncSnapshot.id, syncSnapshot.data());
        const transactionRefs = syncRecord.transactionIds.map((id) => doc(db, 'transactions', id));
        const orderRefs = syncRecord.orderIds.map((id) => doc(db, 'customerOrders', id));
        const transactionSnapshots = await Promise.all(transactionRefs.map((transactionRef) => trx.get(transactionRef)));
        const orderSnapshots = await Promise.all(orderRefs.map((orderRef) => trx.get(orderRef)));
        const transactionsToDelete = transactionSnapshots.map((snapshot) => {
          if (!snapshot.exists()) throw new Error('同步流水不完整，撤销已停止');
          const transaction = mapTransactionDoc(snapshot.id, snapshot.data());
          if (transaction.sourceOrderSyncId !== orderDate || transaction.type !== 'out') throw new Error('同步流水校验失败，撤销已停止');
          return transaction;
        });
        const quantityByProduct = new Map<string, number>();
        for (const transaction of transactionsToDelete) {
          quantityByProduct.set(transaction.productId, (quantityByProduct.get(transaction.productId) ?? 0) + transaction.quantity);
        }
        const productIds = [...quantityByProduct.keys()];
        const productRefs = productIds.map((id) => doc(db, 'products', id));
        const productSnapshots = await Promise.all(productRefs.map((productRef) => trx.get(productRef)));

        productSnapshots.forEach((snapshot, index) => {
          if (!snapshot.exists()) throw new Error('关联商品不存在，撤销已停止');
          const product = mapProductDoc(snapshot.id, snapshot.data());
          const deletedTransaction = transactionsToDelete.find((transaction) => transaction.productId === productIds[index]);
          const currentLastOutIsDeleted = Boolean(
            deletedTransaction &&
            product.lastOutAt instanceof Timestamp &&
            product.lastOutAt.isEqual(deletedTransaction.occurredAt)
          );
          trx.update(productRefs[index], {
            stock: product.stock + (quantityByProduct.get(productIds[index]) ?? 0),
            lastOutAt: currentLastOutIsDeleted ? (previousLastOutByProduct.get(productIds[index]) ?? null) : (product.lastOutAt ?? null)
          });
        });
        transactionRefs.forEach((transactionRef) => trx.delete(transactionRef));
        orderSnapshots.forEach((snapshot, index) => {
          if (!snapshot.exists()) throw new Error('同步订单不完整，撤销已停止');
          const order = mapCustomerOrderDoc(snapshot.id, snapshot.data());
          if (order.inventorySyncId !== orderDate) throw new Error('订单同步状态不一致，撤销已停止');
          trx.update(orderRefs[index], { inventorySyncId: deleteField() });
        });
        trx.delete(syncRef);
        writeAnalyticsDelta(trx, buildAnalyticsDelta({
          beforeTransactions: transactionsToDelete.map(analyticsTransactionInput)
        }));
      });
      showToast('已撤销同步，库存和流水均已回滚');
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `customerOrderSyncs/${orderDate}`);
      showToast(error instanceof Error ? error.message : '撤销同步失败', 'error');
      return false;
    }
  };

  const saveOrderCashCount = async (recordDate: string, counts: CashDenominationCounts) => {
    if (user?.role !== 'order' || !auth.currentUser?.uid) {
      showToast('Session expirée, veuillez vous reconnecter', 'error');
      return false;
    }
    const countValues = Object.values(counts);
    if (!isOrderDate(recordDate) || countValues.some((count) => !Number.isInteger(count) || count < 0)) {
      showToast('Saisissez une caisse valide', 'error');
      return false;
    }

    try {
      const cashRef = doc(db, 'orderCashCounts', recordDate);
      const existingCash = await getDoc(cashRef);
      const now = Timestamp.now();
      const cashData = { recordDate, counts, totalAmount: calculateCashTotal(counts), updatedAt: now };
      if (existingCash.exists()) {
        await updateDoc(cashRef, cashData);
      } else {
        await setDoc(cashRef, { ...cashData, operatorUid: auth.currentUser.uid, createdAt: now });
      }
      showToast(existingCash.exists() ? 'Caisse modifiée' : 'Caisse enregistrée');
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `orderCashCounts/${recordDate}`);
      showToast('Échec de l’enregistrement de la caisse', 'error');
      return false;
    }
  };

  const deleteOrderCashCount = async (recordDate: string) => {
    if (user?.role !== 'order' || !auth.currentUser?.uid) {
      showToast('Session expirée, veuillez vous reconnecter', 'error');
      return false;
    }
    if (!isOrderDate(recordDate)) {
      showToast('Date de caisse invalide', 'error');
      return false;
    }

    try {
      await deleteDoc(doc(db, 'orderCashCounts', recordDate));
      showToast('Caisse supprimée');
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `orderCashCounts/${recordDate}`);
      showToast('Échec de la suppression de la caisse', 'error');
      return false;
    }
  };

  const createOrderDailyExpense = async (expenseDate: string, amount: number, remark: string) => {
    if (user?.role !== 'order' || !auth.currentUser?.uid) {
      showToast('Session expirée, veuillez vous reconnecter', 'error');
      return false;
    }
    const normalizedRemark = remark.trim();
    if (!isOrderDate(expenseDate) || !Number.isInteger(amount) || amount <= 0 || !normalizedRemark || normalizedRemark.length > 500) {
      showToast('Saisissez une dépense valide', 'error');
      return false;
    }

    try {
      const now = Timestamp.now();
      await addDoc(collection(db, 'orderDailyExpenses'), {
        expenseDate,
        amount,
        remark: normalizedRemark,
        operatorUid: auth.currentUser.uid,
        createdAt: now,
        updatedAt: now
      });
      showToast('Dépense enregistrée');
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'orderDailyExpenses');
      showToast('Échec de l’enregistrement de la dépense', 'error');
      return false;
    }
  };

  const updateOrderDailyExpense = async (expenseId: string, expenseDate: string, amount: number, remark: string) => {
    if (user?.role !== 'order' || !auth.currentUser?.uid) {
      showToast('Session expirée, veuillez vous reconnecter', 'error');
      return false;
    }
    const normalizedRemark = remark.trim();
    if (!isOrderDate(expenseDate) || !Number.isInteger(amount) || amount <= 0 || !normalizedRemark || normalizedRemark.length > 500) {
      showToast('Saisissez une dépense valide', 'error');
      return false;
    }

    try {
      await updateDoc(doc(db, 'orderDailyExpenses', expenseId), {
        expenseDate,
        amount,
        remark: normalizedRemark,
        updatedAt: Timestamp.now()
      });
      showToast('Dépense modifiée');
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orderDailyExpenses/${expenseId}`);
      showToast('Échec de la modification de la dépense', 'error');
      return false;
    }
  };

  const deleteOrderDailyExpense = async (expenseId: string) => {
    if (user?.role !== 'order' || !auth.currentUser?.uid) {
      showToast('Session expirée, veuillez vous reconnecter', 'error');
      return false;
    }
    try {
      await deleteDoc(doc(db, 'orderDailyExpenses', expenseId));
      showToast('Dépense supprimée');
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `orderDailyExpenses/${expenseId}`);
      showToast('Échec de la suppression de la dépense', 'error');
      return false;
    }
  };

  const addProduct = async (name: string, spec: number, price: number) => {
    if (user?.role !== 'admin') {
      showToast('权限不足', 'error');
      return false;
    }
    const normalizedName = name.trim();
    if (!normalizedName) {
      showToast('商品名不能为空', 'error');
      return false;
    }
    if (hasDuplicateProductName(products, normalizedName)) {
      showToast('商品名称已存在', 'error');
      return false;
    }
    try {
      const productRef = doc(collection(db, 'products'));
      const batch = writeBatch(db);
      const productData = {
        name: normalizedName,
        spec,
        price,
        stock: 0,
        isActive: true,
        createdAt: Timestamp.now(),
        lastOutAt: null
      };
      batch.set(productRef, productData);
      batch.set(doc(db, 'orderCatalog', productRef.id), {
        name: normalizedName,
        spec,
        price
      });
      await batch.commit();
      showToast('商品添加成功');
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'products');
      return false;
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
      if (hasDuplicateProductName(products, normalizedName, id)) {
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

      const isSpecChanging = nextSpec !== undefined && nextSpec !== targetProduct.spec;
      if (isSpecChanging) {
        const transactionSnapshot = await getDocs(query(
          collection(db, 'transactions'),
          where('productId', '==', id),
          limit(1)
        ));
        if (!transactionSnapshot.empty) {
          showToast('该商品已有历史流水，不能修改规格；请下架后新建商品', 'error');
          return false;
        }
      }

      const batch = writeBatch(db);
      batch.update(productRef, patch);
      const catalogChanged = normalizedName !== undefined || nextSpec !== undefined || nextPrice !== undefined;
      if (targetProduct.isActive && catalogChanged) {
        batch.set(doc(db, 'orderCatalog', id), {
          name: normalizedName ?? targetProduct.name,
          spec: nextSpec ?? targetProduct.spec,
          price: nextPrice ?? targetProduct.price
        });
      }
      await batch.commit();
      showToast('商品信息与库存修改成功');
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
      const batch = writeBatch(db);
      batch.update(doc(db, 'products', id), { isActive: nextActive });
      if (nextActive) {
        batch.set(doc(db, 'orderCatalog', id), {
          name: targetProduct.name,
          spec: targetProduct.spec,
          price: targetProduct.price
        });
      } else {
        batch.delete(doc(db, 'orderCatalog', id));
      }
      await batch.commit();
      showToast(nextActive ? '商品已重新上架' : '商品已下架（数据保留）');
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `products/${id}/isActive`);
      return false;
    }
  };

  const deleteProduct = async (id: string) => {
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
      const transactionSnapshot = await getDocs(query(
        collection(db, 'transactions'),
        where('productId', '==', id),
        limit(1)
      ));
      if (!transactionSnapshot.empty) {
        showToast('该商品已有流水，不能删除；如不再销售请使用下架', 'error');
        return false;
      }

      const batch = writeBatch(db);
      batch.delete(doc(db, 'products', id));
      batch.delete(doc(db, 'orderCatalog', id));
      await batch.commit();
      showToast(`商品“${targetProduct.name}”已删除`);
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `products/${id}`);
      showToast('商品删除失败，请稍后重试', 'error');
      return false;
    }
  };

  const refreshProductLastOutAt = async (productId: string) => {
    const latest = await getDocs(query(
      collection(db, 'transactions'),
      where('productId', '==', productId),
      where('type', '==', 'out'),
      orderBy('occurredAt', 'desc'),
      limit(1)
    ));
    await updateDoc(doc(db, 'products', productId), {
      lastOutAt: latest.empty ? null : mapTransactionDoc(latest.docs[0].id, latest.docs[0].data()).occurredAt
    });
  };

  const deleteTransaction = async (id: string) => {
    if (deletingTransactionRef.current) return;
    if (user?.role !== 'admin') {
      showToast('权限不足：只有管理员可以删除流水', 'error');
      return;
    }

    deletingTransactionRef.current = true;
    setIsDeletingTransaction(true);
    try {
      const transactionRef = doc(db, 'transactions', id);
      const result = await runTransaction(db, async (trx) => {
        const txSnap = await trx.get(transactionRef);
        if (!txSnap.exists()) throw new Error('目标流水不存在');
        const dbTx = mapTransactionDoc(txSnap.id, txSnap.data());
        if (dbTx.sourceOrderSyncId) throw new Error('该流水来自客户订单，请在客户订单页面撤销同步');
        const analyticsDelta = buildAnalyticsDelta({ beforeTransactions: [analyticsTransactionInput(dbTx)] });

        const productRef = doc(db, 'products', dbTx.productId);
        const prodSnap = await trx.get(productRef);
        if (!prodSnap.exists()) {
          trx.delete(transactionRef);
          writeAnalyticsDelta(trx, analyticsDelta);
          return { orphaned: true, productId: dbTx.productId, refreshLastOutAt: false };
        }
        const productData = prodSnap.data() as Product;
        const currentDbStock = Number(productData.stock ?? 0);
        const revertedStock = getStockAfterTransactionDeletion(
          currentDbStock,
          dbTx.type,
          dbTx.quantity
        );
        if (revertedStock < 0) {
          throw new Error('该入库流水对应的库存已被使用，删除后库存会变为负数，不能删除');
        }

        trx.update(productRef, {
          stock: revertedStock,
          ...(dbTx.type === 'out' && productData.lastOutAt instanceof Timestamp && productData.lastOutAt.isEqual(dbTx.occurredAt)
            ? { lastOutAt: null }
            : {})
        });
        trx.delete(transactionRef);
        writeAnalyticsDelta(trx, analyticsDelta);
        return {
          orphaned: false,
          productId: dbTx.productId,
          refreshLastOutAt: dbTx.type === 'out' && productData.lastOutAt instanceof Timestamp && productData.lastOutAt.isEqual(dbTx.occurredAt)
        };
      });
      if (result.refreshLastOutAt) await refreshProductLastOutAt(result.productId);
      showToast(
        result.orphaned ? '关联商品已不存在，流水已删除' : '流水已成功删除，库存已回滚',
        'success'
      );
      setConfirmDeleteId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `transactions/${id}`);
      const firestoreCode = typeof error === 'object' && error !== null && 'code' in error
        ? String(error.code)
        : '';
      const errorMessage = error instanceof Error ? error.message : '';
      showToast(
        firestoreCode === 'resource-exhausted' || errorMessage.includes('Quota exceeded')
          ? 'Firestore 今日读取额度已用完，请等待每日配额重置或升级计费方案'
          : (errorMessage || '流水删除失败，请稍后重试'),
        'error'
      );
    } finally {
      deletingTransactionRef.current = false;
      setIsDeletingTransaction(false);
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
      const occurredAt = Timestamp.now();
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

        const transactionData = {
          productId,
          type,
          quantity: totalQuantity,
          unitPrice: dbUnitPrice,
          occurredAt,
          operatorUid: auth.currentUser.uid,
          remark
        };
        trx.set(transactionRef, transactionData);
        trx.update(productRef, {
          stock: nextStock,
          ...(type === 'out' ? { lastOutAt: occurredAt } : {})
        });
        writeAnalyticsDelta(trx, buildAnalyticsDelta({
          afterTransactions: [analyticsTransactionInput({ id: transactionRef.id, ...transactionData })]
        }));
      });

      showToast(type === 'in' ? '入库成功' : '出库成功');
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'transactions/products');
      return false;
    }
  };

  const handleBatchOut = async (lines: BatchOutLine[], remark: string) => {
    if (user?.role !== 'admin') {
      showToast('权限不足', 'error');
      return false;
    }
    if (!auth.currentUser?.uid) {
      showToast('登录状态异常，请重新登录', 'error');
      return false;
    }
    if (lines.length === 0) {
      showToast('没有可出库数据', 'error');
      return false;
    }
    if (lines.some((line) => !line.productId || !Number.isInteger(line.boxes) || line.boxes <= 0)) {
      showToast('批量出库包含无效商品或箱数', 'error');
      return false;
    }

    const aggregatedLines = aggregateBatchOutLines(lines);
    const productRefs = new Map(
      aggregatedLines.map((line) => [line.productId, doc(db, 'products', line.productId)])
    );
    const transactionRefs = lines.map(() => doc(collection(db, 'transactions')));
    const operatorUid = auth.currentUser.uid;
    const occurredAt = Timestamp.now();
    const normalizedRemark = remark.trim() || '批量出库';
    if (normalizedRemark.length >= 500) {
      showToast('备注不能超过 499 个字符', 'error');
      return false;
    }

    try {
      await runTransaction(db, async (trx) => {
        const productSnapshots = await Promise.all(
          aggregatedLines.map((line) => trx.get(productRefs.get(line.productId)!))
        );
        const productDataById = new Map<string, Product>();

        productSnapshots.forEach((snapshot, index) => {
          const productId = aggregatedLines[index].productId;
          if (!snapshot.exists()) throw new Error('批量出库包含已删除的商品');
          productDataById.set(productId, snapshot.data() as Product);
        });

        for (const line of aggregatedLines) {
          const productData = productDataById.get(line.productId)!;
          const spec = Number(productData.spec ?? 0);
          const currentStock = Number(productData.stock ?? 0);
          if (spec <= 0) throw new Error('批量出库包含规格错误的商品');
          if (productData.isActive === false) throw new Error('批量出库包含已下架的商品');

          const totalQuantity = line.boxes * spec;
          if (totalQuantity > currentStock) {
            throw new Error(`商品“${String(productData.name ?? line.productId)}”库存不足`);
          }
        }

        lines.forEach((line, index) => {
          const productData = productDataById.get(line.productId)!;
          const spec = Number(productData.spec);
          trx.set(transactionRefs[index], {
            productId: line.productId,
            type: 'out',
            quantity: line.boxes * spec,
            unitPrice: Number(productData.price ?? 0),
            occurredAt,
            operatorUid,
            remark: normalizedRemark
          });
        });

        for (const line of aggregatedLines) {
          const productData = productDataById.get(line.productId)!;
          const nextStock = Number(productData.stock) - line.boxes * Number(productData.spec);
          trx.update(productRefs.get(line.productId)!, { stock: nextStock, lastOutAt: occurredAt });
        }
        writeAnalyticsDelta(trx, buildAnalyticsDelta({
          afterTransactions: lines.map((line, index) => {
            const productData = productDataById.get(line.productId)!;
            return {
              productId: line.productId,
              type: 'out',
              quantity: line.boxes * Number(productData.spec),
              unitPrice: Number(productData.price ?? 0),
              occurredAt: occurredAt.toDate()
            };
          })
        }));
      });

      showToast(`批量出库完成，共 ${lines.length} 条`);
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'transactions/batch-out');
      showToast(error instanceof Error ? error.message : '批量出库失败，未写入任何数据', 'error');
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
      products.map((product) => normalizeProductName(product.name))
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
      const normalizedName = normalizeProductName(pName);

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
            createdAt,
            lastOutAt: null
          });
          trx.set(doc(db, 'orderCatalog', productRef.id), {
            name: pName,
            spec: pSpec,
            price: pPrice
          });

          if (pStock > 0) {
            const initTransactionData = {
              productId: productRef.id,
              type: 'in',
              quantity: pStock,
              unitPrice: pPrice,
              occurredAt: createdAt,
              operatorUid: auth.currentUser.uid,
              remark: '系统批量导入初始库存'
            } as const;
            trx.set(initTransactionRef, initTransactionData);
            writeAnalyticsDelta(trx, buildAnalyticsDelta({
              afterTransactions: [analyticsTransactionInput({ id: initTransactionRef.id, ...initTransactionData })]
            }));
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
        if (currentTx.sourceOrderSyncId) throw new Error('该流水来自客户订单，请在客户订单页面撤销同步');

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
        const existingNewLastOutAt = newProductData.lastOutAt instanceof Timestamp ? newProductData.lastOutAt : null;
        const nextLastOutAt = !existingNewLastOutAt || currentTx.occurredAt.toMillis() > existingNewLastOutAt.toMillis()
          ? currentTx.occurredAt
          : existingNewLastOutAt;
        const nextTx: Transaction = {
          ...currentTx,
          productId: newProductId,
          type: newType,
          quantity: newQuantity,
          unitPrice: finalUnitPrice,
          remark: newRemark
        };

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

          trx.update(oldProductRef, {
            stock: sameProductFinalStock,
            ...(newType === 'out' ? { lastOutAt: nextLastOutAt } : {})
          });
        } else {
          const newProductFinalStock =
            newType === 'in'
              ? newCurrentStock + newQuantity
              : newCurrentStock - newQuantity;
          if (newProductFinalStock < 0) throw new Error('新商品库存不足');

          trx.update(oldProductRef, { stock: revertedOldStock });
          trx.update(newProductRef, {
            stock: newProductFinalStock,
            ...(newType === 'out' ? { lastOutAt: nextLastOutAt } : {})
          });
        }

        trx.update(transactionRef, {
          productId: newProductId,
          type: newType,
          quantity: newQuantity,
          unitPrice: finalUnitPrice,
          remark: newRemark
        });
        writeAnalyticsDelta(trx, buildAnalyticsDelta({
          beforeTransactions: [analyticsTransactionInput(currentTx)],
          afterTransactions: [analyticsTransactionInput(nextTx)]
        }));
      });
      if (t.type === 'out' && (newType !== 'out' || t.productId !== newProductId)) {
        await refreshProductLastOutAt(t.productId);
      }

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
      const expenseRef = doc(collection(db, 'expenses'));
      const expenseData = {
        occurredAt,
        operatorUid: auth.currentUser.uid,
        amount,
        category,
        remark
      };
      await runTransaction(db, async (trx) => {
        trx.set(expenseRef, expenseData);
        writeAnalyticsDelta(trx, buildAnalyticsDelta({
          afterExpenses: [analyticsExpenseInput({ id: expenseRef.id, ...expenseData })]
        }));
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
      const expenseRef = doc(db, 'expenses', id);
      await runTransaction(db, async (trx) => {
        const snapshot = await trx.get(expenseRef);
        if (!snapshot.exists()) throw new Error('支出记录不存在');
        const expense = mapExpenseDoc(snapshot.id, snapshot.data());
        trx.delete(expenseRef);
        writeAnalyticsDelta(trx, buildAnalyticsDelta({
          beforeExpenses: [analyticsExpenseInput(expense)]
        }));
      });
      showToast('记录已删除');
      setConfirmDeleteExpenseId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `expenses/${id}`);
    }
  };

  const addDebt = async (customerName: string, amount: number, date: string) => {
    if (user?.role !== 'admin') {
      showToast('权限不足', 'error');
      return false;
    }
    if (!auth.currentUser?.uid) {
      showToast('登录状态异常，请重新登录', 'error');
      return false;
    }

    try {
      await addDoc(collection(db, 'debts'), {
        customerName,
        amount,
        paidAmount: 0,
        occurredAt: timestampFromDateInput(date),
        operatorUid: auth.currentUser.uid
      });
      showToast('欠账登记成功');
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'debts');
      return false;
    }
  };

  const updateDebt = async (
    debtId: string,
    customerName: string,
    amount: number,
    paidAmount: number,
    date: string
  ) => {
    if (user?.role !== 'admin') {
      showToast('权限不足', 'error');
      return false;
    }
    if (!auth.currentUser?.uid) {
      showToast('登录状态异常，请重新登录', 'error');
      return false;
    }
    if (
      !customerName ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      !Number.isFinite(paidAmount) ||
      paidAmount < 0 ||
      paidAmount > amount ||
      !date
    ) {
      showToast('请输入正确的欠账信息', 'error');
      return false;
    }

    try {
      const debtRef = doc(db, 'debts', debtId);
      await updateDoc(debtRef, {
        customerName,
        amount,
        paidAmount,
        occurredAt: timestampFromDateInput(date)
      });
      showToast('欠账修改成功');
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : '欠账修改失败';
      showToast(message, 'error');
      handleFirestoreError(error, OperationType.UPDATE, `debts/${debtId}`);
      return false;
    }
  };

  const settleDebt = async (debtId: string) => {
    if (user?.role !== 'admin') {
      showToast('权限不足', 'error');
      return false;
    }
    if (!auth.currentUser?.uid) {
      showToast('登录状态异常，请重新登录', 'error');
      return false;
    }

    try {
      const debtRef = doc(db, 'debts', debtId);
      await runTransaction(db, async (trx) => {
        const debtSnapshot = await trx.get(debtRef);
        if (!debtSnapshot.exists()) throw new Error('欠款记录不存在');

        const debtData = debtSnapshot.data();
        const originalAmount = debtData.amount;
        const currentPaidAmount = debtData.paidAmount;
        if (
          typeof originalAmount !== 'number' ||
          !Number.isFinite(originalAmount) ||
          typeof currentPaidAmount !== 'number' ||
          !Number.isFinite(currentPaidAmount)
        ) {
          throw new Error('欠款数据异常');
        }
        if (currentPaidAmount >= originalAmount) throw new Error('该笔欠款已经结清');

        trx.update(debtRef, {
          paidAmount: originalAmount
        });
      });
      showToast('欠款已结清');
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : '结清失败';
      showToast(message, 'error');
      handleFirestoreError(error, OperationType.UPDATE, `debts/${debtId}`);
      return false;
    }
  };

  // --- Render Logic ---

  if (loading) {
    return (
      <div className="app-shell min-h-screen flex items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-[3px] border-sky-100 border-t-sky-500"></div>
      </div>
    );
  }

  if (!user) return <LoginView handleLogin={handleLogin} />;

  return (
    <ErrorBoundary>
      <AppShell
        user={user}
        currentView={currentView}
        onViewChange={handleViewChange}
        onLogout={handleLogout}
      >
      <div className="contents">
      {/* Main Content */}
      <main className="min-w-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {user.role !== 'order' && currentView === 'home' && (
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
                  reportStartDate={reportStartDate}
                  setReportStartDate={setReportStartDate}
                  reportEndDate={reportEndDate}
                  setReportEndDate={setReportEndDate}
                  salesReport={salesReport}
                  formatStock={formatStock}
                  homeMetrics={homeMetrics}
                />
              )}
              {user.role !== 'order' && currentView === 'inventory-warnings' && (
                <InventoryOverviewView
                  mode="warnings"
                  warnings={warnings}
                  staleProducts={staleProducts}
                  productRiskMetricsByProduct={productRiskMetricsByProduct}
                  products={activeProducts}
                  totalOutQuantityByProduct={totalOutQuantityByProduct}
                  formatStock={formatStock}
                  weeklySalesPeriods={weeklySalesPeriods}
                  monthlySalesPeriods={monthlySalesPeriods}
                  comparisonMode={inventoryComparisonMode}
                  setComparisonMode={setInventoryComparisonMode}
                  showToast={showToast}
                />
              )}
              {user.role !== 'order' && currentView === 'inventory-stale' && (
                <InventoryOverviewView
                  mode="stale"
                  warnings={warnings}
                  staleProducts={staleProducts}
                  productRiskMetricsByProduct={productRiskMetricsByProduct}
                  products={activeProducts}
                  totalOutQuantityByProduct={totalOutQuantityByProduct}
                  formatStock={formatStock}
                  weeklySalesPeriods={weeklySalesPeriods}
                  monthlySalesPeriods={monthlySalesPeriods}
                  comparisonMode={inventoryComparisonMode}
                  setComparisonMode={setInventoryComparisonMode}
                  showToast={showToast}
                />
              )}
              {user.role !== 'order' && currentView === 'inventory-stock' && (
                <InventoryOverviewView
                  mode="stock"
                  warnings={warnings}
                  staleProducts={staleProducts}
                  productRiskMetricsByProduct={productRiskMetricsByProduct}
                  products={activeProducts}
                  totalOutQuantityByProduct={totalOutQuantityByProduct}
                  formatStock={formatStock}
                  weeklySalesPeriods={weeklySalesPeriods}
                  monthlySalesPeriods={monthlySalesPeriods}
                  comparisonMode={inventoryComparisonMode}
                  setComparisonMode={setInventoryComparisonMode}
                  showToast={showToast}
                />
              )}
              {user.role !== 'order' && currentView === 'inventory-comparison' && (
                <InventoryOverviewView
                  mode="comparison"
                  warnings={warnings}
                  staleProducts={staleProducts}
                  productRiskMetricsByProduct={productRiskMetricsByProduct}
                  products={activeProducts}
                  totalOutQuantityByProduct={totalOutQuantityByProduct}
                  formatStock={formatStock}
                  weeklySalesPeriods={weeklySalesPeriods}
                  monthlySalesPeriods={monthlySalesPeriods}
                  comparisonMode={inventoryComparisonMode}
                  setComparisonMode={setInventoryComparisonMode}
                  showToast={showToast}
                />
              )}
              {user.role !== 'order' && currentView === 'stock' && (
                <StockView 
                  products={activeProducts}
                transactions={transactions}
                handleTransaction={handleTransaction}
                handleBatchOut={handleBatchOut}
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
                  onHistoryQueryChange={setStockHistoryRequest}
                />
              )}
              {user.role === 'order' && currentView === 'home' && (
                <OrderPriceListView
                  products={orderProducts}
                  formatCurrency={formatCurrency}
                />
              )}
              {user.role === 'order' && currentView === 'order-entry' && (
                <OrderEntryView
                  products={orderProducts}
                  savedOrders={customerOrders}
                  formatCurrency={formatCurrency}
                  formatStock={formatStock}
                  showToast={showToast}
                  createCustomerOrder={createCustomerOrder}
                  updateCustomerOrder={updateCustomerOrder}
                  deleteCustomerOrder={deleteCustomerOrder}
                  getToday={getTogoDate}
                  language="fr"
                  onOrdersDateChange={setCustomerOrdersDate}
                />
              )}
              {user.role === 'order' && currentView === 'order-debts' && (
                <OrderDebtsView
                  orders={customerOrders}
                  formatCurrency={formatCurrency}
                  updateCustomerOrder={updateCustomerOrder}
                />
              )}
              {user.role === 'order' && currentView === 'order-accounting' && (
                <OrderAccountingView
                  cashCounts={orderCashCounts}
                  dailyExpenses={orderDailyExpenses}
                  saveCashCount={saveOrderCashCount}
                  deleteCashCount={deleteOrderCashCount}
                  createDailyExpense={createOrderDailyExpense}
                  updateDailyExpense={updateOrderDailyExpense}
                  deleteDailyExpense={deleteOrderDailyExpense}
                  formatCurrency={formatCurrency}
                  onSelectedDateChange={setAccountingDate}
                />
              )}
            {user.role === 'admin' && currentView === 'customer-orders' && (
              <CustomerOrdersView
                orders={customerOrders}
                products={activeProducts}
                formatCurrency={formatCurrency}
                updateCustomerOrder={updateCustomerOrder}
                deleteCustomerOrder={deleteCustomerOrder}
                onSelectedDateChange={setCustomerOrdersDate}
                selectedDate={customerOrdersDate}
                inventorySync={customerOrderSync}
                syncOrdersToInventory={syncCustomerOrdersToInventory}
                undoInventorySync={undoCustomerOrdersInventorySync}
              />
            )}
            {user.role !== 'order' && currentView === 'products' && (
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
            {user.role !== 'order' && currentView === 'dashboard' && (
              <DashboardView
                metrics={dashboardMetrics}
                setHotMonth={setDashboardHotMonth}
                formatCurrency={formatCurrency}
                formatStock={formatStock}
              />
            )}
            {user.role !== 'order' && currentView === 'expenses' && (
                <ExpensesView 
                  expenses={expenses}
                  monthlySalesTotal={analyticsMonths.find((item) => item.monthKey === expenseFilterMonth)?.outAmount ?? 0}
                  addExpense={addExpense}
                  deleteExpense={setConfirmDeleteExpenseId}
                  formatCurrency={formatCurrency}
                  user={user}
                  formatDateTime={formatDateTimeLabel}
                  filterMonth={expenseFilterMonth}
                  setFilterMonth={setExpenseFilterMonth}
                  orderCashCount={orderCashCounts[0] ?? null}
                  orderDailyExpenses={orderDailyExpenses}
                  customerOrders={customerOrders}
                  orderAccountingDate={adminOrderAccountingDate}
                  setOrderAccountingDate={setAdminOrderAccountingDate}
                />
              )}
            {user.role !== 'order' && currentView === 'debts' && (
              <DebtsView
                debts={debts}
                customerOrders={customerOrders}
                addDebt={addDebt}
                updateDebt={updateDebt}
                settleDebt={settleDebt}
                updateCustomerOrder={updateCustomerOrder}
                formatCurrency={formatCurrency}
                user={user}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Confirm Delete Modal */}
      <AnimatePresence>
        {confirmDeleteId && (
          <div className="fixed inset-0 bg-slate-900/25 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="surface rounded-xl p-8 w-full max-w-sm border border-stone-200 text-center"
            >
              <div className="w-16 h-16 bg-rose-50 rounded-xl flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="text-rose-500" size={32} />
              </div>
              <h3 className="text-xl font-black text-slate-800 mb-2">确认删除？</h3>
              <p className="text-slate-500 mb-8">确定要彻底删除此流水记录吗？此操作不可撤销，库存将自动回滚。</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDeleteId(null)}
                  disabled={isDeletingTransaction}
                  className="flex-1 py-3 rounded-xl font-semibold text-slate-600 button-secondary hover:bg-white transition-all disabled:cursor-not-allowed disabled:opacity-50"
                >
                  取消
                </button>
                <button
                  onClick={() => void deleteTransaction(confirmDeleteId)}
                  disabled={isDeletingTransaction}
                  className="flex-1 py-3 rounded-xl font-semibold text-white bg-rose-500/90 hover:bg-rose-600 shadow-sm shadow-rose-300/30 transition-all disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isDeletingTransaction ? '删除中...' : '确认删除'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirm Delete Expense Modal */}
      <AnimatePresence>
        {confirmDeleteExpenseId && (
          <div className="fixed inset-0 bg-slate-900/25 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="surface rounded-xl p-8 w-full max-w-sm border border-stone-200 text-center"
            >
              <div className="w-16 h-16 bg-rose-50 rounded-xl flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="text-rose-500" size={32} />
              </div>
              <h3 className="text-xl font-black text-slate-800 mb-2">确认删除？</h3>
              <p className="text-slate-500 mb-8">确定要彻底删除此支出明细吗？此操作不可撤销。</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDeleteExpenseId(null)}
                  className="flex-1 py-3 rounded-xl font-semibold text-slate-600 button-secondary hover:bg-white transition-all"
                >
                  取消
                </button>
                <button
                  onClick={() => deleteExpense(confirmDeleteExpenseId)}
                  className="flex-1 py-3 rounded-xl font-semibold text-white bg-rose-500/90 hover:bg-rose-600 shadow-sm shadow-rose-300/30 transition-all"
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
              className={`flex items-center gap-3 px-5 py-3 rounded-xl border surface ${
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
    </AppShell>
  </ErrorBoundary>
);
}
