"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
  Clock3,
  Guitar,
  Loader2,
  Music2,
  RefreshCw,
  Settings,
  Save,
} from "lucide-react";

import AppShell from "@/components/layout/AppShell";
import { supabase } from "@/lib/supabase";

type DaySchedule = {
  day: string;
  short: string;
  enabled: boolean;
  start: string;
  end: string;
};

const defaultSchedule: DaySchedule[] = [
  {
    day: "Monday",
    short: "MON",
    enabled: true,
    start: "08:00",
    end: "19:00",
  },
  {
    day: "Tuesday",
    short: "TUE",
    enabled: true,
    start: "08:00",
    end: "19:00",
  },
  {
    day: "Wednesday",
    short: "WED",
    enabled: true,
    start: "08:00",
    end: "19:00",
  },
  {
    day: "Thursday",
    short: "THU",
    enabled: true,
    start: "08:00",
    end: "19:00",
  },
  {
    day: "Friday",
    short: "FRI",
    enabled: true,
    start: "08:00",
    end: "19:00",
  },
  {
    day: "Saturday",
    short: "SAT",
    enabled: true,
    start: "09:00",
    end: "12:00",
  },
  {
    day: "Sunday",
    short: "SUN",
    enabled: false,
    start: "09:00",
    end: "12:00",
  },
];

function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatTime(time: string) {
  const [hour, minute] = time.split(":").map(Number);

  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;

  return `${displayHour}:${String(minute).padStart(
    2,
    "0"
  )} ${suffix}`;
}

