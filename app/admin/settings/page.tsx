"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
  Clock3,
  Guitar,
  Loader2,
  MapPin,
  MessageCircle,
  Music2,
  RefreshCw,
  Save,
  Settings,
  Mail,
  FileText,
  Gift,
  BookOpen,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

type DaySchedule = {
  day: string;
  short: string;
  enabled: boolean;
  start: string;
  end: string;
};

type BookingSettings = {
  id: boolean | string;

  center_name: string;
  address: string;

  booking_duration_minutes: number;
  availability_days: number;

  booking_title: string;
  appointment_name: string;
  timezone: string;

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

  minimum_notice_hours: number;
  maximum_days_ahead: number;

  reminder_24h_enabled: boolean;
  reminder_2h_enabled: boolean;
  follow_up_enabled: boolean;

  updated_at?: string;
};

const defaultSchedule: DaySchedule[] = [
  {
    day: "Monday",
    short: "MON",
    enabled: true,
    start: "08:00",
    end: "19:00",
  },
  {
    day: "Tuesday",
    short: "TUE",
    enabled: true,
    start: "08:00",
    end: "19:00",
  },
  {
    day: "Wednesday",
    short: "WED",
    enabled: true,
    start: "08:00",
    end: "19:00",
  },
  {
    day: "Thursday",
    short: "THU",
    enabled: true,
    start: "08:00",
    end: "19:00",
  },
  {
    day: "Friday",
    short: "FRI",
    enabled: true,
    start: "08:00",
    end: "19:00",
  },
  {
    day: "Saturday",
    short: "SAT",
    enabled: true,
    start: "09:00",
    end: "12:00",
  },
  {
    day: "Sunday",
    short: "SUN",
    enabled: false,
    start: "09:00",
    end: "12:00",
  },
];

const defaultSettings: BookingSettings = {
  id: true,

  center_name: "Sauti Tamu Piano Center",

  address:
    "Junction Trade Center, 4th Floor, Room F401, Above Equity Bank Tearoom Branch, Nairobi CBD",

  booking_duration_minutes: 60,
  availability_days: 14,

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
    "Students who book, attend their FREE Trial Lesson this week, and enroll on the same day qualify for our special course fee of Ksh 18,850/= instead of the regular Ksh 26,850/=. ",

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

  reminder_24h_enabled: true,

  reminder_2h_enabled: true,

  follow_up_enabled: true,
};

