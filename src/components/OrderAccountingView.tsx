import { useEffect, useMemo, useState } from 'react';
import { Banknote, CalendarDays, Calculator, ChevronDown, ChevronUp, Pencil, ReceiptText, Save, Trash2, WalletCards, X } from 'lucide-react';
import type { CashDenominationCounts, CashDenominationKey, OrderCashCount, OrderDailyExpense } from '../types';
import { calculateCashTotal, CASH_DENOMINATIONS, createEmptyCashCounts, filterOrderExpensesByDate } from '../lib/orderAccounting';
import { getTogoOrderDate } from '../lib/customerOrders';

type CashDraft = Record<CashDenominationKey, string>;

function cashCountsToDraft(counts: CashDenominationCounts): CashDraft {
  return Object.fromEntries(
    CASH_DENOMINATIONS.map((denomination) => {
      const key = String(denomination) as CashDenominationKey;
      return [key, counts[key] === 0 ? '' : String(counts[key])];
    })
  ) as CashDraft;
}

function draftToCashCounts(draft: CashDraft): CashDenominationCounts {
  const counts = createEmptyCashCounts();
  for (const denomination of CASH_DENOMINATIONS) {
    const key = String(denomination) as CashDenominationKey;
    const value = draft[key].trim() === '' ? 0 : Number(draft[key]);
    if (!Number.isInteger(value) || value < 0) throw new Error('Saisissez un nombre de billets valide.');
    counts[key] = value;
  }
  return counts;
}

interface OrderAccountingViewProps {
  cashCounts: OrderCashCount[];
  dailyExpenses: OrderDailyExpense[];
  saveCashCount: (recordDate: string, counts: CashDenominationCounts) => Promise<boolean>;
  deleteCashCount: (recordDate: string) => Promise<boolean>;
  createDailyExpense: (expenseDate: string, amount: number, remark: string) => Promise<boolean>;
  updateDailyExpense: (expenseId: string, expenseDate: string, amount: number, remark: string) => Promise<boolean>;
  deleteDailyExpense: (expenseId: string) => Promise<boolean>;
  formatCurrency: (value: number) => string;
  onSelectedDateChange?: (value: string) => void;
}

