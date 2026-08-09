import React, { useMemo, useRef, useState } from 'react';
import { 
  Package, 
  ArrowLeftRight, 
  Plus, 
  Trash2, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Wallet,
  HandCoins,
  CheckCircle2,
  XCircle,
  History,
  Calendar,
  BarChart3,
  Download,
  Pencil,
  EyeOff,
  Eye,
  Save,
  Search,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Timestamp } from 'firebase/firestore';
import { DashboardMetrics, OrderProduct, Product, ProductRiskMetrics, Transaction, User, Expense, Debt, SalesPeriodData } from '../types';
import { formatDateInputValue, formatDateTimeLabel, getRangeByMonth, isWithinRange, parseIsoWeek, type ReportPeriod } from '../lib/timeWindow';

// --- Components ---

const shoeImageModules = import.meta.glob('../assets/shoe-styles/*.{png,jpg,jpeg,webp}', {
  eager: true,
  import: 'default'
}) as Record<string, string>;

const normalizeModelKey = (value: string) => value.replace(/\s+/g, '').toUpperCase();

const normalizeComparableModelKey = (value: string) =>
  normalizeModelKey(value).replace(/([A-Z])$/, '');

const shoeBackgroundMap = Object.entries(shoeImageModules).reduce<Record<string, string>>((acc, [path, url]) => {
  const fileName = path.split('/').pop() ?? '';
  const baseName = fileName.replace(/\.(png|jpg|jpeg|webp)$/i, '');

  baseName.split('__').forEach(segment => {
    const modelName = segment.split('_')[0];
    if (modelName) {
      acc[normalizeModelKey(modelName)] = url;
      acc[normalizeComparableModelKey(modelName)] = url;
    }
  });

  return acc;
}, {});

const loadXlsxModule = () => import('xlsx-js-style');

function PickerChip({
  type,
  value,
  onChange,
  displayValue,
  ariaLabel,
  min,
  max,
  className = ''
}: {
  type: 'date' | 'week' | 'month';
  value: string;
  onChange: (value: string) => void;
  displayValue: string;
  ariaLabel: string;
  min?: string;
  max?: string;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const openPicker = () => {
    const input = inputRef.current;
    if (!input) return;

    if (typeof input.showPicker === 'function') {
      input.showPicker();
      return;
    }

    input.click();
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type={type}
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value)}
        className="pointer-events-none absolute h-0 w-0 opacity-0"
        tabIndex={-1}
        aria-hidden="true"
      />
      <button
        type="button"
        onClick={openPicker}
        aria-label={ariaLabel}
        className={`flex items-center gap-3 rounded-full border border-white/60 bg-white/46 px-4 py-2 text-sm font-semibold text-slate-700 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-all hover:bg-white/58 ${className}`}
      >
        <span>{displayValue}</span>
        <Calendar size={16} className="text-slate-500" />
      </button>
    </div>
  );
}

// --- Views ---

export const LoginView = ({ handleLogin }: { handleLogin: (u: string, p: string) => Promise<boolean> }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setErrorMessage('');
    const success = await handleLogin(username, password);
    if (!success) {
      setErrorMessage('登录失败，请检查账号或密码。');
    }
    setSubmitting(false);
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
            disabled={submitting}
            className="w-full py-4 bg-indigo-600/90 hover:bg-indigo-700 disabled:opacity-70 text-white font-bold rounded-2xl shadow-lg shadow-indigo-200/50 transition-all active:scale-95 backdrop-blur-md"
          >
            {submitting ? '登录中...' : '登 录'}
          </button>
          {errorMessage && (
            <div className="rounded-xl border border-rose-200/60 bg-rose-50/70 px-3 py-2 text-sm font-bold text-rose-600">
              {errorMessage}
            </div>
          )}
        </form>
        
        <div className="mt-8 pt-6 border-t border-white/20 text-center">
          <p className="text-xs text-slate-400">© 2026 TOP STAR INVENTORY SYSTEM</p>
        </div>
      </motion.div>
    </div>
  );
};

interface SalesReportItem {
  name: string;
  quantity: number;
  amount: number;
  spec: number;
}

interface HomeViewProps {
  stats: { inTotal: number; outTotal: number; balance: number };
  formatCurrency: (value: number) => string;
  reportPeriod: ReportPeriod;
  setReportPeriod: (period: ReportPeriod) => void;
  selectedDate: string;
  setSelectedDate: (value: string) => void;
  selectedWeek: string;
  setSelectedWeek: (value: string) => void;
  selectedMonth: string;
  setSelectedMonth: (value: string) => void;
  reportStartDate: string;
  setReportStartDate: (value: string) => void;
  reportEndDate: string;
  setReportEndDate: (value: string) => void;
  salesReport: {
    items: SalesReportItem[];
    totalAmount: number;
    totalQuantity: number;
    totalExpenses: number;
  };
  formatStock: (total: number, spec: number) => string;
  homeMetrics: {
    selectedMonth: string;
    previousMonth: string;
    estimatedCommission: number;
    warningCount: number;
    staleCount: number;
    salesMoM: number | null;
    expenseMoM: number | null;
  };
}

