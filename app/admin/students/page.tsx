"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Plus, RefreshCw, Users } from "lucide-react";

import { supabase } from "@/lib/supabase";
import { generatePaymentReceipt } from "@/lib/generate-payment-receipt";

import type {
  PaymentReceiptData,
  PaymentReceiptItem,
} from "@/lib/generate-payment-receipt";

import type { PaymentMethod } from "@/types/students";

import StudentsHeader from "./StudentsHeader";
import StudentsStats from "./StudentsStats";
import StudentsToolbar from "./StudentsToolbar";
import StudentList from "./StudentList";
import StudentDetails from "./StudentDetails";
import AddStudentModal from "./AddStudentModal";
import PaymentModal from "./PaymentModal";

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

type Filter =
  | "all"
  | StudentStatus;

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
  created_at?: string;
};

export type StudentRecord = {
  student: Student;
  enrollment: Enrollment | null;
  schedules: PaymentSchedule[];
  payments: Payment[];
};

type ReceiptDataWithHistory =
  PaymentReceiptData & {
    balance: number;
    payments: PaymentReceiptItem[];
  };

const NAIROBI_TIME_ZONE = "Africa/Nairobi";

/* =========================================================
   FORMATTING
========================================================= */

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);
}

function formatDate(value: string | null | undefined) {
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

function formatLongDate(value: string) {
  return new Intl.DateTimeFormat("en-KE", {
    timeZone: NAIROBI_TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
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

function addThreeMonths(value: string) {
  if (!value) return "";

  const date = new Date(
    `${value}T00:00:00+03:00`
  );

  date.setMonth(date.getMonth() + 3);

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function calculateDaysRemaining(
  value: string
) {
  if (!value) return null;

  const today = new Date(
    `${getTodayKey()}T00:00:00+03:00`
  );

  const end = new Date(
    `${value}T00:00:00+03:00`
  );

  return Math.ceil(
    (end.getTime() - today.getTime()) /
      86400000
  );
}

function instrumentName(
  value: string | null | undefined
) {
  if (!value) return "—";

  if (value.toLowerCase() === "guitar") {
    return "Acoustic Guitar";
  }

  return (
    value.charAt(0).toUpperCase() +
    value.slice(1)
  );
}

function studentStatusLabel(
  value: StudentStatus
) {
  return (
    value.charAt(0).toUpperCase() +
    value.slice(1)
  );
}

/* =========================================================
   FINANCIAL HELPERS
========================================================= */

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

function getNextPayment(
  schedules: PaymentSchedule[]
) {
  return (
    [...schedules]
      .filter(
        (schedule) =>
          schedule.status !== "paid" &&
          schedule.status !== "cancelled"
      )
      .sort((a, b) =>
        a.due_date.localeCompare(
          b.due_date
        )
      )[0] ?? null
  );
}

/* =========================================================
   RECEIPTS
========================================================= */

function createReceiptNumber(
  paymentId: string
) {
  return `ST-${paymentId
    .replace(/-/g, "")
    .slice(0, 10)
    .toUpperCase()}`;
}

function buildReceiptData(
  record: StudentRecord,
  payment: Payment
): ReceiptDataWithHistory | null {
  if (!record.enrollment) {
    return null;
  }

  const chronological = [
    ...record.payments,
  ].sort((a, b) => {
    const dateDifference =
      a.payment_date.localeCompare(
        b.payment_date
      );

    if (dateDifference !== 0) {
      return dateDifference;
    }

    return (
      (a.created_at || "").localeCompare(
        b.created_at || ""
      )
    );
  });

  if (
    !chronological.some(
      (item) => item.id === payment.id
    )
  ) {
    chronological.push(payment);

    chronological.sort((a, b) => {
      const dateDifference =
        a.payment_date.localeCompare(
          b.payment_date
        );

      if (dateDifference !== 0) {
        return dateDifference;
      }

      return (
        (a.created_at || "").localeCompare(
          b.created_at || ""
        )
      );
    });
  }

  const currentIndex =
    chronological.findIndex(
      (item) => item.id === payment.id
    );

  if (currentIndex < 0) {
    return null;
  }

  const paymentsUpToCurrent =
    chronological.slice(
      0,
      currentIndex + 1
    );

  const previousPaymentsTotal =
    paymentsUpToCurrent
      .slice(0, currentIndex)
      .reduce(
        (sum, item) =>
          sum + Number(item.amount),
        0
      );

  const previousBalance = Math.max(
    Number(record.enrollment.total_fee) -
      previousPaymentsTotal,
    0
  );

  const balanceAfterPayment =
    Math.max(
      previousBalance -
        Number(payment.amount),
      0
    );

  const paymentHistory: PaymentReceiptItem[] =
    paymentsUpToCurrent.map(
      (item, index) => ({
        label: `Payment ${index + 1}`,
        amount: Number(item.amount),
        date: item.payment_date,
        method: item.payment_method,
        reference: item.reference,
      })
    );

  return {
    receiptNumber:
      createReceiptNumber(payment.id),

    studentName:
      record.student.full_name,

    studentEmail:
      record.student.email,

    studentPhone:
      record.student.whatsapp_number,

    programmeName:
      record.enrollment.programme_name,

    instrument: instrumentName(
      record.enrollment.instrument
    ),

    programmeAmount:
      Number(
        record.enrollment.total_fee
      ),

    paymentHistory,

    previousBalance,

    amountPaid:
      Number(payment.amount),

    balanceAfterPayment,

    balance:
      balanceAfterPayment,

    paymentMethod:
      payment.payment_method,

    paymentDate:
      payment.payment_date,

    reference:
      payment.reference,

    payments: paymentHistory,
  };
}

/* =========================================================
   PAGE
========================================================= */

export default function AdminStudentsPage() {
  const [records, setRecords] =
    useState<StudentRecord[]>([]);

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

  const [
    selectedStudent,
    setSelectedStudent,
  ] =
    useState<StudentRecord | null>(null);

  const [
    showAddStudent,
    setShowAddStudent,
  ] =
    useState(false);

  const [
    showPaymentForm,
    setShowPaymentForm,
  ] =
    useState(false);

  const [
    updatingId,
    setUpdatingId,
  ] =
    useState<string | null>(null);

  /* PAYMENT FORM */

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

  /* ADD STUDENT */

  const [
    addingStudent,
    setAddingStudent,
  ] = useState(false);

  const [
    addStudentError,
    setAddStudentError,
  ] = useState("");

  const [
    studentName,
    setStudentName,
  ] = useState("");

  const [
    studentWhatsapp,
    setStudentWhatsapp,
  ] = useState("");

  const [
    studentEmail,
    setStudentEmail,
  ] = useState("");

  const [
    studentNotes,
    setStudentNotes,
  ] = useState("");

  const [
    instrument,
    setInstrument,
  ] =
    useState<Instrument>("piano");

  const [
    programmeName,
    setProgrammeName,
  ] =
    useState(
      "3 Month Training Programme"
    );

  const [
    startDate,
    setStartDate,
  ] =
    useState(getTodayKey());

  const [
    totalFee,
    setTotalFee,
  ] = useState("");

  const [
    initialPayment,
    setInitialPayment,
  ] = useState("");

  const [
    initialPaymentMethod,
    setInitialPaymentMethod,
  ] =
    useState<PaymentMethod>("mpesa");

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

  /* =========================================================
     DERIVED ADD-STUDENT VALUES
  ========================================================= */

  const endDate = useMemo(
    () => addThreeMonths(startDate),
    [startDate]
  );

  const numericTotalFee =
    Number(totalFee) || 0;

  const numericInitialPayment =
    Number(initialPayment) || 0;

  const remainingAfterInitial =
    Math.max(
      numericTotalFee -
        numericInitialPayment,
      0
    );

  const numericNextPayment =
    Number(nextPaymentAmount) || 0;

  const remainingAfterNextPayment =
    Math.max(
      remainingAfterInitial -
        numericNextPayment,
      0
    );

  /* =========================================================
     LOAD STUDENTS
  ========================================================= */

  async function loadStudents(
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
        data: studentsData,
        error: studentsError,
      } =
        await supabase
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
        throw studentsError;
      }

      const students =
        (studentsData || []) as Student[];

      if (!students.length) {
        setRecords([]);
        return;
      }

      const studentIds =
        students.map(
          (student) => student.id
        );

      const [
        enrollmentResult,
        paymentResult,
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
          .in(
            "student_id",
            studentIds
          )
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
              notes,
              created_at
            `
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
          }),
      ]);

      if (enrollmentResult.error) {
        throw enrollmentResult.error;
      }

      if (paymentResult.error) {
        throw paymentResult.error;
      }

      const enrollments =
        (enrollmentResult.data ||
          []) as Enrollment[];

      const payments =
        (paymentResult.data ||
          []) as Payment[];

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
        } =
          await supabase
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
            "Schedule loading error:",
            scheduleError
          );
        }

        schedules =
          (scheduleData ||
            []) as PaymentSchedule[];
      }

      const enrollmentMap =
        new Map<
          string,
          Enrollment
        >();

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

      const scheduleMap =
        new Map<
          string,
          PaymentSchedule[]
        >();

      schedules.forEach(
        (schedule) => {
          const current =
            scheduleMap.get(
              schedule.enrollment_id
            ) || [];

          current.push(schedule);

          scheduleMap.set(
            schedule.enrollment_id,
            current
          );
        }
      );

      const paymentMap =
        new Map<
          string,
          Payment[]
        >();

      payments.forEach(
        (payment) => {
          const current =
            paymentMap.get(
              payment.student_id
            ) || [];

          current.push(payment);

          paymentMap.set(
            payment.student_id,
            current
          );
        }
      );

      setRecords(
        students.map(
          (student) => {
            const enrollment =
              enrollmentMap.get(
                student.id
              ) || null;

            return {
              student,
              enrollment,
              schedules:
                enrollment
                  ? scheduleMap.get(
                      enrollment.id
                    ) || []
                  : [],
              payments:
                paymentMap.get(
                  student.id
                ) || [],
            };
          }
        )
      );
    } catch (err) {
      console.error(
        "Student loading error:",
        err
      );

      setError(
        "We couldn't load students. Please try again."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadStudents();
  }, []);

  /* =========================================================
     GET ONE STUDENT
  ========================================================= */

  async function getStudentRecord(
    studentId: string
  ): Promise<StudentRecord | null> {
    const {
      data: studentData,
      error: studentError,
    } =
      await supabase
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
        .eq("id", studentId)
        .single();

    if (
      studentError ||
      !studentData
    ) {
      return null;
    }

    const {
      data: enrollmentData,
    } =
      await supabase
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
        .eq(
          "student_id",
          studentId
        )
        .order("created_at", {
          ascending: false,
        });

    const enrollment =
      (
        (enrollmentData ||
          []) as Enrollment[]
      )[0] || null;

    let schedules: PaymentSchedule[] =
      [];

    if (enrollment) {
      const {
        data: scheduleData,
      } =
        await supabase
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
          .eq(
            "enrollment_id",
            enrollment.id
          )
          .order("due_date", {
            ascending: true,
          });

      schedules =
        (scheduleData ||
          []) as PaymentSchedule[];
    }

    const {
      data: paymentData,
    } =
      await supabase
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
            notes,
            created_at
          `
        )
        .eq(
          "student_id",
          studentId
        )
        .order("payment_date", {
          ascending: false,
        });

    return {
      student:
        studentData as Student,

      enrollment,

      schedules,

      payments:
        (paymentData ||
          []) as Payment[],
    };
  }

  /* =========================================================
     RESET ADD STUDENT
  ========================================================= */

  function resetAddStudentForm() {
    setStudentName("");
    setStudentWhatsapp("");
    setStudentEmail("");
    setStudentNotes("");

    setInstrument("piano");

    setProgrammeName(
      "3 Month Training Programme"
    );

    setStartDate(getTodayKey());

    setTotalFee("");
    setInitialPayment("");
    setInitialPaymentMethod("mpesa");
    setInitialPaymentReference("");

    setNextPaymentAmount("");
    setNextPaymentDueDate("");
    setNextPaymentFollowUpDate("");
    setNextPaymentNotes("");

    setAddStudentError("");
  }

  /* =========================================================
     ADD STUDENT
  ========================================================= */

  async function addStudent() {
    setAddStudentError("");

    const name =
      studentName.trim();

    const email =
      studentEmail.trim();

    const whatsapp =
      studentWhatsapp.trim();

    const total =
      Number(totalFee);

    const initial =
      Number(initialPayment) || 0;

    const nextAmount =
      Number(nextPaymentAmount) || 0;

    if (!name) {
      setAddStudentError(
        "Please enter the student's full name."
      );
      return;
    }

    if (!email) {
      setAddStudentError(
        "Please enter the student's email address."
      );
      return;
    }

    if (!whatsapp) {
      setAddStudentError(
        "Please enter the student's WhatsApp number."
      );
      return;
    }

    if (!startDate || !endDate) {
      setAddStudentError(
        "Please select a valid programme start date."
      );
      return;
    }

    if (!total || total <= 0) {
      setAddStudentError(
        "Please enter a valid programme fee."
      );
      return;
    }

    if (
      initial < 0 ||
      initial > total
    ) {
      setAddStudentError(
        "Initial payment must be between KES 0 and the programme fee."
      );
      return;
    }

    if (
      nextAmount < 0 ||
      nextAmount >
        remainingAfterInitial
    ) {
      setAddStudentError(
        "Next payment cannot exceed the remaining balance."
      );
      return;
    }

    if (
      remainingAfterInitial > 0 &&
      nextAmount <= 0
    ) {
      setAddStudentError(
        "Please enter the next payment amount."
      );
      return;
    }

    if (
      remainingAfterInitial > 0 &&
      !nextPaymentDueDate
    ) {
      setAddStudentError(
        "Please select the next payment due date."
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
        "The follow-up date should be on or before the payment due date."
      );
      return;
    }

    setAddingStudent(true);

    let createdStudentId:
      | string
      | null = null;

    let createdEnrollmentId:
      | string
      | null = null;

    try {
      const {
        data: createdStudent,
        error: studentError,
      } =
        await supabase
          .from("students")
          .insert({
            full_name: name,
            email,
            whatsapp_number:
              whatsapp,
            status: "active",
            notes:
              studentNotes.trim() ||
              null,
          })
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
          .single();

      if (studentError) {
        throw studentError;
      }

      createdStudentId =
        createdStudent.id;

      const {
        data: createdEnrollment,
        error:
          enrollmentError,
      } =
        await supabase
          .from(
            "student_enrollments"
          )
          .insert({
            student_id:
              createdStudent.id,
            instrument,
            programme_name:
              programmeName.trim() ||
              "3 Month Training Programme",
            start_date: startDate,
            end_date: endDate,
            total_fee: total,
            status: "active",
          })
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
          .single();

      if (enrollmentError) {
        throw enrollmentError;
      }

      createdEnrollmentId =
        createdEnrollment.id;

      if (initial > 0) {
        const {
          error: paymentError,
        } =
          await supabase
            .from("payments")
            .insert({
              student_id:
                createdStudent.id,
              enrollment_id:
                createdEnrollment.id,
              payment_schedule_id:
                null,
              amount: initial,
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
        remainingAfterInitial > 0 &&
        nextAmount > 0
      ) {
        const {
          error: scheduleError,
        } =
          await supabase
            .from("payment_schedule")
            .insert({
              enrollment_id:
                createdEnrollment.id,
              amount_due: nextAmount,
              due_date:
                nextPaymentDueDate,
              follow_up_date:
                nextPaymentFollowUpDate ||
                null,
              status: "scheduled",
              notes:
                nextPaymentNotes.trim() ||
                null,
            });

        if (scheduleError) {
          throw scheduleError;
        }
      }

      setShowAddStudent(false);

      resetAddStudentForm();

      await loadStudents(true);

      const fresh =
        await getStudentRecord(
          createdStudent.id
        );

      if (fresh) {
        setSelectedStudent(fresh);

        if (
          initial > 0 &&
          fresh.payments[0]
        ) {
          await downloadReceipt(
            fresh,
            fresh.payments[0]
          );
        }
      }
    } catch (err) {
      console.error(
        "Add student error:",
        err
      );

      if (createdEnrollmentId) {
        await supabase
          .from(
            "student_enrollments"
          )
          .delete()
          .eq(
            "id",
            createdEnrollmentId
          );
      }

      if (createdStudentId) {
        await supabase
          .from("students")
          .delete()
          .eq(
            "id",
            createdStudentId
          );
      }

      setAddStudentError(
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
          : "We couldn't add this student. Please check the details and try again."
      );
    } finally {
      setAddingStudent(false);
    }
  }

  /* =========================================================
     RECORD PAYMENT
  ========================================================= */

  async function recordPayment() {
    if (
      !selectedStudent?.enrollment
    ) {
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

    const previousBalance =
      getBalance(
        selectedStudent.enrollment,
        selectedStudent.payments
      );

    if (amount > previousBalance) {
      setError(
        `Payment cannot exceed the remaining balance of ${formatCurrency(
          previousBalance
        )}.`
      );
      return;
    }

    setUpdatingId(
      selectedStudent.student.id
    );

    setError("");

    try {
      const nextSchedule =
        getNextPayment(
          selectedStudent.schedules
        );

      const {
        data,
        error:
          paymentError,
      } =
        await supabase
          .from("payments")
          .insert({
            student_id:
              selectedStudent.student.id,

            enrollment_id:
              selectedStudent.enrollment.id,

            payment_schedule_id:
              nextSchedule?.id ||
              null,

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
              notes,
              created_at
            `
          )
          .single();

      if (paymentError) {
        throw paymentError;
      }

      const payment =
        data as Payment;

      if (nextSchedule) {
        const paidAgainstSchedule =
          selectedStudent.payments
            .filter(
              (item) =>
                item.payment_schedule_id ===
                nextSchedule.id
            )
            .reduce(
              (sum, item) =>
                sum +
                Number(item.amount),
              0
            ) + amount;

        await supabase
          .from(
            "payment_schedule"
          )
          .update({
            status:
              paidAgainstSchedule >=
              Number(
                nextSchedule.amount_due
              )
                ? "paid"
                : "partially_paid",
          })
          .eq(
            "id",
            nextSchedule.id
          );
      }

      const updatedRecord:
        StudentRecord = {
          ...selectedStudent,
          payments: [
            payment,
            ...selectedStudent.payments,
          ],
        };

      setSelectedStudent(
        updatedRecord
      );

      setPaymentAmount("");
      setPaymentReference("");
      setPaymentMethod("mpesa");
      setShowPaymentForm(false);

      await loadStudents(true);

      const refreshed =
        await getStudentRecord(
          selectedStudent.student.id
        );

      if (refreshed) {
        setSelectedStudent(
          refreshed
        );

        await downloadReceipt(
          refreshed,
          payment
        );
      }
    } catch (err) {
      console.error(
        "Payment error:",
        err
      );

      setError(
        "We couldn't record this payment. Please try again."
      );
    } finally {
      setUpdatingId(null);
    }
  }

  /* =========================================================
     COMMUNICATION
  ========================================================= */

  function openWhatsApp(
    record: StudentRecord
  ) {
    const phone =
      record.student.whatsapp_number;

    if (!phone) return;

    const next =
      getNextPayment(
        record.schedules
      );

    const balance =
      getBalance(
        record.enrollment,
        record.payments
      );

    let message =
      `Hello ${record.student.full_name}, this is Sauti Tamu Piano Center.`;

    message +=
      ` Your current outstanding balance is ${formatCurrency(
        balance
      )}.`;

    if (next) {
      message +=
        ` This is a reminder regarding your next payment of ${formatCurrency(
          Number(
            next.amount_due
          )
        )} due on ${formatDate(
          next.due_date
        )}.`;
    }

    message +=
      " Payment details: Paybill 542 542, Account 466 170.";

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
    if (!record.student.email) {
      return;
    }

    window.location.href =
      `mailto:${record.student.email}`;
  }

  /* =========================================================
     RECEIPT ACTIONS
  ========================================================= */

  async function downloadReceipt(
    record: StudentRecord,
    payment: Payment
  ) {
    const receipt =
      buildReceiptData(
        record,
        payment
      );

    if (!receipt) {
      setError(
        "This student does not have a programme attached to the payment."
      );
      return;
    }

    try {
      await generatePaymentReceipt(
        receipt
      );
    } catch (err) {
      console.error(
        "Receipt generation error:",
        err
      );

      setError(
        "We couldn't generate the receipt. Please try again."
      );
    }
  }

  function viewReceipt(
    record: StudentRecord,
    payment: Payment
  ) {
    const receipt =
      buildReceiptData(
        record,
        payment
      );

    if (!receipt) {
      setError(
        "This student does not have a programme attached to the payment."
      );
      return;
    }

    /*
     * Keep receipt viewing simple for now.
     * The PaymentHistory component handles
     * the actual payment-history presentation.
     *
     * Download remains the authoritative
     * receipt action.
     */
    void downloadReceipt(
      record,
      payment
    );
  }

  function emailReceipt(
    record: StudentRecord,
    payment: Payment
  ) {
    if (!record.student.email) {
      setError(
        "This student does not have an email address."
      );
      return;
    }

    const receipt =
      buildReceiptData(
        record,
        payment
      );

    if (!receipt) {
      setError(
        "This student does not have a programme attached to the payment."
      );
      return;
    }

    const subject =
      `Sauti Tamu Payment Receipt - ${receipt.receiptNumber}`;

    const body = [
      `Hello ${record.student.full_name},`,
      "",
      "Please find your Sauti Tamu payment receipt details below:",
      "",
      `Receipt: ${receipt.receiptNumber}`,
      `Programme: ${receipt.programmeName}`,
      `Payment: ${formatCurrency(
        receipt.amountPaid
      )}`,
      `Date: ${formatLongDate(
        receipt.paymentDate
      )}`,
      `Method: ${receipt.paymentMethod}`,
      `Balance: ${formatCurrency(
        receipt.balanceAfterPayment
      )}`,
      "",
      "Thank you,",
      "Sauti Tamu Piano Center",
    ].join("\n");

    window.location.href =
      `mailto:${record.student.email}?subject=${encodeURIComponent(
        subject
      )}&body=${encodeURIComponent(
        body
      )}`;
  }

  /* =========================================================
     FILTERING
  ========================================================= */

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

          return [
            record.student.full_name,
            record.student.email,
            record.student.whatsapp_number,
            record.enrollment
              ?.instrument || "",
            record.enrollment
              ?.programme_name || "",
          ]
            .join(" ")
            .toLowerCase()
            .includes(query);
        }
      );
    }, [
      records,
      search,
      filter,
    ]);

  /* =========================================================
     STATS
  ========================================================= */

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
      records.filter(
        (record) => {
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

          return (
            days !== null &&
            days >= 0 &&
            days <= 30
          );
        }
      ).length;

    const paymentAttention =
      records.filter(
        (record) => {
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
        }
      ).length;

    return {
      active,
      completed,
      endingSoon,
      paymentAttention,
    };
  }, [records]);

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <main className="st-content">

      {/* HEADER */}

      <StudentsHeader
        onRefresh={() =>
          loadStudents(true)
        }
        refreshing={refreshing}
        onAddStudent={() =>
          setShowAddStudent(true)
        }
      />

      {/* STATS */}

      <StudentsStats
        active={stats.active}
        endingSoon={stats.endingSoon}
        paymentAttention={
          stats.paymentAttention
        }
        completed={stats.completed}
      />

      {/* TOOLBAR */}

      <StudentsToolbar
        search={search}
        setSearch={setSearch}
        filter={filter}
        setFilter={setFilter}
      />

      {/* ERROR */}

      {error && (
        <div className="mt-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <AlertCircle
            size={15}
            className="mt-0.5 shrink-0 text-red-600"
          />

          <p className="m-0 text-[10px] leading-relaxed text-red-700">
            {error}
          </p>
        </div>
      )}

      {/* REGISTER */}

      <section className="mt-7">

        <div className="mb-4">
          <p className="st-eyebrow">
            STUDENT REGISTER
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
        ) : (
          <StudentList
            students={filteredRecords}
            selectedStudentId={
              selectedStudent?.student.id
            }
            onSelectStudent={(student) =>
              setSelectedStudent(
                student
              )
            }
            formatCurrency={
              formatCurrency
            }
            formatDate={formatDate}
            instrumentName={
              instrumentName
            }
            getBalance={(
              enrollment,
              payments
            ) =>
              getBalance(
                enrollment,
                payments
              )
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
      </section>

      {/* STUDENT DETAILS */}

      {selectedStudent &&
        !showAddStudent &&
        !showPaymentForm && (
          <StudentDetails
            selectedStudent={
              selectedStudent
            }
            onClose={() =>
              setSelectedStudent(null)
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
            onReceivePayment={() => {
              setError("");
              setPaymentAmount("");
              setPaymentReference("");
              setPaymentMethod(
                "mpesa"
              );
              setShowPaymentForm(true);
            }}
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
            getBalance={(
              enrollment,
              payments
            ) =>
              getBalance(
                enrollment,
                payments
              )
            }
          />
        )}

      {/* ADD STUDENT */}

      <AddStudentModal
        show={showAddStudent}
        addingStudent={
          addingStudent
        }
        error={addStudentError}
        studentName={studentName}
        studentWhatsapp={
          studentWhatsapp
        }
        studentEmail={
          studentEmail
        }
        studentNotes={
          studentNotes
        }
        instrument={instrument}
        programmeName={
          programmeName
        }
        startDate={startDate}
        endDate={endDate}
        totalFee={totalFee}
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
        closeAddStudent={() => {
          if (addingStudent) return;

          setShowAddStudent(false);
          resetAddStudentForm();
        }}
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

      {/* PAYMENT */}

      {selectedStudent && (
        <PaymentModal
          selectedStudent={{
            student: {
              id:
                selectedStudent.student
                  .id,
              full_name:
                selectedStudent.student
                  .full_name,
            },
            enrollment:
              selectedStudent.enrollment,
            payments:
              selectedStudent.payments,
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
          error={error || null}
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
