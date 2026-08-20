"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import StudentsHeader from "../../../components/students/StudentsHeader";
import StudentStats from "../../../components/students/StudentStats";
import StudentsToolbar from "../../../components/students/StudentsToolbar";
import StudentList from "../../../components/students/StudentList";
import StudentDetails from "../../../components/students/StudentDetails";
import PaymentModal from "../../../components/students/PaymentModal";
import AddStudentModal from "../../../components/students/AddStudentModal";


type PaymentMethod =
  | "mpesa"
  | "cash"
  | "bank"
  | "card"
  | "other";


type Student = {
  id: string;
  full_name: string;
  whatsapp?: string | null;
  email?: string | null;
  notes?: string | null;
};

type Enrollment = {
  id: string;
  student_id?: string;
  instrument?: string | null;
  programme_name?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  total_fee?: number | string | null;
  status?: string | null;
};

type Payment = {
  id: string;
  student_id?: string;
  enrollment_id?: string | null;
  amount: number | string;
  payment_date: string;
  payment_method: PaymentMethod | string;
  reference?: string | null;
};

type StudentListItem = {
  student: Student;
  enrollment: Enrollment | null;
  payments: Payment[];
};

function formatCurrency(amount: number) {
  return `KES ${Number(amount || 0).toLocaleString("en-KE")}`;
}

