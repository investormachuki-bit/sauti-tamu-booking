"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CalendarClock,
  CalendarDays,
  Clock3,
  Mail,
  MessageCircle,
  RefreshCw,
  Wallet,
} from "lucide-react";
import { loadStudents } from "@/lib/students-service";
import type { StudentRecord } from "@/components/students/students-types";

const NAIROBI_TIME_ZONE = "Africa/Nairobi";

function todayKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: NAIROBI_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00+03:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-KE", {
    timeZone: NAIROBI_TIME_ZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function daysBetween(from: string, to: string) {
  const fromDate = new Date(`${from}T00:00:00Z`).getTime();
  const toDate = new Date(`${to}T00:00:00Z`).getTime();
  return Math.round((toDate - fromDate) / 86400000);
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return (parts[0] || "S").slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function instrumentLabel(value?: string | null) {
  if (!value) return "Not recorded";
  if (value.toLowerCase() === "guitar") return "Acoustic Guitar";
  if (value.toLowerCase() === "piano") return "Piano";
  return value;
}

export default function PaymentSchedulePage() {
  const [records, setRecords] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [today, setToday] = useState(todayKey());

  const refresh = useCallback(async (manual = false) => {
    try {
      if (manual) setRefreshing(true);
      else setLoading(true);
      setError("");
      const loaded = await loadStudents();
      setRecords(loaded);
      setToday(todayKey());
    } catch (err) {
      console.error("Payment schedule load error:", err);
      setError(err instanceof Error ? err.message : "Unable to load the payment schedule.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const clock = window.setInterval(() => setToday(todayKey()), 60_000);
    return () => window.clearInterval(clock);
  }, [refresh]);

  const paymentRows = useMemo(() => {
    return records
      .map((record) => {
        const enrollment = record.enrollment;
        if (!enrollment) return null;

        const totalFee = Number(enrollment.total_fee || 0);
        // Payments are loaded by student across enrollment history; only count
        // payments belonging to the currently displayed enrollment.
        const enrollmentPayments = record.payments.filter(
          (payment) => payment.enrollment_id === enrollment.id
        );
        const totalPaid = enrollmentPayments.reduce(
          (sum, payment) => sum + Number(payment.amount || 0),
          0
        );
        const balance = Math.max(totalFee - totalPaid, 0);
        if (balance <= 0) return null;

        const nextSchedule = [...record.schedules]
          .filter((schedule) => !["paid", "cancelled"].includes(String(schedule.status).toLowerCase()))
          .filter((schedule) => Boolean(schedule.due_date))
          .filter((schedule) => {
            const paidAgainstSchedule = enrollmentPayments
              .filter((payment) => payment.payment_schedule_id === schedule.id)
              .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
            return paidAgainstSchedule < Number(schedule.amount_due || 0);
          })
          .sort((a, b) => a.due_date.localeCompare(b.due_date))[0] ?? null;

        return {
          record,
          enrollment,
          totalFee,
          totalPaid,
          balance,
          dueDate: nextSchedule?.due_date ?? null,
          scheduledAmount: nextSchedule ? Number(nextSchedule.amount_due || 0) : null,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null)
      .sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return a.record.student.full_name.localeCompare(b.record.student.full_name);
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate);
      });
  }, [records]);

  const totalOutstanding = paymentRows.reduce((sum, row) => sum + row.balance, 0);
  const overdueCount = paymentRows.filter((row) => row.dueDate && row.dueDate < today).length;
  const noDateCount = paymentRows.filter((row) => !row.dueDate).length;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="st-eyebrow">STUDENT FINANCIAL MANAGEMENT</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[var(--st-charcoal-dark)] sm:text-3xl">
            Payment Schedule
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--st-gray)]">
            Track outstanding student balances, the next recorded payment date, and overdue payments.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refresh(true)}
          disabled={refreshing || loading}
          className="st-button st-button-secondary self-start disabled:opacity-50 sm:self-auto"
        >
          <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
          {refreshing ? "Refreshing..." : "Refresh schedule"}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-[var(--st-border)] bg-white p-4">
          <div className="flex items-center gap-2 text-sm text-[var(--st-gray)]"><Wallet size={16} /> Students with balances</div>
          <p className="mb-0 mt-3 text-2xl font-bold text-[var(--st-charcoal-dark)]">{paymentRows.length}</p>
        </div>
        <div className="rounded-2xl border border-[var(--st-border)] bg-white p-4">
          <div className="flex items-center gap-2 text-sm text-[var(--st-gray)]"><CalendarClock size={16} /> Total outstanding</div>
          <p className="mb-0 mt-3 text-2xl font-bold text-[var(--st-charcoal-dark)]">{formatCurrency(totalOutstanding)}</p>
        </div>
        <div className="rounded-2xl border border-[var(--st-border)] bg-white p-4">
          <div className="flex items-center gap-2 text-sm text-[var(--st-gray)]"><AlertTriangle size={16} /> Overdue / no date</div>
          <p className="mb-0 mt-3 text-2xl font-bold text-[var(--st-charcoal-dark)]">{overdueCount} <span className="text-sm font-medium text-[var(--st-gray)]">overdue</span> <span className="mx-1 text-[var(--st-border)]">·</span> {noDateCount} <span className="text-sm font-medium text-[var(--st-gray)]">no date</span></p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-[var(--st-border)] bg-white p-12 text-center text-sm text-[var(--st-gray)]">
          Loading payment schedule...
        </div>
      ) : paymentRows.length === 0 ? (
        <div className="rounded-2xl border border-[var(--st-border)] bg-white px-6 py-14 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--st-bg-soft)] text-[var(--st-gray)]">
            <Wallet size={22} />
          </div>
          <h2 className="mt-4 text-lg font-bold text-[var(--st-charcoal-dark)]">No outstanding student balances</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-[var(--st-gray)]">Students will appear here when their programme balance is greater than zero.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {paymentRows.map(({ record, enrollment, totalFee, totalPaid, balance, dueDate, scheduledAmount }) => {
            const student = record.student;
            const days = dueDate ? daysBetween(today, dueDate) : null;
            const overdue = days !== null && days < 0;

            return (
              <article key={student.id} className="overflow-hidden rounded-2xl border border-[var(--st-border)] bg-white shadow-sm">
                <div className="flex items-start gap-4 border-b border-[var(--st-border)] p-4 sm:p-5">
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-[var(--st-border)] bg-[var(--st-bg-soft)] sm:h-24 sm:w-24">
                    {student.photo_url ? (
                      <img src={student.photo_url} alt={student.full_name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xl font-bold text-[var(--st-gray)]">{getInitials(student.full_name)}</div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="m-0 text-lg font-bold text-[var(--st-charcoal-dark)]">{student.full_name}</h2>
                      <span className="rounded-full bg-[var(--st-bg-soft)] px-2 py-1 text-[10px] font-semibold capitalize text-[var(--st-gray)]">{student.status || "status not recorded"}</span>
                    </div>
                    <p className="mt-1 text-sm text-[var(--st-gray)]">{enrollment.programme_name || "Programme not recorded"} · {instrumentLabel(enrollment.instrument)}</p>
                    <div className="mt-3 space-y-1 text-xs text-[var(--st-gray)]">
                      <p className="m-0 flex items-center gap-2 break-all"><MessageCircle size={13} className="shrink-0" /> {student.whatsapp_number || "WhatsApp number not recorded"}</p>
                      <p className="m-0 flex items-center gap-2 break-all"><Mail size={13} className="shrink-0" /> {student.email || "Email not recorded"}</p>
                    </div>
                    {(student.notes || enrollment.notes) && (
                      <div className="mt-3 rounded-xl border border-[var(--st-border)] px-3 py-2">
                        <p className="m-0 text-[10px] font-bold uppercase tracking-wide text-[var(--st-gray)]">Notes</p>
                        {student.notes && <p className="mb-0 mt-1 whitespace-pre-wrap text-xs text-[var(--st-charcoal-dark)]">{student.notes}</p>}
                        {enrollment.notes && <p className="mb-0 mt-1 whitespace-pre-wrap text-xs text-[var(--st-gray)]">Programme: {enrollment.notes}</p>}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 p-4 sm:p-5">
                  <div className="rounded-xl bg-[var(--st-bg-soft)] p-3">
                    <p className="m-0 text-[10px] font-semibold uppercase tracking-wide text-[var(--st-gray)]">Programme fee</p>
                    <p className="mb-0 mt-1 text-base font-bold text-[var(--st-charcoal-dark)]">{formatCurrency(totalFee)}</p>
                  </div>
                  <div className="rounded-xl bg-[var(--st-bg-soft)] p-3">
                    <p className="m-0 text-[10px] font-semibold uppercase tracking-wide text-[var(--st-gray)]">Total paid</p>
                    <p className="mb-0 mt-1 text-base font-bold text-[var(--st-charcoal-dark)]">{formatCurrency(totalPaid)}</p>
                  </div>
                  <div className="col-span-2 rounded-xl border border-[var(--st-border)] p-3">
                    <p className="m-0 text-[10px] font-semibold uppercase tracking-wide text-[var(--st-gray)]">Outstanding balance</p>
                    <p className="mb-0 mt-1 text-2xl font-bold text-[var(--st-charcoal-dark)]">{formatCurrency(balance)}</p>
                  </div>
                </div>

                <div className={`mx-4 mb-4 rounded-xl border p-4 sm:mx-5 sm:mb-5 ${overdue ? "border-red-200 bg-red-50" : "border-[var(--st-border)] bg-white"}`}>
                  <div className="flex items-start gap-3">
                    <CalendarDays size={18} className={`mt-0.5 shrink-0 ${overdue ? "text-red-600" : "text-[var(--st-gray)]"}`} />
                    <div className="min-w-0 flex-1">
                      <p className="m-0 text-[10px] font-bold uppercase tracking-wide text-[var(--st-gray)]">Next payment due</p>
                      {dueDate ? (
                        <>
                          <p className={`mb-0 mt-1 text-base font-bold ${overdue ? "text-red-700" : "text-[var(--st-charcoal-dark)]"}`}>{formatDate(dueDate)}</p>
                          {scheduledAmount !== null && (
                            <p className="mb-0 mt-1 text-xs text-[var(--st-gray)]">Scheduled amount: {formatCurrency(scheduledAmount)}</p>
                          )}
                          <p className={`mb-0 mt-2 flex items-center gap-1.5 text-sm font-bold ${overdue ? "text-red-700" : "text-[var(--st-charcoal-dark)]"}`}>
                            <Clock3 size={15} />
                            {days === 0 ? "Due today" : overdue ? `Overdue by ${Math.abs(days!)} ${Math.abs(days!) === 1 ? "day" : "days"}` : `${days} ${days === 1 ? "day" : "days"} remaining`}
                          </p>
                        </>
                      ) : (
                        <p className="mb-0 mt-2 text-sm font-semibold text-[var(--st-gray)]">There is no recorded next payment date.</p>
                      )}
                    </div>
                    {overdue && <AlertTriangle size={18} className="shrink-0 text-red-600" />}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-[var(--st-border)] bg-[var(--st-bg-soft)] px-4 py-3 sm:px-5">
                  <p className="m-0 text-xs text-[var(--st-gray)]">Start: {formatDate(enrollment.start_date) || "Not recorded"} · End: {formatDate(enrollment.end_date) || "Not recorded"}</p>
                  <Link href="/admin/students" className="shrink-0 text-xs font-bold text-[var(--st-red)] hover:underline">Student records ↗</Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
