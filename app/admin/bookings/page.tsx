"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Mail,
  MessageCircle,
  Phone,
  RefreshCw,
  Search,
  User,
  X,
  XCircle,
} from "lucide-react";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type BookingStatus =
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no_show";

type Instrument =
  | "piano"
  | "guitar";

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
  instrument: Instrument;
  is_available: boolean;
};

type BookingRecord = {
  booking: Booking;
  lead: Lead | null;
  slot: LessonSlot | null;
};

const NAIROBI_TIME_ZONE =
  "Africa/Nairobi";

function getNairobiDateKey(
  date: Date
) {
  return new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: NAIROBI_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }
  ).format(date);
}

function getNairobiStartOfToday() {
  const today =
    getNairobiDateKey(new Date());

  return new Date(
    `${today}T00:00:00+03:00`
  );
}

function getNairobiEndOfToday() {
  const today =
    getNairobiDateKey(new Date());

  const date = new Date(
    `${today}T00:00:00+03:00`
  );

  date.setDate(
    date.getDate() + 1
  );

  return date;
}

function formatDate(
  dateString: string
) {
  return new Intl.DateTimeFormat(
    "en-KE",
    {
      timeZone: NAIROBI_TIME_ZONE,
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    }
  ).format(new Date(dateString));
}

function formatLongDate(
  dateString: string
) {
  return new Intl.DateTimeFormat(
    "en-KE",
    {
      timeZone: NAIROBI_TIME_ZONE,
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }
  ).format(new Date(dateString));
}

function formatTime(
  dateString: string
) {
  return new Intl.DateTimeFormat(
    "en-KE",
    {
      timeZone: NAIROBI_TIME_ZONE,
      hour: "numeric",
      minute: "2-digit",
    }
  ).format(new Date(dateString));
}

function formatTimeRange(
  startsAt: string,
  endsAt: string
) {
  return `${formatTime(
    startsAt
  )} – ${formatTime(endsAt)}`;
}

