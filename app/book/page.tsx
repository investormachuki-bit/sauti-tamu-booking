"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  Clock3,
  Guitar,
  Loader2,
  Mail,
  MapPin,
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

type BookingSettings = {
  id?: boolean | string;

  center_name: string;
  address: string;

  booking_duration_minutes: number;

  availability_days: number;
  minimum_notice_hours: number;
  maximum_days_ahead: number;

  timezone: string;

  booking_title: string;
  appointment_name: string;

  description_intro: string;

  description_visit_title: string;
  description_visit_items: string[];

  offer_enabled: boolean;
  offer_title: string;
  offer_price: string;
  offer_regular_price: string;
  offer_description: string;

  what_to_bring_title: string;
  what_to_bring_items: string[];

  working_hours_title: string;
  working_hours_text: string;

  program_title: string;
  program_items: string[];

  location_title: string;
  location_name: string;
  location_address: string;
  location_landmark: string;
  location_maps_url: string;

  arrival_instruction: string;
};

const DEFAULT_SETTINGS: BookingSettings = {
  center_name: "Sauti Tamu Piano Center",

  address:
    "Junction Trade Center, 4th Floor, Room F401, Above Equity Bank Tearoom Branch, Nairobi CBD",

  booking_duration_minutes: 60,

  availability_days: 14,
  minimum_notice_hours: 2,
  maximum_days_ahead: 30,

  timezone: "Africa/Nairobi",

  booking_title: "FREE TRIAL LESSONS BOOKING",

  appointment_name: "Trial Lesson Booking",

  description_intro:
    "You're just one step away from experiencing how we teach at Sauti Tamu Piano Center. Whether you're a complete beginner or you've always wanted to learn the piano, this FREE Trial Lesson gives you the opportunity to experience our practical teaching approach before making any commitment.",

  description_visit_title:
    "During Your Visit, You'll:",

  description_visit_items: [
    "Experience a real piano lesson",
    "Meet your instructor",
    "Receive a beginner skill assessment",
    "See how our 90-day program is structured",
    "Ask any questions you may have",
  ],

  offer_enabled: true,

  offer_title:
    "This Week's Special Offer Ksh 18,850/=",

  offer_price: "18850",

  offer_regular_price: "26850",

  offer_description:
    "Students who book, attend their FREE Trial Lesson this week, and enroll on the same day qualify for our special course fee of Ksh 18,850/= instead of the regular Ksh 26,850/=.",

  what_to_bring_title: "Please Bring",

  what_to_bring_items: [
    "A Notebook",
    "A Pen",
  ],

  working_hours_title: "Working Hours",

  working_hours_text:
    "Monday – Friday: 8:00am – 6:00pm",

  program_title: "The Price Covers",

  program_items: [
    "3 Months Program",
    "36 Practical Lessons",
    "3 Lessons per week",
    "1 Hour per Lesson",
    "Learning Materials and Videos",
  ],

  location_title: "Our Location",

  location_name:
    "Junction Trade Center, 4th Floor, Room F401",

  location_address:
    "Accra Road, Nairobi CBD",

  location_landmark:
    "Above Equity Bank Tearoom Branch — Same Building with 2NK Booking Offices",

  location_maps_url:
    "https://shorturl.at/jJKNQ",

  arrival_instruction:
    "Please arrive 10 minutes before your scheduled time.",
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

function formatDate(
  date: Date,
  timeZone = "Africa/Nairobi"
) {
  return new Intl.DateTimeFormat("en-KE", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone,
  }).format(date);
}

function formatLongDate(
  date: Date,
  timeZone = "Africa/Nairobi"
) {
  return new Intl.DateTimeFormat("en-KE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone,
  }).format(date);
}

function formatTime(
  dateString: string,
  timeZone = "Africa/Nairobi"
) {
  return new Intl.DateTimeFormat("en-KE", {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(new Date(dateString));
}

function formatTimeRange(
  slot: LessonSlot,
  timeZone = "Africa/Nairobi"
) {
  return `${formatTime(
    slot.starts_at,
    timeZone
  )} – ${formatTime(
    slot.ends_at,
    timeZone
  )}`;
}

function getDateKey(
  dateString: string,
  timeZone = "Africa/Nairobi"
) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(dateString));
}

function formatPrice(
  value: string | number | null | undefined
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "";
  }

  const numericValue = Number(
    String(value).replace(/,/g, "")
  );

  if (Number.isNaN(numericValue)) {
    return String(value);
  }

  return numericValue.toLocaleString("en-KE");
}

