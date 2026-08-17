"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  Phone,
  Plus,
  UserPlus,
  Users,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

type BookingStatus =
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no_show"
  | string;

type Instrument = "piano" | "guitar" | string;

type Booking = {
  id: string;
  status: BookingStatus;
  created_at: string;
  lead_id: string;
  slot_id: string;
  lead: {
    id: string;
    full_name: string;
    whatsapp_number: string;
    email: string;
    status: string;
    next_follow_up_at: string | null;
  } | null;
  slot: {
    id: string;
    instrument: Instrument;
    starts_at: string;
    ends_at: string;
  } | null;
};

type Lead = {
  id: string;
  full_name: string;
  whatsapp_number: string;
  email: string;
  status: string;
  first_contact_at: string;
  last_contact_at: string | null;
  next_follow_up_at: string | null;
  created_at: string;
};

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatTime(dateString: string) {
  return new Intl.DateTimeFormat("en-KE", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(dateString));
}

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat("en-KE", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(dateString));
}

function formatRelativeTime(dateString: string) {
  const now = Date.now();
  const time = new Date(dateString).getTime();

  const difference = Math.max(0, now - time);

  const minutes = Math.floor(difference / 60000);

  if (minutes < 1) {
    return "Just now";
  }

  if (minutes < 60) {
    return `${minutes} min ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours} hr ago`;
  }

  const days = Math.floor(hours / 24);

  if (days === 1) {
    return "Yesterday";
  }

  return `${days} days ago`;
}

function startOfDay(date = new Date()) {
  const value = new Date(date);

  value.setHours(0, 0, 0, 0);

  return value;
}

function endOfDay(date = new Date()) {
  const value = new Date(date);

  value.setHours(23, 59, 59, 999);

  return value;
}

function startOfWeek(date = new Date()) {
  const value = startOfDay(date);

  const day = value.getDay();

  const difference = day === 0 ? -6 : 1 - day;

  value.setDate(value.getDate() + difference);

  return value;
}

function endOfWeek(date = new Date()) {
  const value = startOfWeek(date);

  value.setDate(value.getDate() + 6);
  value.setHours(23, 59, 59, 999);

  return value;
}

function isFollowUpDue(dateString: string | null) {
  if (!dateString) return false;

  return new Date(dateString).getTime() <= Date.now();
}

function getFollowUpLabel(dateString: string | null) {
  if (!dateString) return "";

  const due = new Date(dateString);
  const today = startOfDay();
  const tomorrow = new Date(today);

  tomorrow.setDate(tomorrow.getDate() + 1);

  if (due <= today) {
    return "Today";
  }

  if (due < tomorrow) {
    return "Today";
  }

  if (
    due.getFullYear() === tomorrow.getFullYear() &&
    due.getMonth() === tomorrow.getMonth() &&
    due.getDate() === tomorrow.getDate()
  ) {
    return "Tomorrow";
  }

  return formatDate(dateString);
}

function normalizeWhatsApp(number: string) {
  return number.replace(/[^\d+]/g, "");
}

