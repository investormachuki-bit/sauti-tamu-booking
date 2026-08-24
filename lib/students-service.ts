import { supabase } from "@/lib/supabase";

import type {
  Student,
  Enrollment,
  Payment,
  PaymentSchedule,
  StudentRecord,
  PaymentMethod,
} from "@/components/students/students-types";

/* =====================================================
   LOAD STUDENTS
===================================================== */

export async function loadStudents(): Promise<StudentRecord[]> {
  const {
    data: studentData,
    error: studentError,
  } = await supabase
    .from("students")
    .select(
      "id, lead_id, full_name, email, whatsapp_number, status, notes, created_at, updated_at"
    )
    .order("created_at", {
      ascending: false,
    });

  if (studentError) {
    throw studentError;
  }

  const students =
    (studentData ?? []) as Student[];

  if (students.length === 0) {
    return [];
  }

  const studentIds = students.map(
    (student) => student.id
  );

  /* ===================================================
     ENROLLMENTS
  =================================================== */

  const {
    data: enrollmentData,
    error: enrollmentError,
  } = await supabase
    .from("student_enrollments")
    .select(
      "id, student_id, instrument, programme_name, start_date, end_date, total_fee, status, notes, created_at, updated_at"
    )
    .in("student_id", studentIds)
    .order("created_at", {
      ascending: false,
    });

  if (enrollmentError) {
    throw enrollmentError;
  }

  const enrollments =
    (enrollmentData ?? []) as Enrollment[];

  /* ===================================================
     PAYMENTS
  =================================================== */

  const {
    data: paymentData,
    error: paymentError,
  } = await supabase
    .from("payments")
    .select(
      "id, student_id, enrollment_id, payment_schedule_id, amount, payment_date, payment_method, reference, notes, created_at"
    )
    .in("student_id", studentIds)
    .order("payment_date", {
      ascending: false,
    });

  if (paymentError) {
    throw paymentError;
  }

  const payments =
    (paymentData ?? []) as Payment[];

  /* ===================================================
     PAYMENT SCHEDULES
  =================================================== */

  const enrollmentIds =
    enrollments.map(
      (enrollment) => enrollment.id
    );

  let schedules: PaymentSchedule[] = [];

  if (enrollmentIds.length > 0) {
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
      throw scheduleError;
    }

    schedules =
      (scheduleData ?? []) as PaymentSchedule[];
  }

  /* ===================================================
     BUILD LOOKUP MAPS
  =================================================== */

  const enrollmentMap =
    new Map<string, Enrollment>();

  enrollments.forEach(
    (enrollment) => {
      /*
       * The students page currently uses
       * the most recent enrollment.
       */
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

  const paymentsMap =
    new Map<string, Payment[]>();

  payments.forEach((payment) => {
    const current =
      paymentsMap.get(
        payment.student_id
      ) ?? [];

    current.push(payment);

    paymentsMap.set(
      payment.student_id,
      current
    );
  });

  const schedulesMap =
    new Map<
      string,
      PaymentSchedule[]
    >();

  schedules.forEach((schedule) => {
    const current =
      schedulesMap.get(
        schedule.enrollment_id
      ) ?? [];

    current.push(schedule);

    schedulesMap.set(
      schedule.enrollment_id,
      current
    );
  });

  /* ===================================================
     BUILD FINAL STUDENT RECORDS
  =================================================== */

  return students.map((student) => {
    const enrollment =
      enrollmentMap.get(
        student.id
      ) ?? null;

    return {
      student,

      enrollment,

      payments:
        paymentsMap.get(
          student.id
        ) ?? [],

      schedules: enrollment
        ? schedulesMap.get(
            enrollment.id
          ) ?? []
        : [],
    };
  });
}

/* =====================================================
   CREATE STUDENT INPUT
===================================================== */

export type CreateStudentInput = {
  fullName: string;
  whatsappNumber: string;
  email: string;
  notes: string;

  instrument: "piano" | "guitar";
  programmeName: string;

  startDate: string;
  endDate: string;

  totalFee: number;

  initialPayment: number;
  initialPaymentMethod: PaymentMethod;
  initialPaymentReference: string;

  nextPaymentAmount: number;
  nextPaymentDueDate: string;
  nextPaymentFollowUpDate: string;
  nextPaymentNotes: string;
};

/* =====================================================
   CREATE STUDENT
===================================================== */

export async function createStudent(
  input: CreateStudentInput
): Promise<void> {
  /* ===================================================
     VALIDATION
  =================================================== */

  if (!input.fullName.trim()) {
    throw new Error(
      "Student name is required."
    );
  }

  if (!input.whatsappNumber.trim()) {
    throw new Error(
      "WhatsApp number is required."
    );
  }

  if (!input.email.trim()) {
    throw new Error(
      "Email address is required."
    );
  }

  if (!input.startDate) {
    throw new Error(
      "Programme start date is required."
    );
  }

  if (!input.endDate) {
    throw new Error(
      "Programme end date is required."
    );
  }

  if (input.totalFee <= 0) {
    throw new Error(
      "Programme fee must be greater than zero."
    );
  }

  if (input.initialPayment < 0) {
    throw new Error(
      "Initial payment cannot be negative."
    );
  }

  if (
    input.initialPayment >
    input.totalFee
  ) {
    throw new Error(
      "Initial payment cannot be greater than the total programme fee."
    );
  }

  const remainingBalance =
    Math.max(
      input.totalFee -
        input.initialPayment,
      0
    );

  if (
    input.nextPaymentAmount < 0
  ) {
    throw new Error(
      "Next payment amount cannot be negative."
    );
  }

  if (
    input.nextPaymentAmount >
    remainingBalance
  ) {
    throw new Error(
      "Next payment cannot be greater than the remaining balance."
    );
  }

  if (
    remainingBalance > 0 &&
    input.nextPaymentAmount > 0 &&
    !input.nextPaymentDueDate
  ) {
    throw new Error(
      "Next payment due date is required."
    );
  }

  /* ===================================================
     1. CREATE STUDENT
  =================================================== */

  const {
    data: student,
    error: studentError,
  } = await supabase
    .from("students")
    .insert({
      lead_id: null,

      full_name:
        input.fullName.trim(),

      email:
        input.email.trim(),

      whatsapp_number:
        input.whatsappNumber.trim(),

      status: "active",

      notes:
        input.notes.trim() ||
        null,
    })
    .select("id")
    .single();

  if (studentError) {
    throw studentError;
  }

  if (!student) {
    throw new Error(
      "Student was created but no student ID was returned."
    );
  }

  /* ===================================================
     2. CREATE ENROLLMENT
  =================================================== */

  const {
    data: enrollment,
    error: enrollmentError,
  } = await supabase
    .from("student_enrollments")
    .insert({
      student_id:
        student.id,

      instrument:
        input.instrument,

      programme_name:
        input.programmeName.trim() ||
        "3 Month Training Programme",

      start_date:
        input.startDate,

      end_date:
        input.endDate,

      total_fee:
        input.totalFee,

      status: "active",

      notes: null,
    })
    .select("id")
    .single();

  if (enrollmentError) {
    throw enrollmentError;
  }

  if (!enrollment) {
    throw new Error(
      "Enrollment was created but no enrollment ID was returned."
    );
  }

  /* ===================================================
     3. CREATE INITIAL PAYMENT
  =================================================== */

  if (
    input.initialPayment > 0
  ) {
    const today =
      new Date()
        .toISOString()
        .slice(0, 10);

    const {
      error: paymentError,
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
          input.initialPayment,

        payment_date:
          today,

        payment_method:
          input.initialPaymentMethod,

        reference:
          input.initialPaymentReference.trim() ||
          null,

        notes:
          "Initial programme payment",
      });

    if (paymentError) {
      throw paymentError;
    }
  }

  /* ===================================================
     4. CREATE NEXT PAYMENT SCHEDULE
  =================================================== */

  if (
    remainingBalance > 0 &&
    input.nextPaymentAmount > 0 &&
    input.nextPaymentDueDate
  ) {
    const nextPaymentAmount =
      Math.min(
        input.nextPaymentAmount,
        remainingBalance
      );

    const today =
      new Date()
        .toISOString()
        .slice(0, 10);

    let status:
      | "scheduled"
      | "due" =
      "scheduled";

    if (
      input.nextPaymentDueDate <=
      today
    ) {
      status = "due";
    }

    const {
      error: scheduleError,
    } = await supabase
      .from("payment_schedule")
      .insert({
        enrollment_id:
          enrollment.id,

        amount_due:
          nextPaymentAmount,

        due_date:
          input.nextPaymentDueDate,

        follow_up_date:
          input.nextPaymentFollowUpDate ||
          null,

        status,

        notes:
          input.nextPaymentNotes.trim() ||
          null,
      });

    if (scheduleError) {
      throw scheduleError;
    }
  }
}