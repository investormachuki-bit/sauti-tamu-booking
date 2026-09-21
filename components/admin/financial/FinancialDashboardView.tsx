"use client";

import type { ReactNode } from "react";

import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  CircleDollarSign,
  CreditCard,
  RefreshCw,
  Target,
  TrendingUp,
  Users,
  WalletCards,
} from "lucide-react";

import type {
  FinancialDashboardData,
  FinancialExpenseBreakdown,
} from "@/lib/financial-service";

/* =====================================================
   TYPES
===================================================== */

type FinancialDashboardViewProps = {
  dashboard: FinancialDashboardData | null;
  monthStart: string;
  loading?: boolean;
  refreshing?: boolean;
  error?: string;
  onRefresh?: () => void;
  onPreviousMonth?: () => void;
  onNextMonth?: () => void;
};

/* =====================================================
   HELPERS
===================================================== */

const NAIROBI_TIME_ZONE = "Africa/Nairobi";

function formatCurrency(
  value: number | null | undefined
) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function formatInteger(
  value: number | null | undefined
) {
  return new Intl.NumberFormat("en-KE", {
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function formatPercentage(
  value: number | null | undefined
) {
  if (
    value === null ||
    value === undefined
  ) {
    return "—";
  }

  return `${Number(value).toFixed(1)}%`;
}

function formatMonthLabel(
  monthStart: string
) {
  const date = new Date(
    `${monthStart}T00:00:00+03:00`
  );

  if (Number.isNaN(date.getTime())) {
    return monthStart;
  }

  return new Intl.DateTimeFormat("en-KE", {
    timeZone: NAIROBI_TIME_ZONE,
    month: "long",
    year: "numeric",
  }).format(date);
}

function getExpenseTotal(
  expenses: FinancialExpenseBreakdown[]
) {
  return expenses.reduce(
    (total, expense) =>
      total + Number(expense.amount || 0),
    0
  );
}

function getExpensePercentage(
  expense: FinancialExpenseBreakdown,
  total: number
) {
  if (total <= 0) {
    return 0;
  }

  return (
    (Number(expense.amount || 0) /
      total) *
    100
  );
}

function getExpenseGradient(
  expenses: FinancialExpenseBreakdown[]
) {
  const total =
    getExpenseTotal(expenses);

  if (!total) {
    return "conic-gradient(var(--st-bg-soft) 0deg 360deg)";
  }

  const colors = [
    "var(--st-red)",
    "var(--st-charcoal-dark)",
    "#8B7B68",
    "#B8A98D",
    "#D8CCB8",
    "#6F6F6F",
  ];

  let currentDegree = 0;

  const stops = expenses.map(
    (expense, index) => {
      const percentage =
        getExpensePercentage(
          expense,
          total
        );

      const degrees =
        (percentage / 100) * 360;

      const start =
        currentDegree;

      const end =
        currentDegree + degrees;

      currentDegree = end;

      return `${colors[index % colors.length]} ${start}deg ${end}deg`;
    }
  );

  return `conic-gradient(${stops.join(
    ", "
  )})`;
}

/* =====================================================
   SHARED SECTION HEADER
===================================================== */

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="min-w-0">
      <h2 className="m-0 text-[15px] font-bold tracking-[-0.02em] text-[var(--st-charcoal-dark)]">
        {title}
      </h2>

      {description && (
        <p className="mt-1 mb-0 text-[9px] leading-relaxed text-[var(--st-gray)]">
          {description}
        </p>
      )}
    </div>
  );
}

/* =====================================================
   KPI CARD
===================================================== */

function KpiCard({
  label,
  value,
  detail,
  icon,
  tone = "default",
}: {
  label: string;
  value: string;
  detail?: string;
  icon: ReactNode;
  tone?:
    | "default"
    | "positive"
    | "negative"
    | "warning";
}) {
  const valueClass =
    tone === "positive"
      ? "text-[var(--st-green)]"
      : tone === "negative"
        ? "text-[var(--st-red)]"
        : tone === "warning"
          ? "text-amber-600"
          : "text-[var(--st-charcoal-dark)]";

  return (
    <div className="min-w-0 rounded-2xl border border-[var(--st-border)] bg-white px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="m-0 text-[8px] font-bold uppercase tracking-[0.12em] text-[var(--st-gray)]">
            {label}
          </p>

          <p
            className={`mt-2 mb-0 truncate text-[21px] font-bold leading-none tracking-[-0.04em] ${valueClass}`}
          >
            {value}
          </p>

          {detail && (
            <p className="mt-2 mb-0 truncate text-[8px] text-[var(--st-gray)]">
              {detail}
            </p>
          )}
        </div>

        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--st-bg-soft)] text-[var(--st-red)]">
          {icon}
        </div>
      </div>
    </div>
  );
}

