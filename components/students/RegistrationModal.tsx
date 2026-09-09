"use client";

import {
  AlertCircle,
  CalendarDays,
  Check,
  CreditCard,
  UserCheck,
  UserPlus,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type PaymentMethod =
  | "mpesa"
  | "cash"
  | "bank"
  | "card"
  | "other";

export type RegistrationModalMode =
  | "register"
  | "book";

export interface RegistrationFormValues {
  programmeName: string;
  plannedStartDate: string;
  totalFee: number;
  initialPayment: number;
  paymentMethod: PaymentMethod;
  paymentReference: string;
  notes: string;
}

interface RegistrationBooking {
  id: string;
  instrument: "piano" | "guitar";
  lead?: {
    full_name?: string | null;
    email?: string | null;
    whatsapp_number?: string | null;
  } | null;
}

interface RegistrationModalProps {
  show: boolean;
  mode?: RegistrationModalMode;
  booking: RegistrationBooking | null;
  registering?: boolean;
  error?: string;
  onClose: () => void;
  onSubmit: (
    values: RegistrationFormValues,
  ) => void | Promise<void>;
}

const DEFAULT_PROGRAMME =
  "3 Month Training Programme";

const DEFAULT_FEE = "26850";

function getTodayString() {
  const date = new Date();

  const offset =
    date.getTimezoneOffset();

  const localDate = new Date(
    date.getTime() -
      offset * 60 * 1000,
  );

  return localDate
    .toISOString()
    .slice(0, 10);
}

function formatCurrency(
  amount: number,
) {
  return new Intl.NumberFormat(
    "en-KE",
    {
      style: "currency",
      currency: "KES",
      maximumFractionDigits: 0,
    },
  ).format(amount);
}

function getInstrumentName(
  instrument?: "piano" | "guitar",
) {
  if (instrument === "guitar") {
    return "Acoustic Guitar";
  }

  return "Piano";
}

export default function RegistrationModal({
  show,
  mode = "register",
  booking,
  registering = false,
  error = "",
  onClose,
  onSubmit,
}: RegistrationModalProps) {
  const [programmeName, setProgrammeName] =
    useState(DEFAULT_PROGRAMME);

  const [plannedStartDate, setPlannedStartDate] =
    useState(getTodayString());

  const [totalFee, setTotalFee] =
    useState(DEFAULT_FEE);

  const [initialPayment, setInitialPayment] =
    useState("");

  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("mpesa");

  const [paymentReference, setPaymentReference] =
    useState("");

  const [notes, setNotes] =
    useState("");

  const [validationError, setValidationError] =
    useState("");

  const isBookingMode =
    mode === "book";

  const title = isBookingMode
    ? "Start learning"
    : "Register learner";

  const eyebrow = isBookingMode
    ? "START LEARNING"
    : "STUDENT REGISTRATION";

  const description = isBookingMode
    ? "Start the learner's programme and begin the course clock."
    : "Reserve the learner and programme before lessons officially begin.";

  const submitLabel = isBookingMode
    ? "Start Learning"
    : "Register Learner";

  const submittingLabel = isBookingMode
    ? "Starting..."
    : "Registering...";

  useEffect(() => {
    if (!show || !booking) {
      return;
    }

    setProgrammeName(
      DEFAULT_PROGRAMME,
    );

    setPlannedStartDate(
      getTodayString(),
    );

    setTotalFee(
      DEFAULT_FEE,
    );

    setInitialPayment("");

    setPaymentMethod("mpesa");

    setPaymentReference("");

    setNotes("");

    setValidationError("");
  }, [
    show,
    booking?.id,
    mode,
  ]);

  const numericTotalFee =
    useMemo(() => {
      const value =
        Number(totalFee);

      if (
        !Number.isFinite(value) ||
        value <= 0
      ) {
        return 0;
      }

      return value;
    }, [totalFee]);

  const numericInitialPayment =
    useMemo(() => {
      const value =
        Number(initialPayment);

      if (
        !Number.isFinite(value) ||
        value <= 0
      ) {
        return 0;
      }

      return value;
    }, [initialPayment]);

  const remainingBalance =
    Math.max(
      numericTotalFee -
        numericInitialPayment,
      0,
    );

  function handleSubmit() {
    setValidationError("");

    if (!booking) {
      setValidationError(
        "No booking selected.",
      );
      return;
    }

    if (!programmeName.trim()) {
      setValidationError(
        "Please enter the programme name.",
      );
      return;
    }

    if (!plannedStartDate) {
      setValidationError(
        "Please select the planned start date.",
      );
      return;
    }

    if (numericTotalFee <= 0) {
      setValidationError(
        "Please enter a valid course fee.",
      );
      return;
    }

    if (
      numericInitialPayment <= 0
    ) {
      setValidationError(
        "Please enter the initial payment amount.",
      );
      return;
    }

    if (
      numericInitialPayment >
      numericTotalFee
    ) {
      setValidationError(
        "Initial payment cannot be greater than the course fee.",
      );
      return;
    }

    onSubmit({
      programmeName:
        programmeName.trim(),

      plannedStartDate,

      totalFee:
        numericTotalFee,

      initialPayment:
        numericInitialPayment,

      paymentMethod,

      paymentReference:
        paymentReference.trim(),

      notes:
        notes.trim(),
    });
  }

  if (!show || !booking) {
    return null;
  }

  const studentName =
    booking.lead?.full_name ||
    "Unnamed learner";

  const whatsapp =
    booking.lead
      ?.whatsapp_number ||
    "No WhatsApp number";

  const email =
    booking.lead?.email ||
    "No email address";

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-black/50 sm:items-center sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="registration-modal-title"
    >
      <div className="max-h-[94vh] w-full max-w-[560px] overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">

        {/* =====================================================
            HEADER
        ===================================================== */}

        <div className="sticky top-0 z-30 border-b border-[var(--st-border)] bg-white px-5 py-4">

          <div className="flex items-start justify-between gap-4">

            <div>

              <p className="st-eyebrow">
                {eyebrow}
              </p>

              <h2
                id="registration-modal-title"
                className="mt-1 text-[21px] font-bold text-[var(--st-charcoal-dark)]"
              >
                {title}
              </h2>

              <p className="mt-1 text-[10px] leading-relaxed text-[var(--st-gray)]">
                {description}
              </p>

            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={registering}
              className="st-icon-button disabled:opacity-40"
              aria-label="Close"
            >
              <X size={17} />
            </button>

          </div>

        </div>

        <div className="p-5">

          {/* =====================================================
              LIFECYCLE MESSAGE
          ===================================================== */}

          <div
            className={`rounded-2xl border p-4 ${
              isBookingMode
                ? "border-purple-200 bg-purple-50"
                : "border-pink-200 bg-pink-50"
            }`}
          >

            <div className="flex items-start gap-3">

              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white">

                {isBookingMode ? (
                  <UserPlus
                    size={15}
                    className="text-purple-700"
                  />
                ) : (
                  <UserCheck
                    size={15}
                    className="text-pink-700"
                  />
                )}

              </div>

              <div>

                <p
                  className={`m-0 text-[10px] font-bold uppercase tracking-[0.08em] ${
                    isBookingMode
                      ? "text-purple-800"
                      : "text-pink-800"
                  }`}
                >
                  {isBookingMode
                    ? "BOOKED"
                    : "REGISTERED"}
                </p>

                <p className="mt-1 mb-0 text-[9px] leading-relaxed text-[var(--st-gray)]">

                  {isBookingMode ? (
                    <>
                      This action starts the learner's
                      programme. Their course clock begins
                      from the actual learning start.
                    </>
                  ) : (
                    <>
                      This action reserves the learner.
                      Their course clock does{" "}
                      <strong>
                        not
                      </strong>{" "}
                      start until they are marked{" "}
                      <strong>
                        BOOKED
                      </strong>
                      .
                    </>
                  )}

                </p>

              </div>

            </div>

          </div>

          {/* =====================================================
              01 · LEARNER
          ===================================================== */}

          <div className="mt-7">

            <div className="mb-4">

              <p className="st-eyebrow">
                01 · LEARNER
              </p>

              <h3 className="mt-1 text-[14px] font-bold text-[var(--st-charcoal-dark)]">
                Learner details
              </h3>

            </div>

            <div className="rounded-2xl border border-[var(--st-border)] bg-white">

              <div className="border-b border-[var(--st-border)] px-4 py-4">

                <p className="m-0 text-[9px] font-bold uppercase tracking-[0.07em] text-[var(--st-gray)]">
                  Full name
                </p>

                <p className="mt-1 mb-0 text-[13px] font-bold text-[var(--st-charcoal-dark)]">
                  {studentName}
                </p>

              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2">

                <div className="border-b border-[var(--st-border)] px-4 py-4 sm:border-r">

                  <p className="m-0 text-[9px] font-bold uppercase tracking-[0.07em] text-[var(--st-gray)]">
                    WhatsApp
                  </p>

                  <p className="mt-1 mb-0 break-all text-[10px] font-medium text-[var(--st-charcoal-dark)]">
                    {whatsapp}
                  </p>

                </div>

                <div className="border-b border-[var(--st-border)] px-4 py-4 sm:border-b-0">

                  <p className="m-0 text-[9px] font-bold uppercase tracking-[0.07em] text-[var(--st-gray)]">
                    Email
                  </p>

                  <p className="mt-1 mb-0 break-all text-[10px] font-medium text-[var(--st-charcoal-dark)]">
                    {email}
                  </p>

                </div>

              </div>

              <div className="px-4 py-4">

                <p className="m-0 text-[9px] font-bold uppercase tracking-[0.07em] text-[var(--st-gray)]">
                  Instrument
                </p>

                <p className="mt-1 mb-0 text-[11px] font-bold text-[var(--st-charcoal-dark)]">
                  {getInstrumentName(
                    booking.instrument,
                  )}
                </p>

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

              <div>

                <label className="mb-2 block text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--st-charcoal)]">
                  Programme name *
                </label>

                <input
                  type="text"
                  value={programmeName}
                  onChange={(event) =>
                    setProgrammeName(
                      event.target.value,
                    )
                  }
                  placeholder="e.g. 3 Month Training Programme"
                  disabled={registering}
                  className="w-full rounded-xl border border-[var(--st-border)] px-4 py-3.5 text-[11px] outline-none transition focus:border-[var(--st-red)] disabled:opacity-60"
                />

              </div>

              <div>

                <label className="mb-2 block text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--st-charcoal)]">
                  {isBookingMode
                    ? "Learning start date *"
                    : "Planned start date *"}
                </label>

                <div className="relative">

                  <CalendarDays
                    size={14}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--st-red)]"
                  />

                  <input
                    type="date"
                    value={plannedStartDate}
                    onChange={(event) =>
                      setPlannedStartDate(
                        event.target.value,
                      )
                    }
                    disabled={registering}
                    className="w-full rounded-xl border border-[var(--st-border)] bg-white py-3.5 pl-10 pr-3 text-[11px] outline-none focus:border-[var(--st-red)] disabled:opacity-60"
                  />

                </div>

                <p className="mt-2 mb-0 text-[8px] leading-relaxed text-[var(--st-gray)]">

                  {isBookingMode ? (
                    <>
                      This date becomes the learner's
                      actual programme start date.
                    </>
                  ) : (
                    <>
                      This is the intended start date.
                      The course clock remains paused until
                      the learner is BOOKED.
                    </>
                  )}

                </p>

              </div>

            </div>

          </div>

          {/* =====================================================
              03 · PAYMENT
          ===================================================== */}

          <div className="mt-7 border-t border-[var(--st-border)] pt-7">

            <div className="mb-4">

              <p className="st-eyebrow">
                03 · PAYMENT
              </p>

              <h3 className="mt-1 text-[14px] font-bold text-[var(--st-charcoal-dark)]">
                {isBookingMode
                  ? "Learning payment"
                  : "Registration payment"}
              </h3>

              <p className="mt-1 text-[9px] leading-relaxed text-[var(--st-gray)]">
                The learner can start with any amount.
                The remaining balance stays on the
                enrolment.
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
                    min="1"
                    value={totalFee}
                    onChange={(event) =>
                      setTotalFee(
                        event.target.value,
                      )
                    }
                    disabled={registering}
                    placeholder="26850"
                    className="w-full rounded-xl border border-[var(--st-border)] py-3.5 pl-14 pr-4 text-[12px] font-semibold outline-none focus:border-[var(--st-red)] disabled:opacity-60"
                  />

                </div>

              </div>

              {/* INITIAL PAYMENT */}

              <div className="rounded-2xl bg-[var(--st-bg-soft)] p-4">

                <div className="mb-3 flex items-center justify-between gap-3">

                  <div>

                    <p className="m-0 text-[9px] font-bold uppercase tracking-[0.06em] text-[var(--st-gray)]">
                      Initial payment *
                    </p>

                    <p className="mt-1 mb-0 text-[8px] text-[var(--st-gray)]">
                      Amount received now
                    </p>

                  </div>

                  <CreditCard
                    size={15}
                    className="text-[var(--st-red)]"
                  />

                </div>

                <input
                  type="number"
                  min="1"
                  value={initialPayment}
                  onChange={(event) =>
                    setInitialPayment(
                      event.target.value,
                    )
                  }
                  disabled={registering}
                  placeholder="e.g. 5000"
                  className="w-full rounded-xl border border-[var(--st-border)] bg-white px-4 py-3.5 text-[12px] font-semibold outline-none focus:border-[var(--st-red)] disabled:opacity-60"
                />

              </div>

              {/* PAYMENT METHOD */}

              <div>

                <label className="mb-2 block text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--st-charcoal)]">
                  Payment method *
                </label>

                <select
                  value={paymentMethod}
                  onChange={(event) =>
                    setPaymentMethod(
                      event.target
                        .value as PaymentMethod,
                    )
                  }
                  disabled={registering}
                  className="w-full rounded-xl border border-[var(--st-border)] bg-white px-4 py-3.5 text-[11px] outline-none focus:border-[var(--st-red)] disabled:opacity-60"
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

              </div>

              {/* PAYMENT REFERENCE */}

              <div>

                <label className="mb-2 block text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--st-charcoal)]">
                  Payment reference
                </label>

                <input
                  type="text"
                  value={paymentReference}
                  onChange={(event) =>
                    setPaymentReference(
                      event.target.value,
                    )
                  }
                  disabled={registering}
                  placeholder="e.g. M-Pesa transaction code"
                  className="w-full rounded-xl border border-[var(--st-border)] px-4 py-3.5 text-[11px] outline-none focus:border-[var(--st-red)] disabled:opacity-60"
                />

              </div>

              {/* BALANCE */}

              <div className="rounded-2xl border border-[var(--st-border)] p-4">

                <div className="flex items-center justify-between gap-4">

                  <div>

                    <p className="m-0 text-[9px] font-bold uppercase tracking-[0.06em] text-[var(--st-gray)]">
                      Balance after payment
                    </p>

                    <p className="mt-1 mb-0 text-[8px] text-[var(--st-gray)]">
                      Amount remaining on programme
                    </p>

                  </div>

                  <p className="m-0 text-[16px] font-bold text-[var(--st-charcoal-dark)]">
                    {formatCurrency(
                      remainingBalance,
                    )}
                  </p>

                </div>

              </div>

            </div>

          </div>

          {/* =====================================================
              04 · NOTES
          ===================================================== */}

          <div className="mt-7 border-t border-[var(--st-border)] pt-7">

            <div className="mb-4">

              <p className="st-eyebrow">
                04 · NOTES
              </p>

              <h3 className="mt-1 text-[14px] font-bold text-[var(--st-charcoal-dark)]">
                {isBookingMode
                  ? "Learning notes"
                  : "Registration notes"}
              </h3>

            </div>

            <textarea
              value={notes}
              onChange={(event) =>
                setNotes(
                  event.target.value,
                )
              }
              disabled={registering}
              rows={4}
              placeholder="Optional notes..."
              className="w-full resize-none rounded-xl border border-[var(--st-border)] px-4 py-3 text-[11px] outline-none focus:border-[var(--st-red)] disabled:opacity-60"
            />

          </div>

          {/* =====================================================
              ERROR
          ===================================================== */}

          {(validationError ||
            error) && (
            <div className="mt-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3">

              <AlertCircle
                size={15}
                className="mt-0.5 shrink-0 text-red-600"
              />

              <p className="m-0 text-[9px] leading-relaxed text-red-700">
                {validationError ||
                  error}
              </p>

            </div>
          )}

          {/* =====================================================
              FOOTER
          ===================================================== */}

          <div className="mt-7 flex flex-col-reverse gap-2 border-t border-[var(--st-border)] pt-5 sm:flex-row sm:justify-end">

            <button
              type="button"
              onClick={onClose}
              disabled={registering}
              className="w-full rounded-xl border border-[var(--st-border)] bg-white px-5 py-3.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--st-charcoal-dark)] transition hover:bg-[var(--st-bg-soft)] disabled:opacity-50 sm:w-auto"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={registering}
              className={`flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-[10px] font-bold uppercase tracking-[0.08em] text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto ${
                isBookingMode
                  ? "bg-purple-700"
                  : "bg-pink-700"
              }`}
            >

              {registering ? (
                <>
                  <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  {submittingLabel}
                </>
              ) : (
                <>
                  {isBookingMode ? (
                    <UserPlus size={14} />
                  ) : (
                    <UserCheck size={14} />
                  )}

                  {submitLabel}
                </>
              )}

            </button>

          </div>

        </div>

      </div>
    </div>
  );
}