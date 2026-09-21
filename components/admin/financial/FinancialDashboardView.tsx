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

function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function formatInteger(value: number | null | undefined) {
  return new Intl.NumberFormat("en-KE", {
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function formatPercentage(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "—";
  }

  return `${Number(value).toFixed(1)}%`;
}

function formatMonthLabel(monthStart: string) {
  const date = new Date(`${monthStart}T00:00:00+03:00`);

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
    (total, expense) => total + Number(expense.amount || 0),
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

  return (Number(expense.amount || 0) / total) * 100;
}

function getExpenseGradient(
  expenses: FinancialExpenseBreakdown[]
) {
  const total = getExpenseTotal(expenses);

  if (!total) {
    return "conic-gradient(var(--st-bg-soft) 0deg 360deg)";
  }

  let currentDegree = 0;

  const stops = expenses.map((expense, index) => {
    const percentage = getExpensePercentage(
      expense,
      total
    );

    const degrees = (percentage / 100) * 360;

    const start = currentDegree;
    const end = currentDegree + degrees;

    currentDegree = end;

    /*
     * Deliberately use CSS variables / neutral palette
     * rather than introducing new brand colours.
     */
    const colors = [
      "var(--st-red)",
      "var(--st-charcoal-dark)",
      "#8B7B68",
      "#B8A98D",
      "#D8CCB8",
      "#6F6F6F",
    ];

    const color =
      colors[index % colors.length];

    return `${color} ${start}deg ${end}deg`;
  });

  return `conic-gradient(${stops.join(", ")})`;
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
  const toneClass =
    tone === "positive"
      ? "text-[var(--st-green)]"
      : tone === "negative"
        ? "text-[var(--st-red)]"
        : tone === "warning"
          ? "text-amber-600"
          : "text-[var(--st-charcoal-dark)]";

  return (
    <div className="st-card min-w-0 p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="m-0 text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--st-gray)]">
            {label}
          </p>

          <p
            className={`mt-3 mb-0 truncate text-[22px] font-bold leading-none tracking-[-0.03em] ${toneClass}`}
          >
            {value}
          </p>

          {detail && (
            <p className="mt-3 mb-0 text-[9px] leading-relaxed text-[var(--st-gray)]">
              {detail}
            </p>
          )}
        </div>

        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--st-bg-soft)] text-[var(--st-red)]">
          {icon}
        </div>
      </div>
    </div>
  );
}

/* =====================================================
   SECTION HEADER
===================================================== */

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div>
      {eyebrow && (
        <p className="st-eyebrow">
          {eyebrow}
        </p>
      )}

      <h2 className="mt-1 st-section-title">
        {title}
      </h2>

      {description && (
        <p className="mt-1 mb-0 text-[10px] text-[var(--st-gray)]">
          {description}
        </p>
      )}
    </div>
  );
}

/* =====================================================
   EMPTY STATE
===================================================== */