function formatDate(date: string | null | undefined) {
  if (!date) return "—";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return parsed.toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function instrumentName(
  instrument: string | null | undefined
) {
  if (!instrument) return "—";

  switch (instrument.toLowerCase()) {
    case "piano":
      return "Piano";

    case "guitar":
      return "Acoustic Guitar";

    default:
      return instrument;
  }
}

function getBalance(
  enrollment: Enrollment,
  payments: Payment[]
) {
  const totalFee = Number(enrollment.total_fee || 0);

  const totalPaid = payments.reduce(
    (total, payment) =>
      total + Number(payment.amount || 0),
    0
  );

  return Math.max(totalFee - totalPaid, 0);
}

export default function StudentsPage() {
  const [students, setStudents] = useState<StudentListItem[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");

  const [filter, setFilter] = useState("all");

  const [selectedStudent, setSelectedStudent] =
    useState<StudentListItem | null>(null);

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

  const [paymentError, setPaymentError] =
    useState<string | null>(null);

  /*
   * ----------------------------------------------------
   * LOAD STUDENTS
   * ----------------------------------------------------
   *
   * IMPORTANT:
   * Keep this function connected to the same service/
   * Supabase query you were already using on the old
   * students page.
   *
   * For now this safely supports the new component
   * architecture without introducing another data layer.
   */

  const loadStudents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      /*
       * Replace this block with your existing student
       * service call if your previous page already has one.
       *
       * Example:
       *
       * const data = await getStudents();
       * setStudents(data);
       */

      setStudents([]);
    } catch (err) {
      console.error(err);

      setError(
        "Unable to load students. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  /*
   * ----------------------------------------------------
   * FILTERED STUDENTS
   * ----------------------------------------------------
   */

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();

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
          .includes(query) ||
        enrollment?.programme_name
          ?.toLowerCase()
          .includes(query) ||
        enrollment?.instrument
          ?.toLowerCase()
          .includes(query);

      if (!matchesSearch) {
        return false;
      }

      if (filter === "all") {
        return true;
      }

      if (filter === "active") {
        return (
          enrollment?.status?.toLowerCase() ===
          "active"
        );
      }

      if (filter === "completed") {
        return (
          enrollment?.status?.toLowerCase() ===
          "completed"
        );
      }

      if (filter === "balance") {
        return (
          !!enrollment &&
          getBalance(
            enrollment,
            item.payments
          ) > 0
        );
      }

      if (filter === "paid") {
        return (
          !!enrollment &&
          getBalance(
            enrollment,
            item.payments
          ) <= 0
        );
      }

      return true;
    });
  }, [students, search, filter]);

  /*
   * ----------------------------------------------------
   * STATS
   * ----------------------------------------------------
   */

  const stats = useMemo(() => {
    const totalStudents = students.length;

    const activeStudents = students.filter(
      (item) =>
        item.enrollment?.status?.toLowerCase() ===
        "active"
    ).length;

    const totalCollected = students.reduce(
      (total, item) =>
        total +
        item.payments.reduce(
          (sum, payment) =>
            sum + Number(payment.amount || 0),
          0
        ),
      0
    );

    const totalOutstanding = students.reduce(
      (total, item) => {
        if (!item.enrollment) {
          return total;
        }

        return (
          total +
          getBalance(
            item.enrollment,
            item.payments
          )
        );
      },
      0
    );

    return {
      totalStudents,
      activeStudents,
      totalCollected,
      totalOutstanding,
    };
  }, [students]);

  /*
   * ----------------------------------------------------
   * STUDENT SELECTION
   * ----------------------------------------------------
   */

  function handleSelectStudent(
    student: StudentListItem
  ) {
    setSelectedStudent(student);
    setShowDetails(true);
  }

  /*
   * ----------------------------------------------------
   * WHATSAPP
   * ----------------------------------------------------
   */

  function openWhatsApp(
    item: StudentListItem
  ) {
    const number = item.student.whatsapp;

    if (!number) return;

    const cleaned = number.replace(
      /\D/g,
      ""
    );

    const international =
      cleaned.startsWith("0")
        ? `254${cleaned.slice(1)}`
        : cleaned;

    window.open(
      `https://wa.me/${international}`,
      "_blank"
    );
  }

  /*
   * ----------------------------------------------------
   * CALL
   * ----------------------------------------------------
   */

  function callStudent(
    item: StudentListItem
  ) {
    if (!item.student.whatsapp) return;

    window.location.href = `tel:${item.student.whatsapp}`;
  }

  /*
   * ----------------------------------------------------
   * EMAIL
   * ----------------------------------------------------
   */

  function emailStudent(
    item: StudentListItem
  ) {
    if (!item.student.email) return;

    window.location.href = `mailto:${item.student.email}`;
  }

  /*
   * ----------------------------------------------------
   * RECEIVE PAYMENT
   * ----------------------------------------------------
   */

  function openPaymentForm() {
    if (!selectedStudent?.enrollment) {
      return;
    }

    setPaymentAmount("");
    setPaymentReference("");
    setPaymentMethod("mpesa");
    setPaymentError(null);

    setShowPaymentForm(true);
  }

  /*
   * ----------------------------------------------------
   * RECORD PAYMENT
   * ----------------------------------------------------
   */

  async function recordPayment() {
    if (!selectedStudent) {
      return;
    }

    if (!selectedStudent.enrollment) {
      setPaymentError(
        "This student does not have an active programme."
      );

      return;
    }

    const amount = Number(paymentAmount);

    if (!amount || amount <= 0) {
      setPaymentError(
        "Enter a valid payment amount."
      );

      return;
    }

    try {
      setUpdatingId(
        selectedStudent.student.id
      );

      setPaymentError(null);

      /*
       * Connect your existing payment service/RPC here.
       *
       * Example:
       *
       * await createPayment({
       *   student_id: selectedStudent.student.id,
       *   enrollment_id:
       *     selectedStudent.enrollment.id,
       *   amount,
       *   payment_method: paymentMethod,
       *   reference: paymentReference || null,
       * });
       */

      const newPayment: Payment = {
        id: crypto.randomUUID(),
        student_id:
          selectedStudent.student.id,
        enrollment_id:
          selectedStudent.enrollment.id,
        amount,
        payment_date:
          new Date().toISOString(),
        payment_method: paymentMethod,
        reference:
          paymentReference || null,
      };

      const updatedStudent: StudentListItem = {
        ...selectedStudent,
        payments: [
          ...selectedStudent.payments,
          newPayment,
        ],
      };

      setStudents((current) =>
        current.map((item) =>
          item.student.id ===
          selectedStudent.student.id
            ? updatedStudent
            : item
        )
      );

      setSelectedStudent(updatedStudent);

      setPaymentAmount("");
      setPaymentReference("");
      setShowPaymentForm(false);
    } catch (err) {
      console.error(err);

      setPaymentError(
        "Unable to record payment. Please try again."
      );
    } finally {
      setUpdatingId(null);
    }
  }

  /*
   * ----------------------------------------------------
   * RECEIPTS
   * ----------------------------------------------------
   */

  function viewReceipt(
    student: StudentListItem,
    payment: Payment
  ) {
    console.log(
      "View receipt",
      student,
      payment
    );
  }

  function downloadReceipt(
    student: StudentListItem,
    payment: Payment
  ) {
    console.log(
      "Download receipt",
      student,
      payment
    );
  }

  function emailReceipt(
    student: StudentListItem,
    payment: Payment
  ) {
    if (!student.student.email) {
      return;
    }

    console.log(
      "Email receipt",
      student,
      payment
    );
  }

  /*
   * ----------------------------------------------------
   * ADD STUDENT
   * ----------------------------------------------------
   */

  function handleStudentAdded() {
    setShowAddStudent(false);
    loadStudents();
  }

  /*
   * ----------------------------------------------------
   * REFRESH
   * ----------------------------------------------------
   */

  async function handleRefresh() {
    await loadStudents();
  }

  return (
    <main className="min-h-screen bg-[var(--st-bg-soft)]">

      {/* HEADER */}

      <StudentsHeader
  studentCount={students.length}
  searchTerm={search}
  setSearchTerm={setSearch}
  onAddStudent={() =>
    setShowAddStudent(true)
  }
/>

      <div className="mx-auto w-full max-w-[1400px] px-4 py-5 sm:px-6 lg:px-8">

        {/* ERROR */}

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <p className="m-0 text-[10px] text-red-700">
              {error}
            </p>
          </div>
        )}

        {/* STATS */}

        <StudentStats
          totalStudents={
            stats.totalStudents
          }
          activeStudents={
            stats.activeStudents
          }
          totalCollected={
            stats.totalCollected
          }
          totalOutstanding={
            stats.totalOutstanding
          }
          formatCurrency={
            formatCurrency
          }
        />

        {/* TOOLBAR */}

        <div className="mt-5">
          <StudentsToolbar
            search={search}
            setSearch={setSearch}
            filter={filter}
            setFilter={setFilter}
            totalStudents={
              filteredStudents.length
            }
          />
        </div>

        {/* CONTENT */}

        <div className="mt-5">

          {loading ? (
            <div className="rounded-2xl border border-[var(--st-border)] bg-white p-10 text-center">
              <p className="m-0 text-[11px] font-semibold text-[var(--st-gray)]">
                Loading students...
              </p>
            </div>
          ) : (
            <StudentList
              students={
                filteredStudents
              }
              selectedStudentId={
                selectedStudent?.student.id
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
            onClose={() =>
              setShowDetails(false)
            }
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
              openPaymentForm
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
              paymentError
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
          onClose={() =>
            setShowAddStudent(false)
          }
          onSuccess={
            handleStudentAdded
          }
        />
      )}

    </main>
  );
}
