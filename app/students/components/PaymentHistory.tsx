import {
  Download,
  Eye,
  Mail,
  Wallet,
} from "lucide-react";

type Payment = {
  id: string;
  amount: number | string;
  payment_date: string;
  payment_method: string;
  reference?: string | null;
};

type Student = {
  student: {
    id: string;
    full_name: string;
  };
  payments: Payment[];
};

type PaymentHistoryProps = {
  student: Student;
  formatCurrency: (amount: number) => string;
  formatDate: (date: string) => string;
  viewReceipt: (
    student: Student,
    payment: Payment
  ) => void;
  downloadReceipt: (
    student: Student,
    payment: Payment
  ) => void;
  emailReceipt: (
    student: Student,
    payment: Payment
  ) => void;
};

export default function PaymentHistory({
  student,
  formatCurrency,
  formatDate,
  viewReceipt,
  downloadReceipt,
  emailReceipt,
}: PaymentHistoryProps) {
  return (
    <div className="mt-6">

      <div className="flex items-center justify-between">

        <p className="m-0 text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--st-gray)]">
          Payment history
        </p>

        <span className="text-[9px] text-[var(--st-gray)]">
          {student.payments.length} payments
        </span>

      </div>

      {student.payments.length === 0 ? (
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

          {student.payments.map((payment) => (
            <div
              key={payment.id}
              className="flex items-center justify-between gap-3 p-3"
            >

              <div className="min-w-0">

                <p className="m-0 text-[11px] font-bold text-[var(--st-charcoal-dark)]">
                  {formatCurrency(
                    Number(payment.amount)
                  )}
                </p>

                <p className="mt-1 text-[9px] text-[var(--st-gray)]">
                  {formatDate(payment.payment_date)}{" "}
                  ·{" "}
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
                    viewReceipt(student, payment)
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
                    downloadReceipt(student, payment)
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
                    emailReceipt(student, payment)
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
  );
}