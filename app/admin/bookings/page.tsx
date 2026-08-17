"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Mail,
  Phone,
  Search,
  RefreshCw,
  UserRound,
  XCircle,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

type BookingStatus =
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no-show";

type Instrument = "piano" | "guitar";

type Booking = {
  id: string;
  lead_id: string;
  slot_id: string;
  instrument: Instrument;
  status: BookingStatus;
  confirmation_sent_at: string | null;
  reminder_24h_sent_at: string | null;
  reminder_2h_sent_at: string | null;
  attended_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
};

type Lead = {
  id: string;
  full_name: string;
  email: string;
  whatsapp_number: string;
};

type LessonSlot = {
  id: string;
  starts_at: string;
  ends_at: string;
};

type BookingWithDetails = Booking & {
  lead?: Lead;
  slot?: LessonSlot;
};

type Filter =
  | "all"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no-show";

function formatDateTime(dateString: string) {
  return new Intl.DateTimeFormat("en-KE", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(dateString));
}

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat("en-KE", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(dateString));
}

function formatTime(dateString: string) {
  return new Intl.DateTimeFormat("en-KE", {
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(dateString));
}

function formatTimeRange(
  startsAt: string,
  endsAt: string
) {
  return `${formatTime(startsAt)} – ${formatTime(endsAt)}`;
}

function getInstrumentIcon(instrument: Instrument) {
  return instrument === "piano" ? "🎹" : "🎸";
}

function getStatusLabel(status: BookingStatus) {
  switch (status) {
    case "confirmed":
      return "Confirmed";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
    case "no-show":
      return "No-show";
    default:
      return status;
  }
}

function isSameDay(dateA: Date, dateB: Date) {
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  );
}

function startOfToday() {
  const date = new Date();

  date.setHours(0, 0, 0, 0);

  return date;
}