/* =====================================================
   TARGET CARD
===================================================== */

function TargetCard({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-[var(--st-border)] bg-white px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="m-0 text-[8px] font-bold uppercase tracking-[0.12em] text-[var(--st-gray)]">
            {label}
          </p>

          <p className="mt-2 mb-0 truncate text-[19px] font-bold leading-none tracking-[-0.03em] text-[var(--st-charcoal-dark)]">
            {value}
          </p>

          <p className="mt-2 mb-0 text-[8px] leading-relaxed text-[var(--st-gray)]">
            {detail}
          </p>
        </div>

        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--st-bg-soft)] text-[var(--st-red)]">
          {icon}
        </div>
      </div>
    </div>
  );
}

/* =====================================================
   BOOKING VALUE PERFORMANCE
===================================================== */

function BookingValuePerformance({
  dashboard,
}: {
  dashboard: FinancialDashboardData;
}) {
  const summary =
    dashboard.summary;

  const currentValue =
    Number(
      summary?.booked_value || 0
    );

  const target =
    Number(
      summary?.monthly_revenue_target ||
        dashboard.settings
          ?.monthly_booking_target *
          dashboard.settings?.booking_value ||
        0
    );

  const bookingValue =
    Number(
      summary?.booking_value ||
        dashboard.settings
          ?.booking_value ||
        21850
    );

  const bookings =
    Number(
      summary?.bookings_count || 0
    );

  const progress =
    target > 0
      ? Math.min(
          100,
          (currentValue / target) *
            100
        )
      : 0;

  const remaining =
    Math.max(
      0,
      target - currentValue
    );

  return (
    <div className="rounded-2xl border border-[var(--st-border)] bg-white overflow-hidden">
      <div className="border-b border-[var(--st-border)] px-5 py-3">
        <SectionHeader
          title="Booking Value Performance"
          description="Progress against the monthly booking target"
        />
      </div>

      <div className="px-5 py-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="m-0 text-[8px] font-bold uppercase tracking-[0.11em] text-[var(--st-gray)]">
              Current Booked Value
            </p>

            <p className="mt-2 mb-0 text-[25px] font-bold leading-none tracking-[-0.04em] text-[var(--st-charcoal-dark)]">
              {formatCurrency(
                currentValue
              )}
            </p>
          </div>

          <div className="md:text-right">
            <p className="m-0 text-[8px] font-bold uppercase tracking-[0.11em] text-[var(--st-gray)]">
              Monthly Target
            </p>

            <p className="mt-2 mb-0 text-[14px] font-bold text-[var(--st-red)]">
              {formatCurrency(target)}
            </p>
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="text-[8px] font-bold uppercase tracking-[0.1em] text-[var(--st-gray)]">
              Target Progress
            </span>

            <span className="text-[9px] font-bold text-[var(--st-charcoal-dark)]">
              {progress.toFixed(1)}%
            </span>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-[var(--st-bg-soft)]">
            <div
              className="h-full rounded-full bg-[var(--st-red)] transition-all"
              style={{
                width: `${progress}%`,
              }}
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-[var(--st-bg-soft)] px-3 py-3">
            <p className="m-0 text-[7px] font-bold uppercase tracking-[0.1em] text-[var(--st-gray)]">
              Bookings
            </p>

            <p className="mt-2 mb-0 text-[17px] font-bold leading-none text-[var(--st-charcoal-dark)]">
              {formatInteger(
                bookings
              )}
            </p>
          </div>

          <div className="rounded-xl bg-[var(--st-bg-soft)] px-3 py-3">
            <p className="m-0 text-[7px] font-bold uppercase tracking-[0.1em] text-[var(--st-gray)]">
              Booking Value
            </p>

            <p className="mt-2 mb-0 text-[13px] font-bold leading-none text-[var(--st-charcoal-dark)]">
              {formatCurrency(
                bookingValue
              )}
            </p>
          </div>

          <div className="rounded-xl bg-[var(--st-bg-soft)] px-3 py-3">
            <p className="m-0 text-[7px] font-bold uppercase tracking-[0.1em] text-[var(--st-gray)]">
              Target Remaining
            </p>

            <p className="mt-2 mb-0 truncate text-[13px] font-bold leading-none text-[var(--st-red)]">
              {formatCurrency(
                remaining
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =====================================================
   EXPENSE BREAKDOWN
===================================================== */

function ExpenseBreakdown({
  expenses,
}: {
  expenses: FinancialExpenseBreakdown[];
}) {
  const total =
    getExpenseTotal(expenses);

  const sortedExpenses =
    [...expenses].sort(
      (a, b) =>
        Number(b.amount || 0) -
        Number(a.amount || 0)
    );

  const colors = [
    "var(--st-red)",
    "var(--st-charcoal-dark)",
    "#8B7B68",
    "#B8A98D",
    "#D8CCB8",
    "#6F6F6F",
  ];

  return (
    <div className="rounded-2xl border border-[var(--st-border)] bg-white overflow-hidden">
      <div className="border-b border-[var(--st-border)] px-5 py-3">
        <SectionHeader
          title="Expense Breakdown"
          description="Where the money is being spent"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 p-5 lg:grid-cols-[190px_minmax(0,1fr)]">
        <div className="flex items-center justify-center">
          <div
            className="relative flex h-[160px] w-[160px] items-center justify-center rounded-full"
            style={{
              background:
                getExpenseGradient(
                  sortedExpenses
                ),
            }}
          >
            <div className="flex h-[98px] w-[98px] flex-col items-center justify-center rounded-full bg-white shadow-sm">
              <span className="text-[7px] font-bold uppercase tracking-[0.12em] text-[var(--st-gray)]">
                Total
              </span>

              <span className="mt-2 text-[15px] font-bold leading-none tracking-[-0.03em] text-[var(--st-charcoal-dark)]">
                {formatCurrency(
                  total
                )}
              </span>
            </div>
          </div>
        </div>

        <div className="min-w-0 self-center">
          {sortedExpenses.length ===
          0 ? (
            <div className="flex min-h-[150px] items-center justify-center rounded-xl bg-[var(--st-bg-soft)] px-5 text-center">
              <p className="m-0 text-[9px] text-[var(--st-gray)]">
                No expense data has
                been recorded for
                this period.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {sortedExpenses.map(
                (
                  expense,
                  index
                ) => {
                  const percentage =
                    getExpensePercentage(
                      expense,
                      total
                    );

                  const color =
                    colors[
                      index %
                        colors.length
                    ];

                  return (
                    <div
                      key={`${expense.category}-${index}`}
                      className="min-w-0"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <span
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{
                              backgroundColor:
                                color,
                            }}
                          />

                          <span className="truncate text-[9px] font-semibold capitalize text-[var(--st-charcoal-dark)]">
                            {
                              expense.category
                            }
                          </span>
                        </div>

                        <div className="shrink-0 text-right">
                          <span className="text-[9px] font-bold text-[var(--st-charcoal-dark)]">
                            {formatCurrency(
                              expense.amount
                            )}
                          </span>

                          <span className="ml-2 text-[8px] text-[var(--st-gray)]">
                            {formatPercentage(
                              percentage
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }
              )}

              <div className="mt-3 border-t border-[var(--st-border)] pt-3 text-right">
                <span className="text-[9px] font-bold text-[var(--st-red)]">
                  Total Monthly
                  Expenses{" "}
                  {formatCurrency(
                    total
                  )}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* =====================================================
   PERFORMANCE METRICS
===================================================== */

function PerformanceMetrics({
  dashboard,
}: {
  dashboard: FinancialDashboardData;
}) {
  const performance =
    dashboard.performance;

  const settings =
    dashboard.settings;

  const metrics = [
    {
      label: "ROI",
      value:
        performance?.roi !==
          null &&
        performance?.roi !==
          undefined
          ? formatPercentage(
              performance.roi
            )
          : settings.roi_status ||
            "Placeholder",
      detail:
        "Return on investment",
    },
    {
      label: "CAC",
      value:
        performance?.cac !==
          null &&
        performance?.cac !==
          undefined
          ? formatCurrency(
              performance.cac
            )
          : settings.cac_status ||
            "Placeholder",
      detail:
        "Customer acquisition cost",
    },
    {
      label: "CPL",
      value:
        performance?.cpl !==
          null &&
        performance?.cpl !==
          undefined
          ? formatCurrency(
              performance.cpl
            )
          : settings.cpl_status ||
            "Placeholder",
      detail: "Cost per lead",
    },
    {
      label: "Conversion Rate",
      value:
        performance?.conversion_rate !==
          null &&
        performance?.conversion_rate !==
          undefined
          ? formatPercentage(
              performance.conversion_rate
            )
          : settings.conversion_rate_status ||
            "Placeholder",
      detail:
        "Leads → enrollments",
    },
    {
      label: "Revenue per Student",
      value:
        performance?.revenue_per_student !==
          null &&
        performance?.revenue_per_student !==
          undefined
          ? formatCurrency(
              performance.revenue_per_student
            )
          : "—",
      detail:
        "Average booked value per student",
    },
  ];

  return (
    <div className="rounded-2xl border border-[var(--st-border)] bg-white overflow-hidden">
      <div className="border-b border-[var(--st-border)] px-5 py-3">
        <SectionHeader
          title="Business Performance Metrics"
          description="Key metrics to measure marketing efficiency and business growth"
        />
      </div>

      <div className="grid grid-cols-1 divide-y divide-[var(--st-border)] sm:grid-cols-2 lg:grid-cols-5 lg:divide-x lg:divide-y-0">
        {metrics.map(
          (metric) => (
            <div
              key={metric.label}
              className="min-w-0 px-4 py-4"
            >
              <p className="m-0 text-[8px] font-bold uppercase tracking-[0.1em] text-[var(--st-gray)]">
                {metric.label}
              </p>

              <p className="mt-2 mb-0 truncate text-[18px] font-bold leading-none tracking-[-0.03em] text-[var(--st-charcoal-dark)]">
                {metric.value}
              </p>

              <p className="mt-2 mb-0 truncate text-[8px] text-[var(--st-gray)]">
                {metric.detail}
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
}

/* =====================================================
   STUDENT ACTIVITY
===================================================== */

function StudentActivity({
  dashboard,
}: {
  dashboard: FinancialDashboardData;
}) {
  const activity =
    dashboard.activity;

  const items = [
    {
      label: "Attended",
      value:
        activity?.attended || 0,
      icon: (
        <Users size={13} />
      ),
    },
    {
      label: "Booked",
      value:
        activity?.booked || 0,
      icon: (
        <CalendarDays size={13} />
      ),
    },
    {
      label: "Registered",
      value:
        activity?.registered ||
        0,
      icon: (
        <Users size={13} />
      ),
    },
    {
      label: "Cancelled",
      value:
        activity?.cancelled ||
        0,
      icon: (
        <ArrowDownRight
          size={13}
        />
      ),
    },
    {
      label: "Missed",
      value:
        activity?.missed || 0,
      icon: (
        <ArrowDownRight
          size={13}
        />
      ),
    },
  ];

  return (
    <div className="rounded-2xl border border-[var(--st-border)] bg-white overflow-hidden">
      <div className="border-b border-[var(--st-border)] px-5 py-3">
        <SectionHeader
          title="Student Activity (This Month)"
          description="Booking and student movement during the selected month"
        />
      </div>

      <div className="grid grid-cols-2 divide-x divide-y divide-[var(--st-border)] sm:grid-cols-5 sm:divide-y-0">
        {items.map(
          (item) => (
            <div
              key={item.label}
              className="min-w-0 px-4 py-4"
            >
              <div className="flex items-center gap-2 text-[var(--st-red)]">
                {item.icon}

                <span className="truncate text-[8px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                  {item.label}
                </span>
              </div>

              <p className="mt-3 mb-0 text-[22px] font-bold leading-none tracking-[-0.03em] text-[var(--st-charcoal-dark)]">
                {formatInteger(
                  item.value
                )}
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
}

/* =====================================================
   FINANCIAL OBLIGATIONS
===================================================== */

function FinancialObligations({
  dashboard,
}: {
  dashboard: FinancialDashboardData;
}) {
  const obligations =
    dashboard.obligations || [];

  const totalOutstanding =
    obligations.reduce(
      (total, item) =>
        total +
        Number(
          item.outstanding_balance ||
            0
        ),
      0
    );

  const visible =
    obligations.slice(0, 4);

  return (
    <div className="rounded-2xl border border-[var(--st-border)] bg-white overflow-hidden">
      <div className="flex items-center justify-between gap-4 border-b border-[var(--st-border)] px-5 py-3">
        <SectionHeader
          title="Financial Obligations"
          description="Track your key personal and business financial commitments"
        />

        <div className="shrink-0 rounded-xl bg-[var(--st-bg-soft)] px-3 py-2 text-right">
          <p className="m-0 text-[7px] font-bold uppercase tracking-[0.1em] text-[var(--st-gray)]">
            Outstanding
          </p>

          <p className="mt-1 mb-0 text-[11px] font-bold text-[var(--st-red)]">
            {formatCurrency(
              totalOutstanding
            )}
          </p>
        </div>
      </div>

      {visible.length ===
      0 ? (
        <div className="m-4 flex min-h-[120px] items-center justify-center rounded-xl bg-[var(--st-bg-soft)] px-5 text-center">
          <p className="m-0 text-[9px] text-[var(--st-gray)]">
            No financial
            obligations have
            been recorded yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 divide-y divide-[var(--st-border)] sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-y-0">
          {visible.map(
            (item) => (
              <div
                key={item.id}
                className="min-w-0 px-4 py-4"
              >
                <p className="m-0 truncate text-[9px] font-bold text-[var(--st-charcoal-dark)]">
                  {item.name}
                </p>

                <p className="mt-2 mb-0 text-[17px] font-bold leading-none text-[var(--st-charcoal-dark)]">
                  {formatCurrency(
                    item.amount
                  )}
                </p>

                <p className="mt-2 truncate text-[8px] capitalize text-[var(--st-gray)]">
                  {item.frequency}
                </p>

                {Number(
                  item.outstanding_balance ||
                    0
                ) > 0 && (
                  <p className="mt-2 truncate text-[8px] font-semibold text-[var(--st-red)]">
                    Outstanding{" "}
                    {formatCurrency(
                      item.outstanding_balance
                    )}
                  </p>
                )}
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}

/* =====================================================
   MAIN DASHBOARD
===================================================== */

export default function FinancialDashboardView({
  dashboard,
  monthStart,
  loading = false,
  refreshing = false,
  error,
  onRefresh,
  onPreviousMonth,
  onNextMonth,
}: FinancialDashboardViewProps) {
  if (loading && !dashboard) {
    return (
      <main className="st-content overflow-x-hidden">
        <div className="flex min-h-[420px] items-center justify-center">
          <div className="text-center">
            <RefreshCw
              size={22}
              className="mx-auto animate-spin text-[var(--st-red)]"
            />

            <p className="mt-3 mb-0 text-[11px] font-semibold text-[var(--st-charcoal-dark)]">
              Loading financial
              dashboard...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!dashboard) {
    return (
      <main className="st-content overflow-x-hidden">
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-5">
          <p className="m-0 text-[11px] font-semibold text-red-700">
            {error ||
              "Financial dashboard data is unavailable."}
          </p>

          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="mt-3 text-[10px] font-bold text-red-700 underline"
            >
              Try refreshing the
              dashboard
            </button>
          )}
        </div>
      </main>
    );
  }

  const summary =
    dashboard.summary;

  const settings =
    dashboard.settings;

  /*
   * AGREED BUSINESS MODEL
   *
   * Revenue = Total booked value
   *
   * Monthly target =
   * 24 bookings × KSh 21,850
   */

  const bookedValue =
    Number(
      summary?.booked_value || 0
    );

  const moneyReceived =
    Number(
      summary?.money_received || 0
    );

  const moneySpent =
    Number(
      summary?.money_spent || 0
    );

  const moneyPending =
    Number(
      summary?.money_pending || 0
    );

  const netCashFlow =
    Number(
      summary?.net_cash_flow ??
        moneyReceived -
          moneySpent
    );

  const monthlyTarget =
    Number(
      summary?.monthly_revenue_target ||
        settings.monthly_booking_target *
          settings.booking_value
    );

  const monthlyBookingTarget =
    Number(
      summary?.monthly_booking_target ||
        settings.monthly_booking_target ||
        24
    );

  const bookingValue =
    Number(
      summary?.booking_value ||
        settings.booking_value ||
        21850
    );

  const maximumBookableValue =
    monthlyBookingTarget *
    bookingValue;

  const annualTargetValue =
    maximumBookableValue * 12;

  const lifetimeTarget =
    settings.lifetime_booking_target;

  return (
    <main className="st-content overflow-x-hidden">
      {/* =================================================
          PAGE HEADER
      ================================================= */}

      <div className="mb-5">
        <p className="st-eyebrow">
          FINANCIAL DASHBOARD
        </p>

        <h1 className="st-page-title mt-1">
          Financial &amp; Booking
          Overview
        </h1>

        <p className="st-page-description mt-1">
          Live financial performance,
          booking value, targets and
          business activity.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={
              onPreviousMonth
            }
            disabled={
              !onPreviousMonth ||
              refreshing
            }
            className="st-button st-button-secondary"
          >
            ← Previous
          </button>

          <div className="flex items-center gap-2 rounded-xl border border-[var(--st-border)] bg-white px-3 py-2 text-[9px] font-semibold text-[var(--st-charcoal-dark)]">
            <CalendarDays
              size={12}
              className="text-[var(--st-red)]"
            />

            {formatMonthLabel(
              monthStart
            )}
          </div>

          <button
            type="button"
            onClick={
              onNextMonth
            }
            disabled={
              !onNextMonth ||
              refreshing
            }
            className="st-button st-button-secondary"
          >
            Next →
          </button>

          <button
            type="button"
            onClick={
              onRefresh
            }
            disabled={
              !onRefresh ||
              refreshing
            }
            className="st-button st-button-primary"
          >
            <RefreshCw
              size={13}
              className={
                refreshing
                  ? "animate-spin"
                  : ""
              }
            />

            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <p className="m-0 text-[9px] font-semibold text-red-700">
            {error}
          </p>
        </div>
      )}

      {/* =================================================
          TOP FINANCIAL KPI ROW
      ================================================= */}

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          label="Revenue"
          value={formatCurrency(
            bookedValue
          )}
          detail="Total booked value"
          icon={
            <CircleDollarSign
              size={16}
            />
          }
        />

        <KpiCard
          label="Money Received"
          value={formatCurrency(
            moneyReceived
          )}
          detail="Payments received"
          icon={
            <CreditCard
              size={16}
            />
          }
        />

        <KpiCard
          label="Money Spent"
          value={formatCurrency(
            moneySpent
          )}
          detail="Recorded expenses"
          icon={
            <WalletCards
              size={16}
            />
          }
          tone="negative"
        />

        <KpiCard
          label="Net Cash Flow"
          value={formatCurrency(
            netCashFlow
          )}
          detail="Received less money spent"
          icon={
            netCashFlow >= 0 ? (
              <ArrowUpRight
                size={16}
              />
            ) : (
              <ArrowDownRight
                size={16}
              />
            )
          }
          tone={
            netCashFlow >= 0
              ? "positive"
              : "negative"
          }
        />

        <KpiCard
          label="Money Pending"
          value={formatCurrency(
            moneyPending
          )}
          detail="Outstanding expected collections"
          icon={
            <TrendingUp
              size={16}
            />
          }
          tone="warning"
        />
      </section>

      {/* =================================================
          MAIN TARGET / BOOKING AREA
      ================================================= */}

      <section className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(270px,0.75fr)]">
        <BookingValuePerformance
          dashboard={dashboard}
        />

        <div className="grid grid-cols-1 gap-3">
          <TargetCard
            label="Maximum Bookable Value"
            value={formatCurrency(
              maximumBookableValue
            )}
            detail={`${monthlyBookingTarget} bookings × ${formatCurrency(
              bookingValue
            )}`}
            icon={
              <Target size={16} />
            }
          />

          <TargetCard
            label="Annual Target Value"
            value={formatCurrency(
              annualTargetValue
            )}
            detail={`${monthlyBookingTarget} bookings per month × 12 months`}
            icon={
              <TrendingUp
                size={16}
              />
            }
          />

          <TargetCard
            label="Lifetime Target Value"
            value={
              lifetimeTarget !==
                null &&
              lifetimeTarget !==
                undefined
                ? formatCurrency(
                    lifetimeTarget *
                      bookingValue
                  )
                : "Not set"
            }
            detail={
              lifetimeTarget !==
                null &&
              lifetimeTarget !==
                undefined
                ? `${formatInteger(
                    lifetimeTarget
                  )} lifetime bookings`
                : "Configured long-term business target"
            }
            icon={
              <CircleDollarSign
                size={16}
              />
            }
          />
        </div>
      </section>

      {/* =================================================
          EXPENSES
      ================================================= */}

      <section className="mt-4">
        <ExpenseBreakdown
          expenses={
            dashboard.expenses
          }
        />
      </section>

      {/* =================================================
          PERFORMANCE
      ================================================= */}

      <section className="mt-4">
        <PerformanceMetrics
          dashboard={dashboard}
        />
      </section>

      {/* =================================================
          STUDENT ACTIVITY + OBLIGATIONS
      ================================================= */}

      <section className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
        <StudentActivity
          dashboard={dashboard}
        />

        <FinancialObligations
          dashboard={dashboard}
        />
      </section>

      {/* =================================================
          FOOTER
      ================================================= */}

      <div className="mt-5 flex items-center justify-between border-t border-[var(--st-border)] pt-4">
        <p className="m-0 text-[8px] text-[var(--st-gray)]">
          Sauti Tamu Piano Center ·
          Financial Dashboard
        </p>

        <p className="m-0 text-[8px] text-[var(--st-gray)]">
          Live financial
          administration
        </p>
      </div>
    </main>
  );
}