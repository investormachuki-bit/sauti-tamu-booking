"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Cog,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Loader2,
  Mail,
  MessageCircle,
  MoreHorizontal,
  Phone,
  Plus,
  Settings,
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

type Student = {
  id: string;
  full_name: string;
  whatsapp_number: string;
  status: string;
};

type StudentEnrollment = {
  id: string;
  student_id: string;
  instrument: Instrument;
  programme_name: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
};

type CompletionStudent = {
  student: Student;
  enrollment: StudentEnrollment;
  daysRemaining: number;
};

const TERMINAL_STUDENT_STATUSES = new Set([
  "completed",
  "paused",
  "cancelled",
  "inactive",
]);

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
    timeZone: "Africa/Nairobi",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(dateString));
}

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat("en-KE", {
    timeZone: "Africa/Nairobi",
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(dateString));
}

function formatDateOnly(dateString: string) {
  const [year, month, day] = dateString.slice(0, 10).split("-").map(Number);

  if (!year || !month || !day) return dateString;

  return new Intl.DateTimeFormat("en-KE", {
    timeZone: "Africa/Nairobi",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function getNairobiDateKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function addCalendarDays(dateKey: string, days: number) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const value = new Date(Date.UTC(year, month - 1, day));
  value.setUTCDate(value.getUTCDate() + days);

  return value.toISOString().slice(0, 10);
}

function calendarDaysUntil(endDate: string, todayKey: string) {
  const endKey = endDate.slice(0, 10);
  const [endYear, endMonth, endDay] = endKey.split("-").map(Number);
  const [todayYear, todayMonth, todayDay] = todayKey
    .split("-")
    .map(Number);

  const endUtc = Date.UTC(endYear, endMonth - 1, endDay);
  const todayUtc = Date.UTC(todayYear, todayMonth - 1, todayDay);

  return Math.round((endUtc - todayUtc) / 86400000);
}

function formatRelativeTime(dateString: string) {
  const now = Date.now();
  const time = new Date(dateString).getTime();
  const difference = Math.max(0, now - time);
  const minutes = Math.floor(difference / 60000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;

  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";

  return `${days} days ago`;
}

function isFollowUpDue(dateString: string | null) {
  if (!dateString) return false;
  return new Date(dateString).getTime() <= Date.now();
}

function getFollowUpLabel(dateString: string | null) {
  if (!dateString) return "";

  const todayKey = getNairobiDateKey();
  const tomorrowKey = addCalendarDays(todayKey, 1);
  const dueKey = getNairobiDateKey(new Date(dateString));

  if (dueKey === todayKey) return "Today";
  if (dueKey === tomorrowKey) return "Tomorrow";

  return formatDate(dateString);
}

function normalizeWhatsApp(number: string) {
  return number.replace(/[^\d+]/g, "");
}

function capitalizeStatus(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/^./, (letter) => letter.toUpperCase());
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

function SectionLoading({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-2 px-5 py-12 text-[10px] text-[var(--st-gray)]">
      <Loader2 size={15} className="animate-spin" />
      {label}
    </div>
  );
}

function EmptyState({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="px-5 py-12 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--st-bg-soft)] text-[var(--st-red)]">
        {icon ?? <CheckCircle2 size={19} />}
      </div>

      <p className="mt-4 mb-0 text-[12px] font-bold text-[var(--st-charcoal-dark)]">
        {title}
      </p>

      <p className="mt-2 mb-0 text-[10px] text-[var(--st-gray)]">
        {description}
      </p>
    </div>
  );
}

function QuickAction({
  label,
  description,
  icon,
  href,
  external = false,
}: {
  label: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  external?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        window.location.href = href;
      }}
      className="group rounded-xl border border-[var(--st-border)] bg-white p-4 text-left transition-all hover:border-[var(--st-border-red)] hover:bg-[var(--st-bg-soft)]"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--st-bg-soft)] text-[var(--st-red)]">
          {icon}
        </span>

        <ArrowRight
          size={14}
          className="text-[var(--st-gray)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--st-red)]"
        />
      </div>

      <p className="mt-3 mb-0 text-[10px] font-bold text-[var(--st-charcoal-dark)]">
        {label}
      </p>

      <p className="mt-1 mb-0 text-[9px] leading-relaxed text-[var(--st-gray)]">
        {description}
      </p>

      {external && (
        <span className="mt-2 block text-[8px] font-bold uppercase tracking-[0.08em] text-[var(--st-red)]">
          Public booking flow
        </span>
      )}
    </button>
  );
}