export default function SettingsPage() {
  const [schedule, setSchedule] =
    useState<DaySchedule[]>(defaultSchedule);

  const [piano, setPiano] = useState(true);
  const [guitar, setGuitar] = useState(true);

  const [availabilityDays, setAvailabilityDays] =
    useState(14);

  const [loadingSettings, setLoadingSettings] =
    useState(true);

  const [savingSettings, setSavingSettings] =
    useState(false);

  const [generating, setGenerating] =
    useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadBookingSettings();
  }, []);

  async function loadBookingSettings() {
    setLoadingSettings(true);

    const { data, error } = await supabase
      .from("booking_settings")
      .select("availability_days")
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error(error);
      setError(
        "Could not load booking page settings."
      );
    } else if (data) {
      setAvailabilityDays(data.availability_days);
    }

    setLoadingSettings(false);
  }

  async function saveBookingSettings() {
    setSavingSettings(true);
    setMessage("");
    setError("");

    const { data: existing, error: findError } =
      await supabase
        .from("booking_settings")
        .select("id")
        .limit(1)
        .maybeSingle();

    if (findError) {
      setError(findError.message);
      setSavingSettings(false);
      return;
    }

    let saveError;

    if (existing?.id) {
      const result = await supabase
        .from("booking_settings")
        .update({
          availability_days: availabilityDays,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      saveError = result.error;
    } else {
      const result = await supabase
        .from("booking_settings")
        .insert({
          availability_days: availabilityDays,
        });

      saveError = result.error;
    }

    if (saveError) {
      setError(saveError.message);
    } else {
      setMessage(
        `Booking page will now show availability for the next ${availabilityDays} days.`
      );
    }

    setSavingSettings(false);
  }

  const weeklySlotCount = useMemo(() => {
    let count = 0;

    schedule.forEach((day) => {
      if (!day.enabled) return;

      const start = timeToMinutes(day.start);
      const end = timeToMinutes(day.end);

      const hourlySlots = Math.max(
        0,
        Math.floor((end - start) / 60)
      );

      const instruments =
        Number(piano) + Number(guitar);

      count += hourlySlots * instruments;
    });

    return count;
  }, [schedule, piano, guitar]);

  function updateDay(
    index: number,
    changes: Partial<DaySchedule>
  ) {
    setSchedule((current) =>
      current.map((day, dayIndex) =>
        dayIndex === index
          ? { ...day, ...changes }
          : day
      )
    );
  }

  async function generateFourWeeks() {
    setGenerating(true);
    setMessage("");
    setError("");

    try {
      const instruments: Array<
        "piano" | "guitar"
      > = [];

      if (piano) instruments.push("piano");
      if (guitar) instruments.push("guitar");

      if (instruments.length === 0) {
        throw new Error(
          "Select at least one instrument."
        );
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const endDate = addDays(today, 28);

      const { data: existingSlots, error: fetchError } =
        await supabase
          .from("lesson_slots")
          .select(
            "instrument, starts_at"
          )
          .gte(
            "starts_at",
            today.toISOString()
          )
          .lt(
            "starts_at",
            endDate.toISOString()
          );

      if (fetchError) {
        throw fetchError;
      }

      const existingKeys = new Set(
        (existingSlots ?? []).map(
          (slot) =>
            `${slot.instrument}|${new Date(
              slot.starts_at
            ).getTime()}`
        )
      );

      const newSlots: {
        instrument: "piano" | "guitar";
        starts_at: string;
        ends_at: string;
        is_available: boolean;
      }[] = [];

      for (
        let current = new Date(today);
        current < endDate;
        current = addDays(current, 1)
      ) {
        const dayIndex = current.getDay();

        const scheduleIndex =
          dayIndex === 0 ? 6 : dayIndex - 1;

        const daySchedule =
          schedule[scheduleIndex];

        if (!daySchedule?.enabled) continue;

        const startMinutes = timeToMinutes(
          daySchedule.start
        );

        const endMinutes = timeToMinutes(
          daySchedule.end
        );

        for (
          let minutes = startMinutes;
          minutes < endMinutes;
          minutes += 60
        ) {
          const hour =
            Math.floor(minutes / 60);

          const minute = minutes % 60;

          for (const instrument of instruments) {
            const startsAt = new Date(current);

            startsAt.setHours(
              hour,
              minute,
              0,
              0
            );

            const endsAt = new Date(startsAt);

            endsAt.setMinutes(
              endsAt.getMinutes() + 60
            );

            const key = `${instrument}|${startsAt.getTime()}`;

            if (existingKeys.has(key)) {
              continue;
            }

            newSlots.push({
              instrument,
              starts_at:
                startsAt.toISOString(),
              ends_at:
                endsAt.toISOString(),
              is_available: true,
            });

            existingKeys.add(key);
          }
        }
      }

      if (newSlots.length === 0) {
        setMessage(
          "Availability is already generated for the next 4 weeks."
        );

        setGenerating(false);
        return;
      }

      const batchSize = 100;

      for (
        let index = 0;
        index < newSlots.length;
        index += batchSize
      ) {
        const batch = newSlots.slice(
          index,
          index + batchSize
        );

        const { error: insertError } =
          await supabase
            .from("lesson_slots")
            .insert(batch);

        if (insertError) {
          throw insertError;
        }
      }

      setMessage(
        `${newSlots.length} new trial slots generated for the next 4 weeks.`
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to generate availability."
      );
    } finally {
      setGenerating(false);
    }
  }

  return (
    <AppShell>
      <main className="st-content">

        {/* HEADER */}

        <div className="mb-7">
          <p className="st-eyebrow">
            SYSTEM
          </p>

          <h1 className="st-page-title mt-2">
            Settings
          </h1>

          <p className="st-page-description">
            Manage Sauti Tamu&apos;s recurring trial
            lesson availability.
          </p>
        </div>

        {/* WEEKLY AVAILABILITY */}

        <section className="st-card overflow-hidden">

          <div className="border-b border-[var(--st-border)] px-5 py-5 sm:px-6">

            <div className="flex items-start gap-3">

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--st-bg-soft)] text-[var(--st-red)]">
                <CalendarDays size={18} />
              </div>

              <div>
                <h2 className="st-section-title">
                  Weekly availability
                </h2>

                <p className="mt-1 mb-0 max-w-[550px] text-[10px] leading-relaxed text-[var(--st-gray)]">
                  This schedule repeats every week.
                  Trial slots are generated automatically
                  from these hours.
                </p>
              </div>

            </div>

          </div>

          <div className="divide-y divide-[var(--st-border)]">

            {schedule.map((day, index) => (
              <div
                key={day.day}
                className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:px-6"
              >

                <div className="flex w-full items-center gap-3 sm:w-[150px]">

                  <button
                    type="button"
                    onClick={() =>
                      updateDay(index, {
                        enabled: !day.enabled,
                      })
                    }
                    className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${
                      day.enabled
                        ? "bg-[var(--st-red)]"
                        : "bg-[#d7d2d2]"
                    }`}
                  >
                    <span
                      className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                        day.enabled
                          ? "translate-x-5"
                          : "translate-x-1"
                      }`}
                    />
                  </button>

                  <div>
                    <p className="m-0 text-[11px] font-bold text-[var(--st-charcoal-dark)]">
                      {day.day}
                    </p>

                    <p className="mt-1 mb-0 text-[8px] font-bold tracking-[0.12em] text-[var(--st-gray)]">
                      {day.short}
                    </p>
                  </div>

                </div>

                {day.enabled ? (
                  <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">

                    <div className="flex items-center gap-2">

                      <Clock3
                        size={14}
                        className="text-[var(--st-red)]"
                      />

                      <input
                        type="time"
                        value={day.start}
                        onChange={(event) =>
                          updateDay(index, {
                            start:
                              event.target.value,
                          })
                        }
                        className="rounded-lg border border-[var(--st-border)] bg-white px-3 py-2 text-[11px] font-semibold text-[var(--st-charcoal-dark)] outline-none focus:border-[var(--st-red)]"
                      />

                      <span className="text-[10px] text-[var(--st-gray)]">
                        to
                      </span>

                      <input
                        type="time"
                        value={day.end}
                        onChange={(event) =>
                          updateDay(index, {
                            end:
                              event.target.value,
                          })
                        }
                        className="rounded-lg border border-[var(--st-border)] bg-white px-3 py-2 text-[11px] font-semibold text-[var(--st-charcoal-dark)] outline-none focus:border-[var(--st-red)]"
                      />

                    </div>

                    <span className="text-[9px] text-[var(--st-gray)]">
                      {formatTime(day.start)}
                      {" – "}
                      {formatTime(day.end)}
                    </span>

                  </div>
                ) : (
                  <div className="flex-1">
                    <span className="text-[10px] font-semibold text-[var(--st-gray)]">
                      Closed
                    </span>
                  </div>
                )}

              </div>
            ))}

          </div>
        </section>

        {/* BOOKING PAGE VISIBILITY */}

        <section className="st-card mt-5 p-5 sm:p-6">

          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">

            <div className="flex items-start gap-3">

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--st-bg-soft)] text-[var(--st-red)]">
                <CalendarDays size={18} />
              </div>

              <div>
                <h2 className="st-section-title">
                  Booking page visibility
                </h2>

                <p className="mt-1 max-w-[500px] text-[10px] leading-relaxed text-[var(--st-gray)]">
                  Choose how far ahead customers can see
                  available trial lessons on the public
                  booking page.
                </p>
              </div>

            </div>

            <div className="w-full lg:w-[250px]">

              <label className="mb-2 block text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--st-gray)]">
                Customer booking window
              </label>

              <select
                value={availabilityDays}
                onChange={(event) =>
                  setAvailabilityDays(
                    Number(event.target.value)
                  )
                }
                disabled={loadingSettings || savingSettings}
                className="w-full rounded-xl border border-[var(--st-border)] bg-white px-4 py-3 text-[12px] font-semibold text-[var(--st-charcoal-dark)] outline-none focus:border-[var(--st-red)]"
              >
                <option value={7}>
                  Next 7 days
                </option>

                <option value={14}>
                  Next 14 days
                </option>

                <option value={21}>
                  Next 21 days
                </option>

                <option value={28}>
                  Next 28 days
                </option>
              </select>

              <p className="mt-2 mb-0 text-[9px] text-[var(--st-gray)]">
                Recommended: 14 days
              </p>

            </div>

          </div>

          <div className="mt-5 flex flex-col gap-4 rounded-xl bg-[var(--st-bg-soft)] p-4 sm:flex-row sm:items-center sm:justify-between">

            <div>
              <p className="m-0 text-[10px] font-bold text-[var(--st-charcoal-dark)]">
                Customers currently see
              </p>

              <p className="mt-1 mb-0 text-[9px] text-[var(--st-gray)]">
                The next {availabilityDays} days of available
                trial lessons.
              </p>
            </div>

            <button
              type="button"
              onClick={saveBookingSettings}
              disabled={savingSettings || loadingSettings}
              className="st-button st-button-primary shrink-0"
            >
              {savingSettings ? (
                <>
                  <Loader2
                    size={14}
                    className="animate-spin"
                  />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={14} />
                  Save setting
                </>
              )}
            </button>

          </div>

        </section>

        {/* INSTRUMENTS + LENGTH */}

        <section className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">

          <div className="st-card p-5 sm:p-6">

            <div className="flex items-start gap-3">

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--st-bg-soft)] text-[var(--st-red)]">
                <Music2 size={18} />
              </div>

              <div>
                <h2 className="st-section-title">
                  Trial instruments
                </h2>

                <p className="mt-1 mb-0 text-[10px] text-[var(--st-gray)]">
                  Each available hour gets one slot per
                  selected instrument.
                </p>
              </div>

            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">

              <button
                type="button"
                onClick={() => setPiano(!piano)}
                className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-all ${
                  piano
                    ? "border-[var(--st-red)] bg-[var(--st-bg-soft)]"
                    : "border-[var(--st-border)] bg-white"
                }`}
              >

                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                    piano
                      ? "bg-[var(--st-red)] text-white"
                      : "bg-[var(--st-bg-soft)] text-[var(--st-gray)]"
                  }`}
                >
                  {piano ? (
                    <Check size={15} />
                  ) : (
                    <Music2 size={15} />
                  )}
                </div>

                <div>
                  <p className="m-0 text-[11px] font-bold text-[var(--st-charcoal-dark)]">
                    Piano
                  </p>

                  <p className="mt-1 mb-0 text-[9px] text-[var(--st-gray)]">
                    1 slot / hour
                  </p>
                </div>

              </button>

              <button
                type="button"
                onClick={() =>
                  setGuitar(!guitar)
                }
                className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-all ${
                  guitar
                    ? "border-[var(--st-red)] bg-[var(--st-bg-soft)]"
                    : "border-[var(--st-border)] bg-white"
                }`}
              >

                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                    guitar
                      ? "bg-[var(--st-red)] text-white"
                      : "bg-[var(--st-bg-soft)] text-[var(--st-gray)]"
                  }`}
                >
                  {guitar ? (
                    <Check size={15} />
                  ) : (
                    <Guitar size={15} />
                  )}
                </div>

                <div>
                  <p className="m-0 text-[11px] font-bold text-[var(--st-charcoal-dark)]">
                    Guitar
                  </p>

                  <p className="mt-1 mb-0 text-[9px] text-[var(--st-gray)]">
                    1 slot / hour
                  </p>
                </div>

              </button>

            </div>

          </div>

          <div className="st-card p-5 sm:p-6">

            <div className="flex items-start gap-3">

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--st-bg-soft)] text-[var(--st-red)]">
                <Clock3 size={18} />
              </div>

              <div>
                <h2 className="st-section-title">
                  Lesson length
                </h2>

                <p className="mt-1 mb-0 text-[10px] text-[var(--st-gray)]">
                  Trial lessons use the standard center
                  duration.
                </p>
              </div>

            </div>

            <div className="mt-5 rounded-xl border border-[var(--st-border)] bg-[var(--st-bg-soft)] px-4 py-4">

              <p className="m-0 text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--st-gray)]">
                STANDARD TRIAL
              </p>

              <div className="mt-2 flex items-end gap-2">

                <span className="text-[30px] font-bold leading-none tracking-[-0.04em] text-[var(--st-charcoal-dark)]">
                  60
                </span>

                <span className="mb-1 text-[11px] font-semibold text-[var(--st-gray)]">
                  minutes
                </span>

              </div>

            </div>

          </div>

        </section>

        {/* GENERATOR */}

        <section className="mt-5 overflow-hidden rounded-2xl bg-[var(--st-charcoal-dark)] text-white">

          <div className="p-5 sm:p-6">

            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">

              <div className="flex items-start gap-4">

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--st-red)]">
                  <RefreshCw size={19} />
                </div>

                <div>

                  <p className="m-0 text-[9px] font-bold uppercase tracking-[0.16em] text-white/50">
                    AVAILABILITY GENERATOR
                  </p>

                  <h2 className="mt-1 text-[18px] font-bold">
                    Generate the next 4 weeks
                  </h2>

                  <p className="mt-2 max-w-[550px] text-[10px] leading-relaxed text-white/55">
                    Create all bookable Piano and Guitar
                    trial slots from your recurring weekly
                    schedule. Existing slots will not be
                    duplicated.
                  </p>

                </div>

              </div>

              <div className="shrink-0">

                <div className="mb-3 text-right">

                  <p className="m-0 text-[9px] uppercase tracking-[0.12em] text-white/40">
                    ESTIMATED
                  </p>

                  <p className="mt-1 mb-0 text-[22px] font-bold">
                    {weeklySlotCount * 4}
                  </p>

                  <p className="mt-1 mb-0 text-[9px] text-white/40">
                    slots / 4 weeks
                  </p>

                </div>

                <button
                  type="button"
                  onClick={generateFourWeeks}
                  disabled={generating}
                  className="st-button w-full bg-white text-[var(--st-charcoal-dark)] hover:bg-[var(--st-bg-soft)] disabled:opacity-60"
                >
                  {generating ? (
                    <>
                      <Loader2
                        size={14}
                        className="animate-spin"
                      />
                      Generating...
                    </>
                  ) : (
                    <>
                      <RefreshCw size={14} />
                      Generate availability
                    </>
                  )}
                </button>

              </div>

            </div>

          </div>

        </section>

        {/* MESSAGES */}

        {message && (
          <div className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-4">
            <p className="m-0 text-[10px] font-bold text-green-800">
              Settings updated
            </p>

            <p className="mt-1 mb-0 text-[10px] text-green-700">
              {message}
            </p>
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-4">
            <p className="m-0 text-[10px] font-bold text-red-800">
              Something went wrong
            </p>

            <p className="mt-1 mb-0 text-[10px] text-red-700">
              {error}
            </p>
          </div>
        )}

        <div className="mt-7 flex items-center gap-2 border-t border-[var(--st-border)] pt-5">

          <Settings
            size={12}
            className="text-[var(--st-gray)]"
          />

          <p className="m-0 text-[9px] text-[var(--st-gray)]">
            Changes to availability settings affect future
            customer bookings. Existing bookings are never
            changed.
          </p>

        </div>

      </main>
    </AppShell>
  );
}