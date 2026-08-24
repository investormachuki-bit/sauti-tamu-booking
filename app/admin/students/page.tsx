"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import StudentsHeader from "../../../components/students/StudentsHeader";
import StudentStats from "../../../components/students/StudentStats";
import StudentsToolbar from "../../../components/students/StudentsToolbar";
import StudentList from "../../../components/students/StudentList";
import StudentDetails from "../../../components/students/StudentDetails";
import AddStudentModal from "../../../components/students/AddStudentModal";
import PaymentModal from "../../../components/students/PaymentModal";

import {
  RefreshCw,
} from "lucide-react";

import generatePaymentReceipt from "../../../lib/generate-payment-receipt";
import {
  loadStudents,
  createStudent,
} from "../../../lib/students-service";

import type {
  PaymentMethod,
  Payment,
  StudentRecord,
  SelectedStudentRecord,
} from "../../../components/students/students-types";

/* =====================================================
   CONSTANTS
===================================================== */

const NAIROBI_TIME_ZONE =
  "Africa/Nairobi";

/* =====================================================
   FORMATTING HELPERS
===================================================== */

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);
}

function formatDate(
  value: string | null | undefined
) {
  if (!value) return "—";

  const date = new Date(
    `${value}T00:00:00+03:00`
  );

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-KE", {
    timeZone: NAIROBI_TIME_ZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getTodayKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: NAIROBI_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function getBalance(
  enrollment: {
    total_fee?: number | string | null;
  } | null,
  payments: {
    amount: number | string;
  }[]
) {
  if (!enrollment) {
    return 0;
  }

  const totalPaid =
    payments.reduce(
      (total, payment) =>
        total +
        Number(payment.amount || 0),
      0
    );

  return Math.max(
    Number(enrollment.total_fee || 0) -
      totalPaid,
    0
  );
}

/* =====================================================
   PAGE
===================================================== */

export default function AdminStudentsPage() {
  /* ===================================================
     DATA
  =================================================== */

  const [students, setStudents] =
    useState<StudentRecord[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  /* ===================================================
     SEARCH + FILTERS
  =================================================== */

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

  /* ===================================================
     STUDENT DETAILS
  =================================================== */

  const [selectedStudent, setSelectedStudent] =
    useState<SelectedStudentRecord | null>(
      null
    );

  /* ===================================================
     ADD STUDENT MODAL
  =================================================== */

  const [showAddStudent, setShowAddStudent] =
    useState(false);

  const [addingStudent, setAddingStudent] =
    useState(false);

  const [addStudentError, setAddStudentError] =
    useState("");

  const [studentName, setStudentName] =
    useState("");

  const [studentWhatsapp, setStudentWhatsapp] =
    useState("");

  const [studentEmail, setStudentEmail] =
    useState("");

  const [studentNotes, setStudentNotes] =
    useState("");

  const [instrument, setInstrument] =
    useState<"piano" | "guitar">(
      "piano"
    );

  const [programmeName, setProgrammeName] =
    useState(
      "3 Month Training Programme"
    );

  const [startDate, setStartDate] =
    useState(getTodayKey());

  const [totalFee, setTotalFee] =
    useState("");

  const [initialPayment, setInitialPayment] =
    useState("");

  const [
    initialPaymentMethod,
    setInitialPaymentMethod,
  ] = useState<PaymentMethod>(
    "mpesa"
  );

  const [
    initialPaymentReference,
    setInitialPaymentReference,
  ] = useState("");

  const [
    nextPaymentAmount,
    setNextPaymentAmount,
  ] = useState("");

  const [
    nextPaymentDueDate,
    setNextPaymentDueDate,
  ] = useState("");

  const [
    nextPaymentFollowUpDate,
    setNextPaymentFollowUpDate,
  ] = useState("");

  const [
    nextPaymentNotes,
    setNextPaymentNotes,
  ] = useState("");

  /* ===================================================
     PAYMENT MODAL
  =================================================== */

  const [showPaymentModal, setShowPaymentModal] =
    useState(false);

  const [paymentStudent, setPaymentStudent] =
    useState<SelectedStudentRecord | null>(
      null
    );

  /* ===================================================
     LOAD STUDENTS
  =================================================== */

  const refreshStudents = useCallback(
    async (silent = false) => {
      try {
        if (silent) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const records =
          await loadStudents();

        setStudents(records);
      } catch (err) {
        console.error(
          "Students load error:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "We couldn't load students."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    refreshStudents();
  }, [refreshStudents]);

  /* ===================================================
     ADD STUDENT CALCULATIONS
  =================================================== */

  const numericTotalFee =
    Number(totalFee) || 0;

  const numericInitialPayment =
    Number(initialPayment) || 0;

  const numericNextPaymentAmount =
    Number(nextPaymentAmount) || 0;

  const remainingAfterInitial =
    Math.max(
      numericTotalFee -
        numericInitialPayment,
      0
    );

  const remainingAfterNextPayment =
    Math.max(
      remainingAfterInitial -
        numericNextPaymentAmount,
      0
    );

  const endDate = useMemo(() => {
    if (!startDate) {
      return "";
    }

    const date = new Date(
      `${startDate}T00:00:00`
    );

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    date.setMonth(
      date.getMonth() + 3
    );

    return date
      .toISOString()
      .slice(0, 10);
  }, [startDate]);

  /* ===================================================
     RESET ADD STUDENT FORM
  =================================================== */

  const resetAddStudentForm =
    useCallback(() => {
      setStudentName("");
      setStudentWhatsapp("");
      setStudentEmail("");
      setStudentNotes("");

      setInstrument("piano");

      setProgrammeName(
        "3 Month Training Programme"
      );

      setStartDate(
        getTodayKey()
      );

      setTotalFee("");
      setInitialPayment("");

      setInitialPaymentMethod(
        "mpesa"
      );

      setInitialPaymentReference("");

      setNextPaymentAmount("");
      setNextPaymentDueDate("");
      setNextPaymentFollowUpDate("");
      setNextPaymentNotes("");

      setAddStudentError("");
    }, []);

  /* ===================================================
     OPEN ADD STUDENT
  =================================================== */

  const openAddStudent =
    useCallback(() => {
      setAddStudentError("");
      setShowAddStudent(true);
    }, []);

  /* ===================================================
     CLOSE ADD STUDENT
  =================================================== */

  const closeAddStudent =
    useCallback(() => {
      if (addingStudent) {
        return;
      }

      setShowAddStudent(false);

      resetAddStudentForm();
    }, [
      addingStudent,
      resetAddStudentForm,
    ]);

  /* ===================================================
     CREATE STUDENT
  =================================================== */

  const handleAddStudent =
    useCallback(async () => {
      setAddStudentError("");

      const name =
        studentName.trim();

      const whatsapp =
        studentWhatsapp.trim();

      const email =
        studentEmail.trim();

      const cleanProgrammeName =
        programmeName.trim() ||
        "3 Month Training Programme";

      /* ---------------------------------------------
         VALIDATION
      --------------------------------------------- */

      if (!name) {
        setAddStudentError(
          "Please enter the student's full name."
        );
        return;
      }

      if (!whatsapp) {
        setAddStudentError(
          "Please enter the student's WhatsApp number."
        );
        return;
      }

      if (!email) {
        setAddStudentError(
          "Please enter the student's email address."
        );
        return;
      }

      if (!startDate) {
        setAddStudentError(
          "Please select the programme start date."
        );
        return;
      }

      if (!endDate) {
        setAddStudentError(
          "The programme end date could not be calculated."
        );
        return;
      }

      if (numericTotalFee <= 0) {
        setAddStudentError(
          "Please enter a valid programme fee."
        );
        return;
      }

      if (numericInitialPayment < 0) {
        setAddStudentError(
          "Initial payment cannot be negative."
        );
        return;
      }

      if (
        numericInitialPayment >
        numericTotalFee
      ) {
        setAddStudentError(
          "Initial payment cannot be greater than the total programme fee."
        );
        return;
      }

      if (
        numericNextPaymentAmount < 0
      ) {
        setAddStudentError(
          "Next payment cannot be negative."
        );
        return;
      }

      if (
        numericNextPaymentAmount >
        remainingAfterInitial
      ) {
        setAddStudentError(
          "Next payment cannot be greater than the remaining balance."
        );
        return;
      }

      if (
        remainingAfterInitial > 0 &&
        numericNextPaymentAmount > 0 &&
        !nextPaymentDueDate
      ) {
        setAddStudentError(
          "Please select the next payment due date."
        );
        return;
      }

      if (
        nextPaymentDueDate &&
        nextPaymentDueDate <
          startDate
      ) {
        setAddStudentError(
          "Next payment due date cannot be before the programme start date."
        );
        return;
      }

      if (
        nextPaymentFollowUpDate &&
        nextPaymentDueDate &&
        nextPaymentFollowUpDate >
          nextPaymentDueDate
      ) {
        setAddStudentError(
          "Follow-up date should be on or before the payment due date."
        );
        return;
      }

      /* ---------------------------------------------
         SAVE
      --------------------------------------------- */

      try {
        setAddingStudent(true);

        await createStudent({
          fullName: name,

          whatsappNumber:
            whatsapp,

          email,

          notes:
            studentNotes.trim(),

          instrument,

          programmeName:
            cleanProgrammeName,

          startDate,

          endDate,

          totalFee:
            numericTotalFee,

          initialPayment:
            numericInitialPayment,

          initialPaymentMethod,

          initialPaymentReference:
            initialPaymentReference.trim(),

          nextPaymentAmount:
            numericNextPaymentAmount,

          nextPaymentDueDate,

          nextPaymentFollowUpDate,

          nextPaymentNotes:
            nextPaymentNotes.trim(),
        });

        /*
         * Reload the complete student list so the
         * newly-created student immediately appears
         * with enrollment, payments and schedules.
         */
        await refreshStudents(true);

        setShowAddStudent(false);

        resetAddStudentForm();
      } catch (err) {
        console.error(
          "Add student error:",
          err
        );

        setAddStudentError(
          err instanceof Error
            ? err.message
            : "We couldn't add the student. Please try again."
        );
      } finally {
        setAddingStudent(false);
      }
    }, [
      studentName,
      studentWhatsapp,
      studentEmail,
      studentNotes,
      instrument,
      programmeName,
      startDate,
      endDate,
      numericTotalFee,
      numericInitialPayment,
      initialPaymentMethod,
      initialPaymentReference,
      numericNextPaymentAmount,
      nextPaymentDueDate,
      nextPaymentFollowUpDate,
      nextPaymentNotes,
      remainingAfterInitial,
      refreshStudents,
      resetAddStudentForm,
    ]);

  /* ===================================================
     STATS
  =================================================== */

  const stats = useMemo(() => {
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

    return {
      totalStudents:
        students.length,

      activeStudents,

      totalOutstanding,

      studentsWithBalance,
    };
  }, [students]);

  /* ===================================================
     FILTERING
  =================================================== */

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

          if (query) {
            const searchable = [
              student.full_name,
              student.email,
              student.whatsapp_number,
              enrollment?.instrument ??
                "",
              enrollment?.programme_name ??
                "",
            ]
              .join(" ")
              .toLowerCase();

            if (
              !searchable.includes(
                query
              )
            ) {
              return false;
            }
          }

          /* STATUS */

          if (
            statusFilter !==
            "all"
          ) {
            const currentStatus =
              (
                enrollment?.status ??
                student.status
              ).toLowerCase();

            if (
              currentStatus !==
              statusFilter.toLowerCase()
            ) {
              return false;
            }
          }

          /* INSTRUMENT */

          if (
            instrumentFilter !==
            "all"
          ) {
            const currentInstrument =
              (
                enrollment?.instrument ??
                ""
              ).toLowerCase();

            if (
              currentInstrument !==
              instrumentFilter.toLowerCase()
            ) {
              return false;
            }
          }

          /* PAYMENT */

          if (
            paymentFilter !==
            "all"
          ) {
            const balance =
              getBalance(
                enrollment,
                record.payments
              );

            const hasPayments =
              record.payments
                .length > 0;

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
              hasPayments
            ) {
              return false;
            }
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

  /* ===================================================
     STUDENT LOOKUP
  =================================================== */

  const findRecord =
    useCallback(
      (studentId: string) => {
        return students.find(
          (record) =>
            record.student.id ===
            studentId
        );
      },
      [students]
    );

  /* ===================================================
     STUDENT SELECTION
  =================================================== */

  const handleSelectStudent =
    useCallback(
      (record: StudentRecord) => {
        setSelectedStudent({
          student:
            record.student,

          enrollment:
            record.enrollment,

          payments:
            record.payments,
        });
      },
      []
    );

  /* ===================================================
     COMMUNICATION
  =================================================== */

  function openWhatsApp(
    record: SelectedStudentRecord
  ) {
    const phone =
      record.student.whatsapp_number;

    if (!phone) return;

    const cleaned =
      phone.replace(
        /[^0-9]/g,
        ""
      );

    const message =
      `Hello ${record.student.full_name}, this is Sauti Tamu Music School.`;

    window.open(
      `https://wa.me/${cleaned}?text=${encodeURIComponent(
        message
      )}`,
      "_blank"
    );
  }

  function callStudent(
    record: SelectedStudentRecord
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
    record: SelectedStudentRecord
  ) {
    if (
      !record.student.email
    ) {
      return;
    }

    window.location.href =
      `mailto:${record.student.email}`;
  }

  /* ===================================================
     PAYMENT
  =================================================== */

  function openPaymentModal(
    record: SelectedStudentRecord
  ) {
    if (!record.enrollment) {
      return;
    }

    setPaymentStudent(
      record
    );

    setShowPaymentModal(
      true
    );
  }

  /* ===================================================
     RECEIPT HELPERS
  =================================================== */

  function createReceiptNumber(
    payment: Payment
  ) {
    const date = new Date(
      payment.payment_date
    );

    const year =
      date.getFullYear();

    const shortId =
      payment.id
        .replace(/-/g, "")
        .slice(0, 8)
        .toUpperCase();

    return `ST-${year}-${shortId}`;
  }

  function buildReceiptData(
    record: SelectedStudentRecord,
    payment: Payment
  ) {
    const payments =
      [...record.payments].sort(
        (a, b) =>
          new Date(
            a.payment_date
          ).getTime() -
          new Date(
            b.payment_date
          ).getTime()
      );

    const paymentIndex =
      payments.findIndex(
        (item) =>
          item.id === payment.id
      );

    const paymentsBefore =
      paymentIndex >= 0
        ? payments.slice(
            0,
            paymentIndex
          )
        : [];

    const previousPaid =
      paymentsBefore.reduce(
        (total, item) =>
          total +
          Number(
            item.amount || 0
          ),
        0
      );

    const programmeAmount =
      Number(
        record.enrollment
          ?.total_fee || 0
      );

    const currentAmount =
      Number(
        payment.amount || 0
      );

    const previousBalance =
      Math.max(
        programmeAmount -
          previousPaid,
        0
      );

    const totalPaidAfter =
      previousPaid +
      currentAmount;

    const balanceAfterPayment =
      Math.max(
        programmeAmount -
          totalPaidAfter,
        0
      );

    return {
      receiptNumber:
        createReceiptNumber(
          payment
        ),

      studentName:
        record.student.full_name,

      studentEmail:
        record.student.email ||
        "",

      studentPhone:
        record.student
          .whatsapp_number ||
        "",

      programmeName:
        record.enrollment
          ?.programme_name ||
        "Music Training",

      instrument:
        record.enrollment
          ?.instrument ||
        "",

      programmeAmount,

      paymentHistory:
        record.payments.map(
          (item) => ({
            label:
              `Payment ${formatDate(
                item.payment_date
              )}`,

            amount:
              Number(
                item.amount || 0
              ),

            date:
              item.payment_date,

            method:
              item.payment_method,

            reference:
              item.reference,
          })
        ),

      previousBalance,

      amountPaid:
        currentAmount,

      balanceAfterPayment,

      paymentMethod:
        payment.payment_method,

      paymentDate:
        payment.payment_date,

      reference:
        payment.reference,
    };
  }

  /* ===================================================
     RECEIPTS
  =================================================== */

  async function viewReceipt(
    record: SelectedStudentRecord,
    payment: Payment
  ) {
    try {
      await generatePaymentReceipt(
        buildReceiptData(
          record,
          payment
        ),
        "view"
      );
    } catch (error) {
      console.error(
        "View receipt error:",
        error
      );
    }
  }

  async function downloadReceipt(
    record: SelectedStudentRecord,
    payment: Payment
  ) {
    try {
      await generatePaymentReceipt(
        buildReceiptData(
          record,
          payment
        ),
        "download"
      );
    } catch (error) {
      console.error(
        "Download receipt error:",
        error
      );
    }
  }

  function emailReceipt(
    record: SelectedStudentRecord,
    payment: Payment
  ) {
    if (
      !record.student.email
    ) {
      alert(
        "This student does not have an email address."
      );

      return;
    }

    const receiptData =
      buildReceiptData(
        record,
        payment
      );

    const subject =
      encodeURIComponent(
        `Sauti Tamu Payment Receipt ${receiptData.receiptNumber}`
      );

    const body =
      encodeURIComponent(
        [
          `Dear ${record.student.full_name},`,
          "",
          "Thank you for your payment to Sauti Tamu Music School.",
          "",
          `Receipt No: ${receiptData.receiptNumber}`,
          `Amount received: ${formatCurrency(
            receiptData.amountPaid
          )}`,
          `Payment date: ${formatDate(
            receiptData.paymentDate
          )}`,
          `Payment method: ${receiptData.paymentMethod}`,
          `Reference: ${
            receiptData.reference ||
            "—"
          }`,
          "",
          `Programme: ${receiptData.programmeName}`,
          `Programme fee: ${formatCurrency(
            receiptData.programmeAmount
          )}`,
          `Balance after payment: ${formatCurrency(
            receiptData.balanceAfterPayment
          )}`,
          "",
          "Sauti Tamu Music School",
        ].join("\n")
      );

    window.location.href =
      `mailto:${record.student.email}` +
      `?subject=${subject}&body=${body}`;
  }

  /* ===================================================
     INSTRUMENT NAME
  =================================================== */

  function instrumentName(
    value: "piano" | "guitar"
  ) {
    return value === "guitar"
      ? "Acoustic Guitar"
      : "Piano";
  }

  /* ===================================================
     PAGE
  =================================================== */

  return (
    <main className="st-content">

      {/* =================================================
          HEADER
      ================================================= */}

      <StudentsHeader
        studentCount={
          students.length
        }
        searchTerm={
          searchTerm
        }
        setSearchTerm={
          setSearchTerm
        }
        onAddStudent={
          openAddStudent
        }
      />

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
          ERROR
      ================================================= */}

      {error && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <p className="m-0 text-[10px] text-red-700">
            {error}
          </p>
        </div>
      )}

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

          onAddStudent={
            openAddStudent
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
          LIST
      ================================================= */}

      <div className="mt-5">
        {loading ? (
          <div className="st-card flex min-h-[260px] items-center justify-center">
            <div className="flex items-center gap-2 text-[10px] text-[var(--st-gray)]">
              <RefreshCw
                size={15}
                className="animate-spin"
              />

              Loading students...
            </div>
          </div>
        ) : (
          <StudentList
            students={
              filteredStudents
            }

            selectedStudentId={
              selectedStudent
                ?.student.id ??
              null
            }

            onSelectStudent={(
              student
            ) => {
              const record =
                findRecord(
                  student.student.id
                );

              if (record) {
                handleSelectStudent(
                  record
                );
              }
            }}

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

            openWhatsApp={(
              student
            ) => {
              const record =
                findRecord(
                  student.student.id
                );

              if (record) {
                openWhatsApp({
                  student:
                    record.student,

                  enrollment:
                    record.enrollment,

                  payments:
                    record.payments,
                });
              }
            }}

            callStudent={(
              student
            ) => {
              const record =
                findRecord(
                  student.student.id
                );

              if (record) {
                callStudent({
                  student:
                    record.student,

                  enrollment:
                    record.enrollment,

                  payments:
                    record.payments,
                });
              }
            }}

            emailStudent={(
              student
            ) => {
              const record =
                findRecord(
                  student.student.id
                );

              if (record) {
                emailStudent({
                  student:
                    record.student,

                  enrollment:
                    record.enrollment,

                  payments:
                    record.payments,
                });
              }
            }}
          />
        )}
      </div>

      {/* =================================================
          STUDENT DETAILS
      ================================================= */}

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

          onWhatsApp={(
            student
          ) => {
            const record =
              findRecord(
                student.student.id
              );

            if (record) {
              openWhatsApp({
                student:
                  record.student,

                enrollment:
                  record.enrollment,

                payments:
                  record.payments,
              });
            }
          }}

          onCall={(student) => {
            const record =
              findRecord(
                student.student.id
              );

            if (record) {
              callStudent({
                student:
                  record.student,

                enrollment:
                  record.enrollment,

                payments:
                  record.payments,
              });
            }
          }}

          onEmail={(student) => {
            const record =
              findRecord(
                student.student.id
              );

            if (record) {
              emailStudent({
                student:
                  record.student,

                enrollment:
                  record.enrollment,

                payments:
                  record.payments,
              });
            }
          }}

          onReceivePayment={() =>
            openPaymentModal(
              selectedStudent
            )
          }

          viewReceipt={(
            student,
            payment
          ) => {
            const record =
              findRecord(
                student.student.id
              );

            if (!record) {
              return;
            }

            viewReceipt(
              record,
              {
                id: payment.id,

                student_id:
                  record.student.id,

                enrollment_id:
                  record.enrollment
                    ?.id ?? "",

                payment_schedule_id:
                  null,

                amount:
                  Number(
                    payment.amount ||
                      0
                  ),

                payment_date:
                  payment.payment_date,

                payment_method:
                  payment.payment_method as PaymentMethod,

                reference:
                  payment.reference ??
                  null,

                notes: null,

                created_at:
                  payment.payment_date,
              }
            );
          }}

          downloadReceipt={(
            student,
            payment
          ) => {
            const record =
              findRecord(
                student.student.id
              );

            if (!record) {
              return;
            }

            downloadReceipt(
              record,
              {
                id: payment.id,

                student_id:
                  record.student.id,

                enrollment_id:
                  record.enrollment
                    ?.id ?? "",

                payment_schedule_id:
                  null,

                amount:
                  Number(
                    payment.amount ||
                      0
                  ),

                payment_date:
                  payment.payment_date,

                payment_method:
                  payment.payment_method as PaymentMethod,

                reference:
                  payment.reference ??
                  null,

                notes: null,

                created_at:
                  payment.payment_date,
              }
            );
          }}

          emailReceipt={(
            student,
            payment
          ) => {
            const record =
              findRecord(
                student.student.id
              );

            if (!record) {
              return;
            }

            emailReceipt(
              record,
              {
                id: payment.id,

                student_id:
                  record.student.id,

                enrollment_id:
                  record.enrollment
                    ?.id ?? "",

                payment_schedule_id:
                  null,

                amount:
                  Number(
                    payment.amount ||
                      0
                  ),

                payment_date:
                  payment.payment_date,

                payment_method:
                  payment.payment_method as PaymentMethod,

                reference:
                  payment.reference ??
                  null,

                notes: null,

                created_at:
                  payment.payment_date,
              }
            );
          }}

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

      {/* =================================================
          ADD STUDENT MODAL
      ================================================= */}

      {showAddStudent && (
        <AddStudentModal
          show={
            showAddStudent
          }

          addingStudent={
            addingStudent
          }

          error={
            addStudentError
          }

          studentName={
            studentName
          }

          studentWhatsapp={
            studentWhatsapp
          }

          studentEmail={
            studentEmail
          }

          studentNotes={
            studentNotes
          }

          instrument={
            instrument
          }

          programmeName={
            programmeName
          }

          startDate={
            startDate
          }

          endDate={
            endDate
          }

          totalFee={
            totalFee
          }

          initialPayment={
            initialPayment
          }

          initialPaymentMethod={
            initialPaymentMethod
          }

          initialPaymentReference={
            initialPaymentReference
          }

          nextPaymentAmount={
            nextPaymentAmount
          }

          nextPaymentDueDate={
            nextPaymentDueDate
          }

          nextPaymentFollowUpDate={
            nextPaymentFollowUpDate
          }

          nextPaymentNotes={
            nextPaymentNotes
          }

          numericTotalFee={
            numericTotalFee
          }

          numericInitialPayment={
            numericInitialPayment
          }

          remainingAfterInitial={
            remainingAfterInitial
          }

          remainingAfterNextPayment={
            remainingAfterNextPayment
          }

          setStudentName={
            setStudentName
          }

          setStudentWhatsapp={
            setStudentWhatsapp
          }

          setStudentEmail={
            setStudentEmail
          }

          setStudentNotes={
            setStudentNotes
          }

          setInstrument={
            setInstrument
          }

          setProgrammeName={
            setProgrammeName
          }

          setStartDate={
            setStartDate
          }

          setTotalFee={
            setTotalFee
          }

          setInitialPayment={
            setInitialPayment
          }

          setInitialPaymentMethod={
            setInitialPaymentMethod
          }

          setInitialPaymentReference={
            setInitialPaymentReference
          }

          setNextPaymentAmount={
            setNextPaymentAmount
          }

          setNextPaymentDueDate={
            setNextPaymentDueDate
          }

          setNextPaymentFollowUpDate={
            setNextPaymentFollowUpDate
          }

          setNextPaymentNotes={
            setNextPaymentNotes
          }

          closeAddStudent={
            closeAddStudent
          }

          addStudent={
            handleAddStudent
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
        />
      )}

      {/* =================================================
          PAYMENT MODAL
      ================================================= */}

      {showPaymentModal &&
        paymentStudent && (
          <PaymentModal
            selectedStudent={{
              student: {
                id:
                  paymentStudent
                    .student.id,

                full_name:
                  paymentStudent
                    .student
                    .full_name,
              },

              enrollment:
                paymentStudent
                  .enrollment,

              payments:
                paymentStudent
                  .payments,
            }}

            paymentAmount=""
            setPaymentAmount={() => {}}

            paymentMethod="mpesa"
            setPaymentMethod={() => {}}

            paymentReference=""
            setPaymentReference={() => {}}

            showPaymentForm={
              showPaymentModal
            }

            setShowPaymentForm={
              setShowPaymentModal
            }

            updatingId={
              null
            }

            recordPayment={() => {}}

            error={null}

            formatCurrency={
              formatCurrency
            }

            getBalance={
              getBalance
            }
          />
        )}
    </main>
  );
}