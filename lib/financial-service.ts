import { supabase } from "@/lib/supabase";

/* =====================================================
   TYPES
===================================================== */

export type FinancialSettings = {
  id: boolean;

  booking_value: number;

  monthly_booking_target: number;

  lifetime_booking_target:
    | number
    | null;

  cac_status: string;

  cpl_status: string;

  conversion_rate_status: string;

  roi_status: string;
};

export type FinancialMonthlySummary = {
  month_start: string;

  bookings_count: number;

  booked_value: number;

  booking_value: number;

  monthly_booking_target: number;

  monthly_revenue_target: number;

  money_received: number;

  money_spent: number;

  money_pending: number;

  net_cash_flow: number;

  lifetime_booking_target:
    | number
    | null;
};

export type FinancialExpenseBreakdown = {
  month_start: string;

  category: string;

  amount: number;

  percentage: number;
};

export type FinancialStudentActivity = {
  month_start: string;

  attended: number;

  booked: number;

  registered: number;

  cancelled: number;

  missed: number;
};

export type FinancialPerformanceSummary = {
  month_start: string;

  leads: number;

  registered_students: number;

  booked_value: number;

  cac: number | null;

  cpl: number | null;

  conversion_rate: number | null;

  roi: number | null;

  revenue_per_student:
    | number
    | null;
};

