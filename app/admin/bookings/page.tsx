"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Loader2,
  Mail,
  MessageCircle,
  Phone,
  Search,
  User,
  XCircle,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

type BookingStatus =
  | "confirmed"
  | "cancelled"
  | "completed"
  | "no_show";

type Instrument = "piano" | "guitar";

type Booking = {
  id: string;
  status: BookingStatus;
  instrument: Instrument;
  created_at: string;
  confirmation_sent_at: string | null;
  reminder_24h_sent_at: string | null;
  reminder_2h_sent_at: string | null;
  attended_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  lead: {
    id: string;
    full_name: string;
    email: string;
    whatsapp_number: string;
    status: string;
  } | null;
  slot: {
    id: string;
    starts_at: string;
    ends_at: string;
    is_available: boolean;
  } | null;
};

type Filter = "all" | "confirmed" | "completed" | "cancelled" | "no_show";

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat("en-KE", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(dateString));
}

function formatTimeRange(start: string, end: string) {
  const formatter = new Intl.DateTimeFormat("en-KE", {
    hour: "numeric",
    minute: "2-digit",
  });

  return `${formatter.format(new Date(start))} – ${formatter.format(
    new Date(end)
  )}`;
}

function isToday(dateString: string) {
  const date = new Date(dateString);
  const today = new Date();

  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

function statusLabel(status: BookingStatus) {
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

function statusClass(status: BookingStatus) {
  switch (status) {
    case "confirmed":
      return "bg-emerald-50 text-emerald-700";
    case "completed":
      return "bg-blue-50 text-blue-700";
    case "cancelled":
      return "bg-red-50 text-red-700";
    case "no_show":
      return "bg-amber-50 text-amber-700";
    default:
      return "bg-gray-50 text-gray-600";
  }
}

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  const [selectedBooking, setSelectedBooking] =
    useState<Booking | null>(null);

  const [error, setError] = useState("");

  useEffect(() => {
    loadBookings();
  }, []);

  async function loadBookings() {
    setLoading(true);
    setError("");

    /*
     * We fetch bookings first.
     * Then we fetch their related leads and slots separately.
     *
     * This keeps the page compatible with the existing
     * Supabase schema without depending on relationship
     * names being exposed in the generated API.
     */

    const { data: bookingRows, error: bookingError } =
      await supabase
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
            created_at
          `
        )
        .order("created_at", {
          ascending: false,
        });

    if (bookingError) {
      console.error(bookingError);
      setError("We couldn't load bookings.");
      setLoading(false);
      return;
    }

    if (!bookingRows || bookingRows.length === 0) {
      setBookings([]);
      setLoading(false);
      return;
    }

    const leadIds = [
      ...new Set(
        bookingRows
          .map((booking) => booking.lead_id)
          .filter(Boolean)
      ),
    ];

    const slotIds = [
      ...new Set(
        bookingRows
          .map((booking) => booking.slot_id)
          .filter(Boolean)
      ),
    ];

    const [
      { data: leads, error: leadsError },
      { data: slots, error: slotsError },
    ] = await Promise.all([
      supabase
        .from("leads")
        .select(
          `
            id,
            full_name,
            email,
            whatsapp_number,
            status
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
            is_available
          `
        )
        .in("id", slotIds),
    ]);

    if (leadsError) {
      console.error(leadsError);
    }

    if (slotsError) {
      console.error(slotsError);
    }

    const leadMap = new Map(
      (leads ?? []).map((lead) => [
        lead.id,
        lead,
      ])
    );

    const slotMap = new Map(
      (slots ?? []).map((slot) => [
        slot.id,
        slot,
      ])
    );

    const hydratedBookings: Booking[] =
      bookingRows.map((booking) => ({
        id: booking.id,
        status: booking.status as BookingStatus,
        instrument: booking.instrument as Instrument,
        created_at: booking.created_at,
        confirmation_sent_at:
          booking.confirmation_sent_at,
        reminder_24h_sent_at:
          booking.reminder_24h_sent_at,
        reminder_2h_sent_at:
          booking.reminder_2h_sent_at,
        attended_at: booking.attended_at,
        completed_at: booking.completed_at,
        cancelled_at: booking.cancelled_at,
        lead:
          leadMap.get(booking.lead_id) ?? null,
        slot:
          slotMap.get(booking.slot_id) ?? null,
      }));

    setBookings(hydratedBookings);
    setLoading(false);
  }

  async function updateBookingStatus(
    booking: Booking,
    status: BookingStatus
  ) {
    setUpdating(booking.id);
    setError("");

    const updates: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === "completed") {
      updates.completed_at =
        new Date().toISOString();
    }

    if (status === "cancelled") {
      updates.cancelled_at =
        new Date().toISOString();
    }

    if (status === "confirmed") {
      updates.cancelled_at = null;
      updates.completed_at = null;
    }

    const { error: updateError } =
      await supabase
        .from("bookings")
        .update(updates)
        .eq("id", booking.id);

    if (updateError) {
      console.error(updateError);
      setError(
        "We couldn't update this booking."
      );
      setUpdating(null);
      return;
    }

    /*
     * When a booking is cancelled we make the slot
     * available again.
     *
     * When it is confirmed/completed/no-show we keep
     * the slot unavailable.
     */

    if (booking.slot?.id) {
      await supabase
        .from("lesson_slots")
        .update({
          is_available:
            status === "cancelled",
        })
        .eq("id", booking.slot.id);
    }

    setSelectedBooking(null);
    setUpdating(null);

    await loadBookings();
  }

  const todayBookings = useMemo(() => {
    return bookings.filter(
      (booking) =>
        booking.slot &&
        isToday(booking.slot.starts_at)
    );
  }, [bookings]);

  const upcomingBookings = useMemo(() => {
    const now = new Date();

    return bookings.filter(
      (booking) =>
        booking.slot &&
        new Date(booking.slot.starts_at) >= now &&
        booking.status === "confirmed"
    );
  }, [bookings]);

  const completedCount = bookings.filter(
    (booking) => booking.status === "completed"
  ).length;

  const confirmedCount = bookings.filter(
    (booking) => booking.status === "confirmed"
  ).length;

  const filteredBookings = useMemo(() => {
    const query = search.trim().toLowerCase();

    return bookings.filter((booking) => {
      const matchesFilter =
        filter === "all" ||
        booking.status === filter;

      if (!matchesFilter) return false;

      if (!query) return true;

      return (
        booking.lead?.full_name
          ?.toLowerCase()
          .includes(query) ||
        booking.lead?.email
          ?.toLowerCase()
          .includes(query) ||
        booking.lead?.whatsapp_number
          ?.toLowerCase()
          .includes(query) ||
        booking.instrument
          ?.toLowerCase()
          .includes(query)
      );
    });
  }, [bookings, filter, search]);

  return (
    <main className="min-h-full bg-[var(--st-bg)] px-5 py-7 sm:px-8 sm:py-9">

      <div className="mx-auto max-w-[1200px]">

        {/* PAGE HEADER */}

        <div className="mb-7">

          <p className="st-eyebrow">
            BOOKINGS
          </p>

          <div className="mt-1 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">

            <div>
              <h1 className="text-[30px] font-bold tracking-[-0.05em] text-[var(--st-charcoal-dark)] sm:text-[38px]">
                Trial bookings
              </h1>

              <p className="mt-2 max-w-[520px] text-[11px] leading-relaxed text-[var(--st-gray)]">
                Manage your trial learners, lesson
                times and booking status from one place.
              </p>
            </div>

            <button
              type="button"
              onClick={loadBookings}
              className="st-button st-button-secondary self-start"
            >
              Refresh
            </button>

          </div>

        </div>

        {/* SUMMARY */}

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">

          <SummaryCard
            label="Today's trials"
            value={todayBookings.length}
            icon={<CalendarDays size={17} />}
          />

          <SummaryCard
            label="Confirmed"
            value={confirmedCount}
            icon={<Clock3 size={17} />}
          />

          <SummaryCard
            label="Completed"
            value={completedCount}
            icon={<CheckCircle2 size={17} />}
          />

          <SummaryCard
            label="Upcoming"
            value={upcomingBookings.length}
            icon={<CalendarDays size={17} />}
          />

        </div>

        {/* SEARCH + FILTERS */}

        <div className="mt-7 st-card p-4">

          <div className="relative">

            <Search
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--st-gray)]"
            />

            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search learner, email, WhatsApp or instrument..."
              className="w-full rounded-xl border border-[var(--st-border)] bg-white py-3 pl-11 pr-4 text-[11px] outline-none focus:border-[var(--st-red)] focus:ring-2 focus:ring-[var(--st-red)]/10"
            />

          </div>

          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">

            {(
              [
                ["all", "All"],
                ["confirmed", "Confirmed"],
                ["completed", "Completed"],
                ["cancelled", "Cancelled"],
                ["no_show", "No-show"],
              ] as [Filter, string][]
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-[9px] font-bold transition ${
                  filter === value
                    ? "bg-[var(--st-red)] text-white"
                    : "bg-[var(--st-bg-soft)] text-[var(--st-gray)]"
                }`}
              >
                {label}
              </button>
            ))}

          </div>

        </div>

        {/* ERROR */}

        {error && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <p className="m-0 text-[10px] text-red-700">
              {error}
            </p>
          </div>
        )}

        {/* BOOKINGS */}

        <section className="mt-7">

          <div className="mb-3 flex items-center justify-between">

            <div>
              <p className="m-0 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--st-gray)]">
                ALL BOOKINGS
              </p>

              <p className="mt-1 mb-0 text-[10px] text-[var(--st-gray)]">
                {filteredBookings.length} booking
                {filteredBookings.length === 1
                  ? ""
                  : "s"}
              </p>
            </div>

          </div>

          {loading ? (
            <div className="st-card flex min-h-[220px] items-center justify-center gap-2 text-[11px] text-[var(--st-gray)]">
              <Loader2
                size={16}
                className="animate-spin"
              />
              Loading bookings...
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="st-card p-10 text-center">

              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--st-bg-soft)] text-[var(--st-red)]">
                <CalendarDays size={20} />
              </div>

              <p className="mt-4 mb-0 text-[13px] font-bold text-[var(--st-charcoal-dark)]">
                No bookings found
              </p>

              <p className="mt-2 mb-0 text-[10px] text-[var(--st-gray)]">
                Try another search or filter.
              </p>

            </div>
          ) : (
            <div className="space-y-3">

              {filteredBookings.map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  onClick={() =>
                    setSelectedBooking(booking)
                  }
                />
              ))}

            </div>
          )}

        </section>

      </div>

      {/* DETAIL DRAWER */}

      {selectedBooking && (
        <div className="fixed inset-0 z-[100]">

          <button
            type="button"
            aria-label="Close booking details"
            onClick={() =>
              setSelectedBooking(null)
            }
            className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
          />

          <aside className="absolute right-0 top-0 flex h-full w-full max-w-[500px] flex-col bg-white shadow-2xl">

            {/* DRAWER HEADER */}

            <div className="flex items-center justify-between border-b border-[var(--st-border)] px-5 py-5">

              <div>
                <p className="st-eyebrow">
                  BOOKING DETAILS
                </p>

                <h2 className="mt-1 text-[21px] font-bold tracking-[-0.04em] text-[var(--st-charcoal-dark)]">
                  {selectedBooking.lead?.full_name ??
                    "Unknown learner"}
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedBooking(null)
                }
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--st-border)] text-[var(--st-gray)]"
              >
                <XCircle size={19} />
              </button>

            </div>

            {/* DRAWER BODY */}

            <div className="flex-1 overflow-y-auto px-5 py-6">

              {/* STATUS */}

              <div className="flex items-center justify-between">

                <span
                  className={`rounded-full px-3 py-1.5 text-[9px] font-bold ${statusClass(
                    selectedBooking.status
                  )}`}
                >
                  {statusLabel(
                    selectedBooking.status
                  )}
                </span>

                <span className="text-[9px] text-[var(--st-gray)]">
                  {selectedBooking.id.slice(0, 8)}...
                </span>

              </div>

              {/* LESSON */}

              <div className="mt-5 rounded-2xl bg-[var(--st-bg-soft)] p-5">

                <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--st-gray)]">
                  TRIAL LESSON
                </p>

                <h3 className="mt-2 text-[24px] font-bold text-[var(--st-charcoal-dark)]">
                  {selectedBooking.instrument ===
                  "piano"
                    ? "🎹 Piano"
                    : "🎸 Guitar"}
                </h3>

                {selectedBooking.slot && (
                  <>
                    <p className="mt-4 text-[13px] font-bold text-[var(--st-charcoal-dark)]">
                      {formatDate(
                        selectedBooking.slot
                          .starts_at
                      )}
                    </p>

                    <p className="mt-1 text-[18px] font-bold text-[var(--st-red)]">
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

              {/* CUSTOMER */}

              <div className="mt-7">

                <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--st-gray)]">
                  CUSTOMER
                </p>

                <div className="mt-3 space-y-3">

                  <ContactRow
                    icon={<User size={15} />}
                    label="Name"
                    value={
                      selectedBooking.lead
                        ?.full_name ?? "—"
                    }
                  />

                  <ContactRow
                    icon={<Mail size={15} />}
                    label="Email"
                    value={
                      selectedBooking.lead?.email ??
                      "—"
                    }
                  />

                  <ContactRow
                    icon={
                      <MessageCircle
                        size={15}
                      />
                    }
                    label="WhatsApp"
                    value={
                      selectedBooking.lead
                        ?.whatsapp_number ?? "—"
                    }
                  />

                </div>

              </div>

              {/* QUICK CONTACT */}

              {selectedBooking.lead && (
                <div className="mt-6 grid grid-cols-2 gap-2">

                  <a
                    href={`tel:${selectedBooking.lead.whatsapp_number}`}
                    className="flex items-center justify-center gap-2 rounded-xl border border-[var(--st-border)] bg-white py-3 text-[10px] font-bold text-[var(--st-charcoal-dark)]"
                  >
                    <Phone size={14} />
                    Call
                  </a>

                  <a
                    href={`https://wa.me/${selectedBooking.lead.whatsapp_number.replace(
                      /\D/g,
                      ""
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 rounded-xl bg-[var(--st-red)] py-3 text-[10px] font-bold text-white"
                  >
                    <MessageCircle size={14} />
                    WhatsApp
                  </a>

                </div>
              )}

              {/* TIMELINE */}

              <div className="mt-8">

                <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--st-gray)]">
                  BOOKING TIMELINE
                </p>

                <div className="mt-4 space-y-4">

                  <TimelineItem
                    label="Booking created"
                    value={selectedBooking.created_at}
                  />

                  {selectedBooking.confirmation_sent_at && (
                    <TimelineItem
                      label="Confirmation email sent"
                      value={
                        selectedBooking.confirmation_sent_at
                      }
                    />
                  )}

                  {selectedBooking.reminder_24h_sent_at && (
                    <TimelineItem
                      label="24-hour reminder sent"
                      value={
                        selectedBooking.reminder_24h_sent_at
                      }
                    />
                  )}

                  {selectedBooking.reminder_2h_sent_at && (
                    <TimelineItem
                      label="2-hour reminder sent"
                      value={
                        selectedBooking.reminder_2h_sent_at
                      }
                    />
                  )}

                  {selectedBooking.attended_at && (
                    <TimelineItem
                      label="Learner attended"
                      value={
                        selectedBooking.attended_at
                      }
                    />
                  )}

                  {selectedBooking.completed_at && (
                    <TimelineItem
                      label="Trial completed"
                      value={
                        selectedBooking.completed_at
                      }
                    />
                  )}

                </div>

              </div>

            </div>

            {/* ACTIONS */}

            <div className="border-t border-[var(--st-border)] bg-white px-5 py-4">

              {selectedBooking.status ===
                "confirmed" && (
                <div className="grid grid-cols-2 gap-2">

                  <button
                    type="button"
                    disabled={
                      updating === selectedBooking.id
                    }
                    onClick={() =>
                      updateBookingStatus(
                        selectedBooking,
                        "completed"
                      )
                    }
                    className="st-button st-button-primary w-full disabled:opacity-50"
                  >
                    {updating ===
                    selectedBooking.id ? (
                      <Loader2
                        size={14}
                        className="animate-spin"
                      />
                    ) : (
                      <CheckCircle2 size={14} />
                    )}
                    Complete
                  </button>

                  <button
                    type="button"
                    disabled={
                      updating === selectedBooking.id
                    }
                    onClick={() =>
                      updateBookingStatus(
                        selectedBooking,
                        "cancelled"
                      )
                    }
                    className="flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[10px] font-bold text-red-700 disabled:opacity-50"
                  >
                    <XCircle size={14} />
                    Cancel
                  </button>

                </div>
              )}

              {selectedBooking.status ===
                "cancelled" && (
                <button
                  type="button"
                  disabled={
                    updating === selectedBooking.id
                  }
                  onClick={() =>
                    updateBookingStatus(
                      selectedBooking,
                      "confirmed"
                    )
                  }
                  className="st-button st-button-primary w-full disabled:opacity-50"
                >
                  Restore booking
                </button>
              )}

            </div>

          </aside>

        </div>
      )}

    </main>
  );
}

/* -------------------------------------------------------------------------- */
/* SUMMARY CARD                                                               */
/* -------------------------------------------------------------------------- */

function SummaryCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="st-card p-4 sm:p-5">

      <div className="flex items-center gap-2 text-[var(--st-red)]">
        {icon}

        <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
          {label}
        </span>
      </div>

      <p className="mt-3 mb-0 text-[28px] font-bold tracking-[-0.05em] text-[var(--st-charcoal-dark)]">
        {value}
      </p>

    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* BOOKING CARD                                                               */
/* -------------------------------------------------------------------------- */

function BookingCard({
  booking,
  onClick,
}: {
  booking: Booking;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="st-card block w-full p-4 text-left transition hover:border-[var(--st-red)] sm:p-5"
    >

      <div className="flex items-start gap-4">

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--st-bg-soft)] text-[var(--st-red)] text-lg">
          {booking.instrument === "piano"
            ? "🎹"
            : "🎸"}
        </div>

        <div className="min-w-0 flex-1">

          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">

            <div>

              <h3 className="truncate text-[14px] font-bold text-[var(--st-charcoal-dark)]">
                {booking.lead?.full_name ??
                  "Unknown learner"}
              </h3>

              {booking.slot && (
                <p className="mt-1 text-[10px] text-[var(--st-gray)]">
                  {formatDate(
                    booking.slot.starts_at
                  )}
                  {" · "}
                  {formatTimeRange(
                    booking.slot.starts_at,
                    booking.slot.ends_at
                  )}
                </p>
              )}

            </div>

            <span
              className={`self-start rounded-full px-3 py-1 text-[8px] font-bold ${statusClass(
                booking.status
              )}`}
            >
              {statusLabel(booking.status)}
            </span>

          </div>

          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[9px] text-[var(--st-gray)]">

            <span>
              {booking.instrument === "piano"
                ? "Piano"
                : "Guitar"}
            </span>

            <span>
              {booking.lead?.whatsapp_number ??
                "No WhatsApp"}
            </span>

            <span>
              {booking.lead?.email ?? "No email"}
            </span>

          </div>

        </div>

      </div>

    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* CONTACT ROW                                                                */
/* -------------------------------------------------------------------------- */

function ContactRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">

      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--st-bg-soft)] text-[var(--st-red)]">
        {icon}
      </div>

      <div className="min-w-0">

        <p className="m-0 text-[8px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
          {label}
        </p>

        <p className="mt-1 mb-0 break-words text-[11px] font-medium text-[var(--st-charcoal-dark)]">
          {value}
        </p>

      </div>

    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* TIMELINE ITEM                                                              */
/* -------------------------------------------------------------------------- */

function TimelineItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-3">

      <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[var(--st-red)]" />

      <div>

        <p className="m-0 text-[10px] font-bold text-[var(--st-charcoal-dark)]">
          {label}
        </p>

        <p className="mt-1 mb-0 text-[9px] text-[var(--st-gray)]">
          {new Intl.DateTimeFormat("en-KE", {
            dateStyle: "medium",
            timeStyle: "short",
          }).format(new Date(value))}
        </p>

      </div>

    </div>
  );
}