import "server-only";

import {
  listAccessibleAnamnesisClarificationResolutions,
  listAccessibleAnamnesisClarificationResponses,
  listAccessibleClientAssessments,
  listAccessibleClientFilesForClients,
  listAccessibleClientRegistrationsForClients,
  listAccessibleWeeklyFeedbackNotificationPreferencesForClients,
  listContentReleasesForAccessibleClients,
  listEducationalContentAssetsForCurrentAdminVersions,
  listAccessibleClientTrainingPlansForClients,
  listAccessibleClientTrainingPlanVersionsForPlans,
  listAccessibleClientTrainingRequestsForClients,
  listAccessibleNonterminalAiExecutions,
  listAccessibleProtocolPublications,
  listAccessibleProtocolVersionApprovals,
  listAccessibleProtocols,
  listClientsAssignedToCurrentAdmin,
} from "@/lib/supabase/data-access";

import {
  buildOperationalPendingItems,
  type OperationalPendingItem,
  type PendingTrainingLifecycle,
} from "@/lib/operations/pending";
import { loadClarificationReminderInterval } from "@/lib/operations/clarification-reminder-loader";
import {
  listPendingAnamnesisSubmissionsForClients,
  listPendingAnamnesisReviewsForSubmissions,
  listPendingClarificationRequestsForSubmissions,
  listPendingNotificationEventsForClients,
  listPendingProtocolVersionsForProtocols,
  listPendingWeeklyFeedbacksForClients,
} from "@/lib/operations/pending-facts";

function clientLabel(value: string | null | undefined) {
  return value?.trim() || "Cliente sem nome informado";
}

export async function getOperationalPendingItemsForCurrentAdmin(): Promise<
  OperationalPendingItem[]
