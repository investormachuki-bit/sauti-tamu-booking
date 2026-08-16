"use client";

import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Guitar,
  Music2,
  Plus,
} from "lucide-react";

import AppShell from "@/components/layout/AppShell";

type Slot = {
  id: string;
  time: string;
  instrument: "Piano" | "Guitar";
  status: "Available" | "Booked";
  learner?: string;
};

const demoSlots: Slot[] = [
  {
    id: "1",
    time: "09:00 AM",
    instrument: "Piano",
    status: "Available",
  },
  {
    id: "2",
    time: "10:00 AM",
    instrument: "Guitar",
    status: "Booked",
    learner: "Brian Mwangi",
  },
  {
    id: "3",
    time: "11:00 AM",
    instrument: "Piano",
    status: "Available",
  },
  {
    id: "4",
    time: "02:00 PM",
    instrument: "Guitar",
    status: "Available",
  },
  {
    id: "5",
    time: "03:00 PM",
    instrument: "Piano",
    status: "Booked",
    learner: "Grace Wanjiku",
  },
  {
    id: "6",
    time: "04:00 PM",
    instrument: "Guitar",
    status: "Available",
  },
  {
    id: "7",
    time: "05:00 PM",
    instrument: "Piano",
    status: "Available",
  },
];

const weekDays = [
  {
    day: "MON",
    date: "17",
    label: "Mon 17",
  },
  {
    day: "TUE",
    date: "18",
    label: "Tue 18",
  },
  {
    day: "WED",
    date: "19",
    label: "Wed 19",
  },
  {
    day: "THU",
    date: "20",
    label: "Thu 20",
  },
  {
    day: "FRI",
    date: "21",
    label: "Fri 21",
  },
  {
    day: "SAT",
    date: "22",
    label: "Sat 22",
  },
  {
    day: "SUN",
    date: "23",
    label: "Sun 23",
  },
];

function InstrumentIcon({
  instrument,
}: {
  instrument: "Piano" | "Guitar";
}) {
  if (instrument === "Guitar") {
    return <Guitar size={15} />;
  }

  return <Music2 size={15} />;
}

function SlotCard({ slot }: { slot: Slot }) {
  return (
    <div
      className={`rounded-xl border p-3 transition-all ${
        slot.status === "Booked"
          ? "border-[var(--st-border)] bg-white"
          : "border-dashed border-[var(--st-border)] bg-white hover:border-[var(--st-red)] hover:bg-[var(--st-bg-soft)]"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <div
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
              slot.instrument === "Piano"
                ? "bg-[var(--st-bg-soft)] text-[var(--st-red)]"
                : "bg-[#f5f5f5] text-[var(--st-charcoal)]"
            }`}
          >
            <InstrumentIcon instrument={slot.instrument} />
          </div>

          <div className="min-w-0">
            <p className="m-0 text-[10px] font-bold text-[var(--st-charcoal-dark)]">
              {slot.time}
            </p>

            <p className="mt-1 mb-0 text-[9px] text-[var(--st-gray)]">
              {slot.instrument}
            </p>
          </div>
        </div>

        <span
          className={`st-badge ${
            slot.status === "Booked"
              ? "st-badge-red"
              : "st-badge-green"
          }`}
        >
          {slot.status}
        </span>
      </div>

      {slot.learner && (
        <div className="mt-3 border-t border-[var(--st-border)] pt-2">
          <p className="m-0 text-[9px] text-[var(--st-gray)]">
            Trial learner
          </p>

          <p className="mt-1 mb-0 text-[10px] font-bold text-[var(--st-charcoal-dark)]">
            {slot.learner}
          </p>
        </div>
      )}
    </div>
  );
}

