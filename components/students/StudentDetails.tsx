"use client";

import {
  CalendarDays,
  Clock3,
  Download,
  Eye,
  Mail,
  MessageCircle,
  Phone,
  Wallet,
} from "lucide-react";

type PaymentMethod =
  | "mpesa"
  | "cash"
  | "bank"
  | "card"
  | "other";

type Payment = {
  id: string;
  amount: number | string;
  payment_date: string;
  payment_method: PaymentMethod | string;
  reference?: string | null;
};

type Student = {
  student: {
    id: string;
    full_name: string;
    whatsapp?: string | null;
    email?: string | null;
    notes?: string | null;
  };

  enrollment?: {
    id?: string;
    instrument?: string | null;
    programme_name?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    total_fee?: number | string | null;
  } | null;

  payments: Payment[];
};

interface StudentDetailsProps {
  selectedStudent: Student;

  formatCurrency: (amount: number) => string;
  formatDate: (date: string | null | undefined) => string;

  getBalance: (
    enrollment: NonNullable<Student["enrollment"]>,
    payments: Payment[],
  ) => number;

  instrumentName: (instrument: string | null | undefined) => string;

  viewReceipt: (
    student: Student,
    payment: Payment,
  ) => void;

  downloadReceipt: (
    student: Student,
    payment: Payment,
  ) => void;

  emailReceipt: (
    student: Student,
    payment: Payment,
  ) => void;

  openWhatsApp: (student: Student) => void;
  callStudent: (student: Student) => void;
  emailStudent: (student: Student) => void;

  setShowPaymentForm: (show: boolean) => void;
}

