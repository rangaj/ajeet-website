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
  | "awaiting_email_verification"
  | "expired"
  | "pending_review"
  | "approved"
  | "rejected"
  | "more_info_required";

export interface Profile {
  id: string;
  role: AppRole;
  member_status: MemberStatus;
  password_set_at: string | null;
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
  open_to_mentorship: boolean;
  mentorship_blurb: string | null;
  paid_session_links: Json;
  get_involved_wants_to_participate: boolean | null;
  get_involved_interest_areas: string[];
  get_involved_geography: string | null;
  get_involved_time_commitment: string | null;
  get_involved_comments: string | null;
  get_involved_updated_at: string | null;
  status: AlumniStatus;
  is_directory_visible: boolean;
  visibility_settings: Record<string, boolean>;
  admin_note: string | null;
  pending_email: string | null;
  email_change_requested_at: string | null;
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
  submitted_payload: Json;
  evidence_path: string | null;
  alumni_member_id: string | null;
  user_id: string | null;
  reviewer_id: string | null;
  reviewer_note: string | null;
  reviewed_at: string | null;
  email_verification_expires_at: string | null;
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
  visibility_settings: Json;
  status: AlumniStatus;
  is_directory_visible: boolean;
  open_to_mentorship: boolean;
  mentorship_blurb: string | null;
  paid_session_links: Json;
  has_more: boolean;
  total_count?: number;
}

export type AlumniMemberUpdate = {
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
  visibility_settings?: Json;
  profile_photo_path?: string | null;
};

// --- AAA Membership (Phase B) ------------------------------------------------
export type MembershipModuleState = "hidden" | "coming_soon" | "live";
export type MemberType = "ajeet" | "honorary" | "patron";
export type PaymentFeeKind = "registration" | "initial" | "renewal";
export type PaymentSource = "offline" | "razorpay";
export type PaymentStatus = "recorded" | "captured" | "failed" | "refunded";
export type ReceiptMode = "plain" | "80g";
export type MemberStanding = "none" | "registered" | "active" | "in_default";

export interface AaaSettings {
  id: number;
  entity_name: string;
  registration_number: string | null;
  registered_office: string;
  pan: string | null;
  reg_12a: string | null;
  reg_80g: string | null;
  financial_year_start_month: number;
  currency: string;
  fee_registration: number | null;
  fee_initial: number | null;
  fee_renewal: number | null;
  receipt_mode: ReceiptMode;
  receipt_prefix: string;
  module_state: MembershipModuleState;
  preview_user_ids: string[];
  ec_resolution_ref: string | null;
  payments_offline_enabled: boolean;
  gateway_provider: string;
  gateway_enabled: boolean;
  gating_enforced: boolean;
  updated_at: string;
  updated_by: string | null;
}

export interface MembershipRollRow {
  alumni_member_id: string;
  roll_number: string;
  name: string;
  course_end_year: number | null;
  house: string | null;
  member_type: MemberType;
  standing: MemberStanding;
  registration_fee_paid: boolean;
  valid_through: string | null;
  voting_exempt: boolean;
}

export interface ElectoralRollRow {
  alumni_member_id: string;
  roll_number: string;
  name: string;
  course_end_year: number | null;
  house: string | null;
  standing: MemberStanding;
  voting_exempt: boolean;
  eligible_reason: string;
}

export interface MembershipPaymentRow {
  id: string;
  alumni_member_id: string;
  fee_kind: PaymentFeeKind;
  period_fy: number | null;
  amount: number;
  currency: string;
  source: PaymentSource;
  method: string | null;
  reference: string | null;
  status: PaymentStatus;
  receipt_id: string | null;
  notes: string | null;
  recorded_by: string | null;
  created_at: string;
}

