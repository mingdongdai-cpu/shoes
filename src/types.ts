import type { Timestamp } from 'firebase/firestore';

export interface Product {
  id: string;
  name: string;
  spec: number; // Items per box
  price: number; // Price per item
  stock: number; // Total items
  isActive: boolean; // Whether product is on shelf
  createdAt?: Timestamp;
  lastOutAt?: Timestamp | null;
}

export interface AnalyticsOverview {
  inTotal: number;
  outTotal: number;
  balance: number;
  transactionCount: number;
  expenseCount: number;
}

export interface AnalyticsMonth {
  monthKey: string;
  year: number;
  month: number;
  inAmount: number;
  outAmount: number;
  expenseAmount: number;
  outByProduct: Record<string, { quantity: number; amount: number }>;
}

export interface OrderProduct {
  id: string;
  name: string;
  spec: number;
  price: number;
}

export interface CustomerOrderItem {
  productId: string;
  productName: string;
  spec: number;
  unitPrice: number;
  boxes: number;
  quantity: number;
  subtotal: number;
}

export interface CustomerOrder {
  id: string;
  customerName: string;
  orderDate: string;
  isUnpaid: boolean;
  paidAmount: number;
  hasDebtHistory: boolean;
  items: CustomerOrderItem[];
  totalAmount: number;
  operatorUid: string;
  createdAt: Timestamp;
  settledAt?: Timestamp | null;
  inventorySyncId?: string;
}

export interface CustomerOrderSyncLine {
  transactionId: string;
  productId: string;
  productName: string;
  quantity: number;
  amount: number;
  unitPrice: number;
}

export interface CustomerOrderSync {
  id: string;
  orderDate: string;
  orderIds: string[];
  transactionIds: string[];
  lines: CustomerOrderSyncLine[];
  operatorUid: string;
  createdAt: Timestamp;
}

export type CashDenomination = 10000 | 5000 | 2000 | 1000 | 500 | 200 | 100 | 50;
export type CashDenominationKey = `${CashDenomination}`;
export type CashDenominationCounts = Record<CashDenominationKey, number>;

export interface OrderCashCount {
  id: string;
  recordDate: string;
  counts: CashDenominationCounts;
  totalAmount: number;
  operatorUid: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CashBalance {
  id: string;
  amount: number;
  cycleId: string;
  operatorUid: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastRemittedAt: Timestamp;
}

export interface OrderDailyExpense {
  id: string;
  expenseDate: string;
  amount: number;
  remark: string;
  operatorUid: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Transaction {
  id: string;
  productId: string;
  type: 'in' | 'out';
  quantity: number; // Total items
  unitPrice: number; // Price at time of transaction
  occurredAt: Timestamp;
  operatorUid: string;
  remark: string;
  sourceOrderSyncId?: string;
}

export interface User {
  uid: string;
  username: string;
  role: 'admin' | 'staff' | 'order';
}

export interface Expense {
  id: string;
  occurredAt: Timestamp;
  operatorUid: string;
  amount: number;
  category: string;
  remark: string;
}

export interface Debt {
  id: string;
  customerName: string;
  amount: number;
  paidAmount: number;
  occurredAt: Timestamp;
  settledAt?: Timestamp | null;
  operatorUid: string;
}

export type View =
  | 'home'
  | 'dashboard'
  | 'inventory-warnings'
  | 'inventory-stale'
  | 'inventory-stock'
  | 'inventory-comparison'
  | 'stock'
  | 'order-entry'
  | 'order-accounting'
  | 'order-debts'
  | 'customer-orders'
  | 'products'
  | 'expenses'
  | 'debts';

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error';
}

export interface ProductRiskMetrics {
  productId: string;
  stockBoxes: number;
  avgDailyBoxes30d: number;
  daysOfCover: number;
  lastSaleAt: Date | null;
  daysSinceLastSale: number | null;
  isWarning: boolean;
  isStale: boolean;
  warningReasons: string[];
}

export interface SalesPeriodColumn {
  key: string;
  label: string;
}

export interface ProductSalesByPeriod {
  productId: string;
  name: string;
  boxesByPeriod: number[];
}

export interface SalesPeriodData {
  title: string;
  columns: SalesPeriodColumn[];
  rows: ProductSalesByPeriod[];
}

export interface MonthlySalesSeriesItem {
  monthKey: string;
  monthLabel: string;
  salesTotal: number;
}

export interface MonthlyMoMSeriesItem {
  monthKey: string;
  salesMoM: number | null;
}

export interface HotProductItem {
  productId: string;
  productName: string;
  value: number;
  share: number;
  quantity: number;
  boxes: number;
  spec: number;
}

export interface DashboardMetrics {
  selectedYear: number;
  selectedMonthKey: string;
  hotMonthKey: string;
  monthlySalesSeries: MonthlySalesSeriesItem[];
  monthlyMomSeries: MonthlyMoMSeriesItem[];
  currentMonthSalesTotal: number;
  currentMonthSalesMoM: number | null;
  hotByAmount: HotProductItem[];
  hotByVolume: HotProductItem[];
}
