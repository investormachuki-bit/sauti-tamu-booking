"use client";

import {
  AlertCircle,
  GraduationCap,
  Wallet,
  Users,
} from "lucide-react";

interface StudentStatsProps {
  totalStudents: number;
  activeStudents: number;
  totalOutstanding: number;
  studentsWithBalance: number;
  formatCurrency: (amount: number) => string;
}

export default function StudentStats({
  totalStudents,
  activeStudents,
  totalOutstanding,
  studentsWithBalance,
  formatCurrency,
}: StudentStatsProps) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {/* TOTAL STUDENTS */}

      <div className="rounded-2xl border border-[var(--st-border)] bg-white p-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--st-bg-soft)]">
            <Users
              size={15}
              className="text-[var(--st-red)]"
            />
          </div>
        </div>

        <p className="mt-3 mb-0 text-[8px] font-bold uppercase tracking-[0.07em] text-[var(--st-gray)]">
          Total students
        </p>

        <p className="mt-1 text-[18px] font-bold tracking-[-0.02em] text-[var(--st-charcoal-dark)]">
          {totalStudents}
        </p>
      </div>

      {/* ACTIVE STUDENTS */}

      <div className="rounded-2xl border border-[var(--st-border)] bg-white p-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-50">
            <GraduationCap
              size={15}
              className="text-green-700"
            />
          </div>
        </div>

        <p className="mt-3 mb-0 text-[8px] font-bold uppercase tracking-[0.07em] text-[var(--st-gray)]">
          Active students
        </p>

        <p className="mt-1 text-[18px] font-bold tracking-[-0.02em] text-[var(--st-charcoal-dark)]">
          {activeStudents}
        </p>
      </div>

      {/* OUTSTANDING */}

      <div className="rounded-2xl border border-[var(--st-border)] bg-white p-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50">
            <Wallet
              size={15}
              className="text-[var(--st-red)]"
            />
          </div>
        </div>

        <p className="mt-3 mb-0 text-[8px] font-bold uppercase tracking-[0.07em] text-[var(--st-gray)]">
          Outstanding
        </p>

        <p className="mt-1 truncate text-[16px] font-bold tracking-[-0.02em] text-[var(--st-red)]">
          {formatCurrency(totalOutstanding)}
        </p>
      </div>

      {/* STUDENTS WITH BALANCE */}

      <div className="rounded-2xl border border-[var(--st-border)] bg-white p-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50">
            <AlertCircle
              size={15}
              className="text-amber-700"
            />
          </div>
        </div>

        <p className="mt-3 mb-0 text-[8px] font-bold uppercase tracking-[0.07em] text-[var(--st-gray)]">
          With balance
        </p>

        <p className="mt-1 text-[18px] font-bold tracking-[-0.02em] text-[var(--st-charcoal-dark)]">
          {studentsWithBalance}
        </p>
      </div>
    </div>
  );
}