export interface MembershipReceiptRow {
  id: string;
  receipt_no: string;
  mode: ReceiptMode;
  financial_year: number;
  alumni_member_id: string;
  payment_id: string | null;
  amount: number;
  currency: string;
  entity_snapshot: Json;
  issued_by: string | null;
  issued_at: string;
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: AppRole;
          member_status: MemberStatus;
          password_set_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          role?: AppRole;
          member_status?: MemberStatus;
          password_set_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          role?: AppRole;
          member_status?: MemberStatus;
          password_set_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      alumni_members: {
        Row: {
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
          open_to_mentorship: boolean;
          mentorship_blurb: string | null;
          paid_session_links: Json;
          get_involved_wants_to_participate: boolean | null;
          get_involved_interest_areas: string[];
          get_involved_geography: string | null;
          get_involved_time_commitment: string | null;
          get_involved_comments: string | null;
          get_involved_updated_at: string | null;
          status: AlumniStatus;
          is_directory_visible: boolean;
          visibility_settings: Json;
          admin_note: string | null;
          pending_email: string | null;
          email_change_requested_at: string | null;
          premium_membership: string | null;
          premium_number: string | null;
          created_at: string;
          updated_at: string;
        };
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
          visibility_settings?: Json;
          admin_note?: string | null;
          premium_membership?: string | null;
          premium_number?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: AlumniMemberUpdate;
        Relationships: [];
      };
      approval_requests: {
        Row: {
          id: string;
          type: ApprovalType;
          status: ApprovalStatus;
          roll_number: string;
          submitted_email: string;
          submitted_name: string | null;
          submitted_phone: string | null;
          submitted_dob: string | null;
          submitted_payload: Json;
          evidence_path: string | null;
          alumni_member_id: string | null;
          user_id: string | null;
          reviewer_id: string | null;
          reviewer_note: string | null;
          reviewed_at: string | null;
          email_verification_expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          type: ApprovalType;
          status?: ApprovalStatus;
          roll_number: string;
          submitted_email: string;
          submitted_name?: string | null;
          submitted_phone?: string | null;
          submitted_dob?: string | null;
          submitted_payload?: Json;
          evidence_path?: string | null;
          alumni_member_id?: string | null;
          user_id?: string | null;
          reviewer_id?: string | null;
          reviewer_note?: string | null;
          reviewed_at?: string | null;
          email_verification_expires_at?: string | null;
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
          submitted_payload?: Json;
          evidence_path?: string | null;
          alumni_member_id?: string | null;
          user_id?: string | null;
          reviewer_id?: string | null;
          reviewer_note?: string | null;
          reviewed_at?: string | null;
          email_verification_expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "approval_requests_alumni_member_id_fkey";
            columns: ["alumni_member_id"];
            isOneToOne: false;
            referencedRelation: "alumni_members";
            referencedColumns: ["id"];
          },
        ];
      };
      aaa_settings: {
        Row: AaaSettings;
        Insert: Partial<AaaSettings> & { id?: number };
        Update: Partial<AaaSettings>;
        Relationships: [];
      };
      memberships: {
        Row: {
          id: string;
          alumni_member_id: string;
          member_type: MemberType;
          registration_fee_paid: boolean;
          registration_paid_at: string | null;
          current_period_fy: number | null;
          valid_from: string | null;
          valid_through: string | null;
          fund: string;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          alumni_member_id: string;
          member_type?: MemberType;
          registration_fee_paid?: boolean;
          registration_paid_at?: string | null;
          current_period_fy?: number | null;
          valid_from?: string | null;
          valid_through?: string | null;
          fund?: string;
          notes?: string | null;
        };
        Update: {
          member_type?: MemberType;
          registration_fee_paid?: boolean;
          registration_paid_at?: string | null;
          current_period_fy?: number | null;
          valid_from?: string | null;
          valid_through?: string | null;
          fund?: string;
          notes?: string | null;
        };
        Relationships: [];
      };
      membership_payments: {
        Row: MembershipPaymentRow & {
          gateway_order_id: string | null;
          gateway_payment_id: string | null;
          idempotency_key: string | null;
        };
        Insert: Partial<MembershipPaymentRow> & {
          alumni_member_id: string;
          fee_kind: PaymentFeeKind;
          amount: number;
        };
        Update: Partial<MembershipPaymentRow>;
        Relationships: [];
      };
      membership_receipts: {
        Row: MembershipReceiptRow;
        Insert: Partial<MembershipReceiptRow> & {
          receipt_no: string;
          mode: ReceiptMode;
          financial_year: number;
          alumni_member_id: string;
          amount: number;
        };
        Update: Partial<MembershipReceiptRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
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
          p_open_to_mentorship?: boolean | null;
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
      link_approved_alumni_self: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      promote_email_verified_request: {
        Args: Record<string, never>;
        Returns: string | null;
      };
      expire_stale_email_verifications: {
        Args: Record<string, never>;
        Returns: number;
      };
      reject_registration: {
        Args: {
          p_request_id: string;
          p_note?: string | null;
        };
        Returns: boolean;
      };
      list_recent_alumni: {
        Args: { p_limit?: number | null };
        Returns: SearchResult[];
      };
      get_public_share_card: {
        Args: { p_token: string };
        Returns: {
          link_type: "contact" | "network";
          name: string;
          roll_number: string;
          house: string | null;
          course_end_year: number | null;
          job_position: string | null;
          company: string | null;
          current_location: string | null;
          has_photo: boolean;
        }[];
      };
      get_or_create_share_link: {
        Args: { p_link_type: "contact" | "network" };
        Returns: string;
      };
      regenerate_share_link: {
        Args: { p_link_type: "contact" | "network" };
        Returns: string;
      };
      update_own_alumni_profile: {
        Args: {
          p_company?: string | null;
          p_job_position?: string | null;
          p_current_location?: string | null;
          p_mobile_phone?: string | null;
          p_secondary_email?: string | null;
          p_professional_skills?: string | null;
          p_industries_worked_in?: string | null;
          p_linkedin_link?: string | null;
          p_facebook_link?: string | null;
          p_twitter_link?: string | null;
          p_website_link?: string | null;
          p_is_directory_visible?: boolean | null;
          p_visibility_settings?: Record<string, boolean> | null;
          p_profile_photo_path?: string | null;
          p_clear_profile_photo?: boolean | null;
          p_open_to_mentorship?: boolean | null;
          p_mentorship_blurb?: string | null;
          p_paid_session_links?: Json | null;
        };
        Returns: boolean;
      };
      update_own_join_year: {
        Args: {
          p_course_start_year?: number | null;
        };
        Returns: boolean;
      };
      update_own_dob: {
        Args: {
          p_date_of_birth?: string | null;
        };
        Returns: boolean;
      };
      update_get_involved_preferences: {
        Args: {
          p_wants_to_participate: boolean;
          p_interest_areas?: string[] | null;
          p_geography?: string | null;
          p_time_commitment?: string | null;
          p_comments?: string | null;
        };
        Returns: boolean;
      };
      admin_support_dashboard_metrics: {
        Args: Record<string, never>;
        Returns: import("@/types/member-support").SupportDashboardMetrics;
      };
      admin_search_members: {
        Args: {
          p_query?: string | null;
          p_filter?: string | null;
          p_limit?: number | null;
        };
        Returns: import("@/types/member-support").AdminMemberSearchRow[];
      };
      admin_member_support_snapshot: {
        Args: { p_member_id: string };
        Returns: import("@/types/member-support").MemberSupportSnapshot;
      };
      admin_add_support_note: {
        Args: { p_member_id: string; p_body: string };
        Returns: string;
      };
      log_member_email_event: {
        Args: {
          p_email_type: string;
          p_provider: string;
          p_recipient: string;
          p_alumni_member_id?: string | null;
          p_approval_request_id?: string | null;
          p_status?: string | null;
          p_message_id?: string | null;
          p_error_message?: string | null;
          p_trigger_source?: string | null;
        };
        Returns: string;
      };
      membership_is_live: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      can_preview_membership: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      can_manage_membership: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      aaa_current_fy: {
        Args: Record<string, never>;
        Returns: number;
      };
      aaa_financial_year_for: {
        Args: { p_date: string };
        Returns: number;
      };
      aaa_fy_start: {
        Args: { p_fy: number };
        Returns: string;
      };
      aaa_fy_end: {
        Args: { p_fy: number };
        Returns: string;
      };
      member_voting_exempt: {
        Args: { p_alumni_member_id: string; p_as_of?: string | null };
        Returns: boolean;
      };
      member_standing: {
        Args: { p_alumni_member_id: string; p_as_of?: string | null };
        Returns: MemberStanding;
      };
      record_offline_payment: {
        Args: {
          p_alumni_member_id: string;
          p_fee_kind: PaymentFeeKind;
          p_amount: number;
          p_period_fy?: number | null;
          p_method?: string | null;
          p_reference?: string | null;
          p_issue_receipt?: boolean | null;
          p_idempotency_key?: string | null;
          p_notes?: string | null;
        };
        Returns: string;
      };
      set_member_type: {
        Args: { p_alumni_member_id: string; p_member_type: MemberType };
        Returns: boolean;
      };
      membership_roll: {
        Args: { p_as_of?: string | null };
        Returns: MembershipRollRow[];
      };
      membership_electoral_roll: {
        Args: { p_record_date?: string | null };
        Returns: ElectoralRollRow[];
      };
    };
    Enums: {
      app_role: AppRole;
      member_status: MemberStatus;
      alumni_status: AlumniStatus;
      approval_type: ApprovalType;
      approval_status: ApprovalStatus;
      import_row_status: "valid" | "invalid" | "duplicate" | "imported";
      membership_module_state: MembershipModuleState;
      member_type: MemberType;
      payment_fee_kind: PaymentFeeKind;
      payment_source: PaymentSource;
      payment_status: PaymentStatus;
      receipt_mode: ReceiptMode;
    };
    CompositeTypes: Record<string, never>;
  };
};
