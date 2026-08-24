import { supabase } from "@/lib/supabase";

import type {
  Student,
  Payment,
} from "./student-types";

/*
 * =========================================================
 * STUDENTS
 * =========================================================
 */

export async function getStudents(): Promise<Student[]> {
  const { data, error } = await supabase
    .from("students")
    .select("*")
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    console.error(
      "Error loading students:",
      error
    );

    throw error;
  }

  return (data ?? []) as Student[];
}

/*
 * =========================================================
 * SINGLE STUDENT
 * =========================================================
 */

export async function getStudent(
  studentId: string
): Promise<Student | null> {
  const { data, error } = await supabase
    .from("students")
    .select("*")
    .eq("id", studentId)
    .maybeSingle();

  if (error) {
    console.error(
      "Error loading student:",
      error
    );

    throw error;
  }

  return data as Student | null;
}

/*
 * =========================================================
 * CREATE STUDENT
 * =========================================================
 */

export async function createStudent(
  student: Record<string, any>
) {
  const { data, error } = await supabase
    .from("students")
    .insert(student)
    .select()
    .single();

  if (error) {
    console.error(
      "Error creating student:",
      error
    );

    throw error;
  }

  return data as Student;
}

/*
 * =========================================================
 * UPDATE STUDENT
 * =========================================================
 */

export async function updateStudent(
  studentId: string,
  updates: Record<string, any>
) {
  const { data, error } = await supabase
    .from("students")
    .update(updates)
    .eq("id", studentId)
    .select()
    .single();

  if (error) {
    console.error(
      "Error updating student:",
      error
    );

    throw error;
  }

  return data as Student;
}

/*
 * =========================================================
 * DELETE STUDENT
 * =========================================================
 */

export async function deleteStudent(
  studentId: string
) {
  const { error } = await supabase
    .from("students")
    .delete()
    .eq("id", studentId);

  if (error) {
    console.error(
      "Error deleting student:",
      error
    );

    throw error;
  }
}

/*
 * =========================================================
 * STUDENT PAYMENTS
 * =========================================================
 */

export async function getStudentPayments(
  studentId: string
): Promise<Payment[]> {
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("student_id", studentId)
    .order("payment_date", {
      ascending: false,
    });

  if (error) {
    console.error(
      "Error loading student payments:",
      error
    );

    throw error;
  }

  return (data ?? []) as Payment[];
}

/*
 * =========================================================
 * CREATE PAYMENT
 * =========================================================
 */

export async function createPayment(
  payment: Record<string, any>
) {
  const { data, error } = await supabase
    .from("payments")
    .insert(payment)
    .select()
    .single();

  if (error) {
    console.error(
      "Error creating payment:",
      error
    );

    throw error;
  }

  return data as Payment;
}