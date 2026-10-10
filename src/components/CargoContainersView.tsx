import { useMemo, useRef, useState } from 'react';
import { CalendarDays, ChevronDown, Container, FileText, Package, Pencil, Plus, Ship, Trash2, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { CARGO_CONTAINER_STATUSES, type CargoContainer, type CargoContainerItem, type CargoContainerStatus, type Product } from '../types';
import { buildCargoContainerItems, compareCargoContainers, getCargoContainerCardDate, resolveCargoContainerBoxes } from '../lib/cargoContainers';
import { isOrderDate } from '../lib/customerOrders';

interface CargoContainersViewProps {
  containers: CargoContainer[];
  products: Product[];
  canEdit: boolean;
  saveCargoContainer: (input: {
    id?: string;
    containerNumber: string;
    billOfLadingNumber: string;
    arrivalDate: string | null;
    stockedDate: string | null;
    status: CargoContainerStatus;
    remark: string;
    cargoBoxes: number;
    items: CargoContainerItem[];
  }) => Promise<boolean>;
}

type CargoContainerSaveInput = Parameters<CargoContainersViewProps['saveCargoContainer']>[0];

interface DraftLine {
  id: number;
  productId: string;
  boxes: string;
}

function isPendingStatus(status: CargoContainerStatus): boolean {
  return status === '在途';
}

function getStatusClass(status: CargoContainerStatus): string {
  if (status === '到库') return 'bg-emerald-50 text-emerald-700';
  if (status === '到港') return 'bg-amber-50 text-amber-800';
  return 'bg-sky-50 text-sky-700';
}

export function CargoContainersView({ containers, products, canEdit, saveCargoContainer }: CargoContainersViewProps) {
  const nextLineId = useRef(1);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isArrivalSummaryOpen, setIsArrivalSummaryOpen] = useState(false);
  const [editingContainer, setEditingContainer] = useState<CargoContainer | null>(null);
  const [containerNumber, setContainerNumber] = useState('');
  const [billOfLadingNumber, setBillOfLadingNumber] = useState('');
  const [arrivalDate, setArrivalDate] = useState('');
  const [stockedDate, setStockedDate] = useState('');
  const [pendingStockSave, setPendingStockSave] = useState<Omit<CargoContainerSaveInput, 'stockedDate'> | null>(null);
  const [status, setStatus] = useState<CargoContainerStatus | ''>('');
  const [remark, setRemark] = useState('');
  const [cargoBoxes, setCargoBoxes] = useState('');
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [expandedStatuses, setExpandedStatuses] = useState<Set<CargoContainerStatus>>(() => new Set(['在途']));
  const [errorMessage, setErrorMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const sortedProducts = useMemo(
    () => [...products].sort((left, right) => left.name.localeCompare(right.name)),
    [products]
  );
  const sortedContainers = useMemo(() => [...containers].sort(compareCargoContainers), [containers]);
  const pendingCount = containers.filter((item) => isPendingStatus(item.status)).length;
  const arrivalsByDate = useMemo(() => {
    const counts = new Map<string | null, number>();
    for (const cargo of containers) {
      if (isPendingStatus(cargo.status)) counts.set(cargo.arrivalDate, (counts.get(cargo.arrivalDate) ?? 0) + 1);
    }
    return [...counts].sort(([left], [right]) => {
      if (left === null) return right === null ? 0 : 1;
      if (right === null) return -1;
      return left.localeCompare(right);
    });
  }, [containers]);
  const arrivedCount = containers.filter((item) => item.status === '到港').length;
  const stockedCount = containers.filter((item) => item.status === '到库').length;
  const totalBoxes = containers.reduce((total, item) => total + item.cargoBoxes, 0);

  const resetForm = () => {
    setEditingContainer(null);
    setContainerNumber('');
    setBillOfLadingNumber('');
    setArrivalDate('');
    setStockedDate('');
    setPendingStockSave(null);
    setStatus('');
    setRemark('');
    setCargoBoxes('');
    setLines([]);
    setErrorMessage('');
  };

  const openCreateForm = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const openEditForm = (cargo: CargoContainer) => {
    setEditingContainer(cargo);
    setContainerNumber(cargo.containerNumber);
    setBillOfLadingNumber(cargo.billOfLadingNumber);
    setArrivalDate(cargo.arrivalDate ?? '');
    setStatus(cargo.status);
    setRemark(cargo.remark);
    setCargoBoxes(String(cargo.cargoBoxes));
    setLines(cargo.items.map((item) => {
      const line = { id: nextLineId.current, productId: item.productId, boxes: String(item.boxes) };
      nextLineId.current += 1;
      return line;
    }));
    setErrorMessage('');
    setIsFormOpen(true);
  };

  const closeForm = () => {
    if (isSaving) return;
    setIsFormOpen(false);
    resetForm();
  };

  const addLine = () => {
    setLines((current) => [...current, { id: nextLineId.current, productId: '', boxes: '' }]);
    nextLineId.current += 1;
  };

  const updateLine = (id: number, patch: Partial<Pick<DraftLine, 'productId' | 'boxes'>>) => {
    setLines((current) => current.map((line) => line.id === id ? { ...line, ...patch } : line));
  };

  const removeLine = (id: number) => {
    setLines((current) => current.filter((line) => line.id !== id));
  };

  const persistCargoContainer = async (input: CargoContainerSaveInput) => {
    setIsSaving(true);
    try {
      const saved = await saveCargoContainer(input);
      if (saved) {
        setIsFormOpen(false);
        resetForm();
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '货柜保存失败');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (isSaving) return;

    const normalizedNumber = containerNumber.trim();
    const normalizedBillNumber = billOfLadingNumber.trim();
    if (!normalizedNumber || normalizedNumber.length > 80) {
      setErrorMessage('请输入有效的货柜号码');
      return;
    }
    if (!normalizedBillNumber || normalizedBillNumber.length > 80) {
      setErrorMessage('请输入有效的提单号');
      return;
    }
    if (arrivalDate && !isOrderDate(arrivalDate)) {
      setErrorMessage('请选择有效的预计到港日期');
      return;
    }
    if (!status) {
      setErrorMessage('请选择货柜当前状态');
      return;
    }
    if (!Number.isInteger(Number(cargoBoxes)) || Number(cargoBoxes) <= 0) {
      setErrorMessage('请输入有效的货物总箱数');
      return;
    }
    if (remark.trim().length > 1000) {
      setErrorMessage('备注不能超过1000个字符');
      return;
    }

    try {
      const enteredLines = lines.filter((line) => line.productId || line.boxes.trim());
      if (enteredLines.some((line) => !line.productId || !line.boxes.trim())) {
        throw new Error('产品和箱数需要成对填写');
      }
      const draftLines = enteredLines.map((line) => {
        const product = products.find((item) => item.id === line.productId);
        if (!product) throw new Error('请选择有效的产品');
        return { product, boxes: Number(line.boxes) };
      });
      const items = buildCargoContainerItems(draftLines);
      const resolvedBoxes = resolveCargoContainerBoxes(items, Number(cargoBoxes));
      if (resolvedBoxes !== Number(cargoBoxes)) throw new Error('货物总箱数须与产品箱数合计一致');

      const input = {
        id: editingContainer?.id,
        containerNumber: normalizedNumber,
        billOfLadingNumber: normalizedBillNumber,
        arrivalDate: arrivalDate || null,
        status,
        remark: remark.trim(),
        cargoBoxes: resolvedBoxes,
        items
      };
      setErrorMessage('');
      if (status === '到库') {
        setStockedDate(editingContainer?.status === '到库' ? editingContainer.stockedDate ?? '' : '');
        setPendingStockSave(input);
      } else {
        void persistCargoContainer({ ...input, stockedDate: null });
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '货柜内容无效');
    }
  };

  const confirmStockDate = (event: React.FormEvent) => {
    event.preventDefault();
    if (!pendingStockSave || isSaving) return;
    if (!isOrderDate(stockedDate)) {
      setErrorMessage('请选择有效的到库日期');
      return;
    }
    setErrorMessage('');
    void persistCargoContainer({ ...pendingStockSave, stockedDate });
  };

  const toggleExpanded = (id: string) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleStatus = (statusToToggle: CargoContainerStatus) => {
    setExpandedStatuses((current) => {
      const next = new Set(current);
      if (next.has(statusToToggle)) next.delete(statusToToggle);
      else next.add(statusToToggle);
      return next;
    });
  };

  return (
    <div className="page-shell space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="eyebrow">CARGO CONTAINERS</span>
          <h1 className="display-title mt-2 text-3xl sm:text-4xl">货柜情况</h1>
          <p className="mt-2 text-sm text-stone-500">查看货柜号、提单号、预计到港日期、当前状态和货物明细。</p>
        </div>
        {canEdit && (
          <button type="button" onClick={openCreateForm} className="button-primary flex min-h-11 items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-bold">
            <Plus size={17} />录入货柜
          </button>
        )}
      </header>

      <section className="grid gap-px overflow-hidden rounded-xl border border-stone-200 bg-stone-200 sm:grid-cols-2 lg:grid-cols-5" aria-label="货柜汇总">
        <div className="bg-[var(--surface)] p-5"><span className="metric-label">货柜总数</span><strong className="mt-2 block text-3xl font-semibold text-slate-900">{containers.length}</strong></div>
        <button type="button" onClick={() => setIsArrivalSummaryOpen(true)} aria-haspopup="dialog" className="bg-[var(--surface)] p-5 text-left hover:bg-stone-50" title="查看在途货柜预计到港日期">
          <span className="flex items-center justify-between"><span className="metric-label">在途货柜</span><CalendarDays size={17} className="text-stone-400" /></span>
          <strong className="mt-2 block text-3xl font-semibold text-[var(--oxblood)]">{pendingCount}</strong>
        </button>
        <div className="bg-[var(--surface)] p-5"><span className="metric-label">到港货柜</span><strong className="mt-2 block text-3xl font-semibold text-amber-700">{arrivedCount}</strong></div>
        <div className="bg-[var(--surface)] p-5"><span className="metric-label">到库货柜</span><strong className="mt-2 block text-3xl font-semibold text-[var(--forest)]">{stockedCount}</strong></div>
        <div className="bg-[var(--surface)] p-5"><span className="metric-label">货物总箱数</span><strong className="mt-2 block text-3xl font-semibold text-[var(--forest)]">{totalBoxes.toLocaleString('zh-CN')}</strong></div>
      </section>

      <AnimatePresence>
        {isArrivalSummaryOpen && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/30 p-4" onMouseDown={() => setIsArrivalSummaryOpen(false)}>
            <motion.section initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} role="dialog" aria-modal="true" aria-labelledby="cargo-arrivals-title" onMouseDown={(event) => event.stopPropagation()} className="surface w-full max-w-sm rounded-xl border border-stone-200">
              <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4">
                <h2 id="cargo-arrivals-title" className="text-lg font-bold text-slate-900">在途货柜预计到港</h2>
                <button type="button" onClick={() => setIsArrivalSummaryOpen(false)} className="button-secondary button-icon" aria-label="关闭到港日期统计"><X size={18} /></button>
              </div>
              <div className="divide-y divide-stone-100 px-5">
                {arrivalsByDate.map(([date, count]) => (
                  <div key={date ?? 'undated'} className="flex items-center justify-between py-4">
                    <span className="font-semibold text-slate-800">{date ?? '预计到港日期待定'}</span>
                    <span className="font-bold text-[var(--oxblood)]">{count} 个货柜</span>
                  </div>
                ))}
              </div>
              <p className="border-t border-stone-200 px-5 py-3 text-sm text-stone-500">在途共 {pendingCount} 个货柜</p>
            </motion.section>
          </div>
        )}
      </AnimatePresence>

      <section className="surface overflow-hidden rounded-xl border border-stone-200">
        <div className="flex items-center gap-3 border-b border-stone-200 px-5 py-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-800"><Container size={20} /></span>
          <div><h2 className="text-lg font-bold text-slate-900">全部货柜</h2><p className="text-xs text-stone-500">在途货柜按预计到港日期排列，日期待定的排在最前面</p></div>
        </div>

        {sortedContainers.length === 0 ? (
          <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
            <Ship size={38} className="text-stone-300" />
            <h3 className="mt-4 text-lg font-bold text-slate-800">还没有货柜记录</h3>
            {canEdit && <p className="mt-1 text-sm text-stone-500">点击“录入货柜”添加第一条货柜资料。</p>}
          </div>
        ) : (
          <div className="divide-y divide-stone-200">
            {CARGO_CONTAINER_STATUSES.map((groupStatus) => {
              const groupContainers = sortedContainers.filter((cargo) => cargo.status === groupStatus);
              const groupExpanded = expandedStatuses.has(groupStatus);
              return (
                <section key={groupStatus} aria-label={`${groupStatus}货柜`}>
                  <h3>
                    <button type="button" onClick={() => toggleStatus(groupStatus)} aria-expanded={groupExpanded} className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-stone-50">
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusClass(groupStatus)}`}>{groupStatus}</span>
                      <span className="text-sm text-stone-500">{groupContainers.length} 个货柜</span>
                      <ChevronDown size={19} className={`ml-auto text-stone-400 transition-transform ${groupExpanded ? 'rotate-180' : ''}`} />
                    </button>
                  </h3>
                  {groupExpanded && (groupContainers.length === 0 ? (
                    <p className="border-t border-stone-100 px-5 py-8 text-center text-sm text-stone-500">暂无{groupStatus}货柜</p>
                  ) : (
                    <div className="divide-y divide-stone-100 border-t border-stone-100">
                      {groupContainers.map((cargo) => {
              const expanded = expandedIds.has(cargo.id);
              const cardDate = getCargoContainerCardDate(cargo);
              return (
                <article key={cargo.id}>
                  <div className="flex items-stretch">
                    <button type="button" onClick={() => toggleExpanded(cargo.id)} className="grid min-w-0 flex-1 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 px-5 py-4 text-left hover:bg-stone-50" aria-expanded={expanded}>
                      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-stone-100 text-stone-600"><Container size={19} /></span>
                      <span className="min-w-0">
                        <span className="flex flex-wrap items-center gap-2"><strong className="truncate text-base text-slate-900">{cargo.containerNumber}</strong><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${getStatusClass(cargo.status)}`}>{cargo.status}</span></span>
                        <span className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-500">
                          <span className="inline-flex items-center gap-1.5"><FileText size={13} />提单号 {cargo.billOfLadingNumber}</span>
                          <span className="inline-flex items-center gap-1.5"><CalendarDays size={13} />{cardDate.label} <strong className="text-base font-bold text-slate-900">{cardDate.value}</strong></span>
                          {cargo.items.length > 0 && <span>{cargo.items.length} 个产品</span>}
                          <span>{cargo.cargoBoxes.toLocaleString('zh-CN')} 箱</span>
                        </span>
                        {cargo.remark && <span className="mt-1.5 block truncate text-xs text-stone-500">备注：{cargo.remark}</span>}
                      </span>
                      <ChevronDown size={19} className={`text-stone-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                    </button>
                    {canEdit && <button type="button" onClick={() => openEditForm(cargo)} className="button-icon m-4 ml-0 shrink-0 text-[var(--forest)]" aria-label={`编辑货柜 ${cargo.containerNumber}`}><Pencil size={17} /></button>}
                  </div>

                  {expanded && (
                    <div className="border-t border-stone-100 bg-stone-50/70 px-5 py-4">
                      <dl className="mb-4 grid gap-3 rounded-lg border border-stone-200 bg-white p-4 text-sm sm:grid-cols-3">
                        <div><dt className="text-xs text-stone-500">提单号</dt><dd className="mt-1 font-bold text-slate-900">{cargo.billOfLadingNumber}</dd></div>
                        <div><dt className="text-xs text-stone-500">当前状态</dt><dd className="mt-1 font-bold text-slate-900">{cargo.status}</dd></div>
                        <div><dt className="text-xs text-stone-500">货物总箱数</dt><dd className="mt-1 font-bold text-slate-900">{cargo.cargoBoxes.toLocaleString('zh-CN')} 箱</dd></div>
                        <div className="sm:col-span-3"><dt className="text-xs text-stone-500">备注</dt><dd className="mt-1 whitespace-pre-wrap text-slate-700">{cargo.remark || '—'}</dd></div>
                      </dl>
                      {cargo.items.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-stone-300 bg-white px-5 py-8 text-center text-sm text-stone-500">源文件只记录了货物总箱数，暂无产品型号明细。</div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[560px] text-sm">
                            <thead><tr className="text-left text-xs uppercase tracking-wide text-stone-500"><th className="px-4 py-3">产品型号</th><th className="px-4 py-3">规格</th><th className="px-4 py-3">箱数</th><th className="px-4 py-3">总件数</th></tr></thead>
                            <tbody className="divide-y divide-stone-200 bg-white">
                              {cargo.items.map((item) => <tr key={item.productId}><td className="px-4 py-3 font-bold text-slate-900">{item.productName}</td><td className="px-4 py-3 text-slate-600">{item.spec} 个/箱</td><td className="px-4 py-3 text-slate-800">{item.boxes.toLocaleString('zh-CN')} 箱</td><td className="px-4 py-3 text-slate-600">{item.quantity.toLocaleString('zh-CN')} 个</td></tr>)}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </article>
              );
                      })}
                    </div>
                  ))}
                </section>
              );
            })}
          </div>
        )}
      </section>

      <AnimatePresence>
        {canEdit && isFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4" onMouseDown={closeForm}>
            <motion.section initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} className="surface max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-stone-200" role="dialog" aria-modal="true" aria-labelledby="cargo-form-title" onMouseDown={(event) => event.stopPropagation()}>
              <div className="flex items-start justify-between border-b border-stone-200 px-6 py-5">
                <div><span className="eyebrow">{editingContainer ? 'EDIT CONTAINER' : 'NEW CONTAINER'}</span><h2 id="cargo-form-title" className="mt-1 text-2xl font-bold text-slate-900">{editingContainer ? '编辑货柜' : '录入货柜'}</h2></div>
                <button type="button" onClick={closeForm} className="button-secondary button-icon" aria-label="关闭"><X size={18} /></button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6 p-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2 text-sm font-bold text-slate-700"><span>货柜号码 <span aria-hidden="true" className="text-red-600">*</span></span><input value={containerNumber} onChange={(event) => setContainerNumber(event.target.value)} placeholder="例如：TCNU4672626" maxLength={80} required className="w-full rounded-lg px-4 py-3" autoFocus /></label>
                  <label className="space-y-2 text-sm font-bold text-slate-700"><span>提单号 <span aria-hidden="true" className="text-red-600">*</span></span><input value={billOfLadingNumber} onChange={(event) => setBillOfLadingNumber(event.target.value)} placeholder="例如：NGRI60788000" maxLength={80} required className="w-full rounded-lg px-4 py-3" /></label>
                  <label className="space-y-2 text-sm font-bold text-slate-700"><span>预计到港日期（可选）</span><input type="date" value={arrivalDate} onChange={(event) => setArrivalDate(event.target.value)} className="w-full rounded-lg px-4 py-3" /></label>
                  <label className="space-y-2 text-sm font-bold text-slate-700"><span>当前状态 <span aria-hidden="true" className="text-red-600">*</span></span><select value={status} onChange={(event) => setStatus(event.target.value as CargoContainerStatus | '')} required className="w-full rounded-lg px-4 py-3"><option value="">请选择状态</option>{CARGO_CONTAINER_STATUSES.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
                  <label className="space-y-2 text-sm font-bold text-slate-700 sm:col-span-2"><span>货物总箱数 <span aria-hidden="true" className="text-red-600">*</span></span><input type="number" min="1" step="1" inputMode="numeric" value={cargoBoxes} onChange={(event) => setCargoBoxes(event.target.value)} placeholder="请输入货物总箱数" required className="w-full rounded-lg px-4 py-3" /><span className="block text-xs font-normal text-stone-500">填写的总箱数须与产品明细箱数合计一致。</span></label>
                  <label className="space-y-2 text-sm font-bold text-slate-700 sm:col-span-2"><span>备注</span><textarea value={remark} onChange={(event) => setRemark(event.target.value)} placeholder="填写中转、卸船或其他说明" maxLength={1000} rows={3} className="w-full resize-y rounded-lg px-4 py-3" /></label>
                </div>

                <section className="space-y-3">
                  <div className="flex items-center justify-between gap-4"><div><h3 className="text-base font-bold text-slate-900">货柜产品</h3><p className="mt-1 text-xs text-stone-500">源文件没有产品型号时可以不填写，后续可编辑补充。</p></div><button type="button" onClick={addLine} className="button-secondary flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold"><Plus size={16} />添加产品</button></div>
                  {lines.length > 0 && <div className="space-y-3">{lines.map((line, index) => (
                    <div key={line.id} className="grid gap-3 rounded-xl border border-stone-200 bg-stone-50 p-4 sm:grid-cols-[minmax(0,1fr)_160px_auto] sm:items-end">
                      <label className="space-y-2 text-sm font-bold text-slate-700"><span>产品 {index + 1}</span><select value={line.productId} onChange={(event) => updateLine(line.id, { productId: event.target.value })} className="w-full rounded-lg px-3 py-2.5"><option value="">请选择产品</option>{sortedProducts.map((product) => <option key={product.id} value={product.id}>{product.name} · {product.spec} 个/箱</option>)}</select></label>
                      <label className="space-y-2 text-sm font-bold text-slate-700"><span>箱数</span><input type="number" min="1" step="1" inputMode="numeric" value={line.boxes} onChange={(event) => updateLine(line.id, { boxes: event.target.value })} placeholder="输入箱数" className="w-full rounded-lg px-3 py-2.5" /></label>
                      <button type="button" onClick={() => removeLine(line.id)} className="button-secondary button-icon text-rose-600" aria-label={`删除产品 ${index + 1}`}><Trash2 size={17} /></button>
                    </div>
                  ))}</div>}
                </section>

                {errorMessage && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{errorMessage}</p>}
                <div className="flex flex-col-reverse gap-3 border-t border-stone-200 pt-5 sm:flex-row sm:justify-end">
                  <button type="button" onClick={closeForm} disabled={isSaving} className="button-secondary rounded-lg px-5 py-3 text-sm font-bold">取消</button>
                  <button type="submit" disabled={isSaving} className="button-primary flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-bold disabled:opacity-50"><Package size={17} />{isSaving ? '保存中…' : editingContainer ? '保存修改' : '保存货柜'}</button>
                </div>
              </form>
            </motion.section>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {canEdit && pendingStockSave && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/40 p-4">
            <motion.section initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} role="dialog" aria-modal="true" aria-labelledby="cargo-stock-date-title" className="surface w-full max-w-sm rounded-xl border border-stone-200">
              <div className="border-b border-stone-200 px-6 py-5">
                <h2 id="cargo-stock-date-title" className="text-xl font-bold text-slate-900">确认到库日期</h2>
                <p className="mt-1 text-sm text-stone-500">确认后才会将货柜状态保存为“到库”。</p>
              </div>
              <form onSubmit={confirmStockDate} className="space-y-5 p-6">
                <label className="block space-y-2 text-sm font-bold text-slate-700"><span>到库日期 <span aria-hidden="true" className="text-red-600">*</span></span><input type="date" value={stockedDate} onChange={(event) => setStockedDate(event.target.value)} required className="w-full rounded-lg px-4 py-3" autoFocus /></label>
                {errorMessage && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{errorMessage}</p>}
                <div className="flex justify-end gap-3"><button type="button" onClick={() => { setPendingStockSave(null); setErrorMessage(''); }} disabled={isSaving} className="button-secondary rounded-lg px-5 py-3 text-sm font-bold">取消</button><button type="submit" disabled={isSaving} className="button-primary rounded-lg px-5 py-3 text-sm font-bold disabled:opacity-50">{isSaving ? '保存中…' : '确认保存'}</button></div>
              </form>
            </motion.section>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
