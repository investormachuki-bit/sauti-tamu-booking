"use client";

import { useCallback, useEffect, useState } from "react";

import FinancialDashboardView from "@/components/admin/financial/FinancialDashboardView";
import {
  loadFinancialDashboard,
  type FinancialDashboardData,
} from "@/lib/financial-service";

/* =====================================================
   HELPERS
===================================================== */

function getCurrentMonthStart() {
  const now = new Date();

  return `${now.getFullYear()}-${String(
    now.getMonth() + 1
  ).padStart(2, "0")}-01`;
}

function shiftMonth(
  monthStart: string,
  amount: number
) {
  const [year, month] = monthStart
    .split("-")
    .map(Number);

  const date = new Date(
    year,
    month - 1 + amount,
    1
  );

  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}-01`;
}

/* =====================================================
   PAGE
===================================================== */

export default function FinancialDashboardPage() {
  const [monthStart, setMonthStart] =
    useState(getCurrentMonthStart);

  const [dashboard, setDashboard] =
    useState<FinancialDashboardData | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  /* ===================================================
     LOAD DATA
  =================================================== */

  const loadDashboard = useCallback(
    async (
      selectedMonth: string,
      isRefresh = false
    ) => {
      try {
        setError("");

        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const data =
          await loadFinancialDashboard(
            selectedMonth
          );

        setDashboard(data);
      } catch (err) {
        console.error(
          "Failed to load financial dashboard:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load financial dashboard data."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  /* ===================================================
     INITIAL LOAD + MONTH CHANGE
  =================================================== */

  useEffect(() => {
    void loadDashboard(monthStart);
  }, [monthStart, loadDashboard]);

  /* ===================================================
     ACTIONS
  =================================================== */

  const handleRefresh = useCallback(() => {
    void loadDashboard(
      monthStart,
      true
    );
  }, [loadDashboard, monthStart]);

  const handlePreviousMonth =
    useCallback(() => {
      setMonthStart((current) =>
        shiftMonth(current, -1)
      );
    }, []);

  const handleNextMonth =
    useCallback(() => {
      setMonthStart((current) =>
        shiftMonth(current, 1)
      );
    }, []);

  /* ===================================================
     RENDER
  =================================================== */

  return (
    <FinancialDashboardView
      dashboard={dashboard}
      monthStart={monthStart}
      loading={loading}
      refreshing={refreshing}
      error={error}
      onRefresh={handleRefresh}
      onPreviousMonth={
        handlePreviousMonth
      }
      onNextMonth={handleNextMonth}
    />
  );
}