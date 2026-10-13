import { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, type Auth } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, query, Timestamp, where, type DocumentData, type Firestore } from 'firebase/firestore';
import { Search, X } from 'lucide-react';
import { auth, db, nigeriaAuth, nigeriaDb } from '../firebase';
import { calculateRiskByProduct } from '../lib/productRisk';
import {
  buildDailySales,
  calculateChangePercent,
  getPreviousMonthKey,
  summarizeCargo,
  summarizeMonthSales,
  summarizeTransactionSales,
  type CargoSummary,
  type CountryMonthSummary,
  type CountryProductInfo,
  type SaleTransaction,
  type SalesSummary
} from '../lib/groupOverview';
import { getPreviousMonthToDateRange, toLocalDateInputValue } from '../lib/timeWindow';
import type { ProductRiskMetrics } from '../types';
import { PickerChip } from './Views';

export type CountryKey = 'togo' | 'nigeria';
export type GroupTab = 'compare' | CountryKey;
type PeriodMode = 'day' | 'month';

export interface Period {
  mode: PeriodMode;
  date: string;
  month: string;
}

export interface CountryConfig {
  key: CountryKey;
  name: string;
  eyebrow: string;
  firestore: Firestore;
  firebaseAuth: Auth;
  formatCurrency: (value: number) => string;
}

export const COUNTRIES: Record<CountryKey, CountryConfig> = {
  togo: {
    key: 'togo',
    name: '多哥',
    eyebrow: 'TOGO · XOF',
    firestore: db,
    firebaseAuth: auth,
    formatCurrency: (value) => `${new Intl.NumberFormat('zh-CN').format(Math.round(value))} XOF`
  },
  nigeria: {
    key: 'nigeria',
    name: '尼日利亚',
    eyebrow: 'NIGERIA · NGN',
    firestore: nigeriaDb,
    firebaseAuth: nigeriaAuth,
    formatCurrency: (value) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value)
  }
};

export interface InventoryRow {
  productId: string;
  name: string;
  spec: number;
  price: number;
  stockBoxes: number;
  stockValue: number;
  isActive: boolean;
  risk: ProductRiskMetrics | null;
}

export interface CargoRow {
  id: string;
  containerNumber: string;
  status: string;
  arrivalDate: string | null;
  cargoBoxes: number;
}

export interface CountryBase {
  products: Map<string, CountryProductInfo>;
  inventory: InventoryRow[];
  totalBoxes: number;
  totalValue: number;
  warnings: InventoryRow[];
  stale: InventoryRow[];
  cargo: CargoSummary;
  cargoRows: CargoRow[];
}

export interface CountrySales {
  summary: SalesSummary;
  change: number | null;
  changeNote: string;
  daily: number[] | null;
}

const toNumber = (value: unknown) => Number(value ?? 0);
const toDate = (value: unknown) => (value instanceof Timestamp ? value.toDate() : null);
const formatBoxes = (value: number) => `${Math.round(value * 10) / 10} 箱`;
const formatChange = (value: number | null) => (value === null ? '无对比数据' : `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`);

const toSaleTransaction = (data: DocumentData): SaleTransaction | null => {
  const occurredAt = toDate(data.occurredAt);
  if (!occurredAt || (data.type !== 'in' && data.type !== 'out')) return null;
  return { productId: String(data.productId ?? ''), type: data.type, quantity: toNumber(data.quantity), unitPrice: toNumber(data.unitPrice), occurredAt };
};

async function readTransactions(firestore: Firestore, start: Date, end: Date): Promise<SaleTransaction[]> {
  const snapshot = await getDocs(query(
    collection(firestore, 'transactions'),
    where('occurredAt', '>=', Timestamp.fromDate(start)),
    where('occurredAt', '<=', Timestamp.fromDate(end))
  ));
  return snapshot.docs.map((item) => toSaleTransaction(item.data())).filter((item): item is SaleTransaction => item !== null);
}

const dayStart = (dateValue: string) => new Date(`${dateValue}T00:00:00`);
const dayEnd = (dateValue: string) => new Date(`${dateValue}T23:59:59.999`);

