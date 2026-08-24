"use client";

import {
  CalendarDays,
  Camera,
  CheckCircle2,
  Clock3,
  Download,
  Edit3,
  Eye,
  Mail,
  MessageCircle,
  Phone,
  Wallet,
  X,
} from "lucide-react";

type PaymentMethod =
  | "mpesa"
  | "cash"
  | "bank"
  | "card"
  | "other";

interface Payment {
  id: string;
  amount: number | string;
  payment_date: string;
  payment_method: PaymentMethod | string;
  reference?: string | null;
}

interface Student {
  id: string;
  full_name: string;
  whatsapp?: string | null;
  email?: string | null;
  notes?: string | null;
  photo_url?: string | null;
  photo_path?: string | null;
  status?: string | null;
}

interface Enrollment {
  id: string;
  instrument?: string | null;
  programme_name?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  total_fee?: number | string | null;
  status?: string | null;
}

export interface SelectedStudent {
  student: Student;
  enrollment: Enrollment | null;
  payments: Payment[];
}

interface StudentDetailsProps {
  selectedStudent: SelectedStudent;

  onClose: () => void;

  onEditStudent: (
    student: SelectedStudent
  ) => void;

  onWhatsApp: (
    student: SelectedStudent
  ) => void;

  onCall: (
    student: SelectedStudent
  ) => void;

  onEmail: (
    student: SelectedStudent
  ) => void;

  onReceivePayment: () => void;

  viewReceipt: (
    student: SelectedStudent,
    payment: Payment
  ) => void;

  downloadReceipt: (
    student: SelectedStudent,
    payment: Payment
  ) => void;

  emailReceipt: (
    student: SelectedStudent,
    payment: Payment
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

  switch (
    instrument.toLowerCase()
  ) {
    case "piano":
      return "Piano";

    case "guitar":
      return "Acoustic Guitar";

    default:
      return instrument;
  }
}

function getInitials(
  name?: string | null
) {
  if (!name) return "S";

  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 1) {
    return parts[0]
      .slice(0, 2)
      .toUpperCase();
  }

  return (
    parts[0].charAt(0) +
    parts[parts.length - 1].charAt(0)
  ).toUpperCase();
}

