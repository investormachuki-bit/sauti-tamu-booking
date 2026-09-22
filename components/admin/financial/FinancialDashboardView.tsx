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
    <div className="relative min-w-0 px-3 py-3">
      <div className="flex items-start gap-2">
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${colors.icon}`}
        >
          {icon}
        </div>

        <div className="min-w-0 flex-1">
          <p
            className={`m-0 text-[9px] font-bold leading-tight ${colors.label}`}
          >
            {label}
          </p>

          <p
            className={`mt-1 mb-0 whitespace-nowrap text-[clamp(15px,1.35vw,20px)] font-extrabold leading-none tracking-[-0.035em] ${colors.value}`}
          >
            {value}
          </p>

          {detail && (
            <p className="mt-1 mb-0 truncate text-[7px] leading-tight text-slate-500">
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
    <div className="flex min-w-0 items-center gap-3 border-b border-blue-100 px-4 py-3 last:border-b-0">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
        {icon}
      </div>

      <div className="min-w-0">
        <p className="m-0 text-[9px] font-bold leading-tight text-blue-900">
          {label}
        </p>

        <p className="mt-1 mb-0 whitespace-nowrap text-[clamp(17px,1.45vw,20px)] font-extrabold leading-none tracking-[-0.035em] text-blue-700">
          {value}
        </p>

        <p className="mt-1 mb-0 truncate text-[7px] leading-tight text-slate-500">
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

              <span className="mt-2 whitespace-nowrap text-[17px] font-extrabold leading-none text-slate-900">
                {formatCurrency(total)}
              </span>
            </div>
          </div>
        </div>

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
                      className="flex min-w-0 items-center justify-between gap-2"
                    >
                      <div className="flex min-w-0 items-center gap-1.5">
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{
                            backgroundColor:
                              colors[
                                index %
                                  colors.length
                              ],
                          }}
                        />

                        <span className="truncate text-[8px] font-medium text-slate-700">
                          {expense.category}
                        </span>
                      </div>

                      <div className="flex shrink-0 items-center gap-2 text-right">
                        <span className="whitespace-nowrap text-[8px] font-bold text-slate-900">
                          {formatCurrency(
                            expense.amount
                          )}
                        </span>

                        <span className="whitespace-nowrap text-[7px] font-medium text-slate-500">
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
                <span className="whitespace-nowrap text-[9px] font-extrabold text-red-600">
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
          : "Placeholder",
      footer: "Revenue vs Ad Spend",
    },
    {
      label: "CAC",
      sublabel:
        "Customer Acquisition Cost",
      value:
        performance?.cac !== null &&
        performance?.cac !== undefined
          ? formatCurrency(
              performance.cac
            )
          : "Placeholder",
      footer:
        "Cost per enrolled student",
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
          : "Placeholder",
      footer: "Cost per lead from ads",
    },
    {
      label: "Conversion Rate",
      sublabel:
        "Leads → Enrollments",
      value:
        performance?.conversion_rate !==
          null &&
        performance?.conversion_rate !==
          undefined
          ? formatPercentage(
              performance.conversion_rate
            )
          : "Placeholder",
      footer:
        "Formula awaiting client definition",
    },
    {
      label: "Revenue per Student",
      sublabel:
        "Average revenue per enrollment",
      value:
        performance?.revenue_per_student !==
          null &&
        performance?.revenue_per_student !==
          undefined
          ? formatCurrency(
              performance.revenue_per_student
            )
          : formatCurrency(
              settings?.booking_value ||
                21850
            ),
      footer:
        "Average booked value per student",
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
            <p className="m-0 text-[8px] font-bold text-slate-700">
              {metric.label}
            </p>

            <p className="mt-1 mb-0 text-[7px] text-slate-500">
              {metric.sublabel}
            </p>

            <p className="mt-2 mb-0 truncate text-[20px] font-extrabold leading-none tracking-[-0.04em] text-slate-900">
              {metric.value}
            </p>

            <p className="mt-1 mb-0 truncate text-[7px] text-blue-700">
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
      value: activity?.attended ?? 0,
      icon: <Users size={13} />,
      color: "text-blue-700",
    },
    {
      label: "Booked",
      value: activity?.booked ?? 0,
      icon: <CalendarDays size={13} />,
      color: "text-blue-700",
    },
    {
      label: "Registered",
      value: activity?.registered ?? 0,
      icon: <Users size={13} />,
      color: "text-emerald-700",
    },
    {
      label: "Cancelled",
      value: activity?.cancelled ?? 0,
      icon: <ArrowDownRight size={13} />,
      color: "text-red-600",
    },
    {
      label: "Missed",
      value: activity?.missed ?? 0,
      icon: <ArrowDownRight size={13} />,
      color: "text-purple-700",
    },
  ];

  return (
    <DashboardCard>
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
            className="min-w-0 px-4 py-4 text-center"
          >
            <div
              className={`flex items-center justify-center gap-1 text-[8px] font-bold ${item.color}`}
            >
              {item.icon}

              <span className="truncate">
                {item.label}
              </span>
            </div>

            <p className="mt-3 mb-0 text-[22px] font-extrabold leading-none text-slate-900">
              {formatInteger(
                item.value
              )}
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

  const outstanding =
    obligations.reduce(
      (total, obligation) =>
        total +
        Number(
          obligation.outstanding_balance ||
            0
        ),
      0
    );

  return (
    <DashboardCard>
      <div className="border-b border-blue-100 px-5 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <WalletCards
              size={25}
              className="shrink-0 text-blue-700"
            />

            <div className="min-w-0">
              <h2 className="m-0 text-[16px] font-extrabold leading-none text-blue-900">
                Financial Obligations
              </h2>

              <p className="mt-1 mb-0 text-[9px] text-slate-500">
                Track your key personal and business financial commitments
              </p>
            </div>
          </div>

          <div className="shrink-0 rounded-full bg-red-50 px-4 py-2 text-right">
            <p className="m-0 text-[6px] font-bold uppercase tracking-[0.12em] text-slate-500">
              Outstanding
            </p>

            <p className="mt-1 mb-0 text-[11px] font-extrabold text-red-600">
              {formatCurrency(
                outstanding
              )}
            </p>
          </div>
        </div>
      </div>

      {obligations.length === 0 ? (
        <div className="p-4">
          <div className="flex min-h-[120px] items-center justify-center rounded-xl bg-slate-50">
            <p className="m-0 text-[9px] text-slate-500">
              No financial obligations have been recorded yet.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-4 divide-x divide-blue-100">
          {obligations.map(
            (obligation) => (
              <div
                key={obligation.id}
                className="min-w-0 px-4 py-4 text-center"
              >
                <p className="m-0 truncate text-[8px] font-bold text-slate-700">
                  {obligation.name}
                </p>

                <p className="mt-2 mb-0 whitespace-nowrap text-[18px] font-extrabold leading-none text-slate-900">
                  {formatCurrency(
                    obligation.amount
                  )}
                </p>

                <p className="mt-2 mb-0 text-[7px] text-slate-500">
                  {obligation.frequency ||
                    "One_time"}
                </p>

                <p className="mt-2 truncate text-[7px] font-bold text-red-600">
                  Outstanding{" "}
                  {formatCurrency(
                    obligation.outstanding_balance
                  )}
                </p>
              </div>
            )
          )}
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
  const summary =
    dashboard?.summary;

  const settings =
    dashboard?.settings;

  const bookedValue =
    Number(
      summary?.booked_value || 0
    );

  const monthlyTarget =
    Number(
      summary?.monthly_revenue_target ||
        settings?.monthly_booking_target *
          settings?.booking_value ||
        0
    );

  const bookings =
    Number(
      summary?.bookings_count || 0
    );

  const bookingValue =
    Number(
      summary?.booking_value ||
        settings?.booking_value ||
        21850
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

  const targetProgress =
    monthlyTarget > 0
      ? Math.min(
          (bookedValue /
            monthlyTarget) *
            100,
          100
        )
      : 0;

  const targetRemaining =
    Math.max(
      monthlyTarget -
        bookedValue,
      0
    );

  const maximumBookableValue =
    Number(
      settings?.monthly_booking_target ||
        24
    ) *
    bookingValue;

  const annualTargetValue =
    maximumBookableValue * 12;

  const lifetimeTarget =
    settings?.lifetime_booking_target;

  return (
    <div className="w-full min-w-0">
      {/* =================================================
          HEADER
      ================================================= */}

      <div className="mb-4 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="m-0 text-[8px] font-bold uppercase tracking-[0.16em] text-red-600">
            Financial Dashboard
          </p>

          <h1 className="mt-1 mb-0 text-[25px] font-extrabold leading-none tracking-[-0.04em] text-blue-950">
            Financial & Booking Overview
          </h1>

          <p className="mt-1 mb-0 text-[9px] text-slate-500">
            Track your bookings, income, expenses and business performance at a glance
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onPreviousMonth}
            disabled={loading}
            className="inline-flex h-10 items-center gap-1 rounded-xl border border-slate-200 bg-white px-4 text-[10px] font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            ← Previous
          </button>

          <div className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-[9px] font-medium text-slate-700">
            <CalendarDays
              size={13}
              className="text-red-600"
            />

            {formatMonthLabel(
              monthStart
            )}
          </div>

          <button
            type="button"
            onClick={onNextMonth}
            disabled={loading}
            className="inline-flex h-10 items-center gap-1 rounded-xl border border-slate-200 bg-white px-4 text-[10px] font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Next →
          </button>

          <button
            type="button"
            onClick={onRefresh}
            disabled={
              loading ||
              refreshing
            }
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-red-600 px-4 text-[10px] font-bold text-white transition hover:bg-red-700 disabled:opacity-60"
          >
            <RefreshCw
              size={12}
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
        <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[9px] font-medium text-red-600">
          {error}
        </div>
      )}

      {/* =================================================
          TOP KPI ROW
          FULL WIDTH — UNCHANGED
      ================================================= */}

      <section className="grid grid-cols-5 overflow-hidden rounded-[14px] border border-[#bfdbfe] bg-white">
        <div className="border-r border-blue-100">
          <KpiCard
            label={
              <>
                Students Booked This
                Month
              </>
            }
            value={formatInteger(
              bookings
            )}
            detail={`Value: ${formatCurrency(
              bookedValue
            )}`}
            icon={
              <Users size={19} />
            }
            tone="blue"
          />
        </div>

        <div className="border-r border-blue-100">
          <KpiCard
            label={
              <>
                Money Received This
                Month
              </>
            }
            value={formatCurrency(
              moneyReceived
            )}
            detail="Payments received"
            icon={
              <CreditCard size={19} />
            }
            tone="green"
          />
        </div>

        <div className="border-r border-blue-100">
          <KpiCard
            label={
              <>
                Money Spent This
                Month
              </>
            }
            value={formatCurrency(
              moneySpent
            )}
            detail="Recorded expenses"
            icon={
              <CreditCard size={19} />
            }
            tone="red"
          />
        </div>

        <div className="border-r border-blue-100">
          <KpiCard
            label={
              <>
                Net Cash Flow
              </>
            }
            value={formatCurrency(
              netCashFlow
            )}
            detail="Received less money spent"
            icon={
              netCashFlow >= 0 ? (
                <ArrowUpRight
                  size={19}
                />
              ) : (
                <ArrowDownRight
                  size={19}
                />
              )
            }
            tone="dark"
          />
        </div>

        <div>
          <KpiCard
            label={
              <>
                Money Pending This
                Month
              </>
            }
            value={formatCurrency(
              moneyPending
            )}
            detail="Outstanding expected collections"
            icon={
              <TrendingUp
                size={19}
              />
            }
            tone="purple"
          />
        </div>
      </section>

      {/* =================================================
          EXPENSE BREAKDOWN
          FULL WIDTH
      ================================================= */}

      <section className="mt-3 w-full">
        <ExpenseBreakdown
          expenses={
            dashboard?.expenses ||
            []
          }
        />
      </section>

      {/* =================================================
          TARGET VALUES
          FULL WIDTH — MOVED BELOW EXPENSE BREAKDOWN
      ================================================= */}

      <section className="mt-3 w-full">
        <DashboardCard>
          <TargetCard
            label="Maximum Bookable Value"
            value={formatCurrency(
              maximumBookableValue
            )}
            detail={`${formatInteger(
              settings?.monthly_booking_target ||
                24
            )} bookings @ ${formatCurrency(
              bookingValue
            )}`}
            icon={
              <BarChart3 size={17} />
            }
          />

          <TargetCard
            label="Annual Target Value"
            value={formatCurrency(
              annualTargetValue
            )}
            detail={`${formatInteger(
              settings?.monthly_booking_target ||
                24
            )} bookings per month × 12`}
            icon={
              <TrendingUp size={17} />
            }
          />

          <TargetCard
            label="Lifetime Target Value"
            value={
              lifetimeTarget
                ? formatCurrency(
                    lifetimeTarget
                  )
                : "Not set"
            }
            detail={
              lifetimeTarget
                ? "Configured long-term business target"
                : "Configure long-term business target"
            }
            icon={
              <CircleDollarSign
                size={17}
              />
            }
          />
        </DashboardCard>
      </section>

      {/* =================================================
          BUSINESS PERFORMANCE
          FULL WIDTH — UNCHANGED
      ================================================= */}

      <section className="mt-3 w-full">
        {dashboard ? (
          <PerformanceMetrics
            dashboard={
              dashboard
            }
          />
        ) : (
          <DashboardCard>
            <div className="p-8 text-center text-[9px] text-slate-500">
              Financial dashboard
              data is unavailable.
            </div>
          </DashboardCard>
        )}
      </section>

      {/* =================================================
          STUDENT ACTIVITY
          FULL WIDTH — MOVED BELOW PERFORMANCE
      ================================================= */}

      <section className="mt-3 w-full">
        {dashboard ? (
          <StudentActivity
            dashboard={
              dashboard
            }
          />
        ) : null}
      </section>

      {/* =================================================
          FINANCIAL OBLIGATIONS
          FULL WIDTH — MOVED BELOW STUDENT ACTIVITY
      ================================================= */}

      <section className="mt-3 w-full">
        {dashboard ? (
          <FinancialObligations
            dashboard={
              dashboard
            }
          />
        ) : null}
      </section>

      {/* =================================================
          BOOKING TARGET SUMMARY
          Kept available in the data flow without
          changing the dashboard visual structure.
      ================================================= */}

      <div className="sr-only">
        <span>
          Current booked value:{" "}
          {formatCurrency(
            bookedValue
          )}
        </span>

        <span>
          Monthly target:{" "}
          {formatCurrency(
            monthlyTarget
          )}
        </span>

        <span>
          Target progress:{" "}
          {formatPercentage(
            targetProgress
          )}
        </span>

        <span>
          Target remaining:{" "}
          {formatCurrency(
            targetRemaining
          )}
        </span>
      </div>

      {/* =================================================
          FOOTER
      ================================================= */}

      <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-3">
        <p className="m-0 text-[7px] text-slate-400">
          Sauti Tamu Piano Center · Financial Dashboard
        </p>

        <p className="m-0 text-[7px] text-slate-400">
          Live financial administration
        </p>
      </div>
    </div>
  );
}