"use client";

import {
  AlertCircle,
  CalendarDays,
  Check,
  CreditCard,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type PaymentMethod =
  | "mpesa"
  | "cash"
  | "bank"
  | "card"
  | "other";

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
  booking: RegistrationBooking | null;
  registering?: boolean;
  error?: string;
  onClose: () => void;
  onSubmit: (values: RegistrationFormValues) => void | Promise<void>;
}

const DEFAULT_PROGRAMME = "3 Month Training Programme";
const DEFAULT_FEE = "26850";

function todayString() {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);

  return local.toISOString().slice(0, 10);
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(amount);
}

function instrumentName(instrument?: "piano" | "guitar") {
  if (instrument === "guitar") return "Acoustic Guitar";
  return "Piano";
}

export default function RegistrationModal({
  show,
  booking,
  registering = false,
  error = "",
  onClose,
  onSubmit,
}: RegistrationModalProps) {
  const [programmeName, setProgrammeName] =
    useState(DEFAULT_PROGRAMME);

  const [plannedStartDate, setPlannedStartDate] =
    useState(todayString());

  const [totalFee, setTotalFee] =
    useState(DEFAULT_FEE);

  const [initialPayment, setInitialPayment] =
    useState("");

  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("mpesa");

  const [paymentReference, setPaymentReference] =
    useState("");

  const [notes, setNotes] = useState("");

  const [validationError, setValidationError] =
    useState("");

  useEffect(() => {
    if (!show || !booking) return;

    setProgrammeName(DEFAULT_PROGRAMME);
    setPlannedStartDate(todayString());
    setTotalFee(DEFAULT_FEE);
    setInitialPayment("");
    setPaymentMethod("mpesa");
    setPaymentReference("");
    setNotes("");
    setValidationError("");
  }, [show, booking?.id]);

  const numericTotalFee = useMemo(() => {
    const value = Number(totalFee);
    return Number.isFinite(value) && value > 0 ? value : 0;
  }, [totalFee]);

  const numericInitialPayment = useMemo(() => {
    const value = Number(initialPayment);
    return Number.isFinite(value) && value > 0 ? value : 0;
  }, [initialPayment]);

  const remainingBalance = Math.max(
    numericTotalFee - numericInitialPayment,
    0,
  );

  function handleSubmit() {
    setValidationError("");

    if (!booking) {
      setValidationError("No booking selected.");
      return;
    }

    if (!programmeName.trim()) {
      setValidationError("Please enter the programme name.");
      return;
    }

    if (!plannedStartDate) {
      setValidationError("Please select the planned start date.");
      return;
    }

    if (numericTotalFee <= 0) {
      setValidationError("Please enter a valid course fee.");
      return;
    }

    if (numericInitialPayment <= 0) {
      setValidationError(
        "Please enter the initial payment amount.",
      );
      return;
    }

    if (numericInitialPayment > numericTotalFee) {
      setValidationError(
        "Initial payment cannot be greater than the course fee.",
      );
      return;
    }

    onSubmit({
      programmeName: programmeName.trim(),
      plannedStartDate,
      totalFee: numericTotalFee,
      initialPayment: numericInitialPayment,
      paymentMethod,
      paymentReference: paymentReference.trim(),
      notes: notes.trim(),
    });
  }

  if (!show || !booking) return null;

  const studentName =
    booking.lead?.full_name || "Unnamed learner";

  const whatsapp =
    booking.lead?.whatsapp_number || "No WhatsApp number";

  const email =
    booking.lead?.email || "No email address";

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-black/50 sm:items-center sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="registration-modal-title"
    >
      <div className="max-h-[94vh] w-full max-w-[560px] overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">

        {/* HEADER */}
        <div className="sticky top-0 z-30 border-b border-[var(--st-border)] bg-white px-5 py-4">
          <div className="flex items-start justify-between gap-4">

            <div>
              <p className="st-eyebrow">
                STUDENT REGISTRATION
              </p>

              <h2
                id="registration-modal-title"
                className="mt-1 text-[21px] font-bold text-[var(--st-charcoal-dark)]"
              >
                Register learner
              </h2>

              <p className="mt-1 text-[10px] leading-relaxed text-[var(--st-gray)]">
                Reserve the learner and programme before lessons
                officially begin.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={registering}
              className="st-icon-button disabled:opacity-40"
              aria-label="Close registration modal"
            >
              <X size={17} />
            </button>

          </div>
        </div>

        <div className="p-5">

          {/* =====================================================
              REGISTRATION STATUS
          ===================================================== */}

          <div className="rounded-2xl border border-[var(--st-border)] bg-[var(--st-bg-soft)] p-4">

            <div className="flex items-start gap-3">

              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white">
                <Check
                  size={15}
                  className="text-[var(--st-red)]"
                />
              </div>

              <div>
                <p className="m-0 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--st-charcoal-dark)]">
                  REGISTERED
                </p>

                <p className="mt-1 mb-0 text-[9px] leading-relaxed text-[var(--st-gray)]">
                  Registration reserves the learner. Their course
                  clock does <strong>not</strong> start until they
                  are marked <strong>BOOKED</strong>.
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
                  {instrumentName(booking.instrument)}
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
                    setProgrammeName(event.target.value)
                  }
                  placeholder="e.g. 3 Month Training Programme"
                  disabled={registering}
                  className="w-full rounded-xl border border-[var(--st-border)] px-4 py-3.5 text-[11px] outline-none transition focus:border-[var(--st-red)] disabled:opacity-60"
                />
              </div>

              <div>
                <label className="mb-2 block text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--st-charcoal)]">
                  Planned start date *
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
                      setPlannedStartDate(event.target.value)
                    }
                    disabled={registering}
                    className="w-full rounded-xl border border-[var(--st-border)] bg-white py-3.5 pl-10 pr-3 text-[11px] outline-none focus:border-[var(--st-red)] disabled:opacity-60"
                  />

                </div>

                <p className="mt-2 mb-0 text-[8px] leading-relaxed text-[var(--st-gray)]">
                  This is the intended start date. The actual
                  course clock begins only when the learner is
                  marked BOOKED.
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
                Registration payment
              </h3>

              <p className="mt-1 text-[9px] leading-relaxed text-[var(--st-gray)]">
                The learner can start with any amount. The
                remaining balance stays on the enrolment.
              </p>
            </div>

            <div className="space-y-4">

              {/* COURSE FEE */}

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
                      setTotalFee(event.target.value)
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
                      Amount received at registration
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
                    setInitialPayment(event.target.value)
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
                      event.target.value as PaymentMethod,
                    )
                  }
                  disabled={registering}
                  className="w-full rounded-xl border border-[var(--st-border)] bg-white px-4 py-3.5 text-[11px] outline-none focus:border-[var(--st-red)] disabled:opacity-60"
                >
                  <option value="mpesa">M-Pesa</option>
                  <option value="cash">Cash</option>
                  <option value="bank">Bank</option>
                  <option value="card">Card</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* REFERENCE */}

              <div>
                <label className="mb-2 block text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--st-charcoal)]">
                  Payment reference
                </label>

                <input
                  type="text"
                  value={paymentReference}
                  onChange={(event) =>
                    setPaymentReference(event.target.value)
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
                      Balance after registration
                    </p>

                    <p className="mt-1 mb-0 text-[8px] text-[var(--st-gray)]">
                      Amount remaining on the programme
                    </p>
                  </div>

                  <p className="m-0 text-[16px] font-bold text-[var(--st-charcoal-dark)]">
                    {formatCurrency(remainingBalance)}
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
                Registration notes
              </h3>
            </div>

            <textarea
              value={notes}
              onChange={(event) =>
                setNotes(event.target.value)
              }
              disabled={registering}
              rows={4}
              placeholder="Optional notes about the registration..."
              className="w-full resize-none rounded-xl border border-[var(--st-border)] px-4 py-3 text-[11px] outline-none focus:border-[var(--st-red)] disabled:opacity-60"
            />

          </div>

          {/* ERROR */}

          {(validationError || error) && (
            <div className="mt-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3">

              <AlertCircle
                size={15}
                className="mt-0.5 shrink-0 text-red-600"
              />

              <p className="m-0 text-[9px] leading-relaxed text-red-700">
                {validationError || error}
              </p>

            </div>
          )}

          {/* FOOTER */}

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
              className="w-full rounded-xl bg-[var(--st-charcoal-dark)] px-5 py-3.5 text-[10px] font-bold uppercase tracking-[0.08em] text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {registering ? "Registering..." : "Register Learner"}
            </button>

          </div>

        </div>
      </div>
    </div>
  );
}