export default function StudentDetails({
  selectedStudent,
  formatCurrency,
  formatDate,
  getBalance,
  instrumentName,
  viewReceipt,
  downloadReceipt,
  emailReceipt,
  openWhatsApp,
  callStudent,
  emailStudent,
  setShowPaymentForm,
}: StudentDetailsProps) {
  const enrollment = selectedStudent.enrollment;

  const totalFee = enrollment?.total_fee
    ? Number(enrollment.total_fee)
    : 0;

  const totalPaid = selectedStudent.payments.reduce(
    (total, payment) =>
      total + Number(payment.amount || 0),
    0,
  );

  const balance = enrollment
    ? getBalance(enrollment, selectedStudent.payments)
    : 0;

  return (
    <div className="space-y-6">
      {/* =====================================================
          STUDENT HEADER
      ===================================================== */}

      <div className="rounded-2xl border border-[var(--st-border)] bg-white p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--st-bg-soft)]">
            <span className="text-[13px] font-bold text-[var(--st-red)]">
              {selectedStudent.student.full_name
                .split(" ")
                .map((name) => name.charAt(0))
                .slice(0, 2)
                .join("")
                .toUpperCase()}
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="m-0 truncate text-[16px] font-bold text-[var(--st-charcoal-dark)]">
              {selectedStudent.student.full_name}
            </h2>

            <p className="mt-1 mb-0 text-[9px] text-[var(--st-gray)]">
              {enrollment
                ? instrumentName(enrollment.instrument)
                : "No active programme"}
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="rounded-xl bg-[var(--st-bg-soft)] p-3">
            <p className="m-0 text-[8px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
              WhatsApp
            </p>

            <p className="mt-1 mb-0 truncate text-[10px] font-semibold text-[var(--st-charcoal-dark)]">
              {selectedStudent.student.whatsapp || "—"}
            </p>
          </div>

          <div className="rounded-xl bg-[var(--st-bg-soft)] p-3">
            <p className="m-0 text-[8px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
              Email
            </p>

            <p className="mt-1 mb-0 truncate text-[10px] font-semibold text-[var(--st-charcoal-dark)]">
              {selectedStudent.student.email || "—"}
            </p>
          </div>
        </div>
      </div>

      {/* =====================================================
          PROGRAMME
      ===================================================== */}

      <div>
        <div className="flex items-center justify-between">
          <p className="m-0 text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--st-gray)]">
            Programme
          </p>

          {enrollment && (
            <span className="rounded-full bg-green-50 px-2 py-1 text-[8px] font-bold uppercase text-green-700">
              Active
            </span>
          )}
        </div>

        {!enrollment ? (
          <div className="mt-3 rounded-xl border border-dashed border-[var(--st-border)] p-5 text-center">
            <CalendarDays
              size={18}
              className="mx-auto text-[var(--st-gray)]"
            />

            <p className="mt-2 mb-0 text-[10px] text-[var(--st-gray)]">
              No programme information recorded.
            </p>
          </div>
        ) : (
          <div className="mt-3 rounded-xl border border-[var(--st-border)]">
            <div className="p-4">
              <p className="m-0 text-[13px] font-bold text-[var(--st-charcoal-dark)]">
                {enrollment.programme_name ||
                  instrumentName(enrollment.instrument)}
              </p>

              <p className="mt-1 mb-0 text-[9px] text-[var(--st-gray)]">
                {instrumentName(enrollment.instrument)}
              </p>
            </div>

            <div className="grid grid-cols-2 divide-x border-t border-[var(--st-border)]">
              <div className="p-3">
                <p className="m-0 text-[8px] font-bold uppercase tracking-[0.06em] text-[var(--st-gray)]">
                  Start date
                </p>

                <div className="mt-1 flex items-center gap-1.5">
                  <CalendarDays
                    size={12}
                    className="text-[var(--st-red)]"
                  />

                  <p className="m-0 text-[9px] font-semibold text-[var(--st-charcoal-dark)]">
                    {formatDate(enrollment.start_date)}
                  </p>
                </div>
              </div>

              <div className="p-3">
                <p className="m-0 text-[8px] font-bold uppercase tracking-[0.06em] text-[var(--st-gray)]">
                  End date
                </p>

                <div className="mt-1 flex items-center gap-1.5">
                  <Clock3
                    size={12}
                    className="text-[var(--st-red)]"
                  />

                  <p className="m-0 text-[9px] font-semibold text-[var(--st-charcoal-dark)]">
                    {formatDate(enrollment.end_date)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* =====================================================
          PAYMENT SUMMARY
      ===================================================== */}

      {enrollment && (
        <div>
          <p className="m-0 text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--st-gray)]">
            Payment summary
          </p>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-[var(--st-border)] p-3">
              <p className="m-0 text-[8px] font-bold uppercase tracking-[0.05em] text-[var(--st-gray)]">
                Total fee
              </p>

              <p className="mt-2 text-[12px] font-bold text-[var(--st-charcoal-dark)]">
                {formatCurrency(totalFee)}
              </p>
            </div>

            <div className="rounded-xl border border-[var(--st-border)] p-3">
              <p className="m-0 text-[8px] font-bold uppercase tracking-[0.05em] text-[var(--st-gray)]">
                Paid
              </p>

              <p className="mt-2 text-[12px] font-bold text-green-700">
                {formatCurrency(totalPaid)}
              </p>
            </div>

            <div className="rounded-xl border border-[var(--st-border)] p-3">
              <p className="m-0 text-[8px] font-bold uppercase tracking-[0.05em] text-[var(--st-gray)]">
                Balance
              </p>

              <p className="mt-2 text-[12px] font-bold text-[var(--st-red)]">
                {formatCurrency(balance)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          NOTES
      ===================================================== */}

      {selectedStudent.student.notes && (
        <div>
          <p className="m-0 text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--st-gray)]">
            Notes
          </p>

          <div className="mt-3 rounded-xl bg-[var(--st-bg-soft)] p-3">
            <p className="m-0 text-[10px] leading-relaxed text-[var(--st-charcoal-dark)]">
              {selectedStudent.student.notes}
            </p>
          </div>
        </div>
      )}

      {/* =====================================================
          PAYMENT HISTORY
      ===================================================== */}

      <div>
        <div className="flex items-center justify-between">
          <p className="m-0 text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--st-gray)]">
            Payment history
          </p>

          <span className="text-[9px] text-[var(--st-gray)]">
            {selectedStudent.payments.length} payments
          </span>
        </div>

        {selectedStudent.payments.length === 0 ? (
          <div className="mt-3 rounded-xl border border-dashed border-[var(--st-border)] p-5 text-center">
            <Wallet
              size={18}
              className="mx-auto text-[var(--st-gray)]"
            />

            <p className="mt-2 mb-0 text-[10px] text-[var(--st-gray)]">
              No payments recorded yet.
            </p>
          </div>
        ) : (
          <div className="mt-3 divide-y divide-[var(--st-border)] rounded-xl border border-[var(--st-border)]">
            {selectedStudent.payments.map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between gap-3 p-3"
              >
                <div className="min-w-0">
                  <p className="m-0 text-[11px] font-bold text-[var(--st-charcoal-dark)]">
                    {formatCurrency(Number(payment.amount))}
                  </p>

                  <p className="mt-1 text-[9px] text-[var(--st-gray)]">
                    {formatDate(payment.payment_date)} ·{" "}
                    {payment.payment_method.toUpperCase()}
                  </p>

                  {payment.reference && (
                    <p className="mt-1 max-w-[170px] truncate text-[8px] text-[var(--st-gray)]">
                      Ref: {payment.reference}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      viewReceipt(selectedStudent, payment)
                    }
                    className="st-icon-button"
                    aria-label="View receipt"
                    title="View receipt"
                  >
                    <Eye size={14} />
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      downloadReceipt(selectedStudent, payment)
                    }
                    className="st-icon-button"
                    aria-label="Download receipt"
                    title="Download receipt"
                  >
                    <Download size={14} />
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      emailReceipt(selectedStudent, payment)
                    }
                    className="st-icon-button"
                    aria-label="Email receipt"
                    title="Email receipt"
                  >
                    <Mail size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* =====================================================
          ACTIONS
      ===================================================== */}

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => openWhatsApp(selectedStudent)}
          className="st-button st-button-secondary w-full"
        >
          <MessageCircle size={15} />
          WhatsApp
        </button>

        <button
          type="button"
          onClick={() => callStudent(selectedStudent)}
          className="st-button st-button-secondary w-full"
        >
          <Phone size={15} />
          Call
        </button>

        <button
          type="button"
          onClick={() => emailStudent(selectedStudent)}
          className="st-button st-button-secondary w-full"
        >
          <Mail size={15} />
          Email
        </button>

        <button
          type="button"
          onClick={() => setShowPaymentForm(true)}
          disabled={!selectedStudent.enrollment}
          className="st-button st-button-primary w-full disabled:opacity-40"
        >
          <Wallet size={15} />
          Receive payment
        </button>
      </div>
    </div>
  );
}