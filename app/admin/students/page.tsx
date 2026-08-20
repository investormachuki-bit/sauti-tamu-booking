"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  PaymentMethod,
} from "@/types/students";

import { supabase } from "../../../lib/supabase";

import StudentsHeader from "../../../components/students/StudentsHeader";
import StudentStats from "../../../components/students/StudentStats";
import StudentsToolbar from "../../../components/students/StudentsToolbar";
import StudentList from "../../../components/students/StudentList";

import StudentDetails from "../../../components/students/StudentDetails";
import AddStudentModal from "../../../components/students/AddStudentModal";
import PaymentModal from "../../../components/students/PaymentModal";

import {
  AlertCircle,
  RefreshCw,
} from "lucide-react";

/* =========================================================
   TYPES
========================================================= */

type Instrument =
  | "piano"
  | "guitar";

type StudentStatus =
  | "active"
  | "completed"
  | "paused"
  | "cancelled"
  | "inactive";

type PaymentScheduleStatus =
  | "scheduled"
  | "due"
  | "overdue"
  | "partially_paid"
  | "paid"
  | "cancelled";

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
  status: StudentStatus;
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
  created_at: string;
};

type StudentRecord = {
  student: Student;
  enrollment: Enrollment | null;
  schedules: PaymentSchedule[];
  payments: Payment[];
};

/* =========================================================
   HELPERS
========================================================= */

const NAIROBI_TIME_ZONE = "Africa/Nairobi";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);
}

function formatDate(value: string) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en-KE", {
    timeZone: NAIROBI_TIME_ZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(
    new Date(`${value}T00:00:00+03:00`)
  );
}

function getTodayKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: NAIROBI_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function getTotalPaid(
  payments: Payment[]
) {
  return payments.reduce(
    (sum, payment) =>
      sum + Number(payment.amount || 0),
    0
  );
}

function getBalance(
  enrollment: Enrollment | null,
  payments: Payment[]
) {
  if (!enrollment) return 0;

  return Math.max(
    Number(enrollment.total_fee || 0) -
      getTotalPaid(payments),
    0
  );
}

/* =========================================================
   PAGE
========================================================= */

