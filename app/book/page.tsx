"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
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
  center_name: string;
  address: string;
  booking_duration_minutes: number;

  availability_days: number;

  reminder_24h_enabled: boolean;
  reminder_2h_enabled: boolean;
  follow_up_enabled: boolean;

  booking_title: string;
  appointment_name: string;
  timezone: string;

  description_intro: string | null;

  description_visit_title: string | null;
  description_visit_items: string[] | null;

  offer_enabled: boolean;
  offer_title: string | null;
  offer_price: string | null;
  offer_regular_price: string | null;
  offer_description: string | null;

  what_to_bring_title: string | null;
  what_to_bring_items: string[] | null;

  working_hours_title: string | null;
  working_hours_text: string | null;

  program_title: string | null;
  program_items: string[] | null;

  location_title: string | null;
  location_name: string | null;
  location_address: string | null;
  location_landmark: string | null;
  location_maps_url: string | null;

  arrival_instruction: string | null;

  minimum_notice_hours: number;
  maximum_days_ahead: number;
};

type CalendarDay = {
  key: string;
  date: Date;
  slots: LessonSlot[];
};

const DEFAULT_SETTINGS: BookingSettings = {
  center_name: "Sauti Tamu Piano Center",
  address:
    "Junction Trade Center, 4th Floor, Room F401, Above Equity Bank Tearoom Branch, Nairobi CBD",
  booking_duration_minutes: 60,

  availability_days: 14,

  reminder_24h_enabled: true,
  reminder_2h_enabled: true,
  follow_up_enabled: true,

  booking_title: "FREE TRIAL LESSONS BOOKING",
  appointment_name: "Trial Lesson Booking",
  timezone: "Africa/Nairobi",

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

  minimum_notice_hours: 2,
  maximum_days_ahead: 30,
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

const NAIROBI_TIME_ZONE = "Africa/Nairobi";

function getDateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: NAIROBI_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-KE", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: NAIROBI_TIME_ZONE,
  }).format(date);
}

function formatLongDate(date: Date) {
  return new Intl.DateTimeFormat("en-KE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: NAIROBI_TIME_ZONE,
  }).format(date);
}

function formatMonthYear(date: Date) {
  return new Intl.DateTimeFormat("en-KE", {
    month: "long",
    year: "numeric",
    timeZone: NAIROBI_TIME_ZONE,
  }).format(date);
}

function formatTime(dateString: string) {
  return new Intl.DateTimeFormat("en-KE", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: NAIROBI_TIME_ZONE,
  }).format(new Date(dateString));
}

function formatTimeRange(slot: LessonSlot) {
  return `${formatTime(slot.starts_at)} – ${formatTime(
    slot.ends_at
  )}`;
}

function getCalendarDayLabel(date: Date) {
  return new Intl.DateTimeFormat("en-KE", {
    weekday: "short",
    timeZone: NAIROBI_TIME_ZONE,
  })
    .format(date)
    .toUpperCase();
}

function getCalendarDayNumber(date: Date) {
  return new Intl.DateTimeFormat("en-KE", {
    day: "numeric",
    timeZone: NAIROBI_TIME_ZONE,
  }).format(date);
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function startOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function getTodayInNairobi() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: NAIROBI_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(new Date());

  const year = Number(
    parts.find((part) => part.type === "year")?.value
  );

  const month = Number(
    parts.find((part) => part.type === "month")?.value
  );

  const day = Number(
    parts.find((part) => part.type === "day")?.value
  );

  return new Date(
    year,
    month - 1,
    day,
    0,
    0,
    0,
    0
  );
}

function isSameDate(
  first: Date,
  second: Date
) {
  return (
    getDateKey(first) ===
    getDateKey(second)
  );
}

function isWithinBookingWindow(
  slot: LessonSlot,
  settings: BookingSettings
) {
  if (!slot.is_available) {
    return false;
  }

  const startsAt =
    new Date(slot.starts_at).getTime();

  const now =
    Date.now();

  const minimumNotice =
    settings.minimum_notice_hours *
    60 *
    60 *
    1000;

  if (
    startsAt <
    now + minimumNotice
  ) {
    return false;
  }

  const today =
    getTodayInNairobi();

  const maximumDate =
    addDays(
      today,
      Math.min(
        settings.availability_days,
        settings.maximum_days_ahead
      )
    );

  const maximumTime =
    maximumDate.getTime() +
    24 * 60 * 60 * 1000 -
    1;

  if (startsAt > maximumTime) {
    return false;
  }

  return true;
}

