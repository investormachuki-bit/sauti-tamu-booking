type StudentInformationFormProps = {
  studentName: string;
  studentWhatsapp: string;
  studentEmail: string;
  studentNotes: string;

  onStudentNameChange: (value: string) => void;
  onStudentWhatsappChange: (value: string) => void;
  onStudentEmailChange: (value: string) => void;
  onStudentNotesChange: (value: string) => void;
};

export default function StudentInformationForm({
  studentName,
  studentWhatsapp,
  studentEmail,
  studentNotes,
  onStudentNameChange,
  onStudentWhatsappChange,
  onStudentEmailChange,
  onStudentNotesChange,
}: StudentInformationFormProps) {
  return (
    <div>
      <div className="mb-4">
        <p className="st-eyebrow">
          01 · STUDENT INFORMATION
        </p>

        <h3 className="mt-1 text-[14px] font-bold text-[var(--st-charcoal-dark)]">
          Personal details
        </h3>
      </div>

      <div className="space-y-4">

        {/* FULL NAME */}

        <div>
          <label className="mb-2 block text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--st-charcoal)]">
            Full name *
          </label>

          <input
            type="text"
            value={studentName}
            onChange={(event) =>
              onStudentNameChange(event.target.value)
            }
            placeholder="e.g. Jane Wanjiku"
            className="w-full rounded-xl border border-[var(--st-border)] px-4 py-3.5 text-[12px] outline-none transition focus:border-[var(--st-red)] focus:ring-2 focus:ring-[var(--st-red)]/10"
          />
        </div>

        {/* WHATSAPP + EMAIL */}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

          <div>
            <label className="mb-2 block text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--st-charcoal)]">
              WhatsApp number *
            </label>

            <input
              type="tel"
              value={studentWhatsapp}
              onChange={(event) =>
                onStudentWhatsappChange(
                  event.target.value
                )
              }
              placeholder="e.g. 254712345678"
              className="w-full rounded-xl border border-[var(--st-border)] px-4 py-3.5 text-[11px] outline-none focus:border-[var(--st-red)]"
            />
          </div>

          <div>
            <label className="mb-2 block text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--st-charcoal)]">
              Email *
            </label>

            <input
              type="email"
              value={studentEmail}
              onChange={(event) =>
                onStudentEmailChange(
                  event.target.value
                )
              }
              placeholder="student@email.com"
              className="w-full rounded-xl border border-[var(--st-border)] px-4 py-3.5 text-[11px] outline-none focus:border-[var(--st-red)]"
            />
          </div>

        </div>

        {/* NOTES */}

        <div>
          <label className="mb-2 block text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--st-charcoal)]">
            Notes
          </label>

          <textarea
            value={studentNotes}
            onChange={(event) =>
              onStudentNotesChange(
                event.target.value
              )
            }
            rows={3}
            placeholder="Optional student notes..."
            className="w-full resize-none rounded-xl border border-[var(--st-border)] px-4 py-3 text-[11px] outline-none focus:border-[var(--st-red)]"
          />
        </div>

      </div>
    </div>
  );
}