"use client";

import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Mail,
  MessageCircle,
  Phone,
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
  id: string;
  full_name: string;
  whatsapp?: string | null;
  email?: string | null;
  notes?: string | null;
};

type Enrollment = {
  id: string;
  instrument?: string | null;
  programme_name?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  total_fee?: number | string | null;
  status?: string | null;
};

export interface StudentListItem {
  student: Student;
  enrollment: Enrollment | null;
  payments: Payment[];
}

interface StudentCardProps {
  student: StudentListItem;

  onViewDetails: (
    student: StudentListItem
  ) => void;

  onWhatsApp?: (
    student: StudentListItem
  ) => void;

  onCall?: (
    student: StudentListItem
  ) => void;

  onEmail?: (
    student: StudentListItem
  ) => void;

  formatCurrency: (
    amount: number
  ) => string;

  formatDate: (
    date: string
  ) => string;

  getBalance: (
    enrollment: Enrollment,
    payments: Payment[]
  ) => number;
}

function instrumentName(
  instrument?: string | null
) {
  if (!instrument) return "—";

  switch (instrument.toLowerCase()) {
    case "piano":
      return "Piano";

    case "guitar":
      return "Acoustic Guitar";

    default:
      return instrument;
  }
}

function getInitials(
  name: string
) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(
      (part) =>
        part.charAt(0).toUpperCase()
    )
    .join("");
}

