"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  Mail,
  MessageCircle,
  Phone,
  RefreshCw,
  Search,
  UserRound,
  X,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

type FollowUpStatus =
  | "pending"
  | "sent"
  | "completed"
  | "cancelled";

type MessageChannel =
  | "whatsapp"
  | "email";

type LeadStatus =
  | "new"
  | "booked"
  | "attended"
  | "follow_up"
  | "interested"
  | "registered"
  | "not_now"
  | "not_interested"
  | "no_show";

type Lead = {
  id: string;
  full_name: string;
  whatsapp_number: string;
  email: string;
  status: LeadStatus;
  next_follow_up_at: string | null;
};

type Booking = {
  id: string;
  lead_id: string;
  instrument: "piano" | "guitar";
  status:
    | "confirmed"
    | "completed"
    | "no_show"
    | "cancelled"
    | "rescheduled";
  attended_at: string | null;
};

type FollowUpTask = {
  id: string;
  lead_id: string;
  booking_id: string | null;
  task_type: string;
  due_at: string;
  status: FollowUpStatus;
  channel: MessageChannel | null;
  message_template: string | null;
  sent_at: string | null;
  completed_at: string | null;
  created_at: string;
};

type FollowUpRecord = {
  task: FollowUpTask;
  lead: Lead | null;
  booking: Booking | null;
};

type Filter =
  | "all"
  | "today"
  | "overdue"
  | "upcoming"
  | "completed";

const NAIROBI_TIME_ZONE = "Africa/Nairobi";

function getTodayKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: NAIROBI_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-KE", {
    timeZone: NAIROBI_TIME_ZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function isToday(value: string) {
  const taskDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: NAIROBI_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));

  return taskDate === getTodayKey();
}

function isOverdue(task: FollowUpTask) {
  return (
    task.status === "pending" &&
    new Date(task.due_at).getTime() <
      Date.now()
  );
}

function isUpcoming(task: FollowUpTask) {
  return (
    task.status === "pending" &&
    new Date(task.due_at).getTime() >=
      Date.now() &&
    !isToday(task.due_at)
  );
}

function taskTypeLabel(type: string) {
  const labels: Record<string, string> = {
    booking_confirmation:
      "Booking confirmation",
    reminder_24h:
      "24-hour reminder",
    reminder_2h:
      "2-hour reminder",
    post_trial:
      "Post-trial follow-up",
    no_show:
      "No-show follow-up",
    follow_up:
      "Lead follow-up",
    conversion:
      "Conversion follow-up",
  };

  return (
    labels[type] ??
    type
      .replace(/_/g, " ")
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase()
      )
  );
}