export default function AdminStudentsPage() {
  /* -------------------------------------------------------
     DATA
  ------------------------------------------------------- */

  const [students, setStudents] =
    useState<StudentRecord[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  /* -------------------------------------------------------
     SEARCH / FILTERS
  ------------------------------------------------------- */

  const [searchTerm, setSearchTerm] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("all");

  const [instrumentFilter, setInstrumentFilter] =
    useState("all");

  const [paymentFilter, setPaymentFilter] =
    useState("all");

  const [showFilters, setShowFilters] =
    useState(false);

  /* -------------------------------------------------------
     MODALS
  ------------------------------------------------------- */

  const [selectedStudent, setSelectedStudent] =
    useState<StudentRecord | null>(null);

  const [showAddStudent, setShowAddStudent] =
    useState(false);

  const [showPaymentModal, setShowPaymentModal] =
    useState(false);

  const [paymentStudent, setPaymentStudent] =
    useState<StudentRecord | null>(null);

  /* =======================================================
     LOAD STUDENTS
  ======================================================= */

  const loadStudents = useCallback(
    async (silent = false) => {
      try {
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
            "id, lead_id, full_name, email, whatsapp_number, status, notes, created_at, updated_at"
          )
          .order("created_at", {
            ascending: false,
          });

        if (studentsError) {
          throw studentsError;
        }

        const studentRows =
          (studentsData ?? []) as Student[];

        if (!studentRows.length) {
          setStudents([]);
          return;
        }

        const studentIds =
          studentRows.map(
            (student) => student.id
          );

        /* -------------------------------------------------
           ENROLLMENTS
        ------------------------------------------------- */

        const {
          data: enrollmentData,
          error: enrollmentError,
        } = await supabase
          .from("student_enrollments")
          .select(
            "id, student_id, instrument, programme_name, start_date, end_date, total_fee, status, notes, created_at, updated_at"
          )
          .in(
            "student_id",
            studentIds
          )
          .order("created_at", {
            ascending: false,
          });

        if (enrollmentError) {
          throw enrollmentError;
        }

        const enrollments =
          (enrollmentData ??
            []) as Enrollment[];

        /* -------------------------------------------------
           PAYMENTS
        ------------------------------------------------- */

        const {
          data: paymentData,
          error: paymentError,
        } = await supabase
          .from("payments")
          .select(
            "id, student_id, enrollment_id, payment_schedule_id, amount, payment_date, payment_method, reference, notes, created_at"
          )
          .in(
            "student_id",
            studentIds
          )
          .order("payment_date", {
            ascending: false,
          })
          .order("created_at", {
            ascending: false,
          });

        if (paymentError) {
          throw paymentError;
        }

        const payments =
          (paymentData ?? []) as Payment[];

        /* -------------------------------------------------
           PAYMENT SCHEDULES
        ------------------------------------------------- */

        const enrollmentIds =
          enrollments.map(
            (enrollment) =>
              enrollment.id
          );

        let schedules: PaymentSchedule[] =
          [];

        if (enrollmentIds.length) {
          const {
            data: scheduleData,
            error: scheduleError,
          } = await supabase
            .from("payment_schedule")
            .select(
              "id, enrollment_id, amount_due, due_date, follow_up_date, status, notes"
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
              scheduleError
            );
          }

          schedules =
            (scheduleData ??
              []) as PaymentSchedule[];
        }

        /* -------------------------------------------------
           MAP DATA
        ------------------------------------------------- */

        const enrollmentMap =
          new Map<
            string,
            Enrollment
          >();

        for (const enrollment of enrollments) {
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

        const paymentMap =
          new Map<
            string,
            Payment[]
          >();

        for (const payment of payments) {
          const current =
            paymentMap.get(
              payment.student_id
            ) ?? [];

          paymentMap.set(
            payment.student_id,
            [...current, payment]
          );
        }

        const scheduleMap =
          new Map<
            string,
            PaymentSchedule[]
          >();

        for (const schedule of schedules) {
          const current =
            scheduleMap.get(
              schedule.enrollment_id
            ) ?? [];

          scheduleMap.set(
            schedule.enrollment_id,
            [...current, schedule]
          );
        }

        /* -------------------------------------------------
           FINAL RECORDS
        ------------------------------------------------- */

        const records =
          studentRows.map(
            (student) => {
              const enrollment =
                enrollmentMap.get(
                  student.id
                ) ?? null;

              return {
                student,
                enrollment,
                payments:
                  paymentMap.get(
                    student.id
                  ) ?? [],
                schedules:
                  enrollment
                    ? scheduleMap.get(
                        enrollment.id
                      ) ?? []
                    : [],
              };
            }
          );

        setStudents(records);
      } catch (err) {
        console.error(
          "Students loading error:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "We couldn't load students. Please try again."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  /* =======================================================
     FILTERED STUDENTS
  ======================================================= */

  const filteredStudents =
    useMemo(() => {
      const query =
        searchTerm
          .trim()
          .toLowerCase();

      return students.filter(
        (record) => {
          const student =
            record.student;

          const enrollment =
            record.enrollment;

          /* SEARCH */

          const searchableText =
            [
              student.full_name,
              student.email,
              student.whatsapp_number,
              enrollment?.programme_name ??
                "",
              enrollment?.instrument ??
                "",
            ]
              .join(" ")
              .toLowerCase();

          if (
            query &&
            !searchableText.includes(
              query
            )
          ) {
            return false;
          }

          /* STATUS */

          if (
            statusFilter !== "all" &&
            (
              enrollment?.status ??
              student.status
            ).toLowerCase() !==
              statusFilter.toLowerCase()
          ) {
            return false;
          }

          /* INSTRUMENT */

          if (
            instrumentFilter !==
              "all" &&
            enrollment?.instrument
              ?.toLowerCase() !==
              instrumentFilter.toLowerCase()
          ) {
            return false;
          }

          /* PAYMENT */

          const balance =
            getBalance(
              enrollment,
              record.payments
            );

          if (
            paymentFilter ===
              "balance" &&
            balance <= 0
          ) {
            return false;
          }

          if (
            paymentFilter ===
              "paid" &&
            (
              !enrollment ||
              balance > 0
            )
          ) {
            return false;
          }

          if (
            paymentFilter ===
              "none" &&
            record.payments.length > 0
          ) {
            return false;
          }

          return true;
        }
      );
    }, [
      students,
      searchTerm,
      statusFilter,
      instrumentFilter,
      paymentFilter,
    ]);

  /* =======================================================
     STATS
  ======================================================= */

  const stats = useMemo(() => {
    const totalStudents =
      students.length;

    const activeStudents =
      students.filter(
        (record) =>
          (
            record.enrollment
              ?.status ??
            record.student.status
          ).toLowerCase() ===
          "active"
      ).length;

    const totalOutstanding =
      students.reduce(
        (total, record) =>
          total +
          getBalance(
            record.enrollment,
            record.payments
          ),
        0
      );

    const studentsWithBalance =
      students.filter(
        (record) =>
          getBalance(
            record.enrollment,
            record.payments
          ) > 0
      ).length;

    const totalCollected =
      students.reduce(
        (total, record) =>
          total +
          getTotalPaid(
            record.payments
          ),
        0
      );

    return {
      totalStudents,
      activeStudents,
      totalCollected,
      totalOutstanding,
      studentsWithBalance,
    };
  }, [students]);

  /* =======================================================
     SELECT STUDENT
  ======================================================= */

  const handleSelectStudent =
    useCallback(
      (record: StudentRecord) => {
        setSelectedStudent(
          record
        );
      },
      []
    );

  /* =======================================================
     REFRESH
  ======================================================= */

  const handleRefresh =
    useCallback(async () => {
      await loadStudents(true);
    }, [loadStudents]);

  /* =======================================================
     ADD STUDENT
  ======================================================= */

  const handleStudentAdded =
    useCallback(async () => {
      setShowAddStudent(false);
      await loadStudents(true);
    }, [loadStudents]);

  /* =======================================================
     PAYMENT
  ======================================================= */

  const handleOpenPayment =
    useCallback(
      (record: StudentRecord) => {
        setPaymentStudent(record);
        setShowPaymentModal(true);
      },
      []
    );

  const handlePaymentComplete =
    useCallback(async () => {
      setShowPaymentModal(false);
      setPaymentStudent(null);

      await loadStudents(true);
    }, [loadStudents]);

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="min-h-full bg-[var(--st-bg-soft)]">

      <div className="mx-auto w-full max-w-[1400px] px-4 py-5 sm:px-6 lg:px-8">

        {/* =================================================
            HEADER
        ================================================= */}

        <StudentsHeader
          studentCount={
            stats.totalStudents
          }
          searchTerm={
            searchTerm
          }
          setSearchTerm={
            setSearchTerm
          }
          onAddStudent={() =>
            setShowAddStudent(
              true
            )
          }
        />

        {/* =================================================
            ERROR
        ================================================= */}

        {error && (
          <div className="mt-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">

            <AlertCircle
              size={15}
              className="mt-0.5 shrink-0 text-red-600"
            />

            <p className="m-0 text-[10px] text-red-700">
              {error}
            </p>

          </div>
        )}

        {/* =================================================
            STATS
        ================================================= */}

        <div className="mt-5">

          <StudentStats
            totalStudents={
              stats.totalStudents
            }
            activeStudents={
              stats.activeStudents
            }
            totalOutstanding={
              stats.totalOutstanding
            }
            studentsWithBalance={
              stats.studentsWithBalance
            }
            formatCurrency={
              formatCurrency
            }
          />

        </div>

        {/* =================================================
            TOOLBAR
        ================================================= */}

        <div className="mt-5">

          <StudentsToolbar
            searchTerm={
              searchTerm
            }
            setSearchTerm={
              setSearchTerm
            }

            statusFilter={
              statusFilter
            }
            setStatusFilter={
              setStatusFilter
            }

            instrumentFilter={
              instrumentFilter
            }
            setInstrumentFilter={
              setInstrumentFilter
            }

            paymentFilter={
              paymentFilter
            }
            setPaymentFilter={
              setPaymentFilter
            }

            showFilters={
              showFilters
            }
            setShowFilters={
              setShowFilters
            }

            onAddStudent={() =>
              setShowAddStudent(
                true
              )
            }

            totalStudents={
              students.length
            }

            filteredStudents={
              filteredStudents.length
            }
          />

        </div>

        {/* =================================================
            STUDENT LIST
        ================================================= */}

        <div className="mt-5">

          <StudentList
            students={
              filteredStudents
            }
            loading={loading}
            onSelectStudent={
              handleSelectStudent
            }
            formatCurrency={
              formatCurrency
            }
            formatDate={
              formatDate
            }
            getBalance={
              getBalance
            }
          />

        </div>

      </div>

      {/* ===================================================
          STUDENT DETAILS
      =================================================== */}

      {selectedStudent && (
        <StudentDetails
          selectedStudent={
            selectedStudent
          }
          onClose={() =>
            setSelectedStudent(
              null
            )
          }
          formatCurrency={
            formatCurrency
          }
          formatDate={
            formatDate
          }
          getBalance={
            getBalance
          }
          onPayment={() =>
            handleOpenPayment(
              selectedStudent
            )
          }
          onRefresh={
            handleRefresh
          }
        />
      )}

      {/* ===================================================
          ADD STUDENT
      =================================================== */}

      {showAddStudent && (
        <AddStudentModal
          onClose={() =>
            setShowAddStudent(
              false
            )
          }
          onStudentAdded={
            handleStudentAdded
          }
        />
      )}

      {/* ===================================================
          PAYMENT
      =================================================== */}

      {showPaymentModal &&
        paymentStudent && (
          <PaymentModal
            student={
              paymentStudent
            }
            onClose={() => {
              setShowPaymentModal(
                false
              );
              setPaymentStudent(
                null
              );
            }}
            onComplete={
              handlePaymentComplete
            }
          />
        )}

      {/* ===================================================
          REFRESH INDICATOR
      =================================================== */}

      {refreshing && (
        <div className="pointer-events-none fixed bottom-5 right-5 z-[200] flex items-center gap-2 rounded-full border border-[var(--st-border)] bg-white px-4 py-2.5 text-[9px] font-semibold text-[var(--st-gray)] shadow-lg">

          <RefreshCw
            size={12}
            className="animate-spin"
          />

          Refreshing...

        </div>
      )}

    </div>
  );
}
