import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { collectAiPagesForIds } from "@/lib/ai/history-pagination";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type AiFindingActionRow = {
  action: "accepted_internal_observation" | "converted_to_patty_note";
  acted_by_profile_id: string;
  anamnesis_review_id: string | null;
  client_id: string;
  created_at: string;
  execution_id: string;
  finding_index: number;
  finding_snapshot: unknown;
  id: string;
};

type FindingActionsDatabase = {
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      ai_finding_actions: {
        Row: AiFindingActionRow;
        Insert: never;
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      record_ai_finding_action_server: {
        Args: {
          p_action: string;
          p_acted_by_profile_id: string;
          p_execution_id: string;
          p_finding_index: number;
          p_note?: string | null;
        };
        Returns: Array<{
          action_id: string;
          anamnesis_review_id: string | null;
        }>;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

async function createFindingActionsClient() {
  const client = await createClient();
  return client as unknown as SupabaseClient<FindingActionsDatabase>;
}

function createFindingActionsAdminClient() {
  const client = createAdminClient();
  return client as unknown as SupabaseClient<FindingActionsDatabase>;
}

export async function listAccessibleAiFindingActions(executionIds: string[]) {
  const supabase = await createFindingActionsClient();
  const rows = await collectAiPagesForIds(executionIds, (ids, from, to) => supabase
    .from("ai_finding_actions")
    .select("id, execution_id, client_id, finding_index, finding_snapshot, action, acted_by_profile_id, anamnesis_review_id, created_at")
    .in("execution_id", ids)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .range(from, to));
  const orderedRows = rows.sort((a, b) => {
    const at = Date.parse(a.created_at);
    const bt = Date.parse(b.created_at);
    return (Number.isFinite(at) ? at : -Infinity) -
      (Number.isFinite(bt) ? bt : -Infinity) || a.id.localeCompare(b.id);
  });
  if (orderedRows.length === 0) return [];

  // Only look up actors from already RLS-authorized action rows. The normal
  // session/RLS also controls which profile names may be revealed; unavailable
  // names never change the immutable recorded actor profile ID.
  const profileSupabase = await createClient();
  const actorProfiles = await collectAiPagesForIds(
    orderedRows.map((action) => action.acted_by_profile_id),
    (ids, from, to) => profileSupabase
      .from("profiles")
      .select("id, display_name")
      .in("id", ids)
      .order("id", { ascending: true })
      .range(from, to),
  );
  const namesById = new Map(
    actorProfiles.map((profile) => [profile.id, profile.display_name?.trim() || null]),
  );
  return orderedRows.map((action) => ({
    ...action,
    actor_display_name: namesById.get(action.acted_by_profile_id) ?? null,
  }));
}

export async function recordAiFindingAction(input: {
  action: "accepted_internal_observation" | "converted_to_patty_note";
  actedByProfileId: string;
  executionId: string;
  findingIndex: number;
  note?: string | null;
}) {
  const supabase = createFindingActionsAdminClient();
  const { data, error } = await supabase.rpc("record_ai_finding_action_server", {
    p_action: input.action,
    p_acted_by_profile_id: input.actedByProfileId,
    p_execution_id: input.executionId,
    p_finding_index: input.findingIndex,
    p_note: input.note ?? null,
  });

  if (error) {
    throw error;
  }

  return data[0] ?? null;
}
