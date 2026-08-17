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
  Plus,
  RefreshCw,
  Search,
  User,
  Users,
  Wallet,
  X,
  AlertCircle,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

type StudentStatus =
  | "active"
  | "completed"
  | "paused"
  | "inactive";

type EnrollmentStatus =
  | "active"
  | "completed"
  | "paused"
  | "cancelled";

type Instrument =
  | "piano"
  | "guitar";

type PaymentScheduleStatus =
  | "scheduled"
  | "due"
  | "paid"
  | "partially_paid"
  | "overdue"
  | "cancelled";

type PaymentMethod =
  | "mpesa"
  | "cash"
  | "bank"
  | "card"
  | "other";

type Student = {
  id: string;
  lead_id: string | null;
  full_name: string;
  email: string;
  whatsapp_number: string;
  status: StudentStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type Enrollment = {
  id: string;
  student_id: string;
  instrument: Instrument;
  programme_name: string;
  start_date: string;
  end_date: string;
  total_fee: number;
  status: EnrollmentStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type PaymentSchedule = {
  id: string;
  enrollment_id: string;
  amount_due: number;
  due_date: string;
  follow_up_date: string | null;
  status: PaymentScheduleStatus;
  notes: string | null;
};

type Payment = {
  id: string;
  student_id: string;
  enrollment_id: string;
  payment_schedule_id: string | null;
  amount: number;
  payment_date: string;
  payment_method: PaymentMethod;
  reference: string | null;
  notes: string | null;
};

type StudentRecord = {
  student: Student;
  enrollment: Enrollment | null;
  schedules: PaymentSchedule[];
  payments: Payment[];
};

type Filter =
  | "all"
  | "active"
  | "completed"
  | "paused"
  | "inactive";

const NAIROBI_TIME_ZONE = "Africa/Nairobi";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat("en-KE", {
    timeZone: NAIROBI_TIME_ZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${dateString}T00:00:00+03:00`));
}

function formatLongDate(dateString: string) {
  return new Intl.DateTimeFormat("en-KE", {
    timeZone: NAIROBI_TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${dateString}T00:00:00+03:00`));
}

function getTodayKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: NAIROBI_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function calculateDaysRemaining(endDate: string) {
  const today = new Date(`${getTodayKey()}T00:00:00+03:00`);
  const end = new Date(`${endDate}T00:00:00+03:00`);

  return Math.ceil(
    (end.getTime() - today.getTime()) /
      (1000 * 60 * 60 * 24)
  );
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

function instrumentName(instrument: Instrument) {
  return instrument.charAt(0).toUpperCase() + instrument.slice(1);
}

function studentStatusLabel(status: StudentStatus) {
  switch (status) {
    case "active":
      return "Active";
    case "completed":
      return "Completed";
    case "paused":
      return "Paused";
    case "inactive":
      return "Inactive";
    default:
      return status;
  }
}

function studentStatusClasses(status: StudentStatus) {
  switch (status) {
    case "active":
      return "bg-green-50 text-green-700";
    case "completed":
      return "bg-blue-50 text-blue-700";
    case "paused":
      return "bg-amber-50 text-amber-700";
    case "inactive":
      return "bg-gray-100 text-gray-600";
    default:
      return "bg-gray-50 text-gray-700";
  }
}

function paymentStatusLabel(
  schedule: PaymentSchedule | null
) {
  if (!schedule) {
    return "No payment scheduled";
  }

  switch (schedule.status) {
    case "paid":
      return "Paid";

    case "due":
      return "Due today";

    case "overdue":
      return "Overdue";

    case "partially_paid":
      return "Partially paid";

    case "scheduled":
      return "Upcoming";

    case "cancelled":
      return "Cancelled";

    default:
      return schedule.status;
  }
}

function paymentStatusClasses(
  schedule: PaymentSchedule | null
) {
  if (!schedule) {
    return "bg-gray-50 text-gray-600";
  }

  switch (schedule.status) {
    case "paid":
      return "bg-green-50 text-green-700";

    case "due":
      return "bg-amber-50 text-amber-700";

    case "overdue":
      return "bg-red-50 text-red-700";

    case "partially_paid":
      return "bg-orange-50 text-orange-700";

    case "scheduled":
      return "bg-blue-50 text-blue-700";

    case "cancelled":
      return "bg-gray-100 text-gray-600";

    default:
      return "bg-gray-50 text-gray-600";
  }
}

function getNextPayment(
  schedules: PaymentSchedule[]
) {
  const activeSchedules = schedules
    .filter(
      (schedule) =>
        schedule.status !== "paid" &&
        schedule.status !== "cancelled"
    )
    .sort((a, b) =>
      a.due_date.localeCompare(b.due_date)
    );

  return activeSchedules[0] ?? null;
}

function getTotalPaid(payments: Payment[]) {
  return payments.reduce(
    (total, payment) =>
      total + Number(payment.amount),
    0
  );
}

function getBalance(
  enrollment: Enrollment | null,
  payments: Payment[]
) {
  if (!enrollment) {
    return 0;
  }

  return Math.max(
    Number(enrollment.total_fee) -
      getTotalPaid(payments),
    0
  );
}

function getPaymentFollowUpLabel(
  schedule: PaymentSchedule | null
) {
  if (!schedule) {
    return "";
  }

  const today = new Date(
    `${getTodayKey()}T00:00:00+03:00`
  );

  const due = new Date(
    `${schedule.due_date}T00:00:00+03:00`
  );

  const difference = Math.round(
    (due.getTime() - today.getTime()) /
      (1000 * 60 * 60 * 24)
  );

  if (schedule.status === "paid") {
    return "Paid";
  }

  if (difference < 0) {
    const days = Math.abs(difference);

    return `Overdue by ${days} ${
      days === 1 ? "day" : "days"
    }`;
  }

  if (difference === 0) {
    return "Due today";
  }

  if (difference === 1) {
    return "Due tomorrow";
  }

  return `Due in ${difference} days`;
}

export default function AdminStudentsPage() {
  const [records, setRecords] = useState<StudentRecord[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [filter, setFilter] =
    useState<Filter>("all");

  const [selectedStudent, setSelectedStudent] =
    useState<StudentRecord | null>(null);

  const [showAddStudent, setShowAddStudent] =
    useState(false);

  const [showPaymentForm, setShowPaymentForm] =
    useState(false);

  const [updatingId, setUpdatingId] =
    useState<string | null>(null);

  const [paymentAmount, setPaymentAmount] =
    useState("");

  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("mpesa");

  const [paymentReference, setPaymentReference] =
    useState("");

  /*
   * =========================================================
   * LOAD STUDENTS
   * =========================================================
   */

  async function loadStudents(
    silent = false
  ) {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    const {
      data: studentsData,
      error: studentsError,
    } = await supabase
      .from("students")
      .select(
        `
          id,
          lead_id,
          full_name,
          email,
          whatsapp_number,
          status,
          notes,
          created_at,
          updated_at
        `
      )
      .order("created_at", {
        ascending: false,
      });

    if (studentsError) {
      console.error(
        "Students load error:",
        studentsError
      );

      setError(
        "We couldn't load students. Please try again."
      );

      setLoading(false);
      setRefreshing(false);

      return;
    }

    const students =
      (studentsData ?? []) as Student[];

    if (students.length === 0) {
      setRecords([]);

      setLoading(false);
      setRefreshing(false);

      return;
    }

    const studentIds = Array.from(
      new Set(
        students.map(
          (student) => student.id
        )
      )
    );

    const [
      enrollmentsResult,
      paymentsResult,
    ] = await Promise.all([
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
            total_fee,
            status,
            notes,
            created_at,
            updated_at
          `
        )
        .in("student_id", studentIds)
        .order("created_at", {
          ascending: false,
        }),

      supabase
        .from("payments")
        .select(
          `
            id,
            student_id,
            enrollment_id,
            payment_schedule_id,
            amount,
            payment_date,
            payment_method,
            reference,
            notes
          `
        )
        .in("student_id", studentIds)
        .order("payment_date", {
          ascending: false,
        }),
    ]);

    if (enrollmentsResult.error) {
      console.error(
        "Enrollments load error:",
        enrollmentsResult.error
      );
    }

    if (paymentsResult.error) {
      console.error(
        "Payments load error:",
        paymentsResult.error
      );
    }

    const enrollments =
      (enrollmentsResult.data ??
        []) as Enrollment[];

    const payments =
      (paymentsResult.data ??
        []) as Payment[];

    const enrollmentIds =
      enrollments.map(
        (enrollment) =>
          enrollment.id
      );

    let schedules: PaymentSchedule[] = [];

    if (enrollmentIds.length > 0) {
      const {
        data: scheduleData,
        error: scheduleError,
      } = await supabase
        .from("payment_schedule")
        .select(
          `
            id,
            enrollment_id,
            amount_due,
            due_date,
            follow_up_date,
            status,
            notes
          `
        )
        .in(
          "enrollment_id",
          enrollmentIds
        )
        .order("due_date", {
          ascending: true,
        });

      if (scheduleError) {
        console.error(
          "Payment schedule load error:",
          scheduleError
        );
      }

      schedules =
        (scheduleData ??
          []) as PaymentSchedule[];
    }

    const enrollmentMap =
      new Map<string, Enrollment>();

    enrollments.forEach(
      (enrollment) => {
        if (
          !enrollmentMap.has(
            enrollment.student_id
          )
        ) {
          enrollmentMap.set(
            enrollment.student_id,
            enrollment
          );
        }
      }
    );

    const schedulesMap =
      new Map<
        string,
        PaymentSchedule[]
      >();

    schedules.forEach(
      (schedule) => {
        const current =
          schedulesMap.get(
            schedule.enrollment_id
          ) ?? [];

        current.push(schedule);

        schedulesMap.set(
          schedule.enrollment_id,
          current
        );
      }
    );

    const paymentsMap =
      new Map<string, Payment[]>();

    payments.forEach(
      (payment) => {
        const current =
          paymentsMap.get(
            payment.student_id
          ) ?? [];

        current.push(payment);

        paymentsMap.set(
          payment.student_id,
          current
        );
      }
    );

    const loadedRecords =
      students.map((student) => {
        const enrollment =
          enrollmentMap.get(
            student.id
          ) ?? null;

        return {
          student,
          enrollment,
          schedules: enrollment
            ? schedulesMap.get(
                enrollment.id
              ) ?? []
            : [],
          payments:
            paymentsMap.get(
              student.id
            ) ?? [],
        };
      });

    setRecords(loadedRecords);

    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => {
    loadStudents();
  }, []);

  /*
   * =========================================================
   * FILTERING
   * =========================================================
   */

  const filteredRecords =
    useMemo(() => {
      const query =
        search.trim().toLowerCase();

      return records.filter(
        (record) => {
          if (
            filter !== "all" &&
            record.student.status !==
              filter
          ) {
            return false;
          }

          if (!query) {
            return true;
          }

          const searchable = [
            record.student.full_name,
            record.student.email,
            record.student.whatsapp_number,
            record.enrollment?.instrument ??
              "",
            record.enrollment
              ?.programme_name ?? "",
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
   * =========================================================
   * STATS
   * =========================================================
   */

  const stats = useMemo(() => {
    const active =
      records.filter(
        (record) =>
          record.student.status ===
          "active"
      ).length;

    const completed =
      records.filter(
        (record) =>
          record.student.status ===
          "completed"
      ).length;

    const endingSoon =
      records.filter((record) => {
        if (
          !record.enrollment ||
          record.student.status !==
            "active"
        ) {
          return false;
        }

        const days =
          calculateDaysRemaining(
            record.enrollment.end_date
          );

        return days >= 0 && days <= 30;
      }).length;

    const paymentAttention =
      records.filter((record) => {
        const next =
          getNextPayment(
            record.schedules
          );

        return (
          next?.status === "due" ||
          next?.status === "overdue" ||
          next?.status ===
            "partially_paid"
        );
      }).length;

    return {
      active,
      completed,
      endingSoon,
      paymentAttention,
    };
  }, [records]);

  /*
   * =========================================================
   * PAYMENT
   * =========================================================
   */

  async function recordPayment() {
    if (!selectedStudent) {
      return;
    }

    const amount =
      Number(paymentAmount);

    if (!amount || amount <= 0) {
      setError(
        "Enter a valid payment amount."
      );

      return;
    }

    if (
      !selectedStudent.enrollment
    ) {
      setError(
        "This student does not have an active programme."
      );

      return;
    }

    setUpdatingId(
      selectedStudent.student.id
    );

    setError("");

    const nextSchedule =
      getNextPayment(
        selectedStudent.schedules
      );

    const {
      data,
      error: paymentError,
    } = await supabase
      .from("payments")
      .insert({
        student_id:
          selectedStudent.student.id,
        enrollment_id:
          selectedStudent.enrollment.id,
        payment_schedule_id:
          nextSchedule?.id ?? null,
        amount,
        payment_date:
          getTodayKey(),
        payment_method:
          paymentMethod,
        reference:
          paymentReference.trim() ||
          null,
      })
      .select(
        `
          id,
          student_id,
          enrollment_id,
          payment_schedule_id,
          amount,
          payment_date,
          payment_method,
          reference,
          notes
        `
      )
      .single();

    if (paymentError) {
      console.error(
        "Payment error:",
        paymentError
      );

      setError(
        "We couldn't record this payment."
      );

      setUpdatingId(null);

      return;
    }

    /*
     * Update schedule status.
     */

    if (nextSchedule) {
      const schedulePayments =
        selectedStudent.payments
          .filter(
            (payment) =>
              payment.payment_schedule_id ===
              nextSchedule.id
          )
          .reduce(
            (sum, payment) =>
              sum +
              Number(payment.amount),
            0
          );

      const paidAmount =
        schedulePayments + amount;

      let newStatus:
        | PaymentScheduleStatus =
        "partially_paid";

      if (
        paidAmount >=
        Number(
          nextSchedule.amount_due
        )
      ) {
        newStatus = "paid";
      }

      await supabase
        .from("payment_schedule")
        .update({
          status: newStatus,
        })
        .eq(
          "id",
          nextSchedule.id
        );
    }

    const newPayment =
      data as Payment;

    setSelectedStudent(
      (current) =>
        current
          ? {
              ...current,
              payments: [
                newPayment,
                ...current.payments,
              ],
            }
          : current
    );

    setPaymentAmount("");
    setPaymentReference("");
    setPaymentMethod("mpesa");
    setShowPaymentForm(false);
    setUpdatingId(null);

    await loadStudents(true);
  }

  /*
   * =========================================================
   * COMMUNICATION
   * =========================================================
   */

  function openWhatsApp(
    record: StudentRecord
  ) {
    const phone =
      record.student
        .whatsapp_number;

    if (!phone) {
      return;
    }

    const next =
      getNextPayment(
        record.schedules
      );

    let message = `Hello ${record.student.full_name}, this is Sauti Tamu Piano Center.`;

    if (next) {
      message += ` This is a reminder regarding your payment of ${formatCurrency(
        Number(next.amount_due)
      )} due on ${formatDate(
        next.due_date
      )}.`;
    }

    window.open(
      `https://wa.me/${phone.replace(
        /[^0-9]/g,
        ""
      )}?text=${encodeURIComponent(
        message
      )}`,
      "_blank"
    );
  }

  function callStudent(
    record: StudentRecord
  ) {
    if (
      !record.student
        .whatsapp_number
    ) {
      return;
    }

    window.location.href =
      `tel:${record.student.whatsapp_number}`;
  }

  function emailStudent(
    record: StudentRecord
  ) {
    window.location.href =
      `mailto:${record.student.email}`;
  }

  /*
   * =========================================================
   * RENDER
   * =========================================================
   */

  return (
    <main className="st-content">

      {/* HEADER */}

      <div className="mb-7 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">

        <div>
          <p className="st-eyebrow">
            STUDENTS
          </p>

          <h1 className="st-page-title mt-2">
            Students
          </h1>

          <p className="st-page-description">
            Manage enrolled students, programmes,
            payments and follow-ups.
          </p>
        </div>

        <div className="flex gap-2">

          <button
            type="button"
            onClick={() =>
              loadStudents(true)
            }
            className="st-button st-button-secondary"
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

          <button
            type="button"
            onClick={() =>
              setShowAddStudent(true)
            }
            className="st-button st-button-primary"
          >
            <Plus size={15} />
            Add student
          </button>

        </div>

      </div>

      {/* STATS */}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">

        <div className="st-card p-5">
          <div className="flex items-center justify-between gap-3">

            <div>
              <p className="m-0 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                Active students
              </p>

              <p className="mt-3 mb-0 text-[30px] font-bold leading-none text-[var(--st-charcoal-dark)]">
                {stats.active}
              </p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--st-bg-soft)] text-[var(--st-red)]">
              <Users size={18} />
            </div>

          </div>
        </div>

        <div className="st-card p-5">
          <div className="flex items-center justify-between gap-3">

            <div>
              <p className="m-0 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                Ending soon
              </p>

              <p className="mt-3 mb-0 text-[30px] font-bold leading-none text-[var(--st-charcoal-dark)]">
                {stats.endingSoon}
              </p>

              <p className="mt-2 mb-0 text-[9px] text-[var(--st-gray)]">
                Within 30 days
              </p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 text-amber-700">
              <Clock3 size={18} />
            </div>

          </div>
        </div>

        <div className="st-card p-5">
          <div className="flex items-center justify-between gap-3">

            <div>
              <p className="m-0 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                Payments due
              </p>

              <p className="mt-3 mb-0 text-[30px] font-bold leading-none text-[var(--st-red)]">
                {stats.paymentAttention}
              </p>

              <p className="mt-2 mb-0 text-[9px] text-[var(--st-gray)]">
                Need attention
              </p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-[var(--st-red)]">
              <Wallet size={18} />
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
              <CheckCircle2 size={18} />
            </div>

          </div>
        </div>

      </section>

      {/* PAYMENT ATTENTION */}

      {stats.paymentAttention > 0 && (
        <section className="mt-5">

          <div className="mb-3 flex items-center justify-between">

            <div>
              <p className="st-eyebrow">
                PAYMENT FOLLOW-UP
              </p>

              <h2 className="mt-1 st-section-title">
                Students needing attention
              </h2>
            </div>

            <span className="st-badge st-badge-red">
              {stats.paymentAttention}{" "}
              {stats.paymentAttention === 1
                ? "student"
                : "students"}
            </span>

          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">

            {records
              .filter((record) => {
                const next =
                  getNextPayment(
                    record.schedules
                  );

                return (
                  next?.status ===
                    "due" ||
                  next?.status ===
                    "overdue" ||
                  next?.status ===
                    "partially_paid"
                );
              })
              .slice(0, 4)
              .map((record) => {
                const next =
                  getNextPayment(
                    record.schedules
                  );

                if (!next) {
                  return null;
                }

                return (
                  <div
                    key={record.student.id}
                    className="st-card p-4"
                  >

                    <div className="flex items-start gap-3">

                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--st-bg-soft)] text-[10px] font-bold text-[var(--st-red)]">
                        {initials(
                          record.student
                            .full_name
                        )}
                      </div>

                      <div className="min-w-0 flex-1">

                        <div className="flex items-start justify-between gap-3">

                          <div className="min-w-0">

                            <p className="m-0 truncate text-[12px] font-bold text-[var(--st-charcoal-dark)]">
                              {
                                record.student
                                  .full_name
                              }
                            </p>

                            <p className="mt-1 mb-0 text-[9px] text-[var(--st-gray)]">
                              {record.enrollment
                                ? instrumentName(
                                    record.enrollment
                                      .instrument
                                  )
                                : "No programme"}
                            </p>

                          </div>

                          <span
                            className={`shrink-0 rounded-full px-2.5 py-1 text-[8px] font-bold ${paymentStatusClasses(
                              next
                            )}`}
                          >
                            {paymentStatusLabel(
                              next
                            )}
                          </span>

                        </div>

                        <div className="mt-3 flex items-end justify-between gap-3">

                          <div>

                            <p className="m-0 text-[17px] font-bold text-[var(--st-red)]">
                              {formatCurrency(
                                Number(
                                  next.amount_due
                                )
                              )}
                            </p>

                            <p className="mt-1 mb-0 text-[9px] text-[var(--st-gray)]">
                              {getPaymentFollowUpLabel(
                                next
                              )}
                            </p>

                          </div>

                          <div className="flex gap-1">

                            <button
                              type="button"
                              onClick={() =>
                                openWhatsApp(
                                  record
                                )
                              }
                              className="st-icon-button"
                              aria-label="WhatsApp student"
                            >
                              <MessageCircle
                                size={14}
                              />
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setSelectedStudent(
                                  record
                                );
                                setShowPaymentForm(
                                  true
                                );
                              }}
                              className="st-button st-button-primary !px-3 !py-2 text-[9px]"
                            >
                              Record payment
                            </button>

                          </div>

                        </div>

                      </div>

                    </div>

                  </div>
                );
              })}

          </div>

        </section>
      )}

      {/* SEARCH */}

      <section className="st-card mt-6 p-4">

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
            placeholder="Search student, email, WhatsApp or instrument"
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
              key: "active",
              label: "Active",
            },
            {
              key: "completed",
              label: "Completed",
            },
            {
              key: "paused",
              label: "Paused",
            },
            {
              key: "inactive",
              label: "Inactive",
            },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() =>
                setFilter(
                  item.key as Filter
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

      {/* ERROR */}

      {error && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <p className="m-0 text-[10px] leading-relaxed text-red-700">
            {error}
          </p>
        </div>
      )}

      {/* STUDENT LIST */}

      <section className="mt-7">

        <div className="mb-4">

          <p className="st-eyebrow">
            {filter === "all"
              ? "ALL STUDENTS"
              : `${studentStatusLabel(
                  filter
                ).toUpperCase()} STUDENTS`}
          </p>

          <p className="mt-1 mb-0 text-[10px] text-[var(--st-gray)]">
            {filteredRecords.length}{" "}
            {filteredRecords.length === 1
              ? "student"
              : "students"}
          </p>

        </div>

        {loading ? (
          <div className="st-card flex min-h-[260px] items-center justify-center gap-2 text-[10px] text-[var(--st-gray)]">
            <RefreshCw
              size={16}
              className="animate-spin"
            />
            Loading students...
          </div>
        ) : filteredRecords.length ===
          0 ? (
          <div className="st-card flex min-h-[300px] flex-col items-center justify-center px-5 text-center">

            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--st-bg-soft)] text-[var(--st-red)]">
              <Users size={22} />
            </div>

            <p className="mt-5 mb-0 text-[14px] font-bold text-[var(--st-charcoal-dark)]">
              No students found
            </p>

            <p className="mt-2 mb-0 max-w-[300px] text-[10px] leading-relaxed text-[var(--st-gray)]">
              Add your first student or try another search/filter.
            </p>

            <button
              type="button"
              onClick={() =>
                setShowAddStudent(true)
              }
              className="st-button st-button-primary mt-5"
            >
              <Plus size={15} />
              Add student
            </button>

          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">

            {filteredRecords.map(
              (record) => {
                const enrollment =
                  record.enrollment;

                const nextPayment =
                  getNextPayment(
                    record.schedules
                  );

                const totalPaid =
                  getTotalPaid(
                    record.payments
                  );

                const balance =
                  getBalance(
                    enrollment,
                    record.payments
                  );

                const daysRemaining =
                  enrollment
                    ? calculateDaysRemaining(
                        enrollment.end_date
                      )
                    : null;

                return (
                  <button
                    key={
                      record.student.id
                    }
                    type="button"
                    onClick={() =>
                      setSelectedStudent(
                        record
                      )
                    }
                    className="st-card group w-full overflow-hidden p-0 text-left transition-all hover:border-[var(--st-red)]"
                  >

                    <div className="p-5">

                      <div className="flex items-start gap-4">

                        {/* AVATAR */}

                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--st-bg-soft)] text-[10px] font-bold text-[var(--st-red)]">
                          {initials(
                            record.student
                              .full_name
                          )}
                        </div>

                        {/* CONTENT */}

                        <div className="min-w-0 flex-1">

                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">

                            <div className="min-w-0">

                              <p className="truncate text-[14px] font-bold text-[var(--st-charcoal-dark)]">
                                {
                                  record.student
                                    .full_name
                                }
                              </p>

                              {enrollment ? (
                                <p className="mt-1 text-[10px] text-[var(--st-gray)]">
                                  {instrumentName(
                                    enrollment.instrument
                                  )}{" "}
                                  ·{" "}
                                  {
                                    enrollment.programme_name
                                  }
                                </p>
                              ) : (
                                <p className="mt-1 text-[10px] text-[var(--st-gray)]">
                                  No programme enrolled
                                </p>
                              )}

                            </div>

                            <span
                              className={`inline-flex w-fit shrink-0 rounded-full px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.04em] ${studentStatusClasses(
                                record.student
                                  .status
                              )}`}
                            >
                              {studentStatusLabel(
                                record.student
                                  .status
                              )}
                            </span>

                          </div>

                          {/* PROGRAMME */}

                          {enrollment && (
                            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">

                              <div>
                                <p className="m-0 text-[8px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                                  Programme
                                </p>

                                <p className="mt-1 text-[10px] font-semibold text-[var(--st-charcoal-dark)]">
                                  {instrumentName(
                                    enrollment.instrument
                                  )}
                                </p>
                              </div>

                              <div>
                                <p className="m-0 text-[8px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                                  End date
                                </p>

                                <p className="mt-1 text-[10px] font-semibold text-[var(--st-charcoal-dark)]">
                                  {formatDate(
                                    enrollment.end_date
                                  )}
                                </p>
                              </div>

                              <div>
                                <p className="m-0 text-[8px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                                  Days left
                                </p>

                                <p
                                  className={`mt-1 text-[10px] font-bold ${
                                    daysRemaining !==
                                      null &&
                                    daysRemaining <
                                      0
                                      ? "text-red-600"
                                      : daysRemaining !==
                                          null &&
                                        daysRemaining <=
                                          30
                                      ? "text-amber-700"
                                      : "text-[var(--st-charcoal-dark)]"
                                  }`}
                                >
                                  {daysRemaining !==
                                  null
                                    ? daysRemaining <
                                      0
                                      ? "Expired"
                                      : `${daysRemaining} days`
                                    : "—"}
                                </p>
                              </div>

                              <div>
                                <p className="m-0 text-[8px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                                  Balance
                                </p>

                                <p
                                  className={`mt-1 text-[10px] font-bold ${
                                    balance > 0
                                      ? "text-[var(--st-red)]"
                                      : "text-green-700"
                                  }`}
                                >
                                  {formatCurrency(
                                    balance
                                  )}
                                </p>
                              </div>

                            </div>
                          )}

                          {/* PAYMENT */}

                          {enrollment && (
                            <div className="mt-4 rounded-xl bg-[var(--st-bg-soft)] p-3">

                              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                                <div className="flex min-w-0 items-center gap-3">

                                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-[var(--st-red)]">
                                    <Wallet
                                      size={14}
                                    />
                                  </div>

                                  <div className="min-w-0">

                                    <p className="m-0 text-[9px] font-bold uppercase tracking-[0.06em] text-[var(--st-gray)]">
                                      Next payment
                                    </p>

                                    {nextPayment ? (
                                      <p className="mt-1 text-[11px] font-bold text-[var(--st-charcoal-dark)]">
                                        {formatCurrency(
                                          Number(
                                            nextPayment.amount_due
                                          )
                                        )}{" "}
                                        ·{" "}
                                        {formatDate(
                                          nextPayment.due_date
                                        )}
                                      </p>
                                    ) : (
                                      <p className="mt-1 text-[10px] text-green-700">
                                        No outstanding scheduled payment
                                      </p>
                                    )}

                                  </div>

                                </div>

                                {nextPayment && (
                                  <span
                                    className={`w-fit shrink-0 rounded-full px-2.5 py-1.5 text-[8px] font-bold ${paymentStatusClasses(
                                      nextPayment
                                    )}`}
                                  >
                                    {paymentStatusLabel(
                                      nextPayment
                                    )}
                                  </span>
                                )}

                              </div>

                            </div>
                          )}

                          {/* CONTACT */}

                          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">

                            <span className="flex min-w-0 items-center gap-1.5 text-[9px] text-[var(--st-gray)]">
                              <Phone
                                size={12}
                                className="shrink-0 text-[var(--st-red)]"
                              />
                              <span className="truncate">
                                {
                                  record.student
                                    .whatsapp_number
                                }
                              </span>
                            </span>

                            <span className="flex min-w-0 items-center gap-1.5 text-[9px] text-[var(--st-gray)]">
                              <Mail
                                size={12}
                                className="shrink-0 text-[var(--st-red)]"
                              />
                              <span className="truncate">
                                {
                                  record.student
                                    .email
                                }
                              </span>
                            </span>

                            <span className="ml-auto flex shrink-0 items-center gap-1 text-[9px] font-bold text-[var(--st-red)]">
                              View
                              <ArrowRight
                                size={12}
                                className="transition-transform group-hover:translate-x-1"
                              />
                            </span>

                          </div>

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

      {/* =====================================================
          STUDENT DRAWER
      ===================================================== */}

      {selectedStudent &&
        !showAddStudent && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 sm:items-center sm:p-5">

            <div className="max-h-[94vh] w-full max-w-[600px] overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">

              {/* DRAWER HEADER */}

              <div className="sticky top-0 z-10 border-b border-[var(--st-border)] bg-white px-5 py-4">

                <div className="flex items-center justify-between gap-4">

                  <div className="flex min-w-0 items-center gap-3">

                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--st-bg-soft)] text-[10px] font-bold text-[var(--st-red)]">
                      {initials(
                        selectedStudent
                          .student
                          .full_name
                      )}
                    </div>

                    <div className="min-w-0">

                      <p className="truncate text-[14px] font-bold text-[var(--st-charcoal-dark)]">
                        {
                          selectedStudent
                            .student
                            .full_name
                        }
                      </p>

                      <p className="mt-1 text-[9px] text-[var(--st-gray)]">
                        Student profile
                      </p>

                    </div>

                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setSelectedStudent(
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

                {/* OVERVIEW */}

                <div className="rounded-2xl bg-[var(--st-bg-soft)] p-5">

                  <div className="flex items-start justify-between gap-4">

                    <div>

                      <p className="m-0 text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--st-gray)]">
                        STUDENT
                      </p>

                      <p className="mt-2 text-[22px] font-bold text-[var(--st-charcoal-dark)]">
                        {
                          selectedStudent
                            .student
                            .full_name
                        }
                      </p>

                    </div>

                    <span
                      className={`rounded-full px-3 py-1.5 text-[9px] font-bold ${studentStatusClasses(
                        selectedStudent
                          .student
                          .status
                      )}`}
                    >
                      {studentStatusLabel(
                        selectedStudent
                          .student
                          .status
                      )}
                    </span>

                  </div>

                  {selectedStudent.enrollment && (
                    <div className="mt-5">

                      <div className="flex items-center justify-between gap-3">

                        <div>

                          <p className="m-0 text-[9px] text-[var(--st-gray)]">
                            Programme
                          </p>

                          <p className="mt-1 text-[12px] font-bold capitalize text-[var(--st-charcoal-dark)]">
                            {instrumentName(
                              selectedStudent
                                .enrollment
                                .instrument
                            )}
                          </p>

                        </div>

                        <div className="text-right">

                          <p className="m-0 text-[9px] text-[var(--st-gray)]">
                            Days remaining
                          </p>

                          <p
                            className={`mt-1 text-[18px] font-bold ${
                              calculateDaysRemaining(
                                selectedStudent
                                  .enrollment
                                  .end_date
                              ) <= 30
                                ? "text-[var(--st-red)]"
                                : "text-[var(--st-charcoal-dark)]"
                            }`}
                          >
                            {calculateDaysRemaining(
                              selectedStudent
                                .enrollment
                                .end_date
                            ) < 0
                              ? "Expired"
                              : calculateDaysRemaining(
                                  selectedStudent
                                    .enrollment
                                    .end_date
                                )}
                          </p>

                        </div>

                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3">

                        <div className="rounded-xl bg-white p-3">

                          <p className="m-0 text-[8px] font-bold uppercase tracking-[0.06em] text-[var(--st-gray)]">
                            Start date
                          </p>

                          <p className="mt-1 text-[10px] font-semibold text-[var(--st-charcoal-dark)]">
                            {formatDate(
                              selectedStudent
                                .enrollment
                                .start_date
                            )}
                          </p>

                        </div>

                        <div className="rounded-xl bg-white p-3">

                          <p className="m-0 text-[8px] font-bold uppercase tracking-[0.06em] text-[var(--st-gray)]">
                            End date
                          </p>

                          <p className="mt-1 text-[10px] font-semibold text-[var(--st-charcoal-dark)]">
                            {formatDate(
                              selectedStudent
                                .enrollment
                                .end_date
                            )}
                          </p>

                        </div>

                      </div>

                    </div>
                  )}

                </div>

                {/* FINANCIAL SUMMARY */}

                {selectedStudent.enrollment && (
                  <div className="mt-5">

                    <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--st-gray)]">
                      FINANCIAL SUMMARY
                    </p>

                    <div className="grid grid-cols-3 gap-2">

                      <div className="rounded-xl border border-[var(--st-border)] p-3">

                        <p className="m-0 text-[8px] text-[var(--st-gray)]">
                          Programme
                        </p>

                        <p className="mt-1 text-[13px] font-bold text-[var(--st-charcoal-dark)]">
                          {formatCurrency(
                            Number(
                              selectedStudent
                                .enrollment
                                .total_fee
                            )
                          )}
                        </p>

                      </div>

                      <div className="rounded-xl border border-[var(--st-border)] p-3">

                        <p className="m-0 text-[8px] text-[var(--st-gray)]">
                          Paid
                        </p>

                        <p className="mt-1 text-[13px] font-bold text-green-700">
                          {formatCurrency(
                            getTotalPaid(
                              selectedStudent.payments
                            )
                          )}
                        </p>

                      </div>

                      <div className="rounded-xl border border-[var(--st-border)] p-3">

                        <p className="m-0 text-[8px] text-[var(--st-gray)]">
                          Balance
                        </p>

                        <p className="mt-1 text-[13px] font-bold text-[var(--st-red)]">
                          {formatCurrency(
                            getBalance(
                              selectedStudent.enrollment,
                              selectedStudent.payments
                            )
                          )}
                        </p>

                      </div>

                    </div>

                  </div>
                )}

                {/* NEXT PAYMENT */}

                {selectedStudent.enrollment && (
                  <div className="mt-6">

                    <div className="flex items-center justify-between gap-3">

                      <p className="m-0 text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--st-gray)]">
                        NEXT PAYMENT
                      </p>

                      <button
                        type="button"
                        onClick={() =>
                          setShowPaymentForm(
                            true
                          )
                        }
                        className="text-[9px] font-bold text-[var(--st-red)]"
                      >
                        + Record payment
                      </button>

                    </div>

                    {(() => {
                      const next =
                        getNextPayment(
                          selectedStudent.schedules
                        );

                      if (!next) {
                        return (
                          <div className="mt-3 rounded-xl bg-green-50 p-4">

                            <div className="flex items-center gap-2 text-green-700">

                              <CheckCircle2
                                size={15}
                              />

                              <p className="m-0 text-[10px] font-bold">
                                No outstanding scheduled payment
                              </p>

                            </div>

                          </div>
                        );
                      }

                      return (
                        <div className="mt-3 rounded-xl border border-[var(--st-border)] p-4">

                          <div className="flex items-start justify-between gap-4">

                            <div>

                              <p className="m-0 text-[20px] font-bold text-[var(--st-red)]">
                                {formatCurrency(
                                  Number(
                                    next.amount_due
                                  )
                                )}
                              </p>

                              <p className="mt-1 text-[10px] text-[var(--st-gray)]">
                                Due{" "}
                                {formatLongDate(
                                  next.due_date
                                )}
                              </p>

                              {next.follow_up_date && (
                                <p className="mt-1 text-[9px] font-semibold text-[var(--st-gray)]">
                                  Follow up:{" "}
                                  {formatDate(
                                    next.follow_up_date
                                  )}
                                </p>
                              )}

                            </div>

                            <span
                              className={`rounded-full px-3 py-1.5 text-[8px] font-bold ${paymentStatusClasses(
                                next
                              )}`}
                            >
                              {paymentStatusLabel(
                                next
                              )}
                            </span>

                          </div>

                          <p className="mt-3 mb-0 text-[9px] font-bold text-[var(--st-red)]">
                            {getPaymentFollowUpLabel(
                              next
                            )}
                          </p>

                        </div>
                      );
                    })()}

                  </div>
                )}

                {/* CONTACT */}

                <div className="mt-6">

                  <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--st-gray)]">
                    CONTACT
                  </p>

                  <div className="space-y-3">

                    <div className="flex items-start gap-3">

                      <Phone
                        size={15}
                        className="mt-0.5 shrink-0 text-[var(--st-red)]"
                      />

                      <div className="min-w-0">

                        <p className="m-0 text-[9px] text-[var(--st-gray)]">
                          WhatsApp
                        </p>

                        <p className="mt-1 text-[11px] font-semibold text-[var(--st-charcoal-dark)]">
                          {
                            selectedStudent
                              .student
                              .whatsapp_number
                          }
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

                        <p className="mt-1 break-all text-[11px] font-semibold text-[var(--st-charcoal-dark)]">
                          {
                            selectedStudent
                              .student
                              .email
                          }
                        </p>

                      </div>

                    </div>

                  </div>

                </div>

                {/* PAYMENT HISTORY */}

                <div className="mt-6">

                  <div className="flex items-center justify-between">

                    <p className="m-0 text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--st-gray)]">
                      PAYMENT HISTORY
                    </p>

                    <span className="text-[9px] text-[var(--st-gray)]">
                      {
                        selectedStudent
                          .payments.length
                      }{" "}
                      payments
                    </span>

                  </div>

                  {selectedStudent.payments
                    .length === 0 ? (
                    <div className="mt-3 rounded-xl border border-dashed border-[var(--st-border)] p-5 text-center">

                      <Wallet
                        size={18}
                        className="mx-auto text-[var(--st-gray)]"
                      />

                      <p className="mt-2 mb-0 text-[10px] text-[var(--st-gray)]">
                        No payments recorded yet.
                      </p>

                    </div>
                  ) : (
                    <div className="mt-3 divide-y divide-[var(--st-border)] rounded-xl border border-[var(--st-border)]">

                      {selectedStudent.payments.map(
                        (payment) => (
                          <div
                            key={
                              payment.id
                            }
                            className="flex items-center justify-between gap-4 p-3"
                          >

                            <div>

                              <p className="m-0 text-[11px] font-bold text-[var(--st-charcoal-dark)]">
                                {formatCurrency(
                                  Number(
                                    payment.amount
                                  )
                                )}
                              </p>

                              <p className="mt-1 text-[9px] text-[var(--st-gray)]">
                                {formatDate(
                                  payment.payment_date
                                )}{" "}
                                ·{" "}
                                {payment.payment_method.toUpperCase()}
                              </p>

                            </div>

                            {payment.reference && (
                              <span className="max-w-[120px] truncate text-[8px] text-[var(--st-gray)]">
                                {
                                  payment.reference
                                }
                              </span>
                            )}

                          </div>
                        )
                      )}

                    </div>
                  )}

                </div>

                {/* ACTIONS */}

                <div className="mt-6 grid grid-cols-2 gap-2">

                  <button
                    type="button"
                    onClick={() =>
                      openWhatsApp(
                        selectedStudent
                      )
                    }
                    className="st-button st-button-secondary w-full"
                  >
                    <MessageCircle
                      size={15}
                    />
                    WhatsApp
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      callStudent(
                        selectedStudent
                      )
                    }
                    className="st-button st-button-secondary w-full"
                  >
                    <Phone size={15} />
                    Call
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      emailStudent(
                        selectedStudent
                      )
                    }
                    className="st-button st-button-secondary w-full"
                  >
                    <Mail size={15} />
                    Email
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setShowPaymentForm(
                        true
                      )
                    }
                    disabled={
                      !selectedStudent
                        .enrollment
                    }
                    className="st-button st-button-primary w-full disabled:opacity-40"
                  >
                    <Wallet size={15} />
                    Payment
                  </button>

                </div>

              </div>

            </div>

          </div>
        )}

      {/* =====================================================
          PAYMENT MODAL
      ===================================================== */}

      {selectedStudent &&
        showPaymentForm && (
          <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/50 sm:items-center sm:p-5">

            <div className="w-full max-w-[430px] rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl">

              <div className="flex items-center justify-between gap-4">

                <div>

                  <p className="st-eyebrow">
                    PAYMENT
                  </p>

                  <h2 className="mt-1 text-[20px] font-bold text-[var(--st-charcoal-dark)]">
                    Record payment
                  </h2>

                  <p className="mt-1 text-[10px] text-[var(--st-gray)]">
                    {
                      selectedStudent
                        .student
                        .full_name
                    }
                  </p>

                </div>

                <button
                  type="button"
                  onClick={() =>
                    setShowPaymentForm(
                      false
                    )
                  }
                  className="st-icon-button"
                >
                  <X size={17} />
                </button>

              </div>

              <div className="mt-6 space-y-4">

                <div>

                  <label className="mb-2 block text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--st-charcoal)]">
                    Amount
                  </label>

                  <input
                    type="number"
                    min="1"
                    value={paymentAmount}
                    onChange={(event) =>
                      setPaymentAmount(
                        event.target.value
                      )
                    }
                    placeholder="e.g. 5000"
                    className="w-full rounded-xl border border-[var(--st-border)] px-4 py-3.5 text-[13px] font-semibold outline-none focus:border-[var(--st-red)] focus:ring-2 focus:ring-[var(--st-red)]/10"
                  />

                </div>

                <div>

                  <label className="mb-2 block text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--st-charcoal)]">
                    Payment method
                  </label>

                  <div className="relative">

                    <select
                      value={paymentMethod}
                      onChange={(event) =>
                        setPaymentMethod(
                          event.target
                            .value as PaymentMethod
                        )
                      }
                      className="w-full appearance-none rounded-xl border border-[var(--st-border)] bg-white px-4 py-3.5 text-[11px] font-semibold outline-none focus:border-[var(--st-red)]"
                    >
                      <option value="mpesa">
                        M-Pesa
                      </option>

                      <option value="cash">
                        Cash
                      </option>

                      <option value="bank">
                        Bank
                      </option>

                      <option value="card">
                        Card
                      </option>

                      <option value="other">
                        Other
                      </option>
                    </select>

                    <ChevronDown
                      size={15}
                      className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[var(--st-gray)]"
                    />

                  </div>

                </div>

                <div>

                  <label className="mb-2 block text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--st-charcoal)]">
                    Reference
                  </label>

                  <input
                    type="text"
                    value={paymentReference}
                    onChange={(event) =>
                      setPaymentReference(
                        event.target.value
                      )
                    }
                    placeholder="M-Pesa transaction code"
                    className="w-full rounded-xl border border-[var(--st-border)] px-4 py-3.5 text-[11px] outline-none focus:border-[var(--st-red)]"
                  />

                </div>

              </div>

              {error && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3">

                  <p className="m-0 text-[10px] text-red-700">
                    {error}
                  </p>

                </div>
              )}

              <button
                type="button"
                onClick={recordPayment}
                disabled={
                  updatingId ===
                  selectedStudent
                    .student.id
                }
                className="st-button st-button-primary mt-6 w-full disabled:opacity-60"
              >
                {updatingId ===
                selectedStudent
                  .student.id ? (
                  <>
                    <RefreshCw
                      size={15}
                      className="animate-spin"
                    />
                    Recording...
                  </>
                ) : (
                  <>
                    <Check size={15} />
                    Record payment
                  </>
                )}
              </button>

            </div>

          </div>
        )}

      {/* =====================================================
          ADD STUDENT PLACEHOLDER
          We will wire this to leads + enrollment next.
      ===================================================== */}

      {showAddStudent && (
        <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/50 sm:items-center sm:p-5">

          <div className="w-full max-w-[500px] rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl">

            <div className="flex items-start justify-between gap-4">

              <div>

                <p className="st-eyebrow">
                  NEW STUDENT
                </p>

                <h2 className="mt-1 text-[21px] font-bold text-[var(--st-charcoal-dark)]">
                  Add a student
                </h2>

                <p className="mt-2 text-[10px] leading-relaxed text-[var(--st-gray)]">
                  The student registration workflow will
                  connect a lead, programme and payment plan.
                </p>

              </div>

              <button
                type="button"
                onClick={() =>
                  setShowAddStudent(
                    false
                  )
                }
                className="st-icon-button"
              >
                <X size={17} />
              </button>

            </div>

            <div className="mt-6 rounded-2xl bg-[var(--st-bg-soft)] p-5">

              <div className="flex items-start gap-3">

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[var(--st-red)]">
                  <User size={18} />
                </div>

                <div>

                  <p className="m-0 text-[11px] font-bold text-[var(--st-charcoal-dark)]">
                    Registration workflow
                  </p>

                  <p className="mt-2 mb-0 text-[10px] leading-relaxed text-[var(--st-gray)]">
                    Next we'll connect this form to your
                    existing leads so you can convert a lead
                    into a student, choose their instrument,
                    set programme dates, create the payment
                    plan and start tracking follow-ups.
                  </p>

                </div>

              </div>

            </div>

            <button
              type="button"
              onClick={() =>
                setShowAddStudent(
                  false
                )
              }
              className="st-button st-button-primary mt-5 w-full"
            >
              Continue
              <ArrowRight size={15} />
            </button>

          </div>

        </div>
      )}

    </main>
  );
}