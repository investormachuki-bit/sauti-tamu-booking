/* =====================================================
   COMPLETE STUDENT
===================================================== */

export async function completeStudent(
  studentId: string
): Promise<void> {
  if (!studentId) {
    throw new Error(
      "Student ID is required."
    );
  }

  /*
   * Find the current/latest enrollment.
   * loadStudents() uses the newest enrollment
   * as the current enrollment.
   */
  const {
    data: enrollment,
    error: enrollmentLookupError,
  } = await supabase
    .from("student_enrollments")
    .select(
      "id, student_id, status"
    )
    .eq(
      "student_id",
      studentId
    )
    .order("created_at", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  if (enrollmentLookupError) {
    throw enrollmentLookupError;
  }

  /*
   * Mark the student itself as completed.
   */
  const {
    error: studentUpdateError,
  } = await supabase
    .from("students")
    .update({
      status: "completed",
    })
    .eq(
      "id",
      studentId
    );

  if (studentUpdateError) {
    throw studentUpdateError;
  }

  /*
   * Mark the current enrollment as completed too.
   */
  if (enrollment?.id) {
    const {
      error: enrollmentUpdateError,
    } = await supabase
      .from("student_enrollments")
      .update({
        status: "completed",
      })
      .eq(
        "id",
        enrollment.id
      );

    if (enrollmentUpdateError) {
      /*
       * Roll the student status back if the
       * enrollment update fails, so the two
       * records don't become inconsistent.
       */
      await supabase
        .from("students")
        .update({
          status: "active",
        })
        .eq(
          "id",
          studentId
        );

      throw enrollmentUpdateError;
    }
  }
}