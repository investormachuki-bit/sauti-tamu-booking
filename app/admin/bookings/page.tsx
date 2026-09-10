"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  Edit3,
  MessageSquare,
  Mail,
  MessageCircle,
  Phone,
  RefreshCw,
  Search,
  Save,
  User,
  UserCheck,
  UserPlus,
  UserX,
  X,
  XCircle,
} from "lucide-react";

import { useRouter } from "next/navigation";

import RegistrationModal, {
  RegistrationFormValues,
  RegistrationModalMode,
} from "../../../components/students/RegistrationModal";

import { supabase } from "@/lib/supabase";

/*
 * =========================================================
 * TYPES
 * =========================================================
 */

type BookingStatus =
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no_show";

type Instrument =
  | "piano"
  | "guitar";

type BookingFilter =
  | "today"
  | "tomorrow"
  | "all"
  | "confirmed"
  | "completed"
  | "booked"
  | "registered"
  | "cancelled"
  | "no_show";

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
  called_at: string | null;
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

type EnrollmentStatus =
  | "registered"
  | "active"
  | "paused"
  | "inactive"
  | "completed";

type StudentSummary = {
  id: string;
  lead_id: string;
  status: string;
} | null;

type EnrollmentSummary = {
  id: string;
  student_id: string;
  instrument: Instrument;
  programme_name: string;
  status: EnrollmentStatus;
  planned_start_date: string | null;
  actual_start_date: string | null;
  total_fee: number | null;
  created_at: string;
} | null;

type BookingRecord = {
  booking: Booking;
  lead: Lead | null;
  slot: LessonSlot | null;
  student: StudentSummary;
  enrollment: EnrollmentSummary;
};

type BookingCallLog = {
  id: string;
  booking_id: string;
  lead_id: string;
  called_at: string;
  notes: string | null;
  outcome: string | null;
  created_at: string;
};

const CALL_OUTCOMES = [
  { value: "called", label: "Call logged" },
  { value: "no_answer", label: "No answer" },
  { value: "interested", label: "Interested" },
  { value: "wants_to_register", label: "Wants to register" },
  { value: "wants_to_think", label: "Wants to think" },
  { value: "call_back_later", label: "Call back later" },
  { value: "not_interested", label: "Not interested" },
  { value: "already_registered", label: "Already registered" },
  { value: "wrong_number", label: "Wrong number" },
  { value: "other", label: "Other" },
];

function callOutcomeLabel(outcome: string | null) {
  if (!outcome) {
    return "Not recorded";
  }

  return (
    CALL_OUTCOMES.find(
      (item) => item.value === outcome
    )?.label ?? outcome
  );
}

type FollowUpTaskType =
  | "post_trial_follow_up"
  | "trial_reschedule_follow_up";

const NAIROBI_TIME_ZONE = "Africa/Nairobi";

/*
 * =========================================================
 * FILTER CONFIG
 * =========================================================
 */

const FILTER_LABELS: Record<
  BookingFilter,
  string
> = {
  today: "TODAY",
  tomorrow: "TOMORROW",
  all: "ALL",
  confirmed: "CONFIRMED",
  completed: "ATTENDED",
  booked: "BOOKED",
  registered: "REGISTERED",
  cancelled: "CANCELLED",
  no_show: "MISSED",
};

const FILTER_BUTTONS: Array<{
  key: BookingFilter;
  label: string;
  color: string;
}> = [
  {
    key: "today",
    label: "Today",
    color: "bg-blue-600 text-white",
  },
  {
    key: "tomorrow",
    label: "Tomorrow",
    color: "bg-violet-600 text-white",
  },
  {
    key: "all",
    label: "All",
    color: "bg-slate-900 text-white",
  },
  {
    key: "confirmed",
    label: "Confirmed",
    color: "bg-emerald-500 text-white",
  },
  {
    key: "completed",
    label: "Attended",
    color: "bg-cyan-600 text-white",
  },
  {
    key: "booked",
    label: "Booked",
    color: "bg-orange-500 text-white",
  },
  {
    key: "registered",
    label: "Registered",
    color: "bg-amber-500 text-white",
  },
  {
    key: "cancelled",
    label: "Cancelled",
    color: "bg-red-600 text-white",
  },
  {
    key: "no_show",
    label: "Missed",
    color: "bg-fuchsia-600 text-white",
  },
];

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

function getNairobiDateKeyOffset(days: number) {
  const todayKey = getNairobiDateKey(
    new Date()
  );

  const base = new Date(
    `${todayKey}T12:00:00+03:00`
  );

  base.setDate(
    base.getDate() + days
  );

  return getNairobiDateKey(base);
}

function getNairobiStartOfToday() {
  const today = getNairobiDateKey(
    new Date()
  );

  return new Date(
    `${today}T00:00:00+03:00`
  );
}

function getNairobiEndOfToday() {
  const today = getNairobiDateKey(
    new Date()
  );

  const date = new Date(
    `${today}T00:00:00+03:00`
  );

  date.setDate(
    date.getDate() + 1
  );

  return date;
}