function EmptyState({
  message,
}: {
  message: string;
}) {
  return (
    <div className="flex min-h-[180px] items-center justify-center rounded-xl bg-[var(--st-bg-soft)] px-5 text-center">
      <p className="m-0 max-w-[320px] text-[10px] leading-relaxed text-[var(--st-gray)]">
        {message}
      </p>
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
  const total = getExpenseTotal(expenses);

  const sortedExpenses = [...expenses].sort(
    (a, b) =>
      Number(b.amount || 0) -
      Number(a.amount || 0)
  );

  return (
    <div className="st-card min-w-0 overflow-hidden">
      <div className="border-b border-[var(--st-border)] px-5 py-4">
        <SectionHeader
          title="Expense Breakdown"
          description="Where the money is being spent"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 p-5 md:grid-cols-[minmax(220px,0.8fr)_minmax(0,1.2fr)]">
        {/* DONUT */}

        <div className="flex flex-col items-center justify-center">
          <div
            className="relative flex h-[190px] w-[190px] items-center justify-center rounded-full"
            style={{
              background: getExpenseGradient(
                sortedExpenses
              ),
            }}
          >
            <div className="flex h-[118px] w-[118px] flex-col items-center justify-center rounded-full bg-white shadow-sm">
              <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--st-gray)]">
                Total
              </span>

              <span className="mt-2 text-[17px] font-bold tracking-[-0.03em] text-[var(--st-charcoal-dark)]">
                {formatCurrency(total)}
              </span>
            </div>
          </div>
        </div>

        {/* BREAKDOWN */}

        <div className="flex min-w-0 flex-col justify-center">
          {sortedExpenses.length === 0 ? (
            <EmptyState message="No expense data has been recorded for this period." />
          ) : (
            <div className="space-y-3">
              {sortedExpenses.map(
                (expense, index) => {
                  const percentage =
                    getExpensePercentage(
                      expense,
                      total
                    );

                  const colors = [
                    "bg-[var(--st-red)]",
                    "bg-[var(--st-charcoal-dark)]",
                    "bg-[#8B7B68]",
                    "bg-[#B8A98D]",
                    "bg-[#D8CCB8]",
                    "bg-[#6F6F6F]",
                  ];

                  return (
                    <div
                      key={`${expense.category}-${index}`}
                      className="min-w-0"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <span
                            className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                              colors[
                                index %
                                  colors.length
                              ]
                            }`}
                          />

                          <span className="truncate text-[10px] font-semibold capitalize text-[var(--st-charcoal-dark)]">
                            {expense.category}
                          </span>
                        </div>

                        <div className="shrink-0 text-right">
                          <span className="text-[10px] font-bold text-[var(--st-charcoal-dark)]">
                            {formatCurrency(
                              expense.amount
                            )}
                          </span>

                          <span className="ml-2 text-[9px] text-[var(--st-gray)]">
                            {formatPercentage(
                              percentage
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--st-bg-soft)]">
                        <div
                          className={`h-full rounded-full ${
                            colors[
                              index %
                                colors.length
                            ]
                          }`}
                          style={{
                            width: `${Math.min(
                              100,
                              percentage
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* =====================================================
   TARGETS
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
    <div className="rounded-2xl border border-[var(--st-border)] bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="m-0 text-[9px] font-bold uppercase tracking-[0.11em] text-[var(--st-gray)]">
            {label}
          </p>

          <p className="mt-3 mb-0 text-[20px] font-bold tracking-[-0.03em] text-[var(--st-charcoal-dark)]">
            {value}
          </p>

          <p className="mt-2 mb-0 text-[9px] leading-relaxed text-[var(--st-gray)]">
            {detail}
          </p>
        </div>

        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--st-bg-soft)] text-[var(--st-red)]">
          {icon}
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
      label: "CAC",
      value:
        performance?.cac !== null &&
        performance?.cac !== undefined
          ? formatCurrency(
              performance.cac
            )
          : settings.cac_status ||
            "Placeholder",
      detail:
        performance?.cac !== null &&
        performance?.cac !== undefined
          ? "Customer acquisition cost"
          : "Formula awaiting final client definition",
      tone: "default",
    },
    {
      label: "CPL",
      value:
        performance?.cpl !== null &&
        performance?.cpl !== undefined
          ? formatCurrency(
              performance.cpl
            )
          : settings.cpl_status ||
            "Placeholder",
      detail:
        performance?.cpl !== null &&
        performance?.cpl !== undefined
          ? "Cost per lead"
          : "Formula awaiting final client definition",
      tone: "default",
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
        performance?.conversion_rate !==
          null &&
        performance?.conversion_rate !==
          undefined
          ? "Lead-to-student conversion"
          : "Formula awaiting final client definition",
      tone: "positive",
    },
    {
      label: "ROI",
      value:
        performance?.roi !== null &&
        performance?.roi !== undefined
          ? formatPercentage(
              performance.roi
            )
          : settings.roi_status ||
            "Placeholder",
      detail:
        performance?.roi !== null &&
        performance?.roi !== undefined
          ? "Return on investment"
          : "Formula awaiting final client definition",
      tone: "positive",
    },
    {
      label: "Revenue / Student",
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
        "Average booked value per registered student",
      tone: "default",
    },
  ];

  return (
    <div className="st-card overflow-hidden">
      <div className="border-b border-[var(--st-border)] px-5 py-4">
        <SectionHeader
          title="Business Performance Metrics"
          description="Core acquisition, conversion and return indicators"
        />
      </div>

      <div className="grid grid-cols-1 divide-y divide-[var(--st-border)] sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-5 lg:divide-x lg:divide-y-0">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="min-w-0 p-5"
          >
            <p className="m-0 text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--st-gray)]">
              {metric.label}
            </p>

            <p
              className={`mt-3 mb-0 truncate text-[19px] font-bold tracking-[-0.03em] ${
                metric.tone ===
                "positive"
                  ? "text-[var(--st-green)]"
                  : "text-[var(--st-charcoal-dark)]"
              }`}
            >
              {metric.value}
            </p>

            <p className="mt-2 mb-0 text-[9px] leading-relaxed text-[var(--st-gray)]">
              {metric.detail}
            </p>
          </div>
        ))}
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
      label: "Booked",
      value: activity?.booked ?? 0,
      icon: <CalendarDays size={15} />,
    },
    {
      label: "Attended",
      value: activity?.attended ?? 0,
      icon: <Users size={15} />,
    },
    {
      label: "Registered",
      value: activity?.registered ?? 0,
      icon: <TrendingUp size={15} />,
    },
    {
      label: "Cancelled",
      value: activity?.cancelled ?? 0,
      icon: <ArrowDownRight size={15} />,
    },
    {
      label: "Missed",
      value: activity?.missed ?? 0,
      icon: <ArrowDownRight size={15} />,
    },
  ];

  return (
    <div className="st-card overflow-hidden">
      <div className="border-b border-[var(--st-border)] px-5 py-4">
        <SectionHeader
          title="Student Activity"
          description="Booking and student movement during the selected month"
        />
      </div>

      <div className="grid grid-cols-2 divide-x divide-y divide-[var(--st-border)] sm:grid-cols-3 lg:grid-cols-5 lg:divide-y-0">
        {items.map((item) => (
          <div
            key={item.label}
            className="min-w-0 p-5"
          >
            <div className="flex items-center gap-2 text-[var(--st-red)]">
              {item.icon}

              <span className="truncate text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                {item.label}
              </span>
            </div>

            <p className="mt-3 mb-0 text-[24px] font-bold tracking-[-0.04em] text-[var(--st-charcoal-dark)]">
              {formatInteger(item.value)}
            </p>
          </div>
        ))}
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

  const outstanding = obligations.reduce(
    (total, obligation) =>
      total +
      Number(
        obligation.outstanding_balance ||
          0
      ),
    0
  );

  return (
    <div className="st-card overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-[var(--st-border)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <SectionHeader
          title="Financial Obligations"
          description="Current obligations recorded in the financial system"
        />

        <div className="shrink-0 rounded-xl bg-[var(--st-bg-soft)] px-3 py-2">
          <p className="m-0 text-[8px] font-bold uppercase tracking-[0.1em] text-[var(--st-gray)]">
            Outstanding
          </p>

          <p className="mt-1 mb-0 text-[13px] font-bold text-[var(--st-red)]">
            {formatCurrency(outstanding)}
          </p>
        </div>
      </div>

      {obligations.length === 0 ? (
        <div className="p-5">
          <EmptyState message="No financial obligations have been recorded yet." />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse">
            <thead>
              <tr className="border-b border-[var(--st-border)] bg-[var(--st-bg-soft)]">
                <th className="px-5 py-3 text-left text-[8px] font-bold uppercase tracking-[0.1em] text-[var(--st-gray)]">
                  Obligation
                </th>

                <th className="px-5 py-3 text-left text-[8px] font-bold uppercase tracking-[0.1em] text-[var(--st-gray)]">
                  Category
                </th>

                <th className="px-5 py-3 text-right text-[8px] font-bold uppercase tracking-[0.1em] text-[var(--st-gray)]">
                  Amount
                </th>

                <th className="px-5 py-3 text-left text-[8px] font-bold uppercase tracking-[0.1em] text-[var(--st-gray)]">
                  Frequency
                </th>

                <th className="px-5 py-3 text-right text-[8px] font-bold uppercase tracking-[0.1em] text-[var(--st-gray)]">
                  Outstanding
                </th>

                <th className="px-5 py-3 text-left text-[8px] font-bold uppercase tracking-[0.1em] text-[var(--st-gray)]">
                  Status
                </th>
              </tr>
            </thead>

            <tbody>
              {obligations.map(
                (obligation) => (
                  <tr
                    key={obligation.id}
                    className="border-b border-[var(--st-border)] last:border-b-0"
                  >
                    <td className="px-5 py-4">
                      <p className="m-0 text-[10px] font-bold text-[var(--st-charcoal-dark)]">
                        {obligation.name}
                      </p>

                      {obligation.notes && (
                        <p className="mt-1 mb-0 max-w-[260px] truncate text-[8px] text-[var(--st-gray)]">
                          {obligation.notes}
                        </p>
                      )}
                    </td>

                    <td className="px-5 py-4 text-[9px] capitalize text-[var(--st-gray)]">
                      {obligation.category}
                    </td>

                    <td className="px-5 py-4 text-right text-[10px] font-semibold text-[var(--st-charcoal-dark)]">
                      {formatCurrency(
                        obligation.amount
                      )}
                    </td>

                    <td className="px-5 py-4 text-[9px] capitalize text-[var(--st-gray)]">
                      {obligation.frequency}
                    </td>

                    <td className="px-5 py-4 text-right text-[10px] font-bold text-[var(--st-charcoal-dark)]">
                      {formatCurrency(
                        obligation.outstanding_balance
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-[8px] font-bold uppercase tracking-[0.06em] ${
                          obligation.status ===
                          "paid"
                            ? "bg-green-50 text-green-700"
                            : obligation.status ===
                                "overdue"
                              ? "bg-red-50 text-red-700"
                              : "bg-[var(--st-bg-soft)] text-[var(--st-charcoal-dark)]"
                        }`}
                      >
                        {obligation.status ||
                          "Active"}
                      </span>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* =====================================================
   PAGE COMPONENT
===================================================== */

export default function FinancialDashboardView({
  dashboard,
  monthStart,
  loading = false,
  refreshing = false,
  error = "",
  onRefresh,
  onPreviousMonth,
  onNextMonth,
}: FinancialDashboardViewProps) {
  /*
   * The component intentionally does not fetch from Supabase.
   * financial-service.ts remains responsible for data access.
   */

  const summary =
    dashboard?.summary;

  const settings =
    dashboard?.settings;

  const bookedValue =
    Number(summary?.booked_value || 0);

  const moneyReceived =
    Number(summary?.money_received || 0);

  const moneySpent =
    Number(summary?.money_spent || 0);

  const moneyPending =
    Number(summary?.money_pending || 0);

  const netCashFlow =
    Number(summary?.net_cash_flow || 0);

  /*
   * Agreed business model:
   *
   * 24 bookings × KSh 21,850
   * = KSh 524,400 monthly target.
   *
   * We still prefer the value coming from
   * financial-service.ts when available.
   */

  const monthlyTarget =
    Number(
      summary?.monthly_revenue_target ||
        settings?.monthly_booking_target ||
        24 * 21850
    );

  const annualTarget =
    monthlyTarget * 12;

  const lifetimeTarget =
    settings?.lifetime_booking_target;

  const targetProgress =
    monthlyTarget > 0
      ? Math.min(
          100,
          (bookedValue /
            monthlyTarget) *
            100
        )
      : 0;

  const expenseTotal =
    moneySpent;

  return (
    <main className="st-content min-w-0 overflow-x-hidden">
      {/* =================================================
          HEADER
      ================================================= */}

      <div className="mb-6 flex min-w-0 flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <p className="st-eyebrow">
            FINANCIAL DASHBOARD
          </p>

          <h1 className="st-page-title mt-2">
            Financial &amp; Booking Overview
          </h1>

          <p className="st-page-description">
            Live financial performance, booking value,
            targets and business activity.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onPreviousMonth}
            disabled={loading}
            className="st-button st-button-secondary"
          >
            ← Previous
          </button>

          <div className="flex h-9 items-center rounded-xl border border-[var(--st-border)] bg-white px-4">
            <CalendarDays
              size={14}
              className="mr-2 text-[var(--st-red)]"
            />

            <span className="text-[10px] font-bold text-[var(--st-charcoal-dark)]">
              {formatMonthLabel(
                monthStart
              )}
            </span>
          </div>

          <button
            type="button"
            onClick={onNextMonth}
            disabled={loading}
            className="st-button st-button-secondary"
          >
            Next →
          </button>

          <button
            type="button"
            onClick={onRefresh}
            disabled={
              loading || refreshing
            }
            className="st-button st-button-primary"
          >
            <RefreshCw
              size={14}
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

      {/* =================================================
          ERROR
      ================================================= */}

      {error && (
        <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
          <p className="m-0 text-[10px] font-bold text-red-700">
            {error}
          </p>
        </div>
      )}

      {/* =================================================
          LOADING
      ================================================= */}

      {loading && !dashboard ? (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {Array.from({
              length: 5,
            }).map((_, index) => (
              <div
                key={index}
                className="h-[145px] animate-pulse rounded-2xl bg-[var(--st-bg-soft)]"
              />
            ))}
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.25fr_0.75fr]">
            <div className="h-[330px] animate-pulse rounded-2xl bg-[var(--st-bg-soft)]" />

            <div className="h-[330px] animate-pulse rounded-2xl bg-[var(--st-bg-soft)]" />
          </div>
        </div>
      ) : !dashboard ? (
        <div className="st-card p-8 text-center">
          <p className="m-0 text-[12px] font-bold text-[var(--st-charcoal-dark)]">
            Financial dashboard data is unavailable.
          </p>

          <p className="mt-2 mb-0 text-[10px] text-[var(--st-gray)]">
            Try refreshing the dashboard.
          </p>
        </div>
      ) : (
        <div className="min-w-0 space-y-5">
          {/* =================================================
              TOP FINANCIAL CARDS
          ================================================= */}

          <section className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <KpiCard
              label="Revenue"
              value={formatCurrency(
                bookedValue
              )}
              detail="Total booked value"
              icon={
                <CircleDollarSign
                  size={18}
                />
              }
              tone="positive"
            />

            <KpiCard
              label="Money Received"
              value={formatCurrency(
                moneyReceived
              )}
              detail="Payments received"
              icon={
                <CreditCard size={18} />
              }
              tone="positive"
            />

            <KpiCard
              label="Money Spent"
              value={formatCurrency(
                moneySpent
              )}
              detail="Recorded expenses"
              icon={
                <WalletCards size={18} />
              }
              tone="negative"
            />

            <KpiCard
              label="Money Pending"
              value={formatCurrency(
                moneyPending
              )}
              detail="Outstanding expected collections"
              icon={
                <TrendingUp size={18} />
              }
              tone="warning"
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
                    size={18}
                  />
                ) : (
                  <ArrowDownRight
                    size={18}
                  />
                )
              }
              tone={
                netCashFlow >= 0
                  ? "positive"
                  : "negative"
              }
            />
          </section>

          {/* =================================================
              TARGET / BOOKING OVERVIEW
          ================================================= */}

          <section className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-[1.35fr_0.65fr]">
            <div className="st-card min-w-0 overflow-hidden">
              <div className="border-b border-[var(--st-border)] px-5 py-4">
                <SectionHeader
                  title="Booking Value Performance"
                  description="Progress against the monthly booking target"
                />
              </div>

              <div className="p-5">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="m-0 text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--st-gray)]">
                      Current booked value
                    </p>

                    <p className="mt-2 mb-0 text-[30px] font-bold tracking-[-0.04em] text-[var(--st-charcoal-dark)]">
                      {formatCurrency(
                        bookedValue
                      )}
                    </p>
                  </div>

                  <div className="sm:text-right">
                    <p className="m-0 text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--st-gray)]">
                      Monthly target
                    </p>

                    <p className="mt-2 mb-0 text-[18px] font-bold text-[var(--st-red)]">
                      {formatCurrency(
                        monthlyTarget
                      )}
                    </p>
                  </div>
                </div>

                <div className="mt-6">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                      Target progress
                    </span>

                    <span className="text-[11px] font-bold text-[var(--st-charcoal-dark)]">
                      {targetProgress.toFixed(
                        1
                      )}
                      %
                    </span>
                  </div>

                  <div className="mt-2 h-3 overflow-hidden rounded-full bg-[var(--st-bg-soft)]">
                    <div
                      className="h-full rounded-full bg-[var(--st-red)] transition-all"
                      style={{
                        width: `${targetProgress}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-[var(--st-bg-soft)] p-4">
                    <p className="m-0 text-[8px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                      Bookings
                    </p>

                    <p className="mt-2 mb-0 text-[20px] font-bold text-[var(--st-charcoal-dark)]">
                      {formatInteger(
                        summary?.bookings_count
                      )}
                    </p>
                  </div>

                  <div className="rounded-xl bg-[var(--st-bg-soft)] p-4">
                    <p className="m-0 text-[8px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                      Booking Value
                    </p>

                    <p className="mt-2 mb-0 text-[20px] font-bold text-[var(--st-charcoal-dark)]">
                      {formatCurrency(
                        summary?.booking_value
                      )}
                    </p>
                  </div>

                  <div className="rounded-xl bg-[var(--st-bg-soft)] p-4">
                    <p className="m-0 text-[8px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                      Target Remaining
                    </p>

                    <p className="mt-2 mb-0 text-[20px] font-bold text-[var(--st-red)]">
                      {formatCurrency(
                        Math.max(
                          0,
                          monthlyTarget -
                            bookedValue
                        )
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* TARGET VALUES */}

            <div className="grid grid-cols-1 gap-4">
              <TargetCard
                label="Maximum Bookable Value"
                value={formatCurrency(
                  monthlyTarget
                )}
                detail="24 bookings × KSh 21,850"
                icon={
                  <Target size={18} />
                }
              />

              <TargetCard
                label="Annual Target Value"
                value={formatCurrency(
                  annualTarget
                )}
                detail="Monthly target × 12 months"
                icon={
                  <TrendingUp size={18} />
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
                        lifetimeTarget
                      )
                    : "Not set"
                }
                detail="Configured long-term business target"
                icon={
                  <CircleDollarSign
                    size={18}
                  />
                }
              />
            </div>
          </section>

          {/* =================================================
              EXPENSES + QUICK FINANCIAL SNAPSHOT
          ================================================= */}

          <section className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-[1.25fr_0.75fr]">
            <ExpenseBreakdown
              expenses={
                dashboard.expenses
              }
            />

            <div className="st-card min-w-0 overflow-hidden">
              <div className="border-b border-[var(--st-border)] px-5 py-4">
                <SectionHeader
                  title="Cash Position"
                  description="Current financial movement"
                />
              </div>

              <div className="grid grid-cols-1 divide-y divide-[var(--st-border)]">
                <div className="p-5">
                  <p className="m-0 text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--st-gray)]">
                    Received
                  </p>

                  <p className="mt-2 mb-0 text-[24px] font-bold text-[var(--st-green)]">
                    {formatCurrency(
                      moneyReceived
                    )}
                  </p>
                </div>

                <div className="p-5">
                  <p className="m-0 text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--st-gray)]">
                    Spent
                  </p>

                  <p className="mt-2 mb-0 text-[24px] font-bold text-[var(--st-red)]">
                    {formatCurrency(
                      expenseTotal
                    )}
                  </p>
                </div>

                <div className="p-5">
                  <p className="m-0 text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--st-gray)]">
                    Net
                  </p>

                  <p
                    className={`mt-2 mb-0 text-[24px] font-bold ${
                      netCashFlow >=
                      0
                        ? "text-[var(--st-green)]"
                        : "text-[var(--st-red)]"
                    }`}
                  >
                    {formatCurrency(
                      netCashFlow
                    )}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* =================================================
              BUSINESS PERFORMANCE
          ================================================= */}

          <PerformanceMetrics
            dashboard={dashboard}
          />

          {/* =================================================
              STUDENT ACTIVITY
          ================================================= */}

          <StudentActivity
            dashboard={dashboard}
          />

          {/* =================================================
              FINANCIAL OBLIGATIONS
          ================================================= */}

          <FinancialObligations
            dashboard={dashboard}
          />
        </div>
      )}

      {/* =================================================
          FOOTER
      ================================================= */}

      <div className="mt-7 flex flex-col gap-2 border-t border-[var(--st-border)] pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="m-0 text-[9px] text-[var(--st-gray)]">
          Sauti Tamu Piano Center · Financial Dashboard
        </p>

        <p className="m-0 text-[9px] text-[var(--st-gray)]">
          Live financial administration
        </p>
      </div>
    </main>
  );
}