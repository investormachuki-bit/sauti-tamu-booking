import { supabase } from "@/lib/supabase";

import type {
  Student,
  Enrollment,
  Payment,
  PaymentSchedule,
  StudentRecord,
} from "@/components/students/students-types";

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

  // --------------------------------------------------
  // ENROLLMENTS
  // --------------------------------------------------

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

  // --------------------------------------------------
  // PAYMENTS
  // --------------------------------------------------

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

  // --------------------------------------------------
  // PAYMENT SCHEDULES
  // --------------------------------------------------

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
      (scheduleData ??
        []) as PaymentSchedule[];
  }

  // --------------------------------------------------
  // BUILD LOOKUP MAPS
  // --------------------------------------------------

  const enrollmentMap =
    new Map<string, Enrollment>();

  enrollments.forEach(
    (enrollment) => {
      // The students page currently uses
      // the most recent enrollment.
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

  // --------------------------------------------------
  // BUILD FINAL STUDENT RECORDS
  // --------------------------------------------------

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