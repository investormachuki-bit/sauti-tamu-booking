import {
  CalendarDays,
  ChevronDown,
  Clock3,
} from "lucide-react";

type Instrument = "piano" | "guitar";

type ProgrammeFormProps = {
  instrument: Instrument;
  programmeName: string;
  startDate: string;
  endDate: string;

  onInstrumentChange: (
    instrument: Instrument
  ) => void;

  onProgrammeNameChange: (
    value: string
  ) => void;

  onStartDateChange: (
    value: string
  ) => void;

  formatDate: (date: string) => string;
};

export default function ProgrammeForm({
  instrument,
  programmeName,
  startDate,
  endDate,
  onInstrumentChange,
  onProgrammeNameChange,
  onStartDateChange,
  formatDate,
}: ProgrammeFormProps) {
  return (
    <div className="mt-7 border-t border-[var(--st-border)] pt-7">

      <div className="mb-4">

        <p className="st-eyebrow">
          02 · PROGRAMME
        </p>

        <h3 className="mt-1 text-[14px] font-bold text-[var(--st-charcoal-dark)]">
          Training programme
        </h3>

      </div>

      <div className="space-y-4">

        {/* INSTRUMENT */}

        <div>

          <label className="mb-2 block text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--st-charcoal)]">
            Instrument *
          </label>

          <div className="grid grid-cols-2 gap-2">

            <button
              type="button"
              onClick={() =>
                onInstrumentChange("piano")
              }
              className={`rounded-xl border px-4 py-3.5 text-left transition ${
                instrument === "piano"
                  ? "border-[var(--st-red)] bg-red-50"
                  : "border-[var(--st-border)] bg-white"
              }`}
            >

              <p
                className={`m-0 text-[11px] font-bold ${
                  instrument === "piano"
                    ? "text-[var(--st-red)]"
                    : "text-[var(--st-charcoal-dark)]"
                }`}
              >
                Piano
              </p>

              <p className="mt-1 mb-0 text-[8px] text-[var(--st-gray)]">
                Piano training
              </p>

            </button>

            <button
              type="button"
              onClick={() =>
                onInstrumentChange("guitar")
              }
              className={`rounded-xl border px-4 py-3.5 text-left transition ${
                instrument === "guitar"
                  ? "border-[var(--st-red)] bg-red-50"
                  : "border-[var(--st-border)] bg-white"
              }`}
            >

              <p
                className={`m-0 text-[11px] font-bold ${
                  instrument === "guitar"
                    ? "text-[var(--st-red)]"
                    : "text-[var(--st-charcoal-dark)]"
                }`}
              >
                Guitar
              </p>

              <p className="mt-1 mb-0 text-[8px] text-[var(--st-gray)]">
                Acoustic guitar training
              </p>

            </button>

          </div>

        </div>

        {/* PROGRAMME NAME */}

        <div>

          <label className="mb-2 block text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--st-charcoal)]">
            Programme name
          </label>

          <input
            type="text"
            value={programmeName}
            onChange={(event) =>
              onProgrammeNameChange(
                event.target.value
              )
            }
            className="w-full rounded-xl border border-[var(--st-border)] px-4 py-3.5 text-[11px] outline-none focus:border-[var(--st-red)]"
          />

        </div>

        {/* DATES */}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

          {/* START DATE */}

          <div>

            <label className="mb-2 block text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--st-charcoal)]">
              Start date *
            </label>

            <div className="relative">

              <CalendarDays
                size={14}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--st-red)]"
              />

              <input
                type="date"
                value={startDate}
                onChange={(event) =>
                  onStartDateChange(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border border-[var(--st-border)] bg-white py-3.5 pl-10 pr-3 text-[11px] outline-none focus:border-[var(--st-red)]"
              />

            </div>

          </div>

          {/* END DATE */}

          <div>

            <label className="mb-2 block text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--st-charcoal)]">
              End date
            </label>

            <div className="rounded-xl border border-[var(--st-border)] bg-[var(--st-bg-soft)] px-4 py-3.5">

              <p className="m-0 text-[11px] font-bold text-[var(--st-charcoal-dark)]">
                {endDate
                  ? formatDate(endDate)
                  : "—"}
              </p>

              <p className="mt-1 mb-0 text-[8px] text-[var(--st-gray)]">
                Automatically calculated
              </p>

            </div>

          </div>

        </div>

        {/* PROGRAMME PERIOD */}

        {endDate && (
          <div className="rounded-xl bg-[var(--st-bg-soft)] p-3">

            <div className="flex items-center gap-2">

              <Clock3
                size={14}
                className="text-[var(--st-red)]"
              />

              <p className="m-0 text-[9px] text-[var(--st-gray)]">
                Programme period
              </p>

              <p className="ml-auto m-0 text-[10px] font-bold text-[var(--st-charcoal-dark)]">
                3 months
              </p>

            </div>

          </div>
        )}

      </div>

    </div>
  );
}