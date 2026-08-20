"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";

import StudentsHeader from "../../../components/students/StudentsHeader";
import StudentStats from "../../../components/students/StudentStats";
import StudentsToolbar from "../../../components/students/StudentsToolbar";
import StudentList from "../../../components/students/StudentList";
import StudentDetails from "../../../components/students/StudentDetails";
import PaymentModal from "../../../components/students/PaymentModal";
import AddStudentModal from "../../../components/students/AddStudentModal";

import type { PaymentMethod } from "@/types/students";

type Payment = {
  id: string;
  amount: number | string;
  payment_date: string;
  payment_method: string;
  reference?: string | null;
};

type Student = {
  id: string;
  full_name: string;
  whatsapp?: string | null;
  email?: string | null;
  notes?: string | null;
};

type Enrollment = {
  id: string;
  instrument?: string | null;
  programme_name?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  total_fee?: number | string | null;
  status?: string | null;
};

type StudentItem = {
  student: Student;
  enrollment: Enrollment | null;
  payments: Payment[];
};

export default function StudentsPage() {
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [instrumentFilter, setInstrumentFilter] =
    useState("all");
  const [statusFilter, setStatusFilter] =
    useState("all");

  const [selectedStudent, setSelectedStudent] =
    useState<StudentItem | null>(null);

  const [showDetails, setShowDetails] =
    useState(false);

  const [showPaymentForm, setShowPaymentForm] =
    useState(false);

  const [showAddStudent, setShowAddStudent] =
    useState(false);

  const [paymentAmount, setPaymentAmount] =
    useState("");

  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("mpesa");

  const [paymentReference, setPaymentReference] =
    useState("");

  const [updatingId, setUpdatingId] =
    useState<string | null>(null);

  const [actionError, setActionError] =
    useState<string | null>(null);

  /*
   * ---------------------------------------------------------
   * HELPERS
   * ---------------------------------------------------------
   */

  const formatCurrency = useCallback(
    (amount: number) => {
      return new Intl.NumberFormat("en-KE", {
        style: "currency",
        currency: "KES",
        maximumFractionDigits: 0,
      }).format(Number(amount || 0));
    },
    [],
  );

  const formatDate = useCallback(
    (date: string | null | undefined) => {
      if (!date) return "—";

      const parsed = new Date(date);

      if (Number.isNaN(parsed.getTime())) {
        return "—";
      }

      return new Intl.DateTimeFormat("en-KE", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(parsed);
    },
    [],
  );

  const instrumentName = useCallback(
    (instrument: string | null | undefined) => {
      if (!instrument) return "—";

      switch (instrument.toLowerCase()) {
        case "piano":
          return "Piano";

        case "guitar":
          return "Acoustic Guitar";

        default:
          return instrument;
      }
    },
    [],
  );

  const getBalance = useCallback(
    (
      enrollment: Enrollment,
      payments: Payment[],
    ) => {
      const totalFee = Number(
        enrollment?.total_fee || 0,
      );

      const totalPaid = payments.reduce(
        (total, payment) =>
          total +
          Number(payment.amount || 0),
        0,
      );

      return Math.max(
        totalFee - totalPaid,
        0,
      );
    },
    [],
  );

  /*
   * ---------------------------------------------------------
   * LOAD STUDENTS
   * ---------------------------------------------------------
   *
   * Keep this isolated so we can replace the data source
   * without rebuilding the page structure.
   */

  const loadStudents = useCallback(
    async () => {
      try {
        setLoading(true);
        setError(null);

        /*
         * IMPORTANT:
         * Replace this endpoint with the existing students
         * data endpoint/service if your project already has one.
         */

        const response = await fetch(
          "/api/admin/students",
          {
            cache: "no-store",
          },
        );

        if (!response.ok) {
          throw new Error(
            "Failed to load students.",
          );
        }

        const data = await response.json();

        const rows =
          Array.isArray(data)
            ? data
            : Array.isArray(data?.students)
              ? data.students
              : [];

        setStudents(rows);
      } catch (err) {
        console.error(
          "Students loading error:",
          err,
        );

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load students.",
        );
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  /*
   * ---------------------------------------------------------
   * FILTERED STUDENTS
   * ---------------------------------------------------------
   */

  const filteredStudents = useMemo(() => {
    const query = search
      .trim()
      .toLowerCase();

    return students.filter((item) => {
      const student = item.student;
      const enrollment = item.enrollment;

      const matchesSearch =
        !query ||
        student.full_name
          .toLowerCase()
          .includes(query) ||
        student.whatsapp
          ?.toLowerCase()
          .includes(query) ||
        student.email
          ?.toLowerCase()
          .includes(query);

      const matchesInstrument =
        instrumentFilter === "all" ||
        enrollment?.instrument
          ?.toLowerCase() ===
          instrumentFilter.toLowerCase();

      const matchesStatus =
        statusFilter === "all" ||
        enrollment?.status
          ?.toLowerCase() ===
          statusFilter.toLowerCase();

      return (
        matchesSearch &&
        matchesInstrument &&
        matchesStatus
      );
    });
  }, [
    students,
    search,
    instrumentFilter,
    statusFilter,
  ]);

  /*
   * ---------------------------------------------------------
   * STATS
   * ---------------------------------------------------------
   */

  const stats = useMemo(() => {
    const totalStudents =
      students.length;

    const activeStudents =
      students.filter(
        (item) =>
          item.enrollment?.status
            ?.toLowerCase() ===
          "active",
      ).length;

    const totalRevenue =
      students.reduce(
        (total, item) =>
          total +
          item.payments.reduce(
            (sum, payment) =>
              sum +
              Number(
                payment.amount || 0,
              ),
            0,
          ),
        0,
      );

    const outstanding =
      students.reduce(
        (total, item) => {
          if (!item.enrollment) {
            return total;
          }

          return (
            total +
            getBalance(
              item.enrollment,
              item.payments,
            )
          );
        },
        0,
      );

    return {
      totalStudents,
      activeStudents,
      totalRevenue,
      outstanding,
    };
  }, [students, getBalance]);

  /*
   * ---------------------------------------------------------
   * STUDENT SELECTION
   * ---------------------------------------------------------
   */

  const handleSelectStudent = (
    student: StudentItem,
  ) => {
    setSelectedStudent(student);
  };

  const handleViewDetails = (
    student: StudentItem,
  ) => {
    setSelectedStudent(student);
    setShowDetails(true);
  };

  const closeDetails = () => {
    setShowDetails(false);
  };

  /*
   * ---------------------------------------------------------
   * CONTACT ACTIONS
   * ---------------------------------------------------------
   */

  const openWhatsApp = (
    item: StudentItem,
  ) => {
    const number =
      item.student.whatsapp;

    if (!number) return;

    const cleaned = number.replace(
      /\D/g,
      "",
    );

    const formatted =
      cleaned.startsWith("0")
        ? `254${cleaned.slice(1)}`
        : cleaned;

    window.open(
      `https://wa.me/${formatted}`,
      "_blank",
    );
  };

  const callStudent = (
    item: StudentItem,
  ) => {
    if (!item.student.whatsapp) return;

    window.location.href = `tel:${item.student.whatsapp}`;
  };

  const emailStudent = (
    item: StudentItem,
  ) => {
    if (!item.student.email) return;

    window.location.href = `mailto:${item.student.email}`;
  };

  /*
   * ---------------------------------------------------------
   * PAYMENT
   * ---------------------------------------------------------
   */

  const openReceivePayment = () => {
    if (!selectedStudent?.enrollment) {
      return;
    }

    setActionError(null);
    setPaymentAmount("");
    setPaymentReference("");
    setPaymentMethod("mpesa");
    setShowPaymentForm(true);
  };

  const recordPayment = async () => {
    if (!selectedStudent) {
      return;
    }

    const amount =
      Number(paymentAmount);

    if (!amount || amount <= 0) {
      setActionError(
        "Enter a valid payment amount.",
      );
      return;
    }

    try {
      setUpdatingId(
        selectedStudent.student.id,
      );
      setActionError(null);

      /*
       * This is intentionally kept simple for the first
       * compilation pass. Connect this to the existing
       * payment service/API once the page is compiling.
       */

      const response = await fetch(
        "/api/admin/payments",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            student_id:
              selectedStudent.student.id,
            enrollment_id:
              selectedStudent.enrollment?.id,
            amount,
            payment_method:
              paymentMethod,
            reference:
              paymentReference || null,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(
          "Failed to record payment.",
        );
      }

      setShowPaymentForm(false);

      await loadStudents();

      /*
       * Refresh selected student from the
       * newly loaded dataset.
       */
    } catch (err) {
      console.error(
        "Payment error:",
        err,
      );

      setActionError(
        err instanceof Error
          ? err.message
          : "Failed to record payment.",
      );
    } finally {
      setUpdatingId(null);
    }
  };

  /*
   * ---------------------------------------------------------
   * RECEIPTS
   * ---------------------------------------------------------
   */

  const viewReceipt = (
    student: StudentItem,
    payment: Payment,
  ) => {
    console.log(
      "View receipt",
      student,
      payment,
    );
  };

  const downloadReceipt = (
    student: StudentItem,
    payment: Payment,
  ) => {
    console.log(
      "Download receipt",
      student,
      payment,
    );
  };

  const emailReceipt = (
    student: StudentItem,
    payment: Payment,
  ) => {
    if (!student.student.email) {
      return;
    }

    window.location.href =
      `mailto:${student.student.email}?subject=Payment Receipt`;
  };

  /*
   * ---------------------------------------------------------
   * RENDER
   * ---------------------------------------------------------
   */

  return (
    <main className="min-h-screen bg-[var(--st-bg-soft)]">

      <div className="mx-auto w-full max-w-[1400px] p-4 sm:p-6">

        {/* HEADER */}

        <StudentsHeader
          onAddStudent={() =>
            setShowAddStudent(true)
          }
          onRefresh={loadStudents}
          loading={loading}
        />

        {/* ERROR */}

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[10px] text-red-700">
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
            totalRevenue={
              stats.totalRevenue
            }
            outstanding={
              stats.outstanding
            }
            formatCurrency={
              formatCurrency
            }
          />
        </div>

        {/* TOOLBAR */}

        <div className="mt-5">
          <StudentsToolbar
            search={search}
            setSearch={setSearch}
            instrumentFilter={
              instrumentFilter
            }
            setInstrumentFilter={
              setInstrumentFilter
            }
            statusFilter={
              statusFilter
            }
            setStatusFilter={
              setStatusFilter
            }
            resultCount={
              filteredStudents.length
            }
          />
        </div>

        {/* CONTENT */}

        <div className="mt-5">

          {loading ? (
            <div className="rounded-2xl border border-[var(--st-border)] bg-white p-10 text-center">

              <RefreshCw
                size={20}
                className="mx-auto animate-spin text-[var(--st-red)]"
              />

              <p className="mt-3 mb-0 text-[11px] font-semibold text-[var(--st-charcoal-dark)]">
                Loading students...
              </p>

            </div>
          ) : (
            <StudentList
              students={
                filteredStudents
              }
              selectedStudentId={
                selectedStudent?.student
                  .id
              }
              onSelectStudent={
                handleSelectStudent
              }
              formatCurrency={
                formatCurrency
              }
              formatDate={
                formatDate
              }
              instrumentName={
                instrumentName
              }
              getBalance={
                getBalance
              }
              openWhatsApp={
                openWhatsApp
              }
              callStudent={
                callStudent
              }
              emailStudent={
                emailStudent
              }
            />
          )}

        </div>

      </div>

      {/* STUDENT DETAILS */}

      {showDetails &&
        selectedStudent && (
          <StudentDetails
            selectedStudent={
              selectedStudent
            }
            onClose={closeDetails}
            onWhatsApp={
              openWhatsApp
            }
            onCall={
              callStudent
            }
            onEmail={
              emailStudent
            }
            onReceivePayment={
              openReceivePayment
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
            formatDate={
              formatDate
            }
            getBalance={
              getBalance
            }
          />
        )}

      {/* PAYMENT MODAL */}

      {showPaymentForm &&
        selectedStudent && (
          <PaymentModal
            selectedStudent={
              selectedStudent
            }
            paymentAmount={
              paymentAmount
            }
            setPaymentAmount={
              setPaymentAmount
            }
            paymentMethod={
              paymentMethod
            }
            setPaymentMethod={
              setPaymentMethod
            }
            paymentReference={
              paymentReference
            }
            setPaymentReference={
              setPaymentReference
            }
            showPaymentForm={
              showPaymentForm
            }
            setShowPaymentForm={
              setShowPaymentForm
            }
            updatingId={
              updatingId
            }
            recordPayment={
              recordPayment
            }
            error={
              actionError
            }
            formatCurrency={
              formatCurrency
            }
            getBalance={
              getBalance
            }
          />
        )}

      {/* ADD STUDENT */}

      {showAddStudent && (
        <AddStudentModal
          open={showAddStudent}
          onClose={() =>
            setShowAddStudent(false)
          }
          onSuccess={async () => {
            setShowAddStudent(false);
            await loadStudents();
          }}
        />
      )}

    </main>
  );
}
