import "server-only";

type SupabaseSecretConfig = {
  secretKey: string;
  url: string;
};

export function getSupabaseSecretConfig(): SupabaseSecretConfig {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY for server-only Supabase administration.",
    );
  }

  return { secretKey, url };
}
