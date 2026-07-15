import type { Timestamp } from 'firebase/firestore';

export interface Product {
  id: string;
  name: string;
  spec: number; // Items per box
  price: number; // Price per item
  stock: number; // Total items
  isActive: boolean; // Whether product is on shelf
  createdAt?: Timestamp;
}

export interface OrderProduct {
  id: string;
  name: string;
  spec: number;
  price: number;
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

export type View =
  | 'home'
  | 'dashboard'
  | 'inventory-warnings'
  | 'inventory-stale'
  | 'inventory-stock'
  | 'inventory-comparison'
  | 'stock'
  | 'order-entry'
  | 'products'
  | 'expenses';

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
