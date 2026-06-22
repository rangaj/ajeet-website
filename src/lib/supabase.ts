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
  supabaseAnonKey ?? "placeholder"
);

export async function invokeFunction<T>(
  name: string,
  body?: Record<string, unknown> | FormData
): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = {};
  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }

  if (body instanceof FormData) {
    const res = await fetch(`${supabaseUrl}/functions/v1/${name}`, {
      method: "POST",
      headers,
      body,
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Function call failed");
    return json as T;
  }

  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) throw error;
  return data as T;
}
