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
