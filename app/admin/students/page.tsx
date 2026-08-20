"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "../../../lib/supabase";

import StudentsHeader from "../../../components/students/StudentsHeader";
import StudentStats from "../../../components/students/StudentStats";
import StudentsToolbar from "../../../components/students/StudentsToolbar";
import StudentList from "../../../components/students/StudentList";
import StudentDetails from "../../../components/students/StudentDetails";
import AddStudentModal from "../../../components/students/AddStudentModal";
import PaymentModal from "../../../components/students/PaymentModal";
import {
  AlertCircle,
  RefreshCw,
} from "lucide-react";

type PaymentMethod =
  | "mpesa"
  | "cash"
  | "bank"
  | "card"
  | "other";

type Instrument =
  | "piano"
  | "guitar";

type StudentStatus =
  | "active"
  | "completed"
  | "paused"
  | "cancelled"
  | "inactive";

type PaymentScheduleStatus =
  | "scheduled"
  | "due"
  | "overdue"
  | "partially_paid"
  | "paid"
  | "cancelled";

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
  status: StudentStatus;
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
  created_at: string;
};

type StudentRecord = {
  student: Student;
  enrollment: Enrollment | null;
  schedules: PaymentSchedule[];
  payments: Payment[];
};

type SelectedStudentRecord = {
  student: Student;
  enrollment: Enrollment | null;
  payments: Payment[];
};

const NAIROBI_TIME_ZONE = "Africa/Nairobi";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);
}