function statusLabel(
  status: FollowUpStatus
) {
  switch (status) {
    case "pending":
      return "Pending";
    case "sent":
      return "Sent";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
}

function statusClasses(
  status: FollowUpStatus
) {
  switch (status) {
    case "pending":
      return "bg-amber-50 text-amber-700";

    case "sent":
      return "bg-blue-50 text-blue-700";

    case "completed":
      return "bg-green-50 text-green-700";

    case "cancelled":
      return "bg-gray-100 text-gray-600";

    default:
      return "bg-gray-50 text-gray-600";
  }
}

function channelLabel(
  channel: MessageChannel | null
) {
  if (channel === "whatsapp") {
    return "WhatsApp";
  }

  if (channel === "email") {
    return "Email";
  }

  return "Manual";
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function leadStatusLabel(status: LeadStatus) {
  switch (status) {
    case "new":
      return "New";
    case "booked":
      return "Booked";
    case "attended":
      return "Attended";
    case "follow_up":
      return "Follow-up";
    case "interested":
      return "Interested";
    case "registered":
      return "Registered";
    case "not_now":
      return "Not now";
    case "not_interested":
      return "Not interested";
    case "no_show":
      return "No-show";
    default:
      return status;
  }
}

export default function AdminFollowUpsPage() {
  const [records, setRecords] =
    useState<FollowUpRecord[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [filter, setFilter] =
    useState<Filter>("all");

  const [selectedRecord, setSelectedRecord] =
    useState<FollowUpRecord | null>(null);

  const [updatingId, setUpdatingId] =
    useState<string | null>(null);

  /*
   * =========================================================
   * LOAD FOLLOW-UPS
   * =========================================================
   */

  async function loadFollowUps(
    silent = false
  ) {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    const {
      data: taskData,
      error: taskError,
    } = await supabase
      .from("follow_up_tasks")
      .select(
        `
          id,
          lead_id,
          booking_id,
          task_type,
          due_at,
          status,
          channel,
          message_template,
          sent_at,
          completed_at,
          created_at
        `
      )
      .order("due_at", {
        ascending: true,
      });

    if (taskError) {
      console.error(
        "Follow-up load error:",
        taskError
      );

      setError(
        "We couldn't load follow-ups. Please try again."
      );

      setLoading(false);
      setRefreshing(false);

      return;
    }

    const tasks =
      (taskData ?? []) as FollowUpTask[];

    if (tasks.length === 0) {
      setRecords([]);

      setLoading(false);
      setRefreshing(false);

      return;
    }

    const leadIds = Array.from(
      new Set(
        tasks.map(
          (task) => task.lead_id
        )
      )
    );

    const bookingIds = Array.from(
      new Set(
        tasks
          .map(
            (task) =>
              task.booking_id
          )
          .filter(
            (
              id
            ): id is string =>
              Boolean(id)
          )
      )
    );

    const [
      leadsResult,
      bookingsResult,
    ] = await Promise.all([
      supabase
        .from("leads")
        .select(
          `
            id,
            full_name,
            whatsapp_number,
            email,
            status,
            next_follow_up_at
          `
        )
        .in("id", leadIds),

      bookingIds.length > 0
        ? supabase
            .from("bookings")
            .select(
              `
                id,
                lead_id,
                instrument,
                status,
                attended_at
              `
            )
            .in("id", bookingIds)
        : Promise.resolve({
            data: [],
            error: null,
          }),
    ]);

    if (leadsResult.error) {
      console.error(
        "Leads load error:",
        leadsResult.error
      );
    }

    if (bookingsResult.error) {
      console.error(
        "Bookings load error:",
        bookingsResult.error
      );
    }

    const leads =
      (leadsResult.data ??
        []) as Lead[];

    const bookings =
      (bookingsResult.data ??
        []) as Booking[];

    const leadMap =
      new Map<string, Lead>();

    leads.forEach((lead) => {
      leadMap.set(
        lead.id,
        lead
      );
    });

    const bookingMap =
      new Map<string, Booking>();

    bookings.forEach((booking) => {
      bookingMap.set(
        booking.id,
        booking
      );
    });

    const loadedRecords =
      tasks.map((task) => ({
        task,
        lead:
          leadMap.get(
            task.lead_id
          ) ?? null,
        booking:
          task.booking_id
            ? bookingMap.get(
                task.booking_id
              ) ?? null
            : null,
      }));

    setRecords(
      loadedRecords
    );

    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => {
    loadFollowUps();
  }, []);

  /*
   * =========================================================
   * STATS
   * =========================================================
   */

  const stats = useMemo(() => {
    const pending =
      records.filter(
        (record) =>
          record.task.status ===
          "pending"
      ).length;

    const today =
      records.filter(
        (record) =>
          record.task.status ===
            "pending" &&
          isToday(
            record.task.due_at
          )
      ).length;

    const overdue =
      records.filter(
        (record) =>
          isOverdue(
            record.task
          )
      ).length;

    const completed =
      records.filter(
        (record) =>
          record.task.status ===
          "completed"
      ).length;

    const noShows =
      records.filter(
        (record) =>
          record.booking?.status ===
            "no_show" &&
          record.task.status ===
            "pending"
      ).length;

    return {
      pending,
      today,
      overdue,
      completed,
      noShows,
    };
  }, [records]);

  /*
   * =========================================================
   * FILTER
   * =========================================================
   */

  const filteredRecords =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return records.filter(
        (record) => {
          const task =
            record.task;

          if (
            filter ===
              "today" &&
            !(
              task.status ===
                "pending" &&
              isToday(
                task.due_at
              )
            )
          ) {
            return false;
          }

          if (
            filter ===
              "overdue" &&
            !isOverdue(task)
          ) {
            return false;
          }

          if (
            filter ===
              "upcoming" &&
            !isUpcoming(task)
          ) {
            return false;
          }

          if (
            filter ===
              "completed" &&
            task.status !==
              "completed"
          ) {
            return false;
          }

          if (!query) {
            return true;
          }

          const searchable = [
            record.lead
              ?.full_name ?? "",
            record.lead
              ?.email ?? "",
            record.lead
              ?.whatsapp_number ?? "",
            task.task_type,
            record.booking
              ?.instrument ?? "",
            task.channel ?? "",
          ]
            .join(" ")
            .toLowerCase();

          return searchable.includes(
            query
          );
        }
      );
    }, [
      records,
      search,
      filter,
    ]);

  /*
   * =========================================================
   * COMPLETE TASK
   * =========================================================
   */

  async function completeTask(
    record: FollowUpRecord
  ) {
    setUpdatingId(
      record.task.id
    );

    setError("");

    const now =
      new Date().toISOString();

    const {
      error: updateError,
    } = await supabase
      .from("follow_up_tasks")
      .update({
        status:
          "completed",
        completed_at: now,
        updated_at: now,
      })
      .eq(
        "id",
        record.task.id
      );

    if (updateError) {
      console.error(
        "Complete task error:",
        updateError
      );

      setError(
        "We couldn't complete this follow-up."
      );

      setUpdatingId(null);

      return;
    }

    /*
     * Keep the lead's next follow-up
     * date in sync when this task
     * is completed.
     */

    if (
      record.lead &&
      record.lead
        .next_follow_up_at
    ) {
      const {
        data: nextTask,
      } = await supabase
        .from(
          "follow_up_tasks"
        )
        .select(
          "due_at"
        )
        .eq(
          "lead_id",
          record.lead.id
        )
        .eq(
          "status",
          "pending"
        )
        .order(
          "due_at",
          {
            ascending:
              true,
          }
        )
        .limit(1)
        .maybeSingle();

      await supabase
        .from("leads")
        .update({
          next_follow_up_at:
            nextTask?.due_at ??
            null,
          updated_at: now,
        })
        .eq(
          "id",
          record.lead.id
        );
    }

    setSelectedRecord(
      null
    );

    setUpdatingId(null);

    await loadFollowUps(
      true
    );
  }

  /*
   * =========================================================
   * MARK SENT
   * =========================================================
   */

  async function markSent(
    record: FollowUpRecord
  ) {
    setUpdatingId(
      record.task.id
    );

    setError("");

    const now =
      new Date().toISOString();

    const {
      error: updateError,
    } = await supabase
      .from("follow_up_tasks")
      .update({
        status: "sent",
        sent_at: now,
        updated_at: now,
      })
      .eq(
        "id",
        record.task.id
      );

    if (updateError) {
      console.error(
        "Mark sent error:",
        updateError
      );

      setError(
        "We couldn't update this follow-up."
      );

      setUpdatingId(null);

      return;
    }

    setSelectedRecord(
      null
    );

    setUpdatingId(null);

    await loadFollowUps(
      true
    );
  }

  /*
   * =========================================================
   * WHATSAPP
   * =========================================================
   */

  function openWhatsApp(
    record: FollowUpRecord
  ) {
    if (
      !record.lead
        ?.whatsapp_number
    ) {
      return;
    }

    const phone =
      record.lead.whatsapp_number.replace(
        /[^0-9]/g,
        ""
      );

    const message =
      record.task
        .message_template ||
      `Hello ${record.lead.full_name}, this is Sauti Tamu Piano Center. We are following up with you regarding your trial lesson.`;

    window.open(
      `https://wa.me/${phone}?text=${encodeURIComponent(
        message
      )}`,
      "_blank"
    );
  }

  function callLead(
    record: FollowUpRecord
  ) {
    if (
      !record.lead
        ?.whatsapp_number
    ) {
      return;
    }

    window.location.href =
      `tel:${record.lead.whatsapp_number}`;
  }

  function emailLead(
    record: FollowUpRecord
  ) {
    if (
      !record.lead?.email
    ) {
      return;
    }

    window.location.href =
      `mailto:${record.lead.email}`;
  }

  /*
   * =========================================================
   * RENDER
   * =========================================================
   */

  return (
    <main className="st-content">

      {/* HEADER */}

      <div className="mb-7 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">

        <div>

          <p className="st-eyebrow">
            FOLLOW-UP
          </p>

          <h1 className="st-page-title mt-2">
            Follow-ups
          </h1>

          <p className="st-page-description">
            Stay on top of trial lesson leads,
            reminders and conversion opportunities.
          </p>

        </div>

        <button
          type="button"
          onClick={() =>
            loadFollowUps(true)
          }
          className="st-button st-button-secondary w-fit"
        >
          <RefreshCw
            size={15}
            className={
              refreshing
                ? "animate-spin"
                : ""
            }
          />
          Refresh
        </button>

      </div>

      {/* STATS */}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">

        <div className="st-card p-5">

          <p className="m-0 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
            Due today
          </p>

          <div className="mt-3 flex items-end justify-between">

            <p className="m-0 text-[30px] font-bold leading-none text-[var(--st-charcoal-dark)]">
              {stats.today}
            </p>

            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--st-bg-soft)] text-[var(--st-red)]">
              <CalendarDays size={18} />
            </div>

          </div>

        </div>

        <div className="st-card p-5">

          <p className="m-0 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
            Overdue
          </p>

          <div className="mt-3 flex items-end justify-between">

            <p className="m-0 text-[30px] font-bold leading-none text-red-600">
              {stats.overdue}
            </p>

            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-600">
              <AlertCircle size={18} />
            </div>

          </div>

        </div>

        <div className="st-card p-5">

          <p className="m-0 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
            Pending
          </p>

          <div className="mt-3 flex items-end justify-between">

            <p className="m-0 text-[30px] font-bold leading-none text-[var(--st-charcoal-dark)]">
              {stats.pending}
            </p>

            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 text-amber-700">
              <Clock3 size={18} />
            </div>

          </div>

        </div>

        <div className="st-card p-5">

          <p className="m-0 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
            Completed
          </p>

          <div className="mt-3 flex items-end justify-between">

            <p className="m-0 text-[30px] font-bold leading-none text-green-700">
              {stats.completed}
            </p>

            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-50 text-green-700">
              <CheckCircle2 size={18} />
            </div>

          </div>

        </div>

      </section>

      {/* NO-SHOW ALERT */}

      {stats.noShows > 0 && (
        <section className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">

          <div className="flex items-start gap-3">

            <AlertCircle
              size={17}
              className="mt-0.5 shrink-0 text-amber-700"
            />

            <div>

              <p className="m-0 text-[11px] font-bold text-amber-800">
                {stats.noShows} no-show{" "}
                {stats.noShows === 1
                  ? "lead needs"
                  : "leads need"}{" "}
                attention
              </p>

              <p className="mt-1 mb-0 text-[10px] leading-relaxed text-amber-700">
                Contact them as soon as possible
                and offer an easy way to reschedule
                their trial lesson.
              </p>

            </div>

          </div>

        </section>
      )}

      {/* SEARCH + FILTERS */}

      <section className="st-card mt-6 p-4">

        <div className="relative">

          <Search
            size={17}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--st-gray)]"
          />

          <input
            type="search"
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            placeholder="Search lead, phone, email or follow-up"
            className="w-full rounded-xl border border-[var(--st-border)] bg-white py-3.5 pl-11 pr-4 text-[12px] outline-none transition focus:border-[var(--st-red)] focus:ring-2 focus:ring-[var(--st-red)]/10"
          />

        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">

          {[
            {
              key: "all",
              label: "All",
            },
            {
              key: "today",
              label: "Today",
            },
            {
              key: "overdue",
              label: "Overdue",
            },
            {
              key: "upcoming",
              label: "Upcoming",
            },
            {
              key: "completed",
              label: "Completed",
            },
          ].map((item) => (

            <button
              key={item.key}
              type="button"
              onClick={() =>
                setFilter(
                  item.key as Filter
                )
              }
              className={`rounded-xl px-3 py-3 text-[10px] font-bold transition ${
                filter === item.key
                  ? "bg-[var(--st-red)] text-white"
                  : "bg-[var(--st-bg-soft)] text-[var(--st-gray)] hover:text-[var(--st-charcoal-dark)]"
              }`}
            >
              {item.label}
            </button>

          ))}

        </div>

      </section>

      {/* ERROR */}

      {error && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">

          <p className="m-0 text-[10px] leading-relaxed text-red-700">
            {error}
          </p>

        </div>
      )}

      {/* LIST */}

      <section className="mt-7">

        <div className="mb-4">

          <p className="st-eyebrow">
            {filter === "all"
              ? "ALL FOLLOW-UPS"
              : `${filter.toUpperCase()} FOLLOW-UPS`}
          </p>

          <p className="mt-1 mb-0 text-[10px] text-[var(--st-gray)]">
            {filteredRecords.length}{" "}
            {filteredRecords.length === 1
              ? "task"
              : "tasks"}
          </p>

        </div>

        {loading ? (

          <div className="st-card flex min-h-[260px] items-center justify-center gap-2 text-[10px] text-[var(--st-gray)]">

            <RefreshCw
              size={16}
              className="animate-spin"
            />

            Loading follow-ups...

          </div>

        ) : filteredRecords.length === 0 ? (

          <div className="st-card flex min-h-[300px] flex-col items-center justify-center px-5 text-center">

            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--st-bg-soft)] text-[var(--st-red)]">
              <CheckCircle2 size={22} />
            </div>

            <p className="mt-5 mb-0 text-[14px] font-bold text-[var(--st-charcoal-dark)]">
              No follow-ups here
            </p>

            <p className="mt-2 mb-0 max-w-[320px] text-[10px] leading-relaxed text-[var(--st-gray)]">
              There are no tasks matching the
              current filter.
            </p>

          </div>

        ) : (

          <div className="grid grid-cols-1 gap-3">

            {filteredRecords.map(
              (record) => {

                const task =
                  record.task;

                const overdue =
                  isOverdue(task);

                return (

                  <button
                    key={task.id}
                    type="button"
                    onClick={() =>
                      setSelectedRecord(
                        record
                      )
                    }
                    className={`st-card group w-full p-5 text-left transition-all hover:border-[var(--st-red)] ${
                      overdue
                        ? "border-red-200"
                        : ""
                    }`}
                  >

                    <div className="flex items-start gap-4">

                      {/* AVATAR */}

                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--st-bg-soft)] text-[10px] font-bold text-[var(--st-red)]">
                        {record.lead
                          ? initials(
                              record
                                .lead
                                .full_name
                            )
                          : "?"}
                      </div>

                      {/* CONTENT */}

                      <div className="min-w-0 flex-1">

                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">

                          <div className="min-w-0">

                            <p className="truncate text-[13px] font-bold text-[var(--st-charcoal-dark)]">
                              {record.lead
                                ?.full_name ??
                                "Unknown lead"}
                            </p>

                            <p className="mt-1 text-[10px] text-[var(--st-gray)]">
                              {taskTypeLabel(
                                task.task_type
                              )}

                              {record.booking && (
                                <>
                                  {" "}
                                  ·{" "}
                                  <span className="capitalize">
                                    {
                                      record
                                        .booking
                                        .instrument
                                    }
                                  </span>
                                </>
                              )}
                            </p>

                          </div>

                          <span
                            className={`w-fit shrink-0 rounded-full px-2.5 py-1.5 text-[8px] font-bold ${statusClasses(
                              task.status
                            )}`}
                          >
                            {statusLabel(
                              task.status
                            )}
                          </span>

                        </div>

                        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">

                          <div>

                            <p className="m-0 text-[8px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                              Due
                            </p>

                            <p
                              className={`mt-1 text-[10px] font-semibold ${
                                overdue
                                  ? "text-red-600"
                                  : "text-[var(--st-charcoal-dark)]"
                              }`}
                            >
                              {formatDateTime(
                                task.due_at
                              )}
                            </p>

                          </div>

                          <div>

                            <p className="m-0 text-[8px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                              Channel
                            </p>

                            <p className="mt-1 text-[10px] font-semibold text-[var(--st-charcoal-dark)]">
                              {channelLabel(
                                task.channel
                              )}
                            </p>

                          </div>

                          <div>

                            <p className="m-0 text-[8px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                              Lead status
                            </p>

                            <p className="mt-1 text-[10px] font-semibold text-[var(--st-charcoal-dark)]">
                              {record.lead
                                ? leadStatusLabel(
                                    record
                                      .lead
                                      .status
                                  )
                                : "Unknown"}
                            </p>

                          </div>

                        </div>

                        <div className="mt-4 flex items-center justify-between gap-3">

                          <div className="flex items-center gap-3">

                            {record.lead
                              ?.whatsapp_number && (
                              <span className="flex items-center gap-1.5 text-[9px] text-[var(--st-gray)]">
                                <Phone
                                  size={11}
                                  className="text-[var(--st-red)]"
                                />
                                {
                                  record
                                    .lead
                                    .whatsapp_number
                                }
                              </span>
                            )}

                          </div>

                          <span className="flex shrink-0 items-center gap-1 text-[9px] font-bold text-[var(--st-red)]">

                            View

                            <span className="transition-transform group-hover:translate-x-1">
                              →
                            </span>

                          </span>

                        </div>

                      </div>

                    </div>

                  </button>

                );
              }
            )}

          </div>

        )}

      </section>

      {/* =====================================================
          DETAIL DRAWER
      ===================================================== */}

      {selectedRecord && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 sm:items-center sm:p-5">

          <div className="max-h-[94vh] w-full max-w-[560px] overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">

            {/* HEADER */}

            <div className="sticky top-0 z-10 border-b border-[var(--st-border)] bg-white px-5 py-4">

              <div className="flex items-center justify-between gap-4">

                <div className="flex min-w-0 items-center gap-3">

                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--st-bg-soft)] text-[10px] font-bold text-[var(--st-red)]">
                    {selectedRecord.lead
                      ? initials(
                          selectedRecord
                            .lead
                            .full_name
                        )
                      : "?"}
                  </div>

                  <div className="min-w-0">

                    <p className="truncate text-[14px] font-bold text-[var(--st-charcoal-dark)]">
                      {selectedRecord
                        .lead
                        ?.full_name ??
                        "Unknown lead"}
                    </p>

                    <p className="mt-1 text-[9px] text-[var(--st-gray)]">
                      Follow-up task
                    </p>

                  </div>

                </div>

                <button
                  type="button"
                  onClick={() =>
                    setSelectedRecord(
                      null
                    )
                  }
                  className="st-icon-button"
                  aria-label="Close"
                >
                  <X size={17} />
                </button>

              </div>

            </div>

            <div className="p-5">

              {/* TASK OVERVIEW */}

              <div className="rounded-2xl bg-[var(--st-bg-soft)] p-5">

                <p className="m-0 text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--st-gray)]">
                  FOLLOW-UP
                </p>

                <h2 className="mt-2 text-[21px] font-bold text-[var(--st-charcoal-dark)]">
                  {taskTypeLabel(
                    selectedRecord
                      .task
                      .task_type
                  )}
                </h2>

                <div className="mt-4 flex flex-wrap gap-2">

                  <span
                    className={`rounded-full px-3 py-1.5 text-[8px] font-bold ${statusClasses(
                      selectedRecord
                        .task
                        .status
                    )}`}
                  >
                    {statusLabel(
                      selectedRecord
                        .task
                        .status
                    )}
                  </span>

                  <span className="rounded-full bg-white px-3 py-1.5 text-[8px] font-bold text-[var(--st-gray)]">
                    {channelLabel(
                      selectedRecord
                        .task
                        .channel
                    )}
                  </span>

                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">

                  <div className="rounded-xl bg-white p-3">

                    <p className="m-0 text-[8px] font-bold uppercase tracking-[0.06em] text-[var(--st-gray)]">
                      Due
                    </p>

                    <p className="mt-1 text-[10px] font-semibold text-[var(--st-charcoal-dark)]">
                      {formatDateTime(
                        selectedRecord
                          .task
                          .due_at
                      )}
                    </p>

                  </div>

                  <div className="rounded-xl bg-white p-3">

                    <p className="m-0 text-[8px] font-bold uppercase tracking-[0.06em] text-[var(--st-gray)]">
                      Lead status
                    </p>

                    <p className="mt-1 text-[10px] font-semibold text-[var(--st-charcoal-dark)]">
                      {selectedRecord.lead
                        ? leadStatusLabel(
                            selectedRecord
                              .lead
                              .status
                          )
                        : "Unknown"}
                    </p>

                  </div>

                </div>

              </div>

              {/* MESSAGE */}

              {selectedRecord.task
                .message_template && (
                <div className="mt-6">

                  <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--st-gray)]">
                    MESSAGE
                  </p>

                  <div className="rounded-xl border border-[var(--st-border)] bg-white p-4">

                    <p className="m-0 whitespace-pre-wrap text-[11px] leading-relaxed text-[var(--st-charcoal-dark)]">
                      {
                        selectedRecord
                          .task
                          .message_template
                      }
                    </p>

                  </div>

                </div>
              )}

              {/* CONTACT */}

              {selectedRecord.lead && (
                <div className="mt-6">

                  <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--st-gray)]">
                    CONTACT
                  </p>

                  <div className="space-y-3">

                    <div className="flex items-center gap-3">

                      <MessageCircle
                        size={15}
                        className="text-[var(--st-red)]"
                      />

                      <div>

                        <p className="m-0 text-[9px] text-[var(--st-gray)]">
                          WhatsApp
                        </p>

                        <p className="mt-1 text-[11px] font-semibold text-[var(--st-charcoal-dark)]">
                          {
                            selectedRecord
                              .lead
                              .whatsapp_number
                          }
                        </p>

                      </div>

                    </div>

                    <div className="flex items-center gap-3">

                      <Mail
                        size={15}
                        className="text-[var(--st-red)]"
                      />

                      <div>

                        <p className="m-0 text-[9px] text-[var(--st-gray)]">
                          Email
                        </p>

                        <p className="mt-1 break-all text-[11px] font-semibold text-[var(--st-charcoal-dark)]">
                          {
                            selectedRecord
                              .lead
                              .email
                          }
                        </p>

                      </div>

                    </div>

                  </div>

                </div>
              )}

              {/* ACTIONS */}

              <div className="mt-7 grid grid-cols-2 gap-2">

                <button
                  type="button"
                  onClick={() =>
                    openWhatsApp(
                      selectedRecord
                    )
                  }
                  disabled={
                    !selectedRecord
                      .lead
                      ?.whatsapp_number
                  }
                  className="st-button st-button-primary w-full disabled:opacity-40"
                >
                  <MessageCircle
                    size={15}
                  />
                  WhatsApp
                </button>

                <button
                  type="button"
                  onClick={() =>
                    callLead(
                      selectedRecord
                    )
                  }
                  disabled={
                    !selectedRecord
                      .lead
                      ?.whatsapp_number
                  }
                  className="st-button st-button-secondary w-full disabled:opacity-40"
                >
                  <Phone size={15} />
                  Call
                </button>

                <button
                  type="button"
                  onClick={() =>
                    emailLead(
                      selectedRecord
                    )
                  }
                  disabled={
                    !selectedRecord
                      .lead?.email
                  }
                  className="st-button st-button-secondary w-full disabled:opacity-40"
                >
                  <Mail size={15} />
                  Email
                </button>

                {selectedRecord.task
                  .status !==
                  "completed" && (
                  <button
                    type="button"
                    onClick={() =>
                      completeTask(
                        selectedRecord
                      )
                    }
                    disabled={
                      updatingId ===
                      selectedRecord
                        .task.id
                    }
                    className="st-button st-button-secondary w-full disabled:opacity-40"
                  >
                    {updatingId ===
                    selectedRecord
                      .task.id ? (
                      <RefreshCw
                        size={15}
                        className="animate-spin"
                      />
                    ) : (
                      <Check
                        size={15}
                      />
                    )}

                    Complete
                  </button>
                )}

                {selectedRecord.task
                  .status ===
                  "pending" && (
                  <button
                    type="button"
                    onClick={() =>
                      markSent(
                        selectedRecord
                      )
                    }
                    disabled={
                      updatingId ===
                      selectedRecord
                        .task.id
                    }
                    className="st-button st-button-secondary w-full disabled:opacity-40"
                  >
                    <CheckCircle2
                      size={15}
                    />
                    Mark sent
                  </button>
                )}

              </div>

            </div>

          </div>

        </div>
      )}

    </main>
  );
}