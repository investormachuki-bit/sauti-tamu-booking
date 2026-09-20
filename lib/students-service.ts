import { supabase } from "@/lib/supabase";

import type {
  Student,
  Enrollment,
  Payment,
  PaymentSchedule,
  StudentRecord,
  StudentStatus,
  Instrument,
} from "@/components/students/students-types";

/* ===================================================== CONSTANTS ===================================================== */

const STUDENT_PHOTO_BUCKET =
  "student-photos";

const STUDENT_PHOTO_SIGNED_URL_SECONDS =
  60 * 60;

/* ===================================================== LOAD STUDENTS ===================================================== */

export async function loadStudents(): Promise<
  StudentRecord[]
> {
  const {
    data: studentData,
    error: studentError,
  } = await supabase
    .from("students")
    .select(
      ` id, lead_id, full_name, email, whatsapp_number, status, notes, photo_path, created_at, updated_at `
    )
    .order("created_at", {
      ascending: false,
    });

  if (studentError) {
    throw studentError;
  }

  const rawStudents =
    studentData ?? [];

  if (rawStudents.length === 0) {
    return [];
  }

  /* * Generate signed URLs for private * student photos. */
  const students: Student[] =
    await Promise.all(
      rawStudents.map(
        async (student) => {
          let photoUrl:
            | string
            | null = null;

          if (student.photo_path) {
            const {
              data: signedUrlData,
              error: signedUrlError,
            } = await supabase.storage
              .from(
                STUDENT_PHOTO_BUCKET
              )
              .createSignedUrl(
                student.photo_path,
                STUDENT_PHOTO_SIGNED_URL_SECONDS
              );

            if (
              !signedUrlError &&
              signedUrlData?.signedUrl
            ) {
              photoUrl =
                signedUrlData.signedUrl;
            }
          }

          return {
            id: student.id,
            lead_id:
              student.lead_id,
            full_name:
              student.full_name,
            email:
              student.email,
            whatsapp_number:
              student.whatsapp_number,
            status:
              student.status as StudentStatus,
            notes:
              student.notes,
            photo_path:
              student.photo_path ??
              null,
            photo_url:
              photoUrl,
            created_at:
              student.created_at,
            updated_at:
              student.updated_at,
          };
        }
      )
    );

  const studentIds =
    students.map(
      (student) => student.id
    );

  /* =================================================== ENROLLMENTS =================================================== */

  const {
    data: enrollmentData,
    error: enrollmentError,
  } = await supabase
    .from("student_enrollments")
    .select(
      ` id, student_id, instrument, programme_name, start_date, end_date, total_fee, status, notes, created_at, updated_at `
    )
    .in(
      "student_id",
      studentIds
    )
    .order("created_at", {
      ascending: false,
    });

  if (enrollmentError) {
    throw enrollmentError;
  }

  const enrollments =
    (enrollmentData ??
      []) as Enrollment[];

  /* =================================================== PAYMENTS =================================================== */

  const {
    data: paymentData,
    error: paymentError,
  } = await supabase
    .from("payments")
    .select(
      ` id, student_id, enrollment_id, payment_schedule_id, amount, payment_date, payment_method, reference, notes, created_at `
    )
    .in(
      "student_id",
      studentIds
    )
    .order("payment_date", {
      ascending: false,
    });

  if (paymentError) {
    throw paymentError;
  }

  const payments =
    (paymentData ??
      []) as Payment[];

  /* =================================================== PAYMENT SCHEDULES =================================================== */

  const enrollmentIds =
    enrollments.map(
      (enrollment) =>
        enrollment.id
    );

  let schedules: PaymentSchedule[] =
    [];

  if (
    enrollmentIds.length > 0
  ) {
    const {
      data: scheduleData,
      error: scheduleError,
    } = await supabase
      .from("payment_schedule")
      .select(
        ` id, enrollment_id, amount_due, due_date, follow_up_date, status, notes `
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

  /* =================================================== BUILD LOOKUP MAPS =================================================== */

  const enrollmentMap =
    new Map<
      string,
      Enrollment
    >();

  enrollments.forEach(
    (enrollment) => {
      /* * Because enrollments are ordered * newest first, the first enrollment * is the current/latest enrollment. */
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
    new Map<
      string,
      Payment[]
    >();

  payments.forEach(
    (payment) => {
      const current =
        paymentsMap.get(
          payment.student_id
        ) ?? [];

      current.push(payment);

      paymentsMap.set(
        payment.student_id,
        current
      );
    }
  );

  const schedulesMap =
    new Map<
      string,
      PaymentSchedule[]
    >();

  schedules.forEach(
    (schedule) => {
      const current =
        schedulesMap.get(
          schedule.enrollment_id
        ) ?? [];

      current.push(schedule);

      schedulesMap.set(
        schedule.enrollment_id,
        current
      );
    }
  );

  /* =================================================== BUILD FINAL STUDENT RECORDS =================================================== */

  return students.map(
    (student) => {
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

        schedules:
          enrollment
            ? schedulesMap.get(
                enrollment.id
              ) ?? []
            : [],
      };
    }
  );
}

/* ===================================================== UPLOAD STUDENT PHOTO ===================================================== */

export async function uploadStudentPhoto( studentId: string, file: File ): Promise<string> {
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

  if (
    !file.type.startsWith(
      "image/"
    )
  ) {
    throw new Error(
      "Only image files are allowed."
    );
  }

  if (
    file.size >
    5 * 1024 * 1024
  ) {
    throw new Error(
      "Student photo must be smaller than 5MB."
    );
  }

  const extension =
    file.name
      .split(".")
      .pop()
      ?.toLowerCase() ||
    "jpg";

  const filePath =
    `${studentId}/${crypto.randomUUID()}.${extension}`;

  const {
    error,
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

  if (error) {
    throw error;
  }

  return filePath;
}

/* ===================================================== DELETE STUDENT PHOTO ===================================================== */

export async function deleteStudentPhoto( photoPath: string | null ): Promise<void> {
  if (!photoPath) {
    return;
  }

  const {
    error,
  } = await supabase.storage
    .from(
      STUDENT_PHOTO_BUCKET
    )
    .remove([
      photoPath,
    ]);

  if (error) {
    throw error;
  }
}

/* ===================================================== GET SIGNED STUDENT PHOTO URL ===================================================== */

export async function getStudentPhotoUrl( photoPath: string | null ): Promise<string | null> {
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
      STUDENT_PHOTO_SIGNED_URL_SECONDS
    );

  if (error) {
    throw error;
  }

  return data?.signedUrl ??
    null;
}

/* ===================================================== UPDATE STUDENT ===================================================== */

export interface UpdateStudentInput {
  studentId: string;

  fullName: string;
  whatsappNumber: string;
  email: string;
  status: StudentStatus;
  notes: string | null;

  instrument: Instrument;
  programmeName: string;
  startDate: string;
  endDate: string;
  totalFee: number;
  enrollmentStatus: StudentStatus;

  /** * Exact enrollment being edited. When null, a new enrollment is created * for a student who currently has no enrollment record. */
  enrollmentId: string | null;

  photoFile?: File | null;
}

export async function updateStudent( input: UpdateStudentInput ): Promise<void> {
  const {
    studentId,

    fullName,
    whatsappNumber,
    email,
    status,
    notes,

    instrument,
    programmeName,
    startDate,
    endDate,
    totalFee,
    enrollmentStatus,
    enrollmentId,

    photoFile,
  } = input;

  if (!studentId) {
    throw new Error(
      "Student ID is required."
    );
  }

  if (!fullName.trim()) {
    throw new Error(
      "Student name is required."
    );
  }

  if (!whatsappNumber.trim()) {
    throw new Error(
      "WhatsApp number is required."
    );
  }

  if (!programmeName.trim()) {
    throw new Error(
      "Programme name is required."
    );
  }

  if (!startDate) {
    throw new Error(
      "Start date is required."
    );
  }

  if (!endDate) {
    throw new Error(
      "End date is required."
    );
  }

  if (
    Number.isNaN(
      Number(totalFee)
    ) ||
    Number(totalFee) < 0
  ) {
    throw new Error(
      "Please enter a valid programme fee."
    );
  }

  /* * Retrieve the exact student record being edited. */
  const {
    data: currentStudent,
    error:
      currentStudentError,
  } = await supabase
    .from("students")
    .select(
      "id, photo_path"
    )
    .eq(
      "id",
      studentId
    )
    .single();

  if (currentStudentError) {
    throw currentStudentError;
  }

  /* * When an enrollment ID was supplied, verify that it belongs to * this exact student. We deliberately do not search for the * "latest" enrollment here because edits must affect the record * the administrator actually opened. */
  if (enrollmentId) {
    const {
      data: currentEnrollment,
      error: currentEnrollmentError,
    } = await supabase
      .from("student_enrollments")
      .select("id, student_id")
      .eq("id", enrollmentId)
      .eq("student_id", studentId)
      .maybeSingle();

    if (currentEnrollmentError) {
      throw currentEnrollmentError;
    }

    if (!currentEnrollment) {
      throw new Error(
        "The selected enrollment could not be found for this student."
      );
    }
  }

  let newPhotoPath:
    | string
    | null = null;

  let uploadedNewPhoto =
    false;

  /* =================================================== PHOTO =================================================== */

  if (photoFile) {
    newPhotoPath =
      await uploadStudentPhoto(
        studentId,
        photoFile
      );

    uploadedNewPhoto = true;
  }

  /* =================================================== UPDATE STUDENT =================================================== */

  const studentUpdate: Record<
    string,
    unknown
  > = {
    full_name:
      fullName.trim(),

    whatsapp_number:
      whatsappNumber.trim(),

    email:
      email.trim(),

    status,

    notes:
      notes?.trim() ||
      null,
  };

  if (uploadedNewPhoto) {
    studentUpdate.photo_path =
      newPhotoPath;
  }

  const {
    error: studentUpdateError,
  } = await supabase
    .from("students")
    .update(
      studentUpdate
    )
    .eq(
      "id",
      studentId
    );

  if (studentUpdateError) {
    /* * If the database update fails after * uploading a new photo, remove the * orphaned photo. */
    if (newPhotoPath) {
      await deleteStudentPhoto(
        newPhotoPath
      ).catch(() => {});
    }

    throw studentUpdateError;
  }

  /* =================================================== UPDATE ENROLLMENT =================================================== */

  if (enrollmentId) {
    const {
      error:
        enrollmentUpdateError,
    } = await supabase
      .from(
        "student_enrollments"
      )
      .update({
        instrument,
        programme_name:
          programmeName.trim(),
        start_date:
          startDate,
        end_date:
          endDate,
        total_fee:
          Number(totalFee),
        status:
          enrollmentStatus,
      })
      .eq(
        "id",
        enrollmentId
      )
      .eq(
        "student_id",
        studentId
      );

    if (
      enrollmentUpdateError
    ) {
      /* * Roll the photo back if the enrollment * update fails. */
      if (newPhotoPath) {
        await supabase
          .from("students")
          .update({
            photo_path:
              currentStudent
                .photo_path ??
              null,
          })
          .eq(
            "id",
            studentId
          );

        await deleteStudentPhoto(
          newPhotoPath
        ).catch(() => {});
      }

      throw enrollmentUpdateError;
    }
  } else {
    /* * If somehow the student has no enrollment, * create one so the edit remains complete. */
    const {
      error:
        enrollmentInsertError,
    } = await supabase
      .from(
        "student_enrollments"
      )
      .insert({
        student_id:
          studentId,
        instrument,
        programme_name:
          programmeName.trim(),
        start_date:
          startDate,
        end_date:
          endDate,
        total_fee:
          Number(totalFee),
        status:
          enrollmentStatus,
      });

    if (
      enrollmentInsertError
    ) {
      if (newPhotoPath) {
        await supabase
          .from("students")
          .update({
            photo_path:
              currentStudent
                .photo_path ??
              null,
          })
          .eq(
            "id",
            studentId
          );

        await deleteStudentPhoto(
          newPhotoPath
        ).catch(() => {});
      }

      throw enrollmentInsertError;
    }
  }

  /* =================================================== DELETE OLD PHOTO =================================================== */

  if (
    newPhotoPath &&
    currentStudent.photo_path &&
    currentStudent.photo_path !==
      newPhotoPath
  ) {
    await deleteStudentPhoto(
      currentStudent.photo_path
    ).catch(
      (error) => {
        console.warn(
          "Could not delete old student photo:",
          error
        );
      }
    );
  }
}

/* ===================================================== UPDATE PAYMENT ===================================================== */

export interface UpdatePaymentInput {
  paymentId: string;
  studentId: string;
  enrollmentId: string;

  amount: number;
  paymentDate: string;
  paymentMethod: Payment["payment_method"];
  reference: string | null;
  notes: string | null;
}

export async function updatePayment( input: UpdatePaymentInput ): Promise<void> {
  const {
    paymentId,
    studentId,
    enrollmentId,
    amount,
    paymentDate,
    paymentMethod,
    reference,
    notes,
  } = input;

  if (!paymentId) {
    throw new Error(
      "Payment ID is required."
    );
  }

  if (!studentId) {
    throw new Error(
      "Student ID is required."
    );
  }

  if (!enrollmentId) {
    throw new Error(
      "Enrollment ID is required."
    );
  }

  const numericAmount =
    Number(amount);

  if (
    Number.isNaN(numericAmount) ||
    numericAmount <= 0
  ) {
    throw new Error(
      "Payment amount must be greater than zero."
    );
  }

  if (!paymentDate) {
    throw new Error(
      "Payment date is required."
    );
  }

  /* * Verify the exact payment belongs to the exact * student and enrollment being edited. */
  const {
    data: payment,
    error: paymentLookupError,
  } = await supabase
    .from("payments")
    .select(
      "id, student_id, enrollment_id"
    )
    .eq("id", paymentId)
    .eq("student_id", studentId)
    .eq("enrollment_id", enrollmentId)
    .maybeSingle();

  if (paymentLookupError) {
    throw paymentLookupError;
  }

  if (!payment) {
    throw new Error(
      "The selected payment could not be found for this student and enrollment."
    );
  }

  const {
    error: paymentUpdateError,
  } = await supabase
    .from("payments")
    .update({
      amount: numericAmount,
      payment_date: paymentDate,
      payment_method: paymentMethod,
      reference:
        reference?.trim() || null,
      notes:
        notes?.trim() || null,
    })
    .eq("id", paymentId)
    .eq("student_id", studentId)
    .eq("enrollment_id", enrollmentId);

  if (paymentUpdateError) {
    throw paymentUpdateError;
  }
}

/* ===================================================== DELETE PAYMENT ===================================================== */

export async function deletePayment( paymentId: string, studentId: string, enrollmentId: string ): Promise<void> {
  if (!paymentId) {
    throw new Error(
      "Payment ID is required."
    );
  }

  if (!studentId) {
    throw new Error(
      "Student ID is required."
    );
  }

  if (!enrollmentId) {
    throw new Error(
      "Enrollment ID is required."
    );
  }

  /* * Verify the exact payment before deleting it. */
  const {
    data: payment,
    error: paymentLookupError,
  } = await supabase
    .from("payments")
    .select(
      "id, student_id, enrollment_id"
    )
    .eq("id", paymentId)
    .eq("student_id", studentId)
    .eq("enrollment_id", enrollmentId)
    .maybeSingle();

  if (paymentLookupError) {
    throw paymentLookupError;
  }

  if (!payment) {
    throw new Error(
      "The selected payment could not be found for this student and enrollment."
    );
  }

  const {
    error: paymentDeleteError,
  } = await supabase
    .from("payments")
    .delete()
    .eq("id", paymentId)
    .eq("student_id", studentId)
    .eq("enrollment_id", enrollmentId);

  if (paymentDeleteError) {
    throw paymentDeleteError;
  }
}

/* ===================================================== COMPLETE STUDENT ===================================================== */

export async function completeStudent( studentId: string, enrollmentId: string ): Promise<void> {
  if (!studentId) {
    throw new Error(
      "Student ID is required."
    );
  }

  if (!enrollmentId) {
    throw new Error(
      "Enrollment ID is required."
    );
  }

  /* * Verify that the enrollment belongs to the student. * The dashboard passes the exact enrollment displayed * on the student's completion card. */
  const {
    data: enrollment,
    error: enrollmentLookupError,
  } = await supabase
    .from("student_enrollments")
    .select("id, student_id, status")
    .eq("id", enrollmentId)
    .eq("student_id", studentId)
    .maybeSingle();

  if (enrollmentLookupError) {
    throw enrollmentLookupError;
  }

  if (!enrollment) {
    throw new Error(
      "The selected enrollment could not be found for this student."
    );
  }

  /* * Read the current student status so we can restore it * if the enrollment update fails. */
  const {
    data: currentStudent,
    error: studentLookupError,
  } = await supabase
    .from("students")
    .select("id, status")
    .eq("id", studentId)
    .single();

  if (studentLookupError) {
    throw studentLookupError;
  }

  /* * Complete the exact student record. */
  const {
    error: studentUpdateError,
  } = await supabase
    .from("students")
    .update({
      status: "completed",
    })
    .eq("id", studentId);

  if (studentUpdateError) {
    throw studentUpdateError;
  }

  /* * Complete the exact enrollment shown on the card. */
  const {
    error: enrollmentUpdateError,
  } = await supabase
    .from("student_enrollments")
    .update({
      status: "completed",
    })
    .eq("id", enrollmentId)
    .eq("student_id", studentId);

  if (enrollmentUpdateError) {
    /* * Roll the student status back if the enrollment update fails, * preventing the two records from becoming inconsistent. */
    await supabase
      .from("students")
      .update({
        status: currentStudent.status,
      })
      .eq("id", studentId);

    throw enrollmentUpdateError;
  }
}