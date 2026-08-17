"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  CheckCircle2,
  Clock3,
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

type FilterStatus = "all" | LeadStatus;

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(dateString));
}

function formatFollowUp(dateString: string | null) {
  if (!dateString) return "No follow-up scheduled";

  const date = new Date(dateString);

  return new Intl.DateTimeFormat("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getStatusLabel(status: LeadStatus) {
  if (status === "contacted") return "Contacted";
  if (status === "registered") return "Registered";
  return "New";
}

function getWhatsAppUrl(phone: string) {
  const cleaned = phone.replace(/[^\d]/g, "");

  return `https://wa.me/${cleaned}`;
}

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
    <div className="st-card st-card-hover p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="m-0 text-[11px] font-semibold text-[var(--st-gray)]">
            {label}
          </p>

          <p
            className={`mt-3 mb-0 text-[32px] font-bold leading-none tracking-[-0.04em] ${
              accent
                ? "text-[var(--st-red)]"
                : "text-[var(--st-charcoal-dark)]"
            }`}
          >
            {value}
          </p>

          <p className="mt-3 mb-0 text-[10px] text-[var(--st-gray)]">
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

function StatusBadge({ status }: { status: LeadStatus }) {
  const classes =
    status === "registered"
      ? "bg-green-50 text-green-700"
      : status === "contacted"
        ? "bg-yellow-50 text-yellow-700"
        : "bg-[var(--st-bg-soft)] text-[var(--st-red)]";

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.05em] ${classes}`}
    >
      {getStatusLabel(status)}
    </span>
  );
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<FilterStatus>("all");

  const [selectedLead, setSelectedLead] =
    useState<Lead | null>(null);

  const [menuLeadId, setMenuLeadId] =
    useState<string | null>(null);

  const [showAddLead, setShowAddLead] =
    useState(false);

  const [savingLead, setSavingLead] =
    useState(false);

  const [updatingStatus, setUpdatingStatus] =
    useState(false);

  const [error, setError] = useState("");

  const [newLeadName, setNewLeadName] =
    useState("");

  const [newLeadEmail, setNewLeadEmail] =
    useState("");

  const [newLeadWhatsapp, setNewLeadWhatsapp] =
    useState("");

  async function loadLeads(showRefresh = false) {
    if (showRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
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
      console.error("Failed to load leads:", leadsError);

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

  const counts = useMemo(() => {
    return {
      total: leads.length,
      new: leads.filter(
        (lead) => lead.status === "new"
      ).length,
      contacted: leads.filter(
        (lead) => lead.status === "contacted"
      ).length,
      registered: leads.filter(
        (lead) => lead.status === "registered"
      ).length,
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
          .includes(query)
      );
    });
  }, [leads, search, statusFilter]);

  async function updateLeadStatus(
    lead: Lead,
    status: LeadStatus
  ) {
    setUpdatingStatus(true);
    setError("");

    const { data, error: updateError } =
      await supabase
        .from("leads")
        .update({
          status,
          updated_at: new Date().toISOString(),
          last_contact_at:
            status === "contacted"
              ? new Date().toISOString()
              : lead.last_contact_at,
        })
        .eq("id", lead.id)
        .select()
        .single();

    if (updateError) {
      console.error(
        "Failed to update lead:",
        updateError
      );

      setError(
        "We couldn't update this lead. Please try again."
      );

      setUpdatingStatus(false);
      return;
    }

    const updatedLead = data as Lead;

    setLeads((current) =>
      current.map((item) =>
        item.id === lead.id
          ? updatedLead
          : item
      )
    );

    setSelectedLead(updatedLead);
    setMenuLeadId(null);
    setUpdatingStatus(false);
  }

  async function handleAddLead() {
    if (!newLeadName.trim()) {
      setError("Please enter the lead's name.");
      return;
    }

    if (!newLeadEmail.trim()) {
      setError("Please enter the lead's email.");
      return;
    }

    if (!newLeadWhatsapp.trim()) {
      setError(
        "Please enter the lead's WhatsApp number."
      );
      return;
    }

    setSavingLead(true);
    setError("");

    const { data, error: insertError } =
      await supabase
        .from("leads")
        .insert({
          full_name: newLeadName.trim(),
          email: newLeadEmail.trim(),
          whatsapp_number:
            newLeadWhatsapp.trim(),
          status: "new",
        })
        .select()
        .single();

    if (insertError) {
      console.error(
        "Failed to create lead:",
        insertError
      );

      setError(
        "We couldn't create the lead. Please try again."
      );

      setSavingLead(false);
      return;
    }

    setLeads((current) => [
      data as Lead,
      ...current,
    ]);

    setNewLeadName("");
    setNewLeadEmail("");
    setNewLeadWhatsapp("");
    setShowAddLead(false);
    setSavingLead(false);
  }

  function openLead(lead: Lead) {
    setSelectedLead(lead);
    setMenuLeadId(null);
  }

  function closeLead() {
    setSelectedLead(null);
    setError("");
  }

  return (
    <main className="st-content">
      {/* =====================================================
          PAGE HEADER
      ===================================================== */}

      <div className="mb-7 flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <p className="st-eyebrow">
            CRM
          </p>

          <h1 className="st-page-title mt-2">
            Leads
          </h1>

          <p className="st-page-description">
            Manage enquiries, follow-ups and people moving
            toward registration.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => loadLeads(true)}
            disabled={refreshing}
            className="st-button st-button-secondary disabled:opacity-60"
          >
            <Users size={15} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>

          <button
            type="button"
            onClick={() => {
              setError("");
              setShowAddLead(true);
            }}
            className="st-button st-button-primary"
          >
            <Plus size={15} />
            Add lead
          </button>
        </div>
      </div>

      {/* =====================================================
          ERROR
      ===================================================== */}

      {error && !selectedLead && (
        <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
          <p className="m-0 text-[10px] leading-relaxed text-red-700">
            {error}
          </p>
        </div>
      )}

      {/* =====================================================
          STATISTICS
      ===================================================== */}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="TOTAL LEADS"
          value={counts.total}
          description="All leads in your CRM"
          icon={<Users size={19} />}
        />

        <StatCard
          label="NEW"
          value={counts.new}
          description="Have not been contacted"
          icon={<UserPlus size={19} />}
          accent
        />

        <StatCard
          label="CONTACTED"
          value={counts.contacted}
          description="Currently being followed up"
          icon={<MessageCircle size={19} />}
        />

        <StatCard
          label="REGISTERED"
          value={counts.registered}
          description="Converted into learners"
          icon={<Check size={19} />}
        />
      </section>

      {/* =====================================================
          SEARCH + FILTER
      ===================================================== */}

      <section className="st-card mt-6 p-5">
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

        {/* No horizontal scrolling on mobile */}
        <div className="mt-4 grid grid-cols-4 gap-2">
          {(
            [
              ["all", "All"],
              ["new", "New"],
              ["contacted", "Contacted"],
              ["registered", "Registered"],
            ] as [FilterStatus, string][]
          ).map(([key, label]) => {
            const active =
              statusFilter === key;

            return (
              <button
                key={key}
                type="button"
                onClick={() =>
                  setStatusFilter(key)
                }
                className={`min-w-0 rounded-full px-2 py-3 text-[10px] font-bold transition-all ${
                  active
                    ? "bg-[var(--st-red)] text-white"
                    : "bg-[var(--st-bg-soft)] text-[var(--st-charcoal)] hover:bg-[var(--st-border)]"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </section>

      {/* =====================================================
          LEAD PIPELINE
      ===================================================== */}

      <section className="mt-7">
        <div className="mb-3">
          <p className="st-eyebrow">
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

        {loading ? (
          <div className="st-card p-10 text-center">
            <p className="m-0 text-[11px] text-[var(--st-gray)]">
              Loading leads...
            </p>
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="st-card p-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--st-bg-soft)] text-[var(--st-red)]">
              <Users size={22} />
            </div>

            <h2 className="mt-5 text-[15px] font-bold text-[var(--st-charcoal-dark)]">
              No leads found
            </h2>

            <p className="mx-auto mt-2 max-w-[300px] text-[10px] leading-relaxed text-[var(--st-gray)]">
              Try another search or filter, or add a new
              lead to your CRM.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredLeads.map((lead) => (
              <div
                key={lead.id}
                className="st-card overflow-hidden"
              >
                {/* LEAD HEADER */}

                <div className="flex items-start justify-between gap-4 p-5">
                  <button
                    type="button"
                    onClick={() =>
                      openLead(lead)
                    }
                    className="flex min-w-0 items-center gap-3 text-left"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--st-bg-soft)] text-[11px] font-bold text-[var(--st-red)]">
                      {getInitials(
                        lead.full_name
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="m-0 truncate text-[13px] font-bold text-[var(--st-charcoal-dark)]">
                        {lead.full_name}
                      </p>

                      <p className="mt-1 mb-0 text-[9px] text-[var(--st-gray)]">
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
                        setMenuLeadId(
                          menuLeadId === lead.id
                            ? null
                            : lead.id
                        )
                      }
                      className="st-icon-button"
                      aria-label={`Lead actions for ${lead.full_name}`}
                    >
                      <MoreHorizontal size={17} />
                    </button>

                    {menuLeadId === lead.id && (
                      <div className="absolute right-0 top-11 z-30 w-48 overflow-hidden rounded-2xl border border-[var(--st-border)] bg-white shadow-xl">
                        <button
                          type="button"
                          onClick={() =>
                            updateLeadStatus(
                              lead,
                              "new"
                            )
                          }
                          className="block w-full px-4 py-3 text-left text-[11px] text-[var(--st-charcoal-dark)] hover:bg-[var(--st-bg-soft)]"
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
                          className="block w-full px-4 py-3 text-left text-[11px] text-[var(--st-charcoal-dark)] hover:bg-[var(--st-bg-soft)]"
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
                  <StatusBadge
                    status={lead.status}
                  />
                </div>

                {/* CONTACT INFORMATION */}

                <div className="space-y-2 border-t border-[var(--st-border)] px-5 py-4">
                  <a
                    href={`mailto:${lead.email}`}
                    className="flex min-w-0 items-center gap-3 rounded-full bg-[var(--st-bg-soft)] px-4 py-3"
                  >
                    <Mail
                      size={15}
                      className="shrink-0 text-[var(--st-red)]"
                    />

                    <span className="min-w-0 truncate text-[10px] text-[var(--st-charcoal)]">
                      {lead.email}
                    </span>
                  </a>

                  <a
                    href={`tel:${lead.whatsapp_number}`}
                    className="flex min-w-0 items-center gap-3 rounded-full bg-[var(--st-bg-soft)] px-4 py-3"
                  >
                    <Phone
                      size={15}
                      className="shrink-0 text-[var(--st-red)]"
                    />

                    <span className="text-[10px] text-[var(--st-charcoal)]">
                      {lead.whatsapp_number}
                    </span>
                  </a>
                </div>

                {/* FOLLOW-UP */}

                <div className="border-t border-[var(--st-border)] px-5 py-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="m-0 text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--st-gray)]">
                        NEXT FOLLOW-UP
                      </p>

                      <p className="mt-1 mb-0 text-[10px] font-semibold text-[var(--st-charcoal-dark)]">
                        {formatFollowUp(
                          lead.next_follow_up_at
                        )}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        openLead(lead)
                      }
                      className="self-start text-[11px] font-bold text-[var(--st-red)] sm:self-auto"
                    >
                      View lead →
                    </button>
                  </div>
                </div>

                {/* QUICK CONTACT */}

                <div className="grid grid-cols-3 gap-2 border-t border-[var(--st-border)] bg-[var(--st-bg-soft)] p-3">
                  <a
                    href={getWhatsAppUrl(
                      lead.whatsapp_number
                    )}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 rounded-full bg-white px-2 py-3 text-[10px] font-semibold text-[var(--st-charcoal)] transition-colors hover:bg-[var(--st-red)] hover:text-white"
                  >
                    <MessageCircle size={14} />
                    <span>WhatsApp</span>
                  </a>

                  <a
                    href={`tel:${lead.whatsapp_number}`}
                    className="flex items-center justify-center gap-2 rounded-full bg-white px-2 py-3 text-[10px] font-semibold text-[var(--st-charcoal)] transition-colors hover:bg-[var(--st-red)] hover:text-white"
                  >
                    <Phone size={14} />
                    <span>Call</span>
                  </a>

                  <a
                    href={`mailto:${lead.email}`}
                    className="flex items-center justify-center gap-2 rounded-full bg-white px-2 py-3 text-[10px] font-semibold text-[var(--st-charcoal)] transition-colors hover:bg-[var(--st-red)] hover:text-white"
                  >
                    <Mail size={14} />
                    <span>Email</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* =====================================================
          FOOTER
      ===================================================== */}

      <div className="mt-7 flex flex-col gap-2 border-t border-[var(--st-border)] pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="m-0 text-[9px] text-[var(--st-gray)]">
          Sauti Tamu Piano Center · Lead Management
        </p>

        <p className="m-0 text-[9px] text-[var(--st-gray)]">
          Admin workspace
        </p>
      </div>

      {/* =====================================================
          LEAD DETAILS MODAL
      ===================================================== */}

      {selectedLead && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-5">
          <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-[28px] bg-white sm:max-w-[620px] sm:rounded-[28px]">
            {/* MODAL HEADER */}

            <div className="flex items-start justify-between border-b border-[var(--st-border)] px-5 py-5">
              <div className="min-w-0">
                <p className="st-eyebrow">
                  LEAD DETAILS
                </p>

                <h2 className="mt-2 truncate text-[24px] font-bold tracking-[-0.04em] text-[var(--st-charcoal-dark)]">
                  {selectedLead.full_name}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeLead}
                className="st-icon-button shrink-0"
                aria-label="Close lead details"
              >
                <X size={19} />
              </button>
            </div>

            <div className="p-5 sm:p-7">
              {/* STATUS + DATE */}

              <div className="flex items-center justify-between gap-4">
                <StatusBadge
                  status={selectedLead.status}
                />

                <span className="text-[9px] text-[var(--st-gray)]">
                  Added{" "}
                  {formatDate(
                    selectedLead.created_at
                  )}
                </span>
              </div>

              {/* EMAIL */}

              <a
                href={`mailto:${selectedLead.email}`}
                className="mt-5 flex items-center gap-4 rounded-2xl bg-[var(--st-bg-soft)] p-4"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[var(--st-red)]">
                  <Mail size={17} />
                </div>

                <div className="min-w-0">
                  <p className="m-0 text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                    EMAIL
                  </p>

                  <p className="mt-1 mb-0 truncate text-[11px] font-semibold text-[var(--st-charcoal-dark)]">
                    {selectedLead.email}
                  </p>
                </div>
              </a>

              {/* PHONE */}

              <a
                href={`tel:${selectedLead.whatsapp_number}`}
                className="mt-3 flex items-center gap-4 rounded-2xl bg-[var(--st-bg-soft)] p-4"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[var(--st-red)]">
                  <Phone size={17} />
                </div>

                <div>
                  <p className="m-0 text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                    WHATSAPP / PHONE
                  </p>

                  <p className="mt-1 mb-0 text-[11px] font-semibold text-[var(--st-charcoal-dark)]">
                    {selectedLead.whatsapp_number}
                  </p>
                </div>
              </a>

              {/* FOLLOW-UP */}

              <div className="mt-3 flex items-center gap-4 rounded-2xl border border-[var(--st-border)] p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--st-bg-soft)] text-[var(--st-red)]">
                  <Clock3 size={17} />
                </div>

                <div>
                  <p className="m-0 text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                    NEXT FOLLOW-UP
                  </p>

                  <p className="mt-1 mb-0 text-[11px] font-semibold text-[var(--st-charcoal-dark)]">
                    {formatFollowUp(
                      selectedLead.next_follow_up_at
                    )}
                  </p>
                </div>
              </div>

              {/* CONTACT BUTTONS */}

              <div className="mt-5 grid grid-cols-3 gap-2">
                <a
                  href={getWhatsAppUrl(
                    selectedLead.whatsapp_number
                  )}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 rounded-full bg-[var(--st-red)] px-2 py-3.5 text-[10px] font-bold text-white"
                >
                  <MessageCircle size={14} />
                  WhatsApp
                </a>

                <a
                  href={`tel:${selectedLead.whatsapp_number}`}
                  className="flex items-center justify-center gap-2 rounded-full bg-[var(--st-bg-soft)] px-2 py-3.5 text-[10px] font-bold text-[var(--st-charcoal)]"
                >
                  <Phone size={14} />
                  Call
                </a>

                <a
                  href={`mailto:${selectedLead.email}`}
                  className="flex items-center justify-center gap-2 rounded-full bg-[var(--st-bg-soft)] px-2 py-3.5 text-[10px] font-bold text-[var(--st-charcoal)]"
                >
                  <Mail size={14} />
                  Email
                </a>
              </div>

              {/* STATUS */}

              <div className="mt-7 border-t border-[var(--st-border)] pt-6">
                <p className="m-0 text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--st-gray)]">
                  UPDATE STATUS
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
                      selectedLead.status ===
                      status;

                    return (
                      <button
                        key={status}
                        type="button"
                        disabled={updatingStatus}
                        onClick={() =>
                          updateLeadStatus(
                            selectedLead,
                            status
                          )
                        }
                        className={`rounded-full border px-2 py-3 text-[10px] font-bold transition-all disabled:opacity-60 ${
                          active
                            ? "border-[var(--st-red)] bg-[var(--st-bg-soft)] text-[var(--st-red)]"
                            : "border-[var(--st-border)] bg-white text-[var(--st-charcoal)]"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* NOTES */}

              {selectedLead.notes && (
                <div className="mt-6 rounded-2xl bg-[var(--st-bg-soft)] p-4">
                  <p className="m-0 text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--st-gray)]">
                    NOTES
                  </p>

                  <p className="mt-2 mb-0 text-[11px] leading-relaxed text-[var(--st-charcoal)]">
                    {selectedLead.notes}
                  </p>
                </div>
              )}

              {/* ERROR */}

              {error && (
                <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                  <p className="m-0 text-[10px] leading-relaxed text-red-700">
                    {error}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          ADD LEAD MODAL
      ===================================================== */}

      {showAddLead && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-5">
          <div className="w-full rounded-t-[28px] bg-white sm:max-w-[520px] sm:rounded-[28px]">
            <div className="flex items-start justify-between border-b border-[var(--st-border)] px-5 py-5">
              <div>
                <p className="st-eyebrow">
                  NEW LEAD
                </p>

                <h2 className="mt-2 text-[23px] font-bold tracking-[-0.04em] text-[var(--st-charcoal-dark)]">
                  Add a lead
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowAddLead(false)
                }
                className="st-icon-button"
                aria-label="Close add lead"
              >
                <X size={19} />
              </button>
            </div>

            <div className="space-y-5 p-5 sm:p-7">
              <div>
                <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--st-charcoal)]">
                  Full name
                </label>

                <input
                  type="text"
                  value={newLeadName}
                  onChange={(event) =>
                    setNewLeadName(
                      event.target.value
                    )
                  }
                  placeholder="Lead's full name"
                  className="w-full rounded-xl border border-[var(--st-border)] bg-white px-4 py-3.5 text-[12px] outline-none focus:border-[var(--st-red)] focus:ring-2 focus:ring-[var(--st-red)]/10"
                />
              </div>

              <div>
                <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--st-charcoal)]">
                  Email address
                </label>

                <input
                  type="email"
                  value={newLeadEmail}
                  onChange={(event) =>
                    setNewLeadEmail(
                      event.target.value
                    )
                  }
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-[var(--st-border)] bg-white px-4 py-3.5 text-[12px] outline-none focus:border-[var(--st-red)] focus:ring-2 focus:ring-[var(--st-red)]/10"
                />
              </div>

              <div>
                <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--st-charcoal)]">
                  WhatsApp number
                </label>

                <input
                  type="tel"
                  value={newLeadWhatsapp}
                  onChange={(event) =>
                    setNewLeadWhatsapp(
                      event.target.value
                    )
                  }
                  placeholder="+254 712 345 678"
                  className="w-full rounded-xl border border-[var(--st-border)] bg-white px-4 py-3.5 text-[12px] outline-none focus:border-[var(--st-red)] focus:ring-2 focus:ring-[var(--st-red)]/10"
                />
              </div>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                  <p className="m-0 text-[10px] leading-relaxed text-red-700">
                    {error}
                  </p>
                </div>
              )}

              <button
                type="button"
                disabled={savingLead}
                onClick={handleAddLead}
                className="st-button st-button-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
              >
                <UserPlus size={15} />

                {savingLead
                  ? "Adding lead..."
                  : "Add lead"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}