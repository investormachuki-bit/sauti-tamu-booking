"use client";

import { Loader2, Save, X } from "lucide-react";
import type { PaymentMethod } from "./students-types";

export interface EditablePayment {
  id: string;
  amount: number | string;
  payment_date: string;
  payment_method: PaymentMethod;
  reference: string | null;
  notes: string | null;
}

interface EditPaymentModalProps {
  payment: EditablePayment | null;
  amount: string;
  setAmount: (value: string) => void;
  paymentDate: string;
  setPaymentDate: (value: string) => void;
  method: PaymentMethod;
  setMethod: (value: PaymentMethod) => void;
  reference: string;
  setReference: (value: string) => void;
  notes: string;
  setNotes: (value: string) => void;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: () => void;
}

export default function EditPaymentModal({
  payment,
  amount,
  setAmount,
  paymentDate,
  setPaymentDate,
  method,
  setMethod,
  reference,
  setReference,
  notes,
  setNotes,
  saving,
  error,
  onClose,
  onSave,
}: EditPaymentModalProps) {
  if (!payment) return null;

  return (
    <div className="fixed inset-0 z-[140] flex items-end justify-center bg-black/50 sm:items-center sm:p-5">
      <div className="flex max-h-[92vh] w-full max-w-[520px] flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-[var(--st-border)] px-5 py-4">
          <div>
            <p className="st-eyebrow">STUDENT FINANCIAL MANAGEMENT</p>
            <h2 className="mt-1 text-lg font-bold text-[var(--st-charcoal-dark)]">Edit Payment</h2>
            <p className="mt-1 text-xs text-[var(--st-gray)]">Update the recorded payment details.</p>
          </div>
          <button type="button" onClick={onClose} disabled={saving} className="st-icon-button" aria-label="Close edit payment">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto p-5">
          {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
          <div>
            <label className="st-label">Amount paid (KES)</label>
            <input type="number" min="1" step="1" value={amount} onChange={(event) => setAmount(event.target.value)} disabled={saving} className="st-input w-full" />
          </div>
          <div>
            <label className="st-label">Payment date</label>
            <input type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} disabled={saving} className="st-input w-full" />
          </div>
          <div>
            <label className="st-label">Payment method</label>
            <select value={method} onChange={(event) => setMethod(event.target.value as PaymentMethod)} disabled={saving} className="st-input w-full">
              <option value="mpesa">M-Pesa</option>
              <option value="cash">Cash</option>
              <option value="bank">Bank</option>
              <option value="card">Card</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="st-label">Transaction reference</label>
            <input type="text" value={reference} onChange={(event) => setReference(event.target.value)} disabled={saving} className="st-input w-full" placeholder="M-Pesa code or bank reference" />
          </div>
          <div>
            <label className="st-label">Payment notes</label>
            <textarea value={notes} onChange={(event) => setNotes(event.target.value)} disabled={saving} rows={3} className="st-input w-full resize-y" placeholder="Optional payment notes" />
          </div>
        </div>

        <div className="flex gap-2 border-t border-[var(--st-border)] px-5 py-4">
          <button type="button" onClick={onClose} disabled={saving} className="st-button st-button-secondary flex-1"><X size={15} /> Cancel</button>
          <button type="button" onClick={onSave} disabled={saving} className="st-button st-button-primary flex-1">
            {saving ? <><Loader2 size={15} className="animate-spin" /> Saving...</> : <><Save size={15} /> Save Payment</>}
          </button>
        </div>
      </div>
    </div>
  );
}
