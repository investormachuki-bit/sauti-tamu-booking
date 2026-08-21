"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  Mail,
  MessageCircle,
  Phone,
  RefreshCw,
  Search,
  User,
  X,
  XCircle,
  UserPlus,
  UserCheck,
  UserX,
} from "lucide-react";

import AddStudentModal from "../../../components/students/AddStudentModal";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  ensureStudentFromLead,
} from "@/lib/services/studentRegistration";

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

type Student = {
  id: string;
  lead_id: string;
  full_name: string;
  email: string;
  whatsapp_number: string;
  status: string;
};

type FollowUpTaskType =
  | "post_trial_follow_up"
  | "trial_reschedule_follow_up";

const NAIROBI_TIME_ZONE = "Africa/Nairobi";

/*
 * =========================================================
 * DATE / TIME HELPERS
 * =========================================================
 */

function getNairobiDateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: NAIROBI_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function getNairobiStartOfToday() {
  const today = getNairobiDateKey(new Date());

  return new Date(`${today}T00:00:00+03:00`);
}

function getNairobiEndOfToday() {
  const today = getNairobiDateKey(new Date());

  const date = new Date(`${today}T00:00:00+03:00`);

  date.setDate(date.getDate() + 1);

  return date;
}

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat("en-KE", {
    timeZone: NAIROBI_TIME_ZONE,
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(dateString));
}

