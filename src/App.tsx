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
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy,
  getDocFromServer
} from 'firebase/firestore';
import { Product, Transaction, User, View, Toast, Expense } from './types';
import { LoginView, HomeView, StockView, ProductsView, ExpensesView } from './components/Views';


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
const getTogoWeek = () => {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
};

const getTogoDateTime = () => new Date().toISOString().replace('T', ' ').slice(0, 19);

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
        unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
          if (firebaseUser) {
            setUser({ 
              username: firebaseUser.email?.split('@')[0] || '', 
              role: firebaseUser.email === 'admin@topstar.com' ? 'admin' : 'staff' 
            });
          } else {
            setUser(null);
          }
          setLoading(false);
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
    const qProducts = query(collection(db, 'products'), orderBy('name'));
    const unsubscribeProducts = onSnapshot(qProducts, 
      (snapshot) => {
        const productsData: Product[] = [];
        snapshot.forEach((doc) => {
          productsData.push({ id: doc.id, ...doc.data() } as Product);
        });
        setProducts(productsData);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'products');
      }
    );

    // Sync Transactions
    const qTransactions = query(collection(db, 'transactions'), orderBy('date', 'desc'));
    const unsubscribeTransactions = onSnapshot(qTransactions, 
      (snapshot) => {
        const transactionsData: Transaction[] = [];
        snapshot.forEach((doc) => {
          transactionsData.push({ id: doc.id, ...doc.data() } as Transaction);
        });
        // Ensure descending order even if backend sorting has issues
        transactionsData.sort((a, b) => {
          const dateA = new Date(a.date.replace(/-/g, '/')).getTime();
          const dateB = new Date(b.date.replace(/-/g, '/')).getTime();
          return dateB - dateA;
        });
        setTransactions(transactionsData);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'transactions');
      }
    );

    // Sync Expenses
    const qExpenses = query(collection(db, 'expenses'), orderBy('date', 'desc'));
    const unsubscribeExpenses = onSnapshot(qExpenses,
      (snapshot) => {
        const expensesData: Expense[] = [];
        snapshot.forEach((doc) => {
          expensesData.push({ id: doc.id, ...doc.data() } as Expense);
        });
        setExpenses(expensesData);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'expenses');
      }
    );

    return () => {
      unsubscribeProducts();
      unsubscribeTransactions();
      unsubscribeExpenses();
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
      .reduce((sum, t) => sum + t.quantity * t.price, 0);
    const outTotal = transactions
      .filter(t => t.type === 'out')
      .reduce((sum, t) => sum + t.quantity * t.price, 0);
    return {
      inTotal,
      outTotal,
      balance: inTotal - outTotal
    };
  }, [transactions]);

  const warnings = useMemo(() => {
    return products.filter(p => p.stock < p.spec * 30);
  }, [products]);

  const salesReport = useMemo(() => {
    const getRange = () => {
      if (reportPeriod === 'day') {
        const start = new Date(selectedDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(selectedDate);
        end.setHours(23, 59, 59, 999);
        return { start, end };
      } else if (reportPeriod === 'week') {
        // 解析 2026-W10
        const [year, weekStr] = selectedWeek.split('-W');
        const y = parseInt(year);
        const w = parseInt(weekStr);
        
        // 简单计算周的开始 (周一)
        const simple = new Date(y, 0, 1 + (w - 1) * 7);
        const dow = simple.getDay();
        const ISOweekStart = simple;
        if (dow <= 4) ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
        else ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
        
        const start = new Date(ISOweekStart);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        return { start, end };
      } else {
        const [year, month] = selectedMonth.split('-');
        const start = new Date(parseInt(year), parseInt(month) - 1, 1);
        const end = new Date(parseInt(year), parseInt(month), 0);
        end.setHours(23, 59, 59, 999);
        return { start, end };
      }
    };

    const { start, end } = getRange();

    const filtered = transactions.filter(t => {
      if (t.type !== 'out') return false;
      const tDate = new Date(t.date);
      return tDate >= start && tDate <= end;
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
      reportMap[t.productId].amount += t.quantity * t.price;
    });

    const totalExpenses = expenses.filter(e => {
      const eDate = new Date(e.date);
      return eDate >= start && eDate <= end;
    }).reduce((sum, e) => sum + e.amount, 0);

    return {
      items: Object.values(reportMap).sort((a, b) => b.amount - a.amount),
      totalAmount: filtered.reduce((sum, t) => sum + t.quantity * t.price, 0),
      totalQuantity: filtered.reduce((sum, t) => sum + t.quantity, 0),
      totalExpenses
    };
  }, [transactions, products, expenses, reportPeriod, selectedDate, selectedWeek, selectedMonth]);

  // --- Actions ---
  const handleLogin = async (username: string, pass: string) => {
    try {
      // 内部映射：将用户名转为 Firebase 要求的邮箱格式
      const email = username.includes('@') ? username : `${username}@topstar.com`;
      await signInWithEmailAndPassword(auth, email, pass);
      showToast('登录成功');
      return true;
    } catch (error: any) {
      let msg = '登录失败';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        msg = '用户名或密码错误';
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

      showToast('正在同步数据库...', 'success');

      // 2. Update Product Stock FIRST
      await updateDoc(doc(db, 'products', t.productId), {
        stock: newStock
      });

      // 3. Delete Transaction document
      await deleteDoc(doc(db, 'transactions', id));
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

    try {
      // 1. Add Transaction
      await addDoc(collection(db, 'transactions'), {
        productId,
        type,
        quantity: totalQuantity,
        price: product.price,
        date: getTogoDateTime(),
        remark
      });

      // 2. Update Product Stock
      const currentStock = product.stock || 0;
      const newStock = type === 'in' ? currentStock + totalQuantity : currentStock - totalQuantity;
      await updateDoc(doc(db, 'products', productId), {
        stock: newStock
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

      try {
        // 1. Add Product
        const docRef = await addDoc(collection(db, 'products'), {
          name: pName,
          spec: pSpec,
          price: pPrice,
          stock: pStock
        });

        // 2. If stock > 0, add an initial transaction
        if (pStock > 0) {
          await addDoc(collection(db, 'transactions'), {
            productId: docRef.id,
            type: 'in',
            quantity: pStock,
            price: pPrice,
            date: getTogoDateTime(),
            remark: '系统批量导入初始库存'
          });
        }
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

      showToast('正在同步库存...', 'success');

      // 1. Revert Old Product Stock
      let oldProductFinalStock = oldProduct.stock || 0;
      if (t.type === 'in') {
        oldProductFinalStock -= t.quantity;
      } else {
        oldProductFinalStock += t.quantity;
      }

      // 2. Calculate New Product Stock
      let newProductFinalStock;
      const newProductCurrentStock = newProduct.stock || 0;
      if (oldProduct.id === newProduct.id) {
        // Same product: apply new change to the reverted stock
        newProductFinalStock = newType === 'in' 
          ? oldProductFinalStock + newQuantity 
          : oldProductFinalStock - newQuantity;
        
        if (newProductFinalStock < 0) {
          showToast('修改失败：修改后库存将变为负数', 'error');
          return false;
        }

        // Update single product
        await updateDoc(doc(db, 'products', oldProduct.id), {
          stock: newProductFinalStock
        });
      } else {
        // Different products: 
        // a) Check if new product has enough stock for 'out'
        newProductFinalStock = newType === 'in'
          ? newProductCurrentStock + newQuantity
          : newProductCurrentStock - newQuantity;

        if (newProductFinalStock < 0) {
          showToast(`修改失败：${newProduct.name} 库存不足`, 'error');
          return false;
        }

        // b) Update both products
        await updateDoc(doc(db, 'products', oldProduct.id), {
          stock: oldProductFinalStock
        });
        await updateDoc(doc(db, 'products', newProduct.id), {
          stock: newProductFinalStock
        });
      }

      // 3. Update Transaction
      await updateDoc(doc(db, 'transactions', transactionId), {
        productId: newProductId,
        type: newType,
        quantity: newQuantity,
        remark: newRemark
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
    try {
      await addDoc(collection(db, 'expenses'), {
        amount,
        category,
        remark,
        date
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
                salesTotal={stats.outTotal}
                addExpense={addExpense}
                deleteExpense={setConfirmDeleteExpenseId}
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