function initials(
  name: string
) {
  return name
    .trim()
    .split(/\s+/)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function prettyStatus(
  status: BookingStatus
) {
  switch (status) {
    case "confirmed":
      return "Confirmed";

    case "completed":
      return "Completed";

    case "cancelled":
      return "Cancelled";

    case "no_show":
      return "No-show";

    default:
      return status;
  }
}

function statusClasses(
  status: BookingStatus
) {
  switch (status) {
    case "confirmed":
      return "bg-green-50 text-green-700";

    case "completed":
      return "bg-blue-50 text-blue-700";

    case "cancelled":
      return "bg-red-50 text-red-700";

    case "no_show":
      return "bg-amber-50 text-amber-700";

    default:
      return "bg-gray-50 text-gray-700";
  }
}

function statusIcon(
  status: BookingStatus
) {
  switch (status) {
    case "confirmed":
      return <CheckCircle2 size={12} />;

    case "completed":
      return <Check size={12} />;

    case "cancelled":
      return <XCircle size={12} />;

    case "no_show":
      return <Clock3 size={12} />;

    default:
      return null;
  }
}

export default function AdminBookingsPage() {
  const router = useRouter();

  const [records, setRecords] =
    useState<BookingRecord[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [filter, setFilter] =
    useState<
      "all" |
      "confirmed" |
      "completed" |
      "cancelled" |
      "no_show"
    >("all");

  const [selectedBooking, setSelectedBooking] =
    useState<BookingRecord | null>(
      null
    );

  const [updatingId, setUpdatingId] =
    useState<string | null>(null);

  const [showStatusMenu, setShowStatusMenu] =
    useState(false);

  /*
   * ---------------------------------------------------------
   * LOAD BOOKINGS
   * ---------------------------------------------------------
   */

  async function loadBookings(
    silent = false
  ) {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    /*
     * Load bookings.
     */

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
      console.error(
        "Booking load error:",
        bookingError
      );

      setError(
        "We couldn't load bookings. Please try again."
      );

      setLoading(false);
      setRefreshing(false);

      return;
    }

    const bookings =
      (bookingData ?? []) as Booking[];

    if (bookings.length === 0) {
      setRecords([]);

      setLoading(false);
      setRefreshing(false);

      return;
    }

    /*
     * Load related leads.
     */

    const leadIds = Array.from(
      new Set(
        bookings.map(
          (booking) =>
            booking.lead_id
        )
      )
    );

    const slotIds = Array.from(
      new Set(
        bookings.map(
          (booking) =>
            booking.slot_id
        )
      )
    );

    const [
      leadsResult,
      slotsResult,
    ] = await Promise.all([
      supabase
        .from("leads")
        .select(
          `
            id,
            full_name,
            email,
            whatsapp_number
          `
        )
        .in("id", leadIds),

      supabase
        .from("lesson_slots")
        .select(
          `
            id,
            starts_at,
            ends_at,
            instrument,
            is_available
          `
        )
        .in("id", slotIds),
    ]);

    if (leadsResult.error) {
      console.error(
        "Lead load error:",
        leadsResult.error
      );
    }

    if (slotsResult.error) {
      console.error(
        "Slot load error:",
        slotsResult.error
      );
    }

    const leads =
      (leadsResult.data ??
        []) as Lead[];

    const slots =
      (slotsResult.data ??
        []) as LessonSlot[];

    const leadMap = new Map<
      string,
      Lead
    >();

    leads.forEach((lead) => {
      leadMap.set(
        lead.id,
        lead
      );
    });

    const slotMap = new Map<
      string,
      LessonSlot
    >();

    slots.forEach((slot) => {
      slotMap.set(
        slot.id,
        slot
      );
    });

    const loadedRecords =
      bookings.map((booking) => ({
        booking,
        lead:
          leadMap.get(
            booking.lead_id
          ) ?? null,
        slot:
          slotMap.get(
            booking.slot_id
          ) ?? null,
      }));

    setRecords(loadedRecords);

    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => {
    loadBookings();
  }, []);

  /*
   * ---------------------------------------------------------
   * FILTERING
   * ---------------------------------------------------------
   */

  const filteredRecords =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return records.filter(
        (record) => {
          const booking =
            record.booking;

          const lead =
            record.lead;

          const slot =
            record.slot;

          if (
            filter !== "all" &&
            booking.status !== filter
          ) {
            return false;
          }

          if (!query) {
            return true;
          }

          const searchable = [
            lead?.full_name ?? "",
            lead?.email ?? "",
            lead?.whatsapp_number ??
              "",
            booking.instrument,
            booking.status,
            slot
              ? formatDate(
                  slot.starts_at
                )
              : "",
          ]
            .join(" ")
            .toLowerCase();

          return searchable.includes(
            query
          );
        }
      );
    }, [records, search, filter]);

  /*
   * ---------------------------------------------------------
   * LIVE STATS
   * ---------------------------------------------------------
   */

  const stats = useMemo(() => {
    const todayStart =
      getNairobiStartOfToday();

    const todayEnd =
      getNairobiEndOfToday();

    const todayStartMs =
      todayStart.getTime();

    const todayEndMs =
      todayEnd.getTime();

    const todayTrials =
      records.filter((record) => {
        if (!record.slot) {
          return false;
        }

        const time =
          new Date(
            record.slot.starts_at
          ).getTime();

        return (
          time >= todayStartMs &&
          time < todayEndMs
        );
      }).length;

    const confirmed =
      records.filter(
        (record) =>
          record.booking.status ===
          "confirmed"
      ).length;

    const completed =
      records.filter(
        (record) =>
          record.booking.status ===
          "completed"
      ).length;

    const upcoming =
      records.filter((record) => {
        if (!record.slot) {
          return false;
        }

        if (
          record.booking.status ===
            "cancelled" ||
          record.booking.status ===
            "no_show"
        ) {
          return false;
        }

        return (
          new Date(
            record.slot.starts_at
          ).getTime() >
          Date.now()
        );
      }).length;

    return {
      todayTrials,
      confirmed,
      completed,
      upcoming,
    };
  }, [records]);

  /*
   * ---------------------------------------------------------
   * UPDATE STATUS
   * ---------------------------------------------------------
   */

  async function updateStatus(
    record: BookingRecord,
    newStatus: BookingStatus
  ) {
    const booking =
      record.booking;

    setUpdatingId(booking.id);
    setError("");

    const updates: Record<
      string,
      string | null
    > = {
      status: newStatus,
    };

    if (
      newStatus === "completed"
    ) {
      updates.completed_at =
        new Date().toISOString();

      updates.attended_at =
        new Date().toISOString();

      updates.cancelled_at = null;
    }

    if (
      newStatus === "cancelled"
    ) {
      updates.cancelled_at =
        new Date().toISOString();

      updates.completed_at = null;
      updates.attended_at = null;
    }

    if (
      newStatus === "confirmed"
    ) {
      updates.cancelled_at = null;
      updates.completed_at = null;
    }

    if (
      newStatus === "no_show"
    ) {
      updates.completed_at = null;
      updates.cancelled_at = null;
    }

    const {
      data,
      error: updateError,
    } = await supabase
      .from("bookings")
      .update(updates)
      .eq("id", booking.id)
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
      .single();

    if (updateError) {
      console.error(
        "Status update error:",
        updateError
      );

      setError(
        "We couldn't update this booking."
      );

      setUpdatingId(null);

      return;
    }

    const updatedBooking =
      data as Booking;

    const updatedRecord: BookingRecord =
      {
        ...record,
        booking:
          updatedBooking,
      };

    setRecords((current) =>
      current.map((item) =>
        item.booking.id ===
        booking.id
          ? updatedRecord
          : item
      )
    );

    if (
      selectedBooking?.booking.id ===
      booking.id
    ) {
      setSelectedBooking(
        updatedRecord
      );
    }

    setShowStatusMenu(false);
    setUpdatingId(null);
  }

  /*
   * ---------------------------------------------------------
   * NAVIGATION
   * ---------------------------------------------------------
   */

  function openCalendar(
    record: BookingRecord
  ) {
    if (!record.slot) {
      return;
    }

    const dateKey =
      getNairobiDateKey(
        new Date(
          record.slot.starts_at
        )
      );

    router.push(
      `/admin/calendar?date=${dateKey}`
    );
  }

  function openWhatsApp(
    record: BookingRecord
  ) {
    const phone =
      record.lead?.whatsapp_number;

    if (!phone) {
      return;
    }

    const cleanPhone =
      phone.replace(
        /[^0-9+]/g,
        ""
      );

    const message =
      record.slot
        ? `Hello ${record.lead?.full_name}, this is Sauti Tamu Piano Center regarding your ${record.booking.instrument} trial lesson on ${formatLongDate(
            record.slot.starts_at
          )} at ${formatTime(
            record.slot.starts_at
          )}.`
        : `Hello ${record.lead?.full_name}, this is Sauti Tamu Piano Center regarding your trial lesson.`;

    window.open(
      `https://wa.me/${cleanPhone.replace(
        "+",
        ""
      )}?text=${encodeURIComponent(
        message
      )}`,
      "_blank"
    );
  }

  function callLearner(
    record: BookingRecord
  ) {
    if (!record.lead?.whatsapp_number) {
      return;
    }

    window.location.href = `tel:${record.lead.whatsapp_number}`;
  }

  /*
   * ---------------------------------------------------------
   * RENDER
   * ---------------------------------------------------------
   */

  return (
    <main className="st-content">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="mb-7 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">

        <div>
          <p className="st-eyebrow">
            BOOKINGS
          </p>

          <h1 className="st-page-title mt-2">
            Trial bookings
          </h1>

          <p className="st-page-description">
            Manage your trial learners, lesson times
            and booking status from one place.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            loadBookings(true)
          }
          className="st-button st-button-secondary w-full md:w-auto"
        >
          <RefreshCw
            size={15}
            className={
              refreshing
                ? "animate-spin"
                : ""
            }
          />
          Refresh
        </button>

      </div>

      {/* =====================================================
          STATS
      ===================================================== */}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">

        <div className="st-card p-5">
          <div className="flex items-center justify-between gap-3">

            <div>
              <p className="m-0 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                Today&apos;s trials
              </p>

              <p className="mt-3 mb-0 text-[30px] font-bold leading-none text-[var(--st-charcoal-dark)]">
                {stats.todayTrials}
              </p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--st-bg-soft)] text-[var(--st-red)]">
              <CalendarDays size={18} />
            </div>

          </div>
        </div>

        <div className="st-card p-5">
          <div className="flex items-center justify-between gap-3">

            <div>
              <p className="m-0 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                Confirmed
              </p>

              <p className="mt-3 mb-0 text-[30px] font-bold leading-none text-[var(--st-charcoal-dark)]">
                {stats.confirmed}
              </p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-50 text-green-700">
              <CheckCircle2 size={18} />
            </div>

          </div>
        </div>

        <div className="st-card p-5">
          <div className="flex items-center justify-between gap-3">

            <div>
              <p className="m-0 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                Completed
              </p>

              <p className="mt-3 mb-0 text-[30px] font-bold leading-none text-[var(--st-charcoal-dark)]">
                {stats.completed}
              </p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-700">
              <Check size={18} />
            </div>

          </div>
        </div>

        <div className="st-card p-5">
          <div className="flex items-center justify-between gap-3">

            <div>
              <p className="m-0 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                Upcoming
              </p>

              <p className="mt-3 mb-0 text-[30px] font-bold leading-none text-[var(--st-charcoal-dark)]">
                {stats.upcoming}
              </p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--st-bg-soft)] text-[var(--st-red)]">
              <Clock3 size={18} />
            </div>

          </div>
        </div>

      </section>

      {/* =====================================================
          SEARCH + FILTERS
      ===================================================== */}

      <section className="st-card mt-5 p-4">

        <div className="relative">

          <Search
            size={17}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--st-gray)]"
          />

          <input
            type="search"
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            placeholder="Search learner, email, WhatsApp or instrument"
            className="w-full rounded-xl border border-[var(--st-border)] bg-white py-3.5 pl-11 pr-4 text-[12px] outline-none transition focus:border-[var(--st-red)] focus:ring-2 focus:ring-[var(--st-red)]/10"
          />

        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">

          {[
            {
              key: "all",
              label: "All",
            },
            {
              key: "confirmed",
              label: "Confirmed",
            },
            {
              key: "completed",
              label: "Completed",
            },
            {
              key: "cancelled",
              label: "Cancelled",
            },
            {
              key: "no_show",
              label: "No-show",
            },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() =>
                setFilter(
                  item.key as typeof filter
                )
              }
              className={`rounded-xl px-3 py-3 text-[10px] font-bold transition ${
                filter === item.key
                  ? "bg-[var(--st-red)] text-white"
                  : "bg-[var(--st-bg-soft)] text-[var(--st-gray)] hover:text-[var(--st-charcoal-dark)]"
              }`}
            >
              {item.label}
            </button>
          ))}

        </div>

      </section>

      {/* =====================================================
          ERROR
      ===================================================== */}

      {error && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <p className="m-0 text-[10px] leading-relaxed text-red-700">
            {error}
          </p>
        </div>
      )}

      {/* =====================================================
          RESULTS
      ===================================================== */}

      <section className="mt-7">

        <div className="mb-4">

          <p className="st-eyebrow">
            {filter === "all"
              ? "ALL BOOKINGS"
              : `${prettyStatus(
                  filter
                ).toUpperCase()} BOOKINGS`}
          </p>

          <p className="mt-1 mb-0 text-[10px] text-[var(--st-gray)]">
            {filteredRecords.length}{" "}
            {filteredRecords.length ===
            1
              ? "booking"
              : "bookings"}
          </p>

        </div>

        {loading ? (
          <div className="st-card flex min-h-[260px] items-center justify-center gap-2 text-[10px] text-[var(--st-gray)]">
            <RefreshCw
              size={16}
              className="animate-spin"
            />
            Loading bookings...
          </div>
        ) : filteredRecords.length ===
          0 ? (
          <div className="st-card flex min-h-[300px] flex-col items-center justify-center px-5 text-center">

            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--st-bg-soft)] text-[var(--st-red)]">
              <CalendarDays size={22} />
            </div>

            <p className="mt-5 mb-0 text-[14px] font-bold text-[var(--st-charcoal-dark)]">
              No bookings found
            </p>

            <p className="mt-2 mb-0 max-w-[280px] text-[10px] leading-relaxed text-[var(--st-gray)]">
              Try another search or filter.
            </p>

          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">

            {filteredRecords.map(
              (record) => {
                const booking =
                  record.booking;

                const lead =
                  record.lead;

                const slot =
                  record.slot;

                return (
                  <button
                    key={booking.id}
                    type="button"
                    onClick={() =>
                      setSelectedBooking(
                        record
                      )
                    }
                    className="st-card group w-full overflow-hidden p-0 text-left transition-all hover:border-[var(--st-red)]"
                  >

                    <div className="p-5">

                      <div className="flex items-start gap-4">

                        {/* AVATAR */}

                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--st-bg-soft)] text-[10px] font-bold text-[var(--st-red)]">
                          {lead
                            ? initials(
                                lead.full_name
                              )
                            : "BK"}
                        </div>

                        {/* MAIN */}

                        <div className="min-w-0 flex-1">

                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">

                            <div className="min-w-0">

                              <p className="m-0 truncate text-[14px] font-bold text-[var(--st-charcoal-dark)]">
                                {lead?.full_name ??
                                  "Unknown learner"}
                              </p>

                              {slot ? (
                                <p className="mt-1 mb-0 text-[10px] text-[var(--st-gray)]">
                                  {formatDate(
                                    slot.starts_at
                                  )}{" "}
                                  ·{" "}
                                  {formatTimeRange(
                                    slot.starts_at,
                                    slot.ends_at
                                  )}
                                </p>
                              ) : (
                                <p className="mt-1 mb-0 text-[10px] text-red-600">
                                  Lesson slot unavailable
                                </p>
                              )}

                            </div>

                            <span
                              className={`inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.04em] ${statusClasses(
                                booking.status
                              )}`}
                            >
                              {statusIcon(
                                booking.status
                              )}

                              {prettyStatus(
                                booking.status
                              )}
                            </span>

                          </div>

                          {/* DETAILS */}

                          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">

                            <div className="flex min-w-0 items-center gap-2">

                              <span className="text-[var(--st-red)]">
                                <User size={13} />
                              </span>

                              <span className="truncate text-[10px] text-[var(--st-gray)]">
                                {booking.instrument
                                  .charAt(
                                    0
                                  )
                                  .toUpperCase() +
                                  booking.instrument.slice(
                                    1
                                  )}
                              </span>

                            </div>

                            {lead?.whatsapp_number && (
                              <div className="flex min-w-0 items-center gap-2">

                                <span className="text-[var(--st-red)]">
                                  <Phone size={13} />
                                </span>

                                <span className="truncate text-[10px] text-[var(--st-gray)]">
                                  {
                                    lead.whatsapp_number
                                  }
                                </span>

                              </div>
                            )}

                            {lead?.email && (
                              <div className="flex min-w-0 items-center gap-2">

                                <span className="text-[var(--st-red)]">
                                  <Mail size={13} />
                                </span>

                                <span className="truncate text-[10px] text-[var(--st-gray)]">
                                  {
                                    lead.email
                                  }
                                </span>

                              </div>
                            )}

                          </div>

                        </div>

                        <ArrowRight
                          size={16}
                          className="mt-2 shrink-0 text-[var(--st-gray)] transition-transform group-hover:translate-x-1"
                        />

                      </div>

                    </div>

                  </button>
                );
              }
            )}

          </div>
        )}

      </section>

      {/* =====================================================
          BOOKING DETAILS DRAWER
      ===================================================== */}

      {selectedBooking && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 sm:items-center sm:p-5">

          <div className="max-h-[92vh] w-full max-w-[560px] overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">

            {/* DRAWER HEADER */}

            <div className="sticky top-0 z-10 border-b border-[var(--st-border)] bg-white px-5 py-4">

              <div className="flex items-center justify-between gap-4">

                <div className="flex min-w-0 items-center gap-3">

                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--st-bg-soft)] text-[10px] font-bold text-[var(--st-red)]">
                    {selectedBooking.lead
                      ? initials(
                          selectedBooking.lead
                            .full_name
                        )
                      : "BK"}
                  </div>

                  <div className="min-w-0">

                    <p className="m-0 truncate text-[14px] font-bold text-[var(--st-charcoal-dark)]">
                      {selectedBooking.lead
                        ?.full_name ??
                        "Unknown learner"}
                    </p>

                    <p className="mt-1 mb-0 text-[9px] text-[var(--st-gray)]">
                      Trial booking
                    </p>

                  </div>

                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedBooking(
                      null
                    );
                    setShowStatusMenu(
                      false
                    );
                  }}
                  className="st-icon-button"
                  aria-label="Close"
                >
                  <X size={17} />
                </button>

              </div>

            </div>

            <div className="p-5">

              {/* LESSON */}

              <div className="rounded-2xl bg-[var(--st-bg-soft)] p-5">

                <p className="m-0 text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--st-gray)]">
                  TRIAL LESSON
                </p>

                <p className="mt-2 mb-0 text-[22px] font-bold capitalize text-[var(--st-charcoal-dark)]">
                  {
                    selectedBooking
                      .booking.instrument
                  }
                </p>

                {selectedBooking.slot && (
                  <>
                    <p className="mt-4 mb-0 text-[12px] font-semibold text-[var(--st-charcoal-dark)]">
                      {formatLongDate(
                        selectedBooking
                          .slot
                          .starts_at
                      )}
                    </p>

                    <p className="mt-1 mb-0 text-[22px] font-bold text-[var(--st-red)]">
                      {formatTimeRange(
                        selectedBooking
                          .slot
                          .starts_at,
                        selectedBooking
                          .slot
                          .ends_at
                      )}
                    </p>

                    <p className="mt-1 mb-0 text-[9px] text-[var(--st-gray)]">
                      60-minute free trial
                      lesson
                    </p>
                  </>
                )}

              </div>

              {/* STATUS */}

              <div className="mt-5">

                <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--st-gray)]">
                  BOOKING STATUS
                </p>

                <div className="relative">

                  <button
                    type="button"
                    onClick={() =>
                      setShowStatusMenu(
                        (value) =>
                          !value
                      )
                    }
                    disabled={
                      updatingId ===
                      selectedBooking
                        .booking.id
                    }
                    className={`flex w-full items-center justify-between rounded-xl border border-[var(--st-border)] px-4 py-3 text-left ${
                      updatingId ===
                      selectedBooking
                        .booking.id
                        ? "opacity-60"
                        : ""
                    }`}
                  >

                    <span
                      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[9px] font-bold uppercase ${statusClasses(
                        selectedBooking
                          .booking
                          .status
                      )}`}
                    >
                      {statusIcon(
                        selectedBooking
                          .booking
                          .status
                      )}

                      {prettyStatus(
                        selectedBooking
                          .booking
                          .status
                      )}
                    </span>

                    <ChevronDown
                      size={15}
                      className="text-[var(--st-gray)]"
                    />

                  </button>

                  {showStatusMenu && (
                    <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-xl border border-[var(--st-border)] bg-white p-1 shadow-xl">

                      {(
                        [
                          "confirmed",
                          "completed",
                          "cancelled",
                          "no_show",
                        ] as BookingStatus[]
                      ).map(
                        (status) => (
                          <button
                            key={status}
                            type="button"
                            onClick={() =>
                              updateStatus(
                                selectedBooking,
                                status
                              )
                            }
                            className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-[10px] font-bold hover:bg-[var(--st-bg-soft)] ${
                              selectedBooking
                                .booking
                                .status ===
                              status
                                ? "bg-[var(--st-bg-soft)]"
                                : ""
                            }`}
                          >
                            {statusIcon(
                              status
                            )}

                            {prettyStatus(
                              status
                            )}
                          </button>
                        )
                      )}

                    </div>
                  )}

                </div>

              </div>

              {/* CUSTOMER */}

              <div className="mt-6">

                <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--st-gray)]">
                  CUSTOMER DETAILS
                </p>

                <div className="space-y-3">

                  <div className="flex items-start gap-3">

                    <User
                      size={15}
                      className="mt-0.5 shrink-0 text-[var(--st-red)]"
                    />

                    <div className="min-w-0">

                      <p className="m-0 text-[9px] text-[var(--st-gray)]">
                        Full name
                      </p>

                      <p className="mt-1 mb-0 break-words text-[11px] font-semibold text-[var(--st-charcoal-dark)]">
                        {selectedBooking
                          .lead
                          ?.full_name ??
                          "Not available"}
                      </p>

                    </div>

                  </div>

                  <div className="flex items-start gap-3">

                    <Mail
                      size={15}
                      className="mt-0.5 shrink-0 text-[var(--st-red)]"
                    />

                    <div className="min-w-0">

                      <p className="m-0 text-[9px] text-[var(--st-gray)]">
                        Email
                      </p>

                      <p className="mt-1 mb-0 break-all text-[11px] font-semibold text-[var(--st-charcoal-dark)]">
                        {selectedBooking
                          .lead
                          ?.email ??
                          "Not available"}
                      </p>

                    </div>

                  </div>

                  <div className="flex items-start gap-3">

                    <Phone
                      size={15}
                      className="mt-0.5 shrink-0 text-[var(--st-red)]"
                    />

                    <div className="min-w-0">

                      <p className="m-0 text-[9px] text-[var(--st-gray)]">
                        WhatsApp
                      </p>

                      <p className="mt-1 mb-0 text-[11px] font-semibold text-[var(--st-charcoal-dark)]">
                        {selectedBooking
                          .lead
                          ?.whatsapp_number ??
                          "Not available"}
                      </p>

                    </div>

                  </div>

                </div>

              </div>

              {/* EMAIL STATUS */}

              <div className="mt-6">

                <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--st-gray)]">
                  EMAIL & REMINDERS
                </p>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">

                  <div className="rounded-xl border border-[var(--st-border)] p-3">

                    <p className="m-0 text-[9px] font-bold text-[var(--st-charcoal-dark)]">
                      Confirmation
                    </p>

                    <p
                      className={`mt-1 mb-0 text-[9px] ${
                        selectedBooking
                          .booking
                          .confirmation_sent_at
                          ? "text-green-700"
                          : "text-[var(--st-gray)]"
                      }`}
                    >
                      {selectedBooking
                        .booking
                        .confirmation_sent_at
                        ? "Sent"
                        : "Not sent"}
                    </p>

                  </div>

                  <div className="rounded-xl border border-[var(--st-border)] p-3">

                    <p className="m-0 text-[9px] font-bold text-[var(--st-charcoal-dark)]">
                      24h reminder
                    </p>

                    <p
                      className={`mt-1 mb-0 text-[9px] ${
                        selectedBooking
                          .booking
                          .reminder_24h_sent_at
                          ? "text-green-700"
                          : "text-[var(--st-gray)]"
                      }`}
                    >
                      {selectedBooking
                        .booking
                        .reminder_24h_sent_at
                        ? "Sent"
                        : "Pending"}
                    </p>

                  </div>

                  <div className="rounded-xl border border-[var(--st-border)] p-3">

                    <p className="m-0 text-[9px] font-bold text-[var(--st-charcoal-dark)]">
                      2h reminder
                    </p>

                    <p
                      className={`mt-1 mb-0 text-[9px] ${
                        selectedBooking
                          .booking
                          .reminder_2h_sent_at
                          ? "text-green-700"
                          : "text-[var(--st-gray)]"
                      }`}
                    >
                      {selectedBooking
                        .booking
                        .reminder_2h_sent_at
                        ? "Sent"
                        : "Pending"}
                    </p>

                  </div>

                </div>

              </div>

              {/* ACTIONS */}

              <div className="mt-6 grid grid-cols-2 gap-2">

                <button
                  type="button"
                  onClick={() =>
                    openWhatsApp(
                      selectedBooking
                    )
                  }
                  disabled={
                    !selectedBooking
                      .lead
                      ?.whatsapp_number
                  }
                  className="st-button st-button-secondary w-full disabled:opacity-40"
                >
                  <MessageCircle
                    size={15}
                  />
                  WhatsApp
                </button>

                <button
                  type="button"
                  onClick={() =>
                    callLearner(
                      selectedBooking
                    )
                  }
                  disabled={
                    !selectedBooking
                      .lead
                      ?.whatsapp_number
                  }
                  className="st-button st-button-secondary w-full disabled:opacity-40"
                >
                  <Phone size={15} />
                  Call
                </button>

                <button
                  type="button"
                  onClick={() =>
                    openCalendar(
                      selectedBooking
                    )
                  }
                  disabled={
                    !selectedBooking
                      .slot
                  }
                  className="st-button st-button-secondary w-full disabled:opacity-40"
                >
                  <CalendarDays
                    size={15}
                  />
                  Open calendar
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setSelectedBooking(
                      null
                    )
                  }
                  className="st-button st-button-primary w-full"
                >
                  Done
                  <ArrowRight
                    size={15}
                  />
                </button>

              </div>

              {/* BOOKING ID */}

              <div className="mt-6 border-t border-[var(--st-border)] pt-4">

                <p className="m-0 text-[9px] text-[var(--st-gray)]">
                  Booking ID
                </p>

                <p className="mt-1 mb-0 break-all font-mono text-[8px] text-[var(--st-gray)]">
                  {
                    selectedBooking
                      .booking.id
                  }
                </p>

              </div>

            </div>

          </div>

        </div>
      )}

    </main>
  );
}