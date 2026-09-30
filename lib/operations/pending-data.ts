import "server-only";

import {
  listAccessibleAnamnesisClarificationRequests,
  listAccessibleAnamnesisClarificationResolutions,
  listAccessibleAnamnesisClarificationResponses,
  listAccessibleAnamnesisReviews,
  listAccessibleAnamnesisSubmissions,
  listAccessibleClientAssessments,
  listAccessibleNonterminalAiExecutions,
  listAccessibleProtocolPublications,
  listAccessibleProtocolVersionApprovals,
  listAccessibleProtocolVersions,
  listAccessibleProtocols,
  listClientsAssignedToCurrentAdmin,
} from "@/lib/supabase/data-access";

import {
  buildOperationalPendingItems,
  type OperationalPendingItem,
} from "@/lib/operations/pending";

function clientLabel(value: string | null | undefined) {
  return value?.trim() || "Cliente sem nome informado";
}

export async function getOperationalPendingItemsForCurrentAdmin(): Promise<
  OperationalPendingItem[]
> {
  const [assignments, assessments, protocols, aiExecutions] = await Promise.all([
    listClientsAssignedToCurrentAdmin(),
    listAccessibleClientAssessments(),
    listAccessibleProtocols(),
    listAccessibleNonterminalAiExecutions(),
  ]);

  const assignedClients = assignments.flatMap((assignment) =>
    assignment.clients ? [assignment.clients] : [],
  );
  const labelsByClientId = new Map(
    assignedClients.map((client) => [
      client.id,
      clientLabel(client.profiles?.display_name),
    ]),
  );

  const submissions = (
    await Promise.all(
      assignedClients.map((client) =>
        listAccessibleAnamnesisSubmissions(client.id),
      ),
    )
  ).flat();

  const submitted = submissions.filter(
    (submission) => Boolean(submission.submitted_at),
  );
  const reviewsBySubmission = new Map<string, number>();
  const clarificationRequests: Array<{
    clientId: string;
    created_at: string;
    id: string;
    request_text: string;
    requested_by_profile_id: string;
    source_answer_id: string | null;
    submission_id: string;
  }> = [];

  await Promise.all(
    submitted.map(async (submission) => {
      const [reviews, requests] = await Promise.all([
        listAccessibleAnamnesisReviews(submission.id),
        listAccessibleAnamnesisClarificationRequests(submission.id),
      ]);

      reviewsBySubmission.set(submission.id, reviews.length);

      for (const request of requests) {
        clarificationRequests.push({
          ...request,
          clientId: submission.client_id,
        });
      }
    }),
  );

  const clarificationRequestIds = clarificationRequests.map(
    (request) => request.id,
  );
  const [clarificationResponses, clarificationResolutions] =
    await Promise.all([
      listAccessibleAnamnesisClarificationResponses(clarificationRequestIds),
      listAccessibleAnamnesisClarificationResolutions(clarificationRequestIds),
    ]);
  const responseCounts = new Map<string, number>();
  const resolvedRequestIds = new Set(
    clarificationResolutions.map(
      (resolution) => resolution.clarification_request_id,
    ),
  );

  for (const response of clarificationResponses) {
    responseCounts.set(
      response.clarification_request_id,
      (responseCounts.get(response.clarification_request_id) ?? 0) + 1,
    );
  }

  const versionsByProtocol = await Promise.all(
    protocols.map(async (protocol) => ({
      protocol,
      versions: await listAccessibleProtocolVersions(protocol.id),
    })),
  );
  const protocolVersions = versionsByProtocol.flatMap(({ protocol, versions }) =>
    versions.map((version) => ({ protocol, version })),
  );
  const protocolVersionIds = protocolVersions.map(({ version }) => version.id);
  const [approvals, publications] = await Promise.all([
    listAccessibleProtocolVersionApprovals(protocolVersionIds),
    listAccessibleProtocolPublications(protocolVersionIds),
  ]);
  const approvalCounts = new Map<string, number>();
  const publicationCounts = new Map<string, number>();

  for (const approval of approvals) {
    approvalCounts.set(
      approval.protocol_version_id,
      (approvalCounts.get(approval.protocol_version_id) ?? 0) + 1,
    );
  }

  for (const publication of publications) {
    publicationCounts.set(
      publication.protocol_version_id,
      (publicationCounts.get(publication.protocol_version_id) ?? 0) + 1,
    );
  }

  return buildOperationalPendingItems({
    anamnesisSubmissions: submissions.map((submission) => ({
      clientId: submission.client_id,
      clientLabel:
        labelsByClientId.get(submission.client_id) ??
        "Cliente sem nome informado",
      createdAt: submission.created_at,
      id: submission.id,
      reviewCount: reviewsBySubmission.get(submission.id) ?? 0,
      submittedAt: submission.submitted_at,
    })),
    clarificationRequests: clarificationRequests.map((request) => ({
      clientId: request.clientId,
      clientLabel:
        labelsByClientId.get(request.clientId) ?? "Cliente sem nome informado",
      createdAt: request.created_at,
      id: request.id,
      responseCount: responseCounts.get(request.id) ?? 0,
      resolved: resolvedRequestIds.has(request.id),
      submissionId: request.submission_id,
    })),
    assessments: assessments.map((assessment) => ({
      clientId: assessment.client_id,
      clientLabel: clientLabel(assessment.clients?.profiles?.display_name),
      createdAt: assessment.assessed_at,
      finalizedAt: assessment.finalized_at,
      id: assessment.id,
    })),
    protocolVersions: protocolVersions.map(({ protocol, version }) => ({
      approvalCount: approvalCounts.get(version.id) ?? 0,
      clientId: version.client_id,
      clientLabel: clientLabel(protocol.clients?.profiles?.display_name),
      createdAt: version.created_at,
      id: version.id,
      protocolId: protocol.id,
      publicationCount: publicationCounts.get(version.id) ?? 0,
      submittedForReviewAt: version.submitted_for_review_at,
      versionNumber: version.version_number,
    })),
    aiExecutions: aiExecutions.map((execution) => ({
      clientId: execution.client_id,
      clientLabel: clientLabel(execution.clients?.profiles?.display_name),
      createdAt: execution.created_at,
      id: execution.id,
      purposeKey: execution.purpose_key,
    })),
  });
}