function formatDate(
  value: string | null | undefined
) {
  if (!value) return "—";

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

function getTotalPaid(
  payments: Payment[]
) {
  return payments.reduce(
    (total, payment) =>
      total + Number(payment.amount || 0),
    0
  );
}

function getBalance(
  enrollment: {
    instrument?: string | null;
    programme_name?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    total_fee?: number | string | null;
    status?: string | null;
  } | null,
  payments: {
    id: string;
    amount: number | string;
    payment_date: string;
    payment_method: string;
    reference?: string | null;
  }[]
) {
  if (!enrollment) return 0;

  const totalPaid = payments.reduce(
    (total, payment) =>
      total + Number(payment.amount || 0),
    0
  );

  return Math.max(
    Number(enrollment.total_fee || 0) -
      totalPaid,
    0
  );
}

export default function AdminStudentsPage() {
  /* =====================================================
     DATA
  ===================================================== */

  const [students, setStudents] =
    useState<StudentRecord[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  /* =====================================================
     SEARCH + FILTERS
  ===================================================== */

  const [searchTerm, setSearchTerm] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("all");

  const [instrumentFilter, setInstrumentFilter] =
    useState("all");

  const [paymentFilter, setPaymentFilter] =
    useState("all");

  const [showFilters, setShowFilters] =
    useState(false);

  /* =====================================================
     MODALS
  ===================================================== */

  const [selectedStudent, setSelectedStudent] =
    useState<SelectedStudentRecord | null>(
      null
    );

  const [showAddStudent, setShowAddStudent] =
    useState(false);

  const [showPaymentModal, setShowPaymentModal] =
    useState(false);

  const [paymentStudent, setPaymentStudent] =
    useState<SelectedStudentRecord | null>(
      null
    );

  /* =====================================================
     LOAD STUDENTS
  ===================================================== */

  const loadStudents = useCallback(
    async (silent = false) => {
      try {
        if (silent) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

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

        const loadedStudents =
          (studentData ?? []) as Student[];

        if (
          loadedStudents.length ===
          0
        ) {
          setStudents([]);
          return;
        }

        const studentIds =
          loadedStudents.map(
            (student) =>
              student.id
          );

        const {
          data: enrollmentData,
          error: enrollmentError,
        } =
          await supabase
            .from(
              "student_enrollments"
            )
            .select(
              "id, student_id, instrument, programme_name, start_date, end_date, total_fee, status, notes, created_at, updated_at"
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

        const {
          data: paymentData,
          error: paymentError,
        } =
          await supabase
            .from("payments")
            .select(
              "id, student_id, enrollment_id, payment_schedule_id, amount, payment_date, payment_method, reference, notes, created_at"
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

        const enrollmentIds =
          enrollments.map(
            (enrollment) =>
              enrollment.id
          );

        let schedules:
          PaymentSchedule[] = [];

        if (
          enrollmentIds.length >
          0
        ) {
          const {
            data: scheduleData,
          } =
            await supabase
              .from(
                "payment_schedule"
              )
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

          schedules =
            (scheduleData ??
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

            current.push(
              payment
            );

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

            current.push(
              schedule
            );

            schedulesMap.set(
              schedule.enrollment_id,
              current
            );
          }
        );

        const records =
          loadedStudents.map(
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

        setStudents(records);
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
    loadStudents();
  }, [loadStudents]);

  /* =====================================================
     STATS
  ===================================================== */

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

  /* =====================================================
     FILTERING
  ===================================================== */

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
              record.payments
                .length > 0;

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

  /* =====================================================
     SELECTION
  ===================================================== */

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

  /* =====================================================
     COMMUNICATION
  ===================================================== */

  function openWhatsApp(
    record: SelectedStudentRecord
  ) {
    const phone =
      record.student.whatsapp_number;

    if (!phone) return;

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

  /* =====================================================
     PAYMENT
  ===================================================== */

  function openPaymentModal(
    record: SelectedStudentRecord
  ) {
    if (!record.enrollment) {
      return;
    }

    setPaymentStudent(
      record
    );

    setShowPaymentModal(
      true
    );
  }

  /* =====================================================
     RECEIPTS
  ===================================================== */

  function viewReceipt(
    record: SelectedStudentRecord,
    payment: Payment
  ) {
    console.log(
      "View receipt",
      record,
      payment
    );
  }

  function downloadReceipt(
    record: SelectedStudentRecord,
    payment: Payment
  ) {
    console.log(
      "Download receipt",
      record,
      payment
    );
  }

  function emailReceipt(
    record: SelectedStudentRecord,
    payment: Payment
  ) {
    if (
      !record.student.email
    ) {
      return;
    }

    const subject =
      encodeURIComponent(
        "Sauti Tamu Payment Receipt"
      );

    const body =
      encodeURIComponent(
        [
          `Dear ${record.student.full_name},`,
          "",
          `Payment received: ${formatCurrency(
            Number(
              payment.amount
            )
          )}`,
          `Payment date: ${formatDate(
            payment.payment_date
          )}`,
          `Payment method: ${payment.payment_method}`,
          `Reference: ${
            payment.reference ||
            "—"
          }`,
          "",
          "Sauti Tamu Music School",
        ].join("\n")
      );

    window.location.href =
      `mailto:${record.student.email}` +
      `?subject=${subject}&body=${body}`;
  }

  /* =====================================================
     PAGE
  ===================================================== */

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
        onAddStudent={() =>
          setShowAddStudent(
            true
          )
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
        <div className="mt-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">

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

          onAddStudent={() =>
            setShowAddStudent(
              true
            )
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
  students={filteredStudents}
  selectedStudentId={
    selectedStudent?.student.id ?? null
  }
  onSelectStudent={(student) => {
    const record = students.find(
      (item) =>
        item.student.id === student.student.id
    );

    if (record) {
      handleSelectStudent(record);
    }
  }}
  formatCurrency={formatCurrency}
  formatDate={formatDate}
  instrumentName={(instrument) => {
    if (!instrument) {
      return "—";
    }

    return instrument === "guitar"
      ? "Acoustic Guitar"
      : instrument.charAt(0).toUpperCase() +
        instrument.slice(1);
  }}
  getBalance={getBalance}

  openWhatsApp={(student) => {
    const record = students.find(
      (item) =>
        item.student.id === student.student.id
    );

    if (record) {
      openWhatsApp({
        student: record.student,
        enrollment: record.enrollment,
        payments: record.payments,
      });
    }
  }}

  callStudent={(student) => {
    const record = students.find(
      (item) =>
        item.student.id === student.student.id
    );

    if (record) {
      callStudent({
        student: record.student,
        enrollment: record.enrollment,
        payments: record.payments,
      });
    }
  }}

  emailStudent={(student) => {
    const record = students.find(
      (item) =>
        item.student.id === student.student.id
    );

    if (record) {
      emailStudent({
        student: record.student,
        enrollment: record.enrollment,
        payments: record.payments,
      });
    }
  }}
/>
        )}

      </div>

      {/* STUDENT DETAILS */}

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

    onWhatsApp={(student) => {
      const record = students.find(
        (item) =>
          item.student.id === student.student.id
      );

      if (record) {
        openWhatsApp({
          student: record.student,
          enrollment: record.enrollment,
          payments: record.payments,
        });
      }
    }}

    onCall={(student) => {
      const record = students.find(
        (item) =>
          item.student.id === student.student.id
      );

      if (record) {
        callStudent({
          student: record.student,
          enrollment: record.enrollment,
          payments: record.payments,
        });
      }
    }}

    onEmail={(student) => {
      const record = students.find(
        (item) =>
          item.student.id === student.student.id
      );

      if (record) {
        emailStudent({
          student: record.student,
          enrollment: record.enrollment,
          payments: record.payments,
        });
      }
    }}

    onReceivePayment={() =>
      openPaymentModal(
        selectedStudent
      )
    }

    viewReceipt={(student, payment) => {
  const record = students.find(
    (item) =>
      item.student.id === student.student.id
  );

  if (record) {
    viewReceipt(record, {
      id: payment.id,
      student_id: record.student.id,
      enrollment_id:
        record.enrollment?.id ?? "",
      payment_schedule_id: null,
      amount: Number(payment.amount || 0),
      payment_date: payment.payment_date,
      payment_method:
        payment.payment_method as PaymentMethod,
      reference: payment.reference ?? null,
      notes: null,
      created_at: payment.payment_date,
    });
  }
}}
   downloadReceipt={(student, payment) => {
  const record = students.find(
    (item) =>
      item.student.id === student.student.id
  );

  if (record) {
    downloadReceipt(
      record,
      {
        id: payment.id,
        student_id: record.student.id,
        enrollment_id:
          record.enrollment?.id ?? "",
        payment_schedule_id: null,
        amount: Number(payment.amount || 0),
        payment_date: payment.payment_date,
        payment_method:
          payment.payment_method as PaymentMethod,
        reference: payment.reference ?? null,
        notes: null,
        created_at: payment.payment_date,
      }
    );
  }
}}
   emailReceipt={(student, payment) => {
  const record = students.find(
    (item) =>
      item.student.id === student.student.id
  );

  if (record) {
    emailReceipt(
      record,
      {
        id: payment.id,
        student_id: record.student.id,
        enrollment_id:
          record.enrollment?.id ?? "",
        payment_schedule_id: null,
        amount: Number(payment.amount || 0),
        payment_date: payment.payment_date,
        payment_method:
          payment.payment_method as PaymentMethod,
        reference: payment.reference ?? null,
        notes: null,
        created_at: payment.payment_date,
      }
    );
  }
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

      {/* ADD STUDENT */}

      {showAddStudent && (
        <AddStudentModal
          show={
            showAddStudent
          }
          addingStudent={
            false
          }
          error=""
          studentName=""
          studentWhatsapp=""
          studentEmail=""
          studentNotes=""
          instrument="piano"
          programmeName="3 Month Training Programme"
          startDate={
            getTodayKey()
          }
          endDate=""
          totalFee=""
          initialPayment=""
          initialPaymentMethod="mpesa"
          initialPaymentReference=""
          nextPaymentAmount=""
          nextPaymentDueDate=""
          nextPaymentFollowUpDate=""
          nextPaymentNotes=""
          numericTotalFee={0}
          numericInitialPayment={0}
          remainingAfterInitial={0}
          remainingAfterNextPayment={0}
          setStudentName={() => {}}
          setStudentWhatsapp={() => {}}
          setStudentEmail={() => {}}
          setStudentNotes={() => {}}
          setInstrument={() => {}}
          setProgrammeName={() => {}}
          setStartDate={() => {}}
          setTotalFee={() => {}}
          setInitialPayment={() => {}}
          setInitialPaymentMethod={() => {}}
          setInitialPaymentReference={() => {}}
          setNextPaymentAmount={() => {}}
          setNextPaymentDueDate={() => {}}
          setNextPaymentFollowUpDate={() => {}}
          setNextPaymentNotes={() => {}}
          closeAddStudent={() =>
            setShowAddStudent(
              false
            )
          }
          addStudent={() => {}}
          formatCurrency={
            formatCurrency
          }
          formatDate={
            formatDate
          }
          instrumentName={(
            instrument
          ) =>
            instrument ===
            "guitar"
              ? "Acoustic Guitar"
              : "Piano"
          }
        />
      )}

      {/* PAYMENT */}

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
                paymentStudent.enrollment,
              payments:
                paymentStudent.payments,
            }}
            paymentAmount=""
            setPaymentAmount={() => {}}
            paymentMethod="mpesa"
            setPaymentMethod={() => {}}
            paymentReference=""
            setPaymentReference={() => {}}
            showPaymentForm={
              showPaymentModal
            }
            setShowPaymentForm={
              setShowPaymentModal
            }
            updatingId={null}
            recordPayment={() => {}}
            error={null}
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