> {
  const [
    assignments,
    assessments,
    protocols,
    aiExecutions,
    clarificationReminder,
  ] = await Promise.all([
    listClientsAssignedToCurrentAdmin(),
    listAccessibleClientAssessments(),
    listAccessibleProtocols(),
    listAccessibleNonterminalAiExecutions(),
    loadClarificationReminderInterval(),
  ]);

  const assignedClients = assignments.flatMap((assignment) =>
    assignment.clients ? [assignment.clients] : [],
  );
  const labelsByClientId = new Map(
    assignedClients.map((client) => [
      client.id,
      clientLabel(client.full_name || client.profiles?.display_name),
    ]),
  );

  const clientIds = assignedClients.map((client) => client.id);

  const [
    submissions,
    weeklyFeedbacks,
    weeklyFeedbackNotificationEvents,
    trainingRequests,
    trainingPlans,
    registrations,
    weeklyFeedbackPreferences,
    contentReleases,
    privateFiles,
  ] = await Promise.all([
    listPendingAnamnesisSubmissionsForClients(clientIds),
    listPendingWeeklyFeedbacksForClients(clientIds),
    listPendingNotificationEventsForClients(clientIds),
    listAccessibleClientTrainingRequestsForClients(clientIds),
    listAccessibleClientTrainingPlansForClients(clientIds),
    listAccessibleClientRegistrationsForClients(clientIds),
    listAccessibleWeeklyFeedbackNotificationPreferencesForClients(clientIds),
    listContentReleasesForAccessibleClients(clientIds),
    listAccessibleClientFilesForClients(clientIds),
  ]);

  const [trainingVersions, releasedContentAssets] = await Promise.all([
    listAccessibleClientTrainingPlanVersionsForPlans(
      trainingPlans.map((plan) => plan.id),
    ),
    listEducationalContentAssetsForCurrentAdminVersions(
      contentReleases.flatMap((release) =>
        release.educational_content_versions?.id
          ? [release.educational_content_versions.id]
          : [],
      ),
    ),
  ]);
  const registrationsByClientId = new Map(
    registrations.map((registration) => [registration.client_id, registration]),
  );
  const weeklyFeedbackPreferenceByClientId = new Map(
    weeklyFeedbackPreferences.map((preference) => [
      preference.client_id,
      preference,
    ]),
  );
  const releasedVersionIdsWithAssets = new Set(
    releasedContentAssets.map(
      (asset) => asset.educational_content_version_id,
    ),
  );
  const trainingPlanByClientId = new Map(
    trainingPlans.map((plan) => [plan.client_id, plan]),
  );
  const openTrainingVersionByPlanId = new Map(
    trainingVersions
      .filter((version) => !version.published_at)
      .map((version) => [version.training_plan_id, version]),
  );
  const latestRequestByClientId = new Map<
    string,
    (typeof trainingRequests)[number]
  >();

  for (const request of trainingRequests) {
    if (!latestRequestByClientId.has(request.client_id)) {
      latestRequestByClientId.set(request.client_id, request);
    }
  }

  const trainingLifecycle: PendingTrainingLifecycle[] = assignedClients.flatMap<PendingTrainingLifecycle>((client) => {
    const plan = trainingPlanByClientId.get(client.id);
    const request = latestRequestByClientId.get(client.id);

    if (!plan) {
      return request
        ? [{
            clientId: client.id,
            clientLabel: clientLabel(client.full_name || client.profiles?.display_name),
            createdAt: request.requested_at,
            id: request.id,
            state: "requested_without_plan" as const,
            versionNumber: null,
          }]
        : [];
    }

    const openVersion = openTrainingVersionByPlanId.get(plan.id);

    if (!openVersion) {
      return [];
    }

    return [{
      clientId: client.id,
      clientLabel: clientLabel(client.full_name || client.profiles?.display_name),
      createdAt: openVersion.reviewed_at ?? openVersion.created_at,
      id: openVersion.id,
      state: openVersion.reviewed_at
        ? ("reviewed_not_published" as const)
        : ("draft" as const),
      versionNumber: openVersion.version_number,
    }];
  });

  const submitted = submissions.filter(
    (submission) => Boolean(submission.submitted_at),
  );
  const submittedById = new Map(
    submitted.map((submission) => [submission.id, submission.client_id]),
  );
  const [reviews, requests] = await Promise.all([
    listPendingAnamnesisReviewsForSubmissions([...submittedById.keys()]),
    listPendingClarificationRequestsForSubmissions([...submittedById.keys()]),
  ]);
  const reviewsBySubmission = new Map<string, number>();
  for (const review of reviews) {
    reviewsBySubmission.set(
      review.submission_id,
      (reviewsBySubmission.get(review.submission_id) ?? 0) + 1,
    );
  }
  const clarificationRequests = requests.flatMap((request) => {
    const clientId = submittedById.get(request.submission_id);
    return clientId ? [{ ...request, clientId }] : [];
  });

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

  const accessibleProtocolVersions = await listPendingProtocolVersionsForProtocols(
    protocols.map((protocol) => protocol.id),
  );
  const protocolsById = new Map(protocols.map((protocol) => [protocol.id, protocol]));
  const protocolVersions = accessibleProtocolVersions.flatMap((version) => {
    const protocol = protocolsById.get(version.protocol_id);
    return protocol ? [{ protocol, version }] : [];
  });
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
    referenceNow: new Date().toISOString(),
    clarificationReminderIntervalHours: clarificationReminder.intervalHours,
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
    clientOperationalReadiness: assignedClients.map((client) => {
      const registration = registrationsByClientId.get(client.id);
      const preference = weeklyFeedbackPreferenceByClientId.get(client.id);

      return {
        clientId: client.id,
        clientLabel: clientLabel(
          client.full_name || client.profiles?.display_name,
        ),
        contactEmail: registration?.contact_email ?? null,
        createdAt: client.started_at ?? assignments.find(
          (assignment) => assignment.client_id === client.id,
        )?.assigned_at ?? new Date(0).toISOString(),
        hasRegistration: Boolean(registration),
        weeklyFeedbackChannel: preference?.channel_key ?? null,
      };
    }),
    privateFileReleases: privateFiles.flatMap((file) => {
      const assignedClient = assignedClients.find(
        (client) => client.id === file.client_id,
      );

      if (
        !assignedClient ||
        file.client_visible_at ||
        file.uploaded_by_profile_id === assignedClient.profile_id
      ) {
        return [];
      }

      return [{
        clientId: file.client_id,
        clientLabel:
          labelsByClientId.get(file.client_id) ??
          "Cliente sem nome informado",
        createdAt: file.created_at,
        fileId: file.id,
        fileKind: file.file_kind,
        originalFilename:
          file.original_filename?.trim() || "Arquivo sem nome informado",
      }];
    }),
    contentReleaseReadiness: contentReleases.flatMap((release) => {
      const version = release.educational_content_versions;

      if (!version) {
        return [];
      }

      return [{
        clientId: release.client_id,
        clientLabel:
          labelsByClientId.get(release.client_id) ??
          "Cliente sem nome informado",
        createdAt: release.released_at,
        hasAsset: releasedVersionIdsWithAssets.has(version.id),
        releaseId: release.id,
        title: version.title,
        versionId: version.id,
      }];
    }),
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
      clientLabel: clientLabel(assessment.clients?.full_name || assessment.clients?.profiles?.display_name),
      createdAt: assessment.assessed_at,
      finalizedAt: assessment.finalized_at,
      id: assessment.id,
    })),
    protocolVersions: protocolVersions.map(({ protocol, version }) => ({
      approvalCount: approvalCounts.get(version.id) ?? 0,
      clientId: version.client_id,
      clientLabel: clientLabel(protocol.clients?.full_name || protocol.clients?.profiles?.display_name),
      createdAt: version.created_at,
      id: version.id,
      protocolId: protocol.id,
      publicationCount: publicationCounts.get(version.id) ?? 0,
      submittedForReviewAt: version.submitted_for_review_at,
      versionNumber: version.version_number,
    })),
    trainingLifecycle,
    aiExecutions: aiExecutions.map((execution) => ({
      anamnesisSubmissionId: execution.anamnesis_submission_id,
      clientId: execution.client_id,
      clientLabel: clientLabel(execution.clients?.full_name || execution.clients?.profiles?.display_name),
      createdAt: execution.created_at,
      id: execution.id,
      purposeKey: execution.purpose_key,
    })),
    weeklyFeedbackNotificationEvents: weeklyFeedbackNotificationEvents.map(
      (event) => ({
        blockedReason: event.blocked_reason,
        channelKey: event.channel_key,
        clientId: event.client_id,
        clientLabel:
          labelsByClientId.get(event.client_id) ?? "Cliente sem nome informado",
        createdAt: event.created_at,
        deliveryState: event.delivery_state,
        eventKey: event.event_key,
        id: event.id,
        weeklyFeedbackId: event.weekly_feedback_id,
      }),
    ),
    weeklyFeedbacks: weeklyFeedbacks.map((feedback) => ({
      clientId: feedback.client_id,
      clientLabel:
        labelsByClientId.get(feedback.client_id) ?? "Cliente sem nome informado",
      createdAt: feedback.created_at,
      dueAt: feedback.due_at,
      id: feedback.id,
      periodEnd: feedback.period_end,
      periodStart: feedback.period_start,
      submittedAt: feedback.submitted_at,
    })),
  });
}
