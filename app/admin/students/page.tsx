"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import StudentsHeader from "@/components/students/StudentsHeader";
import StudentStats from "@/components/students/StudentStats";
import StudentsToolbar from "@/components/students/StudentsToolbar";
import StudentList from "@/components/students/StudentList";
import StudentDetails, {
  type SelectedStudent,
} from "@/components/students/StudentDetails";
import AddStudentModal from "@/components/students/AddStudentModal";
import PaymentModal from "@/components/students/PaymentModal";

import { supabase } from "@/lib/supabase";

type PaymentMethod =
  | "mpesa"
  | "cash"
  | "bank"
  | "card"
  | "other";

interface Student {
  id: string;
  full_name: string;
  whatsapp?: string | null;
  email?: string | null;
  notes?: string | null;
}

interface Enrollment {
  id: string;
  student_id?: string | null;
  instrument?: string | null;
  programme_name?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  total_fee?: number | string | null;
  status?: string | null;
}

interface Payment {
  id: string;
  student_id?: string | null;
  enrollment_id?: string | null;
  amount: number | string;
  payment_date: string;
  payment_method: PaymentMethod | string;
  reference?: string | null;
}

interface StudentRecord {
  student: Student;
  enrollment: Enrollment | null;
  payments: Payment[];
}

interface Stats {
  totalStudents: number;
  activeStudents: number;
  totalCollected: number;
  totalOutstanding: number;
}

