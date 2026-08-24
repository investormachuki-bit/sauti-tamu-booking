import { supabase } from "@/lib/supabase";

import type {
  Student,
  Enrollment,
  Payment,
  PaymentSchedule,
  StudentRecord,
} from "@/components/students/students-types";

const STUDENT_PHOTOS_BUCKET = "student-photos";

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
      "id, lead_id, full_name, email, whatsapp_number, photo_url, status, notes, created_at, updated_at"
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
     LOOKUP MAPS
  =================================================== */

  const enrollmentMap =
    new Map<string, Enrollment>();

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
     FINAL RECORDS
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
   UPLOAD STUDENT PHOTO
===================================================== */

export async function uploadStudentPhoto(
  studentId: string,
  file: File
): Promise<string> {
  if (!studentId) {
    throw new Error(
      "Student ID is required."
    );
  }

  if (!file) {
    throw new Error(
      "Please select a photo."
    );
  }

  /* ---------------------------------------------------
     VALIDATE FILE TYPE
  --------------------------------------------------- */

  if (!file.type.startsWith("image/")) {
    throw new Error(
      "Only image files are allowed."
    );
  }

  /* ---------------------------------------------------
     VALIDATE FILE SIZE
     5MB maximum
  --------------------------------------------------- */

  const maxSize =
    5 * 1024 * 1024;

  if (file.size > maxSize) {
    throw new Error(
      "Student photo must be smaller than 5MB."
    );
  }

  /* ---------------------------------------------------
     GET EXISTING PHOTO
  --------------------------------------------------- */

  const {
    data: existingStudent,
    error: existingError,
  } =
    await supabase
      .from("students")
      .select("photo_url")
      .eq("id", studentId)
      .single();

  if (existingError) {
    throw existingError;
  }

  const oldPhotoPath =
    existingStudent?.photo_url ??
    null;

  /* ---------------------------------------------------
     CREATE UNIQUE PATH
  --------------------------------------------------- */

  const extension =
    file.name
      .split(".")
      .pop()
      ?.toLowerCase() || "jpg";

  const safeExtension =
    ["jpg", "jpeg", "png", "webp"]
      .includes(extension)
      ? extension
      : "jpg";

  const filePath =
    `${studentId}/profile-${Date.now()}.${safeExtension}`;

  /* ---------------------------------------------------
     UPLOAD
  --------------------------------------------------- */

  const {
    error: uploadError,
  } =
    await supabase.storage
      .from(
        STUDENT_PHOTOS_BUCKET
      )
      .upload(
        filePath,
        file,
        {
          cacheControl: "3600",
          upsert: false,
          contentType:
            file.type,
        }
      );

  if (uploadError) {
    throw uploadError;
  }

  /* ---------------------------------------------------
     SAVE PATH TO STUDENT
  --------------------------------------------------- */

  const {
    error: updateError,
  } =
    await supabase
      .from("students")
      .update({
        photo_url: filePath,
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", studentId);

  if (updateError) {
    /* -----------------------------------------------
       CLEAN UP UPLOADED FILE
    ------------------------------------------------ */

    await supabase.storage
      .from(
        STUDENT_PHOTOS_BUCKET
      )
      .remove([filePath]);

    throw updateError;
  }

  /* ---------------------------------------------------
     DELETE OLD PHOTO
  --------------------------------------------------- */

  if (
    oldPhotoPath &&
    oldPhotoPath !== filePath
  ) {
    await supabase.storage
      .from(
        STUDENT_PHOTOS_BUCKET
      )
      .remove([
        oldPhotoPath,
      ]);
  }

  return filePath;
}

/* =====================================================
   GET PRIVATE SIGNED PHOTO URL
===================================================== */

export async function getStudentPhotoUrl(
  photoPath: string | null,
  expiresIn = 3600
): Promise<string | null> {
  if (!photoPath) {
    return null;
  }

  const {
    data,
    error,
  } =
    await supabase.storage
      .from(
        STUDENT_PHOTOS_BUCKET
      )
      .createSignedUrl(
        photoPath,
        expiresIn
      );

  if (error) {
    console.error(
      "Student photo URL error:",
      error
    );

    return null;
  }

  return data?.signedUrl ?? null;
}

/* =====================================================
   DELETE STUDENT PHOTO
===================================================== */

export async function deleteStudentPhoto(
  studentId: string
): Promise<void> {
  if (!studentId) {
    throw new Error(
      "Student ID is required."
    );
  }

  /* ---------------------------------------------------
     GET CURRENT PHOTO
  --------------------------------------------------- */

  const {
    data: student,
    error: studentError,
  } =
    await supabase
      .from("students")
      .select("photo_url")
      .eq("id", studentId)
      .single();

  if (studentError) {
    throw studentError;
  }

  const photoPath =
    student?.photo_url ?? null;

  if (!photoPath) {
    return;
  }

  /* ---------------------------------------------------
     DELETE STORAGE FILE
  --------------------------------------------------- */

  const {
    error: deleteError,
  } =
    await supabase.storage
      .from(
        STUDENT_PHOTOS_BUCKET
      )
      .remove([
        photoPath,
      ]);

  if (deleteError) {
    throw deleteError;
  }

  /* ---------------------------------------------------
     CLEAR DATABASE PATH
  --------------------------------------------------- */

  const {
    error: updateError,
  } =
    await supabase
      .from("students")
      .update({
        photo_url: null,
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", studentId);

  if (updateError) {
    throw updateError;
  }
}

/* =====================================================
   UPDATE STUDENT BASIC INFORMATION
===================================================== */

export async function updateStudent(
  studentId: string,
  values: {
    full_name: string;
    email: string;
    whatsapp_number: string;
    notes?: string | null;
    status?: Student["status"];
  }
): Promise<Student> {
  if (!studentId) {
    throw new Error(
      "Student ID is required."
    );
  }

  if (!values.full_name.trim()) {
    throw new Error(
      "Student name is required."
    );
  }

  if (!values.whatsapp_number.trim()) {
    throw new Error(
      "WhatsApp number is required."
    );
  }

  if (!values.email.trim()) {
    throw new Error(
      "Email address is required."
    );
  }

  const {
    data,
    error,
  } =
    await supabase
      .from("students")
      .update({
        full_name:
          values.full_name.trim(),

        email:
          values.email.trim(),

        whatsapp_number:
          values.whatsapp_number.trim(),

        notes:
          values.notes?.trim() ||
          null,

        ...(values.status
          ? {
              status:
                values.status,
            }
          : {}),

        updated_at:
          new Date().toISOString(),
      })
      .eq("id", studentId)
      .select(
        "id, lead_id, full_name, email, whatsapp_number, photo_url, status, notes, created_at, updated_at"
      )
      .single();

  if (error) {
    throw error;
  }

  return data as Student;
}