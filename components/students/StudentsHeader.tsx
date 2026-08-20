"use client";

import {
  Plus,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";

interface StudentsHeaderProps {
  studentCount: number;

  searchTerm: string;
  setSearchTerm: (value: string) => void;

  onAddStudent: () => void;

  showFilters?: boolean;
  onToggleFilters?: () => void;
}

export default function StudentsHeader({
  studentCount,
  searchTerm,
  setSearchTerm,
  onAddStudent,
  showFilters = false,
  onToggleFilters,
}: StudentsHeaderProps) {
  return (
    <div className="mb-5">
      {/* =====================================================
          TITLE
      ===================================================== */}

      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="st-eyebrow">
            STUDENTS
          </p>

          <div className="mt-1 flex items-center gap-2">
            <h1 className="m-0 text-[22px] font-bold tracking-[-0.03em] text-[var(--st-charcoal-dark)]">
              Students
            </h1>

            <span className="rounded-full bg-[var(--st-bg-soft)] px-2 py-1 text-[8px] font-bold text-[var(--st-gray)]">
              {studentCount}
            </span>
          </div>

          <p className="mt-1.5 mb-0 max-w-[420px] text-[10px] leading-relaxed text-[var(--st-gray)]">
            Manage students, programmes,
            payments and follow-ups.
          </p>
        </div>

        <button
          type="button"
          onClick={onAddStudent}
          className="st-button st-button-primary shrink-0"
        >
          <Plus size={15} />
          <span className="hidden sm:inline">
            Add student
          </span>
          <span className="sm:hidden">
            Add
          </span>
        </button>
      </div>

      {/* =====================================================
          SEARCH / FILTER BAR
      ===================================================== */}

      <div className="mt-5 flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search
            size={15}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--st-gray)]"
          />

          <input
            type="text"
            value={searchTerm}
            onChange={(event) =>
              setSearchTerm(
                event.target.value,
              )
            }
            placeholder="Search students..."
            className="h-11 w-full rounded-xl border border-[var(--st-border)] bg-white pl-10 pr-10 text-[11px] outline-none transition placeholder:text-[var(--st-gray)] focus:border-[var(--st-red)] focus:ring-2 focus:ring-[var(--st-red)]/10"
          />

          {searchTerm && (
            <button
              type="button"
              onClick={() =>
                setSearchTerm("")
              }
              className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center justify-center rounded-full p-1 text-[var(--st-gray)] hover:bg-[var(--st-bg-soft)] hover:text-[var(--st-charcoal-dark)]"
              aria-label="Clear search"
              title="Clear search"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {onToggleFilters && (
          <button
            type="button"
            onClick={onToggleFilters}
            className={`st-icon-button h-11 w-11 shrink-0 ${
              showFilters
                ? "border-[var(--st-red)] bg-red-50 text-[var(--st-red)]"
                : ""
            }`}
            aria-label="Toggle filters"
            title="Filters"
          >
            <SlidersHorizontal
              size={15}
            />
          </button>
        )}
      </div>
    </div>
  );
}