function StatCard({
  label,
  value,
  description,
  icon,
  accent = false,
  loading = false,
}: {
  label: string;
  value: number;
  description: string;
  icon: React.ReactNode;
  accent?: boolean;
  loading?: boolean;
}) {
  return (
    <div className="st-card st-card-hover p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="m-0 text-[11px] font-semibold text-[var(--st-gray)]">
            {label}
          </p>

          {loading ? (
            <div className="mt-4 h-8 w-12 animate-pulse rounded-lg bg-[var(--st-bg-soft)]" />
          ) : (
            <p
              className={`mt-3 mb-0 text-[32px] font-bold leading-none tracking-[-0.04em] ${
                accent
                  ? "text-[var(--st-red)]"
                  : "text-[var(--st-charcoal-dark)]"
              }`}
            >
              {value}
            </p>
          )}

          <p className="mt-3 mb-0 text-[10px] leading-relaxed text-[var(--st-gray)]">
            {description}
          </p>
        </div>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--st-bg-soft)] text-[var(--st-red)]">
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadDashboard() {
    setLoading(true);
    setError("");

    try {
      /*
       * ---------------------------------------------------------
       * BOOKINGS
       * ---------------------------------------------------------
       *
       * bookings -> leads
       * bookings -> lesson_slots
       */

      const { data: bookingData, error: bookingError } =
        await supabase
          .from("bookings")
          .select(
            `
              id,
              status,
              created_at,
              lead_id,
              slot_id,
              lead:leads (
                id,
                full_name,
                whatsapp_number,
                email,
                status,
                next_follow_up_at
              ),
              slot:lesson_slots (
                id,
                instrument,
                starts_at,
                ends_at
              )
            `
          )
          .order("created_at", {
            ascending: false,
          });

      if (bookingError) {
        console.error("Dashboard bookings error:", bookingError);
        throw new Error(
          "We couldn't load your booking data."
        );
      }

      /*
       * Supabase can return joined relationships as arrays
       * depending on relationship metadata. Normalize them.
       */

      const normalizedBookings: Booking[] =
        (bookingData ?? []).map((booking: any) => ({
          id: booking.id,
          status: booking.status,
          created_at: booking.created_at,
          lead_id: booking.lead_id,
          slot_id: booking.slot_id,
          lead: Array.isArray(booking.lead)
            ? booking.lead[0] ?? null
            : booking.lead ?? null,
          slot: Array.isArray(booking.slot)
            ? booking.slot[0] ?? null
            : booking.slot ?? null,
        }));

      setBookings(normalizedBookings);

      /*
       * ---------------------------------------------------------
       * LEADS
       * ---------------------------------------------------------
       */

      const { data: leadData, error: leadError } =
        await supabase
          .from("leads")
          .select(
            `
              id,
              full_name,
              whatsapp_number,
              email,
              status,
              first_contact_at,
              last_contact_at,
              next_follow_up_at,
              created_at
            `
          )
          .order("created_at", {
            ascending: false,
          });

      if (leadError) {
        console.error("Dashboard leads error:", leadError);
        throw new Error(
          "Bookings loaded, but leads could not be loaded."
        );
      }

      setLeads((leadData ?? []) as Lead[]);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while loading the dashboard."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  /*
   * -----------------------------------------------------------
   * LIVE DASHBOARD CALCULATIONS
   * -----------------------------------------------------------
   */

  const today = startOfDay();
  const todayEnd = endOfDay();

  const weekStart = startOfWeek();
  const weekEnd = endOfWeek();

  const todayBookings = useMemo(() => {
    return bookings
      .filter((booking) => {
        if (!booking.slot?.starts_at) return false;

        const startsAt = new Date(
          booking.slot.starts_at
        );

        return (
          startsAt >= today &&
          startsAt <= todayEnd &&
          booking.status !== "cancelled"
        );
      })
      .sort((a, b) => {
        return (
          new Date(a.slot!.starts_at).getTime() -
          new Date(b.slot!.starts_at).getTime()
        );
      });
  }, [bookings]);

  const thisWeekBookings = useMemo(() => {
    return bookings.filter((booking) => {
      if (!booking.slot?.starts_at) return false;

      const startsAt = new Date(
        booking.slot.starts_at
      );

      return (
        startsAt >= weekStart &&
        startsAt <= weekEnd &&
        booking.status !== "cancelled"
      );
    });
  }, [bookings]);

  const upcomingBookings = useMemo(() => {
    const now = new Date();

    return bookings
      .filter((booking) => {
        if (!booking.slot?.starts_at) return false;

        return (
          new Date(
            booking.slot.starts_at
          ) > now &&
          booking.status === "confirmed"
        );
      })
      .sort((a, b) => {
        return (
          new Date(a.slot!.starts_at).getTime() -
          new Date(b.slot!.starts_at).getTime()
        );
      })
      .slice(0, 5);
  }, [bookings]);

  const completedBookings = useMemo(() => {
    return bookings.filter(
      (booking) =>
        booking.status === "completed"
    );
  }, [bookings]);

  const recentLeads = useMemo(() => {
    return leads.slice(0, 5);
  }, [leads]);

  const newLeadsLast7Days = useMemo(() => {
    const sevenDaysAgo = new Date();

    sevenDaysAgo.setDate(
      sevenDaysAgo.getDate() - 7
    );

    return leads.filter((lead) => {
      return (
        new Date(lead.created_at) >=
        sevenDaysAgo
      );
    });
  }, [leads]);

  const followUpsDue = useMemo(() => {
    return leads
      .filter((lead) => {
        return (
          isFollowUpDue(
            lead.next_follow_up_at
          ) &&
          lead.status !== "closed" &&
          lead.status !== "converted"
        );
      })
      .sort((a, b) => {
        const aDate = a.next_follow_up_at
          ? new Date(
              a.next_follow_up_at
            ).getTime()
          : 0;

        const bDate = b.next_follow_up_at
          ? new Date(
              b.next_follow_up_at
            ).getTime()
          : 0;

        return aDate - bDate;
      })
      .slice(0, 5);
  }, [leads]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();

    if (hour < 12) return "Good morning.";
    if (hour < 17) return "Good afternoon.";

    return "Good evening.";
  }, []);

  function openWhatsApp(
    phone: string,
    name: string
  ) {
    const number = normalizeWhatsApp(phone);

    if (!number) return;

    const message = encodeURIComponent(
      `Hi ${name}, this is Sauti Tamu Piano Center.`
    );

    window.open(
      `https://wa.me/${number.replace(
        "+",
        ""
      )}?text=${message}`,
      "_blank"
    );
  }

  function callPerson(phone: string) {
    if (!phone) return;

    window.location.href = `tel:${normalizeWhatsApp(
      phone
    )}`;
  }

  return (
    <main className="st-content overflow-x-hidden">
      {/* =====================================================
          PAGE HEADER
      ===================================================== */}

      <div className="mb-7 flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <p className="st-eyebrow">
            OVERVIEW
          </p>

          <h1 className="st-page-title mt-2">
            {greeting}
          </h1>

          <p className="st-page-description">
            Here&apos;s what is happening at Sauti Tamu
            today.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              window.location.href =
                "/admin/calendar";
            }}
            className="st-button st-button-secondary"
          >
            <CalendarDays size={15} />
            Calendar
          </button>

          <button
            type="button"
            onClick={() => {
              window.location.href =
                "/admin/bookings";
            }}
            className="st-button st-button-primary"
          >
            <Plus size={15} />
            New Booking
          </button>
        </div>
      </div>

      {/* =====================================================
          ERROR
      ===================================================== */}

      {error && (
        <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
          <p className="m-0 text-[11px] font-semibold text-red-700">
            {error}
          </p>

          <button
            type="button"
            onClick={loadDashboard}
            className="mt-2 text-[10px] font-bold text-red-700 underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* =====================================================
          STATISTICS
      ===================================================== */}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="TODAY'S TRIALS"
          value={todayBookings.length}
          description={`${todayBookings.length} booking${
            todayBookings.length === 1
              ? ""
              : "s"
          } scheduled today`}
          icon={<CalendarDays size={18} />}
          loading={loading}
        />

        <StatCard
          label="NEW LEADS"
          value={newLeadsLast7Days.length}
          description="Leads received in the last 7 days"
          icon={<UserPlus size={18} />}
          loading={loading}
        />

        <StatCard
          label="FOLLOW-UPS DUE"
          value={followUpsDue.length}
          description="People need attention today"
          icon={<Clock3 size={18} />}
          accent
          loading={loading}
        />

        <StatCard
          label="THIS WEEK"
          value={thisWeekBookings.length}
          description="Trial bookings this week"
          icon={<Users size={18} />}
          loading={loading}
        />
      </section>

      {/* =====================================================
          MAIN GRID
      ===================================================== */}

      <section className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-[1.6fr_1fr]">
        {/* ===================================================
            TODAY'S SCHEDULE
        =================================================== */}

        <div className="st-card overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--st-border)] px-5 py-4">
            <div className="min-w-0">
              <h2 className="st-section-title">
                Today&apos;s trials
              </h2>

              <p className="mt-1 mb-0 text-[10px] text-[var(--st-gray)]">
                Your live trial lesson schedule
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                window.location.href =
                  "/admin/calendar";
              }}
              className="st-button st-button-ghost shrink-0"
            >
              View calendar
              <ArrowRight size={14} />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 px-5 py-12 text-[10px] text-[var(--st-gray)]">
              <Loader2
                size={15}
                className="animate-spin"
              />
              Loading today&apos;s trials...
            </div>
          ) : todayBookings.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--st-bg-soft)] text-[var(--st-red)]">
                <CalendarDays size={19} />
              </div>

              <p className="mt-4 mb-0 text-[12px] font-bold text-[var(--st-charcoal-dark)]">
                No trials scheduled today
              </p>

              <p className="mt-2 mb-0 text-[10px] text-[var(--st-gray)]">
                Your calendar is clear for today.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--st-border)]">
              {todayBookings.map((booking) => {
                const name =
                  booking.lead?.full_name ??
                  "Unknown learner";

                const phone =
                  booking.lead?.whatsapp_number ??
                  "";

                const instrument =
                  booking.slot?.instrument ??
                  "";

                return (
                  <div
                    key={booking.id}
                    className="flex flex-col gap-4 px-5 py-4 transition-colors hover:bg-[var(--st-bg-soft)] sm:flex-row sm:items-center"
                  >
                    {/* TIME */}

                    <div className="w-[100px] shrink-0">
                      <p className="m-0 text-[12px] font-bold text-[var(--st-charcoal-dark)]">
                        {formatTime(
                          booking.slot!.starts_at
                        )}
                      </p>

                      <p className="mt-1 mb-0 text-[9px] text-[var(--st-gray)]">
                        {formatTime(
                          booking.slot!.ends_at
                        )}
                      </p>
                    </div>

                    {/* PERSON */}

                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--st-bg-soft)] text-[10px] font-bold text-[var(--st-red)]">
                        {getInitials(name)}
                      </div>

                      <div className="min-w-0">
                        <p className="m-0 truncate text-[12px] font-bold text-[var(--st-charcoal-dark)]">
                          {name}
                        </p>

                        <p className="mt-1 mb-0 text-[10px] capitalize text-[var(--st-gray)]">
                          {instrument} trial lesson
                        </p>
                      </div>
                    </div>

                    {/* STATUS */}

                    <div>
                      <span
                        className={`st-badge ${
                          booking.status ===
                          "confirmed"
                            ? "st-badge-green"
                            : booking.status ===
                                "completed"
                              ? "st-badge-green"
                              : "st-badge-red"
                        }`}
                      >
                        {booking.status ===
                          "confirmed" && (
                          <CheckCircle2 size={11} />
                        )}

                        {booking.status
                          .replace("_", " ")
                          .replace(
                            /^./,
                            (letter) =>
                              letter.toUpperCase()
                          )}
                      </span>
                    </div>

                    {/* ACTIONS */}

                    <div className="flex items-center gap-1">
                      {phone && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              openWhatsApp(
                                phone,
                                name
                              )
                            }
                            className="st-icon-button"
                            aria-label={`WhatsApp ${name}`}
                          >
                            <MessageCircle size={15} />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              callPerson(phone)
                            }
                            className="st-icon-button"
                            aria-label={`Call ${name}`}
                          >
                            <Phone size={15} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ===================================================
            FOLLOW UPS
        =================================================== */}

        <div className="st-card overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--st-border)] px-5 py-4">
            <div className="min-w-0">
              <h2 className="st-section-title">
                Follow-ups due
              </h2>

              <p className="mt-1 mb-0 text-[10px] text-[var(--st-gray)]">
                Leads that need your attention
              </p>
            </div>

            <span className="st-badge st-badge-red shrink-0">
              {followUpsDue.length} due
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 px-5 py-12 text-[10px] text-[var(--st-gray)]">
              <Loader2
                size={15}
                className="animate-spin"
              />
              Loading follow-ups...
            </div>
          ) : followUpsDue.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--st-bg-soft)] text-[var(--st-red)]">
                <CheckCircle2 size={19} />
              </div>

              <p className="mt-4 mb-0 text-[12px] font-bold text-[var(--st-charcoal-dark)]">
                You&apos;re all caught up
              </p>

              <p className="mt-2 mb-0 text-[10px] text-[var(--st-gray)]">
                No follow-ups are currently due.
              </p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-[var(--st-border)]">
                {followUpsDue.map((lead) => (
                  <div
                    key={lead.id}
                    className="px-5 py-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--st-bg-soft)] text-[10px] font-bold text-[var(--st-red)]">
                          {getInitials(
                            lead.full_name
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="m-0 truncate text-[12px] font-bold text-[var(--st-charcoal-dark)]">
                            {lead.full_name}
                          </p>

                          <p className="mt-1 mb-0 text-[10px] text-[var(--st-gray)]">
                            Lead ·{" "}
                            {lead.status}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="st-icon-button"
                        aria-label="More options"
                      >
                        <MoreHorizontal size={15} />
                      </button>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-3">
                      <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--st-red)]">
                        {getFollowUpLabel(
                          lead.next_follow_up_at
                        )}
                      </span>

                      {lead.whatsapp_number && (
                        <button
                          type="button"
                          onClick={() =>
                            openWhatsApp(
                              lead.whatsapp_number,
                              lead.full_name
                            )
                          }
                          className="text-[10px] font-bold text-[var(--st-red)] hover:underline"
                        >
                          Follow up →
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-[var(--st-border)] px-5 py-3">
                <button
                  type="button"
                  onClick={() => {
                    window.location.href =
                      "/admin/leads";
                  }}
                  className="text-[10px] font-bold text-[var(--st-red)]"
                >
                  View all follow-ups →
                </button>
              </div>
            </>
          )}
        </div>
      </section>

      {/* =====================================================
          UPCOMING + RECENT LEADS
      ===================================================== */}

      <section className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_0.8fr]">
        {/* UPCOMING */}

        <div className="st-card overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--st-border)] px-5 py-4">
            <div>
              <h2 className="st-section-title">
                Upcoming trials
              </h2>

              <p className="mt-1 mb-0 text-[10px] text-[var(--st-gray)]">
                Next confirmed lessons
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                window.location.href =
                  "/admin/bookings";
              }}
              className="st-button st-button-ghost"
            >
              View all
              <ArrowRight size={14} />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 px-5 py-12 text-[10px] text-[var(--st-gray)]">
              <Loader2
                size={15}
                className="animate-spin"
              />
              Loading upcoming trials...
            </div>
          ) : upcomingBookings.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="m-0 text-[12px] font-bold text-[var(--st-charcoal-dark)]">
                No upcoming trials
              </p>

              <p className="mt-2 mb-0 text-[10px] text-[var(--st-gray)]">
                There are no confirmed future bookings.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--st-border)]">
              {upcomingBookings.map((booking) => {
                const name =
                  booking.lead?.full_name ??
                  "Unknown learner";

                return (
                  <div
                    key={booking.id}
                    className="flex items-center gap-3 px-5 py-4"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--st-bg-soft)] text-[10px] font-bold text-[var(--st-red)]">
                      {getInitials(name)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="m-0 truncate text-[11px] font-bold text-[var(--st-charcoal-dark)]">
                        {name}
                      </p>

                      <p className="mt-1 mb-0 text-[9px] capitalize text-[var(--st-gray)]">
                        {booking.slot?.instrument} ·{" "}
                        {formatDate(
                          booking.slot!.starts_at
                        )}
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="m-0 text-[10px] font-bold text-[var(--st-charcoal-dark)]">
                        {formatTime(
                          booking.slot!.starts_at
                        )}
                      </p>

                      <span className="mt-1 block text-[8px] text-[var(--st-gray)]">
                        Confirmed
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RECENT LEADS */}

        <div className="st-card overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--st-border)] px-5 py-4">
            <div>
              <h2 className="st-section-title">
                Recent leads
              </h2>

              <p className="mt-1 mb-0 text-[10px] text-[var(--st-gray)]">
                Latest people entering your pipeline
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                window.location.href =
                  "/admin/leads";
              }}
              className="st-button st-button-ghost"
            >
              View all
              <ArrowRight size={14} />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 px-5 py-12 text-[10px] text-[var(--st-gray)]">
              <Loader2
                size={15}
                className="animate-spin"
              />
              Loading leads...
            </div>
          ) : recentLeads.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="m-0 text-[12px] font-bold text-[var(--st-charcoal-dark)]">
                No leads yet
              </p>

              <p className="mt-2 mb-0 text-[10px] text-[var(--st-gray)]">
                New enquiries will appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--st-border)]">
              {recentLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="flex items-center gap-3 px-5 py-4"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--st-bg-soft)] text-[10px] font-bold text-[var(--st-red)]">
                    {getInitials(
                      lead.full_name
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="m-0 truncate text-[11px] font-bold text-[var(--st-charcoal-dark)]">
                      {lead.full_name}
                    </p>

                    <p className="mt-1 mb-0 truncate text-[9px] text-[var(--st-gray)]">
                      {lead.status}
                    </p>
                  </div>

                  <span className="shrink-0 text-[9px] text-[var(--st-gray)]">
                    {formatRelativeTime(
                      lead.created_at
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* =====================================================
          QUICK ACTIONS
      ===================================================== */}

      <section className="mt-5">
        <div className="st-card p-5">
          <div>
            <p className="st-eyebrow">
              QUICK ACTIONS
            </p>

            <h2 className="mt-2 st-section-title">
              Keep things moving.
            </h2>

            <p className="mt-2 mb-0 max-w-[600px] text-[10px] leading-relaxed text-[var(--st-gray)]">
              Quickly handle bookings, leads and
              follow-ups without leaving your workspace.
            </p>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <button
              type="button"
              onClick={() => {
                window.location.href =
                  "/admin/bookings";
              }}
              className="group rounded-xl border border-[var(--st-border)] bg-white p-4 text-left transition-all hover:border-[var(--st-border-red)] hover:bg-[var(--st-bg-soft)]"
            >
              <Plus
                size={17}
                className="text-[var(--st-red)]"
              />

              <p className="mt-3 mb-0 text-[10px] font-bold text-[var(--st-charcoal-dark)]">
                New booking
              </p>
            </button>

            <button
              type="button"
              onClick={() => {
                window.location.href =
                  "/admin/leads";
              }}
              className="group rounded-xl border border-[var(--st-border)] bg-white p-4 text-left transition-all hover:border-[var(--st-border-red)] hover:bg-[var(--st-bg-soft)]"
            >
              <UserPlus
                size={17}
                className="text-[var(--st-red)]"
              />

              <p className="mt-3 mb-0 text-[10px] font-bold text-[var(--st-charcoal-dark)]">
                Add lead
              </p>
            </button>

            <button
              type="button"
              onClick={() => {
                window.location.href =
                  "/admin/calendar";
              }}
              className="group rounded-xl border border-[var(--st-border)] bg-white p-4 text-left transition-all hover:border-[var(--st-border-red)] hover:bg-[var(--st-bg-soft)]"
            >
              <CalendarDays
                size={17}
                className="text-[var(--st-red)]"
              />

              <p className="mt-3 mb-0 text-[10px] font-bold text-[var(--st-charcoal-dark)]">
                Open calendar
              </p>
            </button>

            <button
              type="button"
              onClick={() => {
                window.location.href =
                  "/admin/leads";
              }}
              className="group rounded-xl border border-[var(--st-border)] bg-white p-4 text-left transition-all hover:border-[var(--st-border-red)] hover:bg-[var(--st-bg-soft)]"
            >
              <MessageCircle
                size={17}
                className="text-[var(--st-red)]"
              />

              <p className="mt-3 mb-0 text-[10px] font-bold text-[var(--st-charcoal-dark)]">
                Follow up
              </p>
            </button>
          </div>
        </div>
      </section>

      {/* =====================================================
          FOOTER
      ===================================================== */}

      <div className="mt-7 flex flex-col gap-2 border-t border-[var(--st-border)] pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="m-0 text-[9px] text-[var(--st-gray)]">
          Sauti Tamu Piano Center · Booking &amp; Follow-up
        </p>

        <p className="m-0 text-[9px] text-[var(--st-gray)]">
          Live admin workspace
        </p>
      </div>
    </main>
  );
}