export default function AdminDashboard() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [enrollments, setEnrollments] = useState<StudentEnrollment[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [todayKey, setTodayKey] = useState(() => getNairobiDateKey());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTodayKey(getNairobiDateKey());
    }, 60000);

    return () => window.clearInterval(timer);
  }, []);

  async function loadDashboard() {
    setLoading(true);
    setError("");

    try {
      const [
        { data: bookingData, error: bookingError },
        { data: leadData, error: leadError },
        { data: studentData, error: studentError },
        { data: enrollmentData, error: enrollmentError },
      ] = await Promise.all([
        supabase
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
          .order("created_at", { ascending: false }),

        supabase
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
          .order("created_at", { ascending: false }),

        supabase
          .from("students")
          .select(
            `
              id,
              full_name,
              whatsapp_number,
              status
            `
          )
          .order("created_at", { ascending: false }),

        supabase
          .from("student_enrollments")
          .select(
            `
              id,
              student_id,
              instrument,
              programme_name,
              start_date,
              end_date,
              status
            `
          )
          .order("end_date", { ascending: true }),
      ]);

      if (bookingError) {
        console.error("Dashboard bookings error:", bookingError);
        throw new Error("We couldn't load your booking data.");
      }

      if (leadError) {
        console.error("Dashboard leads error:", leadError);
        throw new Error("Bookings loaded, but leads could not be loaded.");
      }

      if (studentError) {
        console.error("Dashboard students error:", studentError);
        throw new Error("Bookings loaded, but students could not be loaded.");
      }

      if (enrollmentError) {
        console.error("Dashboard enrollments error:", enrollmentError);
        throw new Error(
          "Students loaded, but enrollment data could not be loaded."
        );
      }

      const normalizedBookings: Booking[] = (bookingData ?? []).map(
        (booking: any) => ({
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
        })
      );

      setBookings(normalizedBookings);
      setLeads((leadData ?? []) as Lead[]);
      setStudents((studentData ?? []) as Student[]);
      setEnrollments((enrollmentData ?? []) as StudentEnrollment[]);
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

  const tomorrowKey = useMemo(() => addCalendarDays(todayKey, 1), [todayKey]);

  const activeEnrollments = useMemo(() => {
    return enrollments.filter((enrollment) => {
      const enrollmentStatus = enrollment.status.toLowerCase();
      return (
        !TERMINAL_STUDENT_STATUSES.has(enrollmentStatus) &&
        Boolean(enrollment.end_date)
      );
    });
  }, [enrollments]);

  const activeStudents = useMemo(() => {
    const activeStudentIds = new Set(
      activeEnrollments.map((enrollment) => enrollment.student_id)
    );

    return students.filter((student) => {
      const studentStatus = student.status.toLowerCase();
      return (
        activeStudentIds.has(student.id) &&
        !TERMINAL_STUDENT_STATUSES.has(studentStatus)
      );
    });
  }, [students, activeEnrollments]);

  const nearingCompletion = useMemo<CompletionStudent[]>(() => {
    const studentMap = new Map(students.map((student) => [student.id, student]));

    return activeEnrollments
      .map((enrollment) => {
        if (!enrollment.end_date) return null;

        const student = studentMap.get(enrollment.student_id);
        if (!student) return null;

        const studentStatus = student.status.toLowerCase();
        if (TERMINAL_STUDENT_STATUSES.has(studentStatus)) return null;

        const daysRemaining = calendarDaysUntil(
          enrollment.end_date,
          todayKey
        );

        if (daysRemaining > 14) return null;

        return {
          student,
          enrollment,
          daysRemaining,
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        if (!a || !b) return 0;
        return a.daysRemaining - b.daysRemaining;
      }) as CompletionStudent[];
  }, [activeEnrollments, students, todayKey]);

  const todayBookings = useMemo(() => {
    return bookings
      .filter((booking) => {
        if (!booking.slot?.starts_at) return false;

        return (
          getNairobiDateKey(new Date(booking.slot.starts_at)) === todayKey &&
          booking.status !== "cancelled"
        );
      })
      .sort((a, b) => {
        return (
          new Date(a.slot!.starts_at).getTime() -
          new Date(b.slot!.starts_at).getTime()
        );
      });
  }, [bookings, todayKey]);

  const tomorrowBookings = useMemo(() => {
    return bookings
      .filter((booking) => {
        if (!booking.slot?.starts_at) return false;

        return (
          getNairobiDateKey(new Date(booking.slot.starts_at)) === tomorrowKey &&
          booking.status !== "cancelled"
        );
      })
      .sort((a, b) => {
        return (
          new Date(a.slot!.starts_at).getTime() -
          new Date(b.slot!.starts_at).getTime()
        );
      });
  }, [bookings, tomorrowKey]);

  const upcomingBookings = useMemo(() => {
    const now = new Date();

    return bookings
      .filter((booking) => {
        if (!booking.slot?.starts_at) return false;

        return (
          new Date(booking.slot.starts_at).getTime() > now.getTime() &&
          booking.status === "confirmed" &&
          getNairobiDateKey(new Date(booking.slot.starts_at)) > tomorrowKey
        );
      })
      .sort((a, b) => {
        return (
          new Date(a.slot!.starts_at).getTime() -
          new Date(b.slot!.starts_at).getTime()
        );
      })
      .slice(0, 8);
  }, [bookings, tomorrowKey]);

  const thisWeekBookings = useMemo(() => {
    const current = new Date();
    const day = current.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;

    const monday = new Date(current);
    monday.setDate(current.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 7);
    sunday.setHours(0, 0, 0, 0);

    return bookings.filter((booking) => {
      if (!booking.slot?.starts_at) return false;

      const startsAt = new Date(booking.slot.starts_at);

      return (
        startsAt >= monday &&
        startsAt < sunday &&
        booking.status !== "cancelled"
      );
    });
  }, [bookings, todayKey]);

  const recentLeads = useMemo(() => leads.slice(0, 5), [leads]);

  const newLeadsLast7Days = useMemo(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    return leads.filter((lead) => new Date(lead.created_at) >= sevenDaysAgo);
  }, [leads]);

  const followUpsDue = useMemo(() => {
    return leads
      .filter((lead) => {
        return (
          isFollowUpDue(lead.next_follow_up_at) &&
          lead.status !== "closed" &&
          lead.status !== "converted"
        );
      })
      .sort((a, b) => {
        const aDate = a.next_follow_up_at
          ? new Date(a.next_follow_up_at).getTime()
          : 0;
        const bDate = b.next_follow_up_at
          ? new Date(b.next_follow_up_at).getTime()
          : 0;

        return aDate - bDate;
      })
      .slice(0, 5);
  }, [leads, todayKey]);

  const greeting = useMemo(() => {
    const parts = new Intl.DateTimeFormat("en-KE", {
      timeZone: "Africa/Nairobi",
      hour: "numeric",
      hour12: false,
    }).formatToParts(new Date());

    const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);

    if (hour < 12) return "Good morning.";
    if (hour < 17) return "Good afternoon.";

    return "Good evening.";
  }, [todayKey]);

  function openWhatsApp(phone: string, name: string) {
    const number = normalizeWhatsApp(phone);
    if (!number) return;

    const message = encodeURIComponent(
      `Hi ${name}, this is Sauti Tamu Piano Center.`
    );

    window.open(
      `https://wa.me/${number.replace("+", "")}?text=${message}`,
      "_blank"
    );
  }

  function callPerson(phone: string) {
    if (!phone) return;
    window.location.href = `tel:${normalizeWhatsApp(phone)}`;
  }

  function renderCompletionStatus(daysRemaining: number) {
    if (daysRemaining < 0) {
      return (
        <span className="st-badge st-badge-red">
          Overdue by {Math.abs(daysRemaining)} day
          {Math.abs(daysRemaining) === 1 ? "" : "s"}
        </span>
      );
    }

    if (daysRemaining === 0) {
      return <span className="st-badge st-badge-red">Due today</span>;
    }

    if (daysRemaining <= 3) {
      return (
        <span className="st-badge st-badge-red">
          {daysRemaining} day{daysRemaining === 1 ? "" : "s"} remaining
        </span>
      );
    }

    return (
      <span className="st-badge st-badge-green">
        {daysRemaining} days remaining
      </span>
    );
  }

  return (
    <main className="st-content overflow-x-hidden">
      {/* PAGE HEADER */}
      <div className="mb-7 flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <p className="st-eyebrow">OVERVIEW</p>

          <h1 className="st-page-title mt-2">{greeting}</h1>

          <p className="st-page-description">
            Here&apos;s what is happening at Sauti Tamu today.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              window.location.href = "/admin/calendar";
            }}
            className="st-button st-button-secondary"
          >
            <CalendarDays size={15} />
            Calendar
          </button>

          <button
            type="button"
            onClick={() => {
              window.location.href = "/book";
            }}
            className="st-button st-button-primary"
          >
            <Plus size={15} />
            New Trial Booking
          </button>
        </div>
      </div>

      {/* ERROR */}
      {error && (
        <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
          <p className="m-0 text-[11px] font-semibold text-red-700">{error}</p>

          <button
            type="button"
            onClick={loadDashboard}
            className="mt-2 text-[10px] font-bold text-red-700 underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* STATISTICS */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="ACTIVE STUDENTS"
          value={activeStudents.length}
          description="Students with an active enrollment"
          icon={<GraduationCap size={18} />}
          loading={loading}
        />

        <StatCard
          label="TODAY'S TRIALS"
          value={todayBookings.length}
          description={`${todayBookings.length} trial booking${todayBookings.length === 1 ? "" : "s"} scheduled today`}
          icon={<CalendarDays size={18} />}
          loading={loading}
        />

        <StatCard
          label="TOMORROW'S TRIALS"
          value={tomorrowBookings.length}
          description={`${tomorrowBookings.length} confirmed booking${tomorrowBookings.length === 1 ? "" : "s"} scheduled tomorrow`}
          icon={<Clock3 size={18} />}
          loading={loading}
        />

        <StatCard
          label="FOLLOW-UPS DUE"
          value={followUpsDue.length}
          description="People who need attention"
          icon={<MessageCircle size={18} />}
          accent
          loading={loading}
        />
      </section>

      {/* STUDENTS NEARING COMPLETION */}
      <section className="mt-6">
        <div className="st-card overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--st-border)] px-5 py-4">
            <div className="min-w-0">
              <h2 className="st-section-title">Students nearing completion</h2>

              <p className="mt-1 mb-0 text-[10px] text-[var(--st-gray)]">
                Active students with 14 calendar days or less remaining in their enrollment
              </p>
            </div>

            <span className="st-badge st-badge-red shrink-0">
              {nearingCompletion.length} need attention
            </span>
          </div>

          {loading ? (
            <SectionLoading label="Loading students..." />
          ) : nearingCompletion.length === 0 ? (
            <EmptyState
              title="No students are nearing completion"
              description="No active student is within 14 calendar days of their enrollment end date."
              icon={<GraduationCap size={19} />}
            />
          ) : (
            <div className="divide-y divide-[var(--st-border)]">
              {nearingCompletion.map(({ student, enrollment, daysRemaining }) => (
                <div
                  key={enrollment.id}
                  className="flex flex-col gap-4 px-5 py-4 transition-colors hover:bg-[var(--st-bg-soft)] lg:flex-row lg:items-center"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--st-bg-soft)] text-[10px] font-bold text-[var(--st-red)]">
                      {getInitials(student.full_name)}
                    </div>

                    <div className="min-w-0">
                      <p className="m-0 truncate text-[12px] font-bold text-[var(--st-charcoal-dark)]">
                        {student.full_name}
                      </p>

                      <p className="mt-1 mb-0 text-[10px] capitalize text-[var(--st-gray)]">
                        {enrollment.instrument}
                        {enrollment.programme_name
                          ? ` · ${enrollment.programme_name}`
                          : ""}
                      </p>
                    </div>
                  </div>

                  <div className="min-w-[190px]">
                    <p className="m-0 text-[9px] font-semibold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                      Enrollment ends
                    </p>

                    <p className="mt-1 mb-0 text-[11px] font-bold text-[var(--st-charcoal-dark)]">
                      {formatDateOnly(enrollment.end_date!)}
                    </p>
                  </div>

                  <div className="shrink-0">{renderCompletionStatus(daysRemaining)}</div>

                  <div className="flex items-center gap-1 lg:ml-auto">
                    {student.whatsapp_number && (
                      <button
                        type="button"
                        onClick={() =>
                          openWhatsApp(student.whatsapp_number, student.full_name)
                        }
                        className="st-icon-button"
                        aria-label={`WhatsApp ${student.full_name}`}
                      >
                        <MessageCircle size={15} />
                      </button>
                    )}

                    {student.whatsapp_number && (
                      <button
                        type="button"
                        onClick={() => callPerson(student.whatsapp_number)}
                        className="st-icon-button"
                        aria-label={`Call ${student.full_name}`}
                      >
                        <Phone size={15} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* TODAY */}
      <section className="mt-5">
        <div className="st-card overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--st-border)] px-5 py-4">
            <div className="min-w-0">
              <h2 className="st-section-title">Today&apos;s trials</h2>

              <p className="mt-1 mb-0 text-[10px] text-[var(--st-gray)]">
                Live trial lesson schedule for today
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                window.location.href = "/admin/calendar";
              }}
              className="st-button st-button-ghost shrink-0"
            >
              View calendar
              <ArrowRight size={14} />
            </button>
          </div>

          {loading ? (
            <SectionLoading label="Loading today's trials..." />
          ) : todayBookings.length === 0 ? (
            <EmptyState
              title="No trials scheduled today"
              description="Your calendar is clear for today."
              icon={<CalendarDays size={19} />}
            />
          ) : (
            <div className="divide-y divide-[var(--st-border)]">
              {todayBookings.map((booking) => {
                const name = booking.lead?.full_name ?? "Unknown learner";
                const phone = booking.lead?.whatsapp_number ?? "";
                const instrument = booking.slot?.instrument ?? "";

                return (
                  <div
                    key={booking.id}
                    className="flex flex-col gap-4 px-5 py-4 transition-colors hover:bg-[var(--st-bg-soft)] sm:flex-row sm:items-center"
                  >
                    <div className="w-[100px] shrink-0">
                      <p className="m-0 text-[12px] font-bold text-[var(--st-charcoal-dark)]">
                        {formatTime(booking.slot!.starts_at)}
                      </p>

                      <p className="mt-1 mb-0 text-[9px] text-[var(--st-gray)]">
                        {formatTime(booking.slot!.ends_at)}
                      </p>
                    </div>

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

                    <div>
                      <span
                        className={`st-badge ${
                          booking.status === "confirmed" ||
                          booking.status === "completed"
                            ? "st-badge-green"
                            : "st-badge-red"
                        }`}
                      >
                        {(booking.status === "confirmed" ||
                          booking.status === "completed") && <CheckCircle2 size={11} />}
                        {capitalizeStatus(booking.status)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {phone && (
                        <>
                          <button
                            type="button"
                            onClick={() => openWhatsApp(phone, name)}
                            className="st-icon-button"
                            aria-label={`WhatsApp ${name}`}
                          >
                            <MessageCircle size={15} />
                          </button>

                          <button
                            type="button"
                            onClick={() => callPerson(phone)}
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
      </section>

      {/* TOMORROW */}
      <section className="mt-5">
        <div className="st-card overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--st-border)] px-5 py-4">
            <div>
              <h2 className="st-section-title">Tomorrow&apos;s trials</h2>

              <p className="mt-1 mb-0 text-[10px] text-[var(--st-gray)]">
                Confirmed trial lesson schedule for tomorrow
              </p>
            </div>

            <span className="st-badge st-badge-green shrink-0">
              {tomorrowBookings.length} booked
            </span>
          </div>

          {loading ? (
            <SectionLoading label="Loading tomorrow's trials..." />
          ) : tomorrowBookings.length === 0 ? (
            <EmptyState
              title="No trials scheduled tomorrow"
              description="There are no non-cancelled bookings on tomorrow's schedule."
              icon={<CalendarDays size={19} />}
            />
          ) : (
            <div className="divide-y divide-[var(--st-border)]">
              {tomorrowBookings.map((booking) => {
                const name = booking.lead?.full_name ?? "Unknown learner";

                return (
                  <div
                    key={booking.id}
                    className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-[var(--st-bg-soft)]"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--st-bg-soft)] text-[10px] font-bold text-[var(--st-red)]">
                      {getInitials(name)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="m-0 truncate text-[11px] font-bold text-[var(--st-charcoal-dark)]">
                        {name}
                      </p>

                      <p className="mt-1 mb-0 text-[9px] capitalize text-[var(--st-gray)]">
                        {booking.slot?.instrument} · {formatTime(booking.slot!.starts_at)}
                      </p>
                    </div>

                    <span
                      className={`st-badge shrink-0 ${
                        booking.status === "confirmed"
                          ? "st-badge-green"
                          : "st-badge-red"
                      }`}
                    >
                      {capitalizeStatus(booking.status)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* UPCOMING */}
      <section className="mt-5">
        <div className="st-card overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--st-border)] px-5 py-4">
            <div>
              <h2 className="st-section-title">Upcoming trials</h2>

              <p className="mt-1 mb-0 text-[10px] text-[var(--st-gray)]">
                Next confirmed trial lessons after tomorrow
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                window.location.href = "/admin/bookings";
              }}
              className="st-button st-button-ghost"
            >
              View all
              <ArrowRight size={14} />
            </button>
          </div>

          {loading ? (
            <SectionLoading label="Loading upcoming trials..." />
          ) : upcomingBookings.length === 0 ? (
            <EmptyState
              title="No upcoming trials"
              description="There are no confirmed future bookings after tomorrow."
              icon={<CalendarDays size={19} />}
            />
          ) : (
            <div className="divide-y divide-[var(--st-border)]">
              {upcomingBookings.map((booking) => {
                const name = booking.lead?.full_name ?? "Unknown learner";

                return (
                  <div
                    key={booking.id}
                    className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-[var(--st-bg-soft)]"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--st-bg-soft)] text-[10px] font-bold text-[var(--st-red)]">
                      {getInitials(name)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="m-0 truncate text-[11px] font-bold text-[var(--st-charcoal-dark)]">
                        {name}
                      </p>

                      <p className="mt-1 mb-0 text-[9px] capitalize text-[var(--st-gray)]">
                        {booking.slot?.instrument} · {formatDate(booking.slot!.starts_at)}
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="m-0 text-[10px] font-bold text-[var(--st-charcoal-dark)]">
                        {formatTime(booking.slot!.starts_at)}
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
      </section>

      {/* FOLLOW-UPS */}
      <section className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_0.8fr]">
        <div className="st-card overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--st-border)] px-5 py-4">
            <div className="min-w-0">
              <h2 className="st-section-title">Follow-ups due</h2>

              <p className="mt-1 mb-0 text-[10px] text-[var(--st-gray)]">
                Leads that need your attention
              </p>
            </div>

            <span className="st-badge st-badge-red shrink-0">
              {followUpsDue.length} due
            </span>
          </div>

          {loading ? (
            <SectionLoading label="Loading follow-ups..." />
          ) : followUpsDue.length === 0 ? (
            <EmptyState
              title="You're all caught up"
              description="No follow-ups are currently due."
            />
          ) : (
            <>
              <div className="divide-y divide-[var(--st-border)]">
                {followUpsDue.map((lead) => (
                  <div key={lead.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--st-bg-soft)] text-[10px] font-bold text-[var(--st-red)]">
                          {getInitials(lead.full_name)}
                        </div>

                        <div className="min-w-0">
                          <p className="m-0 truncate text-[12px] font-bold text-[var(--st-charcoal-dark)]">
                            {lead.full_name}
                          </p>

                          <p className="mt-1 mb-0 text-[10px] text-[var(--st-gray)]">
                            Lead · {lead.status}
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
                        {getFollowUpLabel(lead.next_follow_up_at)}
                      </span>

                      {lead.whatsapp_number && (
                        <button
                          type="button"
                          onClick={() =>
                            openWhatsApp(lead.whatsapp_number, lead.full_name)
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
                    window.location.href = "/admin/followups";
                  }}
                  className="text-[10px] font-bold text-[var(--st-red)]"
                >
                  View all follow-ups →
                </button>
              </div>
            </>
          )}
        </div>

        <div className="st-card overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--st-border)] px-5 py-4">
            <div>
              <h2 className="st-section-title">Recent leads</h2>

              <p className="mt-1 mb-0 text-[10px] text-[var(--st-gray)]">
                Latest people entering your pipeline
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                window.location.href = "/admin/leads";
              }}
              className="st-button st-button-ghost"
            >
              View all
              <ArrowRight size={14} />
            </button>
          </div>

          {loading ? (
            <SectionLoading label="Loading leads..." />
          ) : recentLeads.length === 0 ? (
            <EmptyState
              title="No leads yet"
              description="New enquiries will appear here."
              icon={<UserPlus size={19} />}
            />
          ) : (
            <div className="divide-y divide-[var(--st-border)]">
              {recentLeads.map((lead) => (
                <div key={lead.id} className="flex items-center gap-3 px-5 py-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--st-bg-soft)] text-[10px] font-bold text-[var(--st-red)]">
                    {getInitials(lead.full_name)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="m-0 truncate text-[11px] font-bold text-[var(--st-charcoal-dark)]">
                      {lead.full_name}
                    </p>

                    <p className="mt-1 mb-0 truncate text-[9px] text-[var(--st-gray)]">
                      {capitalizeStatus(lead.status)}
                    </p>
                  </div>

                  <span className="shrink-0 text-[9px] text-[var(--st-gray)]">
                    {formatRelativeTime(lead.created_at)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* QUICK ACTIONS */}
      <section className="mt-5">
        <div className="st-card p-5">
          <div>
            <p className="st-eyebrow">QUICK ACTIONS</p>

            <h2 className="mt-2 st-section-title">Everything in one place.</h2>

            <p className="mt-2 mb-0 max-w-[700px] text-[10px] leading-relaxed text-[var(--st-gray)]">
              Start the real public trial-booking journey or jump directly to any admin workspace page.
            </p>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <QuickAction
              label="New Trial Booking"
              description="Open the real public booking flow from the admin workspace."
              icon={<Plus size={17} />}
              href="/book"
              external
            />

            <QuickAction
              label="Bookings"
              description="Manage confirmed, completed and cancelled trial bookings."
              icon={<BookOpen size={17} />}
              href="/admin/bookings"
            />

            <QuickAction
              label="Calendar"
              description="Review lessons and available trial slots."
              icon={<CalendarDays size={17} />}
              href="/admin/calendar"
            />

            <QuickAction
              label="Leads"
              description="Manage enquiries, statuses and follow-ups."
              icon={<UserPlus size={17} />}
              href="/admin/leads"
            />

            <QuickAction
              label="Students"
              description="View and manage enrolled students."
              icon={<Users size={17} />}
              href="/admin/students"
            />

            <QuickAction
              label="Follow-ups"
              description="Work through leads that require contact."
              icon={<MessageCircle size={17} />}
              href="/admin/followups"
            />

            <QuickAction
              label="Email Templates"
              description="Manage the system email templates used by the platform."
              icon={<Mail size={17} />}
              href="/admin/email-templates"
            />

            <QuickAction
              label="Settings"
              description="Manage Sauti Tamu booking and business settings."
              icon={<Settings size={17} />}
              href="/admin/settings"
            />
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <div className="mt-7 flex flex-col gap-2 border-t border-[var(--st-border)] pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="m-0 text-[9px] text-[var(--st-gray)]">
          Sauti Tamu Piano Center · Booking &amp; Follow-up
        </p>

        <p className="m-0 text-[9px] text-[var(--st-gray)]">Live admin workspace</p>
      </div>
    </main>
  );
}
