import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function requiredEnvironment(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing required environment value: ${name}`);
  return value;
}

export function serviceClient(): SupabaseClient {
  return createClient(
    requiredEnvironment("SUPABASE_URL"),
    requiredEnvironment("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );
}

export function userClient(request: Request): SupabaseClient {
  return createClient(
    requiredEnvironment("SUPABASE_URL"),
    requiredEnvironment("SUPABASE_ANON_KEY"),
    {
      global: {
        headers: { Authorization: request.headers.get("authorization") ?? "" },
      },
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );
}

export async function requireUser(
  client: SupabaseClient,
): Promise<{ id: string }> {
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user) throw new AuthorizationError();
  return { id: user.id };
}

export class AuthorizationError extends Error {
  constructor(message = "Authentication is required.") {
    super(message);
  }
}
