"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  CircleDollarSign,
  CreditCard,
  Loader2,
  RefreshCw,
  Target,
  TrendingUp,
  WalletCards,
} from "lucide-react";

import {
  loadFinancialDashboard,
} from "@/lib/financial-service";

import type {
  FinancialDashboardData,
} from "@/lib/financial-service";

/* =====================================================
   HELPERS
===================================================== */

const NAIROBI_TIME_ZONE =
  "Africa/Nairobi";

function getMonthStart(
  date = new Date()
) {
  const parts = new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone:
        NAIROBI_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }
  ).formatToParts(date);

  const year = parts.find(
    (part) => part.type === "year"
  )?.value;

  const month = parts.find(
    (part) => part.type === "month"
  )?.value;

  return `${year}-${month}-01`;
}

function formatCurrency(
  value: number | null | undefined
) {
  return new Intl.NumberFormat(
    "en-KE",
    {
      style: "currency",
      currency: "KES",
      maximumFractionDigits: 0,
    }
  ).format(Number(value) || 0);
}

function formatInteger(
  value: number | null | undefined
) {
  return new Intl.NumberFormat(
    "en-KE",
    {
      maximumFractionDigits: 0,
    }
  ).format(Number(value) || 0);
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

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return monthStart;
  }

  return new Intl.DateTimeFormat(
    "en-KE",
    {
      timeZone:
        NAIROBI_TIME_ZONE,
      month: "long",
      year: "numeric",
    }
  ).format(date);
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
  icon: React.ReactNode;
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
    <div className="rounded-2xl border border-[var(--st-border)] bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="m-0 text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--st-gray)]">
            {label}
          </p>

          <p
            className={`mt-3 mb-0 text-[23px] font-bold leading-none tracking-[-0.03em] ${toneClass}`}
          >
            {value}
          </p>
        </div>

        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--st-bg-soft)] text-[var(--st-red)]">
          {icon}
        </div>
      </div>

      {detail && (
        <p className="mt-3 mb-0 text-[9px] leading-relaxed text-[var(--st-gray)]">
          {detail}
        </p>
      )}
    </div>
  );
}

/* =====================================================
   PAGE
===================================================== */

