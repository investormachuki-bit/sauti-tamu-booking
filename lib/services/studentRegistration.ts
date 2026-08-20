import { supabase } from "@/lib/supabase";

export type StudentRegistrationInput = {
  leadId: string;
  fullName: string;
  email?: string | null;
  whatsappNumber?: string | null;
  notes?: string | null;
};

export type RegisteredStudent = {
  id: string;
  lead_id: string | null;
  full_name: string;
  email: string;
  whatsapp_number: string;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * Finds an existing student created from a lead,
 * or creates the student if one does not exist.
 *
 * This service intentionally handles ONLY the student record.
 * Enrollment, programme and payment creation remain separate.
 */
export async function ensureStudentFromLead(
  input: StudentRegistrationInput
): Promise<RegisteredStudent> {
  const {
    leadId,
    fullName,
    email,
    whatsappNumber,
    notes,
  } = input;

  if (!leadId) {
    throw new Error(
      "A lead ID is required to register a student."
    );
  }

  if (!fullName?.trim()) {
    throw new Error(
      "Student name is required."
    );
  }

  /*
   * =====================================================
   * 1. CHECK WHETHER STUDENT ALREADY EXISTS
   * =====================================================
   */

  const {
    data: existingStudent,
    error: existingStudentError,
  } = await supabase
    .from("students")
    .select(
      `
        id,
        lead_id,
        full_name,
        email,
        whatsapp_number,
        status,
        notes,
        created_at,
        updated_at
      `
    )
    .eq("lead_id", leadId)
    .maybeSingle();

  if (existingStudentError) {
    throw existingStudentError;
  }

  /*
   * =====================================================
   * 2. UPDATE EXISTING STUDENT
   * =====================================================
   *
   * If the student already exists, keep the same student
   * ID and refresh the contact information from the lead.
   */

  if (existingStudent) {
    const {
      data: updatedStudent,
      error: updateError,
    } = await supabase
      .from("students")
      .update({
        full_name: fullName.trim(),
        email: email?.trim() || "",
        whatsapp_number:
          whatsappNumber?.trim() || "",
        notes: notes?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingStudent.id)
      .select(
        `
          id,
          lead_id,
          full_name,
          email,
          whatsapp_number,
          status,
          notes,
          created_at,
          updated_at
        `
      )
      .single();

    if (updateError) {
      throw updateError;
    }

    return updatedStudent as RegisteredStudent;
  }

  /*
   * =====================================================
   * 3. CREATE NEW STUDENT
   * =====================================================
   */

  const {
    data: newStudent,
    error: insertError,
  } = await supabase
    .from("students")
    .insert({
      lead_id: leadId,
      full_name: fullName.trim(),
      email: email?.trim() || "",
      whatsapp_number:
        whatsappNumber?.trim() || "",
      status: "active",
      notes: notes?.trim() || null,
    })
    .select(
      `
        id,
        lead_id,
        full_name,
        email,
        whatsapp_number,
        status,
        notes,
        created_at,
        updated_at
      `
    )
    .single();

  if (insertError) {
    throw insertError;
  }

  return newStudent as RegisteredStudent;
}