export type FinancialObligation = {
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

export type FinancialDashboardData = {
  settings: FinancialSettings;

  summary:
    | FinancialMonthlySummary
    | null;

  expenses: FinancialExpenseBreakdown[];

  activity:
    | FinancialStudentActivity
    | null;

  performance:
    | FinancialPerformanceSummary
    | null;

  obligations: FinancialObligation[];
};

/* =====================================================
   HELPERS
===================================================== */

function throwIfError(
  error: {
    message?: string;
  } | null
): void {
  if (error) {
    throw new Error(
      error.message ||
        "Unable to load financial data."
    );
  }
}

function toNumber(
  value: unknown
): number {
  return Number(
    value ?? 0
  );
}

function toNullableNumber(
  value: unknown
): number | null {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  return Number(value);
}

/* =====================================================
   FINANCIAL SETTINGS
===================================================== */

export async function loadFinancialSettings(): Promise<FinancialSettings> {
  const {
    data,
    error,
  } = await supabase
    .from(
      "financial_settings"
    )
    .select("*")
    .eq("id", true)
    .single();

  throwIfError(error);

  return {
    id: data.id,

    booking_value:
      toNumber(
        data.booking_value
      ),

    monthly_booking_target:
      toNumber(
        data.monthly_booking_target
      ),

    lifetime_booking_target:
      toNullableNumber(
        data.lifetime_booking_target
      ),

    cac_status:
      data.cac_status,

    cpl_status:
      data.cpl_status,

    conversion_rate_status:
      data.conversion_rate_status,

    roi_status:
      data.roi_status,
  };
}

/* =====================================================
   MONTHLY FINANCIAL SUMMARY
===================================================== */

export async function loadFinancialMonthlySummary(
  monthStart: string
): Promise<FinancialMonthlySummary | null> {
  const {
    data,
    error,
  } = await supabase
    .from(
      "financial_monthly_summary"
    )
    .select("*")
    .eq(
      "month_start",
      monthStart
    )
    .maybeSingle();

  throwIfError(error);

  if (!data) {
    return null;
  }

  return {
    month_start:
      data.month_start,

    bookings_count:
      toNumber(
        data.bookings_count
      ),

    booked_value:
      toNumber(
        data.booked_value
      ),

    booking_value:
      toNumber(
        data.booking_value
      ),

    monthly_booking_target:
      toNumber(
        data.monthly_booking_target
      ),

    monthly_revenue_target:
      toNumber(
        data.monthly_revenue_target
      ),

    money_received:
      toNumber(
        data.money_received
      ),

    money_spent:
      toNumber(
        data.money_spent
      ),

    money_pending:
      toNumber(
        data.money_pending
      ),

    net_cash_flow:
      toNumber(
        data.net_cash_flow
      ),

    lifetime_booking_target:
      toNullableNumber(
        data.lifetime_booking_target
      ),
  };
}

/* =====================================================
   EXPENSE BREAKDOWN
===================================================== */

export async function loadFinancialExpenseBreakdown(
  monthStart: string
): Promise<FinancialExpenseBreakdown[]> {
  const {
    data,
    error,
  } = await supabase
    .from(
      "financial_expense_breakdown"
    )
    .select("*")
    .eq(
      "month_start",
      monthStart
    )
    .order(
      "amount",
      {
        ascending: false,
      }
    );

  throwIfError(error);

  return (
    data ?? []
  ).map(
    (row) => ({
      month_start:
        row.month_start,

      category:
        row.category,

      amount:
        toNumber(
          row.amount
        ),

      percentage:
        toNumber(
          row.percentage
        ),
    })
  );
}

/* =====================================================
   STUDENT ACTIVITY
===================================================== */

export async function loadFinancialStudentActivity(
  monthStart: string
): Promise<FinancialStudentActivity | null> {
  const {
    data,
    error,
  } = await supabase
    .from(
      "financial_student_activity"
    )
    .select("*")
    .eq(
      "month_start",
      monthStart
    )
    .maybeSingle();

  throwIfError(error);

  if (!data) {
    return null;
  }

  return {
    month_start:
      data.month_start,

    attended:
      toNumber(
        data.attended
      ),

    booked:
      toNumber(
        data.booked
      ),

    registered:
      toNumber(
        data.registered
      ),

    cancelled:
      toNumber(
        data.cancelled
      ),

    missed:
      toNumber(
        data.missed
      ),
  };
}

/* =====================================================
   BUSINESS PERFORMANCE
===================================================== */

export async function loadFinancialPerformance(
  monthStart: string
): Promise<FinancialPerformanceSummary | null> {
  const {
    data,
    error,
  } = await supabase
    .from(
      "financial_performance_summary"
    )
    .select("*")
    .eq(
      "month_start",
      monthStart
    )
    .maybeSingle();

  throwIfError(error);

  if (!data) {
    return null;
  }

  return {
    month_start:
      data.month_start,

    leads:
      toNumber(
        data.leads
      ),

    registered_students:
      toNumber(
        data.registered_students
      ),

    booked_value:
      toNumber(
        data.booked_value
      ),

    cac:
      toNullableNumber(
        data.cac
      ),

    cpl:
      toNullableNumber(
        data.cpl
      ),

    conversion_rate:
      toNullableNumber(
        data.conversion_rate
      ),

    roi:
      toNullableNumber(
        data.roi
      ),

    revenue_per_student:
      toNullableNumber(
        data.revenue_per_student
      ),
  };
}

/* =====================================================
   FINANCIAL OBLIGATIONS
===================================================== */

export async function loadActiveFinancialObligations(): Promise<
  FinancialObligation[]
> {
  const {
    data,
    error,
  } = await supabase
    .from(
      "financial_obligations"
    )
    .select("*")
    .eq(
      "status",
      "active"
    )
    .order(
      "next_due_date",
      {
        ascending: true,
        nullsFirst: false,
      }
    );

  throwIfError(error);

  return (
    data ?? []
  ).map(
    (row) => ({
      id: row.id,

      name: row.name,

      category:
        row.category,

      amount:
        toNumber(
          row.amount
        ),

      frequency:
        row.frequency,

      start_date:
        row.start_date,

      end_date:
        row.end_date,

      outstanding_balance:
        toNumber(
          row.outstanding_balance
        ),

      next_due_date:
        row.next_due_date,

      status:
        row.status,

      notes:
        row.notes,

      created_at:
        row.created_at,

      updated_at:
        row.updated_at,
    })
  );
}

/* =====================================================
   COMPLETE FINANCIAL DASHBOARD
===================================================== */

export async function loadFinancialDashboard(
  monthStart: string
): Promise<FinancialDashboardData> {
  const [
    settings,
    summary,
    expenses,
    activity,
    performance,
    obligations,
  ] = await Promise.all([
    loadFinancialSettings(),

    loadFinancialMonthlySummary(
      monthStart
    ),

    loadFinancialExpenseBreakdown(
      monthStart
    ),

    loadFinancialStudentActivity(
      monthStart
    ),

    loadFinancialPerformance(
      monthStart
    ),

    loadActiveFinancialObligations(),
  ]);

  return {
    settings,

    summary,

    expenses,

    activity,

    performance,

    obligations,
  };
}