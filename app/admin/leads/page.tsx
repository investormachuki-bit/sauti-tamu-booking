"use client";

import {
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Mail,
  MessageCircle,
  MoreHorizontal,
  Phone,
  Plus,
  RefreshCw,
  Search,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";

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

type FilterStatus = "all" | LeadStatus;

const supabase = createClient();

/* =========================================================
   HELPERS
========================================================= */

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatDate(value: string | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Africa/Nairobi",
  }).format(new Date(value));
}

function formatRelativeDate(value: string) {
  const date = new Date(value);

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Africa/Nairobi",
  }).format(date);
}

function formatFollowUp(value: string | null) {
  if (!value) return "No follow-up scheduled";

  const date = new Date(value);
  const now = new Date();

  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Nairobi",
  }).format(now);

  const followUpDay = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Nairobi",
  }).format(date);

  if (followUpDay === today) {
    return `Today · ${new Intl.DateTimeFormat("en-GB", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: "Africa/Nairobi",
    }).format(date)}`;
  }

  return formatDate(value);
}

function isFollowUpDue(value: string | null) {
  if (!value) return false;

  return new Date(value).getTime() <= Date.now();
}

function statusLabel(status: LeadStatus) {
  if (status === "new") return "New";
  if (status === "contacted") return "Contacted";
  return "Registered";
}

/* =========================================================
   STAT CARD
========================================================= */

