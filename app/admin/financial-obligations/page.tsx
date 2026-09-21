"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertTriangle,
  CalendarDays,
  Check,
  Edit3,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  WalletCards,
  X,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

/* =====================================================
   TYPES
===================================================== */

type Obligation = {
  id: string;
  name: string;
  category: string;
  amount: number;
  frequency: string;
  start_date: string | null;
  end_date: string | null;
  outstanding_balance: number;
  next_due_date: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type ObligationForm = {
  name: string;
  category: string;
  amount: string;
  frequency: string;
  start_date: string;
  end_date: string;
  outstanding_balance: string;
  next_due_date: string;
  status: string;
  notes: string;
};

/* =====================================================
   CONSTANTS
===================================================== */

const NAIROBI_TIME_ZONE = "Africa/Nairobi";

const OBLIGATION_CATEGORIES = [
  "Insurance",
  "Family & School Fees",
  "Loans Owed",
  "Loan Repayments",
  "Rent",
  "Utilities",
  "Salaries & Wages",
  "Taxes & Licenses",
  "Software & Subscriptions",
  "Other",
];

const OBLIGATION_FREQUENCIES = [
  {
    value: "one_time",
    label: "One Time",
  },
  {
    value: "weekly",
    label: "Weekly",
  },
  {
    value: "monthly",
    label: "Monthly",
  },
  {
    value: "quarterly",
    label: "Quarterly",
  },
  {
    value: "annually",
    label: "Annually",
  },
];

const OBLIGATION_STATUSES = [
  {
    value: "active",
    label: "Active",
  },
  {
    value: "paused",
    label: "Paused",
  },
  {
    value: "completed",
    label: "Completed",
  },
  {
    value: "cancelled",
    label: "Cancelled",
  },
];

/* =====================================================
   HELPERS
===================================================== */

function getTodayKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: NAIROBI_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function formatCurrency(
  value: number | null | undefined
) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function formatDate(
  value: string | null
) {
  if (!value) {
    return "—";
  }

  const date = new Date(
    `${value}T00:00:00+03:00`
  );

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-KE", {
    timeZone: NAIROBI_TIME_ZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function emptyForm(): ObligationForm {
  return {
    name: "",
    category: OBLIGATION_CATEGORIES[0],
    amount: "",
    frequency: "one_time",
    start_date: getTodayKey(),
    end_date: "",
    outstanding_balance: "",
    next_due_date: getTodayKey(),
    status: "active",
    notes: "",
  };
}

function toNumber(value: unknown) {
  const number = Number(value ?? 0);

  return Number.isFinite(number)
    ? number
    : 0;
}

function frequencyLabel(value: string) {
  return (
    OBLIGATION_FREQUENCIES.find(
      (item) => item.value === value
    )?.label ??
    value.replace(/_/g, " ")
  );
}

function statusLabel(value: string) {
  return (
    OBLIGATION_STATUSES.find(
      (item) => item.value === value
    )?.label ??
    value
  );
}

function mapObligation(row: any): Obligation {
  return {
    id: row.id,
    name: row.name ?? "",
    category: row.category ?? "",
    amount: toNumber(row.amount),
    frequency:
      row.frequency ?? "one_time",
    start_date:
      row.start_date ?? null,
    end_date:
      row.end_date ?? null,
    outstanding_balance:
      toNumber(row.outstanding_balance),
    next_due_date:
      row.next_due_date ?? null,
    status:
      row.status ?? "active",
    notes:
      row.notes ?? null,
    created_at:
      row.created_at ?? "",
    updated_at:
      row.updated_at ?? "",
  };
}

/* =====================================================
   MODAL
===================================================== */

function ObligationModal({
  open,
  editing,
  form,
  saving,
  error,
  onChange,
  onClose,
  onSave,
}: {
  open: boolean;
  editing: Obligation | null;
  form: ObligationForm;
  saving: boolean;
  error: string;
  onChange: (
    field: keyof ObligationForm,
    value: string
  ) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  if (!open) {
    return null;
  }

  /*
   * Preserve an existing database category even if it
   * is an older/custom value that is not currently in
   * the standard category list.
   *
   * It is STILL a dropdown.
   */
  const categoryOptions = Array.from(
    new Set([
      ...OBLIGATION_CATEGORIES,
      ...(form.category
        ? [form.category]
        : []),
    ])
  );

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/40 px-4 py-6">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-[var(--st-border)] bg-white shadow-2xl">
        {/* HEADER */}

        <div className="flex items-center justify-between border-b border-[var(--st-border)] px-5 py-4">
          <div>
            <p className="m-0 text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--st-gray)]">
              Financial Management
            </p>

            <h2 className="mt-1 mb-0 text-[18px] font-bold tracking-[-0.02em] text-[var(--st-charcoal-dark)]">
              {editing
                ? "Edit Financial Obligation"
                : "Add Financial Obligation"}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--st-gray)] hover:bg-[var(--st-bg-soft)] disabled:opacity-50"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* FORM */}

        <div className="max-h-[78vh] overflow-y-auto px-5 py-5">
          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-[9px] text-red-700">
              <AlertTriangle
                size={14}
                className="mt-[1px] shrink-0"
              />

              <span>{error}</span>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            {/* NAME */}

            <label className="md:col-span-2">
              <span className="block text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                Obligation Name
              </span>

              <input
                type="text"
                value={form.name}
                onChange={(event) =>
                  onChange(
                    "name",
                    event.target.value
                  )
                }
                placeholder="e.g. Health Insurance"
                className="mt-2 h-10 w-full rounded-xl border border-[var(--st-border)] px-3 text-[11px] outline-none focus:border-[var(--st-red)]"
              />
            </label>

            {/* CATEGORY */}

            <label>
              <span className="block text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                Category
              </span>

              <select
                value={form.category}
                onChange={(event) =>
                  onChange(
                    "category",
                    event.target.value
                  )
                }
                className="mt-2 h-10 w-full rounded-xl border border-[var(--st-border)] bg-white px-3 text-[11px] outline-none focus:border-[var(--st-red)]"
              >
                {categoryOptions.map(
                  (category) => (
                    <option
                      key={category}
                      value={category}
                    >
                      {category}
                    </option>
                  )
                )}
              </select>
            </label>

            {/* FREQUENCY */}

            <label>
              <span className="block text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                Frequency
              </span>

              <select
                value={form.frequency}
                onChange={(event) =>
                  onChange(
                    "frequency",
                    event.target.value
                  )
                }
                className="mt-2 h-10 w-full rounded-xl border border-[var(--st-border)] bg-white px-3 text-[11px] outline-none focus:border-[var(--st-red)]"
              >
                {OBLIGATION_FREQUENCIES.map(
                  (item) => (
                    <option
                      key={item.value}
                      value={item.value}
                    >
                      {item.label}
                    </option>
                  )
                )}
              </select>
            </label>

            {/* AMOUNT */}

            <label>
              <span className="block text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                Amount (KES)
              </span>

              <input
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(event) =>
                  onChange(
                    "amount",
                    event.target.value
                  )
                }
                placeholder="0"
                className="mt-2 h-10 w-full rounded-xl border border-[var(--st-border)] px-3 text-[11px] outline-none focus:border-[var(--st-red)]"
              />
            </label>

            {/* OUTSTANDING */}

            <label>
              <span className="block text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                Outstanding Balance (KES)
              </span>

              <input
                type="number"
                min="0"
                step="0.01"
                value={
                  form.outstanding_balance
                }
                onChange={(event) =>
                  onChange(
                    "outstanding_balance",
                    event.target.value
                  )
                }
                placeholder="0"
                className="mt-2 h-10 w-full rounded-xl border border-[var(--st-border)] px-3 text-[11px] outline-none focus:border-[var(--st-red)]"
              />
            </label>

            {/* START DATE */}

            <label>
              <span className="block text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                Start Date
              </span>

              <input
                type="date"
                value={form.start_date}
                onChange={(event) =>
                  onChange(
                    "start_date",
                    event.target.value
                  )
                }
                className="mt-2 h-10 w-full rounded-xl border border-[var(--st-border)] px-3 text-[11px] outline-none focus:border-[var(--st-red)]"
              />
            </label>

            {/* NEXT DUE */}

            <label>
              <span className="block text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                Next Due Date
              </span>

              <input
                type="date"
                value={
                  form.next_due_date
                }
                onChange={(event) =>
                  onChange(
                    "next_due_date",
                    event.target.value
                  )
                }
                className="mt-2 h-10 w-full rounded-xl border border-[var(--st-border)] px-3 text-[11px] outline-none focus:border-[var(--st-red)]"
              />
            </label>

            {/* END DATE */}

            <label>
              <span className="block text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                End Date
              </span>

              <input
                type="date"
                value={form.end_date}
                onChange={(event) =>
                  onChange(
                    "end_date",
                    event.target.value
                  )
                }
                className="mt-2 h-10 w-full rounded-xl border border-[var(--st-border)] px-3 text-[11px] outline-none focus:border-[var(--st-red)]"
              />
            </label>

            {/* STATUS */}

            <label>
              <span className="block text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                Status
              </span>

              <select
                value={form.status}
                onChange={(event) =>
                  onChange(
                    "status",
                    event.target.value
                  )
                }
                className="mt-2 h-10 w-full rounded-xl border border-[var(--st-border)] bg-white px-3 text-[11px] outline-none focus:border-[var(--st-red)]"
              >
                {OBLIGATION_STATUSES.map(
                  (item) => (
                    <option
                      key={item.value}
                      value={item.value}
                    >
                      {item.label}
                    </option>
                  )
                )}
              </select>
            </label>

            {/* NOTES */}

            <label className="md:col-span-2">
              <span className="block text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                Notes
              </span>

              <textarea
                value={form.notes}
                onChange={(event) =>
                  onChange(
                    "notes",
                    event.target.value
                  )
                }
                rows={3}
                placeholder="Optional notes"
                className="mt-2 w-full resize-none rounded-xl border border-[var(--st-border)] px-3 py-2 text-[11px] outline-none focus:border-[var(--st-red)]"
              />
            </label>
          </div>
        </div>

        {/* FOOTER */}

        <div className="flex items-center justify-end gap-2 border-t border-[var(--st-border)] px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="st-button st-button-secondary"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="st-button st-button-primary"
          >
            {saving ? (
              <Loader2
                size={14}
                className="animate-spin"
              />
            ) : (
              <Check size={14} />
            )}

            {editing
              ? "Save Changes"
              : "Add Obligation"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* =====================================================
   PAGE
===================================================== */

export default function FinancialObligationsPage() {
  const [
    obligations,
    setObligations,
  ] = useState<Obligation[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    actionError,
    setActionError,
  ] = useState("");

  const [
    showModal,
    setShowModal,
  ] = useState(false);

  const [
    editingObligation,
    setEditingObligation,
  ] = useState<Obligation | null>(
    null
  );

  const [
    form,
    setForm,
  ] = useState<ObligationForm>(
    () => emptyForm()
  );

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    deletingId,
    setDeletingId,
  ] = useState<string | null>(
    null
  );

  const [
    searchTerm,
    setSearchTerm,
  ] = useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState("active");

  /* ===================================================
     LOAD
  =================================================== */

  const loadObligations =
    useCallback(
      async (
        silent = false
      ) => {
        try {
          if (silent) {
            setRefreshing(true);
          } else {
            setLoading(true);
          }

          setError("");

          let query =
            supabase
              .from(
                "financial_obligations"
              )
              .select("*")
              .order(
                "next_due_date",
                {
                  ascending: true,
                  nullsFirst: false,
                }
              )
              .order(
                "created_at",
                {
                  ascending: false,
                }
              );

          if (
            statusFilter !==
            "all"
          ) {
            query =
              query.eq(
                "status",
                statusFilter
              );
          }

          const {
            data,
            error: queryError,
          } = await query;

          if (queryError) {
            throw queryError;
          }

          setObligations(
            (data ?? []).map(
              mapObligation
            )
          );
        } catch (err) {
          console.error(
            "Financial obligations load error:",
            err
          );

          setError(
            err instanceof Error
              ? err.message
              : "We couldn't load financial obligations."
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [statusFilter]
    );

  useEffect(() => {
    loadObligations();
  }, [loadObligations]);

  /* ===================================================
     DERIVED DATA
  =================================================== */

  const filteredObligations =
    useMemo(() => {
      const query =
        searchTerm
          .trim()
          .toLowerCase();

      if (!query) {
        return obligations;
      }

      return obligations.filter(
        (obligation) =>
          [
            obligation.name,
            obligation.category,
            obligation.frequency,
            obligation.notes ?? "",
          ]
            .join(" ")
            .toLowerCase()
            .includes(query)
      );
    }, [
      obligations,
      searchTerm,
    ]);

  const totalOutstanding =
    useMemo(
      () =>
        obligations.reduce(
          (sum, obligation) =>
            sum +
            obligation.outstanding_balance,
          0
        ),
      [obligations]
    );

  const totalObligationValue =
    useMemo(
      () =>
        obligations.reduce(
          (sum, obligation) =>
            sum +
            obligation.amount,
          0
        ),
      [obligations]
    );

  const dueSoonCount =
    useMemo(() => {
      const todayKey =
        getTodayKey();

      const today =
        new Date(
          `${todayKey}T00:00:00+03:00`
        );

      const horizon =
        new Date(today);

      horizon.setDate(
        horizon.getDate() + 30
      );

      return obligations.filter(
        (obligation) => {
          if (
            !obligation.next_due_date
          ) {
            return false;
          }

          const dueDate =
            new Date(
              `${obligation.next_due_date}T00:00:00+03:00`
            );

          return (
            dueDate >= today &&
            dueDate <= horizon
          );
        }
      ).length;
    }, [obligations]);

  const categoryTotals =
    useMemo(() => {
      const map =
        new Map<
          string,
          number
        >();

      obligations.forEach(
        (obligation) => {
          map.set(
            obligation.category,
            (map.get(
              obligation.category
            ) ?? 0) +
              obligation.outstanding_balance
          );
        }
      );

      return Array.from(
        map.entries()
      )
        .map(
          ([
            category,
            amount,
          ]) => ({
            category,
            amount,
          })
        )
        .sort(
          (a, b) =>
            b.amount -
            a.amount
        );
    }, [obligations]);

  /* ===================================================
     FORM
  =================================================== */

  function openAddObligation() {
    setActionError("");
    setEditingObligation(null);
    setForm(emptyForm());
    setShowModal(true);
  }

  function openEditObligation(
    obligation: Obligation
  ) {
    setActionError("");

    setEditingObligation(
      obligation
    );

    setForm({
      name: obligation.name,
      category:
        obligation.category,
      amount: String(
        obligation.amount
      ),
      frequency:
        obligation.frequency,
      start_date:
        obligation.start_date ??
        "",
      end_date:
        obligation.end_date ??
        "",
      outstanding_balance:
        String(
          obligation.outstanding_balance
        ),
      next_due_date:
        obligation.next_due_date ??
        "",
      status:
        obligation.status,
      notes:
        obligation.notes ??
        "",
    });

    setShowModal(true);
  }

  function closeModal() {
    if (saving) {
      return;
    }

    setShowModal(false);
    setEditingObligation(
      null
    );
    setActionError("");
  }

  function updateForm(
    field: keyof ObligationForm,
    value: string
  ) {
    setForm(
      (current) => ({
        ...current,
        [field]: value,
      })
    );
  }

  /* ===================================================
     SAVE
  =================================================== */

  async function saveObligation() {
    try {
      setSaving(true);
      setActionError("");

      const amount =
        Number(form.amount);

      const outstanding =
        Number(
          form.outstanding_balance
        );

      /* VALIDATION */

      if (!form.name.trim()) {
        throw new Error(
          "Please enter the obligation name."
        );
      }

      if (
        !form.category.trim()
      ) {
        throw new Error(
          "Please select an obligation category."
        );
      }

      if (
        !Number.isFinite(
          amount
        ) ||
        amount < 0
      ) {
        throw new Error(
          "Please enter a valid obligation amount."
        );
      }

      if (
        !Number.isFinite(
          outstanding
        ) ||
        outstanding < 0
      ) {
        throw new Error(
          "Please enter a valid outstanding balance."
        );
      }

      if (
        form.start_date &&
        form.end_date &&
        form.end_date <
          form.start_date
      ) {
        throw new Error(
          "The end date cannot be before the start date."
        );
      }

      if (
        form.next_due_date &&
        form.end_date &&
        form.next_due_date >
          form.end_date
      ) {
        throw new Error(
          "The next due date cannot be after the end date."
        );
      }

      const now =
        new Date().toISOString();

      const payload = {
        name:
          form.name.trim(),

        category:
          form.category.trim(),

        amount,

        frequency:
          form.frequency,

        start_date:
          form.start_date ||
          null,

        end_date:
          form.end_date ||
          null,

        outstanding_balance:
          outstanding,

        next_due_date:
          form.next_due_date ||
          null,

        status:
          form.status,

        notes:
          form.notes.trim() ||
          null,

        updated_at:
          now,
      };

      /* =================================================
         EDIT EXISTING OBLIGATION
      ================================================= */

      if (editingObligation) {
        const {
          data,
          error:
            updateError,
        } = await supabase
          .from(
            "financial_obligations"
          )
          .update(payload)
          .eq(
            "id",
            editingObligation.id
          )
          .select("*");

        if (updateError) {
          throw updateError;
        }

        /*
         * If Supabase returns no updated row, the request
         * did not actually update a visible record.
         *
         * This prevents the UI from saying "saved" when
         * RLS or another database rule silently prevented
         * the update.
         */

        if (
          !data ||
          data.length === 0
        ) {
          throw new Error(
            "The obligation could not be updated. Please check the database permissions for financial_obligations."
          );
        }

        const updated =
          mapObligation(
            data[0]
          );

        setObligations(
          (current) =>
            current.map(
              (item) =>
                item.id ===
                updated.id
                  ? updated
                  : item
            )
        );
      }

      /* =================================================
         ADD NEW OBLIGATION
      ================================================= */

      else {
        const {
          data,
          error:
            insertError,
        } = await supabase
          .from(
            "financial_obligations"
          )
          .insert({
            ...payload,
            created_at: now,
          })
          .select("*");

        if (insertError) {
          throw insertError;
        }

        if (
          !data ||
          data.length === 0
        ) {
          throw new Error(
            "The obligation could not be created. Please check the database permissions for financial_obligations."
          );
        }

        const created =
          mapObligation(
            data[0]
          );

        setObligations(
          (current) => [
            created,
            ...current,
          ]
        );
      }

      /* =================================================
         CLOSE AFTER SUCCESS
      ================================================= */

      setShowModal(false);

      setEditingObligation(
        null
      );

      setForm(emptyForm());

      /*
       * Re-read from Supabase so the screen always reflects
       * the actual database state.
       */
      await loadObligations(true);
    } catch (err) {
      console.error(
        "Save obligation error:",
        err
      );

      setActionError(
        err instanceof Error
          ? err.message
          : "We couldn't save the financial obligation."
      );
    } finally {
      setSaving(false);
    }
  }

  /* ===================================================
     DELETE
  =================================================== */

  async function deleteObligation(
    obligation: Obligation
  ) {
    const confirmed =
      window.confirm(
        `Delete "${obligation.name}"? This removes the obligation from the financial obligations register.`
      );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(
        obligation.id
      );

      setActionError("");

      const {
        data,
        error:
          deleteError,
      } = await supabase
        .from(
          "financial_obligations"
        )
        .delete()
        .eq(
          "id",
          obligation.id
        )
        .select("id");

      if (deleteError) {
        throw deleteError;
      }

      if (
        !data ||
        data.length === 0
      ) {
        throw new Error(
          "The obligation could not be deleted. Please check the database permissions."
        );
      }

      setObligations(
        (current) =>
          current.filter(
            (item) =>
              item.id !==
              obligation.id
          )
      );

      await loadObligations(
        true
      );
    } catch (err) {
      console.error(
        "Delete obligation error:",
        err
      );

      setActionError(
        err instanceof Error
          ? err.message
          : "We couldn't delete the financial obligation."
      );
    } finally {
      setDeletingId(null);
    }
  }

  /* ===================================================
     RENDER
  =================================================== */

  return (
    <main className="st-page">
      {/* PAGE HEADER */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="m-0 text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--st-gray)]">
            Financial Management
          </p>

          <h1 className="mt-2 mb-0 text-[24px] font-bold tracking-[-0.03em] text-[var(--st-charcoal-dark)]">
            Financial Obligations
          </h1>

          <p className="mt-2 mb-0 max-w-[720px] text-[10px] leading-relaxed text-[var(--st-gray)]">
            Track recurring and one-time business
            commitments, outstanding balances and
            upcoming due dates.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* STATUS FILTER */}

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value
              )
            }
            className="h-10 rounded-xl border border-[var(--st-border)] bg-white px-3 text-[10px] font-semibold text-[var(--st-charcoal-dark)] outline-none focus:border-[var(--st-red)]"
          >
            <option value="all">
              All Statuses
            </option>

            {OBLIGATION_STATUSES.map(
              (item) => (
                <option
                  key={item.value}
                  value={item.value}
                >
                  {item.label}
                </option>
              )
            )}
          </select>

          {/* REFRESH */}

          <button
            type="button"
            onClick={() =>
              loadObligations(true)
            }
            disabled={refreshing}
            className="st-button st-button-secondary"
          >
            <RefreshCw
              size={14}
              className={
                refreshing
                  ? "animate-spin"
                  : ""
              }
            />

            Refresh
          </button>

          {/* ADD */}

          <button
            type="button"
            onClick={
              openAddObligation
            }
            className="st-button st-button-primary"
          >
            <Plus size={14} />
            Add Obligation
          </button>
        </div>
      </div>

      {/* LOAD ERROR */}

      {error && (
        <div className="mt-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[10px] text-red-700">
          <AlertTriangle
            size={15}
            className="mt-[1px] shrink-0"
          />

          <span>{error}</span>
        </div>
      )}

      {/* ACTION ERROR */}

      {actionError && (
        <div className="mt-5 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[10px] text-amber-800">
          <AlertTriangle
            size={15}
            className="mt-[1px] shrink-0"
          />

          <span>{actionError}</span>
        </div>
      )}

      {/* SUMMARY CARDS */}

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-[var(--st-border)] bg-white p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="m-0 text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--st-gray)]">
                Outstanding Balance
              </p>

              <p className="mt-3 mb-0 text-[24px] font-bold tracking-[-0.03em] text-[var(--st-charcoal-dark)]">
                {formatCurrency(
                  totalOutstanding
                )}
              </p>

              <p className="mt-2 mb-0 text-[9px] text-[var(--st-gray)]">
                Across displayed obligations
              </p>
            </div>

            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--st-bg-soft)] text-[var(--st-red)]">
              <WalletCards size={16} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--st-border)] bg-white p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="m-0 text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--st-gray)]">
                Total Obligation Value
              </p>

              <p className="mt-3 mb-0 text-[24px] font-bold tracking-[-0.03em] text-[var(--st-charcoal-dark)]">
                {formatCurrency(
                  totalObligationValue
                )}
              </p>

              <p className="mt-2 mb-0 text-[9px] text-[var(--st-gray)]">
                Current register
              </p>
            </div>

            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--st-bg-soft)] text-[var(--st-red)]">
              <WalletCards size={16} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--st-border)] bg-white p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="m-0 text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--st-gray)]">
                Due Within 30 Days
              </p>

              <p className="mt-3 mb-0 text-[24px] font-bold tracking-[-0.03em] text-[var(--st-charcoal-dark)]">
                {dueSoonCount}
              </p>

              <p className="mt-2 mb-0 text-[9px] text-[var(--st-gray)]">
                Based on next due date
              </p>
            </div>

            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--st-bg-soft)] text-[var(--st-red)]">
              <CalendarDays size={16} />
            </div>
          </div>
        </div>
      </section>

      {/* MAIN CONTENT */}

      <section className="mt-6 grid gap-5 lg:grid-cols-[0.75fr_1.25fr]">
        {/* CATEGORY BREAKDOWN */}

        <div className="rounded-2xl border border-[var(--st-border)] bg-white p-5">
          <h2 className="st-section-title">
            Outstanding by Category
          </h2>

          <p className="mt-1 mb-0 text-[10px] text-[var(--st-gray)]">
            Current register
          </p>

          <div className="mt-5 space-y-4">
            {categoryTotals.length ===
            0 ? (
              <div className="rounded-xl border border-dashed border-[var(--st-border)] bg-[var(--st-bg-soft)] px-4 py-8 text-center">
                <p className="m-0 text-[10px] text-[var(--st-gray)]">
                  No obligations found.
                </p>
              </div>
            ) : (
              categoryTotals.map(
                (item) => {
                  const percentage =
                    totalOutstanding >
                    0
                      ? (item.amount /
                          totalOutstanding) *
                        100
                      : 0;

                  return (
                    <div
                      key={
                        item.category
                      }
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[10px] font-semibold text-[var(--st-charcoal-dark)]">
                          {
                            item.category
                          }
                        </span>

                        <span className="text-[10px] font-bold text-[var(--st-charcoal-dark)]">
                          {formatCurrency(
                            item.amount
                          )}
                        </span>
                      </div>

                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--st-bg-soft)]">
                        <div
                          className="h-full rounded-full bg-[var(--st-red)]"
                          style={{
                            width: `${Math.min(
                              percentage,
                              100
                            )}%`,
                          }}
                        />
                      </div>

                      <p className="mt-1 mb-0 text-[8px] text-[var(--st-gray)]">
                        {percentage.toFixed(
                          1
                        )}
                        % of outstanding balance
                      </p>
                    </div>
                  );
                }
              )
            )}
          </div>
        </div>

        {/* REGISTER */}

        <div className="rounded-2xl border border-[var(--st-border)] bg-white p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="st-section-title">
                Obligation Register
              </h2>

              <p className="mt-1 mb-0 text-[10px] text-[var(--st-gray)]">
                Financial commitments
              </p>
            </div>

            <input
              type="search"
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(
                  event.target.value
                )
              }
              placeholder="Search obligations..."
              className="h-9 w-full rounded-xl border border-[var(--st-border)] px-3 text-[10px] outline-none focus:border-[var(--st-red)] sm:w-[220px]"
            />
          </div>

          <div className="mt-5 overflow-x-auto">
            {loading ? (
              <div className="flex min-h-[250px] items-center justify-center">
                <div className="flex items-center gap-2 text-[10px] text-[var(--st-gray)]">
                  <Loader2
                    size={16}
                    className="animate-spin"
                  />

                  Loading obligations...
                </div>
              </div>
            ) : filteredObligations.length ===
              0 ? (
              <div className="rounded-xl border border-dashed border-[var(--st-border)] bg-[var(--st-bg-soft)] px-4 py-10 text-center">
                <p className="m-0 text-[10px] text-[var(--st-gray)]">
                  {searchTerm
                    ? "No obligations match your search."
                    : "No financial obligations found."}
                </p>
              </div>
            ) : (
              <table className="w-full min-w-[980px] border-collapse">
                <thead>
                  <tr className="border-b border-[var(--st-border)] text-left">
                    <th className="px-3 py-3 text-[8px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                      Obligation
                    </th>

                    <th className="px-3 py-3 text-[8px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                      Category
                    </th>

                    <th className="px-3 py-3 text-[8px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                      Frequency
                    </th>

                    <th className="px-3 py-3 text-right text-[8px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                      Amount
                    </th>

                    <th className="px-3 py-3 text-right text-[8px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                      Outstanding
                    </th>

                    <th className="px-3 py-3 text-[8px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                      Next Due
                    </th>

                    <th className="px-3 py-3 text-[8px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                      Status
                    </th>

                    <th className="px-3 py-3 text-right text-[8px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredObligations.map(
                    (obligation) => (
                      <tr
                        key={
                          obligation.id
                        }
                        className="border-b border-[var(--st-border)] last:border-b-0"
                      >
                        <td className="px-3 py-4">
                          <p className="m-0 text-[10px] font-semibold text-[var(--st-charcoal-dark)]">
                            {
                              obligation.name
                            }
                          </p>

                          {obligation.notes && (
                            <p className="mt-1 mb-0 max-w-[210px] truncate text-[8px] text-[var(--st-gray)]">
                              {
                                obligation.notes
                              }
                            </p>
                          )}
                        </td>

                        <td className="px-3 py-4">
                          <span className="rounded-full bg-[var(--st-bg-soft)] px-2 py-1 text-[8px] font-semibold text-[var(--st-charcoal-dark)]">
                            {
                              obligation.category
                            }
                          </span>
                        </td>

                        <td className="px-3 py-4 text-[9px] text-[var(--st-gray)]">
                          {frequencyLabel(
                            obligation.frequency
                          )}
                        </td>

                        <td className="px-3 py-4 text-right text-[10px] font-semibold text-[var(--st-charcoal-dark)]">
                          {formatCurrency(
                            obligation.amount
                          )}
                        </td>

                        <td className="px-3 py-4 text-right text-[10px] font-bold text-[var(--st-charcoal-dark)]">
                          {formatCurrency(
                            obligation.outstanding_balance
                          )}
                        </td>

                        <td className="px-3 py-4 text-[9px] text-[var(--st-gray)]">
                          {formatDate(
                            obligation.next_due_date
                          )}
                        </td>

                        <td className="px-3 py-4">
                          <span
                            className={
                              obligation.status ===
                              "active"
                                ? "rounded-full bg-emerald-50 px-2 py-1 text-[8px] font-semibold text-emerald-700"
                                : obligation.status ===
                                  "completed"
                                ? "rounded-full bg-blue-50 px-2 py-1 text-[8px] font-semibold text-blue-700"
                                : obligation.status ===
                                  "cancelled"
                                ? "rounded-full bg-red-50 px-2 py-1 text-[8px] font-semibold text-red-700"
                                : "rounded-full bg-amber-50 px-2 py-1 text-[8px] font-semibold text-amber-700"
                            }
                          >
                            {statusLabel(
                              obligation.status
                            )}
                          </span>
                        </td>

                        <td className="px-3 py-4">
                          <div className="flex items-center justify-end gap-1">
                            {/* EDIT */}

                            <button
                              type="button"
                              onClick={() =>
                                openEditObligation(
                                  obligation
                                )
                              }
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--st-gray)] hover:bg-[var(--st-bg-soft)] hover:text-[var(--st-charcoal-dark)]"
                              aria-label="Edit financial obligation"
                            >
                              <Edit3
                                size={13}
                              />
                            </button>

                            {/* DELETE */}

                            <button
                              type="button"
                              onClick={() =>
                                deleteObligation(
                                  obligation
                                )
                              }
                              disabled={
                                deletingId ===
                                obligation.id
                              }
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-red-500 hover:bg-red-50 disabled:opacity-50"
                              aria-label="Delete financial obligation"
                            >
                              {deletingId ===
                              obligation.id ? (
                                <Loader2
                                  size={13}
                                  className="animate-spin"
                                />
                              ) : (
                                <Trash2
                                  size={13}
                                />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </section>

      {/* MODAL */}

      <ObligationModal
        open={showModal}
        editing={
          editingObligation
        }
        form={form}
        saving={saving}
        error={actionError}
        onChange={updateForm}
        onClose={closeModal}
        onSave={
          saveObligation
        }
      />
    </main>
  );
}