type RegistrationSummaryProps = {
  studentName: string;
  programmeName: string;
  programmePeriod: string;
  totalFee: number;
  initialPayment: number;
  remainingBalance: number;
  formatCurrency: (amount: number) => string;
};

export default function RegistrationSummary({
  studentName,
  programmeName,
  programmePeriod,
  totalFee,
  initialPayment,
  remainingBalance,
  formatCurrency,
}: RegistrationSummaryProps) {
  return (
    <div className="mt-7 rounded-2xl bg-[var(--st-bg-soft)] p-4">

      <p className="m-0 text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--st-gray)]">
        Registration summary
      </p>

      <div className="mt-4 space-y-3">

        <div className="flex items-center justify-between gap-3">

          <span className="text-[9px] text-[var(--st-gray)]">
            Student
          </span>

          <span className="text-[10px] font-bold text-[var(--st-charcoal-dark)]">
            {studentName || "Not entered"}
          </span>

        </div>

        <div className="flex items-center justify-between gap-3">

          <span className="text-[9px] text-[var(--st-gray)]">
            Programme
          </span>

          <span className="text-[10px] font-bold text-[var(--st-charcoal-dark)]">
            {programmeName}
          </span>

        </div>

        <div className="flex items-center justify-between gap-3">

          <span className="text-[9px] text-[var(--st-gray)]">
            Programme period
          </span>

          <span className="text-[10px] font-bold text-[var(--st-charcoal-dark)]">
            {programmePeriod || "Not entered"}
          </span>

        </div>

        <div className="border-t border-[var(--st-border)] pt-3">

          <div className="flex items-center justify-between gap-3">

            <span className="text-[9px] text-[var(--st-gray)]">
              Total fee
            </span>

            <span className="text-[11px] font-bold text-[var(--st-charcoal-dark)]">
              {formatCurrency(totalFee)}
            </span>

          </div>

          <div className="mt-2 flex items-center justify-between gap-3">

            <span className="text-[9px] text-[var(--st-gray)]">
              Initial payment
            </span>

            <span className="text-[11px] font-bold text-green-700">
              {formatCurrency(initialPayment)}
            </span>

          </div>

          <div className="mt-2 flex items-center justify-between gap-3">

            <span className="text-[9px] text-[var(--st-gray)]">
              Remaining balance
            </span>

            <span className="text-[13px] font-bold text-[var(--st-red)]">
              {formatCurrency(remainingBalance)}
            </span>

          </div>

        </div>

      </div>

    </div>
  );
}