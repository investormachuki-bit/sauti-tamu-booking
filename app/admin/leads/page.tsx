"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Check,
  CheckCircle2,
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

import { supabase } from "@/lib/supabase";

type LeadStatus =
  | "new"
  | "contacted"
  | "registered";

type Lead = {
  id: string;
  full_name: string;
  email: string;
  whatsapp_number: string;
  status: LeadStatus;
  created_at: string;
};

const NAIROBI_TIME_ZONE = "Africa/Nairobi";

/* =========================================================
   HELPERS
========================================================= */

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat("en-KE", {
    timeZone: NAIROBI_TIME_ZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
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

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function prettyStatus(status: LeadStatus) {
  switch (status) {
    case "new":
      return "New";

    case "contacted":
      return "Contacted";

    case "registered":
      return "Registered";

    default:
      return status;
  }
}

function statusClasses(status: LeadStatus) {
  switch (status) {
    case "new":
      return "bg-red-50 text-[var(--st-red)]";

    case "contacted":
      return "bg-amber-50 text-amber-700";

    case "registered":
      return "bg-green-50 text-green-700";

    default:
      return "bg-gray-50 text-gray-700";
  }
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
      className={`st-card p-5 ${
        accent
          ? "border border-[var(--st-border-red)]"
          : ""
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="m-0 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
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

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--st-bg-soft)] text-[var(--st-red)]">
          {icon}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   PAGE
========================================================= */

export default function AdminLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  const [filter, setFilter] = useState<
    "all" | LeadStatus
  >("all");

  const [selectedLead, setSelectedLead] =
    useState<Lead | null>(null);

  const [menuLeadId, setMenuLeadId] =
    useState<string | null>(null);

  const [updatingId, setUpdatingId] =
    useState<string | null>(null);

  const [showAddLead, setShowAddLead] =
    useState(false);

  const [addingLead, setAddingLead] =
    useState(false);

  const [newLead, setNewLead] = useState({
    full_name: "",
    email: "",
    whatsapp_number: "",
  });

  /* =========================================================
     LOAD LEADS
  ========================================================= */

  async function loadLeads(silent = false) {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    const {
      data,
      error: loadError,
    } = await supabase
      .from("leads")
      .select(
        `
          id,
          full_name,
          email,
          whatsapp_number,
          status,
          created_at
        `
      )
      .order("created_at", {
        ascending: false,
      });

    if (loadError) {
      console.error(
        "Lead load error:",
        loadError
      );

      setError(
        "We couldn't load your leads. Please try again."
      );

      setLoading(false);
      setRefreshing(false);

      return;
    }

    setLeads((data ?? []) as Lead[]);

    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => {
    loadLeads();
  }, []);

  /* =========================================================
     STATS
  ========================================================= */

  const stats = useMemo(() => {
    return {
      total: leads.length,

      newLeads: leads.filter(
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

  /* =========================================================
     FILTER
  ========================================================= */

  const filteredLeads = useMemo(() => {
    const query = search
      .trim()
      .toLowerCase();

    return leads.filter((lead) => {
      if (
        filter !== "all" &&
        lead.status !== filter
      ) {
        return false;
      }

      if (!query) {
        return true;
      }

      const searchable = [
        lead.full_name,
        lead.email,
        lead.whatsapp_number,
        lead.status,
      ]
        .join(" ")
        .toLowerCase();

      return searchable.includes(query);
    });
  }, [leads, search, filter]);

  /* =========================================================
     UPDATE STATUS
  ========================================================= */

  async function updateLeadStatus(
    lead: Lead,
    status: LeadStatus
  ) {
    setUpdatingId(lead.id);
    setError("");

    const {
      data,
      error: updateError,
    } = await supabase
      .from("leads")
      .update({
        status,
      })
      .eq("id", lead.id)
      .select(
        `
          id,
          full_name,
          email,
          whatsapp_number,
          status,
          created_at
        `
      )
      .single();

    if (updateError) {
      console.error(
        "Lead status update error:",
        updateError
      );

      setError(
        "We couldn't update this lead."
      );

      setUpdatingId(null);
      setMenuLeadId(null);

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

    if (
      selectedLead?.id === lead.id
    ) {
      setSelectedLead(updatedLead);
    }

    setMenuLeadId(null);
    setUpdatingId(null);
  }

  /* =========================================================
     ADD LEAD
  ========================================================= */

  async function handleAddLead(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const name =
      newLead.full_name.trim();

    const email =
      newLead.email.trim();

    const phone =
      newLead.whatsapp_number.trim();

    if (!name || !email || !phone) {
      setError(
        "Please enter the lead's name, email and WhatsApp number."
      );

      return;
    }

    setAddingLead(true);
    setError("");

    const {
      data,
      error: insertError,
    } = await supabase
      .from("leads")
      .insert({
        full_name: name,
        email,
        whatsapp_number: phone,
        status: "new",
      })
      .select(
        `
          id,
          full_name,
          email,
          whatsapp_number,
          status,
          created_at
        `
      )
      .single();

    if (insertError) {
      console.error(
        "Lead creation error:",
        insertError
      );

      setError(
        insertError.message ||
          "We couldn't add this lead."
      );

      setAddingLead(false);

      return;
    }

    const createdLead = data as Lead;

    setLeads((current) => [
      createdLead,
      ...current,
    ]);

    setNewLead({
      full_name: "",
      email: "",
      whatsapp_number: "",
    });

    setShowAddLead(false);
    setAddingLead(false);
  }

  /* =========================================================
     CONTACT ACTIONS
  ========================================================= */

  function openWhatsApp(lead: Lead) {
    if (!lead.whatsapp_number) {
      return;
    }

    const cleanPhone =
      lead.whatsapp_number.replace(
        /[^0-9+]/g,
        ""
      );

    const message = `Hello ${lead.full_name}, this is Sauti Tamu Piano Center. We wanted to follow up with you regarding your interest in our piano and guitar lessons.`;

    window.open(
      `https://wa.me/${cleanPhone.replace(
        "+",
        ""
      )}?text=${encodeURIComponent(
        message
      )}`,
      "_blank"
    );
  }

  function callLead(lead: Lead) {
    if (!lead.whatsapp_number) {
      return;
    }

    window.location.href = `tel:${lead.whatsapp_number}`;
  }

  function emailLead(lead: Lead) {
    if (!lead.email) {
      return;
    }

    window.location.href = `mailto:${lead.email}`;
  }

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <main className="st-content">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="mb-7 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">

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

        <div className="flex w-full gap-2 md:w-auto">

          <button
            type="button"
            onClick={() =>
              loadLeads(true)
            }
            className="st-button st-button-secondary flex-1 md:flex-none"
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

          <button
            type="button"
            onClick={() =>
              setShowAddLead(true)
            }
            className="st-button st-button-primary flex-1 md:flex-none"
          >
            <Plus size={15} />
            Add lead
          </button>

        </div>
      </div>

      {/* =====================================================
          STATS
      ===================================================== */}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

        <StatCard
          label="Total leads"
          value={stats.total}
          description="All leads in your CRM"
          icon={<Users size={18} />}
        />

        <StatCard
          label="New"
          value={stats.newLeads}
          description="Have not been contacted"
          icon={<UserPlus size={18} />}
        />

        <StatCard
          label="Contacted"
          value={stats.contacted}
          description="Currently being followed up"
          icon={<MessageCircle size={18} />}
        />

        <StatCard
          label="Registered"
          value={stats.registered}
          description="Converted into learners"
          icon={<Check size={18} />}
          accent
        />

      </section>

      {/* =====================================================
          SEARCH + FILTER
      ===================================================== */}

      <section className="st-card mt-5 p-4">

        <div className="relative">

          <Search
            size={18}
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
            placeholder="Search name, email, WhatsApp"
            className="w-full rounded-2xl border border-[var(--st-border)] bg-white py-4 pl-12 pr-4 text-[13px] outline-none transition focus:border-[var(--st-red)] focus:ring-2 focus:ring-[var(--st-red)]/10"
          />

        </div>

        {/* ===================================================
            FILTER PILLS
            Designed as compact pills rather than the previous
            large horizontal tab strip.
        =================================================== */}

        <div className="mt-4 flex flex-wrap gap-2">

          {[
            {
              key: "all",
              label: "All",
              count: stats.total,
            },
            {
              key: "new",
              label: "New",
              count: stats.newLeads,
            },
            {
              key: "contacted",
              label: "Contacted",
              count: stats.contacted,
            },
            {
              key: "registered",
              label: "Registered",
              count: stats.registered,
            },
          ].map((item) => {
            const active =
              filter === item.key;

            return (
              <button
                key={item.key}
                type="button"
                onClick={() =>
                  setFilter(
                    item.key as
                      | "all"
                      | LeadStatus
                  )
                }
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-[10px] font-bold transition-all ${
                  active
                    ? "border-[var(--st-red)] bg-[var(--st-red)] text-white shadow-sm"
                    : "border-[var(--st-border)] bg-white text-[var(--st-gray)] hover:border-[var(--st-red)] hover:text-[var(--st-red)]"
                }`}
              >
                {item.label}

                <span
                  className={`inline-flex min-w-[20px] items-center justify-center rounded-full px-1.5 py-0.5 text-[8px] ${
                    active
                      ? "bg-white/20 text-white"
                      : "bg-[var(--st-bg-soft)] text-[var(--st-gray)]"
                  }`}
                >
                  {item.count}
                </span>
              </button>
            );
          })}

        </div>

      </section>

      {/* =====================================================
          ERROR
      ===================================================== */}

      {error && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <p className="m-0 text-[10px] leading-relaxed text-red-700">
            {error}
          </p>
        </div>
      )}

      {/* =====================================================
          PIPELINE HEADER
      ===================================================== */}

      <section className="mt-7">

        <div className="mb-4">

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

        {/* ===================================================
            LOADING
        =================================================== */}

        {loading ? (
          <div className="st-card flex min-h-[280px] items-center justify-center gap-2 text-[10px] text-[var(--st-gray)]">
            <RefreshCw
              size={16}
              className="animate-spin"
            />
            Loading leads...
          </div>
        ) : filteredLeads.length === 0 ? (
          /* =================================================
             EMPTY
          ================================================= */

          <div className="st-card flex min-h-[300px] flex-col items-center justify-center px-5 text-center">

            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--st-bg-soft)] text-[var(--st-red)]">
              <Users size={22} />
            </div>

            <p className="mt-5 mb-0 text-[14px] font-bold text-[var(--st-charcoal-dark)]">
              No leads found
            </p>

            <p className="mt-2 mb-0 max-w-[280px] text-[10px] leading-relaxed text-[var(--st-gray)]">
              Try another search or filter,
              or add a new lead.
            </p>

          </div>
        ) : (
          /* =================================================
             LEAD CARDS
          ================================================= */

          <div className="grid grid-cols-1 gap-4">

            {filteredLeads.map((lead) => (
              <div
                key={lead.id}
                className="st-card overflow-hidden"
              >

                {/* CARD HEADER */}

                <div className="p-5">

                  <div className="flex items-start gap-3">

                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--st-bg-soft)] text-[10px] font-bold text-[var(--st-red)]">
                      {initials(
                        lead.full_name
                      )}
                    </div>

                    <div className="min-w-0 flex-1">

                      <p className="m-0 truncate text-[14px] font-bold text-[var(--st-charcoal-dark)]">
                        {lead.full_name}
                      </p>

                      <p className="mt-1 mb-0 text-[10px] text-[var(--st-gray)]">
                        Added{" "}
                        {formatDate(
                          lead.created_at
                        )}
                      </p>

                    </div>

                    {/* MORE MENU */}

                    <div className="relative">

                      <button
                        type="button"
                        onClick={() =>
                          setMenuLeadId(
                            menuLeadId ===
                              lead.id
                              ? null
                              : lead.id
                          )
                        }
                        className="st-icon-button"
                        aria-label={`Lead options for ${lead.full_name}`}
                      >
                        <MoreHorizontal
                          size={16}
                        />
                      </button>

                      {menuLeadId ===
                        lead.id && (
                        <div className="absolute right-0 top-12 z-30 w-48 overflow-hidden rounded-2xl border border-[var(--st-border)] bg-white p-1.5 shadow-xl">

                          {(
                            [
                              "new",
                              "contacted",
                              "registered",
                            ] as LeadStatus[]
                          ).map(
                            (status) => (
                              <button
                                key={
                                  status
                                }
                                type="button"
                                onClick={() =>
                                  updateLeadStatus(
                                    lead,
                                    status
                                  )
                                }
                                disabled={
                                  updatingId ===
                                  lead.id
                                }
                                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[10px] font-semibold text-[var(--st-charcoal-dark)] hover:bg-[var(--st-bg-soft)] disabled:opacity-50"
                              >
                                <span
                                  className={`h-2 w-2 rounded-full ${
                                    status ===
                                    "new"
                                      ? "bg-[var(--st-red)]"
                                      : status ===
                                        "contacted"
                                      ? "bg-amber-500"
                                      : "bg-green-600"
                                  }`}
                                />

                                Mark{" "}
                                {prettyStatus(
                                  status
                                ).toLowerCase()}
                              </button>
                            )
                          )}

                        </div>
                      )}

                    </div>

                  </div>

                  {/* STATUS */}

                  <div className="mt-5">

                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.04em] ${statusClasses(
                        lead.status
                      )}`}
                    >
                      {lead.status ===
                        "registered" && (
                        <CheckCircle2
                          size={11}
                        />
                      )}

                      {prettyStatus(
                        lead.status
                      )}
                    </span>

                  </div>

                </div>

                {/* CONTACT DETAILS */}

                <div className="border-t border-[var(--st-border)] px-5 py-4">

                  <div className="space-y-2">

                    <div className="flex min-w-0 items-center gap-3 rounded-full bg-[var(--st-bg-soft)] px-4 py-3">

                      <Mail
                        size={15}
                        className="shrink-0 text-[var(--st-red)]"
                      />

                      <span className="min-w-0 truncate text-[11px] text-[var(--st-charcoal-dark)]">
                        {lead.email}
                      </span>

                    </div>

                    <div className="flex min-w-0 items-center gap-3 rounded-full bg-[var(--st-bg-soft)] px-4 py-3">

                      <Phone
                        size={15}
                        className="shrink-0 text-[var(--st-red)]"
                      />

                      <span className="truncate text-[11px] text-[var(--st-charcoal-dark)]">
                        {
                          lead.whatsapp_number
                        }
                      </span>

                    </div>

                  </div>

                </div>

                {/* NEXT FOLLOW-UP */}

                <div className="border-t border-[var(--st-border)] px-5 py-4">

                  <div className="flex items-center justify-between gap-4">

                    <div>

                      <p className="m-0 text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--st-gray)]">
                        NEXT FOLLOW-UP
                      </p>

                      <p className="mt-1 mb-0 text-[11px] font-semibold text-[var(--st-charcoal-dark)]">
                        No follow-up
                        scheduled
                      </p>

                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setSelectedLead(
                          lead
                        )
                      }
                      className="shrink-0 text-[12px] font-semibold text-[var(--st-red)] transition hover:opacity-70"
                    >
                      View lead{" "}
                      <ArrowRight
                        size={14}
                        className="ml-1 inline"
                      />
                    </button>

                  </div>

                </div>

                {/* CONTACT ACTIONS */}

                <div className="border-t border-[var(--st-border)] bg-[var(--st-bg-soft)] px-4 py-3">

                  <div className="grid grid-cols-3 gap-2">

                    <button
                      type="button"
                      onClick={() =>
                        openWhatsApp(
                          lead
                        )
                      }
                      className="flex items-center justify-center gap-2 rounded-full bg-white px-3 py-3 text-[11px] font-medium text-[var(--st-charcoal-dark)] transition hover:text-[var(--st-red)]"
                    >
                      <MessageCircle
                        size={15}
                        className="text-[var(--st-red)]"
                      />
                      WhatsApp
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        callLead(lead)
                      }
                      className="flex items-center justify-center gap-2 rounded-full bg-white px-3 py-3 text-[11px] font-medium text-[var(--st-charcoal-dark)] transition hover:text-[var(--st-red)]"
                    >
                      <Phone
                        size={15}
                        className="text-[var(--st-red)]"
                      />
                      Call
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        emailLead(lead)
                      }
                      className="flex items-center justify-center gap-2 rounded-full bg-white px-3 py-3 text-[11px] font-medium text-[var(--st-charcoal-dark)] transition hover:text-[var(--st-red)]"
                    >
                      <Mail
                        size={15}
                        className="text-[var(--st-red)]"
                      />
                      Email
                    </button>

                  </div>

                </div>

              </div>
            ))}

          </div>
        )}

      </section>

      {/* =====================================================
          FOOTER
      ===================================================== */}

      <div className="mt-7 border-t border-[var(--st-border)] pt-5">

        <p className="m-0 text-[9px] text-[var(--st-gray)]">
          Sauti Tamu Piano Center · Lead Management
        </p>

      </div>

      {/* =====================================================
          LEAD DETAILS MODAL
      ===================================================== */}

      {selectedLead && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 sm:items-center sm:p-5"
          onClick={() =>
            setSelectedLead(null)
          }
        >

          <div
            className="max-h-[92vh] w-full max-w-[560px] overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            {/* HEADER */}

            <div className="sticky top-0 z-10 border-b border-[var(--st-border)] bg-white px-5 py-5">

              <div className="flex items-start justify-between gap-4">

                <div>

                  <p className="st-eyebrow">
                    LEAD DETAILS
                  </p>

                  <h2 className="mt-2 text-[24px] font-bold text-[var(--st-charcoal-dark)]">
                    {selectedLead.full_name}
                  </h2>

                </div>

                <button
                  type="button"
                  onClick={() =>
                    setSelectedLead(null)
                  }
                  className="st-icon-button"
                  aria-label="Close lead details"
                >
                  <X size={17} />
                </button>

              </div>

            </div>

            <div className="p-5">

              {/* STATUS + DATE */}

              <div className="flex items-center justify-between gap-4">

                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[9px] font-bold uppercase ${statusClasses(
                    selectedLead.status
                  )}`}
                >
                  {selectedLead.status ===
                    "registered" && (
                    <CheckCircle2
                      size={11}
                    />
                  )}

                  {prettyStatus(
                    selectedLead.status
                  )}
                </span>

                <span className="text-[10px] text-[var(--st-gray)]">
                  Added{" "}
                  {formatLongDate(
                    selectedLead.created_at
                  )}
                </span>

              </div>

              {/* CONTACT INFORMATION */}

              <div className="mt-5 space-y-3">

                <div className="flex items-center gap-3 rounded-2xl bg-[var(--st-bg-soft)] px-4 py-4">

                  <Mail
                    size={17}
                    className="shrink-0 text-[var(--st-red)]"
                  />

                  <div className="min-w-0">

                    <p className="m-0 text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                      Email
                    </p>

                    <p className="mt-1 mb-0 break-all text-[12px] font-semibold text-[var(--st-charcoal-dark)]">
                      {selectedLead.email}
                    </p>

                  </div>

                </div>

                <div className="flex items-center gap-3 rounded-2xl bg-[var(--st-bg-soft)] px-4 py-4">

                  <Phone
                    size={17}
                    className="shrink-0 text-[var(--st-red)]"
                  />

                  <div>

                    <p className="m-0 text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                      WhatsApp / Phone
                    </p>

                    <p className="mt-1 mb-0 text-[12px] font-semibold text-[var(--st-charcoal-dark)]">
                      {
                        selectedLead.whatsapp_number
                      }
                    </p>

                  </div>

                </div>

              </div>

              {/* FOLLOW-UP */}

              <div className="mt-3 rounded-2xl border border-[var(--st-border)] px-4 py-4">

                <p className="m-0 text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                  NEXT FOLLOW-UP
                </p>

                <p className="mt-2 mb-0 text-[12px] font-semibold text-[var(--st-charcoal-dark)]">
                  No follow-up scheduled
                </p>

              </div>

              {/* ACTIONS */}

              <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">

                <button
                  type="button"
                  onClick={() =>
                    openWhatsApp(
                      selectedLead
                    )
                  }
                  className="st-button st-button-primary w-full"
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
                      selectedLead
                    )
                  }
                  className="st-button st-button-secondary w-full"
                >
                  <Phone size={15} />
                  Call
                </button>

                <button
                  type="button"
                  onClick={() =>
                    emailLead(
                      selectedLead
                    )
                  }
                  className="st-button st-button-secondary w-full"
                >
                  <Mail size={15} />
                  Email
                </button>

              </div>

              {/* STATUS */}

              <div className="mt-7 border-t border-[var(--st-border)] pt-5">

                <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--st-gray)]">
                  UPDATE STATUS
                </p>

                <div className="grid grid-cols-3 gap-2">

                  {(
                    [
                      "new",
                      "contacted",
                      "registered",
                    ] as LeadStatus[]
                  ).map((status) => (
                    <button
                      key={status}
                      type="button"
                      disabled={
                        updatingId ===
                        selectedLead.id
                      }
                      onClick={() =>
                        updateLeadStatus(
                          selectedLead,
                          status
                        )
                      }
                      className={`rounded-xl border px-2 py-3 text-[10px] font-bold transition ${
                        selectedLead.status ===
                        status
                          ? "border-[var(--st-red)] bg-[var(--st-bg-soft)] text-[var(--st-red)]"
                          : "border-[var(--st-border)] bg-white text-[var(--st-gray)] hover:border-[var(--st-red)]"
                      } disabled:opacity-50`}
                    >
                      {prettyStatus(
                        status
                      )}
                    </button>
                  ))}

                </div>

              </div>

              {/* CLOSE */}

              <button
                type="button"
                onClick={() =>
                  setSelectedLead(null)
                }
                className="st-button st-button-secondary mt-5 w-full"
              >
                Done
              </button>

            </div>

          </div>

        </div>
      )}

      {/* =====================================================
          ADD LEAD MODAL
      ===================================================== */}

      {showAddLead && (
        <div
          className="fixed inset-0 z-[110] flex items-end justify-center bg-black/40 sm:items-center sm:p-5"
          onClick={() =>
            setShowAddLead(false)
          }
        >

          <div
            className="w-full max-w-[520px] rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="flex items-center justify-between border-b border-[var(--st-border)] px-5 py-5">

              <div>

                <p className="st-eyebrow">
                  CRM
                </p>

                <h2 className="mt-2 text-[22px] font-bold text-[var(--st-charcoal-dark)]">
                  Add lead
                </h2>

              </div>

              <button
                type="button"
                onClick={() =>
                  setShowAddLead(false)
                }
                className="st-icon-button"
              >
                <X size={17} />
              </button>

            </div>

            <form
              onSubmit={handleAddLead}
              className="p-5"
            >

              <div className="space-y-4">

                <div>

                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                    Full name
                  </label>

                  <input
                    value={
                      newLead.full_name
                    }
                    onChange={(event) =>
                      setNewLead(
                        (current) => ({
                          ...current,
                          full_name:
                            event.target
                              .value,
                        })
                      )
                    }
                    placeholder="e.g. Brian Mwangi"
                    className="w-full rounded-xl border border-[var(--st-border)] px-4 py-3.5 text-[12px] outline-none focus:border-[var(--st-red)] focus:ring-2 focus:ring-[var(--st-red)]/10"
                  />

                </div>

                <div>

                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                    Email
                  </label>

                  <input
                    type="email"
                    value={
                      newLead.email
                    }
                    onChange={(event) =>
                      setNewLead(
                        (current) => ({
                          ...current,
                          email:
                            event.target
                              .value,
                        })
                      )
                    }
                    placeholder="name@example.com"
                    className="w-full rounded-xl border border-[var(--st-border)] px-4 py-3.5 text-[12px] outline-none focus:border-[var(--st-red)] focus:ring-2 focus:ring-[var(--st-red)]/10"
                  />

                </div>

                <div>

                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                    WhatsApp / Phone
                  </label>

                  <input
                    type="tel"
                    value={
                      newLead.whatsapp_number
                    }
                    onChange={(event) =>
                      setNewLead(
                        (current) => ({
                          ...current,
                          whatsapp_number:
                            event.target
                              .value,
                        })
                      )
                    }
                    placeholder="+254..."
                    className="w-full rounded-xl border border-[var(--st-border)] px-4 py-3.5 text-[12px] outline-none focus:border-[var(--st-red)] focus:ring-2 focus:ring-[var(--st-red)]/10"
                  />

                </div>

              </div>

              <div className="mt-6 grid grid-cols-2 gap-2">

                <button
                  type="button"
                  onClick={() =>
                    setShowAddLead(false)
                  }
                  className="st-button st-button-secondary w-full"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={addingLead}
                  className="st-button st-button-primary w-full disabled:opacity-60"
                >
                  {addingLead ? (
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