function StatCard({
  label,
  value,
  description,
  icon,
  accent = false,
}: {
  label: string;
  value: number;
  description: string;
  icon: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div
      className={`st-card st-card-hover overflow-hidden p-5 ${
        accent ? "border border-[var(--st-border-red)]" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--st-gray)]">
            {label}
          </p>

          <p
            className={`mt-3 mb-0 text-[34px] font-bold leading-none tracking-[-0.04em] ${
              accent
                ? "text-[var(--st-red)]"
                : "text-[var(--st-charcoal-dark)]"
            }`}
          >
            {value}
          </p>

          <p className="mt-3 mb-0 text-[10px] leading-relaxed text-[var(--st-gray)]">
            {description}
          </p>
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--st-bg-soft)] text-[var(--st-red)]">
          {icon}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   STATUS BADGE
========================================================= */

function StatusBadge({ status }: { status: LeadStatus }) {
  const classes =
    status === "registered"
      ? "st-badge st-badge-green"
      : status === "contacted"
        ? "st-badge st-badge-yellow"
        : "st-badge st-badge-red";

  return (
    <span className={classes}>
      {status === "registered" && <CheckCircle2 size={11} />}
      {statusLabel(status)}
    </span>
  );
}

/* =========================================================
   LEAD CARD
========================================================= */

function LeadCard({
  lead,
  onView,
  onStatusChange,
  onMenu,
  menuOpen,
}: {
  lead: Lead;
  onView: () => void;
  onStatusChange: (status: LeadStatus) => void;
  onMenu: () => void;
  menuOpen: boolean;
}) {
  const whatsappUrl = `https://wa.me/${lead.whatsapp_number.replace(
    /\D/g,
    "",
  )}`;

  const telUrl = `tel:${lead.whatsapp_number}`;

  const mailUrl = `mailto:${lead.email}`;

  return (
    <article className="st-card relative overflow-visible">
      {/* HEADER */}

      <div className="flex items-start justify-between gap-4 p-5">
        <button
          type="button"
          onClick={onView}
          className="flex min-w-0 items-center gap-3 text-left"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--st-bg-soft)] text-[11px] font-bold text-[var(--st-red)]">
            {getInitials(lead.full_name)}
          </div>

          <div className="min-w-0">
            <p className="m-0 truncate text-[13px] font-bold text-[var(--st-charcoal-dark)]">
              {lead.full_name}
            </p>

            <p className="mt-1 mb-0 text-[10px] text-[var(--st-gray)]">
              Added {formatRelativeDate(lead.created_at)}
            </p>
          </div>
        </button>

        <div className="relative shrink-0">
          <button
            type="button"
            onClick={onMenu}
            className="st-icon-button"
            aria-label={`More options for ${lead.full_name}`}
          >
            <MoreHorizontal size={17} />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-11 z-30 w-48 overflow-hidden rounded-2xl border border-[var(--st-border)] bg-white shadow-xl">
              <button
                type="button"
                onClick={() => onStatusChange("new")}
                className="block w-full px-4 py-3 text-left text-[11px] text-[var(--st-charcoal-dark)] hover:bg-[var(--st-bg-soft)]"
              >
                Mark as new
              </button>

              <button
                type="button"
                onClick={() => onStatusChange("contacted")}
                className="block w-full px-4 py-3 text-left text-[11px] text-[var(--st-charcoal-dark)] hover:bg-[var(--st-bg-soft)]"
              >
                Mark contacted
              </button>

              <button
                type="button"
                onClick={() => onStatusChange("registered")}
                className="block w-full px-4 py-3 text-left text-[11px] text-[var(--st-charcoal-dark)] hover:bg-[var(--st-bg-soft)]"
              >
                Mark registered
              </button>
            </div>
          )}
        </div>
      </div>

      {/* STATUS */}

      <div className="px-5 pb-4">
        <StatusBadge status={lead.status} />
      </div>

      {/* CONTACT DETAILS */}

      <div className="space-y-2 border-t border-[var(--st-border)] px-5 py-4">
        <a
          href={mailUrl}
          className="flex min-w-0 items-center gap-3 rounded-full bg-[var(--st-bg-soft)] px-4 py-3 transition-colors hover:bg-white"
        >
          <Mail
            size={16}
            className="shrink-0 text-[var(--st-red)]"
          />

          <span className="min-w-0 truncate text-[11px] text-[var(--st-charcoal-dark)]">
            {lead.email}
          </span>
        </a>

        <a
          href={telUrl}
          className="flex min-w-0 items-center gap-3 rounded-full bg-[var(--st-bg-soft)] px-4 py-3 transition-colors hover:bg-white"
        >
          <Phone
            size={16}
            className="shrink-0 text-[var(--st-red)]"
          />

          <span className="min-w-0 truncate text-[11px] text-[var(--st-charcoal-dark)]">
            {lead.whatsapp_number}
          </span>
        </a>
      </div>

      {/* FOLLOW UP */}

      <div className="border-t border-[var(--st-border)] px-5 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="m-0 text-[9px] font-semibold uppercase tracking-[0.08em] text-[var(--st-gray)]">
              Next follow-up
            </p>

            <p
              className={`mt-1 mb-0 text-[11px] font-semibold ${
                isFollowUpDue(lead.next_follow_up_at)
                  ? "text-[var(--st-red)]"
                  : "text-[var(--st-charcoal-dark)]"
              }`}
            >
              {formatFollowUp(lead.next_follow_up_at)}
            </p>
          </div>

          <button
            type="button"
            onClick={onView}
            className="flex shrink-0 items-center gap-1 text-left text-[11px] font-bold text-[var(--st-red)]"
          >
            View lead
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* CONTACT ACTIONS */}

      <div className="grid grid-cols-3 gap-2 border-t border-[var(--st-border)] bg-[var(--st-bg-soft)] p-3">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noreferrer"
          className="flex min-h-[42px] items-center justify-center gap-2 rounded-full bg-white px-2 text-[10px] font-semibold text-[var(--st-charcoal-dark)] transition-colors hover:text-[var(--st-red)]"
        >
          <MessageCircle size={15} />
          <span>WhatsApp</span>
        </a>

        <a
          href={telUrl}
          className="flex min-h-[42px] items-center justify-center gap-2 rounded-full bg-white px-2 text-[10px] font-semibold text-[var(--st-charcoal-dark)] transition-colors hover:text-[var(--st-red)]"
        >
          <Phone size={15} />
          <span>Call</span>
        </a>

        <a
          href={mailUrl}
          className="flex min-h-[42px] items-center justify-center gap-2 rounded-full bg-white px-2 text-[10px] font-semibold text-[var(--st-charcoal-dark)] transition-colors hover:text-[var(--st-red)]"
        >
          <Mail size={15} />
          <span>Email</span>
        </a>
      </div>
    </article>
  );
}

/* =========================================================
   PAGE
========================================================= */

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<FilterStatus>("all");

  const [selectedLead, setSelectedLead] =
    useState<Lead | null>(null);

  const [openMenuId, setOpenMenuId] =
    useState<string | null>(null);

  const [showAddModal, setShowAddModal] =
    useState(false);

  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    whatsapp_number: "",
    notes: "",
  });

  /* =======================================================
     LOAD LEADS
  ======================================================= */

  async function loadLeads(showRefreshState = false) {
    if (showRefreshState) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    const { data, error } = await supabase
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
        `,
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to load leads:", error);
      setLeads([]);
    } else {
      setLeads((data ?? []) as Lead[]);
    }

    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => {
    loadLeads();
  }, []);

  /* =======================================================
     STATS
  ======================================================= */

  const stats = useMemo(() => {
    const total = leads.length;

    const newLeads = leads.filter(
      (lead) => lead.status === "new",
    ).length;

    const contacted = leads.filter(
      (lead) => lead.status === "contacted",
    ).length;

    const registered = leads.filter(
      (lead) => lead.status === "registered",
    ).length;

    const followUpsDue = leads.filter((lead) =>
      isFollowUpDue(lead.next_follow_up_at),
    ).length;

    return {
      total,
      newLeads,
      contacted,
      registered,
      followUpsDue,
    };
  }, [leads]);

  /* =======================================================
     FILTERED LEADS
  ======================================================= */

  const filteredLeads = useMemo(() => {
    const query = search.trim().toLowerCase();

    return leads.filter((lead) => {
      const matchesStatus =
        statusFilter === "all" ||
        lead.status === statusFilter;

      if (!matchesStatus) return false;

      if (!query) return true;

      return (
        lead.full_name.toLowerCase().includes(query) ||
        lead.email.toLowerCase().includes(query) ||
        lead.whatsapp_number
          .toLowerCase()
          .includes(query)
      );
    });
  }, [leads, search, statusFilter]);

  /* =======================================================
     UPDATE STATUS
  ======================================================= */

  async function updateStatus(
    leadId: string,
    status: LeadStatus,
  ) {
    setOpenMenuId(null);

    const { error } = await supabase
      .from("leads")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", leadId);

    if (error) {
      console.error("Failed to update lead:", error);
      return;
    }

    setLeads((current) =>
      current.map((lead) =>
        lead.id === leadId
          ? {
              ...lead,
              status,
              updated_at: new Date().toISOString(),
            }
          : lead,
      ),
    );

    setSelectedLead((current) =>
      current?.id === leadId
        ? {
            ...current,
            status,
            updated_at: new Date().toISOString(),
          }
        : current,
    );
  }

  /* =======================================================
     ADD LEAD
  ======================================================= */

  async function handleAddLead(event: FormEvent) {
    event.preventDefault();

    if (
      !form.full_name.trim() ||
      !form.email.trim() ||
      !form.whatsapp_number.trim()
    ) {
      return;
    }

    setSaving(true);

    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("leads")
      .insert({
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        whatsapp_number: form.whatsapp_number.trim(),
        notes: form.notes.trim() || null,
        status: "new",
        first_contact_at: now,
      })
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
        `,
      )
      .single();

    setSaving(false);

    if (error) {
      console.error("Failed to create lead:", error);
      return;
    }

    setLeads((current) => [
      data as Lead,
      ...current,
    ]);

    setForm({
      full_name: "",
      email: "",
      whatsapp_number: "",
      notes: "",
    });

    setShowAddModal(false);
  }

  /* =======================================================
     UPDATE SELECTED LEAD
  ======================================================= */

  function handleSelectedStatus(status: LeadStatus) {
    if (!selectedLead) return;

    updateStatus(selectedLead.id, status);
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <main className="st-content overflow-x-hidden">
      {/* ===================================================
          HEADER
      =================================================== */}

      <div className="mb-7 flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div className="min-w-0">
          <p className="st-eyebrow">CRM</p>

          <h1 className="st-page-title mt-2">
            Leads
          </h1>

          <p className="st-page-description">
            Manage enquiries, follow-ups and people moving
            toward registration.
          </p>
        </div>

        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => loadLeads(true)}
            disabled={refreshing}
            className="st-button st-button-secondary"
          >
            <RefreshCw
              size={15}
              className={refreshing ? "animate-spin" : ""}
            />
            Refresh
          </button>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="st-button st-button-primary"
          >
            <Plus size={15} />
            Add lead
          </button>
        </div>
      </div>

      {/* ===================================================
          STATISTICS
      =================================================== */}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="TOTAL LEADS"
          value={stats.total}
          description="All leads in your CRM"
          icon={<Users size={19} />}
        />

        <StatCard
          label="NEW"
          value={stats.newLeads}
          description="Have not been contacted"
          icon={<UserPlus size={19} />}
        />

        <StatCard
          label="CONTACTED"
          value={stats.contacted}
          description="Currently being followed up"
          icon={<MessageCircle size={19} />}
        />

        <StatCard
          label="REGISTERED"
          value={stats.registered}
          description="Converted into learners"
          icon={<Check size={20} />}
          accent
        />
      </section>

      {/* ===================================================
          SEARCH + FILTER
      =================================================== */}

      <section className="st-card mt-6 p-4 sm:p-5">
        {/* SEARCH */}

        <div className="relative">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--st-gray)]"
          />

          <input
            type="search"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Search name, email, WhatsApp"
            className="w-full rounded-2xl border border-[var(--st-border)] bg-white py-4 pl-11 pr-4 text-[12px] text-[var(--st-charcoal-dark)] outline-none placeholder:text-[var(--st-gray)] focus:border-[var(--st-red)] focus:ring-2 focus:ring-[var(--st-red)]/10"
          />
        </div>

        {/* SEGMENTED FILTER */}

        <div className="mt-4 rounded-2xl bg-[var(--st-bg-soft)] p-1.5">
          <div className="grid grid-cols-4 gap-1">
            {(
              [
                ["all", "All"],
                ["new", "New"],
                ["contacted", "Contacted"],
                ["registered", "Registered"],
              ] as [FilterStatus, string][]
            ).map(([key, label]) => {
              const active = statusFilter === key;

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setStatusFilter(key)}
                  className={`flex min-h-[42px] items-center justify-center rounded-xl px-1 text-[9px] font-bold transition-all duration-200 sm:text-[10px] ${
                    active
                      ? "bg-[var(--st-red)] text-white shadow-sm"
                      : "bg-transparent text-[var(--st-gray)] hover:bg-white hover:text-[var(--st-charcoal-dark)]"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===================================================
          PIPELINE HEADER
      =================================================== */}

      <div className="mt-7 mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="st-eyebrow">LEAD PIPELINE</p>

          <p className="mt-1 mb-0 text-[11px] text-[var(--st-gray)]">
            {filteredLeads.length}{" "}
            {filteredLeads.length === 1 ? "lead" : "leads"} shown
          </p>
        </div>

        {search || statusFilter !== "all" ? (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setStatusFilter("all");
            }}
            className="text-[10px] font-bold text-[var(--st-red)]"
          >
            Clear filters
          </button>
        ) : null}
      </div>

      {/* ===================================================
          LEADS
      =================================================== */}

      {loading ? (
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="st-card h-[360px] animate-pulse bg-white"
            />
          ))}
        </section>
      ) : filteredLeads.length === 0 ? (
        <section className="st-card flex min-h-[360px] flex-col items-center justify-center px-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--st-bg-soft)] text-[var(--st-red)]">
            <Users size={22} />
          </div>

          <h2 className="mt-5 mb-0 text-[15px] font-bold text-[var(--st-charcoal-dark)]">
            No leads found
          </h2>

          <p className="mt-2 mb-0 max-w-[300px] text-[11px] leading-relaxed text-[var(--st-gray)]">
            {search || statusFilter !== "all"
              ? "Try another search or filter."
              : "Your leads will appear here when they are added."}
          </p>

          {!search && statusFilter === "all" ? (
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="st-button st-button-primary mt-5"
            >
              <Plus size={15} />
              Add your first lead
            </button>
          ) : null}
        </section>
      ) : (
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {filteredLeads.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              onView={() => setSelectedLead(lead)}
              onStatusChange={(status) =>
                updateStatus(lead.id, status)
              }
              onMenu={() =>
                setOpenMenuId((current) =>
                  current === lead.id ? null : lead.id,
                )
              }
              menuOpen={openMenuId === lead.id}
            />
          ))}
        </section>
      )}

      {/* ===================================================
          FOOTER
      =================================================== */}

      <div className="mt-7 flex flex-col gap-2 border-t border-[var(--st-border)] pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="m-0 text-[9px] text-[var(--st-gray)]">
          Sauti Tamu Piano Center · Lead Management
        </p>

        <p className="m-0 text-[9px] text-[var(--st-gray)]">
          {stats.followUpsDue} follow-up
          {stats.followUpsDue === 1 ? "" : "s"} due
        </p>
      </div>

      {/* ===================================================
          LEAD DETAILS MODAL
      =================================================== */}

      {selectedLead && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/35 sm:items-center sm:p-5"
          onClick={() => setSelectedLead(null)}
        >
          <div
            className="max-h-[92vh] w-full overflow-y-auto rounded-t-[28px] bg-white sm:max-w-[620px] sm:rounded-[28px]"
            onClick={(event) => event.stopPropagation()}
          >
            {/* MODAL HEADER */}

            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-[var(--st-border)] bg-white px-6 py-5">
              <div className="min-w-0">
                <p className="st-eyebrow">
                  LEAD DETAILS
                </p>

                <h2 className="mt-2 truncate text-[22px] font-bold text-[var(--st-charcoal-dark)]">
                  {selectedLead.full_name}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setSelectedLead(null)}
                className="st-icon-button shrink-0"
                aria-label="Close lead details"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-5 p-6">
              {/* STATUS + DATE */}

              <div className="flex items-center justify-between gap-4">
                <StatusBadge status={selectedLead.status} />

                <span className="text-[10px] text-[var(--st-gray)]">
                  Added {formatDate(selectedLead.created_at)}
                </span>
              </div>

              {/* EMAIL */}

              <a
                href={`mailto:${selectedLead.email}`}
                className="flex items-center gap-4 rounded-2xl bg-[var(--st-bg-soft)] p-4"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[var(--st-red)]">
                  <Mail size={17} />
                </div>

                <div className="min-w-0">
                  <p className="m-0 text-[9px] font-semibold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                    Email
                  </p>

                  <p className="mt-1 mb-0 truncate text-[11px] font-semibold text-[var(--st-charcoal-dark)]">
                    {selectedLead.email}
                  </p>
                </div>
              </a>

              {/* PHONE */}

              <a
                href={`tel:${selectedLead.whatsapp_number}`}
                className="flex items-center gap-4 rounded-2xl bg-[var(--st-bg-soft)] p-4"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[var(--st-red)]">
                  <Phone size={17} />
                </div>

                <div className="min-w-0">
                  <p className="m-0 text-[9px] font-semibold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                    WhatsApp / Phone
                  </p>

                  <p className="mt-1 mb-0 text-[11px] font-semibold text-[var(--st-charcoal-dark)]">
                    {selectedLead.whatsapp_number}
                  </p>
                </div>
              </a>

              {/* FOLLOW UP */}

              <div className="rounded-2xl border border-[var(--st-border)] p-4">
                <div className="flex items-center gap-3">
                  <Clock3
                    size={18}
                    className="text-[var(--st-red)]"
                  />

                  <div>
                    <p className="m-0 text-[9px] font-semibold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                      Next follow-up
                    </p>

                    <p className="mt-1 mb-0 text-[11px] font-semibold text-[var(--st-charcoal-dark)]">
                      {formatFollowUp(
                        selectedLead.next_follow_up_at,
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* NOTES */}

              {selectedLead.notes ? (
                <div className="rounded-2xl bg-[var(--st-bg-soft)] p-4">
                  <p className="m-0 text-[9px] font-semibold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                    Notes
                  </p>

                  <p className="mt-2 mb-0 text-[11px] leading-relaxed text-[var(--st-charcoal-dark)]">
                    {selectedLead.notes}
                  </p>
                </div>
              ) : null}

              {/* CONTACT ACTIONS */}

              <div className="grid grid-cols-3 gap-2">
                <a
                  href={`https://wa.me/${selectedLead.whatsapp_number.replace(
                    /\D/g,
                    "",
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-[var(--st-red)] px-2 text-[10px] font-bold text-white"
                >
                  <MessageCircle size={16} />
                  WhatsApp
                </a>

                <a
                  href={`tel:${selectedLead.whatsapp_number}`}
                  className="flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-[var(--st-bg-soft)] px-2 text-[10px] font-bold text-[var(--st-charcoal-dark)]"
                >
                  <Phone size={16} />
                  Call
                </a>

                <a
                  href={`mailto:${selectedLead.email}`}
                  className="flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-[var(--st-bg-soft)] px-2 text-[10px] font-bold text-[var(--st-charcoal-dark)]"
                >
                  <Mail size={16} />
                  Email
                </a>
              </div>

              {/* UPDATE STATUS */}

              <div className="border-t border-[var(--st-border)] pt-5">
                <p className="m-0 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                  Update status
                </p>

                <div className="mt-3 grid grid-cols-3 gap-2">
                  {(
                    [
                      ["new", "New"],
                      ["contacted", "Contacted"],
                      ["registered", "Registered"],
                    ] as [LeadStatus, string][]
                  ).map(([status, label]) => {
                    const active =
                      selectedLead.status === status;

                    return (
                      <button
                        key={status}
                        type="button"
                        onClick={() =>
                          handleSelectedStatus(status)
                        }
                        className={`min-h-[46px] rounded-full border text-[10px] font-bold transition-all ${
                          active
                            ? "border-[var(--st-red)] bg-[var(--st-bg-soft)] text-[var(--st-red)]"
                            : "border-[var(--st-border)] bg-white text-[var(--st-charcoal-dark)] hover:border-[var(--st-red)]"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================
          ADD LEAD MODAL
      =================================================== */}

      {showAddModal && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/35 sm:items-center sm:p-5"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="w-full rounded-t-[28px] bg-white sm:max-w-[560px] sm:rounded-[28px]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-[var(--st-border)] px-6 py-5">
              <div>
                <p className="st-eyebrow">
                  CRM
                </p>

                <h2 className="mt-2 text-[22px] font-bold text-[var(--st-charcoal-dark)]">
                  Add lead
                </h2>

                <p className="mt-1 mb-0 text-[10px] text-[var(--st-gray)]">
                  Add someone who has shown interest in lessons.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="st-icon-button"
                aria-label="Close add lead"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={handleAddLead}
              className="space-y-4 p-6"
            >
              {/* NAME */}

              <div>
                <label className="mb-2 block text-[10px] font-bold text-[var(--st-charcoal-dark)]">
                  Full name
                </label>

                <input
                  type="text"
                  required
                  value={form.full_name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      full_name: event.target.value,
                    }))
                  }
                  placeholder="e.g. Brian Mwangi"
                  className="w-full rounded-2xl border border-[var(--st-border)] px-4 py-3.5 text-[11px] outline-none focus:border-[var(--st-red)]"
                />
              </div>

              {/* EMAIL */}

              <div>
                <label className="mb-2 block text-[10px] font-bold text-[var(--st-charcoal-dark)]">
                  Email
                </label>

                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                  placeholder="name@example.com"
                  className="w-full rounded-2xl border border-[var(--st-border)] px-4 py-3.5 text-[11px] outline-none focus:border-[var(--st-red)]"
                />
              </div>

              {/* PHONE */}

              <div>
                <label className="mb-2 block text-[10px] font-bold text-[var(--st-charcoal-dark)]">
                  WhatsApp / Phone
                </label>

                <input
                  type="tel"
                  required
                  value={form.whatsapp_number}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      whatsapp_number:
                        event.target.value,
                    }))
                  }
                  placeholder="+254..."
                  className="w-full rounded-2xl border border-[var(--st-border)] px-4 py-3.5 text-[11px] outline-none focus:border-[var(--st-red)]"
                />
              </div>

              {/* NOTES */}

              <div>
                <label className="mb-2 block text-[10px] font-bold text-[var(--st-charcoal-dark)]">
                  Notes
                </label>

                <textarea
                  value={form.notes}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                  rows={4}
                  placeholder="Anything useful about this lead..."
                  className="w-full resize-none rounded-2xl border border-[var(--st-border)] px-4 py-3.5 text-[11px] outline-none focus:border-[var(--st-red)]"
                />
              </div>

              {/* ACTIONS */}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="st-button st-button-secondary flex-1"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="st-button st-button-primary flex-1"
                >
                  {saving ? (
                    <>
                      <RefreshCw
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
      )}
    </main>
  );
}