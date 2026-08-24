import { supabase } from "@/lib/supabase";

import type {
  Student,
  Enrollment,
  Payment,
  PaymentSchedule,
  StudentRecord,
} from "@/components/students/students-types";

/* =====================================================
   LOAD STUDENTS
===================================================== */

export async function loadStudents(): Promise<
  StudentRecord[]
> {
  const {
    data: studentData,
    error: studentError,
  } = await supabase
    .from("students")
    .select(
      "id, lead_id, full_name, email, whatsapp_number, status, notes, photo_path, created_at, updated_at"
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
      (scheduleData ??
        []) as PaymentSchedule[];
  }

  /* ===================================================
     BUILD LOOKUP MAPS
  =================================================== */

  const enrollmentMap =
    new Map<string, Enrollment>();

  enrollments.forEach(
    (enrollment) => {
      /*
       * Enrollments are ordered newest first,
       * therefore the first enrollment for each
       * student is the current/latest enrollment.
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
     BUILD FINAL RECORDS
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
   UPDATE STUDENT
===================================================== */

export type UpdateStudentInput = {
  full_name: string;
  email: string;
  whatsapp_number: string;
  status: Student["status"];
  notes: string | null;
  photo_path?: string | null;
};

export async function updateStudent(
  studentId: string,
  input: UpdateStudentInput
): Promise<Student> {
  const {
    data,
    error,
  } = await supabase
    .from("students")
    .update({
      full_name:
        input.full_name.trim(),

      email:
        input.email.trim(),

      whatsapp_number:
        input.whatsapp_number.trim(),

      status:
        input.status,

      notes:
        input.notes?.trim() || null,

      ...(input.photo_path !== undefined
        ? {
            photo_path:
              input.photo_path,
          }
        : {}),
    })
    .eq("id", studentId)
    .select(
      "id, lead_id, full_name, email, whatsapp_number, status, notes, photo_path, created_at, updated_at"
    )
    .single();

  if (error) {
    throw error;
  }

  return data as Student;
}

/* =====================================================
   UPDATE ENROLLMENT
===================================================== */

export type UpdateEnrollmentInput = {
  instrument: Enrollment["instrument"];
  programme_name: string;
  start_date: string;
  end_date: string;
  total_fee: number;
  status: Enrollment["status"];
  notes: string | null;
};

export async function updateEnrollment(
  enrollmentId: string,
  input: UpdateEnrollmentInput
): Promise<Enrollment> {
  const {
    data,
    error,
  } = await supabase
    .from("student_enrollments")
    .update({
      instrument:
        input.instrument,

      programme_name:
        input.programme_name.trim(),

      start_date:
        input.start_date,

      end_date:
        input.end_date,

      total_fee:
        Number(input.total_fee) || 0,

      status:
        input.status,

      notes:
        input.notes?.trim() || null,
    })
    .eq("id", enrollmentId)
    .select(
      "id, student_id, instrument, programme_name, start_date, end_date, total_fee, status, notes, created_at, updated_at"
    )
    .single();

  if (error) {
    throw error;
  }

  return data as Enrollment;
}

/* =====================================================
   UPDATE STUDENT + ENROLLMENT
===================================================== */

export type UpdateStudentProfileInput = {
  student: UpdateStudentInput;

  enrollment?: UpdateEnrollmentInput | null;
};

export async function updateStudentProfile(
  studentId: string,
  input: UpdateStudentProfileInput,
  enrollmentId?: string | null
): Promise<void> {
  /*
   * Update the student first.
   */
  await updateStudent(
    studentId,
    input.student
  );

  /*
   * If the student has an enrollment and
   * enrollment data was supplied, update it too.
   */
  if (
    enrollmentId &&
    input.enrollment
  ) {
    await updateEnrollment(
      enrollmentId,
      input.enrollment
    );
  }
}

/* =====================================================
   UPLOAD STUDENT PHOTO
===================================================== */

const STUDENT_PHOTO_BUCKET =
  "student-photos";

export async function uploadStudentPhoto(
  studentId: string,
  file: File
): Promise<string> {
  if (!file) {
    throw new Error(
      "Please select a photo."
    );
  }

  /*
   * Basic client-side validation.
   */
  if (
    !file.type.startsWith(
      "image/"
    )
  ) {
    throw new Error(
      "Please select a valid image file."
    );
  }

  /*
   * Keep student photos reasonably small.
   */
  const maxSize =
    5 * 1024 * 1024;

  if (file.size > maxSize) {
    throw new Error(
      "Student photo must be 5MB or smaller."
    );
  }

  const extension =
    file.name
      .split(".")
      .pop()
      ?.toLowerCase() ||
    "jpg";

  /*
   * Use a stable folder per student.
   *
   * The bucket remains PRIVATE.
   */
  const filePath =
    `${studentId}/profile-${Date.now()}.${extension}`;

  const {
    error: uploadError,
  } = await supabase.storage
    .from(
      STUDENT_PHOTO_BUCKET
    )
    .upload(
      filePath,
      file,
      {
        cacheControl:
          "3600",

        upsert: false,

        contentType:
          file.type,
      }
    );

  if (uploadError) {
    throw uploadError;
  }

  /*
   * Store only the storage path in the
   * students table.
   *
   * We deliberately do NOT store a public URL
   * because the bucket is private.
   */
  const {
    error: updateError,
  } = await supabase
    .from("students")
    .update({
      photo_path:
        filePath,
    })
    .eq(
      "id",
      studentId
    );

  if (updateError) {
    /*
     * If the database update fails, try to remove
     * the uploaded file so we don't leave an orphan.
     */
    await supabase.storage
      .from(
        STUDENT_PHOTO_BUCKET
      )
      .remove([
        filePath,
      ]);

    throw updateError;
  }

  return filePath;
}

/* =====================================================
   DELETE STUDENT PHOTO
===================================================== */

export async function deleteStudentPhoto(
  studentId: string,
  photoPath?: string | null
): Promise<void> {
  if (!photoPath) {
    return;
  }

  const {
    error: storageError,
  } = await supabase.storage
    .from(
      STUDENT_PHOTO_BUCKET
    )
    .remove([
      photoPath,
    ]);

  if (storageError) {
    throw storageError;
  }

  const {
    error: updateError,
  } = await supabase
    .from("students")
    .update({
      photo_path: null,
    })
    .eq(
      "id",
      studentId
    );

  if (updateError) {
    throw updateError;
  }
}

/* =====================================================
   GET PRIVATE STUDENT PHOTO URL
===================================================== */

export async function getStudentPhotoUrl(
  photoPath: string | null | undefined,
  expiresIn = 3600
): Promise<string | null> {
  if (!photoPath) {
    return null;
  }

  const {
    data,
    error,
  } = await supabase.storage
    .from(
      STUDENT_PHOTO_BUCKET
    )
    .createSignedUrl(
      photoPath,
      expiresIn
    );

  if (error) {
    throw error;
  }

  return data?.signedUrl ??
    null;
}