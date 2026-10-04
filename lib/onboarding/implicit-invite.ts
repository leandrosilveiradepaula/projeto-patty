export type ImplicitInviteFragment =
  | {
      accessToken: string;
      kind: "invite";
      refreshToken: string;
    }
  | { kind: "invalid" }
  | { kind: "none" };

export function parseImplicitInviteFragment(hash: string): ImplicitInviteFragment {
  const value = hash.startsWith("#") ? hash.slice(1) : hash;

  if (!value) {
    return { kind: "none" };
  }

  const params = new URLSearchParams(value);

  if (params.get("type") !== "invite") {
    return { kind: "none" };
  }

  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");

  if (!accessToken || !refreshToken) {
    return { kind: "invalid" };
  }

  return {
    accessToken,
    kind: "invite",
    refreshToken,
  };
}
