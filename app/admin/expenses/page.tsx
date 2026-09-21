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
  CircleDollarSign,
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

type PaymentMethod =
  | "mpesa"
  | "cash"
  | "bank"
  | "card"
  | "other";

type Expense = {
  id: string;
  expense_date: string;
  category: string;
  description: string;
  amount: number;
  payment_method: PaymentMethod;
  reference: string | null;
  vendor: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type ExpenseForm = {
  expense_date: string;
  category: string;
  description: string;
  amount: string;
  payment_method: PaymentMethod;
  reference: string;
  vendor: string;
  notes: string;
};

/* =====================================================
   CONSTANTS
===================================================== */

const NAIROBI_TIME_ZONE = "Africa/Nairobi";

const EXPENSE_CATEGORIES = [
  "Advertising & Marketing",
  "Rent",
  "Salaries & Wages",
  "Utilities",
  "Transport",
  "Equipment",
  "Repairs & Maintenance",
  "Software & Subscriptions",
  "Office Supplies",
  "Bank & Payment Charges",
  "Professional Services",
  "Training",
  "Other",
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

function getMonthStart(value = getTodayKey()) {
  return `${value.slice(0, 7)}-01`;
}

function getNextMonthStart(monthStart: string) {
  const date = new Date(`${monthStart}T00:00:00+03:00`);

  date.setMonth(date.getMonth() + 1);

  const year = date.getFullYear();

  const month = String(date.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}-01`;
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

function formatDate(value: string) {
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

function formatMonth(monthStart: string) {
  const date = new Date(
    `${monthStart}T00:00:00+03:00`
  );

  if (Number.isNaN(date.getTime())) {
    return monthStart;
  }

  return new Intl.DateTimeFormat("en-KE", {
    timeZone: NAIROBI_TIME_ZONE,
    month: "long",
    year: "numeric",
  }).format(date);
}

function emptyForm(): ExpenseForm {
  return {
    expense_date: getTodayKey(),
    category: EXPENSE_CATEGORIES[0],
    description: "",
    amount: "",
    payment_method: "mpesa",
    reference: "",
    vendor: "",
    notes: "",
  };
}

function normalizeExpense(row: any): Expense {
  return {
    id: row.id,
    expense_date: row.expense_date,
    category: row.category ?? "",
    description: row.description ?? "",
    amount: Number(row.amount ?? 0),
    payment_method:
      (row.payment_method as PaymentMethod) ?? "other",
    reference: row.reference ?? null,
    vendor: row.vendor ?? null,
    notes: row.notes ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/* =====================================================
   FORM MODAL
===================================================== */

function ExpenseModal({
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
  editing: Expense | null;
  form: ExpenseForm;
  saving: boolean;
  error: string;
  onChange: (
    field: keyof ExpenseForm,
    value: string
  ) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/40 px-4 py-6">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-[var(--st-border)] bg-white shadow-2xl">

        <div className="flex items-center justify-between border-b border-[var(--st-border)] px-5 py-4">
          <div>
            <p className="m-0 text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--st-gray)]">
              Financial Management
            </p>

            <h2 className="mt-1 mb-0 text-[18px] font-bold tracking-[-0.02em] text-[var(--st-charcoal-dark)]">
              {editing ? "Edit Expense" : "Add Expense"}
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

            {/* DATE */}
            <label>
              <span className="block text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                Expense Date
              </span>

              <input
                type="date"
                value={form.expense_date}
                onChange={(event) =>
                  onChange(
                    "expense_date",
                    event.target.value
                  )
                }
                className="mt-2 h-10 w-full rounded-xl border border-[var(--st-border)] px-3 text-[11px] outline-none focus:border-[var(--st-red)]"
              />
            </label>

            {/* CATEGORY */}
            <label>
              <span className="block text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                Category
              </span>

              <input
                type="text"
                list="expense-category-options"
                value={form.category}
                onChange={(event) =>
                  onChange(
                    "category",
                    event.target.value
                  )
                }
                placeholder="Enter or select category"
                className="mt-2 h-10 w-full rounded-xl border border-[var(--st-border)] bg-white px-3 text-[11px] outline-none focus:border-[var(--st-red)]"
              />

              <datalist id="expense-category-options">
                {EXPENSE_CATEGORIES.map(
                  (category) => (
                    <option
                      key={category}
                      value={category}
                    />
                  )
                )}
              </datalist>
            </label>

            {/* DESCRIPTION */}
            <label className="md:col-span-2">
              <span className="block text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                Description
              </span>

              <input
                type="text"
                value={form.description}
                onChange={(event) =>
                  onChange(
                    "description",
                    event.target.value
                  )
                }
                placeholder="What was the expense for?"
                className="mt-2 h-10 w-full rounded-xl border border-[var(--st-border)] px-3 text-[11px] outline-none focus:border-[var(--st-red)]"
              />
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

            {/* PAYMENT METHOD */}
            <label>
              <span className="block text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                Payment Method
              </span>

              <select
                value={form.payment_method}
                onChange={(event) =>
                  onChange(
                    "payment_method",
                    event.target.value
                  )
                }
                className="mt-2 h-10 w-full rounded-xl border border-[var(--st-border)] bg-white px-3 text-[11px] outline-none focus:border-[var(--st-red)]"
              >
                <option value="mpesa">
                  M-Pesa
                </option>

                <option value="cash">
                  Cash
                </option>

                <option value="bank">
                  Bank
                </option>

                <option value="card">
                  Card
                </option>

                <option value="other">
                  Other
                </option>
              </select>
            </label>

            {/* REFERENCE */}
            <label>
              <span className="block text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                Reference
              </span>

              <input
                type="text"
                value={form.reference}
                onChange={(event) =>
                  onChange(
                    "reference",
                    event.target.value
                  )
                }
                placeholder="Receipt / transaction reference"
                className="mt-2 h-10 w-full rounded-xl border border-[var(--st-border)] px-3 text-[11px] outline-none focus:border-[var(--st-red)]"
              />
            </label>

            {/* VENDOR */}
            <label>
              <span className="block text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                Vendor / Payee
              </span>

              <input
                type="text"
                value={form.vendor}
                onChange={(event) =>
                  onChange(
                    "vendor",
                    event.target.value
                  )
                }
                placeholder="Who was paid?"
                className="mt-2 h-10 w-full rounded-xl border border-[var(--st-border)] px-3 text-[11px] outline-none focus:border-[var(--st-red)]"
              />
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
              : "Add Expense"}
          </button>

        </div>
      </div>
    </div>
  );
}

/* =====================================================
   PAGE
===================================================== */

export default function ExpensesPage() {
  const [expenses, setExpenses] =
    useState<Expense[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [actionError, setActionError] =
    useState("");

  const [monthStart, setMonthStart] =
    useState(() => getMonthStart());

  const [showModal, setShowModal] =
    useState(false);

  const [editingExpense, setEditingExpense] =
    useState<Expense | null>(null);

  const [form, setForm] =
    useState<ExpenseForm>(
      () => emptyForm()
    );

  const [saving, setSaving] =
    useState(false);

  const [deletingId, setDeletingId] =
    useState<string | null>(null);

  const [searchTerm, setSearchTerm] =
    useState("");

  /* ===================================================
     LOAD ALL EXPENSES
  =================================================== */

  const loadExpenses = useCallback(
    async (silent = false) => {
      try {
        if (silent) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");
        setActionError("");

        /*
         * IMPORTANT:
         *
         * Do NOT filter expenses by month in Supabase.
         *
         * The financial dashboard and Expenses page both
         * depend on the same live expense records.
         *
         * We load the records first and filter the selected
         * month in the frontend.
         *
         * This prevents the Expenses page from getting out
         * of sync with the financial dashboard.
         */

        const {
          data,
          error: queryError,
        } = await supabase
          .from("expenses")
          .select("*")
          .order("expense_date", {
            ascending: false,
          })
          .order("created_at", {
            ascending: false,
          });

        if (queryError) {
          throw queryError;
        }

        setExpenses(
          (data ?? []).map(
            normalizeExpense
          )
        );
      } catch (err) {
        console.error(
          "Expenses load error:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "We couldn't load expenses."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  /* ===================================================
     SELECTED MONTH EXPENSES
  =================================================== */

  const nextMonthStart = useMemo(
    () => getNextMonthStart(monthStart),
    [monthStart]
  );

  const monthExpenses = useMemo(
    () => {
      return expenses.filter(
        (expense) => {
          const date =
            expense.expense_date;

          return (
            date >= monthStart &&
            date < nextMonthStart
          );
        }
      );
    },
    [
      expenses,
      monthStart,
      nextMonthStart,
    ]
  );

  /* ===================================================
     SEARCH
  =================================================== */

  const filteredExpenses =
    useMemo(() => {
      const query =
        searchTerm
          .trim()
          .toLowerCase();

      if (!query) {
        return monthExpenses;
      }

      return monthExpenses.filter(
        (expense) =>
          [
            expense.category,
            expense.description,
            expense.vendor ?? "",
            expense.reference ?? "",
            expense.notes ?? "",
            expense.payment_method,
          ]
            .join(" ")
            .toLowerCase()
            .includes(query)
      );
    }, [
      monthExpenses,
      searchTerm,
    ]);

  /* ===================================================
     TOTAL
  =================================================== */

  const totalSpent =
    useMemo(
      () =>
        monthExpenses.reduce(
          (sum, expense) =>
            sum + expense.amount,
          0
        ),
      [monthExpenses]
    );

  /* ===================================================
     CATEGORY BREAKDOWN
  =================================================== */

  const categoryTotals =
    useMemo(() => {
      const map =
        new Map<string, number>();

      monthExpenses.forEach(
        (expense) => {
          map.set(
            expense.category,
            (map.get(
              expense.category
            ) ?? 0) +
              expense.amount
          );
        }
      );

      return Array.from(
        map.entries()
      )
        .map(
          ([category, amount]) => ({
            category,
            amount,
            percentage:
              totalSpent > 0
                ? (amount /
                    totalSpent) *
                  100
                : 0,
          })
        )
        .sort(
          (a, b) =>
            b.amount -
            a.amount
        );
    }, [
      monthExpenses,
      totalSpent,
    ]);

  /* ===================================================
     ADD
  =================================================== */

  function openAddExpense() {
    setActionError("");
    setEditingExpense(null);
    setForm(emptyForm());
    setShowModal(true);
  }

  /* ===================================================
     EDIT
  =================================================== */

  function openEditExpense(
    expense: Expense
  ) {
    setActionError("");
    setEditingExpense(expense);

    setForm({
      expense_date:
        expense.expense_date,

      category:
        expense.category,

      description:
        expense.description,

      amount:
        String(expense.amount),

      payment_method:
        expense.payment_method,

      reference:
        expense.reference ?? "",

      vendor:
        expense.vendor ?? "",

      notes:
        expense.notes ?? "",
    });

    setShowModal(true);
  }

  /* ===================================================
     CLOSE MODAL
  =================================================== */

  function closeModal() {
    if (saving) {
      return;
    }

    setShowModal(false);
    setEditingExpense(null);
    setActionError("");
  }

  /* ===================================================
     UPDATE FORM
  =================================================== */

  function updateForm(
    field: keyof ExpenseForm,
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

  async function saveExpense() {
    try {
      setSaving(true);
      setActionError("");

      const amount =
        Number(form.amount);

      if (!form.expense_date) {
        throw new Error(
          "Please select the expense date."
        );
      }

      if (!form.category.trim()) {
        throw new Error(
          "Please enter an expense category."
        );
      }

      if (!form.description.trim()) {
        throw new Error(
          "Please enter an expense description."
        );
      }

      if (
        !Number.isFinite(amount) ||
        amount <= 0
      ) {
        throw new Error(
          "Please enter a valid expense amount."
        );
      }

      const payload = {
        expense_date:
          form.expense_date,

        category:
          form.category.trim(),

        description:
          form.description.trim(),

        amount,

        payment_method:
          form.payment_method,

        reference:
          form.reference.trim() ||
          null,

        vendor:
          form.vendor.trim() ||
          null,

        notes:
          form.notes.trim() ||
          null,

        updated_at:
          new Date().toISOString(),
      };

      /* ===============================================
         UPDATE EXISTING EXPENSE
      =============================================== */

      if (editingExpense) {
        const {
          error: updateError,
        } = await supabase
          .from("expenses")
          .update(payload)
          .eq(
            "id",
            editingExpense.id
          );

        if (updateError) {
          throw updateError;
        }
      }

      /* ===============================================
         CREATE NEW EXPENSE
      =============================================== */

      else {
        const {
          error: insertError,
        } = await supabase
          .from("expenses")
          .insert({
            ...payload,
            created_at:
              new Date().toISOString(),
          });

        if (insertError) {
          throw insertError;
        }
      }

      setShowModal(false);
      setEditingExpense(null);
      setForm(emptyForm());

      /*
       * Reload the same live Supabase source.
       *
       * Since all records are loaded and month filtering
       * happens locally, a newly-created expense will now
       * immediately appear if its date belongs to the
       * selected month.
       */
      await loadExpenses(true);
    } catch (err) {
      console.error(
        "Save expense error:",
        err
      );

      setActionError(
        err instanceof Error
          ? err.message
          : "We couldn't save the expense."
      );
    } finally {
      setSaving(false);
    }
  }

  /* ===================================================
     DELETE
  =================================================== */

  async function deleteExpense(
    expense: Expense
  ) {
    const confirmed =
      window.confirm(
        `Delete this expense of ${formatCurrency(
          expense.amount
        )}? This will reduce recorded business expenses.`
      );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(
        expense.id
      );

      setActionError("");

      const {
        error: deleteError,
      } = await supabase
        .from("expenses")
        .delete()
        .eq(
          "id",
          expense.id
        );

      if (deleteError) {
        throw deleteError;
      }

      await loadExpenses(true);
    } catch (err) {
      console.error(
        "Delete expense error:",
        err
      );

      setActionError(
        err instanceof Error
          ? err.message
          : "We couldn't delete the expense."
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

      {/* ===============================================
          HEADER
      =============================================== */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">

        <div>
          <p className="m-0 text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--st-gray)]">
            Financial Management
          </p>

          <h1 className="mt-2 mb-0 text-[24px] font-bold tracking-[-0.03em] text-[var(--st-charcoal-dark)]">
            Expenses
          </h1>

          <p className="mt-2 mb-0 max-w-[720px] text-[10px] leading-relaxed text-[var(--st-gray)]">
            Record and manage business expenses.
            These transactions feed the financial
            dashboard and expense reporting.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">

          <label className="flex items-center gap-2 rounded-xl border border-[var(--st-border)] bg-white px-3 py-2">

            <CalendarDays
              size={14}
              className="text-[var(--st-gray)]"
            />

            <input
              type="month"
              value={monthStart.slice(0, 7)}
              onChange={(event) =>
                setMonthStart(
                  `${event.target.value}-01`
                )
              }
              className="border-0 bg-transparent text-[10px] font-semibold text-[var(--st-charcoal-dark)] outline-none"
            />

          </label>

          <button
            type="button"
            onClick={() =>
              loadExpenses(true)
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

          <button
            type="button"
            onClick={openAddExpense}
            className="st-button st-button-primary"
          >
            <Plus size={14} />
            Add Expense
          </button>

        </div>
      </div>

      {/* ===============================================
          ERRORS
      =============================================== */}

      {error && (
        <div className="mt-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[10px] text-red-700">

          <AlertTriangle
            size={15}
            className="mt-[1px] shrink-0"
          />

          <span>{error}</span>

        </div>
      )}

      {actionError && (
        <div className="mt-5 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[10px] text-amber-800">

          <AlertTriangle
            size={15}
            className="mt-[1px] shrink-0"
          />

          <span>{actionError}</span>

        </div>
      )}

      {/* ===============================================
          SUMMARY CARDS
      =============================================== */}

      <section className="mt-6 grid gap-4 md:grid-cols-3">

        {/* TOTAL SPENT */}

        <div className="rounded-2xl border border-[var(--st-border)] bg-white p-5">

          <div className="flex items-start justify-between gap-3">

            <div>

              <p className="m-0 text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--st-gray)]">
                Total Spent
              </p>

              <p className="mt-3 mb-0 text-[24px] font-bold tracking-[-0.03em] text-[var(--st-charcoal-dark)]">
                {formatCurrency(
                  totalSpent
                )}
              </p>

              <p className="mt-2 mb-0 text-[9px] text-[var(--st-gray)]">
                {formatMonth(
                  monthStart
                )}
              </p>

            </div>

            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--st-bg-soft)] text-[var(--st-red)]">
              <CircleDollarSign size={16} />
            </div>

          </div>

        </div>

        {/* TRANSACTIONS */}

        <div className="rounded-2xl border border-[var(--st-border)] bg-white p-5">

          <div className="flex items-start justify-between gap-3">

            <div>

              <p className="m-0 text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--st-gray)]">
                Expense Transactions
              </p>

              <p className="mt-3 mb-0 text-[24px] font-bold tracking-[-0.03em] text-[var(--st-charcoal-dark)]">
                {monthExpenses.length}
              </p>

              <p className="mt-2 mb-0 text-[9px] text-[var(--st-gray)]">
                Recorded this month
              </p>

            </div>

            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--st-bg-soft)] text-[var(--st-red)]">
              <WalletCards size={16} />
            </div>

          </div>

        </div>

        {/* CATEGORIES */}

        <div className="rounded-2xl border border-[var(--st-border)] bg-white p-5">

          <div className="flex items-start justify-between gap-3">

            <div>

              <p className="m-0 text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--st-gray)]">
                Categories Used
              </p>

              <p className="mt-3 mb-0 text-[24px] font-bold tracking-[-0.03em] text-[var(--st-charcoal-dark)]">
                {categoryTotals.length}
              </p>

              <p className="mt-2 mb-0 text-[9px] text-[var(--st-gray)]">
                Expense categories this month
              </p>

            </div>

            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--st-bg-soft)] text-[var(--st-red)]">
              <WalletCards size={16} />
            </div>

          </div>

        </div>

      </section>

      {/* ===============================================
          EXPENSE BREAKDOWN
      =============================================== */}

      <section className="mt-6 grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">

        <div className="rounded-2xl border border-[var(--st-border)] bg-white p-5">

          <div>

            <h2 className="st-section-title">
              Expense Breakdown
            </h2>

            <p className="mt-1 mb-0 text-[10px] text-[var(--st-gray)]">
              {formatMonth(monthStart)}
            </p>

          </div>

          <div className="mt-5 space-y-4">

            {categoryTotals.length === 0 ? (

              <div className="rounded-xl border border-dashed border-[var(--st-border)] bg-[var(--st-bg-soft)] px-4 py-8 text-center">

                <p className="m-0 text-[10px] text-[var(--st-gray)]">
                  No expenses recorded for this month.
                </p>

              </div>

            ) : (

              categoryTotals.map(
                (item) => (
                  <div
                    key={item.category}
                  >

                    <div className="flex items-center justify-between gap-3">

                      <span className="text-[10px] font-semibold text-[var(--st-charcoal-dark)]">
                        {item.category}
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
                            item.percentage,
                            100
                          )}%`,
                        }}
                      />

                    </div>

                    <p className="mt-1 mb-0 text-[8px] text-[var(--st-gray)]">
                      {item.percentage.toFixed(1)}
                      % of monthly expenses
                    </p>

                  </div>
                )
              )

            )}

          </div>

        </div>

        {/* =============================================
            TRANSACTIONS
        ============================================= */}

        <div className="rounded-2xl border border-[var(--st-border)] bg-white p-5">

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">

            <div>

              <h2 className="st-section-title">
                Expense Transactions
              </h2>

              <p className="mt-1 mb-0 text-[10px] text-[var(--st-gray)]">
                All recorded expenses for the selected month
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
              placeholder="Search expenses..."
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

                  Loading expenses...

                </div>

              </div>

            ) : filteredExpenses.length === 0 ? (

              <div className="rounded-xl border border-dashed border-[var(--st-border)] bg-[var(--st-bg-soft)] px-4 py-10 text-center">

                <p className="m-0 text-[10px] text-[var(--st-gray)]">

                  {searchTerm
                    ? "No expenses match your search."
                    : "No expenses recorded for this month."}

                </p>

              </div>

            ) : (

              <table className="w-full min-w-[820px] border-collapse">

                <thead>

                  <tr className="border-b border-[var(--st-border)] text-left">

                    <th className="px-3 py-3 text-[8px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                      Date
                    </th>

                    <th className="px-3 py-3 text-[8px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                      Category
                    </th>

                    <th className="px-3 py-3 text-[8px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                      Description
                    </th>

                    <th className="px-3 py-3 text-[8px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                      Vendor
                    </th>

                    <th className="px-3 py-3 text-[8px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                      Method
                    </th>

                    <th className="px-3 py-3 text-right text-[8px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                      Amount
                    </th>

                    <th className="px-3 py-3 text-right text-[8px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                      Actions
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {filteredExpenses.map(
                    (expense) => (

                      <tr
                        key={expense.id}
                        className="border-b border-[var(--st-border)] last:border-b-0"
                      >

                        <td className="px-3 py-4 text-[9px] text-[var(--st-gray)]">
                          {formatDate(
                            expense.expense_date
                          )}
                        </td>

                        <td className="px-3 py-4">

                          <span className="rounded-full bg-[var(--st-bg-soft)] px-2 py-1 text-[8px] font-semibold text-[var(--st-charcoal-dark)]">
                            {expense.category}
                          </span>

                        </td>

                        <td className="px-3 py-4">

                          <p className="m-0 text-[10px] font-semibold text-[var(--st-charcoal-dark)]">
                            {expense.description}
                          </p>

                          {(expense.reference ||
                            expense.notes) && (

                            <p className="mt-1 mb-0 max-w-[280px] truncate text-[8px] text-[var(--st-gray)]">
                              {expense.reference ||
                                expense.notes}
                            </p>

                          )}

                        </td>

                        <td className="px-3 py-4 text-[9px] text-[var(--st-gray)]">
                          {expense.vendor || "—"}
                        </td>

                        <td className="px-3 py-4 text-[9px] font-semibold capitalize text-[var(--st-charcoal-dark)]">

                          {expense.payment_method ===
                          "mpesa"
                            ? "M-Pesa"
                            : expense.payment_method}

                        </td>

                        <td className="px-3 py-4 text-right text-[10px] font-bold text-[var(--st-charcoal-dark)]">

                          {formatCurrency(
                            expense.amount
                          )}

                        </td>

                        <td className="px-3 py-4">

                          <div className="flex items-center justify-end gap-1">

                            <button
                              type="button"
                              onClick={() =>
                                openEditExpense(
                                  expense
                                )
                              }
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--st-gray)] hover:bg-[var(--st-bg-soft)] hover:text-[var(--st-charcoal-dark)]"
                              aria-label="Edit expense"
                            >
                              <Edit3 size={13} />
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                deleteExpense(
                                  expense
                                )
                              }
                              disabled={
                                deletingId ===
                                expense.id
                              }
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-red-500 hover:bg-red-50 disabled:opacity-50"
                              aria-label="Delete expense"
                            >

                              {deletingId ===
                              expense.id ? (
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

      {/* ===============================================
          MODAL
      =============================================== */}

      <ExpenseModal
        open={showModal}
        editing={editingExpense}
        form={form}
        saving={saving}
        error={actionError}
        onChange={updateForm}
        onClose={closeModal}
        onSave={saveExpense}
      />

    </main>
  );
}