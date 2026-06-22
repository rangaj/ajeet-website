export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

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

export interface SearchResult {
  id: string;
  roll_number: string;
  name: string;
  salutation: string | null;
  course: string | null;
  stream: string | null;
  course_start_year: number | null;
  course_end_year: number | null;
  company: string | null;
  job_position: string | null;
  current_location: string | null;
  home_town: string | null;
  house: string | null;
  professional_skills: string | null;
  industries_worked_in: string | null;
  profile_photo_path: string | null;
  email: string | null;
  secondary_email: string | null;
  mobile_phone: string | null;
  date_of_birth: string | null;
  correspondence_address: string | null;
  facebook_link: string | null;
  linkedin_link: string | null;
  twitter_link: string | null;
  website_link: string | null;
  visibility_settings: Record<string, boolean>;
  status: AlumniStatus;
  is_directory_visible: boolean;
  has_more: boolean;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: {
          id: string;
          role?: AppRole;
          member_status?: MemberStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          role?: AppRole;
          member_status?: MemberStatus;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      alumni_members: {
        Row: AlumniMember;
        Insert: {
          id?: string;
          roll_number: string;
          user_id?: string | null;
          name: string;
          salutation?: string | null;
          email?: string | null;
          course?: string | null;
          stream?: string | null;
          course_start_year?: number | null;
          course_end_year?: number | null;
          company?: string | null;
          job_position?: string | null;
          current_location?: string | null;
          home_town?: string | null;
          house?: string | null;
          mobile_phone?: string | null;
          secondary_email?: string | null;
          date_of_birth?: string | null;
          correspondence_address?: string | null;
          professional_skills?: string | null;
          industries_worked_in?: string | null;
          roles_played?: string | null;
          work_experience_years?: number | null;
          facebook_link?: string | null;
          linkedin_link?: string | null;
          twitter_link?: string | null;
          website_link?: string | null;
          profile_photo_path?: string | null;
          status?: AlumniStatus;
          is_directory_visible?: boolean;
          visibility_settings?: Record<string, boolean>;
          admin_note?: string | null;
          premium_membership?: string | null;
          premium_number?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          roll_number?: string;
          user_id?: string | null;
          name?: string;
          salutation?: string | null;
          email?: string | null;
          course?: string | null;
          stream?: string | null;
          course_start_year?: number | null;
          course_end_year?: number | null;
          company?: string | null;
          job_position?: string | null;
          current_location?: string | null;
          home_town?: string | null;
          house?: string | null;
          mobile_phone?: string | null;
          secondary_email?: string | null;
          date_of_birth?: string | null;
          correspondence_address?: string | null;
          professional_skills?: string | null;
          industries_worked_in?: string | null;
          roles_played?: string | null;
          work_experience_years?: number | null;
          facebook_link?: string | null;
          linkedin_link?: string | null;
          twitter_link?: string | null;
          website_link?: string | null;
          profile_photo_path?: string | null;
          status?: AlumniStatus;
          is_directory_visible?: boolean;
          visibility_settings?: Record<string, boolean>;
          admin_note?: string | null;
          premium_membership?: string | null;
          premium_number?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      approval_requests: {
        Row: ApprovalRequest;
        Insert: {
          id?: string;
          type: ApprovalType;
          status?: ApprovalStatus;
          roll_number: string;
          submitted_email: string;
          submitted_name?: string | null;
          submitted_phone?: string | null;
          submitted_dob?: string | null;
          submitted_payload?: Record<string, unknown>;
          evidence_path?: string | null;
          alumni_member_id?: string | null;
          user_id?: string | null;
          reviewer_id?: string | null;
          reviewer_note?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          type?: ApprovalType;
          status?: ApprovalStatus;
          roll_number?: string;
          submitted_email?: string;
          submitted_name?: string | null;
          submitted_phone?: string | null;
          submitted_dob?: string | null;
          submitted_payload?: Record<string, unknown>;
          evidence_path?: string | null;
          alumni_member_id?: string | null;
          user_id?: string | null;
          reviewer_id?: string | null;
          reviewer_note?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      search_alumni: {
        Args: {
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
          p_page?: number | null;
          p_page_size?: number | null;
          p_admin_mode?: boolean | null;
        };
        Returns: SearchResult[];
      };
      lookup_roll_number: {
        Args: { p_roll_number: string };
        Returns: {
          found: boolean;
          status: AlumniStatus;
          can_claim: boolean;
          member_id: string;
          name: string;
        }[];
      };
      approve_registration: {
        Args: {
          p_request_id: string;
          p_note?: string | null;
        };
        Returns: string;
      };
      reject_registration: {
        Args: {
          p_request_id: string;
          p_note?: string | null;
        };
        Returns: undefined;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
