import { ChevronDown } from "lucide-react";

type PaymentMethod =
  | "mpesa"
  | "cash"
  | "bank"
  | "card"
  | "other";

type PaymentPlanFormProps = {
  totalFee: string;
  initialPayment: string;
  initialPaymentMethod: PaymentMethod;
  initialPaymentReference: string;

  numericTotalFee: number;
  numericInitialPayment: number;
  remainingAfterInitial: number;
  remainingAfterNextPayment: number;

  onTotalFeeChange: (value: string) => void;
  onInitialPaymentChange: (value: string) => void;
  onInitialPaymentMethodChange: (
    value: PaymentMethod
  ) => void;
  onInitialPaymentReferenceChange: (
    value: string
  ) => void;

  formatCurrency: (amount: number) => string;
};

export default function PaymentPlanForm({
  totalFee,
  initialPayment,
  initialPaymentMethod,
  initialPaymentReference,
  numericTotalFee,
  numericInitialPayment,
  remainingAfterInitial,
  remainingAfterNextPayment,
  onTotalFeeChange,
  onInitialPaymentChange,
  onInitialPaymentMethodChange,
  onInitialPaymentReferenceChange,
  formatCurrency,
}: PaymentPlanFormProps) {
  return (
    <div className="mt-7 border-t border-[var(--st-border)] pt-7">

      {/* HEADER */}

      <div className="mb-4">

        <p className="st-eyebrow">
          03 · PAYMENT PLAN
        </p>

        <h3 className="mt-1 text-[14px] font-bold text-[var(--st-charcoal-dark)]">
          Programme payment
        </h3>

        <p className="mt-1 text-[9px] leading-relaxed text-[var(--st-gray)]">
          The student can start with any amount. The
          remaining balance can be followed up through
          scheduled payments.
        </p>

      </div>

      <div className="space-y-4">

        {/* TOTAL PROGRAMME FEE */}

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
                onTotalFeeChange(
                  event.target.value
                )
              }
              placeholder="e.g. 26850"
              className="w-full rounded-xl border border-[var(--st-border)] py-3.5 pl-14 pr-4 text-[12px] font-semibold outline-none focus:border-[var(--st-red)]"
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
                onInitialPaymentChange(
                  event.target.value
                )
              }
              placeholder="0"
              className="w-full rounded-xl border border-[var(--st-border)] bg-white px-4 py-3.5 text-[12px] font-semibold outline-none focus:border-[var(--st-red)]"
            />

          </div>

          {/* PAYMENT METHOD */}

          {numericInitialPayment > 0 && (
            <div className="mt-3">

              <label className="mb-2 block text-[8px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                Payment method
              </label>

              <div className="relative">

                <select
                  value={initialPaymentMethod}
                  onChange={(event) =>
                    onInitialPaymentMethodChange(
                      event.target
                        .value as PaymentMethod
                    )
                  }
                  className="w-full appearance-none rounded-xl border border-[var(--st-border)] bg-white px-4 py-3.5 text-[10px] font-semibold outline-none focus:border-[var(--st-red)]"
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

          {/* REFERENCE */}

          {numericInitialPayment > 0 && (
            <div className="mt-3">

              <label className="mb-2 block text-[8px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                Reference
              </label>

              <input
                type="text"
                value={initialPaymentReference}
                onChange={(event) =>
                  onInitialPaymentReferenceChange(
                    event.target.value
                  )
                }
                placeholder="M-Pesa code / receipt number"
                className="w-full rounded-xl border border-[var(--st-border)] bg-white px-4 py-3 text-[10px] outline-none focus:border-[var(--st-red)]"
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
  );
}