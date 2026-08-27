import { useEffect, useState } from 'react';
import { CalendarDays, Pencil, Plus, ReceiptText, Trash2, X } from 'lucide-react';
import { collection, onSnapshot, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import type { DebtPayment, DebtPaymentTarget } from '../types';
import { getDebtPaymentKey } from '../lib/debtPayments';
import { getTogoOrderDate } from '../lib/customerOrders';

type Language = 'zh' | 'fr';

function mapDebtPayment(id: string, data: Record<string, unknown>): DebtPayment {
  const createdAt = data.createdAt instanceof Timestamp ? data.createdAt : Timestamp.fromMillis(0);
  return {
    id,
    debtSource: data.debtSource === 'manual' ? 'manual' : 'customer-order',
    debtId: String(data.debtId ?? ''),
    debtKey: String(data.debtKey ?? ''),
    amount: Number(data.amount ?? 0),
    paymentDate: String(data.paymentDate ?? ''),
    operatorUid: String(data.operatorUid ?? ''),
    createdAt,
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt : createdAt
  };
}

export function DebtPaymentHistory({
  target,
  formatCurrency,
  language,
  editable,
  onEdit,
  onDelete
}: {
  target: DebtPaymentTarget;
  formatCurrency: (value: number) => string;
  language: Language;
  editable: boolean;
  onEdit: (payment: DebtPayment) => void;
  onDelete: (payment: DebtPayment) => Promise<boolean>;
}) {
  const [payments, setPayments] = useState<DebtPayment[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const copy = language === 'fr'
    ? { title: 'Historique des encaissements', empty: 'Aucun encaissement enregistré depuis cette amélioration.', edit: 'Modifier l’encaissement', remove: 'Supprimer l’encaissement', confirm: 'Supprimer cet encaissement ? Le total déjà payé sera recalculé.' }
    : { title: '回款明细', empty: '暂无新录入的回款记录。', edit: '编辑回款', remove: '删除回款', confirm: '确定删除这笔回款吗？累计已还和结清状态会自动重算。' };

  useEffect(() => {
    const paymentQuery = query(
      collection(db, 'debtPayments'),
      where('debtSource', '==', target.debtSource),
      where('debtKey', '==', getDebtPaymentKey(target.debtSource, target.debtId))
    );
    return onSnapshot(paymentQuery, (snapshot) => {
      setPayments(snapshot.docs
        .map((itemDoc) => mapDebtPayment(itemDoc.id, itemDoc.data()))
        .sort((left, right) => right.paymentDate.localeCompare(left.paymentDate) || right.createdAt.toMillis() - left.createdAt.toMillis()));
    });
  }, [target.debtId, target.debtSource]);

  return (
    <section className="mt-4 rounded-xl border border-stone-200 bg-white p-3.5">
      <div className="mb-2 flex items-center gap-2 text-xs font-bold text-slate-600">
        <ReceiptText size={15} className="text-emerald-600" />
        {copy.title}
      </div>
      {payments.length === 0 ? (
        <p className="text-xs font-medium text-slate-400">{copy.empty}</p>
      ) : (
        <div className="divide-y divide-stone-100">
          {payments.map((payment) => (
            <div key={payment.id} className="flex items-center gap-2 py-2.5 text-sm">
              <span className="flex min-w-0 flex-1 items-center gap-1.5 font-semibold text-slate-500"><CalendarDays size={14} />{payment.paymentDate}</span>
              <strong className="shrink-0 text-emerald-700">{formatCurrency(payment.amount)}</strong>
              {editable && (
                <span className="ml-1 inline-flex shrink-0 gap-1">
                  <button type="button" onClick={() => onEdit(payment)} aria-label={copy.edit} title={copy.edit} className="rounded-lg p-1.5 text-sky-600 hover:bg-sky-50"><Pencil size={14} /></button>
                  <button
                    type="button"
                    disabled={deletingId !== null}
                    onClick={async () => {
                      if (!window.confirm(copy.confirm)) return;
                      setDeletingId(payment.id);
                      await onDelete(payment);
                      setDeletingId(null);
                    }}
                    aria-label={copy.remove}
                    title={copy.remove}
                    className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50 disabled:opacity-40"
                  ><Trash2 size={14} /></button>
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function DebtPaymentDialog({
  target,
  payment,
  formatCurrency,
  language,
  onClose,
  onSave
}: {
  target: DebtPaymentTarget;
  payment: DebtPayment | null;
  formatCurrency: (value: number) => string;
  language: Language;
  onClose: () => void;
  onSave: (amount: number, paymentDate: string, paymentId?: string) => Promise<boolean>;
}) {
  const [amount, setAmount] = useState(payment ? String(payment.amount) : '');
  const [paymentDate, setPaymentDate] = useState(payment?.paymentDate ?? getTogoOrderDate());
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const maxAmount = target.amount - target.paidAmount + (payment?.amount ?? 0);
  const remainingAmount = Math.max(0, target.amount - target.paidAmount);
  const copy = language === 'fr'
    ? { title: payment ? 'Modifier l’encaissement' : 'Enregistrer un encaissement', original: 'Dette initiale', paid: 'Déjà payé', remaining: 'Reste à recevoir', amount: 'Montant encaissé', date: 'Date d’encaissement', cancel: 'Annuler', save: payment ? 'Enregistrer les modifications' : 'Confirmer l’encaissement', error: 'Saisissez un montant entier supérieur à 0 et inférieur ou égal au reste.' }
    : { title: payment ? '编辑回款' : '登记收款', original: '原欠款', paid: '历史累计已还', remaining: '当前剩余', amount: '本次收款金额', date: '收款日期', cancel: '取消', save: payment ? '保存修改' : '确认收款', error: '请输入大于 0 且不超过当前剩余金额的整数。' };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedAmount = Number(amount);
    if (!Number.isInteger(normalizedAmount) || normalizedAmount <= 0 || normalizedAmount > maxAmount || !/^\d{4}-\d{2}-\d{2}$/.test(paymentDate)) {
      setError(copy.error);
      return;
    }
    setSaving(true);
    const saved = await onSave(normalizedAmount, paymentDate, payment?.id);
    setSaving(false);
    if (saved) onClose();
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/35 p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="debt-payment-dialog-title" className="w-full max-w-md rounded-xl border border-stone-200 bg-[#fffefa] p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="debt-payment-dialog-title" className="display-title text-2xl">{copy.title}</h2>
            <p className="mt-1 text-sm font-semibold text-stone-500">{target.customerName}</p>
          </div>
          <button type="button" onClick={onClose} disabled={saving} aria-label={copy.cancel} className="rounded-lg p-2 text-stone-500 hover:bg-stone-100"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div className="grid grid-cols-3 gap-2 rounded-xl border border-stone-200 bg-stone-50 p-3 text-center">
            <div><span className="metric-label block">{copy.original}</span><strong className="mt-1 block text-sm text-amber-700">{formatCurrency(target.amount)}</strong></div>
            <div><span className="metric-label block">{copy.paid}</span><strong className="mt-1 block text-sm text-sky-700">{formatCurrency(target.paidAmount)}</strong></div>
            <div><span className="metric-label block">{copy.remaining}</span><strong className="mt-1 block text-sm text-rose-700">{formatCurrency(remainingAmount)}</strong></div>
          </div>
          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-widest text-stone-500">{copy.amount}</span>
            <input type="number" required autoFocus inputMode="numeric" min="1" max={maxAmount} step="1" value={amount} onChange={(event) => setAmount(event.target.value)} className="w-full rounded-lg border-stone-200 bg-white px-3 py-3 font-bold focus:border-emerald-600 focus:ring-emerald-600" />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-widest text-stone-500">{copy.date}</span>
            <input type="date" required value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} className="w-full rounded-lg border-stone-200 bg-white px-3 py-3 font-bold focus:border-emerald-600 focus:ring-emerald-600" />
          </label>
          {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} disabled={saving} className="flex-1 rounded-lg border border-stone-200 bg-white py-3 font-bold text-stone-600">{copy.cancel}</button>
            <button type="submit" disabled={saving} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 py-3 font-bold text-white hover:bg-emerald-700 disabled:opacity-60"><Plus size={17} />{saving ? '…' : copy.save}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
