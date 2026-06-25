export type PolicySection =
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] }
  | { type: "subheading"; text: string }
  | { type: "email"; text: string; href: string };

export type PolicyDocument = {
  title: string;
  lastUpdated: string;
  intro: string[];
  sections: Array<{
    heading: string;
    blocks: PolicySection[];
  }>;
};

export const POLICY_LAST_UPDATED = "24 June 2026";

export const privacyPolicy: PolicyDocument = {
  title: "Privacy Policy",
  lastUpdated: POLICY_LAST_UPDATED,
  intro: [
    "The Ajeet Alumni Platform is operated by the Ajeets Alumni Association (AAA) to help alumni of Sainik School Bijapur connect, engage and maintain lifelong relationships within the Ajeet community.",
    "This Privacy Policy explains what information we collect, how it is used and how it is protected.",
    "By registering for or using the platform, you agree to this Privacy Policy.",
  ],
  sections: [
    {
      heading: "Information We Collect",
      blocks: [
        { type: "paragraph", text: "We may collect information including:" },
        {
          type: "list",
          items: [
            "Name",
            "Roll Number",
            "Batch / Year of Passing",
            "House",
            "Email Address",
            "Phone Number (if provided)",
            "Location",
            "Professional Information",
            "Profile Photograph (if uploaded)",
            "Account and authentication information",
          ],
        },
        {
          type: "paragraph",
          text: "We may also collect limited technical information required to operate and secure the platform.",
        },
      ],
    },
    {
      heading: "How We Use Your Information",
      blocks: [
        { type: "paragraph", text: "Your information may be used to:" },
        {
          type: "list",
          items: [
            "Verify alumni identity",
            "Maintain the alumni directory",
            "Facilitate alumni networking and engagement",
            "Improve platform functionality",
            "Communicate important platform updates",
            "Protect the platform from misuse or fraudulent activity",
          ],
        },
      ],
    },
    {
      heading: "Directory Visibility",
      blocks: [
        {
          type: "paragraph",
          text: "Certain profile information may be visible to verified members of the Ajeet Alumni community.",
        },
        {
          type: "paragraph",
          text: "Members are encouraged to keep their information accurate and up to date.",
        },
      ],
    },
    {
      heading: "Information Sharing",
      blocks: [
        {
          type: "paragraph",
          text: "The Ajeets Alumni Association does not sell, rent or trade member information.",
        },
        { type: "paragraph", text: "Information may be shared only:" },
        {
          type: "list",
          items: [
            "With verified members through the directory",
            "When required by law",
            "To protect the security and integrity of the platform",
            "With trusted service providers supporting platform operations",
          ],
        },
      ],
    },
    {
      heading: "Email Communications",
      blocks: [
        { type: "paragraph", text: "Members may receive emails relating to:" },
        {
          type: "list",
          items: [
            "Account verification",
            "Password resets",
            "Platform notifications",
            "Alumni association communications",
          ],
        },
      ],
    },
    {
      heading: "Data Security",
      blocks: [
        {
          type: "paragraph",
          text: "Reasonable administrative and technical safeguards are used to protect member information.",
        },
        {
          type: "paragraph",
          text: "While every effort is made to secure the platform, no internet-based service can guarantee absolute security.",
        },
      ],
    },
    {
      heading: "Account Removal",
      blocks: [
        {
          type: "paragraph",
          text: "Members may request removal of their account or personal information by contacting the Association.",
        },
        {
          type: "paragraph",
          text: "Certain records may be retained where necessary for administrative, security or auditing purposes.",
        },
      ],
    },
    {
      heading: "Changes to this Policy",
      blocks: [
        { type: "paragraph", text: "This Privacy Policy may be updated periodically." },
        {
          type: "paragraph",
          text: "Continued use of the platform after changes are published constitutes acceptance of the revised policy.",
        },
      ],
    },
    {
      heading: "Contact",
      blocks: [
        { type: "paragraph", text: "For questions regarding this Privacy Policy, please contact:" },
        { type: "email", text: "admin@ajeets.org", href: "mailto:admin@ajeets.org" },
      ],
    },
  ],
};

