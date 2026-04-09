import type { Timestamp } from 'firebase/firestore';

export interface Product {
  id: string;
  name: string;
  spec: number; // Items per box
  price: number; // Price per item
  stock: number; // Total items
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
  role: 'admin' | 'staff';
}

export interface Vehicle {
  id: string;
  name: string;
  lastUpdate: string;
  location: string;
  status: 'moving' | 'stopped' | 'offline';
  lat: number;
  lng: number;
}

export interface Expense {
  id: string;
  occurredAt: Timestamp;
  operatorUid: string;
  amount: number;
  category: string;
  remark: string;
}

export type View = 'home' | 'stock' | 'products' | 'gps' | 'expenses';

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