export default function BookingPage() {
  const [settings, setSettings] =
    useState<BookingSettings>(
      DEFAULT_SETTINGS
    );

  const [instrument, setInstrument] =
    useState<Instrument | null>(null);

  const [slots, setSlots] = useState<
    LessonSlot[]
  >([]);

  const [selectedSlot, setSelectedSlot] =
    useState<LessonSlot | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] =
    useState("");

  const [showMoreDetails, setShowMoreDetails] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] = useState("");

  const [success, setSuccess] =
    useState(false);

  useEffect(() => {
    loadBookingPage();
  }, []);

  async function loadBookingPage() {
    setLoading(true);
    setError("");

    try {
      /*
       * Load all customer-facing
       * booking settings.
       */

      const {
        data: settingsData,
        error: settingsError,
      } = await supabase
        .from("booking_settings")
        .select(
          `
            id,
            center_name,
            address,
            booking_duration_minutes,
            availability_days,
            minimum_notice_hours,
            maximum_days_ahead,
            timezone,
            booking_title,
            appointment_name,
            description_intro,
            description_visit_title,
            description_visit_items,
            offer_enabled,
            offer_title,
            offer_price,
            offer_regular_price,
            offer_description,
            what_to_bring_title,
            what_to_bring_items,
            working_hours_title,
            working_hours_text,
            program_title,
            program_items,
            location_title,
            location_name,
            location_address,
            location_landmark,
            location_maps_url,
            arrival_instruction
          `
        )
        .limit(1)
        .maybeSingle();

      if (settingsError) {
        console.error(
          "Booking settings error:",
          settingsError
        );
      }

      const loadedSettings: BookingSettings = {
        ...DEFAULT_SETTINGS,
        ...(settingsData ?? {}),
      };

      setSettings(loadedSettings);

      /*
       * Customer booking window.
       *
       * We respect both:
       *
       * availability_days
       * maximum_days_ahead
       */

      const bookingDays = Math.min(
        loadedSettings.availability_days ||
          DEFAULT_SETTINGS.availability_days,
        loadedSettings.maximum_days_ahead ||
          DEFAULT_SETTINGS.maximum_days_ahead
      );

      /*
       * Only show genuinely bookable
       * future slots.
       *
       * Minimum notice is applied here.
       */

      const now = new Date();

      const minimumBookingTime =
        new Date(
          now.getTime() +
            loadedSettings.minimum_notice_hours *
              60 *
              60 *
              1000
        );

      /*
       * Calculate the end of the
       * customer booking window.
       */

      const future = new Date(now);

      future.setDate(
        future.getDate() + bookingDays + 1
      );

      const {
        data: slotData,
        error: slotsError,
      } = await supabase
        .from("lesson_slots")
        .select(
          `
            id,
            instrument,
            starts_at,
            ends_at,
            is_available
          `
        )
        .eq("is_available", true)
        .gte(
          "starts_at",
          minimumBookingTime.toISOString()
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

      setSlots(
        (slotData ?? []) as LessonSlot[]
      );
    } catch (err) {
      console.error(
        "Booking page load error:",
        err
      );

      setError(
        "We couldn't load the booking page. Please refresh and try again."
      );
    } finally {
      setLoading(false);
    }
  }

  /*
   * Only show slots belonging to
   * the selected instrument.
   */

  const instrumentSlots = useMemo(() => {
    if (!instrument) {
      return [];
    }

    return slots.filter(
      (slot) =>
        slot.instrument === instrument
    );
  }, [slots, instrument]);

  /*
   * Group available slots by
   * Nairobi date.
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
      const key = getDateKey(
        slot.starts_at,
        settings.timezone
      );

      if (!groups.has(key)) {
        groups.set(key, {
          key,
          date: new Date(
            slot.starts_at
          ),
          slots: [],
        });
      }

      groups
        .get(key)!
        .slots.push(slot);
    });

    return Array.from(
      groups.values()
    );
  }, [
    instrumentSlots,
    settings.timezone,
  ]);

  function selectSlot(
    slot: LessonSlot
  ) {
    setSelectedSlot(slot);
    setError("");
  }

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

    try {
      const response = await fetch(
        "/api/bookings/confirm",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            slotId:
              selectedSlot.id,

            fullName:
              name.trim(),

            email:
              email.trim(),

            whatsappNumber:
              whatsapp.trim(),
          }),
        }
      );

      const result =
        await response.json();

      /*
       * Somebody booked the slot
       * while this customer was
       * completing the form.
       */

      if (
        result.code ===
        "SLOT_ALREADY_BOOKED"
      ) {
        setError(
          "Sorry, that time has just been booked. Please choose another."
        );

        setSelectedSlot(null);

        await loadBookingPage();

        setSubmitting(false);

        return;
      }

      if (
        !response.ok ||
        !result.success
      ) {
        setError(
          result.error ||
            "We couldn't complete your booking. Please try again."
        );

        setSubmitting(false);

        return;
      }

      console.log(
        "Trial booking confirmed:",
        result
      );

      setSuccess(true);
      setSubmitting(false);
    } catch (err) {
      console.error(
        "Booking submission error:",
        err
      );

      setError(
        "We couldn't connect to the booking service. Please check your internet connection and try again."
      );

      setSubmitting(false);
    }
  }

  /*
   * ----------------------------------------
   * SUCCESS SCREEN
   * ----------------------------------------
   */

  if (
    success &&
    selectedSlot &&
    instrument
  ) {
    return (
      <main className="min-h-screen bg-[var(--st-bg)] px-5 py-10">

        <div className="mx-auto flex min-h-[80vh] max-w-[520px] items-center justify-center">

          <div className="st-card w-full p-7 text-center sm:p-10">

            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--st-red)] text-white">
              <Check size={28} />
            </div>

            <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--st-red)]">
              Trial lesson confirmed
            </p>

            <h1 className="mt-2 text-[30px] font-bold tracking-[-0.04em] text-[var(--st-charcoal-dark)]">
              You&apos;re booked.
            </h1>

            <p className="mx-auto mt-3 max-w-[380px] text-[13px] leading-relaxed text-[var(--st-gray)]">
              Your free trial lesson has been
              successfully confirmed.
            </p>

            <div className="mt-7 rounded-2xl bg-[var(--st-bg-soft)] p-5 text-left">

              <p className="m-0 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--st-gray)]">
                YOUR TRIAL LESSON
              </p>

              <p className="mt-2 mb-0 text-[23px] font-bold tracking-[-0.03em] text-[var(--st-charcoal-dark)]">
                {
                  instrumentInfo[
                    instrument
                  ].name
                }
              </p>

              <div className="mt-5 flex items-start gap-3">

                <Clock3
                  size={18}
                  className="mt-0.5 shrink-0 text-[var(--st-gray)]"
                />

                <div>

                  <p className="m-0 text-[13px] font-semibold text-[var(--st-charcoal-dark)]">
                    {formatLongDate(
                      new Date(
                        selectedSlot.starts_at
                      ),
                      settings.timezone
                    )}
                  </p>

                  <p className="mt-2 mb-0 text-[21px] font-extrabold tracking-[-0.03em] text-[var(--st-red)]">
                    {formatTimeRange(
                      selectedSlot,
                      settings.timezone
                    )}
                  </p>

                  <p className="mt-2 mb-0 text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--st-gray)]">
                    {
                      settings.booking_duration_minutes
                    }
                    -minute free trial
                    lesson
                  </p>

                </div>

              </div>

            </div>

            <div className="mt-4 rounded-2xl border border-[var(--st-border)] bg-white p-5 text-left">

              <div className="flex items-start gap-3">

                <MapPin
                  size={19}
                  className="mt-0.5 shrink-0 text-[var(--st-red)]"
                />

                <div>

                  <p className="m-0 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--st-red)]">
                    LOCATION
                  </p>

                  <p className="mt-2 mb-0 text-[13px] font-bold text-[var(--st-charcoal-dark)]">
                    {settings.location_name}
                  </p>

                  <p className="mt-2 mb-0 text-[11px] leading-[1.7] text-[var(--st-gray)]">
                    {settings.location_address}
                    <br />
                    {settings.location_landmark}
                  </p>

                  {settings.location_maps_url && (
                    <a
                      href={
                        settings.location_maps_url
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-2 text-[11px] font-bold text-[var(--st-red)]"
                    >
                      View on Google Maps
                      <ArrowRight
                        size={13}
                      />
                    </a>
                  )}

                </div>

              </div>

            </div>

            {settings.arrival_instruction && (
              <div className="mt-4 rounded-2xl bg-[var(--st-bg-soft)] p-4 text-left">

                <p className="m-0 text-[11px] font-bold text-[var(--st-charcoal-dark)]">
                  Before your visit
                </p>

                <p className="mt-2 mb-0 text-[11px] leading-relaxed text-[var(--st-gray)]">
                  {
                    settings.arrival_instruction
                  }
                </p>

              </div>
            )}

            <p className="mt-6 text-[11px] leading-relaxed text-[var(--st-gray)]">
              A confirmation has been sent to
              your email. We&apos;ll also contact
              you on WhatsApp with your lesson
              details.
            </p>

          </div>

        </div>

      </main>
    );
  }

  /*
   * ----------------------------------------
   * MAIN BOOKING PAGE
   * ----------------------------------------
   */

  return (
    <main className="min-h-screen bg-[var(--st-bg)]">

      {/* BRAND HEADER */}

      <header className="border-b border-[var(--st-border)] bg-white">

        <div className="mx-auto flex max-w-[1100px] items-center justify-between px-5 py-4 sm:px-8">

          <div className="flex items-center gap-3">

            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--st-red)] text-[12px] font-extrabold text-white">
              ST
            </div>

            <div>

              <p className="m-0 text-[14px] font-bold text-[var(--st-charcoal-dark)]">
                {settings.center_name}
              </p>

              <p className="mt-1 mb-0 text-[9px] font-bold tracking-[0.16em] text-[var(--st-gray)]">
                FREE TRIAL LESSONS
              </p>

            </div>

          </div>

        </div>

      </header>

      <div className="mx-auto max-w-[1100px] px-4 py-6 sm:px-6 sm:py-10 lg:px-8">

        <div className="overflow-hidden rounded-[28px] border border-[var(--st-border)] bg-white shadow-sm">

          {/* -------------------------------- */}
          {/* INFORMATION PANEL                */}
          {/* -------------------------------- */}

          <section className="p-6 sm:p-9 lg:p-10">

            <p className="text-[11px] font-bold uppercase tracking-[0.17em] text-[var(--st-red)]">
              {settings.booking_title}
            </p>

            <h1 className="mt-3 text-[32px] font-bold leading-tight tracking-[-0.045em] text-[var(--st-charcoal-dark)] sm:text-[38px]">
              {settings.appointment_name}
            </h1>

            <div className="mt-5 flex items-center gap-2 text-[13px] font-semibold text-[var(--st-gray)]">

              <Clock3 size={17} />

              {settings.booking_duration_minutes}{" "}
              minutes

            </div>

            {/* INTRO */}

            <div className="mt-7 max-w-[760px]">

              <p className="m-0 text-[13px] leading-[1.75] text-[var(--st-gray)] sm:text-[14px]">
                {settings.description_intro}
              </p>

            </div>

            {/* SPECIAL OFFER */}

            {settings.offer_enabled &&
              settings.offer_description && (
                <div className="mt-7 max-w-[760px] rounded-2xl bg-[var(--st-red)] p-5 text-white sm:p-6">

                  <p className="m-0 text-[10px] font-bold uppercase tracking-[0.13em] text-white/75">
                    SPECIAL OFFER
                  </p>

                  <p className="mt-2 text-[19px] font-bold leading-tight sm:text-[21px]">
                    {settings.offer_title}
                  </p>

                  {settings.offer_price &&
                    settings.offer_regular_price && (
                      <div className="mt-4 flex flex-wrap items-end gap-3">

                        <span className="text-[30px] font-extrabold tracking-[-0.03em]">
                          Ksh{" "}
                          {formatPrice(
                            settings.offer_price
                          )}
                          /=
                        </span>

                        <span className="mb-1 text-[13px] text-white/60 line-through">
                          Ksh{" "}
                          {formatPrice(
                            settings.offer_regular_price
                          )}
                          /=
                        </span>

                      </div>
                    )}

                  <p className="mt-4 mb-0 text-[12px] leading-[1.7] text-white/85">
                    {
                      settings.offer_description
                    }
                  </p>

                </div>
              )}

            {/* SHOW MORE */}

            <button
              type="button"
              onClick={() =>
                setShowMoreDetails(
                  !showMoreDetails
                )
              }
              className="mt-6 flex w-full max-w-[760px] items-center justify-center gap-2 rounded-xl border border-[var(--st-border)] bg-white px-4 py-3.5 text-[12px] font-bold text-[var(--st-charcoal-dark)] transition-colors hover:bg-[var(--st-bg-soft)]"
            >
              {showMoreDetails
                ? "Show less"
                : "Show more"}

              {showMoreDetails ? (
                <ChevronUp size={16} />
              ) : (
                <ChevronDown size={16} />
              )}

            </button>

            {/* EXPANDED DETAILS */}

            {showMoreDetails && (
              <div className="mt-8 max-w-[760px]">

                {/* DURING YOUR VISIT */}

                {settings
                  .description_visit_items
                  ?.length > 0 && (
                  <div>

                    <p className="m-0 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--st-charcoal-dark)]">
                      {
                        settings.description_visit_title
                      }
                    </p>

                    <div className="mt-5 space-y-3.5">

                      {settings.description_visit_items.map(
                        (
                          item,
                          index
                        ) => (
                          <div
                            key={`${item}-${index}`}
                            className="flex items-start gap-3"
                          >

                            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--st-bg-soft)] text-[var(--st-red)]">
                              <Check
                                size={12}
                              />
                            </div>

                            <p className="m-0 text-[12px] leading-relaxed text-[var(--st-gray)]">
                              {item}
                            </p>

                          </div>
                        )
                      )}

                    </div>

                  </div>
                )}

                {/* WHAT TO BRING */}

                {settings
                  .what_to_bring_items
                  ?.length > 0 && (
                  <div className="mt-9 border-t border-[var(--st-border)] pt-8">

                    <p className="m-0 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--st-charcoal-dark)]">
                      {
                        settings.what_to_bring_title
                      }
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">

                      {settings.what_to_bring_items.map(
                        (
                          item,
                          index
                        ) => (
                          <span
                            key={`${item}-${index}`}
                            className="rounded-full bg-[var(--st-bg-soft)] px-4 py-2.5 text-[11px] font-semibold text-[var(--st-gray)]"
                          >
                            {item}
                          </span>
                        )
                      )}

                    </div>

                  </div>
                )}

                {/* PROGRAM */}

                {settings
                  .program_items
                  ?.length > 0 && (
                  <div className="mt-9 border-t border-[var(--st-border)] pt-8">

                    <p className="m-0 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--st-charcoal-dark)]">
                      {
                        settings.program_title
                      }
                    </p>

                    <div className="mt-5 space-y-3">

                      {settings.program_items.map(
                        (
                          item,
                          index
                        ) => (
                          <p
                            key={`${item}-${index}`}
                            className="m-0 text-[12px] leading-relaxed text-[var(--st-gray)]"
                          >
                            • {item}
                          </p>
                        )
                      )}

                    </div>

                  </div>
                )}

                {/* LOCATION */}

                <div className="mt-9 border-t border-[var(--st-border)] pt-8">

                  <div className="flex items-start gap-3">

                    <MapPin
                      size={19}
                      className="mt-0.5 shrink-0 text-[var(--st-red)]"
                    />

                    <div>

                      <p className="m-0 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--st-charcoal-dark)]">
                        {
                          settings.location_title
                        }
                      </p>

                      <p className="mt-3 text-[13px] font-bold text-[var(--st-charcoal-dark)]">
                        {
                          settings.location_name
                        }
                      </p>

                      <p className="mt-2 text-[11px] leading-[1.7] text-[var(--st-gray)]">
                        {
                          settings.location_address
                        }
                        <br />
                        {
                          settings.location_landmark
                        }
                      </p>

                      {settings.location_maps_url && (
                        <a
                          href={
                            settings.location_maps_url
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-4 inline-flex items-center gap-2 text-[11px] font-bold text-[var(--st-red)]"
                        >
                          View on Google Maps
                          <ArrowRight
                            size={13}
                          />
                        </a>
                      )}

                    </div>

                  </div>

                </div>

                {/* WORKING HOURS */}

                {settings.working_hours_text && (
                  <div className="mt-8 rounded-2xl bg-[var(--st-bg-soft)] p-5">

                    <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--st-charcoal-dark)]">
                      {
                        settings.working_hours_title
                      }
                    </p>

                    <p className="mt-2 mb-0 text-[11px] leading-relaxed text-[var(--st-gray)]">
                      {
                        settings.working_hours_text
                      }
                    </p>

                  </div>
                )}

                {/* ARRIVAL */}

                {settings.arrival_instruction && (
                  <div className="mt-4 rounded-2xl border border-[var(--st-border)] p-5">

                    <p className="m-0 text-[11px] font-bold text-[var(--st-charcoal-dark)]">
                      Before your visit
                    </p>

                    <p className="mt-2 mb-0 text-[11px] leading-relaxed text-[var(--st-gray)]">
                      {
                        settings.arrival_instruction
                      }
                    </p>

                  </div>
                )}

              </div>
            )}

          </section>

          {/* -------------------------------- */}
          {/* BOOKING SECTION                   */}
          {/* -------------------------------- */}

          <section className="border-t border-[var(--st-border)] p-6 sm:p-9 lg:p-10">

            {/* STEP 1 */}

            {!selectedSlot && (
              <div>

                <p className="m-0 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--st-red)]">
                  STEP 1
                </p>

                <h2 className="mt-2 text-[25px] font-bold tracking-[-0.035em] text-[var(--st-charcoal-dark)] sm:text-[28px]">
                  Choose an instrument
                </h2>

                <p className="mt-2 text-[12px] leading-relaxed text-[var(--st-gray)]">
                  Select the instrument you would
                  like to try during your free
                  trial lesson.
                </p>

                <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">

                  {(
                    Object.keys(
                      instrumentInfo
                    ) as Instrument[]
                  ).map((item) => {
                    const Icon =
                      instrumentInfo[item]
                        .icon;

                    const selected =
                      instrument === item;

                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => {
                          setInstrument(
                            item
                          );

                          setSelectedSlot(
                            null
                          );

                          setError("");
                        }}
                        className={`flex min-h-[130px] items-center gap-4 rounded-2xl border p-5 text-left transition-all ${
                          selected
                            ? "border-[var(--st-red)] bg-[var(--st-bg-soft)] shadow-sm"
                            : "border-[var(--st-border)] bg-white hover:border-[var(--st-red)]"
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

                          <p className="m-0 text-[16px] font-bold text-[var(--st-charcoal-dark)]">
                            {
                              instrumentInfo[
                                item
                              ].name
                            }
                          </p>

                          <p className="mt-1 mb-0 text-[12px] text-[var(--st-gray)]">
                            {
                              instrumentInfo[
                                item
                              ].description
                            }
                          </p>

                        </div>

                        {selected && (
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--st-red)] text-white">
                            <Check
                              size={14}
                            />
                          </div>
                        )}

                      </button>
                    );
                  })}

                </div>

                {/* DATE/TIME */}

                {instrument && (
                  <div className="mt-9">

                    <p className="m-0 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--st-red)]">
                      STEP 2
                    </p>

                    <h2 className="mt-2 text-[25px] font-bold tracking-[-0.035em] text-[var(--st-charcoal-dark)] sm:text-[28px]">
                      Select a date and time
                    </h2>

                    <p className="mt-2 text-[12px] leading-relaxed text-[var(--st-gray)]">
                      Choose a convenient
                      appointment time. Available
                      appointments are shown for
                      the next{" "}
                      <strong className="text-[var(--st-charcoal-dark)]">
                        {Math.min(
                          settings.availability_days,
                          settings.maximum_days_ahead
                        )}{" "}
                        days
                      </strong>
                      .
                    </p>

                    {loading ? (
                      <div className="st-card mt-6 flex min-h-[220px] items-center justify-center gap-3 text-[12px] text-[var(--st-gray)]">

                        <Loader2
                          size={18}
                          className="animate-spin"
                        />

                        Loading available
                        appointments...

                      </div>
                    ) : groupedDates.length ===
                      0 ? (
                      <div className="st-card mt-6 p-8 text-center">

                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--st-bg-soft)] text-[var(--st-red)]">
                          <Clock3
                            size={20}
                          />
                        </div>

                        <p className="mt-4 mb-0 text-[15px] font-bold text-[var(--st-charcoal-dark)]">
                          No available
                          appointments
                        </p>

                        <p className="mt-2 mb-0 text-[12px] leading-relaxed text-[var(--st-gray)]">
                          Please check again
                          later or choose another
                          instrument.
                        </p>

                      </div>
                    ) : (
                      <div className="mt-6 space-y-4">

                        {groupedDates.map(
                          (group) => (
                            <div
                              key={
                                group.key
                              }
                              className="overflow-hidden rounded-2xl border border-[var(--st-border)] bg-white"
                            >

                              {/* DATE */}

                              <div className="border-b border-[var(--st-border)] bg-[var(--st-bg-soft)] px-5 py-4">

                                <p className="m-0 text-[15px] font-bold text-[var(--st-charcoal-dark)]">
                                  {formatDate(
                                    group.date,
                                    settings.timezone
                                  )}
                                </p>

                                <p className="mt-1 mb-0 text-[11px] text-[var(--st-gray)]">
                                  {
                                    group
                                      .slots
                                      .length
                                  }{" "}
                                  available{" "}
                                  {group
                                    .slots
                                    .length ===
                                  1
                                    ? "time"
                                    : "times"}
                                </p>

                              </div>

                              {/* TIMES */}

                              <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-3 md:grid-cols-4">

                                {group.slots.map(
                                  (slot) => (
                                    <button
                                      key={
                                        slot.id
                                      }
                                      type="button"
                                      onClick={() =>
                                        selectSlot(
                                          slot
                                        )
                                      }
                                      className="rounded-xl border border-[var(--st-border)] bg-white px-3 py-3.5 text-center transition-all hover:border-[var(--st-red)] hover:bg-[var(--st-bg-soft)]"
                                    >

                                      <span className="block text-[13px] font-bold text-[var(--st-charcoal-dark)]">
                                        {formatTime(
                                          slot.starts_at,
                                          settings.timezone
                                        )}
                                      </span>

                                      <span className="mt-1 block text-[10px] text-[var(--st-gray)]">
                                        {
                                          settings.booking_duration_minutes
                                        }{" "}
                                        min
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

                  </div>
                )}

              </div>
            )}

            {/* -------------------------------- */}
            {/* SELECTED SLOT                    */}
            {/* -------------------------------- */}

            {selectedSlot &&
              instrument && (
                <div>

                  <p className="m-0 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--st-red)]">
                    STEP 2
                  </p>

                  <h2 className="mt-2 text-[25px] font-bold tracking-[-0.035em] text-[var(--st-charcoal-dark)] sm:text-[28px]">
                    Your selected appointment
                  </h2>

                  {/* SELECTED TIME */}

                  <div className="mt-6 rounded-2xl bg-[var(--st-red)] p-6 text-white">

                    <p className="m-0 text-[10px] font-bold uppercase tracking-[0.15em] text-white/70">
                      SELECTED TIME
                    </p>

                    <div className="mt-4 flex items-start justify-between gap-4">

                      <div>

                        <h3 className="m-0 text-[23px] font-bold">
                          {
                            instrumentInfo[
                              instrument
                            ].name
                          }
                        </h3>

                        <p className="mt-2 mb-0 text-[13px] font-medium text-white/85">
                          {formatLongDate(
                            new Date(
                              selectedSlot.starts_at
                            ),
                            settings.timezone
                          )}
                        </p>

                        <p className="mt-3 mb-0 text-[27px] font-extrabold leading-none tracking-[-0.04em]">
                          {formatTimeRange(
                            selectedSlot,
                            settings.timezone
                          )}
                        </p>

                        <p className="mt-3 mb-0 text-[10px] font-medium uppercase tracking-[0.08em] text-white/65">
                          {
                            settings.booking_duration_minutes
                          }
                          -minute free trial
                          lesson
                        </p>

                      </div>

                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15">
                        <Check size={19} />
                      </div>

                    </div>

                  </div>

                  {/* DETAILS */}

                  <div className="mt-7">

                    <p className="m-0 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--st-red)]">
                      STEP 3
                    </p>

                    <h2 className="mt-2 text-[25px] font-bold tracking-[-0.035em] text-[var(--st-charcoal-dark)]">
                      Your details
                    </h2>

                    <p className="mt-2 text-[12px] leading-relaxed text-[var(--st-gray)]">
                      Enter your details to
                      confirm your free trial
                      lesson.
                    </p>

                  </div>

                  <div className="mt-7 space-y-5">

                    {/* NAME */}

                    <div>

                      <label className="mb-2 block text-[11px] font-bold text-[var(--st-charcoal)]">
                        Full name
                      </label>

                      <div className="relative">

                        <User
                          size={17}
                          className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--st-gray)]"
                        />

                        <input
                          type="text"
                          value={name}
                          onChange={(event) =>
                            setName(
                              event.target
                                .value
                            )
                          }
                          placeholder="Your full name"
                          autoComplete="name"
                          className="w-full rounded-xl border border-[var(--st-border)] bg-white py-4 pl-11 pr-4 text-[13px] outline-none transition focus:border-[var(--st-red)] focus:ring-2 focus:ring-[var(--st-red)]/10"
                        />

                      </div>

                    </div>

                    {/* EMAIL */}

                    <div>

                      <label className="mb-2 block text-[11px] font-bold text-[var(--st-charcoal)]">
                        Email address
                      </label>

                      <div className="relative">

                        <Mail
                          size={17}
                          className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--st-gray)]"
                        />

                        <input
                          type="email"
                          value={email}
                          onChange={(event) =>
                            setEmail(
                              event.target
                                .value
                            )
                          }
                          placeholder="you@example.com"
                          autoComplete="email"
                          className="w-full rounded-xl border border-[var(--st-border)] bg-white py-4 pl-11 pr-4 text-[13px] outline-none transition focus:border-[var(--st-red)] focus:ring-2 focus:ring-[var(--st-red)]/10"
                        />

                      </div>

                    </div>

                    {/* WHATSAPP */}

                    <div>

                      <label className="mb-2 block text-[11px] font-bold text-[var(--st-charcoal)]">
                        WhatsApp number
                      </label>

                      <div className="relative">

                        <Phone
                          size={17}
                          className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--st-gray)]"
                        />

                        <input
                          type="tel"
                          inputMode="tel"
                          value={whatsapp}
                          onChange={(event) =>
                            setWhatsapp(
                              event.target
                                .value
                            )
                          }
                          placeholder="+254 712 345 678"
                          autoComplete="tel"
                          className="w-full rounded-xl border border-[var(--st-border)] bg-white py-4 pl-11 pr-4 text-[13px] outline-none transition focus:border-[var(--st-red)] focus:ring-2 focus:ring-[var(--st-red)]/10"
                        />

                      </div>

                      <p className="mt-2 mb-0 text-[10px] leading-relaxed text-[var(--st-gray)]">
                        Enter your WhatsApp number
                        in international format,
                        e.g. +254 712 345 678.
                      </p>

                    </div>

                  </div>

                  {/* LOCATION */}

                  <div className="mt-7 rounded-2xl bg-[var(--st-bg-soft)] p-5">

                    <div className="flex items-start gap-3">

                      <MapPin
                        size={18}
                        className="mt-0.5 shrink-0 text-[var(--st-red)]"
                      />

                      <div>

                        <p className="m-0 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--st-red)]">
                          Location
                        </p>

                        <p className="mt-2 mb-0 text-[12px] font-bold text-[var(--st-charcoal-dark)]">
                          {
                            settings.location_name
                          }
                        </p>

                        <p className="mt-1 mb-0 text-[10px] leading-relaxed text-[var(--st-gray)]">
                          {
                            settings.location_address
                          }
                          <br />
                          {
                            settings.location_landmark
                          }
                        </p>

                      </div>

                    </div>

                  </div>

                  {/* ERROR */}

                  {error && (
                    <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-4">

                      <p className="m-0 text-[11px] leading-relaxed text-red-700">
                        {error}
                      </p>

                    </div>
                  )}

                  {/* CONFIRM */}

                  <button
                    type="button"
                    onClick={
                      handleBooking
                    }
                    disabled={
                      submitting
                    }
                    className="st-button st-button-primary mt-6 w-full py-4 text-[12px] disabled:cursor-not-allowed disabled:opacity-60"
                  >

                    {submitting ? (
                      <>
                        <Loader2
                          size={16}
                          className="animate-spin"
                        />
                        Confirming...
                      </>
                    ) : (
                      <>
                        Confirm free
                        trial
                        <ArrowRight
                          size={16}
                        />
                      </>
                    )}

                  </button>

                  {/* CHANGE TIME */}

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSlot(
                        null
                      );

                      setError("");
                    }}
                    className="mx-auto mt-5 flex items-center gap-2 text-[11px] font-bold text-[var(--st-gray)]"
                  >

                    <ArrowLeft
                      size={14}
                    />

                    Choose a
                    different time

                  </button>

                  <p className="mt-6 text-center text-[10px] leading-relaxed text-[var(--st-gray)]">
                    By booking, you agree that
                    Sauti Tamu may contact you
                    about your trial lesson and
                    learning program.
                  </p>

                </div>
              )}

          </section>

        </div>

        {/* BEFORE YOUR VISIT */}

        {settings.arrival_instruction && (
          <div className="mx-auto mt-4 max-w-[700px] rounded-2xl bg-white p-5 text-center shadow-sm">

            <p className="m-0 text-[11px] font-bold text-[var(--st-charcoal-dark)]">
              Before your visit
            </p>

            <p className="mt-2 mb-0 text-[11px] leading-relaxed text-[var(--st-gray)]">
              {
                settings.arrival_instruction
              }
            </p>

          </div>
        )}

      </div>

    </main>
  );
}