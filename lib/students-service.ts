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

/* =====================================================
   CONSTANTS
===================================================== */

const STUDENT_PHOTO_BUCKET =
  "student-photos";

const STUDENT_PHOTO_SIGNED_URL_SECONDS =
  60 * 60;

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
      `
        id,
        lead_id,
        full_name,
        email,
        whatsapp_number,
        status,
        notes,
        photo_path,
        created_at,
        updated_at
      `
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

  /*
   * Generate signed URLs for private
   * student photos.
   */
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

  /* ===================================================
     ENROLLMENTS
  =================================================== */

  const {
    data: enrollmentData,
    error: enrollmentError,
  } = await supabase
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
    });

  if (enrollmentError) {
    throw enrollmentError;
  }

  const enrollments =
    (enrollmentData ??
      []) as Enrollment[];

  /* ===================================================
     PAYMENTS
  =================================================== */

  const {
    data: paymentData,
    error: paymentError,
  } = await supabase
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
    });

  if (paymentError) {
    throw paymentError;
  }

  const payments =
    (paymentData ??
      []) as Payment[];

  /* ===================================================
     PAYMENT SCHEDULES
  =================================================== */

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
    new Map<
      string,
      Enrollment
    >();

  enrollments.forEach(
    (enrollment) => {
      /*
       * Because enrollments are ordered
       * newest first, the first enrollment
       * is the current/latest enrollment.
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

  /* ===================================================
     BUILD FINAL STUDENT RECORDS
  =================================================== */

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

/* =====================================================
   DELETE STUDENT PHOTO
===================================================== */

export async function deleteStudentPhoto(
  photoPath: string | null
): Promise<void> {
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

/* =====================================================
   GET SIGNED STUDENT PHOTO URL
===================================================== */

export async function getStudentPhotoUrl(
  photoPath: string | null
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
      STUDENT_PHOTO_SIGNED_URL_SECONDS
    );

  if (error) {
    throw error;
  }

  return data?.signedUrl ??
    null;
}

/* =====================================================
   UPDATE STUDENT
===================================================== */

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

  photoFile?: File | null;
}

export async function updateStudent(
  input: UpdateStudentInput
): Promise<void> {
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

  /*
   * First retrieve the current photo path
   * and current enrollment.
   */
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

  const {
    data: currentEnrollment,
    error:
      currentEnrollmentError,
  } = await supabase
    .from(
      "student_enrollments"
    )
    .select(
      "id, photo_path"
    )
    .eq(
      "student_id",
      studentId
    )
    .order(
      "created_at",
      {
        ascending: false,
      }
    )
    .limit(1)
    .maybeSingle();

  /*
   * Some databases may not have a photo_path
   * column on enrollment. We don't actually
   * need it, so don't fail the entire edit
   * because of that lookup.
   */
  if (
    currentEnrollmentError &&
    currentEnrollmentError.code !==
      "PGRST116"
  ) {
    /*
     * Ignore enrollment lookup errors here.
     * The actual enrollment update below will
     * provide the authoritative error.
     */
  }

  let newPhotoPath:
    | string
    | null = null;

  let uploadedNewPhoto =
    false;

  /* ===================================================
     PHOTO
  =================================================== */

  if (photoFile) {
    newPhotoPath =
      await uploadStudentPhoto(
        studentId,
        photoFile
      );

    uploadedNewPhoto = true;
  }

  /* ===================================================
     UPDATE STUDENT
  =================================================== */

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
    /*
     * If the database update fails after
     * uploading a new photo, remove the
     * orphaned photo.
     */
    if (newPhotoPath) {
      await deleteStudentPhoto(
        newPhotoPath
      ).catch(() => {});
    }

    throw studentUpdateError;
  }

  /* ===================================================
     UPDATE ENROLLMENT
  =================================================== */

  const enrollmentId =
    currentEnrollment?.id;

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
      );

    if (
      enrollmentUpdateError
    ) {
      /*
       * Roll the photo back if the enrollment
       * update fails.
       */
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
    /*
     * If somehow the student has no enrollment,
     * create one so the edit remains complete.
     */
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

  /* ===================================================
     DELETE OLD PHOTO
  =================================================== */

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