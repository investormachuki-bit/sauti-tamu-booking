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
  Building2,
  Image as ImageIcon,
  Upload,
  Trash2,
  Phone,
  Globe,
  Receipt,
  ShieldCheck,
  ExternalLink,
  ChevronDown,
  Plus,
  X,
  Sparkles,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

/* =========================================================
   TYPES
========================================================= */

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

type BusinessSettings = {
  id: boolean;

  business_name: string;
  phone: string;
  whatsapp_number: string;
  email: string;
  website: string;

  logo_url: string | null;
  stamp_url: string | null;

  receipt_business_name: string;

  receipt_show_logo: boolean;
  receipt_show_stamp: boolean;

  receipt_footer: string;

  currency: string;

  payment_instructions: string;

  created_at?: string;
  updated_at?: string;
};

/* =========================================================
   DEFAULTS
========================================================= */

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
  offer_title: "This Week's Special Offer Ksh 18,850/=",
  offer_price: "18850",
  offer_regular_price: "26850",

  offer_description:
    "Students who book, attend their FREE Trial Lesson this week, and enroll on the same day qualify for our special course fee of Ksh 18,850/= instead of the regular Ksh 26,850/=",

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
  maximum_days_ahead: 14,

  reminder_24h_enabled: true,
  reminder_2h_enabled: true,
  follow_up_enabled: true,
};

const defaultBusinessSettings: BusinessSettings = {
  id: true,

  business_name: "Sauti Tamu Piano Center",

  phone: "",
  whatsapp_number: "",
  email: "",
  website: "",

  logo_url: null,
  stamp_url: null,

  receipt_business_name:
    "Sauti Tamu Piano Center",

  receipt_show_logo: true,
  receipt_show_stamp: true,

  receipt_footer:
    "Thank you for choosing Sauti Tamu Piano Center.",

  currency: "KES",

  payment_instructions: "",
};

/* =========================================================
   HELPERS
========================================================= */

