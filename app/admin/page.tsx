import AppShell from "@/components/layout/AppShell";

export default function AdminPage() {
  return (
    <AppShell>
      <div className="space-y-8">

        <div>
          <p className="st-eyebrow">
            OVERVIEW
          </p>

          <h1 className="st-page-title mt-2">
            Good morning.
          </h1>

          <p className="st-page-description">
            Your Sauti Tamu booking and
            follow-up workspace.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">

          <div className="st-card p-5">
            <p className="st-small">
              Today&apos;s trials
            </p>

            <p className="mt-3 mb-0 text-3xl font-bold text-[var(--st-charcoal-dark)]">
              0
            </p>
          </div>

          <div className="st-card p-5">
            <p className="st-small">
              New leads
            </p>

            <p className="mt-3 mb-0 text-3xl font-bold text-[var(--st-charcoal-dark)]">
              0
            </p>
          </div>

          <div className="st-card p-5">
            <p className="st-small">
              Follow-ups due
            </p>

            <p className="mt-3 mb-0 text-3xl font-bold text-[var(--st-red)]">
              0
            </p>
          </div>

        </div>

      </div>
    </AppShell>
  );
}