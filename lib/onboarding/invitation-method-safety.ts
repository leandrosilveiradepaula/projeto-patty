/**
 * Only a confirmed pre-provisioning failure may unlock the invitation method.
 * An ambiguous outcome must remain locked: Auth may already contain the user.
 */
export function mayChangeInvitationMethodAfterFailure(state: {
  message: string | null;
  retryable?: boolean;
  success?: boolean;
}): boolean {
  return Boolean(state.message && state.retryable === true && state.success !== true);
}