export default function StudentDetails({
  selectedStudent,
  onClose,
  onEditStudent,
  onWhatsApp,
  onCall,
  onEmail,
  onReceivePayment,
  viewReceipt,
  downloadReceipt,
  emailReceipt,
  formatCurrency,
  formatDate,
  getBalance,
}: StudentDetailsProps) {
  const {
    student,
    enrollment,
    payments,
  } = selectedStudent;

  const totalPaid = payments.reduce(
    (total, payment) =>
      total +
      Number(payment.amount || 0),
    0
  );

  const totalFee = Number(
    enrollment?.total_fee || 0
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

  const studentPhoto =
    student.photo_url || null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 sm:items-center sm:p-5">

      <div className="flex max-h-[94vh] w-full max-w-[560px] flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">

        {/* =====================================================
            HEADER
        ===================================================== */}

        <div className="shrink-0 border-b border-[var(--st-border)] bg-white px-5 py-4">

          <div className="flex items-start justify-between gap-3">

            {/* STUDENT IDENTITY */}

            <div className="flex min-w-0 items-center gap-3">

              {/* PHOTO */}

              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-[var(--st-border)] bg-[var(--st-bg-soft)]">

                {studentPhoto ? (
                  <img
                    src={studentPhoto}
                    alt={
                      student.full_name ||
                      "Student"
                    }
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[18px] font-bold text-[var(--st-gray)]">
                    {getInitials(
                      student.full_name
                    )}
                  </div>
                )}

                {/* PHOTO EDIT BUTTON */}

                <button
                  type="button"
                  onClick={() =>
                    onEditStudent(
                      selectedStudent
                    )
                  }
                  className="absolute bottom-1 right-1 flex h-7 w-7 items-center justify-center rounded-full border border-white bg-[var(--st-charcoal-dark)] text-white shadow-md"
                  aria-label="Change student photo"
                  title="Change photo"
                >
                  <Camera size={12} />
                </button>

              </div>

              <div className="min-w-0">

                <p className="st-eyebrow">
                  STUDENT DETAILS
                </p>

                <h2 className="mt-1 truncate text-[20px] font-bold text-[var(--st-charcoal-dark)]">
                  {student.full_name}
                </h2>

                <div className="mt-1 flex flex-wrap items-center gap-2">

                  {enrollment?.instrument && (
                    <span className="text-[9px] text-[var(--st-gray)]">
                      {instrumentName(
                        enrollment.instrument
                      )}
                    </span>
                  )}

                  {enrollment?.status && (
                    <>
                      <span className="text-[8px] text-[var(--st-gray)]">
                        ·
                      </span>

                      <span className="text-[9px] font-semibold capitalize text-[var(--st-gray)]">
                        {enrollment.status}
                      </span>
                    </>
                  )}

                </div>

              </div>

            </div>

            {/* HEADER ACTIONS */}

            <div className="flex shrink-0 items-center gap-2">

              {/* EDIT */}

              <button
                type="button"
                onClick={() =>
                  onEditStudent(
                    selectedStudent
                  )
                }
                className="st-button st-button-secondary"
                title="Edit student"
              >
                <Edit3 size={14} />
                <span className="hidden sm:inline">
                  Edit
                </span>
              </button>

              {/* CLOSE */}

              <button
                type="button"
                onClick={onClose}
                className="st-icon-button"
                aria-label="Close student details"
                title="Close"
              >
                <X size={17} />
              </button>

            </div>

          </div>

        </div>

        {/* =====================================================
            CONTENT
        ===================================================== */}

        <div className="overflow-y-auto p-5">

          {/* =================================================
              PROFILE SUMMARY
          ================================================= */}

          <div className="rounded-2xl bg-[var(--st-bg-soft)] p-4">

            <div className="flex items-center gap-4">

              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-[var(--st-border)] bg-white">

                {studentPhoto ? (
                  <img
                    src={studentPhoto}
                    alt={
                      student.full_name ||
                      "Student"
                    }
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[26px] font-bold text-[var(--st-gray)]">
                    {getInitials(
                      student.full_name
                    )}
                  </div>
                )}

                {/* PHOTO EDIT */}

                <button
                  type="button"
                  onClick={() =>
                    onEditStudent(
                      selectedStudent
                    )
                  }
                  className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--st-charcoal-dark)] text-white shadow-md"
                  aria-label="Edit student photo"
                  title="Edit student photo"
                >
                  <Camera size={14} />
                </button>

              </div>

              <div className="min-w-0">

                <h3 className="truncate text-[16px] font-bold text-[var(--st-charcoal-dark)]">
                  {student.full_name}
                </h3>

                <p className="mt-1 text-[10px] text-[var(--st-gray)]">
                  {enrollment?.programme_name ||
                    instrumentName(
                      enrollment?.instrument
                    )}
                </p>

                <p className="mt-1 text-[10px] font-medium text-[var(--st-gray)]">
                  {instrumentName(
                    enrollment?.instrument
                  )}
                </p>

              </div>

            </div>

          </div>

          {/* =================================================
              CONTACT
          ================================================= */}

          <div className="mt-6">

            <p className="st-eyebrow">
              CONTACT
            </p>

            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">

              <div className="rounded-xl border border-[var(--st-border)] p-3">

                <p className="m-0 text-[8px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                  WhatsApp
                </p>

                <p className="mt-1 truncate text-[10px] font-semibold text-[var(--st-charcoal-dark)]">
                  {student.whatsapp ||
                    "Not provided"}
                </p>

              </div>

              <div className="rounded-xl border border-[var(--st-border)] p-3">

                <p className="m-0 text-[8px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                  Email
                </p>

                <p className="mt-1 truncate text-[10px] font-semibold text-[var(--st-charcoal-dark)]">
                  {student.email ||
                    "Not provided"}
                </p>

              </div>

            </div>

          </div>

          {/* =================================================
              PROGRAMME
          ================================================= */}

          <div className="mt-6">

            <div className="flex items-center justify-between">

              <p className="st-eyebrow">
                PROGRAMME
              </p>

              <button
                type="button"
                onClick={() =>
                  onEditStudent(
                    selectedStudent
                  )
                }
                className="flex items-center gap-1 text-[9px] font-bold text-[var(--st-red)]"
              >
                <Edit3 size={12} />
                Edit
              </button>

            </div>

            <div className="mt-3 rounded-2xl bg-[var(--st-bg-soft)] p-4">

              <div className="flex items-start justify-between gap-4">

                <div>

                  <p className="m-0 text-[12px] font-bold text-[var(--st-charcoal-dark)]">
                    {enrollment?.programme_name ||
                      instrumentName(
                        enrollment?.instrument
                      )}
                  </p>

                  <p className="mt-1 text-[9px] text-[var(--st-gray)]">
                    {instrumentName(
                      enrollment?.instrument
                    )}
                  </p>

                </div>

                {enrollment?.status && (
                  <span className="rounded-full bg-white px-2.5 py-1 text-[8px] font-bold capitalize text-[var(--st-charcoal-dark)]">
                    {enrollment.status}
                  </span>
                )}

              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">

                <div className="flex items-center gap-2">

                  <CalendarDays
                    size={14}
                    className="shrink-0 text-[var(--st-red)]"
                  />

                  <div>

                    <p className="m-0 text-[8px] text-[var(--st-gray)]">
                      Start date
                    </p>

                    <p className="mt-0.5 text-[9px] font-bold text-[var(--st-charcoal-dark)]">
                      {enrollment?.start_date
                        ? formatDate(
                            enrollment.start_date
                          )
                        : "—"}
                    </p>

                  </div>

                </div>

                <div className="flex items-center gap-2">

                  <Clock3
                    size={14}
                    className="shrink-0 text-[var(--st-red)]"
                  />

                  <div>

                    <p className="m-0 text-[8px] text-[var(--st-gray)]">
                      End date
                    </p>

                    <p className="mt-0.5 text-[9px] font-bold text-[var(--st-charcoal-dark)]">
                      {enrollment?.end_date
                        ? formatDate(
                            enrollment.end_date
                          )
                        : "—"}
                    </p>

                  </div>

                </div>

              </div>

            </div>

          </div>

          {/* =================================================
              FINANCIAL SUMMARY
          ================================================= */}

          <div className="mt-6">

            <p className="st-eyebrow">
              FINANCIAL SUMMARY
            </p>

            <div className="mt-3 grid grid-cols-3 gap-2">

              <div className="rounded-xl border border-[var(--st-border)] p-3">

                <p className="m-0 text-[8px] font-bold uppercase tracking-[0.05em] text-[var(--st-gray)]">
                  Total fee
                </p>

                <p className="mt-2 text-[12px] font-bold text-[var(--st-charcoal-dark)]">
                  {formatCurrency(
                    totalFee
                  )}
                </p>

              </div>

              <div className="rounded-xl border border-[var(--st-border)] p-3">

                <p className="m-0 text-[8px] font-bold uppercase tracking-[0.05em] text-[var(--st-gray)]">
                  Paid
                </p>

                <p className="mt-2 text-[12px] font-bold text-green-700">
                  {formatCurrency(
                    totalPaid
                  )}
                </p>

              </div>

              <div className="rounded-xl border border-[var(--st-border)] p-3">

                <p className="m-0 text-[8px] font-bold uppercase tracking-[0.05em] text-[var(--st-gray)]">
                  Balance
                </p>

                <p className="mt-2 text-[12px] font-bold text-[var(--st-red)]">
                  {formatCurrency(
                    balance
                  )}
                </p>

              </div>

            </div>

          </div>

          {/* =================================================
              NOTES
          ================================================= */}

          {student.notes && (
            <div className="mt-6">

              <div className="flex items-center justify-between">

                <p className="st-eyebrow">
                  NOTES
                </p>

                <button
                  type="button"
                  onClick={() =>
                    onEditStudent(
                      selectedStudent
                    )
                  }
                  className="flex items-center gap-1 text-[9px] font-bold text-[var(--st-red)]"
                >
                  <Edit3 size={12} />
                  Edit
                </button>

              </div>

              <div className="mt-3 rounded-xl border border-[var(--st-border)] bg-[var(--st-bg-soft)] p-3">

                <p className="m-0 text-[10px] leading-relaxed text-[var(--st-charcoal-dark)]">
                  {student.notes}
                </p>

              </div>

            </div>
          )}

          {/* =================================================
              PAYMENT HISTORY
          ================================================= */}

          <div className="mt-6">

            <div className="flex items-center justify-between">

              <p className="m-0 text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--st-gray)]">
                Payment history
              </p>

              <span className="text-[9px] text-[var(--st-gray)]">
                {payments.length}{" "}
                {payments.length === 1
                  ? "payment"
                  : "payments"}
              </span>

            </div>

            {payments.length === 0 ? (

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

                {payments.map(
                  (payment) => (

                    <div
                      key={payment.id}
                      className="flex items-center justify-between gap-3 p-3"
                    >

                      <div className="min-w-0">

                        <p className="m-0 text-[11px] font-bold text-[var(--st-charcoal-dark)]">
                          {formatCurrency(
                            Number(
                              payment.amount
                            )
                          )}
                        </p>

                        <p className="mt-1 text-[9px] text-[var(--st-gray)]">
                          {formatDate(
                            payment.payment_date
                          )}{" "}
                          ·{" "}
                          {payment.payment_method.toUpperCase()}
                        </p>

                        {payment.reference && (
                          <p className="mt-1 max-w-[170px] truncate text-[8px] text-[var(--st-gray)]">
                            Ref:{" "}
                            {
                              payment.reference
                            }
                          </p>
                        )}

                      </div>

                      <div className="flex shrink-0 gap-1.5">

                        <button
                          type="button"
                          onClick={() =>
                            viewReceipt(
                              selectedStudent,
                              payment
                            )
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
                            downloadReceipt(
                              selectedStudent,
                              payment
                            )
                          }
                          className="st-icon-button"
                          aria-label="Download receipt"
                          title="Download receipt"
                        >
                          <Download
                            size={14}
                          />
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            emailReceipt(
                              selectedStudent,
                              payment
                            )
                          }
                          className="st-icon-button"
                          aria-label="Email receipt"
                          title="Email receipt"
                        >
                          <Mail size={14} />
                        </button>

                      </div>

                    </div>

                  )
                )}

              </div>

            )}

          </div>

          {/* =================================================
              ACTIONS
          ================================================= */}

          <div className="mt-6 grid grid-cols-2 gap-2">

            <button
              type="button"
              onClick={() =>
                onWhatsApp(
                  selectedStudent
                )
              }
              className="st-button st-button-secondary w-full"
            >
              <MessageCircle
                size={15}
              />
              WhatsApp
            </button>

            <button
              type="button"
              onClick={() =>
                onCall(
                  selectedStudent
                )
              }
              className="st-button st-button-secondary w-full"
            >
              <Phone size={15} />
              Call
            </button>

            <button
              type="button"
              onClick={() =>
                onEmail(
                  selectedStudent
                )
              }
              className="st-button st-button-secondary w-full"
            >
              <Mail size={15} />
              Email
            </button>

            <button
              type="button"
              onClick={
                onReceivePayment
              }
              disabled={!enrollment}
              className="st-button st-button-primary w-full disabled:opacity-40"
            >
              <Wallet size={15} />
              Receive payment
            </button>

          </div>

          {/* =================================================
              EDIT STUDENT CTA
          ================================================= */}

          <button
            type="button"
            onClick={() =>
              onEditStudent(
                selectedStudent
              )
            }
            className="st-button st-button-secondary mt-3 w-full"
          >
            <Edit3 size={15} />
            Edit Student Profile
          </button>

        </div>

      </div>

    </div>
  );
}