function formatLongDate(dateString: string) {
  return new Intl.DateTimeFormat("en-KE", {
    timeZone: NAIROBI_TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(dateString));
}

function formatTime(dateString: string) {
  return new Intl.DateTimeFormat("en-KE", {
    timeZone: NAIROBI_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(dateString));
}

function formatTimeRange(
  startsAt: string,
  endsAt: string
) {
  return `${formatTime(startsAt)} Ã¢â‚¬â€œ ${formatTime(endsAt)}`;
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/*
 * =========================================================
 * STATUS HELPERS
 * =========================================================
 */

function prettyStatus(status: BookingStatus) {
  switch (status) {
    case "confirmed":
      return "Confirmed";

    case "completed":
      return "Attended";

    case "cancelled":
      return "Cancelled";

    case "no_show":
      return "Missed";

    default:
      return status;
  }
}

function statusClasses(status: BookingStatus) {
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

function statusIcon(status: BookingStatus) {
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

/*
 * =========================================================
 * PAGE
 * =========================================================
 */

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
      | "all"
      | "confirmed"
      | "completed"
      | "cancelled"
      | "no_show"
    >("all");

  const [selectedBooking, setSelectedBooking] =
    useState<BookingRecord | null>(null);

  const [updatingId, setUpdatingId] =
    useState<string | null>(null);

  /*
   * =========================================================
   * LOAD BOOKINGS
   * =========================================================
   */

  async function loadBookings(silent = false) {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

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

    setRecords(
      loadedRecords
    );

    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => {
    loadBookings();
  }, []);

  /*
   * =========================================================
   * FILTERING
   * =========================================================
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
            booking.status !==
              filter
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
    }, [
      records,
      search,
      filter,
    ]);

  /*
   * =========================================================
   * STATS
   * =========================================================
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
   * =========================================================
   * COMMON BOOKING UPDATE
   * =========================================================
   */

  async function updateBooking(
    bookingId: string,
    updates: Record<
      string,
      string | null
    >
  ) {
    const {
      data,
      error: updateError,
    } = await supabase
      .from("bookings")
      .update(updates)
      .eq("id", bookingId)
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
      throw updateError;
    }

    return data as Booking;
  }

  /*
   * =========================================================
   * FIND OPEN FOLLOW-UP OF A SPECIFIC TYPE
   *
   * This is deliberately more precise than checking only
   * booking_id.
   *
   * A registration follow-up and reschedule follow-up
   * are different business events.
   * =========================================================
   */

  async function hasOpenFollowUp(
    bookingId: string,
    taskType: FollowUpTaskType
  ) {
    const {
      data,
      error,
    } = await supabase
      .from("follow_up_tasks")
      .select(
        "id, status, task_type"
      )
      .eq(
        "booking_id",
        bookingId
      )
      .eq(
        "task_type",
        taskType
      )
      .in("status", [
        "pending",
        "sent",
      ])
      .limit(1);

    if (error) {
      throw error;
    }

    return (
      (data ?? []).length > 0
    );
  }

  /*
   * =========================================================
   * CREATE POST-TRIAL REGISTRATION FOLLOW-UP
   * =========================================================
   */

  async function createRegistrationFollowUp(
    record: BookingRecord
  ) {
    const booking =
      record.booking;

    const lead =
      record.lead;

    if (!lead) {
      throw new Error(
        "This booking has no linked lead."
      );
    }

    const alreadyExists =
      await hasOpenFollowUp(
        booking.id,
        "post_trial_follow_up"
      );

    if (alreadyExists) {
      return;
    }

    const dueAt =
      record.slot?.ends_at ??
      new Date().toISOString();

    const lessonText =
      record.slot
        ? `${formatLongDate(
            record.slot.starts_at
          )} at ${formatTime(
            record.slot.starts_at
          )}`
        : "the scheduled trial lesson";

    const {
      error,
    } = await supabase
      .from("follow_up_tasks")
      .insert({
        lead_id:
          lead.id,
        booking_id:
          booking.id,
        task_type:
          "post_trial_follow_up",
        due_at:
          dueAt,
        status:
          "pending",
        channel:
          null,
        message_template:
          `Trial attended Ã¢â‚¬â€ follow up with ${lead.full_name} regarding registration after the ${booking.instrument} trial on ${lessonText}.`,
        sent_at:
          null,
        completed_at:
          null,
      });

    if (error) {
      throw error;
    }
  }

  /*
   * =========================================================
   * CREATE RESCHEDULE FOLLOW-UP
   * =========================================================
   */

  async function createRescheduleFollowUp(
    record: BookingRecord
  ) {
    const booking =
      record.booking;

    const lead =
      record.lead;

    if (!lead) {
      throw new Error(
        "This booking has no linked lead."
      );
    }

    const alreadyExists =
      await hasOpenFollowUp(
        booking.id,
        "trial_reschedule_follow_up"
      );

    if (alreadyExists) {
      return;
    }

    const {
      error,
    } = await supabase
      .from("follow_up_tasks")
      .insert({
        lead_id:
          lead.id,
        booking_id:
          booking.id,
        task_type:
          "trial_reschedule_follow_up",
        due_at:
          new Date().toISOString(),
        status:
          "pending",
        channel:
          null,
        message_template:
          `Missed trial Ã¢â‚¬â€ contact ${lead.full_name} to reschedule their ${booking.instrument} trial lesson.`,
        sent_at:
          null,
        completed_at:
          null,
      });

    if (error) {
      throw error;
    }
  }

  /*
   * =========================================================
   * MARK ATTENDED
   *
   * This means:
   *
   * "The learner actually came for the trial."
   *
   * It does NOT automatically create a student.
   *
   * It creates a follow-up asking staff to convert the
   * learner after the trial.
   * =========================================================
   */

  async function markAttended(
    record: BookingRecord
  ) {
    const booking =
      record.booking;

    if (
      booking.status !==
      "confirmed"
    ) {
      return;
    }

    setUpdatingId(
      booking.id
    );

    setError("");

    try {
      const now =
        new Date().toISOString();

      const updatedBooking =
        await updateBooking(
          booking.id,
          {
            status:
              "completed",
            attended_at:
              booking.attended_at ??
              now,
            completed_at:
              booking.completed_at ??
              now,
            cancelled_at:
              null,
          }
        );

      const updatedRecord: BookingRecord =
        {
          ...record,
          booking:
            updatedBooking,
        };

      await createRegistrationFollowUp(
        updatedRecord
      );

      setRecords((current) =>
        current.map(
          (item) =>
            item.booking.id ===
            booking.id
              ? updatedRecord
              : item
        )
      );

      setSelectedBooking(
        null
      );
    } catch (err) {
      console.error(
        "Attended action error:",
        err
      );

      setError(
        err &&
        typeof err ===
          "object" &&
        "message" in err
          ? String(
              (
                err as {
                  message: string;
                }
              ).message
            )
          : "We couldn't mark this trial as attended."
      );
    } finally {
      setUpdatingId(null);
    }
  }

  /*
   * =========================================================
   * BOOKED / REGISTERED
   *
   * This means:
   *
   * "The learner has decided to become a student."
   *
   * We:
   *
   * 1. Create/reuse student.
   * 2. Mark trial completed.
   * 3. Record attendance if missing.
   * 4. Open Students.
   *
   * Enrollment/programme/payment remains in Students.
   * =========================================================
   */

  
          
        async function markBooked(
  record: BookingRecord
) {
  const booking = record.booking;

  if (
    booking.status !== "confirmed" &&
    booking.status !== "completed"
  ) {
    return;
  }

  setUpdatingId(booking.id);
  setError("");

  try {
    /*
     * =====================================================
     * CREATE / REUSE STUDENT
     * =====================================================
     *
     * The shared registration service handles:
     * - finding an existing student
     * - creating a new student when necessary
     * - linking the student to the lead
     *
     * Do this FIRST so a failed registration does not
     * change the booking status.
     */

    const lead = record.lead;

    if (!lead) {
      throw new Error(
        "This booking has no linked lead."
      );
    }

    await ensureStudentFromLead({
      leadId: lead.id,
      fullName: lead.full_name,
      email: lead.email,
      whatsappNumber:
        lead.whatsapp_number,
    });

    /*
     * =====================================================
     * MARK BOOKING COMPLETED
     * =====================================================
     */

    const now =
      new Date().toISOString();

    const updatedBooking =
      await updateBooking(
        booking.id,
        {
          status: "completed",

          attended_at:
            booking.attended_at ??
            now,

          completed_at:
            booking.completed_at ??
            now,

          cancelled_at: null,
        }
      );

    const updatedRecord:
      BookingRecord = {
        ...record,
        booking:
          updatedBooking,
      };

    /*
     * Update local state.
     */

    setRecords((current) =>
      current.map(
        (item) =>
          item.booking.id ===
          booking.id
            ? updatedRecord
            : item
      )
    );

    /*
     * Close booking details.
     */

    setSelectedBooking(null);

    /*
     * Student now exists.
     * Continue registration inside Students.
     */

    router.push(
      "/admin/students"
    );
  } catch (err) {
    console.error(
      "Booked action error:",
      err
    );

    setError(
      err &&
      typeof err === "object" &&
      "message" in err
        ? String(
            (
              err as {
                message: string;
              }
            ).message
          )
        : "We couldn't register this learner as a student."
    );
  } finally {
    setUpdatingId(null);
  }
}

  /*
   * =========================================================
   * MISSED TRIAL
   * =========================================================
   */

  async function markMissedTrial(
    record: BookingRecord
  ) {
    const booking =
      record.booking;

    if (
      booking.status !==
      "confirmed"
    ) {
      return;
    }

    setUpdatingId(
      booking.id
    );

    setError("");

    try {
      const updatedBooking =
        await updateBooking(
          booking.id,
          {
            status:
              "no_show",
            attended_at:
              null,
            completed_at:
              null,
            cancelled_at:
              null,
          }
        );

      const updatedRecord: BookingRecord =
        {
          ...record,
          booking:
            updatedBooking,
        };

      await createRescheduleFollowUp(
        updatedRecord
      );

      setRecords((current) =>
        current.map(
          (item) =>
            item.booking.id ===
            booking.id
              ? updatedRecord
              : item
        )
      );

      setSelectedBooking(
        null
      );
    } catch (err) {
      console.error(
        "Missed trial action error:",
        err
      );

      setError(
        err &&
        typeof err ===
          "object" &&
        "message" in err
          ? String(
              (
                err as {
                  message: string;
                }
              ).message
            )
          : "We couldn't mark this trial as missed."
      );
    } finally {
      setUpdatingId(null);
    }
  }

  /*
   * =========================================================
   * CALL
   * =========================================================
   */

  function callLearner(
    record: BookingRecord
  ) {
    const phone =
      record.lead
        ?.whatsapp_number;

    if (!phone) {
      return;
    }

    window.location.href =
      `tel:${phone}`;
  }

  /*
   * =========================================================
   * WHATSAPP
   * =========================================================
   */

  function openWhatsApp(
    record: BookingRecord
  ) {
    const phone =
      record.lead
        ?.whatsapp_number;

    if (!phone) {
      return;
    }

    const cleanPhone =
      phone.replace(
        /[^0-9]/g,
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
      `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
        message
      )}`,
      "_blank"
    );
  }

  /*
   * =========================================================
   * CALENDAR
   * =========================================================
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

  /*
   * =========================================================
   * RENDER
   * =========================================================
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
            Manage trial learners from booking
            through attendance, registration and
            rescheduling.
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
                Attended
              </p>

              <p className="mt-3 mb-0 text-[30px] font-bold leading-none text-blue-700">
                {stats.completed}
              </p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-700">
              <UserCheck size={18} />
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
              label: "Attended",
            },
            {
              key: "cancelled",
              label: "Cancelled",
            },
            {
              key: "no_show",
              label: "Missed",
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
        <div className="mt-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">

          <XCircle
            size={15}
            className="mt-0.5 shrink-0 text-red-600"
          />

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

                const isUpdating =
                  updatingId ===
                  booking.id;

                const canAct =
                  booking.status ===
                  "confirmed";

                return (
                  <div
                    key={booking.id}
                    className={`st-card overflow-hidden p-0 transition-all ${
                      canAct
                        ? "hover:border-[var(--st-red)]"
                        : ""
                    }`}
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
                                  Ã‚Â·{" "}
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

                      </div>

                      {/* =================================================
                          TRIAL OUTCOME
                      ================================================= */}

                      <div className="mt-5 border-t border-[var(--st-border)] pt-4">

                        <p className="mb-3 text-[8px] font-bold uppercase tracking-[0.1em] text-[var(--st-gray)]">
                          TRIAL OUTCOME
                        </p>

                        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">

                          {/* BOOKED */}

                          <button
                            type="button"
                            disabled={
                              !canAct ||
                              isUpdating
                            }
                            onClick={() =>
                              markBooked(
                                record
                              )
                            }
                            className="flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-[var(--st-red)] px-3 py-3 text-[9px] font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {isUpdating ? (
                              <RefreshCw
                                size={14}
                                className="animate-spin"
                              />
                            ) : (
                              <UserPlus
                                size={14}
                              />
                            )}

                            Booked
                          </button>

                          {/* CALL */}

                          <button
                            type="button"
                            disabled={
                              !lead?.whatsapp_number
                            }
                            onClick={() =>
                              callLearner(
                                record
                              )
                            }
                            className="flex min-h-[46px] items-center justify-center gap-2 rounded-xl border border-[var(--st-border)] bg-white px-3 py-3 text-[9px] font-bold text-[var(--st-charcoal-dark)] transition hover:border-[var(--st-red)] disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Phone
                              size={14}
                            />

                            Call
                          </button>

                          {/* ATTENDED */}

                          <button
                            type="button"
                            disabled={
                              !canAct ||
                              isUpdating
                            }
                            onClick={() =>
                              markAttended(
                                record
                              )
                            }
                            className="flex min-h-[46px] items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-3 text-[9px] font-bold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {isUpdating ? (
                              <RefreshCw
                                size={14}
                                className="animate-spin"
                              />
                            ) : (
                              <UserCheck
                                size={14}
                              />
                            )}

                            Attended
                          </button>

                          {/* MISSED */}

                          <button
                            type="button"
                            disabled={
                              !canAct ||
                              isUpdating
                            }
                            onClick={() =>
                              markMissedTrial(
                                record
                              )
                            }
                            className="flex min-h-[46px] items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-[9px] font-bold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {isUpdating ? (
                              <RefreshCw
                                size={14}
                                className="animate-spin"
                              />
                            ) : (
                              <UserX
                                size={14}
                              />
                            )}

                            Missed trial
                          </button>

                        </div>

                      </div>

                      {/* VIEW */}

                      <button
                        type="button"
                        onClick={() =>
                          setSelectedBooking(
                            record
                          )
                        }
                        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--st-bg-soft)] px-3 py-3 text-[9px] font-bold text-[var(--st-gray)] transition hover:text-[var(--st-charcoal-dark)]"
                      >
                        View booking details
                        <ArrowRight
                          size={13}
                        />
                      </button>

                    </div>

                  </div>
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

            {/* HEADER */}

            <div className="sticky top-0 z-10 border-b border-[var(--st-border)] bg-white px-5 py-4">

              <div className="flex items-center justify-between gap-4">

                <div className="flex min-w-0 items-center gap-3">

                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--st-bg-soft)] text-[10px] font-bold text-[var(--st-red)]">
                    {selectedBooking.lead
                      ? initials(
                          selectedBooking
                            .lead
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
                  onClick={() =>
                    setSelectedBooking(
                      null
                    )
                  }
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
                      .booking
                      .instrument
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

              {/* CURRENT OUTCOME */}

              <div className="mt-5">

                <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--st-gray)]">
                  TRIAL OUTCOME
                </p>

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
                        WhatsApp / Phone
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

              {/* REMINDERS */}

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

              {/* =================================================
                  TRIAL OUTCOME ACTIONS
              ================================================= */}

              {selectedBooking.booking
                .status ===
                "confirmed" && (
                <div className="mt-6">

                  <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--st-gray)]">
                    TRIAL OUTCOME
                  </p>

                  <div className="grid grid-cols-2 gap-2">

                    {/* BOOKED */}

                    <button
                      type="button"
                      disabled={
                        updatingId ===
                        selectedBooking
                          .booking
                          .id
                      }
                      onClick={() =>
                        markBooked(
                          selectedBooking
                        )
                      }
                      className="st-button st-button-primary w-full disabled:opacity-50"
                    >
                      {updatingId ===
                      selectedBooking
                        .booking.id ? (
                        <RefreshCw
                          size={14}
                          className="animate-spin"
                        />
                      ) : (
                        <UserPlus
                          size={14}
                        />
                      )}

                      Booked
                    </button>

                    {/* CALL */}

                    <button
                      type="button"
                      disabled={
                        !selectedBooking
                          .lead
                          ?.whatsapp_number
                      }
                      onClick={() =>
                        callLearner(
                          selectedBooking
                        )
                      }
                      className="st-button st-button-secondary w-full disabled:opacity-40"
                    >
                      <Phone size={14} />
                      Call
                    </button>

                    {/* ATTENDED */}

                    <button
                      type="button"
                      disabled={
                        updatingId ===
                        selectedBooking
                          .booking
                          .id
                      }
                      onClick={() =>
                        markAttended(
                          selectedBooking
                        )
                      }
                      className="w-full rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-[9px] font-bold text-blue-700 disabled:opacity-50"
                    >
                      <span className="inline-flex items-center gap-2">
                        <UserCheck
                          size={14}
                        />
                        Attended
                      </span>
                    </button>

                    {/* MISSED */}

                    <button
                      type="button"
                      disabled={
                        updatingId ===
                        selectedBooking
                          .booking
                          .id
                      }
                      onClick={() =>
                        markMissedTrial(
                          selectedBooking
                        )
                      }
                      className="w-full rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[9px] font-bold text-amber-700 disabled:opacity-50"
                    >
                      <span className="inline-flex items-center gap-2">
                        <UserX
                          size={14}
                        />
                        Missed trial
                      </span>
                    </button>

                  </div>

                </div>
              )}

              {/* COMMUNICATION */}

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
                    size={14}
                  />
                  WhatsApp
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
                    size={14}
                  />
                  Calendar
                </button>

              </div>

              {/* CLOSE */}

           <button
  type="button"
  onClick={() => setSelectedBooking(null)}
  className="mt-2 w-full rounded-xl px-4 py-3 text-[9px] font-bold text-gray-500 transition hover:bg-gray-100"
>
  Close
</button>

{/* BOOKING ID */}

<div className="mt-6 border-t border-[var(--st-border)] pt-4">

  <p className="m-0 text-[9px] text-[var(--st-gray)]">
    Booking ID
  </p>

  <p className="mt-1 mb-0 break-all font-mono text-[8px] text-[var(--st-gray)]">
    {selectedBooking.booking.id}
  </p>

</div>

</div>
</div>
</div>
)}

</main>
);
}