export const HomeView = ({ 
  stats, formatCurrency, reportPeriod, setReportPeriod, selectedDate, setSelectedDate, 
  selectedWeek, setSelectedWeek, selectedMonth, setSelectedMonth,
  reportStartDate, setReportStartDate, reportEndDate, setReportEndDate,
  salesReport, formatStock, homeMetrics
}: HomeViewProps) => {
  const dateLabel = selectedDate.replaceAll('-', '/');
  const weekLabel = selectedWeek.replace('-W', ' / Week ');
  const monthLabel = selectedMonth.replace('-', '/');
  const reportStartDateLabel = reportStartDate.replaceAll('-', '/');
  const reportEndDateLabel = reportEndDate.replaceAll('-', '/');
  const previousMonthLabel = homeMetrics.previousMonth.replace('-', '/');

  const formatMomValue = (value: number | null) => {
    if (value === null) return '无上月数据';
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  return (
    <div className="space-y-8">
    {/* Finance Dashboard */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      <div className="group relative overflow-hidden glass rounded-3xl p-6 shadow-xl border-white/40 transition-all hover:shadow-2xl hover:-translate-y-1">
        <div className="absolute -right-6 -top-6 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl group-hover:bg-rose-500/10 transition-colors" />
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 bg-rose-50 rounded-2xl border border-rose-100/50">
            <TrendingDown className="text-rose-500" size={24} />
          </div>
          <div className="text-sm font-black text-slate-400 uppercase tracking-widest">库存总成本</div>
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

    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
      <div className="group relative overflow-hidden glass rounded-3xl p-6 shadow-xl border-white/40 transition-all hover:shadow-2xl hover:-translate-y-1">
        <div className="absolute -right-6 -top-6 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-colors" />
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100/50">
            <Wallet className="text-emerald-500" size={24} />
          </div>
          <div className="text-sm font-black text-slate-400 uppercase tracking-widest">预计提成</div>
        </div>
        <div className="text-xl font-black text-emerald-700 tracking-tight">{formatCurrency(homeMetrics.estimatedCommission)}</div>
        <div className="text-[10px] font-bold text-slate-400 mt-2">
          {monthLabel}：销售额 × 3.5% - 开支
        </div>
      </div>

      <div className="group relative overflow-hidden glass rounded-3xl p-6 shadow-xl border-white/40 transition-all hover:shadow-2xl hover:-translate-y-1">
        <div className="absolute -right-6 -top-6 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-colors" />
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 bg-amber-50 rounded-2xl border border-amber-100/50">
            <AlertTriangle className="text-amber-500" size={24} />
          </div>
          <div className="text-sm font-black text-slate-400 uppercase tracking-widest">库存预警款式</div>
        </div>
        <div className="text-xl font-black text-amber-600 tracking-tight">{homeMetrics.warningCount} 款</div>
        <div className="text-[10px] font-bold text-slate-400 mt-2">当前库存小于 30 箱</div>
      </div>

      <div className="group relative overflow-hidden glass rounded-3xl p-6 shadow-xl border-white/40 transition-all hover:shadow-2xl hover:-translate-y-1">
        <div className="absolute -right-6 -top-6 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl group-hover:bg-rose-500/10 transition-colors" />
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 bg-rose-50 rounded-2xl border border-rose-100/50">
            <AlertTriangle className="text-rose-500" size={24} />
          </div>
          <div className="text-sm font-black text-slate-400 uppercase tracking-widest">滞销品</div>
        </div>
        <div className="text-xl font-black text-rose-600 tracking-tight">{homeMetrics.staleCount} 款</div>
        <div className="text-[10px] font-bold text-slate-400 mt-2">30天无销售且库存&gt;0</div>
      </div>

      <div className="group relative overflow-hidden glass rounded-3xl p-6 shadow-xl border-white/40 transition-all hover:shadow-2xl hover:-translate-y-1">
        <div className="absolute -right-6 -top-6 w-24 h-24 bg-sky-500/5 rounded-full blur-2xl group-hover:bg-sky-500/10 transition-colors" />
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 bg-sky-50 rounded-2xl border border-sky-100/50">
            <TrendingUp className="text-sky-500" size={24} />
          </div>
          <div className="text-sm font-black text-slate-400 uppercase tracking-widest">销售额环比</div>
        </div>
        <div className={`text-xl font-black tracking-tight ${homeMetrics.salesMoM !== null && homeMetrics.salesMoM < 0 ? 'text-rose-600' : 'text-sky-700'}`}>
          {formatMomValue(homeMetrics.salesMoM)}
        </div>
        <div className="text-[10px] font-bold text-slate-400 mt-2">{monthLabel} 对比 {previousMonthLabel}</div>
      </div>

      <div className="group relative overflow-hidden glass rounded-3xl p-6 shadow-xl border-white/40 transition-all hover:shadow-2xl hover:-translate-y-1">
        <div className="absolute -right-6 -top-6 w-24 h-24 bg-violet-500/5 rounded-full blur-2xl group-hover:bg-violet-500/10 transition-colors" />
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 bg-violet-50 rounded-2xl border border-violet-100/50">
            <Wallet className="text-violet-500" size={24} />
          </div>
          <div className="text-sm font-black text-slate-400 uppercase tracking-widest">开支环比</div>
        </div>
        <div className={`text-xl font-black tracking-tight ${homeMetrics.expenseMoM !== null && homeMetrics.expenseMoM > 0 ? 'text-rose-600' : 'text-violet-700'}`}>
          {formatMomValue(homeMetrics.expenseMoM)}
        </div>
        <div className="text-[10px] font-bold text-slate-400 mt-2">{monthLabel} 对比 {previousMonthLabel}</div>
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
            <button
              onClick={() => setReportPeriod('range')}
              className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
                reportPeriod === 'range' ? 'bg-white/80 text-indigo-600 shadow-sm backdrop-blur-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              日期区间
            </button>
          </div>

          <div className="flex items-center gap-2">
            {reportPeriod === 'day' && (
              <PickerChip
                type="date"
                value={selectedDate}
                onChange={setSelectedDate}
                displayValue={dateLabel}
                ariaLabel="选择日期"
              />
            )}
            {reportPeriod === 'week' && (
              <PickerChip
                type="week"
                value={selectedWeek}
                onChange={setSelectedWeek}
                displayValue={weekLabel}
                ariaLabel="选择周"
              />
            )}
            {reportPeriod === 'month' && (
              <PickerChip
                type="month"
                value={selectedMonth}
                onChange={setSelectedMonth}
                displayValue={monthLabel}
                ariaLabel="选择月份"
              />
            )}
            {reportPeriod === 'range' && (
              <div className="flex flex-wrap items-center gap-2">
                <PickerChip
                  type="date"
                  value={reportStartDate}
                  max={reportEndDate}
                  onChange={setReportStartDate}
                  displayValue={reportStartDateLabel}
                  ariaLabel="选择开始日期"
                />
                <span className="text-sm font-bold text-slate-400">至</span>
                <PickerChip
                  type="date"
                  value={reportEndDate}
                  min={reportStartDate}
                  onChange={setReportEndDate}
                  displayValue={reportEndDateLabel}
                  ariaLabel="选择结束日期"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Summary Stats */}
        <div className="lg:col-span-1 space-y-4">
          <div className="p-5 rounded-2xl bg-indigo-50/52 backdrop-blur-xl border border-indigo-100/50 shadow-[0_16px_32px_rgba(99,102,241,0.12)] ring-1 ring-white/45 transition-all hover:-translate-y-0.5 hover:shadow-[0_20px_38px_rgba(99,102,241,0.16)]">
            <div className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">所选期间总额</div>
            <div className="text-xl font-black text-indigo-700">{formatCurrency(salesReport.totalAmount)}</div>
          </div>
          <div className="p-5 rounded-2xl bg-white/46 backdrop-blur-xl border border-white/45 shadow-[0_16px_32px_rgba(15,23,42,0.08)] ring-1 ring-white/4 transition-all hover:-translate-y-0.5 hover:shadow-[0_20px_38px_rgba(15,23,42,0.12)]">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">销售总箱数</div>
              <div className="text-xl font-black text-slate-700">
                {(() => {
                  const totalBoxes = salesReport.items.reduce((sum: number, item: SalesReportItem) => sum + Math.floor(item.quantity / item.spec), 0);
                  const totalItems = salesReport.items.reduce((sum: number, item: SalesReportItem) => sum + (item.quantity % item.spec), 0);
                  return `${totalBoxes} 箱${totalItems > 0 ? ` + ${totalItems} 个` : ''}`;
                })()}
              </div>
            </div>
        </div>

        {/* Product Breakdown */}
        <div className="lg:col-span-3">
          <div className="rounded-2xl overflow-hidden border border-white/40 bg-white/32 backdrop-blur-xl shadow-[0_18px_36px_rgba(15,23,42,0.09)] ring-1 ring-white/40">
            <table className="w-full text-left">
              <thead className="bg-white/42">
                <tr>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">商品名称</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">销售数量</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase text-right">销售金额</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {salesReport.items.map((item: SalesReportItem, idx: number) => (
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

    </div>
  );
};

interface DashboardViewProps {
  metrics: DashboardMetrics;
  setHotMonth: (value: string) => void;
  formatCurrency: (value: number) => string;
  formatStock: (total: number, spec: number) => string;
}

const formatMomText = (value: number | null) => {
  if (value === null) return '--';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
};

const formatDashboardCompactCurrency = (value: number) => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return `${Math.round(value)}`;
};

export const DashboardView = ({ metrics, setHotMonth, formatCurrency, formatStock }: DashboardViewProps) => {
  const selectedMonthLabel = `${metrics.selectedMonthKey.slice(0, 4)}年${metrics.selectedMonthKey.slice(5)}月`;
  const hotMonthLabel = `${metrics.hotMonthKey.slice(0, 4)}年${metrics.hotMonthKey.slice(5)}月`;
  const hasSalesSeriesData = metrics.monthlySalesSeries.some((item) => item.salesTotal > 0);
  const yearSalesTotal = metrics.monthlySalesSeries.reduce((total, item) => total + item.salesTotal, 0);
  const bestMonth = metrics.monthlySalesSeries.reduce(
    (best, item) => (item.salesTotal > best.salesTotal ? item : best),
    metrics.monthlySalesSeries[0] ?? { monthKey: '', monthLabel: '--', salesTotal: 0 }
  );
  const bestMonthLabel = hasSalesSeriesData ? bestMonth.monthLabel : '--';

  const barChart = useMemo(() => {
    const width = 760;
    const height = 330;
    const margin = { top: 34, right: 18, bottom: 46, left: 58 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    const rawMax = Math.max(...metrics.monthlySalesSeries.map((item) => item.salesTotal), 0);
    const maxValue = rawMax > 0 ? Math.ceil(rawMax / 1000000 / 10) * 10 * 1000000 : 0;
    const ticks = maxValue > 0
      ? [maxValue, maxValue * 0.75, maxValue * 0.5, maxValue * 0.25, 0]
      : [0];
    const step = metrics.monthlySalesSeries.length > 0 ? plotWidth / metrics.monthlySalesSeries.length : plotWidth;
    const barWidth = Math.min(84, step * 0.62);
    const monthPoints = metrics.monthlySalesSeries.map((item, index) => {
      const x = margin.left + step * index + step / 2;
      const barHeight = maxValue > 0 ? (item.salesTotal / maxValue) * plotHeight : 0;
      const y = margin.top + plotHeight - barHeight;
      return {
        ...item,
        x,
        y,
        barHeight,
        barWidth
      };
    });

    return {
      width,
      height,
      margin,
      plotWidth,
      plotHeight,
      maxValue,
      ticks,
      monthPoints
    };
  }, [metrics.monthlySalesSeries]);

  const momChart = useMemo(() => {
    const width = 760;
    const height = 330;
    const margin = { top: 34, right: 18, bottom: 46, left: 58 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    const salesMoMValues = metrics.monthlyMomSeries
      .map((item) => item.salesMoM)
      .filter((value): value is number => value !== null);
    const rawMax = Math.max(...salesMoMValues, 0);
    const rawMin = Math.min(...salesMoMValues, 0);
    const maxAbs = Math.max(Math.abs(rawMax), Math.abs(rawMin), 10);
    const axisLimit = Math.ceil(maxAbs / 10) * 10;
    const minValue = -axisLimit;
    const maxValue = axisLimit;
    const ticks = [maxValue, maxValue / 2, 0, minValue / 2, minValue];
    const step = metrics.monthlySalesSeries.length > 1
      ? plotWidth / (metrics.monthlySalesSeries.length - 1)
      : plotWidth;
    const yForValue = (value: number) => {
      const normalized = (maxValue - value) / (maxValue - minValue);
      return margin.top + normalized * plotHeight;
    };
    const monthByKey = new Map(metrics.monthlySalesSeries.map((item, index) => [item.monthKey, index]));
    const buildPoints = (extractor: (item: DashboardMetrics['monthlyMomSeries'][number]) => number | null) => {
      return metrics.monthlyMomSeries.flatMap((item) => {
        const value = extractor(item);
        const index = monthByKey.get(item.monthKey);
        if (value === null || index === undefined) return [];
        const x = margin.left + step * index;
        const y = yForValue(value);
        return [{ x, y, value }];
      });
    };

    const salesPoints = buildPoints((item) => item.salesMoM);

    return {
      width,
      height,
      margin,
      plotWidth,
      plotHeight,
      minValue,
      maxValue,
      ticks,
      salesPoints,
      salesPolyline: salesPoints.map((point) => `${point.x},${point.y}`).join(' '),
      hasData: salesPoints.length > 0
    };
  }, [metrics.monthlyMomSeries, metrics.monthlySalesSeries]);

  const summaryCards = [
    {
      title: '当月销售额',
      value: formatCurrency(metrics.currentMonthSalesTotal),
      month: selectedMonthLabel,
      helper: `年度累计 ${formatDashboardCompactCurrency(yearSalesTotal)}`,
      icon: <BarChart3 size={22} className="text-white" />,
      valueClassName: 'text-slate-950',
      iconClassName: 'bg-[#5b5df7] shadow-[0_16px_34px_rgba(91,93,247,0.32)]',
      accentClassName: 'from-[#eef2ff] via-white to-white',
      sparkClassName: 'bg-[#5b5df7]/14'
    },
    {
      title: '销售环比',
      value: formatMomText(metrics.currentMonthSalesMoM),
      month: selectedMonthLabel,
      helper: metrics.currentMonthSalesMoM === null ? '首月暂无环比' : (metrics.currentMonthSalesMoM >= 0 ? '较上月增长' : '较上月回落'),
      icon: metrics.currentMonthSalesMoM !== null && metrics.currentMonthSalesMoM >= 0
        ? <TrendingUp size={22} className="text-white" />
        : <TrendingDown size={22} className="text-white" />,
      valueClassName: metrics.currentMonthSalesMoM !== null && metrics.currentMonthSalesMoM < 0 ? 'text-rose-500' : 'text-emerald-500',
      iconClassName: metrics.currentMonthSalesMoM !== null && metrics.currentMonthSalesMoM < 0
        ? 'bg-[#e94b62] shadow-[0_16px_34px_rgba(233,75,98,0.28)]'
        : 'bg-[#47b881] shadow-[0_16px_34px_rgba(71,184,129,0.28)]',
      accentClassName: metrics.currentMonthSalesMoM !== null && metrics.currentMonthSalesMoM < 0
        ? 'from-[#fff1f3] via-white to-white'
        : 'from-[#ecfdf5] via-white to-white',
      sparkClassName: metrics.currentMonthSalesMoM !== null && metrics.currentMonthSalesMoM < 0 ? 'bg-rose-400/14' : 'bg-emerald-400/16'
    }
  ] as const;

  const getRankBadgeClassName = (index: number) => {
    if (index === 0) return 'bg-amber-400/90 text-white';
    if (index === 1) return 'bg-slate-300/90 text-white';
    if (index === 2) return 'bg-orange-300/90 text-white';
    return 'bg-slate-100 text-slate-500';
  };

  const renderHotList = (items: DashboardMetrics['hotByAmount'], mode: 'amount' | 'volume') => {
    const barClassName = mode === 'amount'
      ? 'bg-gradient-to-r from-[#5b5df7] to-[#9aa3ff]'
      : 'bg-gradient-to-r from-[#20b486] to-[#8ddcb1]';
    const shareClassName = mode === 'amount' ? 'text-[#5b5df7]' : 'text-[#17966f]';

    if (items.length === 0) {
      return (
        <div className="flex min-h-[186px] items-center justify-center rounded-[24px] border border-dashed border-slate-200/80 bg-gradient-to-br from-white to-slate-50/80 px-4 py-10 text-center">
          <div>
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <BarChart3 size={20} />
            </div>
            <div className="text-sm font-black text-slate-400">暂无数据</div>
            <div className="mt-1 text-xs font-bold text-slate-300">{hotMonthLabel} 没有销售记录</div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {items.map((item, index) => (
          <div key={`${mode}-${item.productId}-${index}`} className="rounded-[20px] border border-slate-100 bg-white/80 px-4 py-3.5 shadow-[0_10px_22px_rgba(15,23,42,0.045)]">
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 h-8 w-8 shrink-0 rounded-xl text-center text-xs font-black leading-8 shadow-sm ${getRankBadgeClassName(index)}`}>
                {index + 1}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-base font-black text-slate-900">{item.productName}</div>
                    <div className="text-xs font-semibold text-slate-400">
                      {mode === 'amount' ? formatStock(item.quantity, item.spec) : `${item.boxes.toFixed(2)} 箱`}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-slate-900">
                      {mode === 'amount' ? formatCurrency(item.value) : `${item.boxes.toFixed(2)} 箱`}
                    </div>
                    <div className={`text-xs font-black ${shareClassName}`}>
                      {item.share.toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="ml-11 mt-3 h-2.5 w-[calc(100%-2.75rem)] overflow-hidden rounded-full bg-slate-100/90">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(item.share, 100)}%` }}
                className={`h-full rounded-full ${barClassName}`}
              />
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-5 sm:space-y-7">
      <section className="relative overflow-hidden rounded-[26px] border border-white/70 bg-[radial-gradient(circle_at_15%_15%,rgba(91,93,247,0.14),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.94),rgba(248,250,252,0.82))] p-4 shadow-[0_18px_42px_rgba(15,23,42,0.09)] backdrop-blur-xl sm:rounded-[32px] sm:p-6">
        <div className="absolute right-6 top-6 hidden h-24 w-24 rounded-full border border-[#5b5df7]/12 bg-white/45 lg:block" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#5b5df7]/12 bg-white/74 px-3 py-1.5 text-xs font-black text-[#5b5df7] shadow-sm">
              <BarChart3 size={15} />
              销售数据看板
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">从月度趋势到热门产品，一屏看清销售表现</h1>
            <p className="mt-2 max-w-2xl text-xs font-bold leading-5 text-slate-500 sm:text-sm sm:leading-6">
              当前看板按实际出库流水计算销售额，展示 {metrics.selectedYear} 年 1 月至当前月的销售趋势、环比变化和选定月份的产品排行。
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:flex">
            <div className="rounded-2xl border border-white/80 bg-white/78 px-4 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
              <div className="text-xs font-black text-slate-400">当前月份</div>
              <div className="mt-1 text-lg font-black text-slate-900">{selectedMonthLabel}</div>
            </div>
            <div className="rounded-2xl border border-white/80 bg-white/78 px-4 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
              <div className="text-xs font-black text-slate-400">最高月份</div>
              <div className="mt-1 text-lg font-black text-slate-900">{bestMonthLabel}</div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
        {summaryCards.map((card) => (
          <div key={card.title} className={`relative overflow-hidden rounded-[24px] border border-white/75 bg-gradient-to-br ${card.accentClassName} px-4 py-4 shadow-[0_16px_34px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:rounded-[28px] sm:px-6 sm:py-5`}>
            <div className="absolute -right-10 -top-12 h-36 w-36 rounded-full bg-white/55" />
            <div className="flex items-start justify-between gap-3 sm:gap-4">
              <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] sm:h-16 sm:w-16 sm:rounded-[22px] ${card.iconClassName}`}>
                {card.icon}
              </div>
              <div className="relative flex-1">
                <div className="text-sm font-black text-slate-500 mb-1">{card.title}</div>
                <div className={`text-3xl leading-tight font-black sm:text-4xl ${card.valueClassName ?? 'text-slate-900'}`}>{card.value}</div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold">
                  <span className="rounded-full bg-white/80 px-2.5 py-1 text-slate-400">{card.month}</span>
                  <span className="rounded-full bg-white/80 px-2.5 py-1 text-slate-400">{card.helper}</span>
                </div>
              </div>
              <div className="hidden sm:flex items-end gap-1.5 opacity-30 pt-2">
                <span className={`h-6 w-3 rounded-md ${card.sparkClassName}`} />
                <span className={`h-9 w-3 rounded-md ${card.sparkClassName}`} />
                <span className={`h-12 w-3 rounded-md ${card.sparkClassName}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 2xl:grid-cols-2 2xl:gap-6">
        <section className="rounded-[26px] border border-white/70 bg-white/86 p-4 shadow-[0_16px_36px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:rounded-[30px] sm:p-6">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-900 sm:text-xl">月销售柱形图</h2>
              <p className="mt-1 text-xs font-bold text-slate-400">每根柱代表当月出库销售额</p>
            </div>
            <span className="rounded-full bg-slate-100/80 px-3 py-1.5 text-xs font-black text-slate-500">{metrics.selectedYear}年 1月 - 当前月</span>
          </div>
          {!hasSalesSeriesData && (
            <div className="rounded-[24px] border border-dashed border-slate-200/70 bg-gradient-to-br from-white to-slate-50/80 px-4 py-16 text-center text-sm font-semibold text-slate-400">
              暂无数据
            </div>
          )}
          {hasSalesSeriesData && (
            <div className="rounded-[22px] border border-slate-100 bg-gradient-to-br from-white to-slate-50/70 px-1 py-2 shadow-inner sm:rounded-[24px] sm:px-2 sm:py-3">
              <svg viewBox={`0 0 ${barChart.width} ${barChart.height}`} className="h-[240px] w-full overflow-visible sm:h-[320px]">
                <defs>
                  <linearGradient id="dashboardSalesBarGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#aab1ff" />
                    <stop offset="100%" stopColor="#6257f7" />
                  </linearGradient>
                  <filter id="dashboardSalesBarShadow" x="-30%" y="-20%" width="160%" height="150%">
                    <feDropShadow dx="0" dy="12" stdDeviation="10" floodColor="#6366f1" floodOpacity="0.22" />
                  </filter>
                </defs>
                {barChart.ticks.map((tick) => {
                  const y = barChart.maxValue > 0
                    ? barChart.margin.top + (1 - tick / barChart.maxValue) * barChart.plotHeight
                    : barChart.margin.top + barChart.plotHeight;
                  return (
                    <g key={tick}>
                      <line
                        x1={barChart.margin.left}
                        y1={y}
                        x2={barChart.margin.left + barChart.plotWidth}
                        y2={y}
                        stroke="#dbe3f0"
                        strokeDasharray="4 5"
                      />
                      <text x={10} y={y + 4} fill="#94a3b8" fontSize="14" fontWeight="800">
                        {tick === 0 ? '0' : formatDashboardCompactCurrency(tick)}
                      </text>
                    </g>
                  );
                })}
                {barChart.monthPoints.map((item) => (
                  <g key={item.monthKey}>
                    {item.salesTotal > 0 && (
                      <>
                        <text x={item.x} y={Math.max(18, item.y - 12)} textAnchor="middle" fill="#64748b" fontSize="14" fontWeight="900">
                          {(item.salesTotal / 1000000).toFixed(1)}M
                        </text>
                        <rect
                          x={item.x - item.barWidth / 2}
                          y={item.y}
                          width={item.barWidth}
                          height={item.barHeight}
                          rx="12"
                          fill="url(#dashboardSalesBarGradient)"
                          filter="url(#dashboardSalesBarShadow)"
                        />
                      </>
                    )}
                    <text x={item.x} y={barChart.height - 12} textAnchor="middle" fill="#64748b" fontSize="15" fontWeight="900">
                      {item.monthLabel}
                    </text>
                  </g>
                ))}
              </svg>
            </div>
          )}
        </section>

        <section className="rounded-[26px] border border-white/70 bg-white/86 p-4 shadow-[0_16px_36px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:rounded-[30px] sm:p-6">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-900 sm:text-xl">销售环比趋势图</h2>
              <p className="mt-1 text-xs font-bold text-slate-400">只展示销售额相对上月的变化</p>
            </div>
            <span className="rounded-full bg-[#5b5df7]/10 px-3 py-1.5 text-xs font-black text-[#5b5df7]">销售额</span>
          </div>
          {!momChart.hasData && (
            <div className="rounded-[24px] border border-dashed border-slate-200/70 bg-gradient-to-br from-white to-slate-50/80 px-4 py-16 text-center text-sm font-semibold text-slate-400">
              暂无数据
            </div>
          )}
          {momChart.hasData && (
            <div className="space-y-4">
              <div className="rounded-[22px] border border-slate-100 bg-gradient-to-br from-white to-slate-50/70 px-1 py-2 shadow-inner sm:rounded-[24px] sm:px-2 sm:py-3">
                <svg viewBox={`0 0 ${momChart.width} ${momChart.height}`} className="h-[240px] w-full overflow-visible sm:h-[320px]">
                  <defs>
                    <filter id="dashboardMomLineGlow" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#5b5df7" floodOpacity="0.18" />
                    </filter>
                  </defs>
                  {momChart.ticks.map((tick) => {
                    const y = momChart.margin.top + ((momChart.maxValue - tick) / (momChart.maxValue - momChart.minValue)) * momChart.plotHeight;
                    return (
                      <g key={tick}>
                        <line
                          x1={momChart.margin.left}
                          y1={y}
                          x2={momChart.margin.left + momChart.plotWidth}
                          y2={y}
                          stroke={tick === 0 ? '#94a3b8' : '#cbd5e1'}
                          strokeDasharray={tick === 0 ? '0' : '4 5'}
                        />
                        <text x={8} y={y + 4} fontSize="14" fill="#94a3b8" fontWeight="800">{`${tick.toFixed(0)}%`}</text>
                      </g>
                    );
                  })}
                  {momChart.salesPolyline && (
                    <polyline fill="none" stroke="#5b5df7" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" points={momChart.salesPolyline} filter="url(#dashboardMomLineGlow)" />
                  )}
                  {momChart.salesPoints.map((point, index) => {
                    const labelY = Math.max(
                      momChart.margin.top + 12,
                      Math.min(
                        point.y + (point.value < 0 ? 22 : -16),
                        momChart.margin.top + momChart.plotHeight - 8
                      )
                    );
                    const labelTone = point.value < 0 ? '#e11d48' : '#4f46e5';

                    return (
                      <g key={`sales-dot-${index}`}>
                        <circle cx={point.x} cy={point.y} r="8" fill="#5b5df7" opacity="0.12" />
                        <circle cx={point.x} cy={point.y} r="4.8" fill="#5b5df7">
                          <title>{`销售额环比 ${formatMomText(point.value)}`}</title>
                        </circle>
                        <text
                          x={point.x}
                          y={labelY}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fill={labelTone}
                          stroke="#ffffff"
                          strokeWidth="5"
                          paintOrder="stroke"
                          fontSize="13"
                          fontWeight="900"
                        >
                          {formatMomText(point.value)}
                        </text>
                      </g>
                    );
                  })}
                  {metrics.monthlySalesSeries.map((item, index) => {
                    const x = metrics.monthlySalesSeries.length > 1
                      ? momChart.margin.left + (momChart.plotWidth / (metrics.monthlySalesSeries.length - 1)) * index
                      : momChart.margin.left + momChart.plotWidth / 2;
                    return (
                      <text key={item.monthKey} x={x} y={momChart.height - 12} textAnchor="middle" fill="#64748b" fontSize="15" fontWeight="900">
                        {item.monthLabel}
                      </text>
                    );
                  })}
                </svg>
              </div>
              <div className="flex flex-wrap items-center gap-5 text-xs font-black text-slate-500">
                <span className="inline-flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#5b5df7]" />
                  销售额环比
                </span>
                <span className="text-slate-300">0% 线表示与上月持平</span>
              </div>
            </div>
          )}
        </section>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col gap-3 rounded-[26px] border border-white/70 bg-white/82 px-4 py-4 shadow-[0_14px_32px_rgba(15,23,42,0.07)] backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:rounded-[30px] sm:px-6">
          <div>
            <h2 className="text-lg font-black text-slate-900 sm:text-xl">热门产品月销售对比</h2>
            <p className="mt-1 text-xs font-bold text-slate-400">选择月份后，同步查看销售额 Top5 与销量 Top5</p>
          </div>
          <PickerChip
            type="month"
            value={metrics.hotMonthKey}
            onChange={setHotMonth}
            displayValue={metrics.hotMonthKey.replace('-', '/')}
            ariaLabel="选择热门产品对比月份"
            className="w-full sm:w-auto"
          />
        </div>
        <div className="grid grid-cols-1 gap-5 2xl:grid-cols-2 2xl:gap-6">
        <section className="rounded-[26px] border border-white/70 bg-white/86 p-4 shadow-[0_16px_36px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:rounded-[30px] sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-900">热门产品销售额占比 Top5</h2>
              <p className="mt-1 text-xs font-bold text-slate-400">按销售额排序</p>
            </div>
            <span className="shrink-0 rounded-full bg-[#5b5df7]/10 px-3 py-1.5 text-xs font-black text-[#5b5df7]">{hotMonthLabel}</span>
          </div>
          {renderHotList(metrics.hotByAmount, 'amount')}
        </section>
        <section className="rounded-[26px] border border-white/70 bg-white/86 p-4 shadow-[0_16px_36px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:rounded-[30px] sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-900">热门产品销量占比 Top5</h2>
              <p className="mt-1 text-xs font-bold text-slate-400">按箱数排序</p>
            </div>
            <span className="shrink-0 rounded-full bg-emerald-400/12 px-3 py-1.5 text-xs font-black text-emerald-600">{hotMonthLabel}</span>
          </div>
          {renderHotList(metrics.hotByVolume, 'volume')}
        </section>
        </div>
      </div>
    </div>
  );
};

interface InventoryOverviewViewProps {
  mode: 'warnings' | 'stale' | 'stock' | 'comparison';
  warnings: Product[];
  staleProducts: Product[];
  productRiskMetricsByProduct: Record<string, ProductRiskMetrics>;
  products: Product[];
  transactions: Transaction[];
  formatStock: (total: number, spec: number) => string;
  weeklySalesPeriods: SalesPeriodData;
  monthlySalesPeriods: SalesPeriodData;
  comparisonMode: 'week' | 'month';
  setComparisonMode: (value: 'week' | 'month') => void;
  showToast: (message: string, type?: 'success' | 'error') => void;
}

export const InventoryOverviewView = ({
  mode,
  warnings,
  staleProducts,
  productRiskMetricsByProduct,
  products,
  transactions,
  formatStock,
  weeklySalesPeriods,
  monthlySalesPeriods,
  comparisonMode,
  setComparisonMode,
  showToast
}: InventoryOverviewViewProps) => {
  const [comparisonSearchTerm, setComparisonSearchTerm] = useState('');
  const [stockSearchTerm, setStockSearchTerm] = useState('');

  const sortedWarnings = useMemo(() => {
    if (mode !== 'warnings') return [] as Product[];
    return [...warnings].sort((a, b) => {
      const weeklySalesDiff =
        ((productRiskMetricsByProduct[b.id]?.avgDailyBoxes30d ?? 0) * 7) -
        ((productRiskMetricsByProduct[a.id]?.avgDailyBoxes30d ?? 0) * 7);
      if (weeklySalesDiff !== 0) return weeklySalesDiff;
      return a.name.localeCompare(b.name);
    });
  }, [mode, warnings, productRiskMetricsByProduct]);

  const sortedStaleProducts = useMemo(() => {
    if (mode !== 'stale') return [] as Product[];
    return [...staleProducts].sort((a, b) => {
      const aDays = productRiskMetricsByProduct[a.id]?.daysSinceLastSale ?? null;
      const bDays = productRiskMetricsByProduct[b.id]?.daysSinceLastSale ?? null;

      if (aDays === null && bDays === null) return a.name.localeCompare(b.name);
      if (aDays === null) return -1;
      if (bDays === null) return 1;

      const timeDiff = bDays - aDays;
      if (timeDiff !== 0) return timeDiff;
      return a.name.localeCompare(b.name);
    });
  }, [mode, staleProducts, productRiskMetricsByProduct]);

  const formatLastSaleDate = (metrics: ProductRiskMetrics | undefined) => {
    if (!metrics || metrics.daysSinceLastSale === null) return '暂无销售记录';
    return `距今天 ${metrics.daysSinceLastSale} 天`;
  };

  const totalSoldByProduct = useMemo(() => {
    if (mode !== 'stock') return {} as Record<string, number>;
    const soldMap: Record<string, number> = {};
    for (const product of products) {
      soldMap[product.id] = 0;
    }
    for (const transaction of transactions) {
      if (transaction.type !== 'out') continue;
      if (!(transaction.productId in soldMap)) continue;
      soldMap[transaction.productId] += transaction.quantity;
    }
    return soldMap;
  }, [mode, products, transactions]);

  const sortedProducts = useMemo(() => {
    if (mode !== 'stock') return [] as Product[];
    return [...products].sort((a, b) => {
      const aBoxes = (totalSoldByProduct[a.id] ?? 0) / (a.spec || 1);
      const bBoxes = (totalSoldByProduct[b.id] ?? 0) / (b.spec || 1);
      if (bBoxes !== aBoxes) return bBoxes - aBoxes;

      const soldDiff = (totalSoldByProduct[b.id] ?? 0) - (totalSoldByProduct[a.id] ?? 0);
      if (soldDiff !== 0) return soldDiff;

      return a.name.localeCompare(b.name);
    });
  }, [mode, products, totalSoldByProduct]);

  const normalizedStockSearchTerm = normalizeModelKey(stockSearchTerm);
  const visibleStockProducts = normalizedStockSearchTerm
    ? sortedProducts.filter((product) => normalizeModelKey(product.name).includes(normalizedStockSearchTerm))
    : sortedProducts;

  const toRemainingBoxesNumber = (stock: number, spec: number): number => {
    const boxes = stock / spec;
    return Number.isInteger(boxes) ? boxes : Number(boxes.toFixed(2));
  };

  const exportStyledSheet = async (rows: Array<Array<string | number>>, sheetName: string, fileName: string) => {
    const XLSX = await loadXlsxModule();
    const header = ['名称', '规格', '剩余库存'];
    const table = [header, ...rows];

    const worksheet = XLSX.utils.aoa_to_sheet(table);
    worksheet['!cols'] = [{ wch: 18 }, { wch: 14 }, { wch: 18 }];
    worksheet['!rows'] = table.map((_, index) => ({ hpt: index === 0 ? 26 : 22 }));

    const range = XLSX.utils.decode_range(worksheet['!ref'] ?? 'A1:C1');
    for (let rowIndex = range.s.r; rowIndex <= range.e.r; rowIndex += 1) {
      for (let colIndex = range.s.c; colIndex <= range.e.c; colIndex += 1) {
        const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
        const cell = worksheet[cellAddress];
        if (!cell) continue;

        const isHeader = rowIndex === 0;
        cell.s = {
          alignment: {
            horizontal: 'center',
            vertical: 'center'
          },
          font: {
            name: 'Microsoft YaHei',
            sz: isHeader ? 12 : 11,
            bold: isHeader,
            color: { rgb: '1E293B' }
          },
          fill: {
            fgColor: { rgb: isHeader ? 'E8EEFF' : 'FFFFFF' }
          },
          border: {
            top: { style: 'thin', color: { rgb: 'D6DCE8' } },
            bottom: { style: 'thin', color: { rgb: 'D6DCE8' } },
            left: { style: 'thin', color: { rgb: 'D6DCE8' } },
            right: { style: 'thin', color: { rgb: 'D6DCE8' } }
          }
        };
      }
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, fileName);
  };

  const handleExportWarningList = async () => {
    try {
      const rows = sortedWarnings.map((p: Product) => [p.name, `${p.spec} 个/箱`, toRemainingBoxesNumber(p.stock, p.spec)]);
      await exportStyledSheet(rows, '要货列表', '要货列表.xlsx');
    } catch (error) {
      console.error('Export warning list failed:', error);
      showToast('导出失败，请重试', 'error');
    }
  };

  const handleExportRemainingStock = async () => {
    try {
      const rows = sortedProducts.map((p: Product) => [p.name, `${p.spec} 个/箱`, toRemainingBoxesNumber(p.stock, p.spec)]);
      await exportStyledSheet(rows, '剩余库存', '剩余库存.xlsx');
    } catch (error) {
      console.error('Export remaining stock failed:', error);
      showToast('导出失败，请重试', 'error');
    }
  };

  const formatBoxesValue = (value: number) => {
    return value.toLocaleString('zh-CN', { maximumFractionDigits: 4 });
  };

  if (mode === 'warnings') {
    return (
      <div className="space-y-8">
        <div className="glass rounded-2xl p-6 shadow-sm border-white/20">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="text-amber-500" size={20} />
              <h2 className="text-lg font-semibold text-slate-800">库存预警 (库存&lt;30箱 或 可售&lt;14天)</h2>
            </div>
            <button
              type="button"
              onClick={handleExportWarningList}
              disabled={sortedWarnings.length === 0}
              className="inline-flex items-center justify-center rounded-xl border border-indigo-200/60 bg-indigo-500/90 px-4 py-2 text-sm font-bold text-white shadow-[0_12px_26px_rgba(99,102,241,0.28)] transition-all hover:bg-indigo-600 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none"
            >
              导出要货列表
            </button>
          </div>
          {sortedWarnings.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedWarnings.map((p: Product) => (
                <div key={p.id} className="relative overflow-hidden p-5 rounded-2xl border border-rose-200/45 bg-white/60 backdrop-blur-xl shadow-[0_18px_36px_rgba(244,63,94,0.12)] ring-1 ring-white/45 transition-all hover:-translate-y-0.5 hover:shadow-[0_22px_42px_rgba(244,63,94,0.16)]">
                  {shoeBackgroundMap[normalizeComparableModelKey(p.name)] && (
                    <>
                      <div
                        className="absolute inset-0 bg-center bg-cover opacity-[0.08] scale-110"
                        style={{ backgroundImage: `url(${shoeBackgroundMap[normalizeComparableModelKey(p.name)]})` }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-br from-white/96 via-white/88 to-rose-50/78" />
                    </>
                  )}
                  <div className="relative z-10 font-semibold text-slate-950 drop-shadow-[0_1px_0_rgba(255,255,255,0.65)]">{p.name}</div>
                  <div className="relative z-10 text-sm font-semibold text-slate-600">规格: {p.spec} 个/箱</div>
                  <div className="relative z-10 mt-1 text-sm font-semibold text-slate-600">
                    近30天周均销量: {((productRiskMetricsByProduct[p.id]?.avgDailyBoxes30d ?? 0) * 7).toFixed(1)} 箱
                  </div>
                  <div className="relative z-10 mt-1 text-xs font-semibold text-slate-600">
                    可售天数: {Number.isFinite(productRiskMetricsByProduct[p.id]?.daysOfCover ?? Number.POSITIVE_INFINITY)
                      ? `${(productRiskMetricsByProduct[p.id]?.daysOfCover ?? 0).toFixed(1)} 天`
                      : '∞'}
                  </div>
                  <div className="relative z-10 mt-1 text-xs font-bold text-rose-600">
                    触发原因: {(productRiskMetricsByProduct[p.id]?.warningReasons ?? []).join(' / ')}
                  </div>
                  <div className="relative z-10 mt-2 text-rose-600 font-black">
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
      </div>
    );
  }

  if (mode === 'stale') {
    return (
      <div className="space-y-8">
        <div className="rounded-2xl p-6 shadow-sm border border-amber-100/60 bg-amber-50/40 backdrop-blur-xl">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="text-amber-500" size={20} />
            <h2 className="text-lg font-semibold text-slate-800">滞销品明细 (30天无销售且库存&gt;0)</h2>
          </div>
          {sortedStaleProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedStaleProducts.map((p: Product) => (
                <div key={p.id} className="relative overflow-hidden p-5 rounded-2xl border border-amber-200/50 bg-amber-50/60 backdrop-blur-xl shadow-[0_18px_36px_rgba(251,191,36,0.14)] ring-1 ring-white/45 transition-all hover:-translate-y-0.5 hover:shadow-[0_22px_42px_rgba(251,191,36,0.18)]">
                  {shoeBackgroundMap[normalizeComparableModelKey(p.name)] && (
                    <>
                      <div
                        className="absolute inset-0 bg-center bg-cover opacity-[0.07] scale-110"
                        style={{ backgroundImage: `url(${shoeBackgroundMap[normalizeComparableModelKey(p.name)]})` }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-br from-amber-50/95 via-white/90 to-amber-100/70" />
                    </>
                  )}
                  <div className="relative z-10 font-semibold text-slate-950 drop-shadow-[0_1px_0_rgba(255,255,255,0.65)]">{p.name}</div>
                  <div className="relative z-10 text-sm font-semibold text-slate-600">规格: {p.spec} 个/箱</div>
                  <div className="relative z-10 mt-1 text-sm font-semibold text-slate-600">
                    {formatLastSaleDate(productRiskMetricsByProduct[p.id])}
                  </div>
                  <div className="relative z-10 mt-2 text-amber-700 font-black">
                    当前库存: {formatStock(p.stock, p.spec)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50/40 backdrop-blur-sm p-4 rounded-xl border border-emerald-100/40">
              <CheckCircle2 size={18} />
              <span>暂无滞销品</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (mode === 'comparison') {
    const isWeekMode = comparisonMode === 'week';
    const salesPeriodData = isWeekMode ? weeklySalesPeriods : monthlySalesPeriods;
    const normalizedSearchTerm = normalizeModelKey(comparisonSearchTerm);
    const comparisonRows = normalizedSearchTerm
      ? salesPeriodData.rows.filter((row) => normalizeModelKey(row.name).includes(normalizedSearchTerm))
      : salesPeriodData.rows;

    return (
      <div className="space-y-8">
        <div className="glass rounded-3xl p-6 shadow-sm border-white/20">
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="text-indigo-500" size={20} />
              <h2 className="text-lg font-semibold text-slate-800">{salesPeriodData.title}</h2>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative w-full sm:w-56">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="search"
                  value={comparisonSearchTerm}
                  onChange={(event) => setComparisonSearchTerm(event.target.value)}
                  placeholder="搜索产品型号"
                  aria-label="搜索销量产品"
                  className="h-10 w-full rounded-xl border border-white/60 bg-white/55 pl-9 pr-9 text-sm font-bold text-slate-700 outline-none backdrop-blur-xl transition-all placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white/80 focus:ring-2 focus:ring-indigo-100"
                />
                {comparisonSearchTerm && (
                  <button
                    type="button"
                    onClick={() => setComparisonSearchTerm('')}
                    aria-label="清空产品搜索"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 transition-colors hover:bg-white/80 hover:text-slate-700"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <div className="inline-flex items-center rounded-xl border border-white/50 bg-white/35 p-1 backdrop-blur-xl">
                <button
                  type="button"
                  onClick={() => setComparisonMode('week')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    comparisonMode === 'week'
                      ? 'bg-white/90 text-indigo-600 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  每周销量
                </button>
                <button
                  type="button"
                  onClick={() => setComparisonMode('month')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    comparisonMode === 'month'
                      ? 'bg-white/90 text-indigo-600 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  每月销量
                </button>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-white/40 bg-white/28 backdrop-blur-xl">
            <table className="w-full min-w-max text-left">
              <thead className="bg-white/40">
                <tr>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">商品</th>
                  {salesPeriodData.columns.map((column) => (
                    <th key={column.key} className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/20">
                {comparisonRows.map((row) => (
                  <tr key={row.productId} className="hover:bg-white/22 transition-all">
                    <td className="px-4 py-3 text-sm font-bold text-slate-900">{row.name}</td>
                    {row.boxesByPeriod.map((boxes, periodIndex) => (
                      <td key={salesPeriodData.columns[periodIndex].key} className="px-4 py-3 text-sm font-semibold text-slate-700">
                        {formatBoxesValue(boxes)}
                      </td>
                    ))}
                  </tr>
                ))}
                {comparisonRows.length === 0 && (
                  <tr>
                    <td colSpan={salesPeriodData.columns.length + 1} className="px-4 py-8 text-center text-slate-400 text-sm font-bold">
                      {normalizedSearchTerm ? '未找到匹配商品' : '暂无销量数据'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="glass rounded-[26px] border-white/30 p-4 shadow-xl sm:rounded-3xl sm:p-8">
        <div className="mb-5 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50/50 backdrop-blur-md rounded-xl border border-indigo-100/30">
              <Package className="text-indigo-600" size={24} />
            </div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">全店商品库存概览</h2>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full sm:w-56">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="search"
                value={stockSearchTerm}
                onChange={(event) => setStockSearchTerm(event.target.value)}
                placeholder="搜索产品型号"
                aria-label="搜索库存产品"
                className="h-10 w-full rounded-xl border border-white/60 bg-white/55 pl-9 pr-9 text-sm font-bold text-slate-700 outline-none backdrop-blur-xl transition-all placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white/80 focus:ring-2 focus:ring-indigo-100"
              />
              {stockSearchTerm && (
                <button
                  type="button"
                  onClick={() => setStockSearchTerm('')}
                  aria-label="清空库存产品搜索"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 transition-colors hover:bg-white/80 hover:text-slate-700"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={handleExportRemainingStock}
              disabled={sortedProducts.length === 0}
              className="inline-flex items-center justify-center rounded-xl border border-indigo-200/60 bg-indigo-500/90 px-4 py-2 text-sm font-bold text-white shadow-[0_12px_26px_rgba(99,102,241,0.28)] transition-all hover:bg-indigo-600 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none"
            >
              导出剩余库存
            </button>
            <div className="text-sm font-bold text-slate-400 bg-white/30 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/20">
              {normalizedStockSearchTerm
                ? `显示 ${visibleStockProducts.length} / 共 ${products.length} 款`
                : `共 ${products.length} 款商品`}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
          {visibleStockProducts.map((p: Product) => {
            const isLowStock = p.stock < p.spec * 30;
            const cardBackground = shoeBackgroundMap[normalizeComparableModelKey(p.name)];
            const soldQuantity = totalSoldByProduct[p.id] ?? 0;
            return (
              <motion.div
                key={p.id}
                whileHover={{ y: -4 }}
                className={`relative group overflow-hidden rounded-[24px] border p-5 transition-all duration-300 backdrop-blur-md sm:rounded-3xl sm:p-6 ${
                  isLowStock
                    ? 'bg-rose-50/40 border-rose-100/50 hover:shadow-rose-100/50 shadow-lg'
                    : 'bg-white/40 border-white/30 hover:shadow-indigo-100/30 shadow-md'
                }`}
              >
                {cardBackground && (
                  <>
                    <div
                      className="absolute inset-0 bg-center bg-cover opacity-[0.11] scale-110 transition-transform duration-500 group-hover:scale-[1.14]"
                      style={{ backgroundImage: `url(${cardBackground})` }}
                    />
                    <div className={`absolute inset-0 ${
                      isLowStock
                        ? 'bg-gradient-to-br from-white/90 via-white/76 to-rose-50/60'
                        : 'bg-gradient-to-br from-white/88 via-white/72 to-sky-50/44'
                    }`} />
                  </>
                )}
                {isLowStock && (
                  <motion.div
                    className="absolute top-3 right-3 z-20 flex items-center gap-1 rounded-full bg-rose-500 text-white text-[10px] font-black px-3 py-1.5 shadow-lg shadow-rose-300/60 ring-2 ring-white/80 backdrop-blur-md"
                    animate={{
                      opacity: [0.96, 1, 0.96],
                      backgroundColor: [
                        'rgba(244, 63, 94, 0.94)',
                        'rgba(225, 29, 72, 1)',
                        'rgba(244, 63, 94, 0.94)',
                      ],
                      boxShadow: [
                        '0 14px 28px rgba(251, 113, 133, 0.30)',
                        '0 0 0 4px rgba(251, 113, 133, 0.18), 0 22px 40px rgba(225, 29, 72, 0.52)',
                        '0 14px 28px rgba(251, 113, 133, 0.30)',
                      ],
                    }}
                    transition={{
                      duration: 1.15,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  >
                    <motion.span
                      className="pointer-events-none absolute -inset-1 -z-10 rounded-full bg-rose-400/45 blur-md"
                      animate={{ opacity: [0.18, 0.5, 0.18] }}
                      transition={{
                        duration: 1.15,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                    />
                    <span className="relative flex h-3 w-3 items-center justify-center">
                      <motion.span
                        className="absolute inset-0 rounded-full bg-white/45"
                        animate={{ opacity: [0.12, 0.58, 0.12], scale: [0.92, 1.55, 0.92] }}
                        transition={{
                          duration: 1.15,
                          repeat: Infinity,
                          ease: 'easeInOut',
                        }}
                      />
                      <AlertTriangle size={10} />
                    </span>
                    <span>库存告急</span>
                  </motion.div>
                )}

                <div className="relative z-10 flex flex-col h-full">
                  <div className="mb-4">
                    <div className="text-lg font-black text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">{p.name}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-white/40 px-2 py-0.5 rounded border border-white/20">规格: {p.spec}</span>
                      <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest bg-indigo-50/50 px-2 py-0.5 rounded border border-indigo-100/30">{p.price} XOF</span>
                    </div>
                    <div className="mt-1 text-[11px] font-bold text-slate-500">
                      总销量: {formatStock(soldQuantity, p.spec)}
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
          {products.length > 0 && visibleStockProducts.length === 0 && (
            <div className="col-span-full py-20 flex flex-col items-center justify-center bg-white/20 backdrop-blur-md rounded-3xl border-2 border-dashed border-white/30">
              <Search className="text-slate-300 mb-4" size={48} />
              <div className="text-slate-400 font-bold">未找到匹配商品</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface StockViewProps {
  products: Product[];
  transactions: Transaction[];
  handleTransaction: (productId: string, type: 'in' | 'out', boxes: number, items: number, remark: string, silentSuccess?: boolean) => Promise<boolean | undefined>;
  deleteTransaction: (id: string | null) => void;
  updateTransaction: (
    transactionId: string,
    newProductId: string,
    newType: 'in' | 'out',
    newQuantity: number,
    newRemark: string
  ) => Promise<boolean>;
  editingTransaction: Transaction | null;
  setEditingTransaction: (tx: Transaction | null) => void;
  user: User | null;
  formatStock: (total: number, spec: number) => string;
  showToast: (message: string, type?: 'success' | 'error') => void;
  type: 'in' | 'out';
  setType: (value: 'in' | 'out') => void;
  selectedId: string;
  setSelectedId: (value: string) => void;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  showDropdown: boolean;
  setShowDropdown: (value: boolean) => void;
  boxes: string;
  setBoxes: (value: string) => void;
  items: string;
  setItems: (value: string) => void;
  remark: string;
  setRemark: (value: string) => void;
  formatDateTime: (value: Transaction['occurredAt']) => string;
}

interface OrderEntryItem {
  id: number;
  product: OrderProduct;
  boxes: number;
  items: number;
}

interface OrderEntryViewProps {
  products: OrderProduct[];
  formatCurrency: (value: number) => string;
  formatStock: (total: number, spec: number) => string;
  showToast: (message: string, type?: 'success' | 'error') => void;
  language?: 'zh' | 'fr';
}

export const OrderEntryView = ({
  products,
  formatCurrency,
  formatStock,
  showToast,
  language = 'zh'
}: OrderEntryViewProps) => {
  const [selectedId, setSelectedId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [boxes, setBoxes] = useState('1');
  const [items, setItems] = useState('0');
  const [orderItems, setOrderItems] = useState<OrderEntryItem[]>([]);
  const [editingOrderItemId, setEditingOrderItemId] = useState<number | null>(null);
  const [editProductId, setEditProductId] = useState('');
  const [editSearchTerm, setEditSearchTerm] = useState('');
  const [showEditDropdown, setShowEditDropdown] = useState(false);
  const [editBoxes, setEditBoxes] = useState('0');
  const [editItems, setEditItems] = useState('0');
  const orderItemIdRef = useRef(0);
  const isFrench = language === 'fr';
  const copy = isFrench
    ? {
        selectProduct: 'Ajouter un produit',
        model: 'Modèle',
        searchPlaceholder: 'Rechercher...',
        packaging: 'Conditionnement',
        unitPrice: 'Prix unitaire',
        boxPrice: 'Prix par carton',
        priceList: 'Liste des prix',
        priceModel: 'Modèle',
        priceSpec: 'Qté',
        priceUnit: 'Prix unité',
        priceBox: 'Prix carton',
        noProductFound: 'Aucun produit trouvé',
        boxes: 'Cartons',
        items: 'Paires',
        currentSubtotal: 'Sous-total',
        addToOrder: 'Ajouter',
        orderDetails: 'Commande',
        clearOrder: 'Vider',
        product: 'Produit',
        quantity: 'Quantité',
        subtotal: 'Sous-total',
        action: 'Action',
        remove: 'Retirer',
        edit: 'Modifier',
        editItem: 'Modifier le produit',
        saveChanges: 'Enregistrer',
        cancel: 'Annuler',
        changesSaved: 'Modification enregistrée',
        orderTotal: 'Total',
        selectProductError: 'Sélectionnez un produit',
        negativeQuantityError: 'La quantité ne peut pas être négative',
        emptyQuantityError: 'Saisissez le nombre de cartons ou de paires'
      }
    : {
        selectProduct: '选择商品',
        model: '商品型号',
        searchPlaceholder: '输入商品名称搜索...',
        packaging: '规格',
        unitPrice: '单价',
        boxPrice: '每箱价格',
        priceList: '产品价格表',
        priceModel: '型号',
        priceSpec: '规格',
        priceUnit: '单价',
        priceBox: '箱价',
        noProductFound: '未找到匹配商品',
        boxes: '箱数',
        items: '散个',
        currentSubtotal: '当前商品小计',
        addToOrder: '加入订单',
        orderDetails: '订单明细',
        clearOrder: '清空订单',
        product: '商品',
        quantity: '数量',
        subtotal: '小计',
        action: '操作',
        remove: '移除',
        edit: '编辑',
        editItem: '编辑商品',
        saveChanges: '保存修改',
        cancel: '取消',
        changesSaved: '修改已保存',
        orderTotal: '订单总计',
        selectProductError: '请选择商品',
        negativeQuantityError: '数量不能为负数',
        emptyQuantityError: '请输入箱数或散个'
      };

  const formatOrderStock = (total: number, spec: number) => {
    if (!isFrench) return formatStock(total, spec);
    const boxesCount = spec > 0 ? Math.floor(total / spec) : 0;
    const remainingItems = spec > 0 ? total % spec : total;
    const formatPairs = (value: number) => `${value} paire${value > 1 ? 's' : ''}`;
    if (boxesCount === 0) return formatPairs(remainingItems);
    const formattedBoxes = `${boxesCount} carton${boxesCount > 1 ? 's' : ''}`;
    return remainingItems > 0 ? `${formattedBoxes} + ${formatPairs(remainingItems)}` : formattedBoxes;
  };
  const formatPackaging = (spec: number) => isFrench ? `${spec}` : `${spec} 个/箱`;

  const formatMobileAmount = (value: number) => formatCurrency(value).replace(/\s*XOF$/, '');

  const selectedProduct = products.find((product) => product.id === selectedId);
  const editProduct = products.find((product) => product.id === editProductId);
  const enteredProduct = selectedProduct ?? products.find(
    (product) => product.name.toLowerCase() === searchTerm.trim().toLowerCase()
  );
  const enteredEditProduct = editProduct ?? products.find(
    (product) => product.name.toLowerCase() === editSearchTerm.trim().toLowerCase()
  );
  const filteredProducts = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return products;
    return products.filter((product) => product.name.toLowerCase().includes(keyword));
  }, [products, searchTerm]);
  const filteredEditProducts = useMemo(() => {
    const keyword = editSearchTerm.trim().toLowerCase();
    if (!keyword) return products;
    return products.filter((product) => product.name.toLowerCase().includes(keyword));
  }, [editSearchTerm, products]);
  const sortedPriceProducts = useMemo(() => {
    return [...products].sort((first, second) => (
      first.name.localeCompare(second.name, 'en', { sensitivity: 'base' })
    ));
  }, [products]);

  const boxesValue = Number.parseInt(boxes, 10) || 0;
  const itemsValue = Number.parseInt(items, 10) || 0;
  const hasValidCurrentQuantity = boxesValue >= 0 && itemsValue >= 0;
  const currentQuantity = enteredProduct && hasValidCurrentQuantity ? (boxesValue * enteredProduct.spec) + itemsValue : 0;
  const currentSubtotal = enteredProduct && currentQuantity > 0
    ? currentQuantity * enteredProduct.price
    : 0;

  const committedTotal = useMemo(() => {
    return orderItems.reduce((sum, item) => {
      const quantity = (item.boxes * item.product.spec) + item.items;
      return sum + quantity * item.product.price;
    }, 0);
  }, [orderItems]);

  const orderRows = useMemo(() => {
    return orderItems.map((item) => {
      const quantity = (item.boxes * item.product.spec) + item.items;
      return {
        item,
        quantity,
        subtotal: quantity * item.product.price
      };
    });
  }, [orderItems]);

  const resetCurrentLine = () => {
    setSelectedId('');
    setSearchTerm('');
    setBoxes('1');
    setItems('0');
    setShowDropdown(false);
  };

  const handleAddCurrentItem = () => {
    if (!enteredProduct) {
      showToast(copy.selectProductError, 'error');
      return;
    }
    if (boxesValue < 0 || itemsValue < 0) {
      showToast(copy.negativeQuantityError, 'error');
      return;
    }
    if (currentQuantity <= 0) {
      showToast(copy.emptyQuantityError, 'error');
      return;
    }

    orderItemIdRef.current += 1;
    setOrderItems((prev) => [
      ...prev,
      {
        id: orderItemIdRef.current,
        product: enteredProduct,
        boxes: boxesValue,
        items: itemsValue
      }
    ]);
    resetCurrentLine();
  };

  const handleAddSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    handleAddCurrentItem();
  };

  const startEditingOrderItem = (item: OrderEntryItem) => {
    setEditingOrderItemId(item.id);
    setEditProductId(item.product.id);
    setEditSearchTerm('');
    setShowEditDropdown(false);
    setEditBoxes(item.boxes.toString());
    setEditItems(item.items.toString());
  };

  const closeOrderItemEditor = () => {
    setEditingOrderItemId(null);
    setShowEditDropdown(false);
  };

  const handleEditSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (editingOrderItemId === null || !enteredEditProduct) {
      showToast(copy.selectProductError, 'error');
      return;
    }

    const nextBoxes = Number.parseInt(editBoxes, 10) || 0;
    const nextItems = Number.parseInt(editItems, 10) || 0;
    if (nextBoxes < 0 || nextItems < 0) {
      showToast(copy.negativeQuantityError, 'error');
      return;
    }
    if ((nextBoxes * enteredEditProduct.spec) + nextItems <= 0) {
      showToast(copy.emptyQuantityError, 'error');
      return;
    }

    setOrderItems((currentItems) => currentItems.map((item) => (
      item.id === editingOrderItemId
        ? { ...item, product: enteredEditProduct, boxes: nextBoxes, items: nextItems }
        : item
    )));
    closeOrderItemEditor();
    showToast(copy.changesSaved);
  };

  const handleRemoveItem = (id: number) => {
    setOrderItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleClearOrder = () => {
    setOrderItems([]);
    resetCurrentLine();
  };

  return (
    <div className="space-y-5 sm:space-y-8">
      <AnimatePresence>
        {editingOrderItemId !== null && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
            <motion.form
              onSubmit={handleEditSubmit}
              role="dialog"
              aria-modal="true"
              aria-labelledby="order-item-editor-title"
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl sm:p-8"
            >
              <div className="mb-6 flex items-center justify-between gap-4">
                <h3 id="order-item-editor-title" className="text-xl font-black text-slate-800">{copy.editItem}</h3>
                <button
                  type="button"
                  onClick={closeOrderItemEditor}
                  className="rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100"
                  aria-label={copy.cancel}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-5">
                <div className="relative">
                  <label className="mb-2 block text-sm font-bold text-slate-600">{copy.model}</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={editProduct ? editProduct.name : editSearchTerm}
                      onChange={(event) => {
                        setEditSearchTerm(event.target.value);
                        setEditProductId('');
                        setShowEditDropdown(true);
                      }}
                      onFocus={() => setShowEditDropdown(true)}
                      placeholder={copy.searchPlaceholder}
                      className="w-full rounded-xl border-slate-200 pr-10 font-bold focus:border-indigo-500 focus:ring-indigo-500"
                    />
                    {editProductId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditProductId('');
                          setEditSearchTerm('');
                          setShowEditDropdown(true);
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        aria-label={copy.remove}
                      >
                        <XCircle size={16} />
                      </button>
                    )}
                  </div>
                  <AnimatePresence>
                    {showEditDropdown && !editProductId && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="absolute z-20 mt-2 max-h-48 w-full overflow-y-auto rounded-2xl border border-slate-100 bg-white shadow-2xl custom-scrollbar"
                      >
                        {filteredEditProducts.map((product) => (
                          <button
                            key={product.id}
                            type="button"
                            onClick={() => {
                              setEditProductId(product.id);
                              setEditSearchTerm('');
                              setShowEditDropdown(false);
                            }}
                            className="w-full border-b border-slate-100 px-4 py-3 text-left transition-colors last:border-0 hover:bg-indigo-50"
                          >
                            <div className="font-black text-slate-800">{product.name}</div>
                            <div className="mt-0.5 text-xs font-bold text-slate-400">
                              {copy.packaging}: {formatPackaging(product.spec)}
                            </div>
                          </button>
                        ))}
                        {filteredEditProducts.length === 0 && (
                          <div className="px-4 py-8 text-center text-sm font-bold text-slate-400">{copy.noProductFound}</div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-600">{copy.boxes}</label>
                    <input
                      type="number"
                      min="0"
                      value={editBoxes}
                      onChange={(event) => setEditBoxes(event.target.value)}
                      className="w-full rounded-xl border-slate-200 font-bold focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-600">{copy.items}</label>
                    <input
                      type="number"
                      min="0"
                      value={editItems}
                      onChange={(event) => setEditItems(event.target.value)}
                      className="w-full rounded-xl border-slate-200 font-bold focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeOrderItemEditor}
                    className="flex-1 rounded-xl bg-slate-100 py-3 font-bold text-slate-600 transition-colors hover:bg-slate-200"
                  >
                    {copy.cancel}
                  </button>
                  <button
                    type="submit"
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 font-bold text-white shadow-lg shadow-indigo-200 transition-colors hover:bg-indigo-700"
                  >
                    <Save size={18} /> {copy.saveChanges}
                  </button>
                </div>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.25fr)] gap-8">
        <div className="glass rounded-3xl p-5 sm:p-7 shadow-xl border border-white/35">
          <div className="mb-5 sm:mb-6">
            <h3 className="text-lg font-black text-slate-800">{copy.selectProduct}</h3>
          </div>

          <form onSubmit={handleAddSubmit} className="space-y-5">
            <div className="relative">
              <label className="block text-sm font-bold text-slate-600 uppercase tracking-widest mb-2">{copy.model}</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder={copy.searchPlaceholder}
                  value={selectedProduct ? selectedProduct.name : searchTerm}
                  onChange={(event) => {
                    setSearchTerm(event.target.value);
                    if (selectedId) setSelectedId('');
                    setShowDropdown(true);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  className="w-full rounded-2xl border-white/40 bg-white/35 backdrop-blur-sm focus:ring-indigo-500 focus:border-indigo-500 pr-10 py-3 font-bold !text-left"
                />
                {selectedId && (
                  <button
                    type="button"
                    onClick={resetCurrentLine}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <XCircle size={17} />
                  </button>
                )}
              </div>

              {showDropdown && !selectedId && (
                <div className="absolute z-50 w-full mt-2 bg-white/90 backdrop-blur-xl border border-white/50 rounded-2xl shadow-2xl max-h-72 overflow-y-auto custom-scrollbar">
                  {filteredProducts.length > 0 ? (
                    filteredProducts.map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => {
                          setSelectedId(product.id);
                          setSearchTerm('');
                          setShowDropdown(false);
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-indigo-50/70 transition-colors border-b border-slate-100/60 last:border-0"
                      >
                        <div className="font-black text-slate-900">{product.name}</div>
                        <div className="text-xs font-bold text-slate-500">
                          {copy.packaging}: {formatPackaging(product.spec)} · {copy.boxPrice}: {formatCurrency(product.price * product.spec)}
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-4 text-sm text-slate-400 italic font-bold">{copy.noProductFound}</div>
                  )}
                </div>
              )}
              {showDropdown && !selectedId && (
                <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-600 uppercase tracking-widest mb-2">{copy.boxes}</label>
                <input
                  type="number"
                  min="0"
                  value={boxes}
                  onChange={(event) => setBoxes(event.target.value)}
                  className="w-full rounded-2xl border-white/40 bg-white/35 backdrop-blur-sm focus:ring-indigo-500 focus:border-indigo-500 py-3 font-bold"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-600 uppercase tracking-widest mb-2">{copy.items}</label>
                <input
                  type="number"
                  min="0"
                  value={items}
                  onChange={(event) => setItems(event.target.value)}
                  className="w-full rounded-2xl border-white/40 bg-white/35 backdrop-blur-sm focus:ring-indigo-500 focus:border-indigo-500 py-3 font-bold"
                />
              </div>
            </div>

            <div className="rounded-2xl bg-indigo-50/60 border border-indigo-100/70 p-3.5 sm:p-4">
              <div className="text-xs font-black text-indigo-500 uppercase tracking-widest mb-2">{copy.currentSubtotal}</div>
              <div className="text-2xl font-black text-slate-900">{formatCurrency(currentSubtotal)}</div>
              {enteredProduct && (
                <div className="mt-1 text-sm font-bold text-slate-500">
                  {enteredProduct.name} · {formatOrderStock(currentQuantity, enteredProduct.spec)}
                </div>
              )}
            </div>

            <button
              type="submit"
              className="w-full rounded-2xl bg-indigo-600/90 py-4 font-black text-white shadow-lg shadow-indigo-200/60 transition-all hover:bg-indigo-700 active:scale-[0.99] flex items-center justify-center gap-2"
            >
              <Plus size={20} />
              {copy.addToOrder}
            </button>
          </form>
        </div>

        <div className="glass rounded-3xl p-5 sm:p-7 shadow-xl border border-white/35">
          <div className="mb-5 flex items-center justify-between gap-3 sm:mb-6">
            <div>
              <h3 className="text-lg font-black text-slate-800">
                {orderItems.length > 0 ? copy.orderDetails : copy.priceList}
              </h3>
            </div>
            {orderItems.length > 0 && (
              <button
                type="button"
                onClick={handleClearOrder}
                className="rounded-xl border border-rose-100 bg-rose-50/60 px-3.5 py-2 text-sm font-black text-rose-600 hover:bg-rose-100/70 transition-all"
              >
                {copy.clearOrder}
              </button>
            )}
          </div>

          {orderItems.length === 0 ? (
            <div className="max-h-[70vh] overflow-auto rounded-2xl border border-slate-200/70 bg-white/75 shadow-[0_12px_28px_rgba(15,23,42,0.06)] custom-scrollbar">
              <table className="w-full table-fixed text-left">
                <colgroup>
                  <col className="w-[25%]" />
                  <col className="w-[13%]" />
                  <col className="w-[27%]" />
                  <col className="w-[35%]" />
                </colgroup>
                <thead className="sticky top-0 z-10 bg-slate-100/95 backdrop-blur-xl">
                  <tr className="border-b border-slate-200/80">
                    <th className="px-2.5 py-3 text-[10px] font-black leading-tight text-slate-500 sm:px-4 sm:text-xs">{copy.priceModel}</th>
                    <th className="px-1 py-3 text-center text-[10px] font-black leading-tight text-slate-500 sm:px-4 sm:text-xs">{copy.priceSpec}</th>
                    <th className="px-2 py-3 text-right text-[10px] font-black leading-tight text-slate-500 sm:px-4 sm:text-xs">
                      <span className="block">{copy.priceUnit}</span>
                      <span className="mt-0.5 block text-[8px] font-bold text-slate-400 sm:text-[9px]">XOF</span>
                    </th>
                    <th className="px-2.5 py-3 text-right text-[10px] font-black leading-tight text-indigo-500 sm:px-4 sm:text-xs">
                      <span className="block">{copy.priceBox}</span>
                      <span className="mt-0.5 block text-[8px] font-bold text-indigo-400 sm:text-[9px]">XOF</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedPriceProducts.map((product) => (
                    <tr key={product.id} className="odd:bg-white/55 even:bg-slate-50/55 transition-colors hover:bg-indigo-50/45">
                      <td className="truncate px-2.5 py-3.5 text-[11px] font-black text-slate-900 sm:px-4 sm:text-sm">{product.name}</td>
                      <td className="px-1 py-3.5 text-center text-[11px] font-bold text-slate-500 sm:px-4 sm:text-sm">
                        {formatPackaging(product.spec)}
                      </td>
                      <td className="whitespace-nowrap px-2 py-3.5 text-right text-[11px] font-bold tabular-nums text-slate-600 sm:px-4 sm:text-sm">
                        {formatMobileAmount(product.price)}
                      </td>
                      <td className="whitespace-nowrap px-2.5 py-3.5 text-right text-[11px] font-black tabular-nums text-indigo-600 sm:px-4 sm:text-sm">
                        {formatMobileAmount(product.price * product.spec)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <>
          <div className="overflow-hidden rounded-2xl border border-white/55 bg-white/45 shadow-sm md:hidden">
            <table className="w-full table-fixed text-left">
              <colgroup>
                <col className="w-[21%]" />
                <col className="w-[19%]" />
                <col className="w-[21%]" />
                <col className="w-[23%]" />
                <col className="w-[16%]" />
              </colgroup>
              <thead className="bg-slate-50/70">
                <tr>
                  <th className="px-2 py-3 text-[9px] font-black uppercase tracking-wide text-slate-400">{isFrench ? 'Modèle' : '型号'}</th>
                  <th className="px-2 py-3 text-[9px] font-black uppercase tracking-wide text-slate-400">{copy.quantity}</th>
                  <th className="px-2 py-3 text-[9px] font-black uppercase leading-tight tracking-wide text-slate-400">{isFrench ? 'Prix/carton' : '箱单价'}</th>
                  <th className="px-2 py-3 text-[9px] font-black uppercase tracking-wide text-slate-400">{isFrench ? 'Total' : '总计'}</th>
                  <th className="px-1 py-3"><span className="sr-only">{copy.action}</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/80">
                {orderRows.map(({ item, quantity, subtotal }) => (
                  <tr key={item.id}>
                    <td className="truncate px-2 py-4 text-xs font-black text-slate-900">{item.product.name}</td>
                    <td className="px-2 py-4 text-xs font-bold leading-tight text-slate-600">{formatOrderStock(quantity, item.product.spec)}</td>
                    <td className="px-2 py-4">
                      <div className="text-xs font-black leading-tight text-slate-700">{formatMobileAmount(item.product.price * item.product.spec)}</div>
                      <div className="mt-0.5 text-[9px] font-bold text-slate-400">XOF</div>
                    </td>
                    <td className="px-2 py-4">
                      <div className="text-xs font-black leading-tight text-indigo-600">{formatMobileAmount(subtotal)}</div>
                      <div className="mt-0.5 text-[9px] font-bold text-indigo-400">XOF</div>
                    </td>
                    <td className="px-1 py-4 text-right">
                      <div className="flex items-center justify-end">
                        <button
                          type="button"
                          onClick={() => startEditingOrderItem(item)}
                          className="rounded-lg p-1.5 text-indigo-500 transition-colors hover:bg-indigo-50/80"
                          title={copy.edit}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="rounded-lg p-1.5 text-rose-500 transition-colors hover:bg-rose-50/80"
                          title={copy.remove}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="hidden overflow-x-auto custom-scrollbar md:block">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/20">
                  <th className="pb-4 text-xs font-black uppercase tracking-widest text-slate-400">{copy.product}</th>
                  <th className="pb-4 text-xs font-black uppercase tracking-widest text-slate-400">{copy.quantity}</th>
                  <th className="pb-4 text-xs font-black uppercase tracking-widest text-slate-400">{copy.boxPrice}</th>
                  <th className="pb-4 text-xs font-black uppercase tracking-widest text-slate-400">{copy.subtotal}</th>
                  <th className="pb-4 text-right text-xs font-black uppercase tracking-widest text-slate-400">{copy.action}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/20">
                {orderRows.map(({ item, quantity, subtotal }) => {
                  return (
                    <tr key={item.id} className="hover:bg-white/20 transition-colors">
                      <td className="py-4">
                        <div className="font-black text-slate-900">{item.product.name}</div>
                        <div className="text-xs font-bold text-slate-400">{copy.packaging}: {formatPackaging(item.product.spec)}</div>
                      </td>
                      <td className="py-4 text-sm font-bold text-slate-600">{formatOrderStock(quantity, item.product.spec)}</td>
                      <td className="py-4 text-sm font-bold text-slate-600">{formatCurrency(item.product.price * item.product.spec)}</td>
                      <td className="py-4 text-sm font-black text-indigo-600">{formatCurrency(subtotal)}</td>
                      <td className="py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => startEditingOrderItem(item)}
                            className="rounded-xl p-2 text-indigo-500 transition-all hover:bg-indigo-50/70"
                            title={copy.edit}
                          >
                            <Pencil size={18} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            className="rounded-xl p-2 text-rose-500 transition-all hover:bg-rose-50/70"
                            title={copy.remove}
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl bg-rose-50/55 px-4 py-4 sm:mt-6 sm:justify-end sm:bg-transparent sm:px-0 sm:py-0 sm:pt-5">
            <span className="text-sm font-black text-slate-500">{copy.orderTotal}</span>
            <span className="text-2xl font-black tracking-tight text-rose-600 sm:text-3xl">{formatCurrency(committedTotal)}</span>
          </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export const StockView = ({
  products, transactions, handleTransaction, deleteTransaction, 
  updateTransaction, editingTransaction, setEditingTransaction,
  user, formatStock, showToast,
  type, setType, selectedId, setSelectedId, searchTerm, setSearchTerm, showDropdown, setShowDropdown,
  boxes, setBoxes, items, setItems, remark, setRemark,
  formatDateTime
}: StockViewProps) => {
  const [editBoxes, setEditBoxes] = useState('');
  const [editItems, setEditItems] = useState('');
  const [editRemark, setEditRemark] = useState('');
  const [editProductId, setEditProductId] = useState('');
  const [editType, setEditType] = useState<'in' | 'out'>('in');
  const [editSearchTerm, setEditSearchTerm] = useState('');
  const [showEditDropdown, setShowEditDropdown] = useState(false);
  const [visibleTransactionCount, setVisibleTransactionCount] = useState(20);
  const [historyFilterMode, setHistoryFilterMode] = useState<'day' | 'week' | 'month'>('day');
  const [isBatchOutMode, setIsBatchOutMode] = useState(false);
  const [batchOutText, setBatchOutText] = useState('');
  const [isBatchOutSubmitting, setIsBatchOutSubmitting] = useState(false);
  const [batchOutResult, setBatchOutResult] = useState<{ successCount: number; issues: string[] } | null>(null);

  const toLocalDateInputValue = (date: Date) => {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const getCurrentWeekInputValue = (date: Date) => {
    const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
  };
  const [historyFilterDate, setHistoryFilterDate] = useState(() => toLocalDateInputValue(new Date()));
  const [historyFilterWeek, setHistoryFilterWeek] = useState(() => getCurrentWeekInputValue(new Date()));
  const [historyFilterMonth, setHistoryFilterMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, '0')}`;
  });
  const [isHistoryQueryOpen, setIsHistoryQueryOpen] = useState(false);
  const [historyQueryType, setHistoryQueryType] = useState<'in' | 'out'>('in');
  const [historyQueryProductId, setHistoryQueryProductId] = useState('');
  const [historyQueryProductTerm, setHistoryQueryProductTerm] = useState('');
  const [showHistoryQueryProducts, setShowHistoryQueryProducts] = useState(false);
  const [historyQueryStartDate, setHistoryQueryStartDate] = useState(() => {
    const now = new Date();
    return toLocalDateInputValue(new Date(now.getFullYear(), now.getMonth(), 1));
  });
  const [historyQueryEndDate, setHistoryQueryEndDate] = useState(() => toLocalDateInputValue(new Date()));
  const [historyQueryAllTime, setHistoryQueryAllTime] = useState(false);
  const [activeHistoryQuery, setActiveHistoryQuery] = useState<{
    type: 'in' | 'out';
    productId: string;
    startDate: string;
    endDate: string;
    allTime: boolean;
  } | null>(null);

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

  const filteredHistoryQueryProducts = useMemo(() => {
    const keyword = historyQueryProductTerm.trim().toLowerCase();
    if (!keyword) return products;
    return products.filter((product) => product.name.toLowerCase().includes(keyword));
  }, [historyQueryProductTerm, products]);

  const selectedProduct = products.find((p: Product) => p.id === selectedId);
  const editingProduct = products.find((p: Product) => p.id === editProductId);
  const historyQueryProduct = products.find((product) => product.id === historyQueryProductId);
  const activeHistoryQueryProduct = products.find((product) => product.id === activeHistoryQuery?.productId);

  interface ParsedBatchOutRow {
    lineNumber: number;
    productName: string;
    boxes: number;
  }

  interface BatchOutTarget {
    lineNumber: number;
    product: Product;
    boxes: number;
  }

  const parseBatchOutMarkdown = (source: string): { rows: ParsedBatchOutRow[]; errors: string[] } => {
    const rows: ParsedBatchOutRow[] = [];
    const errors: string[] = [];
    const lines = source.split('\n');

    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      const trimmed = line.trim();
      if (!trimmed) return;
      if (!trimmed.includes('|')) {
        errors.push(`第 ${lineNumber} 行不是 Markdown 表格行`);
        return;
      }

      const cells = trimmed
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map((cell) => cell.trim());

      if (cells.length < 2) {
        errors.push(`第 ${lineNumber} 行缺少款式或箱数`);
        return;
      }

      const isDividerRow = cells.every((cell) => /^:?-+:?$/.test(cell.replace(/\s+/g, '')));
      if (isDividerRow) return;
      if (normalizeModelKey(cells[0]) === normalizeModelKey('款式')) return;

      const productName = cells[0];
      const boxesValue = Number.parseInt(cells[1].replace(/[^\d-]/g, ''), 10);
      if (!productName) {
        errors.push(`第 ${lineNumber} 行款式为空`);
        return;
      }
      if (!Number.isInteger(boxesValue) || boxesValue <= 0) {
        errors.push(`第 ${lineNumber} 行箱数无效`);
        return;
      }

      rows.push({ lineNumber, productName, boxes: boxesValue });
    });

    return { rows, errors };
  };

  const sortedTransactions = useMemo(() => {
    return [...transactions].sort((a, b) => b.occurredAt.toMillis() - a.occurredAt.toMillis());
  }, [transactions]);

  const periodFilteredTransactions = useMemo(() => {
    if (historyFilterMode === 'day') {
      return sortedTransactions.filter((tx) =>
        toLocalDateInputValue(tx.occurredAt.toDate()) === historyFilterDate
      );
    }
    if (historyFilterMode === 'week') {
      const weekRange = parseIsoWeek(historyFilterWeek);
      return sortedTransactions.filter((tx) => isWithinRange(tx.occurredAt, weekRange));
    }
    if (historyFilterMode === 'month') {
      const monthRange = getRangeByMonth(historyFilterMonth);
      return sortedTransactions.filter((tx) => isWithinRange(tx.occurredAt, monthRange));
    }
    return [];
  }, [historyFilterMode, historyFilterDate, historyFilterWeek, historyFilterMonth, sortedTransactions]);

  const historyQueryScopeTransactions = useMemo(() => {
    if (!activeHistoryQuery) return [];
    const start = new Date(`${activeHistoryQuery.startDate}T00:00:00`);
    const end = new Date(`${activeHistoryQuery.endDate}T23:59:59.999`);
    return sortedTransactions.filter((transaction) => {
      const occurredAt = transaction.occurredAt.toDate();
      return (!activeHistoryQuery.productId || transaction.productId === activeHistoryQuery.productId)
        && (activeHistoryQuery.allTime || (occurredAt >= start && occurredAt <= end));
    });
  }, [activeHistoryQuery, sortedTransactions]);

  const filteredTransactions = useMemo(() => {
    if (!activeHistoryQuery) return periodFilteredTransactions;
    return historyQueryScopeTransactions.filter((transaction) => transaction.type === activeHistoryQuery.type);
  }, [activeHistoryQuery, historyQueryScopeTransactions, periodFilteredTransactions]);

  const historyQueryTotals = useMemo(() => {
    if (!activeHistoryQuery) return null;

    let inboundBoxes = 0;
    let outboundBoxes = 0;
    for (const transaction of historyQueryScopeTransactions) {
      const product = products.find((item) => item.id === transaction.productId);
      if (!product || product.spec <= 0) continue;
      const boxes = transaction.quantity / product.spec;
      if (transaction.type === 'in') {
        inboundBoxes += boxes;
      } else {
        outboundBoxes += boxes;
      }
    }

    return { inboundBoxes, outboundBoxes };
  }, [activeHistoryQuery, historyQueryScopeTransactions, products]);

  const formatHistoryBoxTotal = (value: number) => {
    return value.toLocaleString('zh-CN', { maximumFractionDigits: 4 });
  };

  const visibleTransactions = useMemo(() => {
    return filteredTransactions.slice(0, visibleTransactionCount);
  }, [filteredTransactions, visibleTransactionCount]);

  const canShowMoreLocal = visibleTransactionCount < filteredTransactions.length;

  const clearHistoryQuery = () => {
    setActiveHistoryQuery(null);
    setVisibleTransactionCount(20);
  };

  const openHistoryQuery = () => {
    if (activeHistoryQuery) {
      setHistoryQueryType(activeHistoryQuery.type);
      setHistoryQueryProductId(activeHistoryQuery.productId);
      setHistoryQueryProductTerm('');
      setHistoryQueryStartDate(activeHistoryQuery.startDate);
      setHistoryQueryEndDate(activeHistoryQuery.endDate);
      setHistoryQueryAllTime(activeHistoryQuery.allTime);
    } else {
      const now = new Date();
      setHistoryQueryType('in');
      setHistoryQueryProductId('');
      setHistoryQueryProductTerm('');
      setHistoryQueryStartDate(toLocalDateInputValue(new Date(now.getFullYear(), now.getMonth(), 1)));
      setHistoryQueryEndDate(toLocalDateInputValue(now));
      setHistoryQueryAllTime(false);
    }
    setShowHistoryQueryProducts(false);
    setIsHistoryQueryOpen(true);
  };

  const applyHistoryQuery = () => {
    if (!historyQueryAllTime && (!historyQueryStartDate || !historyQueryEndDate)) {
      showToast('请选择完整的日期区间', 'error');
      return;
    }
    if (!historyQueryAllTime && historyQueryStartDate > historyQueryEndDate) {
      showToast('开始日期不能晚于结束日期', 'error');
      return;
    }

    setActiveHistoryQuery({
      type: historyQueryType,
      productId: historyQueryProductId,
      startDate: historyQueryStartDate,
      endDate: historyQueryEndDate,
      allTime: historyQueryAllTime
    });
    setVisibleTransactionCount(20);
    setShowHistoryQueryProducts(false);
    setIsHistoryQueryOpen(false);
  };

  const handleShowMore = () => {
    if (!canShowMoreLocal) return;
    setVisibleTransactionCount((prev) => prev + 20);
  };

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

  const handleBatchOutSubmit = async () => {
    if (user?.role !== 'admin') {
      showToast('权限不足', 'error');
      return;
    }
    if (!batchOutText.trim()) {
      showToast('请粘贴批量出库 Markdown 表格', 'error');
      return;
    }

    const { rows, errors } = parseBatchOutMarkdown(batchOutText);
    if (rows.length === 0) {
      setBatchOutResult({ successCount: 0, issues: errors.length > 0 ? errors : ['未读取到可出库数据'] });
      showToast('未读取到可出库数据', 'error');
      return;
    }
    const issues = [...errors];

    const productByName = new Map<string, Product>();
    const duplicateNames = new Set<string>();
    const remainingStockByProductId: Record<string, number> = {};
    for (const product of products) {
      remainingStockByProductId[product.id] = product.stock;
      const key = normalizeModelKey(product.name);
      if (productByName.has(key)) {
        duplicateNames.add(key);
      } else {
        productByName.set(key, product);
      }
    }

    const targets: BatchOutTarget[] = [];
    for (const row of rows) {
      const key = normalizeModelKey(row.productName);
      if (duplicateNames.has(key)) {
        issues.push(`第 ${row.lineNumber} 行商品名重复，请先处理商品列表：${row.productName}`);
        continue;
      }

      const product = productByName.get(key);
      if (!product) {
        issues.push(`第 ${row.lineNumber} 行未找到商品：${row.productName}`);
        continue;
      }
      if (product.isActive === false) {
        issues.push(`第 ${row.lineNumber} 行商品已下架：${product.name}`);
        continue;
      }

      const quantity = row.boxes * product.spec;
      const remainingStock = remainingStockByProductId[product.id] ?? 0;
      if (quantity > remainingStock) {
        issues.push(`第 ${row.lineNumber} 行库存不足：${product.name}，需要 ${formatStock(quantity, product.spec)}，剩余 ${formatStock(remainingStock, product.spec)}`);
        continue;
      }

      remainingStockByProductId[product.id] = remainingStock - quantity;
      targets.push({ lineNumber: row.lineNumber, product, boxes: row.boxes });
    }

    if (targets.length === 0) {
      setBatchOutResult({ successCount: 0, issues });
      showToast('没有可出库数据', 'error');
      return;
    }

    setIsBatchOutSubmitting(true);
    let successCount = 0;
    try {
      for (const target of targets) {
        const success = await handleTransaction(
          target.product.id,
          'out',
          target.boxes,
          0,
          remark.trim() || '批量出库',
          true
        );
        if (!success) {
          issues.push(`第 ${target.lineNumber} 行出库失败：${target.product.name}`);
          continue;
        }
        successCount += 1;
      }

      setBatchOutResult({ successCount, issues });
      showToast(`批量出库完成！成功: ${successCount}, 失败: ${issues.length}`, issues.length > 0 ? 'error' : 'success');
      if (successCount > 0) {
        setBatchOutText('');
        setRemark('');
        setIsBatchOutMode(false);
      }
    } finally {
      setIsBatchOutSubmitting(false);
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
        {isHistoryQueryOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="history-query-title"
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl sm:p-8"
            >
              <div className="mb-6 flex items-center justify-between gap-4">
                <div>
                  <h3 id="history-query-title" className="text-xl font-black text-slate-800">查询进出库流水</h3>
                  <p className="mt-1 text-sm font-bold text-slate-500">选择类型，商品和时间范围可按需设置</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsHistoryQueryOpen(false)}
                  className="p-2 text-slate-500 transition-colors hover:bg-slate-100 rounded-full"
                  aria-label="关闭查询窗口"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-600">出入库类型</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setHistoryQueryType('in')}
                      className={`flex items-center justify-center gap-2 rounded-xl border-2 py-2.5 font-bold transition-all ${
                        historyQueryType === 'in'
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                          : 'border-slate-100 text-slate-500 hover:border-slate-200'
                      }`}
                    >
                      <TrendingUp size={18} /> 入库
                    </button>
                    <button
                      type="button"
                      onClick={() => setHistoryQueryType('out')}
                      className={`flex items-center justify-center gap-2 rounded-xl border-2 py-2.5 font-bold transition-all ${
                        historyQueryType === 'out'
                          ? 'border-rose-500 bg-rose-50 text-rose-700'
                          : 'border-slate-100 text-slate-500 hover:border-slate-200'
                      }`}
                    >
                      <TrendingDown size={18} /> 出库
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <label className="mb-2 block text-sm font-bold text-slate-600">商品 <span className="text-slate-400">(选填)</span></label>
                  <div className="relative">
                    <input
                      type="text"
                      value={historyQueryProduct ? historyQueryProduct.name : historyQueryProductTerm}
                      onChange={(event) => {
                        setHistoryQueryProductTerm(event.target.value);
                        setHistoryQueryProductId('');
                        setShowHistoryQueryProducts(true);
                      }}
                      onFocus={() => setShowHistoryQueryProducts(true)}
                      placeholder="不填则查询全部商品"
                      className="w-full rounded-xl border-slate-200 pr-10 font-bold focus:border-indigo-500 focus:ring-indigo-500"
                    />
                    {historyQueryProductId && (
                      <button
                        type="button"
                        onClick={() => {
                          setHistoryQueryProductId('');
                          setHistoryQueryProductTerm('');
                          setShowHistoryQueryProducts(true);
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        aria-label="清除已选商品"
                      >
                        <XCircle size={16} />
                      </button>
                    )}
                  </div>
                  <AnimatePresence>
                    {showHistoryQueryProducts && !historyQueryProductId && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="absolute z-20 mt-2 max-h-48 w-full overflow-y-auto rounded-2xl border border-slate-100 bg-white shadow-2xl custom-scrollbar"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setHistoryQueryProductId('');
                            setHistoryQueryProductTerm('');
                            setShowHistoryQueryProducts(false);
                          }}
                          className="flex w-full items-center justify-between border-b border-slate-100 px-4 py-3 text-left font-bold text-indigo-600 transition-colors hover:bg-indigo-50"
                        >
                          <span>全部商品</span>
                          <span className="text-xs text-slate-400">不限型号</span>
                        </button>
                        {filteredHistoryQueryProducts.map((product) => (
                          <button
                            key={product.id}
                            type="button"
                            onClick={() => {
                              setHistoryQueryProductId(product.id);
                              setHistoryQueryProductTerm('');
                              setShowHistoryQueryProducts(false);
                            }}
                            className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-indigo-50"
                          >
                            <span className="font-bold text-slate-700">{product.name}</span>
                            <span className="text-xs font-bold text-slate-400">规格: {product.spec}</span>
                          </button>
                        ))}
                        {filteredHistoryQueryProducts.length === 0 && (
                          <div className="px-4 py-8 text-center text-sm font-bold text-slate-400">未找到匹配商品</div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={historyQueryAllTime}
                    onChange={(event) => setHistoryQueryAllTime(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm font-bold text-slate-700">所有时间</span>
                </label>

                <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${historyQueryAllTime ? 'opacity-45' : ''}`}>
                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-600">开始日期</label>
                    <input
                      type="date"
                      value={historyQueryStartDate}
                      max={historyQueryEndDate}
                      disabled={historyQueryAllTime}
                      onChange={(event) => setHistoryQueryStartDate(event.target.value)}
                      className="w-full rounded-xl border-slate-200 font-bold focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-600">结束日期</label>
                    <input
                      type="date"
                      value={historyQueryEndDate}
                      min={historyQueryStartDate}
                      disabled={historyQueryAllTime}
                      onChange={(event) => setHistoryQueryEndDate(event.target.value)}
                      className="w-full rounded-xl border-slate-200 font-bold focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsHistoryQueryOpen(false)}
                    className="flex-1 rounded-xl bg-slate-100 py-3 font-bold text-slate-600 transition-colors hover:bg-slate-200"
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    onClick={applyHistoryQuery}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 font-bold text-white shadow-lg shadow-indigo-200 transition-colors hover:bg-indigo-700"
                  >
                    <Search size={18} /> 开始查询
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
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
                  <label className="block text-sm font-bold text-slate-600 uppercase tracking-widest mb-2">操作类型</label>
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
                  <label className="block text-sm font-bold text-slate-600 uppercase tracking-widest mb-2">商品</label>
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
                    <label className="block text-sm font-bold text-slate-600 uppercase tracking-widest mb-2">箱数</label>
                    <input
                      type="number"
                      value={editBoxes}
                      onChange={(e) => setEditBoxes(e.target.value)}
                      className="w-full rounded-2xl border-slate-200 focus:ring-indigo-500 focus:border-indigo-500 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-600 uppercase tracking-widest mb-2">散个</label>
                    <input
                      type="number"
                      value={editItems}
                      onChange={(e) => setEditItems(e.target.value)}
                      className="w-full rounded-2xl border-slate-200 focus:ring-indigo-500 focus:border-indigo-500 font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-600 uppercase tracking-widest mb-2">备注</label>
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
      <AnimatePresence>
        {batchOutResult && (
          <div className="fixed inset-0 bg-black/35 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="glass rounded-3xl p-7 w-full max-w-lg border border-white/55"
            >
              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  <h3 className="text-xl font-black text-slate-800">批量出库结果</h3>
                  <p className="mt-1 text-sm font-bold text-slate-500">
                    成功出库 {batchOutResult.successCount} 条，失败 {batchOutResult.issues.length} 条
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setBatchOutResult(null)}
                  className="p-2 rounded-full hover:bg-white/45 transition-all text-slate-500"
                >
                  <X size={18} />
                </button>
              </div>

              {batchOutResult.issues.length > 0 ? (
                <div className="max-h-72 overflow-y-auto custom-scrollbar rounded-2xl border border-rose-100/70 bg-rose-50/45 p-4">
                  <div className="mb-3 text-sm font-black text-rose-700">以下行未录入：</div>
                  <ul className="space-y-2">
                    {batchOutResult.issues.map((issue, index) => (
                      <li key={`${issue}-${index}`} className="rounded-xl bg-white/70 px-3 py-2 text-sm font-bold text-rose-700">
                        {issue}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="rounded-2xl border border-emerald-100/70 bg-emerald-50/55 px-4 py-5 text-sm font-black text-emerald-700">
                  所有批量出库记录都已成功录入。
                </div>
              )}

              <button
                type="button"
                onClick={() => setBatchOutResult(null)}
                className="mt-5 w-full rounded-2xl bg-indigo-600/90 py-3 font-black text-white shadow-lg shadow-indigo-200/50 transition-all hover:bg-indigo-700"
              >
                我知道了
              </button>
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
                  onClick={() => {
                    setType('in');
                    setIsBatchOutMode(false);
                  }}
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

            {type === 'out' && (
              <button
                type="button"
                onClick={() => setIsBatchOutMode((prev) => !prev)}
                className={`w-full rounded-xl border px-4 py-2.5 text-sm font-black transition-all ${
                  isBatchOutMode
                    ? 'border-rose-200 bg-rose-50/70 text-rose-600 shadow-sm'
                    : 'border-white/40 bg-white/35 text-slate-600 hover:bg-white/55'
                }`}
              >
                {isBatchOutMode ? '切换为单个出库' : '切换为批量出库'}
              </button>
            )}

            {isBatchOutMode ? (
              <>
                <div className="rounded-2xl border border-rose-100/70 bg-rose-50/35 p-4 text-xs font-bold leading-5 text-rose-700">
                  <div>粘贴 Markdown 表格后，系统只读取“款式”和“箱数”两列。</div>
                  <div>商品名必须和系统商品名一致；双数、金额等列会被忽略。</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">批量出库 Markdown 表格</label>
                  <textarea
                    value={batchOutText}
                    onChange={(e) => setBatchOutText(e.target.value)}
                    placeholder="| 款式 | 箱数 | 双数 | 金额 |&#10;| --- | -: | --: | ---: |&#10;| 56-81 | 5 | 120 | 384,000 |"
                    className="h-56 w-full rounded-xl border-white/40 bg-white/30 p-4 font-mono text-sm font-bold !text-left backdrop-blur-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">操作时间</label>
                  <input
                    type="text"
                    disabled
                    value={formatDateTimeLabel(Timestamp.now())}
                    className="w-full rounded-xl border-white/20 bg-white/10 text-slate-400 cursor-not-allowed backdrop-blur-sm font-bold"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">备注</label>
                  <textarea
                    value={remark}
                    onChange={(e) => setRemark(e.target.value)}
                    placeholder="选填，默认：批量出库"
                    className="w-full rounded-xl border-white/40 bg-white/30 backdrop-blur-sm focus:ring-indigo-500 focus:border-indigo-500 h-20 font-bold"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleBatchOutSubmit}
                  disabled={user?.role !== 'admin' || isBatchOutSubmitting}
                  className={`w-full py-3 rounded-xl font-bold text-white shadow-lg transition-all active:scale-95 backdrop-blur-md ${
                    user?.role !== 'admin' || isBatchOutSubmitting
                      ? 'bg-slate-300/50 cursor-not-allowed shadow-none'
                      : 'bg-rose-500/90 hover:bg-rose-600'
                  }`}
                >
                  {user?.role !== 'admin'
                    ? '无操作权限'
                    : (isBatchOutSubmitting ? '正在批量出库...' : '确认批量出库')}
                </button>
              </>
            ) : (
              <>
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
                    value={formatDateTimeLabel(Timestamp.now())}
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
              </>
            )}
          </form>
        </div>
      </div>

      {/* History */}
      <div className="lg:col-span-2">
        <div className="glass rounded-2xl p-6 shadow-sm border-white/20">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between mb-6">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <History size={20} className="text-slate-600" />
                近期流水明细
              </h2>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <button
                type="button"
                onClick={openHistoryQuery}
                className={`flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-black transition-all sm:w-auto ${
                  activeHistoryQuery
                    ? 'border-indigo-500 bg-indigo-600 text-white shadow-lg shadow-indigo-200/60'
                    : 'border-white/40 bg-white/40 text-slate-700 hover:bg-white/65'
                }`}
              >
                <Search size={16} /> 查询流水
              </button>
              <div className="flex bg-white/35 backdrop-blur-md p-1 rounded-xl border border-white/40">
                <button
                  type="button"
                  onClick={() => {
                    clearHistoryQuery();
                    setHistoryFilterMode('day');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                    !activeHistoryQuery && historyFilterMode === 'day' ? 'bg-white/80 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  按日
                </button>
                <button
                  type="button"
                  onClick={() => {
                    clearHistoryQuery();
                    setHistoryFilterMode('week');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                    !activeHistoryQuery && historyFilterMode === 'week' ? 'bg-white/80 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  按周
                </button>
                <button
                  type="button"
                  onClick={() => {
                    clearHistoryQuery();
                    setHistoryFilterMode('month');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                    !activeHistoryQuery && historyFilterMode === 'month' ? 'bg-white/80 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  按月
                </button>
              </div>
              <div className="flex items-center gap-2">
                {historyFilterMode === 'day' && (
                  <PickerChip
                    type="date"
                    value={historyFilterDate}
                    onChange={(value) => {
                      clearHistoryQuery();
                      setHistoryFilterDate(value);
                    }}
                    displayValue={historyFilterDate.replaceAll('-', '/')}
                    ariaLabel="选择日期筛选近期流水明细"
                    className="whitespace-nowrap"
                  />
                )}
                {historyFilterMode === 'week' && (
                  <PickerChip
                    type="week"
                    value={historyFilterWeek}
                    onChange={(value) => {
                      clearHistoryQuery();
                      setHistoryFilterWeek(value);
                    }}
                    displayValue={historyFilterWeek.replace('-W', ' / Week ')}
                    ariaLabel="选择周筛选近期流水明细"
                    className="whitespace-nowrap"
                  />
                )}
                {historyFilterMode === 'month' && (
                  <PickerChip
                    type="month"
                    value={historyFilterMonth}
                    onChange={(value) => {
                      clearHistoryQuery();
                      setHistoryFilterMonth(value);
                    }}
                    displayValue={historyFilterMonth.replace('-', '/')}
                    ariaLabel="选择月份筛选近期流水明细"
                    className="whitespace-nowrap"
                  />
                )}
              </div>
              <div className="text-xs font-bold text-slate-400 bg-white/40 rounded-full px-3 py-1 border border-white/50 text-center">
                已显示 {visibleTransactions.length} / {filteredTransactions.length} 条
              </div>
            </div>
          </div>

          {activeHistoryQuery && (
            <div className="mb-5 space-y-3">
              <div className="flex flex-col gap-3 rounded-xl border border-indigo-100/70 bg-indigo-50/50 px-4 py-3 text-sm font-bold text-slate-600 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span className="font-black text-indigo-700">{activeHistoryQueryProduct?.name ?? '全部商品'}</span>
                  <span>{activeHistoryQuery.type === 'in' ? '入库明细' : '出库明细'}</span>
                  <span>
                    {activeHistoryQuery.allTime
                      ? '所有时间'
                      : `${activeHistoryQuery.startDate.replaceAll('-', '/')} - ${activeHistoryQuery.endDate.replaceAll('-', '/')}`}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={clearHistoryQuery}
                  className="flex items-center gap-1 self-start text-slate-500 transition-colors hover:text-indigo-700 sm:self-auto"
                >
                  <X size={15} /> 清除查询
                </button>
              </div>
              {historyQueryTotals && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-emerald-100/80 bg-emerald-50/60 px-4 py-4">
                    <div className="text-xs font-black text-emerald-700">查询范围总入库</div>
                    <div className="mt-1 text-2xl font-black text-emerald-700">
                      {formatHistoryBoxTotal(historyQueryTotals.inboundBoxes)} <span className="text-sm">箱</span>
                    </div>
                  </div>
                  <div className="rounded-xl border border-rose-100/80 bg-rose-50/60 px-4 py-4">
                    <div className="text-xs font-black text-rose-700">查询范围总出库</div>
                    <div className="mt-1 text-2xl font-black text-rose-700">
                      {formatHistoryBoxTotal(historyQueryTotals.outboundBoxes)} <span className="text-sm">箱</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="space-y-4">
            <div className="rounded-2xl border border-white/45 bg-white/28 backdrop-blur-xl">
              <div className="px-4 pb-4 pt-4 overflow-x-auto custom-scrollbar">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/20">
                      <th className="pb-3 font-bold text-slate-500 text-xs uppercase tracking-wider">时间</th>
                      <th className="pb-3 font-bold text-slate-500 text-xs uppercase tracking-wider">类型</th>
                      <th className="pb-3 font-bold text-slate-500 text-xs uppercase tracking-wider">商品</th>
                      <th className="pb-3 font-bold text-slate-500 text-xs uppercase tracking-wider">数量</th>
                      <th className="pb-3 font-bold text-slate-500 text-xs uppercase tracking-wider">备注</th>
                      <th className="pb-3 font-bold text-slate-500 text-xs uppercase tracking-wider text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {visibleTransactions.map((t: Transaction) => {
                      const p = products.find((prod: Product) => prod.id === t.productId);
                      return (
                        <tr key={t.id} className="hover:bg-white/20 transition-colors">
                          <td className="py-4 text-sm text-slate-500 font-medium">{formatDateTime(t.occurredAt)}</td>
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
                  </tbody>
                </table>
              </div>
            </div>

            {visibleTransactions.length === 0 && (
              <div className="py-12 text-center text-slate-400 font-bold">暂无流水记录</div>
            )}

            {canShowMoreLocal && (
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={handleShowMore}
                  className="px-4 py-2 rounded-xl bg-white/45 border border-white/50 text-slate-700 font-bold hover:bg-white/70 transition-all disabled:opacity-50"
                >
                  显示更多（+20条）
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface ProductsViewProps {
  user: User | null;
  products: Product[];
  addProduct: (name: string, spec: number, price: number) => Promise<boolean>;
  deleteProduct: (id: string) => void;
  updateProductStock: (id: string, newStock: number, nextName?: string, nextSpec?: number, nextPrice?: number) => Promise<boolean>;
  toggleProductActive: (id: string, nextActive: boolean) => Promise<boolean>;
  showToast: (message: string, type?: 'success' | 'error') => void;
  formatCurrency: (value: number) => string;
  formatStock: (total: number, spec: number) => string;
  name: string;
  setName: (value: string) => void;
  spec: string;
  setSpec: (value: string) => void;
  price: string;
  setPrice: (value: string) => void;
  isBatchMode: boolean;
  setIsBatchMode: (value: boolean) => void;
  batchText: string;
  setBatchText: (value: string) => void;
  handleBatchImport: () => Promise<void>;
}

export const ProductsView = ({
  user, products, addProduct, deleteProduct, updateProductStock, toggleProductActive, showToast, formatCurrency, formatStock,
  name, setName, spec, setSpec, price, setPrice, isBatchMode, setIsBatchMode, batchText, setBatchText,
  handleBatchImport
}: ProductsViewProps) => {
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [pendingDeleteProduct, setPendingDeleteProduct] = useState<Product | null>(null);
  const [editName, setEditName] = useState('');
  const [editSpec, setEditSpec] = useState('0');
  const [editPrice, setEditPrice] = useState('0');
  const [editBoxes, setEditBoxes] = useState('0');
  const [editItems, setEditItems] = useState('0');

  const handleExportProductList = async () => {
    try {
      const XLSX = await loadXlsxModule();
      const rows = products.map((product) => [
        product.name,
        product.spec,
        product.price,
        product.price * product.spec
      ]);
      const table = [['Nom', 'Qté par carton', 'Prix unitaire', 'Prix par carton'], ...rows];
      const worksheet = XLSX.utils.aoa_to_sheet(table);

      worksheet['!cols'] = [{ wch: 22 }, { wch: 16 }, { wch: 18 }, { wch: 20 }];
      worksheet['!rows'] = table.map((_, index) => ({ hpt: index === 0 ? 30 : 24 }));

      const range = XLSX.utils.decode_range(worksheet['!ref'] ?? 'A1:D1');
      for (let rowIndex = range.s.r; rowIndex <= range.e.r; rowIndex += 1) {
        for (let colIndex = range.s.c; colIndex <= range.e.c; colIndex += 1) {
          const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
          const cell = worksheet[cellAddress];
          if (!cell) continue;

          const isHeader = rowIndex === 0;
          const isEvenRow = rowIndex > 0 && rowIndex % 2 === 0;
          cell.s = {
            alignment: {
              horizontal: 'center',
              vertical: 'center'
            },
            font: {
              name: 'Microsoft YaHei',
              sz: isHeader ? 13 : 11,
              bold: isHeader,
              color: { rgb: isHeader ? 'FFFFFF' : '1E293B' }
            },
            fill: {
              fgColor: { rgb: isHeader ? '4F46E5' : (isEvenRow ? 'F8FAFC' : 'FFFFFF') }
            },
            border: {
              top: { style: 'thin', color: { rgb: 'D6DCE8' } },
              bottom: { style: 'thin', color: { rgb: 'D6DCE8' } },
              left: { style: 'thin', color: { rgb: 'D6DCE8' } },
              right: { style: 'thin', color: { rgb: 'D6DCE8' } }
            }
          };
        }
      }

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Produits');
      XLSX.writeFile(workbook, 'Liste des produits.xlsx');
      showToast('商品列表已导出', 'success');
    } catch (error) {
      console.error('Export product list failed:', error);
      showToast('导出失败，请重试', 'error');
    }
  };

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

  const openEditStockModal = (product: Product) => {
    const baseSpec = product.spec || 1;
    setEditingProduct(product);
    setEditName(product.name);
    setEditSpec(product.spec.toString());
    setEditPrice(product.price.toString());
    setEditBoxes(Math.floor(product.stock / baseSpec).toString());
    setEditItems((product.stock % baseSpec).toString());
  };

  const handleSaveStock = async () => {
    if (!editingProduct) return;
    const boxesValue = Number.parseInt(editBoxes, 10) || 0;
    const itemsValue = Number.parseInt(editItems, 10) || 0;
    const priceValue = Number.parseInt(editPrice, 10);
    const nextName = editName.trim();
    const nextSpec = Number.parseInt(editSpec, 10);

    if (boxesValue < 0 || itemsValue < 0) {
      showToast('库存不能为负数', 'error');
      return;
    }

    if (!nextName) {
      showToast('商品名不能为空', 'error');
      return;
    }
    if (!Number.isInteger(nextSpec) || nextSpec <= 0) {
      showToast('规格必须是大于0的整数', 'error');
      return;
    }
    if (!Number.isInteger(priceValue) || priceValue < 0) {
      showToast('单价必须是非负整数', 'error');
      return;
    }

    const totalStock = boxesValue * nextSpec + itemsValue;
    const success = await updateProductStock(
      editingProduct.id,
      totalStock,
      nextName,
      nextSpec,
      priceValue
    );
    if (success) {
      setEditingProduct(null);
    }
  };

  return (
    <div className="space-y-8">
      <AnimatePresence>
        {editingProduct && (
          <div className="fixed inset-0 bg-black/35 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="glass rounded-3xl p-7 w-full max-w-md border border-white/55"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black text-slate-800">编辑商品信息</h3>
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="p-2 rounded-full hover:bg-white/45 transition-all text-slate-500"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-5">
                <div className="rounded-2xl bg-white/40 border border-white/50 p-4">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">商品名</label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full rounded-2xl border-white/40 bg-white/30 backdrop-blur-sm focus:ring-indigo-500 focus:border-indigo-500 py-3 font-bold !text-left"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">规格 (个/箱)</label>
                      <input
                        type="number"
                        min="1"
                        value={editSpec}
                        onChange={(e) => setEditSpec(e.target.value)}
                        className="w-full rounded-2xl border-white/40 bg-white/30 backdrop-blur-sm focus:ring-indigo-500 focus:border-indigo-500 py-3 font-bold !text-left"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">单价 (XOF/个)</label>
                      <input
                        type="number"
                        min="0"
                        value={editPrice}
                        onChange={(e) => setEditPrice(e.target.value)}
                        className="w-full rounded-2xl border-white/40 bg-white/30 backdrop-blur-sm focus:ring-indigo-500 focus:border-indigo-500 py-3 font-bold !text-left"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-600 uppercase tracking-widest mb-2">箱数</label>
                    <input
                      type="number"
                      min="0"
                      value={editBoxes}
                      onChange={(e) => setEditBoxes(e.target.value)}
                      className="w-full rounded-2xl border-white/40 bg-white/30 backdrop-blur-sm focus:ring-indigo-500 focus:border-indigo-500 py-3 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-600 uppercase tracking-widest mb-2">散个</label>
                    <input
                      type="number"
                      min="0"
                      value={editItems}
                      onChange={(e) => setEditItems(e.target.value)}
                      className="w-full rounded-2xl border-white/40 bg-white/30 backdrop-blur-sm focus:ring-indigo-500 focus:border-indigo-500 py-3 font-bold"
                    />
                  </div>
                </div>

                <div className="text-xs font-semibold text-slate-500 bg-indigo-50/60 border border-indigo-100/70 rounded-xl px-3 py-2">
                  可修改商品名、规格、库存和单价；保存后会同步更新该商品历史流水单价，历史销售金额会按新单价重新计算。
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingProduct(null)}
                    className="flex-1 py-3 rounded-xl font-bold text-slate-600 bg-white/55 hover:bg-white/75 border border-white/60 transition-all"
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveStock}
                    className="flex-1 py-3 rounded-xl font-bold text-white bg-indigo-600/90 hover:bg-indigo-700 shadow-lg shadow-indigo-200/50 transition-all flex items-center justify-center gap-2"
                  >
                    <Save size={16} />
                    保存修改
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {pendingDeleteProduct && (
          <div className="fixed inset-0 bg-black/35 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="glass rounded-3xl p-7 w-full max-w-md border border-white/55"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black text-slate-800">确认删除商品</h3>
                <button
                  type="button"
                  onClick={() => setPendingDeleteProduct(null)}
                  className="p-2 rounded-full hover:bg-white/45 transition-all text-slate-500"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-5">
                <div className="rounded-2xl bg-white/40 border border-white/50 p-4">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">商品</div>
                  <div className="mt-1 text-base font-black text-slate-800">{pendingDeleteProduct.name}</div>
                  <div className="text-sm font-semibold text-slate-500">
                    规格: {pendingDeleteProduct.spec} 个/箱 · 当前库存: {formatStock(pendingDeleteProduct.stock, pendingDeleteProduct.spec)}
                  </div>
                </div>

                <div className="text-xs font-semibold text-rose-600 bg-rose-50/60 border border-rose-100/70 rounded-xl px-3 py-2">
                  删除后该商品将从列表移除，请确认这是你要执行的操作。
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setPendingDeleteProduct(null)}
                    className="flex-1 py-3 rounded-xl font-bold text-slate-600 bg-white/55 hover:bg-white/75 border border-white/60 transition-all"
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await deleteProduct(pendingDeleteProduct.id);
                      setPendingDeleteProduct(null);
                    }}
                    className="flex-1 py-3 rounded-xl font-bold text-white bg-rose-600/90 hover:bg-rose-700 shadow-lg shadow-rose-200/50 transition-all flex items-center justify-center gap-2"
                  >
                    <Trash2 size={16} />
                    确认删除
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
              <label className="block text-sm font-bold text-slate-600 uppercase tracking-widest mb-2">产品名称</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：AJ1 芝加哥"
                className="w-full rounded-2xl border-white/40 bg-white/30 backdrop-blur-sm focus:ring-indigo-500 focus:border-indigo-500 py-3 font-bold"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-600 uppercase tracking-widest mb-2">规格 (一箱多少个)</label>
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
              <label className="block text-sm font-bold text-slate-600 uppercase tracking-widest mb-2">单价 (XOF/个)</label>
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
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Package size={24} className="text-slate-600" />
            商品列表维护
          </h2>
          <button
            type="button"
            onClick={handleExportProductList}
            disabled={products.length === 0}
            className={`inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-black shadow-lg transition-all active:scale-95 ${
              products.length === 0
                ? 'cursor-not-allowed bg-slate-200/50 text-slate-400 shadow-none'
                : 'bg-indigo-600/90 text-white shadow-indigo-200/50 hover:bg-indigo-700'
            }`}
          >
            <Download size={17} />
            导出表格
          </button>
        </div>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/10">
                <th className="pb-4 font-bold text-slate-500 text-xs uppercase tracking-wider">产品名称</th>
                <th className="pb-4 font-bold text-slate-500 text-xs uppercase tracking-wider">规格</th>
                <th className="pb-4 font-bold text-slate-500 text-xs uppercase tracking-wider">单价</th>
                <th className="pb-4 font-bold text-slate-500 text-xs uppercase tracking-wider">箱价</th>
                <th className="pb-4 font-bold text-slate-500 text-xs uppercase tracking-wider">当前库存</th>
                <th className="pb-4 font-bold text-slate-500 text-xs uppercase tracking-wider">状态</th>
                <th className="pb-4 font-bold text-slate-500 text-xs uppercase tracking-wider text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {products.map((p: Product) => (
                <tr key={p.id} className="hover:bg-white/20 transition-colors">
                  <td className="py-4 text-sm font-bold text-slate-900">{p.name}</td>
                  <td className="py-4 text-sm text-slate-600 font-bold">{p.spec} 个/箱</td>
                  <td className="py-4 text-sm text-slate-600 font-bold">{formatCurrency(p.price)}</td>
                  <td className="py-4 text-sm text-indigo-600 font-black">{formatCurrency(p.price * p.spec)}</td>
                  <td className="py-4 text-sm text-slate-600 font-bold">{formatStock(p.stock, p.spec)}</td>
                  <td className="py-4 text-sm">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ${
                      p.isActive !== false
                        ? 'bg-emerald-100/60 text-emerald-700 border border-emerald-200/70'
                        : 'bg-slate-100/80 text-slate-500 border border-slate-200/70'
                    }`}>
                      {p.isActive !== false ? '在售' : '已下架'}
                    </span>
                  </td>
                  <td className="py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={async () => {
                          await toggleProductActive(p.id, p.isActive === false);
                        }}
                        disabled={user?.role !== 'admin'}
                        className={`p-2 rounded-lg transition-all backdrop-blur-sm ${
                          user?.role !== 'admin'
                            ? 'text-slate-300 cursor-not-allowed'
                            : (p.isActive !== false
                              ? 'text-amber-500 hover:bg-amber-50/50'
                              : 'text-emerald-500 hover:bg-emerald-50/50')
                        }`}
                        title={
                          user?.role !== 'admin'
                            ? '无权限'
                            : (p.isActive !== false ? '下架商品（保留历史数据）' : '重新上架商品')
                        }
                      >
                        {p.isActive !== false ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditStockModal(p)}
                        disabled={user?.role !== 'admin'}
                        className={`p-2 rounded-lg transition-all backdrop-blur-sm ${
                          user?.role !== 'admin'
                            ? 'text-slate-300 cursor-not-allowed'
                            : 'text-indigo-500 hover:bg-indigo-50/50'
                        }`}
                        title={user?.role !== 'admin' ? '无权限' : '编辑库存'}
                      >
                        <Pencil size={18} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingDeleteProduct(p)}
                        disabled={p.stock > 0 || user?.role !== 'admin'}
                        className={`p-2 rounded-lg transition-all backdrop-blur-sm ${
                          p.stock > 0 || user?.role !== 'admin'
                            ? 'text-slate-300 cursor-not-allowed' 
                            : 'text-rose-500 hover:bg-rose-50/50'
                        }`}
                        title={
                          user?.role !== 'admin'
                            ? '无权限'
                            : (p.stock > 0 ? '请先清空库存再删除' : '删除商品')
                        }
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-bold">暂无商品数据</td>
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
  expenses, transactions, addExpense, deleteExpense, formatCurrency, user,
  formatDateTime
}: {
  expenses: Expense[],
  transactions: Transaction[],
  addExpense: (amount: number, category: string, remark: string, date: string) => Promise<boolean>,
  deleteExpense: (id: string | null) => void,
  formatCurrency: (val: number) => string,
  user: User | null,
  formatDateTime: (value: Expense['occurredAt']) => string
}) => {
  const expenseCategoryOptions = [
    { name: '物流运费', hint: '送货、搬运、托运、本地配送等运输费用' },
    { name: '清关税费', hint: '清关、关税、港口、报关及相关官方费用' },
    { name: '仓储租金', hint: '仓库、店铺、宿舍、临时库位等租金' },
    { name: '员工工资', hint: '固定工资、临时工工资、奖金和补贴' },
    { name: '交通油费', hint: '油费、打车、停车、车辆通行等出行费用' },
    { name: '水电通讯', hint: '水费、电费、电话费、网络费、流量费' },
    { name: '维修耗材', hint: '设备维修、车辆维修、工具、胶带、包装耗材' },
    { name: '办公杂费', hint: '打印、文具、办公用品、小额采购' },
    { name: '手续费税费', hint: '银行手续费、转账手续费、平台手续费、经营税费' },
    { name: '其他支出', hint: '不属于以上项目的临时性支出' }
  ] as const;

  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [remark, setRemark] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7));
  const [visibleExpenseCount, setVisibleExpenseCount] = useState(20);
  const dateLabel = date.replaceAll('-', '/');
  const filterMonthLabel = filterMonth.replace('-', '/');
  const selectedCategoryHint = expenseCategoryOptions.find((option) => option.name === category)?.hint;

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
    const range = getRangeByMonth(filterMonth);
    return expenses.filter(e => isWithinRange(e.occurredAt, range));
  }, [expenses, filterMonth]);

  const visibleExpenses = useMemo(() => {
    return filteredExpenses.slice(0, visibleExpenseCount);
  }, [filteredExpenses, visibleExpenseCount]);

  const canShowMoreExpensesLocal = visibleExpenseCount < filteredExpenses.length;

  const monthlyTotal = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [filteredExpenses]);

  const monthlySalesTotal = useMemo(() => {
    const [year, month] = filterMonth.split('-');
    const start = new Date(parseInt(year), parseInt(month) - 1, 1);
    start.setHours(0, 0, 0, 0);

    const end = new Date(parseInt(year), parseInt(month), 0);
    end.setHours(23, 59, 59, 999);

    return transactions
      .filter(t => {
        if (t.type !== 'out') return false;
        return isWithinRange(t.occurredAt, { start, end });
      })
      .reduce((sum, t) => sum + t.quantity * t.unitPrice, 0);
  }, [transactions, filterMonth]);

  const estimatedCommission = useMemo(() => {
    return monthlySalesTotal * 0.035 - monthlyTotal;
  }, [monthlySalesTotal, monthlyTotal]);

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
                <label className="block text-sm font-bold text-slate-600 uppercase tracking-widest mb-2">金额 (XOF)</label>
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
                <label className="block text-sm font-bold text-slate-600 uppercase tracking-widest mb-2">支出项目/类别</label>
                <select
                  required
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-2xl border-white/40 bg-white/30 backdrop-blur-sm focus:ring-rose-500 focus:border-rose-500 py-3 font-bold"
                >
                  <option value="" disabled>
                    请选择支出类别
                  </option>
                  {expenseCategoryOptions.map((option) => (
                    <option key={option.name} value={option.name}>
                      {option.name}
                    </option>
                  ))}
                </select>
                {selectedCategoryHint && (
                  <p className="mt-2 rounded-xl bg-rose-50/55 border border-rose-100/70 px-3 py-2 text-xs font-semibold text-rose-700">
                    {selectedCategoryHint}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-600 uppercase tracking-widest mb-2">日期</label>
                <PickerChip
                  type="date"
                  value={date}
                  onChange={setDate}
                  displayValue={dateLabel}
                  ariaLabel="选择支出日期"
                  className="w-full justify-between rounded-2xl py-3"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-600 uppercase tracking-widest mb-2">备注</label>
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
          {/* Monthly Summary Card */}
          <div className="glass rounded-3xl p-8 shadow-xl overflow-hidden relative border border-white/35">
            {/* Decorative background elements */}
            <div className="absolute -right-10 -top-10 w-64 h-64 bg-sky-400/20 rounded-full blur-3xl" />
            <div className="absolute -left-10 -bottom-10 w-64 h-64 bg-emerald-400/15 rounded-full blur-3xl" />
            
            <div className="relative z-10 space-y-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sky-600 text-xs font-black uppercase tracking-[0.2em] mb-2">
                    <div className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
                    月度支出总计
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-6xl font-black tracking-tighter text-slate-900 drop-shadow-sm">
                      {formatCurrency(monthlyTotal).replace(' XOF', '')}
                    </span>
                    <span className="text-2xl font-bold text-sky-700/75">XOF</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 bg-white/45 backdrop-blur-xl p-4 rounded-2xl border border-white/55 shadow-sm">
                  <div className="p-2 bg-sky-100/80 rounded-lg">
                    <Calendar size={20} className="text-sky-600" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">选择月份</span>
                    <PickerChip
                      type="month"
                      value={filterMonth}
                      onChange={setFilterMonth}
                      displayValue={filterMonthLabel}
                      ariaLabel="选择统计月份"
                      className="bg-transparent px-0 py-0 text-lg font-black shadow-none border-0"
                    />
                  </div>
                </div>
              </div>

              {/* Quick Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-white/30">
                <div className="bg-white/45 rounded-2xl p-4 border border-white/55 backdrop-blur-md">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">日均支出</div>
                  <div className="text-xl font-black text-sky-700">{formatCurrency(dailyAverage)}</div>
                </div>
                <div className="bg-white/50 rounded-2xl p-4 border border-emerald-200/45 backdrop-blur-md shadow-[0_12px_28px_rgba(16,185,129,0.1)]">
                  <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-1">预计提成</div>
                  <div className="text-xl font-black text-emerald-700">{formatCurrency(estimatedCommission)}</div>
                  <div className="mt-1 text-[11px] font-semibold text-slate-400">
                    出库销售总额 x 3.5% - 月度支出总计
                  </div>
                  <div className="mt-1 text-[11px] font-semibold text-slate-400">
                    当月销量总额: {formatCurrency(monthlySalesTotal)}
                  </div>
                </div>
                <div className="bg-white/45 rounded-2xl p-4 border border-white/55 backdrop-blur-md">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">本月记录</div>
                  <div className="text-xl font-black text-rose-500">{filteredExpenses.length} 笔</div>
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
                  {visibleExpenses.map((e: Expense) => (
                    <tr key={e.id} className="hover:bg-white/20 transition-colors">
                      <td className="py-4 text-sm font-medium text-slate-500">{formatDateTime(e.occurredAt)}</td>
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
                  {visibleExpenses.length === 0 && (
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
              {canShowMoreExpensesLocal && (
                <div className="mt-4 text-center">
                  <button
                    type="button"
                    onClick={() => setVisibleExpenseCount((prev) => prev + 20)}
                    className="px-4 py-2 rounded-xl bg-white/45 border border-white/50 text-slate-700 font-bold hover:bg-white/70 transition-all disabled:opacity-50"
                  >
                    显示更多支出（+20条）
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const DebtsView = ({
  debts,
  addDebt,
  updateDebt,
  settleDebt,
  formatCurrency,
  user
}: {
  debts: Debt[];
  addDebt: (customerName: string, amount: number, date: string) => Promise<boolean>;
  updateDebt: (
    debtId: string,
    customerName: string,
    amount: number,
    paidAmount: number,
    date: string
  ) => Promise<boolean>;
  settleDebt: (debtId: string) => Promise<boolean>;
  formatCurrency: (value: number) => string;
  user: User | null;
}) => {
  const [customerName, setCustomerName] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editPaidAmount, setEditPaidAmount] = useState('');
  const [editDate, setEditDate] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [settlingDebtId, setSettlingDebtId] = useState<string | null>(null);
  const dateLabel = date.replaceAll('-', '/');
  const totalOutstanding = useMemo(
    () => debts.reduce((total, debt) => total + debt.amount - debt.paidAmount, 0),
    [debts]
  );
  const sortedDebts = useMemo(
    () =>
      debts.slice().sort((left, right) => {
        const leftSettled = left.paidAmount === left.amount;
        const rightSettled = right.paidAmount === right.amount;
        if (leftSettled !== rightSettled) return leftSettled ? 1 : -1;
        return right.occurredAt.toMillis() - left.occurredAt.toMillis();
      }),
    [debts]
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedCustomerName = customerName.trim();
    const normalizedAmount = Number(amount);
    if (!normalizedCustomerName || !Number.isFinite(normalizedAmount) || normalizedAmount <= 0 || !date) return;

    setIsSubmitting(true);
    const success = await addDebt(normalizedCustomerName, normalizedAmount, date);
    setIsSubmitting(false);
    if (success) {
      setCustomerName('');
      setAmount('');
    }
  };

  const openEditModal = (debt: Debt) => {
    setEditingDebt(debt);
    setEditCustomerName(debt.customerName);
    setEditAmount(String(debt.amount));
    setEditPaidAmount(debt.paidAmount === 0 ? '' : String(debt.paidAmount));
    setEditDate(formatDateInputValue(debt.occurredAt));
  };

  const closeEditModal = () => {
    if (isEditing) return;
    setEditingDebt(null);
  };

  const handleUpdate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingDebt) return;

    const normalizedCustomerName = editCustomerName.trim();
    const normalizedAmount = Number(editAmount);
    const normalizedPaidAmount = editPaidAmount === '' ? 0 : Number(editPaidAmount);
    if (
      !normalizedCustomerName ||
      !Number.isFinite(normalizedAmount) ||
      normalizedAmount <= 0 ||
      !Number.isFinite(normalizedPaidAmount) ||
      normalizedPaidAmount < 0 ||
      normalizedPaidAmount > normalizedAmount ||
      !editDate
    ) {
      return;
    }

    setIsEditing(true);
    const success = await updateDebt(
      editingDebt.id,
      normalizedCustomerName,
      normalizedAmount,
      normalizedPaidAmount,
      editDate
    );
    setIsEditing(false);
    if (success) setEditingDebt(null);
  };

  const handleSettleDebt = async (debtId: string) => {
    setSettlingDebtId(debtId);
    await settleDebt(debtId);
    setSettlingDebtId(null);
  };

  return (
    <>
      <section className="glass mb-8 flex flex-wrap items-center justify-between gap-5 rounded-3xl border border-white/30 px-8 py-6 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-rose-100/60 bg-rose-50/70 p-2">
            <Wallet size={22} className="text-rose-600" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-500">当前欠款总额</div>
            <div className="mt-1 text-xs font-medium text-slate-400">已结清欠款不计入总额</div>
          </div>
        </div>
        <div className="text-3xl font-black text-rose-600">{formatCurrency(totalOutstanding)}</div>
      </section>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-4">
        <section className="min-w-0 xl:col-span-1">
          <div className="glass sticky top-24 rounded-2xl border border-white/30 p-6 shadow-xl">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-xl border border-amber-100/60 bg-amber-50/70 p-2">
              <HandCoins size={20} className="text-amber-600" />
            </div>
            <h2 className="text-xl font-black tracking-tight text-slate-800">登记欠账</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-600">客户名</label>
              <input
                type="text"
                required
                maxLength={99}
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                placeholder="输入客户姓名"
                className="w-full rounded-2xl border-white/40 bg-white/30 py-3 font-bold backdrop-blur-sm focus:border-amber-500 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-600">欠款金额 (XOF)</label>
              <input
                type="number"
                required
                min="1"
                step="1"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0"
                className="w-full rounded-2xl border-white/40 bg-white/30 py-3 font-bold backdrop-blur-sm focus:border-amber-500 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-600">欠款日期</label>
              <PickerChip
                type="date"
                value={date}
                onChange={setDate}
                displayValue={dateLabel}
                ariaLabel="选择欠款日期"
                className="w-full justify-between rounded-2xl py-3"
              />
            </div>
            <button
              type="submit"
              disabled={user?.role !== 'admin' || isSubmitting}
              className={`flex w-full items-center justify-center gap-2 rounded-2xl py-4 font-bold shadow-lg transition-all active:scale-95 ${
                user?.role !== 'admin' || isSubmitting
                  ? 'cursor-not-allowed bg-slate-200/50 text-slate-400 shadow-none'
                  : 'bg-amber-500 text-white shadow-amber-200/60 hover:bg-amber-600'
              }`}
            >
              <Save size={20} />
              {user?.role !== 'admin' ? '无权限' : isSubmitting ? '正在登记...' : '确认登记'}
            </button>
          </form>
          </div>
        </section>

        <section className="glass min-w-0 rounded-2xl border border-white/30 p-6 shadow-xl xl:col-span-3">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-xl font-black tracking-tight text-slate-800">
            <History size={24} className="text-slate-600" />
            欠款明细
          </h2>
          <div className="rounded-full border border-white/20 bg-white/30 px-4 py-1.5 text-sm font-bold text-slate-400 backdrop-blur-md">
            共 {debts.length} 笔记录
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full min-w-[42rem] table-fixed text-left xl:min-w-0">
            <colgroup>
              <col className="w-[18%]" />
              <col className="w-[15%]" />
              <col className="w-[15%]" />
              <col className="w-[18%]" />
              <col className="w-[18%]" />
              <col className="w-[16%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-white/10">
                <th className="pb-4 text-xs font-bold text-slate-500">客户名</th>
                <th className="pb-4 text-xs font-bold text-slate-500">原欠款</th>
                <th className="pb-4 text-xs font-bold text-slate-500">已还金额</th>
                <th className="pb-4 text-xs font-bold text-slate-500">剩余金额</th>
                <th className="pb-4 text-xs font-bold text-slate-500">欠款日期</th>
                <th className="pb-4 text-right text-xs font-bold text-slate-500">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {sortedDebts.map((debt) => {
                const remainingAmount = debt.amount - debt.paidAmount;
                const isSettled = remainingAmount === 0;
                return (
                  <tr key={debt.id} className="transition-colors hover:bg-white/20">
                    <td className="py-4 text-sm font-bold text-slate-800">{debt.customerName}</td>
                    <td className="py-4 text-sm font-black text-amber-600">{formatCurrency(debt.amount)}</td>
                    <td className="py-4 text-sm font-bold text-sky-600">{formatCurrency(debt.paidAmount)}</td>
                    <td className="py-4 text-sm font-black">
                      {isSettled ? (
                        <span className="inline-flex items-center gap-1.5 text-emerald-600">
                          <CheckCircle2 size={16} />
                          已结清
                        </span>
                      ) : (
                        <span className="text-rose-600">{formatCurrency(remainingAmount)}</span>
                      )}
                    </td>
                    <td className="py-4 text-sm font-medium text-slate-500">
                      {formatDateInputValue(debt.occurredAt)}
                    </td>
                    <td className="py-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          disabled={user?.role !== 'admin' || settlingDebtId !== null}
                          onClick={() => openEditModal(debt)}
                          aria-label={`编辑 ${debt.customerName} 的欠账`}
                          title="编辑欠账"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500 text-white shadow-md shadow-sky-200/50 transition-colors hover:bg-sky-600 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
                        >
                          <Pencil size={16} />
                        </button>
                        {!isSettled && (
                          <button
                            type="button"
                            disabled={user?.role !== 'admin' || settlingDebtId !== null}
                            onClick={() => handleSettleDebt(debt.id)}
                            aria-label={`将 ${debt.customerName} 的欠款标记为已结清`}
                            title="标记已结清"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-md shadow-emerald-200/50 transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
                          >
                            <CheckCircle2 size={17} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {debts.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <HandCoins size={48} className="mb-2 opacity-20" />
                      <div className="font-bold">暂无欠账记录</div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </section>
      </div>

      <AnimatePresence>
        {editingDebt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="w-full max-w-md rounded-3xl border border-white/60 bg-white p-8 shadow-2xl"
            >
              <div className="mb-6 flex items-center justify-between gap-4">
                <h3 className="text-xl font-black text-slate-800">编辑欠账</h3>
                <button
                  type="button"
                  onClick={closeEditModal}
                  disabled={isEditing}
                  aria-label="关闭编辑欠账窗口"
                  className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleUpdate} className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-600">客户名</label>
                  <input
                    type="text"
                    required
                    autoFocus
                    maxLength={99}
                    value={editCustomerName}
                    onChange={(event) => setEditCustomerName(event.target.value)}
                    className="w-full rounded-2xl border-slate-200 py-3 font-bold focus:border-sky-500 focus:ring-sky-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-600">原欠款 (XOF)</label>
                    <input
                      type="number"
                      required
                      min="1"
                      step="1"
                      value={editAmount}
                      onChange={(event) => setEditAmount(event.target.value)}
                      className="w-full rounded-2xl border-slate-200 py-3 font-bold focus:border-sky-500 focus:ring-sky-500"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-600">累计已还 (XOF)</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      max={editAmount || undefined}
                      value={editPaidAmount}
                      onChange={(event) => setEditPaidAmount(event.target.value)}
                      className="w-full rounded-2xl border-slate-200 py-3 font-bold focus:border-sky-500 focus:ring-sky-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-600">欠款日期</label>
                  <PickerChip
                    type="date"
                    value={editDate}
                    onChange={setEditDate}
                    displayValue={editDate.replaceAll('-', '/')}
                    ariaLabel="修改欠款日期"
                    className="w-full justify-between rounded-2xl py-3"
                  />
                </div>

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={closeEditModal}
                    disabled={isEditing}
                    className="flex-1 rounded-2xl bg-slate-100 py-3 font-bold text-slate-600 transition-colors hover:bg-slate-200 disabled:opacity-50"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={isEditing}
                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-sky-500 py-3 font-bold text-white shadow-lg shadow-sky-200/60 transition-colors hover:bg-sky-600 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                  >
                    <Save size={18} />
                    {isEditing ? '正在保存...' : '保存修改'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
