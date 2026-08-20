"use client";

import {
  AlertCircle,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  RefreshCw,
  X,
} from "lucide-react";

export type Instrument = "piano" | "guitar";

export type PaymentMethod =
  | "mpesa"
  | "cash"
  | "bank"
  | "card"
  | "other";

type AddStudentModalProps = {
  showAddStudent: boolean;
  closeAddStudent: () => void;

  addingStudent: boolean;
  addStudent: () => void;

  addStudentError: string | null;

  studentName: string;
  setStudentName: (value: string) => void;

  studentWhatsapp: string;
  setStudentWhatsapp: (value: string) => void;

  studentEmail: string;
  setStudentEmail: (value: string) => void;

  studentNotes: string;
  setStudentNotes: (value: string) => void;

  instrument: Instrument;
  setInstrument: (value: Instrument) => void;

  programmeName: string;
  setProgrammeName: (value: string) => void;

  startDate: string;
  setStartDate: (value: string) => void;

  endDate: string;

  totalFee: string;
  setTotalFee: (value: string) => void;

  numericTotalFee: number;
  initialPayment: string;
  setInitialPayment: (value: string) => void;

  numericInitialPayment: number;

  initialPaymentMethod: PaymentMethod;
  setInitialPaymentMethod: (
    value: PaymentMethod
  ) => void;

  initialPaymentReference: string;
  setInitialPaymentReference: (
    value: string
  ) => void;

  remainingAfterInitial: number;
  remainingAfterNextPayment: number;

  nextPaymentAmount: string;
  setNextPaymentAmount: (value: string) => void;

  nextPaymentDueDate: string;
  setNextPaymentDueDate: (value: string) => void;

  nextPaymentFollowUpDate: string;
  setNextPaymentFollowUpDate: (
    value: string
  ) => void;

  nextPaymentNotes: string;
  setNextPaymentNotes: (value: string) => void;

  formatCurrency: (amount: number) => string;
  formatDate: (value: string) => string;
  instrumentName: (
    value: Instrument
  ) => string;
};