function formatDate(dateString: string) {
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

function formatTime(dateString: string) {
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

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map(
      (word) => word[0]
    )
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function instrumentLabel(
  instrument: Instrument
) {
  return (
    instrument.charAt(0).toUpperCase() +
    instrument.slice(1)
  );
}

/*
 * =========================================================
 * BOOKING STATUS HELPERS
 * =========================================================
 */

function prettyStatus(
  status: BookingStatus
) {
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

/*
 * =========================================================
 * ENROLLMENT HELPERS
 * =========================================================
 */

function enrollmentLabel(
  enrollment: EnrollmentSummary
) {
  if (!enrollment) {
    return "Not enrolled";
  }

  switch (enrollment.status) {
    case "active":
      return "Booked";

    case "registered":
      return "Registered";

    case "paused":
      return "Paused";

    case "completed":
      return "Completed";

    case "inactive":
      return "Inactive";

    default:
      return enrollment.status;
  }
}

function enrollmentClasses(
  enrollment: EnrollmentSummary
) {
  if (!enrollment) {
    return "bg-gray-50 text-gray-600";
  }

  switch (enrollment.status) {
    case "active":
      return "bg-orange-50 text-orange-700";

    case "registered":
      return "bg-amber-50 text-amber-700";

    case "paused":
      return "bg-purple-50 text-purple-700";

    case "completed":
      return "bg-blue-50 text-blue-700";

    default:
      return "bg-gray-50 text-gray-600";
  }
}

function enrollmentPriority(
  status: EnrollmentStatus
) {
  switch (status) {
    case "active":
      return 0;

    case "registered":
      return 1;

    case "paused":
      return 2;

    case "inactive":
      return 3;

    case "completed":
      return 4;

    default:
      return 99;
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
    useState<BookingFilter>("all");

  const [selectedBooking, setSelectedBooking] =
    useState<BookingRecord | null>(null);

  const [updatingId, setUpdatingId] =
    useState<string | null>(null);

  const [callLogsByBooking, setCallLogsByBooking] =
    useState<Record<string, BookingCallLog[]>>({});

  const [editingCallId, setEditingCallId] =
    useState<string | null>(null);

  const [callNotesDraft, setCallNotesDraft] =
    useState("");

  const [callOutcomeDraft, setCallOutcomeDraft] =
    useState("called");

  const [savingCallId, setSavingCallId] =
    useState<string | null>(null);

  /*
   * =========================================================
   * REGISTRATION MODAL
   * =========================================================
   */

  const [
    registrationModalOpen,
    setRegistrationModalOpen,
  ] = useState(false);

  const [
    registrationModalMode,
    setRegistrationModalMode,
  ] =
    useState<RegistrationModalMode>(
      "register"
    );

  const [
    registrationBooking,
    setRegistrationBooking,
  ] =
    useState<BookingRecord | null>(
      null
    );

  const [registering, setRegistering] =
    useState(false);

  const [
    registrationError,
    setRegistrationError,
  ] = useState("");

  /*
   * =========================================================
   * LOAD BOOKINGS
   * =========================================================
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
            called_at,
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

      const bookings =
        (bookingData ??
          []) as Booking[];

      if (bookings.length === 0) {
        setRecords([]);
        setCallLogsByBooking({});
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

      const bookingIds = bookings.map(
        (booking) => booking.id
      );

      const [
        leadsResult,
        slotsResult,
        callLogsResult,
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

        supabase
          .from("booking_call_logs")
          .select(
            `
              id,
              booking_id,
              lead_id,
              called_at,
              notes,
              outcome,
              created_at
            `
          )
          .in("booking_id", bookingIds)
          .order("called_at", {
            ascending: false,
          }),
      ]);

      if (leadsResult.error) {
        throw leadsResult.error;
      }

      if (slotsResult.error) {
        throw slotsResult.error;
      }

      if (callLogsResult.error) {
        throw callLogsResult.error;
      }

      const callLogs =
        (callLogsResult.data ??
          []) as BookingCallLog[];

      const callLogsMap: Record<
        string,
        BookingCallLog[]
      > = {};

      callLogs.forEach((call) => {
        if (!callLogsMap[call.booking_id]) {
          callLogsMap[call.booking_id] = [];
        }

        callLogsMap[call.booking_id].push(
          call
        );
      });

      setCallLogsByBooking(
        callLogsMap
      );

      const leads =
        (leadsResult.data ??
          []) as Lead[];

      const slots =
        (slotsResult.data ??
          []) as LessonSlot[];

      const leadMap =
        new Map<string, Lead>();

      leads.forEach((lead) => {
        leadMap.set(
          lead.id,
          lead
        );
      });

      const slotMap =
        new Map<
          string,
          LessonSlot
        >();

      slots.forEach((slot) => {
        slotMap.set(
          slot.id,
          slot
        );
      });

      /*
       * -------------------------------------------------------
       * STUDENTS
       * -------------------------------------------------------
       */

      const [
        studentsResult,
      ] = await Promise.all([
        leadIds.length > 0
          ? supabase
              .from("students")
              .select(
                `
                  id,
                  lead_id,
                  status
                `
              )
              .in(
                "lead_id",
                leadIds
              )
          : Promise.resolve({
              data: [],
              error: null,
            }),
      ]);

      if (studentsResult.error) {
        throw studentsResult.error;
      }

      const students =
        (studentsResult.data ??
          []) as Array<{
          id: string;
          lead_id: string;
          status: string;
        }>;

      const studentMap =
        new Map<
          string,
          StudentSummary
        >();

      students.forEach(
        (student) => {
          studentMap.set(
            student.lead_id,
            {
              id: student.id,
              lead_id:
                student.lead_id,
              status:
                student.status,
            }
          );
        }
      );

      /*
       * -------------------------------------------------------
       * ENROLLMENTS
       * -------------------------------------------------------
       *
       * We deliberately load all relevant enrollments in one
       * query rather than doing an N+1 query for every booking.
       *
       * Active = BOOKED
       * Registered = REGISTERED
       */

      const studentIds =
        students.map(
          (student) =>
            student.id
        );

      const enrollmentsResult =
        studentIds.length > 0
          ? await supabase
              .from(
                "student_enrollments"
              )
              .select(
                `
                  id,
                  student_id,
                  instrument,
                  programme_name,
                  status,
                  planned_start_date,
                  actual_start_date,
                  total_fee,
                  created_at
                `
              )
              .in(
                "student_id",
                studentIds
              )
          : {
              data: [],
              error: null,
            };

      if (enrollmentsResult.error) {
        throw enrollmentsResult.error;
      }

      const enrollments =
        (enrollmentsResult.data ??
          []) as Array<{
          id: string;
          student_id: string;
          instrument: Instrument;
          programme_name: string;
          status: EnrollmentStatus;
          planned_start_date:
            | string
            | null;
          actual_start_date:
            | string
            | null;
          total_fee:
            | number
            | null;
          created_at: string;
        }>;

      /*
       * For each student + instrument, keep the enrollment
       * representing the current lifecycle state.
       *
       * Priority:
       * active -> registered -> paused -> inactive/completed
       * then newest created_at.
       */

      const enrollmentMap =
        new Map<
          string,
          EnrollmentSummary
        >();

      enrollments.forEach(
        (enrollment) => {
          const key = `${enrollment.student_id}:${enrollment.instrument}`;

          const existing =
            enrollmentMap.get(
              key
            );

          if (!existing) {
            enrollmentMap.set(
              key,
              enrollment
            );
            return;
          }

          const currentPriority =
            enrollmentPriority(
              enrollment.status
            );

          const existingPriority =
            enrollmentPriority(
              existing.status
            );

          if (
            currentPriority <
            existingPriority
          ) {
            enrollmentMap.set(
              key,
              enrollment
            );
            return;
          }

          if (
            currentPriority ===
              existingPriority &&
            new Date(
              enrollment.created_at
            ).getTime() >
              new Date(
                existing.created_at
              ).getTime()
          ) {
            enrollmentMap.set(
              key,
              enrollment
            );
          }
        }
      );

      const loadedRecords =
        bookings.map(
          (booking) => {
            const lead =
              leadMap.get(
                booking.lead_id
              ) ?? null;

            const student =
              lead
                ? studentMap.get(
                    lead.id
                  ) ?? null
                : null;

            const enrollment =
              student
                ? enrollmentMap.get(
                    `${student.id}:${booking.instrument}`
                  ) ?? null
                : null;

            return {
              booking,
              lead,
              slot:
                slotMap.get(
                  booking.slot_id
                ) ?? null,
              student,
              enrollment,
            };
          }
        );

      setRecords(
        loadedRecords
      );
    } catch (err) {
      console.error(
        "Booking load error:",
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
          : "We couldn't load bookings. Please try again."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
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

      const todayKey =
        getNairobiDateKey(
          new Date()
        );

      const tomorrowKey =
        getNairobiDateKeyOffset(1);

      return records.filter(
        (record) => {
          const booking =
            record.booking;

          const lead =
            record.lead;

          const slot =
            record.slot;

          const slotDateKey =
            slot
              ? getNairobiDateKey(
                  new Date(
                    slot.starts_at
                  )
                )
              : null;

          /*
           * ---------------------------------------------------
           * FILTER
           * ---------------------------------------------------
           */

          switch (filter) {
            case "today":
              if (
                slotDateKey !==
                todayKey
              ) {
                return false;
              }
              break;

            case "tomorrow":
              if (
                slotDateKey !==
                tomorrowKey
              ) {
                return false;
              }
              break;

            case "confirmed":
            case "completed":
            case "cancelled":
            case "no_show":
              if (
                booking.status !==
                filter
              ) {
                return false;
              }
              break;

            case "booked":
              if (
                record.enrollment
                  ?.status !==
                "active"
              ) {
                return false;
              }
              break;

            case "registered":
              if (
                record.enrollment
                  ?.status !==
                "registered"
              ) {
                return false;
              }
              break;

            case "all":
            default:
              break;
          }

          /*
           * ---------------------------------------------------
           * SEARCH
           * ---------------------------------------------------
           */

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
            prettyStatus(
              booking.status
            ),
            record.enrollment
              ? enrollmentLabel(
                  record.enrollment
                )
              : "",
            record.enrollment
              ?.programme_name ?? "",
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
      records.filter(
        (record) => {
          if (!record.slot) {
            return false;
          }

          const time =
            new Date(
              record.slot.starts_at
            ).getTime();

          return (
            time >=
              todayStartMs &&
            time <
              todayEndMs
          );
        }
      ).length;

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
      records.filter(
        (record) => {
          if (!record.slot) {
            return false;
          }

          if (
            record.booking
              .status ===
              "cancelled" ||
            record.booking
              .status ===
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
        }
      ).length;

    return {
      todayTrials,
      confirmed,
      completed,
      upcoming,
    };
  }, [records]);

  /*
   * =========================================================
   * FOLLOW-UP HELPERS
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

    const { error } =
      await supabase
        .from("follow_up_tasks")
        .insert({
          lead_id: lead.id,
          booking_id:
            booking.id,
          task_type:
            "post_trial_follow_up",
          due_at: dueAt,
          status: "pending",
          channel: null,
          message_template:
            `Trial attended — follow up with ${lead.full_name} regarding registration after the ${booking.instrument} trial on ${lessonText}.`,
          sent_at: null,
          completed_at: null,
        });

    if (error) {
      throw error;
    }
  }

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

    const { error } =
      await supabase
        .from("follow_up_tasks")
        .insert({
          lead_id: lead.id,
          booking_id:
            booking.id,
          task_type:
            "trial_reschedule_follow_up",
          due_at:
            new Date().toISOString(),
          status: "pending",
          channel: null,
          message_template:
            `${
              booking.status ===
              "cancelled"
                ? "Cancelled trial"
                : "Missed trial"
            } — contact ${lead.full_name} to reschedule their ${booking.instrument} trial lesson.`,
          sent_at: null,
          completed_at: null,
        });

    if (error) {
      throw error;
    }
  }

  /*
   * =========================================================
   * MARK ATTENDED
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
      const {
        data,
        error: rpcError,
      } = await supabase.rpc(
        "mark_trial_attended",
        {
          p_booking_id:
            booking.id,
        }
      );

      if (rpcError) {
        throw rpcError;
      }

      console.log(
        "mark_trial_attended:",
        data
      );

      await loadBookings(true);

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
          typeof err === "object" &&
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
   * MARK MISSED
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
      const {
        data,
        error: rpcError,
      } = await supabase.rpc(
        "mark_trial_missed",
        {
          p_booking_id:
            booking.id,
        }
      );

      if (rpcError) {
        throw rpcError;
      }

      console.log(
        "mark_trial_missed:",
        data
      );

      await loadBookings(true);

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
          typeof err === "object" &&
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
   * MARK CANCELLED
   * =========================================================
   */

  async function markCancelled(
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
      const {
        data,
        error: rpcError,
      } = await supabase.rpc(
        "mark_trial_cancelled",
        {
          p_booking_id:
            booking.id,
        }
      );

      if (rpcError) {
        throw rpcError;
      }

      console.log(
        "mark_trial_cancelled:",
        data
      );

      await loadBookings(true);

      setSelectedBooking(
        null
      );
    } catch (err) {
      console.error(
        "Cancelled action error:",
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
          : "We couldn't cancel this trial."
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

  async function callLearner(
    record: BookingRecord
  ) {
    const phone =
      record.lead
        ?.whatsapp_number;

    if (!phone) {
      setError(
        "This learner has no phone number."
      );

      return;
    }

    setError("");

    try {
      const {
        error: rpcError,
      } = await supabase.rpc(
        "record_booking_call",
        {
          p_booking_id:
            record.booking.id,
          p_notes:
            "Call initiated from Booking page.",
          p_outcome:
            "called",
        }
      );

      if (rpcError) {
        throw rpcError;
      }

      await loadBookings(true);

      window.location.href =
        `tel:${phone}`;
    } catch (err) {
      console.error(
        "Call logging error:",
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
          : "We couldn't log this call."
      );
    }
  }

  function startEditingCall(
    call: BookingCallLog
  ) {
    setEditingCallId(call.id);
    setCallNotesDraft(
      call.notes ===
        "Call initiated from Booking page."
        ? ""
        : call.notes ?? ""
    );
    setCallOutcomeDraft(
      call.outcome ?? "called"
    );
  }

  function cancelEditingCall() {
    setEditingCallId(null);
    setCallNotesDraft("");
    setCallOutcomeDraft("called");
  }

  async function saveCallResponse(
    callId: string
  ) {
    setSavingCallId(callId);
    setError("");

    try {
      const {
        error: rpcError,
      } = await supabase.rpc(
        "update_booking_call_log",
        {
          p_call_id: callId,
          p_notes:
            callNotesDraft.trim() ||
            null,
          p_outcome:
            callOutcomeDraft || null,
        }
      );

      if (rpcError) {
        throw rpcError;
      }

      cancelEditingCall();
      await loadBookings(true);
    } catch (err) {
      console.error(
        "Call response save error:",
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
          : "We couldn't save the call response."
      );
    } finally {
      setSavingCallId(null);
    }
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
   * LIFECYCLE ACTION RULES
   * =========================================================
   *
   * CONFIRMED
   *   -> BOOKED
   *   -> ATTENDED
   *   -> MISSED
   *   -> CANCELLED
   *
   * ATTENDED
   *   -> BOOKED
   *   -> REGISTERED
   *
   * REGISTERED
   *   -> BOOKED
   *
   * ACTIVE enrollment
   *   -> already BOOKED; no duplicate BOOKED
   *
   * Backend RPCs remain authoritative.
   */

  function getLifecycleActions(
    record: BookingRecord
  ) {
    const status =
      record.booking.status;

    const enrollment =
      record.enrollment;

    const isConfirmed =
      status === "confirmed";

    const isCompleted =
      status === "completed";

    const isBooked =
      enrollment?.status ===
      "active";

    const isRegistered =
      enrollment?.status ===
      "registered";

    const isPaused =
      enrollment?.status ===
      "paused";

    const canBook =
      !isBooked &&
      (
        isConfirmed ||
        isCompleted ||
        isRegistered ||
        isPaused
      );

    const canRegister =
      isCompleted &&
      !isBooked &&
      !isRegistered;

    return {
      isConfirmed,
      isCompleted,
      isBooked,
      isRegistered,
      isPaused,
      canBook,
      canRegister,
      canCall:
        isConfirmed ||
        isCompleted,
      canAttend:
        isConfirmed,
      canMiss:
        isConfirmed,
      canCancel:
        isConfirmed,
    };
  }

  /*
   * =========================================================
   * OPEN REGISTRATION MODAL
   * =========================================================
   */

  function openRegistration(
    record: BookingRecord
  ) {
    const actions =
      getLifecycleActions(
        record
      );

    if (!actions.canRegister) {
      return;
    }

    setRegistrationError("");

    setRegistrationBooking(
      record
    );

    setRegistrationModalMode(
      "register"
    );

    setRegistrationModalOpen(
      true
    );

    setSelectedBooking(
      null
    );
  }

  /*
   * =========================================================
   * OPEN BOOKED MODAL
   * =========================================================
   */

  function openBooked(
    record: BookingRecord
  ) {
    const actions =
      getLifecycleActions(
        record
      );

    if (!actions.canBook) {
      return;
    }

    setRegistrationError("");

    setRegistrationBooking(
      record
    );

    setRegistrationModalMode(
      "book"
    );

    setRegistrationModalOpen(
      true
    );

    setSelectedBooking(
      null
    );
  }

  /*
   * =========================================================
   * REGISTER LEARNER
   * =========================================================
   */

  async function registerLearner(
    values: RegistrationFormValues
  ) {
    const record =
      registrationBooking;

    if (!record) {
      throw new Error(
        "No booking selected."
      );
    }

    const actions =
      getLifecycleActions(
        record
      );

    if (!actions.canRegister) {
      throw new Error(
        "This booking is no longer eligible for registration."
      );
    }

    setRegistering(true);
    setRegistrationError("");
    setError("");

    try {
      const {
        data,
        error: rpcError,
      } = await supabase.rpc(
        "register_booking_student",
        {
          p_booking_id:
            record.booking.id,

          p_programme_name:
            values.programmeName,

          p_start_date:
            values.plannedStartDate,

          p_total_fee:
            Number(
              values.totalFee
            ),

          p_initial_payment:
            Number(
              values.initialPayment
            ),

          p_payment_method:
            values.paymentMethod,

          p_payment_reference:
            values.paymentReference ||
            null,

          p_notes:
            values.notes || null,
        }
      );

      if (rpcError) {
        throw rpcError;
      }

      console.log(
        "register_booking_student:",
        data
      );

      setRegistrationModalOpen(
        false
      );

      setRegistrationBooking(
        null
      );

      setRegistrationError("");

      await loadBookings(true);
    } catch (err) {
      console.error(
        "Registration error:",
        err
      );

      const message =
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
          : "We couldn't register this learner.";

      setRegistrationError(
        message
      );

      throw err;
    } finally {
      setRegistering(false);
    }
  }

  /*
   * =========================================================
   * BOOK LEARNER
   * =========================================================
   */

  async function bookLearner(
    values: RegistrationFormValues
  ) {
    const record =
      registrationBooking;

    if (!record) {
      throw new Error(
        "No booking selected."
      );
    }

    const actions =
      getLifecycleActions(
        record
      );

    if (!actions.canBook) {
      throw new Error(
        actions.isBooked
          ? "This learner is already BOOKED. The existing active enrollment must not be duplicated."
          : "This booking is no longer eligible to be booked."
      );
    }

    setRegistering(true);
    setRegistrationError("");
    setError("");

    try {
      let enrollmentId:
        | string
        | null = null;

      /*
       * Prefer the enrollment already loaded with this
       * booking. This is important for REGISTERED -> BOOKED.
       */

      if (
        record.enrollment &&
        (
          record.enrollment
            .status ===
            "registered" ||
          record.enrollment
            .status ===
            "paused"
        )
      ) {
        enrollmentId =
          record.enrollment.id;
      } else if (
        record.student?.id
      ) {
        /*
         * Fallback query in case the page state changed
         * between opening the modal and submitting it.
         */

        const {
          data: enrollment,
          error:
            enrollmentError,
        } = await supabase
          .from(
            "student_enrollments"
          )
          .select(
            `
              id,
              student_id,
              instrument,
              programme_name,
              status,
              planned_start_date,
              actual_start_date,
              total_fee,
              created_at
            `
          )
          .eq(
            "student_id",
            record.student.id
          )
          .eq(
            "instrument",
            record.booking
              .instrument
          )
          .in("status", [
            "registered",
            "paused",
            "active",
          ])
          .order(
            "created_at",
            {
              ascending:
                false,
            }
          )
          .limit(1)
          .maybeSingle();

        if (enrollmentError) {
          throw enrollmentError;
        }

        if (
          enrollment?.status ===
          "active"
        ) {
          throw new Error(
            "This learner is already BOOKED. The existing active enrollment must not be duplicated."
          );
        }

        enrollmentId =
          enrollment?.id ??
          null;
      }

      /*
       * The backend remains authoritative here.
       *
       * null enrollment:
       *   direct confirmed/completed -> BOOKED
       *
       * registered enrollment:
       *   REGISTERED -> BOOKED
       *
       * paused enrollment:
       *   PAUSED -> BOOKED
       */

      const {
        data,
        error: rpcError,
      } = await supabase.rpc(
        "book_booking_student",
        {
          p_booking_id:
            record.booking.id,

          p_programme_name:
            values.programmeName,

          p_start_date:
            values.plannedStartDate,

          p_total_fee:
            Number(
              values.totalFee
            ),

          p_initial_payment:
            Number(
              values.initialPayment
            ),

          p_payment_method:
            values.paymentMethod,

          p_payment_reference:
            values.paymentReference ||
            null,

          p_notes:
            values.notes || null,

          p_enrollment_id:
            enrollmentId,
        }
      );

      if (rpcError) {
        throw rpcError;
      }

      console.log(
        "book_booking_student:",
        data
      );

      setRegistrationModalOpen(
        false
      );

      setRegistrationBooking(
        null
      );

      setRegistrationError("");

      await loadBookings(true);

      router.push(
        "/admin/students"
      );
    } catch (err) {
      console.error(
        "Booked action error:",
        err
      );

      const message =
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
          : "We couldn't start learning for this learner.";

      setRegistrationError(
        message
      );

      throw err;
    } finally {
      setRegistering(false);
    }
  }

  /*
   * =========================================================
   * REGISTRATION MODAL SUBMIT ROUTER
   * =========================================================
   */

  async function handleRegistrationSubmit(
    values: RegistrationFormValues
  ) {
    if (
      registrationModalMode ===
      "register"
    ) {
      return registerLearner(
        values
      );
    }

    return bookLearner(
      values
    );
  }

  /*
   * =========================================================
   * CLOSE REGISTRATION MODAL
   * =========================================================
   */

  function closeRegistrationModal() {
    if (registering) {
      return;
    }

    setRegistrationModalOpen(
      false
    );

    setRegistrationBooking(
      null
    );

    setRegistrationError("");
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
            through attendance, registration,
            learning and rescheduling.
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

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">

          {FILTER_BUTTONS.map(
            (item) => {
              const active =
                filter ===
                item.key;

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() =>
                    setFilter(
                      item.key
                    )
                  }
                  className={[
                    "min-h-[44px] rounded-xl px-3 py-3 text-[10px] font-bold transition",
                    item.color,
                    active
                      ? "scale-[1.02] ring-2 ring-black ring-offset-2"
                      : "opacity-90 hover:opacity-100",
                  ].join(" ")}
                >
                  {item.label}
                </button>
              );
            }
          )}

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
            {FILTER_LABELS[filter]} BOOKINGS
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

                const actions =
                  getLifecycleActions(
                    record
                  );

                return (
                  <div
                    key={
                      booking.id
                    }
                    className="st-card overflow-hidden p-0 transition-all"
                  >

                    <div className="p-5">

                      {/* HEADER */}

                      <div className="flex items-start gap-4">

                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--st-bg-soft)] text-[10px] font-bold text-[var(--st-red)]">
                          {lead
                            ? initials(
                                lead.full_name
                              )
                            : "BK"}
                        </div>

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

                            <div className="flex flex-wrap items-center gap-2">

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

                              <span
                                className={`inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.04em] ${enrollmentClasses(
                                  record.enrollment
                                )}`}
                              >
                                {enrollmentLabel(
                                  record.enrollment
                                )}
                              </span>

                            </div>

                          </div>

                          {/* DETAILS */}

                          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">

                            <div className="flex min-w-0 items-center gap-2">

                              <span className="text-[var(--st-red)]">
                                <User size={13} />
                              </span>

                              <span className="truncate text-[10px] text-[var(--st-gray)]">
                                {instrumentLabel(
                                  booking.instrument
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

                          {/* CALL INDICATOR */}

                          {booking.called_at && (
                            <div className="mt-3 flex items-center gap-2 text-[9px] text-green-700">

                              <Phone size={11} />

                              <span>
                                Called{" "}
                                {formatDate(
                                  booking.called_at
                                )}{" "}
                                at{" "}
                                {formatTime(
                                  booking.called_at
                                )}
                              </span>

                            </div>
                          )}

                        </div>

                      </div>

                      {/* =================================================
                          ACTIONS
                      ================================================= */}

                      <div className="mt-5 border-t border-[var(--st-border)] pt-4">

                        <p className="mb-3 text-[8px] font-bold uppercase tracking-[0.1em] text-[var(--st-gray)]">
                          {actions.isCompleted
                            ? "STUDENT ACTIONS"
                            : "TRIAL ACTIONS"}
                        </p>

                        <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">

                          {/* BOOKED */}

                          {actions.canBook && (
                            <button
                              type="button"
                              disabled={
                                isUpdating
                              }
                              onClick={() =>
                                openBooked(
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
                          )}

                          {/* REGISTERED */}

                          {actions.canRegister && (
                            <button
                              type="button"
                              disabled={
                                isUpdating
                              }
                              onClick={() =>
                                openRegistration(
                                  record
                                )
                              }
                              className="flex min-h-[46px] items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-3 text-[9px] font-bold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <UserPlus
                                size={14}
                              />

                              Registered
                            </button>
                          )}

                          {/* CALL */}

                          {actions.canCall && (
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
                              className="flex min-h-[46px] items-center justify-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-3 text-[9px] font-bold text-sky-700 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <Phone
                                size={14}
                              />

                              Call
                            </button>
                          )}

                          {/* ATTENDED */}

                          {actions.canAttend && (
                            <button
                              type="button"
                              disabled={
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
                          )}

                          {/* MISSED */}

                          {actions.canMiss && (
                            <button
                              type="button"
                              disabled={
                                isUpdating
                              }
                              onClick={() =>
                                markMissedTrial(
                                  record
                                )
                              }
                              className="flex min-h-[46px] items-center justify-center gap-2 rounded-xl border border-fuchsia-200 bg-fuchsia-50 px-3 py-3 text-[9px] font-bold text-fuchsia-700 transition hover:bg-fuchsia-100 disabled:cursor-not-allowed disabled:opacity-40"
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

                              Missed
                            </button>
                          )}

                          {/* CANCELLED */}

                          {actions.canCancel && (
                            <button
                              type="button"
                              disabled={
                                isUpdating
                              }
                              onClick={() =>
                                markCancelled(
                                  record
                                )
                              }
                              className="flex min-h-[46px] items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-[9px] font-bold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              {isUpdating ? (
                                <RefreshCw
                                  size={14}
                                  className="animate-spin"
                                />
                              ) : (
                                <XCircle
                                  size={14}
                                />
                              )}

                              Cancelled
                            </button>
                          )}

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
                      Nairobi time
                    </p>
                  </>
                )}

                <div className="mt-4 flex flex-wrap gap-2">

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

                  <span
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[9px] font-bold uppercase ${enrollmentClasses(
                      selectedBooking.enrollment
                    )}`}
                  >
                    {enrollmentLabel(
                      selectedBooking.enrollment
                    )}
                  </span>

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

              {/* ENROLLMENT */}

              <div className="mt-6">

                <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--st-gray)]">
                  LEARNER LIFECYCLE
                </p>

                <div className="rounded-2xl border border-[var(--st-border)] p-4">

                  <div className="flex items-center justify-between gap-3">

                    <div>

                      <p className="m-0 text-[10px] text-[var(--st-gray)]">
                        Current state
                      </p>

                      <p className="mt-1 mb-0 text-[13px] font-bold text-[var(--st-charcoal-dark)]">
                        {enrollmentLabel(
                          selectedBooking.enrollment
                        )}
                      </p>

                    </div>

                    <span
                      className={`rounded-full px-3 py-1.5 text-[9px] font-bold uppercase ${enrollmentClasses(
                        selectedBooking.enrollment
                      )}`}
                    >
                      {enrollmentLabel(
                        selectedBooking.enrollment
                      )}
                    </span>

                  </div>

                  {selectedBooking
                    .enrollment && (
                    <div className="mt-4 space-y-2 border-t border-[var(--st-border)] pt-3">

                      <div className="flex justify-between gap-3 text-[9px]">

                        <span className="text-[var(--st-gray)]">
                          Programme
                        </span>

                        <span className="text-right font-semibold text-[var(--st-charcoal-dark)]">
                          {
                            selectedBooking
                              .enrollment
                              .programme_name
                          }
                        </span>

                      </div>

                      <div className="flex justify-between gap-3 text-[9px]">

                        <span className="text-[var(--st-gray)]">
                          Enrollment status
                        </span>

                        <span className="font-semibold text-[var(--st-charcoal-dark)]">
                          {
                            selectedBooking
                              .enrollment
                              .status
                          }
                        </span>

                      </div>

                    </div>
                  )}

                </div>

              </div>

              {/* CALL HISTORY */}

              <div className="mt-6">

                <div className="mb-3 flex items-center justify-between gap-3">

                  <div>
                    <p className="m-0 text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--st-gray)]">
                      CALL HISTORY
                    </p>

                    <p className="mt-1 mb-0 text-[9px] text-[var(--st-gray)]">
                      Record what the lead said after every call.
                    </p>
                  </div>

                  <MessageSquare
                    size={16}
                    className="shrink-0 text-[var(--st-red)]"
                  />

                </div>

                {(callLogsByBooking[
                  selectedBooking.booking.id
                ] ?? []).length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[var(--st-border)] bg-[var(--st-bg-soft)] p-4">
                    <p className="m-0 text-[9px] text-[var(--st-gray)]">
                      No calls have been recorded for this booking yet.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">

                    {(callLogsByBooking[
                      selectedBooking.booking.id
                    ] ?? []).map((call, index) => {

                      const isEditing =
                        editingCallId ===
                        call.id;

                      const displayNotes =
                        call.notes ===
                          "Call initiated from Booking page."
                          ? ""
                          : call.notes;

                      return (
                        <div
                          key={call.id}
                          className="rounded-2xl border border-[var(--st-border)] bg-white p-4"
                        >

                          <div className="flex items-start justify-between gap-3">

                            <div className="min-w-0">

                              <div className="flex flex-wrap items-center gap-2">

                                <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-[8px] font-bold text-green-700">
                                  <Phone size={10} />
                                  CALL {index + 1}
                                </span>

                                <span className="text-[9px] font-semibold text-[var(--st-charcoal-dark)]">
                                  {formatDate(
                                    call.called_at
                                  )}{" "}
                                  at{" "}
                                  {formatTime(
                                    call.called_at
                                  )}
                                </span>

                              </div>

                              {!isEditing && (
                                <p className="mt-2 mb-0 text-[9px] font-semibold text-[var(--st-gray)]">
                                  {callOutcomeLabel(
                                    call.outcome
                                  )}
                                </p>
                              )}

                            </div>

                            {!isEditing && (
                              <button
                                type="button"
                                onClick={() =>
                                  startEditingCall(
                                    call
                                  )
                                }
                                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[var(--st-border)] px-2.5 py-2 text-[8px] font-bold text-[var(--st-charcoal-dark)] transition hover:bg-[var(--st-bg-soft)]"
                              >
                                {displayNotes ? (
                                  <Edit3 size={11} />
                                ) : (
                                  <MessageSquare
                                    size={11}
                                  />
                                )}

                                {displayNotes
                                  ? "Edit response"
                                  : "Record response"}
                              </button>
                            )}

                          </div>

                          {isEditing ? (
                            <div className="mt-4 space-y-3">

                              <div>
                                <label
                                  htmlFor={`call-outcome-${call.id}`}
                                  className="mb-1.5 block text-[8px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]"
                                >
                                  Call outcome
                                </label>

                                <select
                                  id={`call-outcome-${call.id}`}
                                  value={
                                    callOutcomeDraft
                                  }
                                  onChange={(
                                    event
                                  ) =>
                                    setCallOutcomeDraft(
                                      event.target.value
                                    )
                                  }
                                  className="w-full rounded-xl border border-[var(--st-border)] bg-white px-3 py-3 text-[10px] font-semibold text-[var(--st-charcoal-dark)] outline-none focus:border-[var(--st-red)] focus:ring-2 focus:ring-[var(--st-red)]/10"
                                >
                                  {CALL_OUTCOMES.map(
                                    (option) => (
                                      <option
                                        key={
                                          option.value
                                        }
                                        value={
                                          option.value
                                        }
                                      >
                                        {option.label}
                                      </option>
                                    )
                                  )}
                                </select>
                              </div>

                              <div>
                                <label
                                  htmlFor={`call-notes-${call.id}`}
                                  className="mb-1.5 block text-[8px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]"
                                >
                                  What did the lead say?
                                </label>

                                <textarea
                                  id={`call-notes-${call.id}`}
                                  value={
                                    callNotesDraft
                                  }
                                  onChange={(
                                    event
                                  ) =>
                                    setCallNotesDraft(
                                      event.target.value
                                    )
                                  }
                                  rows={5}
                                  placeholder="Record the lead's response, questions, objections, interest, requested callback time, or any other important information..."
                                  className="w-full resize-y rounded-xl border border-[var(--st-border)] bg-white px-3 py-3 text-[10px] leading-relaxed text-[var(--st-charcoal-dark)] outline-none placeholder:text-gray-400 focus:border-[var(--st-red)] focus:ring-2 focus:ring-[var(--st-red)]/10"
                                />
                              </div>

                              <div className="flex gap-2">

                                <button
                                  type="button"
                                  disabled={
                                    savingCallId ===
                                    call.id
                                  }
                                  onClick={() =>
                                    saveCallResponse(
                                      call.id
                                    )
                                  }
                                  className="inline-flex min-h-[42px] flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--st-red)] px-3 py-3 text-[9px] font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {savingCallId ===
                                  call.id ? (
                                    <RefreshCw
                                      size={13}
                                      className="animate-spin"
                                    />
                                  ) : (
                                    <Save
                                      size={13}
                                    />
                                  )}

                                  Save response
                                </button>

                                <button
                                  type="button"
                                  disabled={
                                    savingCallId ===
                                    call.id
                                  }
                                  onClick={
                                    cancelEditingCall
                                  }
                                  className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl border border-[var(--st-border)] px-3 py-3 text-[9px] font-bold text-[var(--st-gray)] transition hover:bg-[var(--st-bg-soft)] disabled:opacity-50"
                                >
                                  <X size={13} />
                                  Cancel
                                </button>

                              </div>

                            </div>
                          ) : (
                            <div className="mt-3 rounded-xl bg-[var(--st-bg-soft)] p-3">

                              <div className="flex items-start gap-2">

                                <MessageSquare
                                  size={12}
                                  className="mt-0.5 shrink-0 text-[var(--st-red)]"
                                />

                                <div className="min-w-0">

                                  <p className="m-0 text-[8px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                                    Lead response
                                  </p>

                                  <p className="mt-1 mb-0 whitespace-pre-wrap text-[10px] leading-relaxed text-[var(--st-charcoal-dark)]">
                                    {displayNotes ||
                                      "No response recorded yet."}
                                  </p>

                                </div>

                              </div>

                            </div>
                          )}

                        </div>
                      );
                    })}

                  </div>
                )}

              </div>

              {/* EMAIL & REMINDERS */}

              <div className="mt-6">

                <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--st-gray)]">
                  EMAIL & REMINDERS
                </p>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">

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

                </div>

              </div>

              {/* ACTIONS */}

              <div className="mt-6">

                <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--st-gray)]">
                  ACTIONS
                </p>

                <div className="grid grid-cols-2 gap-2">

                  {(() => {
                    const actions =
                      getLifecycleActions(
                        selectedBooking
                      );

                    return (
                      <>
                        {/* BOOKED */}

                        {actions.canBook && (
                          <button
                            type="button"
                            disabled={
                              updatingId ===
                              selectedBooking
                                .booking
                                .id
                            }
                            onClick={() =>
                              openBooked(
                                selectedBooking
                              )
                            }
                            className="st-button st-button-primary w-full disabled:opacity-50"
                          >
                            <UserPlus
                              size={14}
                            />

                            Booked
                          </button>
                        )}

                        {/* REGISTERED */}

                        {actions.canRegister && (
                          <button
                            type="button"
                            disabled={
                              updatingId ===
                              selectedBooking
                                .booking
                                .id
                            }
                            onClick={() =>
                              openRegistration(
                                selectedBooking
                              )
                            }
                            className="w-full rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-[9px] font-bold text-amber-700 disabled:opacity-50"
                          >
                            <span className="inline-flex items-center gap-2">
                              <UserPlus
                                size={14}
                              />

                              Registered
                            </span>
                          </button>
                        )}

                        {/* CALL */}

                        {actions.canCall && (
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
                        )}

                        {/* ATTENDED */}

                        {actions.canAttend && (
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
                        )}

                        {/* MISSED */}

                        {actions.canMiss && (
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
                            className="w-full rounded-xl border border-fuchsia-200 bg-fuchsia-50 px-4 py-3 text-[9px] font-bold text-fuchsia-700 disabled:opacity-50"
                          >
                            <span className="inline-flex items-center gap-2">
                              <UserX
                                size={14}
                              />

                              Missed
                            </span>
                          </button>
                        )}

                        {/* CANCELLED */}

                        {actions.canCancel && (
                          <button
                            type="button"
                            disabled={
                              updatingId ===
                              selectedBooking
                                .booking
                                .id
                            }
                            onClick={() =>
                              markCancelled(
                                selectedBooking
                              )
                            }
                            className="w-full rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[9px] font-bold text-red-700 disabled:opacity-50"
                          >
                            <span className="inline-flex items-center gap-2">
                              <XCircle
                                size={14}
                              />

                              Cancelled
                            </span>
                          </button>
                        )}
                      </>
                    );
                  })()}

                </div>

              </div>

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

              {/* BOOKING ID */}

              <div className="mt-6 border-t border-[var(--st-border)] pt-4">

                <p className="m-0 text-[9px] text-[var(--st-gray)]">
                  Booking ID
                </p>

                <p className="mt-1 mb-0 break-all font-mono text-[8px] text-[var(--st-gray)]">
                  {
                    selectedBooking
                      .booking
                      .id
                  }
                </p>

              </div>

              {/* CLOSE */}

              <button
                type="button"
                onClick={() =>
                  setSelectedBooking(
                    null
                  )
                }
                className="mt-4 w-full rounded-xl px-4 py-3 text-[9px] font-bold text-gray-500 transition hover:bg-gray-100"
              >
                Close
              </button>

            </div>

          </div>

        </div>
      )}

      {/* =====================================================
          REGISTRATION MODAL
      ===================================================== */}

      <RegistrationModal
        show={
          registrationModalOpen
        }
        mode={
          registrationModalMode
        }
        booking={
          registrationBooking
            ? {
                id:
                  registrationBooking
                    .booking
                    .id,
                instrument:
                  registrationBooking
                    .booking
                    .instrument,
                lead:
                  registrationBooking
                    .lead,
              }
            : null
        }
        registering={
          registering
        }
        error={
          registrationError
        }
        onClose={
          closeRegistrationModal
        }
        onSubmit={
          handleRegistrationSubmit
        }
      />

    </main>
  );
}