export function OrderAccountingView({
  cashCounts,
  dailyExpenses,
  saveCashCount,
  deleteCashCount,
  createDailyExpense,
  updateDailyExpense,
  deleteDailyExpense,
  formatCurrency,
  onSelectedDateChange
}: OrderAccountingViewProps) {
  const [today, setToday] = useState(() => getTogoOrderDate());
  const [selectedDate, setSelectedDate] = useState(() => getTogoOrderDate());
  const [cashDraft, setCashDraft] = useState<CashDraft>(() => cashCountsToDraft(createEmptyCashCounts()));
  const [cashExpanded, setCashExpanded] = useState(false);
  const [cashError, setCashError] = useState('');
  const [savingCash, setSavingCash] = useState(false);
  const [editingCashCount, setEditingCashCount] = useState<OrderCashCount | null>(null);
  const [editCashDraft, setEditCashDraft] = useState<CashDraft>(() => cashCountsToDraft(createEmptyCashCounts()));
  const [editCashError, setEditCashError] = useState('');
  const [updatingCash, setUpdatingCash] = useState(false);
  const [cashPendingDeletion, setCashPendingDeletion] = useState<OrderCashCount | null>(null);
  const [deletingCash, setDeletingCash] = useState(false);
  const [expenseDate, setExpenseDate] = useState(() => getTogoOrderDate());
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseRemark, setExpenseRemark] = useState('');
  const [expenseError, setExpenseError] = useState('');
  const [savingExpense, setSavingExpense] = useState(false);
  const [editingExpense, setEditingExpense] = useState<OrderDailyExpense | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editRemark, setEditRemark] = useState('');
  const [editError, setEditError] = useState('');
  const [updatingExpense, setUpdatingExpense] = useState(false);
  const [expensePendingDeletion, setExpensePendingDeletion] = useState<OrderDailyExpense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState(false);

  useEffect(() => {
    onSelectedDateChange?.(selectedDate);
  }, [onSelectedDateChange, selectedDate]);

  const selectedCashCount = useMemo(
    () => cashCounts.find((record) => record.recordDate === selectedDate) ?? null,
    [cashCounts, selectedDate]
  );
  const selectedExpenses = useMemo(
    () => filterOrderExpensesByDate(dailyExpenses, selectedDate).sort((left, right) => right.createdAt.toMillis() - left.createdAt.toMillis()),
    [dailyExpenses, selectedDate]
  );
  const expenseTotal = useMemo(
    () => selectedExpenses.reduce((total, expense) => total + expense.amount, 0),
    [selectedExpenses]
  );
  const draftCashTotal = useMemo(() => {
    try {
      return calculateCashTotal(draftToCashCounts(cashDraft));
    } catch {
      return 0;
    }
  }, [cashDraft]);
  const editCashTotal = useMemo(() => {
    try {
      return calculateCashTotal(draftToCashCounts(editCashDraft));
    } catch {
      return 0;
    }
  }, [editCashDraft]);

  useEffect(() => {
    setCashDraft(cashCountsToDraft(selectedCashCount?.counts ?? createEmptyCashCounts()));
    setCashError('');
    setCashExpanded(false);
    setExpenseDate(selectedDate);
  }, [selectedCashCount, selectedDate]);

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

  const submitCash = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const counts = draftToCashCounts(cashDraft);
      setCashError('');
      setSavingCash(true);
      await saveCashCount(selectedDate, counts);
    } catch (error) {
      setCashError(error instanceof Error ? error.message : 'Impossible d’enregistrer la caisse.');
    } finally {
      setSavingCash(false);
    }
  };

  const submitExpense = async (event: React.FormEvent) => {
    event.preventDefault();
    const amount = Number(expenseAmount);
    const remark = expenseRemark.trim();
    if (!expenseDate || !Number.isInteger(amount) || amount <= 0 || !remark) {
      setExpenseError('Saisissez une date, un montant et une remarque valides.');
      return;
    }
    setExpenseError('');
    setSavingExpense(true);
    const saved = await createDailyExpense(expenseDate, amount, remark);
    setSavingExpense(false);
    if (saved) {
      setSelectedDate(expenseDate);
      setExpenseAmount('');
      setExpenseRemark('');
    }
  };

  const openCashEditor = (cashCount: OrderCashCount) => {
    setEditingCashCount(cashCount);
    setEditCashDraft(cashCountsToDraft(cashCount.counts));
    setEditCashError('');
  };

  const submitCashEdit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingCashCount) return;
    try {
      const counts = draftToCashCounts(editCashDraft);
      setEditCashError('');
      setUpdatingCash(true);
      const saved = await saveCashCount(editingCashCount.recordDate, counts);
      if (saved) setEditingCashCount(null);
    } catch (error) {
      setEditCashError(error instanceof Error ? error.message : 'Impossible de modifier la caisse.');
    } finally {
      setUpdatingCash(false);
    }
  };

  const confirmCashDeletion = async () => {
    if (!cashPendingDeletion) return;
    setDeletingCash(true);
    const deleted = await deleteCashCount(cashPendingDeletion.recordDate);
    setDeletingCash(false);
    if (deleted) {
      setCashPendingDeletion(null);
      setEditingCashCount(null);
      setCashDraft(cashCountsToDraft(createEmptyCashCounts()));
    }
  };

  const openExpenseEditor = (expense: OrderDailyExpense) => {
    setEditingExpense(expense);
    setEditDate(expense.expenseDate);
    setEditAmount(String(expense.amount));
    setEditRemark(expense.remark);
    setEditError('');
  };

  const submitExpenseEdit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingExpense) return;
    const amount = Number(editAmount);
    const remark = editRemark.trim();
    if (!editDate || !Number.isInteger(amount) || amount <= 0 || !remark) {
      setEditError('Saisissez une date, un montant et une remarque valides.');
      return;
    }
    setEditError('');
    setUpdatingExpense(true);
    const saved = await updateDailyExpense(editingExpense.id, editDate, amount, remark);
    setUpdatingExpense(false);
    if (saved) {
      setEditingExpense(null);
      setSelectedDate(editDate);
    }
  };

  const confirmExpenseDeletion = async () => {
    if (!expensePendingDeletion) return;
    setDeletingExpense(true);
    const deleted = await deleteDailyExpense(expensePendingDeletion.id);
    setDeletingExpense(false);
    if (deleted) setExpensePendingDeletion(null);
  };

  return (
    <>
      <div className="space-y-6">
        <header className="page-heading-row">
          <div>
            <span className="eyebrow">SUIVI QUOTIDIEN</span>
            <h1 className="display-title mt-2 text-3xl sm:text-4xl">Gestion comptable</h1>
            <p className="mt-2 text-sm text-stone-500">Comptez la caisse et enregistrez les dépenses de chaque journée.</p>
          </div>
          <label className="rounded-xl border border-stone-200 bg-white px-4 py-3">
            <span className="metric-label mb-1.5 block">Date consultée</span>
            <input type="date" value={selectedDate} onInput={(event) => setSelectedDate(event.currentTarget.value)} className="rounded-lg border-stone-200 bg-stone-50 px-3 py-2 text-sm font-bold text-stone-700" aria-label="Sélectionner la date comptable" />
          </label>
        </header>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.85fr)_minmax(0,1.2fr)]">
          <div className="contents">
            <section className="section-panel p-5 sm:p-6">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="rounded-lg bg-emerald-50 p-2 text-emerald-700"><Banknote size={20} /></span>
                  <div><h2 className="display-title text-lg">Caisse du jour</h2><p className="text-xs font-semibold text-stone-500">{selectedDate}</p></div>
                </div>
                {selectedCashCount && <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">Enregistrée</span>}
              </div>

              <form onSubmit={submitCash}>
                <div className="grid gap-2 sm:grid-cols-2">
                  {CASH_DENOMINATIONS.map((denomination) => {
                    const key = String(denomination) as CashDenominationKey;
                    return (
                      <label key={denomination} className="block min-w-0 rounded-lg border border-stone-200 bg-stone-50/70 p-2">
                        <span className="mb-1 block text-xs font-bold tabular-nums text-stone-700">{denomination.toLocaleString('fr-FR')} XOF</span>
                        <input type="number" inputMode="numeric" min="0" step="1" value={cashDraft[key]} onChange={(event) => setCashDraft((current) => ({ ...current, [key]: event.target.value }))} placeholder="0" className="w-full min-w-0 rounded-md border-stone-200 bg-white px-2.5 py-1.5 text-right font-bold tabular-nums focus:border-emerald-500 focus:ring-emerald-500" aria-label={`Nombre de billets de ${denomination}`} />
                      </label>
                    );
                  })}
                </div>
                <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/70 px-4 py-3">
                  <span className="metric-label block text-emerald-700">Total compté</span>
                  <strong className="customer-order-money mt-1 block text-2xl font-semibold text-emerald-800">{formatCurrency(draftCashTotal)}</strong>
                </div>
                {cashError && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{cashError}</p>}
                <button type="submit" disabled={savingCash} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-[#2e6249] px-4 py-2.5 font-bold text-white hover:bg-[#25513c] disabled:opacity-60"><Save size={17} />{savingCash ? 'Enregistrement...' : selectedCashCount ? 'Enregistrer les modifications' : 'Enregistrer la caisse'}</button>
              </form>
            </section>

            <section className="section-panel p-5 sm:p-6">
              <div className="mb-5 flex items-center gap-3">
                <span className="rounded-lg bg-amber-50 p-2 text-amber-700"><ReceiptText size={20} /></span>
                <div><h2 className="display-title text-lg">Dépense du jour</h2><p className="text-xs text-stone-500">Ajoutez une dépense à la journée.</p></div>
              </div>
              <form onSubmit={submitExpense} className="space-y-4">
                <label className="block"><span className="metric-label mb-2 block">Date</span><input type="date" required value={expenseDate} onChange={(event) => setExpenseDate(event.target.value)} className="w-full rounded-lg border-stone-200 bg-white px-3 py-3 font-bold" /></label>
                <label className="block"><span className="metric-label mb-2 block">Montant (XOF)</span><input type="number" inputMode="numeric" required min="1" step="1" value={expenseAmount} onChange={(event) => setExpenseAmount(event.target.value)} placeholder="0" className="w-full rounded-lg border-stone-200 bg-white px-3 py-3 font-bold" /></label>
                <label className="block"><span className="metric-label mb-2 block">Remarque</span><textarea required maxLength={500} rows={3} value={expenseRemark} onChange={(event) => setExpenseRemark(event.target.value)} placeholder="Ex. transport, repas..." className="w-full resize-none rounded-lg border-stone-200 bg-white px-3 py-3 font-semibold" /></label>
                {expenseError && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{expenseError}</p>}
                <button type="submit" disabled={savingExpense} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#7c3037] px-4 py-3 font-bold text-white hover:bg-[#68272e] disabled:opacity-60"><Save size={17} />{savingExpense ? 'Enregistrement...' : 'Enregistrer la dépense'}</button>
              </form>
            </section>
          </div>

          <section className="section-panel self-start overflow-hidden">
            <div className="section-panel-header">
              <div className="flex items-center gap-3"><span className="rounded-lg bg-violet-50 p-2 text-violet-700"><WalletCards size={20} /></span><div><h2 className="display-title text-lg">Comptes du {selectedDate}</h2><p className="text-xs text-stone-500">Caisse et dépenses enregistrées</p></div></div>
              <div className="text-right"><span className="metric-label block">Dépenses</span><strong className="customer-order-money text-lg text-[#7c3037]">{formatCurrency(expenseTotal)}</strong></div>
            </div>

            <div className="space-y-4 p-4 sm:p-5">
              {selectedCashCount ? (
                <article className="overflow-hidden rounded-xl border border-emerald-100 bg-emerald-50/55">
                  <div className="flex items-center gap-2 p-4">
                    <button type="button" onClick={() => setCashExpanded((current) => !current)} aria-expanded={cashExpanded} className="flex min-w-0 flex-1 items-center justify-between gap-4 text-left">
                      <span className="flex min-w-0 items-center gap-3"><span className="text-emerald-500">{cashExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</span><span><strong className="block text-sm text-stone-900">Caisse enregistrée</strong><span className="mt-0.5 flex items-center gap-1.5 text-xs font-semibold text-stone-500"><CalendarDays size={13} />{selectedCashCount.recordDate}</span></span></span>
                      <strong className="customer-order-money shrink-0 text-lg text-emerald-700">{formatCurrency(selectedCashCount.totalAmount)}</strong>
                    </button>
                    <button type="button" onClick={() => openCashEditor(selectedCashCount)} className="rounded-lg p-2 text-sky-600 hover:bg-white" aria-label="Modifier la caisse"><Pencil size={16} /></button>
                    <button type="button" onClick={() => setCashPendingDeletion(selectedCashCount)} className="rounded-lg p-2 text-rose-600 hover:bg-white" aria-label="Supprimer la caisse"><Trash2 size={16} /></button>
                  </div>
                  {cashExpanded && <div className="border-t border-emerald-100 bg-white/75 p-4"><div className="grid gap-2 sm:grid-cols-2">{CASH_DENOMINATIONS.map((denomination) => { const key = String(denomination) as CashDenominationKey; return <div key={denomination} className="flex items-center justify-between rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm"><span className="font-semibold text-stone-500">{denomination.toLocaleString('fr-FR')} XOF</span><strong className="tabular-nums text-stone-800">{selectedCashCount.counts[key]} billet{selectedCashCount.counts[key] === 1 ? '' : 's'}</strong></div>; })}</div></div>}
                </article>
              ) : (
                <div className="rounded-xl border border-dashed border-stone-200 px-5 py-8 text-center"><Calculator size={28} className="mx-auto text-stone-300" /><p className="mt-3 text-sm font-bold text-stone-600">Aucune caisse enregistrée</p><p className="mt-1 text-xs text-stone-400">Saisissez les billets pour cette date.</p></div>
              )}

              <div className="space-y-3">
                {selectedExpenses.map((expense) => (
                  <article key={expense.id} className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white p-4">
                    <span className="rounded-lg bg-amber-50 p-2 text-amber-700"><ReceiptText size={18} /></span>
                    <span className="min-w-0 flex-1"><strong className="block truncate text-sm text-stone-900">{expense.remark}</strong><span className="mt-0.5 flex items-center gap-1.5 text-xs font-semibold text-stone-500"><CalendarDays size={13} />{expense.expenseDate}</span></span>
                    <strong className="customer-order-money shrink-0 text-base text-[#7c3037]">{formatCurrency(expense.amount)}</strong>
                    <button type="button" onClick={() => openExpenseEditor(expense)} className="rounded-lg p-2 text-sky-600 hover:bg-stone-50" aria-label={`Modifier la dépense ${expense.remark}`}><Pencil size={16} /></button>
                    <button type="button" onClick={() => setExpensePendingDeletion(expense)} className="rounded-lg p-2 text-rose-600 hover:bg-rose-50" aria-label={`Supprimer la dépense ${expense.remark}`}><Trash2 size={16} /></button>
                  </article>
                ))}
                {selectedExpenses.length === 0 && <div className="rounded-xl border border-dashed border-stone-200 px-5 py-8 text-center"><ReceiptText size={28} className="mx-auto text-stone-300" /><p className="mt-3 text-sm font-bold text-stone-600">Aucune dépense enregistrée</p></div>}
              </div>
            </div>
          </section>
        </div>
      </div>

      {editingCashCount && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 p-4"><div role="dialog" aria-modal="true" aria-labelledby="cash-editor-title" className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-[#fffefa] p-6 shadow-2xl sm:p-7"><div className="flex items-center justify-between gap-4"><div><h2 id="cash-editor-title" className="display-title text-2xl">Modifier la caisse</h2><p className="mt-1 text-sm font-semibold text-stone-500">{editingCashCount.recordDate}</p></div><button type="button" onClick={() => setEditingCashCount(null)} disabled={updatingCash} className="rounded-lg p-2 text-stone-500 hover:bg-stone-100" aria-label="Fermer"><X size={20} /></button></div><form onSubmit={submitCashEdit} className="mt-6"><div className="grid gap-3 sm:grid-cols-2">{CASH_DENOMINATIONS.map((denomination) => { const key = String(denomination) as CashDenominationKey; return <label key={denomination} className="block rounded-lg border border-stone-200 bg-stone-50/70 p-3"><span className="metric-label mb-2 block">{denomination.toLocaleString('fr-FR')} XOF</span><input type="number" inputMode="numeric" min="0" step="1" value={editCashDraft[key]} onChange={(event) => setEditCashDraft((current) => ({ ...current, [key]: event.target.value }))} placeholder="0" className="w-full rounded-lg border-stone-200 bg-white px-3 py-2.5 text-right font-bold tabular-nums focus:border-emerald-500 focus:ring-emerald-500" aria-label={`Modifier le nombre de billets de ${denomination}`} /></label>; })}</div><div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/70 px-4 py-3"><span className="metric-label block text-emerald-700">Total compté</span><strong className="customer-order-money mt-1 block text-2xl font-semibold text-emerald-800">{formatCurrency(editCashTotal)}</strong></div>{editCashError && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{editCashError}</p>}<div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" onClick={() => setEditingCashCount(null)} disabled={updatingCash} className="rounded-lg border border-stone-200 bg-white px-5 py-3 font-bold text-stone-600">Annuler</button><button type="submit" disabled={updatingCash} className="flex items-center justify-center gap-2 rounded-lg bg-[#2e6249] px-5 py-3 font-bold text-white disabled:opacity-60"><Save size={17} />{updatingCash ? 'Enregistrement...' : 'Enregistrer'}</button></div></form></div></div>}

      {cashPendingDeletion && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-4"><div role="alertdialog" aria-modal="true" aria-labelledby="cash-delete-title" className="w-full max-w-md rounded-xl bg-[#fffefa] p-6 shadow-2xl sm:p-7"><h2 id="cash-delete-title" className="display-title text-2xl">Supprimer cette caisse ?</h2><p className="mt-3 text-sm leading-6 text-stone-500">{cashPendingDeletion.recordDate} · {formatCurrency(cashPendingDeletion.totalAmount)}</p><p className="mt-1 text-sm font-semibold text-rose-600">Cette action est définitive. Vous pourrez ensuite refaire la saisie.</p><div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" onClick={() => setCashPendingDeletion(null)} disabled={deletingCash} className="rounded-lg border border-stone-200 bg-white px-5 py-3 font-bold text-stone-600">Annuler</button><button type="button" onClick={confirmCashDeletion} disabled={deletingCash} className="flex items-center justify-center gap-2 rounded-lg bg-rose-600 px-5 py-3 font-bold text-white disabled:opacity-60"><Trash2 size={17} />{deletingCash ? 'Suppression...' : 'Supprimer'}</button></div></div></div>}

      {editingExpense && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 p-4"><div role="dialog" aria-modal="true" aria-labelledby="expense-editor-title" className="w-full max-w-lg rounded-xl bg-[#fffefa] p-6 shadow-2xl sm:p-7"><div className="flex items-center justify-between gap-4"><h2 id="expense-editor-title" className="display-title text-2xl">Modifier la dépense</h2><button type="button" onClick={() => setEditingExpense(null)} disabled={updatingExpense} className="rounded-lg p-2 text-stone-500 hover:bg-stone-100" aria-label="Fermer"><X size={20} /></button></div><form onSubmit={submitExpenseEdit} className="mt-6 space-y-4"><label className="block"><span className="metric-label mb-2 block">Date</span><input type="date" required value={editDate} onChange={(event) => setEditDate(event.target.value)} className="w-full rounded-lg border-stone-200 px-3 py-3 font-bold" /></label><label className="block"><span className="metric-label mb-2 block">Montant (XOF)</span><input type="number" inputMode="numeric" required min="1" step="1" value={editAmount} onChange={(event) => setEditAmount(event.target.value)} className="w-full rounded-lg border-stone-200 px-3 py-3 font-bold" /></label><label className="block"><span className="metric-label mb-2 block">Remarque</span><textarea required maxLength={500} rows={3} value={editRemark} onChange={(event) => setEditRemark(event.target.value)} className="w-full resize-none rounded-lg border-stone-200 px-3 py-3 font-semibold" /></label>{editError && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{editError}</p>}<div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end"><button type="button" onClick={() => setEditingExpense(null)} disabled={updatingExpense} className="rounded-lg border border-stone-200 bg-white px-5 py-3 font-bold text-stone-600">Annuler</button><button type="submit" disabled={updatingExpense} className="flex items-center justify-center gap-2 rounded-lg bg-[#7c3037] px-5 py-3 font-bold text-white disabled:opacity-60"><Save size={17} />{updatingExpense ? 'Enregistrement...' : 'Enregistrer'}</button></div></form></div></div>}

      {expensePendingDeletion && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-4"><div role="alertdialog" aria-modal="true" aria-labelledby="expense-delete-title" className="w-full max-w-md rounded-xl bg-[#fffefa] p-6 shadow-2xl sm:p-7"><h2 id="expense-delete-title" className="display-title text-2xl">Supprimer cette dépense ?</h2><p className="mt-3 text-sm leading-6 text-stone-500">{expensePendingDeletion.remark} · {formatCurrency(expensePendingDeletion.amount)}</p><p className="mt-1 text-sm font-semibold text-rose-600">Cette action est définitive.</p><div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" onClick={() => setExpensePendingDeletion(null)} disabled={deletingExpense} className="rounded-lg border border-stone-200 bg-white px-5 py-3 font-bold text-stone-600">Annuler</button><button type="button" onClick={confirmExpenseDeletion} disabled={deletingExpense} className="flex items-center justify-center gap-2 rounded-lg bg-rose-600 px-5 py-3 font-bold text-white disabled:opacity-60"><Trash2 size={17} />{deletingExpense ? 'Suppression...' : 'Supprimer'}</button></div></div></div>}
    </>
  );
}
