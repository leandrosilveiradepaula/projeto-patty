export type ProtocolLifecycleAction =
  | "submit"
  | "approve"
  | "publish"
  | "complete";

export type ProtocolLifecycleFacts = {
  hasApproval: boolean;
  hasPublication: boolean;
  submittedForReview: boolean;
};

export function getProtocolLifecycleAction(
  facts: ProtocolLifecycleFacts,
): ProtocolLifecycleAction {
  if (facts.hasPublication) {
    return "complete";
  }

  if (facts.hasApproval) {
    return "publish";
  }

  if (facts.submittedForReview) {
    return "approve";
  }

  return "submit";
}
