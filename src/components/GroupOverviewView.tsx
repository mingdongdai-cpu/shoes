import { useEffect, useState } from 'react';
import { onAuthStateChanged, type Auth } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, query, Timestamp, where, type Firestore } from 'firebase/firestore';
import { auth, db, nigeriaAuth, nigeriaDb } from '../firebase';
import { calculateCashCountTotal, calculateCurrentInventoryTotal, calculateOutstandingDebtTotal } from '../lib/homeOverview';
import { buildTopProducts, calculateSalesMoM, getPreviousMonthKey, type CountryMonthSummary, type TopProduct } from '../lib/groupOverview';
import { getPreviousMonthToDateRange, toLocalDateInputValue } from '../lib/timeWindow';
import { PickerChip } from './Views';

export interface CountryOverview {
  cashBalance: number;
  salesTotal: number;
  inventoryTotal: number;
  debtTotal: number;
  monthSales: number;
  monthExpenses: number;
  salesMoM: number | null;
  compareDays: { current: number; previous: number } | null;
  topProducts: TopProduct[];
}

interface CountryConfig {
  key: string;
  name: string;
  eyebrow: string;
  firestore: Firestore;
  firebaseAuth: Auth;
  formatCurrency: (value: number) => string;
}

const countries: CountryConfig[] = [
  {
    key: 'togo',
    name: '多哥',
    eyebrow: 'TOGO · XOF',
    firestore: db,
    firebaseAuth: auth,
    formatCurrency: (value) => `${new Intl.NumberFormat('zh-CN').format(value)} XOF`
  },
  {
    key: 'nigeria',
    name: '尼日利亚',
    eyebrow: 'NIGERIA · NGN',
    firestore: nigeriaDb,
    firebaseAuth: nigeriaAuth,
    formatCurrency: (value) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(value)
  }
];

const toNumber = (value: unknown) => Number(value ?? 0);

const toMonthSummary = (data: Record<string, unknown> | undefined): CountryMonthSummary | null => data ? {
  outAmount: toNumber(data.outAmount),
  expenseAmount: toNumber(data.expenseAmount),
  outByProduct: (data.outByProduct ?? {}) as CountryMonthSummary['outByProduct']
} : null;

async function loadCountryOverview(firestore: Firestore, monthKey: string): Promise<CountryOverview> {
  const now = new Date();
  const isCurrentMonth = monthKey === toLocalDateInputValue(now).slice(0, 7);
  const [productsSnap, overviewSnap, monthSnap, previousMonthSnap, debtsSnap, debtOrdersSnap, cashBalanceSnap] = await Promise.all([
    getDocs(collection(firestore, 'products')),
    getDoc(doc(firestore, 'analytics', 'overview')),
    getDoc(doc(firestore, 'analyticsMonths', monthKey)),
    getDoc(doc(firestore, 'analyticsMonths', getPreviousMonthKey(monthKey))),
    getDocs(collection(firestore, 'debts')),
    getDocs(query(collection(firestore, 'customerOrders'), where('hasDebtHistory', '==', true))),
    getDoc(doc(firestore, 'cashBalances', 'current'))
  ]);

  const products = productsSnap.docs.map((item) => ({
    id: item.id,
    name: String(item.data().name ?? ''),
    spec: toNumber(item.data().spec),
    stock: toNumber(item.data().stock),
    price: toNumber(item.data().price)
  }));
  const month = toMonthSummary(monthSnap.data());
  const previousMonth = toMonthSummary(previousMonthSnap.data());

  const cashBalance = cashBalanceSnap.exists()
    ? toNumber(cashBalanceSnap.data().amount)
    : calculateCashCountTotal((await getDocs(collection(firestore, 'orderCashCounts'))).docs.map((item) => ({ totalAmount: toNumber(item.data().totalAmount) })));

  let previousSales = previousMonth?.outAmount ?? 0;
  let compareDays: CountryOverview['compareDays'] = null;
  if (isCurrentMonth) {
    const range = getPreviousMonthToDateRange(now);
    const previousTransactions = await getDocs(query(
      collection(firestore, 'transactions'),
      where('occurredAt', '>=', Timestamp.fromDate(range.start)),
      where('occurredAt', '<=', Timestamp.fromDate(range.end))
    ));
    previousSales = previousTransactions.docs
      .map((item) => item.data())
      .filter((data) => data.type === 'out')
      .reduce((total, data) => total + toNumber(data.quantity) * toNumber(data.unitPrice), 0);
    compareDays = { current: now.getDate(), previous: range.end.getDate() };
  }

  const monthSales = month?.outAmount ?? 0;
  return {
    cashBalance,
    salesTotal: toNumber(overviewSnap.data()?.outTotal),
    inventoryTotal: calculateCurrentInventoryTotal(products),
    debtTotal: calculateOutstandingDebtTotal(
      debtsSnap.docs.map((item) => ({ amount: toNumber(item.data().amount), paidAmount: toNumber(item.data().paidAmount) })),
      debtOrdersSnap.docs.map((item) => ({ totalAmount: toNumber(item.data().totalAmount), paidAmount: toNumber(item.data().paidAmount) }))
    ),
    monthSales,
    monthExpenses: month?.expenseAmount ?? 0,
    salesMoM: calculateSalesMoM(monthSales, previousSales),
    compareDays,
    topProducts: buildTopProducts(month, new Map(products.map((product) => [product.id, product])), 5)
  };
}

export type CountryState =
  | { status: 'loading' }
  | { status: 'signed-out' }
  | { status: 'error' }
  | { status: 'ready'; data: CountryOverview };

