"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  Check,
  ChevronDown,
  Clock3,
  Loader2,
  Mail,
  MessageCircle,
  MoreHorizontal,
  Phone,
  Plus,
  Search,
  UserPlus,
  Users,
  X,
} from "lucide-react";

import AppShell from "@/components/layout/AppShell";
import { supabase } from "@/lib/supabase";

type LeadStatus = "new" | "contacted" | "registered";

type Lead = {
  id: string;
  full_name: string;
  whatsapp_number: string;
  email: string;
  status: LeadStatus;
  first_contact_at: string;
  last_contact_at: string | null;
  next_follow_up_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

const statusLabels: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  registered: "Registered",
};

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatDate(value: string | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatDateTime(value: string | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en-KE", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function isToday(value: string | null) {
  if (!value) return false;

  const date = new Date(value);
  const now = new Date();

  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function isOverdue(value: string | null) {
  if (!value) return false;

  return new Date(value).getTime() < Date.now();
}

function StatusBadge({
  status,
}: {
  status: LeadStatus;
}) {
  const styles: Record<LeadStatus, string> = {
    new: "bg-[var(--st-bg-soft)] text-[var(--st-red)]",
    contacted: "bg-[#fff8e8] text-[#9a6b00]",
    registered: "bg-[#edf8f2] text-[#37805b]",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.06em] ${styles[status]}`}
    >
      {statusLabels[status]}
    </span>
  );
}

function StatCard({
  label,
  value,
  description,
  icon,
}: {
  label: string;
  value: number;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="st-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="m-0 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
            {label}
          </p>

          <p className="mt-3 mb-0 text-[32px] font-bold leading-none tracking-[-0.04em] text-[var(--st-charcoal-dark)]">
            {value}
          </p>

          <p className="mt-3 mb-0 text-[10px] text-[var(--st-gray)]">
            {description}
          </p>
        </div>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--st-bg-soft)] text-[var(--st-red)]">
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function AdminLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<"all" | LeadStatus>("all");

  const [selectedLead, setSelectedLead] =
    useState<Lead | null>(null);

  const [showAddLead, setShowAddLead] =
    useState(false);

  const [showActions, setShowActions] =
    useState<string | null>(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadLeads(showLoader = true) {
    if (showLoader) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    setError("");

    const { data, error: leadsError } = await supabase
      .from("leads")
      .select(
        `
          id,
          full_name,
          whatsapp_number,
          email,
          status,
          first_contact_at,
          last_contact_at,
          next_follow_up_at,
          notes,
          created_at,
          updated_at
        `
      )
      .order("created_at", {
        ascending: false,
      });

    if (leadsError) {
      console.error(leadsError);

      setError(
        "We couldn't load your leads. Please try again."
      );
    } else {
      setLeads((data ?? []) as Lead[]);
    }

    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => {
    loadLeads();
  }, []);

  const stats = useMemo(() => {
    const newLeads = leads.filter(
      (lead) => lead.status === "new"
    ).length;

    const contacted = leads.filter(
      (lead) => lead.status === "contacted"
    ).length;

    const registered = leads.filter(
      (lead) => lead.status === "registered"
    ).length;

    const followUps = leads.filter(
      (lead) =>
        lead.next_follow_up_at &&
        (isToday(lead.next_follow_up_at) ||
          isOverdue(lead.next_follow_up_at))
    ).length;

    return {
      total: leads.length,
      newLeads,
      contacted,
      registered,
      followUps,
    };
  }, [leads]);

  const filteredLeads = useMemo(() => {
    const query = search.trim().toLowerCase();

    return leads.filter((lead) => {
      const matchesStatus =
        statusFilter === "all" ||
        lead.status === statusFilter;

      if (!matchesStatus) return false;

      if (!query) return true;

      return (
        lead.full_name
          .toLowerCase()
          .includes(query) ||
        lead.email
          .toLowerCase()
          .includes(query) ||
        lead.whatsapp_number
          .toLowerCase()
          .includes(query) ||
        (lead.notes ?? "")
          .toLowerCase()
          .includes(query)
      );
    });
  }, [leads, search, statusFilter]);

  async function updateLeadStatus(
    lead: Lead,
    status: LeadStatus
  ) {
    setError("");
    setSuccess("");

    const { error: updateError } = await supabase
      .from("leads")
      .update({
        status,
        last_contact_at:
          status === "contacted"
            ? new Date().toISOString()
            : lead.last_contact_at,
        updated_at: new Date().toISOString(),
      })
      .eq("id", lead.id);

    if (updateError) {
      console.error(updateError);

      setError(
        "We couldn't update this lead."
      );

      return;
    }

    setLeads((current) =>
      current.map((item) =>
        item.id === lead.id
          ? {
              ...item,
              status,
              last_contact_at:
                status === "contacted"
                  ? new Date().toISOString()
                  : item.last_contact_at,
            }
          : item
      )
    );

    setShowActions(null);

    setSuccess(
      `${lead.full_name} moved to ${statusLabels[status]}.`
    );

    setTimeout(() => {
      setSuccess("");
    }, 3000);
  }

  async function addLead(form: {
    full_name: string;
    email: string;
    whatsapp_number: string;
    notes: string;
    next_follow_up_at: string;
  }) {
    setError("");
    setSuccess("");

    const { data, error: insertError } =
      await supabase
        .from("leads")
        .insert({
          full_name: form.full_name.trim(),
          email: form.email.trim(),
          whatsapp_number:
            form.whatsapp_number.trim(),
          status: "new",
          notes: form.notes.trim() || null,
          next_follow_up_at:
            form.next_follow_up_at
              ? new Date(
                  form.next_follow_up_at
                ).toISOString()
              : null,
        })
        .select()
        .single();

    if (insertError) {
      console.error(insertError);

      setError(
        "We couldn't create this lead. Please try again."
      );

      return false;
    }

    setLeads((current) => [
      data as Lead,
      ...current,
    ]);

    setShowAddLead(false);

    setSuccess(
      `${form.full_name} has been added as a new lead.`
    );

    setTimeout(() => {
      setSuccess("");
    }, 3000);

    return true;
  }

  function openWhatsApp(number: string) {
    const cleaned = number.replace(
      /[^\d+]/g,
      ""
    );

    window.open(
      `https://wa.me/${cleaned.replace(
        "+",
        ""
      )}`,
      "_blank"
    );
  }

  function callLead(number: string) {
    window.location.href = `tel:${number}`;
  }

  function emailLead(email: string) {
    window.location.href = `mailto:${email}`;
  }

  return (
    <AppShell>
      <main className="st-content">
        {/* HEADER */}

        <div className="mb-7 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="st-eyebrow">
              CRM
            </p>

            <h1 className="st-page-title mt-2">
              Leads
            </h1>

            <p className="st-page-description">
              Manage enquiries, follow-ups and people
              moving toward registration.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() =>
                loadLeads(false)
              }
              disabled={refreshing}
              className="st-button st-button-secondary"
            >
              {refreshing ? (
                <Loader2
                  size={15}
                  className="animate-spin"
                />
              ) : (
                <Users size={15} />
              )}
              Refresh
            </button>

            <button
              type="button"
              onClick={() =>
                setShowAddLead(true)
              }
              className="st-button st-button-primary"
            >
              <Plus size={15} />
              Add lead
            </button>
          </div>
        </div>

        {/* MESSAGES */}

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <p className="m-0 text-[10px] text-red-700">
              {error}
            </p>
          </div>
        )}

        {success && (
          <div className="mb-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
            <p className="m-0 text-[10px] text-green-700">
              {success}
            </p>
          </div>
        )}

        {/* STATISTICS */}

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="TOTAL LEADS"
            value={stats.total}
            description="All leads in your CRM"
            icon={<Users size={18} />}
          />

          <StatCard
            label="NEW"
            value={stats.newLeads}
            description="Have not been contacted"
            icon={<UserPlus size={18} />}
          />

          <StatCard
            label="CONTACTED"
            value={stats.contacted}
            description="Currently being followed up"
            icon={<MessageCircle size={18} />}
          />

          <StatCard
            label="REGISTERED"
            value={stats.registered}
            description="Converted into learners"
            icon={<Check size={18} />}
          />
        </section>

        {/* FOLLOW UP NOTICE */}

        {stats.followUps > 0 && (
          <div className="mt-5 flex items-center gap-3 rounded-2xl border border-[var(--st-border-red)] bg-[var(--st-bg-soft)] px-5 py-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[var(--st-red)]">
              <CalendarClock size={17} />
            </div>

            <div>
              <p className="m-0 text-[11px] font-bold text-[var(--st-charcoal-dark)]">
                {stats.followUps} follow-up
                {stats.followUps === 1
                  ? ""
                  : "s"}{" "}
                need attention
              </p>

              <p className="mt-1 mb-0 text-[9px] text-[var(--st-gray)]">
                These leads are due today or overdue.
              </p>
            </div>
          </div>
        )}

        {/* SEARCH + FILTERS */}

        <section className="mt-6 st-card p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative min-w-0 flex-1">
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
                placeholder="Search name, email, WhatsApp or notes..."
                className="w-full rounded-xl border border-[var(--st-border)] bg-white py-3.5 pl-11 pr-4 text-[11px] text-[var(--st-charcoal-dark)] outline-none placeholder:text-[var(--st-gray)] focus:border-[var(--st-red)] focus:ring-2 focus:ring-[var(--st-red)]/10"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 lg:pb-0">
              {(
                [
                  ["all", "All"],
                  ["new", "New"],
                  ["contacted", "Contacted"],
                  ["registered", "Registered"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    setStatusFilter(value)
                  }
                  className={`shrink-0 rounded-xl px-4 py-3 text-[10px] font-bold transition-all ${
                    statusFilter === value
                      ? "bg-[var(--st-red)] text-white"
                      : "bg-[var(--st-bg-soft)] text-[var(--st-charcoal)] hover:bg-white"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* LEADS */}

        <section className="mt-6">
          <div className="mb-3 flex items-end justify-between gap-4">
            <div>
              <p className="m-0 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--st-gray)]">
                LEAD PIPELINE
              </p>

              <p className="mt-1 mb-0 text-[10px] text-[var(--st-gray)]">
                {filteredLeads.length}{" "}
                {filteredLeads.length === 1
                  ? "lead"
                  : "leads"}{" "}
                shown
              </p>
            </div>
          </div>

          {loading ? (
            <div className="st-card flex min-h-[240px] items-center justify-center gap-2">
              <Loader2
                size={18}
                className="animate-spin text-[var(--st-red)]"
              />

              <span className="text-[10px] text-[var(--st-gray)]">
                Loading leads...
              </span>
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="st-card flex min-h-[280px] flex-col items-center justify-center p-7 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--st-bg-soft)] text-[var(--st-red)]">
                <Users size={22} />
              </div>

              <h2 className="mt-5 mb-0 text-[14px] font-bold text-[var(--st-charcoal-dark)]">
                {search ||
                statusFilter !== "all"
                  ? "No leads found"
                  : "No leads yet"}
              </h2>

              <p className="mt-2 mb-0 max-w-[300px] text-[10px] leading-relaxed text-[var(--st-gray)]">
                {search ||
                statusFilter !== "all"
                  ? "Try another search or filter."
                  : "Leads from your booking system will appear here automatically."}
              </p>

              {!search &&
                statusFilter === "all" && (
                  <button
                    type="button"
                    onClick={() =>
                      setShowAddLead(true)
                    }
                    className="st-button st-button-primary mt-5"
                  >
                    <Plus size={15} />
                    Add first lead
                  </button>
                )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {filteredLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="st-card st-card-hover overflow-hidden"
                >
                  {/* LEAD HEADER */}

                  <div className="flex items-start justify-between gap-4 p-5">
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedLead(
                          lead
                        )
                      }
                      className="flex min-w-0 items-center gap-3 text-left"
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--st-bg-soft)] text-[11px] font-bold text-[var(--st-red)]">
                        {initials(
                          lead.full_name
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="m-0 truncate text-[13px] font-bold text-[var(--st-charcoal-dark)]">
                          {lead.full_name}
                        </p>

                        <p className="mt-1 truncate text-[9px] text-[var(--st-gray)]">
                          Added{" "}
                          {formatDate(
                            lead.created_at
                          )}
                        </p>
                      </div>
                    </button>

                    <div className="relative shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          setShowActions(
                            showActions ===
                              lead.id
                              ? null
                              : lead.id
                          )
                        }
                        className="st-icon-button"
                        aria-label="Lead actions"
                      >
                        <MoreHorizontal
                          size={16}
                        />
                      </button>

                      {showActions ===
                        lead.id && (
                        <div className="absolute right-0 top-11 z-20 w-44 rounded-xl border border-[var(--st-border)] bg-white p-1.5 shadow-lg">
                          <button
                            type="button"
                            onClick={() =>
                              updateLeadStatus(
                                lead,
                                "new"
                              )
                            }
                            className="w-full rounded-lg px-3 py-2.5 text-left text-[10px] font-semibold hover:bg-[var(--st-bg-soft)]"
                          >
                            Mark as new
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              updateLeadStatus(
                                lead,
                                "contacted"
                              )
                            }
                            className="w-full rounded-lg px-3 py-2.5 text-left text-[10px] font-semibold hover:bg-[var(--st-bg-soft)]"
                          >
                            Mark contacted
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              updateLeadStatus(
                                lead,
                                "registered"
                              )
                            }
                            className="w-full rounded-lg px-3 py-2.5 text-left text-[10px] font-semibold hover:bg-[var(--st-bg-soft)]"
                          >
                            Mark registered
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* STATUS */}

                  <div className="px-5">
                    <StatusBadge
                      status={lead.status}
                    />
                  </div>

                  {/* CONTACT INFO */}

                  <div className="mt-4 grid grid-cols-1 gap-2 border-t border-[var(--st-border)] px-5 pt-4">
                    <a
                      href={`mailto:${lead.email}`}
                      className="flex min-w-0 items-center gap-3 rounded-xl bg-[var(--st-bg-soft)] px-3 py-3"
                    >
                      <Mail
                        size={14}
                        className="shrink-0 text-[var(--st-red)]"
                      />

                      <span className="min-w-0 truncate text-[10px] text-[var(--st-charcoal)]">
                        {lead.email}
                      </span>
                    </a>

                    <a
                      href={`tel:${lead.whatsapp_number}`}
                      className="flex min-w-0 items-center gap-3 rounded-xl bg-[var(--st-bg-soft)] px-3 py-3"
                    >
                      <Phone
                        size={14}
                        className="shrink-0 text-[var(--st-red)]"
                      />

                      <span className="min-w-0 truncate text-[10px] text-[var(--st-charcoal)]">
                        {lead.whatsapp_number}
                      </span>
                    </a>
                  </div>

                  {/* FOLLOW UP */}

                  <div className="mt-4 border-t border-[var(--st-border)] px-5 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="m-0 text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                          NEXT FOLLOW-UP
                        </p>

                        <p
                          className={`mt-1 mb-0 text-[10px] font-semibold ${
                            lead.next_follow_up_at &&
                            (isToday(
                              lead.next_follow_up_at
                            ) ||
                              isOverdue(
                                lead.next_follow_up_at
                              ))
                              ? "text-[var(--st-red)]"
                              : "text-[var(--st-charcoal)]"
                          }`}
                        >
                          {lead.next_follow_up_at
                            ? formatDateTime(
                                lead.next_follow_up_at
                              )
                            : "No follow-up scheduled"}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setSelectedLead(
                            lead
                          )
                        }
                        className="text-[10px] font-bold text-[var(--st-red)]"
                      >
                        View lead →
                      </button>
                    </div>
                  </div>

                  {/* QUICK ACTIONS */}

                  <div className="grid grid-cols-3 gap-2 border-t border-[var(--st-border)] bg-[var(--st-bg-soft)] p-3">
                    <button
                      type="button"
                      onClick={() =>
                        openWhatsApp(
                          lead.whatsapp_number
                        )
                      }
                      className="flex items-center justify-center gap-2 rounded-xl bg-white py-3 text-[9px] font-bold text-[var(--st-charcoal)]"
                    >
                      <MessageCircle
                        size={14}
                        className="text-[var(--st-red)]"
                      />
                      WhatsApp
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        callLead(
                          lead.whatsapp_number
                        )
                      }
                      className="flex items-center justify-center gap-2 rounded-xl bg-white py-3 text-[9px] font-bold text-[var(--st-charcoal)]"
                    >
                      <Phone
                        size={14}
                        className="text-[var(--st-red)]"
                      />
                      Call
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        emailLead(
                          lead.email
                        )
                      }
                      className="flex items-center justify-center gap-2 rounded-xl bg-white py-3 text-[9px] font-bold text-[var(--st-charcoal)]"
                    >
                      <Mail
                        size={14}
                        className="text-[var(--st-red)]"
                      />
                      Email
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* FOOTER */}

        <div className="mt-7 border-t border-[var(--st-border)] pt-5">
          <p className="m-0 text-[9px] text-[var(--st-gray)]">
            Sauti Tamu Piano Center · Lead Management
          </p>
        </div>
      </main>

      {/* =====================================================
          LEAD DETAILS MODAL
      ===================================================== */}

      {selectedLead && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-0 sm:items-center sm:p-5">
          <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-3xl bg-white shadow-xl sm:max-w-[520px] sm:rounded-3xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--st-border)] bg-white px-5 py-4">
              <div>
                <p className="m-0 text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--st-red)]">
                  LEAD DETAILS
                </p>

                <h2 className="mt-1 mb-0 text-[18px] font-bold text-[var(--st-charcoal-dark)]">
                  {selectedLead.full_name}
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedLead(null)
                }
                className="st-icon-button"
              >
                <X size={17} />
              </button>
            </div>

            <div className="p-5">
              <div className="flex items-center justify-between">
                <StatusBadge
                  status={
                    selectedLead.status
                  }
                />

                <span className="text-[9px] text-[var(--st-gray)]">
                  Added{" "}
                  {formatDate(
                    selectedLead.created_at
                  )}
                </span>
              </div>

              <div className="mt-5 space-y-3">
                <a
                  href={`mailto:${selectedLead.email}`}
                  className="flex items-center gap-3 rounded-xl bg-[var(--st-bg-soft)] p-4"
                >
                  <Mail
                    size={16}
                    className="text-[var(--st-red)]"
                  />

                  <div className="min-w-0">
                    <p className="m-0 text-[8px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                      EMAIL
                    </p>

                    <p className="mt-1 truncate text-[11px] font-semibold text-[var(--st-charcoal-dark)]">
                      {selectedLead.email}
                    </p>
                  </div>
                </a>

                <a
                  href={`tel:${selectedLead.whatsapp_number}`}
                  className="flex items-center gap-3 rounded-xl bg-[var(--st-bg-soft)] p-4"
                >
                  <Phone
                    size={16}
                    className="text-[var(--st-red)]"
                  />

                  <div>
                    <p className="m-0 text-[8px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                      WHATSAPP / PHONE
                    </p>

                    <p className="mt-1 text-[11px] font-semibold text-[var(--st-charcoal-dark)]">
                      {selectedLead.whatsapp_number}
                    </p>
                  </div>
                </a>

                <div className="rounded-xl border border-[var(--st-border)] p-4">
                  <div className="flex items-center gap-3">
                    <CalendarClock
                      size={16}
                      className="text-[var(--st-red)]"
                    />

                    <div>
                      <p className="m-0 text-[8px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                        NEXT FOLLOW-UP
                      </p>

                      <p className="mt-1 text-[11px] font-semibold text-[var(--st-charcoal-dark)]">
                        {selectedLead.next_follow_up_at
                          ? formatDateTime(
                              selectedLead.next_follow_up_at
                            )
                          : "No follow-up scheduled"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {selectedLead.notes && (
                <div className="mt-5">
                  <p className="m-0 text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--st-gray)]">
                    NOTES
                  </p>

                  <div className="mt-2 rounded-xl bg-[var(--st-bg-soft)] p-4">
                    <p className="m-0 whitespace-pre-wrap text-[10px] leading-relaxed text-[var(--st-charcoal)]">
                      {selectedLead.notes}
                    </p>
                  </div>
                </div>
              )}

              <div className="mt-5 grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    openWhatsApp(
                      selectedLead.whatsapp_number
                    )
                  }
                  className="flex items-center justify-center gap-2 rounded-xl bg-[var(--st-red)] py-3 text-[9px] font-bold text-white"
                >
                  <MessageCircle size={14} />
                  WhatsApp
                </button>

                <button
                  type="button"
                  onClick={() =>
                    callLead(
                      selectedLead.whatsapp_number
                    )
                  }
                  className="flex items-center justify-center gap-2 rounded-xl bg-[var(--st-bg-soft)] py-3 text-[9px] font-bold text-[var(--st-charcoal)]"
                >
                  <Phone size={14} />
                  Call
                </button>

                <button
                  type="button"
                  onClick={() =>
                    emailLead(
                      selectedLead.email
                    )
                  }
                  className="flex items-center justify-center gap-2 rounded-xl bg-[var(--st-bg-soft)] py-3 text-[9px] font-bold text-[var(--st-charcoal)]"
                >
                  <Mail size={14} />
                  Email
                </button>
              </div>

              <div className="mt-5 border-t border-[var(--st-border)] pt-5">
                <p className="m-0 text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--st-gray)]">
                  UPDATE STATUS
                </p>

                <div className="mt-3 grid grid-cols-3 gap-2">
                  {(
                    [
                      ["new", "New"],
                      [
                        "contacted",
                        "Contacted",
                      ],
                      [
                        "registered",
                        "Registered",
                      ],
                    ] as const
                  ).map(
                    ([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() =>
                          updateLeadStatus(
                            selectedLead,
                            value
                          )
                        }
                        className={`rounded-xl border py-3 text-[9px] font-bold ${
                          selectedLead.status ===
                          value
                            ? "border-[var(--st-red)] bg-[var(--st-bg-soft)] text-[var(--st-red)]"
                            : "border-[var(--st-border)] text-[var(--st-charcoal)]"
                        }`}
                      >
                        {label}
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          ADD LEAD MODAL
      ===================================================== */}

      {showAddLead && (
        <AddLeadModal
          onClose={() =>
            setShowAddLead(false)
          }
          onSubmit={addLead}
        />
      )}
    </AppShell>
  );
}

function AddLeadModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (form: {
    full_name: string;
    email: string;
    whatsapp_number: string;
    notes: string;
    next_follow_up_at: string;
  }) => Promise<boolean>;
}) {
  const [fullName, setFullName] =
    useState("");
  const [email, setEmail] =
    useState("");
  const [whatsapp, setWhatsapp] =
    useState("");
  const [notes, setNotes] =
    useState("");
  const [followUp, setFollowUp] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  async function handleSubmit(
    event: React.FormEvent
  ) {
    event.preventDefault();

    if (!fullName.trim()) {
      setError(
        "Please enter the lead's full name."
      );
      return;
    }

    if (!email.trim()) {
      setError(
        "Please enter the lead's email."
      );
      return;
    }

    if (!whatsapp.trim()) {
      setError(
        "Please enter the WhatsApp number."
      );
      return;
    }

    setSaving(true);
    setError("");

    const success = await onSubmit({
      full_name: fullName,
      email,
      whatsapp_number: whatsapp,
      notes,
      next_follow_up_at: followUp,
    });

    if (!success) {
      setError(
        "The lead could not be saved."
      );
    }

    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/30 p-0 sm:items-center sm:p-5">
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white shadow-xl sm:max-w-[520px] sm:rounded-3xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--st-border)] bg-white px-5 py-4">
          <div>
            <p className="m-0 text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--st-red)]">
              NEW LEAD
            </p>

            <h2 className="mt-1 mb-0 text-[18px] font-bold text-[var(--st-charcoal-dark)]">
              Add a lead
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="st-icon-button"
          >
            <X size={17} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-5"
        >
          {error && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <p className="m-0 text-[10px] text-red-700">
                {error}
              </p>
            </div>
          )}

          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--st-charcoal)]">
                Full name
              </label>

              <div className="relative">
                <UserPlus
                  size={15}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--st-gray)]"
                />

                <input
                  type="text"
                  value={fullName}
                  onChange={(event) =>
                    setFullName(
                      event.target.value
                    )
                  }
                  placeholder="Lead's full name"
                  className="w-full rounded-xl border border-[var(--st-border)] bg-white py-3.5 pl-11 pr-4 text-[11px] outline-none focus:border-[var(--st-red)]"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--st-charcoal)]">
                Email
              </label>

              <input
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(
                    event.target.value
                  )
                }
                placeholder="lead@example.com"
                className="w-full rounded-xl border border-[var(--st-border)] bg-white px-4 py-3.5 text-[11px] outline-none focus:border-[var(--st-red)]"
              />
            </div>

            <div>
              <label className="mb-2 block text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--st-charcoal)]">
                WhatsApp number
              </label>

              <input
                type="tel"
                value={whatsapp}
                onChange={(event) =>
                  setWhatsapp(
                    event.target.value
                  )
                }
                placeholder="+254 712 345 678"
                className="w-full rounded-xl border border-[var(--st-border)] bg-white px-4 py-3.5 text-[11px] outline-none focus:border-[var(--st-red)]"
              />
            </div>

            <div>
              <label className="mb-2 block text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--st-charcoal)]">
                Next follow-up
              </label>

              <input
                type="datetime-local"
                value={followUp}
                onChange={(event) =>
                  setFollowUp(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border border-[var(--st-border)] bg-white px-4 py-3.5 text-[11px] outline-none focus:border-[var(--st-red)]"
              />
            </div>

            <div>
              <label className="mb-2 block text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--st-charcoal)]">
                Notes
              </label>

              <textarea
                value={notes}
                onChange={(event) =>
                  setNotes(
                    event.target.value
                  )
                }
                rows={4}
                placeholder="Add any useful information about this lead..."
                className="w-full resize-none rounded-xl border border-[var(--st-border)] bg-white px-4 py-3.5 text-[11px] outline-none focus:border-[var(--st-red)]"
              />
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="st-button st-button-secondary flex-1"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="st-button st-button-primary flex-1 disabled:opacity-60"
            >
              {saving ? (
                <>
                  <Loader2
                    size={15}
                    className="animate-spin"
                  />
                  Saving...
                </>
              ) : (
                <>
                  <Plus size={15} />
                  Add lead
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}