function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatTime(time: string) {
  const [hour, minute] = time.split(":").map(Number);

  const suffix = hour >= 12 ? "PM" : "AM";

  const displayHour =
    hour % 12 === 0 ? 12 : hour % 12;

  return `${displayHour}:${String(minute).padStart(
    2,
    "0"
  )} ${suffix}`;
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

function getFileExtension(file: File) {
  const extension = file.name
    .split(".")
    .pop()
    ?.toLowerCase();

  if (
    extension &&
    ["png", "jpg", "jpeg", "webp", "svg"].includes(
      extension
    )
  ) {
    return extension;
  }

  return "png";
}

/* =========================================================
   SMALL UI COMPONENTS
========================================================= */

function Field({
  label,
  help,
  children,
  className = "",
}: {
  label: string;
  help?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-2 block text-[11px] font-semibold text-[#272727]">
        {label}
      </label>

      {children}

      {help && (
        <p className="mt-2 text-[9px] leading-relaxed text-[#999]">
          {help}
        </p>
      )}
    </div>
  );
}

function Input(
  props: React.InputHTMLAttributes<HTMLInputElement>
) {
  return (
    <input
      {...props}
      className={`h-11 w-full rounded-xl border border-[#e8e5e5] bg-white px-3.5 text-[12px] text-[#292929] outline-none transition focus:border-[#c91f2b] focus:ring-2 focus:ring-[#c91f2b]/10 disabled:bg-[#f7f7f7] ${
        props.className || ""
      }`}
    />
  );
}

function Textarea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement>
) {
  return (
    <textarea
      {...props}
      className={`w-full resize-y rounded-xl border border-[#e8e5e5] bg-white px-3.5 py-3 text-[12px] leading-relaxed text-[#292929] outline-none transition focus:border-[#c91f2b] focus:ring-2 focus:ring-[#c91f2b]/10 ${
        props.className || ""
      }`}
    />
  );
}

function Select(
  props: React.SelectHTMLAttributes<HTMLSelectElement>
) {
  return (
    <select
      {...props}
      className={`h-11 w-full appearance-none rounded-xl border border-[#e8e5e5] bg-white px-3.5 text-[12px] text-[#292929] outline-none transition focus:border-[#c91f2b] focus:ring-2 focus:ring-[#c91f2b]/10 ${
        props.className || ""
      }`}
    />
  );
}

function Toggle({
  enabled,
  onClick,
}: {
  enabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={enabled ? "Disable" : "Enable"}
      className={`relative h-7 w-12 shrink-0 rounded-full transition ${
        enabled ? "bg-[#c91f2b]" : "bg-[#d7d4d4]"
      }`}
    >
      <span
        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${
          enabled ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

function Section({
  icon: Icon,
  eyebrow,
  title,
  description,
  children,
  id,
  action,
}: {
  icon: React.ElementType;
  eyebrow?: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  id?: string;
  action?: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-24 overflow-hidden rounded-2xl border border-[#e9e5e5] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.025)]"
    >
      <div className="flex items-start justify-between gap-4 border-b border-[#eeeaea] px-5 py-5 sm:px-6">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fdf1f2] text-[#c91f2b]">
            <Icon size={18} />
          </div>

          <div className="min-w-0">
            {eyebrow && (
              <p className="mb-1 text-[8px] font-bold uppercase tracking-[0.16em] text-[#b0aaaa]">
                {eyebrow}
              </p>
            )}

            <h2 className="text-[15px] font-bold text-[#242424]">
              {title}
            </h2>

            {description && (
              <p className="mt-1 max-w-[650px] text-[10px] leading-relaxed text-[#999]">
                {description}
              </p>
            )}
          </div>
        </div>

        {action}
      </div>

      {children}
    </section>
  );
}

function ListEditor({
  items,
  onChange,
  placeholder,
}: {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
}) {
  function updateItem(index: number, value: string) {
    onChange(
      items.map((item, i) =>
        i === index ? value : item
      )
    );
  }

  function removeItem(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  function addItem() {
    onChange([...items, ""]);
  }

  return (
    <div className="space-y-2.5">
      {items.map((item, index) => (
        <div
          key={index}
          className="flex items-center gap-2"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#f7f5f5] text-[9px] font-bold text-[#aaa]">
            {String(index + 1).padStart(2, "0")}
          </div>

          <Input
            value={item}
            onChange={(e) =>
              updateItem(index, e.target.value)
            }
            placeholder={placeholder}
          />

          <button
            type="button"
            onClick={() => removeItem(index)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#aaa] transition hover:bg-[#fdf1f2] hover:text-[#c91f2b]"
          >
            <X size={14} />
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={addItem}
        className="mt-2 flex h-9 items-center gap-2 rounded-lg border border-dashed border-[#dcd7d7] px-3 text-[10px] font-semibold text-[#777] transition hover:border-[#c91f2b] hover:text-[#c91f2b]"
      >
        <Plus size={13} />
        Add item
      </button>
    </div>
  );
}

/* =========================================================
   MAIN PAGE
========================================================= */

export default function SettingsPage() {
  const [settings, setSettings] =
    useState<BookingSettings>(defaultSettings);

  const [business, setBusiness] =
    useState<BusinessSettings>(
      defaultBusinessSettings
    );

  const [schedule, setSchedule] =
    useState<DaySchedule[]>(defaultSchedule);

  const [piano, setPiano] = useState(true);
  const [guitar, setGuitar] = useState(true);

  const [loadingSettings, setLoadingSettings] =
    useState(true);

  const [savingSettings, setSavingSettings] =
    useState(false);

  const [savingBusiness, setSavingBusiness] =
    useState(false);

  const [generating, setGenerating] =
    useState(false);

  const [uploadingLogo, setUploadingLogo] =
    useState(false);

  const [uploadingStamp, setUploadingStamp] =
    useState(false);

  const [logoPreview, setLogoPreview] =
    useState<string | null>(null);

  const [stampPreview, setStampPreview] =
    useState<string | null>(null);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  /* =======================================================
     LOAD
  ======================================================= */

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoadingSettings(true);
    setError("");

    try {
      const [
        bookingResult,
        businessResult,
      ] = await Promise.all([
        supabase
          .from("booking_settings")
          .select("*")
          .limit(1)
          .maybeSingle(),

        supabase
          .from("business_settings")
          .select("*")
          .eq("id", true)
          .maybeSingle(),
      ]);

      if (bookingResult.error)
        throw bookingResult.error;

      if (businessResult.error)
        throw businessResult.error;

      if (bookingResult.data) {
        const data = bookingResult.data;

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
            Array.isArray(data.program_items)
              ? data.program_items
              : current.program_items,
        }));
      }

      if (businessResult.data) {
        setBusiness((current) => ({
          ...current,
          ...businessResult.data,
        }));

        await refreshAssetPreviews(
          businessResult.data.logo_url,
          businessResult.data.stamp_url
        );
      }
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Could not load settings."
      );
    } finally {
      setLoadingSettings(false);
    }
  }

  /* =======================================================
     ASSETS
  ======================================================= */

  async function getSignedAssetUrl(
    path: string | null
  ) {
    if (!path) return null;

    if (
      path.startsWith("http://") ||
      path.startsWith("https://")
    ) {
      return path;
    }

    const { data, error } =
      await supabase.storage
        .from("business-assets")
        .createSignedUrl(path, 3600);

    if (error) {
      console.error(error);
      return null;
    }

    return data?.signedUrl ?? null;
  }

  async function refreshAssetPreviews(
    logoPath: string | null,
    stampPath: string | null
  ) {
    const [logo, stamp] =
      await Promise.all([
        getSignedAssetUrl(logoPath),
        getSignedAssetUrl(stampPath),
      ]);

    setLogoPreview(logo);
    setStampPreview(stamp);
  }

  async function uploadBusinessAsset(
    file: File,
    type: "logo" | "stamp"
  ) {
    if (!file) return;

    const isLogo = type === "logo";

    if (isLogo)
      setUploadingLogo(true);
    else
      setUploadingStamp(true);

    setMessage("");
    setError("");

    try {
      if (!file.type.startsWith("image/")) {
        throw new Error(
          "Please select an image file."
        );
      }

      if (file.size > 5 * 1024 * 1024) {
        throw new Error(
          "Image must be smaller than 5 MB."
        );
      }

      const extension =
        getFileExtension(file);

      const path =
        `${type}-${Date.now()}.${extension}`;

      const { error: uploadError } =
        await supabase.storage
          .from("business-assets")
          .upload(path, file, {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type,
          });

      if (uploadError)
        throw uploadError;

      const oldPath = isLogo
        ? business.logo_url
        : business.stamp_url;

      if (
        oldPath &&
        !oldPath.startsWith("http://") &&
        !oldPath.startsWith("https://")
      ) {
        await supabase.storage
          .from("business-assets")
          .remove([oldPath]);
      }

      const changes = isLogo
        ? { logo_url: path }
        : { stamp_url: path };

      setBusiness((current) => ({
        ...current,
        ...changes,
      }));

      const { error: databaseError } =
        await supabase
          .from("business_settings")
          .update({
            ...changes,
            updated_at:
              new Date().toISOString(),
          })
          .eq("id", true);

      if (databaseError) {
        await supabase.storage
          .from("business-assets")
          .remove([path]);

        throw databaseError;
      }

      const signed =
        await getSignedAssetUrl(path);

      if (isLogo)
        setLogoPreview(signed);
      else
        setStampPreview(signed);

      setMessage(
        isLogo
          ? "Business logo uploaded."
          : "Official e-stamp uploaded."
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to upload image."
      );
    } finally {
      if (isLogo)
        setUploadingLogo(false);
      else
        setUploadingStamp(false);
    }
  }

  async function removeBusinessAsset(
    type: "logo" | "stamp"
  ) {
    const isLogo = type === "logo";

    const path = isLogo
      ? business.logo_url
      : business.stamp_url;

    if (!path) return;

    setMessage("");
    setError("");

    try {
      if (
        !path.startsWith("http://") &&
        !path.startsWith("https://")
      ) {
        const { error } =
          await supabase.storage
            .from("business-assets")
            .remove([path]);

        if (error) throw error;
      }

      const changes = isLogo
        ? { logo_url: null }
        : { stamp_url: null };

      const { error } =
        await supabase
          .from("business_settings")
          .update({
            ...changes,
            updated_at:
              new Date().toISOString(),
          })
          .eq("id", true);

      if (error) throw error;

      setBusiness((current) => ({
        ...current,
        ...changes,
      }));

      if (isLogo)
        setLogoPreview(null);
      else
        setStampPreview(null);

      setMessage(
        isLogo
          ? "Business logo removed."
          : "Official e-stamp removed."
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to remove image."
      );
    }
  }

  /* =======================================================
     UPDATE
  ======================================================= */

  function updateBusiness<
    K extends keyof BusinessSettings
  >(
    key: K,
    value: BusinessSettings[K]
  ) {
    setBusiness((current) => ({
      ...current,
      [key]: value,
    }));
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

  /* =======================================================
     SAVE BUSINESS
  ======================================================= */

  async function saveBusinessSettings() {
    setSavingBusiness(true);
    setMessage("");
    setError("");

    try {
      const payload = {
        business_name:
          business.business_name,

        phone:
          business.phone || null,

        whatsapp_number:
          business.whatsapp_number || null,

        email:
          business.email || null,

        website:
          business.website || null,

        logo_url: business.logo_url,
        stamp_url: business.stamp_url,

        receipt_business_name:
          business.receipt_business_name,

        receipt_show_logo:
          business.receipt_show_logo,

        receipt_show_stamp:
          business.receipt_show_stamp,

        receipt_footer:
          business.receipt_footer,

        currency: business.currency,

        payment_instructions:
          business.payment_instructions ||
          null,

        updated_at:
          new Date().toISOString(),
      };

      const { error } =
        await supabase
          .from("business_settings")
          .update(payload)
          .eq("id", true);

      if (error) throw error;

      setMessage(
        "Business settings saved successfully."
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to save business settings."
      );
    } finally {
      setSavingBusiness(false);
    }
  }

  /* =======================================================
     SAVE BOOKING
  ======================================================= */

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

      const { data: existing, error: findError } =
        await supabase
          .from("booking_settings")
          .select("id")
          .limit(1)
          .maybeSingle();

      if (findError)
        throw findError;

      let saveError;

      if (existing?.id !== undefined) {
        const result =
          await supabase
            .from("booking_settings")
            .update(payload)
            .eq("id", existing.id);

        saveError = result.error;
      } else {
        const result =
          await supabase
            .from("booking_settings")
            .insert(payload);

        saveError = result.error;
      }

      if (saveError)
        throw saveError;

      setMessage(
        "Booking settings saved successfully."
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to save booking settings."
      );
    } finally {
      setSavingSettings(false);
    }
  }

  /* =======================================================
     WEEKLY SLOTS
  ======================================================= */

  const weeklySlotCount = useMemo(() => {
    let count = 0;

    schedule.forEach((day) => {
      if (!day.enabled) return;

      const start =
        timeToMinutes(day.start);

      const end =
        timeToMinutes(day.end);

      const slots = Math.max(
        0,
        Math.floor(
          (end - start) /
            settings.booking_duration_minutes
        )
      );

      const instruments =
        Number(piano) +
        Number(guitar);

      count +=
        slots * instruments;
    });

    return count;
  }, [
    schedule,
    piano,
    guitar,
    settings.booking_duration_minutes,
  ]);

  function updateDay(
    index: number,
    changes: Partial<DaySchedule>
  ) {
    setSchedule((current) =>
      current.map((day, i) =>
        i === index
          ? { ...day, ...changes }
          : day
      )
    );
  }

  /* =======================================================
     GENERATE AVAILABILITY
  ======================================================= */

  async function generateFourWeeks() {
    setGenerating(true);
    setMessage("");
    setError("");

    try {
      const instruments: Array<
        "piano" | "guitar"
      > = [];

      if (piano)
        instruments.push("piano");

      if (guitar)
        instruments.push("guitar");

      if (!instruments.length) {
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

      if (fetchError)
        throw fetchError;

      const existingKeys =
        new Set(
          (existingSlots ?? []).map(
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
        let current = new Date(today);
        current < endDate;
        current = addDays(current, 1)
      ) {
        const dayIndex =
          current.getDay();

        const scheduleIndex =
          dayIndex === 0
            ? 6
            : dayIndex - 1;

        const daySchedule =
          schedule[scheduleIndex];

        if (!daySchedule?.enabled)
          continue;

        const startMinutes =
          timeToMinutes(
            daySchedule.start
          );

        const endMinutes =
          timeToMinutes(
            daySchedule.end
          );

        for (
          let minutes = startMinutes;
          minutes < endMinutes;
          minutes +=
            settings.booking_duration_minutes
        ) {
          const hour =
            Math.floor(minutes / 60);

          const minute =
            minutes % 60;

          for (const instrument of instruments) {
            const startsAt =
              new Date(current);

            startsAt.setHours(
              hour,
              minute,
              0,
              0
            );

            const endsAt =
              new Date(startsAt);

            endsAt.setMinutes(
              endsAt.getMinutes() +
                settings.booking_duration_minutes
            );

            const key =
              `${instrument}|${startsAt.getTime()}`;

            if (
              existingKeys.has(key)
            )
              continue;

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

      if (!newSlots.length) {
        setMessage(
          "Availability is already generated for the next 4 weeks."
        );

        return;
      }

      for (
        let index = 0;
        index < newSlots.length;
        index += 100
      ) {
        const batch =
          newSlots.slice(
            index,
            index + 100
          );

        const { error } =
          await supabase
            .from("lesson_slots")
            .insert(batch);

        if (error)
          throw error;
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

  /* =======================================================
     LOADING
  ======================================================= */

  if (loadingSettings) {
    return (
      <main className="st-content">
        <div className="flex min-h-[360px] items-center justify-center">
          <div className="flex items-center gap-2 text-[11px] text-[#999]">
            <Loader2
              size={17}
              className="animate-spin text-[#c91f2b]"
            />
            Loading settings...
          </div>
        </div>
      </main>
    );
  }

  /* =======================================================
     UI
  ======================================================= */

  return (
    <main className="st-content pb-28">

      {/* ===================================================
          HEADER
      =================================================== */}

      <div className="mb-5">

        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">

          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#fdf1f2] text-[#c91f2b]">
                <Settings size={15} />
              </div>

              <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#b2aaaa]">
                Administration
              </span>
            </div>

            <h1 className="mt-3 text-[28px] font-bold tracking-[-0.03em] text-[#242424] sm:text-[32px]">
              Settings
            </h1>

            <p className="mt-1 max-w-[650px] text-[11px] leading-relaxed text-[#999]">
              Configure Sauti Tamu's business identity,
              booking experience, customer content,
              availability and communications.
            </p>
          </div>

          <div className="hidden gap-2 lg:flex">

            <button
              type="button"
              onClick={
                saveBusinessSettings
              }
              disabled={
                savingBusiness
              }
              className="flex h-10 items-center gap-2 rounded-xl border border-[#dedada] bg-white px-4 text-[10px] font-bold text-[#333] shadow-sm transition hover:border-[#c91f2b] hover:text-[#c91f2b]"
            >
              {savingBusiness ? (
                <Loader2
                  size={14}
                  className="animate-spin"
                />
              ) : (
                <Building2 size={14} />
              )}

              Save business
            </button>

            <button
              type="button"
              onClick={
                saveBookingSettings
              }
              disabled={
                savingSettings
              }
              className="flex h-10 items-center gap-2 rounded-xl bg-[#c91f2b] px-4 text-[10px] font-bold text-white shadow-sm transition hover:bg-[#ad1823]"
            >
              {savingSettings ? (
                <Loader2
                  size={14}
                  className="animate-spin"
                />
              ) : (
                <Save size={14} />
              )}

              Save booking
            </button>

          </div>

        </div>

        {/* =================================================
            QUICK NAV
        ================================================= */}

        <div className="mt-5 flex gap-1 overflow-x-auto rounded-xl border border-[#e9e5e5] bg-white p-1 shadow-sm">

          {[
            ["#business", "Business"],
            ["#booking", "Booking"],
            ["#content", "Content"],
            ["#offer", "Offer"],
            ["#location", "Location"],
            ["#availability", "Availability"],
            ["#automation", "Automation"],
          ].map(([href, label]) => (
            <a
              key={href}
              href={href}
              className="shrink-0 rounded-lg px-3 py-2 text-[9px] font-semibold text-[#777] transition hover:bg-[#fdf1f2] hover:text-[#c91f2b]"
            >
              {label}
            </a>
          ))}

        </div>
      </div>

      {/* ===================================================
          BUSINESS
      =================================================== */}

      <div id="business">

        <Section
          icon={Building2}
          eyebrow="BUSINESS"
          title="Business identity"
          description="The core identity used across the administration system and future documents."
        >
          <div className="grid grid-cols-1 gap-5 p-5 sm:p-6 lg:grid-cols-2">

            <Field label="Business name">
              <Input
                value={
                  business.business_name
                }
                onChange={(e) =>
                  updateBusiness(
                    "business_name",
                    e.target.value
                  )
                }
              />
            </Field>

            <Field label="Phone">
              <div className="relative">
                <Phone
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#aaa]"
                />

                <Input
                  value={
                    business.phone
                  }
                  onChange={(e) =>
                    updateBusiness(
                      "phone",
                      e.target.value
                    )
                  }
                  className="pl-9"
                  placeholder="+254..."
                />
              </div>
            </Field>

            <Field label="WhatsApp number">
              <div className="relative">
                <MessageCircle
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#aaa]"
                />

                <Input
                  value={
                    business.whatsapp_number
                  }
                  onChange={(e) =>
                    updateBusiness(
                      "whatsapp_number",
                      e.target.value
                    )
                  }
                  className="pl-9"
                  placeholder="+254..."
                />
              </div>
            </Field>

            <Field label="Email">
              <div className="relative">
                <Mail
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#aaa]"
                />

                <Input
                  type="email"
                  value={
                    business.email
                  }
                  onChange={(e) =>
                    updateBusiness(
                      "email",
                      e.target.value
                    )
                  }
                  className="pl-9"
                  placeholder="hello@sautitamu.com"
                />
              </div>
            </Field>

            <Field
              label="Website"
              className="lg:col-span-2"
            >
              <div className="relative">
                <Globe
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#aaa]"
                />

                <Input
                  type="url"
                  value={
                    business.website
                  }
                  onChange={(e) =>
                    updateBusiness(
                      "website",
                      e.target.value
                    )
                  }
                  className="pl-9"
                  placeholder="https://..."
                />
              </div>
            </Field>

          </div>
        </Section>

      </div>

      {/* ===================================================
          BRAND ASSETS
      =================================================== */}

      <div className="mt-5">

        <Section
          icon={ImageIcon}
          eyebrow="BRANDING"
          title="Brand assets"
          description="Upload the official logo and e-stamp used on business documents."
        >
          <div className="grid grid-cols-1 gap-5 p-5 sm:p-6 lg:grid-cols-2">

            {/* LOGO */}

            <div className="rounded-xl border border-[#ebe7e7] p-4">

              <div className="flex items-center justify-between">

                <div>
                  <p className="text-[11px] font-bold text-[#292929]">
                    Business logo
                  </p>

                  <p className="mt-1 text-[9px] text-[#999]">
                    PNG, JPG or WebP · Max 5 MB
                  </p>
                </div>

                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#fdf1f2] text-[#c91f2b]">
                  <ImageIcon size={15} />
                </div>

              </div>

              <div className="mt-4 flex h-[150px] items-center justify-center rounded-xl border border-dashed border-[#ddd8d8] bg-[#faf9f9] p-5">

                {logoPreview ? (
                  <img
                    src={logoPreview}
                    alt="Business logo"
                    className="max-h-[105px] max-w-[190px] object-contain"
                  />
                ) : (
                  <div className="text-center">
                    <ImageIcon
                      size={25}
                      className="mx-auto text-[#c5c0c0]"
                    />

                    <p className="mt-2 text-[10px] font-semibold text-[#777]">
                      No logo uploaded
                    </p>
                  </div>
                )}

              </div>

              <div className="mt-3 flex gap-2">

                <label className="flex h-9 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#c91f2b] text-[9px] font-bold text-white">
                  {uploadingLogo ? (
                    <Loader2
                      size={13}
                      className="animate-spin"
                    />
                  ) : (
                    <Upload size={13} />
                  )}

                  {logoPreview
                    ? "Replace logo"
                    : "Upload logo"}

                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    className="hidden"
                    disabled={
                      uploadingLogo
                    }
                    onChange={(e) => {
                      const file =
                        e.target
                          .files?.[0];

                      if (file) {
                        uploadBusinessAsset(
                          file,
                          "logo"
                        );
                      }

                      e.currentTarget.value =
                        "";
                    }}
                  />
                </label>

                {logoPreview && (
                  <button
                    type="button"
                    onClick={() =>
                      removeBusinessAsset(
                        "logo"
                      )
                    }
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#e5e1e1] text-[#999] hover:text-[#c91f2b]"
                  >
                    <Trash2 size={13} />
                  </button>
                )}

              </div>

            </div>

            {/* STAMP */}

            <div className="rounded-xl border border-[#ebe7e7] p-4">

              <div className="flex items-center justify-between">

                <div>
                  <p className="text-[11px] font-bold text-[#292929]">
                    Official e-stamp
                  </p>

                  <p className="mt-1 text-[9px] text-[#999]">
                    Transparent PNG recommended
                  </p>
                </div>

                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#fdf1f2] text-[#c91f2b]">
                  <ShieldCheck size={15} />
                </div>

              </div>

              <div className="mt-4 flex h-[150px] items-center justify-center rounded-xl border border-dashed border-[#ddd8d8] bg-[#faf9f9] p-5">

                {stampPreview ? (
                  <img
                    src={stampPreview}
                    alt="Official e-stamp"
                    className="max-h-[105px] max-w-[190px] object-contain"
                  />
                ) : (
                  <div className="text-center">
                    <ShieldCheck
                      size={25}
                      className="mx-auto text-[#c5c0c0]"
                    />

                    <p className="mt-2 text-[10px] font-semibold text-[#777]">
                      No e-stamp uploaded
                    </p>
                  </div>
                )}

              </div>

              <div className="mt-3 flex gap-2">

                <label className="flex h-9 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#c91f2b] text-[9px] font-bold text-white">
                  {uploadingStamp ? (
                    <Loader2
                      size={13}
                      className="animate-spin"
                    />
                  ) : (
                    <Upload size={13} />
                  )}

                  {stampPreview
                    ? "Replace stamp"
                    : "Upload e-stamp"}

                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    className="hidden"
                    disabled={
                      uploadingStamp
                    }
                    onChange={(e) => {
                      const file =
                        e.target
                          .files?.[0];

                      if (file) {
                        uploadBusinessAsset(
                          file,
                          "stamp"
                        );
                      }

                      e.currentTarget.value =
                        "";
                    }}
                  />
                </label>

                {stampPreview && (
                  <button
                    type="button"
                    onClick={() =>
                      removeBusinessAsset(
                        "stamp"
                      )
                    }
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#e5e1e1] text-[#999] hover:text-[#c91f2b]"
                  >
                    <Trash2 size={13} />
                  </button>
                )}

              </div>

            </div>

          </div>
        </Section>

      </div>

      {/* ===================================================
          RECEIPTS
      =================================================== */}

      <div className="mt-5">

        <Section
          icon={Receipt}
          eyebrow="DOCUMENTS"
          title="Receipts & documents"
          description="Control the business identity and branding displayed on receipts."
        >
          <div className="grid grid-cols-1 gap-5 p-5 sm:p-6 lg:grid-cols-2">

            <Field label="Receipt business name">
              <Input
                value={
                  business.receipt_business_name
                }
                onChange={(e) =>
                  updateBusiness(
                    "receipt_business_name",
                    e.target.value
                  )
                }
              />
            </Field>

            <Field label="Currency">
              <Select
                value={
                  business.currency
                }
                onChange={(e) =>
                  updateBusiness(
                    "currency",
                    e.target.value
                  )
                }
              >
                <option value="KES">
                  KES — Kenyan Shilling
                </option>
                <option value="USD">
                  USD — US Dollar
                </option>
                <option value="EUR">
                  EUR — Euro
                </option>
                <option value="GBP">
                  GBP — British Pound
                </option>
              </Select>
            </Field>

            <div className="rounded-xl border border-[#ebe7e7] p-4">

              <div className="flex items-center justify-between">

                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#fdf1f2] text-[#c91f2b]">
                    <ImageIcon size={15} />
                  </div>

                  <div>
                    <p className="text-[10px] font-bold text-[#292929]">
                      Show logo
                    </p>

                    <p className="mt-1 text-[9px] text-[#999]">
                      Display the business logo.
                    </p>
                  </div>
                </div>

                <Toggle
                  enabled={
                    business.receipt_show_logo
                  }
                  onClick={() =>
                    updateBusiness(
                      "receipt_show_logo",
                      !business.receipt_show_logo
                    )
                  }
                />

              </div>

            </div>

            <div className="rounded-xl border border-[#ebe7e7] p-4">

              <div className="flex items-center justify-between">

                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#fdf1f2] text-[#c91f2b]">
                    <ShieldCheck size={15} />
                  </div>

                  <div>
                    <p className="text-[10px] font-bold text-[#292929]">
                      Show e-stamp
                    </p>

                    <p className="mt-1 text-[9px] text-[#999]">
                      Display the official stamp.
                    </p>
                  </div>
                </div>

                <Toggle
                  enabled={
                    business.receipt_show_stamp
                  }
                  onClick={() =>
                    updateBusiness(
                      "receipt_show_stamp",
                      !business.receipt_show_stamp
                    )
                  }
                />

              </div>

            </div>

            <Field
              label="Receipt footer"
              help="This message appears at the bottom of receipts."
              className="lg:col-span-2"
            >
              <Textarea
                rows={3}
                value={
                  business.receipt_footer
                }
                onChange={(e) =>
                  updateBusiness(
                    "receipt_footer",
                    e.target.value
                  )
                }
              />
            </Field>

            <Field
              label="Payment instructions"
              help="Optional instructions that can later appear on invoices and receipts."
              className="lg:col-span-2"
            >
              <Textarea
                rows={3}
                value={
                  business.payment_instructions
                }
                onChange={(e) =>
                  updateBusiness(
                    "payment_instructions",
                    e.target.value
                  )
                }
                placeholder="Example: Pay via M-Pesa Till Number..."
              />
            </Field>

          </div>

          {/* RECEIPT PREVIEW */}

          <div className="border-t border-[#eeeaea] bg-[#faf9f9] p-5 sm:p-6">

            <div className="flex items-center justify-between">

              <div>
                <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-[#aaa]">
                  LIVE PREVIEW
                </p>

                <h3 className="mt-1 text-[12px] font-bold text-[#292929]">
                  Receipt appearance
                </h3>
              </div>

              <Receipt
                size={17}
                className="text-[#c91f2b]"
              />

            </div>

            <div className="mx-auto mt-5 max-w-[370px] rounded-xl border border-[#e5e1e1] bg-white p-5 shadow-sm">

              <div className="text-center">

                {business.receipt_show_logo &&
                  logoPreview && (
                    <img
                      src={logoPreview}
                      alt=""
                      className="mx-auto mb-3 max-h-[55px] max-w-[150px] object-contain"
                    />
                  )}

                <p className="text-[13px] font-bold text-[#242424]">
                  {
                    business.receipt_business_name
                  }
                </p>

                {business.phone && (
                  <p className="mt-1 text-[8px] text-[#999]">
                    {business.phone}
                  </p>
                )}

                {business.email && (
                  <p className="mt-1 text-[8px] text-[#999]">
                    {business.email}
                  </p>
                )}

              </div>

              <div className="my-4 border-t border-dashed border-[#ddd8d8]" />

              <div className="flex justify-between text-[9px]">
                <span className="text-[#999]">
                  Receipt
                </span>

                <span className="font-semibold">
                  #000001
                </span>
              </div>

              <div className="mt-2 flex justify-between text-[9px]">
                <span className="text-[#999]">
                  Amount
                </span>

                <span className="font-bold">
                  {business.currency} 18,850
                </span>
              </div>

              {business.receipt_show_stamp &&
                stampPreview && (
                  <div className="mt-5 flex justify-end">
                    <img
                      src={stampPreview}
                      alt=""
                      className="max-h-[65px] max-w-[95px] object-contain"
                    />
                  </div>
                )}

              <div className="mt-4 border-t border-[#eeeaea] pt-3 text-center">
                <p className="text-[8px] leading-relaxed text-[#999]">
                  {business.receipt_footer}
                </p>
              </div>

            </div>
          </div>
        </Section>

      </div>

      {/* ===================================================
          BOOKING
      =================================================== */}

      <div
        id="booking"
        className="mt-5"
      >

        <Section
          icon={CalendarDays}
          eyebrow="BOOKING"
          title="Booking experience"
          description="Control what customers see and how far ahead they can book."
        >
          <div className="grid grid-cols-1 gap-5 p-5 sm:p-6 lg:grid-cols-2">

            <Field label="Booking title">
              <Input
                value={
                  settings.booking_title
                }
                onChange={(e) =>
                  updateSetting(
                    "booking_title",
                    e.target.value
                  )
                }
              />
            </Field>

            <Field label="Appointment name">
              <Input
                value={
                  settings.appointment_name
                }
                onChange={(e) =>
                  updateSetting(
                    "appointment_name",
                    e.target.value
                  )
                }
              />
            </Field>

            <Field label="Centre name">
              <Input
                value={
                  settings.center_name
                }
                onChange={(e) =>
                  updateSetting(
                    "center_name",
                    e.target.value
                  )
                }
              />
            </Field>

            <Field label="Timezone">
              <Select
                value={
                  settings.timezone
                }
                onChange={(e) =>
                  updateSetting(
                    "timezone",
                    e.target.value
                  )
                }
              >
                <option value="Africa/Nairobi">
                  Africa/Nairobi
                </option>
                <option value="UTC">
                  UTC
                </option>
              </Select>
            </Field>

            <Field label="Lesson duration">
              <Select
                value={
                  settings.booking_duration_minutes
                }
                onChange={(e) =>
                  updateSetting(
                    "booking_duration_minutes",
                    Number(e.target.value)
                  )
                }
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
              </Select>
            </Field>

            <Field
              label="Minimum booking notice"
              help="Customers cannot book within this period before the lesson starts."
            >
              <Select
                value={
                  settings.minimum_notice_hours
                }
                onChange={(e) =>
                  updateSetting(
                    "minimum_notice_hours",
                    Number(e.target.value)
                  )
                }
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
              </Select>
            </Field>

            <Field label="Maximum days ahead">
              <Select
                value={
                  settings.maximum_days_ahead
                }
                onChange={(e) =>
                  updateSetting(
                    "maximum_days_ahead",
                    Number(e.target.value)
                  )
                }
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
              </Select>
            </Field>

            <Field
              label="Booking page introduction"
              className="lg:col-span-2"
            >
              <Textarea
                rows={5}
                value={
                  settings.description_intro
                }
                onChange={(e) =>
                  updateSetting(
                    "description_intro",
                    e.target.value
                  )
                }
              />
            </Field>

          </div>
        </Section>

      </div>

      {/* ===================================================
          CONTENT
      =================================================== */}

      <div
        id="content"
        className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2"
      >

        <Section
          icon={FileText}
          title="During the visit"
          description="Explain what students should expect during the free trial."
        >
          <div className="space-y-5 p-5 sm:p-6">

            <Field label="Section title">
              <Input
                value={
                  settings.description_visit_title
                }
                onChange={(e) =>
                  updateSetting(
                    "description_visit_title",
                    e.target.value
                  )
                }
              />
            </Field>

            <Field
              label="What students will experience"
              help="Keep these short and easy to scan."
            >
              <ListEditor
                items={
                  settings.description_visit_items
                }
                onChange={(items) =>
                  updateSetting(
                    "description_visit_items",
                    items
                  )
                }
                placeholder="Example: Meet your instructor"
              />
            </Field>

          </div>
        </Section>

        <Section
          icon={BookOpen}
          title="Programme"
          description="Show students exactly what the course fee includes."
        >
          <div className="space-y-5 p-5 sm:p-6">

            <Field label="Section title">
              <Input
                value={
                  settings.program_title
                }
                onChange={(e) =>
                  updateSetting(
                    "program_title",
                    e.target.value
                  )
                }
              />
            </Field>

            <Field label="Programme items">
              <ListEditor
                items={
                  settings.program_items
                }
                onChange={(items) =>
                  updateSetting(
                    "program_items",
                    items
                  )
                }
                placeholder="Example: 3 Months Program"
              />
            </Field>

          </div>
        </Section>

        <Section
          icon={Music2}
          title="What to bring"
          description="Tell students what they should bring to the trial."
        >
          <div className="space-y-5 p-5 sm:p-6">

            <Field label="Section title">
              <Input
                value={
                  settings.what_to_bring_title
                }
                onChange={(e) =>
                  updateSetting(
                    "what_to_bring_title",
                    e.target.value
                  )
                }
              />
            </Field>

            <Field label="Items">
              <ListEditor
                items={
                  settings.what_to_bring_items
                }
                onChange={(items) =>
                  updateSetting(
                    "what_to_bring_items",
                    items
                  )
                }
                placeholder="Example: A Notebook"
              />
            </Field>

          </div>
        </Section>

        <Section
          icon={Clock3}
          title="Working hours"
          description="Customer-facing information. Actual bookable times come from the weekly schedule."
        >
          <div className="space-y-5 p-5 sm:p-6">

            <Field label="Section title">
              <Input
                value={
                  settings.working_hours_title
                }
                onChange={(e) =>
                  updateSetting(
                    "working_hours_title",
                    e.target.value
                  )
                }
              />
            </Field>

            <Field label="Working hours">
              <Input
                value={
                  settings.working_hours_text
                }
                onChange={(e) =>
                  updateSetting(
                    "working_hours_text",
                    e.target.value
                  )
                }
              />
            </Field>

          </div>
        </Section>

      </div>

      {/* ===================================================
          OFFER
      =================================================== */}

      <div
        id="offer"
        className="mt-5"
      >

        <Section
          icon={Gift}
          eyebrow="PROMOTION"
          title="Special offer"
          description="Control the promotional offer displayed on the booking page."
          action={
            <Toggle
              enabled={
                settings.offer_enabled
              }
              onClick={() =>
                updateSetting(
                  "offer_enabled",
                  !settings.offer_enabled
                )
              }
            />
          }
        >

          {settings.offer_enabled && (
            <div className="grid grid-cols-1 gap-5 p-5 sm:p-6 lg:grid-cols-2">

              <Field
                label="Offer title"
                className="lg:col-span-2"
              >
                <Input
                  value={
                    settings.offer_title
                  }
                  onChange={(e) =>
                    updateSetting(
                      "offer_title",
                      e.target.value
                    )
                  }
                />
              </Field>

              <Field label="Special price">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[#aaa]">
                    KES
                  </span>

                  <Input
                    type="number"
                    value={
                      settings.offer_price
                    }
                    onChange={(e) =>
                      updateSetting(
                        "offer_price",
                        e.target.value
                      )
                    }
                    className="pl-12"
                  />
                </div>
              </Field>

              <Field label="Regular price">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[#aaa]">
                    KES
                  </span>

                  <Input
                    type="number"
                    value={
                      settings.offer_regular_price
                    }
                    onChange={(e) =>
                      updateSetting(
                        "offer_regular_price",
                        e.target.value
                      )
                    }
                    className="pl-12"
                  />
                </div>
              </Field>

              <Field
                label="Offer description"
                className="lg:col-span-2"
              >
                <Textarea
                  rows={4}
                  value={
                    settings.offer_description
                  }
                  onChange={(e) =>
                    updateSetting(
                      "offer_description",
                      e.target.value
                    )
                  }
                />
              </Field>

              {/* OFFER PREVIEW */}

              <div className="lg:col-span-2">

                <div className="overflow-hidden rounded-2xl border border-[#e9d9db] bg-[#fff8f8]">

                  <div className="flex items-center gap-2 border-b border-[#f1dfe1] px-4 py-3">
                    <Sparkles
                      size={14}
                      className="text-[#c91f2b]"
                    />

                    <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#c91f2b]">
                      Offer preview
                    </span>
                  </div>

                  <div className="p-5">

                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#c91f2b]">
                      {settings.offer_title}
                    </p>

                    <div className="mt-2 flex items-end gap-3">

                      <span className="text-[27px] font-bold tracking-[-0.03em] text-[#242424]">
                        KES{" "}
                        {Number(
                          settings.offer_price
                        ).toLocaleString()}
                      </span>

                      <span className="mb-1 text-[11px] text-[#aaa] line-through">
                        KES{" "}
                        {Number(
                          settings.offer_regular_price
                        ).toLocaleString()}
                      </span>

                    </div>

                    <p className="mt-3 max-w-[650px] text-[10px] leading-relaxed text-[#777]">
                      {
                        settings.offer_description
                      }
                    </p>

                  </div>

                </div>

              </div>

            </div>
          )}

        </Section>

      </div>

      {/* ===================================================
          LOCATION
      =================================================== */}

      <div
        id="location"
        className="mt-5"
      >

        <Section
          icon={MapPin}
          eyebrow="LOCATION"
          title="Business location"
          description="The address and arrival information customers receive after booking."
        >
          <div className="grid grid-cols-1 gap-5 p-5 sm:p-6 lg:grid-cols-2">

            <Field label="Section title">
              <Input
                value={
                  settings.location_title
                }
                onChange={(e) =>
                  updateSetting(
                    "location_title",
                    e.target.value
                  )
                }
              />
            </Field>

            <Field label="Location name">
              <Input
                value={
                  settings.location_name
                }
                onChange={(e) =>
                  updateSetting(
                    "location_name",
                    e.target.value
                  )
                }
              />
            </Field>

            <Field label="Address">
              <Input
                value={
                  settings.location_address
                }
                onChange={(e) =>
                  updateSetting(
                    "location_address",
                    e.target.value
                  )
                }
              />
            </Field>

            <Field label="Landmark">
              <Input
                value={
                  settings.location_landmark
                }
                onChange={(e) =>
                  updateSetting(
                    "location_landmark",
                    e.target.value
                  )
                }
              />
            </Field>

            <Field
              label="Maps link"
              className="lg:col-span-2"
            >
              <div className="flex gap-2">

                <Input
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
                  placeholder="https://..."
                />

                {settings.location_maps_url && (
                  <a
                    href={
                      settings.location_maps_url
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#e8e5e5] text-[#888] hover:border-[#c91f2b] hover:text-[#c91f2b]"
                  >
                    <ExternalLink size={14} />
                  </a>
                )}

              </div>
            </Field>

            <Field
              label="Arrival instruction"
              className="lg:col-span-2"
            >
              <Input
                value={
                  settings.arrival_instruction
                }
                onChange={(e) =>
                  updateSetting(
                    "arrival_instruction",
                    e.target.value
                  )
                }
              />
            </Field>

          </div>
        </Section>

      </div>

      {/* ===================================================
          AVAILABILITY
      =================================================== */}

      <div
        id="availability"
        className="mt-5"
      >

        <Section
          icon={CalendarDays}
          eyebrow="SCHEDULE"
          title="Weekly availability"
          description="This schedule repeats every week. Trial slots are generated from these hours."
        >

          <div className="divide-y divide-[#eeeaea]">

            {schedule.map(
              (day, index) => (
                <div
                  key={day.day}
                  className="px-5 py-4 sm:px-6"
                >

                  <div className="flex items-center justify-between gap-4">

                    <div className="flex items-center gap-3">

                      <Toggle
                        enabled={
                          day.enabled
                        }
                        onClick={() =>
                          updateDay(
                            index,
                            {
                              enabled:
                                !day.enabled,
                            }
                          )
                        }
                      />

                      <div>
                        <p className="text-[11px] font-bold text-[#292929]">
                          {day.day}
                        </p>

                        <p className="mt-0.5 text-[8px] font-bold tracking-[0.12em] text-[#aaa]">
                          {day.short}
                        </p>
                      </div>

                    </div>

                    {day.enabled && (
                      <span className="hidden text-[9px] font-semibold text-[#999] sm:block">
                        {formatTime(day.start)}
                        {" – "}
                        {formatTime(day.end)}
                      </span>
                    )}

                    {!day.enabled && (
                      <span className="text-[9px] font-semibold text-[#aaa]">
                        Closed
                      </span>
                    )}

                  </div>

                  {day.enabled && (
                    <div className="mt-3 flex items-center gap-2 pl-[60px]">

                      <Clock3
                        size={13}
                        className="text-[#c91f2b]"
                      />

                      <input
                        type="time"
                        value={day.start}
                        onChange={(e) =>
                          updateDay(
                            index,
                            {
                              start:
                                e.target.value,
                            }
                          )
                        }
                        className="h-9 rounded-lg border border-[#e8e5e5] px-2 text-[10px] outline-none focus:border-[#c91f2b]"
                      />

                      <span className="text-[9px] text-[#aaa]">
                        to
                      </span>

                      <input
                        type="time"
                        value={day.end}
                        onChange={(e) =>
                          updateDay(
                            index,
                            {
                              end:
                                e.target.value,
                            }
                          )
                        }
                        className="h-9 rounded-lg border border-[#e8e5e5] px-2 text-[10px] outline-none focus:border-[#c91f2b]"
                      />

                    </div>
                  )}

                </div>
              )
            )}

          </div>
        </Section>

      </div>

      {/* ===================================================
          INSTRUMENTS
      =================================================== */}

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">

        <Section
          icon={Music2}
          title="Trial instruments"
          description="Each available hour creates one slot per selected instrument."
        >
          <div className="grid grid-cols-2 gap-3 p-5 sm:p-6">

            {[
              {
                name: "Piano",
                active: piano,
                setActive: setPiano,
                icon: Music2,
              },
              {
                name: "Guitar",
                active: guitar,
                setActive: setGuitar,
                icon: Guitar,
              },
            ].map((item) => {
              const Icon = item.icon;

              return (
                <button
                  key={item.name}
                  type="button"
                  onClick={() =>
                    item.setActive(
                      !item.active
                    )
                  }
                  className={`rounded-xl border p-4 text-left transition ${
                    item.active
                      ? "border-[#c91f2b] bg-[#fff8f8]"
                      : "border-[#e8e5e5] bg-white"
                  }`}
                >

                  <div className="flex items-center justify-between">

                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                        item.active
                          ? "bg-[#c91f2b] text-white"
                          : "bg-[#f5f3f3] text-[#aaa]"
                      }`}
                    >
                      {item.active ? (
                        <Check size={15} />
                      ) : (
                        <Icon size={15} />
                      )}
                    </div>

                    {item.active && (
                      <span className="text-[8px] font-bold uppercase tracking-[0.1em] text-[#c91f2b]">
                        Active
                      </span>
                    )}

                  </div>

                  <p className="mt-4 text-[11px] font-bold text-[#292929]">
                    {item.name}
                  </p>

                  <p className="mt-1 text-[9px] text-[#999]">
                    1 trial slot / hour
                  </p>

                </button>
              );
            })}

          </div>
        </Section>

        <Section
          icon={Clock3}
          title="Lesson length"
          description="Standard duration used when generating new trial slots."
        >
          <div className="p-5 sm:p-6">

            <div className="rounded-xl bg-[#faf8f8] p-5">

              <p className="text-[8px] font-bold uppercase tracking-[0.15em] text-[#aaa]">
                STANDARD TRIAL
              </p>

              <div className="mt-2 flex items-end gap-2">
                <span className="text-[32px] font-bold tracking-[-0.04em] text-[#242424]">
                  {
                    settings.booking_duration_minutes
                  }
                </span>

                <span className="mb-1 text-[10px] font-semibold text-[#999]">
                  minutes
                </span>
              </div>

            </div>

          </div>
        </Section>

      </div>

      {/* ===================================================
          AUTOMATION
      =================================================== */}

      <div
        id="automation"
        className="mt-5"
      >

        <Section
          icon={MessageCircle}
          eyebrow="AUTOMATION"
          title="Reminders & follow-ups"
          description="Control the automated communication workflow around trial lessons."
        >

          <div className="divide-y divide-[#eeeaea]">

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
              const Icon = item.icon;
              const enabled =
                settings[item.key];

              return (
                <div
                  key={item.key}
                  className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6"
                >

                  <div className="flex items-center gap-3">

                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#fdf1f2] text-[#c91f2b]">
                      <Icon size={15} />
                    </div>

                    <div>
                      <p className="text-[10px] font-bold text-[#292929]">
                        {item.title}
                      </p>

                      <p className="mt-1 text-[9px] text-[#999]">
                        {item.description}
                      </p>
                    </div>

                  </div>

                  <Toggle
                    enabled={enabled}
                    onClick={() =>
                      updateSetting(
                        item.key,
                        !enabled
                      )
                    }
                  />

                </div>
              );
            })}

          </div>
        </Section>

      </div>

      {/* ===================================================
          GENERATOR
      =================================================== */}

      <div className="mt-5 overflow-hidden rounded-2xl bg-[#242424] text-white">

        <div className="p-5 sm:p-6">

          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

            <div className="flex items-start gap-3">

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#c91f2b]">
                <RefreshCw size={17} />
              </div>

              <div>
                <p className="text-[8px] font-bold uppercase tracking-[0.15em] text-white/40">
                  AVAILABILITY GENERATOR
                </p>

                <h2 className="mt-1 text-[16px] font-bold">
                  Generate the next 4 weeks
                </h2>

                <p className="mt-1 max-w-[550px] text-[9px] leading-relaxed text-white/50">
                  Generate bookable Piano and Guitar
                  trial slots from the weekly schedule.
                  Existing slots will not be duplicated.
                </p>
              </div>

            </div>

            <div className="flex items-center gap-4">

              <div className="text-right">
                <p className="text-[8px] uppercase tracking-[0.12em] text-white/40">
                  ESTIMATED
                </p>

                <p className="mt-1 text-[22px] font-bold">
                  {weeklySlotCount * 4}
                </p>

                <p className="text-[8px] text-white/40">
                  slots / 4 weeks
                </p>
              </div>

              <button
                type="button"
                onClick={
                  generateFourWeeks
                }
                disabled={
                  generating
                }
                className="flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-[9px] font-bold text-[#242424] transition hover:bg-[#f5f3f3] disabled:opacity-50"
              >
                {generating ? (
                  <Loader2
                    size={13}
                    className="animate-spin"
                  />
                ) : (
                  <RefreshCw size={13} />
                )}

                Generate
              </button>

            </div>

          </div>

        </div>
      </div>

      {/* ===================================================
          MOBILE SAVE BAR
      =================================================== */}

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#e5e1e1] bg-white/95 p-3 backdrop-blur lg:hidden">

        <div className="mx-auto flex max-w-[900px] gap-2">

          <button
            type="button"
            onClick={
              saveBusinessSettings
            }
            disabled={
              savingBusiness
            }
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-[#ddd9d9] bg-white text-[9px] font-bold text-[#333]"
          >
            <Building2 size={14} />
            Business
          </button>

          <button
            type="button"
            onClick={
              saveBookingSettings
            }
            disabled={
              savingSettings
            }
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#c91f2b] text-[9px] font-bold text-white"
          >
            {savingSettings ? (
              <Loader2
                size={14}
                className="animate-spin"
              />
            ) : (
              <Save size={14} />
            )}

            Save booking
          </button>

        </div>
      </div>

      {/* ===================================================
          STATUS
      =================================================== */}

      {message && (
        <div className="mt-5 rounded-xl border border-[#cce8d4] bg-[#f1fbf4] px-4 py-3">
          <div className="flex items-center gap-2">
            <Check
              size={14}
              className="text-green-600"
            />

            <p className="text-[10px] font-bold text-green-800">
              {message}
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-5 rounded-xl border border-[#f0caca] bg-[#fff5f5] px-4 py-3">
          <p className="text-[10px] font-bold text-red-800">
            Something went wrong
          </p>

          <p className="mt-1 text-[9px] text-red-700">
            {error}
          </p>
        </div>
      )}

    </main>
  );
}