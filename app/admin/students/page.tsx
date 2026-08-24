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
import EditStudentModal from "../../../components/students/EditStudentModal";

import { RefreshCw } from "lucide-react";

import generatePaymentReceipt from "../../../lib/generate-payment-receipt";

import {
  loadStudents,
  updateStudent as updateStudentRecord,
} from "../../../lib/students-service";

import type {
  PaymentMethod,
  Payment,
  StudentRecord,
  SelectedStudentRecord,
  Instrument,
  StudentStatus,
} from "../../../components/students/students-types";

/* =====================================================
   CONSTANTS
===================================================== */

const NAIROBI_TIME_ZONE =
  "Africa/Nairobi";

/* =====================================================
   FORMATTING HELPERS
===================================================== */

function formatCurrency(
  amount: number
) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);
}

function formatDate(
  value: string | null | undefined
) {
  if (!value) {
    return "—";
  }

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

/* =====================================================
   DATE HELPERS
===================================================== */

function addMonthsToDate(
  value: string,
  months: number
) {
  if (!value) {
    return "";
  }

  const date = new Date(
    `${value}T00:00:00+03:00`
  );

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  date.setMonth(
    date.getMonth() + months
  );

  const year =
    date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/* =====================================================
   INSTRUMENT
===================================================== */

function instrumentName(
  instrument:
    | string
    | null
    | undefined
) {
  if (!instrument) {
    return "—";
  }

  const normalized =
    instrument.toLowerCase();

  if (normalized === "guitar") {
    return "Acoustic Guitar";
  }

  if (normalized === "piano") {
    return "Piano";
  }

  return instrument;
}

/* =====================================================
   BALANCE
===================================================== */

function getBalance(
  enrollment: {
    total_fee?:
      | number
      | string
      | null;
  } | null,
  payments: {
    amount:
      | number
      | string;
  }[]
) {
  if (!enrollment) {
    return 0;
  }

  const totalPaid =
    payments.reduce(
      (total, payment) =>
        total +
        Number(
          payment.amount || 0
        ),
      0
    );

  return Math.max(
    Number(
      enrollment.total_fee || 0
    ) - totalPaid,
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

  const [
    instrumentFilter,
    setInstrumentFilter,
  ] = useState("all");

  const [
    paymentFilter,
    setPaymentFilter,
  ] = useState("all");

  const [showFilters, setShowFilters] =
    useState(false);

  /* ===================================================
     ADD STUDENT
  =================================================== */

  const [showAddStudent, setShowAddStudent] =
    useState(false);

  const [addingStudent, setAddingStudent] =
    useState(false);

  const [addStudentError, setAddStudentError] =
    useState("");

  const [studentName, setStudentName] =
    useState("");

  const [
    studentWhatsapp,
    setStudentWhatsapp,
  ] = useState("");

  const [studentEmail, setStudentEmail] =
    useState("");

  const [studentNotes, setStudentNotes] =
    useState("");

  const [
    selectedInstrument,
    setSelectedInstrument,
  ] = useState<Instrument>("piano");

  const [programmeName, setProgrammeName] =
    useState(
      "3 Month Training Programme"
    );

  const [startDate, setStartDate] =
    useState(getTodayKey());

  const [totalFee, setTotalFee] =
    useState("");

  const [
    initialPayment,
    setInitialPayment,
  ] = useState("");

  const [
    initialPaymentMethod,
    setInitialPaymentMethod,
  ] = useState<PaymentMethod>("mpesa");

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
     STUDENT DETAILS
  =================================================== */

  const [
    selectedStudent,
    setSelectedStudent,
  ] =
    useState<SelectedStudentRecord | null>(
      null
    );

  /* ===================================================
     EDIT STUDENT
  =================================================== */

  const [
    showEditStudent,
    setShowEditStudent,
  ] = useState(false);

  const [
    savingStudent,
    setSavingStudent,
  ] = useState(false);

  const [
    editStudentError,
    setEditStudentError,
  ] = useState<string | null>(null);

  const [
    editStudentName,
    setEditStudentName,
  ] = useState("");

  const [
    editStudentWhatsapp,
    setEditStudentWhatsapp,
  ] = useState("");

  const [
    editStudentEmail,
    setEditStudentEmail,
  ] = useState("");

  const [
    editStudentStatus,
    setEditStudentStatus,
  ] =
    useState<StudentStatus>("active");

  const [
    editStudentNotes,
    setEditStudentNotes,
  ] = useState("");

  const [
    editInstrument,
    setEditInstrument,
  ] = useState<Instrument>("piano");

  const [
    editProgrammeName,
    setEditProgrammeName,
  ] = useState(
    "3 Month Training Programme"
  );

  const [
    editStartDate,
    setEditStartDate,
  ] = useState("");

  const [
    editEndDate,
    setEditEndDate,
  ] = useState("");

  const [
    editTotalFee,
    setEditTotalFee,
  ] = useState("");

  const [
    editEnrollmentStatus,
    setEditEnrollmentStatus,
  ] =
    useState<StudentStatus>("active");

  const [
    editPhotoPreview,
    setEditPhotoPreview,
  ] = useState<string | null>(null);

  const [
    editPhotoFile,
    setEditPhotoFile,
  ] = useState<File | null>(null);

  /* ===================================================
     PAYMENT MODAL
  =================================================== */

  const [
    showPaymentModal,
    setShowPaymentModal,
  ] = useState(false);

  const [
    paymentStudent,
    setPaymentStudent,
  ] =
    useState<SelectedStudentRecord | null>(
      null
    );

  const [
    paymentAmount,
    setPaymentAmount,
  ] = useState("");

  const [
    paymentMethod,
    setPaymentMethod,
  ] =
    useState<PaymentMethod>("mpesa");

  const [
    paymentReference,
    setPaymentReference,
  ] = useState("");

  const [
    paymentError,
    setPaymentError,
  ] = useState<string | null>(null);

  const [
    updatingPaymentId,
    setUpdatingPaymentId,
  ] = useState<string | null>(null);

  /* ===================================================
     LOAD STUDENTS
  =================================================== */

  const refreshStudents =
    useCallback(
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

          setSelectedStudent(
            (current) => {
              if (!current) {
                return null;
              }

              const updated =
                records.find(
                  (record) =>
                    record.student.id ===
                    current.student.id
                );

              if (!updated) {
                return null;
              }

              return {
                student:
                  updated.student,

                enrollment:
                  updated.enrollment,

                payments:
                  updated.payments,
              };
            }
          );

          setPaymentStudent(
            (current) => {
              if (!current) {
                return null;
              }

              const updated =
                records.find(
                  (record) =>
                    record.student.id ===
                    current.student.id
                );

              if (!updated) {
                return null;
              }

              return {
                student:
                  updated.student,

                enrollment:
                  updated.enrollment,

                payments:
                  updated.payments,
              };
            }
          );
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

  const numericNextPayment =
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
        numericNextPayment,
      0
    );

  const endDate = useMemo(() => {
    return addMonthsToDate(
      startDate,
      3
    );
  }, [startDate]);

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
              record.payments.length >
              0;

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
     ADD STUDENT
  =================================================== */

  function openAddStudent() {
    setAddStudentError("");

    setStudentName("");
    setStudentWhatsapp("");
    setStudentEmail("");
    setStudentNotes("");

    setSelectedInstrument(
      "piano"
    );

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

    setShowAddStudent(true);
  }

  function closeAddStudent() {
    if (addingStudent) {
      return;
    }

    setShowAddStudent(false);
    setAddStudentError("");
  }

  async function addStudent() {
    try {
      setAddingStudent(true);
      setAddStudentError("");

      if (!studentName.trim()) {
        throw new Error(
          "Please enter the student's full name."
        );
      }

      if (!studentWhatsapp.trim()) {
        throw new Error(
          "Please enter the student's WhatsApp number."
        );
      }

      if (!studentEmail.trim()) {
        throw new Error(
          "Please enter the student's email address."
        );
      }

      if (!startDate) {
        throw new Error(
          "Please select the programme start date."
        );
      }

      if (
        !numericTotalFee ||
        numericTotalFee <= 0
      ) {
        throw new Error(
          "Please enter a valid total programme fee."
        );
      }

      if (
        numericInitialPayment < 0 ||
        numericInitialPayment >
          numericTotalFee
      ) {
        throw new Error(
          "Initial payment cannot be greater than the total programme fee."
        );
      }

      if (
        numericNextPayment < 0 ||
        numericNextPayment >
          remainingAfterInitial
      ) {
        throw new Error(
          "Next payment cannot be greater than the remaining balance."
        );
      }

      const { supabase } =
        await import(
          "../../../lib/supabase"
        );

      const {
        data: student,
        error: studentError,
      } = await supabase
        .from("students")
        .insert({
          full_name:
            studentName.trim(),

          email:
            studentEmail.trim(),

          whatsapp_number:
            studentWhatsapp.trim(),

          status:
            "active",

          notes:
            studentNotes.trim() ||
            null,
        })
        .select(
          "id, lead_id, full_name, email, whatsapp_number, status, notes, photo_path, created_at, updated_at"
        )
        .single();

      if (studentError) {
        throw studentError;
      }

      if (!student) {
        throw new Error(
          "Student was not created."
        );
      }

      const {
        data: enrollment,
        error:
          enrollmentError,
      } = await supabase
        .from(
          "student_enrollments"
        )
        .insert({
          student_id:
            student.id,

          instrument:
            selectedInstrument,

          programme_name:
            programmeName.trim() ||
            "3 Month Training Programme",

          start_date:
            startDate,

          end_date:
            endDate,

          total_fee:
            numericTotalFee,

          status:
            "active",

          notes:
            null,
        })
        .select(
          "id, student_id, instrument, programme_name, start_date, end_date, total_fee, status, notes, created_at, updated_at"
        )
        .single();

      if (enrollmentError) {
        await supabase
          .from("students")
          .delete()
          .eq(
            "id",
            student.id
          );

        throw enrollmentError;
      }

      if (!enrollment) {
        throw new Error(
          "Enrollment was not created."
        );
      }

      if (
        numericInitialPayment > 0
      ) {
        const {
          error:
            paymentError,
        } = await supabase
          .from("payments")
          .insert({
            student_id:
              student.id,

            enrollment_id:
              enrollment.id,

            payment_schedule_id:
              null,

            amount:
              numericInitialPayment,

            payment_date:
              getTodayKey(),

            payment_method:
              initialPaymentMethod,

            reference:
              initialPaymentReference.trim() ||
              null,

            notes:
              "Initial payment at student registration.",
          });

        if (paymentError) {
          throw paymentError;
        }
      }

      if (
        remainingAfterInitial >
          0 &&
        numericNextPayment >
          0 &&
        nextPaymentDueDate
      ) {
        const {
          error:
            scheduleError,
        } = await supabase
          .from(
            "payment_schedule"
          )
          .insert({
            enrollment_id:
              enrollment.id,

            amount_due:
              numericNextPayment,

            due_date:
              nextPaymentDueDate,

            follow_up_date:
              nextPaymentFollowUpDate ||
              null,

            status:
              "scheduled",

            notes:
              nextPaymentNotes.trim() ||
              null,
          });

        if (scheduleError) {
          throw scheduleError;
        }
      }

      const refreshed =
        await loadStudents();

      setStudents(refreshed);

      const createdRecord =
        refreshed.find(
          (record) =>
            record.student.id ===
            student.id
        );

      if (createdRecord) {
        setSelectedStudent({
          student:
            createdRecord.student,

          enrollment:
            createdRecord.enrollment,

          payments:
            createdRecord.payments,
        });
      }

      setShowAddStudent(false);

      setStudentName("");
      setStudentWhatsapp("");
      setStudentEmail("");
      setStudentNotes("");

      setSelectedInstrument(
        "piano"
      );

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
    } catch (err) {
      console.error(
        "Add student error:",
        err
      );

      setAddStudentError(
        err instanceof Error
          ? err.message
          : "We couldn't add the student."
      );
    } finally {
      setAddingStudent(false);
    }
  }

  /* ===================================================
     EDIT STUDENT
  =================================================== */

  function openEditStudent(
    record: SelectedStudentRecord
  ) {
    setEditStudentError(null);

    setEditStudentName(
      record.student.full_name
    );

    setEditStudentWhatsapp(
      record.student.whatsapp_number
    );

    setEditStudentEmail(
      record.student.email
    );

    setEditStudentStatus(
      record.student.status
    );

    setEditStudentNotes(
      record.student.notes ?? ""
    );

    setEditInstrument(
      record.enrollment
        ?.instrument ?? "piano"
    );

    setEditProgrammeName(
      record.enrollment
        ?.programme_name ??
        "3 Month Training Programme"
    );

    setEditStartDate(
      record.enrollment
        ?.start_date ??
        getTodayKey()
    );

    setEditEndDate(
      record.enrollment
        ?.end_date ??
        addMonthsToDate(
          record.enrollment
            ?.start_date ??
            getTodayKey(),
          3
        )
    );

    setEditTotalFee(
      record.enrollment
        ? String(
            record.enrollment
              .total_fee ?? ""
          )
        : ""
    );

    setEditEnrollmentStatus(
      record.enrollment
        ?.status ??
        record.student.status
    );

    setEditPhotoFile(null);

    setEditPhotoPreview(
      record.student.photo_url ??
        null
    );

    setShowEditStudent(true);
  }

  function closeEditStudent() {
    if (savingStudent) {
      return;
    }

    setShowEditStudent(false);
    setEditStudentError(null);
    setEditPhotoFile(null);
    setEditPhotoPreview(null);
  }

  async function saveEditedStudent() {
    if (!selectedStudent) {
      return;
    }

    try {
      setSavingStudent(true);
      setEditStudentError(null);

      const numericFee =
        Number(
          editTotalFee
        );

      if (
        !Number.isFinite(
          numericFee
        ) ||
        numericFee < 0
      ) {
        throw new Error(
          "Please enter a valid programme fee."
        );
      }

      if (
        editStartDate &&
        editEndDate &&
        editEndDate <
          editStartDate
      ) {
        throw new Error(
          "The programme end date cannot be before the start date."
        );
      }

      await updateStudentRecord({
        studentId:
          selectedStudent.student.id,

        fullName:
          editStudentName,

        whatsappNumber:
          editStudentWhatsapp,

        email:
          editStudentEmail,

        status:
          editStudentStatus,

        notes:
          editStudentNotes,

        instrument:
          editInstrument,

        programmeName:
          editProgrammeName,

        startDate:
          editStartDate,

        endDate:
          editEndDate,

        totalFee:
          numericFee,

        enrollmentStatus:
          editEnrollmentStatus,

        photoFile:
          editPhotoFile,
      });

      /*
       * Reload everything so the newly generated
       * private signed photo URL is available.
       */
      const refreshed =
        await loadStudents();

      setStudents(refreshed);

      const updatedRecord =
        refreshed.find(
          (record) =>
            record.student.id ===
            selectedStudent.student.id
        );

      if (updatedRecord) {
        const updatedSelected = {
          student:
            updatedRecord.student,

          enrollment:
            updatedRecord.enrollment,

          payments:
            updatedRecord.payments,
        };

        setSelectedStudent(
          updatedSelected
        );

        setPaymentStudent(
          (current) => {
            if (
              current?.student.id !==
              updatedRecord.student.id
            ) {
              return current;
            }

            return updatedSelected;
          }
        );
      }

      setShowEditStudent(false);
      setEditPhotoFile(null);
      setEditPhotoPreview(null);
    } catch (err) {
      console.error(
        "Update student error:",
        err
      );

      setEditStudentError(
        err instanceof Error
          ? err.message
          : "We couldn't update the student."
      );
    } finally {
      setSavingStudent(false);
    }
  }

  /* ===================================================
     COMMUNICATION
  =================================================== */

  function openWhatsApp(
    record: SelectedStudentRecord
  ) {
    const phone =
      record.student
        .whatsapp_number;

    if (!phone) {
      return;
    }

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

    setPaymentAmount("");
    setPaymentMethod("mpesa");
    setPaymentReference("");
    setPaymentError(null);

    setShowPaymentModal(true);
  }

  async function recordPayment() {
    if (
      !paymentStudent?.enrollment
    ) {
      return;
    }

    try {
      setPaymentError(null);
      setUpdatingPaymentId(
        "new"
      );

      const amount =
        Number(
          paymentAmount
        ) || 0;

      if (amount <= 0) {
        throw new Error(
          "Please enter a valid payment amount."
        );
      }

      const balance =
        getBalance(
          paymentStudent.enrollment,
          paymentStudent.payments
        );

      if (amount > balance) {
        throw new Error(
          "Payment cannot be greater than the outstanding balance."
        );
      }

      const { supabase } =
        await import(
          "../../../lib/supabase"
        );

      const {
        error:
          paymentError,
      } = await supabase
        .from("payments")
        .insert({
          student_id:
            paymentStudent
              .student.id,

          enrollment_id:
            paymentStudent
              .enrollment.id,

          payment_schedule_id:
            null,

          amount,

          payment_date:
            getTodayKey(),

          payment_method:
            paymentMethod,

          reference:
            paymentReference.trim() ||
            null,

          notes:
            null,
        });

      if (paymentError) {
        throw paymentError;
      }

      setShowPaymentModal(false);

      setPaymentAmount("");
      setPaymentReference("");
      setPaymentMethod("mpesa");

      await refreshStudents(
        true
      );
    } catch (err) {
      console.error(
        "Record payment error:",
        err
      );

      setPaymentError(
        err instanceof Error
          ? err.message
          : "We couldn't record the payment."
      );
    } finally {
      setUpdatingPaymentId(
        null
      );
    }
  }

  /* ===================================================
     RECEIPTS
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
          item.id ===
          payment.id
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
     RENDER
  =================================================== */

  return (
    <main className="st-content">

      {/* HEADER */}

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
            stats.studentsWithBalance
          }
          formatCurrency={
            formatCurrency
          }
        />
      </div>

      {/* ERROR */}

      {error && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <p className="m-0 text-[10px] text-red-700">
            {error}
          </p>
        </div>
      )}

      {/* TOOLBAR */}

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

      {/* LIST */}

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

  onEditStudent={(student) => {
  const record = findRecord(
    student.student.id
  );

  if (record) {
    openEditStudent({
      student: record.student,
      enrollment: record.enrollment,
      payments: record.payments,
    });
  }
}}

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
          selectedInstrument
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
          setSelectedInstrument
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
          addStudent
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

      {/* =================================================
          EDIT STUDENT MODAL
      ================================================= */}

      {showEditStudent &&
        selectedStudent && (
          <EditStudentModal
            selectedStudent={
              selectedStudent
            }

            show={
              showEditStudent
            }

            saving={
              savingStudent
            }

            error={
              editStudentError
            }

            studentName={
              editStudentName
            }

            studentWhatsapp={
              editStudentWhatsapp
            }

            studentEmail={
              editStudentEmail
            }

            studentStatus={
              editStudentStatus
            }

            studentNotes={
              editStudentNotes
            }

            instrument={
              editInstrument
            }

            programmeName={
              editProgrammeName
            }

            startDate={
              editStartDate
            }

            endDate={
              editEndDate
            }

            totalFee={
              editTotalFee
            }

            enrollmentStatus={
              editEnrollmentStatus
            }

            photoPreview={
              editPhotoPreview
            }

            photoFile={
              editPhotoFile
            }

            setStudentName={
              setEditStudentName
            }

            setStudentWhatsapp={
              setEditStudentWhatsapp
            }

            setStudentEmail={
              setEditStudentEmail
            }

            setStudentStatus={
              setEditStudentStatus
            }

            setStudentNotes={
              setEditStudentNotes
            }

            setInstrument={
              setEditInstrument
            }

            setProgrammeName={
              setEditProgrammeName
            }

            setStartDate={
              (value) => {
                setEditStartDate(
                  value
                );

                /*
                 * Only automatically calculate
                 * the end date when the current
                 * programme follows the standard
                 * 3-month structure.
                 */
                if (
                  editProgrammeName
                    .toLowerCase()
                    .includes("3 month")
                ) {
                  setEditEndDate(
                    addMonthsToDate(
                      value,
                      3
                    )
                  );
                }
              }
            }

            setEndDate={
              setEditEndDate
            }

            setTotalFee={
              setEditTotalFee
            }

            setEnrollmentStatus={
              setEditEnrollmentStatus
            }

            setPhotoFile={
              setEditPhotoFile
            }

            setPhotoPreview={
              setEditPhotoPreview
            }

            closeEditStudent={
              closeEditStudent
            }

            updateStudent={
              saveEditedStudent
            }

            formatCurrency={
              formatCurrency
            }

            formatDate={
              formatDate
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
              showPaymentModal
            }

            setShowPaymentForm={
              setShowPaymentModal
            }

            updatingId={
              updatingPaymentId
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

      {/* =================================================
          REFRESH INDICATOR
      ================================================= */}

      {refreshing && (
        <div className="pointer-events-none fixed bottom-5 right-5 z-[120]">
          <div className="flex items-center gap-2 rounded-full border border-[var(--st-border)] bg-white px-4 py-2 text-[9px] font-semibold text-[var(--st-gray)] shadow-lg">
            <RefreshCw
              size={13}
              className="animate-spin"
            />

            Updating students...
          </div>
        </div>
      )}

    </main>
  );
}