export default function StudentCard({
  student: selectedStudent,
  onViewDetails,
  onWhatsApp,
  onCall,
  onEmail,
  formatCurrency,
  formatDate,
  getBalance,
}: StudentCardProps) {
  const {
    student,
    enrollment,
    payments,
  } = selectedStudent;

  const totalFee = Number(
    enrollment?.total_fee || 0
  );

  const totalPaid = payments.reduce(
    (total, payment) =>
      total + Number(payment.amount || 0),
    0
  );

  const balance = enrollment
    ? getBalance(
        enrollment,
        payments
      )
    : Math.max(
        totalFee - totalPaid,
        0
      );

  const paymentProgress =
    totalFee > 0
      ? Math.min(
          (totalPaid / totalFee) * 100,
          100
        )
      : 0;

  const isPaidInFull =
    enrollment &&
    totalFee > 0 &&
    balance <= 0;

  return (
    <div className="rounded-2xl border border-[var(--st-border)] bg-white p-4 transition hover:shadow-sm">

      {/* TOP */}

      <div className="flex items-start gap-3">

        {/* AVATAR */}

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--st-bg-soft)] text-[11px] font-bold text-[var(--st-red)]">
          {getInitials(
            student.full_name
          )}
        </div>

        {/* NAME + PROGRAMME */}

        <div className="min-w-0 flex-1">

          <div className="flex items-start justify-between gap-3">

            <div className="min-w-0">

              <h3 className="m-0 truncate text-[13px] font-bold text-[var(--st-charcoal-dark)]">
                {student.full_name}
              </h3>

              <p className="mt-1 truncate text-[9px] text-[var(--st-gray)]">
                {enrollment?.programme_name ||
                  instrumentName(
                    enrollment?.instrument
                  )}
              </p>

            </div>

            {enrollment?.status && (
              <span
                className={`shrink-0 rounded-full px-2 py-1 text-[7px] font-bold capitalize ${
                  enrollment.status
                    .toLowerCase() ===
                  "active"
                    ? "bg-green-50 text-green-700"
                    : "bg-[var(--st-bg-soft)] text-[var(--st-gray)]"
                }`}
              >
                {enrollment.status}
              </span>
            )}

          </div>

        </div>

      </div>

      {/* CONTACT */}

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">

        {student.whatsapp && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onWhatsApp?.(
                selectedStudent
              );
            }}
            className="flex items-center gap-1.5 text-[9px] text-[var(--st-gray)] transition hover:text-[var(--st-red)]"
          >
            <MessageCircle
              size={12}
            />

            <span className="truncate">
              {student.whatsapp}
            </span>
          </button>
        )}

        {student.email && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onEmail?.(
                selectedStudent
              );
            }}
            className="flex min-w-0 items-center gap-1.5 text-[9px] text-[var(--st-gray)] transition hover:text-[var(--st-red)]"
          >
            <Mail size={12} />

            <span className="max-w-[170px] truncate">
              {student.email}
            </span>
          </button>
        )}

      </div>

      {/* PROGRAMME PERIOD */}

      {enrollment && (
        <div className="mt-4 rounded-xl bg-[var(--st-bg-soft)] p-3">

          <div className="flex items-center justify-between gap-3">

            <div className="flex items-center gap-2">

              <CalendarDays
                size={13}
                className="text-[var(--st-red)]"
              />

              <div>

                <p className="m-0 text-[8px] text-[var(--st-gray)]">
                  Programme period
                </p>

                <p className="mt-0.5 text-[9px] font-semibold text-[var(--st-charcoal-dark)]">
                  {enrollment.start_date
                    ? formatDate(
                        enrollment.start_date
                      )
                    : "—"}

                  {" – "}

                  {enrollment.end_date
                    ? formatDate(
                        enrollment.end_date
                      )
                    : "—"}
                </p>

              </div>

            </div>

            <div className="flex items-center gap-1">

              <Clock3
                size={11}
                className="text-[var(--st-gray)]"
              />

              <span className="text-[8px] text-[var(--st-gray)]">
                3 months
              </span>

            </div>

          </div>

        </div>
      )}

      {/* FINANCIAL */}

      {enrollment && (
        <div className="mt-4">

          <div className="flex items-center justify-between gap-3">

            <div>

              <p className="m-0 text-[8px] font-bold uppercase tracking-[0.06em] text-[var(--st-gray)]">
                Balance
              </p>

              <p
                className={`mt-1 text-[14px] font-bold ${
                  isPaidInFull
                    ? "text-green-700"
                    : "text-[var(--st-red)]"
                }`}
              >
                {isPaidInFull
                  ? "Paid in full"
                  : formatCurrency(
                      balance
                    )}
              </p>

            </div>

            <div className="text-right">

              <p className="m-0 text-[8px] text-[var(--st-gray)]">
                Total fee
              </p>

              <p className="mt-1 text-[10px] font-bold text-[var(--st-charcoal-dark)]">
                {formatCurrency(
                  totalFee
                )}
              </p>

            </div>

          </div>

          {/* PROGRESS */}

          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--st-border)]">

            <div
              className="h-full rounded-full bg-[var(--st-red)] transition-all"
              style={{
                width: `${paymentProgress}%`,
              }}
            />

          </div>

          <div className="mt-1 flex items-center justify-between">

            <span className="text-[7px] text-[var(--st-gray)]">
              {formatCurrency(
                totalPaid
              )}{" "}
              paid
            </span>

            <span className="text-[7px] text-[var(--st-gray)]">
              {Math.round(
                paymentProgress
              )}
              %
            </span>

          </div>

        </div>
      )}

      {/* NO ENROLLMENT */}

      {!enrollment && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-dashed border-[var(--st-border)] p-3">

          <Wallet
            size={14}
            className="shrink-0 text-[var(--st-gray)]"
          />

          <p className="m-0 text-[9px] text-[var(--st-gray)]">
            No active programme or payment
            plan.
          </p>

        </div>
      )}

      {/* ACTIONS */}

      <div className="mt-4 flex items-center gap-2">

        {onCall && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onCall(
                selectedStudent
              );
            }}
            className="st-icon-button"
            aria-label="Call student"
            title="Call"
          >
            <Phone size={13} />
          </button>
        )}

        <button
          type="button"
          onClick={() =>
            onViewDetails(
              selectedStudent
            )
          }
          className="st-button st-button-secondary flex-1"
        >
          View details
          <ArrowRight size={13} />
        </button>

        {isPaidInFull && (
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-700"
            title="Paid in full"
          >
            <CheckCircle2
              size={14}
            />
          </div>
        )}

      </div>

    </div>
  );
}