export default function FinancialDashboardPage() {
  const [
    monthStart,
    setMonthStart,
  ] = useState(
    () => getMonthStart()
  );

  const [
    dashboard,
    setDashboard,
  ] = useState<FinancialDashboardData | null>(
    null
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  async function loadDashboard(
    silent = false
  ) {
    try {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const data =
        await loadFinancialDashboard(
          monthStart
        );

      setDashboard(data);
    } catch (err) {
      console.error(
        "Financial dashboard error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "We couldn't load the financial dashboard."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, [monthStart]);

  const summary =
    dashboard?.summary ?? null;

  const performance =
    dashboard?.performance ?? null;

  const activity =
    dashboard?.activity ?? null;

  const settings =
    dashboard?.settings ?? null;

  const bookedValue =
    summary?.booked_value ?? 0;

  const monthlyTarget =
    summary?.monthly_revenue_target ??
    0;

  const bookingCount =
    summary?.bookings_count ?? 0;

  const targetBookings =
    summary?.monthly_booking_target ??
    0;

  const targetProgress = useMemo(() => {
    if (
      targetBookings <= 0
    ) {
      return 0;
    }

    return Math.min(
      (bookingCount /
        targetBookings) *
        100,
      100
    );
  }, [
    bookingCount,
    targetBookings,
  ]);

  const bookingGap = Math.max(
    targetBookings -
      bookingCount,
    0
  );

  const bookedValueProgress =
    monthlyTarget > 0
      ? Math.min(
          (bookedValue /
            monthlyTarget) *
            100,
          100
        )
      : 0;

  const netCashFlow =
    summary?.net_cash_flow ?? 0;

  const pending =
    summary?.money_pending ?? 0;

  const monthlyExpenses =
    summary?.money_spent ?? 0;

  const moneyReceived =
    summary?.money_received ?? 0;

  const revenuePerStudent =
    performance?.revenue_per_student ??
    null;

  if (loading) {
    return (
      <main className="st-page">
        <div className="st-card flex min-h-[420px] items-center justify-center">
          <div className="flex items-center gap-2 text-[10px] text-[var(--st-gray)]">
            <Loader2
              size={16}
              className="animate-spin"
            />
            Loading financial dashboard...
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="st-page">
      {/* =================================================
          HEADER
      ================================================= */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="m-0 text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--st-gray)]">
            Financial Management
          </p>

          <h1 className="mt-2 mb-0 text-[24px] font-bold tracking-[-0.03em] text-[var(--st-charcoal-dark)]">
            Financial Dashboard
          </h1>

          <p className="mt-2 mb-0 max-w-[720px] text-[10px] leading-relaxed text-[var(--st-gray)]">
            Live financial and business-performance
            overview powered by the existing Sauti
            Tamu operational data.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 rounded-xl border border-[var(--st-border)] bg-white px-3 py-2">
            <CalendarDays
              size={14}
              className="text-[var(--st-gray)]"
            />

            <input
              type="month"
              value={monthStart.slice(
                0,
                7
              )}
              onChange={(event) => {
                setMonthStart(
                  `${event.target.value}-01`
                );
              }}
              className="border-0 bg-transparent text-[10px] font-semibold text-[var(--st-charcoal-dark)] outline-none"
            />
          </label>

          <button
            type="button"
            onClick={() =>
              loadDashboard(true)
            }
            className="st-button st-button-secondary"
            disabled={refreshing}
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
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <p className="m-0 text-[10px] text-red-700">
            {error}
          </p>
        </div>
      )}

      {/* =================================================
          FINANCIAL & BOOKING OVERVIEW
      ================================================= */}

      <section className="mt-6">
        <div>
          <h2 className="st-section-title">
            Financial &amp; Booking Overview
          </h2>

          <p className="mt-1 mb-0 text-[10px] text-[var(--st-gray)]">
            {formatMonthLabel(
              monthStart
            )}
          </p>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <KpiCard
            label="Students Booked This Month"
            value={formatInteger(
              bookingCount
            )}
            detail={`${formatCurrency(
              bookedValue
            )} total booked value`}
            icon={
              <Target size={16} />
            }
          />

          <KpiCard
            label="Money Received"
            value={formatCurrency(
              moneyReceived
            )}
            detail="Actual payments collected"
            icon={
              <CircleDollarSign
                size={16}
              />
            }
            tone="positive"
          />

          <KpiCard
            label="Money Spent"
            value={formatCurrency(
              monthlyExpenses
            )}
            detail="Recorded business expenses"
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
            detail="Money received less money spent"
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
              pending
            )}
            detail="Booked value less payments received"
            icon={
              <CreditCard size={16} />
            }
            tone={
              pending > 0
                ? "warning"
                : "positive"
            }
          />
        </div>
      </section>

      {/* =================================================
          TARGET PROGRESS
      ================================================= */}

      <section className="mt-5 grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="rounded-2xl border border-[var(--st-border)] bg-white p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="m-0 text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--st-gray)]">
                Monthly Revenue Target
              </p>

              <p className="mt-2 mb-0 text-[24px] font-bold tracking-[-0.03em] text-[var(--st-charcoal-dark)]">
                {formatCurrency(
                  monthlyTarget
                )}
              </p>
            </div>

            <div className="text-right">
              <p className="m-0 text-[9px] font-semibold text-[var(--st-gray)]">
                Booking target
              </p>

              <p className="mt-1 mb-0 text-[14px] font-bold text-[var(--st-charcoal-dark)]">
                {bookingCount} /{" "}
                {targetBookings}
              </p>
            </div>
          </div>

          <div className="mt-5 h-3 overflow-hidden rounded-full bg-[var(--st-bg-soft)]">
            <div
              className="h-full rounded-full bg-[var(--st-red)] transition-all"
              style={{
                width: `${bookedValueProgress}%`,
              }}
            />
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p className="m-0 text-[9px] text-[var(--st-gray)]">
              {formatCurrency(
                bookedValue
              )}{" "}
              booked so far
            </p>

            <p className="m-0 text-[9px] font-semibold text-[var(--st-charcoal-dark)]">
              {bookingGap === 0
                ? "Target reached"
                : `${bookingGap} bookings remaining`}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--st-border)] bg-white p-5">
          <div className="flex h-full flex-col justify-between">
            <div>
              <p className="m-0 text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--st-gray)]">
                Booking Value
              </p>

              <p className="mt-2 mb-0 text-[24px] font-bold tracking-[-0.03em] text-[var(--st-charcoal-dark)]">
                {formatCurrency(
                  settings?.booking_value ??
                    21850
                )}
              </p>

              <p className="mt-2 mb-0 text-[9px] leading-relaxed text-[var(--st-gray)]">
                Configured financial booking
                value used by the financial
                reporting layer.
              </p>
            </div>

            <div className="mt-5 flex items-center gap-2 rounded-xl bg-[var(--st-bg-soft)] px-3 py-3">
              <TrendingUp
                size={15}
                className="text-[var(--st-red)]"
              />

              <span className="text-[9px] font-semibold text-[var(--st-charcoal-dark)]">
                {targetProgress.toFixed(
                  0
                )}
                % of booking target
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* =================================================
          BUSINESS PERFORMANCE
      ================================================= */}

      <section className="mt-6">
        <h2 className="st-section-title">
          Business Performance
        </h2>

        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <KpiCard
            label="ROI"
            value="—"
            detail="Formula pending client definition"
            icon={
              <TrendingUp
                size={16}
              />
            }
            tone="warning"
          />

          <KpiCard
            label="CAC"
            value="—"
            detail="Formula pending client definition"
            icon={
              <CircleDollarSign
                size={16}
              />
            }
            tone="warning"
          />

          <KpiCard
            label="CPL"
            value="—"
            detail="Formula pending client definition"
            icon={
              <WalletCards
                size={16}
              />
            }
            tone="warning"
          />

          <KpiCard
            label="Conversion Rate"
            value="—"
            detail="Formula pending client definition"
            icon={
              <Target
                size={16}
              />
            }
            tone="warning"
          />

          <KpiCard
            label="Revenue Per Student"
            value={
              revenuePerStudent ===
              null
                ? "—"
                : formatCurrency(
                    revenuePerStudent
                  )
            }
            detail="Booked value divided by registered students"
            icon={
              <CreditCard
                size={16}
              />
            }
          />
        </div>
      </section>

      {/* =================================================
          STUDENT ACTIVITY
      ================================================= */}

      <section className="mt-6 grid gap-5 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-2xl border border-[var(--st-border)] bg-white p-5">
          <div>
            <h2 className="st-section-title">
              Student Activity
            </h2>

            <p className="mt-1 mb-0 text-[10px] text-[var(--st-gray)]">
              Booking activity for{" "}
              {formatMonthLabel(
                monthStart
              )}
            </p>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {[
              {
                label: "Attended",
                value:
                  activity?.attended ??
                  0,
              },
              {
                label: "Booked",
                value:
                  activity?.booked ??
                  0,
              },
              {
                label: "Registered",
                value:
                  activity?.registered ??
                  performance?.registered_students ??
                  0,
              },
              {
                label: "Cancelled",
                value:
                  activity?.cancelled ??
                  0,
              },
              {
                label: "Missed",
                value:
                  activity?.missed ??
                  0,
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-[var(--st-border)] bg-[var(--st-bg-soft)] px-3 py-4 text-center"
              >
                <p className="m-0 text-[8px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                  {item.label}
                </p>

                <p className="mt-2 mb-0 text-[20px] font-bold text-[var(--st-charcoal-dark)]">
                  {formatInteger(
                    item.value
                  )}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* =================================================
            OBLIGATIONS
        ================================================= */}

        <div className="rounded-2xl border border-[var(--st-border)] bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="st-section-title">
                Financial Obligations
              </h2>

              <p className="mt-1 mb-0 text-[10px] text-[var(--st-gray)]">
                Active business commitments
              </p>
            </div>

            <span className="st-badge st-badge-red">
              {dashboard?.obligations
                ?.length ?? 0}{" "}
              active
            </span>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {[
              "Insurance",
              "Family & School Fees",
              "Loans Owed",
              "Loan Repayments",
            ].map(
              (category) => {
                const rows =
                  dashboard?.obligations?.filter(
                    (
                      obligation
                    ) =>
                      obligation.category
                        .toLowerCase() ===
                      category.toLowerCase()
                  ) ?? [];

                const total =
                  rows.reduce(
                    (
                      sum,
                      obligation
                    ) =>
                      sum +
                      Number(
                        obligation
                          .outstanding_balance ||
                          0
                      ),
                    0
                  );

                return (
                  <div
                    key={category}
                    className="rounded-xl border border-[var(--st-border)] bg-[var(--st-bg-soft)] p-4"
                  >
                    <p className="m-0 text-[8px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                      {category}
                    </p>

                    <p className="mt-2 mb-0 text-[18px] font-bold text-[var(--st-charcoal-dark)]">
                      {formatCurrency(
                        total
                      )}
                    </p>

                    <p className="mt-1 mb-0 text-[8px] text-[var(--st-gray)]">
                      Outstanding balance
                    </p>
                  </div>
                );
              }
            )}
          </div>
        </div>
      </section>

      {/* =================================================
          META
      ================================================= */}

      <div className="mt-7 flex flex-col gap-2 border-t border-[var(--st-border)] pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="m-0 text-[9px] text-[var(--st-gray)]">
          Revenue = Total Booked Value
        </p>

        <p className="m-0 text-[9px] text-[var(--st-gray)]">
          {formatMonthLabel(
            monthStart
          )}{" "}
          · Live Supabase data
        </p>
      </div>
    </main>
  );
}