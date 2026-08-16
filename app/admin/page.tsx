"use client";

import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  MessageCircle,
  MoreHorizontal,
  Phone,
  Plus,
  UserPlus,
  Users,
} from "lucide-react";

import AppShell from "@/components/layout/AppShell";

const todayTrials = [
  {
    time: "09:00 AM",
    name: "Brian Mwangi",
    instrument: "Piano",
    status: "Confirmed",
    phone: "0724 123 456",
  },
  {
    time: "11:30 AM",
    name: "Grace Wanjiku",
    instrument: "Guitar",
    status: "Confirmed",
    phone: "0718 456 789",
  },
  {
    time: "02:00 PM",
    name: "Daniel Kamau",
    instrument: "Piano",
    status: "Pending",
    phone: "0791 234 567",
  },
  {
    time: "04:30 PM",
    name: "Mercy Njeri",
    instrument: "Guitar",
    status: "Confirmed",
    phone: "0703 987 654",
  },
];

const followUps = [
  {
    name: "James Kariuki",
    instrument: "Piano",
    reason: "Trial completed — no registration yet",
    due: "Today",
  },
  {
    name: "Ann Wambui",
    instrument: "Guitar",
    reason: "Booked but has not confirmed",
    due: "Today",
  },
  {
    name: "Peter Maina",
    instrument: "Piano",
    reason: "Asked about payment plan",
    due: "Tomorrow",
  },
];

const recentLeads = [
  {
    name: "Sarah Njoki",
    instrument: "Piano",
    source: "Trial Booking",
    time: "8 min ago",
  },
  {
    name: "Kevin Otieno",
    instrument: "Guitar",
    source: "WhatsApp",
    time: "24 min ago",
  },
  {
    name: "Linda Wairimu",
    instrument: "Piano",
    source: "Website",
    time: "1 hr ago",
  },
];