export const termsOfUse: PolicyDocument = {
  title: "Terms of Use",
  lastUpdated: POLICY_LAST_UPDATED,
  intro: [
    "The Ajeet Alumni Platform is a private community platform operated by the Ajeets Alumni Association (AAA) for alumni of Sainik School Bijapur.",
    "By accessing or using the platform, you agree to comply with these Terms of Use.",
  ],
  sections: [
    {
      heading: "Eligibility",
      blocks: [
        { type: "paragraph", text: "Access to the platform is intended for:" },
        {
          type: "list",
          items: ["Alumni of Sainik School Bijapur", "Individuals approved by the Association"],
        },
        {
          type: "paragraph",
          text: "The Association reserves the right to approve, suspend or revoke access at its discretion.",
        },
      ],
    },
    {
      heading: "Member Responsibilities",
      blocks: [
        { type: "paragraph", text: "Members agree to:" },
        {
          type: "list",
          items: [
            "Provide accurate information",
            "Maintain the security of their account",
            "Keep profile information reasonably current",
            "Use the platform respectfully and responsibly",
          ],
        },
        {
          type: "paragraph",
          text: "Members are responsible for activity conducted through their accounts.",
        },
      ],
    },
    {
      heading: "Acceptable Use",
      blocks: [
        { type: "paragraph", text: "Members may use the platform to:" },
        {
          type: "list",
          items: [
            "Connect with fellow alumni",
            "Participate in alumni activities",
            "Maintain personal and professional relationships",
            "Access alumni resources and information",
          ],
        },
      ],
    },
    {
      heading: "Prohibited Conduct",
      blocks: [
        { type: "paragraph", text: "Members must not:" },
        {
          type: "list",
          items: [
            "Misrepresent their identity",
            "Share false or misleading information",
            "Attempt unauthorized access to accounts or data",
            "Harvest directory information for commercial purposes",
            "Send unsolicited marketing or spam",
            "Use the platform for unlawful activities",
            "Upload malicious or harmful content",
          ],
        },
      ],
    },
    {
      heading: "Intellectual Property",
      blocks: [
        {
          type: "paragraph",
          text: "Platform branding, logos and content remain the property of the Ajeets Alumni Association or their respective owners.",
        },
        {
          type: "paragraph",
          text: "Members may not reproduce or distribute platform content without permission.",
        },
      ],
    },
    {
      heading: "Platform Availability",
      blocks: [
        {
          type: "paragraph",
          text: "Reasonable efforts will be made to maintain platform availability.",
        },
        { type: "paragraph", text: "However, uninterrupted access cannot be guaranteed." },
        {
          type: "paragraph",
          text: "Features may be modified, suspended or discontinued as necessary.",
        },
      ],
    },
    {
      heading: "Suspension or Termination",
      blocks: [
        { type: "paragraph", text: "The Association may suspend or terminate accounts that:" },
        {
          type: "list",
          items: [
            "Violate these Terms",
            "Misuse the platform",
            "Harm the community",
            "Engage in inappropriate conduct",
          ],
        },
      ],
    },
    {
      heading: "Limitation of Liability",
      blocks: [
        { type: "paragraph", text: 'The platform is provided on an "as available" basis.' },
        {
          type: "paragraph",
          text: "The Ajeets Alumni Association shall not be liable for service interruptions, data loss, user-generated content or actions of other members.",
        },
      ],
    },
    {
      heading: "Changes to These Terms",
      blocks: [
        { type: "paragraph", text: "These Terms may be updated periodically." },
        {
          type: "paragraph",
          text: "Continued use of the platform after changes are published constitutes acceptance of the revised Terms.",
        },
      ],
    },
    {
      heading: "Contact",
      blocks: [
        { type: "paragraph", text: "For questions regarding these Terms, please contact:" },
        { type: "email", text: "admin@ajeets.org", href: "mailto:admin@ajeets.org" },
      ],
    },
  ],
};

export const disclaimer: PolicyDocument = {
  title: "Disclaimer",
  lastUpdated: POLICY_LAST_UPDATED,
  intro: [
    "The Ajeet Alumni Association website is intended to facilitate connections and engagement among members of the alumni community.",
    "While reasonable efforts are made to maintain accurate and up-to-date information, the Association does not guarantee the completeness, accuracy, or reliability of any information, profiles, directory entries, announcements, or content published on this website.",
    "Information contained within the alumni directory is provided by members and is intended solely for alumni networking, mentorship, community engagement, and Association-related activities.",
    "Users are responsible for exercising their own judgment and verifying information independently where appropriate.",
    "The Ajeet Alumni Association is not responsible for the actions, communications, opinions, or conduct of individual members, users, or third parties who access or use the platform.",
    "Links to external websites, podcasts, videos, and social media channels are provided for convenience only and do not imply endorsement by the Association.",
    "The Association reserves the right to modify, update, suspend, or discontinue any part of the platform without prior notice.",
    "Use of this website constitutes acceptance of the Terms of Use, Privacy Policy, and Directory Usage Policy.",
  ],
  sections: [],
};

