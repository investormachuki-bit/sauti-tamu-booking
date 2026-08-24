"use client";

import {
  Camera,
  Loader2,
  Save,
  X,
} from "lucide-react";

import type {
  Instrument,
  StudentStatus,
  SelectedStudentRecord,
} from "./students-types";

interface EditStudentModalProps {
  selectedStudent: SelectedStudentRecord;

  show: boolean;

  saving: boolean;

  error: string | null;

  studentName: string;
  studentWhatsapp: string;
  studentEmail: string;
  studentStatus: StudentStatus;
  studentNotes: string;

  instrument: Instrument;
  programmeName: string;
  startDate: string;
  endDate: string;
  totalFee: string;
  enrollmentStatus: StudentStatus;

  photoPreview: string | null;
  photoFile: File | null;

  setStudentName: (
    value: string
  ) => void;

  setStudentWhatsapp: (
    value: string
  ) => void;

  setStudentEmail: (
    value: string
  ) => void;

  setStudentStatus: (
    value: StudentStatus
  ) => void;

  setStudentNotes: (
    value: string
  ) => void;

  setInstrument: (
    value: Instrument
  ) => void;

  setProgrammeName: (
    value: string
  ) => void;

  setStartDate: (
    value: string
  ) => void;

  setEndDate: (
    value: string
  ) => void;

  setTotalFee: (
    value: string
  ) => void;

  setEnrollmentStatus: (
    value: StudentStatus
  ) => void;

  setPhotoFile: (
    value: File | null
  ) => void;

  setPhotoPreview: (
    value: string | null
  ) => void;

  closeEditStudent: () => void;

  updateStudent: () => void;

  formatCurrency: (
    amount: number
  ) => string;

  formatDate: (
    date: string
  ) => string;
}

const studentStatuses: StudentStatus[] = [
  "active",
  "completed",
  "paused",
  "cancelled",
  "inactive",
];

const instruments: Instrument[] = [
  "piano",
  "guitar",
];

function instrumentLabel(
  instrument: Instrument
) {
  return instrument === "guitar"
    ? "Acoustic Guitar"
    : "Piano";
}

function statusLabel(
  status: string
) {
  return status
    .replace(/_/g, " ")
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase()
    );
}

