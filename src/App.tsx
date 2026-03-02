/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  ArrowLeftRight, 
  XCircle,
  CheckCircle2,
  Pencil
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth } from './firebase';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy
} from 'firebase/firestore';
import { Product, Transaction, User, View, Toast } from './types';
import { LoginView, HomeView, StockView, ProductsView } from './components/Views';

// --- Constants ---

const ACCOUNTS = [
  { username: 'admin', password: '340822', role: 'admin' },
  { username: 'check', password: '123', role: 'staff' }
] as const;

// --- Helper Functions ---

const formatStock = (total: number, spec: number) => {
  if (spec <= 1) return `${total} 个`;
  const boxes = Math.floor(total / spec);
  const rem = total % spec;
  if (boxes === 0) return `${total} 个`;
  return `${boxes} 箱${rem > 0 ? ` + ${rem} 个` : ''}`;
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('zh-CN').format(amount) + ' 西法';
};

export default function App() {
  // --- State ---
  const [user, setUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [currentView, setCurrentView] = useState<View>('home');
  const [reportPeriod, setReportPeriod] = useState<'day' | 'week' | 'month'>('day');
  
  // 使用系统提供的当前时间: 2026-03-02
  const [selectedDate, setSelectedDate] = useState('2026-03-02');
  const [selectedWeek, setSelectedWeek] = useState('2026-W10'); // 2026-03-02 is in W10
  const [selectedMonth, setSelectedMonth] = useState('2026-03');
  
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [loading, setLoading] = useState(true);

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
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
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

    return () => unsubscribe();
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
        console.error("Products sync error:", error);
        if (error.code === 'permission-denied') {
          showToast('数据库访问受限，请检查 Firebase 安全规则', 'error');
        }
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
        setTransactions(transactionsData);
      },
      (error) => {
        console.error("Transactions sync error:", error);
      }
    );

    return () => {
      unsubscribeProducts();
      unsubscribeTransactions();
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

    return {
      items: Object.values(reportMap).sort((a, b) => b.amount - a.amount),
      totalAmount: filtered.reduce((sum, t) => sum + t.quantity * t.price, 0),
      totalQuantity: filtered.reduce((sum, t) => sum + t.quantity, 0)
    };
  }, [transactions, products, reportPeriod, selectedDate, selectedWeek, selectedMonth]);

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
      showToast('添加失败', 'error');
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
      showToast('删除失败', 'error');
    }
  };

  const deleteTransaction = async (id: string) => {
    try {
      console.log("Attempting to delete transaction:", id);
      
      if (user?.role !== 'admin') {
        showToast('权限不足：只有管理员可以删除流水', 'error');
        return;
      }
      
      const t = transactions.find(trans => trans.id === id);
      if (!t) {
        console.error("Transaction not found in state. Current transactions:", transactions);
        showToast('错误：在当前列表中找不到该流水记录', 'error');
        return;
      }

      const product = products.find(p => p.id === t.productId);
      if (!product) {
        console.error("Product not found for transaction. ProductID:", t.productId);
        showToast('错误：找不到该流水关联的商品信息', 'error');
        return;
      }

      // 1. Revert Product Stock calculation
      const newStock = t.type === 'in' ? product.stock - t.quantity : product.stock + t.quantity;
      if (newStock < 0) {
        showToast('删除失败：回滚后库存将变为负数，操作已取消', 'error');
        return;
      }

      showToast('正在同步数据库...', 'success');

      // 2. Update Product Stock FIRST
      const productRef = doc(db, 'products', t.productId);
      await updateDoc(productRef, {
        stock: newStock
      });
      console.log("Product stock updated successfully to:", newStock);

      // 3. Delete Transaction document
      const transactionRef = doc(db, 'transactions', id);
      await deleteDoc(transactionRef);
      console.log("Transaction document deleted successfully:", id);
      
      showToast('流水已成功删除，库存已回滚', 'success');
    } catch (error: any) {
      console.error("Delete transaction error detail:", error);
      const errorMsg = error.code === 'permission-denied' 
        ? '数据库权限拒绝：请检查 Firebase 规则' 
        : (error.message || '未知错误');
      showToast(`删除失败: ${errorMsg}`, 'error');
      // 使用 alert 确保用户看到严重错误
      if (error.code === 'permission-denied') {
        alert('删除失败：您的账号没有删除权限。请联系管理员检查 Firebase Firestore 的安全规则。');
      }
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
        date: new Date().toLocaleString(),
        remark
      });

      // 2. Update Product Stock
      const newStock = type === 'in' ? product.stock + totalQuantity : product.stock - totalQuantity;
      await updateDoc(doc(db, 'products', productId), {
        stock: newStock
      });

      showToast(type === 'in' ? '入库成功' : '出库成功');
      return true;
    } catch (error) {
      showToast('操作失败', 'error');
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
            date: new Date().toLocaleString(),
            remark: '系统批量导入初始库存'
          });
        }
        successCount++;
      } catch (e) {
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
      let oldProductFinalStock = oldProduct.stock;
      if (t.type === 'in') {
        oldProductFinalStock -= t.quantity;
      } else {
        oldProductFinalStock += t.quantity;
      }

      // 2. Calculate New Product Stock
      let newProductFinalStock;
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
          ? newProduct.stock + newQuantity
          : newProduct.stock - newQuantity;

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
      console.error("Update transaction error:", error);
      showToast('修改失败', 'error');
      return false;
    }
  };

  // --- Render Logic ---

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user) return <LoginView handleLogin={handleLogin} />;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      {/* Header & Nav */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between py-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
                <Package className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight text-slate-900">TOP STAR 鞋店</h1>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                  <span className={`w-1.5 h-1.5 rounded-full ${user.role === 'admin' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                  {user.role === 'admin' ? '管理员' : '查询员'} · {user.username}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <nav className="flex bg-slate-100 p-1 rounded-2xl">
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
              </nav>
              <button 
                onClick={handleLogout}
                className="p-2.5 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all"
                title="退出登录"
              >
                <XCircle size={20} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                deleteTransaction={deleteTransaction}
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
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Toasts */}
      <div className="fixed bottom-8 right-8 z-50 flex flex-col gap-3">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 20, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.9 }}
              className={`flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl border ${
                toast.type === 'success' 
                  ? 'bg-white border-emerald-100 text-emerald-800' 
                  : 'bg-white border-rose-100 text-rose-800'
              }`}
            >
              {toast.type === 'success' ? <CheckCircle2 className="text-emerald-500" size={20} /> : <XCircle className="text-rose-500" size={20} />}
              <span className="font-medium">{toast.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

// --- Components ---

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
        active 
          ? 'bg-white text-indigo-600 shadow-sm' 
          : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
