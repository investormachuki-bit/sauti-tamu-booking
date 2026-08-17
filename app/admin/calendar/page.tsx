"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  Clock3,
  Guitar,
  Loader2,
  Music2,
  Plus,
  RefreshCw,
  User,
  X,
} from "lucide-react";

import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Instrument = "piano" | "guitar";

type LessonSlot = {
  id: string;
  instrument: Instrument;
  starts_at: string;
  ends_at: string;
  is_available: boolean;
};

type Booking = {
  id: string;
  slot_id: string;
  lead_id: string;
  status: string;
};

type Lead = {
  id: string;
  full_name: string;
  whatsapp_number: string;
  email: string;
};

const NAIROBI_TIME_ZONE = "Africa/Nairobi";

const instrumentInfo = {
  piano: {
    name: "Piano",
    icon: Music2,
  },
  guitar: {
    name: "Guitar",
    icon: Guitar,
  },
};

function getNairobiDateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: NAIROBI_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function dateKeyToDate(key: string) {
  return new Date(`${key}T12:00:00Z`);
}

function addDays(key: string, amount: number) {
  const date = dateKeyToDate(key);
  date.setUTCDate(date.getUTCDate() + amount);

  return date.toISOString().slice(0, 10);
}

function getMonday(key: string) {
  const date = dateKeyToDate(key);
  const day = date.getUTCDay();

  const difference = day === 0 ? -6 : 1 - day;

  date.setUTCDate(date.getUTCDate() + difference);

  return date.toISOString().slice(0, 10);
}

function formatDayNumber(key: string) {
  return new Intl.DateTimeFormat("en-KE", {
    timeZone: "UTC",
    day: "numeric",
  }).format(dateKeyToDate(key));
}

function formatWeekday(key: string) {
  return new Intl.DateTimeFormat("en-KE", {
    timeZone: "UTC",
    weekday: "short",
  })
    .format(dateKeyToDate(key))
    .toUpperCase();
}

function formatLongDate(key: string) {
  return new Intl.DateTimeFormat("en-KE", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(dateKeyToDate(key));
}

function formatShortDate(key: string) {
  return new Intl.DateTimeFormat("en-KE", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
  }).format(dateKeyToDate(key));
}