export const directoryUsagePolicy: PolicyDocument = {
  title: "Directory Usage Policy",
  lastUpdated: POLICY_LAST_UPDATED,
  intro: [
    "The Ajeet Alumni Directory exists to help alumni reconnect, network, collaborate and strengthen the Ajeet community.",
    "Access to directory information is a privilege extended to verified members of the community.",
  ],
  sections: [
    {
      heading: "Permitted Use",
      blocks: [
        { type: "paragraph", text: "Directory information may be used for:" },
        {
          type: "list",
          items: [
            "Reconnecting with fellow alumni",
            "Personal and professional networking",
            "Mentorship and guidance",
            "Alumni activities and events",
            "Community initiatives",
            "Alumni collaboration",
          ],
        },
      ],
    },
    {
      heading: "Prohibited Use",
      blocks: [
        { type: "paragraph", text: "Directory information may not be used for:" },
        { type: "subheading", text: "Commercial Solicitation" },
        { type: "paragraph", text: "Including:" },
        {
          type: "list",
          items: [
            "Sales prospecting",
            "Lead generation",
            "Marketing campaigns",
            "Promotion of products or services without consent",
          ],
        },
        { type: "subheading", text: "Mass Communications" },
        { type: "paragraph", text: "Including:" },
        {
          type: "list",
          items: [
            "Unsolicited bulk emails",
            "Bulk messaging campaigns",
            "Adding members to groups without permission",
            "Promotional outreach",
          ],
        },
        { type: "subheading", text: "Data Extraction" },
        { type: "paragraph", text: "Including:" },
        {
          type: "list",
          items: [
            "Copying directory information in bulk",
            "Creating external databases",
            "Scraping or harvesting member information",
            "Republishing directory information elsewhere",
          ],
        },
        { type: "subheading", text: "Political Campaigning" },
        { type: "paragraph", text: "Including:" },
        {
          type: "list",
          items: [
            "Political campaigning",
            "Political fundraising",
            "Advocacy campaigns unrelated to the Association",
          ],
        },
        { type: "subheading", text: "Unauthorized Sharing" },
        {
          type: "paragraph",
          text: "Members may not share another member's personal information without consent.",
        },
        { type: "paragraph", text: "This includes:" },
        {
          type: "list",
          items: [
            "Email addresses",
            "Phone numbers",
            "Location information",
            "Professional information",
            "Any information obtained through the directory",
          ],
        },
      ],
    },
    {
      heading: "Respectful Use",
      blocks: [
        {
          type: "paragraph",
          text: "Members are expected to engage respectfully and professionally.",
        },
        {
          type: "paragraph",
          text: "The directory exists to strengthen the alumni community and should be used in a manner consistent with the values of trust, fellowship and mutual respect.",
        },
      ],
    },
    {
      heading: "Enforcement",
      blocks: [
        {
          type: "paragraph",
          text: "The Ajeets Alumni Association reserves the right to restrict directory access, suspend accounts or revoke platform access where this policy is violated.",
        },
      ],
    },
    {
      heading: "Reporting Concerns",
      blocks: [
        {
          type: "paragraph",
          text: "Concerns regarding misuse of directory information may be reported to:",
        },
        { type: "email", text: "admin@ajeets.org", href: "mailto:admin@ajeets.org" },
      ],
    },
    {
      heading: "Changes to this Policy",
      blocks: [
        { type: "paragraph", text: "This policy may be updated periodically." },
        {
          type: "paragraph",
          text: "Continued use of the directory after changes are published constitutes acceptance of the revised policy.",
        },
      ],
    },
  ],
};

export const POLICY_ROUTES = {
  privacy: privacyPolicy,
  terms: termsOfUse,
  "directory-usage": directoryUsagePolicy,
  disclaimer,
} as const;

export type PolicySlug = keyof typeof POLICY_ROUTES;
