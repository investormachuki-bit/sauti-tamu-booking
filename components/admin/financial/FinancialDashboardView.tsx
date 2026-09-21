"use client";

import type { ReactNode } from "react";

import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
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
    value === undefined ||
    Number.isNaN(Number(value))
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
    (Number(expense.amount || 0) / total) *
    100
  );
}

function getExpenseGradient(
  expenses: FinancialExpenseBreakdown[]
) {
  const total = getExpenseTotal(expenses);

  if (!total) {
    return "conic-gradient(#edf2f7 0deg 360deg)";
  }

  const colors = [
    "#1d4ed8",
    "#ef476f",
    "#0f766e",
    "#7c3aed",
    "#f59e0b",
    "#06b6d4",
    "#94a3b8",
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

      const start = currentDegree;
      const end = currentDegree + degrees;

      currentDegree = end;

      return `${colors[index % colors.length]} ${start}deg ${end}deg`;
    }
  );

  return `conic-gradient(${stops.join(", ")})`;
}

/* =====================================================
   CARD
===================================================== */

function DashboardCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`min-w-0 overflow-hidden rounded-[14px] border border-[#bfdbfe] bg-white ${className}`}
    >
      {children}
    </div>
  );
}

/* =====================================================
   TOP KPI CARD
===================================================== */

