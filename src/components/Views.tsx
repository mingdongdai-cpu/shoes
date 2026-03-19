import React, { useState, useMemo } from 'react';
import { 
  Package, 
  ArrowLeftRight, 
  Plus, 
  Trash2, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Wallet,
  CheckCircle2,
  XCircle,
  History,
  Calendar,
  BarChart3,
  Pencil,
  Save,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, Transaction, User, Expense } from '../types';

// --- Components ---

export function StatCard({ title, value, icon, bgColor, subtitle }: { title: string, value: string, icon: React.ReactNode, bgColor: string, subtitle?: string }) {
  return (
    <div className={`p-6 rounded-2xl glass shadow-sm border-white/20 ${bgColor.replace('bg-', 'bg-').replace('50', '50/40')}`}>
      <div className="flex justify-between items-start mb-4">
        <div className="text-sm font-bold text-slate-500 uppercase tracking-wider">{title}</div>
        <div className="p-2 bg-white/60 backdrop-blur-md rounded-xl shadow-sm border border-white/40">{icon}</div>
      </div>
      <div className="text-2xl font-black text-slate-900">{value}</div>
      {subtitle && <div className="text-xs text-slate-400 mt-1">{subtitle}</div>}
    </div>
  );
}

// --- Views ---

export const LoginView = ({ handleLogin }: { handleLogin: (u: string, p: string) => Promise<boolean> }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleLogin(username, password);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md glass rounded-3xl p-8 shadow-2xl border-white/30"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-indigo-600/90 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-200/50 mb-4 backdrop-blur-md">
            <Package className="text-white" size={32} />
          </div>
          <h1 className="text-2xl font-black text-slate-900">TOP STAR SHOES</h1>
          <p className="text-slate-400 text-sm mt-1">进销存管理系统</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">用户名</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              className="w-full rounded-2xl border-white/40 bg-white/30 backdrop-blur-sm focus:ring-indigo-500 focus:border-indigo-500 py-3"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">密码</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••"
              className="w-full rounded-2xl border-white/40 bg-white/30 backdrop-blur-sm focus:ring-indigo-500 focus:border-indigo-500 py-3"
            />
          </div>
          <button
            type="submit"
            className="w-full py-4 bg-indigo-600/90 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg shadow-indigo-200/50 transition-all active:scale-95 backdrop-blur-md"
          >
            登 录
          </button>
        </form>
        
        <div className="mt-8 pt-6 border-t border-white/20 text-center">
          <p className="text-xs text-slate-400">© 2026 TOP STAR INVENTORY SYSTEM</p>
        </div>
      </motion.div>
    </div>
  );
};