export default function BookingPage() {
  const [settings, setSettings] =
    useState<BookingSettings | null>(
      null
    );

  const [instrument, setInstrument] =
    useState<Instrument | null>(null);

  const [slots, setSlots] =
    useState<LessonSlot[]>([]);

  const [selectedSlot, setSelectedSlot] =
    useState<LessonSlot | null>(null);

  const [selectedDateKey, setSelectedDateKey] =
    useState<string | null>(null);

  const [calendarStart, setCalendarStart] =
    useState<Date>(
      startOfDay(
        getTodayInNairobi()
      )
    );

  const [name, setName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [whatsapp, setWhatsapp] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState(false);

  useEffect(() => {
    loadBookingPage();
  }, []);

  async function loadBookingPage() {
    setLoading(true);
    setError("");

    try {
      const {
        data: settingsData,
        error: settingsError,
      } = await supabase
        .from("booking_settings")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (settingsError) {
        console.error(
          "Booking settings error:",
          settingsError
        );
      }

      const bookingSettings: BookingSettings = {
        ...DEFAULT_SETTINGS,
        ...(settingsData ?? {}),
      };

      setSettings(
        bookingSettings
      );

      const today =
        getTodayInNairobi();

      const visibleDays =
        Math.min(
          bookingSettings.availability_days,
          bookingSettings.maximum_days_ahead
        );

      const future =
        addDays(
          today,
          visibleDays + 1
        );

      const {
        data,
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
        .eq(
          "is_available",
          true
        )
        .gte(
          "starts_at",
          today.toISOString()
        )
        .lt(
          "starts_at",
          future.toISOString()
        )
        .order(
          "starts_at",
          {
            ascending: true,
          }
        );

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

      const availableSlots =
        ((data ?? []) as LessonSlot[]).filter(
          (slot) =>
            isWithinBookingWindow(
              slot,
              bookingSettings
            )
        );

      setSlots(
        availableSlots
      );

      setLoading(false);
    } catch (err) {
      console.error(
        "Booking page load error:",
        err
      );

      setError(
        "We couldn't load the booking page. Please try again."
      );

      setLoading(false);
    }
  }

  const instrumentSlots =
    useMemo(() => {
      if (!instrument) {
        return [];
      }

      return slots.filter(
        (slot) =>
          slot.instrument ===
          instrument
      );
    }, [
      slots,
      instrument,
    ]);

  const groupedDates =
    useMemo(() => {
      const groups = new Map<
        string,
        CalendarDay
      >();

      instrumentSlots.forEach(
        (slot) => {
          const date =
            new Date(
              slot.starts_at
            );

          const key =
            getDateKey(date);

          if (!groups.has(key)) {
            groups.set(key, {
              key,
              date,
              slots: [],
            });
          }

          groups
            .get(key)!
            .slots.push(slot);
        }
      );

      return Array.from(
        groups.values()
      ).sort(
        (a, b) =>
          a.date.getTime() -
          b.date.getTime()
      );
    }, [
      instrumentSlots,
    ]);

  const calendarDays =
    useMemo(() => {
      return Array.from(
        { length: 7 },
        (_, index) =>
          addDays(
            calendarStart,
            index
          )
      );
    }, [
      calendarStart,
    ]);

  const visibleCalendarDays =
    useMemo(() => {
      const maxDays =
        settings
          ? Math.min(
              settings.availability_days,
              settings.maximum_days_ahead
            )
          : 14;

      const today =
        getTodayInNairobi();

      const maxDate =
        addDays(
          today,
          maxDays
        );

      return calendarDays.filter(
        (date) =>
          date >= today &&
          date <= maxDate
      );
    }, [
      calendarDays,
      settings,
    ]);

  const firstAvailableDate =
    groupedDates[0]?.date ??
    null;

  useEffect(() => {
    if (
      instrument &&
      firstAvailableDate &&
      !selectedDateKey
    ) {
      setSelectedDateKey(
        getDateKey(
          firstAvailableDate
        )
      );
    }
  }, [
    instrument,
    firstAvailableDate,
    selectedDateKey,
  ]);

  const selectedDateSlots =
    useMemo(() => {
      if (
        !selectedDateKey
      ) {
        return [];
      }

      return instrumentSlots
        .filter(
          (slot) =>
            getDateKey(
              new Date(
                slot.starts_at
              )
            ) ===
            selectedDateKey
        )
        .sort(
          (a, b) =>
            new Date(
              a.starts_at
            ).getTime() -
            new Date(
              b.starts_at
            ).getTime()
        );
    }, [
      instrumentSlots,
      selectedDateKey,
    ]);

  const selectedCalendarDate =
    useMemo(() => {
      if (
        !selectedDateKey
      ) {
        return null;
      }

      return (
        visibleCalendarDays.find(
          (date) =>
            getDateKey(date) ===
            selectedDateKey
        ) ??
        groupedDates.find(
          (group) =>
            group.key ===
            selectedDateKey
        )?.date ??
        null
      );
    }, [
      selectedDateKey,
      visibleCalendarDays,
      groupedDates,
    ]);

  function selectInstrument(
    value: Instrument
  ) {
    setInstrument(value);
    setSelectedSlot(null);
    setSelectedDateKey(null);
    setError("");
  }

  function selectDate(
    date: Date
  ) {
    const key =
      getDateKey(date);

    setSelectedDateKey(
      key
    );

    setSelectedSlot(
      null
    );

    setError("");
  }

  function selectSlot(
    slot: LessonSlot
  ) {
    setSelectedSlot(
      slot
    );

    setError("");
  }

  function goToPreviousWeek() {
    const today =
      getTodayInNairobi();

    const previous =
      addDays(
        calendarStart,
        -7
      );

    if (
      previous < today
    ) {
      return;
    }

    setCalendarStart(
      previous
    );
  }

  function goToNextWeek() {
    if (!settings) {
      return;
    }

    const maxDays =
      Math.min(
        settings.availability_days,
        settings.maximum_days_ahead
      );

    const maxDate =
      addDays(
        getTodayInNairobi(),
        maxDays
      );

    const next =
      addDays(
        calendarStart,
        7
      );

    if (
      next > maxDate
    ) {
      return;
    }

    setCalendarStart(
      next
    );
  }

  function hasSlotsForDate(
    date: Date
  ) {
    const key =
      getDateKey(date);

    return instrumentSlots.some(
      (slot) =>
        getDateKey(
          new Date(
            slot.starts_at
          )
        ) === key
    );
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
      const response =
        await fetch(
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
                email
                  .trim()
                  .toLowerCase(),
              whatsappNumber:
                whatsapp.trim(),
            }),
          }
        );

      const result =
        await response.json();

      if (
        result.code ===
        "SLOT_ALREADY_BOOKED"
      ) {
        setError(
          "Sorry, that time has just been booked. Please choose another."
        );

        setSelectedSlot(
          null
        );

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

  if (
    success &&
    selectedSlot &&
    settings
  ) {
    return (
      <main className="min-h-screen bg-[var(--st-bg)] px-5 py-8 sm:px-8 sm:py-12">
        <div className="mx-auto flex min-h-[80vh] max-w-[620px] items-center justify-center">
          <div className="st-card w-full overflow-hidden">
            <div className="bg-[var(--st-red)] px-6 py-8 text-center text-white sm:px-10">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white text-[var(--st-red)]">
                <Check size={28} />
              </div>

              <p className="mt-5 text-[9px] font-bold uppercase tracking-[0.18em] text-white/70">
                Booking confirmed
              </p>

              <h1 className="mt-2 text-[29px] font-bold tracking-[-0.04em]">
                You&apos;re booked.
              </h1>

              <p className="mx-auto mt-2 max-w-[400px] text-[11px] leading-relaxed text-white/80">
                Your free trial lesson with{" "}
                {settings.center_name} has
                been successfully confirmed.
              </p>
            </div>

            <div className="p-5 sm:p-8">
              <div className="rounded-2xl bg-[var(--st-bg-soft)] p-5">
                <p className="m-0 text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--st-gray)]">
                  {settings.appointment_name}
                </p>

                <p className="mt-2 text-[21px] font-bold text-[var(--st-charcoal-dark)]">
                  {
                    instrumentInfo[
                      instrument!
                    ].name
                  }
                </p>

                <div className="mt-5">
                  <p className="m-0 text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                    Date
                  </p>

                  <p className="mt-1 text-[12px] font-semibold text-[var(--st-charcoal-dark)]">
                    {formatLongDate(
                      new Date(
                        selectedSlot.starts_at
                      )
                    )}
                  </p>
                </div>

                <div className="mt-4">
                  <p className="m-0 text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                    Time
                  </p>

                  <p className="mt-1 text-[21px] font-extrabold text-[var(--st-red)]">
                    {formatTimeRange(
                      selectedSlot
                    )}
                  </p>
                </div>

                <div className="mt-4 flex items-center gap-2 text-[10px] text-[var(--st-gray)]">
                  <Clock3 size={14} />
                  {settings.booking_duration_minutes}
                  -minute trial lesson
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-[var(--st-border)] bg-white p-5">
                <div className="flex items-start gap-3">
                  <MapPin
                    size={17}
                    className="mt-0.5 shrink-0 text-[var(--st-red)]"
                  />

                  <div>
                    <p className="m-0 text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--st-red)]">
                      {settings.location_title ??
                        "Our Location"}
                    </p>

                    <p className="mt-2 text-[12px] font-bold text-[var(--st-charcoal-dark)]">
                      {settings.location_name ??
                        settings.center_name}
                    </p>

                    <p className="mt-1 text-[10px] leading-relaxed text-[var(--st-gray)]">
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
                        className="mt-3 inline-flex text-[10px] font-bold text-[var(--st-red)]"
                      >
                        View on Google Maps
                        <ArrowRight
                          size={12}
                          className="ml-1"
                        />
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {settings.arrival_instruction && (
                <div className="mt-4 rounded-xl bg-[#fff7f7] px-4 py-3">
                  <p className="m-0 text-[10px] font-bold text-[var(--st-charcoal-dark)]">
                    Arrival instruction
                  </p>

                  <p className="mt-1 mb-0 text-[10px] leading-relaxed text-[var(--st-gray)]">
                    {
                      settings.arrival_instruction
                    }
                  </p>
                </div>
              )}

              <p className="mt-6 text-center text-[10px] leading-relaxed text-[var(--st-gray)]">
                A confirmation has been sent
                to your email. We&apos;ll also
                contact you on WhatsApp with
                your lesson details.
              </p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (loading || !settings) {
    return (
      <main className="min-h-screen bg-[var(--st-bg)]">
        <div className="flex min-h-screen items-center justify-center">
          <div className="flex items-center gap-2 text-[11px] text-[var(--st-gray)]">
            <Loader2
              size={17}
              className="animate-spin"
            />
            Loading booking page...
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--st-bg)]">
      {/* TOP BAR */}

      <header className="border-b border-[var(--st-border)] bg-white">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between px-5 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--st-red)] text-[11px] font-extrabold text-white">
              ST
            </div>

            <div>
              <p className="m-0 text-[12px] font-bold text-[var(--st-charcoal-dark)]">
                {settings.center_name}
              </p>

              <p className="mt-0.5 mb-0 text-[8px] font-bold tracking-[0.16em] text-[var(--st-gray)]">
                FREE TRIAL LESSONS
              </p>
            </div>
          </div>

          <div className="hidden items-center gap-2 text-[9px] font-semibold text-[var(--st-gray)] sm:flex">
            <Clock3 size={13} />
            {settings.booking_duration_minutes}{" "}
            minutes
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1080px] px-5 py-7 sm:px-8 sm:py-10">
        {/* MAIN GOOGLE-CALENDAR-STYLE CARD */}

        <div className="overflow-hidden rounded-3xl border border-[var(--st-border)] bg-white shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr]">
            {/* LEFT INFORMATION PANEL */}

            <aside className="border-b border-[var(--st-border)] p-6 sm:p-8 lg:border-b-0 lg:border-r">
              <p className="text-[9px] font-bold uppercase tracking-[0.17em] text-[var(--st-red)]">
                {settings.booking_title}
              </p>

              <h1 className="mt-3 text-[28px] font-bold leading-tight tracking-[-0.045em] text-[var(--st-charcoal-dark)] sm:text-[32px]">
                {settings.appointment_name}
              </h1>

              <div className="mt-5 flex items-center gap-2 text-[10px] font-semibold text-[var(--st-gray)]">
                <Clock3 size={14} />
                {settings.booking_duration_minutes}{" "}
                minutes
              </div>

              <div className="mt-6">
                <p className="m-0 text-[11px] leading-[1.75] text-[var(--st-gray)]">
                  {settings.description_intro}
                </p>
              </div>

              {/* OFFER */}

              {settings.offer_enabled &&
                settings.offer_description && (
                  <div className="mt-6 rounded-2xl bg-[var(--st-red)] p-5 text-white">
                    <p className="m-0 text-[9px] font-bold uppercase tracking-[0.12em] text-white/70">
                      SPECIAL OFFER
                    </p>

                    <p className="mt-2 text-[15px] font-bold">
                      {settings.offer_title}
                    </p>

                    {settings.offer_price &&
                      settings.offer_regular_price && (
                        <div className="mt-3 flex items-end gap-2">
                          <span className="text-[24px] font-extrabold">
                            Ksh{" "}
                            {Number(
                              settings.offer_price
                            ).toLocaleString()}
                            /=
                          </span>

                          <span className="mb-1 text-[10px] text-white/60 line-through">
                            Ksh{" "}
                            {Number(
                              settings.offer_regular_price
                            ).toLocaleString()}
                            /=
                          </span>
                        </div>
                      )}

                    <p className="mt-3 text-[9px] leading-relaxed text-white/80">
                      {
                        settings.offer_description
                      }
                    </p>
                  </div>
                )}

              {/* VISIT */}

              {settings.description_visit_items &&
                settings.description_visit_items
                  .length > 0 && (
                  <div className="mt-7">
                    <p className="m-0 text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--st-charcoal-dark)]">
                      {settings.description_visit_title}
                    </p>

                    <div className="mt-3 space-y-2">
                      {settings.description_visit_items.map(
                        (item, index) => (
                          <div
                            key={`${item}-${index}`}
                            className="flex items-start gap-2"
                          >
                            <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--st-bg-soft)] text-[var(--st-red)]">
                              <Check size={9} />
                            </div>

                            <p className="m-0 text-[9px] leading-relaxed text-[var(--st-gray)]">
                              {item}
                            </p>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}

              {/* WHAT TO BRING */}

              {settings.what_to_bring_items &&
                settings.what_to_bring_items
                  .length > 0 && (
                  <div className="mt-7 border-t border-[var(--st-border)] pt-6">
                    <p className="m-0 text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--st-charcoal-dark)]">
                      {settings.what_to_bring_title}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {settings.what_to_bring_items.map(
                        (item, index) => (
                          <span
                            key={`${item}-${index}`}
                            className="rounded-full bg-[var(--st-bg-soft)] px-3 py-2 text-[9px] font-semibold text-[var(--st-gray)]"
                          >
                            {item}
                          </span>
                        )
                      )}
                    </div>
                  </div>
                )}

              {/* PROGRAM */}

              {settings.program_items &&
                settings.program_items
                  .length > 0 && (
                  <div className="mt-7 border-t border-[var(--st-border)] pt-6">
                    <p className="m-0 text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--st-charcoal-dark)]">
                      {settings.program_title}
                    </p>

                    <div className="mt-3 space-y-2">
                      {settings.program_items.map(
                        (item, index) => (
                          <p
                            key={`${item}-${index}`}
                            className="m-0 text-[9px] text-[var(--st-gray)]"
                          >
                            • {item}
                          </p>
                        )
                      )}
                    </div>
                  </div>
                )}

              {/* LOCATION */}

              <div className="mt-7 border-t border-[var(--st-border)] pt-6">
                <div className="flex items-start gap-3">
                  <MapPin
                    size={15}
                    className="mt-0.5 shrink-0 text-[var(--st-red)]"
                  />

                  <div>
                    <p className="m-0 text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--st-charcoal-dark)]">
                      {settings.location_title ??
                        "Our Location"}
                    </p>

                    <p className="mt-2 text-[10px] font-bold text-[var(--st-charcoal-dark)]">
                      {settings.location_name}
                    </p>

                    <p className="mt-1 text-[9px] leading-relaxed text-[var(--st-gray)]">
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
                        className="mt-3 inline-flex text-[9px] font-bold text-[var(--st-red)]"
                      >
                        View on Google Maps
                        <ArrowRight
                          size={11}
                          className="ml-1"
                        />
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* WORKING HOURS */}

              {settings.working_hours_text && (
                <div className="mt-6 rounded-xl bg-[var(--st-bg-soft)] p-4">
                  <p className="m-0 text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--st-charcoal-dark)]">
                    {settings.working_hours_title}
                  </p>

                  <p className="mt-1 mb-0 text-[9px] text-[var(--st-gray)]">
                    {settings.working_hours_text}
                  </p>
                </div>
              )}
            </aside>

            {/* RIGHT BOOKING PANEL */}

            <section className="min-w-0 p-5 sm:p-7">
              {/* STEP 1 */}

              {!selectedSlot && (
                <>
                  <div>
                    <p className="m-0 text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--st-gray)]">
                      STEP 1
                    </p>

                    <h2 className="mt-1 text-[20px] font-bold tracking-[-0.03em] text-[var(--st-charcoal-dark)]">
                      Choose an instrument
                    </h2>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    {(
                      Object.keys(
                        instrumentInfo
                      ) as Instrument[]
                    ).map((item) => {
                      const Icon =
                        instrumentInfo[item]
                          .icon;

                      const selected =
                        instrument ===
                        item;

                      return (
                        <button
                          key={item}
                          type="button"
                          onClick={() =>
                            selectInstrument(
                              item
                            )
                          }
                          className={`rounded-2xl border p-4 text-left transition-all ${
                            selected
                              ? "border-[var(--st-red)] bg-[var(--st-bg-soft)]"
                              : "border-[var(--st-border)] bg-white hover:border-[var(--st-red)]"
                          }`}
                        >
                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                              selected
                                ? "bg-[var(--st-red)] text-white"
                                : "bg-[var(--st-bg-soft)] text-[var(--st-red)]"
                            }`}
                          >
                            <Icon size={18} />
                          </div>

                          <p className="mt-3 mb-0 text-[12px] font-bold text-[var(--st-charcoal-dark)]">
                            {
                              instrumentInfo[
                                item
                              ].name
                            }
                          </p>

                          <p className="mt-1 mb-0 text-[9px] text-[var(--st-gray)]">
                            Free trial lesson
                          </p>
                        </button>
                      );
                    })}
                  </div>

                  {/* CALENDAR */}

                  {instrument && (
                    <div className="mt-8">
                      <div className="flex items-end justify-between">
                        <div>
                          <p className="m-0 text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--st-gray)]">
                            STEP 2
                          </p>

                          <h2 className="mt-1 text-[20px] font-bold tracking-[-0.03em] text-[var(--st-charcoal-dark)]">
                            Choose a date
                          </h2>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={
                              goToPreviousWeek
                            }
                            className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--st-border)] text-[var(--st-charcoal-dark)] hover:bg-[var(--st-bg-soft)]"
                          >
                            <ChevronLeft
                              size={16}
                            />
                          </button>

                          <button
                            type="button"
                            onClick={
                              goToNextWeek
                            }
                            className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--st-border)] text-[var(--st-charcoal-dark)] hover:bg-[var(--st-bg-soft)]"
                          >
                            <ChevronRight
                              size={16}
                            />
                          </button>
                        </div>
                      </div>

                      <p className="mt-2 text-[10px] font-semibold text-[var(--st-gray)]">
                        {formatMonthYear(
                          calendarStart
                        )}
                      </p>

                      <div className="mt-4 grid grid-cols-7 gap-1.5">
                        {visibleCalendarDays.map(
                          (date) => {
                            const key =
                              getDateKey(
                                date
                              );

                            const selected =
                              selectedDateKey ===
                              key;

                            const hasSlots =
                              hasSlotsForDate(
                                date
                              );

                            const today =
                              isSameDate(
                                date,
                                getTodayInNairobi()
                              );

                            return (
                              <button
                                key={key}
                                type="button"
                                disabled={
                                  !hasSlots
                                }
                                onClick={() =>
                                  selectDate(
                                    date
                                  )
                                }
                                className={`flex min-h-[72px] flex-col items-center justify-center rounded-xl border transition-all ${
                                  selected
                                    ? "border-[var(--st-red)] bg-[var(--st-red)] text-white"
                                    : hasSlots
                                    ? "border-[var(--st-border)] bg-white hover:border-[var(--st-red)] hover:bg-[var(--st-bg-soft)]"
                                    : "cursor-not-allowed border-transparent bg-[var(--st-bg-soft)] opacity-40"
                                }`}
                              >
                                <span
                                  className={`text-[8px] font-bold ${
                                    selected
                                      ? "text-white/70"
                                      : "text-[var(--st-gray)]"
                                  }`}
                                >
                                  {getCalendarDayLabel(
                                    date
                                  )}
                                </span>

                                <span
                                  className={`mt-1 text-[19px] font-bold ${
                                    selected
                                      ? "text-white"
                                      : "text-[var(--st-charcoal-dark)]"
                                  }`}
                                >
                                  {getCalendarDayNumber(
                                    date
                                  )}
                                </span>

                                {today && (
                                  <span
                                    className={`mt-1 text-[7px] font-bold ${
                                      selected
                                        ? "text-white/70"
                                        : "text-[var(--st-red)]"
                                    }`}
                                  >
                                    TODAY
                                  </span>
                                )}
                              </button>
                            );
                          }
                        )}
                      </div>

                      {/* TIME SELECTION */}

                      {selectedDateKey && (
                        <div className="mt-7">
                          <div className="flex items-end justify-between">
                            <div>
                              <p className="m-0 text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--st-gray)]">
                                STEP 3
                              </p>

                              <h2 className="mt-1 text-[20px] font-bold tracking-[-0.03em] text-[var(--st-charcoal-dark)]">
                                Choose a time
                              </h2>
                            </div>

                            {selectedCalendarDate && (
                              <p className="text-[9px] font-semibold text-[var(--st-gray)]">
                                {formatDate(
                                  selectedCalendarDate
                                )}
                              </p>
                            )}
                          </div>

                          {selectedDateSlots.length ===
                          0 ? (
                            <div className="mt-4 rounded-2xl bg-[var(--st-bg-soft)] p-6 text-center">
                              <p className="m-0 text-[11px] font-bold text-[var(--st-charcoal-dark)]">
                                No times available
                              </p>

                              <p className="mt-1 mb-0 text-[9px] text-[var(--st-gray)]">
                                Please choose another
                                date.
                              </p>
                            </div>
                          ) : (
                            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                              {selectedDateSlots.map(
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
                                    <span className="block text-[11px] font-bold text-[var(--st-charcoal-dark)]">
                                      {formatTime(
                                        slot.starts_at
                                      )}
                                    </span>

                                    <span className="mt-1 block text-[8px] text-[var(--st-gray)]">
                                      {settings.booking_duration_minutes}{" "}
                                      min
                                    </span>
                                  </button>
                                )
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {!instrument && (
                    <div className="mt-8 rounded-2xl bg-[var(--st-bg-soft)] p-6 text-center">
                      <p className="m-0 text-[11px] font-bold text-[var(--st-charcoal-dark)]">
                        Select an instrument to see
                        available times.
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* CUSTOMER DETAILS */}

              {selectedSlot &&
                instrument && (
                  <div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSlot(
                          null
                        );
                        setError("");
                      }}
                      className="mb-6 flex items-center gap-2 text-[10px] font-bold text-[var(--st-gray)]"
                    >
                      <ArrowLeft
                        size={13}
                      />
                      Change date or time
                    </button>

                    <p className="m-0 text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--st-gray)]">
                      STEP 4
                    </p>

                    <h2 className="mt-1 text-[22px] font-bold tracking-[-0.03em] text-[var(--st-charcoal-dark)]">
                      Enter your details
                    </h2>

                    {/* SELECTED APPOINTMENT */}

                    <div className="mt-5 rounded-2xl bg-[var(--st-bg-soft)] p-5">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--st-red)] text-white">
                          {instrument ===
                          "piano" ? (
                            <Music2
                              size={17}
                            />
                          ) : (
                            <Guitar
                              size={17}
                            />
                          )}
                        </div>

                        <div>
                          <p className="m-0 text-[12px] font-bold text-[var(--st-charcoal-dark)]">
                            {
                              instrumentInfo[
                                instrument
                              ].name
                            }{" "}
                            Trial Lesson
                          </p>

                          <p className="mt-1 text-[10px] font-semibold text-[var(--st-charcoal-dark)]">
                            {formatLongDate(
                              new Date(
                                selectedSlot.starts_at
                              )
                            )}
                          </p>

                          <p className="mt-1 text-[12px] font-bold text-[var(--st-red)]">
                            {formatTimeRange(
                              selectedSlot
                            )}
                          </p>

                          <p className="mt-1 text-[8px] text-[var(--st-gray)]">
                            {
                              settings.booking_duration_minutes
                            }{" "}
                            minutes · Free trial
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-7 space-y-5">
                      {/* NAME */}

                      <div>
                        <label className="mb-2 block text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--st-charcoal)]">
                          Full name
                        </label>

                        <div className="relative">
                          <User
                            size={15}
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
                            className="w-full rounded-xl border border-[var(--st-border)] bg-white py-3.5 pl-11 pr-4 text-[11px] outline-none focus:border-[var(--st-red)] focus:ring-2 focus:ring-[var(--st-red)]/10"
                          />
                        </div>
                      </div>

                      {/* EMAIL */}

                      <div>
                        <label className="mb-2 block text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--st-charcoal)]">
                          Email address
                        </label>

                        <div className="relative">
                          <Mail
                            size={15}
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
                            className="w-full rounded-xl border border-[var(--st-border)] bg-white py-3.5 pl-11 pr-4 text-[11px] outline-none focus:border-[var(--st-red)] focus:ring-2 focus:ring-[var(--st-red)]/10"
                          />
                        </div>
                      </div>

                      {/* WHATSAPP */}

                      <div>
                        <label className="mb-2 block text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--st-charcoal)]">
                          WhatsApp number
                        </label>

                        <div className="relative">
                          <Phone
                            size={15}
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
                            className="w-full rounded-xl border border-[var(--st-border)] bg-white py-3.5 pl-11 pr-4 text-[11px] outline-none focus:border-[var(--st-red)] focus:ring-2 focus:ring-[var(--st-red)]/10"
                          />
                        </div>

                        <p className="mt-2 mb-0 text-[8px] text-[var(--st-gray)]">
                          We&apos;ll use this number
                          to contact you about your
                          trial lesson.
                        </p>
                      </div>
                    </div>

                    {/* ERROR */}

                    {error && (
                      <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                        <p className="m-0 text-[9px] leading-relaxed text-red-700">
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
                      className="st-button st-button-primary mt-6 w-full disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {submitting ? (
                        <>
                          <Loader2
                            size={14}
                            className="animate-spin"
                          />
                          Confirming booking...
                        </>
                      ) : (
                        <>
                          Confirm booking
                          <ArrowRight
                            size={14}
                          />
                        </>
                      )}
                    </button>

                    <p className="mt-4 text-center text-[8px] leading-relaxed text-[var(--st-gray)]">
                      By booking this appointment,
                      you agree that{" "}
                      {
                        settings.center_name
                      }{" "}
                      may contact you regarding
                      your trial lesson and learning
                      program.
                    </p>
                  </div>
                )}
            </section>
          </div>
        </div>

        {/* ARRIVAL */}

        {settings.arrival_instruction && (
          <div className="mx-auto mt-5 max-w-[700px] rounded-2xl border border-[var(--st-border)] bg-white px-5 py-4 text-center">
            <p className="m-0 text-[9px] font-bold text-[var(--st-charcoal-dark)]">
              Before your visit
            </p>

            <p className="mt-1 mb-0 text-[9px] text-[var(--st-gray)]">
              {
                settings.arrival_instruction
              }
            </p>
          </div>
        )}

        <div className="mx-auto mt-5 max-w-[700px] text-center">
          <p className="m-0 text-[8px] leading-relaxed text-[var(--st-gray)]">
            Available appointments are shown in
            Nairobi time. Booking availability is
            subject to the current lesson schedule.
          </p>
        </div>
      </div>
    </main>
  );
}