function formatTime(dateString: string) {
  return new Intl.DateTimeFormat("en-KE", {
    timeZone: NAIROBI_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(dateString));
}

function formatTimeRange(start: string, end: string) {
  return `${formatTime(start)} – ${formatTime(end)}`;
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function AdminCalendarPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const requestedDate =
    searchParams.get("date");

  const todayKey = getNairobiDateKey(new Date());

  const [selectedDate, setSelectedDate] =
    useState(
      requestedDate || todayKey
    );

  const [slots, setSlots] = useState<LessonSlot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] = useState("");

  const [showAddSlot, setShowAddSlot] =
    useState(false);

  const [newInstrument, setNewInstrument] =
    useState<Instrument>("piano");

  const [newDate, setNewDate] =
    useState(todayKey);

  const [newTime, setNewTime] =
    useState("09:00");

  const [savingSlot, setSavingSlot] =
    useState(false);

  /*
   * Always keep selected date synchronized
   * with the URL.
   */

  useEffect(() => {
    if (requestedDate) {
      setSelectedDate(requestedDate);
    }
  }, [requestedDate]);

  const weekStart = useMemo(
    () => getMonday(selectedDate),
    [selectedDate]
  );

  const weekDays = useMemo(() => {
    return Array.from(
      { length: 7 },
      (_, index) =>
        addDays(weekStart, index)
    );
  }, [weekStart]);

  const weekEnd = addDays(
    weekStart,
    7
  );

  /*
   * Load one complete calendar week.
   *
   * IMPORTANT:
   * We query using Nairobi midnight boundaries,
   * not the browser's timezone.
   */

  async function loadCalendar(
    silent = false
  ) {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    const startIso = new Date(
      `${weekStart}T00:00:00+03:00`
    ).toISOString();

    const endIso = new Date(
      `${weekEnd}T00:00:00+03:00`
    ).toISOString();

    const {
      data: slotData,
      error: slotError,
    } = await supabase
      .from("lesson_slots")
      .select(
        "id, instrument, starts_at, ends_at, is_available"
      )
      .gte("starts_at", startIso)
      .lt("starts_at", endIso)
      .order("starts_at", {
        ascending: true,
      });

    if (slotError) {
      console.error(slotError);

      setError(
        "We couldn't load the calendar."
      );

      setLoading(false);
      setRefreshing(false);

      return;
    }

    const loadedSlots =
      (slotData ?? []) as LessonSlot[];

    setSlots(loadedSlots);

    /*
     * Load bookings belonging to these slots.
     */

    const slotIds =
      loadedSlots.map(
        (slot) => slot.id
      );

    if (slotIds.length === 0) {
      setBookings([]);
      setLeads([]);

      setLoading(false);
      setRefreshing(false);

      return;
    }

    const {
      data: bookingData,
      error: bookingError,
    } = await supabase
      .from("bookings")
      .select(
        "id, slot_id, lead_id, status"
      )
      .in("slot_id", slotIds);

    if (bookingError) {
      console.error(bookingError);

      setError(
        "Calendar loaded, but booking information could not be loaded."
      );

      setLoading(false);
      setRefreshing(false);

      return;
    }

    const loadedBookings =
      (bookingData ?? []) as Booking[];

    setBookings(loadedBookings);

    const leadIds = Array.from(
      new Set(
        loadedBookings.map(
          (booking) => booking.lead_id
        )
      )
    );

    if (leadIds.length > 0) {
      const {
        data: leadData,
        error: leadError,
      } = await supabase
        .from("leads")
        .select(
          "id, full_name, whatsapp_number, email"
        )
        .in("id", leadIds);

      if (!leadError) {
        setLeads(
          (leadData ?? []) as Lead[]
        );
      }
    } else {
      setLeads([]);
    }

    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => {
    loadCalendar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart]);

  /*
   * IMPORTANT:
   * Determine a slot's day using Nairobi time.
   *
   * This is what fixes the Monday 0 slots problem.
   */

  const slotsByDate = useMemo(() => {
    const map = new Map<
      string,
      LessonSlot[]
    >();

    weekDays.forEach((day) => {
      map.set(day, []);
    });

    slots.forEach((slot) => {
      const key =
        getNairobiDateKey(
          new Date(slot.starts_at)
        );

      if (!map.has(key)) {
        map.set(key, []);
      }

      map.get(key)!.push(slot);
    });

    return map;
  }, [slots, weekDays]);

  const selectedDaySlots =
    slotsByDate.get(selectedDate) ?? [];

  const bookingBySlot = useMemo(() => {
    const map = new Map<
      string,
      Booking
    >();

    bookings.forEach((booking) => {
      /*
       * Cancelled bookings should not make
       * a slot look actively booked.
       */

      if (
        booking.status !== "cancelled"
      ) {
        map.set(
          booking.slot_id,
          booking
        );
      }
    });

    return map;
  }, [bookings]);

  const leadById = useMemo(() => {
    const map = new Map<
      string,
      Lead
    >();

    leads.forEach((lead) => {
      map.set(lead.id, lead);
    });

    return map;
  }, [leads]);

  function selectDate(dateKey: string) {
    setSelectedDate(dateKey);

    router.push(
      `/admin/calendar?date=${dateKey}`,
      {
        scroll: false,
      }
    );
  }

  function changeWeek(amount: number) {
    const newWeekStart =
      addDays(weekStart, amount * 7);

    selectDate(newWeekStart);
  }

  function goToday() {
    selectDate(todayKey);
  }

  async function createSlot() {
    if (!newDate || !newTime) {
      return;
    }

    setSavingSlot(true);
    setError("");

    /*
     * Convert Nairobi local time to UTC.
     */

    const startsAt = new Date(
      `${newDate}T${newTime}:00+03:00`
    );

    const endsAt = new Date(
      startsAt.getTime() +
        60 * 60 * 1000
    );

    /*
     * Prevent duplicate instrument/time slots.
     */

    const {
      data: existing,
      error: existingError,
    } = await supabase
      .from("lesson_slots")
      .select("id")
      .eq("instrument", newInstrument)
      .eq(
        "starts_at",
        startsAt.toISOString()
      )
      .maybeSingle();

    if (existingError) {
      console.error(existingError);

      setError(
        "We couldn't check whether that slot already exists."
      );

      setSavingSlot(false);

      return;
    }

    if (existing) {
      setError(
        "That instrument already has a slot at this time."
      );

      setSavingSlot(false);

      return;
    }

    const {
      error: insertError,
    } = await supabase
      .from("lesson_slots")
      .insert({
        instrument: newInstrument,
        starts_at:
          startsAt.toISOString(),
        ends_at:
          endsAt.toISOString(),
        is_available: true,
      });

    if (insertError) {
      console.error(insertError);

      setError(
        "We couldn't create the trial slot."
      );

      setSavingSlot(false);

      return;
    }

    setShowAddSlot(false);

    selectDate(newDate);

    await loadCalendar(true);

    setSavingSlot(false);
  }

  return (
    <main className="st-content">

      {/* HEADER */}

      <div className="mb-7">

        <p className="st-eyebrow">
          SCHEDULE
        </p>

        <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">

          <div>
            <h1 className="st-page-title">
              Calendar
            </h1>

            <p className="st-page-description">
              Manage available trial lesson times
              and see what is booked.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setNewDate(selectedDate);
              setShowAddSlot(true);
            }}
            className="st-button st-button-primary w-full sm:w-auto"
          >
            <Plus size={15} />
            Add trial slot
          </button>

        </div>

      </div>

      {/* CALENDAR NAVIGATION */}

      <section className="st-card p-4 sm:p-5">

        <div className="flex flex-wrap items-center gap-2">

          <button
            type="button"
            onClick={() => changeWeek(-1)}
            className="st-icon-button"
            aria-label="Previous week"
          >
            <ArrowLeft size={16} />
          </button>

          <button
            type="button"
            onClick={() => changeWeek(1)}
            className="st-icon-button"
            aria-label="Next week"
          >
            <ArrowRight size={16} />
          </button>

          <button
            type="button"
            onClick={goToday}
            className="st-button st-button-secondary"
          >
            Today
          </button>

          <div className="ml-auto flex items-center gap-2 text-[10px] text-[var(--st-gray)]">
            {refreshing ? (
              <Loader2
                size={14}
                className="animate-spin"
              />
            ) : (
              <CalendarDays size={14} />
            )}

            <span>
              {formatShortDate(
                weekStart
              )}{" "}
              –{" "}
              {formatShortDate(
                addDays(weekStart, 6)
              )}
            </span>
          </div>

        </div>

        <div className="mt-5 flex flex-wrap items-center gap-4 text-[9px] font-semibold text-[var(--st-gray)]">

          <span className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#4d9b70]" />
            Available
          </span>

          <span className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--st-red)]" />
            Booked
          </span>

        </div>

      </section>

      {/* DAYS */}

      <section className="mt-5">

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">

          {weekDays.map((day) => {
            const daySlots =
              slotsByDate.get(day) ?? [];

            const selected =
              day === selectedDate;

            const availableCount =
              daySlots.filter(
                (slot) =>
                  slot.is_available &&
                  !bookingBySlot.has(
                    slot.id
                  )
              ).length;

            const bookedCount =
              daySlots.filter((slot) =>
                bookingBySlot.has(
                  slot.id
                )
              ).length;

            return (
              <button
                key={day}
                type="button"
                onClick={() =>
                  selectDate(day)
                }
                className={`rounded-2xl border p-4 text-left transition-all ${
                  selected
                    ? "border-[var(--st-red)] bg-[var(--st-red)] text-white shadow-sm"
                    : "border-[var(--st-border)] bg-white hover:border-[var(--st-red)] hover:bg-[var(--st-bg-soft)]"
                }`}
              >

                <p
                  className={`m-0 text-[9px] font-bold uppercase tracking-[0.08em] ${
                    selected
                      ? "text-white/75"
                      : "text-[var(--st-gray)]"
                  }`}
                >
                  {formatWeekday(day)}
                </p>

                <p
                  className={`mt-2 mb-0 text-[25px] font-bold ${
                    selected
                      ? "text-white"
                      : "text-[var(--st-charcoal-dark)]"
                  }`}
                >
                  {formatDayNumber(day)}
                </p>

                <p
                  className={`mt-2 mb-0 text-[9px] ${
                    selected
                      ? "text-white/75"
                      : "text-[var(--st-gray)]"
                  }`}
                >
                  {daySlots.length} slots
                </p>

                {daySlots.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">

                    {availableCount > 0 && (
                      <span
                        className={`rounded-full px-2 py-1 text-[8px] font-bold ${
                          selected
                            ? "bg-white/15 text-white"
                            : "bg-green-50 text-green-700"
                        }`}
                      >
                        {availableCount} open
                      </span>
                    )}

                    {bookedCount > 0 && (
                      <span
                        className={`rounded-full px-2 py-1 text-[8px] font-bold ${
                          selected
                            ? "bg-white/15 text-white"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {bookedCount} booked
                      </span>
                    )}

                  </div>
                )}

              </button>
            );
          })}

        </div>

      </section>

      {/* SELECTED DAY */}

      <section className="st-card mt-5 overflow-hidden">

        <div className="border-b border-[var(--st-border)] px-5 py-5">

          <p className="st-eyebrow">
            {formatLongDate(
              selectedDate
            )}
          </p>

          <h2 className="mt-1 st-section-title">
            Trial lesson availability
          </h2>

          <div className="mt-2 flex items-center gap-2 text-[10px] text-[var(--st-gray)]">
            <Clock3 size={14} />
            60-minute lessons
          </div>

        </div>

        {error && (
          <div className="mx-5 mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <p className="m-0 text-[10px] leading-relaxed text-red-700">
              {error}
            </p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-2 px-5 py-14 text-[10px] text-[var(--st-gray)]">
            <Loader2
              size={16}
              className="animate-spin"
            />
            Loading calendar...
          </div>
        ) : selectedDaySlots.length === 0 ? (
          <div className="px-5 py-14 text-center">

            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--st-bg-soft)] text-[var(--st-red)]">
              <CalendarDays size={19} />
            </div>

            <p className="mt-4 mb-0 text-[13px] font-bold text-[var(--st-charcoal-dark)]">
              No trial slots
            </p>

            <p className="mt-2 mb-0 text-[10px] text-[var(--st-gray)]">
              There are no generated slots for this day.
            </p>

          </div>
        ) : (
          <div className="divide-y divide-[var(--st-border)]">

            {selectedDaySlots.map(
              (slot) => {
                const booking =
                  bookingBySlot.get(
                    slot.id
                  );

                const lead =
                  booking
                    ? leadById.get(
                        booking.lead_id
                      )
                    : undefined;

                const isBooked =
                  Boolean(booking);

                const info =
                  instrumentInfo[
                    slot.instrument
                  ];

                const Icon =
                  info.icon;

                return (
                  <div
                    key={slot.id}
                    className={`p-5 transition-colors ${
                      isBooked
                        ? "bg-white"
                        : "hover:bg-[var(--st-bg-soft)]"
                    }`}
                  >

                    <div className="flex items-start gap-4">

                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${
                          slot.instrument ===
                          "piano"
                            ? "bg-[var(--st-bg-soft)] text-[var(--st-red)]"
                            : "bg-gray-50 text-[var(--st-charcoal)]"
                        }`}
                      >
                        <Icon size={21} />
                      </div>

                      <div className="min-w-0 flex-1">

                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">

                          <div>

                            <p className="m-0 text-[16px] font-bold text-[var(--st-charcoal-dark)]">
                              {formatTime(
                                slot.starts_at
                              )}
                            </p>

                            <p className="mt-1 mb-0 text-[10px] text-[var(--st-gray)]">
                              {info.name}
                            </p>

                          </div>

                          <span
                            className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.05em] ${
                              isBooked
                                ? "bg-red-50 text-[var(--st-red)]"
                                : "bg-green-50 text-green-700"
                            }`}
                          >
                            {isBooked ? (
                              <>
                                <Check
                                  size={11}
                                />
                                Booked
                              </>
                            ) : (
                              "Available"
                            )}
                          </span>

                        </div>

                        {isBooked && (
                          <div className="mt-4 border-t border-[var(--st-border)] pt-4">

                            <p className="m-0 text-[9px] font-semibold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                              Booking
                            </p>

                            <div className="mt-2 flex items-center gap-3">

                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--st-bg-soft)] text-[9px] font-bold text-[var(--st-red)]">
                                {lead
                                  ? initials(
                                      lead.full_name
                                    )
                                  : "BK"}
                              </div>

                              <div>
                                <p className="m-0 text-[11px] font-bold text-[var(--st-charcoal-dark)]">
                                  {lead?.full_name ||
                                    "Reserved trial slot"}
                                </p>

                                {lead && (
                                  <p className="mt-1 mb-0 text-[9px] text-[var(--st-gray)]">
                                    {lead.whatsapp_number}
                                  </p>
                                )}
                              </div>

                            </div>

                          </div>
                        )}

                      </div>

                    </div>

                  </div>
                );
              }
            )}

          </div>
        )}

      </section>

      {/* ADD SLOT MODAL */}

      {showAddSlot && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-5">

          <div className="w-full max-w-[480px] rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl">

            <div className="flex items-center justify-between">

              <div>
                <p className="st-eyebrow">
                  NEW SLOT
                </p>

                <h2 className="mt-1 text-[22px] font-bold text-[var(--st-charcoal-dark)]">
                  Add trial lesson
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowAddSlot(false)
                }
                className="st-icon-button"
              >
                <X size={16} />
              </button>

            </div>

            <div className="mt-6 space-y-5">

              <div>
                <label className="mb-2 block text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                  Date
                </label>

                <input
                  type="date"
                  value={newDate}
                  onChange={(e) =>
                    setNewDate(
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-[var(--st-border)] px-4 py-3 text-[12px] outline-none focus:border-[var(--st-red)]"
                />
              </div>

              <div>
                <label className="mb-2 block text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                  Instrument
                </label>

                <div className="grid grid-cols-2 gap-3">

                  {(
                    Object.keys(
                      instrumentInfo
                    ) as Instrument[]
                  ).map((instrument) => (
                    <button
                      key={instrument}
                      type="button"
                      onClick={() =>
                        setNewInstrument(
                          instrument
                        )
                      }
                      className={`rounded-xl border p-4 text-left ${
                        newInstrument ===
                        instrument
                          ? "border-[var(--st-red)] bg-[var(--st-bg-soft)]"
                          : "border-[var(--st-border)]"
                      }`}
                    >
                      <p className="m-0 text-[12px] font-bold">
                        {
                          instrumentInfo[
                            instrument
                          ].name
                        }
                      </p>

                      <p className="mt-1 mb-0 text-[9px] text-[var(--st-gray)]">
                        60 minutes
                      </p>
                    </button>
                  ))}

                </div>
              </div>

              <div>
                <label className="mb-2 block text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                  Start time
                </label>

                <input
                  type="time"
                  value={newTime}
                  onChange={(e) =>
                    setNewTime(
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-[var(--st-border)] px-4 py-3 text-[12px] outline-none focus:border-[var(--st-red)]"
                />
              </div>

            </div>

            <button
              type="button"
              disabled={savingSlot}
              onClick={createSlot}
              className="st-button st-button-primary mt-6 w-full disabled:opacity-60"
            >
              {savingSlot ? (
                <>
                  <Loader2
                    size={15}
                    className="animate-spin"
                  />
                  Creating...
                </>
              ) : (
                <>
                  <Plus size={15} />
                  Create slot
                </>
              )}
            </button>

          </div>

        </div>
      )}

    </main>
  );
}