function StatCard({
  label,
  value,
  description,
  icon,
  accent = false,
}: {
  label: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="st-card st-card-hover p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
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

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--st-bg-soft)] text-[var(--st-red)]">
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <AppShell>
      <main className="st-content">
        {/* =====================================================
            PAGE HEADER
        ===================================================== */}

        <div className="mb-7 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="st-eyebrow">
              OVERVIEW
            </p>

            <h1 className="st-page-title mt-2">
              Good morning.
            </h1>

            <p className="st-page-description">
              Here&apos;s what is happening at Sauti Tamu today.
            </p>
          </div>

          <div className="flex gap-2">
            <button className="st-button st-button-secondary">
              <CalendarDays size={15} />
              Calendar
            </button>

            <button className="st-button st-button-primary">
              <Plus size={15} />
              New Booking
            </button>
          </div>
        </div>

        {/* =====================================================
            STATISTICS
        ===================================================== */}

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="TODAY'S TRIALS"
            value="4"
            description="4 bookings scheduled today"
            icon={<CalendarDays size={18} />}
          />

          <StatCard
            label="NEW LEADS"
            value="7"
            description="Leads received in the last 7 days"
            icon={<UserPlus size={18} />}
          />

          <StatCard
            label="FOLLOW-UPS DUE"
            value="3"
            description="People need attention today"
            icon={<Clock3 size={18} />}
            accent
          />

          <StatCard
            label="THIS WEEK"
            value="12"
            description="Trial bookings this week"
            icon={<Users size={18} />}
          />
        </section>

        {/* =====================================================
            MAIN GRID
        ===================================================== */}

        <section className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-[1.6fr_1fr]">
          {/* ===================================================
              TODAY'S SCHEDULE
          =================================================== */}

          <div className="st-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-[var(--st-border)] px-5 py-4">
              <div>
                <h2 className="st-section-title">
                  Today&apos;s trials
                </h2>

                <p className="mt-1 mb-0 text-[10px] text-[var(--st-gray)]">
                  Your trial lesson schedule for today
                </p>
              </div>

              <button className="st-button st-button-ghost">
                View calendar
                <ArrowRight size={14} />
              </button>
            </div>

            <div className="divide-y divide-[var(--st-border)]">
              {todayTrials.map((trial) => (
                <div
                  key={`${trial.time}-${trial.name}`}
                  className="flex flex-col gap-4 px-5 py-4 transition-colors hover:bg-[var(--st-bg-soft)] sm:flex-row sm:items-center"
                >
                  {/* TIME */}

                  <div className="w-[82px] shrink-0">
                    <p className="m-0 text-[12px] font-bold text-[var(--st-charcoal-dark)]">
                      {trial.time}
                    </p>
                  </div>

                  {/* PERSON */}

                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--st-bg-soft)] text-[10px] font-bold text-[var(--st-red)]">
                      {trial.name
                        .split(" ")
                        .map((word) => word[0])
                        .join("")
                        .slice(0, 2)}
                    </div>

                    <div className="min-w-0">
                      <p className="m-0 truncate text-[12px] font-bold text-[var(--st-charcoal-dark)]">
                        {trial.name}
                      </p>

                      <p className="mt-1 mb-0 text-[10px] text-[var(--st-gray)]">
                        {trial.instrument} trial lesson
                      </p>
                    </div>
                  </div>

                  {/* STATUS */}

                  <div>
                    <span
                      className={`st-badge ${
                        trial.status === "Confirmed"
                          ? "st-badge-green"
                          : "st-badge-yellow"
                      }`}
                    >
                      {trial.status === "Confirmed" && (
                        <CheckCircle2 size={11} />
                      )}

                      {trial.status}
                    </span>
                  </div>

                  {/* ACTIONS */}

                  <div className="flex items-center gap-1">
                    <button
                      className="st-icon-button"
                      aria-label={`WhatsApp ${trial.name}`}
                    >
                      <MessageCircle size={15} />
                    </button>

                    <button
                      className="st-icon-button"
                      aria-label={`Call ${trial.name}`}
                    >
                      <Phone size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ===================================================
              FOLLOW UPS
          =================================================== */}

          <div className="st-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-[var(--st-border)] px-5 py-4">
              <div>
                <h2 className="st-section-title">
                  Follow-ups due
                </h2>

                <p className="mt-1 mb-0 text-[10px] text-[var(--st-gray)]">
                  Leads that need your attention
                </p>
              </div>

              <span className="st-badge st-badge-red">
                3 due
              </span>
            </div>

            <div className="divide-y divide-[var(--st-border)]">
              {followUps.map((lead) => (
                <div
                  key={lead.name}
                  className="px-5 py-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--st-bg-soft)] text-[10px] font-bold text-[var(--st-red)]">
                        {lead.name
                          .split(" ")
                          .map((word) => word[0])
                          .join("")
                          .slice(0, 2)}
                      </div>

                      <div className="min-w-0">
                        <p className="m-0 truncate text-[12px] font-bold text-[var(--st-charcoal-dark)]">
                          {lead.name}
                        </p>

                        <p className="mt-1 mb-0 text-[10px] text-[var(--st-gray)]">
                          {lead.instrument}
                        </p>
                      </div>
                    </div>

                    <button
                      className="st-icon-button"
                      aria-label="More options"
                    >
                      <MoreHorizontal size={15} />
                    </button>
                  </div>

                  <p className="mt-3 mb-0 text-[10px] leading-relaxed text-[var(--st-gray)]">
                    {lead.reason}
                  </p>

                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--st-red)]">
                      {lead.due}
                    </span>

                    <button className="text-[10px] font-bold text-[var(--st-red)] hover:underline">
                      Follow up →
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-[var(--st-border)] px-5 py-3">
              <button className="text-[10px] font-bold text-[var(--st-red)]">
                View all follow-ups →
              </button>
            </div>
          </div>
        </section>

        {/* =====================================================
            LOWER SECTION
        ===================================================== */}

        <section className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_0.8fr]">
          {/* RECENT LEADS */}

          <div className="st-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-[var(--st-border)] px-5 py-4">
              <div>
                <h2 className="st-section-title">
                  Recent leads
                </h2>

                <p className="mt-1 mb-0 text-[10px] text-[var(--st-gray)]">
                  People who recently showed interest
                </p>
              </div>

              <button className="st-button st-button-ghost">
                View all
                <ArrowRight size={14} />
              </button>
            </div>

            <div className="divide-y divide-[var(--st-border)]">
              {recentLeads.map((lead) => (
                <div
                  key={lead.name}
                  className="flex items-center gap-3 px-5 py-4"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--st-bg-soft)] text-[10px] font-bold text-[var(--st-red)]">
                    {lead.name
                      .split(" ")
                      .map((word) => word[0])
                      .join("")
                      .slice(0, 2)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="m-0 text-[11px] font-bold text-[var(--st-charcoal-dark)]">
                      {lead.name}
                    </p>

                    <p className="mt-1 mb-0 text-[9px] text-[var(--st-gray)]">
                      {lead.instrument} · {lead.source}
                    </p>
                  </div>

                  <span className="shrink-0 text-[9px] text-[var(--st-gray)]">
                    {lead.time}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* QUICK ACTIONS */}

          <div className="st-card p-5">
            <div>
              <p className="st-eyebrow">
                QUICK ACTIONS
              </p>

              <h2 className="mt-2 st-section-title">
                Keep things moving.
              </h2>

              <p className="mt-2 mb-0 text-[10px] leading-relaxed text-[var(--st-gray)]">
                Quickly handle bookings, leads and follow-ups
                without leaving your workspace.
              </p>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button className="group rounded-xl border border-[var(--st-border)] bg-white p-4 text-left transition-all hover:border-[var(--st-border-red)] hover:bg-[var(--st-bg-soft)]">
                <Plus
                  size={17}
                  className="text-[var(--st-red)]"
                />

                <p className="mt-3 mb-0 text-[10px] font-bold text-[var(--st-charcoal-dark)]">
                  New booking
                </p>
              </button>

              <button className="group rounded-xl border border-[var(--st-border)] bg-white p-4 text-left transition-all hover:border-[var(--st-border-red)] hover:bg-[var(--st-bg-soft)]">
                <UserPlus
                  size={17}
                  className="text-[var(--st-red)]"
                />

                <p className="mt-3 mb-0 text-[10px] font-bold text-[var(--st-charcoal-dark)]">
                  Add lead
                </p>
              </button>

              <button className="group rounded-xl border border-[var(--st-border)] bg-white p-4 text-left transition-all hover:border-[var(--st-border-red)] hover:bg-[var(--st-bg-soft)]">
                <CalendarDays
                  size={17}
                  className="text-[var(--st-red)]"
                />

                <p className="mt-3 mb-0 text-[10px] font-bold text-[var(--st-charcoal-dark)]">
                  Open calendar
                </p>
              </button>

              <button className="group rounded-xl border border-[var(--st-border)] bg-white p-4 text-left transition-all hover:border-[var(--st-border-red)] hover:bg-[var(--st-bg-soft)]">
                <MessageCircle
                  size={17}
                  className="text-[var(--st-red)]"
                />

                <p className="mt-3 mb-0 text-[10px] font-bold text-[var(--st-charcoal-dark)]">
                  Follow up
                </p>
              </button>
            </div>
          </div>
        </section>

        {/* =====================================================
            FOOTER NOTE
        ===================================================== */}

        <div className="mt-7 flex items-center justify-between border-t border-[var(--st-border)] pt-5">
          <p className="m-0 text-[9px] text-[var(--st-gray)]">
            Sauti Tamu Piano Center · Booking &amp; Follow-up
          </p>

          <p className="m-0 text-[9px] text-[var(--st-gray)]">
            Admin workspace
          </p>
        </div>
      </main>
    </AppShell>
  );
}