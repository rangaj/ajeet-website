import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env and configure."
  );
}

export const supabase = createClient<Database>(
  supabaseUrl ?? "https://placeholder.supabase.co",
  supabaseAnonKey ?? "placeholder",
  { db: { schema: "public" } }
);

export async function invokeFunction<T>(
  name: string,
  body?: Record<string, unknown> | FormData
): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  const anonKey = supabaseAnonKey ?? "";

  if (body instanceof FormData) {
    const headers: Record<string, string> = {
      apikey: anonKey,
    };
    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`;
    }

    const res = await fetch(`${supabaseUrl}/functions/v1/${name}`, {
      method: "POST",
      headers,
      body,
    });

    let json: Record<string, unknown> = {};
    try {
      json = await res.json();
    } catch {
      throw new Error(`Function ${name} returned a non-JSON response (${res.status})`);
    }

    if (!res.ok) {
      throw new Error(String(json.error ?? json.message ?? `Function call failed (${res.status})`));
    }
    return json as T;
  }

  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) throw error;
  return data as T;
}
