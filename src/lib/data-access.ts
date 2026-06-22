import { supabase } from "@/lib/supabase";
import type {
  AlumniMember,
  AlumniMemberUpdate,
  SearchResult,
} from "@/types/database";

export type SearchAlumniParams = {
  p_query?: string | null;
  p_course?: string | null;
  p_stream?: string | null;
  p_year_from?: number | null;
  p_year_to?: number | null;
  p_location?: string | null;
  p_company?: string | null;
  p_industry?: string | null;
  p_skills?: string | null;
  p_house?: string | null;
  p_page?: number;
  p_page_size?: number;
  p_admin_mode?: boolean;
};

export async function searchAlumni(params: SearchAlumniParams) {
  return supabase.rpc("search_alumni", params);
}

export async function approveRegistration(requestId: string, note?: string | null) {
  return supabase.rpc("approve_registration", {
    p_request_id: requestId,
    p_note: note ?? null,
  });
}

export async function rejectRegistration(requestId: string, note?: string | null) {
  return supabase.rpc("reject_registration", {
    p_request_id: requestId,
    p_note: note ?? null,
  });
}

export async function updateAlumniMember(id: string, patch: AlumniMemberUpdate) {
  return supabase.from("alumni_members").update(patch).eq("id", id);
}

export async function fetchAlumniMemberByUserId(userId: string) {
  return supabase
    .from("alumni_members")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle()
    .then(({ data, error }) => ({
      data: data as AlumniMember | null,
      error,
    }));
}

export type { AlumniMember, AlumniMemberUpdate, SearchResult };
