import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

type CorrectionRow = {
  assessment_measurement_id: string;
  corrected_by_profile_id: string;
  corrected_measurement_value: number;
  corrected_unit: string;
  created_at: string;
  id: string;
  note: string | null;
};

type CorrectionsDatabase = {
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      assessment_measurement_corrections: {
        Row: CorrectionRow;
        Insert: {
          assessment_measurement_id: string;
          corrected_by_profile_id: string;
          corrected_measurement_value: number;
          corrected_unit: string;
          created_at?: string;
          id?: string;
          note?: string | null;
        };
        Update: Partial<CorrectionRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

async function createCorrectionsClient() {
  const client = await createClient();

  return client as unknown as SupabaseClient<CorrectionsDatabase>;
}

export async function listAccessibleAssessmentMeasurementCorrections(
  measurementIds: string[],
): Promise<CorrectionRow[]> {
  if (measurementIds.length === 0) {
    return [];
  }

  const supabase = await createCorrectionsClient();
  const { data, error } = await supabase
    .from("assessment_measurement_corrections")
    .select(
      "id, assessment_measurement_id, corrected_measurement_value, corrected_unit, corrected_by_profile_id, note, created_at",
    )
    .in("assessment_measurement_id", measurementIds)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    throw error;
  }

  return data;
}

export async function createAccessibleAssessmentMeasurementCorrection(input: {
  correctedByProfileId: string;
  correctedUnit: string;
  correctedValue: number;
  measurementId: string;
  note: string | null;
}): Promise<CorrectionRow> {
  const supabase = await createCorrectionsClient();
  const { data, error } = await supabase
    .from("assessment_measurement_corrections")
    .insert({
      assessment_measurement_id: input.measurementId,
      corrected_by_profile_id: input.correctedByProfileId,
      corrected_measurement_value: input.correctedValue,
      corrected_unit: input.correctedUnit,
      note: input.note,
    })
    .select(
      "id, assessment_measurement_id, corrected_measurement_value, corrected_unit, corrected_by_profile_id, note, created_at",
    )
    .single();

  if (error) {
    throw error;
  }

  return data;
}