export const HomeView = ({ 
  stats, formatCurrency, reportPeriod, setReportPeriod, selectedDate, setSelectedDate, 
  selectedWeek, setSelectedWeek, selectedMonth, setSelectedMonth, salesReport, formatStock, warnings, products 
}: any) => (
  <div className="space-y-8">
    {/* Finance Dashboard */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      <div className="group relative overflow-hidden glass rounded-3xl p-6 shadow-xl border-white/40 transition-all hover:shadow-2xl hover:-translate-y-1">
        <div className="absolute -right-6 -top-6 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl group-hover:bg-rose-500/10 transition-colors" />
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 bg-rose-50 rounded-2xl border border-rose-100/50">
            <TrendingDown className="text-rose-500" size={24} />
          </div>
          <div className="text-sm font-black text-slate-400 uppercase tracking-widest">入库总成本</div>
        </div>
        <div className="text-xl font-black text-slate-900 tracking-tight flex items-baseline gap-1">
          {formatCurrency(stats.inTotal).split(' ')[0]}
          <span className="text-xs font-bold text-slate-400 uppercase">XOF</span>
        </div>
      </div>

      <div className="group relative overflow-hidden glass rounded-3xl p-6 shadow-xl border-white/40 transition-all hover:shadow-2xl hover:-translate-y-1">
        <div className="absolute -right-6 -top-6 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-colors" />
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100/50">
            <TrendingUp className="text-emerald-500" size={24} />
          </div>
          <div className="text-sm font-black text-slate-400 uppercase tracking-widest">出库销售总额</div>
        </div>
        <div className="text-xl font-black text-slate-900 tracking-tight flex items-baseline gap-1">
          {formatCurrency(stats.outTotal).split(' ')[0]}
          <span className="text-xs font-bold text-slate-400 uppercase">XOF</span>
        </div>
      </div>

      <div className="group relative overflow-hidden glass rounded-3xl p-6 shadow-xl border-white/40 transition-all hover:shadow-2xl hover:-translate-y-1">
        <div className="absolute -right-6 -top-6 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl group-hover:bg-rose-500/10 transition-colors" />
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 bg-rose-50 rounded-2xl border border-rose-100/50">
            <Wallet className="text-rose-500" size={24} />
          </div>
          <div className="text-sm font-black text-slate-400 uppercase tracking-widest">本期支出</div>
        </div>
        <div className="text-xl font-black text-slate-900 tracking-tight flex items-baseline gap-1">
          {formatCurrency(salesReport.totalExpenses).split(' ')[0]}
          <span className="text-xs font-bold text-slate-400 uppercase">XOF</span>
        </div>
        <div className="text-[10px] font-bold text-slate-400 mt-2">记账管理中的支出</div>
      </div>

      <div className="group relative overflow-hidden glass rounded-3xl p-6 shadow-xl border-white/40 transition-all hover:shadow-2xl hover:-translate-y-1">
        <div className="absolute -right-6 -top-6 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-colors" />
        <div className="flex items-center gap-4 mb-4 relative z-10">
          <div className="p-3 bg-indigo-50 rounded-2xl border border-indigo-100/50">
            <Wallet className="text-indigo-500" size={24} />
          </div>
          <div className="text-sm font-black text-slate-400 uppercase tracking-widest">结余金额</div>
        </div>
        <div className="text-xl font-black text-slate-900 tracking-tight relative z-10 flex items-baseline gap-1">
          {formatCurrency(stats.balance).split(' ')[0]}
          <span className="text-xs font-bold text-slate-400 uppercase">XOF</span>
        </div>
        <div className="text-[10px] font-bold text-slate-400 mt-2 relative z-10">(入库成本 - 出库销售)</div>
      </div>
    </div>

    {/* Sales Report Section */}
    <div className="glass rounded-2xl p-6 shadow-sm border-white/20">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
        <div className="flex items-center gap-2">
          <BarChart3 className="text-indigo-500" size={20} />
          <h2 className="text-lg font-semibold text-slate-800">销售报表查询</h2>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex bg-white/30 backdrop-blur-md p-1 rounded-xl border border-white/20">
            <button
              onClick={() => setReportPeriod('day')}
              className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
                reportPeriod === 'day' ? 'bg-white/80 text-indigo-600 shadow-sm backdrop-blur-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              按日
            </button>
            <button
              onClick={() => setReportPeriod('week')}
              className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
                reportPeriod === 'week' ? 'bg-white/80 text-indigo-600 shadow-sm backdrop-blur-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              按周
            </button>
            <button
              onClick={() => setReportPeriod('month')}
              className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
                reportPeriod === 'month' ? 'bg-white/80 text-indigo-600 shadow-sm backdrop-blur-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              按月
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-slate-400" />
            {reportPeriod === 'day' && (
              <input 
                type="date" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="text-sm border-white/40 bg-white/30 backdrop-blur-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
              />
            )}
            {reportPeriod === 'week' && (
              <input 
                type="week" 
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(e.target.value)}
                className="text-sm border-white/40 bg-white/30 backdrop-blur-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
              />
            )}
            {reportPeriod === 'month' && (
              <input 
                type="month" 
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="text-sm border-white/40 bg-white/30 backdrop-blur-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
              />
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Summary Stats */}
        <div className="lg:col-span-1 space-y-4">
          <div className="p-4 rounded-2xl bg-indigo-50/40 backdrop-blur-md border border-indigo-100/30">
            <div className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">所选期间总额</div>
            <div className="text-xl font-black text-indigo-700">{formatCurrency(salesReport.totalAmount)}</div>
          </div>
          <div className="p-4 rounded-2xl bg-white/30 backdrop-blur-md border border-white/20">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">销售总箱数</div>
            <div className="text-xl font-black text-slate-700">
              {(() => {
                const totalBoxes = salesReport.items.reduce((sum: number, item: any) => sum + Math.floor(item.quantity / item.spec), 0);
                const totalItems = salesReport.items.reduce((sum: number, item: any) => sum + (item.quantity % item.spec), 0);
                return `${totalBoxes} 箱${totalItems > 0 ? ` + ${totalItems} 个` : ''}`;
              })()}
            </div>
          </div>
        </div>

        {/* Product Breakdown */}
        <div className="lg:col-span-3">
          <div className="border border-white/20 rounded-2xl overflow-hidden bg-white/20 backdrop-blur-sm">
            <table className="w-full text-left">
              <thead className="bg-white/30">
                <tr>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">商品名称</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">销售数量</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase text-right">销售金额</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {salesReport.items.map((item: any, idx: number) => (
                  <tr key={idx} className="hover:bg-white/20 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">{item.name}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{formatStock(item.quantity, item.spec)}</td>
                    <td className="px-4 py-3 text-sm text-slate-900 font-bold text-right">{formatCurrency(item.amount)}</td>
                  </tr>
                ))}
                {salesReport.items.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-slate-400 text-sm">该期间暂无销售记录</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    {/* Warning Module */}
    <div className="glass rounded-2xl p-6 shadow-sm border-white/20">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="text-amber-500" size={20} />
        <h2 className="text-lg font-semibold text-slate-800">库存预警 (少于30箱)</h2>
      </div>
      {warnings.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {warnings.map((p: Product) => (
            <div key={p.id} className="p-4 rounded-xl border border-rose-100/30 bg-rose-50/20 backdrop-blur-sm">
              <div className="font-medium text-slate-900">{p.name}</div>
              <div className="text-sm text-slate-500">规格: {p.spec} 个/箱</div>
              <div className="mt-2 text-rose-600 font-bold">
                当前库存: {formatStock(p.stock, p.spec)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50/30 backdrop-blur-sm p-4 rounded-xl border border-emerald-100/30">
          <CheckCircle2 size={18} />
          <span>库存充足，暂无预警商品</span>
        </div>
      )}
    </div>

    {/* Inventory List */}
    <div className="glass rounded-3xl p-8 shadow-xl border-white/30">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50/50 backdrop-blur-md rounded-xl border border-indigo-100/30">
            <Package className="text-indigo-600" size={24} />
          </div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">全店商品库存概览</h2>
        </div>
        <div className="text-sm font-bold text-slate-400 bg-white/30 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/20">
          共 {products.length} 款商品
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {products.map((p: Product) => {
          const isLowStock = p.stock < p.spec * 30;
          return (
            <motion.div 
              key={p.id} 
              whileHover={{ y: -4 }}
              className={`relative group p-6 rounded-3xl border transition-all duration-300 backdrop-blur-md ${
                isLowStock 
                  ? 'bg-rose-50/40 border-rose-100/50 hover:shadow-rose-100/50 shadow-lg' 
                  : 'bg-white/40 border-white/30 hover:shadow-indigo-100/30 shadow-md'
              }`}
            >
              {isLowStock && (
                <div className="absolute -top-3 -right-2 bg-rose-500 text-white text-[10px] font-black px-3 py-1 rounded-full shadow-lg shadow-rose-200 flex items-center gap-1 animate-pulse">
                  <AlertTriangle size={10} /> 库存告急
                </div>
              )}
              
              <div className="flex flex-col h-full">
                <div className="mb-4">
                  <div className="text-lg font-black text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">{p.name}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-white/40 px-2 py-0.5 rounded border border-white/20">规格: {p.spec}</span>
                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest bg-indigo-50/50 px-2 py-0.5 rounded border border-indigo-100/30">{p.price} XOF</span>
                  </div>
                </div>

                <div className="mt-auto pt-4 border-t border-white/20">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">当前可用库存</div>
                  <div className="flex items-baseline gap-1">
                    <span className={`text-2xl font-black tracking-tight ${isLowStock ? 'text-rose-600' : 'text-slate-900'}`}>
                      {Math.floor(p.stock / p.spec)}
                    </span>
                    <span className="text-sm font-bold text-slate-400">箱</span>
                    {p.stock % p.spec > 0 && (
                      <>
                        <span className="text-lg font-black text-slate-400 mx-1">+</span>
                        <span className={`text-xl font-black tracking-tight ${isLowStock ? 'text-rose-600' : 'text-slate-900'}`}>
                          {p.stock % p.spec}
                        </span>
                        <span className="text-sm font-bold text-slate-400">个</span>
                      </>
                    )}
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="mt-4 h-2 bg-white/30 rounded-full overflow-hidden border border-white/10">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min((p.stock / (p.spec * 100)) * 100, 100)}%` }}
                      className={`h-full rounded-full ${isLowStock ? 'bg-rose-500' : 'bg-indigo-500'}`}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
        {products.length === 0 && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center bg-white/20 backdrop-blur-md rounded-3xl border-2 border-dashed border-white/30">
            <Package className="text-slate-300 mb-4" size={48} />
            <div className="text-slate-400 font-bold">暂无商品数据，请前往“商品管理”添加</div>
          </div>
        )}
      </div>
    </div>
  </div>
);

export const StockView = ({
  products, transactions, handleTransaction, deleteTransaction, 
  updateTransaction, editingTransaction, setEditingTransaction,
  user, formatStock, showToast,
  type, setType, selectedId, setSelectedId, searchTerm, setSearchTerm, showDropdown, setShowDropdown,
  boxes, setBoxes, items, setItems, remark, setRemark
}: any) => {
  const [editBoxes, setEditBoxes] = useState('');
  const [editItems, setEditItems] = useState('');
  const [editRemark, setEditRemark] = useState('');
  const [editProductId, setEditProductId] = useState('');
  const [editType, setEditType] = useState<'in' | 'out'>('in');
  const [editSearchTerm, setEditSearchTerm] = useState('');
  const [showEditDropdown, setShowEditDropdown] = useState(false);

  const filteredProducts = useMemo(() => {
    if (!searchTerm) return products;
    return products.filter((p: Product) => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, products]);

  const filteredEditProducts = useMemo(() => {
    if (!editSearchTerm) return products;
    return products.filter((p: Product) => 
      p.name.toLowerCase().includes(editSearchTerm.toLowerCase())
    );
  }, [editSearchTerm, products]);

  const selectedProduct = products.find((p: Product) => p.id === selectedId);
  const editingProduct = products.find((p: Product) => p.id === editProductId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) return showToast('请选择商品', 'error');
    const b = parseInt(boxes) || 0;
    const i = parseInt(items) || 0;
    if (b === 0 && i === 0) return showToast('请输入数量', 'error');

    const success = await handleTransaction(selectedId, type, b, i, remark);
    if (success) {
      setBoxes('');
      setItems('');
      setRemark('');
      // Do not reset type or selectedId to maintain current action
    }
  };

  const startEditing = (t: Transaction) => {
    const p = products.find((prod: Product) => prod.id === t.productId);
    const b = Math.floor(t.quantity / (p?.spec || 1));
    const i = t.quantity % (p?.spec || 1);
    setEditingTransaction(t);
    setEditBoxes(b.toString());
    setEditItems(i.toString());
    setEditRemark(t.remark || '');
    setEditProductId(t.productId);
    setEditType(t.type);
    setEditSearchTerm('');
  };

  const handleUpdate = async () => {
    if (!editingTransaction) return;
    const p = products.find((prod: Product) => prod.id === editProductId);
    if (!p) return showToast('请选择商品', 'error');
    
    const b = parseInt(editBoxes) || 0;
    const i = parseInt(editItems) || 0;
    const totalQuantity = (b * (p.spec || 1)) + i;
    
    if (totalQuantity <= 0) {
      showToast('数量必须大于0', 'error');
      return;
    }

    const success = await updateTransaction(editingTransaction.id, editProductId, editType, totalQuantity, editRemark);
    if (success) {
      setEditingTransaction(null);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <AnimatePresence>
        {editingTransaction && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black text-slate-800">修改流水记录</h3>
                <button onClick={() => setEditingTransaction(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                <div>
                  <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">操作类型</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setEditType('in')}
                      className={`py-2 rounded-xl border-2 transition-all flex items-center justify-center gap-2 font-bold ${
                        editType === 'in' 
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700' 
                          : 'border-slate-100 text-slate-500 hover:border-slate-200'
                      }`}
                    >
                      <TrendingUp size={18} /> 入库
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditType('out')}
                      className={`py-2 rounded-xl border-2 transition-all flex items-center justify-center gap-2 font-bold ${
                        editType === 'out' 
                          ? 'border-rose-500 bg-rose-50 text-rose-700' 
                          : 'border-slate-100 text-slate-500 hover:border-slate-200'
                      }`}
                    >
                      <TrendingDown size={18} /> 出库
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">商品</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="搜索商品..."
                      value={editingProduct ? editingProduct.name : editSearchTerm}
                      onChange={(e) => {
                        setEditSearchTerm(e.target.value);
                        if (editProductId) setEditProductId('');
                        setShowEditDropdown(true);
                      }}
                      onFocus={() => setShowEditDropdown(true)}
                      className="w-full rounded-2xl border-slate-200 focus:ring-indigo-500 focus:border-indigo-500 font-bold pr-10"
                    />
                    {editProductId && (
                      <button 
                        type="button"
                        onClick={() => {
                          setEditProductId('');
                          setEditSearchTerm('');
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <XCircle size={16} />
                      </button>
                    )}
                    <AnimatePresence>
                      {showEditDropdown && (
                        <motion.div 
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute z-10 w-full mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 max-h-48 overflow-y-auto"
                        >
                          {filteredEditProducts.map((p: Product) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                setEditProductId(p.id);
                                setShowEditDropdown(false);
                              }}
                              className="w-full text-left px-4 py-3 hover:bg-indigo-50 transition-colors flex items-center justify-between group"
                            >
                              <span className="font-bold text-slate-700 group-hover:text-indigo-600">{p.name}</span>
                              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded uppercase">规格: {p.spec}</span>
                            </button>
                          ))}
                          {filteredEditProducts.length === 0 && (
                            <div className="px-4 py-8 text-center text-slate-400 font-bold">未找到匹配商品</div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">箱数</label>
                    <input
                      type="number"
                      value={editBoxes}
                      onChange={(e) => setEditBoxes(e.target.value)}
                      className="w-full rounded-2xl border-slate-200 focus:ring-indigo-500 focus:border-indigo-500 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">散个</label>
                    <input
                      type="number"
                      value={editItems}
                      onChange={(e) => setEditItems(e.target.value)}
                      className="w-full rounded-2xl border-slate-200 focus:ring-indigo-500 focus:border-indigo-500 font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">备注</label>
                  <textarea
                    value={editRemark}
                    onChange={(e) => setEditRemark(e.target.value)}
                    className="w-full rounded-2xl border-slate-200 focus:ring-indigo-500 focus:border-indigo-500 font-bold h-24"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setEditingTransaction(null)}
                    className="flex-1 py-4 rounded-2xl font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-all"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleUpdate}
                    className="flex-1 py-4 rounded-2xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2"
                  >
                    <Save size={20} /> 保存修改
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Form */}
      <div className="lg:col-span-1">
        <div className="glass rounded-2xl p-6 shadow-sm border-white/20 sticky top-24">
          <h2 className="text-lg font-semibold text-slate-800 mb-6 flex items-center gap-2">
            <ArrowLeftRight size={20} className="text-indigo-500" />
            进出库操作
          </h2>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">操作类型</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setType('in')}
                  className={`py-2 rounded-xl border-2 transition-all flex items-center justify-center gap-2 font-bold ${
                    type === 'in' 
                      ? 'border-emerald-500 bg-emerald-50/50 text-emerald-700 backdrop-blur-sm' 
                      : 'border-white/20 text-slate-500 hover:border-white/40 bg-white/10'
                  }`}
                >
                  <TrendingUp size={18} /> 入库
                </button>
                <button
                  type="button"
                  onClick={() => setType('out')}
                  className={`py-2 rounded-xl border-2 transition-all flex items-center justify-center gap-2 font-bold ${
                    type === 'out' 
                      ? 'border-rose-500 bg-rose-50/50 text-rose-700 backdrop-blur-sm' 
                      : 'border-white/20 text-slate-500 hover:border-white/40 bg-white/10'
                  }`}
                >
                  <TrendingDown size={18} /> 出库
                </button>
              </div>
            </div>

            <div className="relative">
              <label className="block text-sm font-medium text-slate-700 mb-2">选择商品</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="输入商品名称搜索..."
                  value={selectedProduct ? selectedProduct.name : searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    if (selectedId) setSelectedId('');
                    setShowDropdown(true);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  className="w-full rounded-xl border-white/40 bg-white/30 backdrop-blur-sm focus:ring-indigo-500 focus:border-indigo-500 pr-10 font-bold"
                />
                {selectedId && (
                  <button 
                    type="button"
                    onClick={() => {
                      setSelectedId('');
                      setSearchTerm('');
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <XCircle size={16} />
                  </button>
                )}
              </div>
              
              {showDropdown && !selectedId && (
                <div className="absolute z-50 w-full mt-1 bg-white/80 backdrop-blur-xl border border-white/30 rounded-xl shadow-2xl max-h-60 overflow-y-auto custom-scrollbar">
                  {filteredProducts.length > 0 ? (
                    filteredProducts.map((p: Product) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setSelectedId(p.id);
                          setSearchTerm('');
                          setShowDropdown(false);
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-indigo-50/50 transition-colors border-b border-white/10 last:border-0"
                      >
                        <div className="font-bold text-slate-900">{p.name}</div>
                        <div className="text-xs font-bold text-slate-500">规格: {p.spec} | 库存: {formatStock(p.stock, p.spec)}</div>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-sm text-slate-400 italic font-bold">未找到匹配商品</div>
                  )}
                </div>
              )}
              {showDropdown && !selectedId && (
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowDropdown(false)}
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">箱数</label>
                <input
                  type="number"
                  min="0"
                  value={boxes}
                  onChange={(e) => setBoxes(e.target.value)}
                  placeholder="0"
                  className="w-full rounded-xl border-white/40 bg-white/30 backdrop-blur-sm focus:ring-indigo-500 focus:border-indigo-500 font-bold"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">个数 (零头)</label>
                <input
                  type="number"
                  min="0"
                  value={items}
                  onChange={(e) => setItems(e.target.value)}
                  placeholder="0"
                  className="w-full rounded-xl border-white/40 bg-white/30 backdrop-blur-sm focus:ring-indigo-500 focus:border-indigo-500 font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">操作时间</label>
              <input
                type="text"
                disabled
                value={new Date().toISOString().replace('T', ' ').slice(0, 19)}
                className="w-full rounded-xl border-white/20 bg-white/10 text-slate-400 cursor-not-allowed backdrop-blur-sm font-bold"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">备注</label>
              <textarea
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                placeholder="选填..."
                className="w-full rounded-xl border-white/40 bg-white/30 backdrop-blur-sm focus:ring-indigo-500 focus:border-indigo-500 h-20 font-bold"
              />
            </div>

            <button
              type="submit"
              disabled={user?.role !== 'admin'}
              className={`w-full py-3 rounded-xl font-bold text-white shadow-lg transition-all active:scale-95 backdrop-blur-md ${
                user?.role !== 'admin' 
                  ? 'bg-slate-300/50 cursor-not-allowed shadow-none' 
                  : (type === 'in' ? 'bg-emerald-500/90 hover:bg-emerald-600' : 'bg-rose-500/90 hover:bg-rose-600')
              }`}
            >
              {user?.role !== 'admin' ? '无操作权限' : '确认提交'}
            </button>
          </form>
        </div>
      </div>

      {/* History */}
      <div className="lg:col-span-2">
        <div className="glass rounded-2xl p-6 shadow-sm border-white/20">
          <h2 className="text-lg font-semibold text-slate-800 mb-6 flex items-center gap-2">
            <History size={20} className="text-slate-600" />
            近期流水明细
          </h2>
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="pb-4 font-bold text-slate-500 text-xs uppercase tracking-wider">时间</th>
                  <th className="pb-4 font-bold text-slate-500 text-xs uppercase tracking-wider">类型</th>
                  <th className="pb-4 font-bold text-slate-500 text-xs uppercase tracking-wider">商品</th>
                  <th className="pb-4 font-bold text-slate-500 text-xs uppercase tracking-wider">数量</th>
                  <th className="pb-4 font-bold text-slate-500 text-xs uppercase tracking-wider">备注</th>
                  <th className="pb-4 font-bold text-slate-500 text-xs uppercase tracking-wider text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {transactions.map((t: Transaction) => {
                  const p = products.find((prod: Product) => prod.id === t.productId);
                  return (
                    <tr key={t.id} className="hover:bg-white/20 transition-colors">
                      <td className="py-4 text-sm text-slate-500 font-medium">{t.date}</td>
                      <td className="py-4">
                        <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                          t.type === 'in' ? 'bg-emerald-100/50 text-emerald-700' : 'bg-rose-100/50 text-rose-700'
                        }`}>
                          {t.type === 'in' ? '入库' : '出库'}
                        </span>
                      </td>
                      <td className="py-4 text-sm font-bold text-slate-900">{p?.name || '未知商品'}</td>
                      <td className="py-4 text-sm text-slate-600 font-bold">
                        {formatStock(t.quantity, p?.spec || 1)}
                      </td>
                      <td className="py-4 text-sm text-slate-400 font-medium">{t.remark || '-'}</td>
                      <td className="py-4 text-right">
                        {user?.role === 'admin' && (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => startEditing(t)}
                              className="p-2 text-indigo-500 hover:bg-indigo-50/50 rounded-lg transition-all cursor-pointer backdrop-blur-sm"
                              title="修改流水"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteTransaction(t.id)}
                              className="p-2 text-rose-500 hover:bg-rose-50/50 rounded-lg transition-all cursor-pointer backdrop-blur-sm"
                              title="删除流水"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {transactions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 font-bold">暂无流水记录</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ProductsView = ({
  user, products, addProduct, deleteProduct, showToast, formatCurrency, formatStock,
  name, setName, spec, setSpec, price, setPrice, isBatchMode, setIsBatchMode, batchText, setBatchText,
  handleBatchImport
}: any) => {
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !spec || !price) return showToast('请填写所有必填项', 'error');
    
    const success = await addProduct(name, parseInt(spec), parseInt(price));
    if (success) {
      setName('');
      setSpec('');
      setPrice('');
    }
  };

  return (
    <div className="space-y-8">
      {/* Add Product Form */}
      <div className="glass rounded-3xl p-8 shadow-xl border-white/30">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50/50 backdrop-blur-md rounded-xl border border-indigo-100/30">
              <Plus size={20} className="text-indigo-600" />
            </div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">
              {isBatchMode ? 'Excel 批量导入商品' : '添加新商品'}
            </h2>
          </div>
          <button
            onClick={() => setIsBatchMode(!isBatchMode)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-100/50 text-purple-700 rounded-xl font-bold text-sm hover:bg-purple-200/50 transition-all backdrop-blur-sm border border-purple-100/30"
          >
            <ArrowLeftRight size={16} />
            {isBatchMode ? '切换为 单个添加' : '切换为 Excel批量导入'}
          </button>
        </div>

        {isBatchMode ? (
          <div className="space-y-4">
            <div className="bg-amber-50/30 border border-amber-100/30 rounded-2xl p-4 text-sm text-amber-800 backdrop-blur-sm">
              <p className="font-bold mb-1">导入说明：</p>
              <ul className="list-disc list-inside space-y-1 opacity-80">
                <li>请在 Excel 中排列：商品名称 | 规格 | 单价 | 初始库存箱数</li>
                <li>框选数据并复制 (Ctrl+C)，在下方文本框粘贴 (Ctrl+V)</li>
                <li>系统将自动识别 Tab 分隔的数据</li>
              </ul>
            </div>
            <textarea
              value={batchText}
              onChange={(e) => setBatchText(e.target.value)}
              placeholder="在此粘贴 Excel 数据..."
              className="w-full h-48 rounded-2xl border-white/40 bg-white/30 backdrop-blur-sm focus:ring-indigo-500 focus:border-indigo-500 p-4 font-mono text-sm font-bold"
            />
            <button
              onClick={handleBatchImport}
              disabled={user?.role !== 'admin' || !batchText.trim()}
              className={`w-full font-bold py-4 rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 backdrop-blur-md ${
                user?.role !== 'admin' || !batchText.trim()
                  ? 'bg-slate-200/50 text-slate-400 cursor-not-allowed shadow-none'
                  : 'bg-emerald-600/90 hover:bg-emerald-700 text-white shadow-emerald-200/50'
              }`}
            >
              <CheckCircle2 size={20} />
              {user?.role !== 'admin' ? '无权限' : '验证并开始批量导入'}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
            <div>
              <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">产品名称</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：AJ1 芝加哥"
                className="w-full rounded-2xl border-white/40 bg-white/30 backdrop-blur-sm focus:ring-indigo-500 focus:border-indigo-500 py-3 font-bold"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">规格 (一箱多少个)</label>
              <input
                type="number"
                min="1"
                value={spec}
                onChange={(e) => setSpec(e.target.value)}
                placeholder="12"
                className="w-full rounded-2xl border-white/40 bg-white/30 backdrop-blur-sm focus:ring-indigo-500 focus:border-indigo-500 py-3 font-bold"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">单价 (XOF/个)</label>
              <input
                type="number"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="5000"
                className="w-full rounded-2xl border-white/40 bg-white/30 backdrop-blur-sm focus:ring-indigo-500 focus:border-indigo-500 py-3 font-bold"
              />
            </div>
            <button
              type="submit"
              disabled={user?.role !== 'admin'}
              className={`font-bold py-3.5 rounded-2xl shadow-lg transition-all active:scale-95 backdrop-blur-md ${
                user?.role !== 'admin'
                  ? 'bg-slate-200/50 text-slate-400 cursor-not-allowed shadow-none'
                  : 'bg-indigo-600/90 hover:bg-indigo-700 text-white shadow-indigo-200/50'
              }`}
            >
              {user?.role !== 'admin' ? '无权限' : '添加商品'}
            </button>
          </form>
        )}
      </div>

      {/* Product List */}
      <div className="glass rounded-3xl p-8 shadow-xl border-white/30">
        <h2 className="text-xl font-black text-slate-800 tracking-tight mb-8 flex items-center gap-2">
          <Package size={24} className="text-slate-600" />
          商品列表维护
        </h2>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/10">
                <th className="pb-4 font-bold text-slate-500 text-xs uppercase tracking-wider">产品名称</th>
                <th className="pb-4 font-bold text-slate-500 text-xs uppercase tracking-wider">规格</th>
                <th className="pb-4 font-bold text-slate-500 text-xs uppercase tracking-wider">单价</th>
                <th className="pb-4 font-bold text-slate-500 text-xs uppercase tracking-wider">当前库存</th>
                <th className="pb-4 font-bold text-slate-500 text-xs uppercase tracking-wider text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {products.map((p: Product) => (
                <tr key={p.id} className="hover:bg-white/20 transition-colors">
                  <td className="py-4 text-sm font-bold text-slate-900">{p.name}</td>
                  <td className="py-4 text-sm text-slate-600 font-bold">{p.spec} 个/箱</td>
                  <td className="py-4 text-sm text-slate-600 font-bold">{formatCurrency(p.price)}</td>
                  <td className="py-4 text-sm text-slate-600 font-bold">{formatStock(p.stock, p.spec)}</td>
                  <td className="py-4 text-right">
                    <button
                      onClick={() => deleteProduct(p.id)}
                      disabled={p.stock > 0}
                      className={`p-2 rounded-lg transition-all backdrop-blur-sm ${
                        p.stock > 0 
                          ? 'text-slate-300 cursor-not-allowed' 
                          : 'text-rose-500 hover:bg-rose-50/50'
                      }`}
                      title={p.stock > 0 ? "请先清空库存再删除" : "删除商品"}
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 font-bold">暂无商品数据</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export const ExpensesView = ({
  expenses, addExpense, deleteExpense, formatCurrency, user
}: {
  expenses: Expense[],
  addExpense: (amount: number, category: string, remark: string, date: string) => Promise<boolean>,
  deleteExpense: (id: string | null) => void,
  formatCurrency: (val: number) => string,
  user: User | null
}) => {
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [remark, setRemark] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) return;
    if (!category) return;

    const success = await addExpense(val, category, remark, date);
    if (success) {
      setAmount('');
      setCategory('');
      setRemark('');
    }
  };

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => e.date.startsWith(filterMonth));
  }, [expenses, filterMonth]);

  const monthlyTotal = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [filteredExpenses]);

  const categoryBreakdown = useMemo(() => {
    const breakdown: Record<string, number> = {};
    filteredExpenses.forEach(e => {
      breakdown[e.category] = (breakdown[e.category] || 0) + e.amount;
    });
    return Object.entries(breakdown)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value, percent: (value / (monthlyTotal || 1)) * 100 }));
  }, [filteredExpenses, monthlyTotal]);

  const dailyAverage = useMemo(() => {
    if (filteredExpenses.length === 0) return 0;
    const daysInMonth = new Date(
      parseInt(filterMonth.split('-')[0]),
      parseInt(filterMonth.split('-')[1]),
      0
    ).getDate();
    return monthlyTotal / daysInMonth;
  }, [monthlyTotal, filterMonth, filteredExpenses.length]);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Add Expense Form */}
        <div className="lg:col-span-1">
          <div className="glass rounded-3xl p-8 shadow-xl border-white/30 sticky top-24">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-50/50 backdrop-blur-md rounded-xl border border-rose-100/30">
                  <Plus size={20} className="text-rose-600" />
                </div>
                <h2 className="text-xl font-black text-slate-800 tracking-tight">新增支出</h2>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-wider border border-emerald-100">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                已连数据库
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">金额 (XOF)</label>
                <input
                  type="number"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  className="w-full rounded-2xl border-white/40 bg-white/30 backdrop-blur-sm focus:ring-rose-500 focus:border-rose-500 py-3 font-bold"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">支出项目/类别</label>
                <input
                  type="text"
                  required
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="例如：房租、运费、餐费"
                  className="w-full rounded-2xl border-white/40 bg-white/30 backdrop-blur-sm focus:ring-rose-500 focus:border-rose-500 py-3 font-bold"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">日期</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-2xl border-white/40 bg-white/30 backdrop-blur-sm focus:ring-rose-500 focus:border-rose-500 py-3 font-bold"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">备注</label>
                <textarea
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  placeholder="选填..."
                  className="w-full rounded-2xl border-white/40 bg-white/30 backdrop-blur-sm focus:ring-rose-500 focus:border-rose-500 h-24 font-bold"
                />
              </div>
              <button
                type="submit"
                disabled={user?.role !== 'admin'}
                className={`w-full font-bold py-4 rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 backdrop-blur-md ${
                  user?.role !== 'admin'
                    ? 'bg-slate-200/50 text-slate-400 cursor-not-allowed shadow-none'
                    : 'bg-rose-600/90 hover:bg-rose-700 text-white shadow-rose-200/50'
                }`}
              >
                <Save size={20} />
                {user?.role !== 'admin' ? '无权限' : '确认记账'}
              </button>
            </form>
          </div>
        </div>

        {/* Expense List & Summary */}
        <div className="lg:col-span-2 space-y-8">
          {/* Monthly Summary Card - Improved Visibility */}
          <div className="rounded-3xl p-8 shadow-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white overflow-hidden relative border border-slate-700">
            {/* Decorative background elements */}
            <div className="absolute -right-10 -top-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl" />
            <div className="absolute -left-10 -bottom-10 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl" />
            
            <div className="relative z-10 space-y-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-indigo-300 text-xs font-black uppercase tracking-[0.2em] mb-2">
                    <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                    月度支出总计
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-6xl font-black tracking-tighter text-white drop-shadow-lg">
                      {formatCurrency(monthlyTotal).replace(' XOF', '')}
                    </span>
                    <span className="text-2xl font-bold text-indigo-300/80">XOF</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 bg-white/5 backdrop-blur-xl p-4 rounded-2xl border border-white/10 shadow-inner">
                  <div className="p-2 bg-indigo-500/20 rounded-lg">
                    <Calendar size={20} className="text-indigo-300" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-indigo-300/60 uppercase tracking-wider">选择月份</span>
                    <input 
                      type="month"
                      value={filterMonth}
                      onChange={(e) => setFilterMonth(e.target.value)}
                      className="bg-transparent border-none text-white font-black focus:ring-0 p-0 text-lg cursor-pointer [color-scheme:dark]"
                    />
                  </div>
                </div>
              </div>

              {/* Quick Stats Grid */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">日均支出</div>
                  <div className="text-xl font-black text-indigo-300">{formatCurrency(dailyAverage)}</div>
                </div>
                <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">本月记录</div>
                  <div className="text-xl font-black text-rose-400">{filteredExpenses.length} 笔</div>
                </div>
              </div>
            </div>
          </div>

          {/* Category Breakdown Card */}
          {categoryBreakdown.length > 0 && (
            <div className="glass rounded-3xl p-8 shadow-xl border-white/30">
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                <TrendingUp size={16} className="text-indigo-500" />
                支出分类统计
              </h3>
              <div className="space-y-4">
                {categoryBreakdown.map((item) => (
                  <div key={item.name} className="space-y-2">
                    <div className="flex justify-between text-sm font-bold">
                      <span className="text-slate-700">{item.name}</span>
                      <span className="text-slate-900">{formatCurrency(item.value)} ({item.percent.toFixed(1)}%)</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${item.percent}%` }}
                        className="h-full bg-indigo-500 rounded-full"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Detailed List */}
          <div className="glass rounded-3xl p-8 shadow-xl border-white/30">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                <History size={24} className="text-slate-600" />
                支出明细
              </h2>
              <div className="text-sm font-bold text-slate-400 bg-white/30 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/20">
                本月 {filteredExpenses.length} 笔记录
              </div>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="pb-4 font-bold text-slate-500 text-xs uppercase tracking-wider">日期</th>
                    <th className="pb-4 font-bold text-slate-500 text-xs uppercase tracking-wider">项目</th>
                    <th className="pb-4 font-bold text-slate-500 text-xs uppercase tracking-wider">金额</th>
                    <th className="pb-4 font-bold text-slate-500 text-xs uppercase tracking-wider">备注</th>
                    <th className="pb-4 font-bold text-slate-500 text-xs uppercase tracking-wider text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {filteredExpenses.map((e: Expense) => (
                    <tr key={e.id} className="hover:bg-white/20 transition-colors">
                      <td className="py-4 text-sm font-medium text-slate-500">{e.date}</td>
                      <td className="py-4">
                        <span className="px-3 py-1 bg-white/50 backdrop-blur-sm border border-white/30 rounded-lg text-sm font-bold text-slate-700">
                          {e.category}
                        </span>
                      </td>
                      <td className="py-4 text-sm font-black text-rose-600">{formatCurrency(e.amount)}</td>
                      <td className="py-4 text-sm text-slate-400 font-medium max-w-[200px] truncate" title={e.remark}>
                        {e.remark || '-'}
                      </td>
                      <td className="py-4 text-right">
                        {user?.role === 'admin' && (
                          <button
                            onClick={() => deleteExpense(e.id)}
                            className="p-2 text-rose-500 hover:bg-rose-50/50 rounded-lg transition-all backdrop-blur-sm"
                            title="删除记录"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredExpenses.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-20 text-center">
                        <div className="flex flex-col items-center gap-2 text-slate-400">
                          <Wallet size={48} className="opacity-20 mb-2" />
                          <div className="font-bold">该月份暂无支出记录</div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