export default function AddStudentModal({
  showAddStudent,
  closeAddStudent,
  addingStudent,
  addStudent,
  addStudentError,

  studentName,
  setStudentName,

  studentWhatsapp,
  setStudentWhatsapp,

  studentEmail,
  setStudentEmail,

  studentNotes,
  setStudentNotes,

  instrument,
  setInstrument,

  programmeName,
  setProgrammeName,

  startDate,
  setStartDate,

  endDate,

  totalFee,
  setTotalFee,

  numericTotalFee,

  initialPayment,
  setInitialPayment,

  numericInitialPayment,

  initialPaymentMethod,
  setInitialPaymentMethod,

  initialPaymentReference,
  setInitialPaymentReference,

  remainingAfterInitial,
  remainingAfterNextPayment,

  nextPaymentAmount,
  setNextPaymentAmount,

  nextPaymentDueDate,
  setNextPaymentDueDate,

  nextPaymentFollowUpDate,
  setNextPaymentFollowUpDate,

  nextPaymentNotes,
  setNextPaymentNotes,

  formatCurrency,
  formatDate,
  instrumentName,
}: AddStudentModalProps) {
  if (!showAddStudent) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/50 sm:items-center sm:p-5">

      <div className="max-h-[94vh] w-full max-w-[560px] overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">

        {/* HEADER */}

        <div className="sticky top-0 z-20 border-b border-[var(--st-border)] bg-white px-5 py-4">

          <div className="flex items-start justify-between gap-4">

            <div>
              <p className="st-eyebrow">
                NEW STUDENT
              </p>

              <h2 className="mt-1 text-[21px] font-bold text-[var(--st-charcoal-dark)]">
                Add a student
              </h2>

              <p className="mt-1 text-[10px] text-[var(--st-gray)]">
                Register the student,
                programme and payment
                plan.
              </p>
            </div>

            <button
              type="button"
              onClick={closeAddStudent}
              disabled={addingStudent}
              className="st-icon-button disabled:opacity-40"
              aria-label="Close add student form"
              title="Close"
            >
              <X size={17} />
            </button>

          </div>

        </div>

        <div className="p-5">

          {/* =====================================================
              01 · STUDENT INFORMATION
          ===================================================== */}

          <div>

            <div className="mb-4">
              <p className="st-eyebrow">
                01 · STUDENT INFORMATION
              </p>

              <h3 className="mt-1 text-[14px] font-bold text-[var(--st-charcoal-dark)]">
                Personal details
              </h3>
            </div>

            <div className="space-y-4">

              {/* FULL NAME */}

              <div>

                <label className="mb-2 block text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--st-charcoal)]">
                  Full name *
                </label>

                <input
                  type="text"
                  value={studentName}
                  onChange={(event) =>
                    setStudentName(
                      event.target.value
                    )
                  }
                  placeholder="e.g. Jane Wanjiku"
                  disabled={addingStudent}
                  className="w-full rounded-xl border border-[var(--st-border)] px-4 py-3.5 text-[12px] outline-none transition focus:border-[var(--st-red)] focus:ring-2 focus:ring-[var(--st-red)]/10 disabled:bg-[var(--st-bg-soft)]"
                />

              </div>

              {/* CONTACT */}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                <div>

                  <label className="mb-2 block text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--st-charcoal)]">
                    WhatsApp number *
                  </label>

                  <input
                    type="tel"
                    value={studentWhatsapp}
                    onChange={(event) =>
                      setStudentWhatsapp(
                        event.target.value
                      )
                    }
                    placeholder="e.g. 254712345678"
                    disabled={addingStudent}
                    className="w-full rounded-xl border border-[var(--st-border)] px-4 py-3.5 text-[11px] outline-none focus:border-[var(--st-red)] disabled:bg-[var(--st-bg-soft)]"
                  />

                </div>

                <div>

                  <label className="mb-2 block text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--st-charcoal)]">
                    Email *
                  </label>

                  <input
                    type="email"
                    value={studentEmail}
                    onChange={(event) =>
                      setStudentEmail(
                        event.target.value
                      )
                    }
                    placeholder="student@email.com"
                    disabled={addingStudent}
                    className="w-full rounded-xl border border-[var(--st-border)] px-4 py-3.5 text-[11px] outline-none focus:border-[var(--st-red)] disabled:bg-[var(--st-bg-soft)]"
                  />

                </div>

              </div>

              {/* NOTES */}

              <div>

                <label className="mb-2 block text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--st-charcoal)]">
                  Notes
                </label>

                <textarea
                  value={studentNotes}
                  onChange={(event) =>
                    setStudentNotes(
                      event.target.value
                    )
                  }
                  rows={3}
                  placeholder="Optional student notes..."
                  disabled={addingStudent}
                  className="w-full resize-none rounded-xl border border-[var(--st-border)] px-4 py-3 text-[11px] outline-none focus:border-[var(--st-red)] disabled:bg-[var(--st-bg-soft)]"
                />

              </div>

            </div>

          </div>

          {/* =====================================================
              02 · PROGRAMME
          ===================================================== */}

          <div className="mt-7 border-t border-[var(--st-border)] pt-7">

            <div className="mb-4">

              <p className="st-eyebrow">
                02 · PROGRAMME
              </p>

              <h3 className="mt-1 text-[14px] font-bold text-[var(--st-charcoal-dark)]">
                Training programme
              </h3>

            </div>

            <div className="space-y-4">

              {/* INSTRUMENT */}

              <div>

                <label className="mb-2 block text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--st-charcoal)]">
                  Instrument *
                </label>

                <div className="grid grid-cols-2 gap-2">

                  <button
                    type="button"
                    onClick={() =>
                      setInstrument("piano")
                    }
                    disabled={addingStudent}
                    className={`rounded-xl border px-4 py-3.5 text-left transition ${
                      instrument === "piano"
                        ? "border-[var(--st-red)] bg-red-50"
                        : "border-[var(--st-border)] bg-white"
                    } disabled:opacity-60`}
                  >

                    <p
                      className={`m-0 text-[11px] font-bold ${
                        instrument === "piano"
                          ? "text-[var(--st-red)]"
                          : "text-[var(--st-charcoal-dark)]"
                      }`}
                    >
                      Piano
                    </p>

                    <p className="mt-1 mb-0 text-[8px] text-[var(--st-gray)]">
                      Piano training
                    </p>

                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setInstrument("guitar")
                    }
                    disabled={addingStudent}
                    className={`rounded-xl border px-4 py-3.5 text-left transition ${
                      instrument === "guitar"
                        ? "border-[var(--st-red)] bg-red-50"
                        : "border-[var(--st-border)] bg-white"
                    } disabled:opacity-60`}
                  >

                    <p
                      className={`m-0 text-[11px] font-bold ${
                        instrument === "guitar"
                          ? "text-[var(--st-red)]"
                          : "text-[var(--st-charcoal-dark)]"
                      }`}
                    >
                      Guitar
                    </p>

                    <p className="mt-1 mb-0 text-[8px] text-[var(--st-gray)]">
                      Acoustic guitar
                      training
                    </p>

                  </button>

                </div>

              </div>

              {/* PROGRAMME NAME */}

              <div>

                <label className="mb-2 block text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--st-charcoal)]">
                  Programme name
                </label>

                <input
                  type="text"
                  value={programmeName}
                  onChange={(event) =>
                    setProgrammeName(
                      event.target.value
                    )
                  }
                  disabled={addingStudent}
                  className="w-full rounded-xl border border-[var(--st-border)] px-4 py-3.5 text-[11px] outline-none focus:border-[var(--st-red)] disabled:bg-[var(--st-bg-soft)]"
                />

              </div>

              {/* DATES */}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                <div>

                  <label className="mb-2 block text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--st-charcoal)]">
                    Start date *
                  </label>

                  <div className="relative">

                    <CalendarDays
                      size={14}
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--st-red)]"
                    />

                    <input
                      type="date"
                      value={startDate}
                      onChange={(event) =>
                        setStartDate(
                          event.target.value
                        )
                      }
                      disabled={addingStudent}
                      className="w-full rounded-xl border border-[var(--st-border)] bg-white py-3.5 pl-10 pr-3 text-[11px] outline-none focus:border-[var(--st-red)] disabled:bg-[var(--st-bg-soft)]"
                    />

                  </div>

                </div>

                <div>

                  <label className="mb-2 block text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--st-charcoal)]">
                    End date
                  </label>

                  <div className="rounded-xl border border-[var(--st-border)] bg-[var(--st-bg-soft)] px-4 py-3.5">

                    <p className="m-0 text-[11px] font-bold text-[var(--st-charcoal-dark)]">
                      {endDate
                        ? formatDate(endDate)
                        : "—"}
                    </p>

                    <p className="mt-1 mb-0 text-[8px] text-[var(--st-gray)]">
                      Automatically
                      calculated
                    </p>

                  </div>

                </div>

              </div>

              {/* PERIOD */}

              {endDate && (
                <div className="rounded-xl bg-[var(--st-bg-soft)] p-3">

                  <div className="flex items-center gap-2">

                    <Clock3
                      size={14}
                      className="text-[var(--st-red)]"
                    />

                    <p className="m-0 text-[9px] text-[var(--st-gray)]">
                      Programme period
                    </p>

                    <p className="ml-auto m-0 text-[10px] font-bold text-[var(--st-charcoal-dark)]">
                      3 months
                    </p>

                  </div>

                </div>
              )}

            </div>

          </div>

          {/* =====================================================
              03 · PAYMENT PLAN
          ===================================================== */}

          <div className="mt-7 border-t border-[var(--st-border)] pt-7">

            <div className="mb-4">

              <p className="st-eyebrow">
                03 · PAYMENT PLAN
              </p>

              <h3 className="mt-1 text-[14px] font-bold text-[var(--st-charcoal-dark)]">
                Programme payment
              </h3>

              <p className="mt-1 text-[9px] leading-relaxed text-[var(--st-gray)]">
                The student can start
                with any amount. The
                remaining balance can be
                followed up through
                scheduled payments.
              </p>

            </div>

            <div className="space-y-4">

              {/* TOTAL FEE */}

              <div>

                <label className="mb-2 block text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--st-charcoal)]">
                  Total programme fee *
                </label>

                <div className="relative">

                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[var(--st-gray)]">
                    KES
                  </span>

                  <input
                    type="number"
                    min="0"
                    value={totalFee}
                    onChange={(event) =>
                      setTotalFee(
                        event.target.value
                      )
                    }
                    placeholder="e.g. 26850"
                    disabled={addingStudent}
                    className="w-full rounded-xl border border-[var(--st-border)] py-3.5 pl-14 pr-4 text-[12px] font-semibold outline-none focus:border-[var(--st-red)] disabled:bg-[var(--st-bg-soft)]"
                  />

                </div>

              </div>

              {/* INITIAL PAYMENT */}

              <div className="rounded-2xl bg-[var(--st-bg-soft)] p-4">

                <div className="flex items-center justify-between gap-3">

                  <div>

                    <p className="m-0 text-[9px] font-bold uppercase tracking-[0.06em] text-[var(--st-gray)]">
                      Initial payment
                    </p>

                    <p className="mt-1 mb-0 text-[8px] text-[var(--st-gray)]">
                      Amount paid today
                    </p>

                  </div>

                  <p className="m-0 text-[13px] font-bold text-[var(--st-charcoal-dark)]">
                    {formatCurrency(
                      numericInitialPayment
                    )}
                  </p>

                </div>

                <div className="mt-3">

                  <input
                    type="number"
                    min="0"
                    value={initialPayment}
                    onChange={(event) =>
                      setInitialPayment(
                        event.target.value
                      )
                    }
                    placeholder="0"
                    disabled={addingStudent}
                    className="w-full rounded-xl border border-[var(--st-border)] bg-white px-4 py-3.5 text-[12px] font-semibold outline-none focus:border-[var(--st-red)] disabled:bg-gray-100"
                  />

                </div>

                {/* INITIAL PAYMENT METHOD */}

                {numericInitialPayment > 0 && (
                  <div className="mt-3">

                    <label className="mb-2 block text-[8px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                      Payment method
                    </label>

                    <div className="relative">

                      <select
                        value={initialPaymentMethod}
                        onChange={(event) =>
                          setInitialPaymentMethod(
                            event.target
                              .value as PaymentMethod
                          )
                        }
                        disabled={addingStudent}
                        className="w-full appearance-none rounded-xl border border-[var(--st-border)] bg-white px-4 py-3.5 text-[10px] font-semibold outline-none focus:border-[var(--st-red)] disabled:bg-gray-100"
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
                        size={14}
                        className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[var(--st-gray)]"
                      />

                    </div>

                  </div>
                )}

                {/* INITIAL REFERENCE */}

                {numericInitialPayment > 0 && (
                  <div className="mt-3">

                    <label className="mb-2 block text-[8px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                      Reference
                    </label>

                    <input
                      type="text"
                      value={
                        initialPaymentReference
                      }
                      onChange={(event) =>
                        setInitialPaymentReference(
                          event.target.value
                        )
                      }
                      placeholder="M-Pesa code / receipt number"
                      disabled={addingStudent}
                      className="w-full rounded-xl border border-[var(--st-border)] bg-white px-4 py-3 text-[10px] outline-none focus:border-[var(--st-red)] disabled:bg-gray-100"
                    />

                  </div>
                )}

              </div>

              {/* BALANCE CARDS */}

              <div className="grid grid-cols-2 gap-2">

                <div className="rounded-xl border border-[var(--st-border)] p-3">

                  <p className="m-0 text-[8px] font-bold uppercase tracking-[0.06em] text-[var(--st-gray)]">
                    Balance after initial
                  </p>

                  <p className="mt-2 text-[16px] font-bold text-[var(--st-red)]">
                    {formatCurrency(
                      remainingAfterInitial
                    )}
                  </p>

                </div>

                <div className="rounded-xl border border-[var(--st-border)] p-3">

                  <p className="m-0 text-[8px] font-bold uppercase tracking-[0.06em] text-[var(--st-gray)]">
                    After next payment
                  </p>

                  <p className="mt-2 text-[16px] font-bold text-[var(--st-charcoal-dark)]">
                    {formatCurrency(
                      remainingAfterNextPayment
                    )}
                  </p>

                </div>

              </div>

            </div>

          </div>

          {/* =====================================================
              04 · NEXT FOLLOW-UP
          ===================================================== */}

          {remainingAfterInitial > 0 && (
            <div className="mt-7 border-t border-[var(--st-border)] pt-7">

              <div className="mb-4">

                <p className="st-eyebrow">
                  04 · NEXT FOLLOW-UP
                </p>

                <h3 className="mt-1 text-[14px] font-bold text-[var(--st-charcoal-dark)]">
                  Next payment
                </h3>

                <p className="mt-1 text-[9px] leading-relaxed text-[var(--st-gray)]">
                  Tell the system exactly
                  when and how much you
                  intend to follow up for
                  next.
                </p>

              </div>

              <div className="space-y-4">

                {/* NEXT PAYMENT AMOUNT */}

                <div>

                  <label className="mb-2 block text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--st-charcoal)]">
                    Next payment amount *
                  </label>

                  <div className="relative">

                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[var(--st-gray)]">
                      KES
                    </span>

                    <input
                      type="number"
                      min="0"
                      max={remainingAfterInitial}
                      value={nextPaymentAmount}
                      onChange={(event) =>
                        setNextPaymentAmount(
                          event.target.value
                        )
                      }
                      placeholder="e.g. 5000"
                      disabled={addingStudent}
                      className="w-full rounded-xl border border-[var(--st-border)] py-3.5 pl-14 pr-4 text-[12px] font-semibold outline-none focus:border-[var(--st-red)] disabled:bg-[var(--st-bg-soft)]"
                    />

                  </div>

                  <p className="mt-1.5 mb-0 text-[8px] text-[var(--st-gray)]">
                    Remaining balance
                    available:{" "}
                    {formatCurrency(
                      remainingAfterInitial
                    )}
                  </p>

                </div>

                {/* DATES */}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                  <div>

                    <label className="mb-2 block text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--st-charcoal)]">
                      Due date *
                    </label>

                    <div className="relative">

                      <CalendarDays
                        size={14}
                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--st-red)]"
                      />

                      <input
                        type="date"
                        value={nextPaymentDueDate}
                        onChange={(event) =>
                          setNextPaymentDueDate(
                            event.target.value
                          )
                        }
                        disabled={addingStudent}
                        className="w-full rounded-xl border border-[var(--st-border)] bg-white py-3.5 pl-10 pr-3 text-[10px] outline-none focus:border-[var(--st-red)] disabled:bg-[var(--st-bg-soft)]"
                      />

                    </div>

                  </div>

                  <div>

                    <label className="mb-2 block text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--st-charcoal)]">
                      Follow-up date
                    </label>

                    <div className="relative">

                      <Clock3
                        size={14}
                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--st-red)]"
                      />

                      <input
                        type="date"
                        value={
                          nextPaymentFollowUpDate
                        }
                        onChange={(event) =>
                          setNextPaymentFollowUpDate(
                            event.target.value
                          )
                        }
                        disabled={addingStudent}
                        className="w-full rounded-xl border border-[var(--st-border)] bg-white py-3.5 pl-10 pr-3 text-[10px] outline-none focus:border-[var(--st-red)] disabled:bg-[var(--st-bg-soft)]"
                      />

                    </div>

                  </div>

                </div>

                {/* NOTES */}

                <div>

                  <label className="mb-2 block text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--st-charcoal)]">
                    Follow-up notes
                  </label>

                  <textarea
                    value={nextPaymentNotes}
                    onChange={(event) =>
                      setNextPaymentNotes(
                        event.target.value
                      )
                    }
                    rows={3}
                    placeholder="e.g. Call student before the due date..."
                    disabled={addingStudent}
                    className="w-full resize-none rounded-xl border border-[var(--st-border)] px-4 py-3 text-[10px] outline-none focus:border-[var(--st-red)] disabled:bg-[var(--st-bg-soft)]"
                  />

                </div>

              </div>

            </div>
          )}

          {/* =====================================================
              REGISTRATION SUMMARY
          ===================================================== */}

          <div className="mt-7 rounded-2xl bg-[var(--st-bg-soft)] p-4">

            <p className="m-0 text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--st-gray)]">
              Registration summary
            </p>

            <div className="mt-4 space-y-3">

              {/* STUDENT */}

              <div className="flex items-center justify-between gap-3">

                <span className="text-[9px] text-[var(--st-gray)]">
                  Student
                </span>

                <span className="text-right text-[10px] font-bold text-[var(--st-charcoal-dark)]">
                  {studentName ||
                    "Not entered"}
                </span>

              </div>

              {/* PROGRAMME */}

              <div className="flex items-center justify-between gap-3">

                <span className="text-[9px] text-[var(--st-gray)]">
                  Programme
                </span>

                <span className="text-right text-[10px] font-bold text-[var(--st-charcoal-dark)]">
                  {instrumentName(
                    instrument
                  )}
                </span>

              </div>

              {/* PERIOD */}

              <div className="flex items-center justify-between gap-3">

                <span className="text-[9px] text-[var(--st-gray)]">
                  Programme period
                </span>

                <span className="text-right text-[10px] font-bold text-[var(--st-charcoal-dark)]">
                  {startDate && endDate
                    ? `${formatDate(
                        startDate
                      )} – ${formatDate(
                        endDate
                      )}`
                    : "Not entered"}
                </span>

              </div>

              {/* FINANCIAL SUMMARY */}

              <div className="border-t border-[var(--st-border)] pt-3">

                <div className="flex items-center justify-between gap-3">

                  <span className="text-[9px] text-[var(--st-gray)]">
                    Total fee
                  </span>

                  <span className="text-[11px] font-bold text-[var(--st-charcoal-dark)]">
                    {formatCurrency(
                      numericTotalFee
                    )}
                  </span>

                </div>

                <div className="mt-2 flex items-center justify-between gap-3">

                  <span className="text-[9px] text-[var(--st-gray)]">
                    Initial payment
                  </span>

                  <span className="text-[11px] font-bold text-green-700">
                    {formatCurrency(
                      numericInitialPayment
                    )}
                  </span>

                </div>

                <div className="mt-2 flex items-center justify-between gap-3">

                  <span className="text-[9px] text-[var(--st-gray)]">
                    Remaining balance
                  </span>

                  <span className="text-[13px] font-bold text-[var(--st-red)]">
                    {formatCurrency(
                      remainingAfterInitial
                    )}
                  </span>

                </div>

              </div>

            </div>

          </div>

          {/* ERROR */}

          {addStudentError && (
            <div className="mt-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">

              <AlertCircle
                size={15}
                className="mt-0.5 shrink-0 text-red-600"
              />

              <p className="m-0 text-[10px] leading-relaxed text-red-700">
                {addStudentError}
              </p>

            </div>
          )}

          {/* ACTIONS */}

          <div className="mt-6 grid grid-cols-2 gap-2">

            <button
              type="button"
              onClick={closeAddStudent}
              disabled={addingStudent}
              className="st-button st-button-secondary w-full disabled:opacity-40"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={addStudent}
              disabled={addingStudent}
              className="st-button st-button-primary w-full disabled:opacity-60"
            >

              {addingStudent ? (
                <>
                  <RefreshCw
                    size={15}
                    className="animate-spin"
                  />
                  Adding...
                </>
              ) : (
                <>
                  <Check size={15} />
                  Add student
                </>
              )}

            </button>

          </div>

          <p className="mt-4 text-center text-[8px] leading-relaxed text-[var(--st-gray)]">
            Student, programme and
            payment information will be
            saved together.
          </p>

        </div>

      </div>

    </div>
  );
}