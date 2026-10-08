/**
 * One trusted origin for client onboarding and recovery links.
 * Never derive a token-bearing URL from Host / x-forwarded-host headers:
 * their value belongs to the incoming request, not to the application's
 * authenticated deployment configuration.
 */
export type ClientAccessLinkEnvironment = {
  APP_PUBLIC_ORIGIN?: string;
  VERCEL_PROJECT_PRODUCTION_URL?: string;
  VERCEL_URL?: string;
  NODE_ENV?: string;
};

export class ClientAccessLinkOriginError extends Error {
  constructor() {
    super("Trusted client access link origin is missing or invalid");
    this.name = "ClientAccessLinkOriginError";
  }
}

function isLocalDevelopmentOrigin(value: URL, env: ClientAccessLinkEnvironment) {
  return (
    env.NODE_ENV === "development" &&
    value.protocol === "http:" &&
    (value.hostname === "localhost" || value.hostname === "127.0.0.1" || value.hostname === "[::1]")
  );
}

export function resolveTrustedClientAccessOrigin(
  env: ClientAccessLinkEnvironment = process.env,
): string {
  const configured = env.APP_PUBLIC_ORIGIN?.trim();
  const production = env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  const deployment = env.VERCEL_URL?.trim();
  const raw = configured || production || deployment;

  if (!raw) {
    if (env.NODE_ENV === "development") return "http://localhost:3000";
    throw new ClientAccessLinkOriginError();
  }

  // Protocol-relative/absolute paths are not deployment hostnames.
  if (raw.startsWith("/") || raw.startsWith("\\\\")) {
    throw new ClientAccessLinkOriginError();
  }

  try {
    // Vercel injects hostname values without a scheme.
    const url = new URL(raw.includes("://") ? raw : `https://${raw}`);
    const local = isLocalDevelopmentOrigin(url, env);
    if (
      (url.protocol !== "https:" && !local) ||
      !url.hostname ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    ) {
      throw new ClientAccessLinkOriginError();
    }
    return url.origin;
  } catch {
    throw new ClientAccessLinkOriginError();
  }
}
