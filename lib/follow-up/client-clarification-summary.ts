/**
 * Navigation-only summary of the factual clarification workflow.
 * Neither an unanswered request nor a response implies clinical urgency or
 * professional resolution. Text of health-related answers is not included.
 */
export type ClientClarificationRequestFact = {
  id: string;
  submission_id: string;
  created_at: string;
};

export type ClientClarificationResponseFact = {
  clarification_request_id: string;
};

export type ClientClarificationResolutionFact = {
  clarification_request_id: string;
};

export type ClientClarificationSubmissionSummary = {
  awaitingClient: number;
  awaitingProfessional: number;
  firstAwaitingClientRequestId: string | null;
  firstAwaitingProfessionalRequestId: string | null;
};

/**
 * Requests may carry different UTC offsets. Sort by the factual instant so
 * the client home and clarification detail choose the same oldest open item.
 * Invalid legacy timestamps are listed last and never hide valid requests.
 */
export function orderClientClarificationRequests<T extends ClientClarificationRequestFact>(
  requests: readonly T[],
): T[] {
  return [...requests].sort((a, b) => {
    const left = Date.parse(a.created_at);
    const right = Date.parse(b.created_at);
    const leftValid = Number.isFinite(left);
    const rightValid = Number.isFinite(right);
    if (leftValid && rightValid && left !== right) return left - right;
    if (leftValid !== rightValid) return leftValid ? -1 : 1;
    return a.id.localeCompare(b.id);
  });
}

export function summarizeClientClarifications(
  requests: readonly ClientClarificationRequestFact[],
  responses: readonly ClientClarificationResponseFact[],
  resolutions: readonly ClientClarificationResolutionFact[],
) {
  const responseIds = new Set(responses.map((response) => response.clarification_request_id));
  const resolvedIds = new Set(resolutions.map((resolution) => resolution.clarification_request_id));
  const bySubmission = new Map<string, ClientClarificationSubmissionSummary>();
  let awaitingClient = 0;
  let awaitingProfessional = 0;
  let firstAwaitingClient: { id: string; submissionId: string } | null = null;

  const ordered = orderClientClarificationRequests(requests);

  for (const request of ordered) {
    if (resolvedIds.has(request.id)) continue;
    const current = bySubmission.get(request.submission_id) ?? {
      awaitingClient: 0,
      awaitingProfessional: 0,
      firstAwaitingClientRequestId: null,
      firstAwaitingProfessionalRequestId: null,
    };

    if (responseIds.has(request.id)) {
      current.awaitingProfessional += 1;
      current.firstAwaitingProfessionalRequestId ??= request.id;
      awaitingProfessional += 1;
    } else {
      current.awaitingClient += 1;
      current.firstAwaitingClientRequestId ??= request.id;
      awaitingClient += 1;
      firstAwaitingClient ??= { id: request.id, submissionId: request.submission_id };
    }
    bySubmission.set(request.submission_id, current);
  }

  return { awaitingClient, awaitingProfessional, firstAwaitingClient, bySubmission };
}
