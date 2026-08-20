"use client";

import {
  Check,
  ChevronDown,
  RefreshCw,
  Wallet,
  X,
} from "lucide-react";

export type PaymentMethod =
  | "mpesa"
  | "cash"
  | "bank"
  | "card"
  | "other";

type PaymentStudent = {
  student: {
    id: string;
    full_name: string;
  };
  enrollment?: any;
  payments: any[];
};

type PaymentModalProps = {
  selectedStudent: PaymentStudent;
  paymentAmount: string;
  setPaymentAmount: (value: string) => void;

  paymentMethod: PaymentMethod;
  setPaymentMethod: (value: PaymentMethod) => void;

  paymentReference: string;
  setPaymentReference: (value: string) => void;

  showPaymentForm: boolean;
  setShowPaymentForm: (value: boolean) => void;

  updatingId: string | null;
  recordPayment: () => void;

  error: string | null;

  formatCurrency: (amount: number) => string;
  getBalance: (
    enrollment: any,
    payments: any[]
  ) => number;
};

export default function PaymentModal({
  selectedStudent,
  paymentAmount,
  setPaymentAmount,
  paymentMethod,
  setPaymentMethod,
  paymentReference,
  setPaymentReference,
  showPaymentForm,
  setShowPaymentForm,
  updatingId,
  recordPayment,
  error,
  formatCurrency,
  getBalance,
}: PaymentModalProps) {
  if (!showPaymentForm) {
    return null;
  }

  const isRecording =
    updatingId === selectedStudent.student.id;

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/50 sm:items-center sm:p-5">
      <div className="w-full max-w-[430px] rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl">

        {/* HEADER */}

        <div className="flex items-center justify-between gap-4">

          <div>
            <p className="st-eyebrow">
              RECEIVE PAYMENT
            </p>

            <h2 className="mt-1 text-[20px] font-bold text-[var(--st-charcoal-dark)]">
              Receive payment
            </h2>

            <p className="mt-1 text-[10px] text-[var(--st-gray)]">
              {selectedStudent.student.full_name}
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              setShowPaymentForm(false)
            }
            disabled={isRecording}
            className="st-icon-button disabled:opacity-40"
            aria-label="Close payment form"
            title="Close"
          >
            <X size={17} />
          </button>

        </div>

        {/* PAYMENT FIELDS */}

        <div className="mt-6 space-y-4">

          {/* AMOUNT */}

          <div>
            <label className="mb-2 block text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--st-charcoal)]">
              Amount
            </label>

            <input
              type="number"
              min="1"
              value={paymentAmount}
              onChange={(event) =>
                setPaymentAmount(
                  event.target.value
                )
              }
              placeholder="e.g. 5000"
              disabled={isRecording}
              className="w-full rounded-xl border border-[var(--st-border)] px-4 py-3.5 text-[13px] font-semibold outline-none focus:border-[var(--st-red)] focus:ring-2 focus:ring-[var(--st-red)]/10 disabled:bg-[var(--st-bg-soft)]"
            />
          </div>

          {/* PAYMENT METHOD */}

          <div>
            <label className="mb-2 block text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--st-charcoal)]">
              Payment method
            </label>

            <div className="relative">

              <select
                value={paymentMethod}
                onChange={(event) =>
                  setPaymentMethod(
                    event.target.value as PaymentMethod
                  )
                }
                disabled={isRecording}
                className="w-full appearance-none rounded-xl border border-[var(--st-border)] bg-white px-4 py-3.5 text-[11px] font-semibold outline-none focus:border-[var(--st-red)] disabled:bg-[var(--st-bg-soft)]"
              >
                <option value="mpesa">
                  M-Pesa
                </option>

                <option value="cash">
                  Cash
                </option>

                <option value="bank">
                  Bank
                </option>

                <option value="card">
                  Card
                </option>

                <option value="other">
                  Other
                </option>
              </select>

              <ChevronDown
                size={15}
                className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[var(--st-gray)]"
              />

            </div>
          </div>

          {/* REFERENCE */}

          <div>
            <label className="mb-2 block text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--st-charcoal)]">
              Reference
            </label>

            <input
              type="text"
              value={paymentReference}
              onChange={(event) =>
                setPaymentReference(
                  event.target.value
                )
              }
              placeholder="M-Pesa transaction code"
              disabled={isRecording}
              className="w-full rounded-xl border border-[var(--st-border)] px-4 py-3.5 text-[11px] outline-none focus:border-[var(--st-red)] disabled:bg-[var(--st-bg-soft)]"
            />
          </div>

        </div>

        {/* CURRENT BALANCE */}

        {selectedStudent.enrollment && (
          <div className="mt-4 rounded-xl bg-[var(--st-bg-soft)] p-3">

            <div className="flex items-center justify-between gap-3">

              <span className="text-[9px] text-[var(--st-gray)]">
                Current balance
              </span>

              <span className="text-[11px] font-bold text-[var(--st-red)]">
                {formatCurrency(
                  getBalance(
                    selectedStudent.enrollment,
                    selectedStudent.payments
                  )
                )}
              </span>

            </div>

          </div>
        )}

        {/* ERROR */}

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3">

            <p className="m-0 text-[10px] text-red-700">
              {error}
            </p>

          </div>
        )}

        {/* SUBMIT */}

        <button
          type="button"
          onClick={recordPayment}
          disabled={isRecording}
          className="st-button st-button-primary mt-6 w-full disabled:opacity-60"
        >
          {isRecording ? (
            <>
              <RefreshCw
                size={15}
                className="animate-spin"
              />
              Recording...
            </>
          ) : (
            <>
              <Check size={15} />
              Record payment
            </>
          )}
        </button>

      </div>
    </div>
  );
}