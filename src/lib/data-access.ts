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
  p_open_to_mentorship?: boolean | null;
  p_page?: number;
  p_page_size?: number;
  p_admin_mode?: boolean;
};

export async function searchAlumni(params: SearchAlumniParams) {
  return supabase.rpc("search_alumni", params);
}

export async function listRecentAlumni(limit = 10) {
  return supabase.rpc("list_recent_alumni", { p_limit: limit });
}

export type ShareLinkType = "contact" | "network";

export async function getOrCreateShareLink(linkType: ShareLinkType) {
  return supabase.rpc("get_or_create_share_link", { p_link_type: linkType });
}

export async function regenerateShareLink(linkType: ShareLinkType) {
  return supabase.rpc("regenerate_share_link", { p_link_type: linkType });
}

export type PublicShareCard = {
  link_type: ShareLinkType;
  name: string;
  roll_number: string;
  house: string | null;
  course_end_year: number | null;
  job_position: string | null;
  company: string | null;
  current_location: string | null;
  has_photo: boolean;
};

export async function getPublicShareCard(token: string) {
  return supabase.rpc("get_public_share_card", { p_token: token });
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

export type OwnProfileUpdate = {
  company?: string | null;
  job_position?: string | null;
  current_location?: string | null;
  mobile_phone?: string | null;
  secondary_email?: string | null;
  professional_skills?: string | null;
  industries_worked_in?: string | null;
  linkedin_link?: string | null;
  facebook_link?: string | null;
  twitter_link?: string | null;
  website_link?: string | null;
  is_directory_visible?: boolean;
  visibility_settings?: Record<string, boolean>;
  profile_photo_path?: string | null;
  clear_profile_photo?: boolean;
  open_to_mentorship?: boolean;
  mentorship_blurb?: string | null;
  paid_session_links?: { url: string }[];
};

export type GetInvolvedPreferencesUpdate = {
  wants_to_participate: boolean;
  interest_areas?: string[];
  geography?: string | null;
  time_commitment?: string | null;
  comments?: string | null;
};

export async function updateGetInvolvedPreferences(patch: GetInvolvedPreferencesUpdate) {
  return supabase.rpc("update_get_involved_preferences", {
    p_wants_to_participate: patch.wants_to_participate,
    p_interest_areas: patch.interest_areas ?? [],
    p_geography: patch.geography ?? null,
    p_time_commitment: patch.time_commitment ?? null,
    p_comments: patch.comments ?? null,
  });
}

export async function updateOwnAlumniProfile(patch: OwnProfileUpdate) {
  return supabase.rpc("update_own_alumni_profile", {
    p_company: patch.company ?? null,
    p_job_position: patch.job_position ?? null,
    p_current_location: patch.current_location ?? null,
    p_mobile_phone: patch.mobile_phone ?? null,
    p_secondary_email: patch.secondary_email ?? null,
    p_professional_skills: patch.professional_skills ?? null,
    p_industries_worked_in: patch.industries_worked_in ?? null,
    p_linkedin_link: patch.linkedin_link ?? null,
    p_facebook_link: patch.facebook_link ?? null,
    p_twitter_link: patch.twitter_link ?? null,
    p_website_link: patch.website_link ?? null,
    p_is_directory_visible: patch.is_directory_visible ?? null,
    p_visibility_settings: patch.visibility_settings ?? null,
    p_profile_photo_path: patch.profile_photo_path ?? null,
    p_clear_profile_photo: patch.clear_profile_photo ?? false,
    ...(patch.open_to_mentorship !== undefined
      ? { p_open_to_mentorship: patch.open_to_mentorship }
      : {}),
    ...(patch.mentorship_blurb !== undefined
      ? { p_mentorship_blurb: patch.mentorship_blurb }
      : {}),
    ...(patch.paid_session_links !== undefined
      ? { p_paid_session_links: patch.paid_session_links }
      : {}),
  });
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
