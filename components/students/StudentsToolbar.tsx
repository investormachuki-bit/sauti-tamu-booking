"use client";

import {
  Filter,
  Plus,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";

interface StudentsToolbarProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;

  instrumentFilter: string;
  setInstrumentFilter: (value: string) => void;

  statusFilter: string;
  setStatusFilter: (value: string) => void;

  paymentFilter: string;
  setPaymentFilter: (value: string) => void;

  showFilters: boolean;
  setShowFilters: (value: boolean) => void;

  onAddStudent: () => void;

  totalStudents: number;
  filteredStudents: number;
}

export default function StudentsToolbar({
  searchTerm,
  setSearchTerm,

  instrumentFilter,
  setInstrumentFilter,

  statusFilter,
  setStatusFilter,

  paymentFilter,
  setPaymentFilter,

  showFilters,
  setShowFilters,

  onAddStudent,

  totalStudents,
  filteredStudents,
}: StudentsToolbarProps) {
  const hasActiveFilters =
    instrumentFilter !== "all" ||
    statusFilter !== "all" ||
    paymentFilter !== "all";

  const clearFilters = () => {
    setInstrumentFilter("all");
    setStatusFilter("all");
    setPaymentFilter("all");
  };

  return (
    <div className="space-y-3">

      {/* =====================================================
          TOP TOOLBAR
      ===================================================== */}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">

        {/* SEARCH */}

        <div className="relative min-w-0 flex-1">

          <Search
            size={15}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--st-gray)]"
          />

          <input
            type="text"
            value={searchTerm}
            onChange={(event) =>
              setSearchTerm(event.target.value)
            }
            placeholder="Search students..."
            className="w-full rounded-xl border border-[var(--st-border)] bg-white py-3 pl-10 pr-10 text-[11px] outline-none transition focus:border-[var(--st-red)] focus:ring-2 focus:ring-[var(--st-red)]/10"
          />

          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-lg text-[var(--st-gray)] transition hover:bg-[var(--st-bg-soft)] hover:text-[var(--st-charcoal-dark)]"
              aria-label="Clear search"
            >
              <X size={13} />
            </button>
          )}

        </div>

        {/* FILTER BUTTON */}

        <button
          type="button"
          onClick={() =>
            setShowFilters(!showFilters)
          }
          className={`st-button shrink-0 ${
            showFilters || hasActiveFilters
              ? "st-button-primary"
              : "st-button-secondary"
          }`}
        >
          <SlidersHorizontal size={14} />

          <span className="hidden sm:inline">
            Filters
          </span>

          {hasActiveFilters && (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[7px] font-bold text-[var(--st-red)]">
              {
                [
                  instrumentFilter !== "all",
                  statusFilter !== "all",
                  paymentFilter !== "all",
                ].filter(Boolean).length
              }
            </span>
          )}
        </button>

        {/* ADD STUDENT */}

        <button
          type="button"
          onClick={onAddStudent}
          className="st-button st-button-primary shrink-0"
        >
          <Plus size={14} />
          <span>Add student</span>
        </button>

      </div>

      {/* =====================================================
          FILTER PANEL
      ===================================================== */}

      {showFilters && (
        <div className="rounded-2xl border border-[var(--st-border)] bg-white p-4">

          <div className="flex items-center justify-between gap-3">

            <div className="flex items-center gap-2">

              <Filter
                size={14}
                className="text-[var(--st-red)]"
              />

              <div>
                <p className="m-0 text-[10px] font-bold text-[var(--st-charcoal-dark)]">
                  Filter students
                </p>

                <p className="mt-0.5 mb-0 text-[8px] text-[var(--st-gray)]">
                  Narrow down the student list.
                </p>
              </div>

            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-[8px] font-semibold text-[var(--st-red)] hover:underline"
              >
                Clear filters
              </button>
            )}

          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">

            {/* INSTRUMENT */}

            <div>
              <label className="mb-1.5 block text-[8px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                Instrument
              </label>

              <select
                value={instrumentFilter}
                onChange={(event) =>
                  setInstrumentFilter(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border border-[var(--st-border)] bg-white px-3 py-3 text-[10px] font-semibold outline-none focus:border-[var(--st-red)]"
              >
                <option value="all">
                  All instruments
                </option>

                <option value="piano">
                  Piano
                </option>

                <option value="guitar">
                  Acoustic Guitar
                </option>
              </select>
            </div>

            {/* STATUS */}

            <div>
              <label className="mb-1.5 block text-[8px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                Programme status
              </label>

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border border-[var(--st-border)] bg-white px-3 py-3 text-[10px] font-semibold outline-none focus:border-[var(--st-red)]"
              >
                <option value="all">
                  All statuses
                </option>

                <option value="active">
                  Active
                </option>

                <option value="completed">
                  Completed
                </option>

                <option value="paused">
                  Paused
                </option>

                <option value="cancelled">
                  Cancelled
                </option>
              </select>
            </div>

            {/* PAYMENT */}

            <div>
              <label className="mb-1.5 block text-[8px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                Payment
              </label>

              <select
                value={paymentFilter}
                onChange={(event) =>
                  setPaymentFilter(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border border-[var(--st-border)] bg-white px-3 py-3 text-[10px] font-semibold outline-none focus:border-[var(--st-red)]"
              >
                <option value="all">
                  All payments
                </option>

                <option value="balance">
                  Has balance
                </option>

                <option value="paid">
                  Paid in full
                </option>

                <option value="none">
                  No payments
                </option>
              </select>
            </div>

          </div>

        </div>
      )}

      {/* =====================================================
          RESULTS SUMMARY
      ===================================================== */}

      <div className="flex items-center justify-between gap-3">

        <p className="m-0 text-[9px] text-[var(--st-gray)]">
          Showing{" "}
          <span className="font-bold text-[var(--st-charcoal-dark)]">
            {filteredStudents}
          </span>{" "}
          of{" "}
          <span className="font-bold text-[var(--st-charcoal-dark)]">
            {totalStudents}
          </span>{" "}
          students
        </p>

        {hasActiveFilters && (
          <div className="flex items-center gap-1.5">

            <span className="rounded-full bg-red-50 px-2 py-1 text-[7px] font-bold text-[var(--st-red)]">
              Filters active
            </span>

            <button
              type="button"
              onClick={clearFilters}
              className="text-[8px] font-semibold text-[var(--st-gray)] hover:text-[var(--st-red)]"
            >
              Reset
            </button>

          </div>
        )}

      </div>

    </div>
  );
}