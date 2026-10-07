import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, ChevronDown, ChevronUp, ClipboardList, HandCoins, LockKeyhole, Package, Pencil, Plus, RefreshCw, RotateCcw, Save, Search, Trash2, X } from 'lucide-react';
import type { CustomerOrder, CustomerOrderItem, CustomerOrderSync, DebtPayment, DebtPaymentTarget, OrderProduct } from '../types';
import { buildCustomerOrderTotals, filterCustomerOrdersByDate, getCustomerOrderBalance, getCustomerOrderOutstanding, getCustomerOrderPaymentStatus, getTogoOrderDate, isCustomerOrderDebt } from '../lib/customerOrders';
import { DebtPaymentDialog, DebtPaymentHistory } from './DebtPayments';
import type { OrderLanguage } from '../lib/orderLanguage';

interface OrderPriceListViewProps {
  products: OrderProduct[];
  formatCurrency: (value: number) => string;
  language?: OrderLanguage;
}

export function OrderPriceListView({ products, formatCurrency, language = 'fr' }: OrderPriceListViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const copy = {
    fr: { eyebrow: 'CATALOGUE', title: 'Liste des prix', subtitle: 'Les prix sont synchronisés en temps réel avec la gestion des produits.', active: 'produits actifs', card: 'Tarifs produits', cardSubtitle: 'Prix unitaire et prix par carton', search: 'Rechercher un modèle...', model: 'Modèle', spec: 'Paires/carton', unit: 'Prix unitaire', carton: 'Prix carton', empty: 'Aucun produit trouvé' },
    zh: { eyebrow: '商品目录', title: '价格表', subtitle: '价格与商品管理实时同步。', active: '个在售商品', card: '商品价格', cardSubtitle: '单价与箱价', search: '搜索商品型号...', model: '型号', spec: '每箱双数', unit: '单价', carton: '箱价', empty: '未找到商品' },
    en: { eyebrow: 'CATALOG', title: 'Price list', subtitle: 'Prices update in real time from product management.', active: 'active products', card: 'Product prices', cardSubtitle: 'Unit and carton prices', search: 'Search models...', model: 'Model', spec: 'Pairs/carton', unit: 'Unit price', carton: 'Carton price', empty: 'No products found' },
  }[language];
  const visibleProducts = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    return [...products]
      .filter((product) => !keyword || product.name.toLowerCase().includes(keyword))
      .sort((first, second) => first.name.localeCompare(second.name, 'en', { sensitivity: 'base' }));
  }, [products, searchTerm]);

  return (
    <div className="space-y-6">
      <header className="page-heading-row">
        <div>
          <span className="eyebrow">{copy.eyebrow}</span>
          <h1 className="display-title mt-2 text-3xl sm:text-4xl">{copy.title}</h1>
          <p className="mt-2 text-sm text-stone-500">{copy.subtitle}</p>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-stone-600">
          {products.length} {copy.active}
        </div>
      </header>

      <section className="section-panel overflow-hidden">
        <div className="section-panel-header">
          <div className="flex items-center gap-3">
            <span className="rounded-lg bg-amber-50 p-2 text-amber-700"><Package size={20} /></span>
            <div>
              <h2 className="text-lg font-bold text-stone-900">{copy.card}</h2>
              <p className="text-xs text-stone-500">{copy.cardSubtitle}</p>
            </div>
          </div>
          <label className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={17} />
            <input type="search" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder={copy.search} className="w-full rounded-lg border-stone-200 bg-white py-2.5 pl-10 pr-3 text-sm font-semibold focus:border-amber-500 focus:ring-amber-500" />
          </label>
        </div>

        <div className="data-table-shell">
          <table className="w-full text-left">
            <thead className="bg-stone-50/80">
              <tr>
                <th className="px-4 py-3">{copy.model}</th>
                <th className="px-4 py-3 text-center">{copy.spec}</th>
                <th className="px-4 py-3 text-right">{copy.unit}</th>
                <th className="px-4 py-3 text-right">{copy.carton}</th>
              </tr>
            </thead>
            <tbody>
              {visibleProducts.map((product) => (
                <tr key={product.id} className="odd:bg-white even:bg-stone-50/45 hover:bg-amber-50/35">
                  <td className="px-4 py-4 font-bold text-stone-900">{product.name}</td>
                  <td className="px-4 py-4 text-center font-semibold tabular-nums text-stone-600">{product.spec}</td>
                  <td className="px-4 py-4 text-right font-semibold tabular-nums text-stone-600">{formatCurrency(product.price)}</td>
                  <td className="px-4 py-4 text-right font-bold tabular-nums text-[#7c3037]">{formatCurrency(product.price * product.spec)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {visibleProducts.length === 0 && <div className="px-5 py-16 text-center text-sm font-semibold text-stone-400">{copy.empty}</div>}
        </div>
      </section>
    </div>
  );
}

interface CustomerOrderEditLine {
  key: number;
  productId: string;
  boxes: string;
  snapshot: OrderProduct;
}

interface CustomerOrderEditorState {
  order: CustomerOrder;
  customerName: string;
  isUnpaid: boolean;
  paidAmount: string;
  lines: CustomerOrderEditLine[];
}

export interface CustomerOrdersPanelProps {
  orders: CustomerOrder[];
  products: OrderProduct[];
  formatCurrency: (value: number) => string;
  updateCustomerOrder: (orderId: string, customerName: string, items: CustomerOrderItem[], isUnpaid: boolean, paidAmount: number) => Promise<boolean>;
  deleteCustomerOrder: (orderId: string) => Promise<boolean>;
  language?: OrderLanguage;
  embedded?: boolean;
  searchTerm?: string;
  onSelectedDateChange?: (value: string) => void;
}

export function CustomerOrdersPanel({ orders, products, formatCurrency, updateCustomerOrder, deleteCustomerOrder, language = 'zh', embedded = false, searchTerm = '', onSelectedDateChange }: CustomerOrdersPanelProps) {
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [editor, setEditor] = useState<CustomerOrderEditorState | null>(null);
  const [editorError, setEditorError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [orderPendingDeletion, setOrderPendingDeletion] = useState<CustomerOrder | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [today, setToday] = useState(() => getTogoOrderDate());
  const [selectedDate, setSelectedDate] = useState(() => getTogoOrderDate());
  const copy = {
    fr: {
        title: 'Commandes clients', subtitle: 'Enregistrées en temps réel', emptyTitle: 'Aucune commande enregistrée',
        emptyBody: 'Aucune commande pour cette date.', products: 'produits', boxes: 'cartons', edit: 'Modifier',
        editTitle: 'Modifier la commande', customer: 'Client', date: 'Date', product: 'Produit', addLine: 'Ajouter un produit',
        remove: 'Retirer', cancel: 'Annuler', save: 'Enregistrer les modifications', saving: 'Enregistrement...',
        unpaid: 'Non payée', unpaidOrder: 'Commande non payée', paidAmount: 'Montant payé', paidHint: 'Laisser vide = paiement intégral',
        underpaid: 'Manque', overpaid: 'Trop-perçu',
        todayTotal: 'Total du jour', selectedDateTotal: 'Total de la date', dateFilter: 'Filtrer par date', deleteOrder: 'Supprimer la commande', deleteTitle: 'Supprimer cette commande ?',
        deleteBody: 'Cette action est définitive. La commande ne pourra pas être récupérée.', confirmDelete: 'Supprimer', deleting: 'Suppression...',
        customerError: 'Saisissez un nom de client valide.', lineError: 'Ajoutez au moins un produit.', productError: 'Sélectionnez un produit pour chaque ligne.', paymentError: 'Saisissez un montant payé valide.', boxesError: 'Saisissez un nombre entier de cartons supérieur à 0.', synced: 'Synchronisée', carton: 'carton', debtManaged: 'Géré dans les dettes', debtNotice: 'Le montant déjà payé est géré par les encaissements dans la gestion des dettes.'
      },
    zh: {
        title: '客户订单', subtitle: '订单实时同步显示', emptyTitle: '该日期暂无客户订单', emptyBody: '请选择其他日期查看历史订单。',
        products: '个商品', boxes: '箱', edit: '编辑', editTitle: '编辑客户订单', customer: '客户名称', date: '日期', product: '商品',
        addLine: '添加商品', remove: '移除', cancel: '取消', save: '保存修改', saving: '保存中...', customerError: '请输入有效的客户名称。',
        unpaid: '未付款', unpaidOrder: '未付款订单', paidAmount: '已付款', paidHint: '留空表示已全额付款',
        underpaid: '少收', overpaid: '多收',
        todayTotal: '今日总额', selectedDateTotal: '所选日期总额', dateFilter: '按日期筛选', deleteOrder: '删除订单', deleteTitle: '确认删除这张订单？',
        deleteBody: '删除后无法恢复，请确认这张订单确实录入有误。', confirmDelete: '确认删除', deleting: '删除中...',
        lineError: '订单至少需要一个商品。', productError: '请为每一行选择商品。', paymentError: '请输入有效的已付款金额。', boxesError: '箱数必须是大于 0 的整数。', synced: '已同步出库', carton: '箱', debtManaged: '请在欠款管理收款', debtNotice: '累计已付款由欠款管理中的逐笔收款记录维护，不能在订单编辑中直接修改。'
      },
    en: {
        title: 'Customer orders', subtitle: 'Updated in real time', emptyTitle: 'No orders for this date', emptyBody: 'Choose another date to view previous orders.',
        products: 'products', boxes: 'cartons', edit: 'Edit', editTitle: 'Edit order', customer: 'Customer', date: 'Date', product: 'Product', addLine: 'Add product',
        remove: 'Remove', cancel: 'Cancel', save: 'Save changes', saving: 'Saving...', unpaid: 'Unpaid', unpaidOrder: 'Unpaid order', paidAmount: 'Amount paid', paidHint: 'Leave blank for full payment',
        underpaid: 'Short by', overpaid: 'Overpaid by', todayTotal: "Today's total", selectedDateTotal: 'Total for date', dateFilter: 'Filter by date', deleteOrder: 'Delete order', deleteTitle: 'Delete this order?',
        deleteBody: 'This action cannot be undone.', confirmDelete: 'Delete', deleting: 'Deleting...', customerError: 'Enter a valid customer name.', lineError: 'Add at least one product.', productError: 'Select a product for every line.', paymentError: 'Enter a valid amount paid.', boxesError: 'Enter a whole number of cartons greater than 0.', synced: 'Synced', carton: 'carton', debtManaged: 'Managed in debts', debtNotice: 'Payments are recorded in debt management and cannot be changed directly here.'
      },
  }[language];

  useEffect(() => {
    const refreshToday = () => {
      const nextToday = getTogoOrderDate();
      if (nextToday === today) return;
      setSelectedDate((currentDate) => currentDate === today ? nextToday : currentDate);
      setToday(nextToday);
    };
    const intervalId = window.setInterval(refreshToday, 60_000);
    return () => window.clearInterval(intervalId);
  }, [today]);

  useEffect(() => {
    onSelectedDateChange?.(selectedDate);
  }, [onSelectedDateChange, selectedDate]);

  const dateOrders = useMemo(() => filterCustomerOrdersByDate(orders, selectedDate), [orders, selectedDate]);
  const visibleOrders = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return dateOrders;
    return dateOrders.filter((order) => order.customerName.toLowerCase().includes(keyword) || order.items.some((item) => item.productName.toLowerCase().includes(keyword)));
  }, [dateOrders, searchTerm]);
  const selectedDateTotal = useMemo(() => dateOrders.reduce((total, order) => total + order.totalAmount, 0), [dateOrders]);
  const totalLabel = selectedDate === today ? copy.todayTotal : copy.selectedDateTotal;

  const openEditor = (order: CustomerOrder) => {
    setEditorError('');
    setEditor({
      order,
      customerName: order.customerName,
      isUnpaid: order.isUnpaid,
      paidAmount: order.isUnpaid || order.paidAmount === order.totalAmount ? '' : String(order.paidAmount),
      lines: order.items.map((item, index) => ({
        key: index + 1,
        productId: item.productId,
        boxes: item.boxes.toString(),
        snapshot: { id: item.productId, name: item.productName, spec: item.spec, price: item.unitPrice },
      })),
    });
  };

  const updateEditorLine = (key: number, changes: Partial<CustomerOrderEditLine>) => {
    setEditor((current) => current ? { ...current, lines: current.lines.map((line) => line.key === key ? { ...line, ...changes } : line) } : current);
  };

  const addEditorLine = () => {
    const firstProduct = products[0];
    if (!firstProduct) {
      setEditorError(copy.productError);
      return;
    }
    setEditor((current) => {
      if (!current) return current;
      const nextKey = current.lines.reduce((highest, line) => Math.max(highest, line.key), 0) + 1;
      return { ...current, lines: [...current.lines, { key: nextKey, productId: firstProduct.id, boxes: '', snapshot: firstProduct }] };
    });
  };

  const saveEditor = async () => {
    if (!editor) return;
    const customerName = editor.customerName.trim();
    if (!customerName || customerName.length > 100) {
      setEditorError(copy.customerError);
      return;
    }
    if (editor.lines.length === 0) {
      setEditorError(copy.lineError);
      return;
    }
    try {
      const draftLines = editor.lines.map((line) => {
        const product = products.find((item) => item.id === line.productId) ?? (line.snapshot.id === line.productId ? line.snapshot : null);
        if (!product) throw new Error(copy.productError);
        const boxes = Number(line.boxes);
        if (!Number.isInteger(boxes) || boxes <= 0) throw new Error(copy.boxesError);
        return { product, boxes };
      });
      const { items, totalAmount } = buildCustomerOrderTotals(draftLines);
      const paidAmount = editor.order.hasDebtHistory
        ? editor.order.paidAmount
        : editor.isUnpaid
          ? 0
        : editor.paidAmount.trim() === ''
          ? totalAmount
          : Number(editor.paidAmount);
      if (!Number.isInteger(paidAmount) || paidAmount < 0) throw new Error(copy.paymentError);
      setIsSaving(true);
      setEditorError('');
      const saved = await updateCustomerOrder(editor.order.id, customerName, items, editor.isUnpaid, paidAmount);
      if (saved) setEditor(null);
    } catch (error) {
      setEditorError(error instanceof Error ? error.message : copy.productError);
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDeleteOrder = async () => {
    if (!orderPendingDeletion) return;
    setIsDeleting(true);
    try {
      const deleted = await deleteCustomerOrder(orderPendingDeletion.id);
      if (!deleted) return;
      if (expandedOrderId === orderPendingDeletion.id) setExpandedOrderId(null);
      setOrderPendingDeletion(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <section className={`customer-orders-panel overflow-hidden ${embedded ? 'surface rounded-xl border border-stone-200 shadow-sm' : 'section-panel'}`}>
        <div className="flex items-center justify-between gap-3 border-b border-stone-200 px-4 py-4 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="rounded-lg bg-rose-50 p-2 text-[#7c3037]"><ClipboardList size={19} /></span>
            <div className="min-w-0">
              <h2 className="display-title truncate text-lg">{copy.title}</h2>
              <p className="text-xs text-stone-500">{copy.subtitle}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <div className="text-right" aria-label={`${totalLabel}: ${formatCurrency(selectedDateTotal)}`}>
              <span className="metric-label block">{totalLabel}</span>
              <strong className="metric-value customer-order-total-value block whitespace-nowrap">{formatCurrency(selectedDateTotal)}</strong>
            </div>
            <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-bold tabular-nums text-stone-500">{visibleOrders.length}</span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-b border-stone-200 bg-stone-50/55 px-4 py-3 sm:px-5">
          <label htmlFor={`customer-orders-date-${language}-${embedded ? 'embedded' : 'page'}`} className="metric-label flex items-center gap-2">
            <CalendarDays size={15} className="text-[#7c3037]" />
            <span>{copy.dateFilter}</span>
          </label>
          <input
            id={`customer-orders-date-${language}-${embedded ? 'embedded' : 'page'}`}
            type="date"
            value={selectedDate}
            max={today}
            onChange={(event) => setSelectedDate(event.target.value)}
            aria-label={copy.dateFilter}
            className="w-40 rounded-lg border-stone-200 bg-white px-3 py-2 text-sm font-bold tabular-nums text-stone-700 focus:border-[#7c3037] focus:ring-[#7c3037]"
          />
        </div>

        {visibleOrders.length === 0 ? (
          <div className="flex min-h-56 flex-col items-center justify-center px-5 py-10 text-center">
            <ClipboardList size={30} className="text-stone-300" />
            <h3 className="mt-4 text-sm font-bold text-stone-600">{copy.emptyTitle}</h3>
            <p className="mt-1 text-xs font-semibold leading-5 text-stone-400">{copy.emptyBody}</p>
          </div>
        ) : (
          <div className={`custom-scrollbar divide-y divide-stone-200 overflow-y-auto ${embedded ? 'max-h-[680px]' : 'max-h-[calc(100vh-300px)]'}`}>
            {visibleOrders.map((order) => {
              const expanded = expandedOrderId === order.id;
              const paymentStatus = getCustomerOrderPaymentStatus(order);
              const paymentDifference = Math.abs(getCustomerOrderBalance(order));
              const needsAttention = paymentStatus === 'unpaid' || paymentStatus === 'underpaid';
              const inventoryLocked = Boolean(order.inventorySyncId);
              return (
                <article key={order.id} className={needsAttention ? 'bg-rose-50/65' : 'bg-white'}>
                  <div className="flex items-center gap-2 px-3 py-3.5 sm:px-4">
                    <button type="button" onClick={() => setExpandedOrderId(expanded ? null : order.id)} aria-expanded={expanded} className="min-w-0 flex-1 rounded-lg px-1 py-1 text-left hover:bg-stone-50">
                      <div className="flex items-center justify-between gap-3">
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="shrink-0 text-stone-400">{expanded ? <ChevronUp size={17} /> : <ChevronDown size={17} />}</span>
                          <span className="min-w-0">
                            <strong className="block truncate text-sm text-stone-900">{order.customerName}</strong>
                            <span className="mt-0.5 flex items-center gap-1.5 text-xs font-semibold text-stone-500"><CalendarDays size={13} />{order.orderDate}</span>
                          </span>
                        </span>
                        {paymentStatus === 'unpaid' && <span className="shrink-0 rounded-full bg-rose-100 px-2.5 py-1 text-[10px] font-bold text-rose-700">{copy.unpaid}</span>}
                        {paymentStatus === 'underpaid' && <span className="shrink-0 rounded-full bg-rose-100 px-2.5 py-1 text-[10px] font-bold text-rose-700">{copy.underpaid} {formatCurrency(paymentDifference)}</span>}
                        {paymentStatus === 'overpaid' && <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold text-emerald-700">{copy.overpaid} {formatCurrency(paymentDifference)}</span>}
                        {inventoryLocked && <span className="flex shrink-0 items-center gap-1 rounded-full bg-sky-100 px-2.5 py-1 text-[10px] font-bold text-sky-700"><LockKeyhole size={11} />{copy.synced}</span>}
                        <strong className="customer-order-money shrink-0 text-base font-semibold tabular-nums text-[#7c3037]">{formatCurrency(order.totalAmount)}</strong>
                      </div>
                    </button>
                    {!inventoryLocked && <button type="button" onClick={() => openEditor(order)} className="shrink-0 rounded-lg p-2 text-[#7c3037] hover:bg-rose-50" title={copy.edit} aria-label={`${copy.edit} ${order.customerName}`}><Pencil size={16} /></button>}
                    {!inventoryLocked && <button type="button" onClick={() => setOrderPendingDeletion(order)} className="shrink-0 rounded-lg p-2 text-rose-500 hover:bg-rose-50" title={copy.deleteOrder} aria-label={`${copy.deleteOrder} ${order.customerName}`}><Trash2 size={16} /></button>}
                  </div>

                  {expanded && (
                    <div className="border-t border-stone-100 bg-stone-50/45 px-4 py-4">
                      <div className="mb-3 text-xs font-bold text-stone-500">{order.items.length} {copy.products}</div>
                      <div className="space-y-2.5">
                        {order.items.map((item, index) => (
                          <div key={`${item.productId}-${index}`} className="rounded-lg border border-stone-200 bg-white p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <strong className="block truncate text-sm text-stone-800">{item.productName}</strong>
                                <span className="mt-1 block text-xs font-semibold text-stone-500">{item.boxes} {copy.boxes} · {item.spec}/{copy.carton}</span>
                              </div>
                              <strong className="customer-order-money shrink-0 text-sm font-semibold tabular-nums text-stone-700">{formatCurrency(item.subtotal)}</strong>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      {editor && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="customer-order-editor-title" className="w-full max-w-3xl overflow-hidden rounded-xl bg-[#fffefa] shadow-2xl">
            <header className="flex items-center justify-between gap-4 border-b border-stone-200 px-5 py-4 sm:px-6">
              <div>
                <h2 id="customer-order-editor-title" className="display-title text-2xl">{copy.editTitle}</h2>
                <p className="mt-1 text-xs font-semibold text-stone-500">{editor.order.orderDate}</p>
              </div>
              <button type="button" onClick={() => setEditor(null)} className="rounded-lg p-2 text-stone-500 hover:bg-stone-100" aria-label={copy.cancel}><X size={20} /></button>
            </header>

            <div className="custom-scrollbar max-h-[70vh] overflow-y-auto px-5 py-5 sm:px-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <label>
                  <span className="mb-2 block text-xs font-bold uppercase tracking-widest text-stone-500">{copy.customer}</span>
                  <input type="text" value={editor.customerName} onChange={(event) => setEditor((current) => current ? { ...current, customerName: event.target.value } : current)} maxLength={100} className="w-full rounded-lg px-3" />
                </label>
                <label>
                  <span className="mb-2 block text-xs font-bold uppercase tracking-widest text-stone-500">{copy.date}</span>
                  <input type="date" value={editor.order.orderDate} disabled className="w-full cursor-not-allowed rounded-lg bg-stone-100 px-3 opacity-100" />
                </label>
              </div>

              <label className={`mt-4 flex items-center gap-2.5 rounded-lg border border-rose-100 bg-rose-50/55 px-4 py-3 text-sm font-bold text-rose-700 ${editor.order.hasDebtHistory ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                <input
                  type="checkbox"
                  checked={editor.isUnpaid}
                  disabled={editor.order.hasDebtHistory}
                  onChange={(event) => setEditor((current) => current ? { ...current, isUnpaid: event.target.checked, paidAmount: event.target.checked ? '' : current.paidAmount } : current)}
                  className="h-4 w-4 rounded border-rose-300 accent-rose-600"
                />
                <span>{copy.unpaidOrder}</span>
              </label>

              <div className="mt-6 space-y-3">
                {editor.lines.map((line) => {
                  const options = products.some((product) => product.id === line.snapshot.id) ? products : [line.snapshot, ...products];
                  return (
                    <div key={line.key} className="grid items-end gap-3 rounded-xl border border-stone-200 bg-white p-4 sm:grid-cols-[minmax(0,1fr)_120px_42px]">
                      <label>
                        <span className="mb-2 block text-xs font-bold uppercase tracking-widest text-stone-500">{copy.product}</span>
                        <select value={line.productId} onChange={(event) => {
                          const product = products.find((item) => item.id === event.target.value) ?? line.snapshot;
                          updateEditorLine(line.key, { productId: product.id, snapshot: product });
                        }} className="w-full rounded-lg px-3">
                          {options.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
                        </select>
                      </label>
                      <label>
                        <span className="mb-2 block text-xs font-bold uppercase tracking-widest text-stone-500">{copy.boxes}</span>
                        <input type="number" min="1" step="1" value={line.boxes} onChange={(event) => updateEditorLine(line.key, { boxes: event.target.value })} className="w-full rounded-lg px-3" />
                      </label>
                      <button type="button" onClick={() => setEditor((current) => current ? { ...current, lines: current.lines.filter((item) => item.key !== line.key) } : current)} className="flex h-11 w-11 items-center justify-center rounded-lg text-rose-500 hover:bg-rose-50" title={copy.remove} aria-label={copy.remove}><Trash2 size={17} /></button>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-end">
                <button type="button" onClick={addEditorLine} className="flex items-center justify-center gap-2 rounded-lg border border-stone-200 bg-white px-4 py-3 text-sm font-bold text-stone-700 hover:bg-stone-50"><Plus size={17} />{copy.addLine}</button>
                <label className="block">
                  <span className="mb-2 block text-xs font-bold uppercase tracking-widest text-stone-500">{copy.paidAmount}</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    step="1"
                    value={editor.paidAmount}
                  disabled={editor.isUnpaid || editor.order.hasDebtHistory}
                    onChange={(event) => setEditor((current) => current ? { ...current, paidAmount: event.target.value } : current)}
                    placeholder={editor.order.hasDebtHistory ? copy.debtManaged : editor.isUnpaid ? '0' : copy.paidHint}
                    className="w-full rounded-lg border-stone-200 bg-white px-3 py-3 font-bold disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-400"
                  />
                </label>
              </div>
              {editor.order.hasDebtHistory && (
                <p className="mt-3 rounded-lg bg-violet-50 px-4 py-3 text-xs font-semibold leading-5 text-violet-700">
                  {copy.debtNotice}
                </p>
              )}
              {editorError && <p className="mt-4 rounded-lg bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{editorError}</p>}
            </div>

            <footer className="flex flex-col-reverse gap-3 border-t border-stone-200 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
              <button type="button" onClick={() => setEditor(null)} className="rounded-lg border border-stone-200 bg-white px-5 py-3 font-bold text-stone-600 hover:bg-stone-50">{copy.cancel}</button>
              <button type="button" onClick={saveEditor} disabled={isSaving} className="flex items-center justify-center gap-2 rounded-lg bg-[#7c3037] px-5 py-3 font-bold text-white hover:bg-[#68272e] disabled:opacity-60"><Save size={17} />{isSaving ? copy.saving : copy.save}</button>
            </footer>
          </div>
        </div>
      )}

      {orderPendingDeletion && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/45 p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="customer-order-delete-title" className="w-full max-w-md rounded-xl bg-[#fffefa] p-6 shadow-2xl sm:p-7">
            <div className="flex items-start gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600"><Trash2 size={20} /></span>
              <div>
                <h2 id="customer-order-delete-title" className="text-xl font-bold text-stone-900">{copy.deleteTitle}</h2>
                <p className="mt-2 text-sm font-semibold leading-6 text-stone-500">{copy.deleteBody}</p>
              </div>
            </div>
            <div className="mt-5 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3">
              <strong className="block text-sm text-stone-900">{orderPendingDeletion.customerName}</strong>
              <div className="mt-1 flex items-center justify-between gap-3 text-xs font-semibold text-stone-500">
                <span>{orderPendingDeletion.orderDate}</span>
                <span className="customer-order-money text-sm font-semibold tabular-nums text-[#7c3037]">{formatCurrency(orderPendingDeletion.totalAmount)}</span>
              </div>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setOrderPendingDeletion(null)} disabled={isDeleting} className="rounded-lg border border-stone-200 bg-white px-5 py-3 font-bold text-stone-600 hover:bg-stone-50 disabled:opacity-60">{copy.cancel}</button>
              <button type="button" onClick={confirmDeleteOrder} disabled={isDeleting} className="flex items-center justify-center gap-2 rounded-lg bg-rose-600 px-5 py-3 font-bold text-white hover:bg-rose-700 disabled:opacity-60"><Trash2 size={17} />{isDeleting ? copy.deleting : copy.confirmDelete}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

interface CustomerOrdersViewProps {
  orders: CustomerOrder[];
  products: OrderProduct[];
  formatCurrency: (value: number) => string;
  updateCustomerOrder: (orderId: string, customerName: string, items: CustomerOrderItem[], isUnpaid: boolean, paidAmount: number) => Promise<boolean>;
  deleteCustomerOrder: (orderId: string) => Promise<boolean>;
  onSelectedDateChange?: (value: string) => void;
  selectedDate: string;
  inventorySync: CustomerOrderSync | null;
  syncOrdersToInventory: (orderDate: string) => Promise<boolean>;
  undoInventorySync: (orderDate: string) => Promise<boolean>;
}

export function CustomerOrdersView({ orders, products, formatCurrency, updateCustomerOrder, deleteCustomerOrder, onSelectedDateChange, selectedDate, inventorySync, syncOrdersToInventory, undoInventorySync }: CustomerOrdersViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmingSyncAction, setConfirmingSyncAction] = useState(false);
  const [isApplyingSyncAction, setIsApplyingSyncAction] = useState(false);

  const applySyncAction = async () => {
    setIsApplyingSyncAction(true);
    try {
      const success = inventorySync
        ? await undoInventorySync(selectedDate)
        : await syncOrdersToInventory(selectedDate);
      if (success) setConfirmingSyncAction(false);
    } finally {
      setIsApplyingSyncAction(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="page-heading-row">
        <div>
          <span className="eyebrow">CUSTOMER ORDERS</span>
          <h1 className="display-title mt-2 text-3xl sm:text-4xl">客户订单</h1>
          <p className="mt-2 text-sm text-stone-500">查看并编辑 order 账户提交的客户订货记录。</p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <button type="button" onClick={() => setConfirmingSyncAction(true)} disabled={!inventorySync && orders.length === 0} className={`flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${inventorySync ? 'border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100' : 'bg-[#7c3037] text-white hover:bg-[#68272e]'}`}>
            {inventorySync ? <RotateCcw size={17} /> : <RefreshCw size={17} />}
            {inventorySync ? '撤销同步' : '同步'}
          </button>
          <label className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={17} />
            <input type="search" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="搜索客户或商品..." className="w-full rounded-lg border-stone-200 bg-white py-2.5 pl-10 pr-3 text-sm font-semibold focus:border-[#7c3037] focus:ring-[#7c3037]" />
          </label>
        </div>
      </header>

      <CustomerOrdersPanel orders={orders} products={products} formatCurrency={formatCurrency} updateCustomerOrder={updateCustomerOrder} deleteCustomerOrder={deleteCustomerOrder} language="zh" searchTerm={searchTerm} onSelectedDateChange={onSelectedDateChange} />

      {confirmingSyncAction && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="customer-order-sync-title" className="w-full max-w-md rounded-xl bg-[#fffefa] p-6 shadow-2xl">
            <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-xl ${inventorySync ? 'bg-sky-50 text-sky-700' : 'bg-rose-50 text-[#7c3037]'}`}>
              {inventorySync ? <RotateCcw size={24} /> : <RefreshCw size={24} />}
            </div>
            <h2 id="customer-order-sync-title" className="display-title mt-4 text-center text-2xl">{inventorySync ? '撤销当天同步？' : '同步到出库流水？'}</h2>
            <p className="mt-3 text-center text-sm leading-6 text-stone-600">
              {inventorySync
                ? `${selectedDate} 的 ${inventorySync.orderIds.length} 张订单将解除锁定，关联出库流水会删除，库存自动恢复。`
                : `${selectedDate} 的 ${orders.length} 张订单将按商品合并出库并扣减库存。同步后当天订单会锁定，避免重复扣库存。`}
            </p>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setConfirmingSyncAction(false)} disabled={isApplyingSyncAction} className="rounded-lg border border-stone-200 bg-white px-5 py-3 font-bold text-stone-600 hover:bg-stone-50 disabled:opacity-60">取消</button>
              <button type="button" onClick={applySyncAction} disabled={isApplyingSyncAction} className={`flex items-center justify-center gap-2 rounded-lg px-5 py-3 font-bold text-white disabled:opacity-60 ${inventorySync ? 'bg-sky-700 hover:bg-sky-800' : 'bg-[#7c3037] hover:bg-[#68272e]'}`}>
                {isApplyingSyncAction ? '处理中...' : inventorySync ? '确认撤销' : '确认同步'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface OrderDebtsViewProps {
  orders: CustomerOrder[];
  formatCurrency: (value: number) => string;
  updateCustomerOrder: (orderId: string, customerName: string, items: CustomerOrderItem[], isUnpaid: boolean, paidAmount: number) => Promise<boolean>;
  saveDebtPayment: (target: DebtPaymentTarget, amount: number, paymentDate: string, paymentId?: string) => Promise<boolean>;
  deleteDebtPayment: (target: DebtPaymentTarget, payment: DebtPayment) => Promise<boolean>;
  language?: OrderLanguage;
}

export function OrderDebtsView({ orders, formatCurrency, updateCustomerOrder, saveDebtPayment, deleteDebtPayment, language = 'fr' }: OrderDebtsViewProps) {
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [editingOrder, setEditingOrder] = useState<CustomerOrder | null>(null);
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editorError, setEditorError] = useState('');
  const [savingOrderId, setSavingOrderId] = useState<string | null>(null);
  const [paymentTarget, setPaymentTarget] = useState<DebtPaymentTarget | null>(null);
  const [editingPayment, setEditingPayment] = useState<DebtPayment | null>(null);
  const copy = {
    fr: { eyebrow: 'PAIEMENTS CLIENTS', title: 'Gestion des dettes', subtitle: 'Les commandes non payées ou partiellement payées apparaissent automatiquement ici.', outstanding: 'Reste à recevoir', card: 'Commandes à encaisser', pending: 'en attente', none: 'Aucune dette en cours', noneBody: 'Toutes les commandes sont intégralement payées.', unpaid: 'Non payée', short: 'Manque', editCustomer: 'Modifier le client', editDebt: 'Modifier la dette de', receive: 'Enregistrer un encaissement', receiveDebt: 'Encaisser la dette de', total: 'Total commande', paid: 'Déjà payé', remaining: 'Reste', cartons: 'cartons', editTitle: 'Modifier le paiement', cancel: 'Annuler', customer: 'Client', paymentNotice: 'Les encaissements sont enregistrés ligne par ligne avec le bouton vert. Le cumul déjà payé ne peut plus être modifié directement.', saving: 'Enregistrement...', save: 'Enregistrer', customerError: 'Saisissez un nom de client valide.' },
    zh: { eyebrow: '客户收款', title: '欠款管理', subtitle: '未付款或部分付款的客户订单自动显示在这里。', outstanding: '待收金额', card: '待收订单', pending: '笔待收', none: '暂无欠款', noneBody: '所有订单均已付清。', unpaid: '未付款', short: '少收', editCustomer: '编辑客户', editDebt: '编辑欠款：', receive: '登记收款', receiveDebt: '收取欠款：', total: '订单总额', paid: '累计已还', remaining: '剩余欠款', cartons: '箱', editTitle: '编辑客户', cancel: '取消', customer: '客户', paymentNotice: '请使用绿色收款按钮逐笔登记回款，不能直接修改累计已还。', saving: '保存中...', save: '保存', customerError: '请输入有效的客户名称。' },
    en: { eyebrow: 'CUSTOMER PAYMENTS', title: 'Debt management', subtitle: 'Unpaid and partly paid orders appear here automatically.', outstanding: 'Amount due', card: 'Orders to collect', pending: 'pending', none: 'No outstanding debts', noneBody: 'All orders are fully paid.', unpaid: 'Unpaid', short: 'Short by', editCustomer: 'Edit customer', editDebt: 'Edit debt for', receive: 'Record payment', receiveDebt: 'Collect debt from', total: 'Order total', paid: 'Already paid', remaining: 'Remaining', cartons: 'cartons', editTitle: 'Edit customer', cancel: 'Cancel', customer: 'Customer', paymentNotice: 'Record each payment with the green button. The amount already paid cannot be edited directly.', saving: 'Saving...', save: 'Save', customerError: 'Enter a valid customer name.' },
  }[language];

  const debtOrders = useMemo(
    () => orders
      .filter(isCustomerOrderDebt)
      .slice()
      .sort((left, right) => (
        right.orderDate.localeCompare(left.orderDate) ||
        right.createdAt.toMillis() - left.createdAt.toMillis()
      )),
    [orders]
  );
  const totalOutstanding = useMemo(
    () => debtOrders.reduce((total, order) => total + getCustomerOrderOutstanding(order), 0),
    [debtOrders]
  );

  const openEditor = (order: CustomerOrder) => {
    setEditingOrder(order);
    setEditCustomerName(order.customerName);
    setEditorError('');
  };

  const paymentTargetFor = (order: CustomerOrder): DebtPaymentTarget => ({
    debtSource: 'customer-order',
    debtId: order.id,
    customerName: order.customerName,
    amount: order.totalAmount,
    paidAmount: order.paidAmount,
    debtDate: order.orderDate
  });

  const saveOrderDetails = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingOrder) return;
    const customerName = editCustomerName.trim();
    if (!customerName || customerName.length > 100) {
      setEditorError(copy.customerError);
      return;
    }

    setSavingOrderId(editingOrder.id);
    const saved = await updateCustomerOrder(
      editingOrder.id,
      customerName,
      editingOrder.items,
      editingOrder.isUnpaid,
      editingOrder.paidAmount
    );
    setSavingOrderId(null);
    if (saved) setEditingOrder(null);
  };

  return (
    <>
      <div className="space-y-6">
        <header className="page-heading-row">
          <div>
            <span className="eyebrow">{copy.eyebrow}</span>
            <h1 className="display-title mt-2 text-3xl sm:text-4xl">{copy.title}</h1>
            <p className="mt-2 text-sm text-stone-500">{copy.subtitle}</p>
          </div>
          <div className="rounded-xl border border-rose-100 bg-rose-50 px-5 py-3 text-right">
            <span className="metric-label block text-rose-600">{copy.outstanding}</span>
            <strong className="customer-order-money mt-1 block whitespace-nowrap text-2xl font-semibold text-rose-700">{formatCurrency(totalOutstanding)}</strong>
          </div>
        </header>

        <section className="section-panel overflow-hidden">
          <div className="section-panel-header">
            <div className="flex items-center gap-3">
              <span className="rounded-lg bg-rose-50 p-2 text-rose-700"><HandCoins size={20} /></span>
              <div>
                <h2 className="display-title text-lg">{copy.card}</h2>
                <p className="text-xs text-stone-500">{debtOrders.length} {language === 'fr' ? `commande${debtOrders.length === 1 ? '' : 's'} ${copy.pending}` : language === 'zh' ? copy.pending : `order${debtOrders.length === 1 ? '' : 's'} ${copy.pending}`}</p>
              </div>
            </div>
          </div>

          {debtOrders.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center px-6 py-12 text-center">
              <CheckCircle2 size={34} className="text-emerald-400" />
              <h3 className="mt-4 text-base font-bold text-stone-700">{copy.none}</h3>
              <p className="mt-1 text-sm font-semibold text-stone-400">{copy.noneBody}</p>
            </div>
          ) : (
            <div className="divide-y divide-rose-100">
              {debtOrders.map((order) => {
                const expanded = expandedOrderId === order.id;
                const remainingAmount = getCustomerOrderOutstanding(order);
                return (
                  <article key={order.id} className="bg-rose-50/60">
                    <div className="flex items-center gap-2 px-4 py-4 sm:px-5">
                      <button
                        type="button"
                        onClick={() => setExpandedOrderId(expanded ? null : order.id)}
                        aria-expanded={expanded}
                        className="min-w-0 flex-1 rounded-lg px-1 py-1 text-left hover:bg-white/70"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="flex min-w-0 items-center gap-2">
                            <span className="shrink-0 text-rose-400">{expanded ? <ChevronUp size={17} /> : <ChevronDown size={17} />}</span>
                            <span className="min-w-0">
                              <strong className="block truncate text-sm text-stone-900">{order.customerName}</strong>
                              <span className="mt-0.5 flex items-center gap-1.5 text-xs font-semibold text-stone-500"><CalendarDays size={13} />{order.orderDate}</span>
                            </span>
                          </span>
                          <span className="shrink-0 rounded-full bg-rose-100 px-2.5 py-1 text-[10px] font-bold text-rose-700">
                            {order.isUnpaid ? copy.unpaid : `${copy.short} ${formatCurrency(remainingAmount)}`}
                          </span>
                          <strong className="customer-order-money shrink-0 text-base font-semibold text-rose-700">{formatCurrency(remainingAmount)}</strong>
                        </div>
                      </button>
                      <button type="button" onClick={() => openEditor(order)} disabled={savingOrderId !== null} className="shrink-0 rounded-lg p-2 text-sky-600 hover:bg-white disabled:opacity-40" title={copy.editCustomer} aria-label={`${copy.editDebt} ${order.customerName}`}><Pencil size={16} /></button>
                      <button type="button" onClick={() => { setEditingPayment(null); setPaymentTarget(paymentTargetFor(order)); }} disabled={savingOrderId !== null} className="shrink-0 rounded-lg p-2 text-emerald-600 hover:bg-white disabled:opacity-40" title={copy.receive} aria-label={`${copy.receiveDebt} ${order.customerName}`}><HandCoins size={17} /></button>
                    </div>

                    {expanded && (
                      <div className="border-t border-rose-100 bg-white/70 px-5 py-4">
                        <div className="grid gap-3 sm:grid-cols-3">
                          <div><span className="metric-label block">{copy.total}</span><strong className="mt-1 block text-sm text-stone-800">{formatCurrency(order.totalAmount)}</strong></div>
                          <div><span className="metric-label block">{copy.paid}</span><strong className="mt-1 block text-sm text-sky-700">{formatCurrency(order.paidAmount)}</strong></div>
                          <div><span className="metric-label block">{copy.remaining}</span><strong className="mt-1 block text-sm text-rose-700">{formatCurrency(remainingAmount)}</strong></div>
                        </div>
                        <div className="mt-4 space-y-2">
                          {order.items.map((item, index) => (
                            <div key={`${item.productId}-${index}`} className="flex items-center justify-between gap-3 rounded-lg border border-stone-200 bg-white px-3 py-2.5">
                              <span className="min-w-0"><strong className="block truncate text-sm text-stone-800">{item.productName}</strong><span className="text-xs font-semibold text-stone-500">{item.boxes} {copy.cartons}</span></span>
                              <strong className="customer-order-money shrink-0 text-sm text-stone-700">{formatCurrency(item.subtotal)}</strong>
                            </div>
                          ))}
                        </div>
                        <DebtPaymentHistory
                          target={paymentTargetFor(order)}
                          formatCurrency={formatCurrency}
                          language={language}
                          editable
                          onEdit={(payment) => { setEditingPayment(payment); setPaymentTarget(paymentTargetFor(order)); }}
                          onDelete={(payment) => deleteDebtPayment(paymentTargetFor(order), payment)}
                        />
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {editingOrder && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="order-debt-editor-title" className="w-full max-w-lg rounded-xl bg-[#fffefa] p-6 shadow-2xl sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="order-debt-editor-title" className="display-title text-2xl">{copy.editTitle}</h2>
                <p className="mt-1 text-xs font-semibold text-stone-500">{editingOrder.orderDate}</p>
              </div>
              <button type="button" onClick={() => setEditingOrder(null)} disabled={savingOrderId !== null} className="rounded-lg p-2 text-stone-500 hover:bg-stone-100" aria-label={copy.cancel}><X size={20} /></button>
            </div>

            <form onSubmit={saveOrderDetails} className="mt-6 space-y-5">
              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-widest text-stone-500">{copy.customer}</span>
                <input type="text" value={editCustomerName} onChange={(event) => setEditCustomerName(event.target.value)} maxLength={100} className="w-full rounded-lg px-3 py-3 font-bold" />
              </label>
              <div className="rounded-lg border border-stone-200 bg-stone-50 px-4 py-3">
                <span className="metric-label block">{copy.total}</span>
                <strong className="customer-order-money mt-1 block text-xl text-[#7c3037]">{formatCurrency(editingOrder.totalAmount)}</strong>
              </div>
              <p className="rounded-lg bg-violet-50 px-4 py-3 text-sm font-semibold leading-5 text-violet-700">{copy.paymentNotice}</p>
              {editorError && <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{editorError}</p>}
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setEditingOrder(null)} disabled={savingOrderId !== null} className="rounded-lg border border-stone-200 bg-white px-5 py-3 font-bold text-stone-600">{copy.cancel}</button>
                <button type="submit" disabled={savingOrderId !== null} className="flex items-center justify-center gap-2 rounded-lg bg-[#7c3037] px-5 py-3 font-bold text-white disabled:opacity-60"><Save size={17} />{savingOrderId ? copy.saving : copy.save}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {paymentTarget && (
        <DebtPaymentDialog
          target={paymentTarget}
          payment={editingPayment}
          formatCurrency={formatCurrency}
          language={language}
          onClose={() => { setPaymentTarget(null); setEditingPayment(null); }}
          onSave={(amount, paymentDate, paymentId) => saveDebtPayment(paymentTarget, amount, paymentDate, paymentId)}
        />
      )}
    </>
  );
}