export default function EditStudentModal({
  selectedStudent,
  show,
  saving,
  error,

  studentName,
  studentWhatsapp,
  studentEmail,
  studentStatus,
  studentNotes,

  instrument,
  programmeName,
  startDate,
  endDate,
  totalFee,
  enrollmentStatus,

  photoPreview,
  photoFile,

  setStudentName,
  setStudentWhatsapp,
  setStudentEmail,
  setStudentStatus,
  setStudentNotes,

  setInstrument,
  setProgrammeName,
  setStartDate,
  setEndDate,
  setTotalFee,
  setEnrollmentStatus,

  setPhotoFile,
  setPhotoPreview,

  closeEditStudent,
  updateStudent,

  formatCurrency,
  formatDate,
}: EditStudentModalProps) {
  if (!show) {
    return null;
  }

  function handlePhotoChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0] ??
      null;

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert(
        "Please choose an image smaller than 5MB."
      );

      return;
    }

    setPhotoFile(file);

    const previewUrl =
      URL.createObjectURL(file);

    setPhotoPreview(previewUrl);
  }

  const currentPhoto =
  photoPreview ||
  selectedStudent.student.photo_url ||
  null;

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/50 sm:items-center sm:p-5">

      <div className="flex max-h-[94vh] w-full max-w-[620px] flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">

        {/* HEADER */}

        <div className="flex shrink-0 items-center justify-between border-b border-[var(--st-border)] px-5 py-4">

          <div>

            <p className="st-eyebrow">
              STUDENT MANAGEMENT
            </p>

            <h2 className="mt-1 text-[19px] font-bold text-[var(--st-charcoal-dark)]">
              Edit Student
            </h2>

          </div>

          <button
            type="button"
            onClick={
              closeEditStudent
            }
            disabled={saving}
            className="st-icon-button disabled:opacity-40"
            aria-label="Close"
          >
            <X size={17} />
          </button>

        </div>

        {/* CONTENT */}

        <div className="overflow-y-auto p-5">

          {/* ERROR */}

          {error && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">

              <p className="m-0 text-[10px] leading-relaxed text-red-700">
                {error}
              </p>

            </div>
          )}

          {/* =================================================
              PHOTO
          ================================================= */}

          <section>

            <p className="st-eyebrow">
              STUDENT PHOTO
            </p>

            <div className="mt-3 flex items-center gap-4">

              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-[var(--st-border)] bg-[var(--st-bg-soft)]">

                {currentPhoto ? (
                  <img
                    src={currentPhoto}
                    alt={
                      studentName ||
                      "Student"
                    }
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-[var(--st-gray)]">
                    {studentName
                      ?.charAt(0)
                      .toUpperCase() ||
                      "S"}
                  </div>
                )}

              </div>

              <div>

                <label className="st-button st-button-secondary cursor-pointer">

                  <Camera size={15} />

                  {photoFile
                    ? "Change Photo"
                    : "Choose Photo"}

                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={
                      handlePhotoChange
                    }
                    disabled={saving}
                  />

                </label>

                <p className="mt-2 text-[9px] leading-relaxed text-[var(--st-gray)]">
                  JPG, PNG or WEBP.
                  Maximum 5MB.
                </p>

              </div>

            </div>

          </section>

          {/* =================================================
              PERSONAL INFORMATION
          ================================================= */}

          <section className="mt-7">

            <p className="st-eyebrow">
              PERSONAL INFORMATION
            </p>

            <div className="mt-3 space-y-4">

              {/* NAME */}

              <div>

                <label className="st-label">
                  Full name
                </label>

                <input
                  type="text"
                  value={studentName}
                  onChange={(event) =>
                    setStudentName(
                      event.target.value
                    )
                  }
                  disabled={saving}
                  className="st-input w-full"
                  placeholder="Student full name"
                />

              </div>

              {/* CONTACT */}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                <div>

                  <label className="st-label">
                    WhatsApp number
                  </label>

                  <input
                    type="tel"
                    value={
                      studentWhatsapp
                    }
                    onChange={(event) =>
                      setStudentWhatsapp(
                        event.target.value
                      )
                    }
                    disabled={saving}
                    className="st-input w-full"
                    placeholder="07XXXXXXXX"
                  />

                </div>

                <div>

                  <label className="st-label">
                    Email
                  </label>

                  <input
                    type="email"
                    value={
                      studentEmail
                    }
                    onChange={(event) =>
                      setStudentEmail(
                        event.target.value
                      )
                    }
                    disabled={saving}
                    className="st-input w-full"
                    placeholder="student@email.com"
                  />

                </div>

              </div>

              {/* STATUS */}

              <div>

                <label className="st-label">
                  Student status
                </label>

                <select
                  value={
                    studentStatus
                  }
                  onChange={(event) =>
                    setStudentStatus(
                      event.target
                        .value as StudentStatus
                    )
                  }
                  disabled={saving}
                  className="st-input w-full"
                >
                  {studentStatuses.map(
                    (status) => (
                      <option
                        key={status}
                        value={status}
                      >
                        {statusLabel(
                          status
                        )}
                      </option>
                    )
                  )}
                </select>

              </div>

              {/* NOTES */}

              <div>

                <label className="st-label">
                  Notes
                </label>

                <textarea
                  value={
                    studentNotes
                  }
                  onChange={(event) =>
                    setStudentNotes(
                      event.target.value
                    )
                  }
                  disabled={saving}
                  rows={4}
                  className="st-input w-full resize-none"
                  placeholder="Student notes..."
                />

              </div>

            </div>

          </section>

          {/* =================================================
              PROGRAMME
          ================================================= */}

          <section className="mt-7">

            <p className="st-eyebrow">
              CURRENT PROGRAMME
            </p>

            <div className="mt-3 space-y-4">

              {/* INSTRUMENT */}

              <div>

                <label className="st-label">
                  Instrument
                </label>

                <div className="grid grid-cols-2 gap-2">

                  {instruments.map(
                    (item) => (
                      <button
                        key={item}
                        type="button"
                        disabled={saving}
                        onClick={() =>
                          setInstrument(
                            item
                          )
                        }
                        className={`rounded-xl border px-4 py-3 text-left text-[10px] font-bold transition ${
                          instrument ===
                          item
                            ? "border-[var(--st-charcoal-dark)] bg-[var(--st-charcoal-dark)] text-white"
                            : "border-[var(--st-border)] bg-white text-[var(--st-charcoal-dark)]"
                        }`}
                      >
                        {instrumentLabel(
                          item
                        )}
                      </button>
                    )
                  )}

                </div>

              </div>

              {/* PROGRAMME NAME */}

              <div>

                <label className="st-label">
                  Programme name
                </label>

                <input
                  type="text"
                  value={
                    programmeName
                  }
                  onChange={(event) =>
                    setProgrammeName(
                      event.target.value
                    )
                  }
                  disabled={saving}
                  className="st-input w-full"
                  placeholder="3 Month Training Programme"
                />

              </div>

              {/* DATES */}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                <div>

                  <label className="st-label">
                    Start date
                  </label>

                  <input
                    type="date"
                    value={
                      startDate
                    }
                    onChange={(event) =>
                      setStartDate(
                        event.target.value
                      )
                    }
                    disabled={saving}
                    className="st-input w-full"
                  />

                </div>

                <div>

                  <label className="st-label">
                    End date
                  </label>

                  <input
                    type="date"
                    value={
                      endDate
                    }
                    onChange={(event) =>
                      setEndDate(
                        event.target.value
                      )
                    }
                    disabled={saving}
                    className="st-input w-full"
                  />

                </div>

              </div>

              {/* FEE */}

              <div>

                <label className="st-label">
                  Total programme fee
                </label>

                <input
                  type="number"
                  min="0"
                  value={
                    totalFee
                  }
                  onChange={(event) =>
                    setTotalFee(
                      event.target.value
                    )
                  }
                  disabled={saving}
                  className="st-input w-full"
                  placeholder="26850"
                />

                {Number(
                  totalFee || 0
                ) > 0 && (
                  <p className="mt-1 text-[9px] text-[var(--st-gray)]">
                    {formatCurrency(
                      Number(
                        totalFee || 0
                      )
                    )}
                  </p>
                )}

              </div>

              {/* ENROLLMENT STATUS */}

              <div>

                <label className="st-label">
                  Programme status
                </label>

                <select
                  value={
                    enrollmentStatus
                  }
                  onChange={(event) =>
                    setEnrollmentStatus(
                      event.target
                        .value as StudentStatus
                    )
                  }
                  disabled={saving}
                  className="st-input w-full"
                >
                  {studentStatuses.map(
                    (status) => (
                      <option
                        key={status}
                        value={status}
                      >
                        {statusLabel(
                          status
                        )}
                      </option>
                    )
                  )}
                </select>

              </div>

            </div>

          </section>

          {/* =================================================
              CURRENT RECORD
          ================================================= */}

          <section className="mt-7">

            <p className="st-eyebrow">
              CURRENT RECORD
            </p>

            <div className="mt-3 rounded-xl bg-[var(--st-bg-soft)] p-4">

              <div className="flex items-center justify-between">

                <span className="text-[9px] text-[var(--st-gray)]">
                  Current payments
                </span>

                <span className="text-[10px] font-bold text-[var(--st-charcoal-dark)]">
                  {selectedStudent
                    .payments.length}
                </span>

              </div>

              {selectedStudent
                .enrollment && (
                <div className="mt-2 flex items-center justify-between">

                  <span className="text-[9px] text-[var(--st-gray)]">
                    Current programme
                  </span>

                  <span className="max-w-[230px] truncate text-right text-[10px] font-bold text-[var(--st-charcoal-dark)]">
                    {
                      selectedStudent
                        .enrollment
                        .programme_name
                    }
                  </span>

                </div>
              )}

            </div>

          </section>

        </div>

        {/* =================================================
            FOOTER
        ================================================= */}

        <div className="shrink-0 border-t border-[var(--st-border)] bg-white px-5 py-4">

          <div className="flex gap-2">

            <button
              type="button"
              onClick={
                closeEditStudent
              }
              disabled={saving}
              className="st-button st-button-secondary flex-1 disabled:opacity-40"
            >
              <X size={15} />
              Cancel
            </button>

            <button
              type="button"
              onClick={
                updateStudent
              }
              disabled={saving}
              className="st-button st-button-primary flex-1 disabled:opacity-40"
            >

              {saving ? (
                <>
                  <Loader2
                    size={15}
                    className="animate-spin"
                  />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={15} />
                  Save Changes
                </>
              )}

            </button>

          </div>

        </div>

      </div>

    </div>
  );
}