"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  Edit3,
  Mail,
  MessageCircle,
  Phone,
  RefreshCw,
  Search,
  Send,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";

type FollowUpStatus = "pending" | "sent" | "completed" | "cancelled";

type FollowUpTask = {
  id: string;
  lead_id: string;
  booking_id: string | null;
  task_type: string;
  due_at: string;
  status: FollowUpStatus;
  channel: string | null;
  message_template: string | null;
  sent_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

type Lead = {
  id: string;
  full_name: string;
  whatsapp_number: string | null;
  email: string | null;
  status: string;
};

type Booking = {
  id: string;
  lead_id: string;
  slot_id: string;
  instrument: string;
  status: string;
};

type LessonSlot = {
  id: string;
  instrument?: string;
  starts_at: string;
  ends_at: string;
};

type BookingCallLog = {
  id: string;
  booking_id: string;
  lead_id: string;
  called_at: string;
  notes: string | null;
  outcome: string | null;
  created_at: string;
};

type EmailTemplate = {
  template_key: string;
  name: string;
  category: string;
  enabled: boolean;
  subject: string;
  body: string;
  variables: unknown;
};

type FollowUpRecord = {
  task: FollowUpTask;
  lead: Lead | null;
  booking: Booking | null;
  slot: LessonSlot | null;
  calls: BookingCallLog[];
};

type Filter = "action" | "today" | "overdue" | "automated" | "history";

const NAIROBI_TIME_ZONE = "Africa/Nairobi";

const CALL_OUTCOMES = [
  ["called", "Call logged"],
  ["no_answer", "No answer"],
  ["interested", "Interested"],
  ["wants_to_register", "Wants to register"],
  ["wants_to_think", "Wants to think"],
  ["call_back_later", "Call back later"],
  ["not_interested", "Not interested"],
  ["already_registered", "Already registered"],
  ["wrong_number", "Wrong number"],
  ["other", "Other"],
] as const;

const AUTOMATED_TASK_TYPES = [
  "trial_reminder_7d",
  "trial_reminder_3d",
  "trial_reminder_24h",
  "trial_reminder_6h",
  "trial_reminder_1h",
  "trial_reminder_2h",
];

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-KE", {
    timeZone: NAIROBI_TIME_ZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatLongDate(value: string) {
  return new Intl.DateTimeFormat("en-KE", {
    timeZone: NAIROBI_TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-KE", {
    timeZone: NAIROBI_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatTimeRange(startsAt: string, endsAt: string) {
  return `${formatTime(startsAt)} – ${formatTime(endsAt)}`;
}

function dateKey(value: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: NAIROBI_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function getTodayKey() {
  return dateKey(new Date().toISOString());
}

function instrumentLabel(instrument: string | null | undefined) {
  if (!instrument) return "Instrument not set";
  const normalized = instrument.toLowerCase();
  if (normalized === "piano") return "Piano";
  if (normalized === "guitar") return "Guitar";
  return instrument.charAt(0).toUpperCase() + instrument.slice(1);
}

function taskTypeLabel(taskType: string) {
  const labels: Record<string, string> = {
    trial_reminder_7d: "Trial lesson reminder — 7 days",
    trial_reminder_3d: "Trial lesson reminder — 3 days",
    trial_reminder_24h: "Trial lesson reminder — 24 hours",
    trial_reminder_6h: "Trial lesson reminder — 6 hours",
    trial_reminder_1h: "Trial lesson reminder — 1 hour",
    trial_reminder_2h: "Trial lesson reminder — 2 hours",
    post_trial_follow_up: "Post-trial follow-up",
    trial_reschedule_follow_up: "Trial reschedule follow-up",
  };
  return labels[taskType] ?? taskType.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function handoverLabel(record: FollowUpRecord) {
  if (record.task.message_template === "attended_not_registered") {
    return "Attended — not registered";
  }
  if (record.task.message_template === "attended_already_registered_start_lessons") {
    return "Attended — ready to start lessons";
  }
  if (record.task.task_type === "trial_reschedule_follow_up") {
    return "Trial missed/cancelled — reschedule";
  }
  return taskTypeLabel(record.task.task_type);
}

function callOutcomeLabel(outcome: string | null) {
  return CALL_OUTCOMES.find(([key]) => key === outcome)?.[1] ?? outcome ?? "Not recorded";
}

function statusLabel(status: FollowUpStatus) {
  switch (status) {
    case "pending": return "Pending";
    case "sent": return "Sent";
    case "completed": return "Completed";
    case "cancelled": return "Cancelled";
    default: return status;
  }
}

function statusClasses(status: FollowUpStatus) {
  switch (status) {
    case "pending": return "bg-amber-50 text-amber-700";
    case "sent": return "bg-blue-50 text-blue-700";
    case "completed": return "bg-green-50 text-green-700";
    case "cancelled": return "bg-gray-100 text-gray-600";
    default: return "bg-gray-50 text-gray-600";
  }
}

function channelLabel(channel: string | null) {
  if (channel === "email") return "Email";
  if (channel === "whatsapp") return "WhatsApp";
  return "Manual";
}

function channelClasses(channel: string | null) {
  if (channel === "email") return "bg-blue-50 text-blue-700";
  if (channel === "whatsapp") return "bg-green-50 text-green-700";
  return "bg-gray-100 text-gray-600";
}

function isOpen(record: FollowUpRecord) {
  return record.task.status === "pending" || record.task.status === "sent";
}

function isAutomated(record: FollowUpRecord) {
  return AUTOMATED_TASK_TYPES.includes(record.task.task_type);
}

function isActionRequired(record: FollowUpRecord) {
  if (!isOpen(record)) return false;
  return !isAutomated(record) || record.task.task_type === "post_trial_follow_up" || record.task.task_type === "trial_reschedule_follow_up";
}

function isOverdue(record: FollowUpRecord) {
  return isOpen(record) && new Date(record.task.due_at).getTime() < Date.now();
}

function relativeTiming(value: string) {
  const difference = new Date(value).getTime() - Date.now();
  const minutes = Math.round(Math.abs(difference) / 60000);
  if (difference < 0) {
    if (minutes < 60) return `Overdue by ${minutes} min`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `Overdue by ${hours} ${hours === 1 ? "hour" : "hours"}`;
    const days = Math.round(hours / 24);
    return `Overdue by ${days} ${days === 1 ? "day" : "days"}`;
  }
  if (minutes < 60) return `Due in ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Due in ${hours} ${hours === 1 ? "hour" : "hours"}`;
  const days = Math.round(hours / 24);
  return `Due in ${days} ${days === 1 ? "day" : "days"}`;
}

function initials(name: string) {
  return name.trim().split(/\s+/).map((word) => word[0]).join("").slice(0, 2).toUpperCase();
}

function substituteTemplate(text: string, record: FollowUpRecord) {
  const variables: Record<string, string> = {
    full_name: record.lead?.full_name ?? "",
    instrument: instrumentLabel(record.booking?.instrument),
    lesson_date: record.slot ? formatLongDate(record.slot.starts_at) : "",
    lesson_time: record.slot ? formatTimeRange(record.slot.starts_at, record.slot.ends_at) : "",
  };
  return text.replace(/{{\s*([^}]+?)\s*}}/g, (_, key: string) => variables[key.trim()] ?? "");
}

function findEmailTemplate(record: FollowUpRecord, templates: EmailTemplate[]) {
  const key = record.task.message_template;
  if (key) {
    const exact = templates.find((template) => template.template_key === key);
    if (exact) return exact;
  }

  const sameTask = templates.find((template) => template.template_key === record.task.task_type);
  if (sameTask) return sameTask;

  if (record.task.task_type === "trial_reschedule_follow_up") {
    return templates.find((template) => template.template_key === "trial_reschedule") ?? null;
  }

  return null;
}

export default function AdminFollowupsPage() {
  const router = useRouter();
  const [records, setRecords] = useState<FollowUpRecord[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("action");
  const [selectedRecord, setSelectedRecord] = useState<FollowUpRecord | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [editingCall, setEditingCall] = useState<BookingCallLog | null>(null);
  const [callOutcomeDraft, setCallOutcomeDraft] = useState("called");
  const [callNotesDraft, setCallNotesDraft] = useState("");
  const [savingCall, setSavingCall] = useState(false);
  const [emailRecord, setEmailRecord] = useState<FollowUpRecord | null>(null);
  const [emailTemplate, setEmailTemplate] = useState<EmailTemplate | null>(null);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);

  async function loadFollowups(silent = false) {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError("");

    const { data: taskData, error: taskError } = await supabase
      .from("follow_up_tasks")
      .select(`id, lead_id, booking_id, task_type, due_at, status, channel, message_template, sent_at, completed_at, created_at, updated_at`)
      .order("due_at", { ascending: true });

    if (taskError) {
      console.error("Follow-ups load error:", taskError);
      setError("We couldn't load follow-ups. Please try again.");
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const tasks = (taskData ?? []) as FollowUpTask[];
    if (tasks.length === 0) {
      setRecords([]);
      setTemplates([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const leadIds = Array.from(new Set(tasks.map((task) => task.lead_id)));
    const bookingIds = Array.from(new Set(tasks.map((task) => task.booking_id).filter((id): id is string => Boolean(id))));

    const [leadsResult, bookingsResult, templatesResult] = await Promise.all([
      supabase.from("leads").select("id, full_name, whatsapp_number, email, status").in("id", leadIds),
      bookingIds.length
        ? supabase.from("bookings").select("id, lead_id, slot_id, instrument, status").in("id", bookingIds)
        : Promise.resolve({ data: [], error: null }),
      supabase.from("email_templates").select("template_key, name, category, enabled, subject, body, variables").eq("enabled", true).order("category").order("name"),
    ]);

    if (leadsResult.error) console.error("Leads load error:", leadsResult.error);
    if (bookingsResult.error) console.error("Bookings load error:", bookingsResult.error);
    if (templatesResult.error) console.error("Email templates load error:", templatesResult.error);

    const leads = (leadsResult.data ?? []) as Lead[];
    const bookings = (bookingsResult.data ?? []) as Booking[];
    const slotIds = Array.from(new Set(bookings.map((booking) => booking.slot_id)));

    let slots: LessonSlot[] = [];
    if (slotIds.length) {
      const { data: slotData, error: slotError } = await supabase
        .from("lesson_slots")
        .select("id, starts_at, ends_at")
        .in("id", slotIds);
      if (slotError) console.error("Lesson slots load error:", slotError);
      slots = (slotData ?? []) as LessonSlot[];
    }

    let calls: BookingCallLog[] = [];
    if (bookingIds.length) {
      const { data: callData, error: callError } = await supabase
        .from("booking_call_logs")
        .select("id, booking_id, lead_id, called_at, notes, outcome, created_at")
        .in("booking_id", bookingIds)
        .order("called_at", { ascending: false });
      if (callError) console.error("Call history load error:", callError);
      calls = (callData ?? []) as BookingCallLog[];
    }

    const leadMap = new Map(leads.map((lead) => [lead.id, lead]));
    const bookingMap = new Map(bookings.map((booking) => [booking.id, booking]));
    const slotMap = new Map(slots.map((slot) => [slot.id, slot]));
    const callsMap = new Map<string, BookingCallLog[]>();

    for (const call of calls) {
      const existing = callsMap.get(call.booking_id) ?? [];
      existing.push(call);
      callsMap.set(call.booking_id, existing);
    }

    const loaded = tasks.map((task) => {
      const booking = task.booking_id ? bookingMap.get(task.booking_id) ?? null : null;
      const slot = booking ? slotMap.get(booking.slot_id) ?? null : null;
      return {
        task,
        lead: leadMap.get(task.lead_id) ?? null,
        booking,
        slot,
        calls: booking ? callsMap.get(booking.id) ?? [] : [],
      };
    });

    setRecords(loaded);
    setTemplates((templatesResult.data ?? []) as EmailTemplate[]);
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => {
    loadFollowups();
  }, []);

  const stats = useMemo(() => ({
    action: records.filter(isActionRequired).length,
    today: records.filter((record) => isOpen(record) && dateKey(record.task.due_at) === getTodayKey()).length,
    overdue: records.filter(isOverdue).length,
    automated: records.filter((record) => isAutomated(record) && isOpen(record)).length,
    history: records.filter((record) => record.task.status === "completed" || record.task.status === "cancelled").length,
  }), [records]);

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    return records.filter((record) => {
      if (filter === "action" && !isActionRequired(record)) return false;
      if (filter === "today" && !(isOpen(record) && dateKey(record.task.due_at) === getTodayKey())) return false;
      if (filter === "overdue" && !isOverdue(record)) return false;
      if (filter === "automated" && !(isAutomated(record) && isOpen(record))) return false;
      if (filter === "history" && !(record.task.status === "completed" || record.task.status === "cancelled")) return false;
      if (!query) return true;

      const searchable = [
        record.lead?.full_name,
        record.lead?.whatsapp_number,
        record.lead?.email,
        record.task.task_type,
        record.task.message_template,
        record.booking?.instrument,
        record.slot?.starts_at,
        ...record.calls.flatMap((call) => [call.outcome, call.notes]),
      ].filter(Boolean).join(" ").toLowerCase();

      return searchable.includes(query);
    });
  }, [records, search, filter]);

  async function updateTaskStatus(record: FollowUpRecord, status: FollowUpStatus) {
    setUpdatingId(record.task.id);
    setError("");
    const now = new Date().toISOString();
    const patch: Record<string, string> = { status, updated_at: now };
    if (status === "sent") patch.sent_at = now;
    if (status === "completed") patch.completed_at = now;

    const { error: updateError } = await supabase
      .from("follow_up_tasks")
      .update(patch)
      .eq("id", record.task.id);

    if (updateError) {
      console.error("Follow-up update error:", updateError);
      setError("We couldn't update this follow-up.");
      setUpdatingId(null);
      return;
    }

    setSelectedRecord(null);
    await loadFollowups(true);
    setUpdatingId(null);
  }

  async function recordCall(record: FollowUpRecord) {
    if (!record.booking) {
      setError("This follow-up is not linked to a booking.");
      return;
    }

    setError("");
    const { data, error: rpcError } = await supabase.rpc("record_booking_call", {
      p_booking_id: record.booking.id,
      p_notes: "Call initiated from Follow-ups page.",
      p_outcome: "called",
    });

    if (rpcError) {
      console.error("Record call error:", rpcError);
      setError("We couldn't record the call. Please try again.");
      return;
    }

    const created = (data ?? [])[0] as BookingCallLog | undefined;
    if (created) {
      setEditingCall(created);
      setCallOutcomeDraft(created.outcome ?? "called");
      setCallNotesDraft(created.notes ?? "");
    }

    await loadFollowups(true);

    if (record.lead?.whatsapp_number) {
      window.open(`tel:${record.lead.whatsapp_number}`, "_blank");
    }
  }

  function editCall(call: BookingCallLog) {
    setEditingCall(call);
    setCallOutcomeDraft(call.outcome ?? "called");
    setCallNotesDraft(call.notes ?? "");
  }

  async function saveCallResponse() {
    if (!editingCall) return;

    const callId = editingCall.id;
    const notes = callNotesDraft.trim();
    const outcome = callOutcomeDraft.trim() || "called";

    setSavingCall(true);
    setError("");

    try {
      console.log("Saving call response", { callId, outcome, notes });

      const { data: rpcData, error: rpcError } = await supabase.rpc(
        "update_booking_call_log",
        {
          p_call_id: callId,
          p_notes: notes || null,
          p_outcome: outcome,
        }
      );

      if (rpcError) {
        console.error("Update call response RPC error:", rpcError);
        setError(rpcError.message || "We couldn't save the call response.");
        return;
      }

      const savedFromRpc = (rpcData ?? [])[0] as BookingCallLog | undefined;

      // Verify the row that is actually stored in production before closing the modal.
      const { data: verifiedCall, error: verifyError } = await supabase
        .from("booking_call_logs")
        .select("id, booking_id, lead_id, called_at, notes, outcome, created_at")
        .eq("id", callId)
        .maybeSingle();

      if (verifyError) {
        console.error("Call response verification error:", verifyError);
        setError("The response may have been saved, but we couldn't verify it. The form was kept open.");
        return;
      }

      const savedCall = verifiedCall as BookingCallLog | null;
      if (!savedCall || savedCall.id !== callId || savedCall.outcome !== outcome || (savedCall.notes ?? "") !== notes) {
        console.error("Call response verification mismatch", { savedCall, savedFromRpc, callId, outcome, notes });
        setError("The response was not confirmed as saved. Please try again.");
        return;
      }

      setSelectedRecord((current) => {
        if (!current) return current;
        return {
          ...current,
          calls: current.calls.map((call) => call.id === callId ? savedCall : call),
        };
      });

      setRecords((current) => current.map((record) => {
        if (!record.calls.some((call) => call.id === callId)) return record;
        return {
          ...record,
          calls: record.calls.map((call) => call.id === callId ? savedCall : call),
        };
      }));

      setEditingCall(null);
      setCallNotesDraft("");
      setCallOutcomeDraft("called");

      // Refresh after the verified save, but do not let refresh control modal state.
      void loadFollowups(true);
    } catch (saveError) {
      console.error("Unexpected call response save error:", saveError);
      setError("We couldn't save the call response. Please try again.");
    } finally {
      setSavingCall(false);
    }
  }

  function openWhatsApp(record: FollowUpRecord) {
    const phone = record.lead?.whatsapp_number?.replace(/[^0-9]/g, "");
    if (!phone) return;

    let message = record.task.message_template ?? `Hello ${record.lead?.full_name ?? ""}, this is Sauti Tamu Piano Center.`;
    if (record.booking && record.slot) {
      message += ` Your ${instrumentLabel(record.booking.instrument)} trial lesson is scheduled for ${formatLongDate(record.slot.starts_at)} at ${formatTime(record.slot.starts_at)}.`;
    }

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank");
  }

  function openEmail(record: FollowUpRecord) {
    if (!record.lead?.email) {
      setError("This lead has no email address.");
      return;
    }

    const template = findEmailTemplate(record, templates);
    if (!template) {
      setError("No email template is configured for this follow-up.");
      return;
    }

    setEmailRecord(record);
    setEmailTemplate(template);
    setEmailSubject(substituteTemplate(template.subject, record));
    setEmailBody(substituteTemplate(template.body, record));
  }

  async function sendEmail() {
    if (!emailRecord || !emailTemplate) return;
    setSendingEmail(true);
    setError("");

    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;

    if (!session) {
      setError("Your session has expired. Please sign in again.");
      setSendingEmail(false);
      return;
    }

    try {
      const response = await fetch("/api/followups/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          task_id: emailRecord.task.id,
          template_key: emailTemplate.template_key,
          subject: emailSubject,
          body: emailBody,
        }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(result.error ?? "Email could not be sent.");
        setSendingEmail(false);
        return;
      }

      setEmailRecord(null);
      setEmailTemplate(null);
      await loadFollowups(true);
    } catch (sendError) {
      console.error("Email send error:", sendError);
      setError("Email could not be sent.");
    }

    setSendingEmail(false);
  }

  const filters: Array<[Filter, string, number]> = [
    ["action", "Action required", stats.action],
    ["today", "Today", stats.today],
    ["overdue", "Overdue", stats.overdue],
    ["automated", "Automated reminders", stats.automated],
    ["history", "History", stats.history],
  ];

  return (
    <main className="st-content">
      <div className="mb-7 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="st-eyebrow">RELATIONSHIPS</p>
          <h1 className="st-page-title mt-2">Follow-ups</h1>
          <p className="st-page-description">
            Handover from Bookings — every lead that needs a next action.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => router.push("/admin/email-templates")} className="st-button st-button-secondary w-fit">
            <Edit3 size={14} />
            Email Templates
          </button>
          <button type="button" onClick={() => loadFollowups(true)} className="st-button st-button-secondary w-fit">
            <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {filters.map(([key, label, count]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`st-card p-5 text-left transition ${filter === key ? "ring-2 ring-[var(--st-red)]/30" : ""}`}
          >
            <p className="m-0 text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">{label}</p>
            <p className={`mt-3 mb-0 text-[30px] font-bold leading-none ${key === "overdue" ? "text-red-700" : key === "today" ? "text-blue-700" : key === "automated" ? "text-violet-700" : key === "history" ? "text-green-700" : "text-[var(--st-red)]"}`}>
              {count}
            </p>
          </button>
        ))}
      </section>

      {stats.overdue > 0 && (
        <section className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-600" />
            <div>
              <p className="m-0 text-[11px] font-bold text-red-800">
                {stats.overdue} follow-up{stats.overdue === 1 ? "" : "s"} overdue
              </p>
              <p className="mt-1 mb-0 text-[10px] leading-relaxed text-red-700">
                These leads need attention now.
              </p>
            </div>
          </div>
        </section>
      )}

      <section className="st-card mt-6 p-4">
        <div className="relative">
          <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--st-gray)]" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search lead, phone, email, instrument, task or call response"
            className="w-full rounded-xl border border-[var(--st-border)] bg-white py-3.5 pl-11 pr-4 text-[12px] outline-none transition focus:border-[var(--st-red)] focus:ring-2 focus:ring-[var(--st-red)]/10"
          />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {filters.map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`rounded-xl px-3 py-3 text-[10px] font-bold transition ${filter === key ? "bg-[var(--st-red)] text-white" : "bg-[var(--st-bg-soft)] text-[var(--st-gray)] hover:text-[var(--st-charcoal-dark)]"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {error && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <p className="m-0 text-[10px] text-red-700">{error}</p>
        </div>
      )}

      <section className="mt-7">
        <div className="mb-4">
          <p className="st-eyebrow">
            {filter === "action" ? "ACTION REQUIRED" : filter === "automated" ? "AUTOMATED REMINDERS" : filter === "history" ? "FOLLOW-UP HISTORY" : "FOLLOW-UP QUEUE"}
          </p>
          <p className="mt-1 mb-0 text-[10px] text-[var(--st-gray)]">
            {filteredRecords.length} {filteredRecords.length === 1 ? "task" : "tasks"}
          </p>
        </div>

        {loading ? (
          <div className="st-card flex min-h-[260px] items-center justify-center gap-2 text-[10px] text-[var(--st-gray)]">
            <RefreshCw size={16} className="animate-spin" />
            Loading follow-ups...
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="st-card flex min-h-[300px] flex-col items-center justify-center px-5 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--st-bg-soft)] text-green-600">
              <CheckCircle2 size={24} />
            </div>
            <p className="mt-5 mb-0 text-[14px] font-bold text-[var(--st-charcoal-dark)]">No follow-ups here</p>
            <p className="mt-2 max-w-[330px] text-[10px] leading-relaxed text-[var(--st-gray)]">
              New handover tasks generated from Bookings will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRecords.map((record) => {
              const task = record.task;
              const lead = record.lead;
              const booking = record.booking;
              const slot = record.slot;
              const latestCall = record.calls[0] ?? null;
              const overdue = isOverdue(record);

              return (
                <div key={task.id} className={`st-card p-5 transition ${overdue ? "border-red-200" : ""}`}>
                  <div className="flex items-start gap-4">
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${overdue ? "bg-red-50 text-red-600" : isActionRequired(record) ? "bg-[var(--st-bg-soft)] text-[var(--st-red)]" : "bg-blue-50 text-blue-700"}`}>
                      {overdue ? <AlertCircle size={18} /> : isActionRequired(record) ? <Clock3 size={18} /> : <Mail size={18} />}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="text-[13px] font-bold text-[var(--st-charcoal-dark)]">{lead?.full_name ?? "Unknown lead"}</p>
                          <p className="mt-1 text-[9px] text-[var(--st-gray)]">{handoverLabel(record)}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <span className={`rounded-full px-2.5 py-1.5 text-[8px] font-bold ${statusClasses(task.status)}`}>{statusLabel(task.status)}</span>
                          <span className={`rounded-full px-2.5 py-1.5 text-[8px] font-bold ${channelClasses(task.channel)}`}>{channelLabel(task.channel)}</span>
                        </div>
                      </div>

                      {booking && slot && (
                        <div className="mt-4 rounded-xl border border-[var(--st-border)] bg-white p-4">
                          <div className="flex items-start gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--st-bg-soft)] text-[var(--st-red)]">
                              <CalendarDays size={15} />
                            </div>
                            <div className="min-w-0">
                              <p className="m-0 text-[8px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">TRIAL LESSON</p>
                              <p className="mt-1 text-[12px] font-bold text-[var(--st-charcoal-dark)]">{instrumentLabel(booking.instrument)}</p>
                              <p className="mt-1 text-[10px] text-[var(--st-gray)]">{formatLongDate(slot.starts_at)}</p>
                              <p className="mt-1 text-[12px] font-bold text-[var(--st-red)]">{formatTimeRange(slot.starts_at, slot.ends_at)}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div>
                          <p className="m-0 text-[8px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">Follow-up due</p>
                          <p className={`mt-1 text-[10px] font-semibold ${overdue ? "text-red-600" : "text-[var(--st-charcoal-dark)]"}`}>{formatDateTime(task.due_at)}</p>
                        </div>
                        <div>
                          <p className="m-0 text-[8px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">Timing</p>
                          <p className={`mt-1 text-[10px] font-bold ${overdue ? "text-red-600" : "text-[var(--st-charcoal-dark)]"}`}>{relativeTiming(task.due_at)}</p>
                        </div>
                        <div>
                          <p className="m-0 text-[8px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">Latest call</p>
                          <p className="mt-1 truncate text-[10px] font-semibold text-[var(--st-charcoal-dark)]">
                            {latestCall ? `${formatDateTime(latestCall.called_at)} · ${callOutcomeLabel(latestCall.outcome)}` : "No call recorded"}
                          </p>
                        </div>
                      </div>

                      {latestCall?.notes && (
                        <div className="mt-4 rounded-xl bg-[var(--st-bg-soft)] p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="m-0 text-[8px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">CALL RESPONSE</p>
                              <p className="mt-1 text-[9px] leading-relaxed text-[var(--st-charcoal-dark)]">{latestCall.notes}</p>
                            </div>
                            <button type="button" onClick={() => editCall(latestCall)} className="shrink-0 text-[9px] font-bold text-[var(--st-red)]">
                              Edit
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="mt-4 flex flex-wrap gap-2">
                        {lead?.whatsapp_number && (
                          <button type="button" onClick={() => openWhatsApp(record)} className="st-button st-button-secondary !px-3 !py-2 text-[9px]">
                            <MessageCircle size={13} /> WhatsApp
                          </button>
                        )}
                        {lead?.whatsapp_number && booking && (
                          <button type="button" onClick={() => recordCall(record)} className="st-button st-button-secondary !px-3 !py-2 text-[9px]">
                            <Phone size={13} /> Call
                          </button>
                        )}
                        {lead?.email && (
                          <button type="button" onClick={() => openEmail(record)} className="st-button st-button-secondary !px-3 !py-2 text-[9px]">
                            <Mail size={13} /> Email
                          </button>
                        )}
                        <button type="button" onClick={() => setSelectedRecord(record)} className="st-button st-button-secondary !px-3 !py-2 text-[9px]">
                          View <ArrowRight size={13} />
                        </button>
                        {task.status === "pending" && (
                          <button type="button" disabled={updatingId === task.id} onClick={() => updateTaskStatus(record, "sent")} className="st-button st-button-secondary !px-3 !py-2 text-[9px] disabled:opacity-50">
                            {updatingId === task.id ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />} Mark sent
                          </button>
                        )}
                        {isOpen(record) && (
                          <button type="button" disabled={updatingId === task.id} onClick={() => updateTaskStatus(record, "completed")} className="st-button st-button-primary !px-3 !py-2 text-[9px] disabled:opacity-50">
                            {updatingId === task.id ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />} Complete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {selectedRecord && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 sm:items-center sm:p-5">
          <div className="max-h-[92vh] w-full max-w-[560px] overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="st-eyebrow">BOOKING HANDOVER</p>
                <h2 className="mt-1 text-[20px] font-bold text-[var(--st-charcoal-dark)]">{selectedRecord.lead?.full_name ?? "Unknown lead"}</h2>
              </div>
              <button type="button" onClick={() => setSelectedRecord(null)} className="st-icon-button"><X size={17} /></button>
            </div>

            <div className="mt-6 rounded-2xl bg-[var(--st-bg-soft)] p-5">
              <p className="m-0 text-[8px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">NEXT ACTION</p>
              <p className="mt-1 text-[14px] font-bold text-[var(--st-charcoal-dark)]">{handoverLabel(selectedRecord)}</p>
              <p className="mt-2 text-[10px] text-[var(--st-gray)]">Status: {statusLabel(selectedRecord.task.status)}</p>
            </div>

            {selectedRecord.booking && selectedRecord.slot && (
              <div className="mt-5 rounded-2xl border border-[var(--st-border)] p-5">
                <p className="m-0 text-[8px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">TRIAL LESSON</p>
                <p className="mt-1 text-[14px] font-bold text-[var(--st-charcoal-dark)]">{instrumentLabel(selectedRecord.booking.instrument)}</p>
                <p className="mt-1 text-[10px] text-[var(--st-gray)]">{formatLongDate(selectedRecord.slot.starts_at)}</p>
                <p className="mt-1 text-[15px] font-bold text-[var(--st-red)]">{formatTimeRange(selectedRecord.slot.starts_at, selectedRecord.slot.ends_at)}</p>
              </div>
            )}

            <div className="mt-5">
              <div className="flex items-center justify-between">
                <p className="m-0 text-[8px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">CALL HISTORY</p>
                <span className="text-[8px] font-bold text-[var(--st-gray)]">{selectedRecord.calls.length} call{selectedRecord.calls.length === 1 ? "" : "s"}</span>
              </div>

              {selectedRecord.calls.length === 0 ? (
                <p className="mt-2 text-[10px] text-[var(--st-gray)]">No calls have been recorded for this booking yet.</p>
              ) : (
                <div className="mt-3 space-y-2">
                  {selectedRecord.calls.map((call) => (
                    <div key={call.id} className="rounded-xl border border-[var(--st-border)] p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="m-0 text-[9px] font-bold text-[var(--st-charcoal-dark)]">{formatDateTime(call.called_at)}</p>
                          <span className="mt-1 inline-flex rounded-full bg-[var(--st-bg-soft)] px-2 py-1 text-[8px] font-bold text-[var(--st-red)]">{callOutcomeLabel(call.outcome)}</span>
                        </div>
                        <button type="button" onClick={() => editCall(call)} className="inline-flex items-center gap-1 text-[9px] font-bold text-[var(--st-red)]"><Edit3 size={11} /> Edit</button>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-[9px] leading-relaxed text-[var(--st-gray)]">{call.notes || "No response recorded."}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedRecord.task.message_template && (
              <div className="mt-5">
                <p className="m-0 text-[8px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">HANDOVER NOTE / TEMPLATE KEY</p>
                <div className="mt-2 rounded-xl border border-[var(--st-border)] p-4">
                  <p className="m-0 text-[10px] leading-relaxed text-[var(--st-charcoal-dark)]">{selectedRecord.task.message_template}</p>
                </div>
              </div>
            )}

            <div className="mt-6 grid grid-cols-2 gap-2">
              {selectedRecord.lead?.whatsapp_number && (
                <button type="button" onClick={() => openWhatsApp(selectedRecord)} className="st-button st-button-secondary w-full"><MessageCircle size={14} /> WhatsApp</button>
              )}
              {selectedRecord.lead?.email && (
                <button type="button" onClick={() => openEmail(selectedRecord)} className="st-button st-button-secondary w-full"><Mail size={14} /> Email</button>
              )}
              {selectedRecord.lead?.whatsapp_number && selectedRecord.booking && (
                <button type="button" onClick={() => recordCall(selectedRecord)} className="st-button st-button-secondary w-full"><Phone size={14} /> Call</button>
              )}
              {isOpen(selectedRecord) && (
                <button type="button" disabled={updatingId === selectedRecord.task.id} onClick={() => updateTaskStatus(selectedRecord, "completed")} className="st-button st-button-primary w-full disabled:opacity-50">
                  {updatingId === selectedRecord.task.id ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />} Complete
                </button>
              )}
            </div>

            {isOpen(selectedRecord) && (
              <button type="button" disabled={updatingId === selectedRecord.task.id} onClick={() => updateTaskStatus(selectedRecord, "cancelled")} className="mt-2 w-full rounded-xl px-4 py-3 text-[9px] font-bold text-gray-500 transition hover:bg-gray-100 disabled:opacity-50">
                Cancel follow-up
              </button>
            )}
          </div>
        </div>
      )}

      {editingCall && (
        <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/50 sm:items-center sm:p-5">
          <div className="w-full max-w-[500px] rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="st-eyebrow">CALL RESPONSE</p>
                <h2 className="mt-1 text-[18px] font-bold text-[var(--st-charcoal-dark)]">Record what happened</h2>
              </div>
              <button type="button" onClick={() => setEditingCall(null)} className="st-icon-button"><X size={17} /></button>
            </div>

            <label className="mt-5 block text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">Outcome</label>
            <select value={callOutcomeDraft} onChange={(event) => setCallOutcomeDraft(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-[var(--st-border)] bg-white px-3 text-[12px] outline-none focus:border-[var(--st-red)]">
              {CALL_OUTCOMES.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>

            <label className="mt-4 block text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">What did the lead say?</label>
            <textarea value={callNotesDraft} onChange={(event) => setCallNotesDraft(event.target.value)} rows={6} placeholder="Record the lead's response and the agreed next step..." className="mt-2 w-full rounded-xl border border-[var(--st-border)] p-3 text-[12px] leading-relaxed outline-none focus:border-[var(--st-red)]" />

            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => setEditingCall(null)} className="st-button st-button-secondary flex-1 justify-center">Cancel</button>
              <button type="button" disabled={savingCall} onClick={saveCallResponse} className="st-button st-button-primary flex-1 justify-center disabled:opacity-50">
                {savingCall ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />} Save response
              </button>
            </div>
          </div>
        </div>
      )}

      {emailRecord && emailTemplate && (
        <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/50 sm:items-center sm:p-5">
          <div className="max-h-[92vh] w-full max-w-[620px] overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="st-eyebrow">EMAIL</p>
                <h2 className="mt-1 text-[18px] font-bold text-[var(--st-charcoal-dark)]">Preview & send</h2>
              </div>
              <button type="button" onClick={() => { setEmailRecord(null); setEmailTemplate(null); }} className="st-icon-button"><X size={17} /></button>
            </div>

            <div className="mt-5 rounded-xl bg-[var(--st-bg-soft)] p-3">
              <p className="m-0 text-[8px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">RECIPIENT</p>
              <p className="mt-1 text-[11px] font-semibold text-[var(--st-charcoal-dark)]">{emailRecord.lead?.full_name}</p>
              <p className="mt-1 text-[10px] text-[var(--st-gray)]">{emailRecord.lead?.email}</p>
              <p className="mt-1 text-[9px] text-[var(--st-gray)]">Template: {emailTemplate.name}</p>
            </div>

            <label className="mt-5 block text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">Subject</label>
            <input value={emailSubject} onChange={(event) => setEmailSubject(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-[var(--st-border)] px-3 text-[12px] outline-none focus:border-[var(--st-red)]" />

            <label className="mt-4 block text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">Message</label>
            <textarea value={emailBody} onChange={(event) => setEmailBody(event.target.value)} rows={14} className="mt-2 w-full rounded-xl border border-[var(--st-border)] p-3 text-[12px] leading-relaxed outline-none focus:border-[var(--st-red)]" />

            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => { setEmailRecord(null); setEmailTemplate(null); }} className="st-button st-button-secondary flex-1 justify-center">Cancel</button>
              <button type="button" disabled={sendingEmail} onClick={sendEmail} className="st-button st-button-primary flex-1 justify-center disabled:opacity-50">
                {sendingEmail ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />} Send email
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
