"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  MessageCircle,
  Phone,
  RefreshCw,
  Search,
  Users,
  X,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

type FollowUpStatus =
  | "pending"
  | "sent"
  | "completed"
  | "cancelled";

type MessageChannel =
  | "email"
  | "whatsapp";

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
  updated_at: string;
};

type Lead = {
  id: string;
  full_name: string;
  whatsapp_number: string;
  email: string;
  status: string;
};

type FollowUpRecord = {
  task: FollowUpTask;
  lead: Lead | null;
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

function formatDateTime(dateString: string) {
  return new Intl.DateTimeFormat("en-KE", {
    timeZone: NAIROBI_TIME_ZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(dateString));
}

function formatLongDate(dateString: string) {
  return new Intl.DateTimeFormat("en-KE", {
    timeZone: NAIROBI_TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(dateString));
}

function taskTypeLabel(taskType: string) {
  return taskType
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

function statusLabel(status: FollowUpStatus) {
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

function statusClasses(status: FollowUpStatus) {
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

function isToday(dateString: string) {
  const date = new Date(dateString);

  const key = new Intl.DateTimeFormat("en-CA", {
    timeZone: NAIROBI_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

  return key === getTodayKey();
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
      Date.now()
  );
}

function getRelativeLabel(task: FollowUpTask) {
  if (task.status === "completed") {
    return "Completed";
  }

  if (task.status === "cancelled") {
    return "Cancelled";
  }

  const due = new Date(task.due_at).getTime();
  const now = Date.now();

  const difference = due - now;

  const minutes = Math.round(
    Math.abs(difference) / (1000 * 60)
  );

  if (difference < 0) {
    if (minutes < 60) {
      return `Overdue by ${minutes} min`;
    }

    const hours = Math.round(minutes / 60);

    if (hours < 24) {
      return `Overdue by ${hours} ${
        hours === 1 ? "hour" : "hours"
      }`;
    }

    const days = Math.round(hours / 24);

    return `Overdue by ${days} ${
      days === 1 ? "day" : "days"
    }`;
  }

  if (minutes < 60) {
    return `Due in ${minutes} min`;
  }

  const hours = Math.round(minutes / 60);

  if (hours < 24) {
    return `Due in ${hours} ${
      hours === 1 ? "hour" : "hours"
    }`;
  }

  const days = Math.round(hours / 24);

  return `Due in ${days} ${
    days === 1 ? "day" : "days"
  }`;
}

export default function AdminFollowupsPage() {
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

  const [selectedTask, setSelectedTask] =
    useState<FollowUpRecord | null>(null);

  const [updatingId, setUpdatingId] =
    useState<string | null>(null);

  async function loadFollowups(
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
          created_at,
          updated_at
        `
      )
      .order("due_at", {
        ascending: true,
      });

    if (taskError) {
      console.error(
        "Follow-ups load error:",
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

    const {
      data: leadData,
      error: leadError,
    } = await supabase
      .from("leads")
      .select(
        `
          id,
          full_name,
          whatsapp_number,
          email,
          status
        `
      )
      .in("id", leadIds);

    if (leadError) {
      console.error(
        "Leads load error:",
        leadError
      );
    }

    const leads =
      (leadData ?? []) as Lead[];

    const leadMap =
      new Map<string, Lead>();

    leads.forEach((lead) => {
      leadMap.set(
        lead.id,
        lead
      );
    });

    const loaded =
      tasks.map((task) => ({
        task,
        lead:
          leadMap.get(
            task.lead_id
          ) ?? null,
      }));

    setRecords(loaded);

    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => {
    loadFollowups();
  }, []);

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
          isOverdue(record.task)
      ).length;

    const completed =
      records.filter(
        (record) =>
          record.task.status ===
          "completed"
      ).length;

    return {
      pending,
      today,
      overdue,
      completed,
    };
  }, [records]);

  const filteredRecords =
    useMemo(() => {
      const query =
        search.trim().toLowerCase();

      return records.filter(
        (record) => {
          const task =
            record.task;

          const lead =
            record.lead;

          if (filter === "today") {
            if (
              task.status !==
                "pending" ||
              !isToday(task.due_at)
            ) {
              return false;
            }
          }

          if (filter === "overdue") {
            if (
              !isOverdue(task)
            ) {
              return false;
            }
          }

          if (filter === "upcoming") {
            if (
              !isUpcoming(task)
            ) {
              return false;
            }
          }

          if (filter === "completed") {
            if (
              task.status !==
              "completed"
            ) {
              return false;
            }
          }

          if (!query) {
            return true;
          }

          const searchable = [
            lead?.full_name ?? "",
            lead?.whatsapp_number ?? "",
            lead?.email ?? "",
            task.task_type,
            task.channel ?? "",
            task.message_template ??
              "",
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

  async function completeTask(
    record: FollowUpRecord
  ) {
    setUpdatingId(
      record.task.id
    );

    setError("");

    const {
      error: updateError,
    } = await supabase
      .from("follow_up_tasks")
      .update({
        status: "completed",
        completed_at:
          new Date().toISOString(),
        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        record.task.id
      );

    if (updateError) {
      console.error(
        "Complete follow-up error:",
        updateError
      );

      setError(
        "We couldn't complete this follow-up."
      );

      setUpdatingId(null);

      return;
    }

    setSelectedTask(null);

    setUpdatingId(null);

    await loadFollowups(true);
  }

  async function cancelTask(
    record: FollowUpRecord
  ) {
    setUpdatingId(
      record.task.id
    );

    setError("");

    const {
      error: updateError,
    } = await supabase
      .from("follow_up_tasks")
      .update({
        status: "cancelled",
        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        record.task.id
      );

    if (updateError) {
      console.error(
        "Cancel follow-up error:",
        updateError
      );

      setError(
        "We couldn't cancel this follow-up."
      );

      setUpdatingId(null);

      return;
    }

    setSelectedTask(null);

    setUpdatingId(null);

    await loadFollowups(true);
  }

  function openWhatsApp(
    record: FollowUpRecord
  ) {
    if (!record.lead?.whatsapp_number) {
      return;
    }

    const message =
      record.task.message_template ??
      `Hello ${record.lead.full_name}, this is Sauti Tamu Piano Center.`;

    window.open(
      `https://wa.me/${record.lead.whatsapp_number.replace(
        /[^0-9]/g,
        ""
      )}?text=${encodeURIComponent(
        message
      )}`,
      "_blank"
    );
  }

  function callLead(
    record: FollowUpRecord
  ) {
    if (!record.lead?.whatsapp_number) {
      return;
    }

    window.location.href =
      `tel:${record.lead.whatsapp_number}`;
  }

  return (
    <main className="st-content">

      {/* HEADER */}

      <div className="mb-7 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">

        <div>
          <p className="st-eyebrow">
            RELATIONSHIPS
          </p>

          <h1 className="st-page-title mt-2">
            Follow-ups
          </h1>

          <p className="st-page-description">
            Stay on top of every lead conversation,
            booking and follow-up.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            loadFollowups(true)
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
            Pending
          </p>

          <p className="mt-3 mb-0 text-[30px] font-bold leading-none text-[var(--st-charcoal-dark)]">
            {stats.pending}
          </p>

          <p className="mt-2 mb-0 text-[9px] text-[var(--st-gray)]">
            All open tasks
          </p>
        </div>

        <div className="st-card p-5">
          <p className="m-0 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
            Today
          </p>

          <p className="mt-3 mb-0 text-[30px] font-bold leading-none text-[var(--st-charcoal-dark)]">
            {stats.today}
          </p>

          <p className="mt-2 mb-0 text-[9px] text-[var(--st-gray)]">
            Due today
          </p>
        </div>

        <div className="st-card p-5">
          <p className="m-0 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
            Overdue
          </p>

          <p className="mt-3 mb-0 text-[30px] font-bold leading-none text-[var(--st-red)]">
            {stats.overdue}
          </p>

          <p className="mt-2 mb-0 text-[9px] text-[var(--st-gray)]">
            Need attention
          </p>
        </div>

        <div className="st-card p-5">
          <p className="m-0 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
            Completed
          </p>

          <p className="mt-3 mb-0 text-[30px] font-bold leading-none text-green-700">
            {stats.completed}
          </p>

          <p className="mt-2 mb-0 text-[9px] text-[var(--st-gray)]">
            Completed tasks
          </p>
        </div>

      </section>

      {/* OVERDUE ALERT */}

      {stats.overdue > 0 && (
        <section className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4">

          <div className="flex items-start gap-3">

            <AlertCircle
              size={18}
              className="mt-0.5 shrink-0 text-red-600"
            />

            <div>
              <p className="m-0 text-[11px] font-bold text-red-800">
                {stats.overdue} follow-up
                {stats.overdue === 1
                  ? ""
                  : "s"} overdue
              </p>

              <p className="mt-1 mb-0 text-[10px] leading-relaxed text-red-700">
                These leads need attention.
                Contact them and mark the
                follow-up complete.
              </p>
            </div>

          </div>

        </section>
      )}

      {/* SEARCH */}

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

          <p className="m-0 text-[10px] text-red-700">
            {error}
          </p>

        </div>
      )}

      {/* LIST */}

      <section className="mt-7">

        <div className="mb-4">

          <p className="st-eyebrow">
            FOLLOW-UP QUEUE
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
              <Clock3 size={22} />
            </div>

            <p className="mt-5 mb-0 text-[14px] font-bold text-[var(--st-charcoal-dark)]">
              No follow-ups here
            </p>

            <p className="mt-2 mb-0 max-w-[320px] text-[10px] leading-relaxed text-[var(--st-gray)]">
              Follow-up tasks will appear here
              automatically when leads and bookings
              generate follow-up actions.
            </p>

          </div>
        ) : (
          <div className="space-y-3">

            {filteredRecords.map(
              (record) => {
                const task =
                  record.task;

                const lead =
                  record.lead;

                const overdue =
                  isOverdue(task);

                return (
                  <div
                    key={task.id}
                    className={`st-card p-5 ${
                      overdue
                        ? "border-red-200"
                        : ""
                    }`}
                  >

                    <div className="flex items-start gap-4">

                      {/* ICON */}

                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
                          overdue
                            ? "bg-red-50 text-red-600"
                            : "bg-[var(--st-bg-soft)] text-[var(--st-red)]"
                        }`}
                      >
                        {overdue ? (
                          <AlertCircle
                            size={18}
                          />
                        ) : (
                          <Clock3
                            size={18}
                          />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">

                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">

                          <div className="min-w-0">

                            <p className="text-[13px] font-bold text-[var(--st-charcoal-dark)]">
                              {lead?.full_name ??
                                "Unknown lead"}
                            </p>

                            <p className="mt-1 text-[9px] text-[var(--st-gray)]">
                              {taskTypeLabel(
                                task.task_type
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

                            <p className="mt-1 text-[10px] font-semibold text-[var(--st-charcoal-dark)]">
                              {formatDateTime(
                                task.due_at
                              )}
                            </p>

                          </div>

                          <div>

                            <p className="m-0 text-[8px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                              Timing
                            </p>

                            <p
                              className={`mt-1 text-[10px] font-bold ${
                                overdue
                                  ? "text-red-600"
                                  : "text-[var(--st-charcoal-dark)]"
                              }`}
                            >
                              {getRelativeLabel(
                                task
                              )}
                            </p>

                          </div>

                          <div>

                            <p className="m-0 text-[8px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                              Channel
                            </p>

                            <p className="mt-1 text-[10px] font-semibold capitalize text-[var(--st-charcoal-dark)]">
                              {task.channel ??
                                "Manual"}
                            </p>

                          </div>

                        </div>

                        {task.message_template && (
                          <div className="mt-4 rounded-xl bg-[var(--st-bg-soft)] p-3">

                            <p className="m-0 text-[9px] leading-relaxed text-[var(--st-gray)]">
                              {task.message_template}
                            </p>

                          </div>
                        )}

                        <div className="mt-4 flex flex-wrap gap-2">

                          {lead?.whatsapp_number && (
                            <button
                              type="button"
                              onClick={() =>
                                openWhatsApp(
                                  record
                                )
                              }
                              className="st-button st-button-secondary !px-3 !py-2 text-[9px]"
                            >
                              <MessageCircle
                                size={13}
                              />
                              WhatsApp
                            </button>
                          )}

                          {lead?.whatsapp_number && (
                            <button
                              type="button"
                              onClick={() =>
                                callLead(
                                  record
                                )
                              }
                              className="st-button st-button-secondary !px-3 !py-2 text-[9px]"
                            >
                              <Phone
                                size={13}
                              />
                              Call
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() =>
                              setSelectedTask(
                                record
                              )
                            }
                            className="st-button st-button-secondary !px-3 !py-2 text-[9px]"
                          >
                            View
                            <ArrowRight
                              size={13}
                            />
                          </button>

                          {task.status ===
                            "pending" && (
                            <button
                              type="button"
                              disabled={
                                updatingId ===
                                task.id
                              }
                              onClick={() =>
                                completeTask(
                                  record
                                )
                              }
                              className="st-button st-button-primary !px-3 !py-2 text-[9px] disabled:opacity-50"
                            >
                              {updatingId ===
                              task.id ? (
                                <RefreshCw
                                  size={13}
                                  className="animate-spin"
                                />
                              ) : (
                                <Check
                                  size={13}
                                />
                              )}

                              Complete
                            </button>
                          )}

                        </div>

                      </div>

                    </div>

                  </div>
                );
              }
            )}

          </div>
        )}

      </section>

      {/* DETAIL MODAL */}

      {selectedTask && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 sm:items-center sm:p-5">

          <div className="max-h-[92vh] w-full max-w-[500px] overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl">

            <div className="flex items-start justify-between gap-4">

              <div>

                <p className="st-eyebrow">
                  FOLLOW-UP
                </p>

                <h2 className="mt-1 text-[20px] font-bold text-[var(--st-charcoal-dark)]">
                  {taskTypeLabel(
                    selectedTask.task
                      .task_type
                  )}
                </h2>

              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedTask(
                    null
                  )
                }
                className="st-icon-button"
              >
                <X size={17} />
              </button>

            </div>

            <div className="mt-6 rounded-2xl bg-[var(--st-bg-soft)] p-5">

              <div className="flex items-center gap-3">

                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-[10px] font-bold text-[var(--st-red)]">
                  {selectedTask.lead
                    ? selectedTask.lead.full_name
                        .split(" ")
                        .map(
                          (word) =>
                            word[0]
                        )
                        .join("")
                        .slice(
                          0,
                          2
                        )
                        .toUpperCase()
                    : "?"}
                </div>

                <div>

                  <p className="m-0 text-[13px] font-bold text-[var(--st-charcoal-dark)]">
                    {selectedTask.lead
                      ?.full_name ??
                      "Unknown lead"}
                  </p>

                  <p className="mt-1 text-[9px] text-[var(--st-gray)]">
                    {selectedTask.lead
                      ?.whatsapp_number ??
                      "No phone number"}
                  </p>

                </div>

              </div>

            </div>

            <div className="mt-5 space-y-4">

              <div>
                <p className="m-0 text-[8px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                  Due date
                </p>

                <p className="mt-1 text-[11px] font-semibold text-[var(--st-charcoal-dark)]">
                  {formatLongDate(
                    selectedTask.task.due_at
                  )}
                </p>

                <p className="mt-1 text-[10px] text-[var(--st-gray)]">
                  {formatDateTime(
                    selectedTask.task.due_at
                  )}
                </p>
              </div>

              <div>
                <p className="m-0 text-[8px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                  Status
                </p>

                <span
                  className={`mt-2 inline-flex rounded-full px-3 py-1.5 text-[8px] font-bold ${statusClasses(
                    selectedTask.task
                      .status
                  )}`}
                >
                  {statusLabel(
                    selectedTask.task
                      .status
                  )}
                </span>
              </div>

              {selectedTask.task
                .message_template && (
                <div>
                  <p className="m-0 text-[8px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                    Message
                  </p>

                  <div className="mt-2 rounded-xl border border-[var(--st-border)] p-4">

                    <p className="m-0 text-[10px] leading-relaxed text-[var(--st-charcoal-dark)]">
                      {
                        selectedTask.task
                          .message_template
                      }
                    </p>

                  </div>
                </div>
              )}

            </div>

            <div className="mt-6 grid grid-cols-2 gap-2">

              {selectedTask.lead
                ?.whatsapp_number && (
                <button
                  type="button"
                  onClick={() =>
                    openWhatsApp(
                      selectedTask
                    )
                  }
                  className="st-button st-button-secondary w-full"
                >
                  <MessageCircle
                    size={14}
                  />
                  WhatsApp
                </button>
              )}

              {selectedTask.task
                .status ===
                "pending" && (
                <button
                  type="button"
                  disabled={
                    updatingId ===
                    selectedTask.task
                      .id
                  }
                  onClick={() =>
                    completeTask(
                      selectedTask
                    )
                  }
                  className="st-button st-button-primary w-full disabled:opacity-50"
                >
                  {updatingId ===
                  selectedTask.task.id ? (
                    <RefreshCw
                      size={14}
                      className="animate-spin"
                    />
                  ) : (
                    <Check size={14} />
                  )}
                  Complete
                </button>
              )}

            </div>

            {selectedTask.task
              .status ===
              "pending" && (
              <button
                type="button"
                disabled={
                  updatingId ===
                  selectedTask.task.id
                }
                onClick={() =>
                  cancelTask(
                    selectedTask
                  )
                }
                className="mt-2 w-full rounded-xl px-4 py-3 text-[9px] font-bold text-gray-500 transition hover:bg-gray-100"
              >
                Cancel follow-up
              </button>
            )}

          </div>

        </div>
      )}

    </main>
  );
}