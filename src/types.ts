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
  price: number; // Price at time of transaction
  date: string;
  remark: string;
}

export interface User {
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

export type View = 'home' | 'stock' | 'products' | 'gps';

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error';
}
