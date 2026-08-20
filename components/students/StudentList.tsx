"use client";

import {
  ChevronRight,
  Mail,
  MessageCircle,
  Phone,
  UserRound,
} from "lucide-react";

type Student = {
  student: {
    id: string;
    full_name: string;
    whatsapp?: string | null;
    email?: string | null;
  };

  enrollment?: {
    instrument?: string | null;
    programme_name?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    total_fee?: number | string | null;
  } | null;

  payments: {
    id: string;
    amount: number | string;
    payment_date: string;
    payment_method: string;
    reference?: string | null;
  }[];
};

interface StudentListProps {
  students: Student[];

  selectedStudentId?: string | null;

  onSelectStudent: (student: Student) => void;

  formatCurrency: (amount: number) => string;

  formatDate: (date: string | null | undefined) => string;

  instrumentName: (
    instrument: string | null | undefined,
  ) => string;

  getBalance: (
    enrollment: NonNullable<Student["enrollment"]>,
    payments: Student["payments"],
  ) => number;

  openWhatsApp: (student: Student) => void;

  callStudent: (student: Student) => void;

  emailStudent: (student: Student) => void;
}

export default function StudentList({
  students,
  selectedStudentId,
  onSelectStudent,
  formatCurrency,
  formatDate,
  instrumentName,
  getBalance,
  openWhatsApp,
  callStudent,
  emailStudent,
}: StudentListProps) {
  if (students.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--st-border)] bg-white p-8 text-center">
        <UserRound
          size={22}
          className="mx-auto text-[var(--st-gray)]"
        />

        <p className="mt-3 mb-0 text-[12px] font-semibold text-[var(--st-charcoal-dark)]">
          No students found
        </p>

        <p className="mt-1 mb-0 text-[9px] text-[var(--st-gray)]">
          Try changing your search or filters.
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-[var(--st-border)] rounded-2xl border border-[var(--st-border)] bg-white">
      {students.map((student) => {
        const isSelected =
          selectedStudentId === student.student.id;

        const enrollment = student.enrollment;

        const balance = enrollment
          ? getBalance(
              enrollment,
              student.payments,
            )
          : 0;

        return (
          <button
            key={student.student.id}
            type="button"
            onClick={() =>
              onSelectStudent(student)
            }
            className={`group block w-full p-4 text-left transition ${
              isSelected
                ? "bg-[var(--st-bg-soft)]"
                : "bg-white hover:bg-[var(--st-bg-soft)]"
            }`}
          >
            <div className="flex items-start gap-3">
              {/* AVATAR */}

              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                  isSelected
                    ? "bg-[var(--st-red)] text-white"
                    : "bg-[var(--st-bg-soft)] text-[var(--st-red)]"
                }`}
              >
                <span className="text-[11px] font-bold">
                  {student.student.full_name
                    .split(" ")
                    .map(
                      (name) =>
                        name.charAt(0),
                    )
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()}
                </span>
              </div>

              {/* MAIN INFORMATION */}

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="m-0 truncate text-[12px] font-bold text-[var(--st-charcoal-dark)]">
                      {student.student.full_name}
                    </p>

                    <p className="mt-1 truncate text-[9px] text-[var(--st-gray)]">
                      {enrollment
                        ? enrollment.programme_name ||
                          instrumentName(
                            enrollment.instrument,
                          )
                        : "No active programme"}
                    </p>
                  </div>

                  <ChevronRight
                    size={15}
                    className={`mt-0.5 shrink-0 transition ${
                      isSelected
                        ? "text-[var(--st-red)]"
                        : "text-[var(--st-gray)] group-hover:text-[var(--st-red)]"
                    }`}
                  />
                </div>

                {/* DETAILS */}

                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
                  {enrollment?.instrument && (
                    <span className="text-[8px] font-semibold uppercase tracking-[0.05em] text-[var(--st-gray)]">
                      {instrumentName(
                        enrollment.instrument,
                      )}
                    </span>
                  )}

                  {enrollment?.start_date && (
                    <span className="text-[8px] text-[var(--st-gray)]">
                      Started{" "}
                      {formatDate(
                        enrollment.start_date,
                      )}
                    </span>
                  )}

                  <span className="text-[8px] text-[var(--st-gray)]">
                    {student.payments.length}{" "}
                    payments
                  </span>
                </div>

                {/* FINANCIAL */}

                {enrollment && (
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="m-0 text-[8px] uppercase tracking-[0.05em] text-[var(--st-gray)]">
                        Balance
                      </p>

                      <p
                        className={`mt-1 mb-0 text-[11px] font-bold ${
                          balance > 0
                            ? "text-[var(--st-red)]"
                            : "text-green-700"
                        }`}
                      >
                        {formatCurrency(
                          balance,
                        )}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="m-0 text-[8px] uppercase tracking-[0.05em] text-[var(--st-gray)]">
                        Programme fee
                      </p>

                      <p className="mt-1 mb-0 text-[10px] font-semibold text-[var(--st-charcoal-dark)]">
                        {formatCurrency(
                          Number(
                            enrollment.total_fee ||
                              0,
                          ),
                        )}
                      </p>
                    </div>
                  </div>
                )}

                {/* QUICK ACTIONS */}

                <div
                  className="mt-3 flex items-center gap-1.5"
                  onClick={(event) =>
                    event.stopPropagation()
                  }
                >
                  {student.student.whatsapp && (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={() =>
                        openWhatsApp(student)
                      }
                      onKeyDown={(event) => {
                        if (
                          event.key ===
                          "Enter"
                        ) {
                          openWhatsApp(
                            student,
                          );
                        }
                      }}
                      className="st-icon-button"
                      title="WhatsApp"
                      aria-label="WhatsApp"
                    >
                      <MessageCircle
                        size={13}
                      />
                    </span>
                  )}

                  {student.student.whatsapp && (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={() =>
                        callStudent(student)
                      }
                      onKeyDown={(event) => {
                        if (
                          event.key ===
                          "Enter"
                        ) {
                          callStudent(
                            student,
                          );
                        }
                      }}
                      className="st-icon-button"
                      title="Call"
                      aria-label="Call"
                    >
                      <Phone size={13} />
                    </span>
                  )}

                  {student.student.email && (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={() =>
                        emailStudent(student)
                      }
                      onKeyDown={(event) => {
                        if (
                          event.key ===
                          "Enter"
                        ) {
                          emailStudent(
                            student,
                          );
                        }
                      }}
                      className="st-icon-button"
                      title="Email"
                      aria-label="Email"
                    >
                      <Mail size={13} />
                    </span>
                  )}
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}