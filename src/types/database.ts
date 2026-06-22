export type AppRole = "alumni" | "admin" | "super_admin";
export type MemberStatus = "pending" | "approved";
export type AlumniStatus =
  | "imported_unclaimed"
  | "pending_review"
  | "approved"
  | "rejected"
  | "hidden";
export type ApprovalType = "claim" | "new_registration" | "conflict";
export type ApprovalStatus =
  | "pending_review"
  | "approved"
  | "rejected"
  | "more_info_required";

export interface Profile {
  id: string;
  role: AppRole;
  member_status: MemberStatus;
  created_at: string;
  updated_at: string;
}

export interface AlumniMember {
  id: string;
  roll_number: string;
  user_id: string | null;
  name: string;
  salutation: string | null;
  email: string | null;
  course: string | null;
  stream: string | null;
  course_start_year: number | null;
  course_end_year: number | null;
  company: string | null;
  job_position: string | null;
  current_location: string | null;
  home_town: string | null;
  house: string | null;
  mobile_phone: string | null;
  secondary_email: string | null;
  date_of_birth: string | null;
  correspondence_address: string | null;
  professional_skills: string | null;
  industries_worked_in: string | null;
  roles_played: string | null;
  work_experience_years: number | null;
  facebook_link: string | null;
  linkedin_link: string | null;
  twitter_link: string | null;
  website_link: string | null;
  profile_photo_path: string | null;
  status: AlumniStatus;
  is_directory_visible: boolean;
  visibility_settings: Record<string, boolean>;
  admin_note: string | null;
  premium_membership: string | null;
  premium_number: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApprovalRequest {
  id: string;
  type: ApprovalType;
  status: ApprovalStatus;
  roll_number: string;
  submitted_email: string;
  submitted_name: string | null;
  submitted_phone: string | null;
  submitted_dob: string | null;
  submitted_payload: Record<string, unknown>;
  evidence_path: string | null;
  alumni_member_id: string | null;
  user_id: string | null;
  reviewer_id: string | null;
  reviewer_note: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SearchResult extends AlumniMember {
  has_more?: boolean;
}

export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> };
      alumni_members: { Row: AlumniMember; Insert: Partial<AlumniMember>; Update: Partial<AlumniMember> };
      approval_requests: { Row: ApprovalRequest; Insert: Partial<ApprovalRequest>; Update: Partial<ApprovalRequest> };
    };
    Functions: {
      search_alumni: {
        Args: {
          p_query?: string;
          p_course?: string;
          p_stream?: string;
          p_year_from?: number;
          p_year_to?: number;
          p_location?: string;
          p_company?: string;
          p_industry?: string;
          p_skills?: string;
          p_house?: string;
          p_page?: number;
          p_page_size?: number;
          p_admin_mode?: boolean;
        };
        Returns: SearchResult[];
      };
      lookup_roll_number: {
        Args: { p_roll_number: string };
        Returns: { found: boolean; status: AlumniStatus; can_claim: boolean; member_id: string; name: string }[];
      };
      approve_registration: {
        Args: { p_request_id: string; p_note?: string };
        Returns: string;
      };
      reject_registration: {
        Args: { p_request_id: string; p_note?: string };
        Returns: void;
      };
    };
  };
}