function timeToMinutes(time: string) {
  const [hours, minutes] = time
    .split(":")
    .map(Number);

  return hours * 60 + minutes;
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatTime(time: string) {
  const [hour, minute] = time
    .split(":")
    .map(Number);

  const suffix = hour >= 12 ? "PM" : "AM";

  const displayHour =
    hour % 12 === 0 ? 12 : hour % 12;

  return `${displayHour}:${String(
    minute
  ).padStart(2, "0")} ${suffix}`;
}

function arrayToText(items: string[]) {
  return items.join("\n");
}

function textToArray(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function SettingsPage() {
  const [settings, setSettings] =
    useState<BookingSettings>(
      defaultSettings
    );

  const [schedule, setSchedule] =
    useState<DaySchedule[]>(
      defaultSchedule
    );

  const [piano, setPiano] =
    useState(true);

  const [guitar, setGuitar] =
    useState(true);

  const [loadingSettings, setLoadingSettings] =
    useState(true);

  const [savingSettings, setSavingSettings] =
    useState(false);

  const [generating, setGenerating] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  useEffect(() => {
    loadBookingSettings();
  }, []);

  async function loadBookingSettings() {
    setLoadingSettings(true);
    setError("");

    const {
      data,
      error: loadError,
    } = await supabase
      .from("booking_settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (loadError) {
      console.error(
        "Booking settings load error:",
        loadError
      );

      setError(
        "Could not load booking page settings."
      );

      setLoadingSettings(false);
      return;
    }

    if (data) {
      setSettings((current) => ({
        ...current,
        ...data,

        description_visit_items:
          Array.isArray(
            data.description_visit_items
          )
            ? data.description_visit_items
            : current.description_visit_items,

        what_to_bring_items:
          Array.isArray(
            data.what_to_bring_items
          )
            ? data.what_to_bring_items
            : current.what_to_bring_items,

        program_items:
          Array.isArray(
            data.program_items
          )
            ? data.program_items
            : current.program_items,
      }));
    }

    setLoadingSettings(false);
  }

  function updateSetting<
    K extends keyof BookingSettings
  >(
    key: K,
    value: BookingSettings[K]
  ) {
    setSettings((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function saveBookingSettings() {
    setSavingSettings(true);
    setMessage("");
    setError("");

    try {
      const payload = {
        center_name:
          settings.center_name,

        address:
          settings.address,

        booking_duration_minutes:
          settings.booking_duration_minutes,

        availability_days:
          settings.maximum_days_ahead,

        booking_title:
          settings.booking_title,

        appointment_name:
          settings.appointment_name,

        timezone:
          settings.timezone,

        description_intro:
          settings.description_intro,

        description_visit_title:
          settings.description_visit_title,

        description_visit_items:
          settings.description_visit_items,

        offer_enabled:
          settings.offer_enabled,

        offer_title:
          settings.offer_title,

        offer_price:
          settings.offer_price,

        offer_regular_price:
          settings.offer_regular_price,

        offer_description:
          settings.offer_description,

        what_to_bring_title:
          settings.what_to_bring_title,

        what_to_bring_items:
          settings.what_to_bring_items,

        working_hours_title:
          settings.working_hours_title,

        working_hours_text:
          settings.working_hours_text,

        program_title:
          settings.program_title,

        program_items:
          settings.program_items,

        location_title:
          settings.location_title,

        location_name:
          settings.location_name,

        location_address:
          settings.location_address,

        location_landmark:
          settings.location_landmark,

        location_maps_url:
          settings.location_maps_url,

        arrival_instruction:
          settings.arrival_instruction,

        minimum_notice_hours:
          settings.minimum_notice_hours,

        maximum_days_ahead:
          settings.maximum_days_ahead,

        reminder_24h_enabled:
          settings.reminder_24h_enabled,

        reminder_2h_enabled:
          settings.reminder_2h_enabled,

        follow_up_enabled:
          settings.follow_up_enabled,

        updated_at:
          new Date().toISOString(),
      };

      const {
        data: existing,
        error: findError,
      } = await supabase
        .from("booking_settings")
        .select("id")
        .limit(1)
        .maybeSingle();

      if (findError) {
        throw findError;
      }

      let saveError;

      if (existing?.id) {
        const result =
          await supabase
            .from("booking_settings")
            .update(payload)
            .eq(
              "id",
              existing.id
            );

        saveError =
          result.error;
      } else {
        const result =
          await supabase
            .from("booking_settings")
            .insert(payload);

        saveError =
          result.error;
      }

      if (saveError) {
        throw saveError;
      }

      setMessage(
        "Booking page settings saved successfully."
      );
    } catch (err) {
      console.error(
        "Save settings error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to save settings."
      );
    } finally {
      setSavingSettings(false);
    }
  }

  const weeklySlotCount = useMemo(() => {
    let count = 0;

    schedule.forEach((day) => {
      if (!day.enabled) return;

      const start =
        timeToMinutes(day.start);

      const end =
        timeToMinutes(day.end);

      const hourlySlots =
        Math.max(
          0,
          Math.floor(
            (end - start) / 60
          )
        );

      const instruments =
        Number(piano) +
        Number(guitar);

      count +=
        hourlySlots *
        instruments;
    });

    return count;
  }, [
    schedule,
    piano,
    guitar,
  ]);

  function updateDay(
    index: number,
    changes: Partial<DaySchedule>
  ) {
    setSchedule((current) =>
      current.map(
        (day, dayIndex) =>
          dayIndex === index
            ? {
                ...day,
                ...changes,
              }
            : day
      )
    );
  }

  async function generateFourWeeks() {
    setGenerating(true);
    setMessage("");
    setError("");

    try {
      const instruments: Array<
        "piano" | "guitar"
      > = [];

      if (piano) {
        instruments.push("piano");
      }

      if (guitar) {
        instruments.push("guitar");
      }

      if (
        instruments.length === 0
      ) {
        throw new Error(
          "Select at least one instrument."
        );
      }

      const today = new Date();

      today.setHours(
        0,
        0,
        0,
        0
      );

      const endDate =
        addDays(today, 28);

      const {
        data: existingSlots,
        error: fetchError,
      } = await supabase
        .from("lesson_slots")
        .select(
          "instrument, starts_at"
        )
        .gte(
          "starts_at",
          today.toISOString()
        )
        .lt(
          "starts_at",
          endDate.toISOString()
        );

      if (fetchError) {
        throw fetchError;
      }

      const existingKeys =
        new Set(
          (
            existingSlots ?? []
          ).map(
            (slot) =>
              `${slot.instrument}|${new Date(
                slot.starts_at
              ).getTime()}`
          )
        );

      const newSlots: {
        instrument:
          | "piano"
          | "guitar";
        starts_at: string;
        ends_at: string;
        is_available: boolean;
      }[] = [];

      for (
        let current = new Date(
          today
        );
        current < endDate;
        current = addDays(
          current,
          1
        )
      ) {
        const dayIndex =
          current.getDay();

        const scheduleIndex =
          dayIndex === 0
            ? 6
            : dayIndex - 1;

        const daySchedule =
          schedule[
            scheduleIndex
          ];

        if (
          !daySchedule?.enabled
        ) {
          continue;
        }

        const startMinutes =
          timeToMinutes(
            daySchedule.start
          );

        const endMinutes =
          timeToMinutes(
            daySchedule.end
          );

        for (
          let minutes =
            startMinutes;
          minutes < endMinutes;
          minutes += 60
        ) {
          const hour =
            Math.floor(
              minutes / 60
            );

          const minute =
            minutes % 60;

          for (
            const instrument of instruments
          ) {
            const startsAt =
              new Date(
                current
              );

            startsAt.setHours(
              hour,
              minute,
              0,
              0
            );

            const endsAt =
              new Date(
                startsAt
              );

            endsAt.setMinutes(
              endsAt.getMinutes() +
                settings.booking_duration_minutes
            );

            const key = `${instrument}|${startsAt.getTime()}`;

            if (
              existingKeys.has(
                key
              )
            ) {
              continue;
            }

            newSlots.push({
              instrument,
              starts_at:
                startsAt.toISOString(),
              ends_at:
                endsAt.toISOString(),
              is_available: true,
            });

            existingKeys.add(key);
          }
        }
      }

      if (
        newSlots.length === 0
      ) {
        setMessage(
          "Availability is already generated for the next 4 weeks."
        );

        return;
      }

      const batchSize = 100;

      for (
        let index = 0;
        index <
        newSlots.length;
        index += batchSize
      ) {
        const batch =
          newSlots.slice(
            index,
            index +
              batchSize
          );

        const {
          error: insertError,
        } = await supabase
          .from("lesson_slots")
          .insert(batch);

        if (insertError) {
          throw insertError;
        }
      }

      setMessage(
        `${newSlots.length} new trial slots generated for the next 4 weeks.`
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to generate availability."
      );
    } finally {
      setGenerating(false);
    }
  }

  if (loadingSettings) {
    return (
      <main className="st-content">
        <div className="st-card flex min-h-[300px] items-center justify-center gap-2">
          <Loader2
            size={18}
            className="animate-spin text-[var(--st-red)]"
          />

          <span className="text-[11px] text-[var(--st-gray)]">
            Loading settings...
          </span>
        </div>
      </main>
    );
  }

  return (
    <main className="st-content">

      {/* HEADER */}

      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">

        <div>
          <p className="st-eyebrow">
            SYSTEM
          </p>

          <h1 className="st-page-title mt-2">
            Settings
          </h1>

          <p className="st-page-description">
            Manage the booking experience,
            availability and automated
            communication for Sauti Tamu.
          </p>
        </div>

        <button
          type="button"
          onClick={saveBookingSettings}
          disabled={savingSettings}
          className="st-button st-button-primary w-fit"
        >
          {savingSettings ? (
            <>
              <Loader2
                size={14}
                className="animate-spin"
              />
              Saving...
            </>
          ) : (
            <>
              <Save size={14} />
              Save all settings
            </>
          )}
        </button>

      </div>

      {/* GENERAL BOOKING SETTINGS */}

      <section className="st-card overflow-hidden">

        <div className="border-b border-[var(--st-border)] px-5 py-5 sm:px-6">

          <div className="flex items-start gap-3">

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--st-bg-soft)] text-[var(--st-red)]">
              <CalendarDays size={18} />
            </div>

            <div>
              <h2 className="st-section-title">
                Booking page
              </h2>

              <p className="mt-1 mb-0 text-[10px] leading-relaxed text-[var(--st-gray)]">
                These settings control the main
                information customers see when
                they open the booking page.
              </p>
            </div>

          </div>

        </div>

        <div className="grid grid-cols-1 gap-5 p-5 sm:p-6 lg:grid-cols-2">

          <div>
            <label className="st-label">
              Booking title
            </label>

            <input
              type="text"
              value={
                settings.booking_title
              }
              onChange={(e) =>
                updateSetting(
                  "booking_title",
                  e.target.value
                )
              }
              className="st-input"
            />
          </div>

          <div>
            <label className="st-label">
              Appointment name
            </label>

            <input
              type="text"
              value={
                settings.appointment_name
              }
              onChange={(e) =>
                updateSetting(
                  "appointment_name",
                  e.target.value
                )
              }
              className="st-input"
            />
          </div>

          <div>
            <label className="st-label">
              Center name
            </label>

            <input
              type="text"
              value={
                settings.center_name
              }
              onChange={(e) =>
                updateSetting(
                  "center_name",
                  e.target.value
                )
              }
              className="st-input"
            />
          </div>

          <div>
            <label className="st-label">
              Timezone
            </label>

            <select
              value={
                settings.timezone
              }
              onChange={(e) =>
                updateSetting(
                  "timezone",
                  e.target.value
                )
              }
              className="st-input"
            >
              <option value="Africa/Nairobi">
                Africa/Nairobi
              </option>
              <option value="UTC">
                UTC
              </option>
            </select>
          </div>

          <div>
            <label className="st-label">
              Lesson duration
            </label>

            <select
              value={
                settings.booking_duration_minutes
              }
              onChange={(e) =>
                updateSetting(
                  "booking_duration_minutes",
                  Number(
                    e.target.value
                  )
                )
              }
              className="st-input"
            >
              <option value={30}>
                30 minutes
              </option>
              <option value={45}>
                45 minutes
              </option>
              <option value={60}>
                60 minutes
              </option>
              <option value={90}>
                90 minutes
              </option>
              <option value={120}>
                120 minutes
              </option>
            </select>
          </div>

          <div>
            <label className="st-label">
              Minimum booking notice
            </label>

            <select
              value={
                settings.minimum_notice_hours
              }
              onChange={(e) =>
                updateSetting(
                  "minimum_notice_hours",
                  Number(
                    e.target.value
                  )
                )
              }
              className="st-input"
            >
              <option value={0}>
                No minimum notice
              </option>
              <option value={1}>
                1 hour
              </option>
              <option value={2}>
                2 hours
              </option>
              <option value={4}>
                4 hours
              </option>
              <option value={6}>
                6 hours
              </option>
              <option value={12}>
                12 hours
              </option>
              <option value={24}>
                24 hours
              </option>
              <option value={48}>
                48 hours
              </option>
            </select>

            <p className="st-help">
              Customers cannot book a lesson
              within this period before it starts.
            </p>
          </div>

          <div>
            <label className="st-label">
              Maximum days ahead
            </label>

            <select
              value={
                settings.maximum_days_ahead
              }
              onChange={(e) =>
                updateSetting(
                  "maximum_days_ahead",
                  Number(
                    e.target.value
                  )
                )
              }
              className="st-input"
            >
              <option value={7}>
                Next 7 days
              </option>
              <option value={14}>
                Next 14 days
              </option>
              <option value={21}>
                Next 21 days
              </option>
              <option value={28}>
                Next 28 days
              </option>
              <option value={30}>
                Next 30 days
              </option>
              <option value={60}>
                Next 60 days
              </option>
            </select>
          </div>

          <div className="lg:col-span-2">
            <label className="st-label">
              Booking page description
            </label>

            <textarea
              value={
                settings.description_intro
              }
              onChange={(e) =>
                updateSetting(
                  "description_intro",
                  e.target.value
                )
              }
              rows={5}
              className="st-textarea"
            />
          </div>

        </div>

      </section>

      {/* VISIT DESCRIPTION */}

      <section className="st-card mt-5 p-5 sm:p-6">

        <div className="flex items-start gap-3">

          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--st-bg-soft)] text-[var(--st-red)]">
            <FileText size={18} />
          </div>

          <div>
            <h2 className="st-section-title">
              During the visit
            </h2>

            <p className="mt-1 text-[10px] text-[var(--st-gray)]">
              Explain what the student should
              expect during the free trial.
            </p>
          </div>

        </div>

        <div className="mt-5 space-y-5">

          <div>
            <label className="st-label">
              Section title
            </label>

            <input
              type="text"
              value={
                settings.description_visit_title
              }
              onChange={(e) =>
                updateSetting(
                  "description_visit_title",
                  e.target.value
                )
              }
              className="st-input"
            />
          </div>

          <div>
            <label className="st-label">
              What students will experience
            </label>

            <textarea
              value={arrayToText(
                settings.description_visit_items
              )}
              onChange={(e) =>
                updateSetting(
                  "description_visit_items",
                  textToArray(
                    e.target.value
                  )
                )
              }
              rows={7}
              className="st-textarea"
              placeholder="One item per line"
            />

            <p className="st-help">
              Put each item on a separate line.
            </p>
          </div>

        </div>

      </section>

      {/* SPECIAL OFFER */}

      <section className="st-card mt-5 overflow-hidden">

        <div className="border-b border-[var(--st-border)] p-5 sm:p-6">

          <div className="flex items-start justify-between gap-4">

            <div className="flex items-start gap-3">

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--st-bg-soft)] text-[var(--st-red)]">
                <Gift size={18} />
              </div>

              <div>
                <h2 className="st-section-title">
                  Special offer
                </h2>

                <p className="mt-1 text-[10px] text-[var(--st-gray)]">
                  Control the promotional offer
                  displayed on the booking page.
                </p>
              </div>

            </div>

            <button
              type="button"
              onClick={() =>
                updateSetting(
                  "offer_enabled",
                  !settings.offer_enabled
                )
              }
              className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${
                settings.offer_enabled
                  ? "bg-[var(--st-red)]"
                  : "bg-[#d7d2d2]"
              }`}
            >
              <span
                className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                  settings.offer_enabled
                    ? "translate-x-5"
                    : "translate-x-1"
                }`}
              />
            </button>

          </div>

        </div>

        {settings.offer_enabled && (
          <div className="grid grid-cols-1 gap-5 p-5 sm:p-6 lg:grid-cols-2">

            <div className="lg:col-span-2">
              <label className="st-label">
                Offer title
              </label>

              <input
                type="text"
                value={
                  settings.offer_title
                }
                onChange={(e) =>
                  updateSetting(
                    "offer_title",
                    e.target.value
                  )
                }
                className="st-input"
              />
            </div>

            <div>
              <label className="st-label">
                Special price
              </label>

              <input
                type="text"
                value={
                  settings.offer_price
                }
                onChange={(e) =>
                  updateSetting(
                    "offer_price",
                    e.target.value
                  )
                }
                className="st-input"
                placeholder="18850"
              />
            </div>

            <div>
              <label className="st-label">
                Regular price
              </label>

              <input
                type="text"
                value={
                  settings.offer_regular_price
                }
                onChange={(e) =>
                  updateSetting(
                    "offer_regular_price",
                    e.target.value
                  )
                }
                className="st-input"
                placeholder="26850"
              />
            </div>

            <div className="lg:col-span-2">
              <label className="st-label">
                Offer description
              </label>

              <textarea
                value={
                  settings.offer_description
                }
                onChange={(e) =>
                  updateSetting(
                    "offer_description",
                    e.target.value
                  )
                }
                rows={4}
                className="st-textarea"
              />
            </div>

          </div>
        )}

      </section>

      {/* PROGRAMME + WHAT TO BRING */}

      <section className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">

        <div className="st-card p-5 sm:p-6">

          <div className="flex items-start gap-3">

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--st-bg-soft)] text-[var(--st-red)]">
              <BookOpen size={18} />
            </div>

            <div>
              <h2 className="st-section-title">
                Programme
              </h2>

              <p className="mt-1 text-[10px] text-[var(--st-gray)]">
                Show students what their course
                fee includes.
              </p>
            </div>

          </div>

          <div className="mt-5 space-y-5">

            <div>
              <label className="st-label">
                Section title
              </label>

              <input
                type="text"
                value={
                  settings.program_title
                }
                onChange={(e) =>
                  updateSetting(
                    "program_title",
                    e.target.value
                  )
                }
                className="st-input"
              />
            </div>

            <div>
              <label className="st-label">
                Programme items
              </label>

              <textarea
                value={arrayToText(
                  settings.program_items
                )}
                onChange={(e) =>
                  updateSetting(
                    "program_items",
                    textToArray(
                      e.target.value
                    )
                  )
                }
                rows={7}
                className="st-textarea"
                placeholder="One item per line"
              />
            </div>

          </div>

        </div>

        <div className="st-card p-5 sm:p-6">

          <div className="flex items-start gap-3">

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--st-bg-soft)] text-[var(--st-red)]">
              <Music2 size={18} />
            </div>

            <div>
              <h2 className="st-section-title">
                What to bring
              </h2>

              <p className="mt-1 text-[10px] text-[var(--st-gray)]">
                Tell students what they should
                bring to their lesson.
              </p>
            </div>

          </div>

          <div className="mt-5 space-y-5">

            <div>
              <label className="st-label">
                Section title
              </label>

              <input
                type="text"
                value={
                  settings.what_to_bring_title
                }
                onChange={(e) =>
                  updateSetting(
                    "what_to_bring_title",
                    e.target.value
                  )
                }
                className="st-input"
              />
            </div>

            <div>
              <label className="st-label">
                Items
              </label>

              <textarea
                value={arrayToText(
                  settings.what_to_bring_items
                )}
                onChange={(e) =>
                  updateSetting(
                    "what_to_bring_items",
                    textToArray(
                      e.target.value
                    )
                  )
                }
                rows={7}
                className="st-textarea"
                placeholder="One item per line"
              />
            </div>

          </div>

        </div>

      </section>

      {/* WORKING HOURS */}

      <section className="st-card mt-5 p-5 sm:p-6">

        <div className="flex items-start gap-3">

          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--st-bg-soft)] text-[var(--st-red)]">
            <Clock3 size={18} />
          </div>

          <div>
            <h2 className="st-section-title">
              Working hours
            </h2>

            <p className="mt-1 text-[10px] text-[var(--st-gray)]">
              This is informational text displayed
              to customers. Actual booking slots come
              from the weekly availability below.
            </p>
          </div>

        </div>

        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">

          <div>
            <label className="st-label">
              Section title
            </label>

            <input
              type="text"
              value={
                settings.working_hours_title
              }
              onChange={(e) =>
                updateSetting(
                  "working_hours_title",
                  e.target.value
                )
              }
              className="st-input"
            />
          </div>

          <div>
            <label className="st-label">
              Working hours
            </label>

            <input
              type="text"
              value={
                settings.working_hours_text
              }
              onChange={(e) =>
                updateSetting(
                  "working_hours_text",
                  e.target.value
                )
              }
              className="st-input"
            />
          </div>

        </div>

      </section>

      {/* LOCATION */}

      <section className="st-card mt-5 p-5 sm:p-6">

        <div className="flex items-start gap-3">

          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--st-bg-soft)] text-[var(--st-red)]">
            <MapPin size={18} />
          </div>

          <div>
            <h2 className="st-section-title">
              Location
            </h2>

            <p className="mt-1 text-[10px] text-[var(--st-gray)]">
              The address and arrival information
              customers receive after booking.
            </p>
          </div>

        </div>

        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">

          <div>
            <label className="st-label">
              Section title
            </label>

            <input
              type="text"
              value={
                settings.location_title
              }
              onChange={(e) =>
                updateSetting(
                  "location_title",
                  e.target.value
                )
              }
              className="st-input"
            />
          </div>

          <div>
            <label className="st-label">
              Location name
            </label>

            <input
              type="text"
              value={
                settings.location_name
              }
              onChange={(e) =>
                updateSetting(
                  "location_name",
                  e.target.value
                )
              }
              className="st-input"
            />
          </div>

          <div>
            <label className="st-label">
              Address
            </label>

            <input
              type="text"
              value={
                settings.location_address
              }
              onChange={(e) =>
                updateSetting(
                  "location_address",
                  e.target.value
                )
              }
              className="st-input"
            />
          </div>

          <div>
            <label className="st-label">
              Landmark
            </label>

            <input
              type="text"
              value={
                settings.location_landmark
              }
              onChange={(e) =>
                updateSetting(
                  "location_landmark",
                  e.target.value
                )
              }
              className="st-input"
            />
          </div>

          <div className="lg:col-span-2">
            <label className="st-label">
              Google Maps / Maps link
            </label>

            <input
              type="url"
              value={
                settings.location_maps_url
              }
              onChange={(e) =>
                updateSetting(
                  "location_maps_url",
                  e.target.value
                )
              }
              className="st-input"
              placeholder="https://..."
            />
          </div>

          <div className="lg:col-span-2">
            <label className="st-label">
              Arrival instruction
            </label>

            <input
              type="text"
              value={
                settings.arrival_instruction
              }
              onChange={(e) =>
                updateSetting(
                  "arrival_instruction",
                  e.target.value
                )
              }
              className="st-input"
            />
          </div>

        </div>

      </section>

      {/* WEEKLY AVAILABILITY */}

      <section className="st-card mt-5 overflow-hidden">

        <div className="border-b border-[var(--st-border)] px-5 py-5 sm:px-6">

          <div className="flex items-start gap-3">

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--st-bg-soft)] text-[var(--st-red)]">
              <CalendarDays size={18} />
            </div>

            <div>
              <h2 className="st-section-title">
                Weekly availability
              </h2>

              <p className="mt-1 max-w-[550px] text-[10px] leading-relaxed text-[var(--st-gray)]">
                This schedule repeats every week.
                Trial slots are generated from
                these hours.
              </p>
            </div>

          </div>

        </div>

        <div className="divide-y divide-[var(--st-border)]">

          {schedule.map(
            (day, index) => (
              <div
                key={day.day}
                className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:px-6"
              >

                <div className="flex w-full items-center gap-3 sm:w-[150px]">

                  <button
                    type="button"
                    onClick={() =>
                      updateDay(
                        index,
                        {
                          enabled:
                            !day.enabled,
                        }
                      )
                    }
                    className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${
                      day.enabled
                        ? "bg-[var(--st-red)]"
                        : "bg-[#d7d2d2]"
                    }`}
                  >
                    <span
                      className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                        day.enabled
                          ? "translate-x-5"
                          : "translate-x-1"
                      }`}
                    />
                  </button>

                  <div>
                    <p className="m-0 text-[11px] font-bold text-[var(--st-charcoal-dark)]">
                      {day.day}
                    </p>

                    <p className="mt-1 text-[8px] font-bold tracking-[0.12em] text-[var(--st-gray)]">
                      {day.short}
                    </p>
                  </div>

                </div>

                {day.enabled ? (
                  <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">

                    <div className="flex items-center gap-2">

                      <Clock3
                        size={14}
                        className="text-[var(--st-red)]"
                      />

                      <input
                        type="time"
                        value={
                          day.start
                        }
                        onChange={(e) =>
                          updateDay(
                            index,
                            {
                              start:
                                e.target
                                  .value,
                            }
                          )
                        }
                        className="rounded-lg border border-[var(--st-border)] bg-white px-3 py-2 text-[11px] font-semibold text-[var(--st-charcoal-dark)] outline-none focus:border-[var(--st-red)]"
                      />

                      <span className="text-[10px] text-[var(--st-gray)]">
                        to
                      </span>

                      <input
                        type="time"
                        value={
                          day.end
                        }
                        onChange={(e) =>
                          updateDay(
                            index,
                            {
                              end:
                                e.target
                                  .value,
                            }
                          )
                        }
                        className="rounded-lg border border-[var(--st-border)] bg-white px-3 py-2 text-[11px] font-semibold text-[var(--st-charcoal-dark)] outline-none focus:border-[var(--st-red)]"
                      />

                    </div>

                    <span className="text-[9px] text-[var(--st-gray)]">
                      {formatTime(
                        day.start
                      )}
                      {" – "}
                      {formatTime(
                        day.end
                      )}
                    </span>

                  </div>
                ) : (
                  <div className="flex-1">
                    <span className="text-[10px] font-semibold text-[var(--st-gray)]">
                      Closed
                    </span>
                  </div>
                )}

              </div>
            )
          )}

        </div>

      </section>

      {/* INSTRUMENTS + DURATION */}

      <section className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">

        <div className="st-card p-5 sm:p-6">

          <div className="flex items-start gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--st-bg-soft)] text-[var(--st-red)]">
              <Music2 size={18} />
            </div>

            <div>
              <h2 className="st-section-title">
                Trial instruments
              </h2>

              <p className="mt-1 text-[10px] text-[var(--st-gray)]">
                Each available hour gets one
                slot per selected instrument.
              </p>
            </div>

          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">

            <button
              type="button"
              onClick={() =>
                setPiano(!piano)
              }
              className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-all ${
                piano
                  ? "border-[var(--st-red)] bg-[var(--st-bg-soft)]"
                  : "border-[var(--st-border)] bg-white"
              }`}
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                  piano
                    ? "bg-[var(--st-red)] text-white"
                    : "bg-[var(--st-bg-soft)] text-[var(--st-gray)]"
                }`}
              >
                {piano ? (
                  <Check size={15} />
                ) : (
                  <Music2 size={15} />
                )}
              </div>

              <div>
                <p className="m-0 text-[11px] font-bold">
                  Piano
                </p>

                <p className="mt-1 text-[9px] text-[var(--st-gray)]">
                  1 slot / hour
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() =>
                setGuitar(!guitar)
              }
              className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-all ${
                guitar
                  ? "border-[var(--st-red)] bg-[var(--st-bg-soft)]"
                  : "border-[var(--st-border)] bg-white"
              }`}
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                  guitar
                    ? "bg-[var(--st-red)] text-white"
                    : "bg-[var(--st-bg-soft)] text-[var(--st-gray)]"
                }`}
              >
                {guitar ? (
                  <Check size={15} />
                ) : (
                  <Guitar size={15} />
                )}
              </div>

              <div>
                <p className="m-0 text-[11px] font-bold">
                  Guitar
                </p>

                <p className="mt-1 text-[9px] text-[var(--st-gray)]">
                  1 slot / hour
                </p>
              </div>
            </button>

          </div>

        </div>

        <div className="st-card p-5 sm:p-6">

          <div className="flex items-start gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--st-bg-soft)] text-[var(--st-red)]">
              <Clock3 size={18} />
            </div>

            <div>
              <h2 className="st-section-title">
                Lesson length
              </h2>

              <p className="mt-1 text-[10px] text-[var(--st-gray)]">
                Standard duration used for new
                generated trial slots.
              </p>
            </div>

          </div>

          <div className="mt-5 rounded-xl border border-[var(--st-border)] bg-[var(--st-bg-soft)] px-4 py-4">

            <p className="m-0 text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--st-gray)]">
              STANDARD TRIAL
            </p>

            <div className="mt-2 flex items-end gap-2">

              <span className="text-[30px] font-bold leading-none text-[var(--st-charcoal-dark)]">
                {
                  settings.booking_duration_minutes
                }
              </span>

              <span className="mb-1 text-[11px] font-semibold text-[var(--st-gray)]">
                minutes
              </span>

            </div>

          </div>

        </div>

      </section>

      {/* AUTOMATIONS */}

      <section className="st-card mt-5 p-5 sm:p-6">

        <div className="flex items-start gap-3">

          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--st-bg-soft)] text-[var(--st-red)]">
            <MessageCircle size={18} />
          </div>

          <div>
            <h2 className="st-section-title">
              Automated follow-ups
            </h2>

            <p className="mt-1 text-[10px] text-[var(--st-gray)]">
              Control the reminder and post-trial
              communication workflow.
            </p>
          </div>

        </div>

        <div className="mt-5 space-y-3">

          {[
            {
              key:
                "reminder_24h_enabled" as const,
              title:
                "24-hour reminder",
              description:
                "Send a reminder before the trial lesson.",
              icon: Mail,
            },
            {
              key:
                "reminder_2h_enabled" as const,
              title:
                "2-hour reminder",
              description:
                "Send a final reminder shortly before the lesson.",
              icon: Clock3,
            },
            {
              key:
                "follow_up_enabled" as const,
              title:
                "Post-trial follow-up",
              description:
                "Create a follow-up task after the student's trial.",
              icon: MessageCircle,
            },
          ].map((item) => {
            const Icon =
              item.icon;

            const enabled =
              settings[item.key];

            return (
              <div
                key={item.key}
                className="flex items-center justify-between gap-4 rounded-xl border border-[var(--st-border)] p-4"
              >

                <div className="flex items-center gap-3">

                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--st-bg-soft)] text-[var(--st-red)]">
                    <Icon size={16} />
                  </div>

                  <div>
                    <p className="m-0 text-[11px] font-bold text-[var(--st-charcoal-dark)]">
                      {item.title}
                    </p>

                    <p className="mt-1 text-[9px] text-[var(--st-gray)]">
                      {item.description}
                    </p>
                  </div>

                </div>

                <button
                  type="button"
                  onClick={() =>
                    updateSetting(
                      item.key,
                      !enabled
                    )
                  }
                  className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${
                    enabled
                      ? "bg-[var(--st-red)]"
                      : "bg-[#d7d2d2]"
                  }`}
                >
                  <span
                    className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                      enabled
                        ? "translate-x-5"
                        : "translate-x-1"
                    }`}
                  />
                </button>

              </div>
            );
          })}

        </div>

      </section>

      {/* AVAILABILITY GENERATOR */}

      <section className="mt-5 overflow-hidden rounded-2xl bg-[var(--st-charcoal-dark)] text-white">

        <div className="p-5 sm:p-6">

          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">

            <div className="flex items-start gap-4">

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--st-red)]">
                <RefreshCw size={19} />
              </div>

              <div>

                <p className="m-0 text-[9px] font-bold uppercase tracking-[0.16em] text-white/50">
                  AVAILABILITY GENERATOR
                </p>

                <h2 className="mt-1 text-[18px] font-bold">
                  Generate the next 4 weeks
                </h2>

                <p className="mt-2 max-w-[550px] text-[10px] leading-relaxed text-white/55">
                  Create all bookable Piano and
                  Guitar trial slots from the
                  recurring weekly schedule.
                  Existing slots are not duplicated.
                </p>

              </div>

            </div>

            <div className="shrink-0">

              <div className="mb-3 text-right">

                <p className="m-0 text-[9px] uppercase tracking-[0.12em] text-white/40">
                  ESTIMATED
                </p>

                <p className="mt-1 text-[22px] font-bold">
                  {weeklySlotCount * 4}
                </p>

                <p className="mt-1 text-[9px] text-white/40">
                  slots / 4 weeks
                </p>

              </div>

              <button
                type="button"
                onClick={
                  generateFourWeeks
                }
                disabled={generating}
                className="st-button w-full bg-white text-[var(--st-charcoal-dark)] hover:bg-[var(--st-bg-soft)] disabled:opacity-60"
              >
                {generating ? (
                  <>
                    <Loader2
                      size={14}
                      className="animate-spin"
                    />
                    Generating...
                  </>
                ) : (
                  <>
                    <RefreshCw
                      size={14}
                    />
                    Generate availability
                  </>
                )}
              </button>

            </div>

          </div>

        </div>

      </section>

      {/* SAVE */}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

        <div className="flex items-center gap-2">

          <Settings
            size={13}
            className="text-[var(--st-gray)]"
          />

          <p className="m-0 text-[9px] text-[var(--st-gray)]">
            Changes affect future customer
            bookings. Existing bookings are
            never changed.
          </p>

        </div>

        <button
          type="button"
          onClick={saveBookingSettings}
          disabled={savingSettings}
          className="st-button st-button-primary"
        >
          {savingSettings ? (
            <>
              <Loader2
                size={14}
                className="animate-spin"
              />
              Saving...
            </>
          ) : (
            <>
              <Save size={14} />
              Save all settings
            </>
          )}
        </button>

      </div>

      {/* SUCCESS */}

      {message && (
        <div className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-4">

          <p className="m-0 text-[10px] font-bold text-green-800">
            Settings updated
          </p>

          <p className="mt-1 mb-0 text-[10px] text-green-700">
            {message}
          </p>

        </div>
      )}

      {/* ERROR */}

      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-4">

          <p className="m-0 text-[10px] font-bold text-red-800">
            Something went wrong
          </p>

          <p className="mt-1 mb-0 text-[10px] text-red-700">
            {error}
          </p>

        </div>
      )}

    </main>
  );
}