export type AdminBootstrapStateInput = {
  clientLinked: boolean;
  roles: string[];
};

export function resolveAdminBootstrapState(
  input: AdminBootstrapStateInput,
): "already_admin" | "create_admin_role" {
  if (input.clientLinked) {
    throw new Error("Admin bootstrap refuses a profile already linked as client");
  }

  if (input.roles.length === 0) {
    return "create_admin_role";
  }

  if (input.roles.length === 1 && input.roles[0] === "admin") {
    return "already_admin";
  }

  throw new Error("Admin bootstrap refuses existing non-admin or ambiguous roles");
}

/**
 * The MVP has exactly one business administrator. Never turn the bootstrap
 * command into a second-admin creation path when the hosted DB has drifted.
 * This is a privileged provisioner guard, not a replacement for RLS.
 */
export function assertAdminBootstrapRoleCount(count: number): void {
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new Error("Admin bootstrap cannot verify the current role count");
  }
  if (count > 1) {
    throw new Error("Admin bootstrap blocked: multiple admin roles require human reconciliation");
  }
}

export function assertSoleAdminBootstrapTransition(input: {
  existingAdminCount: number;
  targetState: "already_admin" | "create_admin_role";
}): void {
  assertAdminBootstrapRoleCount(input.existingAdminCount);
  if (input.existingAdminCount === 1 && input.targetState !== "already_admin") {
    throw new Error("Admin bootstrap refuses a second administrator");
  }
  if (input.existingAdminCount === 0 && input.targetState !== "create_admin_role") {
    throw new Error("Admin bootstrap role count is inconsistent with target identity");
  }
}