function CountryPanel({ country, monthKey }: { country: CountryConfig; monthKey: string }) {
  const [state, setState] = useState<CountryState>({ status: 'loading' });
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => onAuthStateChanged(country.firebaseAuth, (firebaseUser) => setSignedIn(Boolean(firebaseUser))), [country.firebaseAuth]);

  useEffect(() => {
    if (signedIn === null) return;
    if (!signedIn) {
      setState({ status: 'signed-out' });
      return;
    }
    let cancelled = false;
    setState({ status: 'loading' });
    loadCountryOverview(country.firestore, monthKey)
      .then((data) => { if (!cancelled) setState({ status: 'ready', data }); })
      .catch((error) => {
        console.error(`${country.key} overview failed:`, error);
        if (!cancelled) setState({ status: 'error' });
      });
    return () => { cancelled = true; };
  }, [country, monthKey, signedIn]);

  return <CountryOverviewCard name={country.name} eyebrow={country.eyebrow} formatCurrency={country.formatCurrency} monthKey={monthKey} state={state} />;
}

export function CountryOverviewCard({ name, eyebrow, formatCurrency, monthKey, state }: {
  name: string;
  eyebrow: string;
  formatCurrency: (value: number) => string;
  monthKey: string;
  state: CountryState;
}) {
  const monthLabel = monthKey.replace('-', '/');
  const formatMoM = (value: number | null) => value === null ? '无上月数据' : `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;

  return (
    <section className="section-panel overflow-hidden">
      <div className="section-panel-header">
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h2 className="display-title mt-1 text-2xl">{name}</h2>
        </div>
      </div>

      {state.status === 'loading' && <p className="px-5 py-12 text-center text-sm text-stone-400">正在读取{name}数据…</p>}
      {state.status === 'signed-out' && <p className="px-5 py-12 text-center text-sm text-danger">{name}系统未登录，请退出后重新登录。</p>}
      {state.status === 'error' && <p className="px-5 py-12 text-center text-sm text-danger">{name}数据读取失败，请刷新重试。</p>}
      {state.status === 'ready' && (
        <>
          <div className="grid grid-cols-2 border-b border-stone-200">
            {[
              ['现金盘点总和', state.data.cashBalance, '当前现金余额'],
              ['出库销售总额', state.data.salesTotal, '累计销售金额'],
              ['结余库存金额', state.data.inventoryTotal, '当前库存数量 × 商品单价'],
              ['欠款总额', state.data.debtTotal, '当前未结清欠款合计'],
              [`${monthLabel} 销售额`, state.data.monthSales, '所选月份出库金额'],
              [`${monthLabel} 开支`, state.data.monthExpenses, '所选月份支出金额']
            ].map(([label, value, note], index) => (
              <div key={label as string} className={`px-5 py-4 ${index % 2 === 0 ? 'border-r border-stone-200' : ''} ${index >= 2 ? 'border-t border-stone-200' : ''}`}>
                <p className="metric-label">{label}</p>
                <p className={`mt-2 font-serif text-xl font-semibold tabular-nums sm:text-2xl ${label === '欠款总额' ? 'text-danger' : 'text-stone-800'}`}>{formatCurrency(value as number)}</p>
                <p className="metric-note">{note}</p>
              </div>
            ))}
            <div className="col-span-2 border-t border-stone-200 px-5 py-4">
              <p className="metric-label">销售额环比</p>
              <p className={`mt-2 font-serif text-xl font-semibold sm:text-2xl ${state.data.salesMoM !== null && state.data.salesMoM < 0 ? 'text-danger' : 'text-forest'}`}>{formatMoM(state.data.salesMoM)}</p>
              <p className="metric-note">
                {state.data.compareDays
                  ? `${monthLabel}/01–${String(state.data.compareDays.current).padStart(2, '0')} 对比 ${getPreviousMonthKey(monthKey).replace('-', '/')}/01–${String(state.data.compareDays.previous).padStart(2, '0')}`
                  : `${monthLabel} 对比 ${getPreviousMonthKey(monthKey).replace('-', '/')}`}
              </p>
            </div>
          </div>
          <div className="px-5 py-4">
            <p className="metric-label">{monthLabel} 热销前 5（按金额）</p>
            <ol className="mt-3 space-y-2">
              {state.data.topProducts.map((product, index) => (
                <li key={product.productId} className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-baseline gap-3 text-sm">
                  <span className="text-xs font-bold tabular-nums text-stone-400">#{index + 1}</span>
                  <span className="truncate font-semibold text-stone-800">{product.name}<span className="ml-2 text-xs font-normal text-stone-400">{Math.round(product.boxes * 100) / 100} 箱</span></span>
                  <span className="font-semibold tabular-nums text-stone-800">{formatCurrency(product.amount)}</span>
                </li>
              ))}
              {state.data.topProducts.length === 0 && <li className="py-3 text-sm text-stone-400">该月暂无销售</li>}
            </ol>
          </div>
        </>
      )}
    </section>
  );
}

export function GroupOverviewView() {
  const [monthKey, setMonthKey] = useState(() => toLocalDateInputValue(new Date()).slice(0, 7));

  return (
    <div className="space-y-6">
      <div className="page-heading-row">
        <div>
          <span className="eyebrow">GROUP OVERVIEW</span>
          <h1 className="display-title mt-1 text-3xl">两国总览</h1>
          <p className="mt-1 text-sm text-stone-500">多哥与尼日利亚经营数据并排对照，只读；两国货币不同，不做合计。</p>
        </div>
        <PickerChip type="month" value={monthKey} onChange={setMonthKey} displayValue={monthKey.replace('-', '/')} ariaLabel="选择月份" />
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {countries.map((country) => <CountryPanel key={country.key} country={country} monthKey={monthKey} />)}
      </div>
    </div>
  );
}
