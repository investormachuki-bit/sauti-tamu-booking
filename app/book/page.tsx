"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock3,
  Guitar,
  Loader2,
  Mail,
  Music2,
  Phone,
  User,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

type Instrument = "piano" | "guitar";

type LessonSlot = {
  id: string;
  instrument: Instrument;
  starts_at: string;
  ends_at: string;
  is_available: boolean;
};

const instrumentInfo = {
  piano: {
    name: "Piano",
    icon: Music2,
    description: "Free trial lesson",
  },
  guitar: {
    name: "Guitar",
    icon: Guitar,
    description: "Free trial lesson",
  },
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-KE", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(date);
}

function formatLongDate(date: Date) {
  return new Intl.DateTimeFormat("en-KE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}

function formatTime(dateString: string) {
  return new Intl.DateTimeFormat("en-KE", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(dateString));
}

function formatTimeRange(slot: LessonSlot) {
  return `${formatTime(slot.starts_at)} – ${formatTime(
    slot.ends_at
  )}`;
}

export default function BookingPage() {
  const [instrument, setInstrument] =
    useState<Instrument | null>(null);

  const [slots, setSlots] = useState<LessonSlot[]>([]);

  const [selectedSlot, setSelectedSlot] =
    useState<LessonSlot | null>(null);

  const [availabilityDays, setAvailabilityDays] =
    useState(14);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadBookingPage();
  }, []);

  async function loadBookingPage() {
    setLoading(true);
    setError("");

    /*
     * Load the number of days that customers
     * are allowed to see.
     */

    const {
      data: settings,
      error: settingsError,
    } = await supabase
      .from("booking_settings")
      .select("availability_days")
      .limit(1)
      .maybeSingle();

    if (settingsError) {
      console.error(
        "Booking settings error:",
        settingsError
      );
    }

    const days =
      settings?.availability_days ?? 14;

    setAvailabilityDays(days);

    /*
     * Load only the customer-visible booking window.
     */

    const today = new Date();

    today.setHours(0, 0, 0, 0);

    const future = new Date(today);

    future.setDate(
      future.getDate() + days + 1
    );

    const {
      data,
      error: slotsError,
    } = await supabase
      .from("lesson_slots")
      .select(
        "id, instrument, starts_at, ends_at, is_available"
      )
      .eq("is_available", true)
      .gte(
        "starts_at",
        today.toISOString()
      )
      .lt(
        "starts_at",
        future.toISOString()
      )
      .order("starts_at", {
        ascending: true,
      });

    if (slotsError) {
      console.error(
        "Lesson slots error:",
        slotsError
      );

      setError(
        "We couldn't load available trial lessons. Please try again."
      );

      setLoading(false);
      return;
    }

    setSlots((data ?? []) as LessonSlot[]);
    setLoading(false);
  }

  /*
   * Only show slots belonging to the selected
   * instrument.
   */

  const instrumentSlots = useMemo(() => {
    if (!instrument) {
      return [];
    }

    return slots.filter(
      (slot) => slot.instrument === instrument
    );
  }, [slots, instrument]);

  /*
   * Group available slots by date.
   */

  const groupedDates = useMemo(() => {
    const groups = new Map<
      string,
      {
        key: string;
        date: Date;
        slots: LessonSlot[];
      }
    >();

    instrumentSlots.forEach((slot) => {
      const date = new Date(slot.starts_at);

      const key = date
        .toISOString()
        .slice(0, 10);

      if (!groups.has(key)) {
        groups.set(key, {
          key,
          date,
          slots: [],
        });
      }

      groups.get(key)!.slots.push(slot);
    });

    return Array.from(groups.values());
  }, [instrumentSlots]);

  /*
   * Select exactly one slot.
   *
   * Once selected, the availability list disappears
   * and the customer proceeds to their details.
   */

  function selectSlot(slot: LessonSlot) {
    setSelectedSlot(slot);
    setError("");
  }

  /*
   * Create the booking through the atomic Supabase
   * RPC.
   */

  async function handleBooking() {
    if (!selectedSlot) {
      setError(
        "Please select a trial lesson time."
      );
      return;
    }

    if (!name.trim()) {
      setError(
        "Please enter your full name."
      );
      return;
    }

    if (!email.trim()) {
      setError(
        "Please enter your email address."
      );
      return;
    }

    if (!whatsapp.trim()) {
      setError(
        "Please enter your WhatsApp number."
      );
      return;
    }

    setSubmitting(true);
    setError("");

    /*
     * The RPC handles:
     *
     * 1. Locking the slot
     * 2. Verifying availability
     * 3. Verifying instrument
     * 4. Creating/updating the lead
     * 5. Creating the booking
     * 6. Marking the slot unavailable
     */

    const {
      data: bookingResult,
      error: bookingError,
    } = await supabase.rpc(
      "create_trial_booking",
      {
        p_slot_id: selectedSlot.id,
        p_instrument: instrument,
        p_full_name: name.trim(),
        p_email: email.trim(),
        p_whatsapp_number: whatsapp.trim(),
      }
    );

    if (bookingError) {
      console.error(
        "Booking error:",
        bookingError
      );

      const message =
        bookingError.message || "";

      /*
       * Someone else booked the same slot.
       */

      if (
        message.includes(
          "SLOT_ALREADY_BOOKED"
        )
      ) {
        setError(
          "Sorry, that time has just been booked. Please choose another."
        );

        setSelectedSlot(null);

        await loadBookingPage();

        setSubmitting(false);
        return;
      }

      /*
       * Slot no longer exists.
       */

      if (
        message.includes(
          "SLOT_NOT_FOUND"
        )
      ) {
        setError(
          "That lesson slot could not be found. Please choose another."
        );

        setSelectedSlot(null);

        await loadBookingPage();

        setSubmitting(false);
        return;
      }

      /*
       * Instrument mismatch.
       */

      if (
        message.includes(
          "INSTRUMENT_MISMATCH"
        )
      ) {
        setError(
          "There was a problem with the selected instrument. Please choose another slot."
        );

        setSelectedSlot(null);

        await loadBookingPage();

        setSubmitting(false);
        return;
      }

      /*
       * Generic booking error.
       */

      setError(
        "We couldn't complete your booking. Please try again."
      );

      setSubmitting(false);
      return;
    }

    /*
     * The RPC should return the created booking.
     */

    if (!bookingResult) {
      setError(
        "We couldn't confirm your booking. Please try again."
      );

      setSubmitting(false);
      return;
    }

    console.log(
      "Trial booking created:",
      bookingResult
    );

    setSuccess(true);
    setSubmitting(false);
  }

  /*
   * SUCCESS SCREEN
   */

  if (success && selectedSlot) {
    return (
      <main className="min-h-screen bg-[var(--st-bg)] px-5 py-10">

        <div className="mx-auto flex min-h-[80vh] max-w-[500px] items-center justify-center">

          <div className="st-card w-full p-7 text-center sm:p-10">

            {/* SUCCESS ICON */}

            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--st-red)] text-white">
              <Check size={28} />
            </div>

            <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--st-red)]">
              Trial lesson selected
            </p>

            <h1 className="mt-2 text-[28px] font-bold tracking-[-0.04em] text-[var(--st-charcoal-dark)]">
              You&apos;re almost booked.
            </h1>

            <p className="mx-auto mt-3 max-w-[360px] text-[12px] leading-relaxed text-[var(--st-gray)]">
              Your selected trial lesson is ready for
              confirmation.
            </p>

            {/* SELECTED LESSON */}

            <div className="mt-7 rounded-2xl bg-[var(--st-bg-soft)] p-5 text-left">

              <p className="m-0 text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--st-gray)]">
                TRIAL LESSON
              </p>

              {/* INSTRUMENT */}

              <p className="mt-2 mb-0 text-[22px] font-bold tracking-[-0.03em] text-[var(--st-charcoal-dark)]">
                {instrumentInfo[instrument!].name}
              </p>

              {/* DATE */}

              <div className="mt-4 flex items-center gap-2 text-[12px] font-medium text-[var(--st-charcoal)]">

                <Clock3 size={16} />

                {formatLongDate(
                  new Date(
                    selectedSlot.starts_at
                  )
                )}

              </div>

              {/* TIME RANGE */}

              <div className="mt-3 flex items-center gap-2">

                <Clock3
                  size={18}
                  className="shrink-0 text-[var(--st-red)]"
                />

                <span className="text-[20px] font-extrabold tracking-[-0.03em] text-[var(--st-red)]">
                  {formatTimeRange(
                    selectedSlot
                  )}
                </span>

              </div>

            </div>

            <p className="mt-6 text-[10px] leading-relaxed text-[var(--st-gray)]">
              We&apos;ll send your confirmation to the
              email and WhatsApp number you provided.
            </p>

          </div>

        </div>

      </main>
    );
  }

  /*
   * MAIN BOOKING PAGE
   */

  return (
    <main className="min-h-screen bg-[var(--st-bg)]">

      {/* HEADER */}

      <header className="border-b border-[var(--st-border)] bg-white">

        <div className="mx-auto flex max-w-[1100px] items-center justify-between px-5 py-4 sm:px-8">

          {/* BRAND */}

          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--st-red)] text-[11px] font-extrabold text-white">
              ST
            </div>

            <div>

              <p className="m-0 text-[12px] font-bold text-[var(--st-charcoal-dark)]">
                Sauti Tamu
              </p>

              <p className="mt-0.5 mb-0 text-[8px] font-bold tracking-[0.16em] text-[var(--st-gray)]">
                PIANO CENTER
              </p>

            </div>

          </div>

          <span className="rounded-full bg-[var(--st-bg-soft)] px-3 py-1.5 text-[9px] font-bold text-[var(--st-red)]">
            FREE TRIAL
          </span>

        </div>

      </header>

      <div className="mx-auto max-w-[900px] px-5 py-9 sm:px-8 sm:py-12">

        {/* INTRO */}

        <div className="text-center">

          <p className="st-eyebrow">
            SAUTI TAMU PIANO CENTER
          </p>

          <h1 className="mt-2 text-[34px] font-bold tracking-[-0.05em] text-[var(--st-charcoal-dark)] sm:text-[44px]">
            Book your free trial lesson.
          </h1>

          <p className="mx-auto mt-3 max-w-[500px] text-[12px] leading-relaxed text-[var(--st-gray)]">
            Choose your instrument, pick a convenient
            time and reserve your first lesson.
          </p>

        </div>

        {/* INSTRUMENT */}

        {!selectedSlot && (
          <section className="mt-9">

            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--st-charcoal)]">
              01 · Choose your instrument
            </p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

              {(
                Object.keys(
                  instrumentInfo
                ) as Instrument[]
              ).map((item) => {

                const Icon =
                  instrumentInfo[item].icon;

                const selected =
                  instrument === item;

                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      setInstrument(item);
                      setSelectedSlot(null);
                      setError("");
                    }}
                    className={`flex items-center gap-4 rounded-2xl border bg-white p-5 text-left transition-all ${
                      selected
                        ? "border-[var(--st-red)] bg-[var(--st-bg-soft)] shadow-sm"
                        : "border-[var(--st-border)]"
                    }`}
                  >

                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                        selected
                          ? "bg-[var(--st-red)] text-white"
                          : "bg-[var(--st-bg-soft)] text-[var(--st-red)]"
                      }`}
                    >
                      <Icon size={21} />
                    </div>

                    <div className="flex-1">

                      <p className="m-0 text-[14px] font-bold text-[var(--st-charcoal-dark)]">
                        {instrumentInfo[item].name}
                      </p>

                      <p className="mt-1 mb-0 text-[10px] text-[var(--st-gray)]">
                        {
                          instrumentInfo[item]
                            .description
                        }
                      </p>

                    </div>

                    {selected && (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--st-red)] text-white">
                        <Check size={13} />
                      </div>
                    )}

                  </button>
                );
              })}

            </div>

          </section>
        )}

        {/* DATE + TIME */}

        {instrument && !selectedSlot && (
          <section className="mt-9">

            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--st-charcoal)]">
              02 · Choose a date and time
            </p>

            <p className="mb-4 text-[10px] text-[var(--st-gray)]">

              Showing available lessons for the next{" "}

              <strong>
                {availabilityDays} days
              </strong>

              .

            </p>

            {loading ? (

              <div className="st-card flex items-center justify-center gap-2 p-10 text-[10px] text-[var(--st-gray)]">

                <Loader2
                  size={15}
                  className="animate-spin"
                />

                Loading available lessons...

              </div>

            ) : groupedDates.length === 0 ? (

              <div className="st-card p-7 text-center">

                <p className="m-0 text-[13px] font-bold text-[var(--st-charcoal-dark)]">
                  No available trial lessons
                </p>

                <p className="mt-2 mb-0 text-[10px] text-[var(--st-gray)]">
                  Please check again later.
                </p>

              </div>

            ) : (

              <div className="space-y-4">

                {groupedDates.map(
                  (group) => (

                    <div
                      key={group.key}
                      className="st-card overflow-hidden"
                    >

                      <div className="border-b border-[var(--st-border)] bg-white px-5 py-4">

                        <p className="m-0 text-[13px] font-bold text-[var(--st-charcoal-dark)]">
                          {formatDate(
                            group.date
                          )}
                        </p>

                        <p className="mt-1 mb-0 text-[9px] text-[var(--st-gray)]">

                          {group.slots.length}{" "}

                          available time
                          {group.slots.length === 1
                            ? ""
                            : "s"}

                        </p>

                      </div>

                      <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-3">

                        {group.slots.map(
                          (slot) => (

                            <button
                              key={slot.id}
                              type="button"
                              onClick={() =>
                                selectSlot(
                                  slot
                                )
                              }
                              className="rounded-xl border border-[var(--st-border)] bg-white px-3 py-3 text-center text-[var(--st-charcoal-dark)] transition-all hover:border-[var(--st-red)] hover:bg-[var(--st-bg-soft)]"
                            >

                              <span className="block text-[12px] font-bold">
                                {formatTime(
                                  slot.starts_at
                                )}
                              </span>

                              <span className="mt-1 block text-[8px] text-[var(--st-gray)]">
                                60 min
                              </span>

                            </button>

                          )
                        )}

                      </div>

                    </div>

                  )
                )}

              </div>

            )}

          </section>
        )}

        {/* SELECTED SLOT + DETAILS */}

        {selectedSlot && instrument && (
          <section className="mt-9">

            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--st-charcoal)]">
              02 · Your selected trial
            </p>

            <div className="st-card overflow-hidden">

              {/* SELECTED SLOT HERO */}

              <div className="bg-[var(--st-red)] px-5 py-6 text-white">

                <p className="m-0 text-[9px] font-bold uppercase tracking-[0.15em] text-white/70">
                  SELECTED TIME
                </p>

                <div className="mt-3 flex items-start justify-between gap-4">

                  <div className="min-w-0">

                    {/* INSTRUMENT */}

                    <h2 className="m-0 text-[23px] font-bold tracking-[-0.03em]">
                      {instrumentInfo[instrument].name}
                    </h2>

                    {/* DATE */}

                    <p className="mt-2 mb-0 text-[12px] font-medium text-white/85">
                      {formatLongDate(
                        new Date(
                          selectedSlot.starts_at
                        )
                      )}
                    </p>

                    {/* LARGE TIME RANGE */}

                    <p className="mt-2 mb-0 text-[25px] font-extrabold leading-none tracking-[-0.04em] text-white sm:text-[29px]">
                      {formatTimeRange(
                        selectedSlot
                      )}
                    </p>

                    <p className="mt-2 mb-0 text-[9px] font-medium uppercase tracking-[0.08em] text-white/65">
                      60-minute free trial lesson
                    </p>

                  </div>

                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15">
                    <Check size={19} />
                  </div>

                </div>

              </div>

              {/* DETAILS */}

              <div className="p-5 sm:p-7">

                <div className="mb-6">

                  <p className="m-0 text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--st-gray)]">
                    03 · Your details
                  </p>

                  <p className="mt-2 mb-0 text-[10px] text-[var(--st-gray)]">
                    Your selected time is reserved on this
                    screen while you complete your details.
                  </p>

                </div>

                <div className="space-y-5">

                  {/* NAME */}

                  <div>

                    <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--st-charcoal)]">
                      Full name
                    </label>

                    <div className="relative">

                      <User
                        size={16}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--st-gray)]"
                      />

                      <input
                        type="text"
                        value={name}
                        onChange={(e) =>
                          setName(
                            e.target.value
                          )
                        }
                        placeholder="Your full name"
                        autoComplete="name"
                        className="w-full rounded-xl border border-[var(--st-border)] bg-white py-3.5 pl-11 pr-4 text-[12px] outline-none focus:border-[var(--st-red)] focus:ring-2 focus:ring-[var(--st-red)]/10"
                      />

                    </div>

                  </div>

                  {/* EMAIL */}

                  <div>

                    <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--st-charcoal)]">
                      Email address
                    </label>

                    <div className="relative">

                      <Mail
                        size={16}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--st-gray)]"
                      />

                      <input
                        type="email"
                        value={email}
                        onChange={(e) =>
                          setEmail(
                            e.target.value
                          )
                        }
                        placeholder="you@example.com"
                        autoComplete="email"
                        className="w-full rounded-xl border border-[var(--st-border)] bg-white py-3.5 pl-11 pr-4 text-[12px] outline-none focus:border-[var(--st-red)] focus:ring-2 focus:ring-[var(--st-red)]/10"
                      />

                    </div>

                  </div>

                  {/* WHATSAPP */}

                  <div>

                    <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--st-charcoal)]">
                      WhatsApp number
                    </label>

                    <div className="relative">

                      <Phone
                        size={16}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--st-gray)]"
                      />

                      <input
                        type="tel"
                        inputMode="tel"
                        value={whatsapp}
                        onChange={(e) =>
                          setWhatsapp(
                            e.target.value
                          )
                        }
                        placeholder="+254 712 345 678"
                        autoComplete="tel"
                        className="w-full rounded-xl border border-[var(--st-border)] bg-white py-3.5 pl-11 pr-4 text-[12px] outline-none focus:border-[var(--st-red)] focus:ring-2 focus:ring-[var(--st-red)]/10"
                      />

                    </div>

                    <p className="mt-2 mb-0 text-[9px] text-[var(--st-gray)]">
                      Enter your WhatsApp number in
                      international format, e.g.
                      +254 712 345 678
                    </p>

                  </div>

                </div>

                {/* ERROR */}

                {error && (
                  <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">

                    <p className="m-0 text-[10px] leading-relaxed text-red-700">
                      {error}
                    </p>

                  </div>
                )}

                {/* CONFIRM */}

                <button
                  type="button"
                  onClick={handleBooking}
                  disabled={submitting}
                  className="st-button st-button-primary mt-6 w-full disabled:cursor-not-allowed disabled:opacity-60"
                >

                  {submitting ? (
                    <>
                      <Loader2
                        size={15}
                        className="animate-spin"
                      />
                      Confirming...
                    </>
                  ) : (
                    <>
                      Confirm free trial
                      <ArrowRight size={15} />
                    </>
                  )}

                </button>

                {/* CHANGE TIME */}

                <button
                  type="button"
                  onClick={() => {
                    setSelectedSlot(null);
                    setError("");
                  }}
                  className="mx-auto mt-4 flex items-center gap-2 text-[10px] font-bold text-[var(--st-gray)]"
                >

                  <ArrowLeft size={13} />

                  Choose a different time

                </button>

                <p className="mt-5 text-center text-[9px] leading-relaxed text-[var(--st-gray)]">
                  By booking, you agree that Sauti Tamu
                  may contact you about your trial lesson
                  and learning program.
                </p>

              </div>

            </div>

          </section>
        )}

        {/* CHANGE INSTRUMENT */}

        {instrument && !selectedSlot && (
          <button
            type="button"
            onClick={() => {
              setInstrument(null);
              setSelectedSlot(null);
              setError("");
            }}
            className="mx-auto mt-7 flex items-center gap-2 text-[10px] font-bold text-[var(--st-gray)]"
          >

            <ArrowLeft size={13} />

            Change instrument

          </button>
        )}

      </div>

    </main>
  );
}