export default function CalendarPage() {
  return (
    <AppShell>
      <main className="st-content">
        {/* =====================================================
            HEADER
        ===================================================== */}

        <div className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="st-eyebrow">
              SCHEDULE
            </p>

            <h1 className="st-page-title mt-2">
              Calendar
            </h1>

            <p className="st-page-description">
              Manage available trial lesson times and see what is booked.
            </p>
          </div>

          <button className="st-button st-button-primary">
            <Plus size={15} />
            Add trial slot
          </button>
        </div>

        {/* =====================================================
            CALENDAR TOOLBAR
        ===================================================== */}

        <div className="st-card mb-5 p-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2">
              <button
                className="st-icon-button"
                aria-label="Previous week"
              >
                <ChevronLeft size={16} />
              </button>

              <button
                className="st-icon-button"
                aria-label="Next week"
              >
                <ChevronRight size={16} />
              </button>

              <button className="ml-1 rounded-lg border border-[var(--st-border)] px-3 py-2 text-[10px] font-bold text-[var(--st-charcoal)] hover:bg-[var(--st-bg-soft)]">
                Today
              </button>

              <div className="ml-2 flex items-center gap-2 text-[11px] font-bold text-[var(--st-charcoal-dark)]">
                <CalendarDays
                  size={15}
                  className="text-[var(--st-red)]"
                />
                August 17 – 23, 2026
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-[9px] text-[var(--st-gray)]">
                <span className="h-2 w-2 rounded-full bg-[#35a66f]" />
                Available
              </span>

              <span className="flex items-center gap-1.5 text-[9px] text-[var(--st-gray)]">
                <span className="h-2 w-2 rounded-full bg-[var(--st-red)]" />
                Booked
              </span>
            </div>
          </div>
        </div>

        {/* =====================================================
            DAY SELECTOR
        ===================================================== */}

        <div className="mb-5 grid grid-cols-4 gap-2 sm:grid-cols-7">
          {weekDays.map((day, index) => (
            <button
              key={day.label}
              className={`rounded-xl border px-2 py-3 text-center transition-all ${
                index === 0
                  ? "border-[var(--st-red)] bg-[var(--st-red)] text-white"
                  : "border-[var(--st-border)] bg-white text-[var(--st-charcoal)] hover:border-[var(--st-red)]"
              }`}
            >
              <span
                className={`block text-[8px] font-bold tracking-[0.12em] ${
                  index === 0
                    ? "text-white/80"
                    : "text-[var(--st-gray)]"
                }`}
              >
                {day.day}
              </span>

              <span className="mt-1 block text-[17px] font-bold">
                {day.date}
              </span>
            </button>
          ))}
        </div>

        {/* =====================================================
            TODAY SUMMARY
        ===================================================== */}

        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="st-card p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--st-bg-soft)] text-[var(--st-red)]">
                <Clock3 size={17} />
              </div>

              <div>
                <p className="m-0 text-[9px] font-semibold text-[var(--st-gray)]">
                  TODAY
                </p>

                <p className="mt-1 mb-0 text-[18px] font-bold text-[var(--st-charcoal-dark)]">
                  7 slots
                </p>
              </div>
            </div>
          </div>

          <div className="st-card p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--st-bg-soft)] text-[var(--st-red)]">
                <Music2 size={17} />
              </div>

              <div>
                <p className="m-0 text-[9px] font-semibold text-[var(--st-gray)]">
                  PIANO
                </p>

                <p className="mt-1 mb-0 text-[18px] font-bold text-[var(--st-charcoal-dark)]">
                  4 slots
                </p>
              </div>
            </div>
          </div>

          <div className="st-card p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--st-bg-soft)] text-[var(--st-red)]">
                <Guitar size={17} />
              </div>

              <div>
                <p className="m-0 text-[9px] font-semibold text-[var(--st-gray)]">
                  GUITAR
                </p>

                <p className="mt-1 mb-0 text-[18px] font-bold text-[var(--st-charcoal-dark)]">
                  3 slots
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* =====================================================
            DAILY SCHEDULE
        ===================================================== */}

        <div className="st-card overflow-hidden">
          <div className="flex flex-col gap-2 border-b border-[var(--st-border)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="m-0 text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--st-red)]">
                MONDAY · AUGUST 17
              </p>

              <h2 className="mt-1 st-section-title">
                Trial lesson availability
              </h2>
            </div>

            <div className="flex items-center gap-2 text-[9px] text-[var(--st-gray)]">
              <Clock3 size={13} />
              60-minute lessons
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {demoSlots.map((slot) => (
              <SlotCard key={slot.id} slot={slot} />
            ))}
          </div>
        </div>

        {/* =====================================================
            EMPTY / FUTURE NOTE
        ===================================================== */}

        <div className="mt-5 rounded-xl border border-dashed border-[var(--st-border)] bg-white/50 px-5 py-4">
          <div className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--st-bg-soft)] text-[var(--st-red)]">
              <CalendarDays size={15} />
            </div>

            <div>
              <p className="m-0 text-[10px] font-bold text-[var(--st-charcoal-dark)]">
                Slot management
              </p>

              <p className="mt-1 mb-0 text-[9px] leading-relaxed text-[var(--st-gray)]">
                Available slots created here will become visible on
                the public trial booking page. Once someone books,
                the slot will automatically become unavailable.
              </p>
            </div>
          </div>
        </div>
      </main>
    </AppShell>
  );
}