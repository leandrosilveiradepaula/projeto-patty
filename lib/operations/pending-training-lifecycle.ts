import type { PendingTrainingLifecycle } from "./pending.ts";
import { newestTrainingRequests, newestUnpublishedTrainingVersion } from "../training/operational-order.ts";
import { latestPublishedTrainingVersion } from "../training/published-versions.ts";
import { isTrainingRequestAfterPublication } from "../training/request-follow-up.ts";

type ScopedClient = { id: string; label: string };
type ClientTrainingPlan = { id: string; client_id: string };
type ClientTrainingRequest = { id: string; client_id: string; requested_at: string };
type ClientTrainingVersion = {
  id: string;
  training_plan_id: string;
  version_number: number;
  created_at: string;
  reviewed_at: string | null;
  published_at: string | null;
};

type Input = {
  clients: readonly ScopedClient[];
  plans: readonly ClientTrainingPlan[];
  requests: readonly ClientTrainingRequest[];
  versions: readonly ClientTrainingVersion[];
};

/**
 * The queue is a view of explicit persisted facts, not an automatic
 * prescription or an inferred clinical priority. A request that arrived after
 * the last publication remains actionable even if an open draft also exists.
 */
export function derivePendingTrainingLifecycle(input: Input): PendingTrainingLifecycle[] {
  const planByClientId = new Map(input.plans.map((plan) => [plan.client_id, plan]));
  const newestRequestByClientId = new Map<string, ClientTrainingRequest>();

  for (const request of newestTrainingRequests(input.requests)) {
    if (!newestRequestByClientId.has(request.client_id)) {
      newestRequestByClientId.set(request.client_id, request);
    }
  }

  const versionsByPlanId = new Map<string, ClientTrainingVersion[]>();
  for (const version of input.versions) {
    const versions = versionsByPlanId.get(version.training_plan_id) ?? [];
    versions.push(version);
    versionsByPlanId.set(version.training_plan_id, versions);
  }

  return input.clients.flatMap((client): PendingTrainingLifecycle[] => {
    const plan = planByClientId.get(client.id);
    const request = newestRequestByClientId.get(client.id);

    if (!plan) {
      return request
        ? [{
            clientId: client.id,
            clientLabel: client.label,
            createdAt: request.requested_at,
            id: request.id,
            state: "requested_without_plan",
            versionNumber: null,
          }]
        : [];
    }

    const versions = versionsByPlanId.get(plan.id) ?? [];
    const openVersion = newestUnpublishedTrainingVersion(versions);
    const published = latestPublishedTrainingVersion(versions);
    const results: PendingTrainingLifecycle[] = [];

    if (
      request &&
      published &&
      isTrainingRequestAfterPublication(request.requested_at, published.published_at)
    ) {
      results.push({
        clientId: client.id,
        clientLabel: client.label,
        createdAt: request.requested_at,
        id: request.id,
        state: "requested_after_publication",
        versionNumber: published.version_number,
      });
    }

    if (openVersion) {
      results.push({
        clientId: client.id,
        clientLabel: client.label,
        createdAt: openVersion.reviewed_at ?? openVersion.created_at,
        id: openVersion.id,
        state: openVersion.reviewed_at ? "reviewed_not_published" : "draft",
        versionNumber: openVersion.version_number,
      });
    }

    return results;
  });
}
