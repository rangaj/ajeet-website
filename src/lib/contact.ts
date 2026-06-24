import { invokeFunction } from "@/lib/supabase";

export const CONTACT_CATEGORIES = [
  { value: "", label: "Select a category" },
  { value: "general_enquiry", label: "General Enquiry" },
  { value: "profile_claim_issue", label: "Profile Claim Issue" },
  { value: "registration_issue", label: "Registration Issue" },
  { value: "directory_correction", label: "Directory Correction" },
  { value: "technical_issue", label: "Technical Issue" },
  { value: "association_enquiry", label: "Association Enquiry" },
  { value: "media_podcast_enquiry", label: "Media & Podcast Enquiry" },
  { value: "other", label: "Other" },
] as const;

export type ContactCategory = (typeof CONTACT_CATEGORIES)[number]["value"];
export type EnquiryCategory = Exclude<ContactCategory, "">;

export function isEnquiryCategory(value: string): value is EnquiryCategory {
  return CONTACT_CATEGORIES.some((c) => c.value !== "" && c.value === value);
}

export async function submitContactEnquiry(payload: {
  name: string;
  email: string;
  category: string;
  message: string;
}) {
  return invokeFunction<{
    ok: boolean;
    message: string;
    enquiry_id?: string;
    emailed?: boolean;
  }>("submit-contact-enquiry", payload);
}