function KpiCard({
  label,
  value,
  detail,
  icon,
  tone = "blue",
}: {
  label: string;
  value: string;
  detail?: string;
  icon: ReactNode;
  tone?:
    | "blue"
    | "green"
    | "red"
    | "purple"
    | "dark";
}) {
  const toneClasses = {
    blue: {
      icon: "bg-blue-50 text-blue-700",
      value: "text-blue-700",
      label: "text-blue-900",
    },
    green: {
      icon: "bg-green-50 text-green-700",
      value: "text-green-800",
      label: "text-green-900",
    },
    red: {
      icon: "bg-red-50 text-red-600",
      value: "text-red-600",
      label: "text-red-700",
    },
    purple: {
      icon: "bg-purple-50 text-purple-700",
      value: "text-purple-700",
      label: "text-purple-900",
    },
    dark: {
      icon: "bg-emerald-50 text-emerald-700",
      value: "text-slate-900",
      label: "text-emerald-900",
    },
  };

  const colors = toneClasses[tone];

  return (
    <div className="relative min-w-0 px-4 py-3">
      <div className="flex items-start gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${colors.icon}`}
        >
          {icon}
        </div>

        <div className="min-w-0 flex-1">
          <p
            className={`m-0 text-[10px] font-bold leading-tight ${colors.label}`}
          >
            {label}
          </p>

          <p
            className={`mt-1 mb-0 truncate text-[22px] font-extrabold leading-none tracking-[-0.04em] ${colors.value}`}
          >
            {value}
          </p>

          {detail && (
            <p className="mt-1 mb-0 truncate text-[8px] leading-tight text-slate-500">
              {detail}
            </p>
          )}
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
    <div className="flex min-w-0 items-center gap-4 border-b border-blue-100 px-5 py-3 last:border-b-0">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
        {icon}
      </div>

      <div className="min-w-0">
        <p className="m-0 text-[10px] font-bold leading-tight text-blue-900">
          {label}
        </p>

        <p className="mt-1 mb-0 truncate text-[21px] font-extrabold leading-none tracking-[-0.04em] text-blue-700">
          {value}
        </p>

        <p className="mt-1 mb-0 truncate text-[8px] leading-tight text-slate-500">
          {detail}
        </p>
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
  const total = getExpenseTotal(expenses);

  const sortedExpenses = [...expenses]
    .sort(
      (a, b) =>
        Number(b.amount || 0) -
        Number(a.amount || 0)
    )
    .slice(0, 8);

  const colors = [
    "#1d4ed8",
    "#ef476f",
    "#0f766e",
    "#7c3aed",
    "#f59e0b",
    "#06b6d4",
    "#64748b",
    "#94a3b8",
  ];

  return (
    <DashboardCard className="h-full">
      <div className="border-b border-blue-100 px-5 py-3">
        <div className="flex items-center gap-3">
          <BarChart3
            size={24}
            className="text-blue-700"
          />

          <div>
            <h2 className="m-0 text-[16px] font-extrabold leading-none text-blue-900">
              Expense Breakdown
            </h2>

            <p className="mt-1 mb-0 text-[9px] text-slate-500">
              Where the money is being spent
            </p>
          </div>
        </div>
      </div>

      <div className="grid min-h-[285px] grid-cols-[220px_minmax(0,1fr)] gap-5 p-4">
        {/* DONUT */}
        <div className="flex items-center justify-center">
          <div
            className="relative flex h-[205px] w-[205px] items-center justify-center rounded-full"
            style={{
              background:
                getExpenseGradient(
                  sortedExpenses
                ),
            }}
          >
            <div className="flex h-[112px] w-[112px] flex-col items-center justify-center rounded-full bg-white shadow-sm">
              <span className="text-[8px] font-bold uppercase tracking-[0.12em] text-slate-500">
                Total Expenses
              </span>

              <span className="mt-2 text-[18px] font-extrabold leading-none text-slate-900">
                {formatCurrency(total)}
              </span>
            </div>
          </div>
        </div>

        {/* BREAKDOWN */}
        <div className="flex min-w-0 flex-col justify-center">
          {sortedExpenses.length === 0 ? (
            <div className="flex h-full min-h-[200px] items-center justify-center rounded-xl bg-slate-50 px-5 text-center">
              <p className="m-0 text-[9px] text-slate-500">
                No expense data has been
                recorded for this period.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {sortedExpenses.map(
                (expense, index) => {
                  const percentage =
                    getExpensePercentage(
                      expense,
                      total
                    );

                  return (
                    <div
                      key={`${expense.category}-${index}`}
                      className="flex items-center justify-between gap-3"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{
                            backgroundColor:
                              colors[
                                index %
                                  colors.length
                              ],
                          }}
                        />

                        <span className="truncate text-[9px] font-medium text-slate-700">
                          {expense.category}
                        </span>
                      </div>

                      <div className="shrink-0 text-right">
                        <span className="text-[9px] font-bold text-slate-900">
                          {formatCurrency(
                            expense.amount
                          )}
                        </span>

                        <span className="ml-3 text-[8px] font-medium text-slate-500">
                          (
                          {formatPercentage(
                            percentage
                          )}
                          )
                        </span>
                      </div>
                    </div>
                  );
                }
              )}

              <div className="mt-2 border-t border-slate-200 pt-2 text-right">
                <span className="text-[10px] font-extrabold text-red-600">
                  Total Monthly Expenses{" "}
                  {formatCurrency(total)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardCard>
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
      sublabel: "Return on Investment",
      value:
        performance?.roi !== null &&
        performance?.roi !== undefined
          ? formatPercentage(
              performance.roi
            )
          : settings.roi_status ||
            "Placeholder",
      footer: "Revenue vs Ad Spend",
    },
    {
      label: "CAC",
      sublabel: "Customer Acquisition Cost",
      value:
        performance?.cac !== null &&
        performance?.cac !== undefined
          ? formatCurrency(
              performance.cac
            )
          : settings.cac_status ||
            "Placeholder",
      footer: "Cost per enrolled student",
    },
    {
      label: "CPL",
      sublabel: "Cost Per Lead",
      value:
        performance?.cpl !== null &&
        performance?.cpl !== undefined
          ? formatCurrency(
              performance.cpl
            )
          : settings.cpl_status ||
            "Placeholder",
      footer: "Cost per lead from ads",
    },
    {
      label: "Conversion Rate",
      sublabel: "Leads → Enrollments",
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
      footer: "Formula awaiting client definition",
    },
    {
      label: "Revenue per Student",
      sublabel: "Average revenue per enrollment",
      value:
        performance?.revenue_per_student !==
          null &&
        performance?.revenue_per_student !==
          undefined
          ? formatCurrency(
              performance.revenue_per_student
            )
          : formatCurrency(
              dashboard.settings
                ?.booking_value ||
                21850
            ),
      footer: "Average booked value per student",
    },
  ];

  return (
    <DashboardCard>
      <div className="border-b border-yellow-200 bg-yellow-50/40 px-5 py-3">
        <div className="flex items-center gap-3">
          <BarChart3
            size={25}
            className="text-amber-700"
          />

          <div>
            <h2 className="m-0 text-[16px] font-extrabold leading-none text-blue-900">
              Business Performance Metrics
            </h2>

            <p className="mt-1 mb-0 text-[9px] text-slate-500">
              Key metrics to measure marketing efficiencies and business growth
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-5 divide-x divide-yellow-100">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="min-w-0 px-4 py-3 text-center"
          >
            <p className="m-0 text-[9px] font-bold text-slate-700">
              {metric.label}
            </p>

            <p className="mt-1 mb-0 truncate text-[8px] text-slate-500">
              {metric.sublabel}
            </p>

            <p className="mt-2 mb-0 truncate text-[22px] font-extrabold leading-none text-slate-900">
              {metric.value}
            </p>

            <p className="mt-1 mb-0 truncate text-[8px] text-blue-700">
              {metric.footer}
            </p>
          </div>
        ))}
      </div>
    </DashboardCard>
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
      value: activity?.attended || 0,
      icon: <Users size={17} />,
      className: "text-blue-700",
    },
    {
      label: "Booked",
      value: activity?.booked || 0,
      icon: <CalendarDays size={17} />,
      className: "text-blue-700",
    },
    {
      label: "Registered",
      value: activity?.registered || 0,
      icon: <Users size={17} />,
      className: "text-emerald-700",
    },
    {
      label: "Cancelled",
      value: activity?.cancelled || 0,
      icon: <ArrowDownRight size={17} />,
      className: "text-red-600",
    },
    {
      label: "Missed",
      value: activity?.missed || 0,
      icon: <ArrowDownRight size={17} />,
      className: "text-purple-700",
    },
  ];

  return (
    <DashboardCard className="h-full">
      <div className="border-b border-blue-100 px-5 py-3">
        <div className="flex items-center gap-3">
          <Users
            size={25}
            className="text-blue-700"
          />

          <div>
            <h2 className="m-0 text-[16px] font-extrabold leading-none text-blue-900">
              Student Activity (This Month)
            </h2>

            <p className="mt-1 mb-0 text-[9px] text-slate-500">
              Booking and student movement
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-5 divide-x divide-blue-100">
        {items.map((item) => (
          <div
            key={item.label}
            className="min-w-0 px-3 py-4 text-center"
          >
            <div
              className={`flex items-center justify-center gap-1 ${item.className}`}
            >
              {item.icon}

              <span className="truncate text-[8px] font-bold">
                {item.label}
              </span>
            </div>

            <p className="mt-3 mb-0 text-[24px] font-extrabold leading-none text-slate-900">
              {formatInteger(item.value)}
            </p>
          </div>
        ))}
      </div>
    </DashboardCard>
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
          item.outstanding_balance || 0
        ),
      0
    );

  const visible =
    obligations.slice(0, 4);

  return (
    <DashboardCard className="h-full">
      <div className="border-b border-blue-100 px-5 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <WalletCards
              size={25}
              className="text-blue-700"
            />

            <div className="min-w-0">
              <h2 className="m-0 truncate text-[16px] font-extrabold leading-none text-blue-900">
                Financial Obligations
              </h2>

              <p className="mt-1 mb-0 truncate text-[9px] text-slate-500">
                Track your key personal and business financial commitments
              </p>
            </div>
          </div>

          <div className="shrink-0 rounded-lg bg-red-50 px-3 py-2 text-right">
            <p className="m-0 text-[7px] font-bold uppercase text-slate-500">
              Outstanding
            </p>

            <p className="mt-1 mb-0 text-[11px] font-extrabold text-red-600">
              {formatCurrency(
                totalOutstanding
              )}
            </p>
          </div>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="p-4">
          <div className="flex min-h-[105px] items-center justify-center rounded-xl bg-slate-50 px-5 text-center">
            <p className="m-0 text-[9px] text-slate-500">
              No financial obligations have
              been recorded yet.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-4 divide-x divide-blue-100">
          {visible.map((item) => (
            <div
              key={item.id}
              className="min-w-0 px-3 py-4 text-center"
            >
              <p className="m-0 truncate text-[9px] font-bold text-slate-700">
                {item.name}
              </p>

              <p className="mt-2 mb-0 truncate text-[18px] font-extrabold leading-none text-slate-900">
                {formatCurrency(item.amount)}
              </p>

              <p className="mt-2 truncate text-[8px] capitalize text-slate-500">
                {item.frequency}
              </p>

              {Number(
                item.outstanding_balance || 0
              ) > 0 && (
                <p className="mt-2 truncate text-[8px] font-bold text-red-600">
                  Outstanding{" "}
                  {formatCurrency(
                    item.outstanding_balance
                  )}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </DashboardCard>
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
              size={24}
              className="mx-auto animate-spin text-blue-700"
            />

            <p className="mt-3 mb-0 text-[11px] font-semibold text-slate-700">
              Loading financial dashboard...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!dashboard) {
    return (
      <main className="st-content overflow-x-hidden">
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4">
          <p className="m-0 text-[10px] font-semibold text-red-700">
            {error ||
              "Financial dashboard data is unavailable."}
          </p>

          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="mt-3 text-[10px] font-bold text-red-700 underline"
            >
              Try refreshing the dashboard
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

  /* =====================================================
     AGREED BUSINESS MODEL

     Revenue = Total booked value

     Monthly target =
     24 bookings × KSh 21,850
  ===================================================== */

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

  const monthlyBookingTarget =
    Number(
      summary?.monthly_booking_target ||
        settings?.monthly_booking_target ||
        24
    );

  const bookingValue =
    Number(
      summary?.booking_value ||
        settings?.booking_value ||
        21850
    );

  const maximumBookableValue =
    monthlyBookingTarget *
    bookingValue;

  const annualTargetValue =
    maximumBookableValue * 12;

  const lifetimeTarget =
    settings?.lifetime_booking_target;

  return (
    <main className="st-content overflow-x-hidden">
      {/* =================================================
          HEADER
      ================================================= */}

      <div className="mb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="m-0 text-[9px] font-bold uppercase tracking-[0.16em] text-blue-700">
              FINANCIAL DASHBOARD
            </p>

            <h1 className="mt-1 mb-0 text-[24px] font-extrabold leading-none tracking-[-0.04em] text-blue-950">
              Financial &amp; Booking Overview
            </h1>

            <p className="mt-1 mb-0 text-[10px] text-slate-500">
              Track your bookings, income, expenses and business performance at a glance
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={onPreviousMonth}
              disabled={
                !onPreviousMonth ||
                refreshing
              }
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[9px] font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              ← Previous
            </button>

            <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[9px] font-bold text-slate-700">
              <CalendarDays
                size={12}
                className="text-red-600"
              />

              {formatMonthLabel(
                monthStart
              )}
            </div>

            <button
              type="button"
              onClick={onNextMonth}
              disabled={
                !onNextMonth ||
                refreshing
              }
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[9px] font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Next →
            </button>

            <button
              type="button"
              onClick={onRefresh}
              disabled={
                !onRefresh ||
                refreshing
              }
              className="flex items-center gap-1 rounded-lg bg-red-600 px-3 py-2 text-[9px] font-bold text-white hover:bg-red-700 disabled:opacity-50"
            >
              <RefreshCw
                size={11}
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
      </div>

      {error && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2">
          <p className="m-0 text-[9px] font-semibold text-red-700">
            {error}
          </p>
        </div>
      )}

      {/* =================================================
          TOP KPI ROW
      ================================================= */}

      <DashboardCard>
        <div className="grid grid-cols-5 divide-x divide-blue-100">
          <KpiCard
            label="Students Booked This Month"
            value={formatInteger(
              summary?.bookings_count || 0
            )}
            detail={`Value: ${formatCurrency(
              bookedValue
            )} @ ${formatCurrency(
              bookingValue
            )} per booking`}
            icon={<Users size={22} />}
            tone="blue"
          />

          <KpiCard
            label="Money Received This Month"
            value={formatCurrency(
              moneyReceived
            )}
            detail="Payments received"
            icon={
              <WalletCards size={22} />
            }
            tone="green"
          />

          <KpiCard
            label="Money Spent This Month"
            value={formatCurrency(
              moneySpent
            )}
            detail="Recorded expenses"
            icon={
              <CreditCard size={22} />
            }
            tone="red"
          />

          <KpiCard
            label="Net Cash Flow"
            value={formatCurrency(
              netCashFlow
            )}
            detail="Received less money spent"
            icon={
              netCashFlow >= 0 ? (
                <ArrowUpRight size={22} />
              ) : (
                <ArrowDownRight size={22} />
              )
            }
            tone="dark"
          />

          <KpiCard
            label="Money Pending This Month"
            value={formatCurrency(
              moneyPending
            )}
            detail="Outstanding expected collections"
            icon={
              <TrendingUp size={22} />
            }
            tone="purple"
          />
        </div>
      </DashboardCard>

      {/* =================================================
          EXPENSE + TARGETS
      ================================================= */}

      <section className="mt-3 grid grid-cols-[minmax(0,1.65fr)_minmax(320px,0.75fr)] gap-3">
        <ExpenseBreakdown
          expenses={
            dashboard.expenses || []
          }
        />

        <DashboardCard className="h-full">
          <TargetCard
            label="Maximum Bookable Value"
            value={formatCurrency(
              maximumBookableValue
            )}
            detail={`${monthlyBookingTarget} bookings @ ${formatCurrency(
              bookingValue
            )}`}
            icon={<BarChart3 size={21} />}
          />

          <TargetCard
            label="Annual Target Value"
            value={formatCurrency(
              annualTargetValue
            )}
            detail={`${monthlyBookingTarget} bookings per month × 12`}
            icon={
              <TrendingUp size={21} />
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
                  )} lifetime bookings @ ${formatCurrency(
                    bookingValue
                  )}`
                : "Configure long-term business target"
            }
            icon={
              <CircleDollarSign
                size={21}
              />
            }
          />
        </DashboardCard>
      </section>

      {/* =================================================
          BUSINESS PERFORMANCE
      ================================================= */}

      <section className="mt-3">
        <PerformanceMetrics
          dashboard={dashboard}
        />
      </section>

      {/* =================================================
          STUDENT ACTIVITY + OBLIGATIONS
      ================================================= */}

      <section className="mt-3 grid grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] gap-3">
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

      <div className="mt-3 flex items-center justify-between border-t border-blue-100 pt-3">
        <p className="m-0 text-[8px] text-slate-400">
          Sauti Tamu Piano Center ·
          Financial Dashboard
        </p>

        <p className="m-0 text-[8px] text-slate-400">
          Live financial administration
        </p>
      </div>
    </main>
  );
}