export type ImplicitRecoveryFragment =
  | {
      accessToken: string;
      kind: "recovery";
      refreshToken: string;
    }
  | { kind: "invalid" }
  | { kind: "none" };

export function parseImplicitRecoveryFragment(
  hash: string,
): ImplicitRecoveryFragment {
  const value = hash.startsWith("#") ? hash.slice(1) : hash;

  if (!value) {
    return { kind: "none" };
  }

  const params = new URLSearchParams(value);

  if (params.get("type") !== "recovery") {
    return { kind: "none" };
  }

  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");

  if (!accessToken || !refreshToken) {
    return { kind: "invalid" };
  }

  return {
    accessToken,
    kind: "recovery",
    refreshToken,
  };
}
