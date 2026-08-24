export type PaymentMethod =
  | "mpesa"
  | "cash"
  | "bank"
  | "card"
  | "other";

export type Instrument =
  | "piano"
  | "guitar";

export type StudentStatus =
  | "active"
  | "completed"
  | "paused"
  | "cancelled"
  | "inactive";

export type PaymentScheduleStatus =
  | "scheduled"
  | "due"
  | "overdue"
  | "partially_paid"
  | "paid"
  | "cancelled";

/* =====================================================
   STUDENT
===================================================== */

export type Student = {
  id: string;
  lead_id: string | null;

  full_name: string;
  email: string;
  whatsapp_number: string;

  /**
   * Private Supabase Storage path.
   *
   * Example:
   * student-id/profile-123456789.jpg
   *
   * This is NOT a public URL.
   * The application generates a temporary
   * signed URL when displaying the photo.
   */
  photo_url: string | null;

  status: StudentStatus;

  notes: string | null;

  created_at: string;
  updated_at: string;
};

/* =====================================================
   ENROLLMENT
===================================================== */

export type Enrollment = {
  id: string;
  student_id: string;

  instrument: Instrument;
  programme_name: string;

  start_date: string;
  end_date: string;

  total_fee: number;

  status: StudentStatus;

  notes: string | null;

  created_at: string;
  updated_at: string;
};

/* =====================================================
   PAYMENT SCHEDULE
===================================================== */

export type PaymentSchedule = {
  id: string;
  enrollment_id: string;

  amount_due: number;

  due_date: string;
  follow_up_date: string | null;

  status: PaymentScheduleStatus;

  notes: string | null;
};

/* =====================================================
   PAYMENT
===================================================== */

export type Payment = {
  id: string;

  student_id: string;
  enrollment_id: string;

  payment_schedule_id: string | null;

  amount: number;

  payment_date: string;

  payment_method: PaymentMethod;

  reference: string | null;

  notes: string | null;

  created_at: string;
};

/* =====================================================
   STUDENT RECORD
===================================================== */

export type StudentRecord = {
  student: Student;

  enrollment: Enrollment | null;

  schedules: PaymentSchedule[];

  payments: Payment[];
};

/* =====================================================
   SELECTED STUDENT
===================================================== */

export type SelectedStudentRecord = {
  student: Student;

  enrollment: Enrollment | null;

  payments: Payment[];
};