export default function StudentsPage() {
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [instrumentFilter, setInstrumentFilter] =
    useState("all");

  const [selectedStudent, setSelectedStudent] =
    useState<SelectedStudent | null>(null);

  const [showAddStudent, setShowAddStudent] =
    useState(false);

  const [showPaymentModal, setShowPaymentModal] =
    useState(false);

  const [paymentStudent, setPaymentStudent] =
    useState<SelectedStudent | null>(null);

  const [error, setError] = useState<string | null>(null);

  /* =====================================================
     FORMATTING
  ===================================================== */

  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      maximumFractionDigits: 0,
    }).format(Number(amount || 0));
  }, []);

  const formatDate = useCallback((date: string) => {
    if (!date) return "—";

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
      return date;
    }

    return parsed.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }, []);

  /* =====================================================
     BALANCE
  ===================================================== */

  const getBalance = useCallback(
    (
      enrollment: Enrollment,
      payments: Payment[]
    ) => {
      const totalFee = Number(
        enrollment.total_fee || 0
      );

      const totalPaid = payments.reduce(
        (total, payment) =>
          total + Number(payment.amount || 0),
        0
      );

      return Math.max(totalFee - totalPaid, 0);
    },
    []
  );

  /* =====================================================
     LOAD STUDENTS
  ===================================================== */

  const loadStudents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const {
        data: studentRows,
        error: studentsError,
      } = await supabase
        .from("students")
        .select(
          "id, full_name, whatsapp, email, notes"
        )
        .order("full_name", {
          ascending: true,
        });

      if (studentsError) {
        throw studentsError;
      }

      const {
        data: enrollmentRows,
        error: enrollmentError,
      } = await supabase
        .from("enrollments")
        .select(
          "id, student_id, instrument, programme_name, start_date, end_date, total_fee, status"
        )
        .order("created_at", {
          ascending: false,
        });

      if (enrollmentError) {
        throw enrollmentError;
      }

      const {
        data: paymentRows,
        error: paymentError,
      } = await supabase
        .from("payments")
        .select(
          "id, student_id, enrollment_id, amount, payment_date, payment_method, reference"
        )
        .order("payment_date", {
          ascending: false,
        });

      if (paymentError) {
        throw paymentError;
      }

      const safeStudents =
        (studentRows || []) as Student[];

      const safeEnrollments =
        (enrollmentRows || []) as Enrollment[];

      const safePayments =
        (paymentRows || []) as Payment[];

      const records: StudentRecord[] =
        safeStudents.map((student) => {
          const studentEnrollments =
            safeEnrollments.filter(
              (enrollment) =>
                enrollment.student_id === student.id
            );

          const enrollment =
            studentEnrollments.length > 0
              ? studentEnrollments[0]
              : null;

          const payments =
            safePayments.filter((payment) => {
              if (
                enrollment?.id &&
                payment.enrollment_id ===
                  enrollment.id
              ) {
                return true;
              }

              return (
                payment.student_id === student.id
              );
            });

          return {
            student,
            enrollment,
            payments,
          };
        });

      setStudents(records);
    } catch (err) {
      console.error(
        "Failed to load students:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load students."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  /* =====================================================
     STATS
  ===================================================== */

  const stats = useMemo<Stats>(() => {
    let totalCollected = 0;
    let totalOutstanding = 0;
    let activeStudents = 0;

    students.forEach((record) => {
      const enrollment = record.enrollment;

      const totalPaid =
        record.payments.reduce(
          (total, payment) =>
            total +
            Number(payment.amount || 0),
          0
        );

      totalCollected += totalPaid;

      if (
        enrollment?.status?.toLowerCase() ===
        "active"
      ) {
        activeStudents += 1;
      }

      if (enrollment) {
        totalOutstanding += getBalance(
          enrollment,
          record.payments
        );
      }
    });

    return {
      totalStudents: students.length,
      activeStudents,
      totalCollected,
      totalOutstanding,
    };
  }, [students, getBalance]);

  /*
   * StudentStats expects studentsWithBalance,
   * but that value is not part of the main stats object.
   */
  const studentsWithBalance = useMemo(() => {
    return students.filter((record) => {
      if (!record.enrollment) {
        return false;
      }

      return (
        getBalance(
          record.enrollment,
          record.payments
        ) > 0
      );
    }).length;
  }, [students, getBalance]);

  /* =====================================================
     FILTERED STUDENTS
  ===================================================== */

  const filteredStudents = useMemo(() => {
    const search = searchTerm
      .trim()
      .toLowerCase();

    return students.filter((record) => {
      const student = record.student;
      const enrollment = record.enrollment;

      if (search) {
        const searchable = [
          student.full_name,
          student.whatsapp,
          student.email,
          enrollment?.instrument,
          enrollment?.programme_name,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!searchable.includes(search)) {
          return false;
        }
      }

      if (statusFilter !== "all") {
        const currentStatus =
          enrollment?.status?.toLowerCase() ||
          "unregistered";

        if (
          currentStatus !==
          statusFilter.toLowerCase()
        ) {
          return false;
        }
      }

      if (instrumentFilter !== "all") {
        const currentInstrument =
          enrollment?.instrument?.toLowerCase() ||
          "";

        if (
          currentInstrument !==
          instrumentFilter.toLowerCase()
        ) {
          return false;
        }
      }

      return true;
    });
  }, [
    students,
    searchTerm,
    statusFilter,
    instrumentFilter,
  ]);

  /* =====================================================
     SELECT STUDENT
  ===================================================== */

  const handleSelectStudent = useCallback(
    (record: StudentRecord) => {
      setSelectedStudent({
        student: record.student,
        enrollment: record.enrollment,
        payments: record.payments,
      });
    },
    []
  );

  /* =====================================================
     REFRESH
  ===================================================== */

  const handleRefresh = useCallback(async () => {
    await loadStudents();
  }, [loadStudents]);

  /* =====================================================
     COMMUNICATION
  ===================================================== */

  const handleWhatsApp = useCallback(
    (record: SelectedStudent) => {
      const number = record.student.whatsapp;

      if (!number) return;

      const cleaned = number.replace(
        /[^0-9+]/g,
        ""
      );

      const message = encodeURIComponent(
        `Hello ${record.student.full_name}, this is Sauti Tamu Music School.`
      );

      window.open(
        `https://wa.me/${cleaned.replace(
          /^\+/,
          ""
        )}?text=${message}`,
        "_blank"
      );
    },
    []
  );

  const handleCall = useCallback(
    (record: SelectedStudent) => {
      if (!record.student.whatsapp) return;

      window.location.href =
        `tel:${record.student.whatsapp}`;
    },
    []
  );

  const handleEmail = useCallback(
    (record: SelectedStudent) => {
      if (!record.student.email) return;

      window.location.href =
        `mailto:${record.student.email}`;
    },
    []
  );

  /* =====================================================
     PAYMENT
  ===================================================== */

  const handleReceivePayment = useCallback(() => {
    if (!selectedStudent?.enrollment) {
      return;
    }

    setPaymentStudent(selectedStudent);
    setShowPaymentModal(true);
  }, [selectedStudent]);

  /* =====================================================
     RECEIPTS
  ===================================================== */

  const viewReceipt = useCallback(
    (
      record: SelectedStudent,
      payment: Payment
    ) => {
      window.alert(
        `Receipt\n\nStudent: ${
          record.student.full_name
        }\nAmount: ${formatCurrency(
          Number(payment.amount)
        )}\nDate: ${formatDate(
          payment.payment_date
        )}\nMethod: ${
          payment.payment_method
        }`
      );
    },
    [formatCurrency, formatDate]
  );

  const downloadReceipt = useCallback(
    (
      record: SelectedStudent,
      payment: Payment
    ) => {
      const content = [
        "SAUTI TAMU MUSIC SCHOOL",
        "",
        "PAYMENT RECEIPT",
        "",
        `Student: ${record.student.full_name}`,
        `Amount: ${formatCurrency(
          Number(payment.amount)
        )}`,
        `Date: ${formatDate(
          payment.payment_date
        )}`,
        `Payment method: ${payment.payment_method}`,
        `Reference: ${
          payment.reference || "—"
        }`,
      ].join("\n");

      const blob = new Blob([content], {
        type: "text/plain;charset=utf-8",
      });

      const url =
        URL.createObjectURL(blob);

      const anchor =
        document.createElement("a");

      anchor.href = url;
      anchor.download =
        `receipt-${payment.id}.txt`;

      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      URL.revokeObjectURL(url);
    },
    [formatCurrency, formatDate]
  );

  const emailReceipt = useCallback(
    (
      record: SelectedStudent,
      payment: Payment
    ) => {
      if (!record.student.email) return;

      const subject = encodeURIComponent(
        "Payment Receipt - Sauti Tamu Music School"
      );

      const body = encodeURIComponent(
        [
          `Hello ${record.student.full_name},`,
          "",
          "Please find your payment details below:",
          "",
          `Amount: ${formatCurrency(
            Number(payment.amount)
          )}`,
          `Date: ${formatDate(
            payment.payment_date
          )}`,
          `Payment method: ${payment.payment_method}`,
          `Reference: ${
            payment.reference || "—"
          }`,
          "",
          "Thank you.",
          "Sauti Tamu Music School",
        ].join("\n")
      );

      window.location.href =
        `mailto:${record.student.email}` +
        `?subject=${subject}&body=${body}`;
    },
    [formatCurrency, formatDate]
  );

  /* =====================================================
     ADD STUDENT
  ===================================================== */

  const handleStudentAdded = useCallback(
    async () => {
      setShowAddStudent(false);
      await loadStudents();
    },
    [loadStudents]
  );

  /* =====================================================
     PAYMENT COMPLETE
  ===================================================== */

  const handlePaymentComplete = useCallback(
    async () => {
      const selectedId =
        selectedStudent?.student.id;

      setShowPaymentModal(false);
      setPaymentStudent(null);

      await loadStudents();

      if (selectedId) {
        setStudents((currentStudents) => {
          const refreshed =
            currentStudents.find(
              (record) =>
                record.student.id ===
                selectedId
            );

          if (refreshed) {
            setSelectedStudent({
              student: refreshed.student,
              enrollment:
                refreshed.enrollment,
              payments:
                refreshed.payments,
            });
          }

          return currentStudents;
        });
      }
    },
    [loadStudents, selectedStudent]
  );

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <div className="min-h-full bg-[var(--st-bg-soft)]">
      <div className="mx-auto w-full max-w-[1400px] px-4 py-5 sm:px-6 lg:px-8">

        {/* HEADER */}

        <StudentsHeader
          studentCount={stats.totalStudents}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          onAddStudent={() =>
            setShowAddStudent(true)
          }
        />

        {/* ERROR */}

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[11px] text-red-700">
            {error}
          </div>
        )}

        {/* STATS */}

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
              studentsWithBalance
            }
            formatCurrency={
              formatCurrency
            }
          />
        </div>

        {/* TOOLBAR */}

        <div className="mt-5">
          <StudentsToolbar
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            statusFilter={statusFilter}
            setStatusFilter={
              setStatusFilter
            }
            instrumentFilter={
              instrumentFilter
            }
            setInstrumentFilter={
              setInstrumentFilter
            }
            onRefresh={handleRefresh}
            loading={loading}
          />
        </div>

        {/* STUDENT LIST */}

        <div className="mt-5">
          <StudentList
            students={filteredStudents}
            loading={loading}
            onSelectStudent={
              handleSelectStudent
            }
            formatCurrency={
              formatCurrency
            }
            formatDate={formatDate}
            getBalance={getBalance}
          />
        </div>
      </div>

      {/* STUDENT DETAILS */}

      {selectedStudent && (
        <StudentDetails
          selectedStudent={
            selectedStudent
          }
          onClose={() =>
            setSelectedStudent(null)
          }
          onWhatsApp={
            handleWhatsApp
          }
          onCall={handleCall}
          onEmail={handleEmail}
          onReceivePayment={
            handleReceivePayment
          }
          viewReceipt={
            viewReceipt
          }
          downloadReceipt={
            downloadReceipt
          }
          emailReceipt={
            emailReceipt
          }
          formatCurrency={
            formatCurrency
          }
          formatDate={formatDate}
          getBalance={getBalance}
        />
      )}

      {/* ADD STUDENT */}

      {showAddStudent && (
        <AddStudentModal
          onClose={() =>
            setShowAddStudent(false)
          }
          onSuccess={
            handleStudentAdded
          }
        />
      )}

      {/* PAYMENT */}

      {showPaymentModal &&
        paymentStudent && (
          <PaymentModal
            selectedStudent={
              paymentStudent
            }
            onClose={() => {
              setShowPaymentModal(false);
              setPaymentStudent(null);
            }}
            onSuccess={
              handlePaymentComplete
            }
            formatCurrency={
              formatCurrency
            }
          />
        )}
    </div>
  );
}