function endOfToday() {
  const date = new Date();

  date.setHours(23, 59, 59, 999);

  return date;
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<
    BookingWithDetails[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [filter, setFilter] =
    useState<Filter>("all");

  const [selectedBooking, setSelectedBooking] =
    useState<BookingWithDetails | null>(null);

  const [error, setError] = useState("");

  useEffect(() => {
    loadBookings();
  }, []);

  async function loadBookings() {
    setError("");

    try {
      const {
        data: bookingData,
        error: bookingError,
      } = await supabase
        .from("bookings")
        .select(
          `
            id,
            lead_id,
            slot_id,
            instrument,
            status,
            confirmation_sent_at,
            reminder_24h_sent_at,
            reminder_2h_sent_at,
            attended_at,
            completed_at,
            cancelled_at,
            created_at,
            updated_at
          `
        )
        .order("created_at", {
          ascending: false,
        });

      if (bookingError) {
        throw bookingError;
      }

      const rawBookings =
        (bookingData ?? []) as Booking[];

      if (rawBookings.length === 0) {
        setBookings([]);
        return;
      }

      const leadIds = Array.from(
        new Set(
          rawBookings.map(
            (booking) => booking.lead_id
          )
        )
      );

      const slotIds = Array.from(
        new Set(
          rawBookings.map(
            (booking) => booking.slot_id
          )
        )
      );

      const [
        { data: leadData, error: leadError },
        { data: slotData, error: slotError },
      ] = await Promise.all([
        supabase
          .from("leads")
          .select(
            "id, full_name, email, whatsapp_number"
          )
          .in("id", leadIds),

        supabase
          .from("lesson_slots")
          .select(
            "id, starts_at, ends_at"
          )
          .in("id", slotIds),
      ]);

      if (leadError) {
        throw leadError;
      }

      if (slotError) {
        throw slotError;
      }

      const leadsById = new Map(
        ((leadData ?? []) as Lead[]).map(
          (lead) => [lead.id, lead]
        )
      );

      const slotsById = new Map(
        ((slotData ?? []) as LessonSlot[]).map(
          (slot) => [slot.id, slot]
        )
      );

      const completeBookings =
        rawBookings.map((booking) => ({
          ...booking,
          lead: leadsById.get(
            booking.lead_id
          ),
          slot: slotsById.get(
            booking.slot_id
          ),
        }));

      setBookings(completeBookings);
    } catch (err) {
      console.error(
        "Failed to load bookings:",
        err
      );

      setError(
        "We couldn't load bookings. Please try again."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadBookings();
  }

  const statistics = useMemo(() => {
    const todayStart = startOfToday();
    const todayEnd = endOfToday();
    const now = new Date();

    const todaysTrials = bookings.filter(
      (booking) => {
        if (!booking.slot?.starts_at) {
          return false;
        }

        const start = new Date(
          booking.slot.starts_at
        );

        return (
          start >= todayStart &&
          start <= todayEnd &&
          booking.status !== "cancelled" &&
          booking.status !== "no-show"
        );
      }
    ).length;

    const confirmed = bookings.filter(
      (booking) =>
        booking.status === "confirmed"
    ).length;

    const completed = bookings.filter(
      (booking) =>
        booking.status === "completed"
    ).length;

    const upcoming = bookings.filter(
      (booking) => {
        if (!booking.slot?.starts_at) {
          return false;
        }

        const start = new Date(
          booking.slot.starts_at
        );

        return (
          start >= now &&
          booking.status === "confirmed"
        );
      }
    ).length;

    return {
      todaysTrials,
      confirmed,
      completed,
      upcoming,
    };
  }, [bookings]);

  const filteredBookings = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    return bookings.filter((booking) => {
      const matchesFilter =
        filter === "all" ||
        booking.status === filter;

      if (!matchesFilter) {
        return false;
      }

      if (!query) {
        return true;
      }

      const learner =
        booking.lead?.full_name
          ?.toLowerCase() ?? "";

      const email =
        booking.lead?.email
          ?.toLowerCase() ?? "";

      const whatsapp =
        booking.lead?.whatsapp_number
          ?.toLowerCase() ?? "";

      const instrument =
        booking.instrument.toLowerCase();

      return (
        learner.includes(query) ||
        email.includes(query) ||
        whatsapp.includes(query) ||
        instrument.includes(query)
      );
    });
  }, [bookings, filter, search]);

  const filterOptions: {
    value: Filter;
    label: string;
  }[] = [
    {
      value: "all",
      label: "All",
    },
    {
      value: "confirmed",
      label: "Confirmed",
    },
    {
      value: "completed",
      label: "Completed",
    },
    {
      value: "cancelled",
      label: "Cancelled",
    },
    {
      value: "no-show",
      label: "No-show",
    },
  ];

  return (
    <main className="min-w-0 bg-[var(--st-bg)]">
      <div className="mx-auto w-full max-w-[1200px] min-w-0 px-5 py-8 sm:px-8 sm:py-10">

        {/* HEADER */}

        <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">

          <div className="min-w-0">
            <p className="st-eyebrow">
              BOOKINGS
            </p>

            <h1 className="mt-2 text-[34px] font-bold tracking-[-0.05em] text-[var(--st-charcoal-dark)] sm:text-[44px]">
              Trial bookings
            </h1>

            <p className="mt-3 max-w-[620px] text-[12px] leading-relaxed text-[var(--st-gray)]">
              Manage your trial learners, lesson times
              and booking status from one place.
            </p>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="st-button st-button-secondary w-fit shrink-0"
          >
            <RefreshCw
              size={15}
              className={
                refreshing
                  ? "animate-spin"
                  : ""
              }
            />
            {refreshing
              ? "Refreshing..."
              : "Refresh"}
          </button>

        </div>

        {/* ERROR */}

        {error && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
            <p className="m-0 text-[11px] leading-relaxed text-red-700">
              {error}
            </p>
          </div>
        )}

        {/* STATISTICS */}

        <section className="mt-8 grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">

          <div className="st-card min-w-0 p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--st-bg-soft)] text-[var(--st-red)]">
                <CalendarDays size={19} />
              </div>

              <p className="m-0 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--st-gray)]">
                Today&apos;s trials
              </p>
            </div>

            <p className="mt-5 mb-0 text-[38px] font-bold tracking-[-0.04em] text-[var(--st-charcoal-dark)]">
              {statistics.todaysTrials}
            </p>
          </div>

          <div className="st-card min-w-0 p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--st-bg-soft)] text-[var(--st-red)]">
                <Clock3 size={19} />
              </div>

              <p className="m-0 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--st-gray)]">
                Confirmed
              </p>
            </div>

            <p className="mt-5 mb-0 text-[38px] font-bold tracking-[-0.04em] text-[var(--st-charcoal-dark)]">
              {statistics.confirmed}
            </p>
          </div>

          <div className="st-card min-w-0 p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--st-bg-soft)] text-[var(--st-red)]">
                <CheckCircle2 size={19} />
              </div>

              <p className="m-0 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--st-gray)]">
                Completed
              </p>
            </div>

            <p className="mt-5 mb-0 text-[38px] font-bold tracking-[-0.04em] text-[var(--st-charcoal-dark)]">
              {statistics.completed}
            </p>
          </div>

          <div className="st-card min-w-0 p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--st-bg-soft)] text-[var(--st-red)]">
                <CalendarDays size={19} />
              </div>

              <p className="m-0 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--st-gray)]">
                Upcoming
              </p>
            </div>

            <p className="mt-5 mb-0 text-[38px] font-bold tracking-[-0.04em] text-[var(--st-charcoal-dark)]">
              {statistics.upcoming}
            </p>
          </div>

        </section>

        {/* SEARCH + FILTERS */}

        <section className="st-card mt-8 min-w-0 max-w-full overflow-hidden p-5 sm:p-6">

          <div className="relative min-w-0">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--st-gray)]"
            />

            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search learner, email or WhatsApp..."
              className="w-full min-w-0 rounded-full border border-[var(--st-border)] bg-white py-3.5 pl-11 pr-4 text-[12px] text-[var(--st-charcoal-dark)] outline-none placeholder:text-[var(--st-gray)] focus:border-[var(--st-red)] focus:ring-2 focus:ring-[var(--st-red)]/10"
            />
          </div>

          {/* STATUS FILTERS */}

          <div className="mt-4 flex min-w-0 max-w-full flex-wrap gap-2">

            {filterOptions.map((option) => {
              const active =
                filter === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() =>
                    setFilter(option.value)
                  }
                  className={`shrink-0 rounded-full px-5 py-3 text-[11px] font-semibold transition-all ${
                    active
                      ? "bg-[var(--st-red)] text-white"
                      : "bg-[var(--st-bg-soft)] text-[var(--st-gray)] hover:bg-[var(--st-border)]"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}

          </div>

        </section>

        {/* BOOKINGS */}

        <section className="mt-8 min-w-0">

          <div className="mb-4">
            <p className="m-0 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--st-charcoal)]">
              All bookings
            </p>

            <p className="mt-1 mb-0 text-[10px] text-[var(--st-gray)]">
              {filteredBookings.length}{" "}
              {filteredBookings.length === 1
                ? "booking"
                : "bookings"}
            </p>
          </div>

          {loading ? (
            <div className="st-card flex min-h-[220px] items-center justify-center">
              <div className="flex items-center gap-2 text-[11px] text-[var(--st-gray)]">
                <RefreshCw
                  size={15}
                  className="animate-spin"
                />
                Loading bookings...
              </div>
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="st-card flex min-h-[300px] flex-col items-center justify-center p-8 text-center">

              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--st-bg-soft)] text-[var(--st-red)]">
                <CalendarDays size={24} />
              </div>

              <p className="mt-5 mb-0 text-[14px] font-bold text-[var(--st-charcoal-dark)]">
                No bookings found
              </p>

              <p className="mt-2 mb-0 max-w-[300px] text-[10px] leading-relaxed text-[var(--st-gray)]">
                Try another search or filter.
              </p>

            </div>
          ) : (
            <div className="space-y-4">

              {filteredBookings.map(
                (booking) => {
                  const learner =
                    booking.lead?.full_name ??
                    "Unknown learner";

                  const email =
                    booking.lead?.email ??
                    "—";

                  const whatsapp =
                    booking.lead
                      ?.whatsapp_number ?? "—";

                  const startsAt =
                    booking.slot?.starts_at;

                  const endsAt =
                    booking.slot?.ends_at;

                  return (
                    <button
                      key={booking.id}
                      type="button"
                      onClick={() =>
                        setSelectedBooking(
                          booking
                        )
                      }
                      className="st-card block w-full min-w-0 overflow-hidden p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-md sm:p-6"
                    >

                      <div className="flex min-w-0 items-start gap-4">

                        {/* INSTRUMENT */}

                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--st-bg-soft)] text-[24px]">
                          {getInstrumentIcon(
                            booking.instrument
                          )}
                        </div>

                        <div className="min-w-0 flex-1">

                          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">

                            <div className="min-w-0">

                              <p className="m-0 truncate text-[16px] font-bold text-[var(--st-charcoal-dark)]">
                                {learner}
                              </p>

                              {startsAt &&
                                endsAt && (
                                  <p className="mt-1 mb-0 text-[11px] text-[var(--st-gray)]">
                                    {formatDate(
                                      startsAt
                                    )}{" "}
                                    ·{" "}
                                    {formatTimeRange(
                                      startsAt,
                                      endsAt
                                    )}
                                  </p>
                                )}

                            </div>

                            <span
                              className={`w-fit shrink-0 rounded-full px-3 py-1.5 text-[9px] font-bold ${
                                booking.status ===
                                "confirmed"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : booking.status ===
                                      "completed"
                                    ? "bg-blue-50 text-blue-700"
                                    : booking.status ===
                                        "cancelled"
                                      ? "bg-red-50 text-red-700"
                                      : "bg-[var(--st-bg-soft)] text-[var(--st-gray)]"
                              }`}
                            >
                              {getStatusLabel(
                                booking.status
                              )}
                            </span>

                          </div>

                          <div className="mt-4 flex min-w-0 flex-col gap-2 text-[10px] text-[var(--st-gray)] sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-5 sm:gap-y-2">

                            <span className="flex min-w-0 items-center gap-2">
                              <span className="font-semibold text-[var(--st-charcoal)]">
                                {booking.instrument
                                  .charAt(0)
                                  .toUpperCase() +
                                  booking.instrument.slice(
                                    1
                                  )}
                              </span>
                            </span>

                            <span className="flex min-w-0 items-center gap-2">
                              <Phone
                                size={13}
                              />
                              <span className="truncate">
                                {whatsapp}
                              </span>
                            </span>

                            <span className="flex min-w-0 items-center gap-2">
                              <Mail
                                size={13}
                              />
                              <span className="truncate">
                                {email}
                              </span>
                            </span>

                          </div>

                        </div>

                      </div>

                    </button>
                  );
                }
              )}

            </div>
          )}

        </section>

      </div>

      {/* BOOKING DETAILS */}

      {selectedBooking && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-6"
          onClick={() =>
            setSelectedBooking(null)
          }
        >

          <div
            className="max-h-[90vh] w-full max-w-[520px] overflow-y-auto rounded-t-3xl bg-white p-6 sm:rounded-3xl sm:p-8"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="flex items-start justify-between gap-4">

              <div className="min-w-0">

                <p className="st-eyebrow">
                  BOOKING DETAILS
                </p>

                <h2 className="mt-2 truncate text-[24px] font-bold tracking-[-0.04em] text-[var(--st-charcoal-dark)]">
                  {selectedBooking.lead
                    ?.full_name ??
                    "Unknown learner"}
                </h2>

              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedBooking(null)
                }
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--st-bg-soft)] text-[var(--st-gray)]"
                aria-label="Close"
              >
                <XCircle size={20} />
              </button>

            </div>

            <div className="mt-6 rounded-2xl bg-[var(--st-bg-soft)] p-5">

              <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--st-gray)]">
                TRIAL LESSON
              </p>

              <p className="mt-2 text-[20px] font-bold text-[var(--st-charcoal-dark)]">
                {getInstrumentIcon(
                  selectedBooking.instrument
                )}{" "}
                {selectedBooking.instrument
                  .charAt(0)
                  .toUpperCase() +
                  selectedBooking.instrument.slice(
                    1
                  )}
              </p>

              {selectedBooking.slot && (
                <>
                  <p className="mt-4 flex items-center gap-2 text-[12px] font-semibold text-[var(--st-charcoal-dark)]">
                    <CalendarDays
                      size={15}
                      className="text-[var(--st-red)]"
                    />
                    {formatDate(
                      selectedBooking.slot
                        .starts_at
                    )}
                  </p>

                  <p className="mt-2 flex items-center gap-2 text-[14px] font-bold text-[var(--st-red)]">
                    <Clock3 size={15} />
                    {formatTimeRange(
                      selectedBooking.slot
                        .starts_at,
                      selectedBooking.slot
                        .ends_at
                    )}
                  </p>
                </>
              )}

            </div>

            <div className="mt-6">

              <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--st-gray)]">
                CUSTOMER
              </p>

              <div className="mt-4 space-y-4">

                <div className="flex items-start gap-3">
                  <UserRound
                    size={16}
                    className="mt-0.5 shrink-0 text-[var(--st-red)]"
                  />

                  <div className="min-w-0">
                    <p className="m-0 text-[9px] text-[var(--st-gray)]">
                      Name
                    </p>

                    <p className="mt-1 mb-0 break-words text-[12px] font-semibold text-[var(--st-charcoal-dark)]">
                      {selectedBooking.lead
                        ?.full_name ??
                        "—"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Mail
                    size={16}
                    className="mt-0.5 shrink-0 text-[var(--st-red)]"
                  />

                  <div className="min-w-0">
                    <p className="m-0 text-[9px] text-[var(--st-gray)]">
                      Email
                    </p>

                    <p className="mt-1 mb-0 break-all text-[12px] font-semibold text-[var(--st-charcoal-dark)]">
                      {selectedBooking.lead
                        ?.email ??
                        "—"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Phone
                    size={16}
                    className="mt-0.5 shrink-0 text-[var(--st-red)]"
                  />

                  <div className="min-w-0">
                    <p className="m-0 text-[9px] text-[var(--st-gray)]">
                      WhatsApp
                    </p>

                    <p className="mt-1 mb-0 text-[12px] font-semibold text-[var(--st-charcoal-dark)]">
                      {selectedBooking.lead
                        ?.whatsapp_number ??
                        "—"}
                    </p>
                  </div>
                </div>

              </div>

            </div>

            <div className="mt-6 rounded-2xl border border-[var(--st-border)] p-5">

              <div className="flex items-center justify-between gap-4">

                <p className="m-0 text-[10px] font-bold text-[var(--st-charcoal-dark)]">
                  Booking status
                </p>

                <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-[9px] font-bold text-emerald-700">
                  {getStatusLabel(
                    selectedBooking.status
                  )}
                </span>

              </div>

              <p className="mt-3 break-all text-[9px] leading-relaxed text-[var(--st-gray)]">
                Booking ID:{" "}
                {selectedBooking.id}
              </p>

            </div>

            <button
              type="button"
              onClick={() =>
                setSelectedBooking(null)
              }
              className="st-button st-button-secondary mt-6 w-full"
            >
              Close
            </button>

          </div>

        </div>
      )}

    </main>
  );
}