async function loadCountryBase(firestore: Firestore): Promise<CountryBase> {
  const now = new Date();
  const lookbackStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
  const [productsSnap, recentTransactions, cargoSnap] = await Promise.all([
    getDocs(collection(firestore, 'products')),
    readTransactions(firestore, lookbackStart, now),
    getDocs(collection(firestore, 'cargoContainers'))
  ]);

  const products = productsSnap.docs.map((item) => {
    const data = item.data();
    return {
      id: item.id,
      name: String(data.name ?? ''),
      spec: toNumber(data.spec) || 1,
      stock: toNumber(data.stock),
      price: toNumber(data.price),
      isActive: data.isActive !== false,
      createdAt: toDate(data.createdAt),
      lastOutAt: toDate(data.lastOutAt)
    };
  });
  const risk = calculateRiskByProduct(products.filter((product) => product.isActive), recentTransactions, now);
  const inventory: InventoryRow[] = products
    .map((product) => ({
      productId: product.id,
      name: product.name,
      spec: product.spec,
      price: product.price,
      stockBoxes: product.stock / product.spec,
      stockValue: product.stock * product.price,
      isActive: product.isActive,
      risk: risk[product.id] ?? null
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
  const cargoRows: CargoRow[] = cargoSnap.docs
    .map((item) => {
      const data = item.data();
      return {
        id: item.id,
        containerNumber: String(data.containerNumber ?? ''),
        status: String(data.status ?? ''),
        arrivalDate: typeof data.arrivalDate === 'string' ? data.arrivalDate : null,
        cargoBoxes: toNumber(data.cargoBoxes)
      };
    })
    .filter((row) => row.status === '在途' || row.status === '到港')
    .sort((left, right) => (left.arrivalDate ?? '').localeCompare(right.arrivalDate ?? ''));

  return {
    products: new Map(products.map((product) => [product.id, { name: product.name, spec: product.spec }])),
    inventory,
    totalBoxes: inventory.reduce((total, row) => total + row.stockBoxes, 0),
    totalValue: inventory.reduce((total, row) => total + row.stockValue, 0),
    warnings: inventory
      .filter((row) => row.risk?.isWarning)
      .sort((left, right) => Number(right.risk?.isOutOfStock) - Number(left.risk?.isOutOfStock) || (left.risk?.daysOfCover ?? 0) - (right.risk?.daysOfCover ?? 0) || left.name.localeCompare(right.name)),
    stale: inventory
      .filter((row) => row.risk?.isStale)
      .sort((left, right) => right.stockValue - left.stockValue || left.name.localeCompare(right.name)),
    cargo: summarizeCargo(cargoRows),
    cargoRows
  };
}

async function loadCountrySales(firestore: Firestore, period: Period, products: Map<string, CountryProductInfo>, withDaily: boolean): Promise<CountrySales> {
  if (period.mode === 'day') {
    const previousDay = new Date(`${period.date}T00:00:00`);
    previousDay.setDate(previousDay.getDate() - 1);
    const previousDate = toLocalDateInputValue(previousDay);
    const transactions = await readTransactions(firestore, dayStart(previousDate), dayEnd(period.date));
    const summary = summarizeTransactionSales(transactions.filter((item) => toLocalDateInputValue(item.occurredAt) === period.date), products);
    const previous = summarizeTransactionSales(transactions.filter((item) => toLocalDateInputValue(item.occurredAt) === previousDate), products);
    return {
      summary,
      change: calculateChangePercent(summary.amount, previous.amount),
      changeNote: `对比 ${previousDate.slice(5).replace('-', '/')}`,
      daily: null
    };
  }

  const now = new Date();
  const previousMonthKey = getPreviousMonthKey(period.month);
  const isCurrentMonth = period.month === toLocalDateInputValue(now).slice(0, 7);
  const previousRange = getPreviousMonthToDateRange(now);
  const [year, month] = period.month.split('-').map((value) => Number.parseInt(value, 10));
  const toMonthSummary = (data: DocumentData | undefined): CountryMonthSummary | null => data
    ? { outAmount: toNumber(data.outAmount), expenseAmount: toNumber(data.expenseAmount), outByProduct: data.outByProduct ?? {} }
    : null;
  const [monthSnap, previousMonthSnap, previousToDate, monthTransactions] = await Promise.all([
    getDoc(doc(firestore, 'analyticsMonths', period.month)),
    isCurrentMonth ? Promise.resolve(null) : getDoc(doc(firestore, 'analyticsMonths', previousMonthKey)),
    isCurrentMonth ? readTransactions(firestore, previousRange.start, previousRange.end) : Promise.resolve(null),
    withDaily ? readTransactions(firestore, new Date(year, month - 1, 1), new Date(year, month, 0, 23, 59, 59, 999)) : Promise.resolve(null)
  ]);
  const summary = summarizeMonthSales(toMonthSummary(monthSnap.data()), products);
  const previousAmount = previousToDate
    ? summarizeTransactionSales(previousToDate, products).amount
    : toMonthSummary(previousMonthSnap?.data())?.outAmount ?? 0;
  const previousLabel = previousMonthKey.replace('-', '/');
  return {
    summary,
    change: calculateChangePercent(summary.amount, previousAmount),
    changeNote: isCurrentMonth
      ? `对比 ${previousLabel}/01–${String(previousRange.end.getDate()).padStart(2, '0')}`
      : `对比 ${previousLabel}`,
    daily: monthTransactions ? buildDailySales(monthTransactions, period.month) : null
  };
}

type Loadable<T> = { status: 'loading' } | { status: 'signed-out' } | { status: 'error' } | { status: 'ready'; data: T };

function useSignedIn(firebaseAuth: Auth) {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  useEffect(() => onAuthStateChanged(firebaseAuth, (firebaseUser) => setSignedIn(Boolean(firebaseUser))), [firebaseAuth]);
  return signedIn;
}

function useCountryData(country: CountryConfig, period: Period, withDaily: boolean) {
  const signedIn = useSignedIn(country.firebaseAuth);
  const [base, setBase] = useState<Loadable<CountryBase>>({ status: 'loading' });
  const [sales, setSales] = useState<Loadable<CountrySales>>({ status: 'loading' });

  useEffect(() => {
    if (signedIn === null) return;
    if (!signedIn) {
      setBase({ status: 'signed-out' });
      return;
    }
    let cancelled = false;
    setBase({ status: 'loading' });
    loadCountryBase(country.firestore)
      .then((data) => { if (!cancelled) setBase({ status: 'ready', data }); })
      .catch((error) => {
        console.error(`${country.key} base data failed:`, error);
        if (!cancelled) setBase({ status: 'error' });
      });
    return () => { cancelled = true; };
  }, [country, signedIn]);

  const products = base.status === 'ready' ? base.data.products : null;
  const baseStatus = base.status;
  useEffect(() => {
    if (baseStatus === 'signed-out' || baseStatus === 'error') {
      setSales({ status: baseStatus });
      return;
    }
    if (!products) return;
    let cancelled = false;
    setSales({ status: 'loading' });
    loadCountrySales(country.firestore, period, products, withDaily)
      .then((data) => { if (!cancelled) setSales({ status: 'ready', data }); })
      .catch((error) => {
        console.error(`${country.key} sales data failed:`, error);
        if (!cancelled) setSales({ status: 'error' });
      });
    return () => { cancelled = true; };
  }, [country, period, products, withDaily, baseStatus]);

  return { base, sales };
}

function StatusMessage({ name, state }: { name: string; state: Loadable<unknown> }) {
  if (state.status === 'loading') return <p className="px-5 py-10 text-center text-sm text-stone-400">正在读取{name}数据…</p>;
  if (state.status === 'signed-out') return <p className="px-5 py-10 text-center text-sm text-danger">{name}系统未登录，请退出后重新登录。</p>;
  if (state.status === 'error') return <p className="px-5 py-10 text-center text-sm text-danger">{name}数据读取失败，请刷新重试。</p>;
  return null;
}

function Metric({ label, value, note, tone = 'default' }: { label: string; value: string; note?: string; tone?: 'default' | 'positive' | 'danger' | 'warning' }) {
  const toneClass = tone === 'positive' ? 'text-forest' : tone === 'danger' ? 'text-danger' : tone === 'warning' ? 'text-ochre' : 'text-stone-800';
  return (
    <div className="min-w-0 border-b border-r border-stone-200 px-5 py-4">
      <p className="metric-label">{label}</p>
      <p className={`mt-2 truncate font-serif text-xl font-semibold tabular-nums sm:text-2xl ${toneClass}`}>{value}</p>
      {note && <p className="metric-note">{note}</p>}
    </div>
  );
}

export function CountryMetrics({ country, period, base, sales, compact = false }: { country: CountryConfig; period: Period; base: CountryBase; sales: CountrySales; compact?: boolean }) {
  const periodLabel = period.mode === 'day' ? period.date.replaceAll('-', '/') : period.month.replace('-', '/');
  return (
    <div className={`-mb-px -mr-px grid grid-cols-2 ${compact ? '' : 'lg:grid-cols-4'}`}>
      <Metric label={`${periodLabel} 销售额`} value={country.formatCurrency(sales.summary.amount)} />
      <Metric label="销售箱数" value={formatBoxes(sales.summary.boxes)} />
      <Metric label="销售环比" value={formatChange(sales.change)} note={sales.changeNote} tone={sales.change !== null && sales.change < 0 ? 'danger' : 'positive'} />
      <Metric label="在途 / 到港货柜" value={`${base.cargo.inTransitCount} / ${base.cargo.arrivedCount} 柜`} note={`共 ${base.cargo.inTransitBoxes + base.cargo.arrivedBoxes} 箱`} />
      <Metric label="库存金额" value={country.formatCurrency(base.totalValue)} />
      <Metric label="库存箱数" value={formatBoxes(base.totalBoxes)} />
      <Metric label="库存预警" value={`${base.warnings.length} 款`} note="已断货或可售不足 60 天" tone={base.warnings.length > 0 ? 'danger' : 'default'} />
      <Metric label="滞销" value={`${base.stale.length} 款`} note="可售超过 180 天" tone={base.stale.length > 0 ? 'warning' : 'default'} />
    </div>
  );
}

export function CountryHeader({ country, action }: { country: CountryConfig; action?: React.ReactNode }) {
  return (
    <div className="section-panel-header">
      <div>
        <span className="eyebrow">{country.eyebrow}</span>
        <h2 className="display-title mt-1 text-2xl">{country.name}</h2>
      </div>
      {action}
    </div>
  );
}

function CompareCard({ country, period, onOpen }: { country: CountryConfig; period: Period; onOpen: () => void }) {
  const { base, sales } = useCountryData(country, period, false);
  return (
    <section className="section-panel overflow-hidden">
      <CountryHeader country={country} action={<button type="button" onClick={onOpen} className="button-secondary rounded-lg px-3 py-2 text-xs font-semibold">查看详情</button>} />
      {base.status === 'ready' && sales.status === 'ready'
        ? <CountryMetrics country={country} period={period} base={base.data} sales={sales.data} compact />
        : <StatusMessage name={country.name} state={base.status !== 'ready' ? base : sales} />}
    </section>
  );
}

export function DailySalesChart({ daily, monthKey, formatCurrency }: { daily: number[]; monthKey: string; formatCurrency: (value: number) => string }) {
  const peak = Math.max(0, ...daily);
  const today = toLocalDateInputValue(new Date());
  const defaultIndex = today.startsWith(monthKey) ? Number(today.slice(8)) - 1 : daily.length - 1;
  const [selectedIndex, setSelectedIndex] = useState(defaultIndex);
  const dateOf = (index: number) => `${monthKey}-${String(index + 1).padStart(2, '0')}`;

  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <span className="text-sm font-semibold text-stone-600">{dateOf(selectedIndex).slice(5).replace('-', '/')}</span>
        <span className="font-serif text-xl font-semibold tabular-nums text-stone-800">{formatCurrency(daily[selectedIndex] ?? 0)}</span>
      </div>
      <div className="flex h-56 items-end gap-[2px] border-b border-stone-200" role="group" aria-label="当月每日销售额">
        {daily.map((amount, index) => (
          <button
            key={dateOf(index)}
            type="button"
            onClick={() => setSelectedIndex(index)}
            aria-label={`${dateOf(index)} ${formatCurrency(amount)}`}
            aria-pressed={index === selectedIndex}
            className="flex h-full min-w-0 flex-1 items-end"
          >
            <span
              className={`block w-full rounded-t-[3px] ${index === selectedIndex ? 'bg-oxblood' : 'bg-brass'}`}
              style={{ height: amount > 0 && peak > 0 ? `${Math.max(2, (amount / peak) * 100)}%` : '0%' }}
            />
          </button>
        ))}
      </div>
      <div className="mt-1 flex gap-[2px] text-[11px] tabular-nums text-stone-400">
        {daily.map((_, index) => (
          <span key={index} className="min-w-0 flex-1 text-center">{index === 0 || (index + 1) % 5 === 0 ? index + 1 : ''}</span>
        ))}
      </div>
      <p className="mt-2 text-xs text-stone-400">点任意一天的柱子查看金额；最高单日 {formatCurrency(peak)}。</p>
    </div>
  );
}

function SalesTable({ rows, formatCurrency, emptyText, limit }: { rows: SalesSummary['rows']; formatCurrency: (value: number) => string; emptyText: string; limit?: number }) {
  const visibleRows = limit ? rows.slice(0, limit) : rows;
  return (
    <div className="data-table-shell [&_table]:!min-w-0">
      <table className="w-full text-left">
        <thead>
          <tr><th className="px-3 py-3 sm:px-5">#</th><th className="px-3 py-3 sm:px-5">款式</th><th className="px-3 py-3 sm:px-5 whitespace-nowrap text-right">箱数</th><th className="px-3 py-3 sm:px-5 whitespace-nowrap text-right">金额</th></tr>
        </thead>
        <tbody>
          {visibleRows.map((row, index) => (
            <tr key={row.productId}>
              <td className="px-3 py-3 sm:px-5 text-xs tabular-nums text-stone-400">{index + 1}</td>
              <td className="px-3 py-3 sm:px-5 text-sm font-semibold text-stone-800">{row.name}</td>
              <td className="px-3 py-3 sm:px-5 whitespace-nowrap text-right text-sm tabular-nums text-stone-600">{formatBoxes(row.boxes)}</td>
              <td className="px-3 py-3 sm:px-5 whitespace-nowrap text-right text-sm font-semibold tabular-nums text-stone-800">{formatCurrency(row.amount)}</td>
            </tr>
          ))}
          {visibleRows.length === 0 && <tr><td colSpan={4} className="px-5 py-10 text-center text-sm text-stone-400">{emptyText}</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

const formatCover = (risk: ProductRiskMetrics | null) => {
  if (!risk) return '—';
  if (risk.isOutOfStock) return '0 天';
  return Number.isFinite(risk.daysOfCover) ? `${Math.round(risk.daysOfCover)} 天` : '∞';
};

export function InventorySection({ base, formatCurrency }: { base: CountryBase; formatCurrency: (value: number) => string }) {
  const [view, setView] = useState<'warnings' | 'stale' | 'all'>('warnings');
  const [searchTerm, setSearchTerm] = useState('');
  const keyword = searchTerm.replace(/\s+/g, '').toUpperCase();
  const allRows = keyword ? base.inventory.filter((row) => row.name.replace(/\s+/g, '').toUpperCase().includes(keyword)) : base.inventory;

  return (
    <section className="section-panel overflow-hidden">
      <div className="section-panel-header flex-wrap">
        <div>
          <span className="eyebrow">INVENTORY</span>
          <h3 className="display-title mt-1 text-xl">库存情况</h3>
        </div>
        <div className="segmented-control flex">
          {([['warnings', `预警 ${base.warnings.length}`], ['stale', `滞销 ${base.stale.length}`], ['all', `全部 ${base.inventory.length}`]] as const).map(([value, label]) => (
            <button key={value} type="button" onClick={() => setView(value)} className={`segmented-control-item px-3 py-2 text-xs font-semibold ${view === value ? 'segmented-control-item-active' : ''}`}>{label}</button>
          ))}
        </div>
      </div>

      {view === 'all' && (
        <div className="border-b border-stone-200 px-5 py-3">
          <div className="relative max-w-xs">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input type="search" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="搜索产品型号" aria-label="搜索库存款式" className="h-10 w-full rounded-xl border border-stone-200 bg-white pl-9 pr-9 text-sm font-semibold text-stone-700 outline-none focus:border-brass" />
            {searchTerm && <button type="button" onClick={() => setSearchTerm('')} aria-label="清空搜索" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-stone-400 hover:text-stone-700"><X size={14} /></button>}
          </div>
        </div>
      )}

      <div className="data-table-shell max-h-[520px] overflow-y-auto [&_table]:!min-w-0">
        <table className="w-full text-left">
          <thead>
            {view === 'warnings' && <tr><th className="px-3 py-3 sm:px-5">款式</th><th className="px-3 py-3 sm:px-5 whitespace-nowrap text-right">库存</th><th className="hidden px-3 py-3 sm:px-5 whitespace-nowrap text-right sm:table-cell">近30天周均</th><th className="px-3 py-3 sm:px-5 whitespace-nowrap text-right">可售天数</th><th className="px-3 py-3 sm:px-5">原因</th></tr>}
            {view === 'stale' && <tr><th className="px-3 py-3 sm:px-5">款式</th><th className="px-3 py-3 sm:px-5 whitespace-nowrap text-right">库存</th><th className="px-3 py-3 sm:px-5 whitespace-nowrap text-right">压货金额</th><th className="hidden px-3 py-3 sm:px-5 whitespace-nowrap text-right sm:table-cell">最近销售</th><th className="px-3 py-3 sm:px-5">原因</th></tr>}
            {view === 'all' && <tr><th className="px-3 py-3 sm:px-5">款式</th><th className="hidden px-3 py-3 sm:px-5 whitespace-nowrap text-right sm:table-cell">规格</th><th className="px-3 py-3 sm:px-5 whitespace-nowrap text-right">库存</th><th className="hidden px-3 py-3 sm:px-5 whitespace-nowrap text-right sm:table-cell">单价</th><th className="px-3 py-3 sm:px-5 whitespace-nowrap text-right">库存金额</th><th className="px-3 py-3 sm:px-5">状态</th></tr>}
          </thead>
          <tbody>
            {view === 'warnings' && base.warnings.map((row) => (
              <tr key={row.productId}>
                <td className="px-3 py-3 sm:px-5 text-sm font-semibold text-stone-800">{row.name}</td>
                <td className="px-3 py-3 sm:px-5 whitespace-nowrap text-right text-sm tabular-nums">{formatBoxes(row.stockBoxes)}</td>
                <td className="hidden px-3 py-3 sm:px-5 whitespace-nowrap text-right text-sm tabular-nums text-stone-600 sm:table-cell">{formatBoxes((row.risk?.avgDailyBoxes30d ?? 0) * 7)}</td>
                <td className="px-3 py-3 sm:px-5 whitespace-nowrap text-right text-sm tabular-nums text-stone-600">{formatCover(row.risk)}</td>
                <td className="px-3 py-3 sm:px-5 text-xs font-semibold text-danger">{row.risk?.warningReasons.join(' / ')}</td>
              </tr>
            ))}
            {view === 'stale' && base.stale.map((row) => (
              <tr key={row.productId}>
                <td className="px-3 py-3 sm:px-5 text-sm font-semibold text-stone-800">{row.name}</td>
                <td className="px-3 py-3 sm:px-5 whitespace-nowrap text-right text-sm tabular-nums">{formatBoxes(row.stockBoxes)}</td>
                <td className="px-3 py-3 sm:px-5 whitespace-nowrap text-right text-sm font-semibold tabular-nums">{formatCurrency(row.stockValue)}</td>
                <td className="hidden px-3 py-3 sm:px-5 whitespace-nowrap text-right text-sm tabular-nums text-stone-600 sm:table-cell">{row.risk && row.risk.daysSinceLastSale !== null ? `${row.risk.daysSinceLastSale} 天前` : '从未销售'}</td>
                <td className="px-3 py-3 sm:px-5 text-xs font-semibold text-ochre">{row.risk?.staleReasons.join(' / ')}</td>
              </tr>
            ))}
            {view === 'all' && allRows.map((row) => (
              <tr key={row.productId}>
                <td className="px-3 py-3 sm:px-5 text-sm font-semibold text-stone-800">{row.name}</td>
                <td className="hidden px-3 py-3 sm:px-5 whitespace-nowrap text-right text-sm tabular-nums text-stone-600 sm:table-cell">{row.spec} 个/箱</td>
                <td className="px-3 py-3 sm:px-5 whitespace-nowrap text-right text-sm tabular-nums">{formatBoxes(row.stockBoxes)}</td>
                <td className="hidden px-3 py-3 sm:px-5 whitespace-nowrap text-right text-sm tabular-nums text-stone-600 sm:table-cell">{formatCurrency(row.price)}</td>
                <td className="px-3 py-3 sm:px-5 whitespace-nowrap text-right text-sm tabular-nums">{formatCurrency(row.stockValue)}</td>
                <td className="px-3 py-3 sm:px-5 text-xs font-semibold">
                  {!row.isActive ? <span className="text-stone-400">已下架</span>
                    : row.risk?.isWarning ? <span className="text-danger">{row.risk.warningReasons[0]}</span>
                    : row.risk?.isStale ? <span className="text-ochre">滞销</span>
                    : <span className="text-forest">正常</span>}
                </td>
              </tr>
            ))}
            {view === 'warnings' && base.warnings.length === 0 && <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-stone-400">暂无预警款式</td></tr>}
            {view === 'stale' && base.stale.length === 0 && <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-stone-400">暂无滞销款式</td></tr>}
            {view === 'all' && allRows.length === 0 && <tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-stone-400">未找到匹配款式</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function CargoSection({ base }: { base: CountryBase }) {
  return (
    <section className="section-panel overflow-hidden">
      <div className="section-panel-header flex-wrap">
        <div>
          <span className="eyebrow">CONTAINERS</span>
          <h3 className="display-title mt-1 text-xl">在途与到港货柜</h3>
        </div>
        <p className="text-xs text-stone-500">在途 {base.cargo.inTransitCount} 柜 · {base.cargo.inTransitBoxes} 箱　到港 {base.cargo.arrivedCount} 柜 · {base.cargo.arrivedBoxes} 箱</p>
      </div>
      <div className="data-table-shell [&_table]:!min-w-0">
        <table className="w-full text-left">
          <thead><tr><th className="px-3 py-3 sm:px-5">货柜号</th><th className="px-3 py-3 sm:px-5">状态</th><th className="px-3 py-3 sm:px-5">预计到港</th><th className="px-3 py-3 sm:px-5 whitespace-nowrap text-right">箱数</th></tr></thead>
          <tbody>
            {base.cargoRows.map((row) => (
              <tr key={row.id}>
                <td className="px-3 py-3 sm:px-5 text-sm font-semibold text-stone-800">{row.containerNumber}</td>
                <td className="px-3 py-3 sm:px-5 text-xs font-semibold"><span className={row.status === '到港' ? 'text-forest' : 'text-brass'}>{row.status}</span></td>
                <td className="px-3 py-3 sm:px-5 text-sm tabular-nums text-stone-600">{row.arrivalDate ?? '待定'}</td>
                <td className="px-3 py-3 sm:px-5 whitespace-nowrap text-right text-sm tabular-nums">{row.cargoBoxes} 箱</td>
              </tr>
            ))}
            {base.cargoRows.length === 0 && <tr><td colSpan={4} className="px-5 py-10 text-center text-sm text-stone-400">暂无在途或到港货柜</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function CountryDetail({ country, period, base, sales }: { country: CountryConfig; period: Period; base: CountryBase; sales: CountrySales }) {
  return (
    <div className="space-y-6">
      <section className="section-panel overflow-hidden">
        <CountryHeader country={country} />
        <CountryMetrics country={country} period={period} base={base} sales={sales} />
      </section>

      <div className={`grid grid-cols-1 gap-6 ${period.mode === 'month' ? 'xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]' : ''}`}>
        <section className="section-panel overflow-hidden">
          <div className="section-panel-header">
            <div>
              <span className="eyebrow">SALES</span>
              <h3 className="display-title mt-1 text-xl">{period.mode === 'month' ? `${period.month.replace('-', '/')} 每日销售` : `${period.date.replaceAll('-', '/')} 各款销售`}</h3>
            </div>
          </div>
          {period.mode === 'month' && sales.daily
            ? <div className="px-5 py-5"><DailySalesChart key={period.month} daily={sales.daily} monthKey={period.month} formatCurrency={country.formatCurrency} /></div>
            : <SalesTable rows={sales.summary.rows} formatCurrency={country.formatCurrency} emptyText="当天暂无销售" />}
        </section>
        {period.mode === 'month' && (
          <section className="section-panel overflow-hidden">
            <div className="section-panel-header">
              <div>
                <span className="eyebrow">TOP 10</span>
                <h3 className="display-title mt-1 text-xl">热销前 10</h3>
              </div>
            </div>
            <SalesTable rows={sales.summary.rows} formatCurrency={country.formatCurrency} emptyText="该月暂无销售" limit={10} />
          </section>
        )}
      </div>

      <InventorySection base={base} formatCurrency={country.formatCurrency} />
      <CargoSection base={base} />
    </div>
  );
}

function CountryPage({ country, period }: { country: CountryConfig; period: Period }) {
  const { base, sales } = useCountryData(country, period, true);
  if (base.status !== 'ready' || sales.status !== 'ready') {
    return <section className="section-panel"><StatusMessage name={country.name} state={base.status !== 'ready' ? base : sales} /></section>;
  }
  return <CountryDetail country={country} period={period} base={base.data} sales={sales.data} />;
}

export function GroupOverviewHeader({ tab, mode, onModeChange, date, onDateChange, month, onMonthChange }: {
  tab: GroupTab;
  mode: PeriodMode;
  onModeChange: (mode: PeriodMode) => void;
  date: string;
  onDateChange: (value: string) => void;
  month: string;
  onMonthChange: (value: string) => void;
}) {
  const today = toLocalDateInputValue(new Date());
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <span className="eyebrow">GROUP OVERVIEW</span>
        <h1 className="display-title mt-1 text-3xl">{tab === 'compare' ? '两国对比' : COUNTRIES[tab].name}</h1>
        <p className="mt-1 text-sm text-stone-500">只读查看销售、库存和货柜{tab === 'compare' ? '；两国货币不同，不做合计' : ''}。</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="segmented-control flex shrink-0">
          {([['day', '按日'], ['month', '按月']] as const).map(([value, label]) => (
            <button key={value} type="button" onClick={() => onModeChange(value)} className={`segmented-control-item px-4 py-2 text-sm font-semibold ${mode === value ? 'segmented-control-item-active' : ''}`}>{label}</button>
          ))}
        </div>
        {mode === 'day'
          ? <PickerChip type="date" value={date} max={today} onChange={onDateChange} displayValue={date.replaceAll('-', '/')} ariaLabel="选择日期" />
          : <PickerChip type="month" value={month} max={today.slice(0, 7)} onChange={onMonthChange} displayValue={month.replace('-', '/')} ariaLabel="选择月份" />}
      </div>
    </div>
  );
}

export function GroupOverviewView({ tab, onOpenCountry }: { tab: GroupTab; onOpenCountry: (country: CountryKey) => void }) {
  const today = toLocalDateInputValue(new Date());
  const [mode, setMode] = useState<PeriodMode>('day');
  const [date, setDate] = useState(today);
  const [month, setMonth] = useState(today.slice(0, 7));
  const period = useMemo<Period>(() => ({ mode, date, month }), [mode, date, month]);

  return (
    <div className="space-y-6">
      <GroupOverviewHeader tab={tab} mode={mode} onModeChange={setMode} date={date} onDateChange={setDate} month={month} onMonthChange={setMonth} />
      {tab === 'compare'
        ? (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <CompareCard country={COUNTRIES.togo} period={period} onOpen={() => onOpenCountry('togo')} />
            <CompareCard country={COUNTRIES.nigeria} period={period} onOpen={() => onOpenCountry('nigeria')} />
          </div>
        )
        : <CountryPage key={tab} country={COUNTRIES[tab]} period={period} />}
    </div>
  );
}
