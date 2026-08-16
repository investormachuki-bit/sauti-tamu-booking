"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Guitar,
  Loader2,
  Music2,
  Plus,
  X,
} from "lucide-react";

import AppShell from "@/components/layout/AppShell";
import { supabase } from "@/lib/supabase";

type Instrument = "piano" | "guitar";

type LessonSlot = {
  id: string;
  instrument: Instrument;
  starts_at: string;
  ends_at: string;
  is_available: boolean;
};

function formatTime(dateString: string) {
  return new Date(dateString).toLocaleTimeString("en-KE", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDateHeading(date: Date) {
  return date.toLocaleDateString("en-KE", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatDay(date: Date) {
  return date.toLocaleDateString("en-KE", {
    weekday: "short",
  }).toUpperCase();
}

function getDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function startOfWeek(date: Date) {
  const result = new Date(date);
  const day = result.getDay();

  const mondayOffset = day === 0 ? -6 : 1 - day;

  result.setDate(result.getDate() + mondayOffset);
  result.setHours(0, 0, 0, 0);

  return result;
}

function getWeekDays(start: Date) {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);

    date.setDate(start.getDate() + index);

    return date;
  });
}

function InstrumentIcon({
  instrument,
}: {
  instrument: Instrument;
}) {
  if (instrument === "guitar") {
    return <Guitar size={16} />;
  }

  return <Music2 size={16} />;
}

function SlotCard({
  slot,
}: {
  slot: LessonSlot;
}) {
  return (
    <div
      className={`rounded-xl border p-4 transition-all ${
        slot.is_available
          ? "border-dashed border-[var(--st-border)] bg-white hover:border-[var(--st-red)] hover:bg-[var(--st-bg-soft)]"
          : "border-[var(--st-border)] bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
              slot.instrument === "piano"
                ? "bg-[var(--st-bg-soft)] text-[var(--st-red)]"
                : "bg-[#f5f5f5] text-[var(--st-charcoal)]"
            }`}
          >
            <InstrumentIcon instrument={slot.instrument} />
          </div>

          <div>
            <p className="m-0 text-[12px] font-bold text-[var(--st-charcoal-dark)]">
              {formatTime(slot.starts_at)}
            </p>

            <p className="mt-1 mb-0 text-[10px] capitalize text-[var(--st-gray)]">
              {slot.instrument}
            </p>
          </div>
        </div>

        <span
          className={`st-badge ${
            slot.is_available
              ? "st-badge-green"
              : "st-badge-red"
          }`}
        >
          {slot.is_available ? "Available" : "Booked"}
        </span>
      </div>

      {!slot.is_available && (
        <div className="mt-4 border-t border-[var(--st-border)] pt-3">
          <p className="m-0 text-[9px] text-[var(--st-gray)]">
            Booking
          </p>

          <p className="mt-1 mb-0 text-[10px] font-bold text-[var(--st-charcoal-dark)]">
            Reserved trial slot
          </p>
        </div>
      )}
    </div>
  );
}

export default function CalendarPage() {
  const [selectedDate, setSelectedDate] = useState(
    new Date()
  );

  const [weekStart, setWeekStart] = useState(
    startOfWeek(new Date())
  );

  const [slots, setSlots] = useState<LessonSlot[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showModal, setShowModal] = useState(false);

  const [instrument, setInstrument] =
    useState<Instrument>("piano");

  const [slotTime, setSlotTime] = useState("09:00");

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const weekDays = useMemo(
    () => getWeekDays(weekStart),
    [weekStart]
  );

  async function loadSlots() {
    setLoading(true);
    setError("");

    const rangeStart = new Date(weekStart);
    rangeStart.setHours(0, 0, 0, 0);

    const rangeEnd = new Date(weekStart);
    rangeEnd.setDate(rangeEnd.getDate() + 7);
    rangeEnd.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from("lesson_slots")
      .select(
        "id, instrument, starts_at, ends_at, is_available"
      )
      .gte("starts_at", rangeStart.toISOString())
      .lte("starts_at", rangeEnd.toISOString())
      .order("starts_at", {
        ascending: true,
      });

    if (error) {
      console.error(error);
      setError(error.message);
      setSlots([]);
      setLoading(false);
      return;
    }

    setSlots((data ?? []) as LessonSlot[]);
    setLoading(false);
  }

  useEffect(() => {
    loadSlots();
  }, [weekStart]);

  function goToPreviousWeek() {
    const previous = new Date(weekStart);

    previous.setDate(previous.getDate() - 7);

    setWeekStart(previous);
    setSelectedDate(previous);
  }

  function goToNextWeek() {
    const next = new Date(weekStart);

    next.setDate(next.getDate() + 7);

    setWeekStart(next);
    setSelectedDate(next);
  }

  function goToToday() {
    const today = new Date();

    setSelectedDate(today);
    setWeekStart(startOfWeek(today));
  }

  async function createSlot(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setSaving(true);
    setSaveError("");

    const dateKey = getDateKey(selectedDate);

    const startsAt = new Date(
      `${dateKey}T${slotTime}:00`
    );

    const endsAt = new Date(startsAt);

    endsAt.setMinutes(
      endsAt.getMinutes() + 60
    );

    const { error } = await supabase
      .from("lesson_slots")
      .insert({
        instrument,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        is_available: true,
      });

    if (error) {
      console.error(error);
      setSaveError(error.message);
      setSaving(false);
      return;
    }

    setShowModal(false);
    setSaving(false);

    await loadSlots();
  }

  const selectedDateKey = getDateKey(selectedDate);

  const selectedDaySlots = slots.filter((slot) => {
    return (
      getDateKey(
        new Date(slot.starts_at)
      ) === selectedDateKey
    );
  });

  const availableCount = selectedDaySlots.filter(
    (slot) => slot.is_available
  ).length;

  const bookedCount = selectedDaySlots.filter(
    (slot) => !slot.is_available
  ).length;

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

          <button
            onClick={() => {
              setSaveError("");
              setShowModal(true);
            }}
            className="st-button st-button-primary"
          >
            <Plus size={15} />
            Add trial slot
          </button>
        </div>

        {/* =====================================================
            WEEK TOOLBAR
        ===================================================== */}

        <div className="st-card mb-5 p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={goToPreviousWeek}
                className="st-icon-button"
                aria-label="Previous week"
              >
                <ChevronLeft size={16} />
              </button>

              <button
                onClick={goToNextWeek}
                className="st-icon-button"
                aria-label="Next week"
              >
                <ChevronRight size={16} />
              </button>

              <button
                onClick={goToToday}
                className="rounded-lg border border-[var(--st-border)] bg-white px-4 py-2.5 text-[10px] font-bold text-[var(--st-charcoal-dark)] hover:bg-[var(--st-bg-soft)]"
              >
                Today
              </button>

              <div className="ml-1 flex items-center gap-2 text-[11px] font-bold text-[var(--st-charcoal-dark)]">
                <CalendarDays
                  size={15}
                  className="text-[var(--st-red)]"
                />

                {formatDateHeading(weekStart)}
                {" – "}
                {formatDateHeading(weekDays[6])}
              </div>
            </div>

            <div className="flex items-center gap-4">
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
          {weekDays.map((day) => {
            const active =
              getDateKey(day) === selectedDateKey;

            const daySlots = slots.filter(
              (slot) =>
                getDateKey(
                  new Date(slot.starts_at)
                ) === getDateKey(day)
            );

            return (
              <button
                key={getDateKey(day)}
                onClick={() => setSelectedDate(day)}
                className={`rounded-xl border px-2 py-3 text-center transition-all ${
                  active
                    ? "border-[var(--st-red)] bg-[var(--st-red)] text-white"
                    : "border-[var(--st-border)] bg-white text-[var(--st-charcoal)] hover:border-[var(--st-red)]"
                }`}
              >
                <span
                  className={`block text-[8px] font-bold tracking-[0.12em] ${
                    active
                      ? "text-white/80"
                      : "text-[var(--st-gray)]"
                  }`}
                >
                  {formatDay(day)}
                </span>

                <span className="mt-1 block text-[17px] font-bold">
                  {day.getDate()}
                </span>

                <span
                  className={`mt-1 block text-[8px] ${
                    active
                      ? "text-white/75"
                      : "text-[var(--st-gray)]"
                  }`}
                >
                  {daySlots.length}{" "}
                  {daySlots.length === 1
                    ? "slot"
                    : "slots"}
                </span>
              </button>
            );
          })}
        </div>

        {/* =====================================================
            SUMMARY
        ===================================================== */}

        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="st-card p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--st-bg-soft)] text-[var(--st-red)]">
                <Clock3 size={17} />
              </div>

              <div>
                <p className="m-0 text-[9px] font-semibold text-[var(--st-gray)]">
                  SELECTED DAY
                </p>

                <p className="mt-1 mb-0 text-[18px] font-bold text-[var(--st-charcoal-dark)]">
                  {selectedDaySlots.length}{" "}
                  {selectedDaySlots.length === 1
                    ? "slot"
                    : "slots"}
                </p>
              </div>
            </div>
          </div>

          <div className="st-card p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--st-bg-soft)] text-[var(--st-red)]">
                <CalendarDays size={17} />
              </div>

              <div>
                <p className="m-0 text-[9px] font-semibold text-[var(--st-gray)]">
                  AVAILABLE
                </p>

                <p className="mt-1 mb-0 text-[18px] font-bold text-[var(--st-charcoal-dark)]">
                  {availableCount}
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
                  BOOKED
                </p>

                <p className="mt-1 mb-0 text-[18px] font-bold text-[var(--st-red)]">
                  {bookedCount}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* =====================================================
            ERROR
        ===================================================== */}

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-4">
            <p className="m-0 text-[11px] font-bold text-red-700">
              Unable to load calendar
            </p>

            <p className="mt-1 mb-0 text-[10px] leading-relaxed text-red-600">
              {error}
            </p>
          </div>
        )}

        {/* =====================================================
            DAILY SCHEDULE
        ===================================================== */}

        <div className="st-card overflow-hidden">
          <div className="flex flex-col gap-2 border-b border-[var(--st-border)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="m-0 text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--st-red)]">
                {selectedDate.toLocaleDateString(
                  "en-KE",
                  {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  }
                )}
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

          <div className="p-4">
            {loading ? (
              <div className="flex min-h-[180px] items-center justify-center">
                <div className="flex items-center gap-2 text-[11px] text-[var(--st-gray)]">
                  <Loader2
                    size={16}
                    className="animate-spin text-[var(--st-red)]"
                  />
                  Loading slots...
                </div>
              </div>
            ) : selectedDaySlots.length === 0 ? (
              <div className="flex min-h-[220px] flex-col items-center justify-center rounded-xl border border-dashed border-[var(--st-border)] bg-[var(--st-bg-soft)] px-6 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[var(--st-red)] shadow-sm">
                  <CalendarDays size={21} />
                </div>

                <h3 className="mt-4 text-[13px] font-bold text-[var(--st-charcoal-dark)]">
                  No trial slots yet
                </h3>

                <p className="mt-1 max-w-[300px] text-[10px] leading-relaxed text-[var(--st-gray)]">
                  Create available Piano or Guitar trial
                  lesson times for this day.
                </p>

                <button
                  onClick={() => {
                    setSaveError("");
                    setShowModal(true);
                  }}
                  className="st-button st-button-primary mt-4"
                >
                  <Plus size={14} />
                  Add trial slot
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {selectedDaySlots.map((slot) => (
                  <SlotCard
                    key={slot.id}
                    slot={slot}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* =====================================================
            INFORMATION
        ===================================================== */}

        <div className="mt-5 rounded-xl border border-dashed border-[var(--st-border)] bg-white/50 px-5 py-4">
          <div className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--st-bg-soft)] text-[var(--st-red)]">
              <CalendarDays size={15} />
            </div>

            <div>
              <p className="m-0 text-[10px] font-bold text-[var(--st-charcoal-dark)]">
                How trial slots work
              </p>

              <p className="mt-1 mb-0 text-[9px] leading-relaxed text-[var(--st-gray)]">
                Available slots will appear on the public
                booking page. When a potential student books
                one, the slot becomes unavailable and is linked
                to the booking and lead.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* =======================================================
          ADD SLOT MODAL
      ======================================================= */}

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/35 p-0 backdrop-blur-[2px] sm:items-center sm:p-5">
          <div className="w-full max-w-[460px] rounded-t-3xl bg-white shadow-2xl sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-[var(--st-border)] px-5 py-4">
              <div>
                <p className="st-eyebrow">
                  NEW SLOT
                </p>

                <h2 className="mt-1 text-[18px] font-bold text-[var(--st-charcoal-dark)]">
                  Add trial lesson
                </h2>
              </div>

              <button
                onClick={() => setShowModal(false)}
                className="st-icon-button"
                aria-label="Close"
              >
                <X size={17} />
              </button>
            </div>

            <form
              onSubmit={createSlot}
              className="space-y-5 p-5"
            >
              {/* DATE */}

              <div>
                <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--st-charcoal)]">
                  Date
                </label>

                <div className="rounded-xl border border-[var(--st-border)] bg-[var(--st-bg-soft)] px-4 py-3 text-[12px] font-bold text-[var(--st-charcoal-dark)]">
                  {selectedDate.toLocaleDateString(
                    "en-KE",
                    {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    }
                  )}
                </div>
              </div>

              {/* INSTRUMENT */}

              <div>
                <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--st-charcoal)]">
                  Instrument
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setInstrument("piano")
                    }
                    className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-all ${
                      instrument === "piano"
                        ? "border-[var(--st-red)] bg-[var(--st-bg-soft)]"
                        : "border-[var(--st-border)] bg-white"
                    }`}
                  >
                    <Music2
                      size={18}
                      className="text-[var(--st-red)]"
                    />

                    <div>
                      <p className="m-0 text-[11px] font-bold text-[var(--st-charcoal-dark)]">
                        Piano
                      </p>

                      <p className="mt-1 mb-0 text-[9px] text-[var(--st-gray)]">
                        Trial lesson
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setInstrument("guitar")
                    }
                    className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-all ${
                      instrument === "guitar"
                        ? "border-[var(--st-red)] bg-[var(--st-bg-soft)]"
                        : "border-[var(--st-border)] bg-white"
                    }`}
                  >
                    <Guitar
                      size={18}
                      className="text-[var(--st-red)]"
                    />

                    <div>
                      <p className="m-0 text-[11px] font-bold text-[var(--st-charcoal-dark)]">
                        Guitar
                      </p>

                      <p className="mt-1 mb-0 text-[9px] text-[var(--st-gray)]">
                        Trial lesson
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* TIME */}

              <div>
                <label
                  htmlFor="slot-time"
                  className="mb-2 block text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--st-charcoal)]"
                >
                  Start time
                </label>

                <input
                  id="slot-time"
                  type="time"
                  required
                  value={slotTime}
                  onChange={(event) =>
                    setSlotTime(event.target.value)
                  }
                  className="w-full rounded-xl border border-[var(--st-border)] bg-white px-4 py-3 text-sm text-[var(--st-charcoal-dark)] outline-none focus:border-[var(--st-red)]"
                />

                <p className="mt-2 mb-0 text-[9px] text-[var(--st-gray)]">
                  Trial lesson duration is automatically set
                  to 60 minutes.
                </p>
              </div>

              {saveError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                  <p className="m-0 text-[10px] leading-relaxed text-red-700">
                    {saveError}
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="st-button st-button-secondary flex-1"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="st-button st-button-primary flex-1"
                >
                  {saving ? (
                    <>
                      <Loader2
                        size={14}
                        className="animate-spin"
                      />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Plus size={14} />
                      Create slot
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}